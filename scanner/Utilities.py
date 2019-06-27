# -*- coding: utf-8 -*-
# do not remove previous line: it's not a comment!

# @python2
from __future__ import print_function
from __future__ import division

from datetime import datetime
import os
import json

import Options

def file_mtime(path):
	return datetime.fromtimestamp(int(os.path.getmtime(path)))

def report_mem():
	print("MEM total, code, data >>>> " + os.popen("ps -p " + str(os.getpid()) + " -o rss,trs,drs|grep -v DRS").read())

def make_dir(absolute_path, message_part):
	# makes a subdir and manages errors
	relative_path = absolute_path[len(Options.config['index_html_path']) + 1:]
	if not os.path.exists(absolute_path):
		try:
			message("creating " + message_part, "", 5)
			os.makedirs(absolute_path)
			indented_message(message_part + " created", relative_path, 4)
			os.chmod(absolute_path, 0o777)
			message("permissions set", "", 5)
		except OSError:
			message("FATAL ERROR", "couldn't create " + message_part, "('" + relative_path + "')' quitting", 0)
			sys.exit(-97)
	else:
		message(message_part + " already existent, not creating it", relative_path, 5)

def next_file_name(file_name_with_path):
	file_name_with_path_list = file_name_with_path.split('.')
	file_name = os.path.basename(file_name_with_path)
	file_name_list = file_name.split('.')
	is_positions = (file_name_list[-2] == 'positions')
	if is_positions:
		subtract = 1
	else:
		subtract = 0
	has_already_number_inside = (len(file_name_list) == 3 + subtract)
	if has_already_number_inside:
		next_number = int(file_name_list[-2 - subtract]) + 1
	else:
		next_number = 1
	if has_already_number_inside:
		first_part = file_name_with_path_list[:-2 - subtract]
	else:
		first_part = file_name_with_path_list[:-1 - subtract]
	return '.'.join(first_part + [str(next_number)] + file_name_list[-1 - subtract:])

def json_files_and_mtime(cache_base):
	json_file_list = []
	global_mtime = None
	json_file_with_path = os.path.join(Options.config['cache_path'], cache_base) + ".json"
	if os.path.exists(json_file_with_path):
		json_file_list.append(json_file_with_path)
		global_mtime = file_mtime(json_file_with_path)

	for md5 in [identifier_and_password['password_md5'] for identifier_and_password in Options.identifiers_and_passwords]:
		protected_json_file_with_path = os.path.join(Options.config['cache_path'], Options.config['protected_directories_prefix'] + md5, cache_base) + ".json"
		while os.path.exists(protected_json_file_with_path):
			if not os.path.islink(protected_json_file_with_path):
				json_file_list.append(protected_json_file_with_path)
				mtime = file_mtime(protected_json_file_with_path)
				if global_mtime is None:
					global_mtime = mtime
				else:
					global_mtime = max(global_mtime, mtime)
			protected_json_file_with_path = next_file_name(protected_json_file_with_path)

	return [json_file_list, global_mtime]

def convert_md5s_to_codes(passwords_md5):
	codes_set = set()
	for password_md5 in passwords_md5.split('-'):
		password_code = next(identifier_and_password['password_code'] for identifier_and_password in Options.identifiers_and_passwords if identifier_and_password['password_md5'] == password_md5)
		codes_set.add(password_code)
	return '-'.join(codes_set)


def convert_identifiers_set_to_md5s_set(identifiers_set):
	md5s_set = set()
	for identifier in identifiers_set:
		try:
			md5 = next(identifier_and_password['password_md5'] for identifier_and_password in Options.identifiers_and_passwords if identifier_and_password['identifier'] == identifier)
			md5s_set.add(md5)
		except StopIteration:
			# the identifier was u''
			pass
	return md5s_set

def convert_identifiers_set_to_codes_set(identifiers_set):
	codes_set = set()
	for identifier in identifiers_set:
		if identifier != '':
			code = next(identifier_and_password['password_code'] for identifier_and_password in Options.identifiers_and_passwords if identifier_and_password['identifier'] == identifier)
			codes_set.add(code)
	return codes_set

def convert_old_codes_set_to_identifiers_set(codes_set):
	identifiers_set = set()
	for code in codes_set:
		if code != '':
			try:
				md5 = Options.old_password_codes[code]
				identifier = convert_md5s_set_to_identifiers(set([md5]))
				identifiers_set.add(identifier)
			except KeyError:
				return None
	return identifiers_set

