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

	/* Event listeners */

	$(document).off("keydown").on("keydown", function(e) {
		var isMap = util.isMap();
		var isPopup = util.isPopup();
		var isAuth = $("#auth-text").is(":visible");

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
			} else if ($("#menu-icon").hasClass("expanded") || $("#search-icon").hasClass("expanded")) {
				util.closeMenu();
				return false;
			} else if (env.currentMedia !== null && env.currentMedia.isVideo() && ! $("video#media-center")[0].paused) {
				// stop the video, otherwise it keeps playing
				$("video#media-center")[0].pause();
				return false;
			} else if (isPopup) {
				// the popup is there: close it
				env.highlightedObjectId = null;
				$('.leaflet-popup-close-button')[0].click();
				env.mapAlbum = util.initializeMapAlbum();
				// env.mapAlbum = {};
				// $('#popup #popup-content').html("");
				return false;
			} else if (isMap) {
				// we are in a map: close it
				$('.modal-close')[0].click();
				env.popupRefreshType = "previousAlbum";
				env.mapRefreshType = "none";
				// the menu must be updated here in order to have the browsing mode shortcuts workng
				f.updateMenu();
				return false;
			} else if (env.currentZoom > env.initialZoom || $(".media-box#center .title").hasClass("hidden-by-pinch")) {
				pS.pinchOut(null, null);
				return false;
			} else if (! Modernizr.fullscreen && env.fullScreenStatus) {
				tF.toggleFullscreen(e);
				return false;
			} else if (upLink) {
				if (env.currentMedia !== null && env.currentMedia.isVideo())
					// stop the video, otherwise it keeps playing
					$("video#media-center")[0].pause();
				if (
					env.currentAlbum.cacheBase == env.options.folders_string && util.isSearchHash() ||
					env.currentAlbum.cacheBase !== env.options.folders_string || env.currentMedia !== null && ! env.currentAlbum.isAlbumWithOneMedia()
				) {
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
			if (
				e.key !== undefined &&
				$("#right-menu").hasClass("expanded") && (
					! $("#search-field").is(":focus") || e.key === "Tab"
				) &&
				! e.ctrlKey && ! e.altKey
			) {
				let highlightedItemObject = util.highlightedItemObject();
				if (e.key === "Enter") {
					highlightedItemObject.click();
					return false;
				} else if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Tab") {
					let nextItemFunction;
					if (e.key === "ArrowUp" && ! e.shiftKey || e.key === "ArrowDown" && e.shiftKey || e.key === "Tab" && e.shiftKey)
						nextItemFunction = util.prevItemForHighlighting;
					else
						nextItemFunction = util.nextItemForHighlighting;
					let nextItem = nextItemFunction(highlightedItemObject);
					util.addHighlightToItem(nextItem);
					$("#search-field").blur();
					return false;
				} else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
					$("#right-menu li.first-level.hidden-by-menu-selection.was-highlighted, #right-menu li.search.hidden-by-menu-selection.was-highlighted").addClass("highlighted").removeClass("was-highlighted");
					$("#right-menu li.first-level:not(.hidden-by-menu-selection).highlighted, #right-menu li.search:not(.hidden-by-menu-selection).highlighted").removeClass("highlighted").addClass("was-highlighted");
					$("#right-menu li.first-level, #right-menu li.search").toggleClass("hidden-by-menu-selection");
					$("#menu-icon, #search-icon").toggleClass("expanded");
					util.highlightMenu();
					util.focusSearchField();
					return false;
				}
			} else if (e.key !== undefined && ! $("#right-menu").hasClass("expanded")) {
				if (! e.altKey && e.key === " ") {
					if (env.currentMedia === null) {
						let highlightedObject = util.highlightedObject();
						util.selectBoxObject(highlightedObject).click();
						return false;
					} else if (e.ctrlKey){
						$("#media-select-box .select-box").click();
						return false;
					}
				}
				if (! e.ctrlKey && ! e.altKey) {
					let highlightedObject = util.highlightedObject();
					if (env.currentMedia === null && e.key === "Enter") {
						highlightedObject.click();
						return false;
					} else if (env.currentMedia === null && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowUp")) {
						if (! isMap) {
							let nextObjectFunction;
							if (e.key === "ArrowLeft" || e.key === "ArrowUp")
								nextObjectFunction = util.prevObjectForHighlighting;
							else
								nextObjectFunction = util.nextObjectForHighlighting;

							let nextObject;
							if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
								nextObject = nextObjectFunction(highlightedObject);
							} else {
								// e.key is "ArrowDown" or "ArrowUp"
								let currentObject = highlightedObject;
								let arrayDistances = [], objectsInLine = [];
								// first, we must reach the next line
								while (true) {
									nextObject = nextObjectFunction(currentObject);
									if (nextObject.html() === highlightedObject.html()) {
										// we have returned to the original object
										return false;
									} else if (util.verticalDistance(highlightedObject, nextObject) !== 0) {
										// we aren't on the original line any more!
										break;
									}
									// we are still on the original line
									currentObject = nextObject;
								}
								// we have reached the next line

								currentObject = nextObject;
								let firstObjectInLine = currentObject;
								while (true) {
									arrayDistances.push(Math.abs(util.horizontalDistance(highlightedObject, currentObject)));
									objectsInLine.push(nextObject);
									nextObject = nextObjectFunction(currentObject);
									if (util.verticalDistance(firstObjectInLine, nextObject) !== 0) {
										// we aren't on the following line any more!
										break;
									}
									// we are still on the following line
									currentObject = nextObject;
								}
								// choose the object which have the minimum horizontal distance
								if (! objectsInLine.length)
									return false;
								let minimumDistanceIndex = arrayDistances.indexOf(Math.min(... arrayDistances));
								nextObject = objectsInLine[minimumDistanceIndex];
							}

							if (nextObject.hasClass("thumb-and-caption-container")) {
								if (isPopup)
									util.scrollPopupToHighlightedThumb(nextObject);
								else
									util.scrollAlbumViewToHighlightedThumb(nextObject);
							} else {
								util.scrollToHighlightedSubalbum(nextObject);
							}
						}
						return false;
					} else if (e.key === util._t("#hide-everytyhing-shortcut")) {
						e.preventDefault();
						tF.toggleTitleAndBottomThumbnailsAndDescriptionsAndTags(e);
						return false;
					} else if (e.key === "ArrowRight" && (env.currentZoom !== env.initialZoom || env.prevMedia) && env.currentMedia !== null && ! isMap) {
						if (env.currentZoom === env.initialZoom) {
							$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
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
					} else if (e.key === " " && ! e.shiftKey && env.currentMedia !== null && env.currentMedia.isVideo()) {
						if ($("video#media-center")[0].paused)
							// play the video
							$("video#media-center")[0].play();
						else
							// stop the video
							$("video#media-center")[0].pause();
						return false;
					} else if (
						(e.key.toLowerCase() === util._t("#next-media-title-shortcut") || e.key === "Backspace" && e.shiftKey || (e.key === "Enter" || e.key === " ") && ! e.shiftKey) &&
						env.nextMedia && env.currentMedia !== null && ! isMap
					) {
						$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
						$("#next")[0].click();
						// env.nextMedia.swipeLeft();
						return false;
					} else if (
						(e.key.toLowerCase() === util._t("#prev-media-title-shortcut") || e.key === "Backspace" && ! e.shiftKey || (e.key === "Enter" || e.key === " ") && e.shiftKey) &&
						env.prevMedia && env.currentMedia !== null && ! isMap
					) {
						$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
						$("#prev")[0].click();
						// env.prevMedia.swipeRight();
						return false;
					} else if (e.key === "ArrowLeft" && (env.currentZoom !== env.initialZoom || env.prevMedia) && env.currentMedia !== null && ! isMap) {
						if (env.currentZoom === env.initialZoom) {
							$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
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
						if (e.shiftKey && env.currentMedia === null) {
							$("#loading").show();
							pS.swipeDown(upLink);
							return false;
						} else if (env.currentMedia !== null) {
							if (env.currentZoom === env.initialZoom) {
								if (e.shiftKey) {
								// if (e.shiftKey && ! $("#center .title").hasClass("hidden-by-pinch")) {
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
						}
					} else if (e.key === "ArrowDown" || e.key === "PageDown" && ! isMap) {
					 	if (e.shiftKey && env.mediaLink && env.currentMedia === null) {
							pS.swipeUp(env.mediaLink);
							return false;
						} else if (env.currentMedia !== null) {
							if (env.currentZoom === env.initialZoom) {
								if (e.shiftKey) {
								// if (e.shiftKey && ! $("#center .title").hasClass("hidden-by-pinch")) {
									pS.swipeDown(upLink);
									return false;
								}
							} else {
								if (! e.shiftKey)
									pS.drag(env.windowHeight / 10, {x: 0, y: -1});
								else
									// faster
									pS.drag(env.windowHeight / 3, {x: 0, y: -1});
								return false;
							}
						}
					} else if (e.key.toLowerCase() === util._t(".download-link-shortcut") && ! isMap) {
						if (env.currentMedia !== null)
							$(".download-single-media .download-link")[0].click();
						return false;
					} else if (e.key.toLowerCase() === util._t(".enter-fullscreen-shortcut")  && ! isMap && ! isPopup) {
					// } else if (e.key.toLowerCase() === util._t(".enter-fullscreen-shortcut") && env.currentMedia !== null && ! isMap) {
						tF.toggleFullscreen(e);
						return false;
					} else if (e.key.toLowerCase() === util._t(".metadata-hide-shortcut") && env.currentMedia !== null && ! isMap) {
						f.toggleMetadata();
						return false;
					} else if (e.key.toLowerCase() === util._t(".original-link-shortcut") && env.currentMedia !== null && ! isMap) {
						$("#center .original-link")[0].click();
						return false;
					} else if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].indexOf(e.key) > -1) {
						if (isMap) {
							// return false;
						} else if (env.currentMedia !== null) {
							let number = parseInt(e.key);
							if (number > env.currentZoom)
								pS.pinchIn(null, number);
							else
								pS.pinchOut(null, number);
							return false;
						}
					} else if (e.key === "+") {
						if (isMap) {
							// return false;
						} else if (env.currentMedia !== null && env.currentMedia.isImage()) {
							pS.pinchIn(null);
							return false;
						}
					} else if (e.key === "-") {
						if (isMap) {
							// return false;
						} else if (env.currentMedia !== null && env.currentMedia.isImage()) {
							pS.pinchOut(null, null);
							return false;
						}
					} else if (
						e.key.toLowerCase() === util._t(".map-link-shortcut") &&
						! isMap && ! isPopup &&
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
						e.key.toLowerCase() === util._t("#protected-content-unveil-shortcut") &&
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
							$(".first-level.protection")[0].click();
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

			if (
				e.key !== undefined &&
				! $("#right-menu").hasClass("expanded") &&
				e.key.toLowerCase() === util._t("#select-everything-shortcut")
			) {
				if (! e.shiftKey) {
					// select everything
					$(".select.everything:not(.hidden):not(.selected)").click();
				} else if (e.shiftKey) {
					// unselect everything
					$(".select.nothing").click();
				}
				return false;
			}

			if (
				! $("#right-menu").hasClass("expanded") &&
				env.currentMedia === null && ! isMap && (
					['[', ']'].indexOf(e.key) !== -1 && ! isPopup && env.currentAlbum.subalbums.length > 1 ||
					['{', '}'].indexOf(e.key) !== -1 && (env.currentAlbum.media.length > 1 || env.mapAlbum.media.length > 1)
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
					return false;
				}
			}

			// "e" opens the menu, and closes it if focus is not in input field
			if (
				e.key !== undefined &&
				! e.shiftKey &&  ! e.ctrlKey &&  ! e.altKey &&
				e.key.toLowerCase() === util._t("#menu-icon-title-shortcut") && (
					! $("#right-menu").hasClass("expanded") ||
					$(".search").hasClass("hidden-by-menu-selection")
				)
			) {
				util.toggleMenu();
				return false;
			}
		}

		if ($("#right-menu").hasClass("expanded") && ! $(".search").hasClass("hidden-by-menu-selection") && ! $("#search-field").is(":focus") && e.key !== undefined) {
			// focus the search field, so that the typed text is added
			$("#search-field").focus();
		}

		return true;
	});

	util.setLinksVisibility();
	util.setNextPrevVisibility();

	let nextTitle  = util._t("#next-media-title");
	let prevTitle  = util._t("#prev-media-title");
	if (! env.isMobile.any()) {
		nextTitle  += " [" + util._t("#next-media-title-shortcut") + "]";
		prevTitle  += " [" + util._t("#prev-media-title-shortcut") + "]";
	}
	$("#next").attr("title", nextTitle).attr("alt", nextTitle);
	$("#prev").attr("title", prevTitle).attr("alt", prevTitle);
	$("#pinch-in").attr("title", util._t("#pinch-in-title")).attr("alt", util._t("#pinch-in-title"));
	$("#pinch-out").attr("title", util._t("#pinch-out-title")).attr("alt", util._t("#pinch-out-title"));
	if (env.isMobile.any()) {
		$("#pinch-in").css("width", "30px").css("height", "30px");
		$("#pinch-out").css("width", "30px").css("height", "30px");
	}
	// $("#pinch-in").on("click", pS.pinchIn);
	// $("#pinch-out").on("click", pS.pinchOut);

	// search
	$('#search-button').off("click").on("click", function() {
		var searchOptions = '';
		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);

		// save the current hash in order to come back there when exiting from search
		if (util.isSearchCacheBase(albumCacheBase)) {
			// a plain search: get the folder to search in from the search album hash
			env.options.cache_base_to_search_in = albumCacheBase.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
		} else {
			// it's a subalbum of a search or it's not a search hash: use the current album hash
			env.options.cache_base_to_search_in = albumCacheBase;

			env.options.saved_cache_base_to_search_in = env.options.cache_base_to_search_in;
		}

		if (! env.options.hasOwnProperty('cache_base_to_search_in') || ! env.options.cache_base_to_search_in)
			env.options.cache_base_to_search_in = env.options.folders_string;

		var bySearchViewHash = env.hashBeginning + env.options.by_search_string;

		// build the search album part of the hash
		var wordsStringOriginal, wordsString;
		if (env.options.search_tags_only) {
			wordsStringOriginal = util.encodeNonLetters($("#search-field").val()).normalize().replace(/  /g, ' ').trim();
		} else {
			wordsStringOriginal = $("#search-field").val().normalize().replace(/[^\p{L}]/ug, ' ').replace(/  /g, ' ').trim();
		}
		wordsString = encodeURIComponent(wordsStringOriginal.replace(/ /g, '_'));
		// TO DO: non-alphabitic words have to be filtered out
		if (wordsString) {
			if (util.isPopup()) {
				// refine the original popup content!

				// normalize the search terms
				// the normalized words are needed in order to compare with the search cache json files names, which are normalized
				var wordsStringNormalizedAccordingToOptions = util.normalizeAccordingToOptions(wordsStringOriginal);
				var wordsStringNormalized = wordsStringOriginal.toLowerCase();
				wordsStringNormalized = util.removeAccents(wordsStringNormalized);

				var searchWordsFromUser = [], searchWordsFromUserNormalized = [], searchWordsFromUserNormalizedAccordingToOptions = [];
				if (env.options.search_tags_only) {
					searchWordsFromUser = [decodeURIComponent(wordsString).replace(/_/g, " ")];
					searchWordsFromUserNormalizedAccordingToOptions = [decodeURIComponent(wordsStringNormalizedAccordingToOptions)];
					searchWordsFromUserNormalized = [decodeURIComponent(wordsStringNormalized)];
				} else {
					searchWordsFromUser = wordsString.split('_');
					searchWordsFromUserNormalizedAccordingToOptions = wordsStringNormalizedAccordingToOptions.split(' ');
					searchWordsFromUserNormalized = wordsStringNormalized.split(' ');
				}
				var removedStopWords;

				// remove the stopwords from the search terms
				let stopWordsPromise = phFl.getStopWords();
				stopWordsPromise.then(
					function () {
						[searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions, removedStopWords] =
							phFl.removeStopWords(searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions);

						// re-build the original map album
						var clickHistory = env.mapAlbum.clickHistory;
						env.mapAlbum = new Album();
						let playPromise = tF.playClickElement(clickHistory, 0);
						playPromise.then(
							function popupReady() {
								if (env.options.search_any_word) {
									// at least one word
									let mediaResult = new Media([]);
									searchWordsFromUserNormalizedAccordingToOptions.forEach(
										function(normalizedSearchWord, index) {
											let mapAlbumClone = env.mapAlbum.clone();
											mapAlbumClone.filterMediaAgainstOneWordAndAlbumSearchedIn(normalizedSearchWord);
											mediaResult = util.arrayUnion(mediaResult, mapAlbumClone.media, function(a, b) {return a.isEqual(b);});
										}
									);
									env.mapAlbum.media = mediaResult;
								} else {
									env.mapAlbum.filterMediaAgainstEveryWord(searchWordsFromUserNormalizedAccordingToOptions);
								}
								tF.prepareAndDoPopupUpdate();
								if (! env.options.search_inside_words && removedStopWords.length) {
									// say that some search word hasn't been used
									let stopWordsFound = " - <span class='italic'>" + removedStopWords.length + " " + util._t("#removed-stopwords") + ": ";
									for (let i = 0; i < removedStopWords.length; i ++) {
										if (i)
											stopWordsFound += ", ";
										stopWordsFound += removedStopWords[i];
									}
									stopWordsFound += "</span>";
									$("#popup-photo-count").append(stopWordsFound);
								}
							}
						);
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
				if (env.options.search_tags_only)
					searchOptions += 't' + env.options.search_options_separator;
				if (env.options.search_current_album)
					searchOptions += 'o' + env.options.search_options_separator;
				bySearchViewHash += searchOptions + wordsString;

				bySearchViewHash += env.options.cache_folder_separator + env.options.cache_base_to_search_in;

				if (bySearchViewHash !== window.location.hash) {
					$("#loading").show();
					window.location.hash = bySearchViewHash;
				}
			}
		}

		util.highlightMenu();
		return false;
	});


	/* Entry point for most events */

	$('#search-field').keypress(function(ev) {
		// $("#right-menu li.search ul").removeClass("hidden");
		if (ev.which === 13 || ev.keyCode === 13) {
			//Enter key pressed, trigger search button click event
			$('#search-button').click();
			util.focusSearchField();
			$("#search-field").blur();
			return false;
		}
	});

	$("li#inside-words").off("click").on("click", util.toggleInsideWordsSearch);
	$("li#any-word").off("click").on("click", util.toggleAnyWordSearch);
	$("li#case-sensitive").off("click").on("click", util.toggleCaseSensitiveSearch);
	$("li#accent-sensitive").off("click").on("click", util.toggleAccentSensitiveSearch);
	$("li#tags-only").off("click").on("click", util.toggleTagsOnlySearch);
	$("li#album-search").off("click").on("click", util.toggleCurrentAbumSearch);

	$(".download-album.everything.all.full").off("click").on(
		"click",
		function() {
			if ($(".download-album.everything.all.full").hasClass("active")) {
				env.currentAlbum.downloadAlbum(true);
				return false;
			}
		}
	);
	$(".download-album.everything.all.sized").off("click").on(
		"click",
		function() {
			if ($(".download-album.everything.all.sized").hasClass("active")) {
				env.currentAlbum.downloadAlbum(true, "all", $(".download-album.everything.all.sized").attr("size"));
				return false;
			}
		}
	);
	$(".download-album.everything.images.full").off("click").on(
		"click",
		function() {
			if ($(".download-album.everything.images.full").hasClass("active")) {
				env.currentAlbum.downloadAlbum(true, "images");
				return false;
			}
		}
	);
	$(".download-album.everything.images.sized").off("click").on(
		"click",
		function() {
			if ($(".download-album.everything.images.sized").hasClass("active")) {
				env.currentAlbum.downloadAlbum(true, "images", $(".download-album.everything.images.sized").attr("size"));
				return false;
			}
		}
	);
	$(".download-album.everything.videos.full").off("click").on(
		"click",
		function() {
			if ($(".download-album.everything.videos.full").hasClass("active")) {
				env.currentAlbum.downloadAlbum(true, "videos");
				return false;
			}
		}
	);
	$(".download-album.everything.videos.sized").off("click").on(
		"click",
		function() {
			if ($(".download-album.everything.videos.sized").hasClass("active")) {
				env.currentAlbum.downloadAlbum(true, "videos", $(".download-album.everything.videos.sized").attr("size"));
				return false;
			}
		}
	);

	$(".download-album.media-only.all.full").off("click").on(
		"click",
		function() {
			if ($(".download-album.media-only.all").hasClass("active")) {
				env.currentAlbum.downloadAlbum(false, "all");
				return false;
			}
		}
	);
	$(".download-album.media-only.all.sized").off("click").on(
		"click",
		function() {
			if ($(".download-album.media-only.all.sized").hasClass("active")) {
				env.currentAlbum.downloadAlbum(false, "all", $(".download-album.media-only.all.sized").attr("size"));
				return false;
			}
		}
	);
	$(".download-album.media-only.images.full").off("click").on(
		"click",
		function() {
			if ($(".download-album.media-only.images").hasClass("active")) {
				env.currentAlbum.downloadAlbum(false, "images");
				return false;
			}
		}
	);
	$(".download-album.media-only.images.sized").off("click").on(
		"click",
		function() {
			if ($(".download-album.media-only.images.sized").hasClass("active")) {
				env.currentAlbum.downloadAlbum(false, "images", $(".download-album.media-only.images.sized").attr("size"));
				return false;
			}
		}
	);
	$(".download-album.media-only.videos.full").off("click").on(
		"click",
		function() {
			if ($(".download-album.media-only.videos").hasClass("active")) {
				env.currentAlbum.downloadAlbum(false, "videos");
			}
		}
	);
	$(".download-album.media-only.videos.sized").off("click").on(
		"click",
		function() {
			if ($(".download-album.media-only.videos.sized").hasClass("active")) {
				env.currentAlbum.downloadAlbum(false, "videos", $(".download-album.media-only.videos.sized").attr("size"));
				return false;
			}
		}
	);

	$(".first-level.protection").off("click").on("click", util.showAuthForm);

	// binds the click events to the sort buttons

	$("ul#right-menu li.hide-title").off("click").on("click", tF.toggleTitle);
	$("ul#right-menu li.show-descriptions").off("click").on("click", tF.toggleDescriptions);
	$("ul#right-menu li.show-tags").off("click").on("click", tF.toggleTags);
	$("ul#right-menu li.show-bottom-thumbnails").off("click").on("click", tF.toggleBottomThumbnails);
	$("ul#right-menu li.slide").off("click").on("click", tF.toggleSlideMode);
	$("ul#right-menu li.spaced").off("click").on("click", tF.toggleSpacing);
	$("ul#right-menu li.album-names").off("click").on("click", tF.toggleAlbumNames);
	$("ul#right-menu li.media-count").off("click").on("click", tF.toggleMediaCount);
	$("ul#right-menu li.media-names").off("click").on("click", tF.toggleMediaNames);
	$("ul#right-menu li.square-album-thumbnails").off("click").on("click", tF.toggleAlbumsSquare);
	$("ul#right-menu li.square-media-thumbnails").off("click").on("click", tF.toggleMediaSquare);
	$("ul#right-menu li.reset").off("click").on("click", tF.resetDisplaySettings);
	$("ul#right-menu #show-big-albums").off("click").on("click", tF.toggleBigAlbumsShow);
	$("#search-icon").off("click").on("click", util.toggleSearchMenu);
	$("#menu-icon").off("click").on("click", util.toggleRightMenu);

	$("#auth-form").submit(
		function() {
			// This function checks the password looking for a file with the encrypted password name in the passwords subdir
			// the code in the found password file is inserted into env.guessedPasswordsMd5, and at the hash change the content unveiled by that password will be shown

			var passwordObject = $("#password");
			var encryptedPassword = md5(passwordObject.val());
			passwordObject.val("");

			var ajaxOptions = {
				type: "GET",
				dataType: "json",
				url: util.pathJoin([env.server_cache_path, env.options.passwords_subdir, encryptedPassword]),
				success: function(jsonCode) {
					passwordObject.css("background-color", "rgb(200, 200, 200)");
					var passwordCode = jsonCode.passwordCode;

					if (env.guessedPasswordCodes.length && env.guessedPasswordCodes.includes(passwordCode)) {
						passwordObject.css("background-color", "red");
						passwordObject.on(
							'input',
							function() {
								passwordObject.css("background-color", "");
								passwordObject.off('input');
							}
						);
					} else {
						env.guessedPasswordCodes.push(passwordCode);
						env.guessedPasswordsMd5.push(encryptedPassword);

						$("#loading").show();

						if (util.isMap() || util.isPopup()) {
							// the map must be generated again including the points that only carry protected content
							env.mapRefreshType = "refresh";

							if (util.isPopup()) {
								env.popupRefreshType = "mapAlbum";
								$('.leaflet-popup-close-button')[0].click();
							} else {
								env.popupRefreshType = "none";
							}
							// close the map
							$('.modal-close')[0].click();
						}

						env.isFromAuthForm = true;
						$(window).hashchange();
					}
				},
				error: function() {
					passwordObject.css("background-color", "red");
					passwordObject.on(
						'input',
						function() {
							passwordObject.css("background-color", "");
							passwordObject.off('input');
						}
					);
				}
			};
			$.ajax(ajaxOptions);

			return false;
		}
	);

	// scrollbarWidth = util.windowVerticalScrollbarWidth();

	$(window).hashchange(
		function() {
			util.translate();
			$("#auth-text").hide();
			// $("#thumbs").show();
			$("#subalbums").removeClass("hidden");
			$("#album-view, #media-view, #my-modal").css("opacity", "");

			if (env.isABrowsingModeChange)
				env.isABrowsingModeChange = false;
			$("#loading").show();
			// $("#album-view").removeClass("hidden");
			$("link[rel=image_src]").remove();
			$("link[rel=video_src]").remove();
			// $("ul#right-menu").removeClass("expanded");

			if (util.isMap() || util.isPopup()) {
				// we are in a map: close it
				$('.modal-close')[0].click();
			}

			var optionsPromise = f.getOptions();
			optionsPromise.then(
				function() {
					var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);

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
							if (album.isSearch() && ! album.numsMediaInSubTree.imagesAndVideosTotal())
								util.openSearchMenu(album);
							else
								util.closeMenu();
							album.prepareForShowing(mediaIndex);
						},
						function(album) {
							function checkHigherAncestor() {
								if (album.isSearch())
									util.openSearchMenu(album);

								let upHash = util.upHash(hash);
								if (! hash.length || upHash === hash) {
									// the top album has been reached and no unprotected nor protected content has been found
									if (album.isEmpty || album.hasVeiledProtectedContent())
										$(".first-level.protection")[0].click();
								} else {
									hash = upHash;
									let cacheBase = hash.substring(env.hashBeginning.length);
									let getAlbumPromise = phFl.getAlbum(cacheBase, checkHigherAncestor, {getMedia: false, getPositions: false});
									getAlbumPromise.then(
										function(upAlbum) {
											if (upAlbum.hasVeiledProtectedContent() && ! env.fromEscKey) {
											// if (upAlbum.hasVeiledProtectedContent() && ! env.fromEscKey) {
												$("#loading").hide();
												$(".first-level.protection")[0].click();
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
