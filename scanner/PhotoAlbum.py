# -*- coding: utf-8 -*-


# gps code got from https://gist.github.com/erans/983821

import locale
import json
import os
import os.path
import tempfile
import hashlib
import unicodedata
import magic
import sys
import copy
from datetime import datetime
from pprint import pprint

try:
	import cv2
except:
	pass

import configparser
from configparser import NoOptionError

import math
import numpy as np

from CachePath import remove_album_path, remove_folders_marker, trim_base_custom
from CachePath import thumbnail_types_and_sizes, photo_cache_name, video_cache_name
from CachePath import transliterate_to_ascii, remove_accents, remove_non_alphabetic_characters
from CachePath import remove_all_but_alphanumeric_chars_dashes_slashes, switch_to_lowercase
from Utilities import message, indented_message, next_level, back_level, file_mtime, json_files_and_mtime, make_dir
from Utilities import merge_albums_dictionaries_from_json_files, calculate_media_file_name
from Utilities import convert_identifiers_set_to_codes_set, convert_old_codes_set_to_identifiers_set
from Utilities import convert_combination_to_set, convert_set_to_combination, complex_combination
from Geonames import Geonames
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from PIL.TiffImagePlugin import IFDRational, Fraction
from VideoToolWrapper import VideoProbeWrapper, VideoTranscodeWrapper
import Options
# WARNING: pyexiftool has been modified, do not overwrite with new versions unless you know what you are doing
import PyExifTool
# this is needed in order to avoid complains from exifread
if 'exifread' in Options.config['metadata_tools_preference']:
	import exifread

# this is needed in order to avoid complains from exifread
import logging

try:
	locale.setlocale(locale.LC_ALL, '')
except locale.Error:
	message("FATAL ERROR", "the default locale is unset on the system, quitting", 0)
	sys.exit(-97)
# this is needed in order to avoid complains from exifread
logging.basicConfig()

