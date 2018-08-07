var fullScreenStatus = false;
var currentMedia = null;
var currentAlbum = null;
var nextMedia = null, prevMedia = null;
var windowWidth = $(window).outerWidth();
var windowHeight = $(window).outerHeight();
var Options = {};
var isMobile = {
	Android: function() {
		return navigator.userAgent.match(/Android/i);
	},
	BlackBerry: function() {
		return navigator.userAgent.match(/BlackBerry/i);
	},
	iOS: function() {
		return navigator.userAgent.match(/iPhone|iPad|iPod/i);
	},
	Opera: function() {
		return navigator.userAgent.match(/Opera Mini/i);
	},
	Windows: function() {
		return navigator.userAgent.match(/IEMobile/i);
	},
	any: function() {
		return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
	}
};
// this variable permits to take into account the real mobile device pixels when deciding the size of reduced size image which is going to be loaded
var screenRatio = window.devicePixelRatio || 1;

$(document).ready(function() {

	/*
	 * The display is not yet object oriented. It's procedural code
	 * broken off into functions. It makes use of libphotofloat's
	 * PhotoFloat class for the network and management logic.
	 *
	 * All of this could potentially be object oriented, but presently
	 * it should be pretty readable and sufficient. The only thing to
	 * perhaps change in the future would be to consolidate calls to
	 * jQuery selectors. And perhaps it'd be nice to move variable
	 * declarations to the top, to stress that JavaScript scope is
	 * for an entire function and always hoisted.
	 *
	 * None of the globals here polutes the global scope, as everything
	 * is enclosed in an anonymous function.
	 *
	 */

	/* Globals */

	var currentMediaIndex = -1;
	var previousAlbum = null;
	var previousMedia = null;
	var phFl = new PhotoFloat();
	var util = new Utilities();
	var ps = new PinchSwipe();
	var maxSize;
	var language;
	var numSubAlbumsReady;
	var fromEscKey = false;
	var firstEscKey = true;
	// var nextLink = "", prevLink = "";
	var upLink = "", mediaLink = "";

	// triplicate the #mediaview content in order to swipe the media
	var mediaBoxContainerContent = $("#media-box-container").html();
	$("#media-box-container").prepend(mediaBoxContainerContent.replace('id="center"', 'id="left"'));
	$("#media-box-container").append(mediaBoxContainerContent.replace('id="center"', 'id="right"'));

	// copy the title structure into #media-view
	var titleContent = $("#album-view").children().first().html();
	$("#media-view .media-box#center").prepend(titleContent);
	$("#media-view .media-box#left").prepend(titleContent);
	$("#media-view .media-box#right").prepend(titleContent);

	/* Displays */

	function _t(id) {
		language = getLanguage();
		if (translations[language][id])
			return translations[language][id];
		else
			return translations.en[id];
	}

	function translate() {
		var selector, keyLanguage;

		language = getLanguage();
		for (var key in translations.en) {
			if (translations[language].hasOwnProperty(key) || translations.en.hasOwnProperty(key)) {
				keyLanguage = language;
				if (! translations[language].hasOwnProperty(key))
					keyLanguage = 'en';

				if (key == '.title-string' && document.title.substr(0, 5) != "<?php")
					// don't set page title, php has already set it
					continue;
				selector = $(key);
				if (selector.length) {
					selector.html(translations[keyLanguage][key]);
				}
			}
		}
	}

	function getLanguage() {
		language = "en";
		if (Options.language && translations[Options.language] !== undefined)
			language = Options.language;
		else {
			var userLang = navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage;
			userLang = userLang.split('-')[0];
			if (translations[userLang] !== undefined)
				language = userLang;
		}
		return language;
	}

	function socialButtons() {
		var url, hash, myShareUrl = "";
		var mediaParameter;
		var folders, myShareText, myShareTextAdd;

		if (! isMobile.any()) {
			$(".ssk-whatsapp").hide();
		} else {
			// with touchscreens luminosity on hover cannot be used
			$(".album-button-and-caption").css("opacity", 1);
			$(".thumb-container").css("opacity", 1);
			$(".album-button-random-media-link").css("opacity", 1);
		}

		url = location.protocol + "//" + location.host;
		folders = location.pathname;
		folders = folders.substring(0, folders.lastIndexOf('/'));
		url += folders;
		if (currentMedia === null || currentAlbum !== null && ! currentAlbum.subalbums.length && currentAlbum.media.length == 1) {
			mediaParameter = util.pathJoin([
				Options.server_cache_path,
				Options.cache_album_subdir,
				currentAlbum.cacheBase
				]) + ".jpg";
		} else {
			var reducedSizesIndex = 1;
			if (Options.reduced_sizes.length == 1)
				reducedSizesIndex = 0;
			var prefix = util.removeFolderMarker(currentMedia.foldersCacheBase);
			if (prefix)
				prefix += Options.cache_folder_separator;
			if (currentMedia.mediaType == "video") {
				mediaParameter = util.pathJoin([
					Options.server_cache_path,
					currentMedia.cacheSubdir,
				]) + prefix + currentMedia.cacheBase + Options.cache_folder_separator + "transcoded_" + Options.video_transcode_bitrate + "_" + Options.video_crf + ".mp4";
			} else if (currentMedia.mediaType == "photo") {
				mediaParameter = util.pathJoin([
					Options.server_cache_path,
					currentMedia.cacheSubdir,
					prefix + currentMedia.cacheBase
				]) + Options.cache_folder_separator + Options.reduced_sizes[reducedSizesIndex] + ".jpg";
			}
		}

		myShareUrl = url + '?';
		myShareUrl += 'm=' + mediaParameter;
		hash = location.hash;
		if (hash)
			myShareUrl += '#' + hash.substring(1);

		myShareText = Options.page_title;
		myShareTextAdd = currentAlbum.physicalPath;
		if (myShareTextAdd)
			myShareText += ": " + myShareTextAdd.substring(myShareTextAdd.lastIndexOf('/') + 1);

		jQuery.removeData(".ssk");
		$('.ssk').attr('data-text', myShareText);
		$('.ssk-facebook').attr('data-url', myShareUrl);
		$('.ssk-whatsapp').attr('data-url', location.href);
		$('.ssk-twitter').attr('data-url', location.href);
		$('.ssk-google-plus').attr('data-url', myShareUrl);
		$('.ssk-email').attr('data-url', location.href);

		// initialize social buttons (http://socialsharekit.com/)
		SocialShareKit.init({
		});
		if (! Modernizr.flexbox && util.bottomSocialButtons()) {
			var numSocial = 5;
			var socialWidth = Math.floor(window.innerWidth / numSocial);
			$('.ssk').width(socialWidth * 2 + "px");
		}
	}

	function updateMenu() {
		var albumOrMedia;
		// add the correct classes to the menu sort buttons
		if (currentMedia !== null) {
			// showing a media, nothing to sort
			$("#right-menu li.sort").addClass("hidden");
		} else if (currentAlbum !== null) {
			if (currentAlbum.subalbums.length <= 1) {
				// no subalbums or one subalbum
				$("ul#right-menu li.album-sort").addClass("hidden");
			} else {
				$("ul#right-menu li.album-sort").removeClass("hidden");
			}

			if (currentAlbum.media.length <= 1 || currentAlbum.media.length > Options.big_virtual_folders_threshold) {
				// no media or one media or too many media
				$("ul#right-menu li.media-sort").addClass("hidden");
			} else {
				$("ul#right-menu li.media-sort").removeClass("hidden");
			}

			var modes = ["album", "media"];
			for (var i in modes) {
				if (modes.hasOwnProperty(i)) {
					albumOrMedia = modes[i];
					if (currentAlbum[albumOrMedia + "NameSort"]) {
						$("ul#right-menu li." + albumOrMedia + "-sort.by-name").removeClass("active").addClass("selected");
						$("ul#right-menu li." + albumOrMedia + "-sort.by-date").addClass("active").removeClass("selected");
					} else {
						$("ul#right-menu li." + albumOrMedia + "-sort.by-date").removeClass("active").addClass("selected");
						$("ul#right-menu li." + albumOrMedia + "-sort.by-name").addClass("active").removeClass("selected");
					}

					if (
						currentAlbum[albumOrMedia + "NameSort"] && currentAlbum[albumOrMedia + "NameReverseSort"] ||
					 	! currentAlbum[albumOrMedia + "NameSort"] && currentAlbum[albumOrMedia + "DateReverseSort"]
					) {
						$("#right-menu li." + albumOrMedia + "-sort.sort-reverse").addClass("selected");
					} else {
						$("#right-menu li." + albumOrMedia + "-sort.sort-reverse").removeClass("selected");
					}
				}
			}
		}

		$("ul#right-menu li.ui").removeClass("hidden");

		$("ul#right-menu li.hide-title-and-thumbnails").removeClass("hidden");
		if (Options.hide_title_and_thumbnails)
			$("ul#right-menu li.hide-title-and-thumbnails").addClass("selected");
		else
			$("ul#right-menu li.hide-title-and-thumbnails").removeClass("selected");

		if (
			currentMedia !== null ||
			util.isAlbumWithOneMedia(currentAlbum) ||
			currentAlbum !== null && currentAlbum.subalbums.length === 0
		) {
			$("ul#right-menu li.slide").addClass("hidden");
		} else {
			$("ul#right-menu li.slide").removeClass("hidden");
			if (Options.albums_slide_style)
				$("ul#right-menu li.slide").addClass("selected");
			else
				$("ul#right-menu li.slide").removeClass("selected");
		}

		if (
			currentMedia !== null ||
			util.isAlbumWithOneMedia(currentAlbum) ||
			currentAlbum !== null && currentAlbum.subalbums.length <= 1 && currentAlbum.media.length <= 1
		) {
			$("ul#right-menu li.spaced").addClass("hidden");
		} else {
			$("ul#right-menu li.spaced").removeClass("hidden");
			if (Options.spacing)
				$("ul#right-menu li.spaced").addClass("selected");
			else
				$("ul#right-menu li.spaced").removeClass("selected");
		}

		if (
			currentMedia !== null ||
			util.isAlbumWithOneMedia(currentAlbum) ||
			currentAlbum !== null && currentAlbum.subalbums.length === 0) {
			$("ul#right-menu li.square-album-thumbnails").addClass("hidden");
		} else {
			$("ul#right-menu li.square-album-thumbnails").removeClass("hidden");
			if (Options.album_thumb_type == "square")
				$("ul#right-menu li.square-album-thumbnails").addClass("selected");
			else
				$("ul#right-menu li.square-album-thumbnails").removeClass("selected");
		}

		if (
			currentMedia !== null ||
			util.isAlbumWithOneMedia(currentAlbum) ||
			currentAlbum !== null && (currentAlbum.subalbums.length === 0 || ! util.isFolderCacheBase(currentAlbum.cacheBase))
		) {
			$("ul#right-menu li.album-names").addClass("hidden");
		} else {
			$("ul#right-menu li.album-names").removeClass("hidden");
			if (Options.show_album_names_below_thumbs)
				$("ul#right-menu li.album-names").addClass("selected");
			else
				$("ul#right-menu li.album-names").removeClass("selected");
		}

		if (
			currentMedia !== null ||
			util.isAlbumWithOneMedia(currentAlbum) ||
			currentAlbum !== null && currentAlbum.subalbums.length === 0 && Options.hide_title_and_thumbnails
		) {
			$("ul#right-menu li.media-count").addClass("hidden");
		} else {
			$("ul#right-menu li.media-count").removeClass("hidden");
			if (Options.show_album_media_count)
				$("ul#right-menu li.media-count").addClass("selected");
			else
				$("ul#right-menu li.media-count").removeClass("selected");
		}

		if (
			currentMedia !== null ||
			util.isAlbumWithOneMedia(currentAlbum) ||
			currentAlbum !== null && (
				currentAlbum.media.length === 0 ||
				! util.isFolderCacheBase(currentAlbum.cacheBase) && currentAlbum.media.length > Options.big_virtual_folders_threshold
			)
		) {
			$("ul#right-menu li.media-names").addClass("hidden");
		} else {
			$("ul#right-menu li.media-names").removeClass("hidden");
			if (Options.show_media_names_below_thumbs)
				$("ul#right-menu li.media-names").addClass("selected");
			else
				$("ul#right-menu li.media-names").removeClass("selected");
		}

		if (
			currentMedia !== null ||
			util.isAlbumWithOneMedia(currentAlbum) ||
			currentAlbum !== null && (
				currentAlbum.media.length === 0 ||
				! util.isFolderCacheBase(currentAlbum.cacheBase) && currentAlbum.media.length > Options.big_virtual_folders_threshold
			)
		) {
			$("ul#right-menu li.square-media-thumbnails").addClass("hidden");
		} else {
			$("ul#right-menu li.square-media-thumbnails").removeClass("hidden");
			if (Options.media_thumb_type == "square")
			 	$("ul#right-menu li.square-media-thumbnails").addClass("selected");
			else
				$("ul#right-menu li.square-media-thumbnails").removeClass("selected");
		}

		if (
			$("ul#right-menu li.hide-title-and-thumbnails").hasClass("hidden") &&
			$("ul#right-menu li.slide").hasClass("hidden") &&
			$("ul#right-menu li.spaced").hasClass("hidden") &&
			$("ul#right-menu li.album-names").hasClass("hidden") &&
			$("ul#right-menu li.media-count").hasClass("hidden") &&
			$("ul#right-menu li.media-names").hasClass("hidden") &&
			$("ul#right-menu li.square-album-thumbnails").hasClass("hidden") &&
			$("ul#right-menu li.square-media-thumbnails").hasClass("hidden")
		) {
			$("ul#right-menu li.ui").addClass("hidden");
		}

		if (
				currentAlbum !== null &&
				(util.isSearchCacheBase(currentAlbum.cacheBase) || currentAlbum.cacheBase == Options.by_search_string)
				||
			Options.search_inside_words ||
			Options.search_any_word ||
			Options.search_case_sensitive ||
			Options.search_accent_sensitive ||
			Options.search_current_album ||
			// Options.search_refine ||
			$("ul#right-menu li#no-search-string").is(":visible") ||
			$("ul#right-menu li#no-results").is(":visible") ||
			$("ul#right-menu li#search-too-wide").is(":visible")
		) {
			$("ul#right-menu li#inside-words").removeClass("hidden");
			$("ul#right-menu li#any-word").removeClass("hidden");
			$("ul#right-menu li#case-sensitive").removeClass("hidden");
			$("ul#right-menu li#accent-sensitive").removeClass("hidden");
			$("ul#right-menu li#album-search").removeClass("hidden");
			// $("ul#right-menu li#refine-search").removeClass("hidden");
			if (Options.search_inside_words)
				$("ul#right-menu li#inside-words").addClass("selected");
			else
				$("ul#right-menu li#inside-words").removeClass("selected");
			if (Options.search_any_word)
				$("ul#right-menu li#any-word").addClass("selected");
			else
				$("ul#right-menu li#any-word").removeClass("selected");
			if (Options.search_case_sensitive)
				$("ul#right-menu li#case-sensitive").addClass("selected");
			else
				$("ul#right-menu li#case-sensitive").removeClass("selected");
			if (Options.search_accent_sensitive)
				$("ul#right-menu li#accent-sensitive").addClass("selected");
			else
				$("ul#right-menu li#accent-sensitive").removeClass("selected");
			if (Options.search_current_album)
				$("ul#right-menu li#album-search").addClass("selected");
			else
				$("ul#right-menu li#album-search").removeClass("selected");
			// if (Options.search_refine)
			// 	$("ul#right-menu li#refine-search").addClass("selected");
			// else
			// 	$("ul#right-menu li#refine-search").removeClass("selected");
		} else {
			$("ul#right-menu li#inside-words").addClass("hidden");
			$("ul#right-menu li#any-word").addClass("hidden");
			$("ul#right-menu li#case-sensitive").addClass("hidden");
			$("ul#right-menu li#accent-sensitive").addClass("hidden");
			$("ul#right-menu li#album-search").addClass("hidden");
			// $("ul#right-menu li#refine-search").addClass("hidden");
		}
	}

	function setTitle(id) {
		var title = "", documentTitle = "", components, i, isDateTitle, isGpsTitle, isSearchTitle, originalTitle;
		var titleAnchorClasses, titleAnchorClassesItalics, hiddenTitle = "", albumTypeString, where, initialValue, searchFolderHash;
		var beginLink, linksToLeave, numLinks, beginAt, latitude, longitude, arrayCoordinates, numMediaInSubAlbums;
		// gpsLevelNumber is the number of levels for the by gps tree
		// current levels are country, region, place => 3
		var gpsLevelNumber = 3;
		var gpsName = '';
		var gpsHtmlTitle;

		updateMenu();

		if (Options.page_title !== "")
			originalTitle = Options.page_title;
		else
			originalTitle = translations[language][".title-string"];


		if (! currentAlbum.path.length)
			components = [originalTitle];
		else {
			components = currentAlbum.path.split("/");
			components.unshift(originalTitle);
		}

		isDateTitle = (components.length > 1 && components[1] == Options.by_date_string);
		isGpsTitle = (components.length > 1 && components[1] == Options.by_gps_string);
		isSearchTitle = (components.length > 1 && components[1] == Options.by_search_string);

		// textComponents = components doesn't work: textComponents becomes a pointer to components
		var textComponents = components.slice();

		// generate the title in the page top
		titleAnchorClasses = 'title-anchor';
		if (isMobile.any())
			titleAnchorClasses += ' mobile';
		titleAnchorClassesItalics = titleAnchorClasses + ' italic';

		var array = phFl.decodeHash(location.hash);
		// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
		var albumHash = array[0];
		// var mediaHash = array[1];
		// var mediaFolderHash = array[2];
		// var savedSearchSubAlbumHash = array[3];
		var savedSearchAlbumHash = array[4];

		if (isDateTitle) {
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>";
			title += "<a class='" + titleAnchorClasses + "' href='#!/" + Options.by_date_string + "'>(" + _t("#by-date") + ")</a>";

			if (components.length > 2 || currentMedia !== null)
				title += "&raquo;";

			documentTitle += components[0];
			if (components.length > 2 || currentMedia !== null)
				documentTitle = " \u00ab " + documentTitle;
			documentTitle += " (" + _t("#by-date") + ")";

			for (i = 2; i < components.length; ++i) {
				if (i < components.length - 1 || currentMedia !== null)
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'" + ">";
				else
					title += "<span class='title-no-anchor'>";

				if (i == 3)
					title += _t("#month-" + textComponents[i]);
				else
					title += textComponents[i];


				if (i < components.length - 1 || currentMedia !== null)
					title += "</a>";
				else
					title += "</span>";
				if (i < components.length - 1 || currentMedia !== null)
					title += "&raquo;";

				// keep buildimg the html page title
				if (i == 3)
					documentTitle = _t("#month-" + textComponents[i]) + documentTitle;
				else
					documentTitle = textComponents[i] + documentTitle;
				if (i < components.length - 1 || currentMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
			}

			if (components.length > 1 && currentMedia === null) {
				if (! isMobile.any()) {
					title += " <span id=\"title-count\">(";
					title += currentAlbum.media.length + " ";
					title += _t(".title-media") + " ";
				 	if (components.length >= 5)
						title += _t(".title-in-day-album");
					else
						title += _t(".title-in-date-album");
					title += ")</span>";
				}
				title += "</span>";
			}
		} else if (isGpsTitle) {
			title = "<a class='" + titleAnchorClasses + "' href='#!/'>" + components[0] + "</a>";
			title += "<a class='" + titleAnchorClasses + "' href='#!/" + Options.by_gps_string + "'>(" + _t("#by-gps") + ")</a>";

			if (components.length > 2 || currentMedia !== null)
				title += "&raquo;";

			documentTitle += components[0];
			if (components.length > 2 || currentMedia !== null)
				documentTitle = " \u00ab " + documentTitle;
			documentTitle += " (" + _t("#by-gps") + ")";

			for (i = 2; i < components.length; ++i) {
				var currentAlbumPath = currentAlbum.ancestorsNames;
				gpsName = currentAlbumPath[i];

				if (gpsName === '')
					gpsName = _t('.not-specified');
				gpsHtmlTitle = _t("#place-icon-title") + gpsName;

				if (i < components.length - 1 || currentMedia !== null) {
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'";
					title += " title='" + _t("#place-icon-title") + gpsName + _t("#place-icon-title-end") + "'";
					title += ">";
				} else
					title += "<span class='title-no-anchor'>";
				title += gpsName;
				if (i < components.length - 1 || currentMedia !== null)
					title += "</a>";
				else
					title += "</span>";

				if (currentMedia !== null) {
					latitude = currentMedia.metadata.latitude;
					longitude = currentMedia.metadata.longitude;
				} else {
					 arrayCoordinates = currentAlbum.ancestorsCenter[i];
					 latitude = arrayCoordinates.latitude;
					 longitude = arrayCoordinates.longitude;
				}
				title += "<a href=" + util.mapLink(latitude, longitude, Options.map_zoom_levels[(i - 2)]) + " target='_blank'>" +
									"<img class='title-img' title='" + gpsHtmlTitle + "' alt='" + gpsHtmlTitle + "' height='20px' src='img/ic_place_white_24dp_2x.png'>" +
									"</a>";

				if (i < components.length - 1 || currentMedia !== null)
					title += "&raquo;";

				// keep buildimg the html page title
				documentTitle = gpsName + documentTitle;
				if (i < components.length - 1 || currentMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
			}

			if (components.length > 1 && currentMedia === null) {
				title += " <span id=\"title-count\">(";
				title += currentAlbum.media.length + " ";
				title += _t(".title-media") + " ";
				if (components.length >= gpsLevelNumber + 2)
					title += _t(".title-in-gps-album");
				else
					title += _t(".title-in-gpss-album");
				title += ")</span>";
			}
		} else if (isSearchTitle) {
			// i=0: title
			// i=1: Options.by_search_string
			// (optional) i=2: image cache or folder
			// (optional) i=3 up: folder or image
			// (optional) i=n: image
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>&raquo;";

			if (
				Options.search_current_album &&
				[Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(Options.album_to_search_in) == -1
			) {
				searchFolderHash = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
				where =
					 "<a class='main-search-link' href='#!/" + currentAlbum.cacheBase + "'>" +
					 _t("#by-search") +
					 "</a> " +
					 _t("#in") +
					 " <span id='search-album-to-be-filled'></span>";
			} else {
				where =
				 	"<a class='search-link' href='#!/" + currentAlbum.cacheBase + "'>" +
					_t("#by-search") +
					"</a>";
			}

			title += "<span class='title-no-anchor'>(" + where + ")</span>";
			where = util.stripHtmlAndReplaceEntities(where);

			// do not show the options and the search words, they are visible in the menu
			// show the image name, if it is there
			if (currentMedia !== null) {
				title += "&raquo;";
			}

			if (
				components.length > 2 &&
				(currentMedia === null && ! util.isAlbumWithOneMedia(currentAlbum)) &&
				(currentAlbum.media.length || currentAlbum.subalbums.length)
			) {
				title += " <span id=\"title-count\">(";
				title += _t(".title-found") + ' ';
				numMediaInSubAlbums = currentAlbum.numMediaInSubTree - currentAlbum.media.length;
				if (currentAlbum.media.length) {
					title += currentAlbum.media.length + " ";
					title += _t(".title-media");
					if (currentAlbum.subalbums.length)
						title += ", ";
				}
				if (currentAlbum.subalbums.length) {
					title += currentAlbum.subalbums.length + " ";
					title += _t(".title-albums");
				}
				if (currentAlbum.media.length > 0 && currentAlbum.subalbums.length > 0) {
					title += ", ";
					title += _t(".title-total") + " ";
					title += currentAlbum.media.length + currentAlbum.subalbums.length;
				}
				title += ")</span>";
			}

			// build the html page title
			documentTitle += " (" + where +") \u00ab " + components[0];
			if (currentMedia !== null)
				documentTitle = " \u00ab " + documentTitle;
		} else {
			// folders title
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>";
			if (components.length > 2 || currentMedia !== null)
				title += "&raquo;";

			if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
				searchFolderHash = savedSearchAlbumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
				if (searchFolderHash.split(Options.cache_folder_separator).length > 1) {
					where =
						 "<a class='main-search-link' href='#!/" + savedSearchAlbumHash + "'>" +
						 _t("#by-search") +
						 "</a> " +
						 _t("#in") +
						 " <span id='search-album-to-be-filled'></span>";
				} else {
					where =
					 	"<a class='search-link' href='#!/" + savedSearchAlbumHash + "'>" +
						_t("#by-search") +
						"</a>";
				}

				title += "<span class='title-no-anchor'>(" + where + ")</span>";
				title += "&raquo;";
				where = util.stripHtmlAndReplaceEntities(where);

				documentTitle += " (" + where +") \u00ab " + documentTitle;
			}

			documentTitle += components[0];
			if (components.length > 2 || currentMedia !== null)
				documentTitle = " \u00ab " + documentTitle;

			initialValue = 2;
			if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
				// the  folders from the first until the search folder inclusive must not be shown
				initialValue = savedSearchAlbumHash.split(Options.cache_folder_separator).slice(2).length + 1;
			}
			for (i = initialValue; i < components.length; ++i) {
				if (i < components.length - 1 || currentMedia !== null)
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'>";
				else
					title += "<span class='title-no-anchor'>";

				title += textComponents[i];

				if (i < components.length - 1 || currentMedia !== null)
					title += "</a>";
				else
					title += "</span>";

				if (i < components.length - 1 || currentMedia !== null)
					title += "&raquo;";
			}

			if (components.length > 1 && currentMedia === null) {
				title += " <span id=\"title-count\">(";
				numMediaInSubAlbums = currentAlbum.numMediaInSubTree - currentAlbum.media.length;
				if (currentAlbum.media.length) {
					title += currentAlbum.media.length + " ";
					title += _t(".title-media") + " ";
					title += _t(".title-in-album");
					if (numMediaInSubAlbums)
						title += ", ";
				}
				if (numMediaInSubAlbums) {
					title += numMediaInSubAlbums + " ";
					if (! currentAlbum.media.length)
						title += _t(".title-media") + " ";
					title += _t(".title-in-subalbums");
				}
				if (currentAlbum.media.length > 0 && numMediaInSubAlbums > 0) {
					title += ", ";
					title += _t(".title-total") + " ";
					title += currentAlbum.media.length + numMediaInSubAlbums;
				}
				title += ")</span>";
			}

			for (i = initialValue; i < components.length; ++i) {
				// keep building the html page title
				documentTitle = textComponents[i] + documentTitle;
				if (i < components.length - 1 || currentMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
			}
		}

		if (currentMedia !== null) {
			title += "<span class=\"media-name\">" + util.trimExtension(currentMedia.name) + "</span>";
			if (util.hasGpsData(currentMedia)) {
				latitude = currentMedia.metadata.latitude;
				longitude = currentMedia.metadata.longitude;
				title += "<a href=" + util.mapLink(latitude, longitude, Options.photo_map_zoom_level) + " target='_blank'>" +
										"<img class='title-img' title='" + _t("#show-on-map") + " [s]' alt='" + _t("#show-on-map") + "' height='20px' src='img/ic_place_white_24dp_2x.png'>" +
										"</a>";
			}
		}

		if (isMobile.any()) {
			// leave only the last link on mobile
			if (title.indexOf("#search-album-to-be-filled") !== -1)
				beginAt = title.indexOf("search-album-to-be-filled");
			else
				beginAt = 0;
			numLinks = (title.substring(beginAt).match(/<a class=/g) || []).length;
			linksToLeave = 1;
			if (numLinks > linksToLeave) {
				for (i = 1; i <= numLinks - linksToLeave; i ++) {
					beginLink = title.indexOf("<a class=", beginAt);
					hiddenTitle += title.substring(0, beginLink);
					title = title.substring(beginLink);
				}
				title = "<a id=\"dots\" href=\"javascript:void(0)\">... &raquo; </a><span id=\"hidden-title\">" + hiddenTitle + "</span> " + title;
			}
		}

		$(".media-box#" + id + " .title-string").html(title);

		if (isMobile.any()) {
			$("#dots").off();
			$("#dots").on('click', function(ev) {
				if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
					$("#dots").hide();
					$("#hidden-title").show();
					return false;
				}
			});
		}

		// keep generating the html page title
		if (currentMedia !== null)
			documentTitle = util.trimExtension(currentMedia.name) + documentTitle;
		else if (currentAlbum !== null && ! currentAlbum.subalbums.length && currentAlbum.media.length == 1)
			documentTitle =  util.trimExtension(currentAlbum.media[0].name) + " \u00ab " + documentTitle;

		document.title = documentTitle;


		if (currentMedia === null && currentAlbum !== null && ! currentAlbum.subalbums.length && currentAlbum.media.length == 1) {
			title += " &raquo; <span class=\"media-name\">" + util.trimExtension(currentAlbum.media[0].name) + "</span>";
		}

		if ($("#search-album-to-be-filled").length) {
			// for searches in current folder we must get the names from the album
			// we must use getAlbum() because the album could not be in the cache yet (as when ctl-r is pressed)
			phFl.getAlbum(
				searchFolderHash,
				function(theAlbum) {
					var whereLinks = '', thisCacheBase, name, documentTitle;

					if (theAlbum.hasOwnProperty('ancestorsNames')) {
						albumTypeString = "<a href='#!/" + Options.by_gps_string + "'"  + _t('#by-gps') + ']</a> ' + ' &raquo; ';
						for (var i = 2; i < theAlbum.ancestorsNames.length; i ++) {
							name = theAlbum.ancestorsNames[i];
							if (i == 3 && util.isByDateCacheBase(Options.album_to_search_in))
								// convert the month number to localized month name
								name = _t("#month-" + name);
							thisCacheBase = "#!/" + theAlbum.ancestorsCacheBase.slice(2, i + 1).join(Options.cache_folder_separator);
							if (i > 2)
								whereLinks += ' &raquo; ';
							whereLinks += "<a class='search-link' href='" + thisCacheBase + "'>" + name + "</a>";
						}
					}

					// insert the album tree links in DOM (if )
					$("#search-album-to-be-filled").replaceWith(whereLinks);

					// correct the page title too
					documentTitle = $(document).attr('title');
					documentTitle = documentTitle.replace(
						_t("#by-search") + ' ' + _t("#-in") + ' ',
						_t("#by-search") + ' ' + _t("#-in") + ' ' + util.stripHtmlAndReplaceEntities(whereLinks)
					);
					document.title = documentTitle;
				},
				die
			);
		}

		setOptions();

		return;
	}

	function initializeSortPropertiesAndCookies() {
		// this function applies the sorting on the media and subalbum lists
		// and sets the album properties that attest the lists status

		// album properties reflect the current sorting of album and media objects
		// json files have subalbums and media sorted by date not reversed

		if (currentAlbum.albumNameSort === undefined) {
			currentAlbum.albumNameSort = false;
		}
		if (currentAlbum.albumDateReverseSort === undefined){
			currentAlbum.albumDateReverseSort = false;
		}
		if (currentAlbum.albumNameReverseSort === undefined){
			currentAlbum.albumNameReverseSort = false;
		}

		if (currentAlbum.mediaNameSort === undefined) {
			currentAlbum.mediaNameSort = false;
		}
		if (currentAlbum.mediaDateReverseSort === undefined){
			currentAlbum.mediaDateReverseSort = false;
		}
		if (currentAlbum.mediaNameReverseSort === undefined)
			currentAlbum.mediaNameReverseSort = false;

		// cookies reflect the requested sorting in ui
		// they remember the ui state when a change in sort is requested (via the top buttons) and when the hash changes
		// if they are not set yet, they are set to default values

		if (getBooleanCookie("albumNameSortRequested") === null)
			setBooleanCookie("albumNameSortRequested", Options.default_album_name_sort);
		if (getBooleanCookie("albumDateReverseSortRequested") === null)
			setBooleanCookie("albumDateReverseSortRequested", Options.default_album_reverse_sort);
		if (getBooleanCookie("albumNameReverseSortRequested") === null)
			setBooleanCookie("albumNameReverseSortRequested", Options.default_album_reverse_sort);

		if (getBooleanCookie("mediaNameSortRequested") === null)
			setBooleanCookie("mediaNameSortRequested", Options.default_media_name_sort);
		if (getBooleanCookie("mediaDateReverseSortRequested") === null)
			setBooleanCookie("mediaDateReverseSortRequested", Options.default_media_reverse_sort);
		if (getBooleanCookie("mediaNameReverseSortRequested") === null)
			setBooleanCookie("mediaNameReverseSortRequested", Options.default_media_reverse_sort);
	}

	function sortAlbumsMedia() {
		// this function applies the sorting on the media and subalbum lists
		// and sets the album properties that attest the lists status

		// album properties reflect the current sorting of album and media objects
		// json files have subalbums and media sorted by date not reversed

		var m;

		if (needAlbumNameSort()) {
			currentAlbum.subalbums = util.sortByPath(currentAlbum.subalbums);
			currentAlbum.albumNameSort = true;
			currentAlbum.albumNameReverseSort = false;
			// $("li.album-sort.by-name").addClass("selected");
		} else if (needAlbumDateSort()) {
			currentAlbum.subalbums = util.sortByDate(currentAlbum.subalbums);
			currentAlbum.albumNameSort = false;
			currentAlbum.albumDateReverseSort = false;
		}

		if (needAlbumNameReverseSort() || needAlbumDateReverseSort()) {
			currentAlbum.subalbums = currentAlbum.subalbums.reverse();
			if (needAlbumNameReverseSort())
				currentAlbum.albumNameReverseSort = ! currentAlbum.albumNameReverseSort;
			else
				currentAlbum.albumDateReverseSort = ! currentAlbum.albumDateReverseSort;
		}

		if (needMediaNameSort()) {
			currentAlbum.media = util.sortByName(currentAlbum.media);
			currentAlbum.mediaNameSort = true;
			currentAlbum.mediaNameReverseSort = false;
			if (currentMedia !== null) {
				for (m = 0; m < currentAlbum.media.length; m ++) {
					if (currentAlbum.media[m].cacheBase == currentMedia.cacheBase && currentAlbum.media[m].foldersCacheBase == currentMedia.foldersCacheBase) {
						currentMediaIndex = m;
						break;
					}
				}
			}
		} else if (needMediaDateSort()) {
			currentAlbum.media = util.sortByDate(currentAlbum.media);
			currentAlbum.mediaNameSort = false;
			currentAlbum.mediaDateReverseSort = false;
			if (currentMedia !== null) {
				for (m = 0; m < currentAlbum.media.length; m ++) {
					if (currentAlbum.media[m].cacheBase == currentMedia.cacheBase && currentAlbum.media[m].foldersCacheBase == currentMedia.foldersCacheBase) {
						currentMediaIndex = m;
						break;
					}
				}
			}
		}
		if (needMediaDateReverseSort() || needMediaNameReverseSort()) {
			currentAlbum.media = currentAlbum.media.reverse();
			if (needMediaNameReverseSort())
				currentAlbum.mediaNameReverseSort = ! currentAlbum.mediaNameReverseSort;
			else
				currentAlbum.mediaDateReverseSort = ! currentAlbum.mediaDateReverseSort;
			if (currentMediaIndex !== undefined && currentMediaIndex != -1)
				currentMediaIndex = currentAlbum.media.length - 1 - currentMediaIndex;
		}
	}

	function scrollToThumb() {
		var media, thumb;

		media = currentMedia;
		if (media === null) {
			media = previousMedia;
			if (media === null)
				return;
		}
		$("#thumbs img.thumbnail").each(function() {
			if (
				(util.isFolderCacheBase(currentAlbum.cacheBase) || currentAlbum.cacheBase == Options.folders_string) && this.title === media.albumName ||
				util.isByDateCacheBase(currentAlbum.cacheBase) && this.title === media.albumName ||
				util.isByGpsCacheBase(currentAlbum.cacheBase) && this.title === media.albumName ||
				util.isSearchCacheBase(currentAlbum.cacheBase) && this.title === media.albumName
			) {
				thumb = $(this);
				return false;
			}
		});
		if (typeof thumb === "undefined")
			return;
		if (currentMedia !== null) {
			var scroller = $("#album-view");
			scroller.stop().animate(
				{ scrollLeft: thumb.parent().position().left + scroller.scrollLeft() - scroller.width() / 2 + thumb.width() / 2 }, "slow"
			);
		} else
			$("html, body").stop().animate({ scrollTop: thumb.offset().top - $(window).height() / 2 + thumb.height() }, "slow");

		if (currentMedia !== null) {
			$(".thumb-container").removeClass("current-thumb");
			thumb.parent().addClass("current-thumb");
		}
	}

	function showAlbum(populate) {
		var i, imageLink, linkContainer, container, image, media, thumbsElement, subalbums, subalbumsElement, mediaHash, subfolderHash, thumbHash, thumbnailSize;
		var width, height, thumbWidth, thumbHeight, imageString, calculatedWidth, populateMedia;
		var albumViewWidth, correctedAlbumThumbSize = Options.album_thumb_size;
		var mediaWidth, mediaHeight, slideBorder = 0, scrollBarWidth = 0, buttonBorder = 0, margin, imgTitle;
		var tooBig = false, isVirtualAlbum = false;
		var mapLinkIcon;
		var caption, captionColor, captionHtml, captionHeight, captionFontSize, buttonAndCaptionHeight, albumButtonAndCaptionHtml, heightfactor;
		var array, folderArray, folder, savedSearchSubAlbumHash, savedSearchAlbumHash;

		phFl.subalbumIndex = 0;
		numSubAlbumsReady = 0;

		array = phFl.decodeHash(location.hash);
		// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
		savedSearchSubAlbumHash = array[3];
		savedSearchAlbumHash = array[4];

		if (Options.albums_slide_style)
			slideBorder = 3;

		if (currentMedia === null && previousMedia === null)
			$("html, body").stop().animate({ scrollTop: 0 }, "slow");
		if (populate) {
			thumbnailSize = Options.media_thumb_size;

			populateMedia = populate;
			isVirtualAlbum = (util.isByDateCacheBase(currentAlbum.cacheBase) || util.isByGpsCacheBase(currentAlbum.cacheBase) || util.isSearchCacheBase(currentAlbum.cacheBase) );
			tooBig = currentAlbum.path.split("/").length < 4 && currentAlbum.media.length > Options.big_virtual_folders_threshold;
			if (populateMedia === true && isVirtualAlbum)
				populateMedia = populateMedia && ! tooBig;

			if (isVirtualAlbum && tooBig) {
				$("#thumbs").empty();
				$("#error-too-many-images").html(
					"<span id=\"too-many-images\">" + _t('#too-many-images') + "</span>: " + currentAlbum.media.length +
					" (<span id=\"too-many-images-limit-is\">" + _t('#too-many-images-limit-is') + "</span> " + Options.big_virtual_folders_threshold +  ")</span>"
				).show();
			} else if (
				populateMedia === true ||
				populateMedia == "refreshMedia" ||
				populateMedia == "refreshBoth"
			) {
				media = [];

				//
				// media loop
				//
				for (i = 0; i < currentAlbum.media.length; ++i) {
					width = currentAlbum.media[i].metadata.size[0];
					height = currentAlbum.media[i].metadata.size[1];
					thumbHash = chooseThumbnail(currentAlbum, currentAlbum.media[i], thumbnailSize);

					if (Options.media_thumb_type == "fixed_height") {
						if (height < Options.media_thumb_size) {
							thumbHeight = height;
							thumbWidth = width;
						} else {
							thumbHeight = Options.media_thumb_size;
							thumbWidth = thumbHeight * width / height;
						}
						calculatedWidth = thumbWidth;
					} else if (Options.media_thumb_type == "square") {
						thumbHeight = thumbnailSize;
						thumbWidth = thumbnailSize;
						calculatedWidth = Options.media_thumb_size;
					}
					imgTitle = currentAlbum.media[i].albumName;

					mapLinkIcon = "";
					if (util.hasGpsData(currentAlbum.media[i])) {
						var latitude = currentAlbum.media[i].metadata.latitude;
						var longitude = currentAlbum.media[i].metadata.longitude;
						mapLinkIcon = "<a href=" + util.mapLink(latitude, longitude, Options.photo_map_zoom_level) + " target='_blank'>" +
													"<img class='thumbnail-map-link' title='" + _t("#show-on-map") + " [s]' alt='" + _t("#show-on-map") + "' height='20px' src='img/ic_place_white_24dp_2x.png'>" +
													"</a>";
					}

					imageString =	"<div class=\"thumb-and-caption-container\" style=\"" +
										"width: " + calculatedWidth + "px;\"" +
									">" +
								"<div class=\"thumb-container\" " + "style=\"" +
										"width: " + calculatedWidth + "px; " +
										"height: " + Options.media_thumb_size + "px;" +
									"\">" +
									mapLinkIcon +
									"<span class=\"helper\"></span>" +
									"<img title=\"" + imgTitle + "\"" +
										"alt=\"" + util.trimExtension(currentAlbum.media[i].name) + "\"" +
										"src=\"" +  encodeURI(thumbHash) + "\"" +
										"class=\"thumbnail" + "\"" +
										"height=\"" + thumbHeight + "\"" +
										"width=\"" + thumbWidth + "\"" +
									"/>" +
								"</div>" +
								"<div class=\"media-caption\">" +
								"<span>" +
								currentAlbum.media[i].name.replace(/ /g, "</span> <span style='white-space: nowrap;'>") +
								"</span>";
					imageString += "</div>" +
							"</div>";
					image = $(imageString);

					image.get(0).media = currentAlbum.media[i];
					if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
						mediaHash = phFl.encodeHash(currentAlbum, currentAlbum.media[i], savedSearchSubAlbumHash, savedSearchAlbumHash);
					else
						mediaHash = phFl.encodeHash(currentAlbum, currentAlbum.media[i]);
					imageLink = $("<a id='link-" + mediaHash + "' href='" + mediaHash + "'></a>");
					imageLink.append(image);
					media.push(imageLink);
					(function(theLink, theImage) {
						theImage.on("error", function() {
							media.splice(media.indexOf(theLink), 1);
							theLink.remove();
							currentAlbum.media.splice(currentAlbum.media.indexOf(theImage.get(0).media), 1);
						});
					})(imageLink, image);
				}

				thumbsElement = $("#thumbs");
				thumbsElement.empty();
				thumbsElement.append.apply(thumbsElement, media);
			}

			if (currentMedia === null) {
				if (fromEscKey && firstEscKey) {
					// respect the existing mediaLink (you cannot do it more than once)
					firstEscKey = false;
				} else {
					// reset mediaLink
					if (currentAlbum.media.length)
						mediaLink = phFl.encodeHash(currentAlbum, currentAlbum.media[0], savedSearchSubAlbumHash, savedSearchAlbumHash);
					else
						mediaLink = "#!/" + currentAlbum.cacheBase;

					firstEscKey = true;
				}

				upLink = phFl.upHash(location.hash);

				if (
					populate === true ||
					populate == "refreshSubalbums" ||
					populateMedia == "refreshBoth"
				) {
					subalbums = [];

					// resize down the album buttons if they are too wide
					albumViewWidth = $("body").width() -
							parseInt($("#album-view").css("padding-left")) -
							parseInt($("#album-view").css("padding-right")) -
							scrollBarWidth;
					if ((util.albumButtonWidth(correctedAlbumThumbSize, buttonBorder) + Options.spacing) * Options.min_album_thumbnail > albumViewWidth) {
						if (Options.albums_slide_style)
							correctedAlbumThumbSize =
								Math.floor((albumViewWidth / Options.min_album_thumbnail - Options.spacing - 2 * slideBorder) / 1.1 - 2 * buttonBorder);
						else
							correctedAlbumThumbSize =
								Math.floor(albumViewWidth / Options.min_album_thumbnail - Options.spacing - 2 * buttonBorder);
					}
					margin = 0;
					if (Options.albums_slide_style)
						margin = Math.round(correctedAlbumThumbSize * 0.05);

					captionFontSize = Math.round(util.em2px("body", 1) * correctedAlbumThumbSize / Options.album_thumb_size);
					captionHeight = parseInt(captionFontSize * 1.1) + 1;
					if (util.isFolderCacheBase(currentAlbum.cacheBase) && ! Options.show_album_names_below_thumbs)
						heightfactor = 0;
					else if (! Options.show_album_media_count)
						heightfactor = 1.6;
					else
						heightfactor = 2.8;
					buttonAndCaptionHeight = util.albumButtonWidth(correctedAlbumThumbSize, buttonBorder) + captionHeight * heightfactor;

					// insert into DOM
					subalbumsElement = $("#subalbums");
					subalbumsElement.empty();
					subalbumsElement.insertBefore(thumbsElement);

					//
					// subalbum loop
					//
					for (i = 0; i < currentAlbum.subalbums.length; ++i) {
						if (util.isSearchCacheBase(currentAlbum.cacheBase))
							subfolderHash = phFl.encodeHash(currentAlbum.subalbums[i], null, currentAlbum.subalbums[i].cacheBase, currentAlbum.cacheBase);
						else {
							if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
								subfolderHash = phFl.encodeHash(currentAlbum.subalbums[i].cacheBase, null, savedSearchSubAlbumHash, savedSearchAlbumHash);
							else
								subfolderHash = phFl.encodeHash(currentAlbum.subalbums[i], null);
						}

						// generate the subalbum caption
						if (util.isByDateCacheBase(currentAlbum.cacheBase)) {
							folderArray = currentAlbum.subalbums[i].cacheBase.split(Options.cache_folder_separator);
							folder = "";
							if (folderArray.length == 2)
								folder += folderArray[1];
							else if (folderArray.length == 3)
								folder += " " + _t("#month-" + folderArray[2]);
							else if (folderArray.length == 4)
								folder += _t("#day") + " " + parseInt(folderArray[3]);
						} else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
							var level = currentAlbum.subalbums[i].cacheBase.split(Options.cache_folder_separator).length - 2;
							var folderName = '';
							var folderTitle = '';
							if (currentAlbum.subalbums[i].name === '')
								folderName = _t('.not-specified');
							else if (level < 2)
								folderName = currentAlbum.subalbums[i].name;
							else
								folderName = util.transformAltPlaceName(currentAlbum.subalbums[i].name);
							folderTitle = _t('#place-icon-title') + folderName;

							folder = "<span class='gps-folder'>" +
												folderName +
												"<a href='" + util.mapLink(currentAlbum.subalbums[i].center.latitude, currentAlbum.subalbums[i].center.longitude, Options.map_zoom_levels[level]) +
																"' title='" + folderName +
																"' target='_blank'" +
														">" +
													"<img class='title-img' title='" + folderTitle + "'  alt='" + folderTitle + "' height='15px' src='img/ic_place_white_24dp_2x.png' />" +
												"</a>" +
											"</span>";
						}
						else {
							folder = currentAlbum.subalbums[i].path;
						}

						// // get the value in style sheet (element with that class doesn't exist in DOM)
						// var $el = $('<div class="album-caption"></div>');
						// $($el).appendTo('body');
						// $($el).remove();
						captionColor = Options.albums_slide_style ? Options.slide_album_caption_color : Options.album_caption_color;

						captionHtml = "<div class='album-caption";
						if (util.isFolderCacheBase(currentAlbum.cacheBase) && ! Options.show_album_names_below_thumbs)
							captionHtml += " hidden";
						captionHtml += "' id='album-caption-" + phFl.hashCode(currentAlbum.subalbums[i].cacheBase) + "'" +
													"style='" +
														"width: " + correctedAlbumThumbSize + "px; " +
														"font-size: " + captionFontSize + "px; " +
														"height: " + captionHeight + "px; " +
														"color: " + captionColor + ";" +
													"'" +
													">" + folder + "</div>";

						captionHtml += "<div class='album-caption-count";
						if (util.isFolderCacheBase(currentAlbum.cacheBase) && ! Options.show_album_names_below_thumbs || ! Options.show_album_media_count)
							captionHtml += " hidden";
						captionHtml += "'" +
									"style='" +
										"font-size: " + Math.round((captionFontSize / 1.5)) + "px; " +
										"height: " + captionHeight + "px; " +
										"color: " + captionColor + ";" +
									"'" +
								">(";
						captionHtml +=		currentAlbum.subalbums[i].numMediaInSubTree;
						captionHtml +=		" <span class='title-media'>";
						captionHtml +=		_t(".title-media");
						captionHtml +=		"</span>";
						captionHtml += ")</div>";
						caption = $(captionHtml);


						// a dot could be present in a cache base, making $("#" + cacheBase) fail, beware...
						albumButtonAndCaptionHtml =
							"<div id='" + phFl.hashCode(currentAlbum.subalbums[i].cacheBase) + "' " +
								"class='album-button-and-caption";
						if (Options.albums_slide_style)
							albumButtonAndCaptionHtml += " slide";
						albumButtonAndCaptionHtml +=
								"' " +
								"style='" +
									"margin-right: " + Options.spacing + "px; " +
									"margin-top: " + Options.spacing + "px; " +
									"height: " + buttonAndCaptionHeight + "px; " +
									"width: " + util.albumButtonWidth(correctedAlbumThumbSize, buttonBorder) + "px; ";
						if (Options.albums_slide_style)
							albumButtonAndCaptionHtml += "background-color:" + Options.album_button_background_color + ";";
						albumButtonAndCaptionHtml +=
								"'" +
							">" +
							"</div>";
						linkContainer = $(albumButtonAndCaptionHtml);

						image = $(
											"<div " +
											 	"class='album-button' " +
												"style='" +
													"width:" + correctedAlbumThumbSize + "px; " +
													"height:" + correctedAlbumThumbSize + "px; " +
													"margin:" + margin + "px;" +
												"'" +
												">" +
												"</div>"
										);
						linkContainer.append(image);
						linkContainer.append(caption);

						subalbumsElement.append(linkContainer);
						container = $("#" + phFl.hashCode(currentAlbum.subalbums[i].cacheBase));
						// add the clicks
						container.off('click').css("cursor", "pointer").on('click', {hash: subfolderHash}, function(ev) {
							window.location.href = ev.data.hash;
						});

						//////////////////// begin anonymous function /////////////////////
						//      })(currentAlbum.subalbums[i], image, container);
						(function(theSubalbum, theImage, theLink) {
							// function(subalbum, container, callback, error)  ---  callback(album,   album.media[index], container,            subalbum);
							phFl.pickRandomMedia(theSubalbum, currentAlbum, function(randomAlbum, randomMedia, theOriginalAlbumContainer, subalbum) {
								var htmlText;
								var titleName, randomMediaLink, goTo, humanGeonames;
								var mediaSrc = chooseThumbnail(randomAlbum, randomMedia, Options.album_thumb_size);

								phFl.subalbumIndex ++;
								mediaWidth = randomMedia.metadata.size[0];
								mediaHeight = randomMedia.metadata.size[1];
								if (Options.album_thumb_type == "fit") {
									if (mediaWidth < correctedAlbumThumbSize && mediaHeight < correctedAlbumThumbSize) {
										thumbWidth = mediaWidth;
										thumbHeight = mediaHeight;
									} else {
										if (mediaWidth > mediaHeight) {
											thumbWidth = correctedAlbumThumbSize;
											thumbHeight = Math.floor(correctedAlbumThumbSize * mediaHeight / mediaWidth);
										} else {
											thumbWidth = Math.floor(correctedAlbumThumbSize * mediaWidth / mediaHeight);
											thumbHeight = correctedAlbumThumbSize;
										}
									}
								} else if (Options.album_thumb_type == "square") {
									thumbWidth = correctedAlbumThumbSize;
									thumbHeight = correctedAlbumThumbSize;
								}

								if (util.isByDateCacheBase(currentAlbum.cacheBase)) {
									titleName = util.pathJoin([randomMedia.dayAlbum, randomMedia.name]);
									// randomMediaLink = util.pathJoin(["#!", randomMedia.dayAlbumCacheBase, randomMedia.foldersCacheBase, randomMedia.cacheBase]);
								} else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
									humanGeonames = util.pathJoin([Options.by_gps_string, randomMedia.geoname.country_name, randomMedia.geoname.region_name, randomMedia.geoname.place_name]);
									titleName = util.pathJoin([humanGeonames, randomMedia.name]);
									// randomMediaLink = util.pathJoin(["#!", randomMedia.gpsAlbumCacheBase, randomMedia.foldersCacheBase, randomMedia.cacheBase]);
								} else if (util.isSearchCacheBase(currentAlbum.cacheBase)) {
									titleName = randomMedia.albumName;
									// randomMediaLink = util.pathJoin(["#!", randomMedia.foldersCacheBase, currentAlbum.cacheBase + Options.cache_folder_separator + theSubalbum.cacheBase, randomMedia.cacheBase]);
								} else {
									titleName = randomMedia.albumName;
									// randomMediaLink = util.pathJoin(["#!", randomMedia.foldersCacheBase, randomMedia.cacheBase]);
								}
								randomMediaLink = phFl.encodeHash(randomAlbum, randomMedia);

								titleName = titleName.substr(titleName.indexOf('/') + 1);
								goTo = _t(".go-to") + " " + titleName;
								htmlText =	"<a href=\"" + randomMediaLink + "\">" +
										"<img src=\"img/link-arrow.png\" " +
											"title=\"" + goTo + "\" " +
											"alt=\"" + goTo + "\" " +
											"class=\"album-button-random-media-link\" " +
											" style=\"width: 20px;" +
												" height: 20px;" +
												"\"" +">" +
										"</a>" +
										"<span class=\"helper\"></span>" +
										"<img " +
											"title=\"" + titleName + "\"" +
											" class=\"thumbnail\"" +
											" src=\"" + encodeURI(mediaSrc) + "\"" +
											" style=\"width:" + thumbWidth + "px;" +
												" height:" + thumbHeight + "px;" +
												"\"" +
										">";
								theImage.html(htmlText);

								numSubAlbumsReady ++;
								if (numSubAlbumsReady >= theOriginalAlbumContainer.subalbums.length) {
									// now all the subalbums random thumbnails has been loaded
									// we can run the function that prepare the stuffs for sharing
									socialButtons();
								}
							}, function error() {
								currentAlbum.subalbums.splice(currentAlbum.subalbums.indexOf(theSubalbum), 1);
								theLink.remove();
								subalbums.splice(subalbums.indexOf(theLink), 1);
							});
							i ++; i --;
						})(currentAlbum.subalbums[i], image, container);
						//////////////////// end anonymous function /////////////////////
					}

					$("#subalbums").show();
					$("#album-view").removeClass("media-view-container");

					// check for overflow in album-caption class in order to adapt album caption height to the string length
					// when diving into search subalbum, the whole album path is showed and it can be lengthy
					if (Options.show_album_names_below_thumbs) {
						var maxHeight = null;
						$('.album-caption').each(function() {
							var thisHeight = $(this)[0].scrollHeight;
							maxHeight = (thisHeight > maxHeight) ? thisHeight : maxHeight;
						});
						var difference = maxHeight - parseFloat($(".album-caption").css("height"));
						$(".album-button-and-caption").css("height", (parseInt($(".album-button-and-caption").css("height")) + difference) + 'px');
						$(".album-caption").css("height", maxHeight + 'px');
					}

					if (Options.albums_slide_style)
						$(".album-button").css("background-color", Options.album_button_background_color);
					else
						$(".album-button").css("border", "none");
				}
			}

		}

		if (currentMedia === null && ! isAlbumWithOneMedia(currentAlbum)) {
			$(".thumb-container").removeClass("current-thumb");
			$("#album-view").removeClass("media-view-container");
			if (currentAlbum.subalbums.length > 0)
				$("#subalbums").show();
			else
				$("#subalbums").hide();
			$("#media-view").hide();
			$("#media-view").removeClass("no-bottom-space");
			$("#album-view").removeClass("no-bottom-space");
			$("#media-box-inner").show().children().last().remove();
			$("#media-box").hide();
			$("#album-view").removeClass("hidden");
			var foldersViewLink = "#!/" + encodeURIComponent(Options.folders_string);
			var byDateViewLink = "#!/" + encodeURIComponent(Options.by_date_string);
			var byGpsViewLink = "#!/" + encodeURIComponent(Options.by_gps_string);
			$(".day-gps-folders-view").removeClass("selected").addClass("active").removeClass("hidden").off("click");
			if (currentAlbum.cacheBase == Options.folders_string) {
				$("#folders-view").removeClass("active").addClass("selected");
				$("#by-date-view").on("click", function(ev) {
					window.location.href = byDateViewLink;
				});
				util.addClickToByGpsButton(byGpsViewLink);
			} else if (currentAlbum.cacheBase == Options.by_date_string) {
				$("#folders-view").on("click", function(ev) {
					window.location.href = foldersViewLink;
				});
				$("#by-date-view").removeClass("active").addClass("selected");
				util.addClickToByGpsButton(byGpsViewLink);
			}	else if (currentAlbum.cacheBase == Options.by_gps_string) {
				$("#folders-view").on("click", function(ev) {
					window.location.href = foldersViewLink;
				});
				$("#by-date-view").on("click", function(ev) {
					window.location.href = byDateViewLink;
				});
				$("#by-gps-view").removeClass("active").addClass("selected");
			} else if (
				util.isSearchCacheBase(currentAlbum.cacheBase) && currentAlbum.media.length === 0 && currentAlbum.subalbums.length === 0
			) {
				$("#folders-view").on("click", function(ev) {
					$("#album-view").removeClass("hidden");
					$(".search-failed").hide();
					window.location.href = foldersViewLink;
				});
				$("#by-date-view").on("click", function(ev) {
					$(".search-failed").hide();
					$("#album-view").removeClass("hidden");
					window.location.href = byDateViewLink;
				});
				util.addClickToByGpsButton(byGpsViewLink);
			} else {
				$(".day-gps-folders-view").addClass("hidden");
			}
			$("#powered-by").show();

			ps.addGesturesDetection('#album-view');
		} else {
			if (currentAlbum.media.length == 1)
				$("#album-view").addClass("hidden");
			else
				$("#album-view").removeClass("hidden");
			$("#powered-by").hide();
		}

		setOptions();

		if (! $("#album-view").hasClass("hidden"))
			setTimeout(scrollToThumb, 1);
	}

	function chooseThumbnail(album, media, thumbnailSize) {
		return util.mediaPath(album, media, thumbnailSize);
	}

	function videoOK(media, id) {
		var cacheBase = util.pathJoin([media.parent.cacheBase, media.cacheBase]);
		if (! Modernizr.video) {
			$(".media-box#" + id + " .media-box-inner").html('<div id="video-unsupported-html5"' + cacheBase + '>' + _t("#video-unsupported-html5") + '</div>');
			return false;
		}
		else if (! Modernizr.video.h264) {
			$(".media-box#" + id + " .media-box-inner").html('<div id="video-unsupported-h264' + cacheBase + '">' + _t("#video-unsupported-h264") + '</div>');
			return false;
		}

		return true;
	}

	function showMedia(album, media, id) {

		function loadNextPrevMedia() {
			if (id === "center") {
				showMedia(album, prevMedia, 'left');
				showMedia(album, nextMedia, 'right');
			}
		}

		var text, thumbnailSize, i, linkTag, triggerLoad, array, element;
		var exposureTime, albumViewHeight;
		var array, savedSearchSubAlbumHash, savedSearchAlbumHash;
		var videoOk;

		array = phFl.decodeHash(location.hash);
		// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
		savedSearchSubAlbumHash = array[3];
		savedSearchAlbumHash = array[4];

		mediaLink = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
		firstEscKey = true;

		thumbnailSize = Options.media_thumb_size;

		if (id === "center") {
			if (Options.hide_title_and_thumbnails)
				$("#album-view").addClass("hidden");
			else
				$("#album-view").removeClass("hidden");

			if (currentAlbum.media.length == 1)
				$("#album-view").addClass("hidden");
			else {
				$("#album-view").addClass("media-view-container");
				// $("#album-view").css("height", (thumbnailSize + 20).toString() + "px");
				$("#album-view.media-view-container").css("height", (thumbnailSize + 22).toString() + "px");
			}
		}

		albumViewHeight = $("#album-view").outerHeight();
		heightForMediaAndTitle = windowHeight - albumViewHeight;
		heightForMedia = heightForMediaAndTitle - $(".media-box#" + id + " .title").outerHeight();

		if (id === "center") {
			$("#media-box-container").css("width", windowWidth * 3).css("height", heightForMediaAndTitle).css("transform", "translate(-" + windowWidth + "px, 0px)");
			array = [id, 'left', 'right'];
			for (i = 0; i < array.length; i ++) {
				$(".media-box#" + array[i]).css("width", windowWidth).css("height", heightForMediaAndTitle);
				$(".media-box#" + array[i] + " .media-box-inner").css("width", windowWidth).css("height", heightForMedia);
				$(".media-box#" + array[i]).show();
			}
		}

		setTitle(id);

		if (currentAlbum.media.length == 1) {
			$(".media-box#" + id + " .next").hide();
			$(".media-box#" + id + " .prev").hide();
			// $("#media-view").addClass("no-bottom-space");
			// $("#album-view").addClass("no-bottom-space");
		} else {
			$(".media-box#" + id + " .next").show();
			$(".media-box#" + id + " .prev").show();
			// $("#media-view").removeClass("no-bottom-space");
			// $("#album-view").removeClass("no-bottom-space");
			// if ($("#album-view").is(":visible")) {
			// 	// $("#media-view").css("bottom", (thumbnailSize + 15).toString() + "px");
			// 	$("#media-view").css("bottom", albumViewHeight + "px");
			// }
		}

		currentAlbum.media[currentMediaIndex].byDateName =
			util.pathJoin([currentAlbum.media[currentMediaIndex].dayAlbum, currentAlbum.media[currentMediaIndex].name]);
		if (currentAlbum.media[currentMediaIndex].hasOwnProperty("gpsAlbum"))
			currentAlbum.media[currentMediaIndex].byGpsName =
					util.pathJoin([currentAlbum.media[currentMediaIndex].gpsAlbum, currentAlbum.media[currentMediaIndex].name]);

		nextMedia = null;
		prevMedia = null;
		if (currentAlbum.media.length > 1) {
			// prepare for previous media
			previousMediaIndex = (currentMediaIndex === 0 ?
															currentAlbum.media.length - 1 :
															currentMediaIndex - 1);
			prevMedia = currentAlbum.media[previousMediaIndex];
			prevMedia.byDateName = util.pathJoin([prevMedia.dayAlbum, prevMedia.name]);
			if (prevMedia.hasOwnProperty("gpsAlbum"))
				prevMedia.byGpsName = util.pathJoin([prevMedia.gpsAlbum, prevMedia.name]);

			// prepare for next media
			nextMediaIndex = (currentMediaIndex === currentAlbum.media.length - 1 ?
													0 :
													currentMediaIndex + 1);
			nextMedia = currentAlbum.media[nextMediaIndex];
			nextMedia.byDateName = util.pathJoin([nextMedia.dayAlbum, nextMedia.name]);
			if (nextMedia.hasOwnProperty("gpsAlbum"))
				nextMedia.byGpsName = util.pathJoin([nextMedia.gpsAlbum, nextMedia.name]);
		}

		if (
			currentMedia.mediaType == "photo" ||
			currentMedia.mediaType == "video" && videoOK(currentMedia, id)
		) {
			// var mediaId = "media-" + selector.substring(1);
			// var mediaSelector = "#" + mediaId;
			var mediaSelector = ".media-box#" + id + " .media-box-inner img";
			array = util.createMedia(media, fullScreenStatus);
			element = array[0];
			linkTag = array[1];
			triggerLoad = array[2];

			$(".media-box#" + id + " .media-box-inner").show().append(element[0]);

			$("link[rel=image_src]").remove();
			$('link[rel="video_src"]').remove();
			$("head").append(linkTag);

			$(mediaSelector).off(triggerLoad);
			$(mediaSelector).on(
				triggerLoad,
				{
					// id: mediaId,
					id: id,
					media: media,
					resize: false,
					callback: loadNextPrevMedia
				},
				util.scaleMedia
			);
			// in case the image has been already loaded, trigger the event
			$(mediaSelector).trigger(triggerLoad);

			if (id === "center") {
				$(window).off("resize");
				$(window).on(
					"resize",
					{
						id: id,
						media: media,
						resize: true,
						callback: loadNextPrevMedia
					},
					util.scaleMedia
				);
			}

			if (! Options.persistent_metadata) {
				$("#metadata").hide();
				$("#metadata-show").show();
				$("#metadata-hide").hide();
			}
		} else
			loadNextPrevMedia();

		$("#media-view").off('contextmenu click mousewheel');
		$(".media-box#" + id + " .media-box-inner .media-bar").off();
		$(".media-box#" + id + " .next").off();
		$(".media-box#" + id + " .prev").off();


		upLink = phFl.upHash(location.hash);
		if (currentAlbum.media.length == 1) {
			// nextLink = "";
			// prevLink = "";
			$("#media-view").css('cursor', 'default');
		} else {
			var array = phFl.decodeHash(location.hash);
			// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
			var savedSearchSubAlbumHash = array[3];
			var savedSearchAlbumHash = array[4];

			// nextLink = phFl.encodeHash(currentAlbum, nextMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
			// prevLink = phFl.encodeHash(currentAlbum, prevMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
			$(".media-box#" + id + " .next").show();
			$(".media-box#" + id + " .prev").show();
			$("#media-view")
				.css('cursor', '')
				.on('contextmenu', function(ev) {
					if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						ev.preventDefault();
						ps.swipeRight(prevMedia);
					}
				})
				.on('click', function(ev) {
					if (
						ev.which == 1 && ! ev.altKey &&
						(
							! ev.shiftKey && ! ev.ctrlKey && currentMedia.mediaType == "photo" ||
							(ev.shiftKey || ev.ctrlKey) && currentMedia.mediaType == "video"
						)
					) {
						ps.swipeLeft(nextMedia);
						return false;
					} else {
						return true;
					}
				})
				.on('mousewheel', ps.swipeOnWheel);
				$(".media-box#" + id + " .media-box-inner .media-bar").on('click', function(ev) {
					ev.stopPropagation();
				}).on('contextmenu', function(ev) {
					ev.stopPropagation();
				});
			$(".media-box#" + id + " .prev").on('click', function(ev) {
				if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
					ps.swipeLeft(nextMedia);
					return false;
				}
			});
			$(".media-box#" + id + " .next").on('click', function(ev) {
				if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
					ps.swipeRight(prevMedia);
					return false;
				}
			});
		}

		var originalMediaPath = encodeURI(util.originalMediaPath(currentMedia));
		$(".media-box#" + id + " .original-link").attr("target", "_blank").attr("href", originalMediaPath);
		$(".media-box#" + id + " .download-link").attr("href", originalMediaPath).attr("download", "");
		if (util.hasGpsData(currentMedia)) {
			$(".media-box#" + id + " .menu-map-link").attr("target", "_blank").attr("href", encodeURI(util.mapLink(currentMedia.metadata.latitude, currentMedia.metadata.longitude, Options.photo_map_zoom_level)));
			$(".media-box#" + id + " .menu-map-link").show();
			$(".media-box#" + id + " .menu-map-divider").show();
		} else {
			$(".media-box#" + id + " .menu-map-link").removeAttr("href").css("cursor","pointer");
			$(".media-box#" + id + " .menu-map-link").hide();
			$(".media-box#" + id + " .menu-map-divider").hide();
		}

		var foldersViewLink = "#!/" + util.pathJoin([
									currentMedia.foldersCacheBase,
									currentMedia.cacheBase
								]);
		var byDateViewLink = "#!/" + util.pathJoin([
									currentMedia.dayAlbumCacheBase,
									currentMedia.foldersCacheBase,
									currentMedia.cacheBase
								]);
		if (currentMedia.gpsAlbumCacheBase)
			var byGpsViewLink = "#!/" + util.pathJoin([
									currentMedia.gpsAlbumCacheBase,
									currentMedia.foldersCacheBase,
									currentMedia.cacheBase
								]);


		$(".day-gps-folders-view").addClass("active").removeClass("hidden").removeClass("selected").off("click");
		if (util.isFolderCacheBase(currentAlbum.cacheBase)) {
			// folder album: change to by date or by gps view
			$("#folders-view").removeClass("active").addClass("selected").off("click");
			$("#by-date-view").on("click", function(ev) {
				window.location.href = byDateViewLink;
				return false;
			});

			if (! util.hasGpsData(currentMedia)) {
				$("#by-gps-view").addClass("hidden");
			} else {
				$("#by-gps-view").on("click", function(ev) {
					window.location.href = byGpsViewLink;
					return false;
				});
			}
		} else if (util.isByDateCacheBase(currentAlbum.cacheBase)) {
			// by date album: change to folder or by gps view
			$("#folders-view").on("click", function(ev) {
				window.location.href = foldersViewLink;
				return false;
			});
			$("#by-date-view").removeClass("active").addClass("selected").off("click");
			if (! util.hasGpsData(currentMedia)) {
				$("#by-gps-view").addClass("hidden");
			} else {
				$("#by-gps-view").on("click", function(ev) {
					window.location.href = byGpsViewLink;
					return false;
				});
			}
		} else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
			$("#folders-view").on("click", function(ev) {
				window.location.href = foldersViewLink;
				return false;
			});
			$("#by-date-view").on("click", function(ev) {
				window.location.href = byDateViewLink;
				return false;
			});
			// by gps album: change to folder or by day view
			$("#by-gps-view").removeClass("active").addClass("selected").off("click");
		} else if (util.isSearchCacheBase(currentAlbum.cacheBase)) {
			// by search album: change to folder or by gps or by view
			$("#folders-view").on("click", function(ev) {
				window.location.href = foldersViewLink;
				return false;
			});
			$("#by-date-view").on("click", function(ev) {
				window.location.href = byDateViewLink;
				return false;
			});
			if (! util.hasGpsData(currentMedia)) {
				$("#by-gps-view").addClass("hidden");
			} else {
				$("#by-gps-view").on("click", function(ev) {
					window.location.href = byGpsViewLink;
					return false;
				});
			}
		}

		$(".media-box#" + id + " .metadata tr.gps").off('click');
		text = "<table>";
		if (typeof currentMedia.metadata.title !== "undefined")
			text += "<tr><td class=\"metadata-data-title\"></td><td>" + currentMedia.metadata.title.replace(/\n/g, "<br>") + "</td></tr>";
		if (typeof currentMedia.metadata.description !== "undefined")
			text += "<tr><td class=\"metadata-data-description\"></td><td>" + currentMedia.metadata.description.replace(/\n/g, "<br>") + "</td></tr>";
		if (typeof currentMedia.metadata.tags !== "undefined")
			text += "<tr><td class=\"metadata-data-tags\"></td><td>" + currentMedia.metadata.tags + "</td></tr>";
		if (typeof currentMedia.date !== "undefined")
			text += "<tr><td class=\"metadata-data-date\"></td><td>" + currentMedia.date + "</td></tr>";
		if (typeof currentMedia.metadata.size !== "undefined")
			text += "<tr><td class=\"metadata-data-size\"></td><td>" + currentMedia.metadata.size[0] + " x " + currentMedia.metadata.size[1] + "</td></tr>";
		if (typeof currentMedia.metadata.make !== "undefined")
			text += "<tr><td class=\"metadata-data-make\"></td><td>" + currentMedia.metadata.make + "</td></tr>";
		if (typeof currentMedia.metadata.model !== "undefined")
			text += "<tr><td class=\"metadata-data-model\"></td><td>" + currentMedia.metadata.model + "</td></tr>";
		if (typeof currentMedia.metadata.aperture !== "undefined")
			text += "<tr><td class=\"metadata-data-aperture\"></td><td> f/" + currentMedia.metadata.aperture + "</td></tr>";
		if (typeof currentMedia.metadata.focalLength !== "undefined")
			text += "<tr><td class=\"metadata-data-focalLength\"></td><td>" + currentMedia.metadata.focalLength + " mm</td></tr>";
		if (typeof currentMedia.metadata.subjectDistanceRange !== "undefined")
			text += "<tr><td class=\"metadata-data-subjectDistanceRange\"></td><td>" + currentMedia.metadata.subjectDistanceRange + "</td></tr>";
		if (typeof currentMedia.metadata.iso !== "undefined")
			text += "<tr><td class=\"metadata-data-iso\"></td><td>" + currentMedia.metadata.iso + "</td></tr>";
		if (typeof currentMedia.metadata.sceneCaptureType !== "undefined")
			text += "<tr><td class=\"metadata-data-sceneCaptureType\"></td><td>" + currentMedia.metadata.sceneCaptureType + "</td></tr>";
		if (typeof currentMedia.metadata.exposureTime !== "undefined") {
			if (typeof currentMedia.metadata.exposureTime === "string")
				exposureTime = currentMedia.metadata.exposureTime;
			else if (currentMedia.metadata.exposureTime > 0.3)
				exposureTime = Math.round(currentMedia.metadata.exposureTime * 10 ) / 10;
			else
				exposureTime = "1/" + Math.round(1 / currentMedia.metadata.exposureTime);
			text += "<tr><td class=\"metadata-data-exposureTime\"></td><td>" + exposureTime + " sec</td></tr>";
		}
		if (typeof currentMedia.metadata.exposureProgram !== "undefined")
			text += "<tr><td class=\"metadata-data-exposureProgram\"></td><td>" + currentMedia.metadata.exposureProgram + "</td></tr>";
		if (typeof currentMedia.metadata.exposureCompensation !== "undefined")
			text += "<tr><td class=\"metadata-data-exposureCompensation\"></td><td>" + currentMedia.metadata.exposureCompensation + "</td></tr>";
		if (typeof currentMedia.metadata.spectralSensitivity !== "undefined")
			text += "<tr><td class=\"metadata-data-spectralSensitivity\"></td><td>" + currentMedia.metadata.spectralSensitivity + "</td></tr>";
		if (typeof currentMedia.metadata.sensingMethod !== "undefined")
			text += "<tr><td class=\"metadata-data-sensingMethod\"></td><td>" + currentMedia.metadata.sensingMethod + "</td></tr>";
		if (typeof currentMedia.metadata.lightSource !== "undefined")
			text += "<tr><td class=\"metadata-data-lightSource\"></td><td>" + currentMedia.metadata.lightSource + "</td></tr>";
		if (typeof currentMedia.metadata.flash !== "undefined")
			text += "<tr><td class=\"metadata-data-flash\"></td><td>" + currentMedia.metadata.flash + "</td></tr>";
		if (typeof currentMedia.metadata.orientationText !== "undefined")
			text += "<tr><td class=\"metadata-data-orientation\"></td><td>" + currentMedia.metadata.orientationText + "</td></tr>";
		if (typeof currentMedia.metadata.duration !== "undefined")
			text += "<tr><td class=\"metadata-data-duration\"></td><td>" + currentMedia.metadata.duration + " sec</td></tr>";
		if (typeof currentMedia.metadata.latitude !== "undefined")
			text += "<tr class='map-link' class='gps'><td class=\"metadata-data-latitude\"></td><td>" + currentMedia.metadata.latitudeMS + " </td></tr>";
		if (typeof currentMedia.metadata.longitude !== "undefined")
			text += "<tr class='gps'><td class=\"metadata-data-longitude\"></td><td>" + currentMedia.metadata.longitudeMS + " </td></tr>";
		text += "</table>";
		$(".media-box#" + id + " .metadata").html(text);
		var linkTitle = _t('#show-map') + Options.map_service;
		$(".media-box#" + id + " .metadata tr.gps").attr("title", linkTitle).on('click', function(ev) {
			ev.stopPropagation();
			window.open(util.mapLink(currentMedia.metadata.latitude, currentMedia.metadata.longitude, Options.photo_map_zoom_level), '_blank');
		});

		translate();

		$("#subalbums").hide();
		$("#media-view").show();

		ps.addGesturesDetection('#media-view');
	}

	function setOptions() {
		var albumThumbnailSize, mediaThumbnailSize;
		albumThumbnailSize = Options.album_thumb_size;
		mediaThumbnailSize = Options.media_thumb_size;
		$("body").css("background-color", Options.background_color);

		$(".title").css("font-size", Options.title_font_size);
		$(".title-anchor").css("color", Options.title_color);
		$(".title-anchor").hover(function() {
			//mouse over
			$(this).css("color", Options.title_color_hover);
		}, function() {
			//mouse out
			$(this).css("color", Options.title_color);
		});
		$(".media-name").css("color", Options.title_image_name_color);
		$(".thumb-and-caption-container").css("margin-right", Options.spacing.toString() + "px");

		if (currentMedia !== null || ! Options.show_media_names_below_thumbs)
			$(".media-caption").addClass("hidden");
		else
			$(".media-caption").removeClass("hidden");

		if (Options.show_album_media_count)
			$(".title-count").removeClass("hidden");
		else
			$(".title-count").addClass("hidden");

		if (Options.hide_title_and_thumbnails)
			$(".title").addClass("hidden");
		else
			$(".title").removeClass("hidden");
	}

	function getBooleanCookie(key) {
		var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
		if (! keyValue)
			return null;
		else if (keyValue[2] == 1)
			return true;
		else
			return false;
	}

	function expireInterval() {
		// returns the expire interval for the cookies, in seconds
		// = 1000 days, ~ 3 years
		return 1000 * 24 * 60 * 60;
	}

	function setBooleanCookie(key, value) {
		var expires = new Date();
		expires.setTime(expires.getTime() + expireInterval() * 1000);
		if (value)
			value = 1;
		else
			value = 0;
		document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
		return true;
	}

	function getCookie(key) {
		var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
		if (! keyValue)
			return null;
		else
			return keyValue[2];
	}
	function getNumberCookie(key) {
		var keyValue = getCookie(key);
		if (keyValue === null)
			return null;
		else
			return parseFloat(keyValue);
	}
	function setCookie(key, value) {
		var expires = new Date();
		expires.setTime(expires.getTime() + expireInterval() * 1000);
		document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
		return true;
	}

	// this function refer to the need that the html showed be sorted
	function needAlbumNameSort() {
		var result =
			currentAlbum.subalbums.length &&
			! currentAlbum.albumNameSort &&
			getBooleanCookie("albumNameSortRequested");
		return result;
	}
	function needAlbumDateSort() {
		var result =
			currentAlbum.subalbums.length &&
			currentAlbum.albumNameSort &&
			! getBooleanCookie("albumNameSortRequested");
		return result;
	}
	function needAlbumDateReverseSort() {
		var result =
			currentAlbum.subalbums.length &&
			! currentAlbum.albumNameSort &&
			currentAlbum.albumDateReverseSort !== getBooleanCookie("albumDateReverseSortRequested");
		return result;
	}
	function needAlbumNameReverseSort() {
		var result =
			currentAlbum.subalbums.length &&
			currentAlbum.albumNameSort &&
			currentAlbum.albumNameReverseSort !== getBooleanCookie("albumNameReverseSortRequested");
		return result;
	}

	function needMediaNameSort() {
		var result =
			currentAlbum.media.length &&
			! currentAlbum.mediaNameSort &&
			getBooleanCookie("mediaNameSortRequested");
		return result;
	}
	function needMediaDateSort() {
		var result =
			currentAlbum.media.length &&
			currentAlbum.mediaNameSort &&
			! getBooleanCookie("mediaNameSortRequested");
		return result;
	}
	function needMediaDateReverseSort() {
		var result =
			currentAlbum.media.length &&
			! currentAlbum.mediaNameSort &&
			currentAlbum.mediaDateReverseSort !== getBooleanCookie("mediaDateReverseSortRequested");
		return result;
	}
	function needMediaNameReverseSort() {
		var result =
			currentAlbum.media.length &&
			currentAlbum.mediaNameSort &&
			currentAlbum.mediaNameReverseSort !== getBooleanCookie("mediaNameReverseSortRequested");
		return result;
	}

	/* Error displays */

	function die(error) {
		if (error == 403) {
			$("#auth-text").stop().fadeIn(1000);
			$("#password").focus();
		} else {
			// Jason's code only had the following line
			//$("#error-text").stop().fadeIn(2500);

			var rootLink = "#!/" + Options.folders_string;

			$("#album-view").fadeOut(200);
			$("#media-view").fadeOut(200);

			if (window.location.href == rootLink) {
				$("#loading").hide();
				$("#error-text-folder").stop();
				$("#error-root-folder").stop().fadeIn(2000);
				$("#powered-by").show();
			} else {
				$("#error-text-folder").stop().fadeIn(200);
				$("#error-text-folder, #error-overlay, #auth-text").fadeOut(3500);
				$("#album-view").stop().fadeOut(100).fadeIn(3500);
				$("#media-view").stop().fadeOut(100).fadeIn(3500);
				window.location.href = rootLink;
			}
		}
		// $("#error-overlay").fadeTo(500, 0.8);
		$("body, html").css("overflow", "hidden");
	}

	function undie() {
		$(".error, #error-overlay, #auth-text", ".search-failed").fadeOut(500);
		$("body, html").css("overflow", "auto");
	}



	/* Entry point for most events */

	function hashParsed(album, media, mediaIndex) {
		var populateAlbum;
		var currentAlbumPath, currentAlbumPathArray;

		undie();
		$("#loading").hide();

		$(window).off("resize");

		if (album === currentAlbum && media === currentMedia)
			return;
		if (album != currentAlbum)
			currentAlbum = null;

		previousAlbum = currentAlbum;
		if (currentAlbum && util.isByDateCacheBase(currentAlbum.cacheBase) && media !== null) {
			previousMedia = media;
		} else {
			previousMedia = currentMedia;
		}
		currentAlbum = album;
		currentMedia = media;
		currentMediaIndex = mediaIndex;

		setOptions();

		if (currentMedia === null || typeof currentMedia === "object") {
			initializeSortPropertiesAndCookies();
			$("#menu-icon").attr("title", _t("#menu-icon-title"));
			sortAlbumsMedia();
			updateMenu();
		}

		currentAlbumPathArray = currentAlbum.path.split('/').slice(1);
		if (util.isByGpsCacheBase(currentAlbum.cacheBase))
			currentAlbumPathArray = currentAlbum.ancestorsNames.slice(2);
		currentAlbumPath = currentAlbumPathArray.join('/');

		$("#album-search").attr('title', _t("#current-album-is") + '"'+ currentAlbumPath + '"');

		var isAlbumWithOneMedia = util.isAlbumWithOneMedia(currentAlbum);
		if (currentMedia !== null || isAlbumWithOneMedia) {
			if (isAlbumWithOneMedia) {
				currentMedia = currentAlbum.media[0];
				currentMediaIndex = 0;
				$("#media-container").css("cursor", "default");
				$("#album-view").addClass("hidden");
			} else {
				$("#media-container").css("cursor", "ew-resize");
			}
			nextMedia = null;
			previousMedia = null;
			$("#album-view .title").hide();
			$("#media-view .title").show();
			showMedia(currentAlbum, currentMedia, 'center');
		} else {
			$("#album-view .title").show();
			$("#media-view .title").hide();
			$("#album-view").removeClass("media-view-container");
		}

		// if (! isAlbumWithOneMedia || $("#album-view").is(":visible")) {
		if ($("#album-view").is(":visible")) {
			populateAlbum =
			 	previousAlbum !== currentAlbum || previousMedia !== currentMedia;
			showAlbum(populateAlbum);
		}

		// options function must be called again in order to set elements previously absent
		setOptions();
		if (currentMedia !== null) {
			// no subalbums, nothing to wait
			// set social buttons events
			if (currentMedia.mediaType == "video")
				$("#media").on("loadstart", socialButtons);
			else
				$("#media").on("load", socialButtons);
		} else  if (
			currentAlbum !== null && ! currentAlbum.subalbums.length ||
			numSubAlbumsReady >= album.subalbums.length
		) {
			// no subalbums
			// set social buttons href's when all the stuff is loaded
			$(window).on("load", socialButtons());
		} else {
			// subalbums are present, we have to wait when all the random thumbnails will be loaded
		}
		fromEscKey = false;

		return;
	}

	function getOptions(hash, callback, error) {
		var ajaxOptions = {
			type: "GET",
			dataType: "json",
			url: "cache/options.json",
			success: function(data) {
				// for map zoom levels, see http://wiki.openstreetmap.org/wiki/Zoom_levels

				for (var key in data)
					if (data.hasOwnProperty(key))
						Options[key] = data[key];
				translate();
				// server_cache_path actually is a constant: it cannot be passed as an option, because getOptions need to know it before reading the options
				// options.json is in this directory
				Options.server_cache_path = 'cache';

				maxSize = Options.reduced_sizes[Options.reduced_sizes.length - 1];

				// override according to user selections
				var titleCookie = getBooleanCookie("hide_title_and_thumbnails");
				if (titleCookie !== null)
					Options.hide_title_and_thumbnails = titleCookie;

				var slideCookie = getBooleanCookie("albums_slide_style");
				if (slideCookie !== null)
					Options.albums_slide_style = slideCookie;

				if (Options.thumb_spacing)
					Options.spacingToggle = Options.thumb_spacing;
				else
					Options.spacingToggle = Options.media_thumb_size * 0.03;

				var spacingCookie = getNumberCookie("spacing");
				if (spacingCookie !== null) {
					Options.spacing = spacingCookie;
				} else {
					Options.spacing = Options.thumb_spacing;
				}

				var showAlbumNamesCookie = getBooleanCookie("show_album_names_below_thumbs");
				if (showAlbumNamesCookie !== null)
					Options.show_album_names_below_thumbs = showAlbumNamesCookie;

				var showMediaCountCookie = getBooleanCookie("show_album_media_count");
				if (showMediaCountCookie !== null)
					Options.show_album_media_count = showMediaCountCookie;

				var showMediaNamesCookie = getBooleanCookie("show_media_names_below_thumbs");
				if (showMediaNamesCookie !== null)
					Options.show_media_names_below_thumbs = showMediaNamesCookie;

				var squareAlbumsCookie = getCookie("album_thumb_type");
				if (squareAlbumsCookie !== null)
					Options.album_thumb_type = squareAlbumsCookie;

				var squareMediaCookie = getCookie("media_thumb_type");
				if (squareMediaCookie !== null)
					Options.media_thumb_type = squareMediaCookie;

				Options.search_inside_words = false;
				var searchInsideWordsCookie = getBooleanCookie("search_inside_words");
				if (searchInsideWordsCookie !== null)
					Options.search_inside_words = searchInsideWordsCookie;

				Options.search_any_word = false;
				var searchAnyWordCookie = getBooleanCookie("search_any_word");
				if (searchAnyWordCookie !== null)
					Options.search_any_word = searchAnyWordCookie;

				Options.search_case_sensitive = false;
				var searchCaseSensitiveCookie = getBooleanCookie("search_case_sensitive");
				if (searchCaseSensitiveCookie !== null)
					Options.search_case_sensitive = searchCaseSensitiveCookie;

				Options.search_accent_sensitive = false;
				var searchAccentSensitiveCookie = getBooleanCookie("search_accent_sensitive");
				if (searchAccentSensitiveCookie !== null)
					Options.search_accent_sensitive = searchAccentSensitiveCookie;

				Options.search_current_album = true;
				var searchCurrentAlbumCookie = getBooleanCookie("search_current_album");
				if (searchCurrentAlbumCookie !== null)
					Options.search_current_album = searchCurrentAlbumCookie;

				// Options.search_refine = false;
				// var searchRefineCookie = getBooleanCookie("search_refine");
				// if (searchRefineCookie !== null)
				// 	Options.search_refine = searchRefineCookie;

				if (! Options.hasOwnProperty('album_to_search_in') || ! Options.album_to_search_in)
					Options.album_to_search_in = Options.folders_string;
				if (! Options.hasOwnProperty('saved_album_to_search_in') || ! Options.saved_album_to_search_in)
					Options.saved_album_to_search_in = Options.folders_string;

				Options.foldersStringWithTrailingSeparator = Options.folders_string + Options.cache_folder_separator;
				Options.byDateStringWithTrailingSeparator = Options.by_date_string + Options.cache_folder_separator;
				Options.byGpsStringWithTrailingSeparator = Options.by_gps_string + Options.cache_folder_separator;
				Options.bySearchStringWithTrailingSeparator = Options.by_search_string + Options.cache_folder_separator;

				// phFl.parseHash(hash, callback, error);
				parseHash(hash, callback, error);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				if (errorThrown == "Not Found") {
					$("#album-view").fadeOut(200);
					$("#media-view").fadeOut(200);
					$("#album-view").stop().fadeIn(3500);
					$("#media-view").stop().fadeIn(3500);
					$("#error-options-file").stop().fadeIn(200);
					$("#error-options-file, #error-overlay, #auth-text").fadeOut(2500);
				}
			}
		};
		$.ajax(ajaxOptions);
	}

	// this function is needed in order to let this point to the correct value in phFl.parseHash
	function parseHash(hash, callback, error) {
		if (! util.isSearchHash(hash)) {
			// reset current album search flag to its default value
			Options.search_current_album = true;
			setBooleanCookie("search_current_album", Options.search_current_album);
			updateMenu();
		}

		if (Object.keys(Options).length > 0) {
			if (! util.isSearchHash(hash))
				// reset the return link from search
				Options.album_to_search_in = phFl.cleanHash(hash);
			//
			// if (! Options.hasOwnProperty('album_to_search_in') || ! Options.album_to_search_in)
			// 	Options.album_to_search_in = Options.folders_string;

			phFl.parseHash(hash, callback, error);
		} else {
			getOptions(hash, callback, error);
		}
		// phFl.parseHash(hash, callback, error);
	}

	/* Event listeners */

	$(document).on('keydown', function(e) {
		if (! $("#search-field").is(':focus')) {
			if (! e.ctrlKey && ! e.shiftKey && ! e.altKey) {
				if (
					(e.keyCode === 39 || e.keyCode === 78 || e.keyCode === 13 || e.keyCode === 32) &&
					//    arrow right                  n               return               space
					nextMedia && currentMedia !== null
				) {
					ps.swipeLeft(nextMedia);
					return false;
				} else if (
					(e.keyCode === 37 || e.keyCode === 80 || e.keyCode === 8) &&
					//     arrow left                  p           backspace
					prevMedia && currentMedia !== null
				) {
					ps.swipeRight(prevMedia);
					return false;
				} else if (e.keyCode === 27 && ! Modernizr.fullscreen && fullScreenStatus) {
					//                    esc
					goFullscreen(e);
					return false;
				} else if ((e.keyCode === 27 || e.keyCode === 38 || e.keyCode === 33) && upLink) {
					//                     esc            arrow up             page up
					fromEscKey = true;
					ps.swipeDown(upLink);
					return false;
				} else if ((e.keyCode === 40 || e.keyCode === 34) && mediaLink && currentMedia === null) {
					//              arrow down           page down
					ps.swipeUp(mediaLink);
					return false;
				} else if (e.keyCode === 68 && currentMedia !== null) {
					//                      d
					$("#download-link")[0].click();
					return false;
				} else if (e.keyCode === 70 && currentMedia !== null) {
					//                      f
					goFullscreen(e);
					return false;
				} else if (e.keyCode === 77 && currentMedia !== null) {
					//                      m
					showMetadata(e);
					return false;
				} else if (currentMedia !== null && e.keyCode === 79) {
					//                                              o
					$("#original-link")[0].click();
					return false;
				} else if (e.keyCode === 83 && currentMedia !== null && util.hasGpsData(currentMedia)) {
					 	//                    s
						$("#map-link")[0].click();
						return false;
				}
			}
		}

		if (
			(
				e.target.tagName.toLowerCase() != 'input' && e.keyCode === 69 ||
				//                                                         e: opens (and closes, if focus in not in input field) the menu
				$("ul#right-menu").hasClass("expand") && e.keyCode === 27
				//                                                    esc: closes the menu
			) &&
		 	! e.ctrlKey && ! e.shiftKey && ! e.altKey
		) {
			$("#menu-icon")[0].click();
			return false;
		}
	return true;
	});

	$("#album-view").on('mousewheel', ps.swipeOnWheel);

	if (isMobile.any()) {
		$(".media-box#center .links").css("display", "inline").css("opacity", 0.5);
	} else {
		//~ $("#media-view").off();
		$("#media-view").on('mouseenter', function() {
			$(".media-box#center .links").stop().fadeTo("slow", 0.50).css("display", "inline");
		});
		$("#media-view").on('mouseleave', function() {
			$(".media-box#center .links").stop().fadeOut("slow");
		});
	}

	$("#next, #prev").on('mouseenter', function() {
		$(this).stop().fadeTo("fast", 1);
	});

	$("#next, #prev").on('mouseleave', function() {
		$(this).stop().fadeTo("fast", 0.4);
	});

	$(".metadata-show").on('click', showMetadataFromMouse);
	$(".metadata-hide").on('click', showMetadataFromMouse);
	$(".metadata").on('click', showMetadataFromMouse);

	$(".fullscreen").on('click', goFullscreenFromMouse);
	$("#next").attr("title", _t("#next-media-title"));
	$("#prev").attr("title", _t("#prev-media-title"));

	function goFullscreen(e) {
		$("#media").off();
		if (Modernizr.fullscreen) {
			e.preventDefault();
			$("#album-view").addClass('hidden');
			$("#media-box").fullScreen({
				callback: function(isFullscreen) {
					fullScreenStatus = isFullscreen;
					$("#enter-fullscreen").toggle();
					$("#exit-fullscreen").toggle();
					showMedia(currentAlbum, currentMedia, 'center');
				}
			});
		} else {
			$("#media").off();
			if (! fullScreenStatus) {
				$(".title").hide();
				$("#album-view").addClass('hidden');
				$("#enter-fullscreen").toggle();
				$("#exit-fullscreen").toggle();
				fullScreenStatus = true;
			} else {
				$(".title").show();
				$("#album-view").removeClass('hidden');
				$("#enter-fullscreen").toggle();
				$("#exit-fullscreen").toggle();
				fullScreenStatus = false;
			}
			showMedia(currentAlbum, currentMedia, 'center');
		}
	}

	function goFullscreenFromMouse(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			goFullscreen(ev);
			return false;
		}
	}

	function showMetadataFromMouse(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			ev.stopPropagation();
			showMetadata();
			return false;
		}
	}

	function focusSearchField() {
		if (! isMobile.any())
			$("#search-field").focus();
		else
			$("#search-field").blur();
	}

	// binds the click events to the sort buttons

	// search
	$('#search-button').on("click", function() {
		var searchOptions = '';
		var array = phFl.decodeHash(location.hash);
		var albumHash = array[0];

		// save the current hash in order to come back there when exiting from search
		if (util.isSearchCacheBase(albumHash)) {
			// a plain search: get the folder to search in from the search album hash
			Options.album_to_search_in = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
		} else {
			// it's a subalbum of a search or it's not a search hash: use the current album hash
			Options.album_to_search_in = albumHash;

			Options.saved_album_to_search_in = Options.album_to_search_in;
		}

		if (! Options.hasOwnProperty('album_to_search_in') || ! Options.album_to_search_in)
			Options.album_to_search_in = Options.folders_string;

		var bySearchViewHash = "#!/" + Options.by_search_string;

		// build the search album part of the hash
		var searchTerms = encodeURIComponent($("#search-field").val().normalize().trim().replace(/  /g, ' ').replace(/ /g, '_'));
		if (searchTerms) {
			bySearchViewHash += Options.cache_folder_separator;
			if (Options.search_inside_words)
				searchOptions += 'i' + Options.search_options_separator;
			if (Options.search_any_word)
				searchOptions += 'n' + Options.search_options_separator;
			if (Options.search_case_sensitive)
				searchOptions += 'c' + Options.search_options_separator;
			if (Options.search_accent_sensitive)
				searchOptions += 'a' + Options.search_options_separator;
			if (Options.search_current_album)
				searchOptions += 'o' + Options.search_options_separator;
			// if (Options.search_refine)
			// 	searchOptions += 'e' + Options.search_options_separator;
			bySearchViewHash += searchOptions + searchTerms;
		}

		bySearchViewHash += Options.cache_folder_separator + Options.album_to_search_in;

		window.location.href = bySearchViewHash;

		focusSearchField();
		return false;
	});
	$('#search-field').keypress(function(ev) {
		if (ev.which == 13) {
			//Enter key pressed, trigger search button click event
			$('#search-button').click();
			focusSearchField();
			return false;
		}
	});

	$("li#inside-words").on('click', toggleInsideWordsSearch);
	function toggleInsideWordsSearch(ev) {
		Options.search_inside_words = ! Options.search_inside_words;
		setBooleanCookie("search_inside_words", Options.search_inside_words);
		updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		focusSearchField();
	}

	$("li#any-word").on('click', toggleAnyWordSearch);
	function toggleAnyWordSearch(ev) {
		Options.search_any_word = ! Options.search_any_word;
		setBooleanCookie("search_any_word", Options.search_any_word);
		updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		focusSearchField();
	}

	$("li#case-sensitive").on('click', toggleCaseSensitiveSearch);
	function toggleCaseSensitiveSearch(ev) {
		Options.search_case_sensitive = ! Options.search_case_sensitive;
		setBooleanCookie("search_case_sensitive", Options.search_case_sensitive);
		updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		focusSearchField();
	}

	$("li#accent-sensitive").on('click', toggleAccentSensitiveSearch);
	function toggleAccentSensitiveSearch(ev) {
		Options.search_accent_sensitive = ! Options.search_accent_sensitive;
		setBooleanCookie("search_accent_sensitive", Options.search_accent_sensitive);
		updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		focusSearchField();
	}

	$("li#album-search").on('click', toggleCurrentAbumSearch);
	function toggleCurrentAbumSearch(ev) {
		Options.search_current_album = ! Options.search_current_album;
		setBooleanCookie("search_current_album", Options.search_current_album);
		updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		focusSearchField();
	}

	// $("li#refine-search").on('click', toggleRefineSearch);
	// function toggleRefineSearch(ev) {
	// 	Options.search_refine = ! Options.search_refine;
	// 	setBooleanCookie("search_refine", Options.search_refine);
	// 	updateMenu();
	// 	if (false && $("#search-field").val().trim())
	// 		$('#search-button').click();
	// 	focusSearchField();
	// }

	// subalbums
	$("li.album-sort.by-date").on('click', sortAlbumsByDate);
	function sortAlbumsByDate(ev) {
		if (
			currentAlbum.albumNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			setBooleanCookie("albumNameSortRequested", false);
			setBooleanCookie("albumDateReverseSortRequested", currentAlbum.albumNameReverseSort);
			sortAlbumsMedia();
			updateMenu();
			showAlbum("refreshSubalbums");
			focusSearchField();
		}
		return false;
	}

	$("li.album-sort.by-name").on('click', sortAlbumsByName);

	function sortAlbumsByName(ev) {
		if (
			! currentAlbum.albumNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			setBooleanCookie("albumNameSortRequested", true);
			setBooleanCookie("albumNameReverseSortRequested", currentAlbum.albumDateReverseSort);
			sortAlbumsMedia();
			updateMenu();
			showAlbum("refreshSubalbums");
			focusSearchField();
		}
		return false;
	}

	$("li.album-sort.sort-reverse").on('click', sortAlbumsReverse);

	function sortAlbumsReverse(ev) {
		if (
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			if (currentAlbum.albumNameSort)
				setBooleanCookie("albumNameReverseSortRequested", ! currentAlbum.albumNameReverseSort);
			else
				setBooleanCookie("albumDateReverseSortRequested", ! currentAlbum.albumDateReverseSort);
			sortAlbumsMedia();
			updateMenu();
			showAlbum("refreshSubalbums");
			focusSearchField();
		}
		return false;
	}
	// media
	$("li.media-sort.by-date").on('click', sortMediaByDate);

	function sortMediaByDate(ev) {
		if (
			currentAlbum.mediaNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			setBooleanCookie("mediaNameSortRequested", false);
			setBooleanCookie("mediaDateReverseSortRequested", getBooleanCookie("mediaDateReverseSortRequested"));
			sortAlbumsMedia();
			updateMenu();
			showAlbum("refreshMedia");
			focusSearchField();
		}
		return false;
	}

	$("li.media-sort.by-name").on('click', sortMediaByName);

	function sortMediaByName(ev) {
		if (
			! currentAlbum.mediaNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			setBooleanCookie("mediaNameSortRequested", true);
			setBooleanCookie("mediaNameReverseSortRequested", getBooleanCookie("mediaNameReverseSortRequested"));
			sortAlbumsMedia();
			updateMenu();
			showAlbum("refreshMedia");
			focusSearchField();
		}
		return false;
	}

	$("li.media-sort.sort-reverse").on('click', sortMediaReverse);

	function sortMediaReverse(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if (currentAlbum.mediaNameSort)
				setBooleanCookie("mediaNameReverseSortRequested", ! getBooleanCookie("mediaNameReverseSortRequested"));
			else
				setBooleanCookie("mediaDateReverseSortRequested", ! getBooleanCookie("mediaDateReverseSortRequested"));

			sortAlbumsMedia();
			updateMenu();
			showAlbum("refreshMedia");
			focusSearchField();
		}
		return false;
	}

	$("ul#right-menu li.hide-title-and-thumbnails").on('click', toggleTitle);
	function toggleTitle(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.hide_title_and_thumbnails = ! Options.hide_title_and_thumbnails;
			setBooleanCookie("hide_title_and_thumbnails", Options.hide_title_and_thumbnails);
			updateMenu();
			if (Options.hide_title_and_thumbnails) {
				$(".title").addClass("hidden");
				$("#album-view").addClass("hidden");
			} else {
				$(".title").removeClass("hidden");
				$("#album-view").removeClass("hidden");
				showAlbum("refreshMedia");
			}
			if (currentMedia !== null) {
				showMedia(currentAlbum, currentMedia, 'center');
				showMedia(currentAlbum, nextMedia, 'right');
				showMedia(currentAlbum, prevMedia, 'left');
			} else
				showAlbum(false);
			focusSearchField();
		}
		return false;
	}

	$("ul#right-menu li.slide").on('click', toggleSlideMode);
	function toggleSlideMode(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.albums_slide_style = ! Options.albums_slide_style;
			setBooleanCookie("albums_slide_style", Options.albums_slide_style);
			updateMenu();
			showAlbum("refreshSubalbums");
			focusSearchField();
		}
		return false;
	}

	$("ul#right-menu li.spaced").on('click', toggleSpacing);
	function toggleSpacing(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if (Options.spacing)
				Options.spacing = 0;
			else
				Options.spacing = Options.spacingToggle;
			setCookie("spacing", Options.spacing);
			updateMenu();
			showAlbum("refreshBoth");
			focusSearchField();
		}
		return false;
	}

	$("ul#right-menu li.album-names").on('click', toggleAlbumNames);
	function toggleAlbumNames(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_album_names_below_thumbs = ! Options.show_album_names_below_thumbs;
			setBooleanCookie("show_album_names_below_thumbs", Options.show_album_names_below_thumbs);
			updateMenu();
			showAlbum("refreshSubalbums");
			focusSearchField();
		}
		return false;
	}

	$("ul#right-menu li.media-count").on('click', toggleMediaCount);
	function toggleMediaCount(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_album_media_count = ! Options.show_album_media_count;
			setBooleanCookie("show_album_media_count", Options.show_album_media_count);
			updateMenu();
			showAlbum("refreshSubalbums");
			focusSearchField();
		}
		return false;
	}

	$("ul#right-menu li.media-names").on('click', toggleMediaNames);
	function toggleMediaNames(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_media_names_below_thumbs = ! Options.show_media_names_below_thumbs;
			setBooleanCookie("show_media_names_below_thumbs", Options.show_media_names_below_thumbs);
			updateMenu();
			showAlbum("refreshMedia");
			focusSearchField();
		}
		return false;
	}

	$("ul#right-menu li.square-album-thumbnails").on('click', toggleAlbumsSquare);
	function toggleAlbumsSquare(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.album_thumb_type = Options.album_thumb_type == "square" ? "fit" : "square";
			setCookie("album_thumb_type", Options.album_thumb_type);
			updateMenu();
			showAlbum("refreshSubalbums");
			focusSearchField();
		}
		return false;
	}

	$("ul#right-menu li.square-media-thumbnails").on('click', toggleMediaSquare);
	function toggleMediaSquare(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.media_thumb_type = Options.media_thumb_type == "square" ? "fixed_height" : "square";
			setCookie("media_thumb_type", Options.media_thumb_type);
			updateMenu();
			showAlbum("refreshMedia");
			focusSearchField();
		}
		return false;
	}

	function showMetadata() {
		if ($("#metadata").css("display") == "none") {
			$("#metadata-show").hide();
			$("#metadata-hide").show();
			$("#metadata")
				.stop()
				.css("height", 0)
				.css("padding-top", 0)
				.css("padding-bottom", 0)
				.show()
				.stop()
				.animate({ height: $("#metadata > table").height(), paddingTop: 3, paddingBottom: 3 }, "slow", function() {
					$(this).css("height", "auto");
				});
		} else {
			$("#metadata-show").show();
			$("#metadata-hide").hide();
			$("#metadata")
				.stop()
				.animate({ height: 0, paddingTop: 0, paddingBottom: 0 }, "slow", function() {
					$(this).hide();
				});
		}
	}

	function toggleMenu(ev) {
		$("ul#right-menu").toggleClass("expand");
		if ($("ul#right-menu").hasClass("expand"))
			focusSearchField();
		updateMenu();
	}

	$("#menu-icon").on("click", toggleMenu);

	$(window).hashchange(function() {
		$("#loading").show();
		$("#album-view").removeClass("hidden");
		$("link[rel=image_src]").remove();
		$("link[rel=video_src]").remove();
		$("ul#right-menu").removeClass("expand");
		if (Object.keys(Options).length > 0)
			parseHash(location.hash, hashParsed, die);
		else
			getOptions(location.hash, hashParsed, die);
	});
	$(window).hashchange();

	$("#auth-form").submit(function() {
		var password = $("#password");
		password.css("background-color", "rgb(128, 128, 200)");
		phFl.authenticate(password.val(), function(success) {
			password.val("");
			if (success) {
				password.css("background-color", "rgb(200, 200, 200)");
				$(window).hashchange();
			} else
				password.css("background-color", "rgb(255, 64, 64)");
		});
		return false;
	});
});
