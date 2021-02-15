* make description and other elements darker on hover
* use caps as first letter in ui submenu
* trim correction of element positions
* bug fixes

### version v4.9.37 (Feb 13, 2021)

* do not show file name in album view if there is a description title, and show it in the media metadata
* make arrowDown and PageDown go to album like arrowUp and PageUp
* fullscreen has been simplified and now includes everything
* bug fixes

### version v4.9.36 (Feb 5, 2021)

* new option `use_system_js_libraries` to use OS javascript libraries instead of the versions provided by MyPhotoShare. Default: use MyPhotoShare versions
* select and map buttons are now less invasive
* add message for when ui options are reset
* bug fixes

### version v4.9.35 (Feb 5, 2021)

* change order in ui options
* add menu entry for resetting ui options
* bug fixes

### version v4.9.34 (Feb 4, 2021)

* refreshing of subalbums/media is now performed only when strictly needed
* display menu entries now are more coherent, all are show- instead of hide-
* cookies now have a 10-years duration
* added border to subalbums in no-slide mode
* code managing subalbums thumbnails has been simplified
* color options are now respected better
* bug fixes

### version v4.9.33 (Feb 3, 2021)

* added `album_name_color` and `album_slide_name_color` option
* `title_image_name_color` option changed to `media_name_color` for consistency sake
* `album_button_background_color` option changed to `album_slide_background_color` for consistency sake
* `slide_album_caption_color` option changed to `album_slide_caption_color` for consistency sake
* bug fixes
* do not show menu entries for description and tags if not needed

### version v4.9.32 (Feb 2, 2021)

* show a better message when options.json isn't there
* leave the menu closed by default
* close the right menu when auth dialog is shown
* activate pinterest button by default
* separate showSubalbums function
* bug fixes

### version v4.9.31 (Jan 26, 2021)

* description show/hide button is now in the bottom part of the description, so that it can be clicked multiple times without moving the mouse
* bug fixes
* css trims

### version v4.9.30 (Jan 24, 2021)

* css trims
* bug fixes

### version v4.9.29 (Jan 22, 2021)

* the description box has now a show/hide button
* bug fixes
* css trims

### version v4.9.28 (Jan 20, 2021)

* bug fixes
* css trims

### version v4.9.27 (Jan 19, 2021)

* bug fixes

### version v4.9.26 (Jan 18, 2021)

* shortcuts are now customizable by language in translation file
* leaflet updated to 1.7.1
* bug fixes

### version v4.9.25 (Jan 17, 2021)

* optimized fetching of albums in searches
* jquery and jquery.touchSwipe updated
* bug fixes

### version v4.9.24 (Jan 16, 2021)

* searching in popup refines the media in it
* updated italian and spanish stopwords removing many of them
* menu tweaks
* bug fixes

### version v4.9.23 (Jan 13, 2021)

* many ui trims
* `make_album_ini` now manages in a better way old album.ini files
* bug fixes

### version v4.9.22 (Jan 12, 2021)

* better managing of album.ini
* make multi-word-with-dash tags work
* documentation improved
* css trimmings
* select box has been moved from right to left bottom position
* shortcut _h_ is managed in a better way
* multi-word and non-letter tags are managed correctly
* bug fixes
* french translation updated

### version v4.9.21 (Jan 10, 2021)

* search by tag now works even if tag contains spaces
* in search albums, make the random media link go to a hash below the search album
* bug fixes

### version v4.9.20 (Jan 8, 2021)

* now album and media in searches/popup/selections show their ancestors
* align media in popup centered
* make popup background dark
* bug fixes

### version v4.9.19 (Jan 7, 2021)

* bug fixes

### version v4.9.18 (Jan 6, 2021)

* media are now created by the same function in regular albums and in popups
* descriptions and tags are shown (and possibly hidden) in popup too
* support for auto-tagging extensions
* css tweaks
* ui menu entry names and sorting reorganized
* bug fixes

### version v4.9.17 (Jan 4, 2021)

* in searches, treat all non-letter characters as spaces
* do not consider (0, 0) coordinates (they are in offshore in the Atlantic Ocean)
* bug fixes

### version v4.9.16 (Jan 3, 2021)

* bug fixes

### version v4.9.15 (Jan 3, 2021)

* fixed downloading: only one copy of every media
* fixed addition of subalbum to selection
* bug fixes

### version v4.9.14 (Jan 2, 2021)

* fix bugs