class Album(object):
	def __init__(self, path):
		if path is not None:
			if path[-1:] == '/':
				path = path[0:-1]
			self.absolute_path = path
			self.baseless_path = remove_album_path(path)
			self.cache_base = ""
			self.media_list = []
			self.subalbums_list = []
			self.media_list_is_sorted = True
			self.subalbums_list_is_sorted = True
			self._subdir = ""
			self.nums_media_in_sub_tree = ImageAndVideo()
			self.nums_media_in_sub_tree_non_geotagged = ImageAndVideo()
			self.complex_combination = ','
			self.nums_protected_media_in_sub_tree = NumsProtected()
			self.sizes_protected_media_in_sub_tree = SizesProtected()
			self.sizes_protected_media_in_album = SizesProtected()
			self.nums_protected_media_in_sub_tree_non_geotagged = NumsProtected()
			self.sizes_protected_media_in_sub_tree_non_geotagged = SizesProtected()
			self.sizes_protected_media_in_album_non_geotagged = SizesProtected()
			self.positions_and_media_in_tree = Positions(None)
			self.parent_cache_base = None
			self.album_ini = None
			self._attributes = {}
			self._attributes["metadata"] = {}
			self.json_version = ""
			self.password_identifiers_set = set()
			self.passwords_marker_mtime = None
			self.album_ini_mtime = None
			self.date = datetime(1, 1, 1)

			if (
				Options.config['subdir_method'] in ("md5", "folder") and
				(
					self.baseless_path.find(Options.config['by_date_string']) != 0 or
					self.baseless_path.find(Options.config['by_gps_string']) != 0 or
					self.baseless_path.find(Options.config['by_search_string']) != 0
				)
			):
				if Options.config['subdir_method'] == "md5":
					if Options.config['cache_folders_num_digits_array'] == []:
						self._subdir = Options.config['default_cache_album']
					else:
						hash = hashlib.md5(os.fsencode(path)).hexdigest()
						self._subdir = ''
						previous_digits = 0
						for digits in Options.config['cache_folders_num_digits_array']:
							if self._subdir:
								self._subdir += '/'
							self._subdir += hash[previous_digits:previous_digits + digits]
							previous_digits = digits
				elif Options.config['subdir_method'] == "folder":
					if path.find("/") == -1:
						self._subdir = "__"
					else:
						self._subdir = path[path.rfind("/") + 1:][:2].replace(" ", "_")
						if len(self._subdir) == 1:
							self._subdir += "_"

	@property
	def name(self):
		if hasattr(self, "_name"):
			return self._name
		else:
			return os.path.basename(self.baseless_path)

	@property
	def title(self):
		if 'metadata' in self._attributes and 'title' in self._attributes["metadata"]:
			return self._attributes["metadata"]["title"]
		else:
			return ''

	@property
	def description(self):
		if 'metadata' in self._attributes and 'description' in self._attributes["metadata"]:
			return self._attributes["metadata"]["description"]
		else:
			return ''

	@property
	def tags(self):
		if 'metadata' in self._attributes and 'tags' in self._attributes["metadata"]:
			return self._attributes["metadata"]["tags"]
		else:
			return ''

	@property
	def media(self):
		return self.media_list

	@property
	def subalbums(self):
		return self.subalbums_list

	@property
	def path(self):
		return self.baseless_path

	def __str__(self):
		if hasattr(self, "name"):
			return self.name
		else:
			return self.path

	@property
	def json_file(self):
		return self.cache_base + ".json"

	@property
	def positions_json_file(self):
		return self.cache_base + ".positions.json"

	@property
	def media_json_file(self):
		return self.cache_base + ".media.json"

	@property
	def subdir(self):
		return self._subdir

	# @property
	def album_date(self):
		dates = [subalbum.date for subalbum in self.subalbums_list]
		dates.extend([single_media.date for single_media in self.media_list])
		if len(dates) == 0:
			return datetime(1, 1, 1)
		else:
			return max(dates)
		# self.sort_media_by_date()
		# self.sort_subalbum_by_date()
		# if len(self.media_list) == 0 and len(self.subalbums_list) == 0:
		# 	return datetime(1, 1, 1)
		# elif len(self.media_list) == 0:
		# 	return self.subalbums_list[-1].date
		# elif len(self.subalbums_list) == 0:
		# 	return self.media_list[-1].date
		# return max(self.media_list[-1].date, self.subalbums_list[-1].date)

	@property
	def date_string(self):
		date_str = str(self.date)
		while len(date_str) < 19:
			date_str = "0" + date_str
		return date_str

	def __eq__(self, other):
		return self.path == other.path

	# def __ne__(self, other):
	# 	return not self.__eq__(other)

	def __lt__(self, other):
		try:
			if Options.config['default_album_name_sort'] or self.date == other.date:
				if Options.config['default_album_reverse_sort']:
					return self.name > other.name
				else:
					return self.name < other.name
			else:
				if Options.config['default_album_reverse_sort']:
					return self.date > other.date
				else:
					return self.date < other.date
			# return self.date < other.date
		except TypeError:
			return False

	# def __le__(self, other):
	# 	try:
	# 		return self.date <= other.date
	# 	except TypeError:
	# 		return False
	#
	# def __gt__(self, other):
	# 	try:
	# 		return self.date > other.date
	# 	except TypeError:
	# 		return False
	#
	# def __ge__(self, other):
	# 	try:
	# 		return self.date >= other.date
	# 	except TypeError:
	# 		return False


	def read_album_ini(self, file_name):
		"""Read the 'album.ini' file in the directory 'self.absolute_path' to
		get user defined metadata for the album and pictures.
		"""
		self.album_ini = configparser.ConfigParser(allow_no_value=True)
		message("reading album.ini...", file_name, 5)
		self.album_ini.read(file_name)
		indented_message("album.ini read", "", 5)

		next_level()
		message("adding album.ini metadata values to album...", "", 5)
		Metadata.set_metadata_from_album_ini("album", self._attributes, self.album_ini)
		indented_message("metadata values from album.ini added to album...", "", 5)
		back_level()

	def is_already_in_tree_by_search(self, tree_by_search_word):
		albums_list = tree_by_search_word["albums_list"]
		return len([album for album in albums_list if self.cache_base == album.cache_base]) == 1


	def add_single_media(self, single_media):
		# before adding the media, remove any media with the same file name
		# it could be there because the album was a cache hit but the media wasn't
		self.media_list = [_media for _media in self.media_list if single_media.media_file_name != _media.media_file_name]
		self.media_list.append(single_media)
		self.media_list_is_sorted = False

	def add_subalbum(self, album):
		self.subalbums_list.append(album)
		self.subalbums_list_is_sorted = False

	def sort_subalbum_by_date(self):
		self.subalbums_list.sort(key=lambda _subalbum: _subalbum.date)
		if not Options.config['default_album_name_sort'] and not Options.config['default_album_reverse_sort']:
			self.subalbums_list_is_sorted = False

	def sort_media_by_date(self):
		self.media_list.sort(key=lambda _media: _media.date)
		if not Options.config['default_media_name_sort'] and not Options.config['default_media_reverse_sort']:
			self.media_list_is_sorted = False

	def sort_subalbums_and_media(self):
		if not self.media_list_is_sorted:
			self.media_list.sort()
			self.media_list_is_sorted = True
		if not self.subalbums_list_is_sorted:
			self.subalbums_list.sort()
			self.subalbums_list_is_sorted = True

	@property
	def empty(self):
		if len(self.media_list) != 0:
			return False
		if len(self.subalbums_list) == 0:
			return True
		for subalbum in self.subalbums:
			if not subalbum.empty:
				return False
		return True

	def copy(self):
		album = Album(None)
		for key, value in list(self.__dict__.items()):
			if key == "subalbums_list":
				# subalbums must be new objects
				setattr(album, key, [subalbum.copy() for subalbum in value])
			elif isinstance(value, list):
				# media are the same object, but the list is a copy
				setattr(album, key, value[:])
				# album[key] = value[:]
			elif isinstance(value, Positions) or isinstance(value, NumsProtected):
				setattr(album, key, value.copy())
			elif isinstance(value, dict):
				setattr(album, key, copy.deepcopy(value))
			else:
				setattr(album, key, value)

		return album

	def leave_only_unprotected_content(self):
		next_level()
		message("working with album...", self.cache_base, 5)
		self.positions_and_media_in_tree = Positions(None)
		if len(self.password_identifiers_set) == 0:
			# the album isn't protected, but media and subalbums may be protected
			# besides that, for virtual media the physical album password is included in the media and must be taken into account
			self.media_list = [single_media for single_media in self.media if len(single_media.album_identifiers_set) == 0 and len(single_media.password_identifiers_set) == 0]
			if not (
				len(self.cache_base.split(Options.config['cache_folder_separator'])) < 4 and (
					self.cache_base.find(Options.config['by_date_string']) == 0 or
					self.cache_base.find(Options.config['by_gps_string']) == 0
				)
			):
				for single_media in self.media_list:
					if single_media.has_gps_data:
						self.positions_and_media_in_tree.add_single_media(single_media)
		else:
			# protected album, remove the media
			self.media_list = []
			# subalbums are not removed, because there may be some unprotected content up in the tree

		# process subalbums
		subalbums_to_remove = []
		for subalbum in self.subalbums_list:
			subalbum.leave_only_unprotected_content()

			if (
				',' not in subalbum.nums_protected_media_in_sub_tree.keys() or
				subalbum.nums_protected_media_in_sub_tree.value(',').total() == 0
			):
				subalbums_to_remove.append(subalbum)
			elif (
				self.cache_base == Options.config['by_search_string'] or
				self.cache_base.find(Options.config['by_search_string']) != 0
			):
				self.positions_and_media_in_tree.merge(subalbum.positions_and_media_in_tree)
		for subalbum in subalbums_to_remove:
			self.subalbums_list.remove(subalbum)
		# # search albums:
		# # - do not process subalbums because they have been already processed
		# # - do not process media: anyway their presence isn't significant, and processing them brings trouble with searches
		# if (
		# 	self.cache_base.find(Options.config['by_search_string']) != 0 or
		# 	self.cache_base == Options.config['by_search_string']
		# ):
		# 	# process subalbums
		# 	for subalbum in self.subalbums_list:
		# 		subalbum.leave_only_unprotected_content()
		# 		self.positions_and_media_in_tree.merge(subalbum.positions_and_media_in_tree)
		# else:
		# 	self.subalbums_list = [subalbum for subalbum in self.subalbums_list if len(subalbum.password_identifiers_set) == 0]
		# 	# next lines commented out because contained media don't belong to this album
		# 	# for subalbum in self.subalbums_list:
		# 	# 	self.positions_and_media_in_tree.merge(subalbum.positions_and_media_in_tree)

		if ',' in list(self.nums_protected_media_in_sub_tree.keys()):
			self.nums_media_in_sub_tree = self.nums_protected_media_in_sub_tree.value(',')
			self.sizes_of_sub_tree = self.sizes_protected_media_in_sub_tree.sizes(',')
		else:
			self.nums_media_in_sub_tree = ImageAndVideo()
			self.sizes_of_sub_tree = Sizes()

		if ',' in list(self.sizes_protected_media_in_album.keys()):
			self.sizes_of_album = self.sizes_protected_media_in_album.sizes(',')
		else:
			self.sizes_of_album = Sizes()

		if ',' in list(self.nums_protected_media_in_sub_tree_non_geotagged.keys()):
			self.nums_media_in_sub_tree_non_geotagged = self.nums_protected_media_in_sub_tree_non_geotagged.value(',')
			self.sizes_of_sub_tree_non_geotagged = self.sizes_protected_media_in_sub_tree_non_geotagged.sizes(',')
		else:
			self.nums_media_in_sub_tree_non_geotagged = ImageAndVideo()
			self.sizes_of_sub_tree_non_geotagged = Sizes()

		if ',' in list(self.sizes_protected_media_in_album_non_geotagged.keys()):
			self.sizes_of_album_non_geotagged = self.sizes_protected_media_in_album_non_geotagged.sizes(',')
		else:
			self.sizes_of_album_non_geotagged = Sizes()

		self.date = self.album_date()

		message("album worked!", self.cache_base, 5)
		back_level()


	def leave_only_content_protected_by(self, album_identifiers_set, media_identifiers_set):
		next_level()
		message("working with album...", self.cache_base, 5)
		self.positions_and_media_in_tree = Positions(None)
		self.complex_combination = complex_combination(convert_set_to_combination(album_identifiers_set), convert_set_to_combination(media_identifiers_set))

		# for virtual media the physical album password is included in the media, and must be taken into account
		self.media_list = [single_media for single_media in self.media if
							single_media.album_identifiers_set == album_identifiers_set and single_media.password_identifiers_set == media_identifiers_set]
		if not (
			len(self.cache_base.split(Options.config['cache_folder_separator'])) < 4 and (
				self.cache_base.find(Options.config['by_date_string']) == 0 or
				self.cache_base.find(Options.config['by_gps_string']) == 0
			)
		):
			for single_media in self.media_list:
				if single_media.has_gps_data:
					self.positions_and_media_in_tree.add_single_media(single_media)

		# process subalbums
		subalbums_to_remove = []
		for subalbum in self.subalbums_list:
			subalbum.leave_only_content_protected_by(album_identifiers_set, media_identifiers_set)

			if (
				self.complex_combination not in subalbum.nums_protected_media_in_sub_tree.keys() or
				subalbum.nums_protected_media_in_sub_tree.value(self.complex_combination).total() == 0
			):
				subalbums_to_remove.append(subalbum)
			elif (
				self.cache_base == Options.config['by_search_string'] or
				self.cache_base.find(Options.config['by_search_string']) != 0
			):
				self.positions_and_media_in_tree.merge(subalbum.positions_and_media_in_tree)
		for subalbum in subalbums_to_remove:
			self.subalbums_list.remove(subalbum)
		# # search albums:
		# # - do not process subalbums because they have been already processed
		# # - do not process media: anyway their presence isn't significant, and processing them brings trouble with searches
		# if (
		# 	self.cache_base.find(Options.config['by_search_string']) != 0 or
		# 	self.cache_base == Options.config['by_search_string']
		# ):
		# 	# process subalbums
		# 	for subalbum in self.subalbums_list:
		# 		subalbum.leave_only_content_protected_by(album_identifiers_set, media_identifiers_set)
		# 		self.positions_and_media_in_tree.merge(subalbum.positions_and_media_in_tree)
		# else:
		# 	# it's a search album
		# 	self.subalbums_list = [subalbum for subalbum in self.subalbums_list if
		# 							subalbum.password_identifiers_set == album_identifiers_set]
		# 	for subalbum in self.subalbums_list:
		# 		self.positions_and_media_in_tree.merge(subalbum.positions_and_media_in_tree)

		if self.complex_combination in list(self.nums_protected_media_in_sub_tree.keys()):
			self.nums_media_in_sub_tree = self.nums_protected_media_in_sub_tree.value(self.complex_combination)
			self.sizes_of_sub_tree = self.sizes_protected_media_in_sub_tree.sizes(self.complex_combination)
		else:
			self.nums_media_in_sub_tree = ImageAndVideo()
			self.sizes_of_sub_tree = Sizes()
		if self.complex_combination in list(self.sizes_protected_media_in_album.keys()):
			self.sizes_of_album = self.sizes_protected_media_in_album.sizes(self.complex_combination)
		else:
			self.sizes_of_album = Sizes()

		if self.complex_combination in list(self.nums_protected_media_in_sub_tree_non_geotagged.keys()):
			self.nums_media_in_sub_tree_non_geotagged = self.nums_protected_media_in_sub_tree_non_geotagged.value(self.complex_combination)
			self.sizes_of_sub_tree_non_geotagged = self.sizes_protected_media_in_sub_tree_non_geotagged.sizes(self.complex_combination)
		else:
			self.nums_media_in_sub_tree_non_geotagged = ImageAndVideo()
			self.sizes_of_sub_tree_non_geotagged = Sizes()

		if self.complex_combination in list(self.sizes_protected_media_in_album_non_geotagged.keys()):
			self.sizes_of_album_non_geotagged = self.sizes_protected_media_in_album_non_geotagged.sizes(self.complex_combination)
		else:
			self.sizes_of_album_non_geotagged = Sizes()

		self.date = self.album_date()

		message("album worked!", self.cache_base, 5)
		back_level()


	def generate_protected_content_albums(self):
		protected_albums = {}
		for complex_identifiers_combination in self.nums_protected_media_in_sub_tree.used_password_identifiers():
			next_level()
			album_identifiers_combination, media_identifiers_combination = complex_identifiers_combination.split(',')
			album_identifiers_combination_set = convert_combination_to_set(album_identifiers_combination)
			message("working with complex combination...", album_identifiers_combination + "," + media_identifiers_combination, 5)

			identifiers_combination_set = convert_combination_to_set(media_identifiers_combination)
			protected_albums[complex_identifiers_combination] = self.copy()
			protected_albums[complex_identifiers_combination].leave_only_content_protected_by(album_identifiers_combination_set, identifiers_combination_set)
			indented_message("complex combination worked out!", album_identifiers_combination + "," + media_identifiers_combination, 4)
			back_level()
		return protected_albums

	@property
	def must_separate_media(self):
		return Options.config['max_media_in_json_file'] > 0 and len(self.media) > Options.config['max_media_in_json_file']

	@property
	def must_separate_positions(self):
		return Options.config['max_media_from_positions_in_json_file'] > 0 and self.positions_and_media_in_tree.count_media() > Options.config['max_media_from_positions_in_json_file']

	def to_json_file(self, json_name, positions_json_name, media_json_name, symlinks, positions_symlinks, media_symlinks, complex_identifiers_combination = None):
		save_begin = "saving album..."
		save_end = "album saved!"
		save_positions_begin = "saving positions album..."
		save_positions_end = "positions album saved!"
		save_media_begin = "saving media album..."
		save_media_end = "media album saved!"
		if complex_identifiers_combination is not None:
			save_begin = "saving protected album..."
			save_end = "protected album saved!"
			save_positions_begin = "saving protected positions album..."
			save_positions_end = "protected positions album saved!"
			save_media_begin = "saving protected media album..."
			save_media_end = "protected media album saved!"

		message("sorting subalbums and media...", self.absolute_path, 4)
		self.sort_subalbums_and_media()
		indented_message("subalbums and media sorted!", "", 5)

		# media and positions: if few, they can be saved inside the normal json file
		# otherwise, save them in its own files

		separate_media = self.must_separate_media
		separate_positions = self.must_separate_positions

		json_file_with_path = os.path.join(Options.config['cache_path'], json_name)
		if os.path.exists(json_file_with_path) and not os.access(json_file_with_path, os.W_OK):
			message("FATAL ERROR", json_file_with_path + " not writable, quitting", 0)
			sys.exit(-97)
		message(save_begin, "", 5)
		with open(json_file_with_path, 'w') as file:
			json.dump(self, file, sep_pos = separate_positions, sep_media = separate_media, cls = PhotoAlbumEncoder)
		for symlink in symlinks:
			symlink_with_path = os.path.join(Options.config['cache_path'], symlink)
			os.symlink(json_file_with_path, symlink_with_path)
		indented_message(save_end, "", 4)

		if separate_positions:
			json_positions_file_with_path = os.path.join(Options.config['cache_path'], positions_json_name)
			if os.path.exists(json_positions_file_with_path) and not os.access(json_positions_file_with_path, os.W_OK):
				message("FATAL ERROR", json_positions_file_with_path + " not writable, quitting", 0)
				sys.exit(-97)
			message(save_positions_begin, "", 5)
			with open(json_positions_file_with_path, 'w') as positions_file:
				cache_base_root = self.cache_base.split(Options.config['cache_folder_separator'])[0]
				json.dump(self.positions_and_media_in_tree, positions_file, type = cache_base_root, cls = PhotoAlbumEncoder)
			for symlink in positions_symlinks:
				symlink_with_path = os.path.join(Options.config['cache_path'], symlink)
				os.symlink(json_positions_file_with_path, symlink_with_path)
			indented_message(save_positions_end, "", 4)

		if separate_media:
			json_media_file_with_path = os.path.join(Options.config['cache_path'], media_json_name)
			if os.path.exists(json_media_file_with_path) and not os.access(json_media_file_with_path, os.W_OK):
				message("FATAL ERROR", json_media_file_with_path + " not writable, quitting", 0)
				sys.exit(-97)
			message(save_media_begin, "", 5)
			with open(json_media_file_with_path, 'w') as media_file:
				cache_base_root = self.cache_base.split(Options.config['cache_folder_separator'])[0]
				json.dump(self.media, media_file, type = cache_base_root, cls = PhotoAlbumEncoder)
			for symlink in media_symlinks:
				symlink_with_path = os.path.join(Options.config['cache_path'], symlink)
				os.symlink(json_media_file_with_path, symlink_with_path)
			indented_message(save_media_end, "", 4)

	@staticmethod
	def from_json_files(json_files, json_files_min_mtime):
		next_level()
		if len(json_files) == 1:
			files = "'" + json_files[0] + "'"
		else:
			files = "'" + json_files[0] + "' and others"
		message("reading album from " + str(len(json_files)) + " json files...", files, 5)
		# json_files is the list of the existing files for that cache base
		dictionary = None
		must_process_passwords = False
		for json_file in json_files:
			indented_message("reading json file", json_file)
			with open(json_file, "r") as file_pointer:
				try:
					json_file_dict = json.load(file_pointer)
				except json.decoder.JSONDecodeError:
					indented_message("not a valid json file: corrupted", json_file, 4)
					back_level()
					return [None, True]
			if "jsonVersion" not in json_file_dict:
				indented_message("not an album cache hit", "nonexistent json_version", 4)
				Options.set_obsolete_json_version_flag()
				return [None, True]
			elif json_file_dict["jsonVersion"] != Options.json_version:
				indented_message("not an album cache hit", "old json_version value", 4)
				Options.set_obsolete_json_version_flag()
				return [None, True]

			codes_combinations = list(json_file_dict['numsProtectedMediaInSubTree'].keys())
			if ',' in codes_combinations and json_file_dict['numsProtectedMediaInSubTree'][',']['images'] == 0 and json_file_dict['numsProtectedMediaInSubTree'][',']['videos'] == 0 and len(codes_combinations) > 0:
				codes_combinations.pop()
			if len(codes_combinations) != len(json_files):
				indented_message("not an album cache hit", "json files number different from numsProtectedMediaInSubTree keys number", 4)
				back_level()
				return [None, True]

			if "media" not in json_file_dict:
				media_json_file = calculate_media_file_name(json_file)
				if os.path.exists(media_json_file):
					message("opening and importing media json file...", media_json_file, 4)
					with open(media_json_file, "r") as media_file_pointer:
						try:
							json_file_dict["media"] = json.load(media_file_pointer)
							message("media json file imported!", "", 4)
						except json.decoder.JSONDecodeError:
							indented_message("not an album cache hit: media json file corrupted", media_json_file, 4)
							back_level()
							return [None, True]
				else:
					message("not an album cache hit: media json file unexisting", media_json_file, 4)
					back_level()
					return [None, True]


			if "codesComplexCombination" in json_file_dict:
				for i in range(len(json_file_dict['media'])):
					album_codes_combination = json_file_dict['codesComplexCombination'].split(',')[0]
					media_codes_combination = json_file_dict['codesComplexCombination'].split(',')[1]
					album_identifiers_set = convert_old_codes_set_to_identifiers_set(convert_combination_to_set(album_codes_combination))
					media_identifiers_set = convert_old_codes_set_to_identifiers_set(convert_combination_to_set(media_codes_combination))
					if media_identifiers_set is None or album_identifiers_set is None:
						indented_message("passwords must be processed", "error in going up from code to identifier", 4)
						must_process_passwords = True
						break
					else:
						json_file_dict['password_identifiers_set'] = album_identifiers_set
						json_file_dict['media'][i]['password_identifiers_set'] = media_identifiers_set
						json_file_dict['media'][i]['album_identifiers_set'] = album_identifiers_set
			else:
				for i in range(len(json_file_dict['media'])):
					json_file_dict['media'][i]['password_identifiers_set'] = set()
					json_file_dict['media'][i]['album_identifiers_set'] = set()
				json_file_dict['password_identifiers_set'] = set()
			dictionary = merge_albums_dictionaries_from_json_files(dictionary, json_file_dict)

		indented_message("album read from json files", files, 5)
		back_level()
		# generate the album from the json file loaded
		# subalbums are not generated yet
		if dictionary is None:
			indented_message("json files not usable as a cache hit", files, 4)
			return [None, True]
		else:
			message("converting album to dict from json files...", files, 5)
			album = Album.from_dict(dictionary, json_files, json_files_min_mtime)
			indented_message("album converted to dict from json files", files, 4)
			return [album, must_process_passwords]

	@staticmethod
	def from_dict(dictionary, json_files, json_files_min_mtime):
		must_process_passwords = False
		if "physicalPath" in dictionary:
			path = dictionary["physicalPath"]
		else:
			path = dictionary["path"]
		# Don't use cache if version has changed
		album = Album(os.path.join(Options.config['album_path'], path))
		album.cache_base = dictionary["cacheBase"]
		album.json_version = dictionary["jsonVersion"]
		if "password_identifiers_set" in dictionary:
			album.password_identifiers_set = dictionary["password_identifiers_set"]

		for single_media_dict in dictionary["media"]:
			new_media = SingleMedia.from_dict(
				album,
				single_media_dict,
				os.path.join(
					Options.config['album_path'],
					remove_folders_marker(album.baseless_path)
				),
				json_files,
				json_files_min_mtime
			)
			if new_media.is_valid:
				album.add_single_media(new_media)

		album.cache_base = dictionary["cacheBase"]
		album.album_ini_mtime = dictionary["albumIniMTime"]
		album.passwords_marker_mtime = dictionary["passwordMarkerMTime"]
		if "symlinkCodesAndNumbers" in dictionary:
			album.symlink_codes_and_numbers = dictionary["symlinkCodesAndNumbers"]
		if "compositeImageSize" in dictionary:
			album.composite_image_size = dictionary["compositeImageSize"]

		if "title" in dictionary and dictionary["title"]:
			album._attributes["metadata"]["title"] = dictionary["title"]
		if "description" in dictionary and dictionary["description"]:
			album._attributes["metadata"]["description"] = dictionary["description"]
		if "tags" in dictionary and len(dictionary["tags"]) and not (len(dictionary["tags"]) == 1 and dictionary["tags"][0] == ""):
			album._attributes["metadata"]["tags"] = dictionary["tags"]

		album.sort_subalbums_and_media()

		return album


	def to_dict(self, separate_positions, separate_media):
		self.sort_subalbums_and_media()
		subalbums = []

		for subalbum in self.subalbums_list:
			if not subalbum.empty:
				# path_to_dict = trim_base_custom(subalbum.path, self.baseless_path)
				# if path_to_dict == "":
				# 	path_to_dict = Options.config['folders_string']
				path_to_dict = subalbum.path
				folder_position = path_to_dict.find(Options.config['folders_string'])
				by_date_position = path_to_dict.find(Options.config['by_date_string'])
				by_gps_position = path_to_dict.find(Options.config['by_gps_string'])
				by_search_position = path_to_dict.find(Options.config['by_search_string'])
				if not path_to_dict:
					path_to_dict = Options.config['folders_string']
				elif (
					path_to_dict and
					by_date_position == -1 and
					by_gps_position == -1 and
					by_search_position == -1 and
					subalbum.cache_base != "root" and
					folder_position != 0
				):
					path_to_dict = Options.config['folders_string'] + '/' + path_to_dict

				sub_dict = {
					"path": path_to_dict,
					"cacheBase": subalbum.cache_base,
					"date": subalbum.date_string,
					# "positionsAndMediaInTree": subalbum.positions_and_media_in_tree,
					"numPositionsInTree": len(subalbum.positions_and_media_in_tree.positions),
					"numsMediaInSubTree": subalbum.nums_media_in_sub_tree,
					"sizesOfSubTree": subalbum.sizes_of_sub_tree,
					"sizesOfAlbum": subalbum.sizes_of_album,
					"nonGeotagged": {
						"numsMediaInSubTree": subalbum.nums_media_in_sub_tree_non_geotagged,
						"sizesOfSubTree": subalbum.sizes_of_sub_tree_non_geotagged,
						"sizesOfAlbum": subalbum.sizes_of_album_non_geotagged
					}
				}
				nums_protected_by_code = {}
				for complex_identifiers_combination in list(subalbum.nums_protected_media_in_sub_tree.keys()):
					if complex_identifiers_combination == ',':
						nums_protected_by_code[','] = subalbum.nums_protected_media_in_sub_tree.value(complex_identifiers_combination)
					else:
						album_identifiers_combination = complex_identifiers_combination.split(',')[0]
						media_identifiers_combination = complex_identifiers_combination.split(',')[1]
						album_codes_combination = convert_set_to_combination(convert_identifiers_set_to_codes_set(convert_combination_to_set(album_identifiers_combination)))
						codes_combination = convert_set_to_combination(convert_identifiers_set_to_codes_set(convert_combination_to_set(media_identifiers_combination)))
						complex_codes_combination = complex_combination(album_codes_combination, codes_combination)
						nums_protected_by_code[complex_codes_combination] = subalbum.nums_protected_media_in_sub_tree.value(complex_identifiers_combination)
				sub_dict["numsProtectedMediaInSubTree"] = nums_protected_by_code

				sub_dict["numsMedia"] = ImageAndVideo();
				sub_dict["numsMedia"].setImage(len([_media for _media in subalbum.media_list if _media.is_image]))
				sub_dict["numsMedia"].setVideo(len([_media for _media in subalbum.media_list if _media.is_video]))
				sub_dict["nonGeotagged"]["numsMedia"] = ImageAndVideo();
				sub_dict["nonGeotagged"]["numsMedia"].setImage(len([_media for _media in subalbum.media_list if _media.is_image and not _media.has_gps_data]))
				sub_dict["nonGeotagged"]["numsMedia"].setVideo(len([_media for _media in subalbum.media_list if _media.is_video and not _media.has_gps_data]))
				if hasattr(subalbum, "center"):
					sub_dict["center"] = subalbum.center
				if hasattr(subalbum, "name"):
					sub_dict["name"] = subalbum.name
				if hasattr(subalbum, "alt_name"):
					sub_dict["altName"] = subalbum.alt_name
				if hasattr(subalbum, "words"):
					sub_dict["words"] = subalbum.words
				if hasattr(subalbum, "unicode_words"):
					sub_dict["unicodeWords"] = subalbum.unicode_words
				if subalbum.title:
					sub_dict["title"] = subalbum.title
				if subalbum.description:
					sub_dict["description"] = subalbum.description
				if subalbum.tags:
					sub_dict["tags"] = subalbum.tags
				subalbums.append(sub_dict)

		path_without_folders_marker = remove_folders_marker(self.path)

		path_to_dict = self.path
		folder_position = path_to_dict.find(Options.config['folders_string'])
		by_date_position = path_to_dict.find(Options.config['by_date_string'])
		by_gps_position = path_to_dict.find(Options.config['by_gps_string'])
		by_search_position = path_to_dict.find(Options.config['by_search_string'])
		if not path_to_dict:
			path_to_dict = Options.config['folders_string']
		elif (
			path_to_dict and
			by_date_position == -1 and
			by_gps_position == -1 and
			by_search_position == -1 and
			self.cache_base != "root" and
			folder_position != 0
		):
			path_to_dict = Options.config['folders_string'] + '/' + path_to_dict

		# ancestors_cache_base = list()
		ancestors_names = list()
		if self.cache_base.find(Options.config['folders_string']) == 0:
			ancestors_titles = list()
		ancestors_centers = list()
		_parent = self
		while True:
			# ancestors_cache_base.append(_parent.cache_base)

			if hasattr(_parent, "alt_name"):
				ancestors_names.append(_parent.alt_name)
			elif hasattr(_parent, "name"):
				ancestors_names.append(_parent.name)

			if self.cache_base.find(Options.config['folders_string']) == 0:
				if hasattr(_parent, "title"):
					ancestors_titles.append(_parent.title)
				elif hasattr(_parent, "alt_name"):
					ancestors_titles.append(_parent.alt_name)
				elif hasattr(_parent, "name"):
					ancestors_titles.append(_parent.name)

			if hasattr(_parent, "center"):
				ancestors_centers.append(_parent.center)
			else:
				ancestors_centers.append("")

			if _parent.parent_cache_base is None:
				break
			_parent = next((album for album in Options.all_albums if album.cache_base == _parent.parent_cache_base), None)
			if _parent is None:
				break
		# ancestors_cache_base.reverse()
		ancestors_names.reverse()
		if self.cache_base.find(Options.config['folders_string']) == 0:
			ancestors_titles.reverse()
		ancestors_centers.reverse()

		dictionary = {
			"name": self.name,
			"path": path_to_dict,
			"cacheSubdir": self._subdir,
			"date": self.date_string,
			"subalbums": subalbums,
			"cacheBase": self.cache_base,
			# "ancestorsCacheBase": ancestors_cache_base,
			"ancestorsNames": ancestors_names,
			"physicalPath": path_without_folders_marker,
			"numsMediaInSubTree": self.nums_media_in_sub_tree,
			"sizesOfSubTree": self.sizes_of_sub_tree,
			"sizesOfAlbum": self.sizes_of_album,
			"nonGeotagged": {
				"numsMediaInSubTree": self.nums_media_in_sub_tree_non_geotagged,
				"sizesOfSubTree": self.sizes_of_sub_tree_non_geotagged,
				"sizesOfAlbum": self.sizes_of_album_non_geotagged
			},
			"numPositionsInTree": len(self.positions_and_media_in_tree.positions),
			"albumIniMTime": self.album_ini_mtime,
			"passwordMarkerMTime": self.passwords_marker_mtime,
			"jsonVersion": Options.json_version
		}
		nums_protected_by_code = {}
		for complex_identifiers_combination in list(self.nums_protected_media_in_sub_tree.keys()):
			if complex_identifiers_combination == ',':
				nums_protected_by_code[','] = self.nums_protected_media_in_sub_tree.value(complex_identifiers_combination)
			else:
				album_identifiers_combination = complex_identifiers_combination.split(',')[0]
				media_identifiers_combination = complex_identifiers_combination.split(',')[1]
				album_codes_combination = convert_set_to_combination(convert_identifiers_set_to_codes_set(convert_combination_to_set(album_identifiers_combination)))
				codes_combination = convert_set_to_combination(convert_identifiers_set_to_codes_set(convert_combination_to_set(media_identifiers_combination)))
				complex_codes_combination = complex_combination(album_codes_combination, codes_combination)
				nums_protected_by_code[complex_codes_combination] = self.nums_protected_media_in_sub_tree.value(complex_identifiers_combination)
		dictionary["numsProtectedMediaInSubTree"] = nums_protected_by_code
		if self.complex_combination != ',':
			album_identifiers_combination = self.complex_combination.split(',')[0]
			media_identifiers_combination = self.complex_combination.split(',')[1]
			album_codes_combination = convert_set_to_combination(convert_identifiers_set_to_codes_set(convert_combination_to_set(album_identifiers_combination)))
			codes_combination = convert_set_to_combination(convert_identifiers_set_to_codes_set(convert_combination_to_set(media_identifiers_combination)))
			dictionary["codesComplexCombination"] = complex_combination(album_codes_combination, codes_combination)
		if not separate_positions:
			dictionary["positionsAndMediaInTree"] = self.positions_and_media_in_tree
		if not separate_media:
			dictionary["media"] = self.media_list
		else:
			dictionary["numsMedia"] = ImageAndVideo();
			dictionary["numsMedia"].setImage(len([_media for _media in self.media_list if _media.is_image]))
			dictionary["numsMedia"].setVideo(len([_media for _media in self.media_list if _media.is_video]))
		dictionary["nonGeotagged"]["numsMedia"] = ImageAndVideo();
		dictionary["nonGeotagged"]["numsMedia"].setImage(len([_media for _media in self.media_list if _media.is_image and not _media.has_gps_data]))
		dictionary["nonGeotagged"]["numsMedia"].setVideo(len([_media for _media in self.media_list if _media.is_video and not _media.has_gps_data]))
		if hasattr(self, "symlink_codes_and_numbers"):
			dictionary["symlinkCodesAndNumbers"] = self.symlink_codes_and_numbers
		if hasattr(self, "composite_image_size"):
			dictionary["compositeImageSize"] = self.composite_image_size
		if hasattr(self, "center"):
			dictionary["center"] = self.center
		if hasattr(self, "name"):
			dictionary["name"] = self.name
		if hasattr(self, "alt_name"):
			dictionary["altName"] = self.alt_name
		if self.title:
			dictionary["title"] = self.title
		if self.description:
			dictionary["description"] = self.description
		if self.tags:
			dictionary["tags"] = self.tags
		if self.cache_base.find(Options.config['folders_string']) == 0:
			dictionary["ancestorsTitles"] = ancestors_titles
		if self.cache_base.find(Options.config['by_gps_string']) == 0:
			dictionary["ancestorsCenters"] = ancestors_centers

		return dictionary


	def media_from_path(self, path):
		_path = remove_album_path(path)
		for single_media in self.media_list:
			if _path == single_media.media_file_name:
				return single_media
		return None

	def generate_cache_base(self, subalbum_or_media_path, media_file_name=None):
		# this method calculate the cache base for a subalbum or a single media in self album
		# for a single media, the parameter media_file_name has to be given; in this case subalbum_or_media_path is the single media file name without any path info
		# result only has ascii characters

		prefix = ''
		if media_file_name is None:
			# save and remove the folders/date/gps/search prefix in order to respect it
			for _prefix in [Options.config['folders_string'], Options.config['by_date_string'], Options.config['by_gps_string'], Options.config['by_search_string']]:
				position = subalbum_or_media_path.find(_prefix)
				if position == 0:
					prefix = _prefix
					subalbum_or_media_path = subalbum_or_media_path[len(prefix):]
					break

		# respect alphanumeric characters, substitute non-alphanumeric (but not slashes) with underscore
		subalbum_or_media_path = switch_to_lowercase(remove_accents(remove_all_but_alphanumeric_chars_dashes_slashes(subalbum_or_media_path)))

		# subalbums: convert the character which is used as slash replacement
		if media_file_name is None:
			subalbum_or_media_path = subalbum_or_media_path.replace(Options.config['cache_folder_separator'], ' ')

		# convert spaces and dashes to underscores
		subalbum_or_media_path = subalbum_or_media_path.replace(' ', '_')
		subalbum_or_media_path = subalbum_or_media_path.replace(Options.config['cache_folder_separator'], '_')

		# convert to ascii only characters
		subalbum_or_media_path = '/'.join([transliterate_to_ascii(part).replace('/', '_') for part in subalbum_or_media_path.split('/')])

		# convert slashes to proper separator
		subalbum_or_media_path = subalbum_or_media_path.replace('/', Options.config['cache_folder_separator'])

		while (
			subalbum_or_media_path.find("__") != -1 or
			# subalbum_or_media_path.find(Options.config['cache_folder_separator'] + "_") != -1 or
			# subalbum_or_media_path.find("_" + Options.config['cache_folder_separator']) != -1 or
			subalbum_or_media_path.find(Options.config['cache_folder_separator'] + Options.config['cache_folder_separator']) != -1
		):
			subalbum_or_media_path = subalbum_or_media_path.replace("__", "_")
			# subalbum_or_media_path = subalbum_or_media_path.replace(Options.config['cache_folder_separator'] + '_', Options.config['cache_folder_separator'])
			# subalbum_or_media_path = subalbum_or_media_path.replace('_' + Options.config['cache_folder_separator'], Options.config['cache_folder_separator'])
			subalbum_or_media_path = subalbum_or_media_path.replace(Options.config['cache_folder_separator'] + Options.config['cache_folder_separator'], Options.config['cache_folder_separator'])

		# restore the saved prefix
		subalbum_or_media_path = prefix + subalbum_or_media_path

		if media_file_name is None and hasattr(self, "subalbums_list") or media_file_name is not None and hasattr(self, "media_list"):
			# let's avoid that different album/media with equivalent names have the same cache base
			distinguish_suffix = 0
			while True:
				_path = subalbum_or_media_path
				if distinguish_suffix:
					_path += "_" + str(distinguish_suffix)
				if (
					media_file_name is None     and any(_path == _subalbum.cache_base and self.absolute_path != _subalbum.absolute_path for _subalbum in self.subalbums_list) or
					media_file_name is not None and any(_path == _media.cache_base    and media_file_name    != _media.media_file_name  for _media    in self.media_list)
				):
					distinguish_suffix += 1
				else:
					subalbum_or_media_path = _path
					break

		return subalbum_or_media_path


