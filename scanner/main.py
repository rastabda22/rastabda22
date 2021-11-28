#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from datetime import datetime
import sys
import argparse
import os
import shutil

# # @python2
# # Builtins removed in Python3
# try:
# 	from imp import reload
# except ImportError:
# 	pass

import Options
from Utilities import report_times, message, indented_message, next_level, back_level


def main():
	parser = argparse.ArgumentParser(
		description='Scan a media tree in order to generate cache files suitable for showing a beautiful web gallery',
	)
	parser.add_argument(
		"option_file",
		nargs='?',
		help="the config file"
	)
	parser.add_argument(
		"-w",
		"--web-root-path",
		dest="web_root_path",
		help="the full root path; it's supposed to have 'albums' and 'cache' directories inside it; supersedes the value in the options file"
	)
	parser.add_argument(
		"-a",
		"--album-path",
		dest="album_path",
		help="the full album path; supersedes the value in the options file"
	)
	parser.add_argument(
		"-c",
		"--cache-path",
		dest="cache_path",
		help="the full cache path; supersedes the value in the options file"
	)
	parser.add_argument(
		"--version",
		action="version",
		version='%(prog)s v5.5.0'
	)
	args = parser.parse_args()

	if (not args.option_file and not args.web_root_path):
		print("FATAL ERROR: either the options file or the web_root_path parameter must be given")
		print()
		parser.print_help()
		sys.exit(-97)


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
		TreeWalker()
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
