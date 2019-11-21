/*jshint esversion: 6 */
var fullScreenStatus = false;
var currentAlbum = null;
var currentMedia = null;
var currentMediaIndex = -1;
var previousAlbum = null;
var previousMedia = null;
var nextMedia = null, prevMedia = null, upLink = "";
var bySearchViewLink = null, byMapViewLink = null, isABrowsingModeChange = false;
var nextBrowsingModeSelector, prevBrowsingModeSelector;
var windowWidth = $(window).outerWidth();
var windowHeight = $(window).outerHeight();
var fromEscKey = false;
var mapRefreshType = "none";
var selectorClickedToOpenTheMap = false;
var popupRefreshType = "previousAlbum";
var destHash = null;
var destMedia = null;
var destAlbum = null;
var scrollbarWidth;
var contextMenu = false;
var initialSizes = {};
initialSizes[0] = 0;

// var perhapsIsAProtectedMedia = false;
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
var devicePixelRatio;
if (isMobile.any())
	devicePixelRatio =  window.devicePixelRatio || 1;
else
	devicePixelRatio = 1;

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

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var pS = new PinchSwipe();
	var f = new Functions();
	var map = new MapFunctions();
	var tF = new TopFunctions();
	var maxSize;
	var language;
	var firstEscKey = true;
	// var nextLink = "", prevLink = "";
	var mediaLink = "";

	// triplicate the #mediaview content in order to swipe the media
	var titleContent = $("#album-view").clone().children().first();
	$(".media-box#center").prepend(titleContent[0].outerHTML);
	util.mediaBoxGenerator('left');
	util.mediaBoxGenerator('right');

	/* Displays */

	$("#menu-icon").off().on("click", f.toggleMenu);

	/* Event listeners */

	$(document).on('keydown', function(e) {
		var isMap = $('#mapdiv').html() ? true : false;
		var isPopup = $('.leaflet-popup').html() ? true : false;
		var isAuth = $("#auth-text").is(":visible");

		function toggleMenu() {
			$("#menu-icon")[0].click();
		}

		if (e.key === "Escape") {
			// warning: modern browsers will always exit fullscreen when pressing esc
			if (isAuth) {
				// if (upLink && (currentMedia !== null || util.isAlbumWithOneMedia(currentAlbum)))
				// 	pS.swipeDown(upLink);
				$('#auth-close')[0].click();
				// $("#auth-text").hide();
				// $("#album-view, #media-view, #my-modal").css("opacity", "");
				// util.goUpInHash();
				return false;
			} else if ($("ul#right-menu").hasClass("expand")) {
				toggleMenu();
				return false;
			} else if (currentMedia !== null && currentMedia.mimeType.indexOf("video") === 0 && ! $("#media-center")[0].paused) {
					// stop the video, otherwise it keeps playing
					$("#media-center")[0].pause();
			} else if (isMap) {
				if (isPopup) {
					// the popup is there: close it
					$('.leaflet-popup-close-button')[0].click();
					MapFunctions.mapAlbum = {};
					// $('#popup #popup-content').html("");
				} else {
					// we are in a map: close it
					$('.modal-close')[0].click();
					popupRefreshType = "previousAlbum";
					mapRefreshType = "none";
				}
				return false;
			} else if (pS.getCurrentZoom() > pS.getInitialZoom() || $(".title").hasClass("hidden-by-pinch")) {
				pS.pinchOut(null, null);
				return false;
			} else if (! Modernizr.fullscreen && fullScreenStatus) {
				tF.goFullscreen(e);
				return false;
			} else if (upLink) {
				if (currentMedia !== null && currentMedia.mimeType.indexOf("video") === 0)
					// stop the video, otherwise it keeps playing
					$("#media-center")[0].pause();
				if (currentMedia !== null || currentAlbum.cacheBase !== Options.folders_string) {
					fromEscKey = true;
					$("#loading").show();
					pS.swipeDown(upLink);
					return false;
				}
				if ($("#no-results").is(":visible")) {
					window.location.href = upLink;
					return false;
				}
			}
		} else if (! isAuth) {
			if (! $("#search-field").is(':focus')) {
				if (! e.ctrlKey && ! e.altKey) {
					if (e.key === "Tab") {
						e.preventDefault();
						if (pS.getCurrentZoom() == pS.getInitialZoom() && ! $("#album-view.media-view-container").hasClass("hidden-by-pinch")) {
							$("ul#right-menu li.hide-title")[0].click();
							$("ul#right-menu li.hide-bottom-thumbnails")[0].click();
							// tF.toggleTitle(e);
							// tF.toggleBottomThumbnails(e);
							return false;
						}
					} else if (e.key === "ArrowRight" && (pS.getCurrentZoom() !== pS.getInitialZoom() || prevMedia) && currentMedia !== null && ! isMap) {
						if (pS.getCurrentZoom() == pS.getInitialZoom()) {
							$("#album-view.media-view-container").removeClass("hidden-by-pinch");
							$("#next")[0].click();
							// PinchSwipe.swipeLeft(media);
						} else {
							// drag
							if (! e.shiftKey)
								pS.drag(windowWidth / 10, {x: -1, y: 0});
							else
								// faster
								pS.drag(windowWidth / 3, {x: -1, y: 0});
						}
						return false;
					} else if (e.key === " " && currentMedia !== null && currentMedia.mimeType.indexOf("video") === 0) {
						if ($("#media-center")[0].paused)
							// play the video
							$("#media-center")[0].play();
						else
							// stop the video
							$("#media-center")[0].pause();
					} else if (
						(e.key.toLowerCase() === "n" || e.key === "Backspace" && e.shiftKey || (e.key === "Enter" || e.key === " ") && ! e.shiftKey) &&
						nextMedia && currentMedia !== null && ! isMap
					) {
						$("#album-view.media-view-container").removeClass("hidden-by-pinch");
						$("#next")[0].click();
						// pS.swipeLeft(nextMedia);
						return false;
					} else if (
						(e.key.toLowerCase() === "p" || e.key === "Backspace" && ! e.shiftKey || (e.key === "Enter" || e.key === " ") && e.shiftKey) &&
						prevMedia && currentMedia !== null && ! isMap
					) {
						$("#album-view.media-view-container").removeClass("hidden-by-pinch");
						$("#prev")[0].click();
						// pS.swipeRight(prevMedia);
						return false;
					} else if (e.key === "ArrowLeft" && (pS.getCurrentZoom() !== pS.getInitialZoom() || prevMedia) && currentMedia !== null && ! isMap) {
						if (pS.getCurrentZoom() == pS.getInitialZoom()) {
							$("#album-view.media-view-container").removeClass("hidden-by-pinch");
							$("#prev")[0].click();
							// PinchSwipe.swipeRight(media);
						} else {
							// drag
							if (! e.shiftKey)
								pS.drag(windowWidth / 10, {x: 1, y: 0});
							else
								// faster
								pS.drag(windowWidth / 3, {x: 1, y: 0});
						}
						return false;
					} else if ((e.key === "ArrowUp" || e.key === "PageUp") && upLink && ! isMap) {
						if (pS.getCurrentZoom() == pS.getInitialZoom()) {
							if (! $("#center .title").hasClass("hidden-by-pinch"))
								pS.swipeDown(upLink);
						} else {
							// drag
							if (! e.shiftKey)
								pS.drag(windowHeight / 10, {x: 0, y: 1});
							else
								// faster
								pS.drag(windowHeight / 3, {x: 0, y: 1});
						}
						return false;
					} else if (e.key === "ArrowDown" || e.key === "PageDown" && ! isMap) {
					 	if (mediaLink && currentMedia === null) {
							pS.swipeUp(mediaLink);
							return false;
						} else if (pS.getCurrentZoom() > pS.getInitialZoom()) {
							if (! e.shiftKey)
								PinchSwipe.drag(windowHeight / 10, {x: 0, y: -1});
							else
								// faster
								PinchSwipe.drag(windowHeight / 3, {x: 0, y: -1});
							return false;
						}
					} else if (e.key.toLowerCase() === "d" && ! isMap) {
						if (currentMedia !== null)
							$("#center .download-link")[0].click();
						return false;
					} else if (e.key.toLowerCase() === "f" && currentMedia !== null && ! isMap) {
						tF.goFullscreen(e);
						return false;
					} else if (e.key.toLowerCase() === "m" && currentMedia !== null && ! isMap) {
						f.toggleMetadata();
						return false;
					} else if (e.key.toLowerCase() === "o" && currentMedia !== null && ! isMap) {
						$("#center .original-link")[0].click();
						return false;
					} else if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].indexOf(e.key) > -1) {
						if (isMap) {
							// return false;
						} else if (currentMedia !== null) {
							let number = parseInt(e.key);
							if (number > pS.getCurrentZoom())
								pS.pinchIn(null, number);
							else
								pS.pinchOut(null, number);
							return false;
						}
					} else if (e.key === "+") {
						if (isMap) {
							// return false;
						} else if (currentMedia !== null) {
							pS.pinchIn(null);
							return false;
						}
					} else if (e.key === "-") {
						if (isMap) {
							// return false;
						} else if (currentMedia !== null) {
							pS.pinchOut(null, null);
							return false;
						}
					} else if (
						e.key.toLowerCase() === "s" &&
						! isMap &&
						(
							currentMedia !== null && util.hasGpsData(currentMedia) ||
							currentMedia === null && currentAlbum.positionsAndMediaInTree.length
						)
					) {
						$(".map-popup-trigger")[0].click();
						return false;
					} else if (
						e.key.toLowerCase() === "u" &&
						currentAlbum !== null
					) {
						var numPasswords;
						if (util.isSearchCacheBase(currentAlbum.cacheBase))
							numPasswords = util.numPasswords(phFl.getAlbumFromCache(currentAlbum.ancestorsCacheBase[0]));
						else
							numPasswords = util.numPasswords(currentAlbum);

						if (
							numPasswords && PhotoFloat.guessedPasswordCodes.length < numPasswords
						) {
							$("#protected-content-unveil")[0].click();
							return false;
						}
					}
				}

				if (
					currentAlbum !== null && (
						[
							Options.folders_string,
							Options.by_date_string,
							Options.by_gps_string,
							Options.by_map_string,
							Options.by_search_string
						].indexOf(currentAlbum.cacheBase) !== -1 ||
						currentMedia !== null || util.isAlbumWithOneMedia(currentAlbum)
					) && ! isMap
				) {
					// browsing mode switchers
					if (e.key === '<' && nextBrowsingModeSelector !== null) {
						$(nextBrowsingModeSelector)[0].click();
						return false;
					} else if (e.key === '>' && prevBrowsingModeSelector !== null) {
						$(prevBrowsingModeSelector)[0].click();
						return false;
					}
				}
			}

			if (
				['[', ']'].indexOf(e.key) !== -1 && ! isPopup ||
				['{', '}'].indexOf(e.key) !== -1
			) {
				if (currentMedia === null && ! util.isAlbumWithOneMedia(currentAlbum)) {
					// media and subalbums sort switcher

					var mode;
					var prevSortingModeMessageId, nextSortingModeMessageId;
					var sortingMessageIds = ['by-date', 'by-name', 'by-name-reverse', 'by-date-reverse'];
					var currentSortingIndex, prevSortingIndex, nextSortingIndex, prevSelector, nextSelector;

					if (['[', ']'].indexOf(e.key) !== -1) {
						mode = 'album';
					} else {
						mode = 'media';
					}

					if (
						$(".sort." + mode + "-sort.by-date").hasClass("selected") &&
						! $(".sort." + mode + "-sort.reverse").hasClass("selected")
					) {
						currentSortingIndex = 0;
						// console.log("currentSortingIndex = ", currentSortingIndex);
					} else if (
						$(".sort." + mode + "-sort.by-name").hasClass("selected") &&
						! $(".sort." + mode + "-sort.reverse").hasClass("selected")
					) {
						currentSortingIndex = 1;
						// console.log("currentSortingIndex = ", currentSortingIndex);
					} else if (
						$(".sort." + mode + "-sort.by-name").hasClass("selected") &&
						$(".sort." + mode + "-sort.reverse").hasClass("selected")
					) {
						currentSortingIndex = 2;
						// console.log("currentSortingIndex = ", currentSortingIndex);
					} else if (
						$(".sort." + mode + "-sort.by-date").hasClass("selected") &&
						$(".sort." + mode + "-sort.reverse").hasClass("selected")
					) {
						currentSortingIndex = 3;
						// console.log("currentSortingIndex = ", currentSortingIndex);
					}

					$(".sort-message").stop().hide().css("opacity", "");
					if (['[', '{'].indexOf(e.key) !== -1) {
						var prevSelectors = [".reverse", ".by-date", ".reverse", ".by-name", ];
						prevSelector = prevSelectors[currentSortingIndex];
						prevSortingIndex = (currentSortingIndex + 4 - 1) % 4;
						prevSortingModeMessageId = sortingMessageIds[prevSortingIndex] + "-" + mode + "-sorting";
						$("#" + prevSortingModeMessageId).show();
						$("#" + prevSortingModeMessageId).fadeOut(2500);
						$(".sort." + mode + "-sort" + prevSelector)[0].click();
						// console.log(".sort." + mode + "-sort" + prevSelector + " ------- " + prevSortingModeMessageId);
					} else {
						var nextSelectors = [".by-name", ".reverse", ".by-date", ".reverse"];
						nextSelector = nextSelectors[currentSortingIndex];
						nextSortingIndex = (currentSortingIndex + 1) % 4;
						nextSortingModeMessageId = sortingMessageIds[nextSortingIndex] + "-" + mode + "-sorting";
						$("#" + nextSortingModeMessageId).show();
						$("#" + nextSortingModeMessageId).fadeOut(2500);
						$(".sort." + mode + "-sort" + nextSelector)[0].click();
						// console.log(".sort." + mode + "-sort" + nextSelector + " ------- " + nextSortingModeMessageId);
					}
				}
			}

			if (
				e.key.toLowerCase() === "e" && e.target.tagName.toLowerCase() != 'input' &&  ! e.shiftKey&&  ! e.ctrlKey&&  ! e.altKey
					// "e" opens the menu, and closes it if focus in not in input field
			) {
				toggleMenu();
				return false;
			}
		}

		return true;
	});

	util.setLinksVisibility();
	util.setNextPrevVisibility();

	$("#next").attr("title", util._t("#next-media-title")).attr("alt", util._t("#next-media-title"));
	$("#prev").attr("title", util._t("#prev-media-title")).attr("alt", util._t("#prev-media-title"));
	$("#pinch-in").attr("title", util._t("#pinch-in-title")).attr("alt", util._t("#pinch-in-title"));
	$("#pinch-out").attr("title", util._t("#pinch-out-title")).attr("alt", util._t("#pinch-out-title"));
	if (isMobile.any()) {
		$("#pinch-in").css("width", "30px").css("height", "30px");
		$("#pinch-out").css("width", "30px").css("height", "30px");
	}
	// $("#pinch-in").on("click", pS.pinchIn);
	// $("#pinch-out").on("click", pS.pinchOut);

	// search
	$('#search-button').on("click", function() {
		var searchOptions = '';
		var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

		// save the current hash in order to come back there when exiting from search
		if (util.isSearchCacheBase(albumHash)) {
			// a plain search: get the folder to search in from the search album hash
			Options.cache_base_to_search_in = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
		} else {
			// it's a subalbum of a search or it's not a search hash: use the current album hash
			Options.cache_base_to_search_in = albumHash;

			Options.saved_cache_base_to_search_in = Options.cache_base_to_search_in;
		}

		if (! Options.hasOwnProperty('cache_base_to_search_in') || ! Options.cache_base_to_search_in)
			Options.cache_base_to_search_in = Options.folders_string;

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
			bySearchViewHash += searchOptions + searchTerms;

			bySearchViewHash += Options.cache_folder_separator + Options.cache_base_to_search_in;

			window.location.href = bySearchViewHash;
		}

		util.focusSearchField();
		return false;
	});

	$('#search-field').keypress(function(ev) {
		$("#right-menu li.search ul").show();
		if (ev.which == 13) {
			//Enter key pressed, trigger search button click event
			$('#search-button').click();
			util.focusSearchField();
			return false;
		}
	});

	$("li#inside-words").on('click', f.toggleInsideWordsSearch);
	$("li#any-word").on('click', f.toggleAnyWordSearch);
	$("li#case-sensitive").on('click', f.toggleCaseSensitiveSearch);
	$("li#accent-sensitive").on('click', f.toggleAccentSensitiveSearch);
	$("li#album-search").on('click', f.toggleCurrentAbumSearch);

	$(".download-album.media-only.all.full").on(
		'click',
		function() {
			if ($(".download-album.media-only.all").hasClass("active")) {
				Utilities.downloadAlbum(false, "all");
			}
		}
	);
	$(".download-album.media-only.all.sized").on(
		'click',
		function() {
			if ($(".download-album.media-only.all.sized").hasClass("active")) {
				Utilities.downloadAlbum(false, "all", $(".download-album.media-only.all.sized").attr("size"));
			}
		}
	);
	$(".download-album.media-only.images.full").on(
		'click',
		function() {
			if ($(".download-album.media-only.images").hasClass("active")) {
				Utilities.downloadAlbum(false, "photos");
			}
		}
	);
	$(".download-album.media-only.images.sized").on(
		'click',
		function() {
			if ($(".download-album.media-only.images.sized").hasClass("active")) {
				Utilities.downloadAlbum(false, "photos", $(".download-album.media-only.images.sized").attr("size"));
			}
		}
	);
	$(".download-album.media-only.videos.full").on(
		'click',
		function() {
			if ($(".download-album.media-only.videos").hasClass("active")) {
				Utilities.downloadAlbum(false, "videos");
			}
		}
	);
	$(".download-album.media-only.videos.sized").on(
		'click',
		function() {
			if ($(".download-album.media-only.videos.sized").hasClass("active")) {
				Utilities.downloadAlbum(false, "videos", $(".download-album.media-only.videos.sized").attr("size"));
			}
		}
	);
	$(".download-album.everything.full").on(
		'click',
		function() {
			if ($(".download-album.everything").hasClass("active")) {
				Utilities.downloadAlbum(true);
			}
		}
	);
	$(".download-album.everything.sized").on(
		'click',
		function() {
			if ($(".download-album.everything.sized").hasClass("active")) {
				Utilities.downloadAlbum(true, "all", $(".download-album.everything.sized").attr("size"));
			}
		}
	);

	$("#protected-content-unveil").on('click', util.showAuthForm);

	// binds the click events to the sort buttons

	$("ul#right-menu li.hide-title").on('click', tF.toggleTitle);
	$("ul#right-menu li.hide-bottom-thumbnails").on('click', tF.toggleBottomThumbnails);
	$("ul#right-menu li.slide").on('click', tF.toggleSlideMode);
	$("ul#right-menu li.spaced").on('click', tF.toggleSpacing);
	$("ul#right-menu li.album-names").on('click', tF.toggleAlbumNames);
	$("ul#right-menu li.media-count").on('click', tF.toggleMediaCount);
	$("ul#right-menu li.media-names").on('click', tF.toggleMediaNames);
	$("ul#right-menu li.square-album-thumbnails").on('click', tF.toggleAlbumsSquare);
	$("ul#right-menu li.square-media-thumbnails").on('click', tF.toggleMediaSquare);
	$("ul#right-menu #show-big-albums").on('click', tF.toggleBigAlbumsShow);
	$("#menu-icon").off();
	$("#menu-icon").on("click", f.toggleMenu);

	$("#auth-form").submit(function() {
		// This function checks the password looking for a file with the encrypted password name in the passwords subdir
		// the code in the found password file is inserted into PhotoFloat.guessedPasswordsMd5, and at the hash change the content unveiled by that password will be shown

		var password = $("#password");
		var encryptedPassword = md5(password.val());
		password.val("");

		var ajaxOptions = {
			type: "GET",
			dataType: "json",
			url: util.pathJoin([Options.server_cache_path, Options.passwords_subdir, encryptedPassword]),
			success: function(jsonCode) {
				password.css("background-color", "rgb(200, 200, 200)");
				var passwordCode = jsonCode.passwordCode;

				if (! PhotoFloat.guessedPasswordCodes.includes(passwordCode))
					PhotoFloat.guessedPasswordCodes.push(passwordCode);
				if (! PhotoFloat.guessedPasswordsMd5.includes(encryptedPassword))
					PhotoFloat.guessedPasswordsMd5.push(encryptedPassword);

				$("#loading").show();

				// phFl.removeAllProtectedAlbumsFromCache();

				var isPopup = $('.leaflet-popup').html() ? true : false;
				var isMap = $('#mapdiv').html() ? true : false;

				if (isMap) {
					// the map must be generated again including the points that only carry protected content
					mapRefreshType = "refresh";

					if (isPopup) {
						popupRefreshType = "mapAlbum";
						$('.leaflet-popup-close-button')[0].click();
					} else {
						popupRefreshType = "none";
					}
					// close the map
					$('.modal-close')[0].click();
				}

				$(window).hashchange();
			},
			error: function() {
				password.css("background-color", "red");
				password.on(
					'input',
					function() {
						password.css("background-color", "");
						password.off('input');
					}
				);
			}
		};
		$.ajax(ajaxOptions);

		return false;
	});

	scrollbarWidth = util.detectScrollbarWidth();

	$(window).hashchange(function() {
		$("#auth-text").hide();
		$("#album-view, #media-view, #my-modal").css("opacity", "");

		if (isABrowsingModeChange)
			isABrowsingModeChange = false;
		else {
			// the image has changed, reset the search and map link
			bySearchViewLink = null;
			byMapViewLink = null;
		}
		$("#loading").show();
		$("#album-view").removeClass("hidden");
		$("link[rel=image_src]").remove();
		$("link[rel=video_src]").remove();
		$("ul#right-menu").removeClass("expand");
		// if (util.isMapHash(location.hash))
		// 	// map albums are generated passing the data from the map, so here we must exit
		// 	return;
		if (Object.keys(Options).length > 0) {
			f.parseHash(location.hash, tF.hashParsed, util.die);
		} else {
			var promise = f.getOptions();
			promise.then(
				function() {
					f.parseHash(location.hash, tF.hashParsed, util.die);
				},
				function() {
					console.trace();
				}
			);
		}
	});

	// execution starts here
	$(window).hashchange();

});
