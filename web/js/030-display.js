var fullScreenStatus = false;
var currentMedia = null;
var currentAlbum = null;
var nextMedia = null, prevMedia = null, upLink = "";
var bySearchViewLink = null, byMapViewLink = null, isABrowsingModeChange = false;
var titleWrapper1, titleWrapper2, maxWidthForThumbnails, nextBrowsingModeSelector, prevBrowsingModeSelector;
var windowWidth = $(window).outerWidth();
var windowHeight = $(window).outerHeight();
var fromEscKey = false;
var destHash = null;
var destMedia = null;
var destAlbum = null;
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
	var pS = new PinchSwipe();
	var f = new Functions();
	var tF = new TopFunctions();
	var maxSize;
	var language;
	var firstEscKey = true;
	// var nextLink = "", prevLink = "";
	var mediaLink = "";

	// triplicate the #mediaview content in order to swipe the media
	var titleContent = $("#album-view").clone().children().first();
	util.mediaBoxGenerator('left');
	util.mediaBoxGenerator('right');
	$(".media-box#center").prepend(titleContent)[0].outerHTML;

	/* Displays */

	$("#menu-icon").off();
	$("#menu-icon").on("click", f.toggleMenu);

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
				$("#auth-text").hide();
				$("#album-view, #media-view").css("opacity", "");
				// window.history.back();
				return false;
			} else if ($("ul#right-menu").hasClass("expand")) {
				toggleMenu();
				return false;
			} else if (isMap) {
				if (isPopup) {
					// the popup is there: close it
					$('.leaflet-popup-close-button')[0].click();
					MapFunctions.mapAlbum = {};
					// $('#popup #popup-content').html("");
				} else
					// we are in a map: close it
					$('.modal-close')[0].click();
				return false;
			} else if (pS.getCurrentZoom() > 1 || $(".title").hasClass("hidden-by-pinch")) {
				pS.pinchOut();
				return false;
			} else if (! Modernizr.fullscreen && fullScreenStatus) {
				tF.goFullscreen(e);
				return false;
			} else if (upLink) {
				fromEscKey = true;
				pS.swipeDown(upLink);
				return false;
			}
		} else if (! isAuth) {
			if (! $("#search-field").is(':focus')) {
				if (! e.ctrlKey && ! e.altKey) {
					if (e.key === "Tab") {
						e.preventDefault();
						if (pS.getCurrentZoom() == 1) {
							$("ul#right-menu li.hide-title")[0].click();
							$("ul#right-menu li.hide-bottom-thumbnails")[0].click();
							// tF.toggleTitle(e);
							// tF.toggleBottomThumbnails(e);
							return false;
						}
					} else if (e.key === "ArrowRight" && nextMedia && currentMedia !== null && ! isMap) {
						pS.swipeLeftOrDrag(nextMedia);
						return false;
					} else if (
						(e.key === "n" || e.key === "Backspace" && e.shiftKey || (e.key === "Enter" || e.key === " ") && ! e.shiftKey) &&
						nextMedia && currentMedia !== null && ! isMap
					) {
						$("#next")[0].click();
						// pS.swipeLeft(nextMedia);
						return false;
					} else if (
						(e.key === "p" || e.key === "Backspace" && ! e.shiftKey || (e.key === "Enter" || e.key === " ") && e.shiftKey) &&
						prevMedia && currentMedia !== null && ! isMap
					) {
						$("#prev")[0].click();
						// pS.swipeRight(prevMedia);
						return false;
					} else if (e.key === "ArrowLeft" && prevMedia && currentMedia !== null && ! isMap) {
						pS.swipeRightOrDrag(prevMedia);
						return false;
					} else if ((e.key === "ArrowUp" || e.key === "PageUp") && upLink && ! isMap) {
						pS.swipeDownOrDrag(upLink);
						return false;
					} else if (e.key === "ArrowDown" || e.key === "PageDown" && ! isMap) {
					 	if (mediaLink && currentMedia === null) {
							pS.swipeUp(mediaLink);
							return false;
						} else if (pS.getCurrentZoom() > 1) {
							pS.swipeUpOrDrag(mediaLink);
							return false;
						}
					} else if (e.key === "d" && currentMedia !== null && ! isMap) {
						$("#center .download-link")[0].click();
						return false;
					} else if (e.key === "f" && currentMedia !== null && ! isMap) {
						tF.goFullscreen(e);
						return false;
					} else if (e.key === "m" && currentMedia !== null && ! isMap) {
						f.toggleMetadata();
						return false;
					} else if (e.key === "o" && currentMedia !== null && ! isMap) {
						$("#center .original-link")[0].click();
						return false;
					} else if (e.key === "+") {
						if (isMap) {
							// return false;
						} else if (currentMedia !== null) {
							pS.pinchIn();
							return false;
						}
					} else if (e.key === "-") {
						if (isMap) {
							// return false;
						} else if (currentMedia !== null) {
							pS.pinchOut();
							return false;
						}
					} else if (
						e.key === "s" &&
						! isMap &&
						(
							currentMedia !== null && util.hasGpsData(currentMedia) ||
							currentMedia === null && currentAlbum.positionsAndMediaInTree.length
						)
					) {
						$(".map-popup-trigger")[0].click();
						return false;
					}
				}

				if (
					(
						[Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string, Options.by_search_string].indexOf(currentAlbum.cacheBase) !== -1 ||
						currentMedia !== null || util.isAlbumWithOneMedia(currentAlbum)
					) &&
					! isMap
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
				e.key === "e" && e.target.tagName.toLowerCase() != 'input' &&  ! e.shiftKey&&  ! e.ctrlKey&&  ! e.altKey
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

	$(".media-box#center .metadata-show").on('click', f.showMetadataFromMouse);
	$(".media-box#center .metadata-hide").on('click', f.showMetadataFromMouse);
	$(".media-box#center .metadata").on('click', f.showMetadataFromMouse);

	$(".media-box#center .fullscreen").on('click', f.goFullscreenFromMouse);
	$("#next").attr("title", util._t("#next-media-title")).attr("alt", util._t("#next-media-title"));
	$("#prev").attr("title", util._t("#prev-media-title")).attr("alt", util._t("#prev-media-title"));
	$("#pinch-in").attr("title", util._t("#pinch-in-title")).attr("alt", util._t("#pinch-in-title"));
	$("#pinch-out").attr("title", util._t("#pinch-out-title")).attr("alt", util._t("#pinch-out-title"));
	if (isMobile.any()) {
		$("#pinch-in").css("width", "30px").css("height", "30px");
		$("#pinch-out").css("width", "30px").css("height", "30px");
	}
	$("#pinch-in").on("click", pS.pinchIn);
	$("#pinch-out").on("click", pS.pinchOut);

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
			bySearchViewHash += searchOptions + searchTerms;
		}

		bySearchViewHash += Options.cache_folder_separator + Options.album_to_search_in;

		window.location.href = bySearchViewHash;

		f.focusSearchField();
		return false;
	});

	$('#search-field').keypress(function(ev) {
		if (ev.which == 13) {
			//Enter key pressed, trigger search button click event
			$('#search-button').click();
			f.focusSearchField();
			return false;
		}
	});

	$("li#inside-words").on('click', f.toggleInsideWordsSearch);
	$("li#any-word").on('click', f.toggleAnyWordSearch);
	$("li#case-sensitive").on('click', f.toggleCaseSensitiveSearch);
	$("li#accent-sensitive").on('click', f.toggleAccentSensitiveSearch);
	$("li#album-search").on('click', f.toggleCurrentAbumSearch);

	$("li#protected-content-unveil").on('click', util.showAuthForm);
	$("li#protected-content-hide").on(
		'click',
		function() {
			PhotoFloat.guessedPasswords = [];
			if (
				util.isSearchCacheBase(currentAlbum.cacheBase) ||
				currentMedia === null
			)
				phFl.removeAlbumFromCache(currentAlbum.cacheBase);
			$(window).hashchange();
		}
	);

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
	$("ul#right-menu li.show-big-albums").on('click', tF.toggleBigAlbumsShow);
	$("#menu-icon").off();
	$("#menu-icon").on("click", f.toggleMenu);


	$(window).hashchange(function() {
		$("#auth-text").hide();
		$("#album-view, #media-view").css("opacity", "");

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
		if (Object.keys(Options).length > 0)
			f.parseHash(location.hash, tF.hashParsed, util.die);
		else
			f.getOptions(location.hash, tF.hashParsed, util.die);
	});
	$(window).hashchange();

	$("#auth-form").submit(function() {
		function success() {
			password.css("background-color", "rgb(200, 200, 200)");
			// currentAlbum.passwordOk = true;
			if (! PhotoFloat.guessedPasswords.includes(encrypted_password))
				PhotoFloat.guessedPasswords.push(encrypted_password);

			// the search albume must be remove from cache,
			// otherwise the new album won't be generated and the protected content won't be searched
			if (
				util.isSearchCacheBase(currentAlbum.cacheBase) ||
				currentMedia === null
			)
				phFl.removeAlbumFromCache(currentAlbum.cacheBase);
			if (destHash !== null)
				// destHash is set when clicking on a protected media or album
				window.location.href = destHash;
			else
				// if destHash is null, then a protected url has been requeste directly
				$(window).hashchange();
		}

		function failure() {
			password.css("background-color", "rgb(255, 64, 64)");
		}

		var password = $("#password");
		var passwordList = null;
		password.css("background-color", "rgb(128, 128, 200)");
		var encrypted_password = md5(password.val());
		if (destMedia !== null)
			passwordList = destMedia.passwords;
		else if (destAlbum !== null && destAlbum.hasOwnProperty("passwords"))
			passwordList = destAlbum.passwords;

		if (
			passwordList === null ||
			passwordList.length == 0 ||
			passwordList.some(
				function(enc_password) {
					return enc_password == encrypted_password;
				}
			)
		)
			success();
		else
			failure();
		password.val("");
		return false;
	});
});
