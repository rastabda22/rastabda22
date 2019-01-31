#!/usr/bin/env python2
# -*- coding: utf-8 -*-

import sys
import os

# @python2
# Builtins removed in Python3
try:
	from imp import reload
except ImportError:
	pass

from TreeWalker import TreeWalker
from Utilities import report_times, message
import Options


def main():
	# @python2
	if sys.version_info < (3,):
		reload(sys)
		sys.setdefaultencoding("UTF-8")
	if len(sys.argv) != 3 and len(sys.argv) != 2:
		print("usage: {0} ALBUM_PATH CACHE_PATH - or {1} CONFIG_FILE".format(sys.argv[0], sys.argv[0]))
		return

	Options.initialize_opencv()
	Options.get_options()

	try:
		# @python2
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

		# @python2
		if sys.version_info >= (3, 4):
			if Options.config['debug_profile']:
				Debug.profile_stop()
			if Options.config['debug_memory']:
				snapshot = Debug.memory_stop()
				Debug.memory_dump(snapshot, key_type='lineno', limit=30)
			if Options.config['debug_profile']:
				Debug.profile_dump(cumulative=False)
			
		message("    The end!    ", "", 3)
	except KeyboardInterrupt:
		message("keyboard", "CTRL+C pressed, quitting.")
		sys.exit(-97)


if __name__ == "__main__":
	main()
