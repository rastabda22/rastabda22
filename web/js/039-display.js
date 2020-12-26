/*jshint esversion: 6 */
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

	var env = new Env();
	window.env = env;

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var pS = new PinchSwipe();
	var f = new Functions();
	// var map = new MapFunctions();
	var tF = new TopFunctions();

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

		// function toggleMenu() {
		// 	$("#menu-icon")[0].click();
		// }

		let upLink = util.upHash();

		if (e.key === "Escape") {
			// warning: modern browsers will always exit fullscreen when pressing esc

			if (isAuth) {
				// if (upLink && (env.currentMedia !== null || env.currentAlbum.isAlbumWithOneMedia()))
				// 	pS.swipeDown(upLink);
				$('#auth-close')[0].click();
				// $("#auth-text").hide();
				// $("#album-view, #media-view, #my-modal").css("opacity", "");
				// util.goUpInHash();
				return false;
			} else if ($("ul#right-menu").hasClass("expand")) {
				f.toggleMenu();
				return false;
			} else if (env.currentMedia !== null && env.currentMedia.mimeType.indexOf("video/") === 0 && ! $("video#media-center")[0].paused) {
					// stop the video, otherwise it keeps playing
					$("video#media-center")[0].pause();
			} else if (isMap) {
				if (isPopup) {
					// the popup is there: close it
					$('.leaflet-popup-close-button')[0].click();
					env.mapAlbum = util.initializeMapAlbum();
					// env.mapAlbum = {};
					// $('#popup #popup-content').html("");
				} else {
					// we are in a map: close it
					$('.modal-close')[0].click();
					env.popupRefreshType = "previousAlbum";
					env.mapRefreshType = "none";
					// the menu must be updated here in order to have the browsing mode shortcuts workng
					f.updateMenu();
				}
				return false;
			} else if (pS.getCurrentZoom() > pS.getInitialZoom() || $(".media-box#center .title").hasClass("hidden-by-pinch")) {
				pS.pinchOut(null, null);
				return false;
			} else if (! Modernizr.fullscreen && env.fullScreenStatus) {
				tF.goFullscreen(e);
				return false;
			} else if (upLink) {
				if (env.currentMedia !== null && env.currentMedia.mimeType.indexOf("video/") === 0)
					// stop the video, otherwise it keeps playing
					$("video#media-center")[0].pause();
				if (env.currentAlbum.cacheBase !== env.options.folders_string || env.currentMedia !== null && ! env.currentAlbum.isAlbumWithOneMedia()) {
					env.fromEscKey = true;
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
						if (pS.getCurrentZoom() === pS.getInitialZoom() && ! $("#album-view.media-view-container").hasClass("hidden-by-pinch")) {
							tF.toggleTitleThumbnailAndCaption(e);
							// $("ul#right-menu li.hide-title")[0].click();
							// $("ul#right-menu li.hide-bottom-thumbnails")[0].click();
							// $("ul#right-menu li.hide-media-caption")[0].click();
							return false;
						}
					} else if (e.key === "ArrowRight" && (pS.getCurrentZoom() !== pS.getInitialZoom() || env.prevMedia) && env.currentMedia !== null && ! isMap) {
						if (pS.getCurrentZoom() === pS.getInitialZoom()) {
							$("#album-view.media-view-container").removeClass("hidden-by-pinch");
							$("#next")[0].click();
							// media.swipeLeft();
						} else {
							// drag
							if (! e.shiftKey)
								pS.drag(env.windowWidth / 10, {x: -1, y: 0});
							else
								// faster
								pS.drag(env.windowWidth / 3, {x: -1, y: 0});
						}
						return false;
					} else if (e.key === " " && ! e.shiftKey && env.currentMedia !== null && env.currentMedia.mimeType.indexOf("video/") === 0) {
						if ($("video#media-center")[0].paused)
							// play the video
							$("video#media-center")[0].play();
						else
							// stop the video
							$("video#media-center")[0].pause();
					} else if (
						(e.key.toLowerCase() === "n" || e.key === "Backspace" && e.shiftKey || (e.key === "Enter" || e.key === " ") && ! e.shiftKey) &&
						env.nextMedia && env.currentMedia !== null && ! isMap
					) {
						$("#album-view.media-view-container").removeClass("hidden-by-pinch");
						$("#next")[0].click();
						// env.nextMedia.swipeLeft();
						return false;
					} else if (
						(e.key.toLowerCase() === "p" || e.key === "Backspace" && ! e.shiftKey || (e.key === "Enter" || e.key === " ") && e.shiftKey) &&
						env.prevMedia && env.currentMedia !== null && ! isMap
					) {
						$("#album-view.media-view-container").removeClass("hidden-by-pinch");
						$("#prev")[0].click();
						// env.prevMedia.swipeRight();
						return false;
					} else if (e.key === "ArrowLeft" && (pS.getCurrentZoom() !== pS.getInitialZoom() || env.prevMedia) && env.currentMedia !== null && ! isMap) {
						if (pS.getCurrentZoom() === pS.getInitialZoom()) {
							$("#album-view.media-view-container").removeClass("hidden-by-pinch");
							$("#prev")[0].click();
							// media.swipeRight();
						} else {
							// drag
							if (! e.shiftKey)
								pS.drag(env.windowWidth / 10, {x: 1, y: 0});
							else
								// faster
								pS.drag(env.windowWidth / 3, {x: 1, y: 0});
						}
						return false;
					} else if ((e.key === "ArrowUp" || e.key === "PageUp") && upLink && ! isMap) {
						if (pS.getCurrentZoom() === pS.getInitialZoom()) {
							if (e.shiftKey && ! $("#center .title").hasClass("hidden-by-pinch")) {
								pS.swipeDown(upLink);
								return false;
							}
						} else {
							// drag
							if (! e.shiftKey)
								pS.drag(env.windowHeight / 10, {x: 0, y: 1});
							else
								// faster
								pS.drag(env.windowHeight / 3, {x: 0, y: 1});
							return false;
						}
					} else if (e.key === "ArrowDown" || e.key === "PageDown" && ! isMap) {
					 	if (e.shiftKey && env.mediaLink && env.currentMedia === null) {
							pS.swipeUp(env.mediaLink);
							return false;
						} else if (pS.getCurrentZoom() > pS.getInitialZoom()) {
							if (! e.shiftKey)
								PinchSwipe.drag(env.windowHeight / 10, {x: 0, y: -1});
							else
								// faster
								PinchSwipe.drag(env.windowHeight / 3, {x: 0, y: -1});
							return false;
						}
					} else if (e.key.toLowerCase() === "d" && ! isMap) {
						if (env.currentMedia !== null)
							$(".download-single-media .download-link")[0].click();
						return false;
					} else if (e.key.toLowerCase() === "f" && env.currentMedia !== null && ! isMap) {
						tF.goFullscreen(e);
						return false;
					} else if (e.key.toLowerCase() === "m" && env.currentMedia !== null && ! isMap) {
						f.toggleMetadata();
						return false;
					} else if (e.key.toLowerCase() === "o" && env.currentMedia !== null && ! isMap) {
						$("#center .original-link")[0].click();
						return false;
					} else if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].indexOf(e.key) > -1) {
						if (isMap) {
							// return false;
						} else if (env.currentMedia !== null) {
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
						} else if (env.currentMedia !== null && env.currentMedia.mimeType.indexOf("image/") === 0) {
							pS.pinchIn(null);
							return false;
						}
					} else if (e.key === "-") {
						if (isMap) {
							// return false;
						} else if (env.currentMedia !== null && env.currentMedia.mimeType.indexOf("image/") === 0) {
							pS.pinchOut(null, null);
							return false;
						}
					} else if (
						e.key.toLowerCase() === "s" &&
						! isMap &&
						(
							env.currentMedia !== null && env.currentMedia.hasGpsData() ||
							env.currentMedia === null && env.currentAlbum.positionsAndMediaInTree.length
						)
					) {
						if ($(".map-popup-trigger-double")[0] !== undefined)
							$(".map-popup-trigger-double")[0].click();
						else
							$(".map-popup-trigger")[0].click();
						return false;
					} else if (
						e.key.toLowerCase() === "u" &&
						env.currentAlbum !== null
					) {
						// var numPasswords;
						// if (env.currentAlbum.isSearch())
						// 	numPasswords = env.cache.getAlbum(env.currentAlbum.ancestorsCacheBase[0]).numPasswords();
						// else
							// numPasswords = env.currentAlbum.numPasswords();

						if (
							env.currentAlbum.hasVeiledProtectedContent()
							// numPasswords && env.guessedPasswordCodes.length < numPasswords
						) {
							$("#protected-content-unveil")[0].click();
							return false;
						}
					}
				}

				if (
					env.currentAlbum !== null && (
						env.currentAlbum.isAnyRoot() ||
						env.currentMedia !== null || env.currentAlbum.isAlbumWithOneMedia()
						// [
						// 	env.options.folders_string,
						// 	env.options.by_date_string,
						// 	env.options.by_gps_string,
						// 	env.options.by_map_string,
						// 	env.options.by_selection_string,
						// 	env.options.by_search_string
						// ].indexOf(env.currentAlbum.cacheBase) !== -1 ||
						// env.currentMedia !== null || env.currentAlbum.isAlbumWithOneMedia() || util.somethingIsSelected() || util.somethingIsSearched() || env.currentAlbum.isMap()
					) && ! isMap
				) {
					// browsing mode switchers
					let nextBrowsingModeRequested = (e.key === '>');
					let prevBrowsingModeRequested = (e.key === '<');

					var filter = ".radio:not(.hidden):not(.selected)";
					if (nextBrowsingModeRequested) {
						let nextBrowsingModeObject = $(".browsing-mode-switcher.selected").nextAll(filter).first();
						if (nextBrowsingModeObject[0] === undefined)
							nextBrowsingModeObject = $(".browsing-mode-switcher.selected").siblings(filter).first();
						$(".browsing-mode-switcher").removeClass("selected");
						nextBrowsingModeObject.addClass("selected");
						nextBrowsingModeObject[0].click();
						return false;
					} else if (prevBrowsingModeRequested) {
						let prevBrowsingModeObject = $(".browsing-mode-switcher.selected").prevAll(filter).first();
						if (prevBrowsingModeObject[0] === undefined)
							prevBrowsingModeObject = $(".browsing-mode-switcher.selected").siblings(filter).last();
						$(".browsing-mode-switcher").removeClass("selected");
						prevBrowsingModeObject.addClass("selected");
						prevBrowsingModeObject[0].click();
						return false;
					}
				}
			}

			if (e.key.toLowerCase() === 'a' && e.ctrlKey) {
				if (! e.shiftKey && ! $(".select.everything").hasClass("hidden") && ! $(".select.everything").hasClass("selected")) {
					// select everything
					$(".select.everything").click();
				} else if (e.shiftKey) {
					// unselect everything
					if (! $(".select.everything-individual").hasClass("hidden") && $(".select.everything-individual").hasClass("selected")) {
						$(".select.everything-individual").click();
					} else if (! $(".select.everything").hasClass("hidden") && $(".select.everything").hasClass("selected")) {
						$(".select.everything").click();
					}
				}
				return false;
			}

			if (
				! $("#search-field").is(':focus') &&
				env.currentMedia === null && ! isMap && (
					['[', ']'].indexOf(e.key) !== -1 && ! isPopup && env.currentAlbum.subalbums.length > 1 ||
					['{', '}'].indexOf(e.key) !== -1 && env.currentAlbum.media.length > 1
				)
			) {
				if (env.currentMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) {
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
						$("#" + prevSortingModeMessageId).fadeOut(5000);
						$(".sort." + mode + "-sort" + prevSelector)[0].click();
						// console.log(".sort." + mode + "-sort" + prevSelector + " ------- " + prevSortingModeMessageId);
					} else {
						var nextSelectors = [".by-name", ".reverse", ".by-date", ".reverse"];
						nextSelector = nextSelectors[currentSortingIndex];
						nextSortingIndex = (currentSortingIndex + 1) % 4;
						nextSortingModeMessageId = sortingMessageIds[nextSortingIndex] + "-" + mode + "-sorting";
						$("#" + nextSortingModeMessageId).show();
						$("#" + nextSortingModeMessageId).fadeOut(5000);
						$(".sort." + mode + "-sort" + nextSelector)[0].click();
						// console.log(".sort." + mode + "-sort" + nextSelector + " ------- " + nextSortingModeMessageId);
					}
				}
			}

			if (
				e.key.toLowerCase() === "e" && e.target.tagName.toLowerCase() != 'input' &&  ! e.shiftKey &&  ! e.ctrlKey &&  ! e.altKey
					// "e" opens the menu, and closes it if focus in not in input field
			) {
				f.toggleMenu();
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
	if (env.isMobile.any()) {
		$("#pinch-in").css("width", "30px").css("height", "30px");
		$("#pinch-out").css("width", "30px").css("height", "30px");
	}
	// $("#pinch-in").on("click", pS.pinchIn);
	// $("#pinch-out").on("click", pS.pinchOut);

	// search
	$('#search-button').on("click", function() {
		$("#loading").show();
		var searchOptions = '';
		var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

		// save the current hash in order to come back there when exiting from search
		if (util.isSearchCacheBase(albumHash)) {
			// a plain search: get the folder to search in from the search album hash
			env.options.cache_base_to_search_in = albumHash.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
		} else {
			// it's a subalbum of a search or it's not a search hash: use the current album hash
			env.options.cache_base_to_search_in = albumHash;

			env.options.saved_cache_base_to_search_in = env.options.cache_base_to_search_in;
		}

		if (! env.options.hasOwnProperty('cache_base_to_search_in') || ! env.options.cache_base_to_search_in)
			env.options.cache_base_to_search_in = env.options.folders_string;

		var bySearchViewHash = env.hashBeginning + env.options.by_search_string;

		// build the search album part of the hash
		var wordsStringOriginal = $("#search-field").val().normalize().trim().replace(/  /g, ' ');
		var wordsString = encodeURIComponent(wordsStringOriginal.replace(/ /g, '_'));
		// TO DO: non-alphabitic words have to be filtered out
		if (wordsString) {
			var isPopup = $('.leaflet-popup').html() ? true : false;
			if (isPopup) {
				// refine the popup content!

				// normalize the search terms
				// the normalized words are needed in order to compare with the search cache json files names, which are normalized
				var wordsStringNormalizedAccordingToOptions = util.normalizeAccordingToOptions(wordsStringOriginal);
				var wordsStringNormalized = util.removeAccents(wordsStringOriginal.toLowerCase());

				var searchWordsFromUser = wordsStringOriginal.split(' ');
				var searchWordsFromUserNormalizedAccordingToOptions = wordsStringNormalizedAccordingToOptions.split(' ');
				var searchWordsFromUserNormalized = wordsStringNormalized.split(' ');
				var removedStopWords;

				// remove the stopwords from the search terms
				let stopWordsPromise = phFl.getStopWords();
				stopWordsPromise.then(
					function () {
						[searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions, removedStopWords] =
							phFl.removeStopWords(searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions);

						// every normalized single media name must match the search terms
						var matchingMedia = [];
						for (let iMedia = 0; iMedia < env.mapAlbum.media.length; iMedia ++) {
							// TO DO, BUG: it's not the media name to be used for matching, but the words in media name!!!!!!!
							// TO DO: the description (caption) must be matched too
							let words = util.normalizeAccordingToOptions(env.mapAlbum.media[iMedia].words);
							if (
								! env.options.search_any_word &&
								searchWordsFromUserNormalizedAccordingToOptions.every(searchWord =>
									env.options.search_inside_words && words.some(word => word.indexOf(searchWord) > -1) ||
									! env.options.search_inside_words && words.some(word => word === searchWord)
								) ||
								env.options.search_any_word &&
								searchWordsFromUserNormalizedAccordingToOptions.some(searchWord =>
									env.options.search_inside_words && words.some(word => word.indexOf(searchWord) > -1) ||
									! env.options.search_inside_words && words.some(word => word === searchWord)
								)
							)
								matchingMedia.push(env.mapAlbum.media[iMedia]);
						}
						env.mapAlbum.media = matchingMedia;
						tF.prepareAndDoPopupUpdate();

					},
					function() {
						console.trace();
					}
				);
			} else {
				// produce a new hash in order to perform the search
				bySearchViewHash += env.options.cache_folder_separator;
				if (env.options.search_inside_words)
					searchOptions += 'i' + env.options.search_options_separator;
				if (env.options.search_any_word)
					searchOptions += 'n' + env.options.search_options_separator;
				if (env.options.search_case_sensitive)
					searchOptions += 'c' + env.options.search_options_separator;
				if (env.options.search_accent_sensitive)
					searchOptions += 'a' + env.options.search_options_separator;
				if (env.options.search_current_album)
					searchOptions += 'o' + env.options.search_options_separator;
				bySearchViewHash += searchOptions + wordsString;

				bySearchViewHash += env.options.cache_folder_separator + env.options.cache_base_to_search_in;

				window.location.href = bySearchViewHash;
			}
		}

		util.focusSearchField();
		return false;
	});


	/* Entry point for most events */

	$('#search-field').keypress(function(ev) {
		$("#right-menu li.search ul").removeClass("hidden");
		if (ev.which === 13 || ev.keyCode === 13) {
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

	$(".download-album.everything.all.full").on(
		'click',
		function() {
			if ($(".download-album.everything.all.full").hasClass("active")) {
				Utilities.downloadAlbum(true);
			}
		}
	);
	$(".download-album.everything.all.sized").on(
		'click',
		function() {
			if ($(".download-album.everything.all.sized").hasClass("active")) {
				Utilities.downloadAlbum(true, "all", $(".download-album.everything.all.sized").attr("size"));
			}
		}
	);
	$(".download-album.everything.images.full").on(
		'click',
		function() {
			if ($(".download-album.everything.images.full").hasClass("active")) {
				Utilities.downloadAlbum(true, "images");
			}
		}
	);
	$(".download-album.everything.images.sized").on(
		'click',
		function() {
			if ($(".download-album.everything.images.sized").hasClass("active")) {
				Utilities.downloadAlbum(true, "images", $(".download-album.everything.images.sized").attr("size"));
			}
		}
	);
	$(".download-album.everything.videos.full").on(
		'click',
		function() {
			if ($(".download-album.everything.videos.full").hasClass("active")) {
				Utilities.downloadAlbum(true, "videos");
			}
		}
	);
	$(".download-album.everything.videos.sized").on(
		'click',
		function() {
			if ($(".download-album.everything.videos.sized").hasClass("active")) {
				Utilities.downloadAlbum(true, "videos", $(".download-album.everything.videos.sized").attr("size"));
			}
		}
	);

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
				Utilities.downloadAlbum(false, "images");
			}
		}
	);
	$(".download-album.media-only.images.sized").on(
		'click',
		function() {
			if ($(".download-album.media-only.images.sized").hasClass("active")) {
				Utilities.downloadAlbum(false, "images", $(".download-album.media-only.images.sized").attr("size"));
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
	$("#protected-content-unveil").on('click', util.showAuthForm);

	// binds the click events to the sort buttons

	$("ul#right-menu li.hide-title").on('click', tF.toggleTitle);
	$("ul#right-menu li.hide-media-caption").on('click', tF.toggleCaption);
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

	$("#auth-form").submit(
		function() {
			// This function checks the password looking for a file with the encrypted password name in the passwords subdir
			// the code in the found password file is inserted into env.guessedPasswordsMd5, and at the hash change the content unveiled by that password will be shown

			var password = $("#password");
			var encryptedPassword = md5(password.val());
			password.val("");

			var ajaxOptions = {
				type: "GET",
				dataType: "json",
				url: util.pathJoin([env.server_cache_path, env.options.passwords_subdir, encryptedPassword]),
				success: function(jsonCode) {
					password.css("background-color", "rgb(200, 200, 200)");
					var passwordCode = jsonCode.passwordCode;

					if (env.guessedPasswordCodes.length && env.guessedPasswordCodes.includes(passwordCode)) {
						password.css("background-color", "red");
						password.on(
							'input',
							function() {
								password.css("background-color", "");
								password.off('input');
							}
						);
					} else {
						env.guessedPasswordCodes.push(passwordCode);
						env.guessedPasswordsMd5.push(encryptedPassword);

						$("#loading").show();

						// phFl.removeAllProtectedAlbumsFromCache();

						var isPopup = $('.leaflet-popup').html() ? true : false;
						var isMap = $('#mapdiv').html() ? true : false;

						if (isMap) {
							// the map must be generated again including the points that only carry protected content
							env.mapRefreshType = "refresh";

							if (isPopup) {
								env.popupRefreshType = "mapAlbum";
								$('.leaflet-popup-close-button')[0].click();
							} else {
								env.popupRefreshType = "none";
							}
							// close the map
							$('.modal-close')[0].click();
						}

						$(window).hashchange();
					}
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
		}
	);

	// scrollbarWidth = util.detectScrollbarWidth();

	$(window).hashchange(
		function() {
			util.translate();
			$("#auth-text").hide();
			$("#album-view, #media-view, #my-modal").css("opacity", "");

			if (env.isABrowsingModeChange)
				env.isABrowsingModeChange = false;
			$("#loading").show();
			$("#album-view").removeClass("hidden");
			$("link[rel=image_src]").remove();
			$("link[rel=video_src]").remove();
			$("ul#right-menu").removeClass("expand");

			var optionsPromise = f.getOptions();
			optionsPromise.then(
				function() {
					var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

					if (! util.isSearchHash()) {
						// reset current album search flag to its default value
						env.options.search_current_album = true;
						f.setBooleanCookie("searchCurrentAlbum", env.options.search_current_album);
					}

					if (typeof isPhp === "function" && typeof postData !== "undefined" && postData !== null) {
						util.readPostData();
					}

					// parseHashAndReturnAlbumAndMedia returns an array of 3 elements:
					// - the requested album
					// - the requested media (if applicable)
					// - the requested media index (if applicable)
					var hashPromise = phFl.parseHashAndReturnAlbumAndMedia(location.hash);
					hashPromise.then(
						function([album, mediaIndex]) {
							album.prepareForShowing(mediaIndex);
						},
						function() {
							function checkHigherAncestor() {
								let upHash = util.upHash(hash);
								if (! hash.length || upHash === hash) {
									// the top album has been reached and no unprotected nor protected content has been found
									if (album.hasVeiledProtectedContent())
										$("#protected-content-unveil")[0].click();
								} else {
									hash = upHash;
									let cacheBase = hash.substring(env.hashBeginning.length);
									let getAlbumPromise = phFl.getAlbum(cacheBase, checkHigherAncestor, {getMedia: false, getPositions: false});
									getAlbumPromise.then(
										function(upAlbum) {
											if (upAlbum.hasVeiledProtectedContent() && ! env.fromEscKey) {
											// if (upAlbum.hasVeiledProtectedContent() && ! env.fromEscKey) {
												$("#loading").hide();
												util.showAuthForm();
											} else {
												util.errorThenGoUp();
											}
										}
									);
								}
							}
							// end of auxiliary function

							// neither the unprotected nor the protected album exist
							// the user could have opened a protected album link: the password can be asked, but only if some ancestor album has protected content
							let hash = location.hash;
							checkHigherAncestor();
						}
					);
				},
				function() {
					$("#album-view").fadeOut(200);
					$("#media-view").fadeOut(200);
					$("#album-view").stop().fadeIn(3500);
					$("#media-view").stop().fadeIn(3500);
					$("#error-options-file").stop().fadeIn(200);
					$("#error-options-file, #error-overlay, #auth-text").fadeOut(2500);
				}
			);
		}
	);

	// execution starts here
	$(window).hashchange();

});
