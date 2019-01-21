var fullScreenStatus = false;
var currentMedia = null;
var currentAlbum = null;
var nextMedia = null, prevMedia = null, upLink = "";
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
var devicePixelRatio = window.devicePixelRatio || 1;

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
	var mediaLink = "";

	// triplicate the #mediaview content in order to swipe the media
	var titleContent = $("#album-view").clone().children().first();
	util.mediaBoxGenerator('left');
	util.mediaBoxGenerator('right');
	$(".media-box#center").prepend(titleContent)[0].outerHTML;

	/* Displays */

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

		$("ul#right-menu li.hide-title").removeClass("hidden");
		if (Options.hide_title)
			$("ul#right-menu li.hide-title").addClass("selected");
		else
			$("ul#right-menu li.hide-title").removeClass("selected");

		$("ul#right-menu li.hide-bottom-thumbnails").removeClass("hidden");
		if (Options.hide_bottom_thumbnails)
			$("ul#right-menu li.hide-bottom-thumbnails").addClass("selected");
		else
			$("ul#right-menu li.hide-bottom-thumbnails").removeClass("selected");

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
			currentMedia !== null && ! $("#album-view").is(":visible") ||
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
			currentAlbum !== null && currentAlbum.subalbums.length === 0 && Options.hide_title
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
			currentMedia !== null && ! $("#album-view").is(":visible") ||
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
			$("ul#right-menu li.hide-title").hasClass("hidden") &&
			$("ul#right-menu li.hide-bottom-thumbnails").hasClass("hidden") &&
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

	function setTitle(id, media) {
		var title = "", documentTitle = "", components, i, isDateTitle, isGpsTitle, isSearchTitle, originalTitle;
		var titleAnchorClasses, titleAnchorClassesItalics, hiddenTitle = "", albumTypeString, where, initialValue, searchFolderHash;
		var beginLink, linksToLeave, numLinks, beginAt, latitude, longitude, arrayCoordinates, numMediaInSubAlbums, raquo = "&raquo;", lastRaquoPosition;
		// gpsLevelNumber is the number of levels for the by gps tree
		// current levels are country, region, place => 3
		var gpsLevelNumber = 3;
		var gpsName = '';
		var gpsHtmlTitle;
		var setDocumentTitle = (id === "center" || id === "album");

		updateMenu();

		if (id === "album") {
			$(".media-box#" + id + " .title").addClass("hidden");
			$("#album-view .title").removeClass("hidden");
		} else {
			$(".media-box#" + id + " .title").removeClass("hidden");
			$("#album-view .title").addClass("hidden");
			$("#album-view .title-string").html("");
		}


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

		// 'textComponents = components' doesn't work: textComponents becomes a pointer to components
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
		var fillInSpan = "<span id='fill-in-map-link'></span>";

		if (isDateTitle) {
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>";
			title += "<a class='" + titleAnchorClasses + "' href='#!/" + Options.by_date_string + "'>(" + util._t("#by-date") + ")</a>";

			if (components.length > 2 || media !== null)
				title += raquo;

			if (setDocumentTitle) {
				documentTitle += components[0];
				if (components.length > 2 || media !== null)
					documentTitle = " \u00ab " + documentTitle;
				documentTitle += " (" + util._t("#by-date") + ")";
			}

			for (i = 2; i < components.length; ++i) {
				if (i < components.length - 1 || media !== null)
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'>";
				else
					title += "<span class='title-no-anchor'>";

				if (i == 3) {
					textComponents[i] = util._t("#month-" + textComponents[i]);
					title += textComponents[i];
				} else if (i == 2 || i == 4) {
					textComponents[i] = parseInt(textComponents[i]);
					title += textComponents[i];
				} else
					title += textComponents[i];


				if (i < components.length - 1 || media !== null)
					title += "</a>";
				else
					title += "</span>";
				if (i < components.length - 1 || media !== null)
					title += raquo;

				if (setDocumentTitle) {
					// keep building the html page title
					documentTitle = textComponents[i] + documentTitle;
					if (i < components.length - 1 || media !== null)
						documentTitle = " \u00ab " + documentTitle;
				}
			}

			title += fillInSpan;

			if (components.length > 1 && media === null) {
				if (! isMobile.any()) {
					title += " <span class='title-count'>(";
					title += currentAlbum.media.length + " ";
					title += util._t(".title-media") + " ";
				 	if (components.length >= 5)
						title += util._t(".title-in-day-album");
					else
						title += util._t(".title-in-date-album");
					title += ")</span>";
				}
				title += "</span>";
			}
		} else if (isGpsTitle) {
			title = "<a class='" + titleAnchorClasses + "' href='#!/'>" + components[0] + "</a>";
			title += "<a class='" + titleAnchorClasses + "' href='#!/" + Options.by_gps_string + "'>(" + util._t("#by-gps") + ")</a>";

			if (components.length > 2 || media !== null)
				title += raquo;

			if (setDocumentTitle) {
				documentTitle += components[0];
				if (components.length > 2 || media !== null)
					documentTitle = " \u00ab " + documentTitle;
				documentTitle += " (" + util._t("#by-gps") + ")";
			}

			for (i = 2; i < components.length; ++i) {
				var currentAlbumPath = currentAlbum.ancestorsNames;
				gpsName = currentAlbumPath[i];

				if (gpsName === '')
					gpsName = util._t('.not-specified');
				gpsHtmlTitle = util._t("#place-icon-title") + gpsName;

				if (i < components.length - 1 || media !== null) {
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'";
					title += " title='" + util._t("#place-icon-title") + gpsName + util._t("#place-icon-title-end") + "'";
					title += ">";
				} else
					title += "<span class='title-no-anchor'>";
				title += gpsName;
				if (i < components.length - 1 || media !== null)
					title += "</a>";
				else
					title += "</span>";

				if (media !== null) {
					latitude = media.metadata.latitude;
					longitude = media.metadata.longitude;
				} else {
					 arrayCoordinates = currentAlbum.ancestorsCenter[i];
					 latitude = arrayCoordinates.latitude;
					 longitude = arrayCoordinates.longitude;
				}

				if (i < components.length - 1 || media !== null)
					title += raquo;

				if (setDocumentTitle) {
					// keep buildimg the html page title
					documentTitle = gpsName + documentTitle;
					if (i < components.length - 1 || media !== null)
						documentTitle = " \u00ab " + documentTitle;
				}
			}

			title += fillInSpan;

			if (components.length > 1 && media === null) {
				title += " <span class='title-count'>(";
				title += currentAlbum.media.length + " ";
				title += util._t(".title-media") + " ";
				if (components.length >= gpsLevelNumber + 2)
					title += util._t(".title-in-gps-album");
				else
					title += util._t(".title-in-gpss-album");
				title += ")</span>";
			}
		} else if (isSearchTitle) {
			// i=0: title
			// i=1: Options.by_search_string
			// (optional) i=2: image cache or folder
			// (optional) i=3 up: folder or image
			// (optional) i=n: image
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>" + raquo;

			if (
				Options.search_current_album &&
				[Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(Options.album_to_search_in) == -1
			) {
				searchFolderHash = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
				where =
					 "<a class='main-search-link' href='#!/" + currentAlbum.cacheBase + "'>" +
					 util._t("#by-search") +
					 "</a> " +
					 util._t("#in") +
					 " <span id='search-album-to-be-filled'></span>";
			} else {
				where =
				 	"<a class='search-link' href='#!/" + currentAlbum.cacheBase + "'>" +
					util._t("#by-search") +
					"</a>";
			}

			title += "<span class='title-no-anchor'>(" + where + ")</span>";
			where = util.stripHtmlAndReplaceEntities(where);

			// do not show the options and the search words, they are visible in the menu
			// show the image name, if it is there
			if (media !== null) {
				title += raquo;
			}

			if (
				components.length > 2 &&
				(media === null && ! util.isAlbumWithOneMedia(currentAlbum)) &&
				(currentAlbum.media.length || currentAlbum.subalbums.length)
			) {
				title += " <span class='title-count'>(";
				title += util._t(".title-found") + ' ';
				numMediaInSubAlbums = currentAlbum.numMediaInSubTree - currentAlbum.media.length;
				if (currentAlbum.media.length) {
					title += currentAlbum.media.length + " ";
					title += util._t(".title-media");
					if (currentAlbum.subalbums.length)
						title += ", ";
				}
				if (currentAlbum.subalbums.length) {
					title += currentAlbum.subalbums.length + " ";
					title += util._t(".title-albums");
				}
				if (currentAlbum.media.length > 0 && currentAlbum.subalbums.length > 0) {
					title += ", ";
					title += util._t(".title-total") + " ";
					title += currentAlbum.media.length + currentAlbum.subalbums.length;
				}
				title += ")</span>";
			}

			if (setDocumentTitle) {
				// build the html page title
				documentTitle += " (" + where +") \u00ab " + components[0];
				if (media !== null)
					documentTitle = " \u00ab " + documentTitle;
			}
		} else {
			// folders title
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>";
			if (components.length > 2 || media !== null)
				title += raquo;

			if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
				searchFolderHash = savedSearchAlbumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
				if (searchFolderHash.split(Options.cache_folder_separator).length > 1) {
					where =
						 "<a class='main-search-link' href='#!/" + savedSearchAlbumHash + "'>" +
						 util._t("#by-search") +
						 "</a> " +
						 util._t("#in") +
						 " <span id='search-album-to-be-filled'></span>";
				} else {
					where =
					 	"<a class='search-link' href='#!/" + savedSearchAlbumHash + "'>" +
						util._t("#by-search") +
						"</a>";
				}

				title += "<span class='title-no-anchor'>(" + where + ")</span>";
				title += raquo;
				where = util.stripHtmlAndReplaceEntities(where);

				if (setDocumentTitle) {
					documentTitle += " (" + where +") \u00ab " + documentTitle;
				}
			}

			if (setDocumentTitle) {
				documentTitle += components[0];
				if (components.length > 2 || media !== null)
					documentTitle = " \u00ab " + documentTitle;
			}

			initialValue = 2;
			if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
				// the  folders from the first until the search folder inclusive must not be shown
				initialValue = savedSearchAlbumHash.split(Options.cache_folder_separator).slice(2).length + 1;
			}
			for (i = initialValue; i < components.length; ++i) {
				if (i < components.length - 1 || media !== null)
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'>";
				else
					title += "<span class='title-no-anchor'>";

				title += textComponents[i];

				if (i < components.length - 1 || media !== null)
					title += "</a>";
				else
					title += "</span>";

				if (i < components.length - 1 || media !== null)
					title += raquo;
			}

			title += fillInSpan;

			if (components.length > 1 && media === null) {
				title += " <span class='title-count'>(";
				numMediaInSubAlbums = currentAlbum.numMediaInSubTree - currentAlbum.media.length;
				if (currentAlbum.media.length) {
					title += currentAlbum.media.length + " ";
					title += util._t(".title-media") + " ";
					title += util._t(".title-in-album");
					if (numMediaInSubAlbums)
						title += ", ";
				}
				if (numMediaInSubAlbums) {
					title += numMediaInSubAlbums + " ";
					if (! currentAlbum.media.length)
						title += util._t(".title-media") + " ";
					title += util._t(".title-in-subalbums");
				}
				if (currentAlbum.media.length > 0 && numMediaInSubAlbums > 0) {
					title += ", ";
					title += util._t(".title-total") + " ";
					title += currentAlbum.media.length + numMediaInSubAlbums;
				}
				title += ")</span>";
			}

			if (setDocumentTitle) {
				for (i = initialValue; i < components.length; ++i) {
					// keep building the html page title
					documentTitle = textComponents[i] + documentTitle;
					if (i < components.length - 1 || media !== null)
						documentTitle = " \u00ab " + documentTitle;
				}
			}
		}

		if (media !== null) {
			title += "<span class='media-name'>" + util.trimExtension(media.name) + "</span>";
			if (util.hasGpsData(currentMedia))
				title += "<a class='map-popup-trigger'>" +
					"<img class='title-img' title='" + util._t("#show-on-map") + " [s]' alt='" + util._t("#show-on-map") + "' height='20px' src='img/ic_place_white_24dp_2x.png'>" +
				"</a>";
		} else if (title.indexOf(fillInSpan) > -1 && currentAlbum.positionsAndMediaInTree) {
			title = title.replace(
				fillInSpan,
				"<a class='map-popup-trigger'>" +
					"<img class='title-img' " +
							"title='" + util._t("#show-markers-on-map") + "' " +
							"alt='" + util._t("#show-markers-on-map") + "' " +
							"height='20px' " +
							"src='img/ic_place_white_24dp_2x.png'" +
						">" +
				"</a>"
			);
		}

		if (isMobile.any()) {
			// leave only the last link on mobile
			// separate on "&raquo;""
			if (title.indexOf("search-album-to-be-filled") !== -1)
				beginAt = title.indexOf("search-album-to-be-filled");
			else
				beginAt = 0;

			numLinks = (title.substring(beginAt).match(/<a class='title/g) || []).length;
			linksToLeave = 1;
			if (numLinks > linksToLeave) {
				for (i = 1; i <= numLinks; i ++) {
					beginLink = title.indexOf("<a class=", beginAt);
					if (i <= linksToLeave) {
						beginAt = beginLink + 1;
					} else {
						// be sure to separate on "&raquo;"
						lastRaquoPosition = title.substring(0, beginLink).lastIndexOf(raquo);
						if (lastRaquoPosition + raquo.length !== beginLink)
							beginLink = lastRaquoPosition + raquo.length;
						hiddenTitle += title.substring(0, beginLink);
						title = title.substring(beginLink);
						break;
					}
				}
				title =
					"<span class='dots-surroundings'><span class='title-no-anchor dots'>...</span>" + raquo +"</span>" +
					" <span class='hidden-title'>" + hiddenTitle + "</span> " + title;
			}
		}

		if (id === "album")
			$("#album-view .title-string").html(title);
		else
			$(".media-box#" + id + " .title-string").html(title);


		if (isMobile.any()) {
			$(".dots").off();

			$(".dots").on('click', function(ev) {
				if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
					$(".dots-surroundings").hide();
					$(".hidden-title").show();
					return false;
				}
			});
		}

		if (setDocumentTitle) {
			// keep generating the html page title
			if (media !== null)
				documentTitle = util.trimExtension(media.name) + documentTitle;
			else if (currentAlbum !== null && ! currentAlbum.subalbums.length && currentAlbum.media.length == 1)
				documentTitle =  util.trimExtension(currentAlbum.media[0].name) + " \u00ab " + documentTitle;

			document.title = documentTitle;
		}


		if (media === null && currentAlbum !== null && ! currentAlbum.subalbums.length && currentAlbum.media.length == 1) {
			title += " " + raquo + "<span class='media-name'>" + util.trimExtension(currentAlbum.media[0].name) + "</span>";
		}

		if ($("#search-album-to-be-filled").length) {
			// for searches in current folder we must get the names from the album
			// we must use getAlbum() because the album could not be in the cache yet (as when ctl-r is pressed)
			phFl.getAlbum(
				searchFolderHash,
				function(theAlbum) {
					var whereLinks = '', thisCacheBase, name, documentTitle;

					if (theAlbum.hasOwnProperty('ancestorsNames')) {
						albumTypeString = "<a href='#!/" + Options.by_gps_string + "'"  + util._t('#by-gps') + ']</a> ' + ' ' + raquo + ' ';
						for (var i = 2; i < theAlbum.ancestorsNames.length; i ++) {
							name = theAlbum.ancestorsNames[i];
							if (i == 3 && util.isByDateCacheBase(Options.album_to_search_in))
								// convert the month number to localized month name
								name = util._t("#month-" + name);
							thisCacheBase = "#!/" + theAlbum.ancestorsCacheBase.slice(2, i + 1).join(Options.cache_folder_separator);
							if (i > 2)
								whereLinks += ' ' + raquo + ' ';
							whereLinks += "<a class='search-link' href='" + thisCacheBase + "'>" + name + "</a>";
						}
					}

					// insert the album tree links in DOM (if )
					$("#search-album-to-be-filled").replaceWith(whereLinks);

					if (setDocumentTitle) {
						// correct the page title too
						documentTitle = $(document).attr('title');
						documentTitle = documentTitle.replace(
							util._t("#by-search") + ' ' + util._t("#-in") + ' ',
							util._t("#by-search") + ' ' + util._t("#-in") + ' ' + util.stripHtmlAndReplaceEntities(whereLinks)
						);
						document.title = documentTitle;
					}
				},
				die
			);
		}

		setOptions();

		// activate the map popup trigger in the title
		$(".map-popup-trigger").off();
		$(".map-popup-trigger").click(generateMapFromDefaults);



		$('.map-close-button').click(function(){
			$('.map-container').hide();
			$('#mapdiv').empty();
		});

		return;
	}

	function generateMapFromMedia(ev) {
		if (util.hasGpsData(ev.data.media)) {
			ev.preventDefault();
			var point =
				{
					'long': parseFloat(ev.data.media.metadata.longitude),
					'lat' : parseFloat(ev.data.media.metadata.latitude),
					'mediaNameList': [ev.data.media.albumName]
				};
			generateMap([point]);
		}
	}

	function generateMapFromSubalbum(ev) {
		if (ev.data.subalbum.positionsAndMediaInTree) {
			ev.stopPropagation();
			ev.preventDefault();
			generateMap(ev.data.subalbum.positionsAndMediaInTree);
		} else {
			$("#warning-no-geolocated-media").stop().fadeIn(200);
			$("#warning-no-geolocated-media").fadeOut(3000);
		}
	}

	function generateMapFromDefaults() {
		var pointList = [];

		if (currentMedia !== null && util.hasGpsData(currentMedia))
			pointList = [
				{
					'long': parseFloat(currentMedia.metadata.longitude),
					'lat' : parseFloat(currentMedia.metadata.latitude),
					'mediaNameList': [currentMedia.albumName]
				}
			];
		else if (currentAlbum.positionsAndMediaInTree)
			pointList = currentAlbum.positionsAndMediaInTree;

		if (pointList != [])
			generateMap(pointList);
	}

	function generateMap(pointList) {
		// pointList is an array of uniq points with a list of the media geolocated there
		if(pointList) {
			// calculate the center
			var center = {'lat': 0, 'long': 0};
			for (var i = 0; i < pointList.length; ++i) {
				center.lat += pointList[i].lat;
				center.long += pointList[i].long;
			}
			center.lat /= pointList.length;
			center.long /= pointList.length;

			// default zoom is used for single media or media list with one point
			var maxDistance = Options.photo_map_size;
			if (pointList.length > 1) {
				// calculate the maximum distance from the center
				// it's needed in order to calculate the zoom level
				maxDistance = 0;
				for (i = 0; i < pointList.length; ++i) {
					maxDistance = Math.max(maxDistance, Math.abs(util.distanceBetweenCoordinatePoints(center, pointList[i])));
				}
			}
			// calculate the zoom level needed in order to have all the points inside the map
			// see https://wiki.openstreetmap.org/wiki/Zoom_levels
			// maximum OSM zoom is 19
			var earthCircumference = 40075016;
			var zoom = Math.min(19, parseInt(Math.log2(Math.min(windowWidth, windowHeight) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / (maxDistance * 2))));

			$('.map-container').show();
			var markersList = [];

			// add the popup code after the #mapdiv element
			// this code cannot be put in index.html/php file, because the "new ol.Overlay()" code removes it (why!?!?!?)
			$("#mapdiv").after(
				'<div id="popup" class="ol-popup">\n' +
				'  <a href="#" id="popup-closer" class="ol-popup-closer"></a>\n' +
				'  <div id="popup-content"></div>\n' +
				'</div>'
			);

			/**
       * Elements that make up the popup.
       */
      var container = document.getElementById('popup');
      var content = document.getElementById('popup-content');
      var closer = document.getElementById('popup-closer');

      /**
       * Create an overlay to anchor the popup to the map.
       */
      var overlay = new ol.Overlay({
        element: container,
        autoPan: true,
        autoPanAnimation: {
          duration: 250
        }
      });

			/**
       * Add a click handler to hide the popup.
       * @return {boolean} Don't follow the href.
       */
      closer.onclick = function() {
        overlay.setPosition(undefined);
        closer.blur();
        return false;
      };

			// create the map with the proper center
			var map = new ol.Map(
				{
					controls: ol.control.defaults().extend(
						[
							new ol.control.ScaleLine()
						]
					),
					view: new ol.View(
						{
							center: ol.proj.fromLonLat([center.long, center.lat]),
							zoom: zoom
						}
					),
					overlays: [overlay],
					layers: [
						new ol.layer.Tile(
							{
								source: new ol.source.OSM()
							}
						)
					],
					target: 'mapdiv',
					keyboardEventTarget: document
				}
			);

			// the style for the markers
			var markerStyle = new ol.style.Style({
							image: new ol.style.Icon(/** @type {module:ol/style/Icon~Options} */ ({
								anchor: [0.5, 1],
								anchorXUnits: 'fraction',
								anchorYUnits: 'fraction',
								scale: 0.4,
								src: 'img/ic_place_void_black_24dp_2x.png'
								// color: 'red'
							}))
						});

			for (i = 0; i < pointList.length; ++i) {
				// add the marker
				markersList[i] = new ol.Feature({
					geometry: new ol.geom.Point(ol.proj.fromLonLat([pointList[i].long, pointList[i].lat])),
					namesList: pointList[i].mediaNameList
				});
				// apply the style to the marker
				markersList[i].setStyle(markerStyle);
			}

			// generate the markers vector
			var markers = new ol.source.Vector({
					features: markersList
			});

			// generate the markers layer
			var markerVectorLayer = new ol.layer.Vector({
					source: markers,
			});

			// add the markers layer to the map
			map.addLayer(markerVectorLayer);

			/**
			 * Add a click handler to the map to render the popup.
			 */
			map.on('singleclick', function(evt) {
				var clickedPosition = ol.proj.toLonLat(evt.coordinate);
				console.log(clickedPosition, pointList);
				var minimumDistance = false, newMinimumDistance, distance, index;
				for(var i = 0; i < pointList.length; i ++) {
					distance = Math.abs(util.distanceBetweenCoordinatePoints({long: clickedPosition[0], lat: clickedPosition[1]}, pointList[i]));
					console.log(i, distance);
					if (minimumDistance === false) {
						minimumDistance = distance;
						index = i;
					} else {
						newMinimumDistance = Math.min(minimumDistance, distance);
						if (newMinimumDistance != minimumDistance) {
							minimumDistance = newMinimumDistance;
							index = i;
						}
					}
				}

				console.log(index, clickedPosition, pointList[index], minimumDistance);
				var coordinateForPopup = [pointList[index].long, pointList[index].lat];
				content.innerHTML = '<p>Point # ' + index + '. Coordinates: ' + coordinateForPopup + '</p>';
				console.log(content.innerHTML);
				overlay.setPosition(ol.proj.fromLonLat(coordinateForPopup));
				// overlay.setPosition(coordinateForPopup);
			});
		}
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
		var width, height, thumbWidth, thumbHeight, imageString, calculatedWidth, calculatedHeight, populateMedia;
		var albumViewWidth, correctedAlbumThumbSize = Options.album_thumb_size;
		var mediaWidth, mediaHeight, slideBorder = 0, scrollBarWidth = 0, buttonBorder = 0, margin, imgTitle;
		var tooBig = false, isVirtualAlbum = false;
		var mapLinkIcon, id;
		var caption, captionColor, captionHtml, captionHeight, captionFontSize, buttonAndCaptionHeight, albumButtonAndCaptionHtml, heightfactor;
		var array, folderArray, folder, folderName, folderTitle, savedSearchSubAlbumHash, savedSearchAlbumHash;

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
					"<span id='too-many-images'>" + util._t('#too-many-images') + "</span>: " + currentAlbum.media.length +
					" (<span id='too-many-images-limit-is'>" + util._t('#too-many-images-limit-is') + "</span> " + Options.big_virtual_folders_threshold +  ")</span>"
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
					calculatedHeight = Options.media_thumb_size;

					calculatedWidth = Math.min(
						calculatedWidth,
						($(window).innerWidth() - 2 * parseInt($("#album-view").css("padding")))
					);
					calculatedHeight = calculatedWidth / thumbWidth * thumbHeight;

					mapLinkIcon = "";
					if (util.hasGpsData(currentAlbum.media[i])) {
						mapLinkIcon =
							"<a id='media-map-link-" + i + "'>" +
								"<img " +
									// "id='media-map-link-" + i + "' " +
									"class='thumbnail-map-link' " +
									"title='" + util._t("#show-on-map") + "' " +
									"alt='" + util._t("#show-on-map") + "' " +
									"height='20px' " +
									"src='img/ic_place_white_24dp_2x.png'" +
								">" +
							"</a>";
					}

					imageString =	"<div class='thumb-and-caption-container' style='" +
										"width: " + calculatedWidth + "px; " +
									"'>" +
								"<div class='thumb-container' " + "style='" +
										// "width: " + calculatedWidth + "px; " +
										"width: " + calculatedWidth + "px; " +
										"height: " + calculatedHeight + "px;" +
									"'>" +
									mapLinkIcon +
									"<span class='helper'></span>" +
									"<img title='" + imgTitle + "' " +
										"alt='" + util.trimExtension(currentAlbum.media[i].name) + "' " +
										"data-src='" +  encodeURI(thumbHash) + "' " +
										"class='thumbnail lazyload-media" + "' " +
										"height='" + thumbHeight + "' " +
										"width='" + thumbWidth + "' " +
										"style='" +
											 "width: " + calculatedWidth + "px; " +
											 "height: " + calculatedHeight + "px;" +
											 "'" +
									"/>" +
								"</div>" +
								"<div class='media-caption'>" +
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

				// generate the click event for the map for every media
				for (i = 0; i < currentAlbum.media.length; ++i) {
					$("#media-map-link-" + i).off();
					$("#media-map-link-" + i).on('click', {media: currentAlbum.media[i]}, generateMapFromMedia);
				}
			}
			lazyload(document.querySelectorAll(".lazyload-media"));

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
							folderName = "";
							if (folderArray.length == 2) {
								folderName += parseInt(folderArray[1]);
							} else if (folderArray.length == 3)
								folderName += " " + util._t("#month-" + folderArray[2]);
							else if (folderArray.length == 4)
								folderName += util._t("#day") + " " + parseInt(folderArray[3]);
								folderTitle = folderName;
						} else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
							var folderName = '';
							var folderTitle = '';
							if (currentAlbum.subalbums[i].name === '')
								folderName = util._t('.not-specified');
							else if (currentAlbum.subalbums[i].hasOwnProperty('altName'))
								folderName = util.transformAltPlaceName(currentAlbum.subalbums[i].altName);
							else
								folderName = currentAlbum.subalbums[i].name;
							folderTitle = util._t('#place-icon-title') + folderName;

						}
						else {
							folderName = currentAlbum.subalbums[i].path;
							folderTitle = folderName;
						}

						folder = "<span class='folder-name'>" +
											folderName +
											"<a id='subalbum-map-link-" + i + "' >" +
												"<img " +
													"class='title-img' " +
													"title='" + folderTitle + "' " +
													"alt='" + folderTitle + "' " +
													"height='15px' " +
													"src='img/ic_place_white_24dp_2x.png' " +
												"/>" +
											"</a>" +
										"</span>";

						// // get the value in style sheet (element with that class doesn't exist in DOM)
						// var $el = $('<div class="album-caption"></div>');
						// $($el).appendTo('body');
						// $($el).remove();
						captionColor = Options.albums_slide_style ? Options.slide_album_caption_color : Options.album_caption_color;

						captionHtml = "<div class='album-caption";
						if (util.isFolderCacheBase(currentAlbum.cacheBase) && ! Options.show_album_names_below_thumbs)
							captionHtml += " hidden";
						captionHtml += "' id='album-caption-" + phFl.hashCode(currentAlbum.subalbums[i].cacheBase) + "' " +
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
						captionHtml += "' " +
									"style='" +
										"font-size: " + Math.round((captionFontSize / 1.5)) + "px; " +
										"height: " + captionHeight + "px; " +
										"color: " + captionColor + ";" +
									"'" +
								">(";
						captionHtml +=		currentAlbum.subalbums[i].numMediaInSubTree;
						captionHtml +=		" <span class='title-media'>";
						captionHtml +=		util._t(".title-media");
						captionHtml +=		"</span>";
						captionHtml += ")</div>";
						caption = $(captionHtml);


						// a dot could be present in a cache base, making $("#" + cacheBase) fail, beware...
						id = phFl.hashCode(currentAlbum.subalbums[i].cacheBase);
						albumButtonAndCaptionHtml =
							"<div id='" + id + "' " +
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
												"<a href=''>" +
													"<img " +
														"src='img/link-arrow.png' " +
														"class='album-button-random-media-link' " +
														"style='" +
															"width: 20px;" +
															" height: 20px;" +
															"'" +
														">" +
												"</a>" +
												"<span class='helper'></span>" +
												"<img class='thumbnail lazyload-album-" + id + "'>" +
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
						(function(theSubalbum, theImage, theLink, id) {
							// function(subalbum, container, callback, error)  ---  callback(album,   album.media[index], container,            subalbum);
							phFl.pickRandomMedia(
								theSubalbum,
								currentAlbum,
								function(randomAlbum, randomMedia, theOriginalAlbumContainer, subalbum) {
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
									goTo = util._t(".go-to") + " " + titleName;
									$("#" + id + " .album-button a").attr("href", randomMediaLink);
									$("#" + id + " img.album-button-random-media-link").attr("title", goTo).attr("alt", goTo);
									$("#" + id + " img.thumbnail").attr("title", titleName).attr("alt", titleName).attr("data-src", encodeURI(mediaSrc));
									$("#" + id + " img.thumbnail").css("width", thumbWidth).css("height", thumbHeight);

									lazyload(document.querySelectorAll(".lazyload-album-" + id));

									numSubAlbumsReady ++;
									if (numSubAlbumsReady >= theOriginalAlbumContainer.subalbums.length) {
										// now all the subalbums random thumbnails has been loaded
										// we can run the function that prepare the stuffs for sharing
										socialButtons();
									}
								},
								function error() {
									currentAlbum.subalbums.splice(currentAlbum.subalbums.indexOf(theSubalbum), 1);
									theLink.remove();
									subalbums.splice(subalbums.indexOf(theLink), 1);
								}
							);
							i ++; i --;
						})(currentAlbum.subalbums[i], image, container, id);
						//////////////////// end anonymous function /////////////////////
					}

					for (i = 0; i < currentAlbum.subalbums.length; ++i) {
						$("#subalbum-map-link-" + i).off();
						$("#subalbum-map-link-" + i).on('click', {subalbum: currentAlbum.subalbums[i]}, generateMapFromSubalbum);
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

		if (currentMedia === null && ! util.isAlbumWithOneMedia(currentAlbum)) {
			$("#media-view").addClass("hidden");
			$(".thumb-container").removeClass("current-thumb");
			$("#album-view").removeClass("media-view-container");
			if (currentAlbum.subalbums.length > 0)
				$("#subalbums").show();
			else
				$("#subalbums").hide();
			$("#media-view").removeClass("no-bottom-space");
			$("#album-view").removeClass("no-bottom-space");
			// $("#media-box-inner").show().children().last().remove();
			// $("#media-box").hide();
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
				phFl.addClickToByGpsButton(byGpsViewLink);
			} else if (currentAlbum.cacheBase == Options.by_date_string) {
				$("#folders-view").on("click", function(ev) {
					window.location.href = foldersViewLink;
				});
				$("#by-date-view").removeClass("active").addClass("selected");
				phFl.addClickToByGpsButton(byGpsViewLink);
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
				phFl.addClickToByGpsButton(byGpsViewLink);
			} else {
				$(".day-gps-folders-view").addClass("hidden");
			}
			$("#powered-by").show();

			// ps.addAlbumGesturesDetection();
		} else {
			// currentMedia !== null
			$("#media-view").removeClass("hidden");

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

	function videoOK() {
		if (! Modernizr.video || ! Modernizr.video.h264)
			return false;
		else
			return true;
	}

	function addVideoUnsupportedMarker(id) {
		if (! Modernizr.video) {
			$(".media-box#" + id + " .media-box-inner").html('<div class="video-unsupported-html5"></div>');
			return false;
		}
		else if (! Modernizr.video.h264) {
			$(".media-box#" + id + " .media-box-inner").html('<div class="video-unsupported-h264"></div>');
			return false;
		} else
			return true;
	}

	function showMedia(album, media, id) {

		function loadNextPrevMedia(containerHeight, containerWidth) {
			$("#pinch-in").off("click");
			$("#pinch-out").off("click");
			$("#pinch-in").on("click", ps.pinchIn);
			$("#pinch-out").on("click", ps.pinchOut);

			$(mediaSelector).off(triggerLoad);

			if (id === "center") {
				ps.addMediaGesturesDetection();
				ps.setPinchButtonsPosition(containerHeight, containerWidth);
				util.correctPrevNextPosition();

				if (album.media.length > 1) {
					showMedia(album, prevMedia, 'left');
					showMedia(album, nextMedia, 'right');
				}
			}
		}

		var text, thumbnailSize, triggerLoad, mediaHtml, mediaSelector, mediaSrc;
		var exposureTime, heightForMedia, heightForMediaAndTitle;
		var savedSearchSubAlbumHash, savedSearchAlbumHash;
		var previousMediaIndex, nextMediaIndex, array;

		if (id === "center")
			$("#media-view").removeClass("hidden");

		array = phFl.decodeHash(location.hash);
		// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
		savedSearchSubAlbumHash = array[3];
		savedSearchAlbumHash = array[4];

		mediaLink = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
		firstEscKey = true;

		thumbnailSize = Options.media_thumb_size;

		if (id === "center") {
			if (Options.hide_title) {
				$("#" + id + " .title").addClass("hidden-by-option");
			} else {
				$("#" + id + " .title").removeClass("hidden-by-option");
			}
			if (fullScreenStatus) {
				$("#" + id + " .title").addClass("hidden-by-fullscreen");
			} else {
				$("#" + id + " .title").removeClass("hidden-by-fullscreen");
			}
			setTitle(id, currentMedia);

			if (Options.hide_bottom_thumbnails) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}

			if (currentAlbum.media.length == 1) {
				$("#album-view").addClass("hidden");
			} else {
				$("#album-view").removeClass("hidden");
			}

			if (fullScreenStatus) {
				$("#album-view").addClass("hidden-by-fullscreen");
			} else {
				$("#album-view").removeClass("hidden-by-fullscreen");
			}

			if ($("#album-view").is(":visible")) {
				$("#album-view").css("height", (thumbnailSize + 22).toString() + "px");
				$("#album-view").addClass("media-view-container");
			}
		} else if (id === "left")
			setTitle(id, prevMedia);
		else if (id === "right")
			setTitle(id, nextMedia);

		heightForMediaAndTitle = util.mediaBoxContainerHeight();

		heightForMedia = heightForMediaAndTitle - $(".media-box#" + id + " .title").outerHeight();

		if (id === "center") {
			$("#media-box-container").css("width", windowWidth * 3).css("height", heightForMediaAndTitle);
			$("#media-box-container").css("transform", "translate(-" + windowWidth + "px, 0px)");
			$(".media-box").css("width", windowWidth).css("height", heightForMediaAndTitle);
			$(".media-box .media-box-inner").css("width", windowWidth).css("height", heightForMedia);
			// $(".links").addClass("hidden");
			$(".media-box").show();

			if (currentAlbum.media.length == 1) {
				$("#next").hide();
				$("#prev").hide();
				// $("#media-view").addClass("no-bottom-space");
				// $("#album-view").addClass("no-bottom-space");
			} else {
				$("#next").show();
				$("#prev").show();
				// $("#media-view").removeClass("no-bottom-space");
				// $("#album-view").removeClass("no-bottom-space");
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
		}

		var mediaBoxInnerElement = $(".media-box#" + id + " .media-box-inner");
		// empty the img container: another image will be put in there

		if (currentMedia.mediaType == "video" && ! videoOK()) {
			mediaBoxInnerElement.empty();
			addVideoUnsupportedMarker(id);
			if (id === "center")
				loadNextPrevMedia();
		} else {
			mediaSelector = ".media-box#" + id + " .media-box-inner img";
			mediaSrc = util.chooseMediaReduction(media, id, fullScreenStatus);
			mediaHtml = util.createMediaHtml(media, id, fullScreenStatus);
			triggerLoad = util.chooseTriggerEvent(media);

			if (mediaBoxInnerElement.html() !== mediaHtml) {
				// only replace the media-box-inner content if it's not yet there
				mediaBoxInnerElement.empty();
				mediaBoxInnerElement.show().append(mediaHtml);

				$("link[rel=image_src]").remove();
				$('link[rel="video_src"]').remove();
				$("head").append(util.createMediaLinkTag(media, mediaSrc));
			}

			if (id === "center")
				$(mediaBoxInnerElement).css("opacity", 1);
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
			if ($(mediaSelector)[0].complete)
				$(mediaSelector).trigger(triggerLoad);

			if (id === "center") {
				$(window).off("resize");
				$(window).on(
					"resize",
					function () {
						var event = {data: {}};

						event.data.resize = true;

						event.data.id = "center";
						event.data.media = media;
						event.data.callback = pinchSwipeInitialization;
						event.data.currentZoom = ps.getCurrentZoom();
						util.scaleMedia(event);

						if (album.media.length > 1) {
							event.data.id = "left";
							event.data.media = prevMedia;
							event.data.callback = pinchSwipeInitialization;
							util.scaleMedia(event);

							event.data.id = "right";
							event.data.media = nextMedia;
							event.data.callback = pinchSwipeInitialization;
							util.scaleMedia(event);
						}
					}
				);

				if (! Options.persistent_metadata) {
					$(".media-box .metadata").hide();
					$(".media-box .metadata-show").show();
					$(".media-box .metadata-hide").hide();
				}
			}
		}

		if (id === "center") {
			mediaBoxInnerElement.off('contextmenu click mousewheel');
			$(".media-box#center .media-box-inner .media-bar").off();
			$("#next").off();
			$("#prev").off();

			upLink = phFl.upHash(location.hash);
			if (currentAlbum.media.length == 1) {
				// nextLink = "";
				// prevLink = "";
				mediaBoxInnerElement.css('cursor', 'default');
			} else {
				array = phFl.decodeHash(location.hash);
				// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
				savedSearchSubAlbumHash = array[3];
				savedSearchAlbumHash = array[4];

				// nextLink = phFl.encodeHash(currentAlbum, nextMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
				// prevLink = phFl.encodeHash(currentAlbum, prevMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
				$("#next").show();
				$("#prev").show();
				mediaBoxInnerElement
					.css('cursor', '')
					.on(
						'contextmenu',
						function(ev) {
							if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
								ev.preventDefault();
								if (ps.getCurrentZoom() == 1)
									ps.swipeRight(prevMedia);
							}
						}
					)
					.on('mousewheel', ps.swipeOnWheel);
					$(".media-box#center .media-box-inner .media-bar").on('click', function(ev) {
						ev.stopPropagation();
					}).on('contextmenu', function(ev) {
						ev.stopPropagation();
					});

				$("#prev").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						ps.swipeRight(prevMedia);
						return false;
					}
				});
				$("#next").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						ps.swipeLeft(nextMedia);
						return false;
					}
				});
			}

			// $(".links").removeClass("hidden");
		}

		var originalMediaPath = encodeURI(util.originalMediaPath(currentMedia));
		$(".media-box#" + id + " .original-link").attr("target", "_blank").attr("href", originalMediaPath);
		$(".media-box#" + id + " .download-link").attr("href", originalMediaPath).attr("download", "");
		if (util.hasGpsData(currentMedia)) {
			$(".media-box#" + id + " .menu-map-link").on('click', function(ev) {
				$(".map-popup-trigger")[0].click();
			});
			$(".media-box#" + id + " .menu-map-link").show();
			$(".media-box#" + id + " .menu-map-divider").show();
		} else {
			$(".media-box#" + id + " .menu-map-link").removeAttr("href").css("cursor","pointer");
			$(".media-box#" + id + " .menu-map-link").hide();
			$(".media-box#" + id + " .menu-map-divider").hide();
		}

		if (id === "center") {
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
		}

		$(".media-box#" + id + " .metadata tr.gps").off('click');
		text = "<table>";
		if (typeof media.metadata.title !== "undefined")
			text += "<tr><td class='metadata-data-title'></td><td>" + media.metadata.title.replace(/\n/g, "<br>") + "</td></tr>";
		if (typeof media.metadata.description !== "undefined")
			text += "<tr><td class='metadata-data-description'></td><td>" + media.metadata.description.replace(/\n/g, "<br>") + "</td></tr>";
		if (typeof media.metadata.tags !== "undefined")
			text += "<tr><td class='metadata-data-tags'></td><td>" + media.metadata.tags + "</td></tr>";
		if (typeof media.date !== "undefined")
			text += "<tr><td class='metadata-data-date'></td><td>" + media.date + "</td></tr>";
		if (typeof media.metadata.size !== "undefined")
			text += "<tr><td class='metadata-data-size'></td><td>" + media.metadata.size[0] + " x " + media.metadata.size[1] + "</td></tr>";
		if (typeof media.metadata.make !== "undefined")
			text += "<tr><td class='metadata-data-make'></td><td>" + media.metadata.make + "</td></tr>";
		if (typeof media.metadata.model !== "undefined")
			text += "<tr><td class='metadata-data-model'></td><td>" + media.metadata.model + "</td></tr>";
		if (typeof media.metadata.aperture !== "undefined")
			text += "<tr><td class='metadata-data-aperture'></td><td> f/" + media.metadata.aperture + "</td></tr>";
		if (typeof media.metadata.focalLength !== "undefined")
			text += "<tr><td class='metadata-data-focalLength'></td><td>" + media.metadata.focalLength + " mm</td></tr>";
		if (typeof media.metadata.subjectDistanceRange !== "undefined")
			text += "<tr><td class='metadata-data-subjectDistanceRange'></td><td>" + media.metadata.subjectDistanceRange + "</td></tr>";
		if (typeof media.metadata.iso !== "undefined")
			text += "<tr><td class='metadata-data-iso'></td><td>" + media.metadata.iso + "</td></tr>";
		if (typeof media.metadata.sceneCaptureType !== "undefined")
			text += "<tr><td class='metadata-data-sceneCaptureType'></td><td>" + media.metadata.sceneCaptureType + "</td></tr>";
		if (typeof media.metadata.exposureTime !== "undefined") {
			if (typeof media.metadata.exposureTime === "string")
				exposureTime = media.metadata.exposureTime;
			else if (media.metadata.exposureTime > 0.3)
				exposureTime = Math.round(media.metadata.exposureTime * 10 ) / 10;
			else
				exposureTime = "1/" + Math.round(1 / media.metadata.exposureTime);
			text += "<tr><td class='metadata-data-exposureTime'></td><td>" + exposureTime + " sec</td></tr>";
		}
		if (typeof media.metadata.exposureProgram !== "undefined")
			text += "<tr><td class='metadata-data-exposureProgram'></td><td>" + media.metadata.exposureProgram + "</td></tr>";
		if (typeof media.metadata.exposureCompensation !== "undefined")
			text += "<tr><td class='metadata-data-exposureCompensation'></td><td>" + media.metadata.exposureCompensation + "</td></tr>";
		if (typeof media.metadata.spectralSensitivity !== "undefined")
			text += "<tr><td class='metadata-data-spectralSensitivity'></td><td>" + media.metadata.spectralSensitivity + "</td></tr>";
		if (typeof media.metadata.sensingMethod !== "undefined")
			text += "<tr><td class='metadata-data-sensingMethod'></td><td>" + media.metadata.sensingMethod + "</td></tr>";
		if (typeof media.metadata.lightSource !== "undefined")
			text += "<tr><td class='metadata-data-lightSource'></td><td>" + media.metadata.lightSource + "</td></tr>";
		if (typeof media.metadata.flash !== "undefined")
			text += "<tr><td class='metadata-data-flash'></td><td>" + media.metadata.flash + "</td></tr>";
		if (typeof media.metadata.orientationText !== "undefined")
			text += "<tr><td class='metadata-data-orientation'></td><td>" + media.metadata.orientationText + "</td></tr>";
		if (typeof media.metadata.duration !== "undefined")
			text += "<tr><td class='metadata-data-duration'></td><td>" + media.metadata.duration + " sec</td></tr>";
		if (typeof media.metadata.latitude !== "undefined")
			text += "<tr class='map-link' class='gps'><td class='metadata-data-latitude'></td><td>" + media.metadata.latitudeMS + " </td></tr>";
		if (typeof media.metadata.longitude !== "undefined")
			text += "<tr class='gps'><td class='metadata-data-longitude'></td><td>" + media.metadata.longitudeMS + " </td></tr>";
		text += "</table>";
		$(".media-box#" + id + " .metadata").html(text);
		var linkTitle = util._t('#show-map');
		$(".media-box#" + id + " .metadata tr.gps").attr("title", linkTitle).on('click', function(ev) {
			$(".map-popup-trigger")[0].click();
		});

		util.translate();

		$("#subalbums").hide();
		// $("#media-view").removeClass("hidden");
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

		if (Options.hide_title)
			$(".title").addClass("hidden-by-option");
		else
			$(".title").removeClass("hidden-by-option");

			if (Options.hide_bottom_thumbnails && (currentMedia != null || util.isAlbumWithOneMedia(currentAlbum))) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}
	}

	function pinchSwipeInitialization(containerHeight, containerWidth) {
		ps.initialize();
		ps.setPinchButtonsPosition(containerHeight, containerWidth);
		util.correctPrevNextPosition();
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
		$(window).on(
			"resize",
			function () {
				windowWidth = $(window).outerWidth();
				windowHeight = $(window).outerHeight();
			}
		);

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
			$("#menu-icon").attr("title", util._t("#menu-icon-title"));
			sortAlbumsMedia();
			updateMenu();
		}

		currentAlbumPathArray = currentAlbum.path.split('/').slice(1);
		if (util.isByGpsCacheBase(currentAlbum.cacheBase))
			currentAlbumPathArray = currentAlbum.ancestorsNames.slice(2);
		currentAlbumPath = currentAlbumPathArray.join('/');

		$("#album-search").attr('title', util._t("#current-album-is") + '"'+ currentAlbumPath + '"');

		var isAlbumWithOneMedia = util.isAlbumWithOneMedia(currentAlbum);
		if (currentMedia !== null || isAlbumWithOneMedia) {
			if (isAlbumWithOneMedia) {
				currentMedia = currentAlbum.media[0];
				currentMediaIndex = 0;
				$("#media-view").css("cursor", "default");
				$("#album-view").addClass("hidden");
			} else {
				$("#media-view").css("cursor", "ew-resize");
			}
			nextMedia = null;
			previousMedia = null;
			// $("#album-view .title").hide();
			// $("#media-view .title").show();
			showMedia(currentAlbum, currentMedia, 'center');
		} else {

			// $("#album-view .title").show();
			setTitle("album", null);
			// $("#media-view .title").hide();
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
				util.translate();
				// server_cache_path actually is a constant: it cannot be passed as an option, because getOptions need to know it before reading the options
				// options.json is in this directory
				Options.server_cache_path = 'cache';

				maxSize = Options.reduced_sizes[Options.reduced_sizes.length - 1];

				// override according to user selections
				var titleCookie = getBooleanCookie("hide_title");
				if (titleCookie !== null)
					Options.hide_title = titleCookie;

				var bottomThumbnailsCookie = getBooleanCookie("hide_bottom_thumbnails");
				if (bottomThumbnailsCookie !== null)
					Options.hide_bottom_thumbnails = bottomThumbnailsCookie;

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
		var isMap = $('#mapdiv').html() ? 1 : 0;
		if (! $("#search-field").is(':focus')) {
			if (! e.ctrlKey && ! e.shiftKey && ! e.altKey) {
				if (e.keyCode === 9) {
					//            tab
					e.preventDefault();
					if (ps.getCurrentZoom() == 1) {
						toggleTitle(e);
						toggleBottomThumbnails(e);
						return false;
					}
				} else if (e.keyCode === 39 && nextMedia && currentMedia !== null && ! isMap) {
					//     arrow right
					ps.swipeLeftOrDrag(nextMedia);
					return false;
				} else if (
					(e.keyCode === 78 || e.keyCode === 13 || e.keyCode === 32) &&
					//             n               return               space
					nextMedia && currentMedia !== null && ! isMap
				) {
					ps.swipeLeft(nextMedia);
					return false;
				} else if (
					(e.keyCode === 80 || e.keyCode === 8) &&
					//             p           backspace
					prevMedia && currentMedia !== null && ! isMap
				) {
					ps.swipeRight(prevMedia);
					return false;
				} else if (e.keyCode === 37 && prevMedia && currentMedia !== null && ! isMap) {
					//             arrow left
					ps.swipeRightOrDrag(prevMedia);
					return false;
				} else if (e.keyCode === 27) {
					//                    esc
					// warning: modern browsers will always exit fullscreen when pressing esc
					if (isMap) {
						// we are in a map: close it
						$('.map-close-button')[0].click();
						return false;
					} else if (ps.getCurrentZoom() > 1 || $(".title").hasClass("hidden-by-pinch")) {
						ps.pinchOut();
						return false;
					} else if (! Modernizr.fullscreen && fullScreenStatus) {
						goFullscreen(e);
						return false;
					} else if (upLink) {
						fromEscKey = true;
						ps.swipeDown(upLink);
						return false;
					}
				} else if ((e.keyCode === 38 || e.keyCode === 33) && upLink && ! isMap) {
					//                arrow up             page up
					ps.swipeDownOrDrag(upLink);
					return false;
				} else if (e.keyCode === 40 || e.keyCode === 34 && ! isMap) {
					//              arrow down           page down
				 	if (mediaLink && currentMedia === null) {
						ps.swipeUp(mediaLink);
						return false;
					} else if (ps.getCurrentZoom() > 1) {
						ps.swipeUpOrDrag(mediaLink);
						return false;
					}
				} else if (e.keyCode === 68 && currentMedia !== null && ! isMap) {
					//                      d
					$("#center .download-link")[0].click();
					return false;
				} else if (e.keyCode === 70 && currentMedia !== null && ! isMap) {
					//                      f
					goFullscreen(e);
					return false;
				} else if (e.keyCode === 77 && currentMedia !== null && ! isMap) {
					//                      m
					toggleMetadata();
					return false;
				} else if (e.keyCode === 79 && currentMedia !== null && ! isMap) {
					//                      o
					$("#center .original-link")[0].click();
					return false;
				} else if (e.keyCode === 107 || e.keyCode === 187) {
					//             + on keypad                    +
					if (isMap) {
						// $(".ol-zoom-in")[0].click();
						// return false;
					} else if (currentMedia !== null) {
						ps.pinchIn();
						return false;
					}
				} else if (e.keyCode === 109 || e.keyCode === 189) {
					//         - on keypad                    -
					if (isMap) {
						// $(".ol-zoom-out")[0].click();
						// return false;
					} else if (currentMedia !== null) {
						ps.pinchOut();
						return false;
					}
				} else if (
					e.keyCode === 83 &&
					//             s
					! isMap &&
					(
						currentMedia !== null && util.hasGpsData(currentMedia) ||
						currentMedia === null && currentAlbum.positionsAndMediaInTree
					)
				) {
						$(".map-popup-trigger")[0].click();
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

	// $("#album-view").on('mousewheel', ps.swipeOnWheel);

	util.setLinksVisibility();
	util.setNextPrevVisibility();

	$(".media-box#center .metadata-show").on('click', showMetadataFromMouse);
	$(".media-box#center .metadata-hide").on('click', showMetadataFromMouse);
	$(".media-box#center .metadata").on('click', showMetadataFromMouse);

	$(".media-box#center .fullscreen").on('click', goFullscreenFromMouse);
	$("#next").attr("title", util._t("#next-media-title")).attr("alt", util._t("#next-media-title"));
	$("#prev").attr("title", util._t("#prev-media-title")).attr("alt", util._t("#prev-media-title"));
	$("#pinch-in").attr("title", util._t("#pinch-in-title")).attr("alt", util._t("#pinch-in-title"));
	$("#pinch-out").attr("title", util._t("#pinch-out-title")).attr("alt", util._t("#pinch-out-title"));
	if (isMobile.any()) {
		$("#pinch-in").css("width", "30px").css("height", "30px");
		$("#pinch-out").css("width", "30px").css("height", "30px");
	}
	$("#pinch-in").on("click", ps.pinchIn);
	$("#pinch-out").on("click", ps.pinchOut);

	function goFullscreen(e) {
		// $("#media").off();
		if (Modernizr.fullscreen) {
			e.preventDefault();
			$("#album-view").addClass('hidden');
			$("#media-view").fullScreen({
				callback: function(isFullscreen) {
					fullScreenStatus = isFullscreen;
					$(".enter-fullscreen").toggle();
					$(".exit-fullscreen").toggle();
					showMedia(currentAlbum, currentMedia, 'center');
				}
			});
		} else {
			// $("#media").off();
			if (! fullScreenStatus) {
				$(".title").addClass("hidden-by-fullscreen");
				$("#album-view").addClass('hidden-by-fullscreen');
				$(".enter-fullscreen").toggle();
				$(".exit-fullscreen").toggle();
				fullScreenStatus = true;
			} else {
				$(".title").removeClass("hidden-by-fullscreen");
				$("#album-view").removeClass('hidden-by-fullscreen');
				$(".enter-fullscreen").toggle();
				$(".exit-fullscreen").toggle();
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
			toggleMetadata();
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

	$("ul#right-menu li.hide-title").on('click', toggleTitle);
	function toggleTitle(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.hide_title = ! Options.hide_title;
			setBooleanCookie("hide_title", Options.hide_title);
			updateMenu();
			if (Options.hide_title) {
				$(".title").addClass("hidden-by-option");
			} else {
				$(".title").removeClass("hidden-by-option");
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

	$("ul#right-menu li.hide-bottom-thumbnails").on('click', toggleBottomThumbnails);
	function toggleBottomThumbnails(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.hide_bottom_thumbnails = ! Options.hide_bottom_thumbnails;
			setBooleanCookie("hide_bottom_thumbnails", Options.hide_bottom_thumbnails);
			updateMenu();
			if (Options.hide_bottom_thumbnails) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}
			showAlbum("refreshMedia");
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

	function toggleMetadata() {
		if ($(".media-box .metadata").css("display") == "none") {
			$(".media-box .metadata-show").hide();
			$(".media-box .metadata-hide").show();
			$(".media-box .metadata")
				.stop()
				.css("height", 0)
				.css("padding-top", 0)
				.css("padding-bottom", 0)
				.show()
				.stop()
				.animate({ height: $(".metadata > table").height(), paddingTop: 3, paddingBottom: 3 }, "slow", function() {
					$(this).css("height", "auto");
				});
		} else {
			$(".media-box .metadata-show").show();
			$(".media-box .metadata-hide").hide();
			$(".media-box .metadata")
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
