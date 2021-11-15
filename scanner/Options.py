# -*- coding: utf-8 -*-

from datetime import datetime
import os
import sys
import argparse
import json
import ast
import math
import hashlib
import random
import re
from pprint import pprint

import configparser

from Utilities import message, indented_message, next_level, back_level, find, find_in_filesystem, make_dir, file_mtime

config = {}
all_albums = []
date_time_format = "%Y-%m-%d %H:%M:%S"
exif_date_time_format = "%Y:%m:%d %H:%M:%S"
video_date_time_format = "%Y-%m-%d %H:%M:%S"
last_time = datetime.now()
elapsed_times = {}
elapsed_times_counter = {}
global_pattern = ""
num_photo = 0
num_photo_processed = 0
num_photo_with_exif_date = 0
num_photo_with_geotags = 0
num_photo_with_exif_date_and_geotags = 0
num_photo_with_exif_date_and_without_geotags = 0
num_photo_without_exif_date_and_with_geotags = 0
num_photo_without_exif_date_or_geotags = 0
photos_with_exif_date_and_without_geotags = []
photos_without_exif_date_and_with_geotags = []
photos_without_exif_date_or_geotags = []
num_unrecognized_files = 0
unrecognized_files = []
num_video = 0
num_video_processed = 0
options_not_to_be_saved = [
	'cache_path',
	'index_html_path',
	'album_path',
	'passwords_marker',
	'passwords_file'
]
options_requiring_json_regeneration = [
	{'name': 'geonames_language', 'default': ""},
	{'name': 'unspecified_geonames_code', 'default': 0},
	{'name': 'get_geonames_online', 'default': False},
	{'name': 'pil_size_for_decompression_bomb_error', 'default': 0},
	{'name': 'metadata_tools_preference', 'default': []},
	{'name': 'subdir_method', 'default': ""},
	{'name': 'cache_folders_num_digits_array', 'default': 0},
	{'name': 'max_media_in_json_file', 'default': 0},
	{'name': 'max_media_from_positions_in_json_file', 'default': 0},
	{'name': 'excluded_patterns', 'default': []}
]
# every option is given in a dictionary with a value which represent the pre-option default value
options_requiring_reduced_images_regeneration = [
	{'name': 'pil_size_for_decompression_bomb_error', 'default': 89478485},
	{'name': 'copy_exif_into_reductions', 'default': False}
]
options_requiring_thumbnails_regeneration = [
	{'name': 'pil_size_for_decompression_bomb_error', 'default': 89478485},
	{'name': 'face_cascade_scale_factor', 'default': 0},
	{'name': 'small_square_crops_background_color', 'default': ""},
	{'name': 'cv2_installed', 'default': False},
	{'name': 'copy_exif_into_reductions', 'default': False}
]
options_requiring_jpg_regeneration = [
	{'name': 'jpeg_quality', 'default': 0}
]
options_requiring_webp_regeneration = [
	{'name': 'webp_quality', 'default': 0}
]
options_requiring_png_regeneration = [
	{'name': 'png_compress_level', 'default': 0}
]
options_requiring_videos_regeneration = [
	{'name': 'video_transcode_bitrate', 'default': '1M'},
	{'name': 'video_crf', 'default': 20},
	{'name': 'video_preset', 'default': 'slow'},
	{'name': 'video_profile', 'default': 'baseline'},
	{'name': 'video_profile_level', 'default': '3.0'},
	{'name': 'video_audio_ac', 'default': 2},
	{'name': 'video_audio_ab', 'default': '160k'},
	{'name': 'video_maxrate', 'default': '10M'},
	{'name': 'video_bufsize', 'default': '10M'},
	{'name': 'video_frame_maxsize', 'default': 'hd720'},
	{'name': 'video_add_options', 'default': None},
]

# lets put here all unicode combining code points, in order to be sure to use the same in both python and js
# from https://github.com/paulmillr/unicode-categories/blob/master/index.js