### version v4.9.13 (Jan 2, 2021)

* refine description position
* reduce description to one line in subalbums and media thumbnails: the whole description is avaiilable as a tooltip
* css refinement in album view no slide
* album/media title is now used everywhere the name was displayed

### version v4.9.12 (Jan 1, 2021)

* use metadata titles in zip filename and in top title too
* add options `hide_descriptions` (default false) and `hide_tags` (default true) in options file; in js code descriptions and tags can now be shown/hidden separately
* fix search by tag
* bug fixes

### version v4.9.11 (Dec 29, 2020)

* a message is presented during slow operations
* every tag has link to a search to all content with that tag
* add control to hide descriptions and tags
* if present, show media description below its name/title in album view
* if present, use media title instead of media name
* add search option: restrict the search to tags

### version v4.9.10 (Dec 28, 2020)

* fix deselection shortcut and add menu entries to deselect subalbums/media
* add a cache that avoids requesting inexistent files more than once
* changed shortcut for hiding title, bottom thumbnails and description: from TAB to "h"
* album view: add tags to subalbums and media
* media view: reposition description and add tags
* bug fixes

### version v4.9.9 (Dec 27, 2020)

* add indexing of title, description and tags in root folder
* correctly detect when protected content must be added
* do not accept the same password twice
* bug fixes

### version v4.9.8 (Dec 17, 2020)

* the download script now informs the user about what is doing and the corresponding percent of work done
* bug fix in scanner when using PIL

### version v4.9.7 (Dec 16, 2020)

* bug fixes

### version v4.9.6 (Dec 14, 2020)

* show videos' on map (with gps data from album.ini)
* bug fixes

### version v4.9.5 (Dec 13, 2020)

* bug fixes

### version v4.9.4 (Dec 13, 2020)

* fixed sorting procedure
* other bug fixes
* replace `uglifyjs` minifier by `uglifyjs.terser` (pmetras)

### version v4.9.3 (Dec 11, 2020)

* fixed bugs in reading image exif metadata, only exiftool was reading them correctly
* changed default sorting of albums and media, now they are sorted by name not reverse

### version v4.9.2 (Dec 10, 2020)

* many bug fixes
* implemented python albums and media sortings

### version v4.9.1 (Dec 10, 2020)

* many bug fixes
* updated french translation
* execution of js code optimized removing multiple loading of albums
* js code convertion to OOP continued
* scanner: fragmentation of gps albums clustering has been reduced

### version v4.9.0 (Dec 1st, 2020)

* many bug fixes
* global variables are now properties of a global class
* middle click now preserves map album, selection, and unveiled passwords (requires `php`)
* a media cache has been implementation, so that the same object is used for the same image/video across the various albums where it is present
* js code mainly converted to OOP
* numMediaInSubTree and numMedia album properties have been changed to numsMediaInSubTree and numsMedia (json files will be regenerated)
* media and albums can now be selected, and the resulting selection can be viewed, browsed and saved, as for the other albums
  * new option `by_selection_string` for albums built from selection
* menu refinements in download section
* searching when in a map popup now refines the popup content
* media and album captions from `album.ini` file are now separate from metadata; a menu option to hide them has been added
* new option `excluded_patterns_file`: specifies a file whose lines are file patterns (regexes) to ignore when scanning
* the authentication dialog now allows the user to send an email that requests the protected content password (please set the `request_password_email`)
  * new option `request_password_email`: the email address which the requested for the password will be sent to

### version v4.1.0 (Nov 29, 2019)

* give the user the chance to download the album, either with or without its subalbums; download can include everything, or images only, or videos only
* added 3-9 pinch by shortcut
* generation of composite images has been disabled, because it mixed protected and unprotected images
* many bug fixes

### version v4.0.4 (Nov 11, 2019)

* simplify and fix menu behaviour
* fixed image zoom
* zoom now has no limit

### version v4.0.3 (Oct 16, 2019)

* fix authentication dialog appearing when has was the void string
* show search options when and only when search field has focus

### version v4.0.2 (Oct 14, 2019)

* fix incorrect tooltip for album searched in
* better managing of dimmed menu entries

### version v4.0.1 (Oct 14, 2019)

* fixed js bugs in title

### version v4.0.0 (Oct 13, 2019)

* fixed bug with map size
* fixed bug with album not scrollable
* shortcut are now case insensitive

### version v4.0RC5 (Oct 11, 2019)

* fixed bug with albums already in cache