def convert_md5s_set_to_identifiers(md5s_set):
	identifiers_set = set()
	for password_md5 in md5s_set:
		identifier = next(identifier_and_password['identifier'] for identifier_and_password in Options.identifiers_and_passwords if identifier_and_password['password_md5'] == password_md5)
		identifiers_set.add(identifier)
	return '-'.join(sorted(identifiers_set))

def save_password_codes():
	# remove the old single password files
	passwords_subdir_with_path = os.path.join(Options.config['cache_path'], Options.config['passwords_subdir'])
	message("Removing old password files...","", 5)
	for password_file in sorted(os.listdir(passwords_subdir_with_path)):
		os.unlink(os.path.join(passwords_subdir_with_path, password_file))
	message("Old password files removed","", 4)

	# create the new single password files
	for md5_and_code in [{'md5': identifier_and_password['password_md5'], 'code': identifier_and_password['password_code']} for identifier_and_password in Options.identifiers_and_passwords]:
		password_md5 = md5_and_code['md5']
		password_code = md5_and_code['code']
		message("creating new password file", "", 5)
		with open(os.path.join(passwords_subdir_with_path, password_md5), 'w') as password_file:
			json.dump({"passwordCode": password_code}, password_file)
		indented_message("New password file created", password_md5, 4)


def merge_albums_dictionaries_from_json_files(dict, dict1):
	if dict is None:
		return dict1
		# return add_combination_to_dict(dict1)
	if dict1 is None:
		return dict
		# return add_combination_to_dict(dict)
	old_md5s_set = set()
	for codes in dict['numsProtectedMediaInSubTree']:
		if codes != '':
			for code in codes.split('-'):
				try:
					if len(Options.old_password_codes) > 0 and Options.old_password_codes[code] not in old_md5s_set:
						old_md5s_set.add(Options.old_password_codes[code])
				except KeyError:
					indented_message("not an album cache hit", "key error in password codes", 4)
					return None

	dict['media'].extend(dict1['media'])
	subalbums_cache_bases = [subalbum['cacheBase'] for subalbum in dict['subalbums']]
	dict['subalbums'].extend([subalbum for subalbum in dict1['subalbums'] if subalbum['cacheBase'] not in subalbums_cache_bases])
	for key in dict1['numsProtectedMediaInSubTree']:
		if key not in dict['numsProtectedMediaInSubTree']:
			dict['numsProtectedMediaInSubTree'][key] = 0
		dict['numsProtectedMediaInSubTree'][key] += dict1['numsProtectedMediaInSubTree'][key]
	return dict

def message(category, text, verbose=0):
	"""
	Print a line of logging `text` if the `verbose` level is lower than the verbosity level
	defined in the configuration file. This message is prefixed by the `category` text and
	timing information.

	The format of the log line is
	```
      2220 2018-02-04 17:17:38.517966   |  |--[album saved]     /var/www/html/myphotoshare/cache/_bd-2017-09-24.json
      ^    ^                                   ^                ^
	  |    |                                   |                text
	  |    |                                   indented category
      |    date and time
	  microseconds from last message
	```

	Elapsed time for each category is cumulated and can be printed with `report_times`.

	Verbosity levels:
	- 0 = fatal errors only
	- 1 = add non-fatal errors
	- 2 = add warnings
	- 3 = add info
	- 4 = add more info
	"""

	try:
		message.max_verbose = Options.config['max_verbose']
	except KeyError:
		message.max_verbose = 5
	except AttributeError:
		message.max_verbose = 0

	if verbose <= message.max_verbose:
		if message.level <= 0:
			sep = "  "
		else:
			sep = "--"
		now = datetime.now()
		time_elapsed = now - Options.last_time
		Options.last_time = now
		microseconds = int(time_elapsed.total_seconds() * 1000000)
		if microseconds == 0:
			microseconds = ""
		else:
			try:
				Options.elapsed_times[category] += microseconds
				Options.elapsed_times_counter[category] += 1
			except KeyError:
				Options.elapsed_times[category] = microseconds
				Options.elapsed_times_counter[category] = 1
			_microseconds = str(microseconds)
		print(_microseconds.rjust(9), "%s %s%s[%s]%s%s" % (now.isoformat(' '), max(0, message.level) * "  |", sep, str(category), max(1, (45 - len(str(category)))) * " ", str(text)))