# Unicode non-spacing marks
unicode_combining_marks_n = '\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307\u0308\u0309\u030A\u030B\u030C\u030D\u030E\u030F\u0310\u0311\u0312\u0313\u0314\u0315\u0316\u0317\u0318\u0319\u031A\u031B\u031C\u031D\u031E\u031F\u0320\u0321\u0322\u0323\u0324\u0325\u0326\u0327\u0328\u0329\u032A\u032B\u032C\u032D\u032E\u032F\u0330\u0331\u0332\u0333\u0334\u0335\u0336\u0337\u0338\u0339\u033A\u033B\u033C\u033D\u033E\u033F\u0340\u0341\u0342\u0343\u0344\u0345\u0346\u0347\u0348\u0349\u034A\u034B\u034C\u034D\u034E\u034F\u0350\u0351\u0352\u0353\u0354\u0355\u0356\u0357\u0358\u0359\u035A\u035B\u035C\u035D\u035E\u035F\u0360\u0361\u0362\u0363\u0364\u0365\u0366\u0367\u0368\u0369\u036A\u036B\u036C\u036D\u036E\u036F\u0483\u0484\u0485\u0486\u0487\u0591\u0592\u0593\u0594\u0595\u0596\u0597\u0598\u0599\u059A\u059B\u059C\u059D\u059E\u059F\u05A0\u05A1\u05A2\u05A3\u05A4\u05A5\u05A6\u05A7\u05A8\u05A9\u05AA\u05AB\u05AC\u05AD\u05AE\u05AF\u05B0\u05B1\u05B2\u05B3\u05B4\u05B5\u05B6\u05B7\u05B8\u05B9\u05BA\u05BB\u05BC\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610\u0611\u0612\u0613\u0614\u0615\u0616\u0617\u0618\u0619\u061A\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0653\u0654\u0655\u0656\u0657\u0658\u0659\u065A\u065B\u065C\u065D\u065E\u0670\u06D6\u06D7\u06D8\u06D9\u06DA\u06DB\u06DC\u06DF\u06E0\u06E1\u06E2\u06E3\u06E4\u06E7\u06E8\u06EA\u06EB\u06EC\u06ED\u0711\u0730\u0731\u0732\u0733\u0734\u0735\u0736\u0737\u0738\u0739\u073A\u073B\u073C\u073D\u073E\u073F\u0740\u0741\u0742\u0743\u0744\u0745\u0746\u0747\u0748\u0749\u074A\u07A6\u07A7\u07A8\u07A9\u07AA\u07AB\u07AC\u07AD\u07AE\u07AF\u07B0\u07EB\u07EC\u07ED\u07EE\u07EF\u07F0\u07F1\u07F2\u07F3\u0901\u0902\u093C\u0941\u0942\u0943\u0944\u0945\u0946\u0947\u0948\u094D\u0951\u0952\u0953\u0954\u0962\u0963\u0981\u09BC\u09C1\u09C2\u09C3\u09C4\u09CD\u09E2\u09E3\u0A01\u0A02\u0A3C\u0A41\u0A42\u0A47\u0A48\u0A4B\u0A4C\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81\u0A82\u0ABC\u0AC1\u0AC2\u0AC3\u0AC4\u0AC5\u0AC7\u0AC8\u0ACD\u0AE2\u0AE3\u0B01\u0B3C\u0B3F\u0B41\u0B42\u0B43\u0B44\u0B4D\u0B56\u0B62\u0B63\u0B82\u0BC0\u0BCD\u0C3E\u0C3F\u0C40\u0C46\u0C47\u0C48\u0C4A\u0C4B\u0C4C\u0C4D\u0C55\u0C56\u0C62\u0C63\u0CBC\u0CBF\u0CC6\u0CCC\u0CCD\u0CE2\u0CE3\u0D41\u0D42\u0D43\u0D44\u0D4D\u0D62\u0D63\u0DCA\u0DD2\u0DD3\u0DD4\u0DD6\u0E31\u0E34\u0E35\u0E36\u0E37\u0E38\u0E39\u0E3A\u0E47\u0E48\u0E49\u0E4A\u0E4B\u0E4C\u0E4D\u0E4E\u0EB1\u0EB4\u0EB5\u0EB6\u0EB7\u0EB8\u0EB9\u0EBB\u0EBC\u0EC8\u0EC9\u0ECA\u0ECB\u0ECC\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F71\u0F72\u0F73\u0F74\u0F75\u0F76\u0F77\u0F78\u0F79\u0F7A\u0F7B\u0F7C\u0F7D\u0F7E\u0F80\u0F81\u0F82\u0F83\u0F84\u0F86\u0F87\u0F90\u0F91\u0F92\u0F93\u0F94\u0F95\u0F96\u0F97\u0F99\u0F9A\u0F9B\u0F9C\u0F9D\u0F9E\u0F9F\u0FA0\u0FA1\u0FA2\u0FA3\u0FA4\u0FA5\u0FA6\u0FA7\u0FA8\u0FA9\u0FAA\u0FAB\u0FAC\u0FAD\u0FAE\u0FAF\u0FB0\u0FB1\u0FB2\u0FB3\u0FB4\u0FB5\u0FB6\u0FB7\u0FB8\u0FB9\u0FBA\u0FBB\u0FBC\u0FC6\u102D\u102E\u102F\u1030\u1032\u1033\u1034\u1035\u1036\u1037\u1039\u103A\u103D\u103E\u1058\u1059\u105E\u105F\u1060\u1071\u1072\u1073\u1074\u1082\u1085\u1086\u108D\u135F\u1712\u1713\u1714\u1732\u1733\u1734\u1752\u1753\u1772\u1773\u17B7\u17B8\u17B9\u17BA\u17BB\u17BC\u17BD\u17C6\u17C9\u17CA\u17CB\u17CC\u17CD\u17CE\u17CF\u17D0\u17D1\u17D2\u17D3\u17DD\u180B\u180C\u180D\u18A9\u1920\u1921\u1922\u1927\u1928\u1932\u1939\u193A\u193B\u1A17\u1A18\u1B00\u1B01\u1B02\u1B03\u1B34\u1B36\u1B37\u1B38\u1B39\u1B3A\u1B3C\u1B42\u1B6B\u1B6C\u1B6D\u1B6E\u1B6F\u1B70\u1B71\u1B72\u1B73\u1B80\u1B81\u1BA2\u1BA3\u1BA4\u1BA5\u1BA8\u1BA9\u1C2C\u1C2D\u1C2E\u1C2F\u1C30\u1C31\u1C32\u1C33\u1C36\u1C37\u1DC0\u1DC1\u1DC2\u1DC3\u1DC4\u1DC5\u1DC6\u1DC7\u1DC8\u1DC9\u1DCA\u1DCB\u1DCC\u1DCD\u1DCE\u1DCF\u1DD0\u1DD1\u1DD2\u1DD3\u1DD4\u1DD5\u1DD6\u1DD7\u1DD8\u1DD9\u1DDA\u1DDB\u1DDC\u1DDD\u1DDE\u1DDF\u1DE0\u1DE1\u1DE2\u1DE3\u1DE4\u1DE5\u1DE6\u1DFE\u1DFF\u20D0\u20D1\u20D2\u20D3\u20D4\u20D5\u20D6\u20D7\u20D8\u20D9\u20DA\u20DB\u20DC\u20E1\u20E5\u20E6\u20E7\u20E8\u20E9\u20EA\u20EB\u20EC\u20ED\u20EE\u20EF\u20F0\u2DE0\u2DE1\u2DE2\u2DE3\u2DE4\u2DE5\u2DE6\u2DE7\u2DE8\u2DE9\u2DEA\u2DEB\u2DEC\u2DED\u2DEE\u2DEF\u2DF0\u2DF1\u2DF2\u2DF3\u2DF4\u2DF5\u2DF6\u2DF7\u2DF8\u2DF9\u2DFA\u2DFB\u2DFC\u2DFD\u2DFE\u2DFF\u302A\u302B\u302C\u302D\u302E\u302F\u3099\u309A\uA66F\uA67C\uA67D\uA802\uA806\uA80B\uA825\uA826\uA8C4\uA926\uA927\uA928\uA929\uA92A\uA92B\uA92C\uA92D\uA947\uA948\uA949\uA94A\uA94B\uA94C\uA94D\uA94E\uA94F\uA950\uA951\uAA29\uAA2A\uAA2B\uAA2C\uAA2D\uAA2E\uAA31\uAA32\uAA35\uAA36\uAA43\uAA4C\uFB1E\uFE00\uFE01\uFE02\uFE03\uFE04\uFE05\uFE06\uFE07\uFE08\uFE09\uFE0A\uFE0B\uFE0C\uFE0D\uFE0E\uFE0F\uFE20\uFE21\uFE22\uFE23\uFE24\uFE25\uFE26'
# Unicode combining space marks
unicode_combining_marks_c = '\u0903\u093E\u093F\u0940\u0949\u094A\u094B\u094C\u0982\u0983\u09BE\u09BF\u09C0\u09C7\u09C8\u09CB\u09CC\u09D7\u0A03\u0A3E\u0A3F\u0A40\u0A83\u0ABE\u0ABF\u0AC0\u0AC9\u0ACB\u0ACC\u0B02\u0B03\u0B3E\u0B40\u0B47\u0B48\u0B4B\u0B4C\u0B57\u0BBE\u0BBF\u0BC1\u0BC2\u0BC6\u0BC7\u0BC8\u0BCA\u0BCB\u0BCC\u0BD7\u0C01\u0C02\u0C03\u0C41\u0C42\u0C43\u0C44\u0C82\u0C83\u0CBE\u0CC0\u0CC1\u0CC2\u0CC3\u0CC4\u0CC7\u0CC8\u0CCA\u0CCB\u0CD5\u0CD6\u0D02\u0D03\u0D3E\u0D3F\u0D40\u0D46\u0D47\u0D48\u0D4A\u0D4B\u0D4C\u0D57\u0D82\u0D83\u0DCF\u0DD0\u0DD1\u0DD8\u0DD9\u0DDA\u0DDB\u0DDC\u0DDD\u0DDE\u0DDF\u0DF2\u0DF3\u0F3E\u0F3F\u0F7F\u102B\u102C\u1031\u1038\u103B\u103C\u1056\u1057\u1062\u1063\u1064\u1067\u1068\u1069\u106A\u106B\u106C\u106D\u1083\u1084\u1087\u1088\u1089\u108A\u108B\u108C\u108F\u17B6\u17BE\u17BF\u17C0\u17C1\u17C2\u17C3\u17C4\u17C5\u17C7\u17C8\u1923\u1924\u1925\u1926\u1929\u192A\u192B\u1930\u1931\u1933\u1934\u1935\u1936\u1937\u1938\u19B0\u19B1\u19B2\u19B3\u19B4\u19B5\u19B6\u19B7\u19B8\u19B9\u19BA\u19BB\u19BC\u19BD\u19BE\u19BF\u19C0\u19C8\u19C9\u1A19\u1A1A\u1A1B\u1B04\u1B35\u1B3B\u1B3D\u1B3E\u1B3F\u1B40\u1B41\u1B43\u1B44\u1B82\u1BA1\u1BA6\u1BA7\u1BAA\u1C24\u1C25\u1C26\u1C27\u1C28\u1C29\u1C2A\u1C2B\u1C34\u1C35\uA823\uA824\uA827\uA880\uA881\uA8B4\uA8B5\uA8B6\uA8B7\uA8B8\uA8B9\uA8BA\uA8BB\uA8BC\uA8BD\uA8BE\uA8BF\uA8C0\uA8C1\uA8C2\uA8C3\uA952\uA953\uAA2F\uAA30\uAA33\uAA34\uAA4D'
# all combining mark: this variable will be passed in options.json to js
config['unicode_combining_marks'] = unicode_combining_marks_n + unicode_combining_marks_c

