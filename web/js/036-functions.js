/*jshint esversion: 6 */
(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var pS = new PinchSwipe();

	/* constructor */
	function Functions() {
	}

	/* Displays */

	Functions.prototype.socialButtons = function() {
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
		if (currentMedia === null || currentAlbum !== null && ! currentAlbum.subalbums.length && util.imagesAndVideosTotal(currentAlbum.numMedia) == 1) {
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
			if (currentMedia.mimeType.indexOf("video/") === 0) {
				mediaParameter = util.pathJoin([
					Options.server_cache_path,
					currentMedia.cacheSubdir,
				]) + prefix + currentMedia.cacheBase + Options.cache_folder_separator + "transcoded.mp4";
			} else if (currentMedia.mimeType.indexOf("image/") === 0) {
				mediaParameter = util.pathJoin([
					Options.server_cache_path,
					currentMedia.cacheSubdir,
					prefix + currentMedia.cacheBase
				]) + Options.cache_folder_separator + Options.reduced_sizes[reducedSizesIndex] + ".jpg";
			}
		}

		myShareUrl = url + '?';
		// disable the image parameter, because of issue #169
		// myShareUrl += 'm=' + mediaParameter;
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
	};

	Functions.getAlbumNameFromAlbumHash = function(hash) {
		return new Promise(
			function(resolve_getAlbumNameFromAlbumHash) {
				let getAlbumPromise = PhotoFloat.getAlbum(hash, util.noOp, {"getMedia": false, "getPositions": false});
				getAlbumPromise.then(
					function(theAlbum) {
						var path;
						var splittedPath = theAlbum.path.split('/');
						if (splittedPath[0] === Options.folders_string) {
							splittedPath[0] = "";
						} else if (splittedPath[0] === Options.by_date_string) {
							splittedPath[0] = "(" + util._t("#by-date") + ")";
						} else if (splittedPath[0] === Options.by_gps_string) {
							splittedPath = theAlbum.ancestorsNames;
							splittedPath[0] = "(" + util._t("#by-gps") + ")";
						} else if (splittedPath[0] === Options.by_map_string) {
							splittedPath = ["(" + util._t("#by-map") + ")"];
						}
						path = splittedPath.join('/');

						resolve_getAlbumNameFromAlbumHash(path);
					},
					function() {
						console.trace();
					}
				);
			}
		);
	};


	Functions.updateMenu = function(thisAlbum) {
		var albumOrMedia;
		var isPopup = $('.leaflet-popup').html() ? true : false;
		var isMap = ($('#mapdiv').html() ? true : false) && ! isPopup;
		var isMapOrPopup = isMap || isPopup;

		if (typeof thisAlbum === "undefined")
			thisAlbum = currentAlbum;
		var isAlbumWithOneMedia = util.isAlbumWithOneMedia(thisAlbum);
		var isSingleMedia = (currentMedia !== null || isAlbumWithOneMedia);
		var isAnyRootCacheBase = util.isAnyRootCacheBase(thisAlbum.cacheBase);
		var isSelectionCacheBase = util.isSelectionCacheBase(thisAlbum.cacheBase);
		var somethingIsSelected = util.somethingIsSelected();

		var hasGpsData, thisMedia;

		if (isSingleMedia) {
			if (currentMedia !== null)
				thisMedia = currentMedia;
			else
				thisMedia = thisAlbum.media[0];
			hasGpsData = util.hasGpsData(thisMedia);
		} else if (isAnyRootCacheBase) {
			hasGpsData = (Options.num_positions_in_tree > 0);
		} else {
			hasGpsData = false;
		}

		// add the correct classes to the menu buttons

		////////////////// BROWSING MODES //////////////////////////////

		$(".browsing-mode-switcher").off("click");

		if (
			isMapOrPopup ||
			thisAlbum === null ||
			! isSingleMedia && ! isAnyRootCacheBase
		) {
			$(".browsing-mode-switcher").addClass("hidden");
		} else {
			$(".browsing-mode-switcher").removeClass("hidden").removeClass("selected");

			if (! hasGpsData) {
				$("#by-gps-view").addClass("hidden");
			}

			if (
				! somethingIsSelected || ! (
					isSingleMedia && util.singleMediaIsSelected(thisMedia) ||
					isAnyRootCacheBase
				)
			) {
				$("#by-selection-view").addClass("hidden");
			}

			if (
				! util.somethingIsInMapAlbum() || ! (
					isSingleMedia && util.singleMediaIsInMapAlbum(thisMedia) ||
					isAnyRootCacheBase
				)
			) {
				$("#by-map-view").addClass("hidden");
			}

			if (
				! util.somethingIsSearched() || ! (
					isSingleMedia && util.singleMediaIsSearched(thisMedia) ||
					isAnyRootCacheBase
				)
			) {
				$("#by-search-view").addClass("hidden");
			}

			if (util.isFolderCacheBase(thisAlbum.cacheBase)) {
				// folder album: change to by date or by gps view
				$("#folders-view").addClass("selected");
			} else if (util.isByDateCacheBase(thisAlbum.cacheBase)) {
				$("#by-date-view").addClass("selected");
			} else if (util.isByGpsCacheBase(thisAlbum.cacheBase)) {
				$("#by-gps-view").addClass("selected");
			} else if (util.isMapCacheBase(thisAlbum.cacheBase)) {
				$("#by-map-view").removeClass("hidden").addClass("selected");
			} else if (util.isSearchCacheBase(thisAlbum.cacheBase)) {
				$("#by-search-view").removeClass("hidden").addClass("selected");
			} else if (isSelectionCacheBase) {
				$("#by-selection-view").removeClass("hidden").addClass("selected");
			}
		}

		// bind the click events

		$("#folders-view:not(.hidden):not(.selected)").on(
			"click",
			function changeToFoldersView() {
				TopFunctions.showBrowsingModeMessage("#folders-browsing");

				if (isSingleMedia) {
					window.location.href = hashBeginning + util.pathJoin([
						thisMedia.foldersCacheBase,
						thisMedia.cacheBase
					]);
				} else if (isAnyRootCacheBase) {
				// } else if (isAnyRootCacheBase || isSelectionCacheBase) {
					window.location.href = hashBeginning + encodeURIComponent(Options.folders_string);
				}

				return false;
			}
		);

		$("#by-date-view:not(.hidden):not(.selected)").on(
			"click",
			function changeToByDateView() {
				TopFunctions.showBrowsingModeMessage("#by-date-browsing");

				if (isSingleMedia) {
					window.location.href = hashBeginning + util.pathJoin([
						thisMedia.dayAlbumCacheBase,
						thisMedia.foldersCacheBase,
						thisMedia.cacheBase
					]);
				} else if (isAnyRootCacheBase) {
				// } else if (isAnyRootCacheBase || isSelectionCacheBase) {
					window.location.href = hashBeginning + encodeURIComponent(Options.by_date_string);
				}
				return false;
			}
		);

		$("#by-gps-view:not(.hidden):not(.selected)").on(
			"click",
			function changeToByGpsView() {
				TopFunctions.showBrowsingModeMessage("#by-gps-browsing");

				if (isSingleMedia) {
					window.location.href = hashBeginning + util.pathJoin([
						thisMedia.gpsAlbumCacheBase,
						thisMedia.foldersCacheBase,
						thisMedia.cacheBase
					]);
				} else if (isAnyRootCacheBase) {
				// } else if (isAnyRootCacheBase || isSelectionCacheBase) {
					window.location.href = hashBeginning + encodeURIComponent(Options.by_gps_string);
				}
				return false;
			}
		);

		$("#by-map-view:not(.hidden):not(.selected)").on(
			"click",
			function changeToByMapView() {
				TopFunctions.showBrowsingModeMessage("#by-map-browsing");
				if (isSingleMedia) {
					window.location.href = phFl.encodeHash(mapAlbum, thisMedia);
				} else if (isAnyRootCacheBase) {
				// } else if (isAnyRootCacheBase || isSelectionCacheBase) {
					window.location.href = phFl.encodeHash(mapAlbum, null);
				}
				return false;
			}
		);

		$("#by-search-view:not(.hidden):not(.selected)").on(
			"click",
			function changeToBySearchView() {
				TopFunctions.showBrowsingModeMessage("#by-search-browsing");
				if (isSingleMedia) {
					window.location.href = phFl.encodeHash(searchAlbum, thisMedia);
				} else if (isAnyRootCacheBase) {
					window.location.href = phFl.encodeHash(searchAlbum, null);
				}
				return false;
			}
		);

		// WARNING: the ":not(.hidden)" is missing intentionally, in order to permit to trigger a click even if the menu item isn't shown
		$("#by-selection-view:not(.selected)").on(
			"click",
			function changeToBySelectionView() {
				TopFunctions.showBrowsingModeMessage("#by-selection-browsing");
				if (isSingleMedia) {
					window.location.href = phFl.encodeHash(selectionAlbum, thisMedia);
				} else {
					window.location.href = phFl.encodeHash(selectionAlbum, null);
				}
				return false;
			}
		);

		////////////////// SEARCH //////////////////////////////

		if (isMap)
			$("ul#right-menu li.search").addClass("hidden");
		else
			$("ul#right-menu li.search").removeClass("hidden");

		if (
			thisAlbum === null ||
			$(".sub-menu:not(.hidden)").length
			// thisAlbum !== null &&
			// (util.isSearchCacheBase(thisAlbum.cacheBase) || thisAlbum.cacheBase == Options.by_search_string)
			// ||
			// $("ul#right-menu li#no-search-string").is(":visible") ||
			// $("ul#right-menu li#no-results").is(":visible") ||
			// $("ul#right-menu li#search-too-wide").is(":visible")
		) {
			$("ul#right-menu li.search ul").addClass("hidden");
		} else {
			if (isPopup)
				$("ul#right-menu li.search #search-field, ul#right-menu li.search #search-button").attr("title", util._t("#refine-popup-content"));
			else
				$("ul#right-menu li.search #search-field, ul#right-menu li.search #search-button").attr("title", util._t("#real-search"));

			$("ul#right-menu li.search ul").removeClass("hidden");
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
			if (util.isAnyRootCacheBase(Options.cache_base_to_search_in) || isPopup) {
				$("ul#right-menu li#album-search").addClass("dimmed").off("click");
			} else {
				$("ul#right-menu li#album-search").removeClass("dimmed").off("click").on('click', Functions.toggleCurrentAbumSearch);
				let albumNamePromise = Functions.getAlbumNameFromAlbumHash(Options.cache_base_to_search_in);
				albumNamePromise.then(
					function(path) {
						$("#album-search").attr('title', util._t("#current-album-is") + '"' + path + '"');
					}
				);

				if (Options.search_current_album)
					$("ul#right-menu li#album-search").addClass("selected");
				else
					$("ul#right-menu li#album-search").removeClass("selected");
			}
		}

		$("#search-field").off("focus").on(
			"focus",
			function() {
				$(".sub-menu").addClass("hidden");
				$("#right-menu li.search ul").removeClass("hidden");
				// if ($("ul", this).is(':hidden'))
				// 	$('#right-menu ul').slideUp(300);
				// $("ul", this).slideToggle(300);
			}
		);

		////////////////// UI //////////////////////////////

		$("ul#right-menu li.protection").removeClass("hidden");

		$("ul#right-menu li.ui").removeClass("hidden");

		if (isMapOrPopup) {
			$("ul#right-menu li.hide-title").addClass("hidden");
		} else {
			$("ul#right-menu li.hide-title").removeClass("hidden");
			if (Options.hide_title)
				$("ul#right-menu li.hide-title").addClass("selected");
			else
				$("ul#right-menu li.hide-title").removeClass("selected");
		}

		if (isMapOrPopup) {
			$("ul#right-menu li.hide-media-caption").addClass("hidden");
		} else {
			$("ul#right-menu li.hide-media-caption").removeClass("hidden");
			if (Options.hide_caption)
				$("ul#right-menu li.hide-media-caption").addClass("selected");
			else
				$("ul#right-menu li.hide-media-caption").removeClass("selected");
		}

		if (
			isMapOrPopup ||
			currentMedia !== null ||
			isAlbumWithOneMedia ||
			thisAlbum !== null && thisAlbum.subalbums.length === 0 && Options.hide_title
		) {
			$("ul#right-menu li.media-count").addClass("hidden");
		} else {
			$("ul#right-menu li.media-count").removeClass("hidden");
			if (Options.show_album_media_count)
				$("ul#right-menu li.media-count").addClass("selected");
			else
				$("ul#right-menu li.media-count").removeClass("selected");
		}


		if (isMap || isPopup && mapAlbum.media.length <= 1)
			$("ul#right-menu li.spaced").addClass("hidden");
		else
			$("ul#right-menu li.spaced").removeClass("hidden");
		if (Options.spacing)
			$("ul#right-menu li.spaced").addClass("selected");
		else
			$("ul#right-menu li.spaced").removeClass("selected");

		if (
			isMapOrPopup ||
			currentMedia !== null ||
			isAlbumWithOneMedia ||
			thisAlbum !== null && thisAlbum.subalbums.length === 0
		) {
			$("ul#right-menu li.square-album-thumbnails").addClass("hidden");
		} else {
			$("ul#right-menu li.square-album-thumbnails").removeClass("hidden");
			if (Options.album_thumb_type == "square")
				$("ul#right-menu li.square-album-thumbnails").addClass("selected");
			else
				$("ul#right-menu li.square-album-thumbnails").removeClass("selected");
		}

		if (
			isMapOrPopup ||
			currentMedia !== null ||
			isAlbumWithOneMedia ||
			thisAlbum !== null && thisAlbum.subalbums.length === 0
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
			isMapOrPopup ||
			currentMedia !== null ||
			isAlbumWithOneMedia ||
			thisAlbum !== null && (thisAlbum.subalbums.length === 0 || ! util.isFolderCacheBase(thisAlbum.cacheBase))
		) {
			$("ul#right-menu li.album-names").addClass("hidden");
		} else {
			$("ul#right-menu li.album-names").removeClass("hidden");
			if (Options.show_album_names_below_thumbs)
				$("ul#right-menu li.album-names").addClass("selected");
			else
				$("ul#right-menu li.album-names").removeClass("selected");
		}

		if (isMap)
			$("ul#right-menu li.square-media-thumbnails").addClass("hidden");
		else
			$("ul#right-menu li.square-media-thumbnails").removeClass("hidden");
		if (Options.media_thumb_type == "square")
		 	$("ul#right-menu li.square-media-thumbnails").addClass("selected");
		else
			$("ul#right-menu li.square-media-thumbnails").removeClass("selected");

		if (
			isMap ||
			! isMapOrPopup && (
				currentMedia !== null ||
				isAlbumWithOneMedia ||
				thisAlbum !== null && (
					util.imagesAndVideosTotal(thisAlbum.numMedia) === 0 ||
					! util.isFolderCacheBase(thisAlbum.cacheBase) && util.imagesAndVideosTotal(thisAlbum.numMedia) > Options.big_virtual_folders_threshold
				)
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
			isMapOrPopup ||
			currentMedia === null && ! isAlbumWithOneMedia
			// ||
			// thisAlbum !== null && thisAlbum.subalbums.length === 0
		) {
			$("ul#right-menu li.hide-bottom-thumbnails").addClass("hidden");
		} else {
			$("ul#right-menu li.hide-bottom-thumbnails").removeClass("hidden");

			if (Options.hide_bottom_thumbnails)
				$("ul#right-menu li.hide-bottom-thumbnails").addClass("selected");
			else
				$("ul#right-menu li.hide-bottom-thumbnails").removeClass("selected");
		}

		if (
			$("ul#right-menu li.hide-title").hasClass("hidden") &&
			$("ul#right-menu li.hide-media-caption").hasClass("hidden") &&
			$("ul#right-menu li.media-count").hasClass("hidden") &&
			$("ul#right-menu li.spaced").hasClass("hidden") &&
			$("ul#right-menu li.square-album-thumbnails").hasClass("hidden") &&
			$("ul#right-menu li.slide").hasClass("hidden") &&
			$("ul#right-menu li.album-names").hasClass("hidden") &&
			$("ul#right-menu li.square-media-thumbnails").hasClass("hidden") &&
			$("ul#right-menu li.media-names").hasClass("hidden") &&
			$("ul#right-menu li.hide-bottom-thumbnails").hasClass("hidden")
		) {
			$("ul#right-menu li.ui").addClass("hidden");
		}

		////////////////// BIG ALBUMS //////////////////////////////

		if (
			thisAlbum === null ||
			util.imagesAndVideosTotal(thisAlbum.numMedia) < Options.big_virtual_folders_threshold ||
			util.isFolderCacheBase(thisAlbum.cacheBase)
		) {
			$("ul#right-menu #show-big-albums").addClass("hidden");
		} else {
			$("ul#right-menu #show-big-albums").removeClass("hidden");
			if (Options.show_big_virtual_folders)
			 	$("ul#right-menu #show-big-albums").addClass("selected");
			else
				$("ul#right-menu #show-big-albums").removeClass("selected");
		}

		////////////////// SORT //////////////////////////////

		if (
			! isMapOrPopup && currentMedia !== null ||
			isPopup && mapAlbum.media.length <= 1
		) {
			// showing a media or a map or a popup on the map, nothing to sort
			$("#right-menu li.sort").addClass("hidden");
		} else if (thisAlbum !== null) {
			if (thisAlbum.subalbums.length <= 1 || isMapOrPopup) {
				// no subalbums or one subalbum
				$("ul#right-menu li.album-sort").addClass("hidden");
			} else {
				$("ul#right-menu li.album-sort").removeClass("hidden");
			}

			if (util.imagesAndVideosTotal(thisAlbum.numMedia) <= 1 || util.imagesAndVideosTotal(thisAlbum.numMedia) > Options.big_virtual_folders_threshold) {
				// no media or one media or too many media
				$("ul#right-menu li.media-sort").addClass("hidden");
			} else {
				$("ul#right-menu li.media-sort").removeClass("hidden");
			}

			var modes = ["album", "media"];
			for (var i in modes) {
				if (modes.hasOwnProperty(i)) {
					albumOrMedia = modes[i];
					if (thisAlbum[albumOrMedia + "NameSort"]) {
						$("ul#right-menu li." + albumOrMedia + "-sort.by-name").removeClass("active").addClass("selected");
						$("ul#right-menu li." + albumOrMedia + "-sort.by-date").addClass("active").removeClass("selected");
					} else {
						$("ul#right-menu li." + albumOrMedia + "-sort.by-date").removeClass("active").addClass("selected");
						$("ul#right-menu li." + albumOrMedia + "-sort.by-name").addClass("active").removeClass("selected");
					}

					if (
						thisAlbum[albumOrMedia + "ReverseSort"]
					) {
						$("#right-menu li." + albumOrMedia + "-sort.reverse").addClass("selected");
					} else {
						$("#right-menu li." + albumOrMedia + "-sort.reverse").removeClass("selected");
					}
				}
			}
		}

		////////////////// SELECTION //////////////////////////////

		$(".select").removeClass("hidden").removeClass("selected");
		if (! somethingIsSelected) {
			$(".select.global-reset, .select.go-to-selected").addClass("hidden");
		}

		if (isSingleMedia) {
			$(".select.albums, .select.everything, .select.everything-individual").addClass("hidden");
		} else if (! thisAlbum.media.length || ! thisAlbum.subalbums.length) {
			$(".select.media, .select.albums").addClass("hidden");
		}

		if (util.everySubalbumIsSelected(thisAlbum.subalbums)) {
			$(".select.albums").addClass("selected");
		}

		if (util.everyMediaIsSelected(thisAlbum.media)) {
			$(".select.media").addClass("selected");
		}

		if (util.everySubalbumIsSelected(thisAlbum.subalbums) && util.everyMediaIsSelected(thisAlbum.media)) {
			$(".select.everything").addClass("selected");
		}

		if (! thisAlbum.media.length || ! thisAlbum.subalbums.length) {
			$(".select.media, .select.albums").addClass("hidden");
		}

		if (! thisAlbum.subalbums.length || util.imagesAndVideosTotal(thisAlbum.numMediaInSubTree) > Options.big_virtual_folders_threshold) {
			$(".select.everything-individual").addClass("hidden");
		} else {
			let everythingIndividualPromise = util.recursivelyAllMediaAreSelected(thisAlbum);
			everythingIndividualPromise.then(
				function() {
					$(".select.everything-individual").addClass("selected");
				},
				function() {}
			);
		}


		$(".select.everything:not(.hidden)").off("click").on(
			"click",
			function() {
				if (util.everySubalbumIsSelected(thisAlbum.subalbums) && util.everyMediaIsSelected(thisAlbum.media)) {
					util.removeAllMediaFromSelection(thisAlbum.media);
					util.removeAllSubalbumsFromSelection(thisAlbum.subalbums);
					Functions.updateMenu();
				} else {
					util.addAllMediaToSelection(thisAlbum.media);
					var promise = util.addAllSubalbumsToSelection(thisAlbum.subalbums);
					promise.then(
						function() {
							Functions.updateMenu();
						}
					);
				}
			}
		);

		$(".select.everything-individual:not(.hidden)").off("click").on(
			"click",
			function() {
				let everythingIndividualPromise = util.recursivelyAllMediaAreSelected(thisAlbum);
				everythingIndividualPromise.then(
					function() {
						let firstPromise = util.recursivelyRemoveMedia(thisAlbum);
						firstPromise.then(
							function() {
								$("#removed-individually").stop().fadeIn(
									1000,
									function() {
										Functions.updateMenu();
										$("#removed-individually").stop().fadeOut(3000);
									}
								);
							}
						);
					},
					function() {
						let firstPromise = util.recursivelySelectMedia(thisAlbum);
						firstPromise.then(
							function() {
								$("#added-individually").stop().fadeIn(
									1000,
									function() {
										Functions.updateMenu();
										$("#added-individually").stop().fadeOut(3000);
									}
								);
							}
						);
					}
				);
			}
		);

		$(".select.media:not(.hidden)").off("click").on(
			"click",
			function() {
				if (util.everyMediaIsSelected(thisAlbum.media)) {
					util.removeAllMediaFromSelection(thisAlbum.media);
				} else {
					util.addAllMediaToSelection(thisAlbum.media);
				}
				Functions.updateMenu();
			}
		);

		$(".select.albums:not(.hidden)").off("click").on(
			"click",
			function() {
				if (util.everySubalbumIsSelected(thisAlbum.subalbums)) {
					util.removeAllSubalbumsFromSelection(thisAlbum.subalbums);
					Functions.updateMenu();
				} else {
					var promise = util.addAllSubalbumsToSelection(thisAlbum.subalbums);
					promise.then(
						function() {
							Functions.updateMenu();
						}
					);
				}
			}
		);

		$(".select.global-reset:not(.hidden)").on(
			"click",
			function() {
				util.removeAllMediaFromSelection(currentAlbum.media);
				util.removeAllMediaFromSelection(selectionAlbum.media);
				util.removeAllSubalbumsFromSelection(currentAlbum.subalbums);
				util.removeAllSubalbumsFromSelection(selectionAlbum.subalbums);
				Functions.updateMenu();
			}
		);

		$(".select.go-to-selected:not(.hidden)").on(
			"click",
			function() {
				$("#by-selection-view")[0].click();
			}
		);


		////////////////// DOWNLOAD //////////////////////////////

		const maximumZipSize = 2000000000;
		const bigZipSize = 500000000;

		$(".download-single-media").addClass("hidden").addClass("active");
		$(".download-album").addClass("hidden").removeClass("red");
		$("ul li.download-album").addClass("active");
		$(".download-album.sized").addClass("hidden");

		$(".download-album .sub-menu").addClass("hidden");
		if (util.isSearchCacheBase(thisAlbum.cacheBase) && ! thisAlbum.media.length && ! thisAlbum.subalbums.length) {
			// download menu item remains hidden
		} else if (currentMedia !== null || isAlbumWithOneMedia) {
			$(".download-album .sub-menu").removeClass("hidden");
			$(".download-album.expandable, .download-album.caption").removeClass("hidden");
			$(".download-single-media").removeClass("hidden");
			let trueOriginalMediaPath;
			if (isAlbumWithOneMedia)
				trueOriginalMediaPath = encodeURI(util.trueOriginalMediaPath(thisAlbum.media[0]));
			else
				trueOriginalMediaPath = encodeURI(util.trueOriginalMediaPath(currentMedia));
			$(".download-single-media .download-link").attr("href", trueOriginalMediaPath).attr("download", "");
		} else if (thisAlbum !== null) {
			$(".download-album.expandable, .download-album.caption").removeClass("hidden");

			let showDownloadEverything = false;

			if (thisAlbum.subalbums.length && ! util.isByDateCacheBase(thisAlbum.cacheBase) && ! util.isByGpsCacheBase(thisAlbum.cacheBase)) {
				$(".download-album.everything.all.full").removeClass("hidden");
				// reset the html
				$(".download-album.everything.all").html(util._t(".download-album.everything.all"));

				let nMediaInSubTree = util.imagesAndVideosTotal(thisAlbum.numMediaInSubTree);
				let numImages = thisAlbum.numMediaInSubTree.images;
				let numVideos = thisAlbum.numMediaInSubTree.videos;
				let what = util._t(".title-media");
				if (numImages === 0)
					what = util._t(".title-videos");
				if (numVideos === 0)
					what = util._t(".title-images");

				if (util.isSearchCacheBase(thisAlbum.cacheBase) && thisAlbum.subalbums.length) {
					// in search albums, numMediaInSubTree doesn't include the media in the albums found, the values that goes into the DOm must be update by code here
					for (let iSubalbum = 0; iSubalbum < thisAlbum.subalbums.length; iSubalbum ++) {
						nMediaInSubTree += util.imagesAndVideosTotal(thisAlbum.subalbums[iSubalbum].numMediaInSubTree);
					}
				}

				let treeSize = thisAlbum.sizesOfSubTree[0].images + thisAlbum.sizesOfSubTree[0].videos;
				$(".download-album.everything.all.full").append(": " + nMediaInSubTree + " " + what + ", " + Functions.humanFileSize(treeSize));
				if (treeSize < bigZipSize) {
					// maximum allowable size is 500MB (see https://github.com/eligrey/FileSaver.js/#supported-browsers)
					// actually it can be less (Chrome on Android)
					// It may happen that the files are collected but nothing is saved
					$(".download-album.everything.all.full").attr("title", "");
				} else if (treeSize < maximumZipSize) {
					$(".download-album.everything.all.full").addClass("red").attr("title", util._t("#download-difficult"));
				} else {
					$(".download-album.everything.all.full").addClass("red").removeClass("active").attr("title", util._t("#cant-download"));
				}

				if (treeSize >= bigZipSize) {
					// propose to download the resized media
					for (let i = 0; i < Options.reduced_sizes.length; i++) {
						let reducedSize = Options.reduced_sizes[i];
						treeSize = util.imagesAndVideosTotal(thisAlbum.sizesOfSubTree[reducedSize]);
						if (treeSize < bigZipSize) {
							$(".download-album.everything.all.sized").append(", " + reducedSize + " px: " + util.imagesAndVideosTotal(thisAlbum.numMediaInSubTree) + " " + what + ", " + Functions.humanFileSize(treeSize));
							$(".download-album.everything.all.sized").attr("size", reducedSize);
							$(".download-album.everything.all.sized").removeClass("hidden");
							break;
						}
					}
				}
				showDownloadEverything = true;

				// let numImages = 0;
				// let numVideos = 0;
				// for (let iMedia = 0; iMedia < thisAlbum.media.length; iMedia ++) {
				// 	if (thisAlbum.media[iMedia].mimeType.indexOf("image") === 0) {
				// 		numImages ++;
				// 	} else {
				// 		numVideos ++;
				// 	}
				// }

				let mediaInThisAlbum = util.imagesAndVideosTotal(thisAlbum.numMedia);
				let mediaInThisTree = util.imagesAndVideosTotal(thisAlbum.numMediaInSubTree);
				if (numImages && numImages !== mediaInThisAlbum && numImages !== mediaInThisTree && mediaInThisAlbum !== mediaInThisTree) {
					$(".download-album.everything.images.full").removeClass("hidden");
					// reset the html
					$(".download-album.everything.images").html(util._t(".download-album.everything.images"));

					// add the download size
					let imagesSize = thisAlbum.sizesOfSubTree[0].images;
					$(".download-album.everything.images.full").append(": " + numImages + " " + util._t(".title-images") + ", " + Functions.humanFileSize(imagesSize));
					// check the size and decide if they can be downloaded
					if (imagesSize < bigZipSize) {
						// maximum allowable size is 500MB (see https://github.com/eligrey/FileSaver.js/#supported-browsers)
						// actually it can be less (Chrome on Android)
						// It may happen that the files are collected but nothing is saved
						$(".download-album.everything.images.full").attr("title", "");
					} else if (imagesSize < maximumZipSize) {
						$(".download-album.everything.images.full").addClass("red").attr("title", util._t("#download-difficult"));
					} else {
						$(".download-album.everything.images.full").addClass("red").removeClass("active").attr("title", util._t("#cant-download"));
					}

					if (imagesSize >= bigZipSize) {
						// propose to download the resized media
						for (let i = 0; i < Options.reduced_sizes.length; i++) {
							let reducedSize = Options.reduced_sizes[i];
							if (thisAlbum.sizesOfSubTree[reducedSize].images < bigZipSize) {
								$(".download-album.everything.images.sized").append(", " + reducedSize + " px: " + numImages + " " + util._t(".title-images") + ", " + Functions.humanFileSize(thisAlbum.sizesOfSubTree[reducedSize].images));
								$(".download-album.everything.images.sized").attr("size", reducedSize);
								$(".download-album.everything.images.sized").removeClass("hidden");
								break;
							}
						}
					}
				}

				if (numVideos && numVideos !== mediaInThisAlbum && numVideos !== mediaInThisTree && mediaInThisAlbum !== mediaInThisTree) {
					$(".download-album.everything.videos.full").removeClass("hidden");
					// reset the html
					$(".download-album.everything.videos").html(util._t(".download-album.everything.videos"));

					// add the download size
					let videosSize = thisAlbum.sizesOfSubTree[0].videos;
					$(".download-album.everything.videos.full").append(": " + numVideos + " " + util._t(".title-videos") + ", " + Functions.humanFileSize(videosSize));
					// check the size and decide if they can be downloaded
					if (videosSize < bigZipSize) {
						// maximum allowable size is 500MB (see https://github.com/eligrey/FileSaver.js/#supported-browsers)
						// actually it can be less (Chrome on Android)
						// It may happen that the files are collected but nothing is saved
						$(".download-album.everything.videos.full").attr("title", "");
					} else if (videosSize < maximumZipSize) {
						$(".download-album.everything.videos.full").addClass("red").attr("title", util._t("#download-difficult"));
					} else {
						$(".download-album.everything.videos.full").addClass("red").removeClass("active").attr("title", util._t("#cant-download"));
					}

					if (videosSize >= bigZipSize) {
						// propose to download the resized video
						// in thisAlbum.sizesOfSubTree[i] all the reduced sizes have the same value, corresponding to the transcoded videos
						let reducedSize = Options.reduced_sizes[0];
						if (thisAlbum.sizesOfSubTree[reducedSize].videos < bigZipSize) {
							$(".download-album.everything.videos.sized").append(", " + util._t(".title-transcoded") + ": " + numVideos + " " + util._t(".title-videos") + ", " + Functions.humanFileSize(thisAlbum.sizesOfSubTree[reducedSize].videos));
							$(".download-album.everything.videos.sized").attr("size", reducedSize);
							$(".download-album.everything.videos.sized").removeClass("hidden");
						}
					}
				}
			}

			// let numImages = 0;
			// let numVideos = 0;
			// for (let iMedia = 0; iMedia < thisAlbum.media.length; iMedia ++) {
			// 	if (thisAlbum.media[iMedia].mimeType.indexOf("image") === 0) {
			// 		numImages ++;
			// 	} else {
			// 		numVideos ++;
			// 	}
			// }
			// TO DO: verify if it's correct to replace previous commented out code with the following 2 lines
			let numImages = thisAlbum.numMedia.images;
			let numVideos = thisAlbum.numMedia.videos;
			let what = util._t(".title-media");
			if (numImages === 0)
				what = util._t(".title-videos");
			if (numVideos === 0)
				what = util._t(".title-images");

			if (util.imagesAndVideosTotal(thisAlbum.numMedia)) {
				$(".download-album.media-only.all.full").removeClass("hidden");
				// reset the html
				if (showDownloadEverything)
					$(".download-album.media-only.all").html(util._t(".download-album.media-only.all"));
				else
					$(".download-album.media-only.all").html(util._t(".download-album.simple.all"));

				// add the download size
				let albumSize = util.imagesAndVideosTotal(thisAlbum.sizesOfAlbum[0]);
				$(".download-album.media-only.all.full").append(": " + util.imagesAndVideosTotal(thisAlbum.numMedia) + " " + what + ", " + Functions.humanFileSize(albumSize));
				// check the size and decide if they can be downloaded
				if (albumSize < bigZipSize) {
					// maximum allowable size is 500MB (see https://github.com/eligrey/FileSaver.js/#supported-browsers)
					// actually it can be less (Chrome on Android)
					// It may happen that the files are collected but nothing is saved
					$(".download-album.media-only.all.full").attr("title", "");
				} else if (albumSize < maximumZipSize) {
					$(".download-album.media-only.all.full").addClass("red").attr("title", util._t("#download-difficult"));
				} else {
					$(".download-album.media-only.all.full").addClass("red").removeClass("active").attr("title", util._t("#cant-download"));
				}

				if (albumSize >= bigZipSize) {
					// propose to download the resized media
					for (let i = 0; i < Options.reduced_sizes.length; i++) {
						let reducedSize = Options.reduced_sizes[i];
						albumSize = thisAlbum.sizesOfAlbum[reducedSize].images + thisAlbum.sizesOfAlbum[reducedSize].videos;
						if (albumSize < bigZipSize) {
							$(".download-album.media-only.all.sized").append(", " + reducedSize + " px: " + util.imagesAndVideosTotal(thisAlbum.numMedia) + " " + what + ", " + Functions.humanFileSize(albumSize));
							$(".download-album.media-only.all.sized").attr("size", reducedSize);
							$(".download-album.media-only.all.sized").removeClass("hidden");
							break;
						}
					}
				}
			}

			if (numImages && numImages !== util.imagesAndVideosTotal(thisAlbum.numMedia)) {
				$(".download-album.media-only.images.full").removeClass("hidden");
				// reset the html
				if (showDownloadEverything)
					$(".download-album.media-only.images").html(util._t(".download-album.media-only.images"));
				else
					$(".download-album.media-only.images").html(util._t(".download-album.simple.images"));

				// add the download size
				let imagesSize = thisAlbum.sizesOfAlbum[0].images;
				$(".download-album.media-only.images.full").append(": " + numImages + " " + util._t(".title-images") + ", " + Functions.humanFileSize(imagesSize));
				// check the size and decide if they can be downloaded
				if (imagesSize < bigZipSize) {
					// maximum allowable size is 500MB (see https://github.com/eligrey/FileSaver.js/#supported-browsers)
					// actually it can be less (Chrome on Android)
					// It may happen that the files are collected but nothing is saved
					$(".download-album.media-only.images.full").attr("title", "");
				} else if (imagesSize < maximumZipSize) {
					$(".download-album.media-only.images.full").addClass("red").attr("title", util._t("#download-difficult"));
				} else {
					$(".download-album.media-only.images.full").addClass("red").removeClass("active").attr("title", util._t("#cant-download"));
				}

				if (imagesSize >= bigZipSize) {
					// propose to download the resized media
					for (let i = 0; i < Options.reduced_sizes.length; i++) {
						let reducedSize = Options.reduced_sizes[i];
						if (thisAlbum.sizesOfAlbum[reducedSize].images < bigZipSize) {
							$(".download-album.media-only.images.sized").append(", " + reducedSize + " px: " + numImages + " " + util._t(".title-images") + ", " + Functions.humanFileSize(thisAlbum.sizesOfAlbum[reducedSize].images));
							$(".download-album.media-only.images.sized").attr("size", reducedSize);
							$(".download-album.media-only.images.sized").removeClass("hidden");
							break;
						}
					}
				}
			}

			if (numVideos && numVideos !== util.imagesAndVideosTotal(thisAlbum.numMedia)) {
				$(".download-album.media-only.videos.full").removeClass("hidden");
				// reset the html
				if (showDownloadEverything)
					$(".download-album.media-only.videos").html(util._t(".download-album.media-only.videos"));
				else
					$(".download-album.media-only.videos").html(util._t(".download-album.simple.videos"));

				// add the download size
				let videosSize = thisAlbum.sizesOfAlbum[0].videos;
				$(".download-album.media-only.videos.full").append(": " + numVideos + " " + util._t(".title-videos") + ", " + Functions.humanFileSize(videosSize));
				// check the size and decide if they can be downloaded
				if (videosSize < bigZipSize) {
					// maximum allowable size is 500MB (see https://github.com/eligrey/FileSaver.js/#supported-browsers)
					// actually it can be less (Chrome on Android)
					// It may happen that the files are collected but nothing is saved
					$(".download-album.media-only.videos.full").attr("title", "");
				} else if (videosSize < maximumZipSize) {
					$(".download-album.media-only.videos.full").addClass("red").attr("title", util._t("#download-difficult"));
				} else {
					$(".download-album.media-only.videos.full").addClass("red").removeClass("active").attr("title", util._t("#cant-download"));
				}

				if (videosSize >= bigZipSize) {
					// propose to download the resized media
					for (let i = 0; i < Options.reduced_sizes.length; i++) {
						let reducedSize = Options.reduced_sizes[i];
						if (thisAlbum.sizesOfAlbum[reducedSize].videos < bigZipSize) {
							$(".download-album.media-only.videos.sized").append(", " + reducedSize + " px: " + numVideos + " " + util._t(".title-videos") + ", " + Functions.humanFileSize(thisAlbum.sizesOfAlbum[reducedSize].videos));
							$(".download-album.media-only.videos.sized").attr("size", reducedSize);
							$(".download-album.media-only.videos.sized").removeClass("hidden");
							break;
						}
					}
				}
			}
		}

		////////////////// PROTECTED CONTENT //////////////////////////////

		if (thisAlbum !== null) {
			let numPasswords;
			if (util.isSearchCacheBase(thisAlbum.cacheBase))
				numPasswords = util.numPasswords(phFl.getAlbumFromCache(Options.by_search_string));
			else
				numPasswords = util.numPasswords(thisAlbum);

			if (
				numPasswords &&
				PhotoFloat.guessedPasswordCodes.length < numPasswords
			) {
				$(".protection").show();
				$("#padlock").off('click').on(
					'click',
					function() {
						$("#protected-content-unveil")[0].click();
					}
				);
			} else {
				$(".protection").hide();
			}
		} else {
			$(".protection").hide();
		}

		////////////////// ACCORDION EFFECT //////////////////////////////

		// accordion effect on right menu
		$("#right-menu li.expandable").off('click').on(
			'click',
			function() {
				$("#right-menu li ul").addClass("hidden");
				$("#right-menu li span.caption").removeClass("expanded");
				$("ul", this).removeClass("hidden");
				$("span.caption", this).addClass("expanded");
			}
		);

	};

	Functions.humanFileSize = function(size) {
		// from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
	    var i = Math.floor(Math.log(size) / Math.log(1024));
	    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
	};

	Functions.prototype.scrollToThumb = function() {
		var media, thumb;

		media = currentMedia;
		if (media === null) {
			media = previousMedia;
			if (media === null)
				return;
		}
		$("#thumbs img.thumbnail").each(function() {
			if (
				this.title === util.pathJoin([media.albumName, media.name]) && (
					util.isFolderCacheBase(currentAlbum.cacheBase) ||
					currentAlbum.cacheBase == Options.folders_string ||
					util.isByDateCacheBase(currentAlbum.cacheBase) ||
					util.isByGpsCacheBase(currentAlbum.cacheBase) ||
					util.isSearchCacheBase(currentAlbum.cacheBase) ||
					util.isSelectionCacheBase(currentAlbum.cacheBase) ||
					util.isMapCacheBase(currentAlbum.cacheBase)
				)
			) {
				thumb = $(this);
				return false;
			}
		});
		if (typeof thumb === "undefined")
			return;
		if (currentMedia !== null) {
			var scroller = $("#album-view");
			scroller.scrollLeft(thumb.parent().position().left + scroller.scrollLeft() - scroller.width() / 2 + thumb.width() / 2);
		} else
			$("html, body").scrollTop(thumb.offset().top - $(window).height() / 2 + thumb.height());

		if (currentMedia !== null) {
			$(".thumb-container").removeClass("current-thumb");
			thumb.parent().addClass("current-thumb");
		}
	};

	Functions.prototype.videoOK = function() {
		if (! Modernizr.video || ! Modernizr.video.h264)
			return false;
		else
			return true;
	};

	Functions.prototype.addVideoUnsupportedMarker = function(id) {
		if (! Modernizr.video) {
			$(".media-box#" + id + " .media-box-inner").html('<div class="video-unsupported-html5"></div>');
			return false;
		}
		else if (! Modernizr.video.h264) {
			$(".media-box#" + id + " .media-box-inner").html('<div class="video-unsupported-h264"></div>');
			return false;
		} else
			return true;
	};

	Functions.prototype.setOptions = function() {
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
		$(".thumb-and-caption-container").css("margin-right", Options.spacing.toString() + "px").css("margin-bottom", Options.spacing.toString() + "px");

		var isPopup = $('.leaflet-popup').html() ? true : false;
		if (currentMedia !== null && ! isPopup || ! Options.show_media_names_below_thumbs)
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

		if (Options.hide_caption)
			$("#caption").addClass("hidden-by-option");
		else
			$("#caption").removeClass("hidden-by-option");

		if (Options.hide_bottom_thumbnails && (currentMedia != null || util.isAlbumWithOneMedia(currentAlbum))) {
			$("#album-view").addClass("hidden-by-option");
		} else {
			$("#album-view").removeClass("hidden-by-option");
		}
	};

	Functions.prototype.pinchSwipeInitialization = function() {
		pS.initialize();
		util.setPinchButtonsPosition();
		util.correctPrevNextPosition();
		util.setSelectButtonPosition();
	};

	Functions.threeYears = function() {
		// returns the expire interval for the cookies, in seconds
		// = 1000 days, ~ 3 years
		return 1000 * 24 * 60 * 60;
	};

	Functions.getBooleanCookie = function(key) {
		var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
		if (! keyValue)
			return null;
		else if (keyValue[2] == 1)
			return true;
		else
			return false;
	};

	Functions.setBooleanCookie = function(key, value) {
		var expires = new Date();
		expires.setTime(expires.getTime() + Functions.threeYears() * 1000);
		if (value)
			value = 1;
		else
			value = 0;
		document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
		return true;
	};

	Functions.getCookie = function(key) {
		var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
		if (! keyValue)
			return null;
		else
			return keyValue[2];
	};

	Functions.getNumberCookie = function(key) {
		var keyValue = Functions.getCookie(key);
		if (keyValue === null)
			return null;
		else
			return parseFloat(keyValue);
	};

	Functions.prototype.setCookie = function(key, value) {
		var expires = new Date();
		expires.setTime(expires.getTime() + Functions.threeYears() * 1000);
		document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
		return true;
	};

	// this function refer to the need that the html showed be sorted
	Functions.needAlbumNameSort = function(thisAlbum) {
		var result =
			! thisAlbum.albumNameSort &&
			Functions.getBooleanCookie("albumNameSortRequested");
		return result;
	};

	Functions.needAlbumDateSort = function(thisAlbum) {
		var result =
			thisAlbum.albumNameSort &&
			! Functions.getBooleanCookie("albumNameSortRequested");
		return result;
	};

	Functions.needAlbumDateReverseSort = function(thisAlbum) {
		var result =
			! thisAlbum.albumNameSort &&
			thisAlbum.albumReverseSort !== Functions.getBooleanCookie("albumReverseSortRequested");
		return result;
	};

	Functions.needAlbumNameReverseSort = function(thisAlbum) {
		var result =
			thisAlbum.albumNameSort &&
			thisAlbum.albumReverseSort !== Functions.getBooleanCookie("albumReverseSortRequested");
		return result;
	};

	Functions.needMediaNameSort = function(thisAlbum) {
		var result =
			! thisAlbum.mediaNameSort &&
			Functions.getBooleanCookie("mediaNameSortRequested");
		return result;
	};

	Functions.needMediaDateSort = function(thisAlbum) {
		var result =
			thisAlbum.mediaNameSort &&
			! Functions.getBooleanCookie("mediaNameSortRequested");
		return result;
	};

	Functions.needMediaDateReverseSort = function(thisAlbum) {
		var result =
			! thisAlbum.mediaNameSort &&
			thisAlbum.mediaReverseSort !== Functions.getBooleanCookie("mediaReverseSortRequested");
		return result;
	};

	Functions.needMediaNameReverseSort = function(thisAlbum) {
		var result =
			thisAlbum.mediaNameSort &&
			thisAlbum.mediaReverseSort !== Functions.getBooleanCookie("mediaReverseSortRequested");
		return result;
	};

	Functions.getOptions = function() {
		return new Promise(
			function(resolve_getOptions, reject_getOptions) {
				if (Object.keys(Options).length > 0) {
					if (! util.isSearchHash(location.hash)) {
						// reset the return link from search
						var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(location.hash);
						Options.cache_base_to_search_in = phFl.cleanHash(albumHash);
					}
					resolve_getOptions();
				} else {
					var ajaxOptions = {
						type: "GET",
						dataType: "json",
						url: "cache/options.json",
						success: function(data) {
							// for map zoom levels, see http://wiki.openstreetmap.org/wiki/Zoom_levels

							for (var key in data)
								// if (data.hasOwnProperty(key) && key !== 'request_password_email')
								if (data.hasOwnProperty(key))
									Options[key] = data[key];
							util.translate();
							// server_cache_path actually is a constant: it cannot be passed as an option, because getOptions need to know it before reading the options
							// options.json is in this directory
							Options.server_cache_path = 'cache';

							maxSize = Options.reduced_sizes[Options.reduced_sizes.length - 1];

							// override according to user selections
							var titleCookie = Functions.getBooleanCookie("hide_title");
							if (titleCookie !== null)
								Options.hide_title = titleCookie;

							var captionCookie = Functions.getBooleanCookie("hide_caption");
							if (captionCookie !== null)
								Options.hide_caption = captionCookie;

							var bottomThumbnailsCookie = Functions.getBooleanCookie("hide_bottom_thumbnails");
							if (bottomThumbnailsCookie !== null)
								Options.hide_bottom_thumbnails = bottomThumbnailsCookie;

							var slideCookie = Functions.getBooleanCookie("albums_slide_style");
							if (slideCookie !== null)
								Options.albums_slide_style = slideCookie;

							if (Options.thumb_spacing)
								Options.spacingToggle = Options.thumb_spacing;
							else
								Options.spacingToggle = Options.media_thumb_size * 0.03;

							var spacingCookie = Functions.getNumberCookie("spacing");
							if (spacingCookie !== null) {
								Options.spacing = spacingCookie;
							} else {
								Options.spacing = Options.thumb_spacing;
							}

							var showAlbumNamesCookie = Functions.getBooleanCookie("show_album_names_below_thumbs");
							if (showAlbumNamesCookie !== null)
								Options.show_album_names_below_thumbs = showAlbumNamesCookie;

							var showMediaCountCookie = Functions.getBooleanCookie("show_album_media_count");
							if (showMediaCountCookie !== null)
								Options.show_album_media_count = showMediaCountCookie;

							var showMediaNamesCookie = Functions.getBooleanCookie("show_media_names_below_thumbs");
							if (showMediaNamesCookie !== null)
								Options.show_media_names_below_thumbs = showMediaNamesCookie;

							var squareAlbumsCookie = Functions.getCookie("album_thumb_type");
							if (squareAlbumsCookie !== null)
								Options.album_thumb_type = squareAlbumsCookie;

							var squareMediaCookie = Functions.getCookie("media_thumb_type");
							if (squareMediaCookie !== null)
								Options.media_thumb_type = squareMediaCookie;

							Options.search_inside_words = false;
							var searchInsideWordsCookie = Functions.getBooleanCookie("search_inside_words");
							if (searchInsideWordsCookie !== null)
								Options.search_inside_words = searchInsideWordsCookie;

							Options.search_any_word = false;
							var searchAnyWordCookie = Functions.getBooleanCookie("search_any_word");
							if (searchAnyWordCookie !== null)
								Options.search_any_word = searchAnyWordCookie;

							Options.search_case_sensitive = false;
							var searchCaseSensitiveCookie = Functions.getBooleanCookie("search_case_sensitive");
							if (searchCaseSensitiveCookie !== null)
								Options.search_case_sensitive = searchCaseSensitiveCookie;

							Options.search_accent_sensitive = false;
							var searchAccentSensitiveCookie = Functions.getBooleanCookie("search_accent_sensitive");
							if (searchAccentSensitiveCookie !== null)
								Options.search_accent_sensitive = searchAccentSensitiveCookie;

							Options.search_current_album = true;
							var searchCurrentAlbumCookie = Functions.getBooleanCookie("search_current_album");
							if (searchCurrentAlbumCookie !== null)
								Options.search_current_album = searchCurrentAlbumCookie;

							Options.show_big_virtual_folders = false;
							var showBigVirtualFoldersCookie = Functions.getBooleanCookie("show_big_virtual_folders");
							if (showBigVirtualFoldersCookie !== null)
								Options.show_big_virtual_folders = showBigVirtualFoldersCookie;

							// Options.search_refine = false;
							// var searchRefineCookie = Functions.getBooleanCookie("search_refine");
							// if (searchRefineCookie !== null)
							// 	Options.search_refine = searchRefineCookie;

							if (! Options.hasOwnProperty('cache_base_to_search_in') || ! Options.cache_base_to_search_in)
								Options.cache_base_to_search_in = Options.folders_string;
							if (! Options.hasOwnProperty('saved_cache_base_to_search_in') || ! Options.saved_cache_base_to_search_in)
								Options.saved_cache_base_to_search_in = Options.folders_string;

							Options.foldersStringWithTrailingSeparator = Options.folders_string + Options.cache_folder_separator;
							Options.byDateStringWithTrailingSeparator = Options.by_date_string + Options.cache_folder_separator;
							Options.byGpsStringWithTrailingSeparator = Options.by_gps_string + Options.cache_folder_separator;
							Options.bySearchStringWithTrailingSeparator = Options.by_search_string + Options.cache_folder_separator;
							Options.bySelectionStringWithTrailingSeparator = Options.by_selection_string + Options.cache_folder_separator;
							Options.byMapStringWithTrailingSeparator = Options.by_map_string + Options.cache_folder_separator;

							util.initializeMapRootAlbum();
							// WARNING: do not initialize the search root album, the app must read it from its json file!
							util.initializeSelectionRootAlbum();

							for (let i = 0; i < Options.reduced_sizes.length; i++) {
								initialSizes[Options.reduced_sizes[i]] = JSON.parse(JSON.stringify(imagesAndVideos0));
							}

							if (Options.request_password_email) {
								$("#request-password").on('click', util.showPasswordRequestForm);
								$("#password-request-form").submit(
									function() {
										let name = $("#form-name").val().trim();
										let email = $("#form-email").val().trim();
										let identity = $("#form-identity").val().trim();

										if (name && email && identity) {
											// alert(location.href.substr(0, - location.hash) + '?name=' + encodeURI($("#form-name").val()) + '&email=' + encodeURI($("#form-email").val()) + '&identity=' + encodeURI($("#form-identity").val()) + location.hash);
											var newLocation = location.href.substr(0, - location.hash) +
											 					'?url=' + encodeURIComponent(location.href) +
																'&name=' + encodeURIComponent(name) +
																'&email=' + encodeURIComponent(email) +
																'&identity=' + encodeURIComponent(identity) +
																location.hash;
											$("#auth-text").stop().fadeOut(1000);
											$("#sending-email").stop().fadeIn(1000);
											$("#sending-email").fadeOut(3000, function() {
												location.href = newLocation;
											});
										} else {
											$("#please-fill").css("display", "table");
											$("#please-fill").fadeOut(5000);
										}
										return false;
									}
								);
							} else {
								$("#request-password").hide();
							}

							resolve_getOptions();
						},
						error: function(jqXHR, textStatus, errorThrown) {
							if (errorThrown == "Not Found") {
								reject_getOptions();
							}
						}
					};
					$.ajax(ajaxOptions);
				}
			}
		);
	};

	Functions.prototype.toggleMetadataFromMouse = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			ev.stopPropagation();
			Functions.toggleMetadata();
			return false;
		}
	};

	Functions.prototype.toggleInsideWordsSearch = function() {
		Options.search_inside_words = ! Options.search_inside_words;
		Functions.setBooleanCookie("search_inside_words", Options.search_inside_words);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		util.focusSearchField();
	};

	Functions.prototype.toggleAnyWordSearch = function() {
		Options.search_any_word = ! Options.search_any_word;
		Functions.setBooleanCookie("search_any_word", Options.search_any_word);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		util.focusSearchField();
	};

	Functions.prototype.toggleCaseSensitiveSearch = function() {
		Options.search_case_sensitive = ! Options.search_case_sensitive;
		Functions.setBooleanCookie("search_case_sensitive", Options.search_case_sensitive);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		util.focusSearchField();

	};
	Functions.prototype.toggleAccentSensitiveSearch = function() {
		Options.search_accent_sensitive = ! Options.search_accent_sensitive;
		Functions.setBooleanCookie("search_accent_sensitive", Options.search_accent_sensitive);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		util.focusSearchField();
	};

	Functions.toggleCurrentAbumSearch = function() {
		Options.search_current_album = ! Options.search_current_album;
		Functions.setBooleanCookie("search_current_album", Options.search_current_album);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		util.focusSearchField();
	};

	Functions.toggleMetadata = function() {
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
	};

	Functions.prototype.toggleMenu = function() {
		$("ul#right-menu").toggleClass("expand");
		if ($("ul#right-menu").hasClass("expand")) {
			if (! $(".sub-menu:not(.hidden)").length)
				util.focusSearchField();
			Functions.updateMenu();
		}
	};

	Functions.prototype.getOptions = Functions.getOptions;
	Functions.prototype.getBooleanCookie = Functions.getBooleanCookie;
	Functions.prototype.setBooleanCookie = Functions.setBooleanCookie;
	Functions.prototype.updateMenu = Functions.updateMenu;
	Functions.prototype.focusSearchField = Functions.focusSearchField;
	Functions.prototype.toggleCurrentAbumSearch = Functions.toggleCurrentAbumSearch;
	Functions.prototype.toggleMetadata = Functions.toggleMetadata;
	Functions.prototype.humanFileSize = Functions.humanFileSize;

	window.Functions = Functions;
}());