"""
The verbosity level as defined by the user in the configuration file.
"""
message.max_verbose = 0


"""
The identation level printed by the message function.
"""
message.level = 0

def indented_message(category, text, verbose=0):
	next_level()
	message(category, text, verbose)
	back_level()

def next_level(verbose=0):
	"""
	Increase the indentation level of log messages.
	"""
	if verbose <= message.max_verbose:
		message.level += 1


def back_level(verbose=0):
	"""
	Decrease the indentation level of log messages.
	"""
	if verbose <= message.max_verbose:
		message.level -= 1

# find a file in file system, from https://stackoverflow.com/questions/1724693/find-a-file-in-python
def find(name):
	for root, dirnames, files in os.walk('/'):
		dirnames[:] = [dir for dir in dirnames if not os.path.ismount(os.path.join(root, dir))]
		if name in files:
			return os.path.join(root, name)
	return False

def find_in_usr_share(name):
	for root, dirnames, files in os.walk('/usr/share/'):
		dirnames[:] = [dir for dir in dirnames if not os.path.ismount(os.path.join(root, dir))]
		if name in files:
			return os.path.join(root, name)
	return False


def time_totals(time):
	seconds = int(round(time / 1000000))
	if time <= 1800:
		_total_time = str(int(round(time))) + " μs"
	elif time <= 1800000:
		_total_time = str(int(round(time / 1000))) + "    ms"
	else:
		_total_time = str(seconds) + "       s "

	_total_time_m, _total_time_s = divmod(seconds, 60)
	_total_time_h, _total_time_m = divmod(_total_time_m, 60)

	_total_time_hours = str(_total_time_h) + "h " if _total_time_h else ""
	_total_time_minutes = str(_total_time_m) + "m " if _total_time_m else ""
	_total_time_seconds = str(_total_time_s) + "s" if _total_time_m else ""
	_total_time_unfolded = _total_time_hours + _total_time_minutes + _total_time_seconds
	if _total_time_unfolded:
		_total_time_unfolded = "= " + _total_time_unfolded
	return (_total_time, _total_time_unfolded)


