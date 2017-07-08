#!/usr/bin/env python2

from TreeWalker import TreeWalker
from CachePath import message, next_level, back_level
import sys
import os
import os.path
import ConfigParser
import Options
import json

def main():
	reload(sys)
	sys.setdefaultencoding("UTF-8")
	if len(sys.argv) != 3 and len(sys.argv) != 2:
		print "usage: %s ALBUM_PATH CACHE_PATH - or %s CONFIG_FILE" % (sys.argv[0], sys.argv[0])
		return
	
	project_dir = os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), "..")
	default_config_file = os.path.join(project_dir, "photofloat.conf.defaults")
	default_config = ConfigParser.ConfigParser()
	default_config.readfp(open(default_config_file))
	usr_config = ConfigParser.ConfigParser()
	usr_config.add_section("options")
	for option in default_config.options('options'):
		usr_config.set("options", option, default_config.get("options", option))
	
	if len(sys.argv) == 2:
		# 1 arguments: the config files
		# which modifies the default options
		usr_config.readfp(open(sys.argv[1]))
	else:
		usr_config.set('options', 'album_path', sys.argv[1])
		usr_config.set('options', 'cache_path', sys.argv[2])

	message("Options", "asterisk denotes options changed by config file")
	next_level()
	# pass config values to a dict, because ConfigParser objects are not reliable
	for option in default_config.options('options'):
		if option in ('max_verbose', 'jpeg_quality', 'thumb_spacing', 'album_thumb_size', 'media_thumb_size', 'big_date_folders_threshold'):
			Options.config[option] = usr_config.getint('options', option)
		elif option in ('different_album_thumbnails',
				'show_media_names_below_thumbs_in_albums',
				'persistent_metadata',
				'default_album_reverse_sort',
				'default_media_reverse_sort'):
			Options.config[option] = usr_config.getboolean('options', option)
		elif option in ('reduced_sizes'):
			Options.config[option] = eval(usr_config.get('options', option))
		else:
			Options.config[option] = usr_config.get('options', option)
		option_value = str(Options.config[option])
		option_length = len(option_value)
		max_length = 40
		spaces = ""
		for i in range(max_length - option_length):
			spaces += " "
		max_spaces = ""
		for i in range(max_length):
			max_spaces += " "
		
		default_option_value = str(default_config.get('options', option))
		default_option_length = len(default_option_value)
		default_spaces = ""
		for i in range(max_length - default_option_length - 2):
			default_spaces += " "
		if default_config.get('options', option) == usr_config.get('options', option):
			option_value = "  " + option_value + spaces + "[DEFAULT" + max_spaces + "]"
		else:
			option_value = "* " + option_value + spaces + "[DEFAULT: " + default_option_value + default_spaces + "]"
		
		message(option, option_value)
	# values that have type != string
	back_level()

	if not Options.config['index_html_path'] and not Options.config['album_path'] and not Options.config['cache_path']:
		message("options", "at least index_html_path or both album_path and cache_path must be given, quitting")
		sys.exit(-97)
	elif Options.config['index_html_path'] and not Options.config['album_path'] and not Options.config['cache_path']:
		message("options", "on index_html_path is given, using its subfolder 'albums' for album_path and 'cache' for cache_path")
		Options.config['album_path'] = os.path.join(Options.config['index_html_path'], "albums")
		Options.config['cache_path'] = os.path.join(Options.config['index_html_path'], "cache")
	elif (not Options.config['index_html_path'] and
			Options.config['album_path'] and
			Options.config['cache_path'] and
			Options.config['album_path'][:Options.config['album_path']
				.rfind("/")] == Options.config['cache_path'][:Options.config['album_path'].rfind("/")]):
		album_path = Options.config['album_path']
		album_base = album_path[:album_path.rfind("/")]
		Options.config['index_html_path'] = album_base

	json_options_file = os.path.join(Options.config['index_html_path'], 'options.json')
	try:
		with open(json_options_file) as old_options_file:
			old_options = json.load(old_options_file)
	except IOError:
		json_options_file = os.path.join(Options.config['index_html_path'], "cache/options.json")
		try:
			with open(json_options_file) as old_options_file:
				old_options = json.load(old_options_file)
		except IOError:
			old_options = Options.config
	
	Options.config['recreate_reduced_photos'] = False
	try:
		if (
			old_options['jpeg_quality'] != Options.config['jpeg_quality']
		):
			Options.config['recreate_reduced_photos'] = True
	except KeyError:
		Options.config['recreate_reduced_photos'] = False
	Options.config['recreate_thumbnails'] = False
	try:
		if (
			old_options['jpeg_quality'] != Options.config['jpeg_quality'] or
			old_options['media_thumb_type'] != Options.config['media_thumb_type'] or
			old_options['album_button_canvas_background_color'] != Options.config['album_button_canvas_background_color']
		):
			Options.config['recreate_thumbnails'] = True
	except KeyError:
		Options.config['recreate_thumbnails'] = True
	Options.config['retranscode_videos'] = False
	try:
		if str(old_options['video_transcode_bitrate']) != str(Options.config['video_transcode_bitrate']):
			Options.config['retranscode_videos'] = True
	except KeyError:
		Options.config['retranscode_videos'] = False

	try:
		os.umask(002)
		message("Browsing", "start!")
		TreeWalker(Options.config['album_path'], Options.config['cache_path'])
	except KeyboardInterrupt:
		message("keyboard", "CTRL+C pressed, quitting.")
		sys.exit(-97)
	

if __name__ == "__main__":
	main()