### version v4.0RC4 (Oct 11, 2019)

* bug fixes: in search albums
* popups now have correct width/height
* correct menu entries visibility

### version v4.0RC1 (Oct 9, 2019)

* scanner now reports unrecognized file with their mime types
* when an album has many (according to the corresponding new options) media/positions, they are saved to a separate json file
  * new option: `max_media_in_json_file`
  * new option: `max_media_from_positions_in_json_file`
* `python3` is now used in scanner
* `python3-magic` is used to detect file types
* albums and media can be protected with passwords: protected content isn't exposed in the album tree or the cache
  * new option: `passwords_file`: a file which is read when the options file is read, it defines the passwords and their respective identifiers
  * new option: `passwords_marker`: the name of the files to put in the albums tree in order to specify the passwords for albums and files
    * directory and file names can be matched case sensitive/insentitive, whole name/part of it
  * new option: `passwords_subdir`: the cache subdir where the passwords files are written
  * new shortcut `u` to unveil protected content
  * new option `protected_directories_prefix`: the prefix for the protected json files directories
* new right menu entry: runs an authentication dialog to unveil the protected content; a padlock left to the right menu is shown too
* when showing a map album, `esc` takes back to the map and the popup
* right menu: bug fixes and better ordering of the options
* right menu: new entry that permits to unveil protected content
* right menu is now of accordion type in order to be always visible on mobile screens

### version v3.8.2 (May 6, 2019)

* media shown in map popup are now albums, and can be sorted like regular albums
* new shortcuts for changing sort of albums (`[` - `]`) and media (`{` - `}`), in a rotative way: name -> name reverse -> date reverse - date
* more javascript messages for potentially slow loading

### version v3.8.1 (April 29, 2019)

* fixed bug with spurious text seen on mobile when loading
* fixed map size on both pc and mobile (with css _modal_)
* fixed bug with lazy load not working in bottom thumbnails
* new option 'copy_exif_into_reductions' (defaults to _false_) in order to permit copying all the exif metadata (and particularly the copyright info) to every reductions/thumbnails
* new shortcut `<`/`>` for rotating among browsing modes: folders -> by date -> by gps -> by map -> by search
* json files size has been slightly reduced removing unnecessary properties or property parts
* permit scrolling bottom thumbnails with mouse wheel

### version v3.8 (March 4, 2019)

* images collected by map clicks can now be shown as an album and browsed
* bug fixes

### version v3.7 (March 2, 2019)

* new option `by_map_string` for albums built from map popup
* the popup is now positioned in an average point among all the points that contribute their photos to the popup
* bug fixes
* lazy loader changed to jquery.lazy: it permits defining post-load actions

### version v3.7rc1 (February 24, 2019)

* the user can now choose to show big virtual albums
* markers in the map are now clustered
* single point markers have the photo number inside them like cluster markers

### version 3.7beta4 (February 14, 2019)

* bug fixes in searches
* fixed map not showing in mobile
* javascript now knows the stop words and takes them into account

### version 3.7beta3 (February 2, 2019)

* A position icon is added to album titles: opens an Leaflet map with the markers for all the media in the album and subalbums
* The markers are clickable and they show the clickable thumbnails for that position
* The Leaflet map is used for the single media too
* All the subalbum names in album view have the position icon that opens the Leaflet map
* Removed unnecessary options:
  * `map_service`: the js app doesn't use any more those external tools
  * `map_zoom_levels`
 * Option`photo_map_zoom_level` removed and replaced by `photo_map_size`: size in meters of the map for a single photo
 * New option `default_map_popup_position`
 * More photos can be added (with shift-click) and removed (with ctl-click) from the popup
 * Albums' metadata filename specification in config file (album.ini by default) in now used in `make_album_ini.sh`

### version 3.6.7 (January 14, 2019)

* Bug fixes with album.ini file and geolocation
* Non-sense line removed

### version 3.6.6 (January 13, 2019)

* Fixed various bugs
* Completed french translation

### version 3.6.5 (January 9, 2019)

* Fixed bug which caused error with just geotagged photos
* Better messages

### version 3.6.4 (January 2, 2019)

* Better use of mouse wheel when zoom > 1
* New shortcut: tab: toggles title and bottom thumbnails visibility (as in gimp, darktable)
* Scanner code refactored for better speed
* Fixed incorrect count of media
* Fixed desappeared serial number from clusterized places
* Fixed bugs with years < 1000
* Many more bug fixes