thumbnail_types_and_sizes_list = None
identifiers_and_passwords = []
old_password_codes = {}
obsolete_json_version = False
passwords_file_mtime = None
config['cv2_installed'] = True
face_cascade = None
eye_cascade = None
config['available_map_popup_positions'] = ['SE', 'NW']
# the minimum and maximum values to use for random password codes
# min_random ensures that all the codes has the same length
min_random = 100000000
max_random = 999999999

# svg is not in the following list because Pillow doesn't support it
config['browser_unsupported_mime_types'] = ['image/tiff', 'image/webp', 'image/x-tga']


# set this variable to a new value whenever the json files structure changes
# - previously was a string, now it must be a float number
# json_version = 0 is debug mode: json files are always considered invalid
# json_version = 1 since ...
# json_version = 2 since checksums have been added
# json_version = 3 since geotag managing is optional
# json_version = 3.4 since search feature added
# json_version = 3.6.4 since changed wrong album/media attributes
# json_version = 3.7beta1 since added positions_and_media_in_tree to every json file
# json_version = 3.7beta2 since mvoed positions_and_media_in_tree to a separate file to avoid duplication and to save download time
# json_version = 3.8
# json_version = 3.8.1 since slightly rationalized json files content
# json_version = 3.99 since property passwords changed to passwordsCodes in json file
# json_version = 3.98 since property passwords changed to passwordsMd5 in json file
# json_version = 3.97 since passwords removed from json file
# json_version = 3.98 since passwordMarkerMTime and albumIniMTime was added to json files
# json_version = 3.99 since album passwords added to every media separately from media passwords
# json_version = 3.991 since media and position remain in json file for small numbers
# json_version = 3.992 since combination renamed to complexCombination
# json_version = 3.994 since complexCombination renamed to codesComplexCombination
# json_version = 3.995 since removed ancestorsCacheBase and unnecessary ancestorsCenter
# json_version = 3.996 since mimeType and convertedPath added as media properties
# json_version = 3.997 since corrected bug with positions in search albums
# json_version = 3.998 since symlinkCodesAndNumbers added as album property
# json_version = 4.0 for new release
# json_version = 4.1 since sizes of media, albums and trees added
# json_version = 4.2 since numMediaInSubTree and numMedia are changed to numsMediaInSubTree and numsMedia
# json_version = 4.21 since mediaNameList changed to mediaList
# json_version = 4.22 since albumCacheBase removed from mediaList elements
# json_version = 4.23 since subalbums have complete path
# json_version = 4.24 since default albums and media sorting implemented
# json_version = 4.25 since the bugs in reading exif metadata have been corrected
# json_version = 4.26 since tags have been added to subalbums
# json_version = 4.27 since ancestorsTitles list have been added to albums
# json_version = 4.28 since data for non geotagged media have been added to albums
# json_version = 4.29 since a bug in media cache bases has been fixed
# json_version = 4.30 since numsMedia has beed added to subalbums
# json_version = 4.31 since compositeImageSize has beed added to albums
# json_version = 4.32 since imageSize has beed added to videos in albums

