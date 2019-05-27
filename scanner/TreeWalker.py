# -*- coding: utf-8 -*-

# @python2
from __future__ import unicode_literals

import os
import os.path
import sys
import json
import re
import time
import random
import math
import fnmatch

from datetime import datetime

from PIL import Image

from CachePath import remove_album_path, file_mtime, last_modification_time, trim_base_custom, remove_folders_marker, checksum
from Utilities import message, indented_message, next_level, back_level, report_times
from PhotoAlbum import Media, Album, PhotoAlbumEncoder
from Geonames import Geonames
import Options
from CachePath import convert_to_ascii_only, remove_accents, remove_non_alphabetic_characters, remove_digits, switch_to_lowercase, phrase_to_words

class TreeWalker:
	def __init__(self):
		# # check whether the albums or the cache has been modified after the last run, actually comparing with options file modification time
		# # use the same method as in file_mtime:
		# # datetime.fromtimestamp(int(os.path.getmtime(path)))
		# message("getting albums last mtime...", "be patient, x time is needed!", 4)
		# last_album_modification_time = last_modification_time(Options.config['album_path'])
		# next_level()
		# message("albums last mtime got", str(last_album_modification_time), 4)
		# back_level()

		# message("getting cache last mtime...", "be even more patient, 12x time could be needed!", 4)
		# last_cache_modification_time = last_modification_time(Options.config['cache_path'])
		# next_level()
		# message("cache last mtime got", str(last_cache_modification_time), 4)
		# json_options_file_modification_time = file_mtime(os.path.join(Options.config['cache_path'], "options.json"))
		# message("json options file mtime is", str(json_options_file_modification_time), 4)
		# if len(sys.argv) == 2:
		# 	options_file_modification_time = file_mtime(sys.argv[1])
		# 	message("options file mtime is", str(options_file_modification_time), 4)
		# back_level()

		random.seed()
		self.all_json_files = ["options.json"]
		self.all_json_files_by_subdir = {}

		if (Options.config['use_stop_words']):
			TreeWalker.stopwords_file = os.path.join(Options.config['cache_path'], 'stopwords.json')
			self.all_json_files.append('stopwords.json')
			self.get_lowercase_stopwords()

		# # If nor the albums nor the cache have been modified after the last run,
		# # and if sensitive options haven't changed,
		# # we can avoid browsing the albums
		# if (
		# 	# the cache must be newer than albums
		# 	last_album_modification_time < json_options_file_modification_time and
		# 	# the json options file must be newer than albums
		# 	last_album_modification_time < last_cache_modification_time and
		# 	# the cache must be newer than the supplied options file too: physical paths could have been changed
		# 	(len(sys.argv) == 2 and options_file_modification_time < last_cache_modification_time) and
		# 	not Options.config['recreate_json_files'] and
		# 	not Options.config['recreate_reduced_photos'] and
		# 	not Options.config['recreate_thumbnails']
		# ):
		# 	message("no albums modification, no refresh needed", "We can safely end here", 4)
		# else:
		message("Browsing", "start!", 3)

		# be sure reduced_sizes array is correctly sorted
		Options.config['reduced_sizes'].sort(reverse=True)

		geonames = Geonames()
		self.all_albums = list()
		self.tree_by_date = {}
		self.tree_by_geonames = {}
		self.tree_by_search = {}
		self.media_with_geonames_list = list()
		self.all_media = list()
		self.all_album_composite_images = list()
		self.album_cache_path = os.path.join(Options.config['cache_path'], Options.config['cache_album_subdir'])
		if os.path.exists(self.album_cache_path):
			if not os.access(self.album_cache_path, os.W_OK):
				message("FATAL ERROR", self.album_cache_path + " not writable, quitting")
				sys.exit(-97)
		else:
			message("creating still unexistent album cache subdir", self.album_cache_path, 4)
			os.makedirs(self.album_cache_path)
			indented_message("still unexistent subdir created", "", 5)

		self.origin_album = Album(Options.config['album_path'])
		# self.origin_album.read_album_ini() # origin_album is not a physical one, it's the parent of the root physical tree and of the virtual albums
		self.origin_album.cache_base = "root"
		next_level()
		[folders_album, num, nums_protected, positions, _] = self.walk(Options.config['album_path'], Options.config['folders_string'], [], self.origin_album)
		back_level()
		if folders_album is None:
			message("WARNING", "ALBUMS ROOT EXCLUDED BY MARKER FILE", 2)
		else:
			# message("saving all media json file...", "", 4)
			# next_level()
			# self.save_all_media_json()
			# back_level()
			# indented_message("all media json file saved", "", 5)

			self.all_json_files.append("all_media.json")

			folders_album.num_media_in_sub_tree = num
			folders_album.positions_and_media_in_tree = positions
			self.origin_album.add_album(folders_album)
			for media_passwords_md5 in folders_album.nums_protected_media_in_sub_tree:
				if not media_passwords_md5 in self.origin_album.nums_protected_media_in_sub_tree:
					self.origin_album.nums_protected_media_in_sub_tree[media_passwords_md5] = 0
				self.origin_album.nums_protected_media_in_sub_tree[media_passwords_md5] += nums_protected[media_passwords_md5]

			self.all_json_files.append(Options.config['folders_string'] + ".json")

			message("generating by date albums...", "", 4)
			by_date_album = self.generate_date_albums(self.origin_album)
			indented_message("by date albums generated", "", 5)
			if by_date_album is not None and not by_date_album.empty:
				self.all_json_files.append(Options.config['by_date_string'] + ".json")
				self.origin_album.add_album(by_date_album)
				for media_passwords_md5 in by_date_album.nums_protected_media_in_sub_tree:
					if not media_password_codes in self.origin_album.nums_protected_media_in_sub_tree:
						self.origin_album.nums_protected_media_in_sub_tree[media_passwords_md5] = 0
					self.origin_album.nums_protected_media_in_sub_tree[media_passwords_md5] += nums_protected[media_passwords_md5]

			message("generating by geonames albums...", "", 4)
			by_geonames_album = self.generate_geonames_albums(self.origin_album)
			indented_message("by geonames albums generated", "", 5)
			if by_geonames_album is not None and not by_geonames_album.empty:
				self.all_json_files.append(Options.config['by_gps_string'] + ".json")
				self.origin_album.add_album(by_geonames_album)
				for media_passwords_md5 in by_geonames_album.nums_protected_media_in_sub_tree:
					if not media_passwords_md5 in self.origin_album.nums_protected_media_in_sub_tree:
						self.origin_album.nums_protected_media_in_sub_tree[media_passwords_md5] = 0
					self.origin_album.nums_protected_media_in_sub_tree[media_passwords_md5] += nums_protected[media_passwords_md5]

			message("generating by search albums...", "", 4)
			by_search_album = self.generate_by_search_albums(self.origin_album)
			indented_message("by search albums generated", "", 5)
			if by_search_album is not None and not by_search_album.empty:
				self.all_json_files.append(Options.config['by_search_string'] + ".json")
				self.origin_album.add_album(by_search_album)
				for media_passwords_md5 in by_search_album.nums_protected_media_in_sub_tree:
					if not media_passwords_md5 in self.origin_album.nums_protected_media_in_sub_tree:
						self.origin_album.nums_protected_media_in_sub_tree[media_passwords_md5] = 0
					self.origin_album.nums_protected_media_in_sub_tree[media_passwords_md5] += nums_protected[media_passwords_md5]

			self.protected_origin_album = self.origin_album.generate_protected_content_albums()
			self.origin_album.leave_only_unprotected_content()

			message("saving all albums to json files...", "", 4)
			next_level()
			for album in self.origin_album.subalbums:
				try:
					self.all_albums_to_json_file(album)
				except UnboundLocalError:
					pass

			message("all albums saved to json files", "", 5)
			back_level()

			message("saving all protected albums to json files...", "", 4)
			next_level()
			for password_md5, album in self.protected_origin_album.items():
				try:
					self.all_albums_to_json_file(album, password_md5)
				except UnboundLocalError:
					pass

			message("all protected albums saved to json files", "", 5)
			back_level()

			# options must be saved when json files have been saved, otherwise in case of error they may not reflect the json files situation
			self._save_json_options()
			self.remove_stale()
			message("completed", "", 4)

	def all_albums_to_json_file(self, album, password_md5 = None):
		# search albums in by_search_album has the normal albums as subalbums,
		# and they are saved when folders_album is saved, avoid saving them multiple times
		if (
			album.cache_base.find(Options.config['by_search_string']) == -1 or
			album.cache_base.find(Options.config['by_search_string']) == 0 and
			len(album.cache_base) == len(Options.config['by_search_string'])
		):
			for subalbum in album.subalbums:
				self.all_albums_to_json_file(subalbum, password_md5)

		if len(album.subalbums) == 0 and len(album.media) == 0:
			if password_md5 is None:
				indented_message("empty album, not saving it", album.name, 4)
			else:
				indented_message("empty protected album, not saving it", album.name + ", password codes = " + '-'.join(album.password_codes), 4)
			return

		json_name = album.json_file
		json_positions_name = album.positions_json_file
		if password_md5 is not None:
			json_name = album.protected_json_file(password_md5)
			json_positions_name = album.protected_positions_json_file(password_md5)
		for name in [json_name, json_positions_name]:
			name = os.path.join(Options.config['cache_path'], name)
		self.all_json_files.append(json_name)
		self.all_json_files.append(json_positions_name)

		album.to_json_file(json_name, json_positions_name, password_md5)

	def generate_date_albums(self, origin_album):
		next_level()
		# convert the temporary structure where media are organized by year, month, date to a set of albums

		by_date_path = os.path.join(Options.config['album_path'], Options.config['by_date_string'])
		by_date_album = Album(by_date_path)
		by_date_album.parent = origin_album
		by_date_album.cache_base = Options.config['by_date_string']
		by_date_max_file_date = None
		for year, _ in self.tree_by_date.items():
			year_path = os.path.join(by_date_path, str(year))
			year_album = Album(year_path)
			year_album.parent = by_date_album
			year_album.cache_base = by_date_album.cache_base + Options.config['cache_folder_separator'] + year
			year_max_file_date = None
			by_date_album.add_album(year_album)
			for month, _ in self.tree_by_date[year].items():
				month_path = os.path.join(year_path, str(month))
				month_album = Album(month_path)
				month_album.parent = year_album
				month_album.cache_base = year_album.cache_base + Options.config['cache_folder_separator'] + month
				month_max_file_date = None
				year_album.add_album(month_album)
				for day, media in self.tree_by_date[year][month].items():
					message("working with day album...", "", 5)
					day_path = os.path.join(month_path, str(day))
					day_album = Album(day_path)
					day_album.parent = month_album
					day_album.cache_base = month_album.cache_base + Options.config['cache_folder_separator'] + day
					day_max_file_date = None
					month_album.add_album(day_album)
					for single_media in media:
						single_media.day_album_cache_base = day_album.cache_base
						day_album.add_media(single_media)
						day_album.num_media_in_sub_tree += 1
						month_album.add_media(single_media)
						month_album.num_media_in_sub_tree += 1
						year_album.add_media(single_media)
						year_album.num_media_in_sub_tree += 1
						if single_media.has_gps_data:
							day_album.positions_and_media_in_tree = self.add_media_to_position(
								day_album.positions_and_media_in_tree,
								single_media,
								Options.config['by_date_string']
							)
							month_album.positions_and_media_in_tree = self.add_media_to_position(
								month_album.positions_and_media_in_tree,
								single_media,
								Options.config['by_date_string']
							)
							year_album.positions_and_media_in_tree = self.add_media_to_position(
								year_album.positions_and_media_in_tree,
								single_media,
								Options.config['by_date_string']
							)
							# by_date_album.positions_and_media_in_tree = self.add_media_to_position(by_date_album.positions_and_media_in_tree, single_media, Options.config['by_date_string'])

						# by_date_album.add_media(single_media)
						by_date_album.num_media_in_sub_tree += 1
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
					self.all_albums.append(day_album)
					self.generate_composite_image(day_album, day_max_file_date)
					indented_message("day album worked out", media[0].year + "-" + media[0].month + "-" + media[0].day, 4)
				self.all_albums.append(month_album)
				self.generate_composite_image(month_album, month_max_file_date)
			self.all_albums.append(year_album)
			self.generate_composite_image(year_album, year_max_file_date)
		self.all_albums.append(by_date_album)
		if by_date_album.num_media_in_sub_tree > 0:
			self.generate_composite_image(by_date_album, by_date_max_file_date)
		back_level()
		return by_date_album

	def add_media_to_position(self, positions, media, type_string):
		# adds the media position and name to the positions list received as second argument
		if type_string == Options.config['folders_string']:
			media_album_cache_base = media.album.cache_base
		elif type_string == Options.config['by_date_string']:
			media_album_cache_base = media.day_album_cache_base
		elif type_string == Options.config['by_gps_string']:
			media_album_cache_base = media.gps_album_cache_base
		position = {
			'lng': media.longitude,
			'lat' : media.latitude,
			'mediaNameList': [{
				'cacheBase': media.cache_base,
				'albumCacheBase': media_album_cache_base,
				'foldersCacheBase': media.album.cache_base,
				'passwordsMd5': media.passwords_md5
			}]
		}
		positions = self.add_position_to_positions(positions, position)
		return positions

	def add_position_to_positions(self, positions, position):
		# adds the given position to the positions list received as second argument
		if positions == []:
			positions = [position]
		else:
			match = False
			for index, _position in enumerate(positions):
				if position['lat'] == _position['lat'] and position['lng'] == _position['lng']:
					positions[index]['mediaNameList'].extend(position['mediaNameList'])
					match = True
					break
			if not match:
				positions.append(position)
		return positions

	def merge_positions(self, positions, positions1):
		# adds the media position and name to the positions list received as second argument
		for position in positions1:
			positions = self.add_position_to_positions(positions, position)

		return positions


	def generate_by_search_albums(self, origin_album):
		next_level()
		# convert the temporary structure where media are organized by words to a set of albums

		by_search_path = os.path.join(Options.config['album_path'], Options.config['by_search_string'])
		by_search_album = Album(by_search_path)
		by_search_album.parent = origin_album
		by_search_album.cache_base = Options.config['by_search_string']
		by_search_max_file_date = None
		message("working with word albums...", "", 5)
		for word, media_and_album_words in self.tree_by_search.items():
			next_level()
			message("working with word album...", "", 5)
			word_path = os.path.join(by_search_path, str(word))
			word_album = Album(word_path)
			word_album._name = str(word)
			word_album.parent = by_search_album
			word_album.cache_base = by_search_album.generate_cache_base(os.path.join(by_search_album.path, word))
			word_max_file_date = None
			by_search_album.add_album(word_album)
			for single_media in media_and_album_words["media_words"]:
				# word_album.positions_and_media_in_tree = self.add_media_to_position(word_album.positions_and_media_in_tree, single_media)
				word_album.add_media(single_media)
				word_album.num_media_in_sub_tree += 1
				by_search_album.num_media_in_sub_tree += 1
				single_media_date = max(single_media.datetime_file, single_media.datetime_dir)
				if word_max_file_date:
					word_max_file_date = max(word_max_file_date, single_media_date)
				else:
					word_max_file_date = single_media_date
				if by_search_max_file_date:
					by_search_max_file_date = max(by_search_max_file_date, single_media_date)
				else:
					by_search_max_file_date = single_media_date
				if single_media.has_gps_data:
					word_album.positions_and_media_in_tree = self.add_media_to_position(
						word_album.positions_and_media_in_tree,
						single_media,
						Options.config['by_date_string']
					)
			for single_album in media_and_album_words["album_words"]:
				word_album.add_album(single_album)
				word_album.num_media_in_sub_tree += single_album.num_media_in_sub_tree
				by_search_album.num_media_in_sub_tree += single_album.num_media_in_sub_tree
				if word_max_file_date:
					word_max_file_date = max(word_max_file_date, single_album.date)
				else:
					word_max_file_date = single_album.date
				if by_search_max_file_date:
					by_search_max_file_date = max(by_search_max_file_date, single_album.date)
				else:
					by_search_max_file_date = single_album.date
			word_album.unicode_words = media_and_album_words["unicode_words"]
			self.all_albums.append(word_album)
			# self.generate_composite_image(word_album, word_max_file_date)
			indented_message("word album worked out", word, 4)
			back_level()
		self.all_albums.append(by_search_album)
		back_level()
		return by_search_album


	def generate_geonames_albums(self, origin_album):
		next_level()
		# convert the temporary structure where media are organized by country_code, region_code, place_code to a set of albums

		by_geonames_path = os.path.join(Options.config['album_path'], Options.config['by_gps_string'])
		by_geonames_album = Album(by_geonames_path)
		by_geonames_album.parent = origin_album
		by_geonames_album.cache_base = Options.config['by_gps_string']
		by_geonames_max_file_date = None
		for country_code, _ in self.tree_by_geonames.items():
			country_path = os.path.join(by_geonames_path, str(country_code))
			country_album = Album(country_path)
			country_album.center = {}
			country_album.parent = by_geonames_album
			country_album.cache_base = by_geonames_album.generate_cache_base(os.path.join(by_geonames_album.path, country_code))
			country_max_file_date = None
			by_geonames_album.add_album(country_album)
			for region_code, _ in self.tree_by_geonames[country_code].items():
				region_path = os.path.join(country_path, str(region_code))
				region_album = Album(region_path)
				region_album.center = {}
				region_album.parent = country_album
				region_album.cache_base = country_album.generate_cache_base(os.path.join(country_album.path, region_code))
				region_max_file_date = None
				country_album.add_album(region_album)
				for place_code, media_list in self.tree_by_geonames[country_code][region_code].items():
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
					if len(media_list) > Options.config['big_virtual_folders_threshold']:
						next_level()
						K = 2
						clustering_failed = False
						# this array is used in order to detect when there is no convertion
						max_cluster_length_list = [0, 0, 0]
						message("big list found", str(len(media_list)) + " photos", 5)
						next_level()
						while True:
							message("clustering with k-means algorithm...", "K = " + str(K), 5)
							cluster_list = Geonames.find_centers(media_list, K)
							max_cluster_length = max([len(cluster) for cluster in cluster_list])
							if max_cluster_length <= Options.config['big_virtual_folders_threshold']:
								indented_message("clustered with k-means algorithm", "OK!", 5)
								break
							# detect no convergence
							max_cluster_length_list.append(max_cluster_length)
							max_cluster_length_list.pop(0)
							if max(max_cluster_length_list) > 0 and max(max_cluster_length_list) == min(max_cluster_length_list):
								# three times the same value: no convergence
								indented_message("clustering with k-means algorithm failed", "max cluster length doesn't converge, it's stuck at " + str(max_cluster_length), 5)
								clustering_failed = True
								break

							if K > len(media_list):
								indented_message("clustering with k-means algorithm failed", "clusters remain too big even with k > len(media_list)", 5)
								clustering_failed = True
								break
							indented_message("clustering with k-means algorithm not ok", "biggest cluster has " + str(max_cluster_length) + " photos", 5)
							K = K * 2
						next_level()
						if clustering_failed:
							# we must split the big clusters into smaller ones
							# but firts sort media in cluster by date, so that we get more homogeneus clusters
							message("splitting big clusters into smaller ones...", "", 5)
							cluster_list_new = list()
							n = 0
							for cluster in cluster_list:
								n += 1
								next_level()
								message("working with cluster...", "n." + str(n), 5)

								integer_ratio = len(cluster) // Options.config['big_virtual_folders_threshold']
								if integer_ratio >= 1:
									# big cluster

									# sort the cluster by date
									next_level()
									message("sorting cluster by date...", "", 5)
									cluster.sort()
									indented_message("cluster sorted by date", "", 5)

									message("splitting cluster...", "", 5)
									new_length = len(cluster) // (integer_ratio + 1)
									for index in range(integer_ratio):
										start = index * new_length
										end = (index + 1) * new_length
										cluster_list_new.append(cluster[start:end])
									# the remaining is still to be appended
									cluster_list_new.append(cluster[end:])
									indented_message("cluster splitted", "", 5)
									back_level()
								else:
									indented_message("cluster is OK", "", 5)
									cluster_list_new.append(cluster)
								back_level()
							cluster_list = cluster_list_new[:]
							max_cluster_length = max([len(cluster) for cluster in cluster_list])
							indented_message("big clusters splitted into smaller ones", "biggest cluster lenght is now " + str(max_cluster_length), 5)

						message("clustering terminated", "there are " + str(len(cluster_list)) + " clusters", 5)
						back_level()
						back_level()
						back_level()

					else:
						indented_message("it's not a big list", "", 5)
						cluster_list = [media_list]

					# iterate on cluster_list
					num_digits = len(str(len(cluster_list)))
					alt_place_code = place_code
					alt_place_name = place_name
					set_alt_place = len(cluster_list) > 1
					for i, cluster in enumerate(cluster_list):
						if set_alt_place:
							next_level()
							message("working with clusters", str(i) + "-th cluster", 5)
							alt_place_code = place_code + "_" + str(i + 1).zfill(num_digits)
							alt_place_name = place_name + "_" + str(i + 1).zfill(num_digits)

						place_path = os.path.join(region_path, str(alt_place_code))
						place_album = Album(place_path)
						place_album.center = {}
						place_album.parent = region_album
						place_album.cache_base = region_album.generate_cache_base(os.path.join(region_album.path, place_code))
						place_max_file_date = None
						region_album.add_album(place_album)
						for j, single_media in enumerate(cluster):
							single_media.gps_album_cache_base = place_album.cache_base
							cluster[j].gps_path = remove_album_path(place_path)
							cluster[j].place_name = place_name
							cluster[j].alt_place_name = alt_place_name
							place_album.positions_and_media_in_tree = self.add_media_to_position(
								place_album.positions_and_media_in_tree,
								single_media,
								Options.config['by_gps_string']
							)
							place_album.add_media(single_media)
							place_album.num_media_in_sub_tree += 1
							region_album.positions_and_media_in_tree = self.add_media_to_position(
								region_album.positions_and_media_in_tree,
								single_media,
								Options.config['by_gps_string']
							)
							region_album.add_media(single_media)
							region_album.num_media_in_sub_tree += 1
							country_album.positions_and_media_in_tree = self.add_media_to_position(
								country_album.positions_and_media_in_tree,
								single_media,
								Options.config['by_gps_string']
							)
							country_album.add_media(single_media)
							country_album.num_media_in_sub_tree += 1
							# by_geonames_album.positions_and_media_in_tree = self.add_media_to_position(by_geonames_album.positions_and_media_in_tree, single_media, Options.config['by_gps_string'])
							# by_geonames_album.add_media(single_media)
							by_geonames_album.num_media_in_sub_tree += 1

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
						self.all_albums.append(place_album)
						self.generate_composite_image(place_album, place_max_file_date)
						if set_alt_place:
							indented_message("cluster worked out", str(i) + "-th cluster: " + cluster[0].country_code + "-" + cluster[0].region_code + "-" + alt_place_name, 4)
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
				self.all_albums.append(region_album)
				self.generate_composite_image(region_album, region_max_file_date)
			self.all_albums.append(country_album)
			self.generate_composite_image(country_album, country_max_file_date)
		self.all_albums.append(by_geonames_album)
		if by_geonames_album.num_media_in_sub_tree > 0:
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
		message("working with stopwords", "Using language " + language, 4)

		stopwords = []
		stopwords_file = os.path.join(os.path.dirname(__file__), "resources/stopwords-iso.json")
		next_level()
		message("loading stopwords...", stopwords_file, 4)
		with open(stopwords_file, "r") as stopwords_p:
			stopwords = json.load(stopwords_p)

		if language in stopwords:
			phrase = " ".join(stopwords[language])
			TreeWalker.lowercase_stopwords = frozenset(switch_to_lowercase(phrase).split())
			indented_message("stopwords loaded", "", 4)
			TreeWalker.save_stopwords()
		else:
			indented_message("stopwords: no stopwords for language", language, 4)
		back_level()
		return

	@staticmethod
	def save_stopwords():
		"""
		Saves the list of stopwords for the user language into the cache directory
		"""
		message("saving stopwords to cache directory", TreeWalker.stopwords_file, 4)
		with open(TreeWalker.stopwords_file, "w") as stopwords_p:
			json.dump({'stopWords': list(TreeWalker.lowercase_stopwords)}, stopwords_p)
		indented_message("stopwords saved!", "", 4)
		return

	@staticmethod
	def get_lowercase_stopwords():
		"""
		Get the set of lowercase stopwords used when searching albums.
		Loads the stopwords from resource file if necessary.
		"""
		if TreeWalker.lowercase_stopwords == {}:
			TreeWalker.load_stopwords()

	def add_media_to_tree_by_date(self, media):
		# add the given media to a temporary structure where media are organized by year, month, date

		if media.year not in list(self.tree_by_date.keys()):
			self.tree_by_date[media.year] = {}
		if media.month not in list(self.tree_by_date[media.year].keys()):
			self.tree_by_date[media.year][media.month] = {}
		if media.day not in list(self.tree_by_date[media.year][media.month].keys()):
			self.tree_by_date[media.year][media.month][media.day] = list()
		if not any(media.media_file_name == _media.media_file_name for _media in self.tree_by_date[media.year][media.month][media.day]):
		#~ if not media in self.tree_by_date[media.year][media.month][media.day]:
			self.tree_by_date[media.year][media.month][media.day].append(media)

	def add_media_to_tree_by_search(self, media):
		words_for_word_list, unicode_words, words_for_search_album_name = self.prepare_for_tree_by_search(media)
		media.words = words_for_word_list
		for word_index in range(len(words_for_search_album_name)):
			word = words_for_search_album_name[word_index]
			unicode_word = unicode_words[word_index]
			if word:
				if word not in list(self.tree_by_search.keys()):
					self.tree_by_search[word] = {"media_words": [], "album_words": [], "unicode_words": []}
				if media not in self.tree_by_search[word]["media_words"]:
					self.tree_by_search[word]["media_words"].append(media)
				if unicode_word not in self.tree_by_search[word]["unicode_words"]:
					# if not any(media.media_file_name == _media.media_file_name for _media in self.tree_by_search[word]["unicode_words"]):
					self.tree_by_search[word]["unicode_words"].append(unicode_word)

	def add_album_to_tree_by_search(self, album):
		words_for_word_list, unicode_words, words_for_search_album_name = self.prepare_for_tree_by_search(album)
		album.words = words_for_word_list
		for word_index in range(len(words_for_search_album_name)):
			word = words_for_search_album_name[word_index]
			unicode_word = unicode_words[word_index]
			if word:
				if word not in list(self.tree_by_search.keys()):
					self.tree_by_search[word] = {"media_words": [], "album_words": [], "unicode_words": []}
				if album not in self.tree_by_search[word]["album_words"]:
					self.tree_by_search[word]["album_words"].append(album)
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
		phrase = ' '.join(filter(None, elements))

		alphabetic_phrase = remove_non_alphabetic_characters(remove_digits(phrase))
		lowercase_phrase = switch_to_lowercase(alphabetic_phrase)
		search_normalized_phrase = remove_accents(lowercase_phrase)
		ascii_phrase = convert_to_ascii_only(search_normalized_phrase)

		alphabetic_words = phrase_to_words(alphabetic_phrase)
		search_normalized_words = phrase_to_words(search_normalized_phrase)
		ascii_words = phrase_to_words(ascii_phrase)

		if (Options.config['use_stop_words']):
			# remove stop words: do it according to the words in lower case, different words could be removed if performing remotion from every list
			alphabetic_words, search_normalized_words, ascii_words = self.remove_stopwords(alphabetic_words, search_normalized_words, ascii_words)
			alphabetic_words = list(alphabetic_words)

		return alphabetic_words, search_normalized_words, ascii_words


	def add_media_to_tree_by_geonames(self, media):
		# add the given media to a temporary structure where media are organized by country, region/state, place

		if media.country_code not in list(self.tree_by_geonames.keys()):
			self.tree_by_geonames[media.country_code] = {}
		if media.region_code not in list(self.tree_by_geonames[media.country_code].keys()):
			self.tree_by_geonames[media.country_code][media.region_code] = {}
		if media.place_code not in list(self.tree_by_geonames[media.country_code][media.region_code].keys()):
			self.tree_by_geonames[media.country_code][media.region_code][media.place_code] = list()
		if not any(media.media_file_name == _media.media_file_name for _media in self.tree_by_geonames[media.country_code][media.region_code][media.place_code]):
			self.tree_by_geonames[media.country_code][media.region_code][media.place_code].append(media)


	@staticmethod
	def _listdir_sorted_by_time(path):
		# this function returns the directory listing sorted by mtime
		# it takes into account the fact that the file is a symlink to an unexistent file
		mtime = lambda f: os.path.exists(os.path.join(path, f)) and os.stat(os.path.join(path, f)).st_mtime or time.mktime(datetime.now().timetuple())
		return list(sorted(os.listdir(path), key=mtime))

	@staticmethod
	def _listdir_sorted_alphabetically(path):
		# this function returns the directory listing sorted alphabetically
		# it takes into account the fact that the file is a symlink to an unexistent file
		return list(sorted(os.listdir(path)))


	# This functions is called recursively
	# it works on a directory and produces the album for the directory
	def walk(self, absolute_path, album_cache_base, passwords_argument, parent_album=None):
		passwords = passwords_argument[:]
		max_file_date = file_mtime(absolute_path)
		message(">>>>>>>>>>>  Entering directory", absolute_path, 3)
		next_level()
		message("cache base", album_cache_base, 4)
		if not os.access(absolute_path, os.R_OK | os.X_OK):
			message("access denied to directory", os.path.basename(absolute_path), 1)
			back_level()
			return [None, 0, {}, [], None]
		listdir = os.listdir(absolute_path)
		if Options.config['exclude_tree_marker'] in listdir:
			indented_message("excluded with subfolders by marker file", Options.config['exclude_tree_marker'], 4)
			back_level()
			return [None, 0, {}, [], None]
		skip_files = False
		if Options.config['exclude_files_marker'] in listdir:
			indented_message("files excluded by marker file", Options.config['exclude_files_marker'], 4)
			skip_files = True
		if len(Options.identifiers_and_passwords) and Options.config['passwords_marker'] in listdir:
			next_level()
			message(Options.config['passwords_marker'] + " file found", "reading it", 4)
			pw_file = os.path.join(absolute_path, Options.config['passwords_marker'])
			if not os.access(pw_file, os.R_OK):
				indented_message("unreadable file", pw_file, 2)
			else:
				with open(pw_file, 'r') as passwords_file:
					for line in passwords_file.read().splitlines():
						# remove leading spaces
						line = line.lstrip()
						# lines beginning with # and space-only ones are ignored
						if line[0:1] == "#" or line.strip() == "":
							continue
						columns = line.split(' ')
						if len(columns) == 1:
							if columns[0] == '-':
								# reset the passwords
								passwords = []
								indented_message("passwords reset", "-", 3)
							else:
								# it's a simple identifier: the album and all the subalbums will be protected with the corresponding password
								identifier = columns[0]
								indexes = [{'md5': value['password_md5'], 'code': value['password_code']} for index,value in enumerate(Options.identifiers_and_passwords) if value['identifier'] == identifier]
								if len(indexes) == 1:
									password_md5 = indexes[0]['md5']
									password_code = indexes[0]['code']
									passwords.append(
										{
											"pattern": '*',
											"case_flag": 'ci',
											"password_md5": password_md5,
											"password_code": password_code
										}
									)
									indented_message("Directory protection requested", "identifier: " + identifier, 3)
								else:
									indented_message("WARNING: password identifier used more than once", identifier + ": not protecting the directory", 2)
						else:
							# a password identifier followed by the case flag and a file pattern
							identifier = columns[0]
							remaining_columns = " ".join(columns[1:]).lstrip().split()
							case_flag = remaining_columns[0]
							indexes = [{'md5': value['password_md5'], 'code': value['password_code']} for index,value in enumerate(Options.identifiers_and_passwords) if value['identifier'] == identifier]
							# everything beginning with the first non-space character after the case flag till the end of line (including the traling spaces) is the pattern
							pattern = " ".join(remaining_columns[1:]).lstrip()
							if len(indexes) == 1:
								password_md5 = indexes[0]['md5']
								password_code = indexes[0]['code']
								# absolute_file_name = os.path.join(absolute_path, file_name)
								if case_flag == 'cs':
									indented_message("file(s) protection requested", "identifier: '" + identifier + "', pattern: '" + pattern + "', case sensitive", 3)
								elif case_flag == 'ci':
									indented_message("file(s) protection requested", "identifier: '" + identifier + "', pattern: '" + pattern + "', case insensitive", 3)
								else:
									indented_message("file(s) protection requested", "identifier: '" + identifier + "', pattern: '" + pattern + "', case sensitive flag wrong, assuming case insensitive", 3)
									case_flag = 'ci'
								passwords.append(
									{
										"pattern": pattern,
										"case_flag": case_flag,
										"password_md5": password_md5,
										"password_code": password_code
									}
								)
							else:
								indented_message("WARNING: password identifier used more than once", identifier + ": not protecting the directory", 2)
			back_level()

		json_file = os.path.join(Options.config['cache_path'], album_cache_base) + ".json"
		json_file_exists = os.path.exists(json_file)
		json_file_mtime = None
		if json_file_exists:
			json_file_mtime = file_mtime(json_file)
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

		cached_album = None
		album_cache_hit = False
		json_message = json_file
		if Options.config['recreate_json_files']:
			message("not an album cache hit", "forced json file recreation, some sensible option has changed", 3)
		else:
			try:
				if json_file_exists:
					if not os.access(json_file, os.R_OK):
						message("not an album cache hit", "json file unreadable", 1)
					elif not os.access(json_file, os.W_OK):
						message("not an album cache hit", "json file unwritable", 1)
					else:
						if album_ini_good and file_mtime(album_ini_file) > json_file_mtime:
							# a check on album_ini_file content would have been good:
							# execution comes here even if album.ini hasn't anything significant
							message("not an album cache hit", "album.ini newer than json file, recreating json file taking into account album.ini", 4)
							must_process_album_ini = True
						elif file_mtime(absolute_path) >= json_file_mtime:
							indented_message("not an album cache hit", "dir time > json file time", 4)
						else:
							message("maybe a cache hit", "working with '" + json_file + "' to import album...", 5)
							# the following is the instruction which could raise the error
							cached_album = Album.from_cache(json_file, album_cache_base)
							indented_message("json file imported", "", 5)
							# if file_mtime(absolute_path) >= json_file_mtime:
							# 	indented_message("invalid json file", "dir time > json file time", 4)
							# 	cached_album = None
							if cached_album is None:
								indented_message("not an album cache hit", "null cached album, perhaps because of unexistent/old json_version", 4)
							elif not hasattr(cached_album, "absolute_path"):
								indented_message("not an album cache hit", "cached album hasn't absolute_path", 4)
								cached_album = None
							elif cached_album.absolute_path != absolute_path:
								indented_message("not an album cache hit", "cached album's absolute_path != absolute_path", 4)
								cached_album = None
							# the next commented-out check isn't needed because the same condition is checked in Album() and None is returned
							# elif Options.json_version == 0 or not hasattr(cached_album, "json_version") or not cached_album.json_version == Options.json_version:
							# 	indented_message("not an album cache hit", "unexistent or old json_version", 4)
							# 	cached_album = None
							else:
								indented_message("album cache hit!", "", 4)
								album = cached_album
								album_cache_hit = True
				else:
					must_process_album_ini = True
			except KeyboardInterrupt:
				raise
			except IOError:
				# will execution never come here?
				indented_message("not an album cache hit", "json file unexistent", 4)
				album_cache_hit = False
			# is the following exception needed? it surely catched date errors...
			except (ValueError, AttributeError, KeyError):
				indented_message("not an album cache hit", "ValueError, AttributeError or KeyError somewhere", 4)
				album_cache_hit = False
				cached_album = None

		if not album_cache_hit:
			message("generating void album...", "", 5)
			album = Album(absolute_path)
			indented_message("void album generated", "", 5)

		if album_ini_good:
			if not must_process_album_ini:
				message("album.ini values already in json file", "", 2)
			else:
				message("reading album.ini...", "", 2)
				album.read_album_ini(album_ini_file)
				indented_message("album.ini read!", "", 2)

		if parent_album is not None:
			album.parent = parent_album
		album.cache_base = album_cache_base

		dir_name = os.path.basename(absolute_path)
		# get the matching passwords
		for password in passwords:
			if password['case_flag'] == 'cs':
				match = fnmatch.fnmatchcase(dir_name, password['pattern'])
				case = "case sentitive"
			else:
				match = re.match(fnmatch.translate(password['pattern']), dir_name, re.IGNORECASE)
				case = "case insentitive"

			if match:
				if password['password_md5'] not in album.passwords_md5:
					album.passwords_md5.append(password['password_md5'])
					album.password_codes.append(password['password_code'])
					indented_message(
						"password added to album",
						"'" + dir_name + "' matches '" + password['pattern'] + "' " + case + ", encrypted password = " + password['password_md5'] + ", password code = " + str(password['password_code']),
						3
					)
				else:
					indented_message(
						"password not added to album",
						dir_name + "' matches '" + password['pattern'] + "' " + case + ", but encrypted password " + password['password_md5'] + " is already there",
						3
					)
		album.passwords_md5.sort()

		message("reading directory", absolute_path, 5)
		message("subdir for cache files", " " + album.subdir, 3)

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
		# for entry in self._listdir_sorted_by_time(absolute_path):
		for entry in self._listdir_sorted_alphabetically(absolute_path):
			try:
				# @python2
				if sys.version_info < (3, ):
					entry = entry.decode(sys.getfilesystemencoding())
				else:
					entry = os.fsdecode(entry)
			except KeyboardInterrupt:
				raise
			except:
				indented_message("unicode error", entry, 1)
				continue

			if entry[0] == '.' or entry == Options.config['metadata_filename']:
				# skip hidden files and directories, or user's metadata file 'album.ini'
				continue

			entry_with_path = os.path.join(absolute_path, entry)
			if not os.path.exists(entry_with_path):
				indented_message("unexistent file, perhaps a symlink, skipping", entry_with_path, 2)
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
				[next_walked_album, num, nums_protected, positions, sub_max_file_date] = self.walk(entry_with_path, next_album_cache_base, passwords, album)
				for media_passwords_md5 in nums_protected:
					if not media_passwords_md5 in album.nums_protected_media_in_sub_tree:
						album.nums_protected_media_in_sub_tree[media_passwords_md5] = 0
					album.nums_protected_media_in_sub_tree[media_passwords_md5] += nums_protected[media_passwords_md5]
				if next_walked_album is not None:
					max_file_date = max(max_file_date, sub_max_file_date)
					album.num_media_in_sub_tree += num
					album.positions_and_media_in_tree = self.merge_positions(album.positions_and_media_in_tree, positions)
					album.add_album(next_walked_album)
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

				# if any(remove_album_path(entry_with_path) == _media.media_file_name for _media in self.all_media):
				# 	# do not process the media twice
				# 	continue

				# save the file name for the end of the cycle, so that subdirs are processed first
				files_in_dir.append(entry_with_path)

		message("working with files in dir", absolute_path, 3)
		next_level()
		for entry_with_path in files_in_dir:
			message("working with file", entry_with_path, 3)
			next_level()
			cache_hit = True
			dirname = os.path.dirname(entry_with_path)
			try:
				message("reading file and dir times...", "", 5)
				mtime = file_mtime(entry_with_path)
				dir_mtime = file_mtime(dirname)
				indented_message("file and dir times read!", "", 5)
			except KeyboardInterrupt:
				raise
			except OSError:
				indented_message("could not read file or dir mtime", "", 5)
				continue
			else:
				max_file_date = max(max_file_date, mtime)
				media = None
				cached_media = None
				absolute_cache_file_exists = False

			if Options.config['checksum']:
				message("calculating checksum...", "", 5)
				with open(entry_with_path, 'rb') as media_path_pointer:
					media_checksum = checksum(media_path_pointer)
				indented_message("checksum calculated", "", 5)

			if not album_cache_hit:
				indented_message("not a cache hit", "json file invalid", 5)
				cache_hit = False

			if album_cache_hit and cache_hit:
				next_level()
				message("getting media from cached album...", "", 5)
				cached_media = cached_album.media_from_path(entry_with_path)
				if cached_media is None:
					indented_message("no such media in cached album", "not a cache hit", 5)
					cache_hit = False
				else:
					indented_message("cached media got!", "", 5)
				# cached_media._attributes["dateTimeDir"] = dir_mtime

				if cache_hit and cached_media._attributes["dateTimeFile"] != mtime:
					indented_message("modification time different", "not a cache hit", 5)
					cache_hit = False

				if cache_hit and Options.config['checksum']:
					try:
						cached_media._attributes['checksum']
					except KeyError:
						message("not a cache hit", "no checksum in json file", 5)
						cache_hit = False
					else:
						if cached_media._attributes['checksum'] == media_checksum:
							indented_message("checksum OK!", "", 5)
						else:
							indented_message("not a cache hit", "bad checksum!", 5)
							cache_hit = False

				if cache_hit and cached_media:
					if mtime != cached_media.datetime_file:
						message("not a cache hit", "file datetime different from cache one", 5)
						cache_hit = False
					else:
						cache_files = cached_media.image_caches
						# check if the cache files actually exist and are not old
						for cache_file in cache_files:
							absolute_cache_file = os.path.join(Options.config['cache_path'], cache_file)
							absolute_cache_file_exists = os.path.exists(absolute_cache_file)
							if (
								Options.config['recreate_fixed_height_thumbnails'] and
								absolute_cache_file_exists and file_mtime(absolute_cache_file) < json_file_mtime
							):
								# remove wide images, in order not to have blurred thumbnails
								fixed_height_thumbnail_re = "_" + str(Options.config['media_thumb_size']) + r"tf\.jpg$"
								match = re.search(fixed_height_thumbnail_re, cache_file)
								if match and cached_media.size[0] > cached_media.size[1]:
									try:
										os.unlink(os.path.join(Options.config['cache_path'], cache_file))
										message("deleted, re-creating fixed height thumbnail", os.path.join(Options.config['cache_path'], cache_file), 3)
									except OSError:
										message("error deleting fixed height thumbnail", os.path.join(Options.config['cache_path'], cache_file), 1)

							if not absolute_cache_file_exists:
								indented_message("not a cache hit", "unexistent reduction/thumbnail", 4)
								cache_hit = False
								break
							if file_mtime(absolute_cache_file) < cached_media.datetime_file:
								indented_message("not a cache hit", "reduction/thumbnail older than cached media", 4)
								cache_hit = False
								break
							if file_mtime(absolute_cache_file) > json_file_mtime:
								indented_message("not a cache hit", "reduction/thumbnail newer than json file", 4)
								cache_hit = False
								break
							if Options.config['recreate_reduced_photos']:
								indented_message("not a cache hit", "reduced photo recreation requested", 4)
								cache_hit = False
								break
							if Options.config['recreate_thumbnails']:
								indented_message("not a cache hit", "thumbnail recreation requested", 4)
								cache_hit = False
								break
				back_level()

			if cache_hit:
				media = cached_media
				if media.is_video:
					message("cache hit!", "transcoded video and thumbnails OK", 4)
				else:
					message("cache hit!", "reduced size images and thumbnails OK", 4)
			else:
				message("processing media from file", "", 5)
				media = Media(album, entry_with_path, Options.config['cache_path'], None)
				if Options.config['checksum']:
					media._attributes["checksum"] = media_checksum

			if media.is_valid:
				media.passwords_md5 = []
				media.password_codes = []
				file_name = os.path.basename(entry_with_path)

				# apply the album passwords_md5 and password codes to the media
				for password_md5 in album.passwords_md5:
					if password_md5 not in media.passwords_md5:
						media.passwords_md5.append(password_md5)
						indented_message("album password added to media", "encrypted password = " + password_md5, 3)
					else:
						indented_message("album password not added to media", "encrypted password = " + password_md5 + " is already there", 3)

				for password_code in album.password_codes:
					if password_code not in media.password_codes:
						media.password_codes.append(password_code)

				# apply the file passwords_md5 and password codes to the media if they match the media name
				for password in passwords:
					if password['case_flag'] == 'cs':
						match = fnmatch.fnmatchcase(file_name, password['pattern'])
						case = "case sentitive"
					else:
						match = re.match(fnmatch.translate(password['pattern']), file_name, re.IGNORECASE)
						case = "case insentitive"

					if match:
						if password['password_md5'] not in media.passwords_md5:
							media.passwords_md5.append(password['password_md5'])
							media.password_codes.append(password['password_code'])
							indented_message(
								"password and code added to media",
								"'" + file_name + "' matches '" + password['pattern'] + "' " + case + ", encrypted password = " + password['password_md5'],
								3
							)
						else:
							indented_message(
								"password and code not added to media",
								"'" + file_name + "' matches '" + password['pattern'] + "' " + case + ", but encrypted password " + password['password_md5'] + " is already there",
								3
							)

				media.passwords_md5.sort()

				# update the protected media count according for the passwords' md5
				if len(media.passwords_md5):
					media_passwords_md5 = '-'.join(media.passwords_md5)
					if not media_passwords_md5 in album.nums_protected_media_in_sub_tree:
						album.nums_protected_media_in_sub_tree[media_passwords_md5] = 0
					album.nums_protected_media_in_sub_tree[media_passwords_md5] += 1

				album.num_media_in_sub_tree += 1
				if media.has_gps_data:
					album.positions_and_media_in_tree = self.add_media_to_position(
						album.positions_and_media_in_tree,
						media,
						Options.config['folders_string']
					)

				if media.is_video:
					num_video_in_dir += 1
					if not cache_hit:
						num_video_processed_in_dir += 1
				else:
					num_photo_in_dir += 1
					if not cache_hit:
						num_photo_processed_in_dir += 1

					if media.has_exif_date:
						num_photo_with_exif_date_in_dir += 1
					if media.has_gps_data:
						num_photo_with_geotags_in_dir += 1

					if media.has_exif_date:
						if media.has_gps_data:
							num_photo_with_exif_date_and_geotags_in_dir += 1
						else:
							photos_with_exif_date_and_without_geotags_in_dir.append("      " + entry_with_path)
					else:
						if media.has_gps_data:
							photos_without_exif_date_and_with_geotags_in_dir.append("      " + entry_with_path)
						else:
							photos_without_exif_date_or_geotags_in_dir.append(      "      " + entry_with_path)

				if not any(media.media_file_name == _media.media_file_name for _media in self.all_media):
					next_level()
					message("adding media to dates tree...", "", 5)
					# the following function has a check on media already present
					self.add_media_to_tree_by_date(media)
					indented_message("media added to dates tree!", "", 5)

					if media.has_gps_data:
						message("adding media to geonames tree...", "", 5)
						# the following function has a check on media already present
						self.add_media_to_tree_by_geonames(media)
						indented_message("media added to geonames tree!", "", 5)

					message("adding media to search tree...", "", 5)
					# the following function has a check on media already present
					self.add_media_to_tree_by_search(media)
					indented_message("media added to search tree", "", 5)

					message("adding media to album...", "", 5)
					album.add_media(media)
					indented_message("media added to album", "", 5)

					message("adding media to all media list...", "", 5)
					self.all_media.append(media)
					indented_message("media added to all media list", "", 5)

					back_level()
				else:
					indented_message("media not added to anything...", "it was already there", 5)

			elif not media.is_valid:
				indented_message("not image nor video", "", 1)
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

		if not album.empty:
			next_level()
			message("adding album to albums list...", "", 5)
			self.all_albums.append(album)
			indented_message("album added to albums list", "", 4)
			back_level()
		else:
			message("VOID: no media in this directory", os.path.basename(absolute_path), 4)

		if album.num_media_in_sub_tree:
			# generate the album composite image for sharing
			self.generate_composite_image(album, max_file_date)
		back_level()

		report_times(False)

		return [album, album.num_media_in_sub_tree, album.nums_protected_media_in_sub_tree, album.positions_and_media_in_tree, max_file_date]


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
				if random_number < subalbum.num_media_in_sub_tree:
					[picked_image, random_number] = self.pick_random_image(subalbum, random_number)
					if picked_image:
						return [picked_image, random_number]
				random_number -= subalbum.num_media_in_sub_tree
		return [None, random_number]

	def generate_composite_image(self, album, max_file_date):
		next_level()
		composite_image_name = album.cache_base + ".jpg"
		self.all_album_composite_images.append(composite_image_name)
		composite_image_path = os.path.join(self.album_cache_path, composite_image_name)
		json_file_with_path = os.path.join(Options.config['cache_path'], album.json_file)
		if (os.path.exists(composite_image_path) and
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
		if album.num_media_in_sub_tree == 1 or Options.config['max_album_share_thumbnails_number'] == 1:
			max_thumbnail_number = 1
		elif album.num_media_in_sub_tree < 9 or Options.config['max_album_share_thumbnails_number'] == 4:
			max_thumbnail_number = 4
		elif album.num_media_in_sub_tree < 16 or Options.config['max_album_share_thumbnails_number'] == 9:
			max_thumbnail_number = 9
		elif album.num_media_in_sub_tree < 25 or Options.config['max_album_share_thumbnails_number'] == 16:
			max_thumbnail_number = 16
		elif album.num_media_in_sub_tree < 36 or Options.config['max_album_share_thumbnails_number'] == 25:
			max_thumbnail_number = 25
		else:
			max_thumbnail_number = Options.config['max_album_share_thumbnails_number']

		# pick max_thumbnail_number random square album thumbnails
		random_thumbnails = list()
		random_list = list()
		bad_list = list()
		num_random_thumbnails = min(max_thumbnail_number, album.num_media_in_sub_tree)
		i = 0
		good_media_number = album.num_media_in_sub_tree
		while True:
			if i >= good_media_number:
				break
			if len(album.media) and num_random_thumbnails == 1:
				random_media = album.media[0]
			else:
				while True:
					random_number = random.randint(0, album.num_media_in_sub_tree - 1)
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
				message("unexistent thumbnail", thumbnail + " - i=" + str(i) + ", good=" + str(good_media_number), 5)
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


	# def save_all_media_json(self):
	# 	media_list = []
	# 	message("sorting all media list...", "", 5)
	# 	self.all_media.sort()
	# 	indented_message("all media list sorted", "", 5)
	# 	message("building media path list...", "", 5)
	# 	for media in self.all_media:
	# 		media_list.append(media.path)
	# 	indented_message("media path list built", "", 5)
	# 	message("caching all media path list...", "", 4)
	# 	with open(os.path.join(Options.config['cache_path'], "all_media.json"), 'w') as all_media_file:
	# 		json.dump(media_list, all_media_file, cls=PhotoAlbumEncoder)
	# 	indented_message("all media path list cached", "", 5)


	@staticmethod
	def _save_json_options():
		json_options_file = os.path.join(Options.config['cache_path'], 'options.json')
		message("saving json options file...", json_options_file, 4)
		# some option must not be saved
		options_to_save = {}
		for key, value in list(Options.config.items()):
			if key not in Options.options_not_to_be_saved:
				options_to_save[key] = value

		with open(json_options_file, 'w') as options_file:
			json.dump(options_to_save, options_file)
		indented_message("saved json options file", "", 5)


	def remove_stale(self, subdir=""):
		# preparing files and directories lists
		if not subdir:
			message("cleaning up, be patient...", "", 3)
			next_level()
			message("building stale list...", "", 4)

			# for album in self.all_albums:
			# 	self.all_json_files.append(album.json_file)
			# 	self.all_json_files.append(album.positions_json_file)
			for media in self.all_media:
				album_subdir = media.album.subdir
				for entry in media.image_caches:
					entry_without_subdir = entry[len(album_subdir) + 1:]
					try:
						self.all_json_files_by_subdir[album_subdir].append(entry_without_subdir)
					except KeyError:
						self.all_json_files_by_subdir[album_subdir] = list()
						self.all_json_files_by_subdir[album_subdir].append(entry_without_subdir)
			indented_message("stale list built", "", 5)
			info = "in cache path"
			deletable_files_re = r"\.json$"

		else:
			# reduced sizes, thumbnails, old style thumbnails
			if subdir == Options.config['cache_album_subdir']:
				self.all_json_files_by_subdir[subdir] = list()
				for path in self.all_album_composite_images:
					self.all_json_files_by_subdir[subdir].append(path)
				deletable_files_re = r"\.jpg$"
			else:
				deletable_files_re = r"(" + Options.config['cache_folder_separator'] + r"|_)" + \
					r"transcoded(_([1-9][0-9]{0,3}[kKmM]|[1-9][0-9]{3,10})(_[1-5]?[0-9])?)?\.mp4$" + \
					r"|(" + Options.config['cache_folder_separator'] + r"|_)[1-9][0-9]{1,4}(a|t|s|[at][sf])?\.jpg$"
			info = "in subdir " + subdir

		message("searching for stale cache files", info, 4)

		for cache_file in sorted(os.listdir(os.path.join(Options.config['cache_path'], subdir))):
			if os.path.isdir(os.path.join(Options.config['cache_path'], subdir, cache_file)):
				next_level()
				self.remove_stale(os.path.join(subdir, cache_file))
				if not os.listdir(os.path.join(Options.config['cache_path'], subdir, cache_file)):
					next_level()
					message("empty subdir, deleting...", "", 4)
					file_to_delete = os.path.join(Options.config['cache_path'], subdir, cache_file)
					next_level()
					os.rmdir(os.path.join(Options.config['cache_path'], file_to_delete))
					message("empty subdir, deleted", "", 5)
					back_level()
					back_level()
				back_level()
			else:
				# only delete json's, transcoded videos, reduced images and thumbnails
				next_level()
				message("deciding whether to keep a cache file...", "", 7)
				match = re.search(deletable_files_re, cache_file)
				indented_message("decided whether to keep a cache file", cache_file, 6)
				if match:
					try:
						# @python2
						if sys.version_info < (3, ):
							cache_file = cache_file.decode(sys.getfilesystemencoding())
						else:
							cache_file = os.fsdecode(cache_file)
					except KeyboardInterrupt:
						raise
					#~ except:
						#~ pass
					if subdir:
						if subdir in self.all_json_files_by_subdir:
							cache_list = self.all_json_files_by_subdir[subdir]
						else:
							cache_list = list()
					else:
						cache_list = self.all_json_files
					if cache_file not in cache_list:
						message("removing stale cache file...", cache_file, 4)
						file_to_delete = os.path.join(Options.config['cache_path'], subdir, cache_file)
						os.unlink(file_to_delete)
						indented_message("stale cache file removed", "", 5)
				else:
					indented_message("not a stale cache file, keeping it", cache_file, 2)
					back_level()
					continue
				back_level()
		if not subdir:
			message("cleaned", "", 5)
			back_level()
			back_level()