class Position(object):
	def __init__(self, single_media):
		self.lng = single_media.longitude
		self.lat = single_media.latitude
		self.mediaList = [single_media]

	def belongs(self, single_media):
		# checks whether the single media given as argument can belong to the position
		return self.lng == single_media.longitude and self.lat == single_media.latitude

	def add(self, single_media):
		# the media to add is supposed to have the same lat and lng as the position
		self.mediaList.append(single_media)

	def copy(self):
		new_position = Position(self.mediaList[0])
		new_position.mediaList = self.mediaList[:]
		return new_position


class Positions(object):
	def __init__(self, single_media, positions = None):
		self.positions = []
		if single_media is not None:
			self.add_single_media(single_media)
		elif positions is not None:
			self.merge(positions)

	def add_position(self, position):
		match = False
		for index, _position in enumerate(self.positions):
			if position.lat == _position.lat and position.lng == _position.lng:
				self.positions[index].mediaList.extend(position.mediaList)
				match = True
				break
		if not match:
			self.positions.append(position.copy())

	def merge(self, positions):
		# adds the media position and name to the positions list received as second argument
		for position in positions.positions:
			self.add_position(position)

	def add_single_media(self, single_media):
		added = False
		for position in self.positions:
			if position.belongs(single_media):
				position.add(single_media)
				added = True
				break
		if not added:
			self.add_position(Position(single_media))

	def remove_empty_positions(self):
		self.positions = [position for position in self.positions if len(position.mediaList) > 0]

	def to_dict(self, type_string = None):
		positions = []
		for position in self.positions:
			position_dict = {
				'lat': position.lat,
				'lng': position.lng,
				'mediaList': []
			}
			for single_media in position.mediaList:
				# media_album_cache_base = single_media.album.cache_base
				# if type_string == Options.config['by_date_string']:
				# 	media_album_cache_base = single_media.day_album_cache_base
				# elif type_string == Options.config['by_gps_string']:
				# 	media_album_cache_base = single_media.gps_album_cache_base
				position_dict['mediaList'].append({
					'cacheBase': single_media.cache_base,
					# 'albumCacheBase': media_album_cache_base,
					'foldersCacheBase': single_media.album.cache_base
					# 'passwordsMd5': list(single_media.passwords_md5)
				})
			positions.append(position_dict)

		return positions

	def copy(self):
		new_positions = Positions(None)
		new_positions.positions = [position.copy() for position in self.positions]
		return new_positions

	def count_media(self):
		count = 0
		for position in self.positions:
			count += len(position.mediaList)
		return count


class NumsProtected(object):
	def __init__(self):
		self.nums_protected = {}
		self.nums_protected[','] = ImageAndVideo()

	def incrementImages(self, complex_identifiers_combination):
		try:
			self.nums_protected[complex_identifiers_combination].incrementImages()
		except KeyError:
			self.nums_protected[complex_identifiers_combination] = ImageAndVideo()
			self.nums_protected[complex_identifiers_combination].incrementImages()

	def incrementVideos(self, complex_identifiers_combination):
		try:
			self.nums_protected[complex_identifiers_combination].incrementVideos()
		except KeyError:
			self.nums_protected[complex_identifiers_combination] = ImageAndVideo()
			self.nums_protected[complex_identifiers_combination].incrementVideos()

	def total(self, complex_identifiers_combination):
		return self.nums_protected[complex_identifiers_combination].getImagesSize() + self.nums_protected[complex_identifiers_combination].getVideosSize()

	def value(self, complex_identifiers_combination):
		return self.nums_protected[complex_identifiers_combination]

	def keys(self):
		return list(self.nums_protected.keys())

	def non_trivial_keys(self):
		return [key for key in list(self.keys()) if key != ',']

	def merge(self, nums_protected):
		for complex_identifiers_combination in list(nums_protected.keys()):
			try:
				self.nums_protected[complex_identifiers_combination].sum(nums_protected.nums_protected[complex_identifiers_combination])
			except KeyError:
				self.nums_protected[complex_identifiers_combination] = ImageAndVideo()
				self.nums_protected[complex_identifiers_combination].sum(nums_protected.nums_protected[complex_identifiers_combination])

	def used_password_identifiers(self):
		keys = self.non_trivial_keys()
		keys = sorted(sorted(keys), key = lambda single_key: len(single_key.split('-')))
		return keys

	def copy(self):
		return copy.deepcopy(self)

	def to_dict(self):
		return {k: self.nums_protected[k].to_dict() for k in set(self.nums_protected)}

class ImageAndVideo(object):
	def __init__(self):
		self.sizes = {"images": 0, "videos": 0}

	def sum(self, other):
		if other is not None:
			self.sizes = {"images": self.sizes["images"] + other.sizes["images"], "videos": self.sizes["videos"] + other.sizes["videos"]}

	def copy(self):
		return copy.deepcopy(self)

	def setImage(self, value):
		self.sizes = {"images": value, "videos": self.sizes["videos"]}

	def setVideo(self, value):
		self.sizes = {"images": self.sizes["images"], "videos": value}

	def total(self):
		return self.sizes["images"] + self.sizes["videos"]

	def incrementImages(self):
		self.sizes = {"images": self.sizes["images"] + 1, "videos": self.sizes["videos"]}

	def incrementVideos(self):
		self.sizes = {"images": self.sizes["images"], "videos": self.sizes["videos"] + 1}

	def getImagesSize(self):
		return self.sizes["images"]

	def getVideosSize(self):
		return self.sizes["videos"]

	def from_dict(self, dict):
		self.sizes = dict

	def to_dict(self):
		return self.sizes


class Sizes(object):
	def __init__(self):
		self.sizes = {}
		self.sizes[0] = ImageAndVideo()
		for thumb_size in Options.config['reduced_sizes']:
			self.sizes[thumb_size] = ImageAndVideo()

	def sum(self, other):
		if other is not None:
			for k in set(self.sizes):
				self.sizes[k].sum(other.sizes[k])
			# self.sizes = {k: self.sizes[k].sum(other.sizes[k]) for k in set(self.sizes)}

	def copy(self):
		return copy.deepcopy(self)

	def setImage(self, key, value):
		self.sizes[key].setImage(value)

	def setVideo(self, key, value):
		self.sizes[key].setVideo(value)

	def getImagesSize(self, key):
		return self.sizes[key].getImagesSize()

	def getVideosSize(self, key):
		return self.sizes[key].getVideosSize()

	def from_dict(self, dict):
		for key in dict:
			key_int = int(key)
			self.sizes[key_int].from_dict(dict[key])

	def to_dict(self):
		return {k: self.sizes[k].to_dict() for k in set(self.sizes)}


class SizesProtected(object):
	def __init__(self):
		self.sizes_protected = {}
		self.sizes_protected[','] = Sizes()

	def sum(self, complex_identifiers_combination, sizes):
		if complex_identifiers_combination not in self.sizes_protected:
			self.sizes_protected[complex_identifiers_combination] = Sizes()
		self.sizes_protected[complex_identifiers_combination].sum(sizes)

	def sizes(self, complex_identifiers_combination):
		return self.sizes_protected[complex_identifiers_combination]

	def keys(self):
		return list(self.sizes_protected.keys())

	def non_trivial_keys(self):
		return [key for key in list(self.keys()) if key != ',']

	def merge(self, sizes_protected):
		if sizes_protected is not None:
			for complex_identifiers_combination in list(sizes_protected.keys()):
				if complex_identifiers_combination not in self.sizes_protected:
					self.sizes_protected[complex_identifiers_combination] = Sizes()
				self.sizes_protected[complex_identifiers_combination].sum(sizes_protected.sizes_protected[complex_identifiers_combination])

	def copy(self):
		return copy.deepcopy(self)