# json_version = 0
json_version = 4.32

# the release version number (a string)
version = "v5.3.99"


def set_obsolete_json_version_flag():
	global obsolete_json_version
	obsolete_json_version = True


def mark_identifier_as_used(identifier):
	global identifiers_and_passwords
	for i, value in enumerate(identifiers_and_passwords):
		if identifiers_and_passwords[i]['identifier'] == identifier:
			identifiers_and_passwords[i]['used'] = True
			break

def get_old_password_codes():
	message("PRE Getting old passwords and codes...","", 5)
	passwords_subdir_with_path = os.path.join(config['cache_path'], config['passwords_subdir'])
	old_md5_and_codes = {}
	try:
		for password_md5 in sorted(os.listdir(passwords_subdir_with_path)):
			with open(os.path.join(passwords_subdir_with_path, password_md5), "r") as filepath:
				# print(os.path.join(passwords_subdir_with_path, password_md5))
				code_dict = json.load(filepath)
				old_md5_and_codes[code_dict["passwordCode"]] = password_md5
		indented_message("PRE Old passwords and codes got","", 4)
	except OSError:
		# the directory doesn't exist
		pass
	return old_md5_and_codes

def initialize_opencv():
	global face_cascade, eye_cascade

	try:
		import cv2

		message("PRE importer", "opencv library available, using it!", 4)
		next_level()
		FACE_CONFIG_FILE = "haarcascade_frontalface_default.xml"
		message("PRE looking for file in /usr/share ...", FACE_CONFIG_FILE, 5)
		face_config_file_with_path = find_in_filesystem(FACE_CONFIG_FILE, "/usr/share/")
		if not face_config_file_with_path:
			message("PRE opencv face xml file not found in /usr/share", FACE_CONFIG_FILE, 5)
			message("PRE looking for file in / ...", FACE_CONFIG_FILE, 5)
			face_config_file_with_path = find_in_filesystem(FACE_CONFIG_FILE, "/")
		if not face_config_file_with_path:
			indented_message("PRE opencv face xml file not found", FACE_CONFIG_FILE, 5)
			config['cv2_installed'] = False
		else:
			face_cascade = cv2.CascadeClassifier(face_config_file_with_path)
			indented_message("PRE opencv face xml file found and initialized!", face_config_file_with_path, 5)

			EYE_CONFIG_FILE = "haarcascade_eye.xml"
			message("PRE looking for file in /usr/share ...", EYE_CONFIG_FILE, 5)
			eye_config_file_with_path = find_in_filesystem(EYE_CONFIG_FILE, "/usr/share/")
			if not eye_config_file_with_path:
				message("PRE opencv eyes xml file not found in /usr/share", EYE_CONFIG_FILE, 5)
				message("PRE looking for file in / ...", EYE_CONFIG_FILE, 5)
				eye_config_file_with_path = find_in_filesystem(EYE_CONFIG_FILE, "/")
			if not eye_config_file_with_path:
				indented_message("PRE opencv eyes xml file not found", EYE_CONFIG_FILE, 5)
				config['cv2_installed'] = False
			else:
				eye_cascade = cv2.CascadeClassifier(eye_config_file_with_path)
				indented_message("PRE opencv eyes xml file found and initialized!", eye_config_file_with_path, 5)
		back_level()
	except ImportError:
		config['cv2_installed'] = False
		message("PRE importer", "No opencv library available, not using it", 2)

