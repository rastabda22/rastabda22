# -*- coding: utf-8 -*-

import os
import subprocess
from Utilities import message, indented_message, next_level, back_level

class VideoToolWrapper(object):
	def __init__(self):
		self.wrappers = []
		self.check_output = False
		self.cleanup = True


	def call(self, *args):
		path = args[-1]
		for tool in self.wrappers:
			try:
				next_level()
				message("Trying video command", tool + " " + str(args), 5)
				if self.check_output:
					returncode = subprocess.check_output((tool, ) + args)
				else:
					returncode = subprocess.call((tool, ) + args)
					back_level()
					if returncode > 0:
						indented_message("Return code", "no luck :-(", 5)
						return False
					else:
						indented_message("Return code", "success!", 5)
						return "SUCCESS"
			except KeyboardInterrupt:
				if self.cleanup:
					VideoToolWrapper.remove(path)
				raise
			except OSError:
				back_level()
				continue
			except subprocess.CalledProcessError:
				if self.cleanup:
					VideoToolWrapper.remove(path)
				back_level()
				continue
			back_level()
			return returncode
		return False


	@staticmethod
	def remove(path):
		try:
			os.unlink(path)
		except OSError:
			pass


class VideoTranscodeWrapper(VideoToolWrapper):
	def __init__(self):
		VideoToolWrapper.__init__(self)
		self.wrappers = ['avconv', 'ffmpeg']
		self.check_output = False
		self.cleanup = True


class VideoProbeWrapper(VideoToolWrapper):
	def __init__(self):
		VideoToolWrapper.__init__(self)
		self.wrappers = ['avprobe', 'ffprobe']
		self.check_output = True
		self.cleanup = False