class SingleMedia(object):
	def __init__(self, album, media_path, json_files, json_files_min_mtime, thumbs_path = None, dictionary = None):
		self.password_identifiers_set = set()
		self.album_identifiers_set = set()
		if dictionary is not None:
			# media generation from json cache
			self.generate_media_from_cache(album, media_path, dictionary)
		else:
			 # media generation from file
			 self.generate_media_from_file(album, media_path, thumbs_path, json_files, json_files_min_mtime)


	def generate_media_from_cache(self, album, media_path, dictionary):
		self.album = album
		self.media_path = media_path
		self.media_file_name = remove_album_path(media_path)
		dirname = os.path.dirname(media_path)
		self.folders = remove_album_path(dirname)
		self.album_path = os.path.join('albums', self.media_file_name)
		self.cache_base = dictionary['cacheBase']
		self.mime_type = dictionary['mimeType']
		if "password_identifiers_set" in dictionary:
			self.password_identifiers_set = dictionary['password_identifiers_set']
		# else:
		# 	self.password_identifiers_set = set()
		if "album_identifiers_set" in dictionary:
			self.album_identifiers_set = dictionary['album_identifiers_set']
		# else:
		# 	self.album_identifiers_set = set()
		if "convertedPath" in dictionary:
			self.converted_path = dictionary['convertedPath']
		if "imageSize" in dictionary:
			self.image_size = dictionary['imageSize']

		self.is_valid = True

		self._attributes = dictionary
		file_sizes_dict = self._attributes["fileSizes"]
		self._attributes["fileSizes"] = Sizes()
		self._attributes["fileSizes"].from_dict(file_sizes_dict)


	def generate_media_from_file(self, album, media_path, thumbs_path, json_files, json_files_min_mtime):
		next_level()
		message("entered SingleMedia init", "", 5)
		self.album = album
		self.media_path = media_path
		self.media_file_name = remove_album_path(media_path)
		dirname = os.path.dirname(media_path)
		self.folders = remove_album_path(dirname)
		self.album_path = os.path.join('albums', self.media_file_name)
		self.cache_base = album.generate_cache_base(trim_base_custom(media_path, album.absolute_path), self.media_file_name)

		self.is_valid = True

		try:
			message("reading file time and size, and dir time...", "", 5)
			mtime = file_mtime(media_path)
			# file_size = os.path.getsize(media_path)
			dir_mtime = file_mtime(dirname)
			indented_message("file and dir times read!", "", 5)
		except KeyboardInterrupt:
			raise
		except OSError:
			indented_message("could not read file time or size or dir mtime", "", 5)
			self.is_valid = False
			back_level()
			return

		self._attributes = {}
		self._attributes["metadata"] = {}
		self._attributes["dateTimeFile"] = mtime
		self._attributes["dateTimeDir"] = dir_mtime

		self.mime_type = magic.detect_from_filename(media_path).mime_type

		# temporary fix for "ISO Media, MPEG-4 (.MP4) for SonyPSP" files whose mime type is incorrectly reported as audio/mp4
		# TO DO: remove when libmagic1's Bug#941420 is fixed
		if self.mime_type == "audio/mp4":
			self.mime_type = "video/mp4"

		if self.is_image:
			indented_message("it's an image!", self.mime_type, 5)
			message("opening image file...", "", 5)
			media_path_pointer = open(media_path, 'rb')
			next_level()
			message("opening the image with PIL...", "", 5)
			image = None
			try:
				image = Image.open(media_path_pointer)
			except IOError:
				indented_message("PIL IOError opening the image", "", 5)
				self.is_valid = False
			except ValueError:
				# PIL cannot read this file (seen for .xpm file)
				# next lines will detect that the image is invalid
				indented_message("PIL ValueError opening the image", "", 5)
				self.is_valid = False
			except OSError:
				# PIL throws this exceptcion with svg files
				indented_message("PIL OSError opening the image", "is it an svg image?", 5)
				self.is_valid = False
			except RuntimeError:
				# PIL throws this exceptcion with truncated webp files
				indented_message("PIL: RuntimeError opening the image", "maybe a truncated WebP image?", 5)
				self.is_valid = False
			except Image.DecompressionBombError:
				# PIL throws this exception when the image size is greater
				# than the value given in pil_size_for_decompression_bomb_error option
				limit_mb = str(int(Options.config['pil_size_for_decompression_bomb_error'] / 1024 / 1024 * 1000) / 1000)
				indented_message("PIL: DecompressionBombError opening the image", "image size is greater than " + limit_mb + "MB, not using it", 5)
				self.is_valid = False
			else:
				indented_message("image opened with PIL!", "", 5)
				self._attributes["fileSizes"] = Sizes()
				self._attributes["fileSizes"].setImage(0, os.path.getsize(media_path))

			if isinstance(image, Image.Image):
				if Options.config['copy_exif_into_reductions']:
					try:
						self.exif_by_PIL = image.info['exif']
					except KeyError:
						pass

				self._photo_metadata(image)
				for format in Options.config['cache_images_formats']:
					self._photo_thumbnails(image, media_path, Options.config['cache_path'], json_files, json_files_min_mtime, format)
				if self.has_gps_data:
					message("looking for geonames...", "", 5)
					self.get_geonames()
			back_level()

			media_path_pointer.close()
		elif self.is_video:
			# try with video detection
			self._video_metadata(media_path)
			if self.is_video:
				transcode_path = self._video_transcode(thumbs_path, media_path, json_files, json_files_min_mtime)
				if self.is_valid:
					self._attributes["fileSizes"] = Sizes()
					self._attributes["fileSizes"].setVideo(0, os.path.getsize(media_path))
					# let us set all the reduction sizes to the value of the transcoded video
					for thumb_size in Options.config['reduced_sizes']:
						self._attributes["fileSizes"].setVideo(thumb_size, os.path.getsize(transcode_path))
					for format in Options.config['cache_images_formats']:
						self._video_thumbnails(thumbs_path, media_path, json_files, json_files_min_mtime, format)

					if self.has_gps_data:
						message("looking for geonames...", "", 5)
						self.get_geonames()
			else:
				indented_message("error transcoding, not a video?", "", 5)
				self.is_valid = False
		else:
			indented_message("not an image nor a video", "mime type = " + self.mime_type, 5)
			self.is_valid = False
		back_level()
		return

	@property
	def datetime_file(self):
		return self._attributes["dateTimeFile"]

	# @property
	# def file_size(self):
	# 	return self._attributes["fileSize"]

	@property
	def file_sizes(self):
		return self._attributes["fileSizes"]

	@property
	def datetime_dir(self):
		return self._attributes["dateTimeDir"]

	def get_geonames(self):
		self._attributes["geoname"] = Geonames.lookup_nearby_place(self.latitude, self.longitude)
		# self._attributes["geoname"] is a dictionary with this data:
		#  'country_name': the country name in given language
		#  'country_code': the ISO country code
		#  'region_name': the administrative name (the region in normal states, the state in federative states) in given language
		#  'region_code': the corresponding geonames code
		#  'place_name': the nearby place name
		#  'place_code': the nearby place geonames id
		#  'distance': the distance between given coordinates and nearby place geonames coordinates

		# Overwrite with album.ini values when album has been read from file
		if self.album.album_ini:
			Metadata.set_geoname_from_album_ini(self.name, self._attributes, self.album.album_ini)

	def _photo_metadata(self, image):

		self._attributes["metadata"]["size"] = image.size
		self._orientation = 1

		_exif = {}
		used_tool = ""
		previous = ''
		ok = False

		# _exif = self._photo_metadata_by_exiftool(image)
		# _exif = self._photo_metadata_by_exifread(image)
		# _exif = self._photo_metadata_by_PIL(image)

		for _tool in Options.config['metadata_tools_preference']:
			message("extracting metadata by "+ _tool + previous + "...", "", 5)
			if _tool == 'exiftool':
				try:
					_exif = self._photo_metadata_by_exiftool(image)
					ok = True
				except:
					indented_message("UNMANAGED ERROR extracting metadata by exiftool", "is it installed?", 5)
			elif _tool == 'exifread':
				try:
					_exif = self._photo_metadata_by_exifread(image)
					ok = True
				# except Exception as e:
				# 	indented_message("exifread failed: " + str(e), e.__class__.__name__, 5)
				except:
					indented_message("UNMANAGED ERROR extracting metadata by exifread", "is it installed?", 5)
			elif _tool == 'PIL':
				try:
					_exif = self._photo_metadata_by_PIL(image)
					ok = True
				except Exception as e:
					indented_message("PIL failed: " + str(e), e.__class__.__name__, 5)
				# except:
				# 	indented_message("UNMANAGED ERROR extracting metadata by PIL", "is it installed?", 5)

			if ok:
				indented_message("metadata extracted by " + _tool, "", 5)
				used_tool = _tool
				previous = ''
				break
			else:
				previous = ', ' + _tool + ' -> {}'

		all_keys = list(_exif.keys())

		exif = {}
		for key in all_keys:
			if isinstance(key, int):
				# integer keys aren't anyway useful
				continue
			# skip unuseful tags
			if all(key[0:len(prefix)] != prefix for prefix in ['ExifInteroperabilityOffset', 'ExifTool:ExifToolVersion', 'Interoperability', 'MakerNote', 'Tag ', 'Thumbnail', 'Unknown']):
				exif[key] = _exif[key]

		if exif or self.album.album_ini:
			message("setting metadata extracted with " + used_tool, "", 5)
			self._set_photo_metadata(exif)
			indented_message("metadata set!", "", 5)

	def _set_photo_metadata(self, exif):
		if "Orientation" in exif:

			if exif["Orientation"] not in [1, 2, 3, 4, 5, 6, 7, 8]:
				# since we are using internally the numeric (1-8) orientation value, exifread text value must be reverse-numerized
				try:
					exif["Orientation"] = self._photo_metadata.reverse_orientation_dict_for_exifread[exif["Orientation"]]
				except KeyError:
					# I've found some image having as Orientation code a localized string...
					# I can't find anything better than setting orientation to normal
					exif["Orientation"] = 1

			if exif["Orientation"] in [5, 6, 7, 8]:
				self._attributes["metadata"]["size"] = (self._attributes["metadata"]["size"][1], self._attributes["metadata"]["size"][0])
			self._attributes["metadata"]["orientation"] = exif["Orientation"]
			if exif["Orientation"] - 1 < len(self._photo_metadata.orientation_list):
				self._attributes["metadata"]["orientationText"] = self._photo_metadata.orientation_list[exif["Orientation"] - 1]

			# this property will be used in self._photo_thumbnails() in order to properly transpore the image
			self._orientation = exif["Orientation"]

		if "Make" in exif:
			self._attributes["metadata"]["make"] = exif["Make"]
		if "Model" in exif:
			self._attributes["metadata"]["model"] = exif["Model"]
		if "ApertureValue" in exif:
			self._attributes["metadata"]["aperture"] = exif["ApertureValue"]
		elif "FNumber" in exif:
			self._attributes["metadata"]["aperture"] = exif["FNumber"]
		if "FocalLength" in exif:
			self._attributes["metadata"]["focalLength"] = exif["FocalLength"]
		if "ISO" in exif:
			self._attributes["metadata"]["iso"] = exif["ISO"]
		if "ISOSettings" in exif:
			self._attributes["metadata"]["iso"] = exif["ISOSettings"]
		if "ISOSpeedRatings" in exif:
			self._attributes["metadata"]["iso"] = exif["ISOSpeedRatings"]
		if "MakerNote ISO" in exif:
			self._attributes["metadata"]["iso"] = exif["MakerNote ISO"]
		if "PhotographicSensitivity" in exif:
			self._attributes["metadata"]["iso"] = exif["PhotographicSensitivity"]
		if "ExposureTime" in exif:
			self._attributes["metadata"]["exposureTime"] = exif["ExposureTime"]
		if "Flash" in exif:
			self._attributes["metadata"]["flash"] = exif["Flash"]
		if "LightSource" in exif:
			self._attributes["metadata"]["lightSource"] = exif["LightSource"]
		if "ExposureProgram" in exif:
			self._attributes["metadata"]["exposureProgram"] = exif["ExposureProgram"]
		if "SpectralSensitivity" in exif:
			self._attributes["metadata"]["spectralSensitivity"] = exif["SpectralSensitivity"]
		if "MeteringMode" in exif:
			self._attributes["metadata"]["meteringMode"] = exif["MeteringMode"]
		if "SensingMethod" in exif:
			self._attributes["metadata"]["sensingMethod"] = exif["SensingMethod"]
		if "SceneCaptureType" in exif:
			self._attributes["metadata"]["sceneCaptureType"] = exif["SceneCaptureType"]
		if "SubjectDistanceRange" in exif:
			self._attributes["metadata"]["subjectDistanceRange"] = exif["SubjectDistanceRange"]
		if "ExposureCompensation" in exif:
			self._attributes["metadata"]["exposureCompensation"] = exif["ExposureCompensation"]
		if "ExposureBiasValue" in exif:
			self._attributes["metadata"]["exposureCompensation"] = exif["ExposureBiasValue"]

		if "DateTimeOriginal" in exif:
			try:
				self._attributes["metadata"]["dateTime"] = datetime.strptime(exif["DateTimeOriginal"], Options.exif_date_time_format)
			except ValueError:
				if "DateTimeDigitized" in exif:
					try:
						self._attributes["metadata"]["dateTime"] = datetime.strptime(exif["DateTimeDigitized"], Options.exif_date_time_format)
					except ValueError:
						# value isn't usable, forget it
						if "DateTime" in exif:
							try:
								self._attributes["metadata"]["dateTime"] = datetime.strptime(exif["DateTime"], Options.exif_date_time_format)
							except ValueError:
								# value isn't usable, forget it
								pass

		gps_altitude = None
		if "GPSAltitude" in exif:
			gps_altitude = exif["GPSAltitude"]
		# gps_altitude_ref = None
		# if "GPSAltitudeRef" in exif:
		# 	gps_altitude_ref = exif["GPSAltitudeRef"]
		gps_latitude = None
		if "GPSLatitude" in exif:
			gps_latitude = exif["GPSLatitude"]
		gps_latitude_ref = None
		if "GPSLatitudeRef" in exif:
			gps_latitude_ref = exif["GPSLatitudeRef"]
		gps_longitude = None
		if "GPSLongitude" in exif:
			gps_longitude = exif["GPSLongitude"]
		gps_longitude_ref = None
		if "GPSLongitudeRef" in exif:
			gps_longitude_ref = exif["GPSLongitudeRef"]

		# Issue https://gitlab.com/paolobenve/myphotoshare/-/issues/218
		infinitesimal = 0.00001
		if (
			gps_latitude is not None and gps_longitude is not None and
			abs(gps_latitude) < infinitesimal and abs(gps_longitude) < infinitesimal
		):
			gps_latitude = None
			gps_latitude_ref = None
			gps_longitude = None
			gps_longitude_ref = None
		# if gps_altitude is not None and	gps_altitude < infinitesimal:
		# 	gps_altitude = None
		# 	gps_altitude_ref = None

		if gps_latitude is not None and gps_latitude_ref is not None and gps_longitude is not None and gps_longitude_ref is not None:
			self._attributes["metadata"]["latitude"] = gps_latitude
			self._attributes["metadata"]["latitudeMS"] = Metadata.convert_decimal_to_degrees_minutes_seconds(gps_latitude, gps_latitude_ref)
			self._attributes["metadata"]["longitude"] = gps_longitude
			self._attributes["metadata"]["longitudeMS"] = Metadata.convert_decimal_to_degrees_minutes_seconds(gps_longitude, gps_longitude_ref)
		if gps_altitude is not None:
		# if gps_altitude is not None and gps_altitude_ref is not None:
			self._attributes["metadata"]["altitude"] = gps_altitude
			# self._attributes["metadata"]["altitudeRef"] = gps_altitude_ref

		# Overwrite with album.ini values when it has been read from file
		if self.album.album_ini:
			next_level()
			message("adding album.ini metadata values to photo...", "", 5)
			Metadata.set_metadata_from_album_ini(self.name, self._attributes, self.album.album_ini)
			indented_message("metadata values from album.ini added to photo...", "", 5)
			back_level()


	def _photo_metadata_by_PIL(self, image):
		try:
			info = image._getexif()
		except KeyboardInterrupt:
			raise
		except AttributeError:
			indented_message("AttributeError extracting metadata", "", 5)
			return {}

		if not info:
			indented_message("empty metadata", "", 5)
			return {}

		_exif = {}
		exif = {}
		for tag, value in list(info.items()):
			decoded = TAGS.get(tag, tag)
			if (isinstance(value, tuple) or isinstance(value, list)) and (isinstance(decoded, str) or isinstance(decoded, str)) and decoded.startswith("DateTime") and len(value) >= 1:
				value = value[0]
			elif isinstance(value, tuple):
				if isinstance(value[0], tuple):
					value0 = int(value[0][0]) / int(value[0][1])
				else:
					value0 = int(value[0])
				if isinstance(value[1], tuple):
					value1 = int(value[1][0]) / int(value[1][1])
				else:
					value1 = int(value[1])
				value = value0 / value1

			if decoded == "GPSInfo":
				gps_data = {}
				for gps_tag in value:
					sub_decoded = GPSTAGS.get(gps_tag, gps_tag)
					gps_data[sub_decoded] = value[gps_tag]
					_exif[decoded] = gps_data

				# TO DO: this 2 values could be tuples!!!!
				gps_altitude = _exif["GPSInfo"].get("GPSAltitude", None)
				gps_altitude_ref = _exif["GPSInfo"].get("GPSAltitudeRef", None)
				if gps_altitude is not None and gps_altitude_ref is not None:
					exif['GPSAltitude'] = int(gps_altitude[0]) / int(gps_altitude[1])
					exif['GPSAltitudeRef'] = gps_altitude_ref
					# exif['GPSAltitude'] is the absolute value of altitude, exif['GPSAltitudeRef'] == b'\x00' means above sea level, exif['GPSAltitudeRef'] == b'\x01' means below sea level
					# let's use exif['GPSAltitudeRef'] to give exif['GPSAltitude'] the correct sign
					if not exif['GPSAltitudeRef'] in [b'\x00', b'\x00\x00', b'\x00\x00\x00', b'\x00\x00\x00\x00']:
						exif['GPSAltitude'] = - exif['GPSAltitude']
					# since exif['GPSAltitudeRef'], it must be decoded,
					# otherwise it will produce a "TypeError: Object of type bytes is not JSON serializable" when dumping it
					# exif['GPSAltitudeRef'] = exif['GPSAltitudeRef'].decode('utf-8')
					del exif['GPSAltitudeRef']

				gps_latitude = _exif["GPSInfo"].get("GPSLatitude", None)
				gps_latitude_ref = _exif["GPSInfo"].get("GPSLatitudeRef", None)
				gps_longitude = _exif["GPSInfo"].get("GPSLongitude", None)
				gps_longitude_ref = _exif["GPSInfo"].get("GPSLongitudeRef", None)

				if gps_latitude is not None and gps_latitude_ref is not None and gps_longitude is not None and gps_longitude_ref is not None:
					exif["GPSLatitude"] = Metadata.convert_tuple_to_degrees_decimal(gps_latitude, gps_latitude_ref)
					exif["GPSLatitudeRef"] = gps_latitude_ref
					exif["GPSLongitude"] = Metadata.convert_tuple_to_degrees_decimal(gps_longitude, gps_longitude_ref)
					exif["GPSLongitudeRef"] = gps_longitude_ref
			else:
				_exif[decoded] = value
				exif[decoded] = _exif[decoded]
				if "ExposureProgram" in _exif and _exif["ExposureProgram"] < len(self._photo_metadata.exposure_list):
					exif["ExposureProgram"] = self._photo_metadata.exposure_list[_exif["ExposureProgram"]]
				if "SpectralSensitivity" in _exif:
					exif["SpectralSensitivity"] = _exif["SpectralSensitivity"]
				if "MeteringMode" in _exif and _exif["MeteringMode"] < len(self._photo_metadata.metering_list):
					exif["MeteringMode"] = self._photo_metadata.metering_list[_exif["MeteringMode"]]
				if "SensingMethod" in _exif and _exif["SensingMethod"] < len(self._photo_metadata.sensing_method_list):
					exif["SensingMethod"] = self._photo_metadata.sensing_method_list[_exif["SensingMethod"]]
				if "SceneCaptureType" in _exif and _exif["SceneCaptureType"] < len(self._photo_metadata.scene_capture_type_list):
					exif["SceneCaptureType"] = self._photo_metadata.scene_capture_type_list[_exif["SceneCaptureType"]]
				if "SubjectDistanceRange" in _exif and _exif["SubjectDistanceRange"] < len(self._photo_metadata.subject_distance_range_list):
					exif["SubjectDistanceRange"] = self._photo_metadata.subject_distance_range_list[_exif["SubjectDistanceRange"]]

		# PIL returns the keys as 'AFAreaXPositions', i.e. it removes the prefix that exifread and pyexiftool leave

		return exif

	_photo_metadata.flash_dictionary = {0x0: "No Flash", 0x1: "Fired", 0x5: "Fired, Return not detected", 0x7: "Fired, Return detected",
		0x8: "On, Did not fire", 0x9: "On, Fired", 0xd: "On, Return not detected", 0xf: "On, Return detected", 0x10: "Off, Did not fire",
		0x14: "Off, Did not fire, Return not detected", 0x18: "Auto, Did not fire", 0x19: "Auto, Fired", 0x1d: "Auto, Fired, Return not detected",
		0x1f: "Auto, Fired, Return detected", 0x20: "No flash function", 0x30: "Off, No flash function", 0x41: "Fired, Red-eye reduction",
		0x45: "Fired, Red-eye reduction, Return not detected", 0x47: "Fired, Red-eye reduction, Return detected", 0x49: "On, Red-eye reduction",
		0x4d: "On, Red-eye reduction, Return not detected", 0x4f: "On, Red-eye reduction, Return detected", 0x50: "Off, Red-eye reduction",
		0x58: "Auto, Did not fire, Red-eye reduction", 0x59: "Auto, Fired, Red-eye reduction", 0x5d: "Auto, Fired, Red-eye reduction, Return not detected",
		0x5f: "Auto, Fired, Red-eye reduction, Return detected"}
	_photo_metadata.light_source_dictionary = {0: "Unknown", 1: "Daylight", 2: "Fluorescent", 3: "Tungsten (incandescent light)", 4: "Flash", 9: "Fine weather", 10: "Cloudy weather", 11: "Shade", 12: "Daylight fluorescent (D 5700 - 7100K)", 13: "Day white fluorescent (N 4600 - 5400K)", 14: "Cool white fluorescent (W 3900 - 4500K)", 15: "White fluorescent (WW 3200 - 3700K)", 17: "Standard light A", 18: "Standard light B", 19: "Standard light C", 20: "D55", 21: "D65", 22: "D75", 23: "D50", 24: "ISO studio tungsten"}
	_photo_metadata.metering_list = ["Unknown", "Average", "Center-weighted average", "Spot", "Multi-spot", "Multi-segment", "Partial"]
	_photo_metadata.exposure_list = ["Not Defined", "Manual", "Program AE", "Aperture-priority AE", "Shutter speed priority AE", "Creative (Slow speed)", "Action (High speed)", "Portrait", "Landscape", "Bulb"]
	_photo_metadata.orientation_list = ["Horizontal (normal)", "Mirror horizontal", "Rotate 180", "Mirror vertical", "Mirror horizontal and rotate 270 CW", "Rotate 90 CW", "Mirror horizontal and rotate 90 CW", "Rotate 270 CW"]
	_photo_metadata.sensing_method_list = ["Not defined", "One-chip color area sensor", "Two-chip color area sensor", "Three-chip color area sensor", "Color sequential area sensor", "Trilinear sensor", "Color sequential linear sensor"]
	_photo_metadata.scene_capture_type_list = ["Standard", "Landscape", "Portrait", "Night scene"]
	_photo_metadata.subject_distance_range_list = ["Unknown", "Macro", "Close view", "Distant view"]
	_photo_metadata.reverse_orientation_dict_for_exifread = {'Horizontal (normal)': 1, 'Mirrored horizontal': 2, 'Rotated 180': 3, 'Mirrored vertical': 4, 'Mirrored horizontal then rotated 90 CCW': 5, 'Rotated 90 CW': 6, 'Mirrored horizontal then rotated 90 CW': 7, 'Rotated 90 CCW': 8}


	def _photo_metadata_by_exiftool(self, image):
		exif = {}
		with PyExifTool.ExifTool() as et:
			exif_all_tags_codes = et.get_metadata_codes(self.media_path)
			exif_all_tags_values = et.get_metadata_values(self.media_path)

		# pyexiftool has been set to return the keys without any prefix

		for k in sorted(exif_all_tags_values.keys()):
			if k in ['GPSAltitude', 'GPSAltitudeRef', 'GPSLatitude', 'GPSLatitudeRef', 'GPSLongitude', 'GPSLongitudeRef', 'Orientation']:
				# The output of "exiftool -n" for gps isn't easy to manage, better use the "raw" value
				exif[k] = exif_all_tags_codes[k]
			else:
				exif[k] = exif_all_tags_values[k]

		try:
			# make exif['GPSAltitude'] a value above/below sea level
			exif['GPSAltitude'] = float(exif['GPSAltitude'])
			if exif['GPSAltitudeRef'] != 0:
				exif['GPSAltitude'] = - exif['GPSAltitude']
			del exif['GPSAltitudeRef']
		except KeyError:
			pass

		return exif

	def _photo_metadata_by_exifread(self, image):
		exif = {}
		with open(self.media_path, 'rb') as f:
			exif_all_tags = exifread.process_file(f)
		# exifread returns the keys as 'MakerNotes AFAreaXPositions'

		for k in sorted(exif_all_tags.keys()):
			# if k not in ['JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote']:
			if k not in ['JPEGThumbnail', 'TIFFThumbnail'] and k[0:10] != 'Thumbnail ':
				# remove the first word in the key, so that the key has no prefix as with PIL
				k_modified = str(k)
				for prefix in ['EXIF ', 'GPS ', 'Image ', 'Interoperability ', 'MakerNote ']:
					if k[0:len(prefix)] == prefix:
						k_modified = str(k[len(prefix):])
						break
				try:
					exif[k_modified] = str(exif_all_tags[k])
					# exifread returs some value as a fraction, convert it to a float
					position = exif[k_modified].find('/')
					if position > -1:
						first = exif[k_modified][0:position]
						second = exif[k_modified][position + 1:]
						if (first.isdigit() and second.isdigit()):
							exif[k_modified] = int(first) / int(second)
				except TypeError:
					# TO DO: some value doesn't permit translation to string
					pass

				if k_modified in ('GPSLatitude', 'GPSLongitude'):
					# exifread returns this values like u'[44, 25, 26495533/1000000]'
					exif[k_modified] = Metadata.convert_array_degrees_minutes_seconds_to_degrees_decimal(exif[k_modified])
				if k_modified == 'GPSAltitude':
					# exifread returns this values like u'[44, 25, 26495533/1000000]'
					exif[k_modified] = float(exif[k_modified])

		try:
			if exif['GPSAltitudeRef'] != "0":
				exif['GPSAltitude'] = - exif['GPSAltitude']
			del exif['GPSAltitudeRef']
			if exif['GPSLongitudeRef'] == "W":
				exif['GPSLongitude'] = - exif['GPSLongitude']
			if exif['GPSLatitudeRef'] == "S":
				exif['GPSLatitude'] = - exif['GPSLatitude']
		except KeyError:
			pass

		return exif


	def _video_metadata(self, path, original=True):
		message("probing video", path, 4)
		return_code = VideoProbeWrapper().call('-show_format', '-show_streams', '-of', 'json', '-loglevel', '0', path)
		if not return_code:
			indented_message("error probing video, not a video?", path, 4)
			self.is_valid = False
			return
		indented_message("video OK!", "", 4)
		info = json.loads(return_code.decode(sys.getdefaultencoding()))
		for s in info["streams"]:
			if 'codec_type' in s:
				indented_message("debug: s[codec_type]", s['codec_type'], 5)
			if 'codec_type' in s and s['codec_type'] == 'video':
				self._attributes["metadata"]["size"] = (int(s["width"]), int(s["height"]))
				if "duration" in s:
					self._attributes["metadata"]["duration"] = int(round(float(s["duration"]) * 10) / 10)
				if "tags" in s and "rotate" in s["tags"]:
					self._attributes["metadata"]["rotate"] = s["tags"]["rotate"]
				if original:
					self._attributes["metadata"]["originalSize"] = (int(s["width"]), int(s["height"]))
				break

		# Video should also contain metadata like GPS information, at least in QuickTime and MP4 files...
		if self.album.album_ini:
			next_level()
			message("adding album.ini metadata values to video...", "", 5)
			Metadata.set_metadata_from_album_ini(self.name, self._attributes, self.album.album_ini)
			indented_message("metadata values from album.ini added to video...", "", 5)
			back_level()



	def _photo_thumbnails(self, image, photo_path, thumbs_path, json_files, json_files_min_mtime, format):
		# give image the correct orientation
		try:
			mirror = image
			if self._orientation == 2:
				# Vertical Mirror
				mirror = image.transpose(Image.FLIP_LEFT_RIGHT)
			elif self._orientation == 3:
				# Rotation 180
				mirror = image.transpose(Image.ROTATE_180)
			elif self._orientation == 4:
				# Horizontal Mirror
				mirror = image.transpose(Image.FLIP_TOP_BOTTOM)
			elif self._orientation == 5:
				# Horizontal Mirror + Rotation 270
				mirror = image.transpose(Image.FLIP_TOP_BOTTOM).transpose(Image.ROTATE_270)
			elif self._orientation == 6:
				# Rotation 270
				mirror = image.transpose(Image.ROTATE_270)
			elif self._orientation == 7:
				# Vertical Mirror + Rotation 270
				mirror = image.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.ROTATE_270)
			elif self._orientation == 8:
				# Rotation 90
				mirror = image.transpose(Image.ROTATE_90)
			image = mirror
		except IOError:
			# https://gitlab.com/paolobenve/myphotoshare/issues/46: some image may raise this exception
			message("WARNING: Photo couldn't be trasposed", photo_path, 2)

		self._photo_thumbnails_cascade(image, photo_path, thumbs_path, json_files, json_files_min_mtime, format)

		if self.mime_type in Options.config['browser_unsupported_mime_types']:
			# convert the original image to jpg because the browser won't be able to show it
			message("browser unsupported mime type", "", 4)
			next_level()
			thumbs_path_with_subdir = os.path.join(
				thumbs_path,
				self.album.subdir
			)
			try:
				os.stat(thumbs_path_with_subdir)
			except OSError:
				make_dir(thumbs_path_with_subdir, "nonexixtent cache directory")

			album_prefix = remove_folders_marker(self.album.cache_base)
			if album_prefix:
				album_prefix += Options.config['cache_folder_separator']
			converted_path_without_cache_path = os.path.join(
				self.album.subdir,
				album_prefix + photo_cache_name(self, 0, format)
			)
			converted_path = os.path.join(
				thumbs_path_with_subdir,
				album_prefix + photo_cache_name(self, 0, format)
			)

			image = image.convert('RGB')
			try:
				message("saving the original image as " + format + "...", converted_path_without_cache_path, 4)
				if format == "jpg" or format == "webp":
					if format == "jpg":
						quality = Options.config['jpeg_quality']
					elif format == "webp":
						quality = Options.config['webp_quality']
					try:
						image.save(converted_path, quality = quality, exif = self.exif_by_PIL)
					except AttributeError:
						image.save(converted_path, quality = quality)
				elif format == "png":
					try:
						image.save(converted_path, compress_level = Options.config['png_compress_level'], exif = self.exif_by_PIL)
					except AttributeError:
						image.save(converted_path, compress_level = Options.config['png_compress_level'])
				indented_message("original image saved as " + format + "!", "", 5)
			except OSError:
				indented_message("error saving the original image as " + format, "", 4)
				# this is when the image has transparecy, jpg cannot handle it -> save as png
				# note: png doesn't know exif data
				converted_path_without_cache_path = os.path.join(self.album.subdir, album_prefix + self.cache_base + Options.config['cache_folder_separator'] + "original.png")
				message("saving the original image as png...", converted_path_without_cache_path, 4)
				converted_path = os.path.join(thumbs_path_with_subdir, album_prefix + self.cache_base + Options.config['cache_folder_separator'] + "original.png")
				try:
					image.save(converted_path, compress_level = Options.config['png_compress_level'], exif = self.exif_by_PIL)
				except AttributeError:
					image.save(converted_path, compress_level = Options.config['png_compress_level'])
				indented_message("original image saved as png!", "", 4)
			self.converted_path = converted_path_without_cache_path
			back_level()


	@staticmethod
	def _thumbnail_is_smaller_than(image, thumb_size, thumb_type="", mobile_bigger=False):
		image_width = image.size[0]
		image_height = image.size[1]
		max_image_size = max(image_width, image_height)
		corrected_thumb_size = int(round(thumb_size * Options.config['mobile_thumbnail_factor'])) if mobile_bigger else thumb_size
		if (
			thumb_type == "media_fixed_height" and
			image_width > image_height
		):
			veredict = (corrected_thumb_size < image_height)
		elif thumb_type == "album_square" or thumb_type == "media_square":
			min_image_size = min(image_width, image_height)
			veredict = (corrected_thumb_size < min_image_size)
		else:
			veredict = (corrected_thumb_size < max_image_size)
		return veredict


	def generate_all_thumbnails(self, reduced_size_images, photo_path, thumbs_path, json_files, json_files_min_mtime, format):
		if Options.thumbnail_types_and_sizes_list is None:
			Options.thumbnail_types_and_sizes_list = list(thumbnail_types_and_sizes().items())

		for thumb_type, thumb_sizes in Options.thumbnail_types_and_sizes_list:
			thumbs_and_reduced_size_images = reduced_size_images[:]
			for (thumb_size, mobile_bigger) in thumb_sizes:
				index = -1
				last_index = len(thumbs_and_reduced_size_images) - 1
				for thumb_or_reduced_size_image in thumbs_and_reduced_size_images:
					index += 1
					if index == last_index or SingleMedia._thumbnail_is_smaller_than(thumb_or_reduced_size_image, thumb_size, thumb_type, mobile_bigger):
						[thumb, thumb_path] = self.reduce_size_or_make_thumbnail(thumb_or_reduced_size_image, photo_path, thumbs_path, thumb_size, json_files, json_files_min_mtime, format, thumb_type, mobile_bigger)
						thumbs_and_reduced_size_images = [thumb] + thumbs_and_reduced_size_images
						break

	def _photo_thumbnails_cascade(self, image, photo_path, thumbs_path, json_files, json_files_min_mtime, format):
		# this function calls self.reduce_size_or_make_thumbnail() with the proper image needed by self.reduce_size_or_make_thumbnail()
		# so that the thumbnail doesn't get blurred
		reduced_size_image = image
		reduced_size_images = []

		message("checking reduced sizes", "", 5)
		for thumb_size in Options.config['reduced_sizes']:
			[reduced_size_image, thumb_path] = self.reduce_size_or_make_thumbnail(reduced_size_image, photo_path, thumbs_path, thumb_size, json_files, json_files_min_mtime, format)
			self.file_sizes.setImage(thumb_size, os.path.getsize(thumb_path))
			reduced_size_images = [reduced_size_image] + reduced_size_images
		indented_message("reduced sizes checked!", "", 5)

		message("checking thumbnails", "", 5)
		if len(reduced_size_images) == 0:
			reduced_size_images = [image]
		self.generate_all_thumbnails(reduced_size_images, photo_path, thumbs_path, json_files, json_files_min_mtime, format)
		indented_message("thumbnails checked!", "", 5)


	@staticmethod
	def is_thumbnail(thumb_type):
		_is_thumbnail = (thumb_type != "")
		return _is_thumbnail

	def face_center(self, faces, image_size):
		length = len(faces)
		(x0, y0, w0, h0) = faces[0]
		if length == 1:
			# return the only face
			return (int(x0 + w0 / 2), int(y0 + h0 / 2))
		elif length == 2:
			(x1, y1, w1, h1) = faces[1]
			center0_x = int(x0 + w0 / 2)
			center0_y = int(y0 + h0 / 2)
			center1_x = int(x1 + w1 / 2)
			center1_y = int(y1 + h1 / 2)
			dist_x = max(x0, x1) + (w0 + w1) / 2 - min(x0, x1)
			dist_y = max(y0, y1) + (h0 + h1) / 2 - min(y0, y1)
			if dist_x > image_size or dist_y > image_size:
				# the faces are too far each other, choose one: return the bigger one
				if w1 > w0:
					return (center1_x, center1_y)
				else:
					return (center0_x, center0_y)
			else:
				return (int((center1_x + center0_x) / 2), int((center1_y + center0_y) / 2))
		else:
			dist_x = max([x for (x, y, w, h) in faces]) - min([x for (x, y, w, h) in faces])
			dist_y = max([y for (x, y, w, h) in faces]) - min([y for (x, y, w, h) in faces])
			if dist_x < image_size and dist_y < image_size:
				# all the faces are within the square, get the mean point
				return (int(np.mean([x + w / 2 for (x, y, w, h) in faces])), int(np.mean([y + h / 2 for (x, y, w, h) in faces])))
			else:
				# remove the farther faces and then return the agerage point of the remaining group
				distances = np.empty((length, length))
				positions = np.empty(length, dtype=object)
				max_sum_of_distances = 0
				for k1, f1 in enumerate(faces):
					(x, y, w, h) = f1
					x_pos = x + int(w / 2)
					y_pos = y + int(h / 2)
					positions[k1] = np.array([x_pos, y_pos])
					sum_of_distances = 0
					for k2, f2 in enumerate(faces):
						distances[k1, k2] = math.sqrt((f1[0] - f2[0]) ** 2 + (f1[1] - f2[1]) ** 2)
						sum_of_distances += distances[k1, k2]
					if sum_of_distances > max_sum_of_distances:
						max_sum_of_distances = sum_of_distances
						max_key = k1

				mean_distance = np.mean(distances)
				if max_sum_of_distances / length > 2 * mean_distance:
					# remove the face
					faces.pop(max_key)
					return self.face_center(faces, image_size)
				else:
					return np.mean(np.asarray(positions)).tolist()


	def reduce_size_or_make_thumbnail(self, start_image, original_path, thumbs_path, thumb_size, json_files, json_files_min_mtime, format, thumb_type="", mobile_bigger=False):

		album_prefix = remove_folders_marker(self.album.cache_base)
		if album_prefix:
			album_prefix += Options.config['cache_folder_separator']
		thumbs_path_with_subdir = os.path.join(thumbs_path, self.album.subdir)
		actual_thumb_size = thumb_size
		media_thumb_size = Options.config['media_thumb_size']
		album_thumb_size = Options.config['album_thumb_size']
		if mobile_bigger:
			actual_thumb_size = int(round(actual_thumb_size * Options.config['mobile_thumbnail_factor']))
			media_thumb_size = int(round(media_thumb_size * Options.config['mobile_thumbnail_factor']))
			album_thumb_size = int(round(album_thumb_size * Options.config['mobile_thumbnail_factor']))
		thumb_path = os.path.join(
			thumbs_path_with_subdir,
			album_prefix + photo_cache_name(self, thumb_size, format, thumb_type, mobile_bigger)
		)

		_is_thumbnail = SingleMedia.is_thumbnail(thumb_type)

		next_level()
		message("checking reduction/thumbnail...", thumb_path, 5)
		if not os.path.exists(thumbs_path_with_subdir):
			indented_message("nonexistent thumbnails subdir", thumbs_path_with_subdir, 5)
		elif not os.path.exists(thumb_path):
			indented_message("nonexistent reduction/thumbnail", thumb_path, 5)
		elif file_mtime(thumb_path) < self.datetime_file:
			indented_message("reduction/thumbnail older than original media", thumb_path, 5)
		elif json_files_min_mtime is not None and file_mtime(thumb_path) >= json_files_min_mtime:
			files = "'" + json_files[0] + "' and others"
			json_file = os.path.join(thumbs_path, self.album.json_file)
			indented_message("reduction/thumbnail newer than json files", thumb_path + ", " + files, 5)
		elif (
			format == "jpg" and Options.config['recreate_jpg'] or
			format == "webp" and Options.config['recreate_webp'] or
			format == "png" and Options.config['recreate_png']
		):
			indented_message("some option change requests this format recreation", format, 5)
		elif (
			not _is_thumbnail and Options.config['recreate_reduced_photos'] or
			_is_thumbnail and Options.config['recreate_thumbnails']
		):
			indented_message("some option change requests reduction/thumbnail recreation", "", 5)
		else:
			# the reduced image/thumbnail is there and is valid, exit immediately
			indented_message("reduction/thumbnail OK, skipping", "", 5)
			back_level()
			return [start_image, thumb_path]

		next_level()
		message("so the reduction/thumbnail is not OK, creating it!", "", 5)

		original_thumb_size = actual_thumb_size
		info_string = str(original_thumb_size) + ", " + format
		if thumb_type == "album_square" or thumb_type == "media_square":
			info_string += ", square"
		if thumb_size == Options.config['album_thumb_size'] and thumb_type == "album_fit":
			info_string += ", fit size"
		elif thumb_size == Options.config['media_thumb_size'] and thumb_type == "media_fixed_height":
			info_string += ", fixed height"
		if mobile_bigger:
			info_string += " (mobile)"

		start_image_width = start_image.size[0]
		start_image_height = start_image.size[1]
		must_crop = False
		try_shifting = False
		if thumb_type == "album_square" or thumb_type == "media_square":
			# image is to be cropped: calculate the cropping values
			# if opencv is installed, crop it, taking into account the faces
			if (
				start_image_width != start_image_height and
				(max(start_image_width, start_image_height) >= actual_thumb_size)
			):
				must_crop = True
				if Options.config['cv2_installed']:
					# if the reduced size images were generated in a previous scanner run, start_image is the original image,
					# and detecting the faces is very very very time consuming, so resize it to an appropriate value before detecting the faces
					smaller_size = int(Options.config['album_thumb_size'] * Options.config['mobile_thumbnail_factor'] * 1.5)
					start_image_copy_for_detecting = start_image.copy()
					width_for_detecting = start_image_width
					height_for_detecting = start_image_height
					if min(start_image_width, start_image_height) > smaller_size:
						longer_size = int(smaller_size * max(start_image_width, start_image_height) / min(start_image_width, start_image_height))
						width_for_detecting = smaller_size if start_image_width < start_image_height else longer_size
						height_for_detecting = longer_size if start_image_width < start_image_height else smaller_size
						sizes_change = "from " + str(start_image_width) + "x" + str(start_image_height) + " to " + str(width_for_detecting) + "x" + str(height_for_detecting)
						message("reducing size for face detection...", sizes_change, 5)
						start_image_copy_for_detecting.thumbnail((longer_size, longer_size), Image.ANTIALIAS)
						indented_message("size reduced", "", 5)

					# opencv!
					# see http://opencv-python-tutroals.readthedocs.io/en/latest/py_tutorials/py_objdetect/py_face_detection/py_face_detection.html#haar-cascade-detection-in-opencv
					try:
						opencv_image = np.array(start_image_copy_for_detecting.convert('RGB'))[:, :, ::-1].copy()
						gray_opencv_image = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
					except cv2.error:
						# this happens with gif's... weird...
						pass
					else:
						try_shifting = True

						# detect faces
						message("opencv: detecting faces...", "from " + str(width_for_detecting) + "x" + str(height_for_detecting), 4)
						# from https://docs.opencv.org/2.4/modules/objdetect/doc/cascade_classification.html:
						# detectMultiScale(image[, scaleFactor[, minNeighbors[, flags[, minSize[, maxSize]]]]])
						# - scaleFactor – Parameter specifying how much the image size is reduced at each image scale.
						# - minNeighbors – Parameter specifying how many neighbors each candidate rectangle should have to retain it.
						# - flags – Parameter with the same meaning for an old cascade as in the function cvHaarDetectObjects. It is not used for a new cascade.
						# - minSize – Minimum possible object size. Objects smaller than that are ignored.
						# - maxSize – Maximum possible object size. Objects larger than that are ignored.
						# You should read the beginning of the page in order to understand the parameters
						faces = Options.face_cascade.detectMultiScale(gray_opencv_image, Options.config['face_cascade_scale_factor'], 5)
						if len(faces) and Options.config['show_faces']:
							img = opencv_image
							for (x, y, w, h) in faces:
								cv2.rectangle(img, (x, y), (x + w, y + h), (255, 0, 0), 2)
								roi_gray = gray_opencv_image[y: y + h, x: x + w]
								roi_color = img[y: y + h, x: x + w]
								eyes = eye_cascade.detectMultiScale(roi_gray)
								for (ex, ey, ew, eh) in eyes:
									cv2.rectangle(roi_color, (ex, ey), (ex + ew, ey + eh), (0, 255, 0), 2)
							cv2.imshow('img', img)
							cv2.waitKey(0)
							cv2.destroyAllWindows()

						# get the position of the center of the faces
						if len(faces):
							next_level()
							message("faces detected", str(len(faces)) + " faces", 4)
							(x_center, y_center) = self.face_center(faces.tolist(), actual_thumb_size)
							indented_message("opencv", "center: " + str(x_center) + ", " + str(y_center), 4)
							back_level()
						else:
							try_shifting = False
							indented_message("no faces detected", "", 4)

				if min(start_image_width, start_image_height) >= actual_thumb_size:
					# image is bigger than the square which will result from cropping
					if start_image_width > start_image_height:
						# wide image
						top = 0
						bottom = start_image_height
						left = int((start_image_width - start_image_height) / 2)
						right = start_image_width - left
						if Options.config['cv2_installed'] and try_shifting:
							# maybe the position of the square could be modified so that it includes more faces
							# center on the faces
							shift = int(x_center - start_image_width / 2)
							message("cropping for square", "shifting horizontally by " + str(shift) + " px", 4)
							left += shift
							if left < 0:
								left = 0
								right = start_image_height
							else:
								right += shift
								if right > start_image_width:
									right = start_image_width
									left = start_image_width - start_image_height
					else:
						# tall image
						left = 0
						right = start_image_width
						top = int((start_image_height - start_image_width) / 2)
						bottom = start_image_height - top
						if Options.config['cv2_installed'] and try_shifting:
							# maybe the position of the square could be modified so that it includes more faces
							# center on the faces
							shift = int(y_center - start_image_height / 2)
							message("cropping for square", "shifting vertically by " + str(shift) + " px", 4)
							top += shift
							if top < 0:
								top = 0
								bottom = start_image_width
							else:
								bottom += shift
								if bottom > start_image_height:
									bottom = start_image_height
									top = start_image_height - start_image_width
					thumbnail_width = actual_thumb_size
				elif max(start_image_width, start_image_height) >= actual_thumb_size:
					# image smallest size is smaller than the square which would result from cropping
					# cropped image will not be square
					if start_image_width > start_image_height:
						# wide image
						top = 0
						bottom = start_image_height
						left = int((start_image_width - actual_thumb_size) / 2)
						right = left + actual_thumb_size
						if Options.config['cv2_installed'] and try_shifting:
							# maybe the position of the crop could be modified so that it includes more faces
							# center on the faces
							shift = int(x_center - start_image_width / 2)
							message("cropping wide image", "shifting horizontally by " + str(shift) + " px", 4)
							left += shift
							if left < 0:
								left = 0
								right = actual_thumb_size
							else:
								right += shift
								if right > start_image_width:
									right = start_image_width
									left = right - actual_thumb_size
						thumbnail_width = actual_thumb_size
					else:
						# tall image
						left = 0
						right = start_image_width
						top = int((start_image_height - actual_thumb_size) / 2)
						bottom = top + actual_thumb_size
						if Options.config['cv2_installed'] and try_shifting:
							# maybe the position of the crop could be modified so that it includes more faces
							# center on the faces
							shift = int(y_center - start_image_height / 2)
							message("cropping tall image", "shifting vertically by " + str(shift) + " px", 4)
							top += shift
							if top < 0:
								top = 0
								bottom = actual_thumb_size
							else:
								bottom += shift
								if bottom > start_image_height:
									bottom = start_image_height
									top = bottom - actual_thumb_size
						thumbnail_width = start_image_width
			else:
				# image is square, or is smaller than the square thumbnail, don't crop it
				thumbnail_width = start_image_width
		else:
			if (
				original_thumb_size == media_thumb_size and
				thumb_type == "media_fixed_height" and
				start_image_width > start_image_height
			):
				# the thumbnail size will not be thumb_size, the image will be greater
				thumbnail_width = int(round(original_thumb_size * start_image_width / float(start_image_height)))
				actual_thumb_size = thumbnail_width
			elif start_image_width > start_image_height:
				thumbnail_width = actual_thumb_size
			else:
				thumbnail_width = int(round(actual_thumb_size * start_image_width / float(start_image_height)))

		# now thumbnail_width and thumbnail_height are the values the thumbnail will get,
		# and if the thumbnail isn't a square one, their ratio is the same of the original image

		try:
			message("making copy...", "", 5)
			start_image_copy = start_image.copy()
			indented_message("copy made", info_string, 4)
		except KeyboardInterrupt:
			raise
		except:
			# we try again to work around PIL bug
			message("making copy (2nd try)...", info_string, 5)
			start_image_copy = start_image.copy()
			indented_message("copy made (2nd try)", info_string, 5)

		# both width and height of thumbnail are less then width and height of start_image, no blurring will happen
		# we can resize, but first crop to square if needed
		if must_crop:
			message("cropping...", info_string, 4)
			start_image_copy = start_image_copy.crop((left, top, right, bottom))
			indented_message("cropped (" + str(original_thumb_size) + ")", "", 5)

		if max(start_image_copy.size[0], start_image_copy.size[1]) <= actual_thumb_size:
			# no resize
			# resizing to thumbnail size an image smaller than the thumbnail we must produce would return a blurred image
			if not mobile_bigger and original_thumb_size > Options.config['album_thumb_size'] or mobile_bigger and original_thumb_size > int(Options.config['album_thumb_size'] * Options.config['mobile_thumbnail_factor']):
				message("small image, no reduction", info_string, 4)
			elif not mobile_bigger and original_thumb_size == Options.config['album_thumb_size'] or mobile_bigger and original_thumb_size == int(Options.config['album_thumb_size'] * Options.config['mobile_thumbnail_factor']):
				message("small image, no thumbing for album", info_string, 4)
			else:
				message("small image, no thumbing for media", info_string, 4)
		else:
			# resizing
			if original_thumb_size > Options.config['album_thumb_size']:
				message("reducing size...", info_string, 5)
			elif original_thumb_size == Options.config['album_thumb_size']:
				message("thumbing for subalbums...", "", 5)
			else:
				message("thumbing for media...", "", 5)
			start_image_copy.thumbnail((actual_thumb_size, actual_thumb_size), Image.ANTIALIAS)
			next_level()
			if not mobile_bigger and original_thumb_size > Options.config['album_thumb_size'] or mobile_bigger and original_thumb_size > int(Options.config['album_thumb_size'] * Options.config['mobile_thumbnail_factor']):
				message("size reduced (" + str(original_thumb_size) + ")", "", 4)
			elif not mobile_bigger and original_thumb_size == Options.config['album_thumb_size'] or mobile_bigger and original_thumb_size == int(Options.config['album_thumb_size'] * Options.config['mobile_thumbnail_factor']):
				message("thumbed for subalbums (" + str(original_thumb_size) + ")", "", 4)
			else:
				message("thumbed for media (" + str(original_thumb_size) + ")", "", 4)
			back_level()

		# if the crop results smaller than the required size, extend it with a background
		start_image_copy_filled = start_image_copy
		if (thumb_type == "album_square" or thumb_type == "media_square") and min(start_image_copy.size[0], start_image_copy.size[1]) < actual_thumb_size:
			# it's smaller than the square we need: fill it
			message("small crop: filling...", "background color: " + Options.config['small_square_crops_background_color'], 5)
			new_image = Image.new('RGBA', (actual_thumb_size, actual_thumb_size), Options.config['small_square_crops_background_color'])
			new_image.paste(start_image_copy, (int((actual_thumb_size - start_image_copy.size[0]) / 2), int((actual_thumb_size - start_image_copy.size[1]) / 2)))
			start_image_copy_filled = new_image
			indented_message("filled", "", 5)

		# the subdir hadn't been created when creating the album in order to avoid creation of empty directories
		make_dir(thumbs_path_with_subdir, "nonexistent cache subdir")

		if os.path.exists(thumb_path) and not os.access(thumb_path, os.W_OK):
			message("FATAL ERROR", thumb_path + " not writable, quitting")
			sys.exit(-97)

		if self.is_video:
			message("adding video transparency...", "", 5)
			start_image_copy_for_saving = start_image_copy_filled.copy()
			transparency_file = os.path.join(os.path.dirname(__file__), "../web/img/play_button_100_62.png")
			video_transparency = Image.open(transparency_file)
			x = int((start_image_copy_filled.size[0] - video_transparency.size[0]) / 2)
			y = int((start_image_copy_filled.size[1] - video_transparency.size[1]) / 2)
			start_image_copy_for_saving.paste(video_transparency, (x, y), video_transparency)
			indented_message("video transparency added", "", 4)
		else:
			start_image_copy_for_saving = start_image_copy_filled
		start_image_copy_for_saving = start_image_copy_for_saving.convert('RGB')

		message("saving...", "", 5)
		try:
			if format == "jpg" or format == "webp":
				if format == "jpg":
					quality = Options.config['jpeg_quality']
				else:
					quality = Options.config['webp_quality']
				try:
					start_image_copy_for_saving.save(thumb_path, quality = quality, exif = self.exif_by_PIL)
				except AttributeError:
					start_image_copy_for_saving.save(thumb_path, quality = quality)
			elif format == "png":
				try:
					start_image_copy_for_saving.save(thumb_path, compress_level = Options.config['png_compress_level'], exif = self.exif_by_PIL)
				except AttributeError:
					start_image_copy_for_saving.save(thumb_path, compress_level = Options.config['png_compress_level'])

			next_level()
			if original_thumb_size > Options.config['album_thumb_size']:
				msg = "reduced size image saved"
			elif original_thumb_size == Options.config['album_thumb_size']:
				msg = "album thumbnail saved"
			else:
				msg = "media thumbnail saved"
			if hasattr(start_image, 'exif_by_PIL'):
				msg += " with exif data"
			message(msg, "", 4)
			back_level()
			back_level()
			back_level()
			return [start_image_copy, thumb_path]
		except KeyboardInterrupt:
			try:
				os.unlink(thumb_path)
			except OSError:
				pass
			raise
		except IOError:
			message("saving (2nd try)...", "", 5)
			try:
				if format == "jpg" or format == "webp":
					if format == "jpg":
						quality = Options.config['jpeg_quality']
					else:
						quality = Options.config['webp_quality']
					try:
						start_image_copy_for_saving.save(thumb_path, quality = quality, exif = self.exif_by_PIL)
					except AttributeError:
						start_image_copy_for_saving.save(thumb_path, quality = quality)
				elif format == "png":
					try:
						start_image_copy_for_saving.save(thumb_path, compress_level = Options.config['png_compress_level'], exif = self.exif_by_PIL)
					except AttributeError:
						start_image_copy_for_saving.save(thumb_path, compress_level = Options.config['png_compress_level'])
				next_level()
				if original_thumb_size > Options.config['album_thumb_size']:
					msg = "saved reduced (2nd try, " + str(original_thumb_size) + ")"
				elif original_thumb_size == Options.config['album_thumb_size']:
					msg = "saved for subalbums (2nd try, " + str(original_thumb_size) + ")"
				else:
					msg = "saved for media (2nd try, " + str(original_thumb_size) + ")"
				if hasattr(start_image, 'exif_by_PIL'):
					msg += " with exif data"
				message(msg, info_string, 4)
				back_level()
			except KeyboardInterrupt:
				try:
					os.unlink(thumb_path)
				except OSError:
					pass
			back_level()
			back_level()
			return [start_image_copy, thumb_path]
		except Exception as e:
			indented_message("thumbnail save failure with error: " + str(e), str(original_thumb_size) + " -> " + os.path.basename(thumb_path), 2)
			try:
				os.unlink(thumb_path)
			except OSError:
				pass
			back_level()
			back_level()
			return [start_image, thumb_path]


	def _video_thumbnails(self, thumbs_path, original_path, json_files, json_files_min_mtime, format):
		(_, tfn) = tempfile.mkstemp()
		message("generating thumbnail from video", original_path, 4)
		return_code = VideoTranscodeWrapper().call(
			'-i', original_path,    # original file to extract thumbs from
			'-f', 'image2',         # extract image
			'-vsync', '1',          # CRF
			'-vframes', '1',        # extrat 1 single frame
			'-an',                  # disable audio
			'-loglevel', 'quiet',   # don't display anything
			'-y',                   # don't prompt for overwrite
			tfn                     # temporary file to store extracted image
		)
		if not return_code:
			indented_message("couldn't extract video frame", os.path.basename(original_path), 1)
			try:
				os.unlink(tfn)
			except OSError:
				pass
			self.is_valid = False
			return
		indented_message("thumbnail from video generated!", "", 4)
		try:
			image = Image.open(tfn)
		except KeyboardInterrupt:
			try:
				os.unlink(tfn)
			except OSError:
				pass
			raise
		except:
			indented_message("error opening video thumbnail", tfn + " from " + original_path, 5)
			self.is_valid = False
			try:
				os.unlink(tfn)
			except OSError:
				pass
			return
		mirror = image
		if "rotate" in self._attributes:
			if self._attributes["metadata"]["rotate"] == "90":
				mirror = image.transpose(Image.ROTATE_270)
			elif self._attributes["metadata"]["rotate"] == "180":
				mirror = image.transpose(Image.ROTATE_180)
			elif self._attributes["metadata"]["rotate"] == "270":
				mirror = image.transpose(Image.ROTATE_90)

		size = Options.config['reduced_size_for_videos']
		width, height = mirror.size
		if max(width, height) < size:
			size = max(width, height)
		# generate the reduce size image used for sharing on social media
		message("checking reduced size image", "", 5)
		[reduced_size_image, thumb_path] = self.reduce_size_or_make_thumbnail(
			mirror, original_path, thumbs_path, size, json_files, json_files_min_mtime, format
		)
		self.image_size = size
		indented_message("reduced size image checked!", "", 5)

		# generate the thumbnails
		self.generate_all_thumbnails([mirror], original_path, thumbs_path, json_files, json_files_min_mtime, format)

		try:
			os.unlink(tfn)
		except OSError:
			pass


	def _video_transcode(self, transcode_path, original_path, json_files, json_files_min_mtime):
		album_cache_path = os.path.join(transcode_path, self.album.subdir)
		if os.path.exists(album_cache_path):
			if not os.access(album_cache_path, os.W_OK):
				message("FATAL ERROR", album_cache_path + " not writable, quitting")
				sys.exit(-97)
		else:
			make_dir(album_cache_path, "nonexistent albums cache subdir")

		info_string = "mp4, h264, " + Options.config['video_transcode_bitrate'] + " bit/sec, crf=" + str(Options.config['video_crf'])

		album_prefix = remove_folders_marker(self.album.cache_base)
		if album_prefix:
			album_prefix += Options.config['cache_folder_separator']
		transcode_path = os.path.join(
			album_cache_path,
			album_prefix + video_cache_name(self)
		)
		if os.path.exists(transcode_path) and file_mtime(transcode_path) >= self.datetime_file and not Options.config['recreate_transcoded_videos']:
			indented_message("existing transcoded video", info_string, 4)
			self._video_metadata(transcode_path, False)
			return transcode_path

		indented_message("re-transcoding video", info_string, 3)
		transcode_cmd = [
			'-i', original_path,                                  # original file to be encoded
			'-c:v', 'libx264',                                    # set h264 as videocodec
			'-preset', str(Options.config['video_preset']),       # set specific preset that provides a certain encoding speed to compression ratio
			'-profile:v', str(Options.config['video_profile']),   # set output to specific h264 profile
			'-level', str(Options.config['video_profile_level']), # sets highest compatibility with target devices
			'-crf', str(Options.config['video_crf']),             # set quality
			'-b:v', Options.config['video_transcode_bitrate'],    # set videobitrate
			'-strict', 'experimental',                            # allow native aac codec below
			'-c:a', 'aac',                                        # set aac as audiocodec
			'-ac', str(Options.config['video_audio_ac']),         # force two audiochannels
			'-ab', str(Options.config['video_audio_ab']),         # set audiobitrate to 160Kbps
			'-maxrate', str(Options.config['video_maxrate']),     # limits max rate, will degrade CRF if needed
			'-bufsize', str(Options.config['video_bufsize']),     # define how much the client should buffer
			'-f', 'mp4',                                          # fileformat mp4
			'-threads', str(Options.config['num_processors']),    # number of cores to use
			'-loglevel', 'quiet',                                 # don't display anything
			'-y'                                                  # don't prompt for overwrite
		]
		filters = []

		if not os.path.exists(transcode_path):
			indented_message("nonexistent transcoded video", transcode_path, 5)
		elif file_mtime(transcode_path) < self.datetime_file:
			indented_message("transcoded video older than original video", transcode_path, 5)
		elif json_files_min_mtime is not None and file_mtime(transcode_path) >= json_files_min_mtime:
			files = "'" + json_files[0] + "' and others"
			# json_file = os.path.join(thumbs_path, self.album.json_file)
			indented_message("transcoded video newer than json files", transcode_path + ", " + files, 5)
		elif file_mtime(transcode_path) < self.datetime_file:
			indented_message("transcoded video older than original video", transcode_path, 5)
		elif Options.config['recreate_transcoded_videos']:
			indented_message("some option change requests transcoded video recreation", "", 5)

		# Limit frame size. Default is HD 720p
		frame_maxsize = Options.config['video_frame_maxsize']
		if frame_maxsize == 'hd480':
			dim_max_size = 480
		elif frame_maxsize == 'hd1080':
			dim_max_size = 1080
		else:
			dim_max_size = 720
			frame_maxsize = 'hd720'
		if "originalSize" in self._attributes["metadata"] and self._attributes["metadata"]["originalSize"][1] > dim_max_size:
			transcode_cmd.append('-s')
			transcode_cmd.append(frame_maxsize)

		# # Rotate picture if necessary
		# if "rotate" in self._attributes["metadata"]:
		# 	if self._attributes["metadata"]["rotate"] == "90":
		# 		filters.append('transpose=1')
		# 	elif self._attributes["metadata"]["rotate"] == "180":
		# 		filters.append('vflip,hflip')
		# 	elif self._attributes["metadata"]["rotate"] == "270":
		# 		filters.append('transpose=2')

		if len(filters):
			transcode_cmd.append('-vf')
			transcode_cmd.append(','.join(filters))

		# Add user-defined options
		if len(str(Options.config['video_add_options'])):
			transcode_cmd.append(str(Options.config['video_add_options']))

		next_level()
		message("transcoding...", info_string, 5)
		tmp_transcode_cmd = transcode_cmd[:]
		transcode_cmd.append(transcode_path)
		# avoid ffmpeg/avconv stopping if the scanner is running interactively
		#transcode_cmd.append('< /dev/null')
		# The previous line makes the first transcoding attempt fail. I don't understand what
		# it is supposed to do and why avconv/ffmpeg would be interactive with -y option...
		next_level()
		next_level()
		message("transcoding command", transcode_cmd, 4)
		try:
			return_code = VideoTranscodeWrapper().call(*transcode_cmd)
			if return_code != False:
				indented_message("transcoded!", "", 4)
		except KeyboardInterrupt:
			raise
		back_level()
		back_level()

		if not return_code:
			# add another option, try transcoding again
			# done to avoid this error;
			# x264 [error]: baseline profile doesn't support 4:2:2
			next_level()
			message("transcoding failure, trying yuv420p...", "", 3)
			tmp_transcode_cmd.append('-pix_fmt')
			tmp_transcode_cmd.append('yuv420p')
			tmp_transcode_cmd.append(transcode_path)
			message("transcoding command", tmp_transcode_cmd, 4)
			try:
				return_code = VideoTranscodeWrapper().call(*tmp_transcode_cmd)
				if return_code != False:
					indented_message("transcoded with yuv420p", "", 2)
			except KeyboardInterrupt:
				raise

			if not return_code:
				indented_message("transcoding failure", os.path.basename(original_path), 1)
				self.is_valid = False
				try:
					os.unlink(transcode_path)
				except OSError:
					pass
			back_level()

		if self.is_valid:
			self._video_metadata(transcode_path, False)
		back_level()
		return transcode_path


	@property
	def name(self):
		return os.path.basename(self.media_file_name)

	@property
	def checksum(self):
		return self._attributes["checksum"]

	@property
	def title(self):
		if 'metadata' in self._attributes and 'title' in self._attributes["metadata"]:
			return self._attributes["metadata"]["title"]
		else:
			return ''

	@property
	def description(self):
		if 'metadata' in self._attributes and 'description' in self._attributes["metadata"]:
			return self._attributes["metadata"]["description"]
		else:
			return ''

	@property
	def tags(self):
		if 'metadata' in self._attributes and 'tags' in self._attributes["metadata"]:
			return self._attributes["metadata"]["tags"]
		else:
			return ''

	@property
	def size(self):
		return self._attributes["metadata"]["size"]

	@property
	def is_image(self):
		return self.mime_type.find("image/") == 0

	@property
	def is_video(self):
		return self.mime_type.find("video/") == 0

	def __str__(self):
		return self.name

	@property
	def path(self):
		return self.media_file_name

	@property
	def image_caches(self):
		if Options.thumbnail_types_and_sizes_list is None:
			Options.thumbnail_types_and_sizes_list = list(thumbnail_types_and_sizes().items())

		caches = []
		album_prefix = remove_folders_marker(self.album.cache_base)
		if album_prefix:
			album_prefix += Options.config['cache_folder_separator']

		if self.is_video:
			# transcoded video path
			caches.append(
				os.path.join(
					self.album.subdir,
					album_prefix + video_cache_name(self)
				)
			)
			# image for sharing on social media
			for format in Options.config['cache_images_formats']:
				caches.append(
					os.path.join(
						self.album.subdir,
						album_prefix + photo_cache_name(self, self.image_size, format)
					)
				)
		else:
			for format in Options.config['cache_images_formats']:
				# converted image for unsupported browser image types
				if self.mime_type in Options.config['browser_unsupported_mime_types']:
					caches.append(
						os.path.join(
							self.album.subdir,
							album_prefix + photo_cache_name(self, 0, format)
						)
					)
				# reduced sizes paths
				for thumb_size in Options.config['reduced_sizes']:
					caches.append(
						os.path.join(
							self.album.subdir,
							album_prefix + photo_cache_name(self, thumb_size, format)
						)
					)

		# album and media thumbnail path
		for format in Options.config['cache_images_formats']:
			for thumb_type, thumb_sizes in Options.thumbnail_types_and_sizes_list:
				for (thumb_size, mobile_bigger) in thumb_sizes:
					caches.append(
						os.path.join(
							self.album.subdir,
							album_prefix + photo_cache_name(self, thumb_size, format, thumb_type, mobile_bigger)
						)
					)
		# if hasattr(self, "converted_path"):
		# 	caches.append(self.converted_path)
		return caches

	@property
	def date(self):
		correct_date = None
		if not self.is_valid:
			correct_date = datetime(1, 1, 1)
		elif "dateTimeOriginal" in self._attributes["metadata"]:
			correct_date = self._attributes["metadata"]["dateTimeOriginal"]
		elif "dateTime" in self._attributes["metadata"]:
			correct_date = self._attributes["metadata"]["dateTime"]
		else:
			correct_date = self._attributes["dateTimeFile"]
		return correct_date

	@property
	def date_string(self):
		date_str = str(self.date)
		while len(date_str) < 19:
			date_str = "0" + date_str
		return date_str

	@property
	def has_gps_data(self):
		return "latitude" in self._attributes["metadata"] and "longitude" in self._attributes["metadata"]

	@property
	def has_exif_date(self):
		return "dateTimeOriginal" in self._attributes["metadata"] or "dateTime" in self._attributes["metadata"]

	@property
	def latitude(self):
		return self._attributes["metadata"]["latitude"]

	@property
	def longitude(self):
		return self._attributes["metadata"]["longitude"]

	@property
	def year(self):
		year_str = str(self.date.year)
		while len(year_str) < 4:
			year_str = "0" + year_str
		return year_str


	@property
	def month(self):
		return str(self.date.month).zfill(2)

	@property
	def day(self):
		return str(self.date.day).zfill(2)

	@property
	def country_name(self):
		return self._attributes["geoname"]["country_name"]

	@property
	def country_code(self):
		return self._attributes["geoname"]["country_code"]

	@property
	def region_name(self):
		return self._attributes["geoname"]["region_name"]

	@property
	def region_code(self):
		return self._attributes["geoname"]["region_code"]

	@property
	def place_name(self):
		return self._attributes["geoname"]["place_name"]

	@place_name.setter
	def place_name(self, value):
		self._attributes["geoname"]["place_name"] = value

	@property
	def place_code(self):
		return self._attributes["geoname"]["place_code"]

	@property
	def alt_place_name(self):
		return self._attributes["geoname"]["alt_place_name"]

	@alt_place_name.setter
	def alt_place_name(self, value):
		self._attributes["geoname"]["alt_place_name"] = value

	@property
	def year_album_path(self):
		return Options.config['by_date_string'] + "/" + self.year

	@property
	def month_album_path(self):
		return self.year_album_path + "/" + self.month

	@property
	def day_album_path(self):
		return self.month_album_path + "/" + self.day

	@property
	def country_album_path(self):
		return Options.config['by_gps_string'] + "/" + self.country_code

	@property
	def region_album_path(self):
		return self.country_album_path + "/" + self.region_code

	@property
	def place_album_path(self):
		return self.region_album_path + "/" + self.place_code

	@property
	def gps_album_path(self):
		if hasattr(self, "gps_path"):
			return self.gps_path
		else:
			return ""

	def __eq__(self, other):
		return self.album_path == other.album_path

	# def __ne__(self, other):
	# 	return not self.__eq__(other)

	def __lt__(self, other):
		try:
			if Options.config['default_media_name_sort'] or self.date == other.date:
				if Options.config['default_media_reverse_sort']:
					return self.name > other.name
				else:
					return self.name < other.name
			else:
				if Options.config['default_media_reverse_sort']:
					return self.date > other.date
				else:
					return self.date < other.date
		except TypeError:
			return False

	# def __le__(self, other):
	# 	try:
	# 		return self.date <= other.date
	# 	except TypeError:
	# 		return False
	#
	# def __gt__(self, other):
	# 	try:
	# 		if self.date == other.date:
	# 			return self.name > other.name
	# 		else:
	# 			return self.date > other.date
	# 	except TypeError:
	# 		return False
	#
	# def __ge__(self, other):
	# 	try:
	# 		return self.date <= other.date
	# 	except TypeError:
	# 		return False

	@property
	def attributes(self):
		return self._attributes


	@staticmethod
	def from_dict(album, dictionary, basepath, json_files, json_files_min_mtime):
		try:
			del dictionary["date"]
		except TypeError:
			# a json file for some test version could bring here
			single_media = SingleMedia(album, basepath, json_files, json_files_min_mtime, None, dictionary)
			single_media.is_valid = False
			return

		media_path = os.path.join(basepath, dictionary["name"])

		del dictionary["name"]
		for key, value in list(dictionary.items()):
			if key.startswith("dateTime"):
				try:
					dictionary[key] = datetime.strptime(value, Options.date_time_format)
				except KeyboardInterrupt:
					raise
				except ValueError:
					pass
			if key == "metadata":
				for key1, value1 in list(value.items()):
					if key1.startswith("dateTime"):
						while True:
							try:
								dictionary[key][key1] = datetime.strptime(value1, Options.date_time_format)
								break
							except KeyboardInterrupt:
								raise
							except ValueError:
								# year < 1000 incorrectly inserted in json file ("31" instead of "0031")
								value1 = "0" + value1

		indented_message("processing single media from cached album", media_path, 5)
		return SingleMedia(album, media_path, json_files, json_files_min_mtime, None, dictionary)


	def to_dict(self):
		folders_album = Options.config['folders_string']
		if self.folders:
			folders_album = os.path.join(folders_album, self.folders)

		single_media = self.attributes
		try:
			del single_media["password_identifiers_set"]
		except:
			pass
		try:
			del single_media["album_identifiers_set"]
		except:
			pass

		single_media["name"] = self.name
		single_media["cacheBase"] = self.cache_base
		single_media["date"] = self.date_string
		single_media["fileSizes"] = self.file_sizes
		# single_media["yearAlbum"] = self.year_album_path
		# single_media["monthAlbum"] = self.month_album_path
		single_media["dayAlbum"] = self.day_album_path
		single_media["dayAlbumCacheBase"] = self.day_album_cache_base
		if self.gps_album_path:
			single_media["gpsAlbum"] = self.gps_album_path
			single_media["gpsAlbumCacheBase"] = self.gps_album_cache_base
		if hasattr(self, "words"):
			single_media["words"] = self.words
		if Options.config['checksum']:
			single_media["checksum"] = self.checksum

		# the following data don't belong properly to the single media, but to album, but they must be put here in order to work with date, gps and search structure
		single_media["albumName"] = self.album_path[:len(self.album_path) - len(self.name) - 1]
		single_media["foldersCacheBase"] = self.album.cache_base
		single_media["cacheSubdir"] = self.album.subdir
		single_media["mimeType"] = self.mime_type

		if hasattr(self, "converted_path"):
			single_media["convertedPath"] = self.converted_path

		if self.is_video:
			single_media["imageSize"] = self.image_size

		return single_media


