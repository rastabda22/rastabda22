#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import argparse
import os

# # @python2
# # Builtins removed in Python3
# try:
# 	from imp import reload
# except ImportError:
# 	pass

import Options
from Utilities import report_times, message, next_level, back_level


def main():
	parser = argparse.ArgumentParser(
		description='Scan a media tree in order to generate cache files suitable for showing a beautiful web gallery',
	)
	parser.add_argument(
		"config_file_or_album_path",
		help="the config file, if it's the only positional argument, or the album path, if two positional arguments are supplied"
	)
	parser.add_argument(
		"cache_path",
		nargs="?",
		default="",
		help="the cache path, if two positional arguments are supplied; otherwise, nothing"
	)
	parser.add_argument(
		"-s",
		"--periodic-save",
		nargs="?",
		type=int,
		const=1,
		default=-1,
		dest="periodic_save",
		metavar="MINUTES",
		help="runs the scanner in a more robust way, saving json files every X minutes, where X is the value given, or 60 if no value is given"
	)
	parser.add_argument("--version", action="version", version='%(prog)s v5.3.10')
	args = parser.parse_args()

	Options.get_options(args)

	from TreeWalker import TreeWalker

	try:
		if sys.version_info >= (3, 4):
			if Options.config['debug_memory']:
				# Import the Debug module only if debugging is enabled
				import Debug
				Debug.memory_start()
			if Options.config['debug_profile']:
				import Debug
				Debug.profile_start()

		os.umask(0o02)

		if Options.config['repeat_if_timeout']:
			message("Safe mode, begin", "every " + str(Options.config['max_scanner_duration']) + " minutes all the json files are saved and scanning begins again", 3)
			next_level()
		count = 1

		repeat = True
		while repeat:
			TreeWalker()
			if not Options.config['repeat_if_timeout'] or not Options.timeout:
				repeat = False
			else:
				back_level()
				message("Safe mode, end of pass", "This was pass " + str(count), 3)
				count += 1
				message("Safe mode, begin of new pass", "This is pass " + str(count), 3)
				next_level()

		back_level()
		if Options.config['repeat_if_timeout']:
			back_level()
			message("Safe mode, end of last pass", "This was pass " + str(count), 3)

		report_times(True)

		if sys.version_info >= (3, 4):
			if Options.config['debug_profile']:
				Debug.profile_stop()
			if Options.config['debug_memory']:
				snapshot = Debug.memory_stop()
				Debug.memory_dump(snapshot, key_type='lineno', limit=30)
			if Options.config['debug_profile']:
				Debug.profile_dump(cumulative=False)

		message("    The end!    ", "", 1)
	except KeyboardInterrupt:
		message("keyboard", "CTRL+C pressed, quitting.")
		sys.exit(-97)


if __name__ == "__main__":
	main()