### version 3.6.3 (September 14, 2018)

* Bug fixes

### version 3.6.2 (August 20, 2018)

* Now using lazyload jquery plugin for faster page loading
* bug fixes

### version 3.6.1 (August 19, 2018)

* Added keyboard translation when image is zoomed in
* bug fixes

### version 3.6 (August 19, 2018)

* Better swiping: the new image enters while the current one exits
* Added pinching and dragging capabilities, by gestures, by buttons, by keyboard
* Various bug fixes
* Scanner: always save the gps root album so that the absence of media with gps data can be detected without throwing any js error
* Added options `hide_title` and `hide_bottom_thumbnails`, and added correponding menu entries, for a less distracted media vision
* Speed up loading of images
* Better implementation of cache subdirs in md5 mode: a different subdirs schema is used according to the media number, in such a way that no more than 400 files and 256 subdirs are used (see issue #106); when media number is low, a default subdir is used (new option `default_cache_album`)
* new option `use_internal_modernizr` (default _true_): it makes js use the included Modernizr instead of the system one

### version 3.5 (July 15, 2018)

* Search is now performed by default in current folder, a new menu option permits to search in all albums
* Months aren't numeric any more, localized month names are used
* Better captions for date albums
* Root album, the roots of the virtual albums and search results have their counters too at the end of the title line

### version 3.4 (July 6, 2018)

* moved scripts into bin directory. Create `scanner` as a link to `main.py`. Added `make_album_ini.sh`to create a default `album.ini` file in a directory.
* add options `social`, `social_size` and `social_color` for tuning display of social icons.
* modified options names to a more logical naming:
  * default_album_date_reverse_sort -> default_album_reverse_sort
  * default_media_date_reverse_sort -> default_media_reverse_sort
* use Debian/Ubuntu system-wide JavaScript packages if available (you might need to run `sudo a2enconf javascript-common` on the server to enable the use of `/javascript` virtual directory).
* added support for `uglifyjs` JavaScript minifier
* new option `small_square_crops_background_color` for filling the background of small square crops
* bug fixes
* new debug option `show_faces`: lets the scanner show the faces detected (but read the note in `myphotoshare.conf.default`)
* new option `face_cascade_scale_factor`: a parameter of `opencv`'s `detectMultiScale` function that detects the faces in the photo
* UI cleaned putting sort and view switches to a hidden top right menu
* user can toggle album slide mode, thumbnails spacing, thumbnails types, show album and media names, show media count, all with right top corner menu
* the scanner manages more precisely certain option changes that require regenerating of `json` files, reduced size images, thumbnails
* new option `slide_album_caption_color`: the color to use with album slide mode
* implemented search function: media and albums can be searched by file name, title, description, tags; search may be whole word or inside words, considering accents and capitals or not; search works with non-latin languages (e.g. oriental languages) too, but whole word searches will possibly give no result; stop words can be used in order reduce words bloat
  * new option `by_search_string`: the string used for search albums
  * new option `search_options_separator`: the character used for separating search options from search string in URIs
  * new option `max_search_album_number`: the maximum number of search album that will be loaded
  * new option `use_stop_words`: whether to use stop words when generating the search albums
* removed `server_album_path` option and hard coded it to `albums`
* removed options `respected_processors` and substituded by `num_processors` option, defaults to 1: better for the user, does not oblige to set the value
* reorganization of documentation:
  * creation of `doc` and `doc/img` folders
  * `README.md` split into individual files
  * explained how to use advanced features like geonames or face detection
  * created a gallery of screenshots
* reduced images and thumbnail naming schema is now more robust
  * cache files names are now made of only lower case ascii characters
* now photo metadata are read with three tools:
  * `Pillow's \_getexif()`, heritage of photofloat: good, but doesn't read the metadata of some old image
  * `exifread`: good tool, but crashes with some image which has exif data corrupted
  * `pyexiftool`, an `exiftool` wrapper: the most affordable, but the slowest
  The preference order for the tools is managed by the new option `metadata_tools_preference`

### version 3.3 (January 22, 2018)

* new option `get_geonames_online`, if true, get country, state, place names from geonames.org (online), otherwise get it from the files in scanner/geonames/cities1000.txt (names are in english)
* clustering of places with too many photos is done now by the k-means algorithm
* added options `js_minifier` and `css_minifier` to specify what minifier to use: web services or local ones
* removed `thumbnail_generation_mode` option: only cascade method is left, parallel and mixed methods are removed
* option `show_media_names_below_thumbs_in_albums` changed to `show_media_names_below_thumbs`
* new option `show_album_names_below_thumbs`: decides whether to show the album name in album thumbnails
* new option `show_media_count`: decides whether to show the media count in album thumbnail and title
* cropping to square takes now into account faces if opencv and python3-opencv are installed
* scanner code for producing the thumbnails was optimized
* default options give now a light UI

### version 3.2 (January 7, 2018)

* Added `debug_css` and `debug_js` options for debugging (thanks to pmetras)
* Added french translations (thanks to pmetras)
* Bug fixes by pmetras
* Fixed unnecessary exposure of paths (thanks pmetras for reporting it)

### version 3.1 (December 30, 2017)

 * new option `checksum`: controls whether a checksum should be generated in order to decide if a media file has changed (useful with geotags)
 * better scanner reports
 * bug fixes

### version 3.0 (December 12, 2017):

* Manages photo's gps data and retrieves map names from geonames.org web service: builds a country/region-state/place tree as for dates, and, when a photo has gps metadata permits switching among album, date and place viewed
* - shows place in map
* - place virtual albums are split into various subfolder if they have too many photos inside them
* - new option `map_service`: specify what service is used for showing maps; can be "openstreetmap", "googlemaps", or osmtools; the last allows a marker on the map
* - new option `unspecified_geonames_code`: the code used in gps tree for unspecified admin names (there should be no need to change it)
* - new option `map_zoom_levels`: a 3-values tuple specifying the zoom values to use respectively for country-, admin- and place-level maps
* - new option `photo_map_zoom_level`: the value to use for the map shown with the photos
* - option `big_date_folders_threshold` renamed to `big_virtual_folders_threshold`

### version 2.8 (November 18, 2017):

* better user experience on mobile: show sharper images
* removed option server_cache_path (closes #54), server cache folder is now always "cache":
  if it was previously set to a different value in custom option file, please move it on your server and change web server settings in order to avoid recreation of all the thumbnails

### version 2.7.5 (October 26, 2017):

* added link for direct download of media
* piwik bug fixed

### version 2.7.4 (September 29, 2017):

* various bugs fixed

### version 2.7.3 (September 21, 2017):

* various bugs fixed

### version 2.7.2 (September 16, 2017):

* various bugs fixed

### version 2.7.1 (September 11, 2017):

* fixed php bug in album sharing

### version 2.7 (September 10, 2017):

* fullscreen simulation for devices not implementing fullscreen api
* added sorting by name of subalbums and media
* modified default reverse sorting options, and now they only apply to date sorting (name default sorting is always normal)
* - default_album_reverse_sort -> default_album_date_reverse_sort
* - default_media_reverse_sort -> default_media_date_reverse_sort
* bug fixes

### version 2.6.4 (September 5, 2017):

* fixed sharing of videos
* removed unnecessary parameter when sharing

### version 2.6.3 (September 2, 2017):

* album buttons has now a link to go to random image directly

### version 2.6.2 (September 2, 2017):

* videos: a transparency indicating it's a video is added to thumbnails
* added media count in title
* updated modernizr
* bug fixes

### version 2.6.1 (August 16, 2017):

* added media count to subalbums slides
* only update json files and composite images if needed
* bug fixes

### version 2.6 (August 16, 2017):

* composite images for sharing albums are now generated by scanner (not by php any more);
* new option `cache_album_subdir`: the subdir of cache_path where the album composite images will be saved
* new option `video_crf` for video quality
* new option `follow_symlinks`, defaults to false, set it to true if you want to use symlink directories
* albums and media which have a companion which would have the same cache base are now managed correctly (solves #43, #44)
* date albums with same image in two different folders are now managed correctly (solves #30)
* scanner produced a final time report (useful for trimming the code)
* more speedy (removed unuseful garbage collectors)

### version 2.5 (August 3, 2017):

* project name is now `myphotoshare`
* keyboard navigation: arrows, pageup/down, esc, f (fullscreen), m (metadata)
* added vertical swipe gestures on media (they are mapped on arrow up/down)
* restored cache use in scanner: scanner is now faster on already scanned albums
* implemented verbosity levels, default is now 3 = errors, warnings, walkings
* new option `recreate_fixed_height_thumbnails`: makes the scanner delete wide media fixed height thumbnail, in order to get rid of a previous versions bug which caused these thumbnail be generated blurred. Set it to `true`/`1` and make the scanner work, then reset again it to `false`/`0`

### version 2.4.1 (July 26, 2017):

* do not produce canvas for small images: they are shown in their original size
* two new options: `exclude_files_marker` and `exclude_tree_marker`: when the markers are found in a folder, the media in the folder itself or the whole tree isn't scanned

### version 2.4 (July 24, 2017):

* swipe gesture on mobile to go to next/previous photo/video
* media animation when passing to next/previous image
* simplified html structure and json files
* new option `min_album_thumbnail`: sets how many album thumbnails will fit at least on screen width

### version 2.3 (July 20, 2017):

* social buttons for sharing on facebook, whatsapp (only on mobile), twitter, google+, email
* web page isn't `index.html` any more, it's `index.php`: this way we accomplish various things through php:
* - php can set page title (by reading the options.json file)
* - php can set the `<link rel"..." ...>` tag in <head></head>, which permits facebook and google+ to show the image when sharing a photo or a video: when sharing an album, php builds an image made of n x n thumbnail (in order to get that, album-size square thumbnails are always generated by python scanner)
* new options `max_album_share_thumbnails_number`: how many thumbnails will be used at most when creating the composite image for sharing albums

### version 2.2 (July 15, 2017):

* translations are now managed via a separate js file: enthusiasts and followers are encouraged to provide the translation for their language
* better managing of errors
* separated albums and media sorting
* - default_album_reverse_sort (boolean) sets default sorting for albums
* - default_media_reverse_sort (boolean) sets default sorting for images/video
* separate managing of album and media thumbnails
* - albums thumbs can have square (classic behaviour) or fit (rectangular thumbnail) type, according to new album_thumb_type option
* - images/video thumbs can have square (classic behaviour) or fixed height (rectangular thumbnail) type, according to new media_thumb_type option
* more new options:
* - big_date_folders_threshold: doesn't make thumbnails show for date albums too big
* - albums_slide_style (boolean): albums are shown in a simple way or with slide style
* removed options:
* - different_album_thumbnails
* buttons appearing on mouse over are shown persistently on mobile
* landscape photos are shown vertically centered
* if the window is resized, the reduced size image shown is changed according to window size, so that it never shows blurred
* videos now works perfectly in fullscreen mode
* new option `respected_processors`: tells the scanner how many processor not to use

### version 2.1.1 (July 6, 2017):

* new options:
* - persistent_metadata (boolean): permits to have metadata shown persistently on image
* - album_button_background_color
* - album_caption_color

### version 2.1 (July 6, 2017):

* Images and directories can be sorted ascending/descending (via a cookie)

### version 2.0 (July 4, 2017):

* A date tree is builded, permitting photo to be seen by year, month, date
* When a photo is viewed, the user can switch between the folder and the date the photo was taken
* Better error management: if folder is wrong, show root folder; if image is wrong, show album
* In addition to former invocation (with albums and cache paths), `myphotoshare` can be invoked with one parameter: the customization file, which adds many configuration variables;
* web site appearance now is very customizable:
* - choose between cascade, parallel and mixed thumbnails generation
* - fhoose between putting thumbnails in cache dir or in subdir, by 2-letters, from folder md5 or beginning of folder
* - thumbnail can be spaced
* - album thumbnails can be showed different from images ones
* - jpeg quality can be set
* - 3 different thumbnail types: square (photofloat's classical), fixed_height (the size determines the height, the width will depend on orientation), canvas (square thumbnail containing the whole image)
* - page title, font sizes, colors and background colors can be customized
* - photo names can be shown below thumbnails when showing an album
* - initial language support
* - albums and cache server folders can be anywhere, even on another server (obviously, they will be generated on a pc and then uploaded wherever)
* (to do) share buttons

### version by Joachim (2015):

* generate minified css and js through external api
* parallel thumbnail generation

### version by Jerome (2013):

* manage videos

### initial features by Jason (2012):

* Animations to make the interface feel nice
* Separate album view and photo view
* Album metadata pre-fetching
* Photo pre-loading
* Recursive async randomized tree walking album thumbnail algorithm
* Smooth up and down scaling
* Mouse-wheel support
* Metadata display
* Consistent hash url format
* Linkable states via ajax urls
* Static rendering for googlebot conforming to the AJAX crawling spec.
* Facebook meta tags for thumbnail and post type
* Link to original images (can be turned off)
* Optional Google Analytics integration
* Optional server-side authentication support
* A thousand other tweaks here and there...