class PhotoAlbumEncoder(json.JSONEncoder):
	# the _init_ function is in order to pass an argument in json.dumps
	def __init__(self, sep_pos = False, sep_media = False, type = None, **kwargs):
		super(PhotoAlbumEncoder, self).__init__(**kwargs)
		self.type = type
		self.separate_positions = sep_pos
		self.separate_media = sep_media

	def default(self, obj):
		if isinstance(obj, datetime):
			# there was the line:
			# return obj.strftime("%Y-%m-%d %H:%M:%S")
			# but strftime throws an exception in python2 if year < 1900
			date = str(obj.year) + '-' + str(obj.month).zfill(2) + '-' + str(obj.day).zfill(2)
			date = date + ' ' + str(obj.hour).zfill(2) + ':' + str(obj.minute).zfill(2) + ':' + str(obj.second).zfill(2)
			return date
		if isinstance(obj, Album):
			return obj.to_dict(self.separate_positions, self.separate_media)
		if isinstance(obj, SingleMedia):
			return obj.to_dict()
		if isinstance(obj, Positions):
			return obj.to_dict(self.type)
		if isinstance(obj, Sizes):
			return obj.to_dict()
		if isinstance(obj, ImageAndVideo):
			return obj.to_dict()
		if isinstance(obj, NumsProtected):
			return obj.to_dict()
		if isinstance(obj, set):
			return list(obj)
		if isinstance(obj, (IFDRational, Fraction)):
			try:
				return float(obj)
			except ZeroDivisionError:
				return float(0)
		return json.JSONEncoder.default(self, obj)


