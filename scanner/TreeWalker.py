# -*- coding: utf-8 -*-

import os
import os.path
import sys
import json
import re
import time
import random
import math
import fnmatch
import shutil
import copy

from datetime import datetime
from pprint import pprint

from PIL import Image

from CachePath import remove_album_path, last_modification_time, trim_base_custom
from CachePath import remove_folders_marker
from Utilities import save_password_codes, json_files_and_mtime, report_mem
from Utilities import convert_identifiers_set_to_codes_set, convert_identifiers_set_to_md5s_set
from Utilities import convert_combination_to_set, convert_set_to_combination, convert_md5_to_code, convert_simple_md5_combination_to_simple_codes_combination, complex_combination
from Utilities import determine_symlink_number_and_name
from CachePath import convert_to_ascii_only, remove_accents, remove_non_alphabetic_characters
from CachePath import remove_digits, switch_to_lowercase, phrase_to_words, checksum
from Utilities import message, indented_message, next_level, back_level, report_times, file_mtime, make_dir
from PhotoAlbum import Media, Album, PhotoAlbumEncoder, Position, Positions, NumsProtected, Sizes, SizesProtected
from Geonames import Geonames
import Options

class TreeWalker:
	def __init__(self):
		random.seed()
		self.all_json_files = ["options.json"]
		self.all_json_files_dict = {}
		self.time_of_album_saving = None

		if (Options.config['use_stop_words']):
			TreeWalker.stopwords_file = os.path.join(Options.config['cache_path'], 'stopwords.json')
			self.all_json_files.append('stopwords.json')
			self.get_lowercase_stopwords()

		Options.config['reduced_sizes'].sort(reverse=True)

		geonames = Geonames()
		self.tree_by_date = {}
		self.tree_by_geonames = {}
		self.tree_by_search = {}
		self.media_with_geonames_list = list()
		self.all_media = list()

		self.created_dirs = []

		self.all_album_composite_images = list()
		self.album_cache_path = os.path.join(Options.config['cache_path'], Options.config['cache_album_subdir'])
		if os.path.exists(self.album_cache_path):
			if not os.access(self.album_cache_path, os.W_OK):
				message("FATAL ERROR", self.album_cache_path + " not writable, quitting")
				sys.exit(-97)
		else:
			make_dir(Options.config['cache_album_subdir'], "cache album subdir")

		self.origin_album = Album(Options.config['album_path'])
		self.origin_album.cache_base = "root"

		message("Browsing", "start!", 1)

		next_level()
		[folders_album, _, passwords_or_album_ini_processed] = self.walk(Options.config['album_path'], Options.config['folders_string'], [], None, set(), self.origin_album)

		# permit searching the title and description of the root album too
		self.add_album_to_tree_by_search(folders_album)

		back_level()
		if folders_album is None:
			message("WARNING", "ALBUMS ROOT EXCLUDED BY MARKER FILE", 2)
		else:
			# # maybe nothing has changed and everything could end up here
			# if not passwords_or_album_ini_processed and not Options.num_photo_processed and not Options.num_video_processed:
			# 	message("nothing has changed in the album tree!", "Execution may end up here", 3)
			# 	return

			message("changes have occurred in the album tree", "I must keep working!", 3)
			next_level()

			self.origin_album.nums_protected_media_in_sub_tree.merge(folders_album.nums_protected_media_in_sub_tree)
			self.origin_album.sizes_protected_media_in_sub_tree.merge(folders_album.sizes_protected_media_in_sub_tree)
			self.origin_album.add_subalbum(folders_album)

			# self.all_json_files.append(Options.config['folders_string'] + ".json")

			message("generating by date albums...", "", 4)
			by_date_album = self.generate_by_date_albums(self.origin_album)
			indented_message("by date albums generated", "", 5)
			if by_date_album is not None and not by_date_album.empty:
				# self.all_json_files.append(Options.config['by_date_string'] + ".json")
				self.origin_album.nums_protected_media_in_sub_tree.merge(by_date_album.nums_protected_media_in_sub_tree)
				self.origin_album.sizes_protected_media_in_sub_tree.merge(by_date_album.sizes_protected_media_in_sub_tree)
				self.origin_album.add_subalbum(by_date_album)
			report_mem()

			message("generating by geonames albums...", "", 4)
			by_geonames_album = self.generate_by_geonames_albums(self.origin_album)
			indented_message("by geonames albums generated", "", 5)
			if by_geonames_album is not None and not by_geonames_album.empty:
				# self.all_json_files.append(Options.config['by_gps_string'] + ".json")
				self.origin_album.nums_protected_media_in_sub_tree.merge(by_geonames_album.nums_protected_media_in_sub_tree)
				self.origin_album.sizes_protected_media_in_sub_tree.merge(by_geonames_album.sizes_protected_media_in_sub_tree)
				self.origin_album.add_subalbum(by_geonames_album)
			report_mem()

			message("generating by search albums...", "", 4)
			by_search_album = self.generate_by_search_albums(self.origin_album)
			indented_message("by search albums generated", "", 5)
			if by_search_album is not None and not by_search_album.empty:
				# self.all_json_files.append(Options.config['by_search_string'] + ".json")
				self.origin_album.nums_protected_media_in_sub_tree.merge(by_search_album.nums_protected_media_in_sub_tree)
				self.origin_album.sizes_protected_media_in_sub_tree.merge(by_search_album.sizes_protected_media_in_sub_tree)
				self.origin_album.add_subalbum(by_search_album)
			report_mem()

			message("generating protected content albums...", "", 5)
			self.protected_origin_album = self.origin_album.generate_protected_content_albums()
			indented_message("protected content albums generated", "", 4)
			report_mem()

			message("reducing unprotected content albums...", "", 4)
			self.origin_album.leave_only_unprotected_content()
			indented_message("unprotected content albums reduced!", "", 5)
			report_mem()

			self.time_of_album_saving = datetime.now()
			message("saving all unprotected albums to json files...", "", 3)
			next_level()
			save_password_codes()

			for album in self.origin_album.subalbums:
				self.all_albums_to_json_file(album)

			back_level()
			indented_message("all unprotected albums saved to json files!", "", 4)
			report_mem()

			message("deleting old protected content directories...", "", 5)
			for entry in self._listdir_sorted_alphabetically(Options.config['cache_path']):
				entry_with_path = os.path.join(Options.config['cache_path'], entry)
				if not os.path.isdir(entry_with_path):
					continue
				if entry.find(Options.config['protected_directories_prefix']) != 0:
					continue
				# entry_with_path is one of the protected content directories: remove it with all its content
				shutil.rmtree(entry_with_path)
			indented_message("old protected content directories deleted!", Options.config['protected_directories_prefix'] + "*/*", 4)

			message("saving all protected albums to json files...", "", 3)
			next_level()

			keys = list(self.protected_origin_album.keys())
			keys = sorted(sorted(keys), key = lambda single_key: len(single_key.split('-')))
			for complex_identifiers_combination in keys:
				album = self.protected_origin_album[complex_identifiers_combination]
				album_identifiers_combination, media_identifiers_combination = complex_identifiers_combination.split(',')
				album_md5_combination = convert_set_to_combination(convert_identifiers_set_to_md5s_set(convert_combination_to_set(album_identifiers_combination)))
				md5_combination = convert_set_to_combination(convert_identifiers_set_to_md5s_set(convert_combination_to_set(media_identifiers_combination)))
				total_md5_combination = complex_combination(album_md5_combination, md5_combination)

				message("saving protected albums for identifiers...", "album ident. = " + album_identifiers_combination + ", media ident. = " + media_identifiers_combination + ", md5's = '" + total_md5_combination + "'", 3)
				next_level()
				self.all_albums_to_json_file(album, complex_identifiers_combination)
				back_level()
				message("protected albums saved for identifiers!", "album identif. = " + album_identifiers_combination + ", media ident. = " + media_identifiers_combination + ", md5's = '" + total_md5_combination + "'", 4)

			back_level()
			message("all protected albums saved to json files", "", 4)
			report_mem()

			# options must be saved here, when json files have already been saved, otherwise in case of error they may not reflect the json files situation
			self._save_json_options(len(self.origin_album.positions_and_media_in_tree.positions))

			for identifier_and_password in Options.identifiers_and_passwords:
				if identifier_and_password['used']:
					identifier = identifier_and_password['identifier']
					md5 = convert_identifiers_set_to_md5s_set(set([identifier])).pop()
					self.all_json_files.append(os.path.join(Options.config['passwords_subdir'], md5))

			back_level()
			self.remove_stale("", self.all_json_files)
			report_mem()
			message("completed", "", 4)

	def all_albums_to_json_file(self, album, complex_identifiers_combination = None):
		if album.cache_base == Options.config['folders_string']:
			message("saving all physical albums to json files...", "", 3)
			next_level()
		elif album.cache_base == Options.config['by_date_string']:
			message("saving all by date albums to json files...", "", 3)
			next_level()
		elif album.cache_base == Options.config['by_gps_string']:
			message("saving all by gps albums to json files...", "", 3)
			next_level()
		elif album.cache_base == Options.config['by_search_string']:
			message("saving all by search albums to json files...", "", 3)
			next_level()

		# the subalbums of search albums in by_search_album are regular albums
		# and they are saved when folders_album is saved, avoid saving them multiple times
		if (
			album.cache_base == Options.config['by_search_string'] or
			album.cache_base.find(Options.config['by_search_string']) != 0
			# album.cache_base.find(Options.config['by_search_string']) == 0 and
			# len(album.cache_base.split(Options.config['cache_folder_separator'])) < 2
		):
			for subalbum in album.subalbums:
				self.all_albums_to_json_file(subalbum, complex_identifiers_combination)

		if (
			complex_identifiers_combination is None and
			album.nums_media_in_sub_tree.total() == 0 and (
				album.cache_base.find(Options.config['by_search_string']) != 0 or
				album.cache_base != Options.config['by_search_string']
				# album.cache_base != Options.config['by_search_string'] and
				# all(subalbum.nums_protected_media_in_sub_tree.value(',').total() == 0 for subalbum in album.subalbums)
			)
		):
			indented_message("empty album, not saving it", album.absolute_path, 4)
			return

		if complex_identifiers_combination is not None:
			if (
				album.nums_media_in_sub_tree.total() == 0 and (
					album.cache_base.find(Options.config['by_search_string']) != 0 or
					album.cache_base != Options.config['by_search_string']
					# album.cache_base != Options.config['by_search_string'] and
					# all(
					# 	complex_identifiers_combination in subalbum.nums_protected_media_in_sub_tree.non_trivial_keys() and
					# 	subalbum.nums_protected_media_in_sub_tree.value(complex_identifiers_combination).total() == 0
					# 	for subalbum in album.subalbums
					# )
				)
			):
				indented_message("empty protected album, not saving it", album.absolute_path, 4)
				return

			album_identifiers_combination, media_identifiers_combination = complex_identifiers_combination.split(',')

			if (
				album_identifiers_combination != '' and
				len(album.password_identifiers_set) > 0 and
				set(album_identifiers_combination.split("-")) != album.password_identifiers_set
			):
				message("album protected by another password combination, not saving it", album.absolute_path, 4)
				return

		json_media_name = ""
		json_positions_name = ""

		separate_media = album.must_separate_media
		separate_positions = album.must_separate_positions

		if complex_identifiers_combination is None:
			json_name = album.json_file
			if separate_media:
				json_media_name = album.media_json_file
			if separate_positions:
				json_positions_name = album.positions_json_file
		else:
			json_name = album.cache_base + ".0.json"
			if separate_media:
				json_media_name = album.cache_base + ".0.media.json"
			if separate_positions:
				json_positions_name = album.cache_base + ".0.positions.json"

		symlinks = []
		positions_symlinks = []
		media_symlinks = []
		symlink_codes_and_numbers = []

		if complex_identifiers_combination is not None:
			password_md5_list = sorted(convert_identifiers_set_to_md5s_set(convert_combination_to_set(media_identifiers_combination)))
			album_password_md5_list = sorted(convert_identifiers_set_to_md5s_set(convert_combination_to_set(album_identifiers_combination)))
			album_codes_set = convert_identifiers_set_to_codes_set(convert_combination_to_set(album_identifiers_combination))
			media_codes_set = convert_identifiers_set_to_codes_set(convert_combination_to_set(media_identifiers_combination))
			codes_complex_combination = complex_combination(convert_set_to_combination(album_codes_set), convert_set_to_combination(media_codes_set))
			md5_product_list = []
			if len(album_password_md5_list) > 0 and len(password_md5_list) > 0:
				for couple in ((x,y) for x in album_password_md5_list for y in password_md5_list):
					md5_product_list.append(','.join(couple))
			elif len(album_password_md5_list) > 0:
				for md5 in album_password_md5_list:
					md5_product_list.append(complex_combination(md5, ''))
			else:
				for md5 in password_md5_list:
					md5_product_list.append(complex_combination('', md5))
			first_md5_product = md5_product_list[0]

			first_dir = os.path.join(
				Options.config['cache_path'],
				Options.config['protected_directories_prefix'] + first_md5_product
			)
			if first_dir not in self.created_dirs:
				make_dir(first_dir, "protected content directory")
				self.created_dirs.append(first_dir)

			number, json_name_with_path = determine_symlink_number_and_name(os.path.join(
				first_dir,
				album.cache_base
			))
			json_name = json_name_with_path[len(Options.config['cache_path']) + 1:]
			if separate_media:
				json_media_name = os.path.join(
					Options.config['protected_directories_prefix'] + first_md5_product,
					album.cache_base + "." + str(number) + ".media.json"
				)
			if separate_positions:
				json_positions_name = os.path.join(
					Options.config['protected_directories_prefix'] + first_md5_product,
					album.cache_base + "." + str(number) + ".positions.json"
				)
			symlink_codes_and_numbers.append({
				'codesSimpleCombination': convert_simple_md5_combination_to_simple_codes_combination(first_md5_product),
				'codesComplexCombination': codes_complex_combination,
				'number': number
			})

			# more symlink must be added in order to get the files with 2 or more passwords
			if (len(md5_product_list) > 1):
				for complex_md5 in md5_product_list[1:]:
					complex_dir = os.path.join(
						Options.config['cache_path'],
						Options.config['protected_directories_prefix'] + complex_md5
					)

					if complex_dir not in self.created_dirs:
						make_dir(complex_dir, "protected content directory")
						self.created_dirs.append(complex_dir)

					number, symlink_with_path = determine_symlink_number_and_name(os.path.join(
						complex_dir,
						album.cache_base
					))
					symlink = symlink_with_path[len(Options.config['cache_path']) + 1:]
					if separate_media:
						media_symlink = os.path.join(
							Options.config['protected_directories_prefix'] + complex_md5,
							album.cache_base + "." + str(number) + ".media.json"
						)
						media_symlinks.append(media_symlink)
					if separate_positions:
						positions_symlink = os.path.join(
							Options.config['protected_directories_prefix'] + complex_md5,
							album.cache_base + "." + str(number) + ".positions.json"
						)
						positions_symlinks.append(positions_symlink)

					symlinks.append(symlink)
					symlink_codes_and_numbers.append({
						'codesSimpleCombination': convert_simple_md5_combination_to_simple_codes_combination(complex_md5),
						'codesComplexCombination': codes_complex_combination,
						'number': number
					})

				for symlink in symlinks:
					self.all_json_files.append(symlink)
				if separate_media:
					for media_symlink in media_symlinks:
						self.all_json_files.append(media_symlink)
				if separate_positions:
					for positions_symlink in positions_symlinks:
						self.all_json_files.append(positions_symlink)
			album.symlink_codes_and_numbers = symlink_codes_and_numbers


		self.all_json_files.append(json_name)
		if separate_media:
			self.all_json_files.append(json_media_name)
		if separate_positions:
			self.all_json_files.append(json_positions_name)

		album.to_json_file(
			json_name,
			json_positions_name,
			json_media_name,
			symlinks,
			positions_symlinks,
			media_symlinks,
			complex_identifiers_combination
		)
		if album.cache_base == Options.config['folders_string']:
			back_level()
			indented_message("all physical albums saved to json files!", "", 4)
		elif album.cache_base == Options.config['by_date_string']:
			back_level()
			indented_message("all by date albums saved to json files!", "", 4)
		elif album.cache_base == Options.config['by_gps_string']:
			back_level()
			indented_message("all by gps albums saved to json files!", "", 4)
		elif album.cache_base == Options.config['by_search_string']:
			back_level()
			indented_message("all by search albums saved to json files!", "", 4)


	def generate_by_date_albums(self, origin_album):
		next_level()
		# convert the temporary structure where media are organized by year, month, date to a set of albums

		by_date_path = os.path.join(Options.config['album_path'], Options.config['by_date_string'])
		by_date_album = Album(by_date_path)
		by_date_album.parent_cache_base = origin_album.cache_base
		by_date_album.cache_base = Options.config['by_date_string']
		by_date_max_file_date = None

		years = sorted(list(self.tree_by_date.keys()))
		for year in years:
			year_path = os.path.join(by_date_path, str(year))
			year_album = Album(year_path)
			year_album.parent_cache_base = by_date_album.cache_base
			year_album.cache_base = by_date_album.cache_base + Options.config['cache_folder_separator'] + year
			year_max_file_date = None
			by_date_album.add_subalbum(year_album)

			months = sorted(list(self.tree_by_date[year].keys()))
			for month in months:
				month_path = os.path.join(year_path, str(month))
				month_album = Album(month_path)
				month_album.parent_cache_base = year_album.cache_base
				month_album.cache_base = year_album.cache_base + Options.config['cache_folder_separator'] + month
				month_max_file_date = None
				year_album.add_subalbum(month_album)

				days = sorted(list(self.tree_by_date[year][month].keys()))
				for day in days:
					media_list = self.tree_by_date[year][month][day]
					message("working with day album...", "", 5)
					day_path = os.path.join(month_path, str(day))
					day_album = Album(day_path)
					day_album.parent_cache_base = month_album.cache_base
					day_album.cache_base = month_album.cache_base + Options.config['cache_folder_separator'] + day
					day_max_file_date = None
					month_album.add_subalbum(day_album)
					for single_media in media_list:
						single_media.day_album_cache_base = day_album.cache_base
						day_album.add_single_media(single_media)
						month_album.add_single_media(single_media)
						year_album.add_single_media(single_media)
						if single_media.is_image:
							day_album.nums_media_in_sub_tree.incrementImages()
							month_album.nums_media_in_sub_tree.incrementImages()
							year_album.nums_media_in_sub_tree.incrementImages()
							by_date_album.nums_media_in_sub_tree.incrementImages()
						else:
							day_album.nums_media_in_sub_tree.incrementVideos()
							month_album.nums_media_in_sub_tree.incrementVideos()
							year_album.nums_media_in_sub_tree.incrementVideos()
							by_date_album.nums_media_in_sub_tree.incrementVideos()
						if single_media.has_gps_data:
							day_album.positions_and_media_in_tree.add_single_media(single_media)
							month_album.positions_and_media_in_tree.add_single_media(single_media)
							year_album.positions_and_media_in_tree.add_single_media(single_media)

						complex_identifiers_combination = complex_combination(convert_set_to_combination(single_media.album_identifiers_set), convert_set_to_combination(single_media.password_identifiers_set))
						if single_media.is_image:
							day_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
							month_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
							year_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
							by_date_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
						else:
							day_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)
							month_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)
							year_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)
							by_date_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)

						day_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)
						month_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)
						year_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)
						by_date_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)

						day_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)
						month_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)
						year_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)
						by_date_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)

						single_media_date = max(single_media.datetime_file, single_media.datetime_dir)
						if day_max_file_date:
							day_max_file_date = max(day_max_file_date, single_media_date)
						else:
							day_max_file_date = single_media_date
						if month_max_file_date:
							month_max_file_date = max(month_max_file_date, single_media_date)
						else:
							month_max_file_date = single_media_date
						if year_max_file_date:
							year_max_file_date = max(year_max_file_date, single_media_date)
						else:
							year_max_file_date = single_media_date
						if by_date_max_file_date:
							by_date_max_file_date = max(by_date_max_file_date, single_media_date)
						else:
							by_date_max_file_date = single_media_date
					message("calculating album date", "based on media and subalbums dates", 5)
					day_album.date = day_album.album_date()
					Options.all_albums.append(day_album)
					self.generate_composite_image(day_album, day_max_file_date)
					indented_message("day album worked out", media_list[0].year + "-" + media_list[0].month + "-" + media_list[0].day, 4)
				message("calculating album date", "based on media and subalbums dates", 5)
				month_album.date = month_album.album_date()
				Options.all_albums.append(month_album)
				self.generate_composite_image(month_album, month_max_file_date)
			message("calculating album date", "based on media and subalbums dates", 5)
			year_album.date = year_album.album_date()
			Options.all_albums.append(year_album)
			self.generate_composite_image(year_album, year_max_file_date)
		message("calculating album date", "based on media and subalbums dates", 5)
		by_date_album.date = by_date_album.album_date()
		Options.all_albums.append(by_date_album)
		if by_date_album.nums_media_in_sub_tree.total() > 0:
			self.generate_composite_image(by_date_album, by_date_max_file_date)
		back_level()
		return by_date_album


	def generate_by_search_albums(self, origin_album):
		next_level()
		# convert the temporary structure where media are organized by words to a set of albums

		by_search_path = os.path.join(Options.config['album_path'], Options.config['by_search_string'])
		by_search_album = Album(by_search_path)
		by_search_album.parent_cache_base = origin_album.cache_base
		by_search_album.cache_base = Options.config['by_search_string']
		by_search_max_file_date = None
		message("working with word albums...", "", 5)
		keys = sorted(list(self.tree_by_search.keys()))
		for word in keys:
		# for word, media_album_and_words in self.tree_by_search.items():
			media_album_and_words = self.tree_by_search[word]
			next_level()
			message("working with word album...", "", 5)
			word_path = os.path.join(by_search_path, str(word))
			word_album = Album(word_path)
			word_album._name = str(word)
			word_album.parent_cache_base = by_search_album.cache_base
			word_album.cache_base = by_search_album.generate_cache_base(os.path.join(by_search_album.path, word))
			word_max_file_date = None
			by_search_album.add_subalbum(word_album)
			for single_media in media_album_and_words["media_list"]:
				word_album.add_single_media(single_media)
				if single_media.is_image:
					word_album.nums_media_in_sub_tree.incrementImages()
					# actually, this counter for the search root album is not significant
					by_search_album.nums_media_in_sub_tree.incrementImages()
				else:
					word_album.nums_media_in_sub_tree.incrementVideos()
					# actually, this counter for the search root album is not significant
					by_search_album.nums_media_in_sub_tree.incrementVideos()

				single_media_date = max(single_media.datetime_file, single_media.datetime_dir)
				# if word_max_file_date:
				# 	word_max_file_date = max(word_max_file_date, single_media_date)
				# else:
				# 	word_max_file_date = single_media_date
				# if by_search_max_file_date:
				# 	by_search_max_file_date = max(by_search_max_file_date, single_media_date)
				# else:
				# 	by_search_max_file_date = single_media_date
				if single_media.has_gps_data:
					word_album.positions_and_media_in_tree.add_single_media(single_media)
					# actually, this counter for the search root album is not significant
					by_search_album.positions_and_media_in_tree.add_single_media(single_media)

				complex_identifiers_combination = complex_combination(convert_set_to_combination(single_media.album_identifiers_set), convert_set_to_combination(single_media.password_identifiers_set))

				if single_media.is_image:
					word_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
					# nums_protected_media_in_sub_tree matters for the search root albums!
					by_search_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
				else:
					word_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)
					by_search_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)

				word_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)
				by_search_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)

				word_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)
				by_search_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)

			for single_album in media_album_and_words["albums_list"]:
				word_album.add_subalbum(single_album)
				# if word_max_file_date:
				# 	word_max_file_date = max(word_max_file_date, single_album.date)
				# else:
				# 	word_max_file_date = single_album.date
				# if by_search_max_file_date:
				# 	by_search_max_file_date = max(by_search_max_file_date, single_album.date)
				# else:
				# 	by_search_max_file_date = single_album.date

				# word_album.nums_protected_media_in_sub_tree.merge(single_album.nums_protected_media_in_sub_tree)
				# word_album.sizes_protected_media_in_sub_tree.merge(single_album.sizes_protected_media_in_sub_tree)
				# word_album.sizes_protected_media_in_album.merge(single_album.sizes_protected_media_in_album)

			word_album.unicode_words = media_album_and_words["unicode_words"]
			Options.all_albums.append(word_album)
			indented_message("word album worked out", word, 4)
			back_level()
		Options.all_albums.append(by_search_album)
		back_level()
		return by_search_album

	def make_clusters(self, media_list, k, time_factor):
		# found = False
		# while len(media_list) > 0 and not found:
		cluster_list = Geonames.find_centers(media_list, k, time_factor)
		good_clusters = []
		remaining_media_list = []
		big_clusters = []
		# found = False
		for cluster in cluster_list:
			if len(cluster) <= Options.config['big_virtual_folders_threshold']:
				good_clusters.append(cluster)
				# found = True
			else:
				big_clusters.append(cluster)
				remaining_media_list.extend(cluster)
		# if found:
		# 	media_list = remaining_media_list
		return [good_clusters, big_clusters, remaining_media_list]

	def make_clusters_recursively(self, cluster_list_ok, media_list, k, n_recursion, time_factor):
		# media_list_lengths = [0, 0]
		# convergence = True
		# while len(media_list) > 0 and convergence:
		[good_clusters, big_clusters, remaining_media_list] = self.make_clusters(media_list, k, time_factor)

		for cluster in good_clusters:
			cluster_list_ok.append(cluster)
			indented_message("found cluster n.", str(len(cluster_list_ok)) + ", " + str(len(cluster)) + " images, at recursion n. " + str(n_recursion), 5)
		for cluster in big_clusters:
			indented_message("found big cluster",                                   str(len(cluster)) + " images, at recursion n. " + str(n_recursion), 5)

		if len(big_clusters) == 0:
			return [[], []]
		else:
			# media_list_lengths.append(len(remaining_media_list))
			# media_list_lengths.pop(0)
			# if max(media_list_lengths) > 0 and media_list_lengths[0] == media_list_lengths[1]:
			if len(big_clusters) == 1 and len(media_list) == len(remaining_media_list):
				indented_message("no way to cluster any further", "still " + str(len(remaining_media_list)) + " images, at recursion n. " + str(n_recursion), 5)
				return [big_clusters, remaining_media_list]
			else:
				indented_message("big clusters:", "still " + str(len(big_clusters)) + " clusters, " + str(len(remaining_media_list)) + " images, clustering them recursively", 5)
				all_remaining_media = []
				remaining_clusters = []
				indented_message("cycling in big clusters...", "", 5)
				next_level()
				for cluster in big_clusters:
					indented_message("working with a big cluster", str(len(cluster)) + " images", 5)
					[cluster_list, remaining_media] = self.make_clusters_recursively(cluster_list_ok, cluster, k, n_recursion + 1, time_factor)
					if len(remaining_media) > 0:
						remaining_clusters.extend(cluster_list)
						all_remaining_media.extend(remaining_media)
				back_level()
				return [remaining_clusters, all_remaining_media]

	def make_k_means_cluster(self, cluster_list_ok, media_list, time_factor):
		max_cluster_length_list = [0, 0, 0]
		k = 4
		if Options.config['big_virtual_folders_threshold'] < k:
			k = 2
		while True:
			message("clustering with k-means algorithm...", "time factor = " + str(time_factor) + ", k = " + str(k), 5)
			n_recursion = 1
			[big_clusters, remaining_media] = self.make_clusters_recursively(cluster_list_ok, media_list, k, n_recursion, time_factor)
			if (len(remaining_media) == 0):
				break
			else:
				# detect no convergence
				max_cluster_length = max([len(cluster) for cluster in big_clusters])
				max_cluster_length_list.append(max_cluster_length)
				max_cluster_length_list.pop(0)
				if max(max_cluster_length_list) > 0 and max(max_cluster_length_list) == min(max_cluster_length_list):
					# three times the same value: no convergence
					indented_message("clustering with k-means algorithm failed", "max cluster length doesn't converge, it's stuck at " + str(max_cluster_length), 5)
					break

				if k > len(media_list):
					indented_message("clustering with k-means algorithm failed", "clusters remain too big even with k > number of images (" + str(len(media_list)) + ")", 5)
					break
				indented_message("clustering with k-means algorithm not ok", "biggest cluster has " + str(max_cluster_length) + " photos, doubling the k factor", 5)
				media_list = remaining_media
				k = k * 2
		return [big_clusters, media_list]

	def generate_by_geonames_albums(self, origin_album):
		next_level()
		# convert the temporary structure where media are organized by country_code, region_code, place_code to a set of albums

		by_geonames_path = os.path.join(Options.config['album_path'], Options.config['by_gps_string'])
		by_geonames_album = Album(by_geonames_path)
		by_geonames_album.parent_cache_base = origin_album.cache_base
		by_geonames_album.cache_base = Options.config['by_gps_string']
		by_geonames_max_file_date = None

		country_codes = sorted(list(self.tree_by_geonames.keys()))
		for country_code in country_codes:
			country_path = os.path.join(by_geonames_path, str(country_code))
			country_album = Album(country_path)
			country_album.center = {}
			country_album.parent_cache_base = by_geonames_album.cache_base
			country_album.cache_base = by_geonames_album.generate_cache_base(os.path.join(by_geonames_album.path, country_code))
			country_max_file_date = None
			by_geonames_album.add_subalbum(country_album)

			region_codes = sorted(list(self.tree_by_geonames[country_code].keys()))
			for region_code in region_codes:
				region_path = os.path.join(country_path, str(region_code))
				region_album = Album(region_path)
				region_album.center = {}
				region_album.parent_cache_base = country_album.cache_base
				region_album.cache_base = country_album.generate_cache_base(os.path.join(country_album.path, region_code))
				region_max_file_date = None
				country_album.add_subalbum(region_album)

				place_codes = list(self.tree_by_geonames[country_code][region_code].keys())
				place_names = [self.tree_by_geonames[country_code][region_code][place_code][0].place_name for place_code in self.tree_by_geonames[country_code][region_code]]
				# sort the codes according to the place names, https://stackoverflow.com/questions/6618515/sorting-list-based-on-values-from-another-list#answer-6618543
				place_codes = [place_code for _, place_code in sorted(zip(place_names, place_codes), key = lambda t: t[0])]
				# place_codes = [place_code for _, place_code in sorted(zip(place_names, place_codes))]
				for place_code in place_codes:
					media_list = self.tree_by_geonames[country_code][region_code][place_code]
					place_code = str(place_code)
					place_name = media_list[0].place_name
					message("working with place album...", media_list[0].country_name + "-" + media_list[0].region_name + "-" + place_name, 4)
					next_level()
					message("sorting media...", "", 5)
					media_list.sort(key=lambda m: m.latitude)
					indented_message("media sorted", "", 5)
					# check if there are too many media in album
					# in case, "place" album will be split in "place (subalbum 1)", "place (subalbum 2)",...
					# clustering is made with the kmeans algorithm
					# transform media_list in an element in a list, probably most times, we'll work with it
					message("checking if it's a big list...", "", 5)
					if len(media_list) <= Options.config['big_virtual_folders_threshold']:
						indented_message("it's not a big list", "", 5)
						cluster_list = [media_list]
					else:
						next_level()
						message("big list found", str(len(media_list)) + " photos, limit is " + str(Options.config['big_virtual_folders_threshold']), 5)

						# this array is used in order to detect when there is no convertion
						next_level()
						cluster_list_ok = []
						n_cluster = 0
						time_factor = 0
						[big_clusters, remaining_media_list] = self.make_k_means_cluster(cluster_list_ok, media_list, time_factor)
						if len(remaining_media_list) > 0:
							time_factor = 0.01
							[big_clusters, remaining_media_list] = self.make_k_means_cluster(cluster_list_ok, remaining_media_list, time_factor)
							if len(remaining_media_list) > 0:
								# we must split the big clusters into smaller ones
								# but firts sort media in cluster by date, so that we get more homogeneus clusters
								message("splitting remaining big clusters into smaller ones...", "", 5)
								n = 0
								for cluster in big_clusters:
									n += 1
									next_level()
									integer_ratio = len(cluster) // Options.config['big_virtual_folders_threshold']
									if integer_ratio != len(cluster) / Options.config['big_virtual_folders_threshold']:
										integer_ratio += 1
									message("working with remaining cluster n.", str(n) + ", " + str(len(cluster)) + " images, splitting it into " + str(integer_ratio) + " clusters", 5)

									# if integer_ratio >= 1:
									# 	# big cluster

									# sort the cluster by date
									next_level()
									message("sorting cluster by date...", "", 5)
									cluster.sort()
									indented_message("cluster sorted by date", "", 6)

									message("splitting cluster...", "", 5)
									next_level()
									new_length = len(cluster) // integer_ratio
									if new_length != len(cluster) / integer_ratio:
										new_length += 1
									for index in range(integer_ratio):
										n_cluster += 1
										start = index * new_length
										end = (index + 1) * new_length
										new_cluster = cluster[start:end]
										message("generating cluster n.", str(n_cluster) + ", containing " + str(len(new_cluster)) + " images", 5)
										cluster_list_ok.append(new_cluster)
									back_level()
									indented_message("cluster splitted", "", 6)
									back_level()
									# else:
									# 	indented_message("cluster is OK", "", 5)
									# 	cluster_list_ok.append(cluster)
									back_level()

						cluster_list = cluster_list_ok[:]
						max_cluster_ok_length = max([len(cluster) for cluster in cluster_list])
						message("clustering ok", str(len(cluster_list)) + " clusters, biggest one has " + str(max_cluster_ok_length) + " images, ", 5)

						back_level()
						back_level()

					# iterate on cluster_list
					num_digits = len(str(len(cluster_list)))
					alt_place_code = place_code
					alt_place_name = place_name
					set_alt_place = len(cluster_list) > 1
					for i, cluster in enumerate(cluster_list):
						if set_alt_place:
							next_level()
							message("processing cluster n.", str(i + 1) + " (" + str(len(cluster))+ " images)", 5)
							for single_media in cluster:
								print("                                                                    " + single_media.album_path + '/' + single_media.name)
							alt_place_code = place_code + "_" + str(i + 1).zfill(num_digits)
							alt_place_name = place_name + "_" + str(i + 1).zfill(num_digits)

						place_path = os.path.join(region_path, str(alt_place_code))
						place_album = Album(place_path)
						place_album.center = {}
						place_album.parent_cache_base = region_album.cache_base
						place_album.cache_base = region_album.generate_cache_base(os.path.join(region_album.path, place_code))
						place_max_file_date = None
						region_album.add_subalbum(place_album)
						for j, single_media in enumerate(cluster):
							single_media.gps_album_cache_base = place_album.cache_base
							cluster[j].gps_path = remove_album_path(place_path)
							cluster[j].place_name = place_name
							cluster[j].alt_place_name = alt_place_name

							place_album.positions_and_media_in_tree.add_single_media(single_media)
							region_album.positions_and_media_in_tree.add_single_media(single_media)
							country_album.positions_and_media_in_tree.add_single_media(single_media)
							place_album.add_single_media(single_media)
							region_album.add_single_media(single_media)
							country_album.add_single_media(single_media)
							if single_media.is_image:
								place_album.nums_media_in_sub_tree.incrementImages()
								region_album.nums_media_in_sub_tree.incrementImages()
								country_album.nums_media_in_sub_tree.incrementImages()
								by_geonames_album.nums_media_in_sub_tree.incrementImages()
							else:
								place_album.nums_media_in_sub_tree.incrementVideos()
								region_album.nums_media_in_sub_tree.incrementVideos()
								country_album.nums_media_in_sub_tree.incrementVideos()
								by_geonames_album.nums_media_in_sub_tree.incrementVideos()

							if place_album.center == {}:
								place_album.center['latitude'] = single_media.latitude
								place_album.center['longitude'] = single_media.longitude
								place_album._name = place_name
								place_album.alt_name = alt_place_name
							else:
								place_album.center['latitude'] = Geonames.recalculate_mean(place_album.center['latitude'], len(place_album.media_list), single_media.latitude)
								place_album.center['longitude'] = Geonames.recalculate_mean(place_album.center['longitude'], len(place_album.media_list), single_media.longitude)

							if region_album.center == {}:
								region_album.center['latitude'] = single_media.latitude
								region_album.center['longitude'] = single_media.longitude
								region_album._name = single_media.region_name
							else:
								region_album.center['latitude'] = Geonames.recalculate_mean(region_album.center['latitude'], len(region_album.media_list), single_media.latitude)
								region_album.center['longitude'] = Geonames.recalculate_mean(region_album.center['longitude'], len(region_album.media_list), single_media.longitude)

							if country_album.center == {}:
								country_album.center['latitude'] = single_media.latitude
								country_album.center['longitude'] = single_media.longitude
								country_album._name = single_media.country_name
							else:
								country_album.center['latitude'] = Geonames.recalculate_mean(country_album.center['latitude'], len(country_album.media_list), single_media.latitude)
								country_album.center['longitude'] = Geonames.recalculate_mean(country_album.center['longitude'], len(country_album.media_list), single_media.longitude)

							single_media_date = max(single_media.datetime_file, single_media.datetime_dir)
							if place_max_file_date:
								place_max_file_date = max(place_max_file_date, single_media_date)
							else:
								place_max_file_date = single_media_date
							if region_max_file_date:
								region_max_file_date = max(region_max_file_date, single_media_date)
							else:
								region_max_file_date = single_media_date
							if country_max_file_date:
								country_max_file_date = max(country_max_file_date, single_media_date)
							else:
								country_max_file_date = single_media_date
							if by_geonames_max_file_date:
								by_geonames_max_file_date = max(by_geonames_max_file_date, single_media_date)
							else:
								by_geonames_max_file_date = single_media_date

							complex_identifiers_combination = complex_combination(convert_set_to_combination(single_media.album_identifiers_set), convert_set_to_combination(single_media.password_identifiers_set))
							if single_media.is_image:
								place_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
								region_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
								country_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
								by_geonames_album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
							else:
								place_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)
								region_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)
								country_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)
								by_geonames_album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)

							place_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)
							region_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)
							country_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)
							by_geonames_album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)

							place_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)
							region_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)
							country_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)
							by_geonames_album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)

						message("calculating album date", "based on media and subalbums dates", 5)
						place_album.date = place_album.album_date()
						Options.all_albums.append(place_album)
						self.generate_composite_image(place_album, place_max_file_date)
						if set_alt_place:
							indented_message("cluster worked out", str(i + 1) + "-th cluster: " + cluster[0].country_code + "-" + cluster[0].region_code + "-" + alt_place_name, 4)
							back_level()
						else:
							# next_level()
							message("place album worked out", cluster[0].country_code + "-" + cluster[0].region_code + "-" + alt_place_name, 4)
							# back_level()
					if set_alt_place and len(cluster_list[0]) >= 1:
						# next_level()
						message("place album worked out", cluster_list[0][0].country_code + "-" + cluster_list[0][0].region_code + "-" + place_name, 4)
						# back_level()
					back_level()
				message("calculating album date", "based on media and subalbums dates", 5)
				region_album.date = region_album.album_date()
				Options.all_albums.append(region_album)
				self.generate_composite_image(region_album, region_max_file_date)
			message("calculating album date", "based on media and subalbums dates", 5)
			country_album.date = country_album.album_date()
			Options.all_albums.append(country_album)
			self.generate_composite_image(country_album, country_max_file_date)
		message("calculating album date", "based on media and subalbums dates", 5)
		by_geonames_album.date = by_geonames_album.album_date()
		Options.all_albums.append(by_geonames_album)
		if by_geonames_album.nums_media_in_sub_tree.total() > 0:
			self.generate_composite_image(by_geonames_album, by_geonames_max_file_date)
		back_level()
		return by_geonames_album

	def remove_stopwords(self, alphabetic_words, search_normalized_words, ascii_words):
		# remove the stopwords found in alphabetic_words, from search_normalized_words and ascii_words
		purged_alphabetic_words = set(alphabetic_words) - TreeWalker.lowercase_stopwords
		purged_search_normalized_words = []
		purged_ascii_words = []
		alphabetic_words = list(alphabetic_words)
		search_normalized_words = list(search_normalized_words)
		ascii_words = list(ascii_words)
		for word_index in range(len(alphabetic_words)):
			if alphabetic_words[word_index] in purged_alphabetic_words:
				purged_search_normalized_words.append(search_normalized_words[word_index])
				purged_ascii_words.append(ascii_words[word_index])
			else:
				message("stopword removed", alphabetic_words[word_index], 5)

		return purged_alphabetic_words, purged_search_normalized_words, purged_ascii_words

	# The dictionaries of stopwords for the user language
	lowercase_stopwords = {}

	@staticmethod
	def load_stopwords():
		"""
		Load the list of stopwords for the user language into the set `lowercase_stopwords`
		The list of stopwords comes from https://github.com/stopwords-iso/stopwords-iso
		"""
		language = Options.config['language'] if Options.config['language'] != '' else os.getenv('LANG')[:2]
		message("PRE working with stopwords", "Using language " + language, 4)

		stopwords = []
		stopwords_file = os.path.join(os.path.dirname(__file__), "resources/stopwords-iso.json")
		next_level()
		message("PRE loading stopwords...", stopwords_file, 4)
		with open(stopwords_file, "r") as stopwords_p:
			stopwords = json.load(stopwords_p)

		if language in stopwords:
			phrase = " ".join(stopwords[language])
			TreeWalker.lowercase_stopwords = frozenset(switch_to_lowercase(phrase).split())
			indented_message("PRE stopwords loaded", "", 4)
			TreeWalker.save_stopwords()
		else:
			indented_message("PRE stopwords: no stopwords for language", language, 4)
		back_level()
		return

	@staticmethod
	def save_stopwords():
		"""
		Saves the list of stopwords for the user language into the cache directory
		"""
		message("PRE saving stopwords to cache directory", TreeWalker.stopwords_file, 4)
		with open(TreeWalker.stopwords_file, "w") as stopwords_p:
			json.dump({'stopWords': list(TreeWalker.lowercase_stopwords)}, stopwords_p)
		indented_message("PRE stopwords saved!", "", 4)
		return

	@staticmethod
	def get_lowercase_stopwords():
		"""
		Get the set of lowercase stopwords used when searching albums.
		Loads the stopwords from resource file if necessary.
		"""
		if TreeWalker.lowercase_stopwords == {}:
			TreeWalker.load_stopwords()

	def add_single_media_to_tree_by_date(self, single_media):
		# add the given media to a temporary structure where media are organized by year, month, date

		if single_media.year not in list(self.tree_by_date.keys()):
			self.tree_by_date[single_media.year] = {}
		if single_media.month not in list(self.tree_by_date[single_media.year].keys()):
			self.tree_by_date[single_media.year][single_media.month] = {}
		if single_media.day not in list(self.tree_by_date[single_media.year][single_media.month].keys()):
			self.tree_by_date[single_media.year][single_media.month][single_media.day] = list()
		if not any(single_media.media_file_name == _media.media_file_name for _media in self.tree_by_date[single_media.year][single_media.month][single_media.day]):
		#~ if not single_media in self.tree_by_date[single_media.year][single_media.month][single_media.day]:
			self.tree_by_date[single_media.year][single_media.month][single_media.day].append(single_media)

	def add_single_media_to_tree_by_search(self, single_media):
		words_for_word_list, unicode_words, words_for_search_album_name = self.prepare_for_tree_by_search(single_media)
		single_media.words = words_for_word_list
		for word_index in range(len(words_for_search_album_name)):
			word = words_for_search_album_name[word_index]
			unicode_word = unicode_words[word_index]
			if word:
				if word not in list(self.tree_by_search.keys()):
					self.tree_by_search[word] = {"media_list": [], "albums_list": [], "unicode_words": []}
				if single_media not in self.tree_by_search[word]["media_list"]:
					self.tree_by_search[word]["media_list"].append(single_media)
				if unicode_word not in self.tree_by_search[word]["unicode_words"]:
					self.tree_by_search[word]["unicode_words"].append(unicode_word)

	def add_album_to_tree_by_search(self, album):
		words_for_word_list, unicode_words, words_for_search_album_name = self.prepare_for_tree_by_search(album)
		album.words = words_for_word_list
		for word_index in range(len(words_for_search_album_name)):
			word = words_for_search_album_name[word_index]
			unicode_word = unicode_words[word_index]
			if word:
				if word not in list(self.tree_by_search.keys()):
					self.tree_by_search[word] = {"media_list": [], "albums_list": [], "unicode_words": []}
				if not album.is_already_in_tree_by_search(self.tree_by_search[word]):
				# if album not in self.tree_by_search[word]["albums_list"]:
					# self.tree_by_search[word]["albums_list"].append(album)
					self.tree_by_search[word]["albums_list"].append(album.copy())
					if unicode_word not in self.tree_by_search[word]["unicode_words"]:
						self.tree_by_search[word]["unicode_words"].append(unicode_word)


	def prepare_for_tree_by_search(self, media_or_album):
		# add the given media or album to a temporary structure where media or albums are organized by search terms
		# works on the words in the file/directory name and in album.ini's description, title, tags

		# media_or_album.name must be the last item because the normalization will remove the file extension
		media_or_album_name = media_or_album.name
		if isinstance(media_or_album, Media):
			# remove the extension
			media_or_album_name = os.path.splitext(media_or_album_name)[0]

		elements = [media_or_album.title, media_or_album.description, " ".join(media_or_album.tags), media_or_album_name]
		phrase = ' '.join([_f for _f in elements if _f])
		# strip html tags
		phrase = re.sub('<[^<]+?>', '', phrase)
		# strip new lines
		phrase = ' '.join(phrase.splitlines())

		alphabetic_phrase = remove_non_alphabetic_characters(remove_digits(phrase))
		lowercase_phrase = switch_to_lowercase(alphabetic_phrase)
		search_normalized_phrase = remove_accents(lowercase_phrase)
		ascii_phrase = convert_to_ascii_only(search_normalized_phrase)

		alphabetic_words = phrase_to_words(alphabetic_phrase)
		search_normalized_words = phrase_to_words(search_normalized_phrase)
		ascii_words = phrase_to_words(ascii_phrase)

		if (Options.config['use_stop_words']):
			# remove stop words: do it according to the words in lower case, different words could be removed if performing remotion from every list
			next_level()
			alphabetic_words, search_normalized_words, ascii_words = self.remove_stopwords(alphabetic_words, search_normalized_words, ascii_words)
			alphabetic_words = list(alphabetic_words)
			back_level()

		return alphabetic_words, search_normalized_words, ascii_words


	def add_single_media_to_tree_by_geonames(self, single_media):
		# add the given media to a temporary structure where media are organized by country, region/state, place

		if single_media.country_code not in list(self.tree_by_geonames.keys()):
			self.tree_by_geonames[single_media.country_code] = {}
		if single_media.region_code not in list(self.tree_by_geonames[single_media.country_code].keys()):
			self.tree_by_geonames[single_media.country_code][single_media.region_code] = {}
		if single_media.place_code not in list(self.tree_by_geonames[single_media.country_code][single_media.region_code].keys()):
			self.tree_by_geonames[single_media.country_code][single_media.region_code][single_media.place_code] = list()
		if not any(single_media.media_file_name == _media.media_file_name for _media in self.tree_by_geonames[single_media.country_code][single_media.region_code][single_media.place_code]):
			self.tree_by_geonames[single_media.country_code][single_media.region_code][single_media.place_code].append(single_media)


	@staticmethod
	def _listdir_sorted_by_time(path):
		# this function returns the directory listing sorted by mtime
		# it takes into account the fact that the file is a symlink to an nonexistent file
		mtime = lambda f: os.path.exists(os.path.join(path, f)) and os.stat(os.path.join(path, f)).st_mtime or time.mktime(datetime.now().timetuple())
		return list(sorted(os.listdir(path), key=mtime))

	@staticmethod
	def _listdir_sorted_alphabetically(path):
		# this function returns the directory listing sorted alphabetically
		return list(sorted(os.listdir(path)))


	# This functions is called recursively
	# it works on a directory and produces the album for the directory
	def walk(self, absolute_path, album_cache_base, patterns_and_passwords, inherited_passwords_mtime, inherited_passwords_identifiers, parent_album=None):
		patterns_and_passwords = copy.deepcopy(patterns_and_passwords)
		inherited_passwords_identifiers = copy.deepcopy(inherited_passwords_identifiers)
		inherited_passwords_mtime = copy.deepcopy(inherited_passwords_mtime)
		passwords_or_album_ini_processed = False
		max_file_date = file_mtime(absolute_path)
		message(">>>>>>>>>>>  Entering directory", absolute_path, 1)
		next_level()
		message("cache base", album_cache_base, 4)
		if not os.access(absolute_path, os.R_OK | os.X_OK):
			message("access denied to directory", os.path.basename(absolute_path), 1)
			back_level()
			return [None, None, None]
		listdir = os.listdir(absolute_path)
		if Options.config['exclude_tree_marker'] in listdir:
			indented_message("excluded with subfolders by marker file", Options.config['exclude_tree_marker'], 4)
			back_level()
			return [None, None, None]
		skip_files = False
		if Options.config['exclude_files_marker'] in listdir:
			indented_message("files excluded by marker file", Options.config['exclude_files_marker'], 4)
			skip_files = True

		############################################################
		# look for password marker and manage it
		############################################################
		must_process_passwords = False
		passwords_marker_mtime = inherited_passwords_mtime
		passwords_marker = os.path.join(absolute_path, Options.config['passwords_marker'])
		if len(Options.identifiers_and_passwords) and Options.config['passwords_marker'] in listdir:
			next_level()
			message(Options.config['passwords_marker'] + " file found", "reading it", 4)
			new_passwords_marker_mtime = file_mtime(passwords_marker)
			if passwords_marker_mtime is not None:
				passwords_marker_mtime = max(passwords_marker_mtime, new_passwords_marker_mtime)
			else:
				passwords_marker_mtime = new_passwords_marker_mtime
			if not os.access(passwords_marker, os.R_OK):
				indented_message("unreadable file", passwords_marker, 2)
			else:
				with open(passwords_marker, 'r') as passwords_file:
					for line in passwords_file.read().splitlines():
						# remove leading spaces
						line = line.lstrip()
						# lines beginning with # and space-only ones are ignored
						if line[0:1] == "#" or line.strip() == "":
							continue
						columns = line.split(' ')
						if len(columns) == 1:
							# it's a simple identifier: the album and all the subalbums will be protected with the corresponding password
							identifier = columns[0]
							indexes = [value['identifier'] for index,value in enumerate(Options.identifiers_and_passwords) if value['identifier'] == identifier]
							if len(indexes) == 0:
								indented_message("WARNING: using an unknown password identifier", identifier + ": not protecting the directory", 2)
							elif len(indexes) == 1:
								password_md5 = indexes[0]['md5']
								password_code = indexes[0]['code']
								patterns_and_passwords.append(
									{
										"pattern": '*',
										"case_flag": 'ci',
										"whole_flag": 'whole',
										"what_flag": 'both',
										"identifier": identifier
									}
								)
								indented_message("Directory protection requested", "identifier: " + identifier, 3)
							else:
								indented_message("WARNING: password identifier used more than once", identifier + ": not protecting the directory", 2)
						else:
							# a password identifier followed by the flags and a file pattern
							identifier = columns[0]
							remaining_columns = " ".join(columns[1:]).lstrip().split()
							flags = remaining_columns[0]
							case_flag = 'ci'
							whole_flag = 'part'
							what_flag = 'both'
							case = 'case insensitive'
							whole = 'part of name'
							what = "files and dirs"
							if flags != '-':
								flag_list = flags.split(',')
								try:
									index_ci = flag_list.index('ci')
								except:
									index_ci = -1
								try:
									index_cs = flag_list.index('cs')
								except:
									index_cs = -2
								try:
									flag_list.remove('cs')
								except:
									pass
								try:
									flag_list.remove('ci')
								except:
									pass

								try:
									index_whole = flag_list.index('whole')
								except:
									index_whole = -2
								try:
									index_part = flag_list.index('part')
								except:
									index_part = -1
								try:
									flag_list.remove('whole')
								except:
									pass
								try:
									flag_list.remove('part')
								except:
									pass

								try:
									index_filesonly = flag_list.index('filesonly')
								except:
									index_filesonly = -3
								try:
									index_dirsonly = flag_list.index('dirsonly')
								except:
									index_dirsonly = -2
								try:
									index_both = flag_list.index('both')
								except:
									index_both = -1
								try:
									flag_list.remove('filesonly')
								except:
									pass
								try:
									flag_list.remove('dirsonly')
								except:
									pass
								try:
									flag_list.remove('both')
								except:
									pass

								if index_cs > index_ci:
									case_flag = 'cs'
									case = 'case sensitive'

								if index_whole > index_part:
									whole_flag = 'whole'
									whole = 'whole name'

								if index_filesonly > index_dirsonly and index_filesonly > index_both:
									what_flag = 'filesonly'
									what = 'files only'
								elif index_dirsonly > index_filesonly and index_dirsonly > index_both:
									what_flag = 'dirsonly'
									what = 'dirs only'

								if len(flag_list) > 0:
									indented_message("WARNING: unknown password flags", ','.join(flag_list), 3)
							indexes = [value['identifier'] for index,value in enumerate(Options.identifiers_and_passwords) if value['identifier'] == identifier]
							# everything beginning with the first non-space character after the case flag till the end of line (including the traling spaces) is the pattern
							pattern = " ".join(remaining_columns[1:]).lstrip()
							if len(indexes) == 0:
								indented_message("WARNING: using an unknown password identifier", identifier + ": not protecting the directory", 2)
							elif len(indexes) == 1:
								flags_string = case + ', ' + whole + ', ' + what
								indented_message("file(s) protection requested", "identifier: '" + identifier + "', pattern: '" + pattern + "', " + flags_string, 4)
								patterns_and_passwords.append(
									{
										"pattern": pattern,
										"case_flag": case_flag,
										"whole_flag": whole_flag,
										"what_flag": what_flag,
										"identifier": identifier
									}
								)
							else:
								indented_message("WARNING: password identifier used more than once", identifier + ": not using it here", 2)
			back_level()


		############################################################
		# look for album.ini file in order to check json file validity against it
		############################################################
		album_ini_file = os.path.join(absolute_path, Options.config['metadata_filename'])
		album_ini_good = False

		must_process_album_ini = False
		if os.path.exists(album_ini_file):
			if not os.access(album_ini_file, os.R_OK):
				message("album.ini file unreadable", "", 2)
			elif os.path.getsize(album_ini_file) == 0:
				message("album.ini file has zero lenght", "", 2)
			else:
				album_ini_good = True

		############################################################
		# look for album json files and check their validity
		############################################################
		json_file_list, json_files_min_mtime = json_files_and_mtime(album_cache_base)
		cached_album = None
		album_cache_hit = False

		if Options.config['recreate_json_files']:
			message("not an album cache hit", "forced json file recreation, some sensible option has changed", 3)
		elif Options.json_version == 0:
			indented_message("not an album cache hit", "json_version == 0 (debug mode)", 4)
		elif Options.obsolete_json_version:
			message("not an album cache hit", "obsolete json_version value", 3)
		elif len(json_file_list) == 0:
			message("not an album cache hit", "json files not found in cache dir", 3)
		elif not all([os.access(json, os.R_OK) for json in json_file_list]):
			message("not an album cache hit", "some json file unreadable", 1)
		elif not all([os.access(json, os.W_OK) for json in json_file_list]):
			message("not an album cache hit", "some json file unwritable", 1)
		else:
			if len(json_file_list) == 1:
				files = "'" + json_file_list[0] + "'"
			else:
				files = "'" + json_file_list[0] + "' and others"

			if album_ini_good and file_mtime(album_ini_file) > json_files_min_mtime:
				# a check on album_ini_file content would have been good:
				# execution comes here even if album.ini hasn't anything significant
				message("not an album cache hit", "album.ini newer than json file, recreating json file taking into account album.ini", 4)
			elif file_mtime(absolute_path) >= json_files_min_mtime:
				indented_message("not an album cache hit", "album dir newer than json file", 4)
			else:
				message("maybe an album cache hit", "trying to import album from " + files, 5)
				# the following is the instruction which could raise the error
				try:
					[cached_album, must_process_passwords] = Album.from_json_files(json_file_list, json_files_min_mtime)
					if cached_album is None:
						indented_message("not an album cache hit", "null cached album", 4)
					else:
						indented_message("json file imported", "", 5)
						if not hasattr(cached_album, "absolute_path"):
							indented_message("not an album cache hit", "cached album hasn't absolute_path", 4)
							cached_album = None
						elif cached_album.absolute_path != absolute_path:
							indented_message("not an album cache hit", "cached album's absolute_path != absolute_path", 4)
							cached_album = None
						else:
							indented_message("album cache hit!", "", 4)
							album = cached_album
							album_cache_hit = True
				except KeyError:
					indented_message("not an album cache hit", "error in passwords codes", 4)
					cached_album = None
					must_process_passwords = True
			# except IOError:
			# 	# will execution never come here?
			# 	indented_message("not an album cache hit", "json file nonexistent", 4)
			# 	album_cache_hit = False
			# is the following exception needed? it surely catched date errors...
			# except (ValueError, AttributeError, KeyError):
			# 	indented_message("not an album cache hit", "ValueError, AttributeError or KeyError somewhere", 4)
			# 	album_cache_hit = False
			# 	cached_album = None

		if not album_cache_hit:
			must_process_album_ini = True

		if not os.path.exists(album_ini_file) and album_cache_hit and album.album_ini_mtime is not None:
			# album.ini was used to create json files but has been removed
			message("not an album cache hit", "album.ini absent, but values from it are in json file", 2)
			album_cache_hit = False
			album_ini_good = False

		if not os.path.exists(passwords_marker) and album_cache_hit and album.passwords_marker_mtime is not None:
			# a password marker were used in the last scanner run but has been removed
			message("not an album cache hit", "password marker absent, but was used in the last scanner run", 2)
			album_cache_hit = False

		if not album_cache_hit:
			message("generating void album...", "", 5)
			album = Album(absolute_path)
			indented_message("void album generated", "", 5)

		if not album_cache_hit and album_ini_good:
			if must_process_album_ini:
				album.read_album_ini(album_ini_file)
				# save the album.ini mtime: it help know whether the file has been removed
				album.album_ini_mtime = file_mtime(album_ini_file)
				indented_message("album.ini read!", "", 2)
			else:
				message("album.ini values already in json file", "", 2)

		if parent_album is not None:
			album.parent_cache_base = parent_album.cache_base
		album.cache_base = album_cache_base

		dir_name = os.path.basename(absolute_path)

		############################################################
		# check passwords validity
		############################################################
		if not must_process_passwords:
			if json_files_min_mtime is None:
				indented_message("passwords must be processed", "json files don't exist", 4)
				must_process_passwords = True
			elif not album_cache_hit:
				indented_message("passwords must be processed", "album isn't a cache hit", 4)
				must_process_passwords = True
			elif Options.passwords_file_mtime is not None and Options.passwords_file_mtime >= json_files_min_mtime:
				indented_message("passwords must be processed", "passwords file newer than json file or absent", 4)
				must_process_passwords = True
			elif Options.old_password_codes == {} and Options.passwords_file_mtime is not None:
				# execution comes here when the password file has been renamed without modifying it
				indented_message("passwords must be processed", "passwords file didn't exist in previous scanner run", 4)
				must_process_passwords = True
			elif len(patterns_and_passwords) > 0 and passwords_marker_mtime is not None and passwords_marker_mtime >= json_files_min_mtime:
				indented_message("passwords must be processed", "'" + Options.config['passwords_marker'] + "' newer than json file or absent", 4)
				must_process_passwords = True

		# check album name against passwords
		if must_process_passwords:
			# if passwords are to be processed, this invalidates the cache albums
			album_cache_hit = False

			next_level()
			message("processing passwords for album...", "", 4)
			# restart with the inherited passwords
			album.password_identifiers_set = inherited_passwords_identifiers
			# get the matching passwords
			next_level()
			for pattern_and_password in patterns_and_passwords:
				if pattern_and_password['what_flag'] == 'filesonly':
					indented_message("password not added to album", "flag 'filesonly' prevents applying this pattern to dir names", 3)
				else:
					case = "case insentitive"
					whole = "part of name"
					if pattern_and_password['case_flag'] == 'cs':
						if pattern_and_password['whole_flag'] == 'whole':
							match = fnmatch.fnmatchcase(dir_name, pattern_and_password['pattern'])
							whole = "whole name"
						else:
							match = fnmatch.fnmatchcase(dir_name, "*" + pattern_and_password['pattern'] + "*")
						case = "case sentitive"
					else:
						if pattern_and_password['whole_flag'] == 'whole':
							match = re.match(fnmatch.translate(pattern_and_password['pattern']), dir_name, re.IGNORECASE)
							whole = "whole name"
						else:
							match = re.match(fnmatch.translate("*" + pattern_and_password['pattern'] + "*"), dir_name, re.IGNORECASE)

					# add the matching patterns
					if match:
						identifier = pattern_and_password['identifier']
						Options.mark_identifier_as_used(identifier)
						if identifier not in album.password_identifiers_set:
							album.password_identifiers_set.add(identifier)
							indented_message(
								"password added to album",
								"'" + dir_name + "' matches '" + pattern_and_password['pattern'] + "' " + case + ", " + whole + ", identifier = " + identifier,
								3
							)
						else:
							indented_message(
								"password not added to album",
								dir_name + "' matches '" + pattern_and_password['pattern'] + "' " + case + ", " + whole + ", but identifier '" + identifier + "' already protects the album",
								3
							)
			back_level()
			indented_message("passwords for album processed!", "", 4)
			back_level()
		else:
			indented_message("no need to process passwords for album", "", 5)
			for identifier in album.password_identifiers_set:
				Options.mark_identifier_as_used(identifier)

		# reset the protected media counts
		album.nums_protected_media_in_sub_tree = NumsProtected()
		album.sizes_protected_media_in_sub_tree = SizesProtected()
		album.sizes_protected_media_in_album = SizesProtected()

		message("reading directory", absolute_path, 5)
		message("subdir for cache files", " " + album.subdir, 4)

		num_video_in_dir = 0
		num_video_processed_in_dir = 0
		num_photo_in_dir = 0
		num_photo_processed_in_dir = 0
		num_photo_with_exif_date_in_dir = 0
		num_photo_with_geotags_in_dir = 0
		num_photo_with_exif_date_and_geotags_in_dir = 0
		photos_with_exif_date_and_without_geotags_in_dir = []
		photos_without_exif_date_and_with_geotags_in_dir = []
		photos_without_exif_date_or_geotags_in_dir = []
		files_in_dir = []
		unrecognized_files_in_dir = []
		for entry in self._listdir_sorted_alphabetically(absolute_path):
			try:
				entry = os.fsdecode(entry)
			except KeyboardInterrupt:
				raise
			except:
				indented_message("unicode error", entry, 1)
				continue

			if entry[0] == '.' or entry == Options.config['metadata_filename']:
				# skip hidden files/directories and  user's metadata file 'album.ini'
				continue
			if Options.global_pattern != "" and re.search(Options.global_pattern, entry):
				# skip excluded files/directories
				indented_message("skipping file/directory matching a pattern", "global pattern = '" + Options.global_pattern + "', entry = '" + entry + "'" , 3)
				continue

			entry_with_path = os.path.join(absolute_path, entry)
			if not os.path.exists(entry_with_path):
				indented_message("nonexistent file, perhaps a symlink, skipping", entry_with_path, 2)
			elif not os.access(entry_with_path, os.R_OK):
				indented_message("unreadable file", entry_with_path, 2)
			elif os.path.islink(entry_with_path) and not Options.config['follow_symlinks']:
				# this way file symlink are skipped too: may be symlinks can be checked only for directories?
				indented_message("symlink, skipping it as per 'follow_symlinks' option", entry_with_path, 3)
			elif os.path.isdir(entry_with_path):
				if os.path.islink(entry_with_path) and Options.config['follow_symlinks']:
					indented_message("symlink to dir, following it as per 'follow_symlinks' option", entry_with_path, 3)
				trimmed_path = trim_base_custom(absolute_path, Options.config['album_path'])
				entry_for_cache_base = os.path.join(Options.config['folders_string'], trimmed_path, entry)
				next_level()
				message("determining cache base...", "", 5)
				next_album_cache_base = album.generate_cache_base(entry_for_cache_base)
				indented_message("cache base determined", "", 5)
				back_level()
				[next_walked_album, sub_max_file_date, _passwords_or_album_ini_processed] = self.walk(entry_with_path, next_album_cache_base, patterns_and_passwords, passwords_marker_mtime, album.password_identifiers_set, album)
				passwords_or_album_ini_processed = passwords_or_album_ini_processed or _passwords_or_album_ini_processed
				if next_walked_album is not None:
					max_file_date = max(max_file_date, sub_max_file_date)
					album.nums_media_in_sub_tree.sum(next_walked_album.nums_media_in_sub_tree)
					album.positions_and_media_in_tree.merge(next_walked_album.positions_and_media_in_tree)
					album.nums_protected_media_in_sub_tree.merge(next_walked_album.nums_protected_media_in_sub_tree)
					album.sizes_protected_media_in_sub_tree.merge(next_walked_album.sizes_protected_media_in_sub_tree)

					album.add_subalbum(next_walked_album)
					next_level()
					message("adding album to search tree...", "", 5)
					self.add_album_to_tree_by_search(next_walked_album)
					indented_message("album added to search tree", "", 5)
					back_level()

			elif os.path.isfile(entry_with_path):
				if skip_files:
					continue
				if os.path.islink(entry_with_path) and Options.config['follow_symlinks']:
					indented_message("symlink to file, following it as per 'follow_symlinks' option", entry_with_path, 3)

				# save the file name for the end of the cycle, so that subdirs are processed first
				files_in_dir.append(entry_with_path)

		message("working with files in dir", absolute_path, 3)
		next_level()
		for entry_with_path in files_in_dir:
			message("working with file", entry_with_path, 3)
			next_level()
			single_media_cache_hit = True
			dirname = os.path.dirname(entry_with_path)
			try:
				message("reading file time and size...", "", 5)
				mtime = file_mtime(entry_with_path)
				file_size = os.path.getsize(entry_with_path)
				# file_sizes = Sizes()
				# file_sizes.set(0, file_size)
				indented_message("file time and size read!", "", 5)
				message("reading dir time...", "", 5)
				dir_mtime = file_mtime(dirname)
				indented_message("dir time read!", "", 5)
			except KeyboardInterrupt:
				raise
			except OSError:
				indented_message("could not read file or dir mtime", "", 5)
				continue
			else:
				max_file_date = max(max_file_date, mtime)
				single_media = None
				cached_media = None
				absolute_cache_file_exists = False

			# checksum is needed for all media, calculate it anyway
			if Options.config['checksum']:
				message("calculating checksum...", "", 5)
				with open(entry_with_path, 'rb') as media_path_pointer:
					media_checksum = checksum(media_path_pointer)
				indented_message("checksum calculated!", "", 5)

			if not album_cache_hit:
				indented_message("not a single media cache hit", "json file invalid", 5)
				single_media_cache_hit = False
			else:
				# next_level()
				message("getting media from cached album...", "", 5)
				cached_media = cached_album.media_from_path(entry_with_path)
				if cached_media is None:
					indented_message("not a single media cache hit", "no such media in cached album",5)
					single_media_cache_hit = False
				else:
					indented_message("cached media got!", "", 5)

				if single_media_cache_hit and cached_media._attributes["dateTimeFile"] != mtime:
					indented_message("not a single media cache hit", "modification time different", 5)
					single_media_cache_hit = False

				if (
					single_media_cache_hit and (
						cached_media.is_video and cached_media._attributes["fileSizes"].getVideosSize(0) != file_size or
						cached_media.is_image and cached_media._attributes["fileSizes"].getImagesSize(0) != file_size
					)
				):
					indented_message("not a single media cache hit", "file size different", 5)
					single_media_cache_hit = False

				if single_media_cache_hit and Options.config['checksum']:
					try:
						cached_media._attributes['checksum']

						if cached_media._attributes['checksum'] == media_checksum:
							indented_message("checksum OK!", "", 5)
						else:
							indented_message("not a single media cache hit", "bad checksum!", 5)
							single_media_cache_hit = False
					except KeyError:
						message("not a single media cache hit", "no checksum in json file", 5)
						single_media_cache_hit = False

				if single_media_cache_hit and cached_media:
					if mtime != cached_media.datetime_file:
						message("not a single media cache hit", "file datetime different from cache one", 5)
						single_media_cache_hit = False
					else:
						cache_files = cached_media.image_caches
						# check if the cache files actually exist and are not old
						for cache_file in cache_files:
							absolute_cache_file = os.path.join(Options.config['cache_path'], cache_file)
							absolute_cache_file_exists = os.path.exists(absolute_cache_file)
							if (
								Options.config['recreate_fixed_height_thumbnails'] and
								absolute_cache_file_exists and file_mtime(absolute_cache_file) < json_files_min_mtime
							):
								# remove wide images, in order not to have blurred thumbnails
								fixed_height_thumbnail_re = "_" + str(Options.config['media_thumb_size']) + r"tf\.jpg$"
								match = re.search(fixed_height_thumbnail_re, cache_file)
								if match and cached_media.size[0] > cached_media.size[1]:
									try:
										os.unlink(os.path.join(Options.config['cache_path'], cache_file))
										message("deleted, re-creating fixed height thumbnail", os.path.join(Options.config['cache_path'], cache_file), 3)
										absolute_cache_file_exists = False
									except OSError:
										message("error deleting fixed height thumbnail", os.path.join(Options.config['cache_path'], cache_file), 1)

							if not absolute_cache_file_exists:
								indented_message("not a single media cache hit", "nonexistent reduction/thumbnail", 4)
								single_media_cache_hit = False
								break
							if file_mtime(absolute_cache_file) < cached_media.datetime_file:
								indented_message("not a single media cache hit", "reduction/thumbnail older than cached media", 4)
								single_media_cache_hit = False
								break
							if file_mtime(absolute_cache_file) > json_files_min_mtime:
								indented_message("not a single media cache hit", "reduction/thumbnail newer than json file", 4)
								single_media_cache_hit = False
								break
							if cached_media.is_image and Options.config['recreate_reduced_photos']:
								indented_message("not a single media cache hit", "reduced photo recreation requested", 4)
								single_media_cache_hit = False
								break
							if cached_media.is_video and Options.config['recreate_transcoded_videos']:
								indented_message("not a single media cache hit", "transcoded video recreation requested", 4)
								single_media_cache_hit = False
								break
							if Options.config['recreate_thumbnails']:
								indented_message("not a single media cache hit", "thumbnail recreation requested", 4)
								single_media_cache_hit = False
								break
				# back_level()

			if single_media_cache_hit:
				single_media = cached_media
				if single_media.is_video:
					message("single media cache hit!", "transcoded video and thumbnails OK", 4)
				else:
					message("single media cache hit!", "reduced size images and thumbnails OK", 4)
			else:
				message("processing media from file", "", 5)
				single_media = Media(album, entry_with_path, json_file_list, json_files_min_mtime, Options.config['cache_path'], None)
				if Options.config['checksum']:
					single_media._attributes["checksum"] = media_checksum

			if single_media.is_valid:
				if not single_media_cache_hit or must_process_passwords:
					next_level()
					message("processing passwords for single media...", "", 4)
					single_media.password_identifiers_set = set()
					single_media.album_identifiers_set = set()
					file_name = os.path.basename(entry_with_path)

					# apply the album passwords_md5 to the media
					for album_identifier in sorted(album.password_identifiers_set):
						if album_identifier not in single_media.album_identifiers_set:
							single_media.album_identifiers_set.add(album_identifier)
							password_md5 = convert_identifiers_set_to_md5s_set(set([album_identifier])).pop()
							indented_message("album password added to media", "identifier = " + album_identifier + ", encrypted password = " + password_md5, 3)
						else:
							indented_message("album password not added to media", "identifier '" + album_identifier + "' already protects this media", 3)

					# apply the file passwords_md5 and password codes to the media if they match the media name
					for pattern_and_password in patterns_and_passwords:
						if pattern_and_password['what_flag'] == 'dirsonly':
							indented_message("password not added to media", "flag 'dirsonly' prevents applying this pattern to file names", 3)
						else:
							case = "case insentitive"
							whole = "part of name"
							if pattern_and_password['case_flag'] == 'cs':
								if pattern_and_password['whole_flag'] == 'whole':
									match = fnmatch.fnmatchcase(file_name, pattern_and_password['pattern'])
									whole = "whole name"
								else:
									match = fnmatch.fnmatchcase(file_name, "*" + pattern_and_password['pattern'] + "*")
								case = "case sentitive"
							else:
								if pattern_and_password['whole_flag'] == 'whole':
									match = re.match(fnmatch.translate(pattern_and_password['pattern']), file_name, re.IGNORECASE)
									whole = "whole name"
								else:
									match = re.match(fnmatch.translate("*" + pattern_and_password['pattern'] + "*"), file_name, re.IGNORECASE)

							if match:
								identifier = pattern_and_password['identifier']
								Options.mark_identifier_as_used(identifier)
								if identifier not in single_media.password_identifiers_set:
									single_media.password_identifiers_set.add(identifier)
									indented_message(
										"password and code added to media",
										"'" + file_name + "' matches '" + pattern_and_password['pattern'] + "' " + case + ", " + whole + ", identifier = " + identifier,
										4
									)
								else:
									indented_message(
										"password and code not added to media",
										"'" + file_name + "' matches '" + pattern_and_password['pattern'] + "' " + case + ", " + whole + ", but identifier '" + identifier + "'  already protects the media",
										3
									)
					indented_message("passwords for single media processed!", "", 5)
					back_level()
				else:
					indented_message("no need to process passwords for media", "", 5)
					for identifier in single_media.password_identifiers_set:
						Options.mark_identifier_as_used(identifier)

				if not any(single_media.media_file_name == _media.media_file_name for _media in self.all_media):
					# update the protected media count according to the album and single media passwords
					complex_identifiers_combination = complex_combination(convert_set_to_combination(album.password_identifiers_set), convert_set_to_combination(single_media.password_identifiers_set))
					if single_media.is_image:
						album.nums_protected_media_in_sub_tree.incrementImages(complex_identifiers_combination)
					else:
						album.nums_protected_media_in_sub_tree.incrementVideos(complex_identifiers_combination)
					album.sizes_protected_media_in_sub_tree.sum(complex_identifiers_combination, single_media.file_sizes)
					album.sizes_protected_media_in_album.sum(complex_identifiers_combination, single_media.file_sizes)

					if single_media.is_image:
						album.nums_media_in_sub_tree.incrementImages()
					else:
						album.nums_media_in_sub_tree.incrementVideos()
					if single_media.has_gps_data:
						album.positions_and_media_in_tree.add_single_media(single_media)

					if single_media.is_video:
						num_video_in_dir += 1
						if not single_media_cache_hit:
							num_video_processed_in_dir += 1
					else:
						num_photo_in_dir += 1
						if not single_media_cache_hit:
							num_photo_processed_in_dir += 1

						if single_media.has_exif_date:
							num_photo_with_exif_date_in_dir += 1
						if single_media.has_gps_data:
							num_photo_with_geotags_in_dir += 1

						if single_media.has_exif_date:
							if single_media.has_gps_data:
								num_photo_with_exif_date_and_geotags_in_dir += 1
							else:
								photos_with_exif_date_and_without_geotags_in_dir.append("      " + entry_with_path)
						else:
							if single_media.has_gps_data:
								photos_without_exif_date_and_with_geotags_in_dir.append("      " + entry_with_path)
							else:
								photos_without_exif_date_or_geotags_in_dir.append(      "      " + entry_with_path)

					next_level()
					message("adding media to dates tree...", "", 5)
					# the following function has a check on media already present
					self.add_single_media_to_tree_by_date(single_media)
					indented_message("media added to dates tree!", "", 5)

					if single_media.has_gps_data:
						message("adding media to geonames tree...", "", 5)
						# the following function has a check on media already present
						self.add_single_media_to_tree_by_geonames(single_media)
						indented_message("media added to geonames tree!", "", 5)

					message("adding media to search tree...", "", 5)
					# the following function has a check on media already present
					self.add_single_media_to_tree_by_search(single_media)
					indented_message("media added to search tree", "", 5)

					album.add_single_media(single_media)
					self.all_media.append(single_media)

					back_level()
				else:
					indented_message("media not added to anything...", "it was already there", 5)

			elif not single_media.is_valid:
				indented_message("not image nor video", entry_with_path, 3)
				unrecognized_files_in_dir.append("      " + entry_with_path + "      mime type: " + single_media.mime_type )
			back_level()
		back_level()

		if num_video_in_dir:
			Options.num_video += num_video_in_dir
			Options.num_video_processed += num_video_processed_in_dir

		if num_photo_in_dir:
			max_digit = len(str(Options.config['num_media_in_tree']))
			_lpadded_num_photo_in_dir = str(num_photo_in_dir).rjust(max_digit)
			_rpadded_num_photo_in_dir = str(num_photo_in_dir).ljust(max_digit)
			_all_photos_in_path = _lpadded_num_photo_in_dir + "/" + _rpadded_num_photo_in_dir + " photos in " + absolute_path
			_some_photo_in_path = "/" + _rpadded_num_photo_in_dir + " photos in " + absolute_path + ":"

			Options.num_photo += num_photo_in_dir
			Options.num_photo_processed += num_photo_processed_in_dir

			Options.num_photo_with_exif_date += num_photo_with_exif_date_in_dir
			Options.num_photo_with_geotags += num_photo_with_geotags_in_dir
			Options.num_photo_with_exif_date_and_geotags += num_photo_with_exif_date_and_geotags_in_dir

			Options.num_photo_with_exif_date_and_without_geotags += len(photos_with_exif_date_and_without_geotags_in_dir)
			if num_photo_in_dir == len(photos_with_exif_date_and_without_geotags_in_dir):
				Options.photos_with_exif_date_and_without_geotags.append(_all_photos_in_path)
			elif len(photos_with_exif_date_and_without_geotags_in_dir):
				Options.photos_with_exif_date_and_without_geotags.append(str(len(photos_with_exif_date_and_without_geotags_in_dir)).rjust(max_digit) + _some_photo_in_path)
				Options.photos_with_exif_date_and_without_geotags.extend(photos_with_exif_date_and_without_geotags_in_dir)

			Options.num_photo_without_exif_date_and_with_geotags += len(photos_without_exif_date_and_with_geotags_in_dir)
			if num_photo_in_dir == len(photos_without_exif_date_and_with_geotags_in_dir):
				Options.photos_without_exif_date_and_with_geotags.append(_all_photos_in_path)
			elif len(photos_without_exif_date_and_with_geotags_in_dir):
				Options.photos_without_exif_date_and_with_geotags.append(str(len(photos_without_exif_date_and_with_geotags_in_dir)).rjust(max_digit) + _some_photo_in_path)
				Options.photos_without_exif_date_and_with_geotags.extend(photos_without_exif_date_and_with_geotags_in_dir)

			Options.num_photo_without_exif_date_or_geotags += len(photos_without_exif_date_or_geotags_in_dir)
			if num_photo_in_dir == len(photos_without_exif_date_or_geotags_in_dir):
				Options.photos_without_exif_date_or_geotags.append(_all_photos_in_path)
			elif len(photos_without_exif_date_or_geotags_in_dir):
				Options.photos_without_exif_date_or_geotags.append(str(len(photos_without_exif_date_or_geotags_in_dir)).rjust(max_digit) + _some_photo_in_path)
				Options.photos_without_exif_date_or_geotags.extend(photos_without_exif_date_or_geotags_in_dir)

			if len(unrecognized_files_in_dir):
				Options.num_unrecognized_files += len(unrecognized_files_in_dir)
				Options.unrecognized_files.append(str(len(unrecognized_files_in_dir)).rjust(max_digit) + " files in " + absolute_path + ":")
				Options.unrecognized_files.extend(unrecognized_files_in_dir)
				Options.config['num_media_in_tree'] -= len(unrecognized_files_in_dir)

		message("calculating album date", "based on media and subalbums dates", 5)
		album.date = album.album_date()

		if not album.empty:
			next_level()
			message("adding album to albums list...", "", 5)
			Options.all_albums.append(album)
			indented_message("album added to albums list!", "", 4)
			back_level()
		else:
			message("VOID: no media in this directory", os.path.basename(absolute_path), 4)

		if album.nums_media_in_sub_tree.total():
			# generate the album composite image for sharing
			self.generate_composite_image(album, max_file_date)
		back_level()

		report_times(False)

		report_mem()

		passwords_or_album_ini_processed = passwords_or_album_ini_processed or must_process_passwords or must_process_album_ini

		return [album, max_file_date, passwords_or_album_ini_processed]


	@staticmethod
	def _index_to_coords(index, tile_width, px_between_tiles, side_off_set, linear_number_of_tiles):
		x = side_off_set + (index % linear_number_of_tiles) * (tile_width + px_between_tiles)
		y = side_off_set + int(index / linear_number_of_tiles) * (tile_width + px_between_tiles)
		return [x, y]


	def pick_random_image(self, album, random_number):
		if random_number < len(album.media_list):
			return [album.media_list[random_number], random_number]
		else:
			random_number -= len(album.media_list)
			for subalbum in album.subalbums_list:
				if random_number < subalbum.nums_media_in_sub_tree.total():
					[picked_image, random_number] = self.pick_random_image(subalbum, random_number)
					if picked_image:
						return [picked_image, random_number]
				random_number -= subalbum.nums_media_in_sub_tree.total()
		return [None, random_number]

	def generate_composite_image(self, album, max_file_date):

		# I'm short-circuiting this function because of issue #169
		# remove the following return when the issue has been solved
		return

		next_level()
		composite_image_name = album.cache_base + ".jpg"
		composite_image_path = os.path.join(self.album_cache_path, composite_image_name)
		self.all_album_composite_images.append(os.path.join(Options.config['cache_album_subdir'], composite_image_name))
		json_file_with_path = os.path.join(Options.config['cache_path'], album.json_file)
		if (
			os.path.exists(composite_image_path) and
			file_mtime(composite_image_path) > max_file_date and
			os.path.exists(json_file_with_path) and
			file_mtime(json_file_with_path) < file_mtime(composite_image_path)
		):
			message("composite image OK", "", 5)
			with open(composite_image_path, 'a'):
				os.utime(composite_image_path, None)
			indented_message("composite image OK, touched", composite_image_path, 4)
			back_level()
			return

		message("generating composite image...", composite_image_path, 5)

		# pick a maximum of Options.max_album_share_thumbnails_number random images in album and subalbums
		# and generate a square composite image

		# determine the number of images to use
		if album.nums_media_in_sub_tree.total() == 1 or Options.config['max_album_share_thumbnails_number'] == 1:
			max_thumbnail_number = 1
		elif album.nums_media_in_sub_tree.total() < 9 or Options.config['max_album_share_thumbnails_number'] == 4:
			max_thumbnail_number = 4
		elif album.nums_media_in_sub_tree.total() < 16 or Options.config['max_album_share_thumbnails_number'] == 9:
			max_thumbnail_number = 9
		elif album.nums_media_in_sub_tree.total() < 25 or Options.config['max_album_share_thumbnails_number'] == 16:
			max_thumbnail_number = 16
		elif album.nums_media_in_sub_tree.total() < 36 or Options.config['max_album_share_thumbnails_number'] == 25:
			max_thumbnail_number = 25
		else:
			max_thumbnail_number = Options.config['max_album_share_thumbnails_number']

		# pick max_thumbnail_number random square album thumbnails
		random_thumbnails = list()
		random_list = list()
		bad_list = list()
		num_random_thumbnails = min(max_thumbnail_number, album.nums_media_in_sub_tree.total())
		i = 0
		good_media_number = album.nums_media_in_sub_tree.total()
		while True:
			if i >= good_media_number:
				break
			if len(album.media_list) and num_random_thumbnails == 1:
				random_media = album.media_list[0]
			else:
				while True:
					random_number = random.randint(0, album.nums_media_in_sub_tree.total() - 1)
					if random_number not in random_list and random_number not in bad_list:
						break
				random_list.append(random_number)
				[random_media, random_number] = self.pick_random_image(album, random_number)
			folder_prefix = remove_folders_marker(random_media.album.cache_base)
			if folder_prefix:
				folder_prefix += Options.config['cache_folder_separator']
			thumbnail = os.path.join(
					Options.config['cache_path'],
					random_media.album.subdir,
					folder_prefix + random_media.cache_base
				) + Options.config['cache_folder_separator'] + str(Options.config['album_thumb_size']) + "as.jpg"
			if os.path.exists(thumbnail):
				random_thumbnails.append(thumbnail)
				i += 1
				if i == num_random_thumbnails:
					break
			else:
				message("nonexistent thumbnail", thumbnail + " - i=" + str(i) + ", good=" + str(good_media_number), 5)
				bad_list.append(thumbnail)
				good_media_number -= 1

		if len(random_thumbnails) < max_thumbnail_number:
			# add the missing images: repeat the present ones
			for i in range(max_thumbnail_number - len(random_thumbnails)):
				random_thumbnails.append(random_thumbnails[i])

		# generate the composite image
		# following code inspired from
		# https://stackoverflow.com/questions/30429383/combine-16-images-into-1-big-image-with-php#30429557
		# thanks to Adarsh Vardhan who wrote it!

		tile_width = Options.config['album_thumb_size']

		# INIT BASE IMAGE FILLED WITH BACKGROUND COLOR
		linear_number_of_tiles = int(math.sqrt(max_thumbnail_number))
		px_between_tiles = 1
		side_off_set = 1

		map_width = side_off_set + (tile_width + px_between_tiles) * linear_number_of_tiles - px_between_tiles + side_off_set
		map_height = side_off_set + (tile_width + px_between_tiles) * linear_number_of_tiles - px_between_tiles + side_off_set
		img = Image.new('RGB', (map_width, map_height), "white")

		# PUT SRC IMAGES ON BASE IMAGE
		index = -1
		for thumbnail in random_thumbnails:
			index += 1
			tile = Image.open(thumbnail)
			tile_img_width = tile.size[0]
			tile_img_height = tile.size[1]
			[x, y] = self._index_to_coords(index, tile_width, px_between_tiles, side_off_set, linear_number_of_tiles)
			if tile_img_width < tile_width:
				x += int(float(tile_width - tile_img_width) / 2)
			if tile_img_height < tile_width:
				y += int(float(tile_width - tile_img_height) / 2)
			img.paste(tile, (x, y))

		# save the composite image
		img.save(composite_image_path, "JPEG", quality=Options.config['jpeg_quality'])
		indented_message("composite image generated", "", 5)
		back_level()


	@staticmethod
	def _save_json_options(num):
		json_options_file = os.path.join(Options.config['cache_path'], 'options.json')
		message("saving json options file...", json_options_file, 4)
		# some option must not be saved
		options_to_save = {}
		for key, value in list(Options.config.items()):
			if key not in Options.options_not_to_be_saved:
				options_to_save[key] = value
		# add the total count of positions, so that reading another json file is not needed in order to know if gps data exist
		options_to_save['num_positions_in_tree'] = num

		with open(json_options_file, 'w') as options_file:
			json.dump(options_to_save, options_file)
		indented_message("json options file saved!", "", 5)


	def create_keys_for_directories(self, splitted_file_name, dict):
		if len(splitted_file_name) == 0:
			return

		if len(splitted_file_name) == 1:
			if 'files' not in dict:
				dict['files'] = list()
			dict['files'].append(splitted_file_name[0])
		else:
			if 'dirs' not in dict:
				dict['dirs'] = {}
			if splitted_file_name[0] not in dict['dirs']:
				dict['dirs'][splitted_file_name[0]] = {}
			self.create_keys_for_directories(splitted_file_name[1:], dict['dirs'][splitted_file_name[0]])
		return dict


	def remove_stale(self, subdir, json_list_or_dict):
		# preparing files and directories lists
		protected_directory_re = r"" + Options.config['protected_directories_prefix'] + "([a-f0-9]{32})?,([a-f0-9]{32})?"

		if not subdir:
			json_list = json_list_or_dict
			message("cleaning up...", "", 1)
			next_level()
			message("building stale list...", "", 4)

			# transform the all_json_files list into a dictionary by directories
			for file_name in json_list:
				splitted_file_name = file_name.split('/')
				# for dir in splitted_file_name[:-1]:
				json_dict = self.create_keys_for_directories(splitted_file_name, self.all_json_files_dict)

			for path in self.all_album_composite_images:
				splitted_file_name = path.split('/')
				json_dict = self.create_keys_for_directories(splitted_file_name, json_dict)

			for single_media in self.all_media:
				for entry in single_media.image_caches:
					# entry_without_subdir = entry[len(single_media.album.subdir) + 1:]
					splitted_file_name = entry.split('/')
					json_dict = self.create_keys_for_directories(splitted_file_name, json_dict)

			indented_message("stale list built!", "", 5)
			info = "in cache path"

			deletable_files_re = r"\.json$"
		else:
			json_dict = json_list_or_dict
			# reduced sizes, thumbnails, old style thumbnails
			if subdir == Options.config['cache_album_subdir']:
				# self.all_json_files_by_subdir[subdir] = list()
				deletable_files_re = r"\.jpg$"
			elif subdir == Options.config['passwords_subdir']:
				deletable_files_re = r"[a-f0-9]{32}"
			elif re.search(protected_directory_re, subdir):
				deletable_files_re = r"\.json$"
			else:
				deletable_files_re = r"(" + Options.config['cache_folder_separator'] + r"|_)" + \
					r"transcoded(_([1-9][0-9]{0,3}[kKmM]|[1-9][0-9]{3,10})(_[1-5]?[0-9])?)?\.mp4$" + \
					r"|(" + Options.config['cache_folder_separator'] + r"|_)[1-9][0-9]{1,4}(a|t|s|[at][sf])?\.jpg$" + \
					r"|" + Options.config['cache_folder_separator'] + r"original\.(jpg|png)$"
				# deletable_files_re = r(-|_)transcoded(_([1-9][0-9]{0,3}[kKmM]|[1-9][0-9]{3,10})(_[1-5]?[0-9])?)?\.mp4$|(-|_)[1-9][0-9]{1,4}(a|t|s|[at][sf])?\.jpg$"
			info = "in subdir " + subdir

		message("searching for stale cache files", info, 4)

		for cache_file in sorted(os.listdir(os.path.join(Options.config['cache_path'], subdir))):
			if os.path.isdir(os.path.join(Options.config['cache_path'], subdir, cache_file)):
				next_level()
				if cache_file in json_dict['dirs']:
					self.remove_stale(os.path.join(subdir, cache_file), json_dict['dirs'][cache_file])
				elif subdir == "":
					# a protected content directory which is'n reported must be deleted with all its content
					message("deleting non-reported protected content subdir...", "", 5)
					shutil.rmtree(os.path.join(Options.config['cache_path'], subdir, cache_file))
					message("non-reported protected content subdir deleted!", os.path.join(Options.config['cache_path'], subdir, cache_file), 4)
				try:
					if not os.listdir(os.path.join(Options.config['cache_path'], subdir, cache_file)):
						next_level()
						message("empty subdir, deleting...", "", 4)
						file_to_delete = os.path.join(Options.config['cache_path'], subdir, cache_file)
						next_level()
						os.rmdir(os.path.join(Options.config['cache_path'], file_to_delete))
						message("empty subdir, deleted", "", 5)
						back_level()
						back_level()
				except OSError:
					# no protected content
					pass
				back_level()
			else:
				# only delete json's, transcoded videos, reduced images and thumbnails
				next_level()
				message("deciding whether to keep a cache file...", "", 7)
				match = re.search(deletable_files_re, cache_file)
				indented_message("deciding whether to keep cache file", cache_file, 6)
				if match:
					try:
						cache_file = os.fsdecode(cache_file)
					except KeyboardInterrupt:
						raise
					if cache_file not in json_dict['files']:
					# if cache_file not in cache_list:
						message("removing stale cache file...", cache_file, 4)
						file_to_delete = os.path.join(Options.config['cache_path'], subdir, cache_file)
						os.unlink(file_to_delete)
						indented_message("stale cache file removed", "", 5)
				else:
					indented_message("not a stale cache file, keeping it", "", 2)
					back_level()
					continue
				back_level()
		if not subdir:
			back_level()
			message("cleaned up!", "", 5)
			back_level()
