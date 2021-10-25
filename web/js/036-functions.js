(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var pS = new PinchSwipe();

	/* constructor */
	function Functions() {
	}

	/* Displays */

	Functions.getAlbumNameFromCacheBase = function(cacheBase) {
		return new Promise(
			function(resolve_getAlbumNameFromAlbumHash) {
				let getAlbumPromise = phFl.getAlbum(cacheBase, util.noOp, {getMedia: false, getPositions: false});
				getAlbumPromise.then(
					function(theAlbum) {
						var path;
						var splittedPath = theAlbum.path.split('/');
						if (splittedPath[0] === env.options.folders_string) {
							splittedPath[0] = "";
						} else if (splittedPath[0] === env.options.by_date_string) {
							splittedPath[0] = "(" + util._t("#by-date") + ")";
						} else if (splittedPath[0] === env.options.by_gps_string) {
							splittedPath = theAlbum.ancestorsNames;
							splittedPath[0] = "(" + util._t("#by-gps") + ")";
						} else if (splittedPath[0] === env.options.by_map_string) {
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

	Functions.hideDescriptionMenuEntry = function() {
		var isPopup = util.isPopup();
		var isMap = util.isMap();

		var popupHasSomeDescription, albumHasSomeDescription, subalbumsHaveSomeDescription, mediaHaveSomeDescription;
		if (isPopup)
			popupHasSomeDescription =
				env.mapAlbum.media.some(singleMedia => singleMedia.hasSomeDescription("title")) ||
				env.mapAlbum.media.some(singleMedia => singleMedia.hasSomeDescription("description"));
		if (env.currentAlbum !== null) {
			albumHasSomeDescription =
				env.currentAlbum.hasSomeDescription("title") ||
				env.currentAlbum.hasSomeDescription("description");
			subalbumsHaveSomeDescription =
				env.currentAlbum.subalbums.length > 0 && (
					env.currentAlbum.subalbums.some(subalbum => subalbum.hasSomeDescription("title")) ||
					env.currentAlbum.subalbums.some(subalbum => subalbum.hasSomeDescription("description"))
				);
			mediaHaveSomeDescription =
				env.currentAlbum.media.length > 0 && (
					env.currentAlbum.media.some(singleMedia => singleMedia.hasSomeDescription("title")) ||
					env.currentAlbum.media.some(singleMedia => singleMedia.hasSomeDescription("description"))
				);
		}
		var singleMediaHasSomeDescription;
		if (env.currentMedia !== null)
			singleMediaHasSomeDescription =
				env.currentMedia.hasSomeDescription("title") ||
				env.currentMedia.hasSomeDescription("description");

		return (
			isMap ||
			isPopup && ! popupHasSomeDescription ||
			env.currentMedia === null && ! albumHasSomeDescription && ! subalbumsHaveSomeDescription && ! mediaHaveSomeDescription ||
			env.currentMedia !== null && ! (singleMediaHasSomeDescription || ! env.currentMedia.hasSomeDescription("tags") && albumHasSomeDescription)
		);
	};

	Functions.hideTagsMenuEntry = function() {
		var isPopup = util.isPopup();
		var isMap = ($('#mapdiv').html() ? true : false) && ! isPopup;
		return (
			isMap ||
			isPopup && ! env.mapAlbum.media.some(singleMedia => singleMedia.hasSomeDescription("tags")) || (
				env.currentMedia === null &&
				env.currentAlbum === null || (
					! env.currentAlbum.hasSomeDescription("tags") && (
						! env.currentAlbum.subalbums.length || ! env.currentAlbum.subalbums.some(subalbum => subalbum.hasSomeDescription("tags"))
					) && (
						! env.currentAlbum.media.length || ! env.currentAlbum.media.some(singleMedia => singleMedia.hasSomeDescription("tags"))
					)
				)
			) ||
			env.currentMedia !== null && ! env.currentMedia.hasSomeDescription("tags")
		);
	};

	Functions.updateMenu = function(album) {
		var albumOrMedia;
		var isPopup = util.isPopup();
		var isMap = ($('#mapdiv').html() ? true : false) && ! isPopup;
		var isMapOrPopup = isMap || isPopup;
		var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();

		if (album === undefined)
			album = env.currentAlbum;

		if (onlyShowNonGeotaggedContent)
			thisAlbum = album.cloneAndRemoveGeotaggedContent();
		else
			thisAlbum = album;

		var isAlbumWithOneMedia = thisAlbum.isAlbumWithOneMedia();
		var isTransversalAlbum = thisAlbum.isTransversal();
		var isSingleMedia = (env.currentMedia !== null || isAlbumWithOneMedia);
		var isAnyRoot = thisAlbum.isAnyRoot();

		var nothingIsSelected = util.nothingIsSelected();
		var everySubalbumIsSelected = false;
		if (! isPopup)
			everySubalbumIsSelected = thisAlbum.everySubalbumIsSelected();
		var noSubalbumIsSelected = thisAlbum.noSubalbumIsSelected();
		var everyMediaIsSelected;
		if (isPopup)
			everyMediaIsSelected = env.mapAlbum.everyMediaIsSelected();
		else
			everyMediaIsSelected = thisAlbum.everyMediaIsSelected();
		var noMediaIsSelected;
		if (isPopup)
			noMediaIsSelected = env.mapAlbum.noMediaIsSelected();
		else
			noMediaIsSelected = thisAlbum.noMediaIsSelected();
		var highMediaNumberInTransversalAlbum = isTransversalAlbum && ! env.options.show_big_virtual_folders && thisAlbum.numsMedia.imagesAndVideosTotal() > env.options.big_virtual_folders_threshold;

		var hasGpsData, thisMedia;

		if (isSingleMedia) {
			if (env.currentMedia !== null)
				thisMedia = env.currentMedia;
			else
				thisMedia = thisAlbum.media[0];
			hasGpsData = thisMedia.hasGpsData();
		} else if (isAnyRoot) {
			hasGpsData = (thisAlbum.numPositionsInTree > 0);
		} else {
			hasGpsData = false;
		}

		// add the correct classes to the menu buttons

		////////////////// BROWSING MODES //////////////////////////////

		$(".browsing-mode-switcher").off("click");

		if (
			isMapOrPopup ||
			thisAlbum === null ||
			! isSingleMedia && ! isAnyRoot
		) {
			$(".browsing-mode-switcher").addClass("hidden");
		} else {
			$(".browsing-mode-switcher").removeClass("hidden").removeClass("selected");
			$(".first-level.browsing-mode-switcher li").addClass("active");

			if (! hasGpsData) {
				$("#by-gps-view").addClass("hidden");
			}

			if (
				nothingIsSelected || ! (
					isSingleMedia && thisMedia.isSelected() ||
					isAnyRoot
				)
			) {
				$("#by-selection-view").addClass("hidden");
			}

			if (
				! util.somethingIsInMapAlbum() || ! (
					isSingleMedia && thisMedia.isInMapAlbum() ||
					isAnyRoot
				)
			) {
				$("#by-map-view").addClass("hidden");
			}

			let [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);
			if (
				! (
					isAnyRoot && util.somethingIsSearched() ||
					isSingleMedia && (
						// util.somethingIsSearched() ||
						// collectionCacheBase && util.isSearchCacheBase(collectionCacheBase)
						thisAlbum.isSearch() ||
						thisMedia.isSearched() ||
						collectionCacheBase && util.isSearchCacheBase(collectionCacheBase) ||
						thisMedia.isInFoundAlbum() !== false
					)
				)
			) {
				$("#by-search-view").addClass("hidden");
			}

			if (thisAlbum.isFolder() && ! (collectionCacheBase && util.isSearchCacheBase(collectionCacheBase))) {
				// folder album: change to by date or by gps view
				$("#folders-view").addClass("selected").removeClass("active");
			} else if (thisAlbum.isByDate()) {
				$("#by-date-view").addClass("selected").removeClass("active");
			} else if (thisAlbum.isByGps()) {
				$("#by-gps-view").addClass("selected").removeClass("active");
			} else if (thisAlbum.isMap()) {
				$("#by-map-view").removeClass("hidden").addClass("selected").removeClass("active");
			} else if (
				thisAlbum.isSearch() ||
				collectionCacheBase && util.isSearchCacheBase(collectionCacheBase)
			) {
				$("#by-search-view").removeClass("hidden").addClass("selected").removeClass("active");
			} else if (thisAlbum.isSelection()) {
				$("#by-selection-view").removeClass("hidden").addClass("selected").removeClass("active");
			}
		}

		// bind the click events

		$("#folders-view").off("click").on(
			"click",
			function changeToFoldersView(ev) {
				ev.stopPropagation();
				util.addHighlightToItem($(this).parent().parent());
				TopFunctions.showBrowsingModeMessage(ev, "#folders-browsing");

				if (isSingleMedia) {
					$(".title").removeClass("hidden-by-pinch");
					$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
					window.location.href =
						env.hashBeginning + util.pathJoin([thisMedia.foldersCacheBase, thisMedia.cacheBase]);
				} else if (isAnyRoot) {
					window.location.href = env.hashBeginning + encodeURIComponent(env.options.folders_string);
				}

				return false;
			}
		);

		$("#by-date-view").off("click").on(
			"click",
			function changeToByDateView(ev) {
				ev.stopPropagation();
				util.addHighlightToItem($(this).parent().parent());
				TopFunctions.showBrowsingModeMessage(ev, "#by-date-browsing");

				if (isSingleMedia) {
					$(".title").removeClass("hidden-by-pinch");
					$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
					window.location.href =
						env.hashBeginning + util.pathJoin([thisMedia.dayAlbumCacheBase, thisMedia.foldersCacheBase, thisMedia.cacheBase]);
				} else if (isAnyRoot) {
					window.location.href = env.hashBeginning + encodeURIComponent(env.options.by_date_string);
				}

				return false;
			}
		);

		$("#by-gps-view").off("click").on(
			"click",
			function changeToByGpsView(ev) {
				ev.stopPropagation();
				util.addHighlightToItem($(this).parent().parent());
				TopFunctions.showBrowsingModeMessage(ev, "#by-gps-browsing");

				if (isSingleMedia) {
					$(".title").removeClass("hidden-by-pinch");
					$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
					window.location.href =
						env.hashBeginning + util.pathJoin([thisMedia.gpsAlbumCacheBase, thisMedia.foldersCacheBase, thisMedia.cacheBase]);
				} else if (isAnyRoot) {
					window.location.href = env.hashBeginning + encodeURIComponent(env.options.by_gps_string);
				}

				return false;
			}
		);

		$("#by-map-view").off("click").on(
			"click",
			function changeToByMapView(ev) {
				ev.stopPropagation();
				util.addHighlightToItem($(this).parent().parent());
				TopFunctions.showBrowsingModeMessage(ev, "#by-map-browsing");
				if (isSingleMedia) {
					$(".title").removeClass("hidden-by-pinch");
					$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
					window.location.href = phFl.encodeHash(env.mapAlbum.cacheBase, thisMedia);
				} else if (isAnyRoot) {
					window.location.href = phFl.encodeHash(env.mapAlbum.cacheBase, null);
				}

				return false;
			}
		);

		$("#by-search-view").off("click").on(
			"click",
			function changeToBySearchView(ev) {
				ev.stopPropagation();
				util.addHighlightToItem($(this).parent().parent());
				TopFunctions.showBrowsingModeMessage(ev, "#by-search-browsing");
				if (isSingleMedia) {
					$(".title").removeClass("hidden-by-pinch");
					$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
					// if (thisMedia.hasOwnProperty("searchHashes") && thisMedia.searchHashes.length)
					var foundAlbum = thisMedia.isInFoundAlbum();
					if (foundAlbum !== false) {
						window.location.href = phFl.encodeHash(thisMedia.foldersCacheBase, thisMedia, foundAlbum.cacheBase, env.searchAlbum.cacheBase);
					} else {
						window.location.href = phFl.encodeHash(env.searchAlbum.cacheBase, thisMedia);
					}
				} else if (isAnyRoot) {
					window.location.href = phFl.encodeHash(env.searchAlbum.cacheBase, null);
				}

				return false;
			}
		);

		// WARNING: the ":not(.hidden)" is missing intentionally, in order to permit to trigger a click even if the menu item isn't shown
		$("#by-selection-view").off("click").on(
			"click",
			function(ev) {
				ev.stopPropagation();
				util.addHighlightToItem($(this).parent().parent());
					util.changeToBySelectionView(ev, thisMedia);

				return false;
			}
		);

		////////////////// SEARCH //////////////////////////////

		if (isMap)
			$("ul#right-menu li.search").addClass("hidden-by-map");
		else
			$("ul#right-menu li.search").removeClass("hidden-by-map");

		if (
			thisAlbum !== null
		) {
			if (isPopup)
				$("ul#right-menu li.search #search-field, ul#right-menu li.search #search-button").attr("title", util._t("#refine-popup-content"));
			else
				$("ul#right-menu li.search #search-field, ul#right-menu li.search #search-button").attr("title", util._t("#real-search"));

			if (env.options.search_inside_words)
				$("ul#right-menu li#inside-words").addClass("selected");
			else
				$("ul#right-menu li#inside-words").removeClass("selected");
			if (env.options.search_any_word)
				$("ul#right-menu li#any-word").addClass("selected");
			else
				$("ul#right-menu li#any-word").removeClass("selected");
			if (env.options.search_case_sensitive)
				$("ul#right-menu li#case-sensitive").addClass("selected");
			else
				$("ul#right-menu li#case-sensitive").removeClass("selected");
			if (env.options.search_accent_sensitive)
				$("ul#right-menu li#accent-sensitive").addClass("selected");
			else
				$("ul#right-menu li#accent-sensitive").removeClass("selected");
			if (env.options.search_tags_only)
				$("ul#right-menu li#tags-only").addClass("selected");
			else
				$("ul#right-menu li#tags-only").removeClass("selected");
			// if (env.options.cache_base_to_search_in === env.options.folders_string || isPopup) {
				// $("ul#right-menu li#album-search").removeClass("selected").removeClass("active").off("click").attr("title", "");
			// } else {
				// $("ul#right-menu li#album-search").addClass("active").off("click").on("click", util.toggleCurrentAbumSearch);
			let albumNamePromise = Functions.getAlbumNameFromCacheBase(env.options.cache_base_to_search_in);
			albumNamePromise.then(
				function(path) {
					$("#album-search").attr('title', util._t("#current-album-is") + '"' + path + '"');
				}
			);

			if (env.options.search_current_album)
				$("ul#right-menu li#album-search").addClass("selected");
			else
				$("ul#right-menu li#album-search").removeClass("selected");
			// }
		}

		////////////////// UI //////////////////////////////

		if (isMap) {
			$("ul#right-menu li.ui").addClass("hidden");
		} else {
			$("ul#right-menu li.ui").removeClass("hidden");

			if (isMapOrPopup) {
				$("ul#right-menu li.hide-title").addClass("hidden");
			} else {
				$("ul#right-menu li.hide-title").removeClass("hidden");
				if (env.options.hide_title)
					$("ul#right-menu li.hide-title").removeClass("selected");
				else
					$("ul#right-menu li.hide-title").addClass("selected");
			}

			if (Functions.hideDescriptionMenuEntry(thisAlbum)) {
				$("ul#right-menu li.show-descriptions").addClass("hidden");
			} else {
				$("ul#right-menu li.show-descriptions").removeClass("hidden");
				if (env.options.hide_descriptions)
					$("ul#right-menu li.show-descriptions").removeClass("selected");
				else
					$("ul#right-menu li.show-descriptions").addClass("selected");
			}

			if (Functions.hideTagsMenuEntry()) {
				$("ul#right-menu li.show-tags").addClass("hidden");
			} else {
				$("ul#right-menu li.show-tags").removeClass("hidden");
				if (env.options.hide_tags)
					$("ul#right-menu li.show-tags").removeClass("selected");
				else
					$("ul#right-menu li.show-tags").addClass("selected");
			}

			if (
				isMapOrPopup ||
				env.currentMedia !== null ||
				isAlbumWithOneMedia ||
				thisAlbum !== null && thisAlbum.subalbums.length === 0 && env.options.hide_title
			) {
				$("ul#right-menu li.media-count").addClass("hidden");
			} else {
				$("ul#right-menu li.media-count").removeClass("hidden");
				if (env.options.show_album_media_count)
					$("ul#right-menu li.media-count").addClass("selected");
				else
					$("ul#right-menu li.media-count").removeClass("selected");
			}


			if (isMap || isPopup && env.mapAlbum.media.length <= 1)
				$("ul#right-menu li.spaced").addClass("hidden");
			else
				$("ul#right-menu li.spaced").removeClass("hidden");
			if (env.options.spacing)
				$("ul#right-menu li.spaced").addClass("selected");
			else
				$("ul#right-menu li.spaced").removeClass("selected");

			if (
				isMapOrPopup ||
				env.currentMedia !== null ||
				isAlbumWithOneMedia ||
				thisAlbum !== null && thisAlbum.subalbums.length === 0
			) {
				$("ul#right-menu li.square-album-thumbnails").addClass("hidden");
			} else {
				$("ul#right-menu li.square-album-thumbnails").removeClass("hidden");
				if (env.options.album_thumb_type.indexOf("square") > -1)
					$("ul#right-menu li.square-album-thumbnails").addClass("selected");
				else
					$("ul#right-menu li.square-album-thumbnails").removeClass("selected");
			}

			if (
				isMapOrPopup ||
				env.currentMedia !== null ||
				isAlbumWithOneMedia ||
				thisAlbum !== null && thisAlbum.subalbums.length === 0
			) {
				$("ul#right-menu li.slide").addClass("hidden");
			} else {
				$("ul#right-menu li.slide").removeClass("hidden");
				if (env.options.albums_slide_style)
					$("ul#right-menu li.slide").addClass("selected");
				else
					$("ul#right-menu li.slide").removeClass("selected");
			}

			if (
				isMapOrPopup ||
				env.currentMedia !== null ||
				isAlbumWithOneMedia ||
				thisAlbum !== null && (thisAlbum.subalbums.length === 0 || ! thisAlbum.isFolder())
			) {
				$("ul#right-menu li.album-names").addClass("hidden");
			} else {
				$("ul#right-menu li.album-names").removeClass("hidden");
				if (env.options.show_album_names_below_thumbs)
					$("ul#right-menu li.album-names").addClass("selected");
				else
					$("ul#right-menu li.album-names").removeClass("selected");
			}

			if (isMap)
				$("ul#right-menu li.square-media-thumbnails").addClass("hidden");
			else
				$("ul#right-menu li.square-media-thumbnails").removeClass("hidden");
			if (env.options.media_thumb_type.indexOf("square") > -1)
			 	$("ul#right-menu li.square-media-thumbnails").addClass("selected");
			else
				$("ul#right-menu li.square-media-thumbnails").removeClass("selected");

			if (
				isMap ||
				! isMapOrPopup && (
					env.currentMedia !== null ||
					isAlbumWithOneMedia ||
					thisAlbum !== null && (
						thisAlbum.numsMedia.imagesAndVideosTotal() === 0 ||
						highMediaNumberInTransversalAlbum
					)
				)
			) {
				$("ul#right-menu li.media-names").addClass("hidden");
			} else {
				$("ul#right-menu li.media-names").removeClass("hidden");
				if (env.options.show_media_names_below_thumbs)
					$("ul#right-menu li.media-names").addClass("selected");
				else
					$("ul#right-menu li.media-names").removeClass("selected");
			}

			if (
				isMapOrPopup ||
				env.currentMedia === null || isAlbumWithOneMedia
			) {
				$("ul#right-menu li.show-bottom-thumbnails").addClass("hidden");
			} else {
				$("ul#right-menu li.show-bottom-thumbnails").removeClass("hidden");

				if (env.options.hide_bottom_thumbnails)
					$("ul#right-menu li.show-bottom-thumbnails").removeClass("selected");
				else
					$("ul#right-menu li.show-bottom-thumbnails").addClass("selected");
			}

			if (
				$("ul#right-menu li.hide-title").hasClass("hidden") &&
				$("ul#right-menu li.show-descriptions").hasClass("hidden") &&
				$("ul#right-menu li.show-tags").hasClass("hidden") &&
				$("ul#right-menu li.media-count").hasClass("hidden") &&
				$("ul#right-menu li.spaced").hasClass("hidden") &&
				$("ul#right-menu li.square-album-thumbnails").hasClass("hidden") &&
				$("ul#right-menu li.slide").hasClass("hidden") &&
				$("ul#right-menu li.album-names").hasClass("hidden") &&
				$("ul#right-menu li.square-media-thumbnails").hasClass("hidden") &&
				$("ul#right-menu li.media-names").hasClass("hidden") &&
				$("ul#right-menu li.show-bottom-thumbnails").hasClass("hidden")
			) {
				$("ul#right-menu li.ui").addClass("hidden");
			}
		}

		////////////////// BIG ALBUMS //////////////////////////////

		if (
			isMapOrPopup ||
			thisAlbum === null ||
			thisAlbum.numsMedia.imagesAndVideosTotal() < env.options.big_virtual_folders_threshold ||
			! isTransversalAlbum
		) {
			$("ul#right-menu .big-albums").addClass("hidden");
		} else {
			$("ul#right-menu .big-albums").removeClass("hidden");
			if (env.options.show_big_virtual_folders)
			 	$("ul#right-menu .big-albums").addClass("selected");
			else
				$("ul#right-menu .big-albums").removeClass("selected");
		}

		////////////////// SORT //////////////////////////////

		if (
			isMap ||
			! isPopup && (env.currentMedia !== null || thisAlbum.numsMedia.imagesAndVideosTotal() <= 1 && thisAlbum.subalbums.length <= 1) ||
			isPopup && env.mapAlbum.media.length <= 1
		) {
			// showing a media or a map or a popup on the map, nothing to sort
			$("#right-menu li.sort").addClass("hidden");
		} else if (thisAlbum !== null) {
			if (thisAlbum.numsMedia.imagesAndVideosTotal() <= 1) {
				// no media or one media
				$("ul#right-menu li.media-sort").addClass("hidden");
			} else {
				$("ul#right-menu li.media-sort").removeClass("hidden");
			}

			if (thisAlbum.subalbums.length <= 1 || isMapOrPopup) {
				// no subalbums or one subalbum
				$("ul#right-menu li.album-sort").addClass("hidden");
			} else {
				$("ul#right-menu li.album-sort").removeClass("hidden");
			}

			if (
				thisAlbum.numsMedia.imagesAndVideosTotal() <= 1 && (! isPopup || env.mapAlbum.media.length <= 1) ||
				highMediaNumberInTransversalAlbum
			) {
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

		if (isMap || thisAlbum.isSearch() && ! thisAlbum.media.length && ! thisAlbum.subalbums.length) {
			$(".select").addClass("hidden");
		} else {
			$(".select").removeClass("hidden").removeClass("selected");
			if (thisAlbum.isSelection()) {
				$(".select.global-reset, .select.go-to-selected").addClass("hidden");
			} else {
				let goToSelectedText = util._t(".select.go-to-selected");
				goToSelectedText += " (";
				if (env.selectionAlbum.subalbums.length)
					goToSelectedText += env.selectionAlbum.subalbums.length + " " + util._t(".title-albums");
				if (env.selectionAlbum.subalbums.length && env.selectionAlbum.media.length)
					goToSelectedText += ", ";
				if (env.selectionAlbum.media.length)
					goToSelectedText += env.selectionAlbum.media.length + " " + util._t(".title-media");
				goToSelectedText += ")";
				$(".select.go-to-selected").html(goToSelectedText);
			}
			if (nothingIsSelected) {
				$(".select.global-reset, .select.go-to-selected").addClass("hidden");
				$(".select.nothing").addClass("hidden");
				$(".select.no-albums").addClass("hidden");
				$(".select.no-media").addClass("hidden");
			}
			if (! thisAlbum.subalbums.length || noSubalbumIsSelected || everySubalbumIsSelected || noMediaIsSelected) {
				$(".select.no-albums").addClass("hidden");
			}
			if (! thisAlbum.numsMedia.imagesAndVideosTotal() || noMediaIsSelected || everyMediaIsSelected || noSubalbumIsSelected) {
				$(".select.no-media").addClass("hidden");
			}

			if (! isPopup) {
				if (! thisAlbum.numsMedia.imagesAndVideosTotal() || ! thisAlbum.subalbums.length)
					$(".select.media, .select.albums, .select.no-media, .select.no-albums").addClass("hidden");
				if (! thisAlbum.numsMedia.imagesAndVideosTotal() && ! thisAlbum.subalbums.length)
					$(".select.everything, .select.everything-individual").addClass("hidden");
			} else if (isPopup) {
				$(".select.albums, .select.no-albums").addClass("hidden");
				$(".select.media, .select.no-media").addClass("hidden");
			}

			if (everySubalbumIsSelected) {
				$(".select.albums").addClass("selected");
			}

			if (everyMediaIsSelected) {
				$(".select.media").addClass("selected");
			}

			if ((isPopup || everySubalbumIsSelected) && everyMediaIsSelected) {
				$(".select.everything").addClass("selected");
			}

			if (highMediaNumberInTransversalAlbum) {
				$(".select.everything, .select.media").addClass("hidden");
			}

			if (! thisAlbum.subalbums.length || isPopup) {
				$(".select.everything-individual").addClass("hidden");
			} else {
				let everythingIndividualPromise = thisAlbum.recursivelyAllMediaAreSelected();
				everythingIndividualPromise.then(
					function isTrue() {
						$(".select.everything-individual").addClass("selected");
					},
					function isFalse() {
						// do nothing
					}
				);
			}


			$(".select.everything:not(.hidden)").off("click").on(
				"click",
				function() {
					util.addHighlightToItem($(this));
					var albumToUse;
					if (isPopup)
						albumToUse = env.mapAlbum;
					else
						albumToUse = thisAlbum;
					$("#working").addClass("select-everything");
					$("#working").show();
					if (albumToUse.everySubalbumIsSelected() && albumToUse.everyMediaIsSelected()) {
						albumToUse.removeAllMediaFromSelection();
						let promise = albumToUse.removeAllSubalbumsFromSelection();
						promise.then(
							function() {
								$("#working").removeClass("select-everything");
								if (! util.numClassesInWorking())
									$("#working").hide();
								if (util.nothingIsSelected())
									util.initializeSelectionAlbum();
								Functions.updateMenu();
							}
						);
					} else {
						albumToUse.addAllMediaToSelection();
						let promise = albumToUse.addAllSubalbumsToSelection();
						promise.then(
							function() {
								$("#working").removeClass("select-everything");
								if (! util.numClassesInWorking())
									$("#working").hide();
								Functions.updateMenu();
							}
						);
					}
					return false;
				}
			);

			$(".select.everything-individual:not(.hidden)").off("click").on(
				"click",
				function() {
					util.addHighlightToItem($(this));
					$("#working").addClass("select-everything-individual");
					$("#working").show();
					let everythingIndividualPromise = thisAlbum.recursivelyAllMediaAreSelected();
					everythingIndividualPromise.then(
						function isTrue() {
							let firstPromise = thisAlbum.recursivelyRemoveMedia();
							firstPromise.then(
								function() {
									$("#working").removeClass("select-everything-individual");
									if (! util.numClassesInWorking())
										$("#working").hide();
									if (util.nothingIsSelected())
										util.initializeSelectionAlbum();
									Functions.updateMenu();
									$("#removed-individually").stop().fadeIn(
										1000,
										function() {
											$("#removed-individually").stop().fadeOut(3000);
										}
									);
								}
							);
						},
						function isFalse() {
							let firstPromise = thisAlbum.recursivelySelectMedia();
							firstPromise.then(
								function() {
									$("#working").removeClass("select-everything-individual");
									if (! util.numClassesInWorking())
										$("#working").hide();
									$("#added-individually").stop().fadeIn(
										1000,
										function() {
											if (thisAlbum.isSelection())
												env.currentAlbum.showThumbs();
											Functions.updateMenu();
											$("#added-individually").stop().fadeOut(3000);
										}
									);
								}
							);
						}
					);
					return false;
				}
			);

			$(".select.media:not(.hidden)").off("click").on(
				"click",
				function() {
					util.addHighlightToItem($(this));
					var albumToUse;
					if (isPopup)
						albumToUse = env.mapAlbum;
					else
						albumToUse = thisAlbum;
					if (albumToUse.everyMediaIsSelected()) {
						albumToUse.removeAllMediaFromSelection();
						if (util.nothingIsSelected())
							util.initializeSelectionAlbum();
					} else {
						albumToUse.addAllMediaToSelection();
					}
					Functions.updateMenu();
					return false;
				}
			);

			$(".select.albums:not(.hidden)").off("click").on(
				"click",
				function() {
					util.addHighlightToItem($(this));
					$("#working").addClass("select-albums");
					$("#working").show();
					if (thisAlbum.everySubalbumIsSelected()) {
						let promise = thisAlbum.removeAllSubalbumsFromSelection();
						promise.then(
							function() {
								$("#working").removeClass("select-albums");
								if (! util.numClassesInWorking())
									$("#working").hide();
								if (util.nothingIsSelected())
									util.initializeSelectionAlbum();
								Functions.updateMenu();
							}
						);
					} else {
						var promise = thisAlbum.addAllSubalbumsToSelection();
						promise.then(
							function() {
								$("#working").removeClass("select-albums");
								if (! util.numClassesInWorking())
									$("#working").hide();
								Functions.updateMenu();
							}
						);
					}
					return false;
				}
			);

			$(".select.global-reset:not(.hidden)").off("click").on(
				"click",
				function() {
					util.addHighlightToItem($(this));
					$("#working").addClass("select-global-reset");
					$("#working").show();
					env.selectionAlbum.removeAllMediaFromSelection();
					let subalbumsPromise = env.selectionAlbum.removeAllSubalbumsFromSelection();
					subalbumsPromise.then(
						function allSubalbumsRemoved() {
							$("#working").removeClass("select-global-reset");
							if (! util.numClassesInWorking())
								$("#working").hide();
							if (util.nothingIsSelected())
								util.initializeSelectionAlbum();
							Functions.updateMenu();
						}
					);
					return false;
				}
			);

			$(".select.nothing:not(.hidden)").off("click").on(
				"click",
				function() {
					util.addHighlightToItem($(this));
					$("#working").addClass("select-nothing");
						$("#working").show();
					var albumToUse;
					if (isPopup)
						albumToUse = env.mapAlbum;
					else
						albumToUse = thisAlbum;
					albumToUse.removeAllMediaFromSelection();
					let subalbumsPromise = albumToUse.removeAllSubalbumsFromSelection();
					subalbumsPromise.then(
						function allSubalbumsRemoved() {
							$("#working").removeClass("select-nothing");
							if (! util.numClassesInWorking())
								$("#working").hide();
							if (util.nothingIsSelected())
								util.initializeSelectionAlbum();
							Functions.updateMenu();
						}
					);
					return false;
				}
			);

			$(".select.no-albums:not(.hidden)").off("click").on(
				"click",
				function() {
					util.addHighlightToItem($(this));
					$("#working").addClass("select-no-albums");
					$("#working").show();
					let subalbumsPromise = thisAlbum.removeAllSubalbumsFromSelection();
					subalbumsPromise.then(
						function allSubalbumsRemoved() {
							$("#working").removeClass("select-no-albums");
							if (! util.numClassesInWorking())
								$("#working").hide();
							if (util.nothingIsSelected())
								util.initializeSelectionAlbum();
							Functions.updateMenu();
						}
					);
					return false;
				}
			);

			$(".select.no-media:not(.hidden)").off("click").on(
				"click",
				function() {
					util.addHighlightToItem($(this));
					var albumToUse;
					if (isPopup)
						albumToUse = env.mapAlbum;
					else
						albumToUse = thisAlbum;

					albumToUse.removeAllMediaFromSelection();

					return false;
				}
			);

			$(".select.go-to-selected:not(.hidden)").off("click").on(
				"click",
				function(ev) {
					util.addHighlightToItem($(this));
					util.changeToBySelectionView(ev);
					return false;
				}
			);
		}


		////////////////// DOWNLOAD //////////////////////////////

		if (isMap) {
			$(".download-album").addClass("hidden");
		} else {
			$(".download-album").removeClass("hidden");
			const maximumZipSize = 2000000000;
			const bigZipSize = 500000000;

			$(".download-single-media").addClass("hidden").addClass("active");
			$(".download-album").addClass("hidden").removeClass("red");
			$("ul li.download-album:not(.selection)").addClass("active");
			$(".download-album.sized").addClass("hidden");

			if (env.selectionAlbum.numsMediaInSubTree.imagesAndVideosTotal()) {
				$(".download-album.selection").removeClass("hidden");
				$(".download-album.selection").attr("title", util._t("#how-to-download-selection").replace(/<br \/>/gm, ' '));
			}

			if (thisAlbum.isSearch() && ! thisAlbum.media.length && ! thisAlbum.subalbums.length) {
				// download menu item remains hidden
			} else if (env.currentMedia !== null || isAlbumWithOneMedia) {
				$(".download-album.expandable, .download-album.caption").removeClass("hidden");
				$(".download-single-media").removeClass("hidden");
				let trueOriginalMediaPath;
				if (isAlbumWithOneMedia)
					trueOriginalMediaPath = encodeURI(thisAlbum.media[0].trueOriginalMediaPath());
				else
					trueOriginalMediaPath = encodeURI(env.currentMedia.trueOriginalMediaPath());
				$(".download-single-media .download-link").attr("href", trueOriginalMediaPath).attr("download", "");
			} else if (thisAlbum !== null) {
				$(".download-album.expandable, .download-album.caption").removeClass("hidden");

				let showDownloadEverything = false;

				let albumForDownload = thisAlbum;
				if (isPopup)
					albumForDownload = env.mapAlbum;

				if (albumForDownload.subalbums.length) {
					$(".download-album.everything.all.full").removeClass("hidden");
					// reset the html
					$(".download-album.everything.all").html(util._t(".download-album.everything.all"));

					let nMediaInSubTree = albumForDownload.numsMediaInSubTree.imagesAndVideosTotal();
					let numImages = albumForDownload.numsMediaInSubTree.images;
					let numVideos = albumForDownload.numsMediaInSubTree.videos;
					let what = util._t(".title-media");
					if (numImages === 0)
						what = util._t(".title-videos");
					if (numVideos === 0)
						what = util._t(".title-images");

					if (albumForDownload.isSearch() && albumForDownload.subalbums.length) {
						// in search albums, numsMediaInSubTree doesn't include the media in the albums found, the values that goes into the DOm must be update by code here
						for (let iSubalbum = 0; iSubalbum < albumForDownload.subalbums.length; iSubalbum ++) {
							nMediaInSubTree += albumForDownload.subalbums[iSubalbum].numsMediaInSubTree.imagesAndVideosTotal();
						}
					}

					let treeSize = albumForDownload.sizesOfSubTree[0].images + albumForDownload.sizesOfSubTree[0].videos;
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

					if (treeSize >= bigZipSize && env.options.reduced_sizes.length) {
						// propose to download the resized media
						for (let iSize = 0; iSize < env.options.reduced_sizes.length; iSize++) {
							let reducedSize = env.options.reduced_sizes[iSize];
							treeSize = albumForDownload.sizesOfSubTree[reducedSize].imagesAndVideosTotal();
							if (treeSize < bigZipSize) {
								$(".download-album.everything.all.sized").append(
									", " + reducedSize + " px: " +
									albumForDownload.numsMediaInSubTree.imagesAndVideosTotal() + " " + what + ", " + Functions.humanFileSize(treeSize)
								);
								$(".download-album.everything.all.sized").attr("size", reducedSize);
								$(".download-album.everything.all.sized").removeClass("hidden");
								break;
							}
						}
					}
					showDownloadEverything = true;

					let mediaInThisAlbum = albumForDownload.numsMedia.imagesAndVideosTotal();
					let mediaInThisTree = albumForDownload.numsMediaInSubTree.imagesAndVideosTotal();
					if (numImages && numImages !== mediaInThisAlbum && numImages !== mediaInThisTree && mediaInThisAlbum !== mediaInThisTree) {
						$(".download-album.everything.images.full").removeClass("hidden");
						// reset the html
						$(".download-album.everything.images").html(util._t(".download-album.everything.images"));

						// add the download size
						let imagesSize = albumForDownload.sizesOfSubTree[0].images;
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

						if (imagesSize >= bigZipSize && env.options.reduced_sizes.length) {
							// propose to download the resized media
							for (let iSize = 0; iSize < env.options.reduced_sizes.length; iSize++) {
								let reducedSize = env.options.reduced_sizes[iSize];
								if (albumForDownload.sizesOfSubTree[reducedSize].images < bigZipSize) {
									$(".download-album.everything.images.sized").append(
										", " + reducedSize + " px: " +
										numImages + " " + util._t(".title-images") + ", " + Functions.humanFileSize(albumForDownload.sizesOfSubTree[reducedSize].images)
									);
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
						let videosSize = albumForDownload.sizesOfSubTree[0].videos;
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

						if (videosSize >= bigZipSize && env.options.reduced_sizes.length) {
							// propose to download the resized video
							// in albumForDownload.sizesOfSubTree[iSize] all the reduced sizes have the same value, corresponding to the transcoded videos
							let reducedSize = env.options.reduced_sizes[0];
							if (albumForDownload.sizesOfSubTree[reducedSize].videos < bigZipSize) {
								$(".download-album.everything.videos.sized").append(
									", " + util._t(".title-transcoded") + ": " +
									numVideos + " " + util._t(".title-videos") + ", " + Functions.humanFileSize(albumForDownload.sizesOfSubTree[reducedSize].videos)
								);
								// $(".download-album.everything.videos.sized").attr("size", reducedSize);
								$(".download-album.everything.videos.sized").removeClass("hidden");
							}
						}
					}
				}

				// let numImages = 0;
				// let numVideos = 0;
				// for (let iMedia = 0; iMedia < albumForDownload.numsMedia.imagesAndVideosTotal(); iMedia ++) {
				// 	if (albumForDownload.media[iMedia].isImage()) {
				// 		numImages ++;
				// 	} else {
				// 		numVideos ++;
				// 	}
				// }
				// TO DO: verify if it's correct to replace previous commented out code with the following 2 lines
				let numImages = albumForDownload.numsMedia.images;
				let numVideos = albumForDownload.numsMedia.videos;
				let what = util._t(".title-media");
				if (numImages === 0)
					what = util._t(".title-videos");
				if (numVideos === 0)
					what = util._t(".title-images");

				if (albumForDownload.numsMedia.imagesAndVideosTotal()) {
					$(".download-album.media-only.all.full").removeClass("hidden");
					// reset the html
					if (showDownloadEverything)
						$(".download-album.media-only.all").html(util._t(".download-album.media-only.all"));
					else
						$(".download-album.media-only.all").html(util._t(".download-album.simple.all"));

					// add the download size
					let albumSize = albumForDownload.sizesOfAlbum[0].imagesAndVideosTotal();
					$(".download-album.media-only.all.full").append(": " + albumForDownload.numsMedia.imagesAndVideosTotal() + " " + what + ", " + Functions.humanFileSize(albumSize));
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

					if (albumSize >= bigZipSize && env.options.reduced_sizes.length) {
						// propose to download the resized media
						for (let iSize = 0; iSize < env.options.reduced_sizes.length; iSize++) {
							let reducedSize = env.options.reduced_sizes[iSize];
							albumSize = albumForDownload.sizesOfAlbum[reducedSize].images + albumForDownload.sizesOfAlbum[reducedSize].videos;
							if (albumSize < bigZipSize) {
								$(".download-album.media-only.all.sized").append(
									", " + reducedSize + " px: " +
									albumForDownload.numsMedia.imagesAndVideosTotal() + " " + what + ", " + Functions.humanFileSize(albumSize)
								);
								$(".download-album.media-only.all.sized").attr("size", reducedSize);
								$(".download-album.media-only.all.sized").removeClass("hidden");
								break;
							}
						}
					}
				}

				if (numImages && numImages !== albumForDownload.numsMedia.imagesAndVideosTotal()) {
					$(".download-album.media-only.images.full").removeClass("hidden");
					// reset the html
					if (showDownloadEverything)
						$(".download-album.media-only.images").html(util._t(".download-album.media-only.images"));
					else
						$(".download-album.media-only.images").html(util._t(".download-album.simple.images"));

					// add the download size
					let imagesSize = albumForDownload.sizesOfAlbum[0].images;
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

					if (imagesSize >= bigZipSize && env.options.reduced_sizes.length) {
						// propose to download the resized media
						for (let iSize = 0; iSize < env.options.reduced_sizes.length; iSize++) {
							let reducedSize = env.options.reduced_sizes[iSize];
							if (albumForDownload.sizesOfAlbum[reducedSize].images < bigZipSize) {
								$(".download-album.media-only.images.sized").append(
									", " + reducedSize + " px: " +
									numImages + " " + util._t(".title-images") + ", " + Functions.humanFileSize(albumForDownload.sizesOfAlbum[reducedSize].images)
								);
								$(".download-album.media-only.images.sized").attr("size", reducedSize);
								$(".download-album.media-only.images.sized").removeClass("hidden");
								break;
							}
						}
					}
				}

				if (numVideos && numVideos !== albumForDownload.numsMedia.imagesAndVideosTotal()) {
					$(".download-album.media-only.videos.full").removeClass("hidden");
					// reset the html
					if (showDownloadEverything)
						$(".download-album.media-only.videos").html(util._t(".download-album.media-only.videos"));
					else
						$(".download-album.media-only.videos").html(util._t(".download-album.simple.videos"));

					// add the download size
					let videosSize = albumForDownload.sizesOfAlbum[0].videos;
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

					if (videosSize >= bigZipSize && env.options.reduced_sizes.length) {
						// propose to download the resized video
						// in albumForDownload.sizesOfSubTree[iSize] all the reduced sizes have the same value, corresponding to the transcoded videos
						let reducedSize = env.options.reduced_sizes[0];
						if (albumForDownload.sizesOfSubTree[reducedSize].videos < bigZipSize) {
							$(".download-album.media-only.videos.sized").append(
								", " + util._t(".title-transcoded") + ": " +
								numVideos + " " + util._t(".title-videos") + ", " + Functions.humanFileSize(albumForDownload.sizesOfSubTree[reducedSize].videos)
							);
							// $(".download-album.everything.videos.sized").attr("size", reducedSize);
							$(".download-album.media-only.videos.sized").removeClass("hidden");
						}
					}
				}
			}
		}

		////////////////// NON-GEOTAGGED ONLY MODE //////////////////////////////

		// WARNING: album is used here because the album with geotagged content is needed here
		var mediaCount = album.numsMediaInSubTree.imagesAndVideosTotal();
		var nonGeotaggedMediaCount = album.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal();
		if (
			isMap || isPopup ||
			! nonGeotaggedMediaCount || nonGeotaggedMediaCount === mediaCount
		) {
			$(".non-geotagged-only").addClass("hidden");
		} else {
			$(".non-geotagged-only").removeClass("hidden");
			if (onlyShowNonGeotaggedContent)
				$("#hide-geotagged-media").addClass("selected");
			else
				$("#hide-geotagged-media").removeClass("selected");
		}

		$("#hide-geotagged-media").off("click").on(
			"click",
			function() {
				// css manages the showing/hiding of media/subalbums, the title change and the subalbums caption change
				// this function performs additional operation about highlighting the correct object and showing the correct image in subalbums

				// toggle the class that hides/shows/changes
				$("#fullscreen-wrapper").toggleClass("hide-geotagged");
				var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();

				// highlight the menu item
				util.addHighlightToItem($(this).parent());
				Functions.updateMenu();

				util.addClickToHiddenGeotaggedMediaPhrase();


				let currentObject = util.highlightedObject();
				let currentObjectIsASubalbums = util.aSubalbumIsHighlighted();
				let newObject = currentObject;
				if (onlyShowNonGeotaggedContent) {
					// correct subalbum or media highlighting
					if (
						currentObjectIsASubalbums && currentObject.parent().hasClass("all-gps") ||
						! currentObjectIsASubalbums && currentObject.parent().hasClass("gps")
					) {
						newObject = util.nextObjectForHighlighting(currentObject);
						util.addHighlight(newObject);
						if (
							currentObjectIsASubalbums && ! util.aSubalbumIsHighlighted() ||
							! currentObjectIsASubalbums && util.aSubalbumIsHighlighted()
						) {
							newObject = util.prevObjectForHighlighting(newObject);
							util.addHighlight(newObject);
						}
					}
				}
				if (currentObjectIsASubalbums)
					util.scrollToHighlightedSubalbum(newObject);
				else
					util.scrollAlbumViewToHighlightedThumb(newObject);

				// adapt subalbums and media caption height
				util.adaptSubalbumCaptionHeight();
				util.adaptMediaCaptionHeight();

				if (onlyShowNonGeotaggedContent) {
					// check and possibly correct the subalbum image
					$("#subalbums > a:not(.all-gps) img.thumbnail").each(
						function() {
							var [randomMedia, randomMediaAlbumCacheBase] = util.getMediaFromImgObject($(this));
							if (! randomMedia.hasGpsData()) {
								return;
							} else  {
								let iSubalbum = env.currentAlbum.subalbums.findIndex(subalbum => randomMediaAlbumCacheBase.indexOf(subalbum.cacheBase) === 0);
								env.currentAlbum.pickRandomMediaAndInsertIt(iSubalbum, onlyShowNonGeotaggedContent);
							}
						}
					)
				}
			}
		);

		////////////////// PROTECTED CONTENT //////////////////////////////

		let selectors = "#padlock, .first-level.protection";
		if (thisAlbum !== null) {
			if (thisAlbum.hasVeiledProtectedContent()) {
				$(selectors).removeClass("hidden");
				$(selectors).off("click").on(
					"click",
					function() {
						$("#protected-content-unveil")[0].click();
						util.closeMenu();
					}
				);
			} else {
				$(selectors).addClass("hidden");
			}
		} else {
			$(selectors).addClass("hidden");
		}

		////////////////// be sure that the highlighted menu entry is visible //////////////////////////////

		if ($(".first-level ul li.highlighted.hidden").length) {
			// the highlingting is inside a closed first-level menu entry, move it to the parent
			$(".first-level ul li.highlighted").parent().parent().addClass("highlighted");
			$(".first-level ul li.highlighted").removeClass("highlighted");
		}

		////////////////// ACCORDION EFFECT //////////////////////////////

		// accordion effect on right menu
		$("#right-menu li.expandable").off("click").on(
			"click",
			function() {
				util.addHighlightToItem($(this));
				var wasExpanded = $(this).hasClass("expanded");
				$("#right-menu li.expandable").removeClass("expanded");
				$("#right-menu li.first-level ul").addClass("hidden");
				if (! wasExpanded) {
					$("ul", this).removeClass("hidden");
					$(this).addClass("expanded");
				} else if ($(".first-level ul li.highlighted.hidden").length) {
					// the highlingting is inside a closed first-level menu entry, move it to the parent
					$(".first-level ul li.highlighted").parent().parent().addClass("highlighted");
					$(".first-level ul li.highlighted").removeClass("highlighted");
				}
			}
		);
	};

	Functions.humanFileSize = function(size) {
		// from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
	    var i = Math.floor(Math.log(size) / Math.log(1024));
	    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
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
		$("body").css("background-color", env.options.background_color);

		util.setTitleOptions();
		util.setMediaOptions();
		util.setSubalbumsOptions();
		util.setDescriptionOptions();
		util.correctElementPositions();
	};

	Functions.pinchSwipeInitialization = function() {
		pS.initialize();
	};

	Functions.tenYears = function() {
		// returns the expire interval for the cookies, in seconds
		return 10 * 365 * 24 * 60 * 60;
	};

	Functions.getBooleanCookie = function(key) {
		var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
		if (! keyValue)
			return null;
		else if (keyValue[2] === "1")
			return true;
		else
			return false;
	};

	Functions.setBooleanCookie = function(key, value) {
		if (value)
			value = 1;
		else
			value = 0;
		Functions.setCookie(key, value);
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

	Functions.setCookie = function(key, value) {
		var expires = new Date();
		expires.setTime(expires.getTime() + Functions.tenYears() * 1000);
		document.cookie = key + '=' + value + ';expires=' + expires.toUTCString() + ';samesite=lax';
		return true;
	};

	Album.prototype.isUndefinedOrFalse = function(property) {
		return ! this.hasOwnProperty(property) || ! this[property];
	};

	Album.prototype.isUndefinedOrTrue = function(property) {
		return ! this.hasOwnProperty(property) || this[property];
	};


	// this function refer to the need that the html showed be sorted
	Album.prototype.needAlbumNameSort = function() {
		return this.isUndefinedOrFalse("albumNameSort") && env.albumNameSort;
	};

	Album.prototype.needAlbumDateSort = function() {
		return this.isUndefinedOrTrue("albumNameSort") && ! env.albumNameSort;
	};

	Album.prototype.needAlbumDateReverseSort = function() {
		return this.needAlbumDateSort && (
			this.isUndefinedOrTrue("albumReverseSort") && ! env.albumReverseSort ||
			this.isUndefinedOrFalse("albumReverseSort") && env.albumReverseSort
		);
	};

	Album.prototype.needAlbumNameReverseSort = function() {
		return this.needAlbumNameSort() && (
			this.isUndefinedOrTrue("albumReverseSort") && ! env.albumReverseSort ||
			this.isUndefinedOrFalse("albumReverseSort") && env.albumReverseSort
		);
	};

	Album.prototype.needMediaNameSort = function() {
		return this.isUndefinedOrFalse("mediaNameSort") && env.mediaNameSort;
	};

	Album.prototype.needMediaDateSort = function() {
		return this.isUndefinedOrTrue("mediaNameSort") && ! env.mediaNameSort;
	};

	Album.prototype.needMediaDateReverseSort = function() {
		return this.needMediaDateSort && (
			this.isUndefinedOrTrue("mediaReverseSort") && ! env.mediaReverseSort ||
			this.isUndefinedOrFalse("mediaReverseSort") && env.mediaReverseSort
		);
	};

	Album.prototype.needMediaNameReverseSort = function() {
		return this.needMediaNameSort() && (
			this.isUndefinedOrTrue("mediaReverseSort") && ! env.mediaReverseSort ||
			this.isUndefinedOrFalse("mediaReverseSort") && env.mediaReverseSort
		);
	};

	Functions.prototype.getOptions = function(forceReload = false) {
		return new Promise(
			function(resolve_getOptions, reject_getOptions) {
				if (Object.keys(env.options).length > 0 && ! forceReload) {
					if (! util.isSearchHash()) {
						// reset the return link from search
						var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);
						env.options.cache_base_to_search_in = phFl.convertHashToCacheBase(albumCacheBase);
					}
					resolve_getOptions();
				} else {
					var ajaxOptions = {
						type: "GET",
						dataType: "json",
						url: "cache/options.json",
						success: function(data) {
							// for map zoom levels, see http://wiki.openstreetmap.org/wiki/Zoom_levels

							var uiKeys = [
								'hide_title',
								'show_album_media_count',
								'albums_slide_style',
								'album_thumb_type',
								'show_album_names_below_thumbs',
								'media_thumb_type',
								'show_media_names_below_thumbs',
								'hide_descriptions',
								'hide_tags',
								'thumb_spacing',
								'hide_bottom_thumbnails'
							];

							for (var key in data)
								if (data.hasOwnProperty(key) && (! forceReload || uiKeys.indexOf(key) !== -1))
									env.options[key] = data[key];

							if (forceReload) {
								Functions.setBooleanCookie("hideTitle", env.options.hide_title);
								Functions.setBooleanCookie("showAlbumMediaCount", env.options.show_album_media_count);
								Functions.setBooleanCookie("albumsSlideStyle", env.options.albums_slide_style);
								Functions.setCookie("albumThumbType", env.options.album_thumb_type);
								Functions.setBooleanCookie("showAlbumNamesBelowThumbs", env.options.show_album_names_below_thumbs);
								Functions.setCookie("mediaThumbType", env.options.media_thumb_type);
								Functions.setBooleanCookie("showMediaNamesBelowThumbs", env.options.show_media_names_below_thumbs);
								Functions.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);
								Functions.setBooleanCookie("hideTags", env.options.hide_tags);

								if (env.options.thumb_spacing)
									env.options.spacingSavedValue = env.options.thumb_spacing;
								else
									env.options.spacingSavedValue = env.options.media_thumb_size * 0.03;
								env.options.spacing = env.options.thumb_spacing;
								Functions.setCookie("spacing", env.options.spacing);

								Functions.setBooleanCookie("hideBottomThumbnails", env.options.hide_bottom_thumbnails);
							} else {
								util.translate();
								// server_cache_path actually is a constant: it cannot be passed as an option, because getOptions need to know it before reading the options
								// options.json is in this directory
								env.server_cache_path = 'cache';

								env.maxSize = env.options.reduced_sizes[env.options.reduced_sizes.length - 1];

								// override according to user selections

								var albumNameSortCookie = Functions.getBooleanCookie("albumNameSortRequested");
								env.albumNameSort = env.options.default_album_name_sort;
								if (albumNameSortCookie !== null)
									env.albumNameSort = albumNameSortCookie;

								var albumReverseSortCookie = Functions.getBooleanCookie("albumReverseSortRequested");
								env.albumReverseSort = env.options.default_album_reverse_sort;
								if (albumReverseSortCookie !== null)
									env.albumReverseSort = albumReverseSortCookie;

								var mediaNameSortCookie = Functions.getBooleanCookie("mediaNameSortRequested");
								env.mediaNameSort = env.options.default_media_name_sort;
								if (mediaNameSortCookie !== null)
									env.mediaNameSort = mediaNameSortCookie;

								var mediaReverseSortCookie = Functions.getBooleanCookie("mediaReverseSortRequested");
								env.mediaReverseSort = env.options.default_media_reverse_sort;
								if (mediaReverseSortCookie !== null)
									env.mediaReverseSort = mediaReverseSortCookie;

								var titleCookie = Functions.getBooleanCookie("hideTitle");
								if (titleCookie !== null)
									env.options.hide_title = titleCookie;

								var descriptionsCookie = Functions.getBooleanCookie("hideDescriptions");
								if (descriptionsCookie !== null)
									env.options.hide_descriptions = descriptionsCookie;

								var tagsCookie = Functions.getBooleanCookie("hideTags");
								if (tagsCookie !== null)
									env.options.hide_tags = tagsCookie;

								var bottomThumbnailsCookie = Functions.getBooleanCookie("hideBottomThumbnails");
								if (bottomThumbnailsCookie !== null)
									env.options.hide_bottom_thumbnails = bottomThumbnailsCookie;

								var slideCookie = Functions.getBooleanCookie("albumsSlideStyle");
								if (slideCookie !== null)
									env.options.albums_slide_style = slideCookie;

								if (env.options.thumb_spacing)
									env.options.spacingSavedValue = env.options.thumb_spacing;
								else
									env.options.spacingSavedValue = env.options.media_thumb_size * 0.03;

								var spacingCookie = Functions.getNumberCookie("spacing");
								if (spacingCookie !== null) {
									env.options.spacing = spacingCookie;
								} else {
									env.options.spacing = env.options.thumb_spacing;
								}

								var showAlbumNamesCookie = Functions.getBooleanCookie("showAlbumNamesBelowThumbs");
								if (showAlbumNamesCookie !== null)
									env.options.show_album_names_below_thumbs = showAlbumNamesCookie;

								var showMediaCountCookie = Functions.getBooleanCookie("showAlbumMediaCount");
								if (showMediaCountCookie !== null)
									env.options.show_album_media_count = showMediaCountCookie;

								var showMediaNamesCookie = Functions.getBooleanCookie("showMediaNamesBelowThumbs");
								if (showMediaNamesCookie !== null)
									env.options.show_media_names_below_thumbs = showMediaNamesCookie;

								var squareAlbumsCookie = Functions.getCookie("albumThumbType");
								if (squareAlbumsCookie !== null)
									env.options.album_thumb_type = squareAlbumsCookie;

								var squareMediaCookie = Functions.getCookie("mediaThumbType");
								if (squareMediaCookie !== null)
									env.options.media_thumb_type = squareMediaCookie;

								env.options.search_inside_words = false;
								var searchInsideWordsCookie = Functions.getBooleanCookie("searchInsideWords");
								if (searchInsideWordsCookie !== null)
									env.options.search_inside_words = searchInsideWordsCookie;

								env.options.search_any_word = false;
								var searchAnyWordCookie = Functions.getBooleanCookie("searchAnyWord");
								if (searchAnyWordCookie !== null)
									env.options.search_any_word = searchAnyWordCookie;

								env.options.search_case_sensitive = false;
								var searchCaseSensitiveCookie = Functions.getBooleanCookie("searchCaseSensitive");
								if (searchCaseSensitiveCookie !== null)
									env.options.search_case_sensitive = searchCaseSensitiveCookie;

								env.options.search_accent_sensitive = false;
								var searchAccentSensitiveCookie = Functions.getBooleanCookie("searchAccentSensitive");
								if (searchAccentSensitiveCookie !== null)
									env.options.search_accent_sensitive = searchAccentSensitiveCookie;

								env.options.search_tags_only = false;
								var searchTagsOnlyCookie = Functions.getBooleanCookie("searchTagsOnly");
								if (searchTagsOnlyCookie !== null)
									env.options.search_tags_only = searchTagsOnlyCookie;

								env.options.search_current_album = true;
								var searchCurrentAlbumCookie = Functions.getBooleanCookie("searchCurrentAlbum");
								if (searchCurrentAlbumCookie !== null)
									env.options.search_current_album = searchCurrentAlbumCookie;

								env.options.show_big_virtual_folders = false;
								var showBigVirtualFoldersCookie = Functions.getBooleanCookie("showBigVirtualFolders");
								if (showBigVirtualFoldersCookie !== null)
									env.options.show_big_virtual_folders = showBigVirtualFoldersCookie;

								if (! env.options.hasOwnProperty('cache_base_to_search_in') || ! env.options.cache_base_to_search_in)
									env.options.cache_base_to_search_in = env.options.folders_string;
								if (! env.options.hasOwnProperty('saved_cache_base_to_search_in') || ! env.options.saved_cache_base_to_search_in)
									env.options.saved_cache_base_to_search_in = env.options.folders_string;

								env.slideAlbumButtonBorder = 1;
								env.slideBorder = 3;
								env.slideMarginFactor = 0.05;

								env.options.foldersStringWithTrailingSeparator = env.options.folders_string + env.options.cache_folder_separator;
								env.options.byDateStringWithTrailingSeparator = env.options.by_date_string + env.options.cache_folder_separator;
								env.options.byGpsStringWithTrailingSeparator = env.options.by_gps_string + env.options.cache_folder_separator;
								env.options.bySearchStringWithTrailingSeparator = env.options.by_search_string + env.options.cache_folder_separator;
								env.options.bySelectionStringWithTrailingSeparator = env.options.by_selection_string + env.options.cache_folder_separator;
								env.options.byMapStringWithTrailingSeparator = env.options.by_map_string + env.options.cache_folder_separator;

								if (env.options.request_password_email) {
									$("#request-password").off("click").on("click", util.showPasswordRequestForm);
									$("#password-request-form").submit(
										function() {
											let name = $("#form-name").val().trim();
											let email = $("#form-email").val().trim();
											let identity = $("#form-identity").val().trim();

											if (name && email && identity) {
												// alert(location.href.substr(0, - location.hash) + '?name=' + encodeURI($("#form-name").val()) + '&email=' + encodeURI($("#form-email").val()) + '&identity=' + encodeURI($("#form-identity").val()) + location.hash);
												var newHref = // location.href.substr(0, - location.hash) +
												 					'?url=' + encodeURIComponent(location.href) +
																	'&name=' + encodeURIComponent(name) +
																	'&email=' + encodeURIComponent(email) +
																	'&identity=' + encodeURIComponent(identity) +
																	location.hash;
												$("#auth-text").stop().fadeOut(1000);
												$("#sending-email").stop().fadeIn(1000);
												$("#sending-email").fadeOut(
													3000,
													function() {
														location.href = newHref;
													}
												);
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

								if (env.options.user_may_suggest_location && env.options.request_password_email) {
									$(".map-marker-centered-send-suggestion").off("click").on(
										"click",
										function() {
											var center = env.mymap.getCenter();
											var popupUrl = location.href.substring(0, location.href.length - location.hash.length) +
																'?url=' + encodeURIComponent(location.href) +
																'&photo=' + encodeURIComponent(env.currentMedia.albumName + '/' + env.currentMedia.name) +
																'&lat=' + encodeURIComponent(center.lat) +
																'&lng=' + encodeURIComponent(center.lng);
											$("#sending-photo-position").stop().fadeIn(1000);
											var popup = window.open(popupUrl, "Sending the email", "height=300 ,width=600");
											setTimeout(
												function() {
													popup.close();
												},
												300
											);
											$("#sending-photo-position").fadeOut(3000);
										}
									);
								}

								$("#padlock img").attr("alt", util._t("#padlock-img-alt-text"));

								// WARNING: do not initialize the search root album, the app must read it from its json file!
								util.initializeOrGetMapRootAlbum();
								util.initializeSelectionRootAlbum();

								env.mapAlbum = new Album();

								env.selectionAlbum = new Album();

								env.searchAlbum = new Album();
								env.searchAlbum.includedFilesByCodesSimpleCombination = new IncludedFiles();

								if (env.options.version !== undefined)
									$("#powered-by").attr("title", util._t("#software-version") + ": " + env.options.version + " - " + util._t("#json-version") + ": " + env.options.json_version.toString());
							}

							resolve_getOptions();
						},
						error: function(jqXHR, textStatus, errorThrown) {
							if (errorThrown === "Not Found") {
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

	Functions.toggleMetadata = function() {
		if ($(".media-box .metadata").css("display") === "none") {
			$(".media-box .links").css("display", "inline").stop().fadeTo("slow", 0.5);
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
			$(".media-box .links").stop().fadeOut("slow");
			$(".media-box .metadata-show").show();
			$(".media-box .metadata-hide").hide();
			$(".media-box .metadata")
				.stop()
				.animate({ height: 0, paddingTop: 0, paddingBottom: 0 }, "slow", function() {
					$(this).hide();
				});
		}
	};

	Functions.prototype.getBooleanCookie = Functions.getBooleanCookie;
	Functions.prototype.setBooleanCookie = Functions.setBooleanCookie;
	Functions.prototype.setCookie = Functions.setCookie;
	Functions.prototype.updateMenu = Functions.updateMenu;
	Functions.prototype.toggleMetadata = Functions.toggleMetadata;
	Functions.prototype.humanFileSize = Functions.humanFileSize;
	Functions.prototype.pinchSwipeInitialization = Functions.pinchSwipeInitialization;

	window.Functions = Functions;
}());