def get_options(args):
	global passwords_file_mtime, old_password_codes, global_pattern

	initialize_opencv()

	project_dir = os.path.dirname(os.path.realpath(os.path.join(__file__, "..")))
	default_config_file = os.path.join(project_dir, "myphotoshare.conf.defaults")
	default_config = configparser.ConfigParser()
	default_config.readfp(open(default_config_file, "r"))
	usr_config = configparser.ConfigParser()
	usr_config.add_section("options")
	for option in default_config.options('options'):
		usr_config.set("options", option, default_config.get("options", option))

	try:
		usr_config.readfp(open(args.options_file, "r"))
	except FileNotFoundError:
		message("PRE FATAL ERROR", "options file '" + args.options_file + "' doesn't exist or unreadable, quitting", 0)
		sys.exit(-97)

	message("PRE Options", "asterisk denotes options changed by config file", 0)
	next_level()
	# pass config values to a dict, because ConfigParser objects are not reliable
	for option in default_config.options('options'):
		if option in (
				'max_verbose',
				'pil_size_for_decompression_bomb_error',
				'jpeg_quality',
				'webp_quality',
				'png_compress_level',
				'video_crf',
				'thumb_spacing',
				'album_thumb_size',
				'media_thumb_size',
				'big_virtual_folders_threshold',
				'photo_map_size',
				'max_media_in_json_file',
				'max_media_from_positions_in_json_file',
				'max_search_album_number',
				# the following option will be converted to integer further on
				'num_processors',
				'max_album_share_thumbnails_number',
				'min_album_thumbnail',
				'piwik_id'
		):
			try:
				if option != 'piwik_id' or config['piwik_server']:
					# piwik_id must be evaluated here because otherwise an error is produced if it's not set
					config[option] = usr_config.getint('options', option)
				else:
					config[option] = ""
			except configparser.Error:
				indented_message("PRE WARNING: option " + option + " in user config file", "is not integer, using default value", 2)
				config[option] = default_config.getint('options', option)
		elif option in (
				'follow_symlinks',
				'checksum',
				'different_album_thumbnails',
				'hide_title',
				'hide_bottom_thumbnails',
				'hide_descriptions',
				'hide_tags',
				'albums_slide_style',
				'show_media_names_below_thumbs',
				'show_album_names_below_thumbs',
				'show_album_media_count',
				'persistent_metadata',
				'default_album_name_sort',
				'default_media_name_sort',
				'default_album_reverse_sort',
				'default_media_reverse_sort',
				'recreate_fixed_height_thumbnails',
				'copy_exif_into_reductions',
				'get_geonames_online',
				'use_internal_modernizr',
				'user_may_suggest_location',
				'show_faces',
				'use_stop_words',
				'debug_memory',
				'debug_profile'
		):
			try:
				config[option] = usr_config.getboolean('options', option)
			except ValueError:
				indented_message("PRE WARNING: option " + option + " in user config file", "is not boolean, using default value", 2)
				config[option] = default_config.getboolean('options', option)
		elif option in ('reduced_sizes', 'metadata_tools_preference', 'cache_images_formats'):
			config[option] = ast.literal_eval(usr_config.get('options', option))
			if option == "cache_images_formats":
				admitted_values = ["jpg", "png", "webp"]
				for value in config[option]:
					if value not in admitted_values:
						config[option].remove(value)
				# the cache_images_formats must include jpg
				if not "jpg" in config[option]:
					config[option].append("jpg")
				# remove duplicates
				config[option] = [i for n, i in enumerate(config[option]) if i not in config[option][:n]]
		elif option in ('mobile_thumbnail_factor', 'face_cascade_scale_factor'):
			config[option] = usr_config.getfloat('options', option)
			if config[option] < 1:
				config[option] = 1
		elif option == 'album_thumb_type':
			config[option] = 'album_' + usr_config.get('options', option)
		elif option == 'media_thumb_type':
			config[option] = 'media_' + usr_config.get('options', option)
		else:
			config[option] = usr_config.get('options', option)
			if option in ('js_cache_levels'):
				config[option] = json.loads(config[option])


		option_value = str(config[option])
		option_length = len(option_value)
		max_length = 40
		spaces = ""
		#pylint
		for _ in range(max_length - option_length):
			spaces += " "
		max_spaces = ""
		#pylint
		for _ in range(max_length):
			max_spaces += " "

		default_option_value = str(default_config.get('options', option))
		if default_config.get('options', option) == usr_config.get('options', option):
			option_value = "  " + option_value + spaces + "DEFAULT"
		else:
			option_value = "* " + option_value + spaces + "DEFAULT: " + default_option_value

		message("PRE option value", option.ljust(45) + ": " + option_value, 0)

	# all cache names are lower case => bit rate must be lower case too
	config['video_transcode_bitrate'] = config['video_transcode_bitrate'].lower()

	# set default values
	if config['geonames_language'] == '':
		if config['language'] != '':
			config['geonames_language'] = config['language']
			message("PRE geonames_language option unset", "using language value: " + config['language'], 3)
		else:
			config['geonames_language'] = os.getenv('LANG')[:2]
			message("PRE geonames_language and language options unset", "using system language (" + config['geonames_language'] + ") for geonames_language option", 3)
	if config['get_geonames_online']:
		# warn if using demo geonames user
		if config['geonames_user'] == str(default_config.get('options', 'geonames_user')):
			message("PRE WARNING!", "You are using the myphotoshare demo geonames user, get and use your own user as soon as possible", 0)

	# values that have type != string
	back_level()

	# command line options supersedes options file ones
	if args.web_root_path:
		config['index_html_path'] = os.fsdecode(os.path.abspath(args.web_root_path))
		message("COMMAND LINE option", "value of 'web-root-path' option used", 1)
	elif config['index_html_path']:
		config['index_html_path'] = os.fsdecode(os.path.abspath(config['index_html_path']))
	else:
		config['index_html_path'] = ""

	if args.album_path:
		config['album_path'] = os.fsdecode(os.path.abspath(args.album_path))
		message("COMMAND LINE option", "value of 'album-path' option used", 1)
	elif config['album_path']:
		config['album_path'] = os.fsdecode(os.path.abspath(config['album_path']))
	else:
		config['album_path'] = ""

	if args.cache_path:
		config['cache_path'] = os.fsdecode(os.path.abspath(args.cache_path))
		message("COMMAND LINE option", "value of 'cache-path' option used", 1)
	elif config['cache_path']:
		config['cache_path'] = os.fsdecode(os.path.abspath(config['cache_path']))
	else:
		config['cache_path'] = ""

	# try to guess value not given
	guessed_index_dir = False
	guessed_album_dir = False
	guessed_cache_dir = False
	if (
		not config['index_html_path'] and
		not config['album_path'] and
		not config['cache_path']
	):
		message("PRE options", "neither index_html_path nor album_path or cache_path have been defined, assuming default positions", 3)
		# default position for index_html_path is script_path/../web
		# default position for album path is script_path/../web/albums
		# default position for cache path is script_path/../web/cache
		script_path = os.path.dirname(os.path.realpath(__file__))
		config['index_html_path'] = os.path.abspath(os.path.join(script_path, "..", "web"))
		config['album_path'] = os.path.abspath(os.path.join(config['index_html_path'], "albums"))
		config['cache_path'] = os.path.abspath(os.path.join(config['index_html_path'], "cache"))
		guessed_index_dir = True
		guessed_album_dir = True
		guessed_cache_dir = True
	elif (
		config['index_html_path'] and (
			not config['album_path'] or
			not config['cache_path']
		)
	):
		if not config['album_path']:
			message("PRE options", "index_html_path is given, using its subfolder 'albums' for album_path", 3)
			config['album_path'] = os.path.join(config['index_html_path'], "albums")
			guessed_album_dir = True
		if not config['cache_path']:
			message("PRE options", "index_html_path is given, using its subfolder 'cache' for cache_path", 3)
			config['cache_path'] = os.path.join(config['index_html_path'], "cache")
			guessed_cache_dir = True
	elif (
		not config['index_html_path'] and
		config['album_path'] and
		config['cache_path'] and
		config['album_path'][:config['album_path']
			.rfind("/")] == config['cache_path'][:config['cache_path'].rfind("/")]
	):
		guessed_index_dir = True
		message("PRE options", "only album_path or cache_path has been given, using their common parent folder for index_html_path", 3)
		config['index_html_path'] = config['album_path'][:config['album_path'].rfind("/")]
	elif (
		not config['index_html_path'] and
		not config['album_path'] and
		not config['cache_path']
	):
		message("PRE options", "you must define at least some of index_html_path, album_path and cache_path, and correctly; quitting", 0)
		sys.exit(-97)

	if guessed_index_dir or guessed_album_dir or guessed_cache_dir:
		message("PRE options", "guessed value(s):", 3)
		next_level()
		if guessed_index_dir:
			message("PRE guessed directory", "index_html_path" + "=" + config['index_html_path'], 3)
		if guessed_album_dir:
			message("PRE guessed directory", "album_path" + "=" + config['album_path'], 3)
		if guessed_cache_dir:
			message("PRE guessed directory", "cache_path" + "=" + config['cache_path'], 3)
		back_level()

	# the album directory must exist and be readable
	try:
		os.stat(config['album_path'])
	except OSError:
		message("PRE FATAL ERROR", config['album_path'] + " doesn't exist or unreadable, quitting", 0)
		sys.exit(-97)

	# the cache directory must exist and be writable, or we'll try to create it
	try:
		os.stat(config['cache_path'])
		if not os.access(config['cache_path'], os.W_OK):
			message("PRE FATAL ERROR", config['cache_path'] + " not writable, quitting", 0)
			sys.exit(-97)
	except OSError:
		make_dir(config['cache_path'], "cache directory")

	config['excluded_patterns'] = []
	passwords_subdir_with_path = os.path.join(config['cache_path'], config['passwords_subdir'])
	make_dir(passwords_subdir_with_path, "passwords subdir")


	# work with the passwords
	old_password_codes = get_old_password_codes()

	passwords_file_name = os.path.join(os.path.dirname(args.options_file), config['passwords_file'])
	password_codes = []
	passwords_md5 = []

	# read the password file
	# it must exist and be readable, otherwise skip it
	try:
		with open(passwords_file_name, 'r') as passwords_file:
			# Get the old file contents, they are needed in order to evalutate the numsProtectedMediaInSubTree dictionary in json file
			message("PRE Reading passwords file", passwords_file_name, 4)
			for line in passwords_file.read().splitlines():
				# remove leading spaces
				line = line.lstrip()
				# lines beginning with # and space-only ones are ignored
				if line[0:1] == "#" or line.strip() == "":
					continue
				# in each line is a password identifier is followed by the corresponding password
				columns = line.split(' ')
				identifier = columns[0]
				# everything beginning with the first non-space character till the end of line (including the traling spaces) is the password
				password = " ".join(columns[1:]).lstrip()
				if password == "":
					indented_message("PRE Missing password", "for identifier: '" + identifier + "'", 4)
					continue
				while True:
					password_code = str(random.randint(min_random, max_random))
					password_md5 = hashlib.md5(password.encode('utf-8')).hexdigest()
					if password_code not in password_codes:
						password_codes.append(password_code)
						passwords_md5.append(password_md5)
						break
				identifiers_and_passwords.append(
					{
						'identifier': identifier,
						'password_md5': password_md5,
						'password_code': password_code,
						'used': False
					}
				)
				indented_message(
					"PRE Password read",
					"identifier: " + identifier + ", encrypted password: " + password_md5 + ", password code = " + str(password_code),
					4
				)
		if len(identifiers_and_passwords) > 0:
			passwords_file_mtime = file_mtime(passwords_file_name)
	except IOError:
		indented_message("PRE WARNING", passwords_file_name + " doesn't exist or unreadable, not using it", 3)


	# read the excluded patterns file
	# it must exist and be readable, otherwise skip it
	excluded_patterns_file_name = os.path.join(os.path.dirname(args.options_file), config['excluded_patterns_file'])

	try:
		with open(excluded_patterns_file_name, 'r') as excluded_patterns_file:
			message("PRE Reading excluded patterns file", excluded_patterns_file_name, 4)
			for line in excluded_patterns_file.read().splitlines():
				# lines beginning with # and space-only ones are ignored
				if line[0:1] == "#" or line.strip() == "":
					continue
				# each line is regex, including leading and trailing spaces
				config['excluded_patterns'].append(line)
				indented_message("PRE pattern read!", line, 3)
		if len(config['excluded_patterns']) == 0:
			indented_message("PRE no patterns to exclude", "", 3)
	except IOError:
		indented_message("PRE WARNING", excluded_patterns_file_name + " doesn't exist or unreadable, not using it", 3)

	# create the directory where php will put album composite images
	album_cache_dir = os.path.join(config['cache_path'], config['cache_album_subdir'])
	try:
		os.stat(album_cache_dir)
	except OSError:
		make_dir(album_cache_dir, "cache directory for composite images")

	# calculate the number of media in the album tree: it will be used in order to guess the execution time
	special_files = [config['exclude_tree_marker'], config['exclude_files_marker'], config['metadata_filename'], config['passwords_marker']]
	message("PRE counting media in albums...", "", 4)
	config['num_media_in_tree'] = 0
	for pattern in config['excluded_patterns']:
		global_pattern += "(" + pattern + ")|"
	if len(global_pattern):
		global_pattern = global_pattern[:-1]
	for dirpath, dirs, files in os.walk(config['album_path'], topdown=True):
		if config['exclude_tree_marker'] in files:
			dirs[:] = []
		else:
			dirs[:] = [d for d in dirs if global_pattern == "" or not re.search(global_pattern, d)]
		if dirpath.find('/.') == -1 and config['exclude_files_marker'] not in files and config['exclude_tree_marker'] not in files:
			config['num_media_in_tree'] += sum([len([file for file in files if file[:1] != '.' and file not in special_files and (global_pattern == "" or not re.search(global_pattern, file))])])
	indented_message("PRE media in albums counted", str(config['num_media_in_tree']), 4)

	config['cache_folders_num_digits_array'] = []
	if config['subdir_method'] == "md5":
		message("PRE determining cache folders schema...", "", 4)
		# let's use a variable schema for cache subfolders, so that every directory has no more than 32 media (about 400 files)
		try:
			cache_folders_num_digits = int(math.log(config['num_media_in_tree'] / 2, 16))
		except ValueError:
			cache_folders_num_digits = 1
		# it's not good to have many subfolders, let's use a multi-level structure,
		# every structure uses a maximum of 2 digits, so that no more than 256 folders are used
		cache_folders_string = ''
		while cache_folders_num_digits > 1:
			config['cache_folders_num_digits_array'].append(2)
			cache_folders_num_digits -= 2
			cache_folders_string += "aa/"
		if cache_folders_num_digits:
			config['cache_folders_num_digits_array'].append(1)
			cache_folders_string += "a/"
		next_level()
		if cache_folders_string:
			message("PRE cache folders schema determined", "using the schema: " + cache_folders_string, 4)
		else:
			message("PRE cache folders schema determined", "few media, using default subdir: " + config['default_cache_album'], 4)
		back_level()

	# get old options: they are revised in order to decide whether to recreate something
	json_options_file = os.path.join(config['cache_path'], "options.json")
	try:
		with open(json_options_file) as old_options_file:
			old_options = json.load(old_options_file)

		config['recreate_reduced_photos'] = False
		for option_dict in options_requiring_reduced_images_regeneration:
			option = option_dict['name']
			default_value = option_dict['default']
			try:
				if old_options[option] != config[option]:
					config['recreate_reduced_photos'] = True
					message("PRE options", "'" + option + "' has changed from previous scanner run, forcing recreation of reduced size images", 3)
					break
			except KeyError:
				if config[option] != default_value:
					config['recreate_reduced_photos'] = True
					message("PRE options", "'" + option + "' wasn't set on previous scanner run and hasn't the default value, forcing recreation of reduced size images", 3)
					break
				else:
					message("PRE options", "'" + option + "' wasn't set on previous scanner run, but has the default value, not forcing recreation of reduced size images", 3)

		config['recreate_transcoded_videos'] = False
		for option_dict in options_requiring_videos_regeneration:
			option = option_dict['name']
			default_value = option_dict['default']
			try:
				if old_options[option] != config[option]:
					config['recreate_transcoded_videos'] = True
					message("PRE options", "'" + option + "' has changed from previous scanner run, forcing recreation of videos", 3)
					break
			except KeyError:
				if config[option] != default_value:
					config['recreate_transcoded_videos'] = True
					message("PRE options", "'" + option + "' wasn't set on previous scanner run and hasn't the default value, forcing recreation of videos", 3)
					break
				else:
					message("PRE options", "'" + option + "' wasn't set on previous scanner run, but has the default value, not forcing recreation of videos", 3)

		config['recreate_thumbnails'] = False
		for option_dict in options_requiring_thumbnails_regeneration:
			option = option_dict['name']
			default_value = option_dict['default']
			try:
				if old_options[option] != config[option]:
					config['recreate_thumbnails'] = True
					message("PRE options", "'" + option + "' has changed from previous scanner run, forcing recreation of thumbnails", 3)
					break
			except KeyError:
				if config[option] != default_value:
					config['recreate_thumbnails'] = True
					message("PRE options", "'" + option + "' wasn't set on previous scanner run and hasn't the default value, forcing recreation of thumbnails", 3)
					break
				else:
					message("PRE options", "'" + option + "' wasn't set on previous scanner run, but has the default value, not forcing recreation of thumbnails", 3)

		config['recreate_jpg'] = False
		for option_dict in options_requiring_jpg_regeneration:
			option = option_dict['name']
			default_value = option_dict['default']
			try:
				if old_options[option] != config[option]:
					config['recreate_jpg'] = True
					message("PRE options", "'" + option + "' has changed from previous scanner run, forcing recreation of jpg images", 3)
					break
			except KeyError:
				if config[option] != default_value:
					config['recreate_jpg'] = True
					message("PRE options", "'" + option + "' wasn't set on previous scanner run and hasn't the default value, forcing recreation of jpg images", 3)
					break
				else:
					message("PRE options", "'" + option + "' wasn't set on previous scanner run, but has the default value, not forcing recreation of jpg images", 3)

		config['recreate_webp'] = False
		for option_dict in options_requiring_webp_regeneration:
			option = option_dict['name']
			default_value = option_dict['default']
			try:
				if old_options[option] != config[option]:
					config['recreate_webp'] = True
					message("PRE options", "'" + option + "' has changed from previous scanner run, forcing recreation of webp images", 3)
					break
			except KeyError:
				if config[option] != default_value:
					config['recreate_webp'] = True
					message("PRE options", "'" + option + "' wasn't set on previous scanner run and hasn't the default value, forcing recreation of webp images", 3)
					break
				else:
					message("PRE options", "'" + option + "' wasn't set on previous scanner run, but has the default value, not forcing recreation of webp images", 3)

		config['recreate_png'] = False
		for option_dict in options_requiring_png_regeneration:
			option = option_dict['name']
			default_value = option_dict['default']
			try:
				if old_options[option] != config[option]:
					config['recreate_png'] = True
					message("PRE options", "'" + option + "' has changed from previous scanner run, forcing recreation of png images", 3)
					break
			except KeyError:
				if config[option] != default_value:
					config['recreate_png'] = True
					message("PRE options", "'" + option + "' wasn't set on previous scanner run and hasn't the default value, forcing recreation of png images", 3)
					break
				else:
					message("PRE options", "'" + option + "' wasn't set on previous scanner run, but has the default value, not forcing recreation of png images", 3)

		config['recreate_json_files'] = False
		for option in options_requiring_json_regeneration:
			option = option_dict['name']
			default_value = option_dict['default']
			try:
				if old_options[option] != config[option]:
					config['recreate_json_files'] = True
					if type(config[option]) == type([]):
						message("PRE options", "'" + option + "' has changed from previous scanner run('" + json.dumps(old_options[option]) + "' != '" + json.dumps(config[option]) + "' ), forcing recreation of json files", 3)
					else:
						message("PRE options", "'" + option + "' has changed from previous scanner run, forcing recreation of json files", 3)
					break
			except KeyError:
				if config[option] != default_value:
					config['recreate_json_files'] = True
					message("PRE options", "'" + option + "' wasn't set on previous scanner run and hasn't the default value, forcing recreation of json files", 3)
					break
				else:
					message("PRE options", "'" + option + "' wasn't set on previous scanner run, but has the default value, not forcing recreation of json files", 3)

	except IOError:
		message("PRE options", "unexisting options.json file, forcing recreation of everything", 3)
		config['recreate_reduced_photos'] = True
		config['recreate_transcoded_videos'] = True
		config['recreate_thumbnails'] = True
		config['recreate_jpg'] = True
		config['recreate_webp'] = True
		config['recreate_png'] = True
		config['recreate_json_files'] = True

	config['reduced_sizes'].sort(reverse=True)
	# image size must be > 200 and ~ 1200x630, https://kaydee.net/blog/open-graph-image/
	config['reduced_size_for_videos'] = 1200