def report_times(final):
	"""
	Print a report with the total time spent on each `message()` categories and the number of times
	each category has been called. This report can be considered a poor man's profiler as it cumulates
	the number of times the `message()` function has been called instead of the real excution time of
	the code.
	This report is printed only when tracing level >= 3 and more or less detailed depending on `final`.
	The report includes a section at the end with the number of media processed by type and list the
	albums where media is not geotagged or has no EXIF.
	"""
	# Print report for each album only when tracing level >= 4
	if message.max_verbose < 3:
		return
	if not final and message.max_verbose < 4:
		return

	print()
	print("message".rjust(50) + "total time".rjust(15) + "counter".rjust(15) + "average time".rjust(20))
	print()
	time_till_now = 0
	time_till_now_pre = 0
	time_till_now_browsing = 0
	for category in sorted(Options.elapsed_times, key=Options.elapsed_times.get, reverse=True):
		time = int(round(Options.elapsed_times[category]))
		(_time, _time_unfolded) = time_totals(time)

		if category[0:4] == "PRE ":
			time_till_now_pre += time
		else:
			time_till_now_browsing += time
		time_till_now += time

		counter = str(Options.elapsed_times_counter[category]) + " times"

		average_time = int(Options.elapsed_times[category] / Options.elapsed_times_counter[category])
		if average_time == 0:
			_average_time = ""
		elif average_time <= 1800:
			_average_time = str(average_time) + " μs"
		elif average_time <= 1800000:
			_average_time = str(int(round(average_time / 1000))) + "    ms"
		else:
			_average_time = str(int(round(average_time / 1000000))) + "       s "
		print(category.rjust(50) + _time.rjust(18) + counter.rjust(15) + _average_time.rjust(20))

	(_time_till_now, _time_till_now_unfolded) = time_totals(time_till_now)
	(_time_till_now_pre, _time_till_now_unfolded_pre) = time_totals(time_till_now_pre)
	(_time_till_now_browsing, _time_till_now_unfolded_browsing) = time_totals(time_till_now_browsing)
	print()
	print("time taken till now".rjust(50) + _time_till_now.rjust(18) + "     " + _time_till_now_unfolded)
	num_media = Options.num_video + Options.num_photo

	_num_media = str(num_media)
	# do not print the report if browsing hasn't been done
	if num_media > 0 and Options.config['num_media_in_tree'] > 0:
		# normal run, print final report about photos, videos, geotags, exif dates
		try:
			time_missing = time_till_now_browsing / num_media * Options.config['num_media_in_tree'] - time_till_now_browsing
			if time_missing >= 0:
				(_time_missing, _time_missing_unfolded) = time_totals(time_missing)
				print("total time missing".rjust(50) + _time_missing.rjust(18) + "     " + _time_missing_unfolded)
			time_total = time_till_now + time_missing
			if time_total > 0:
				(_time_total, _time_total_unfolded) = time_totals(time_total)
				print("total time".rjust(50) + _time_total.rjust(18) + "     " + _time_total_unfolded)
		except ZeroDivisionError:
			pass
		print()

		_num_media = str(num_media)
		num_media_processed = Options.num_photo_processed + Options.num_video_processed
		_num_media_processed = str(num_media_processed)
		_num_photo = str(Options.num_photo)
		_num_photo_processed = str(Options.num_photo_processed)
		_num_photo_with_geotags = str(Options.num_photo_with_geotags)
		_num_photo_with_exif_date = str(Options.num_photo_with_exif_date)
		_num_photo_with_exif_date_and_geotags = str(Options.num_photo_with_exif_date_and_geotags)
		_num_photo_with_exif_date_and_without_geotags = str(Options.num_photo_with_exif_date_and_without_geotags)
		_num_photo_without_exif_date_and_with_geotags = str(Options.num_photo_without_exif_date_and_with_geotags)
		_num_photo_without_exif_date_or_geotags = str(Options.num_photo_without_exif_date_or_geotags)
		_num_video = str(Options.num_video)
		_num_video_processed = str(Options.num_video_processed)
		max_digit = len(_num_media)

		media_count_and_time = "Media    " + _num_media.rjust(max_digit) + ' / ' + str(Options.config['num_media_in_tree']) + ' (' + str(int(num_media * 1000 / Options.config['num_media_in_tree']) / 10) + '%)'
		if num_media:
			mean_time = int(time_till_now / 1000000 / num_media * 1000) / 1000
			media_count_and_time += ",      " + str(mean_time) + " s/media"
			mean_speed_sec = int(1 / mean_time * 100) / 100
			media_count_and_time += ",      " + str(mean_speed_sec) + " media/s"
			mean_speed_min = int(1 / mean_time * 60 * 100) / 100
			media_count_and_time += ",      " + str(mean_speed_min) + " media/min"
			mean_speed_hour = int(1 / mean_time * 3600 * 100) / 100
			media_count_and_time += ",      " + str(mean_speed_hour) + " media/hour"

		print(media_count_and_time)
		media_count_and_time = "                  processed " + _num_media_processed.rjust(max_digit)
		if num_media_processed and num_media_processed != num_media:
			media_count_and_time += ",      " + str(int(time_till_now / num_media_processed / 10000) / 100) + " s/processed media"
		print(media_count_and_time)
		print("- Videos " + _num_video.rjust(max_digit))
		print("                  processed " + _num_video_processed.rjust(max_digit))
		print("- Photos " + _num_photo.rjust(max_digit))
		print("                  processed " + _num_photo_processed.rjust(max_digit))

		print("                               + with exif date                    " + _num_photo_with_exif_date.rjust(max_digit))
		print("                               + with geotags                      " + _num_photo_with_geotags.rjust(max_digit))
		print()
		print("                               + with both exif date and geotags   " + _num_photo_with_exif_date_and_geotags.rjust(max_digit))
		if final:
			print()
		print("                               + missing only geotags              " + _num_photo_with_exif_date_and_without_geotags.rjust(max_digit))
		if final:
			for photo in Options.photos_with_exif_date_and_without_geotags:
				print("                                      - " + photo)
			print()
		print("                               + missing only exif date            " + _num_photo_without_exif_date_and_with_geotags.rjust(max_digit))
		if final:
			for photo in Options.photos_without_exif_date_and_with_geotags:
				print("                                      - " + photo)
			print()
		print("                               + missing both exif date or geotags " + _num_photo_without_exif_date_or_geotags.rjust(max_digit))
		if final:
			for photo in Options.photos_without_exif_date_or_geotags:
				print("                                      - " + photo)
			print()
		print()