class Metadata(object):
	@staticmethod
	def set_metadata_from_album_ini(name, attributes, album_ini):
		"""
		Set the 'attributes' dictionnary for album or media named 'name'
		with the metadata values from the ConfigParser 'album_ini'.

		The metadata than can be overloaded by values in 'album.ini' file are:
			* title: the caption of the album or media
			* description: a long description whose words can be searched.
			* date: a YYYY-MM-DD date replacing the one from EXIF
			* latitude: for when the media is not geotagged
			* longitude: for when the media is not geotagged
			* altitude: for when the media is not geotagged
			* tags: a ','-separated list of terms
		"""

		# Initialize with album.ini defaults

		# With Python2, section names are string. As we retrieve file names as unicode,
		# we can't find them in the ConfigParser dictionary

		# Title
		if album_ini.has_section(name):
			try:
				attributes["metadata"]["title"] = album_ini.get(name, "title")
			except NoOptionError:
				pass
		elif "title" in album_ini.defaults():
			attributes["metadata"]["title"] = album_ini.get('DEFAULT', "title")

		# Description
		if album_ini.has_section(name):
			try:
				attributes["metadata"]["description"] = album_ini.get(name, "description")
			except NoOptionError:
				pass
		elif "description" in album_ini.defaults():
			attributes["metadata"]["description"] = album_ini.get('DEFAULT', "description")

		# Date
		if album_ini.has_section(name):
			try:
				attributes["metadata"]["dateTime"] = datetime.strptime(album_ini.get(name, "date"), "%Y-%m-%d")
			except ValueError:
				message("ERROR", "Incorrect date in [" + name + "] in '" + Options.config['metadata_filename'] + "'", 1)
			except NoOptionError:
				pass
		elif "date" in album_ini.defaults():
			try:
				attributes["metadata"]["dateTime"] = datetime.strptime(album_ini.get('DEFAULT', "date"), "%Y-%m-%d")
			except ValueError:
				message("ERROR", "Incorrect date in [DEFAULT] in '" + Options.config['metadata_filename'] + "'", 1)

		# Latitude and longitude
		gps_latitude = None
		gps_latitude_ref = None
		gps_longitude = None
		gps_longitude_ref = None
		gps_altitude = None
		gps_altitude_ref = None
		if album_ini.has_section(name):
			try:
				gps_latitude = album_ini.getfloat(name, "latitude")
				gps_latitude_ref = "N" if gps_latitude > 0.0 else "S"
			except ValueError:
				message("ERROR", "Incorrect latitude in [" + name + "] in '" + Options.config['metadata_filename'] + "'", 1)
			except NoOptionError:
				pass
		elif "latitude" in album_ini.defaults():
			try:
				gps_latitude = album_ini.getfloat('DEFAULT', "latitude")
				gps_latitude_ref = "N" if gps_latitude > 0.0 else "S"
			except ValueError:
				message("ERROR", "Incorrect latitude in [" + name + "] in '" + Options.config['metadata_filename'] + "'", 1)
		if album_ini.has_section(name):
			try:
				gps_longitude = album_ini.getfloat(name, "longitude")
				gps_longitude_ref = "E" if gps_longitude > 0.0 else "W"
			except ValueError:
				message("ERROR", "Incorrect longitude in [" + name + "] in '" + Options.config['metadata_filename'] + "'", 1)
			except NoOptionError:
				pass
		elif "longitude" in album_ini.defaults():
			try:
				gps_longitude = album_ini.getfloat('DEFAULT', "longitude")
				gps_longitude_ref = "E" if gps_longitude > 0.0 else "W"
			except ValueError:
				message("ERROR", "Incorrect longitude in [" + name + "] in '" + Options.config['metadata_filename'] + "'", 1)
		if album_ini.has_section(name):
			try:
				gps_altitude = album_ini.getfloat(name, "altitude")
				# gps_altitude_ref = "0" if gps_altitude > 0.0 else "1"
			except ValueError:
				message("ERROR", "Incorrect altitude in [" + name + "] in '" + Options.config['metadata_filename'] + "'", 1)
			except NoOptionError:
				pass
		elif "altitude" in album_ini.defaults():
			try:
				gps_altitude = album_ini.getfloat('DEFAULT', "altitude")
				gps_altitude_ref = "0" if gps_altitude > 0.0 else "1"
			except ValueError:
				message("ERROR", "Incorrect altitude in [" + name + "] in '" + Options.config['metadata_filename'] + "'", 1)

		if gps_latitude is not None and gps_latitude_ref is not None and gps_longitude is not None and gps_longitude_ref is not None:
			attributes["metadata"]["latitude"] = gps_latitude
			attributes["metadata"]["latitudeMS"] = Metadata.convert_decimal_to_degrees_minutes_seconds(gps_latitude, gps_latitude_ref)
			attributes["metadata"]["longitude"] = gps_longitude
			attributes["metadata"]["longitudeMS"] = Metadata.convert_decimal_to_degrees_minutes_seconds(gps_longitude, gps_longitude_ref)
		if gps_altitude is not None:
			attributes["metadata"]["altitude"] = gps_altitude
			# attributes["metadata"]["altitude"] = abs(gps_altitude)
			# attributes["metadata"]["altitudeRef"] = gps_altitude_ref

		# Tags
		if album_ini.has_section(name):
			try:
				attributes["metadata"]["tags"] = [tag for tag in set([x.strip() for x in album_ini.get(name, "tags").split(",")]) if tag]
			except NoOptionError:
				pass
		elif "tags" in album_ini.defaults():
			attributes["metadata"]["tags"] = [tag for tag in set([x.strip() for x in album_ini.get('DEFAULT', "tags").split(",")]) if tag]


	@staticmethod
	def set_geoname_from_album_ini(name, attributes, album_ini):
		"""
		Set the 'attributes' dictionnary for album or media named 'name'
		with the geoname values from the ConfigParser 'album_ini'.

		The geoname values that can be set from album.ini are:
			* country_name: The name of the country
			* region_name: The name of the region
			* place_name: The name of the nearest place (town or city) calculated
			from latitude/longitude getotag.
		The geonames values that are not visible to the user, like 'country_code'
		can't be changed. We only overwrite the visible values displayed to the user.

		The geonames values must be overwrittent *after* the 'metadata' values
		because the geonames are retrieved from _attributes['metadata']['latitude'] and
		_attributes['metadata']['longitude']. You can use SingleMedia.has_gps_data to
		determine if you can call this procedure.
		"""
		# Country_name
		if album_ini.has_section(name):
			try:
				attributes["geoname"]["country_name"] = album_ini.get(name, "country_name")
			except NoOptionError:
				pass
		elif "country_name" in album_ini.defaults():
			attributes["geoname"]["country_name"] = album_ini.get('DEFAULT', "country_name")

		# Region_name
		if album_ini.has_section(name):
			try:
				attributes["geoname"]["region_name"] = album_ini.get(name, "region_name")
			except NoOptionError:
				pass
		elif "region_name" in album_ini.defaults():
			attributes["geoname"]["region_name"] = album_ini.get('DEFAULT', "region_name")

		# Place_name
		if album_ini.has_section(name):
			try:
				attributes["geoname"]["place_name"] = album_ini.get(name, "place_name")
			except NoOptionError:
				pass
		elif "place_name" in album_ini.defaults():
			attributes["geoname"]["place_name"] = album_ini.get('DEFAULT', "place_name")


	@staticmethod
	def convert_to_degrees_minutes_seconds(value, ref):
		"""
		Helper function to convert the GPS coordinates stored in the EXIF to degrees, minutes and seconds.
		"""

		# Degrees
		d = value[0]
		# Minutes
		m = value[1]
		# Seconds
		s = int(value[2] * 1000) / 1000

		result = str(d) + "º " + str(m) + "' " + str(s) + '" ' + ref

		return result

	@staticmethod
	def convert_decimal_to_degrees_minutes_seconds(value, ref):
		"""
		Helper function to convert the GPS coordinates stored in the EXIF to degrees, minutes and seconds.
		"""

		if value < 0:
			value = - value

		# Degrees
		d = int(value)
		# Minutes
		m = int((value - d) * 60)
		# Seconds
		s = int((value - d - m / 60) * 3600 * 100) / 100

		result = str(d) + "º " + str(m) + "' " + str(s) + '" ' + ref

		return result


	@staticmethod
	def convert_to_degrees_decimal(value, ref):
		"""
		Helper function to convert the GPS coordinates stored in the EXIF to degrees in float format.
		"""

		# Degrees
		d = float(value[0])
		# Minutes
		m = float(value[1])
		# Seconds
		s = float(value[2])

		result = d + (m / 60) + (s / 3600)

		# limit decimal digits to what is needed by openstreetmap
		six_zeros = 1000000
		result = int(result * six_zeros) / six_zeros
		if ref == "S" or ref == "W":
			result = - result

		return result

	@staticmethod
	def convert_tuple_to_degrees_decimal(value, ref):
		"""
		Helper function to convert the GPS coordinates stored in the EXIF to degrees in float format.
		"""

		# Degrees
		d = value[0][0] / value[0][1]
		# Minutes
		m = value[1][0] / value[1][1]
		# Seconds
		s = value[2][0] / value[2][1]

		result = d + m / 60 + s / 3600

		# limit decimal digits to what is needed by openstreetmap
		six_zeros = 1000000
		result = int(result * six_zeros) / six_zeros
		if ref == "S" or ref == "W":
			result = - result

		return result


	@staticmethod
	def convert_array_degrees_minutes_seconds_to_degrees_decimal(array_string):
		# the argument is like u'[44, 25, 26495533/1000000]'

		array = array_string[1:-1].split(', ')
		d = int(array[0])
		m = int(array[1])
		s = eval(array[2])
		result = d + m / 60 + s / 3600

		return result
