/*jshint esversion: 6 */
var fullScreenStatus = false;
var currentAlbum = null;
var currentMedia = null;
var currentMediaIndex = -1;
var previousAlbum = null;
var previousMedia = null;
var nextMedia = null, prevMedia = null;
var isABrowsingModeChange = false;
var cacheBaseBeforeBrowsingBySelection = null;
var windowWidth = $(window).outerWidth();
var windowHeight = $(window).outerHeight();
var fromEscKey = false;
var firstEscKey = true;
var mapRefreshType = "none";
var selectorClickedToOpenTheMap = false;
var popupRefreshType = "previousAlbum";
// var destHash = null;
// var destMedia = null;
// var destAlbum = null;
var hashBeginning = "#!/";
var mapAlbum;
var selectionAlbum;
var searchAlbum;
var cache;
// var scrollbarWidth;
// var contextMenu = false;

// var initialSizes = {};
// initialSizes[0] = new ImagesAndVideos();
var positionMarker = "<marker>position</marker>";

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
	// var map = new MapFunctions();
	var tF = new TopFunctions();
	var maxSize;
	var language;
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

		let upLink = util.upHash();

		if (e.key === "Escape") {
			// warning: modern browsers will always exit fullscreen when pressing esc

			if (isAuth) {
				// if (upLink && (currentMedia !== null || currentAlbum.isAlbumWithOneMedia()))
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
					mapAlbum = util.initializeMapAlbum();
					// mapAlbum = {};
					// $('#popup #popup-content').html("");
				} else {
					// we are in a map: close it
					$('.modal-close')[0].click();
					popupRefreshType = "previousAlbum";
					mapRefreshType = "none";
					// the menu must be updated here in order to have the browsing mode shortcuts workng
					f.updateMenu();
				}
				return false;
			} else if (pS.getCurrentZoom() > pS.getInitialZoom() || $(".media-box#center .title").hasClass("hidden-by-pinch")) {
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
							$("ul#right-menu li.hide-media-caption")[0].click();
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
							$(".download-single-media .download-link")[0].click();
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
					} else if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].indexOf(e.key) > -1) {
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
						} else if (currentMedia !== null && currentMedia.mimeType.indexOf("image") === 0) {
							pS.pinchIn(null);
							return false;
						}
					} else if (e.key === "-") {
						if (isMap) {
							// return false;
						} else if (currentMedia !== null && currentMedia.mimeType.indexOf("image") === 0) {
							pS.pinchOut(null, null);
							return false;
						}
					} else if (
						e.key.toLowerCase() === "s" &&
						! isMap &&
						(
							currentMedia !== null && currentMedia.hasGpsData() ||
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
							numPasswords = cache.getAlbum(currentAlbum.ancestorsCacheBase[0]).numPasswords();
						else
							numPasswords = currentAlbum.numPasswords();

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
							Options.by_selection_string,
							Options.by_search_string
						].indexOf(currentAlbum.cacheBase) !== -1 ||
						currentMedia !== null || currentAlbum.isAlbumWithOneMedia() || ! util.nothingIsSelected()
					) && ! isMap
				) {
					// browsing mode switchers
					let nextBrowsingModeRequested = (e.key === '>');
					let prevBrowsingModeRequested = (e.key === '<');
					if (nextBrowsingModeRequested || prevBrowsingModeRequested) {
						if (cacheBaseBeforeBrowsingBySelection) {
							cacheBaseBeforeBrowsingBySelection = null;
						}
					}

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
				currentMedia === null && ! isMap && (
					['[', ']'].indexOf(e.key) !== -1 && ! isPopup && currentAlbum.subalbums.length > 1 ||
					['{', '}'].indexOf(e.key) !== -1 && currentAlbum.media.length > 1
				)
			) {
				if (currentMedia === null && ! currentAlbum.isAlbumWithOneMedia()) {
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
		var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

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

		var bySearchViewHash = hashBeginning + Options.by_search_string;

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
						for (let iMedia = 0; iMedia < mapAlbum.media.length; iMedia ++) {
							// TO DO, BUG: it's not the media name to be used for matching, but the words in media name!!!!!!!
							// TO DO: the description (caption) must be matched too
							let words = util.normalizeAccordingToOptions(mapAlbum.media[iMedia].words);
							if (
								! Options.search_any_word &&
								searchWordsFromUserNormalizedAccordingToOptions.every(
									function(searchWord) {
										var result =
											Options.search_inside_words && words.some(
												function(word) {
													return word.indexOf(searchWord) > -1;
												}
											) ||
											! Options.search_inside_words && words.some(
												function(word) {
													return word === searchWord;
												}
											);
										return result;
									}
								) ||
								Options.search_any_word &&
								searchWordsFromUserNormalizedAccordingToOptions.some(
									function(searchWord) {
										var result =
											Options.search_inside_words && words.some(
												function(word) {
													return word.indexOf(searchWord) > -1;
												}
											) ||
											! Options.search_inside_words && words.some(
												function(word) {
													return word === searchWord;
												}
											);
										return result;
									}
								)

							)
								matchingMedia.push(mapAlbum.media[iMedia]);
						}
						mapAlbum.media = matchingMedia;
						tF.prepareAndDoPopupUpdate();

					},
					function() {
						console.trace();
					}
				);
			} else {
				// produce a new hash in order to perform the search
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
				bySearchViewHash += searchOptions + wordsString;

				bySearchViewHash += Options.cache_folder_separator + Options.cache_base_to_search_in;

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
		}
	);

	// scrollbarWidth = util.detectScrollbarWidth();

	$(window).hashchange(
		function() {
			$("#auth-text").hide();
			$("#album-view, #media-view, #my-modal").css("opacity", "");

			if (isABrowsingModeChange)
				isABrowsingModeChange = false;
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
						Options.search_current_album = true;
						f.setBooleanCookie("search_current_album", Options.search_current_album);
					}
					// parseHashAndReturnAlbumAndMedia returns an array of 3 elements:
					// - the requested album
					// - the requested media (if applicable)
					// - the requested media index (if applicable)
					var hashPromise = phFl.parseHashAndReturnAlbumAndMedia(location.hash);
					hashPromise.then(
						function([album, mediaIndex]) {
							tF.showAlbumOrMedia(album, mediaIndex);
						},
						function() {
							function checkHigherAncestor() {
								let upHash = util.upHash(hash);
								if (! hash.length || upHash === hash) {
									// the top album has been reached and no unprotected nor protected content has been found
									util.showAuthForm();
								} else {
									hash = upHash;
									let cacheBase = hash.substring(hashBeginning.length);
									let getAlbumPromise = phFl.getAlbum(cacheBase, checkHigherAncestor, {"getMedia": false, "getPositions": false});
									getAlbumPromise.then(
										function(upAlbum) {
											if (upAlbum.hasMoreProtectedContent() && ! fromEscKey) {
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
