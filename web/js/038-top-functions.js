/*jshint esversion: 6 */
(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var map = new MapFunctions();
	var pS = new PinchSwipe();
	var f = new Functions();
	var numSubAlbumsReady = 0;
	var mapIsInitialized = false;
	var lastAlbumIndex = 0;

	/* constructor */
	function TopFunctions() {
	}

	TopFunctions.setTitle = function(id, singleMedia) {

		var title = "", documentTitle = "", components, i, isDateTitle, isGpsTitle, isSearchTitle, isMapTitle, originalTitle;
		var titleAnchorClasses, where, initialValue, searchFolderHash;
		var linkCount = 0, linksToLeave = 1, latitude, longitude, arrayCoordinates;
		var raquo = "&raquo;";
		// gpsLevelNumber is the number of levels for the by gps tree
		// current levels are country, region, place => 3
		var gpsLevelNumber = 3;
		var gpsName = '';
		var setDocumentTitle = (id === "center" || id === "album");

		f.updateMenu();

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
		isMapTitle = (components.length > 1 && components[1] == Options.by_map_string);

		// 'textComponents = components' doesn't work: textComponents becomes a pointer to components
		var textComponents = components.slice();

		// generate the title in the page top
		titleAnchorClasses = 'title-anchor';
		if (isMobile.any())
			titleAnchorClasses += ' mobile';

		var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);
		var fillInSpan = "<span id='fill-in-map-link'></span>";

		var mediaTotalInAlbum, imagesTotalInAlbum, videosTotalInAlbum, numMediaInSubTree;
		var mediaTotalInSubTree, imagesTotalInSubTree, videosTotalInSubTree;
		var mediaTotalInSubAlbums, imagesTotalInSubAlbums, videosTotalInSubAlbums;
		if (singleMedia === null) {
			mediaTotalInAlbum = util.imagesAndVideosTotal(currentAlbum.numMedia);
			imagesTotalInAlbum = util.imagesTotal(currentAlbum.numMedia);
			videosTotalInAlbum = util.videosTotal(currentAlbum.numMedia);
			mediaTotalInSubTree = util.imagesAndVideosTotal(currentAlbum.numMediaInSubTree);
			imagesTotalInSubTree = util.imagesTotal(currentAlbum.numMediaInSubTree);
			videosTotalInSubTree = util.videosTotal(currentAlbum.numMediaInSubTree);
			mediaTotalInSubAlbums = mediaTotalInSubTree - mediaTotalInAlbum;
			imagesTotalInSubAlbums = imagesTotalInSubTree - imagesTotalInAlbum;
			videosTotalInSubAlbums = videosTotalInSubTree - videosTotalInAlbum;
		}

		if (isDateTitle) {
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>" + raquo;
			title += "<a class='" + titleAnchorClasses + "' href='#!/" + Options.by_date_string + "'>(" + util._t("#by-date") + ")</a>";

			if (components.length > 2 || singleMedia !== null)
				title += raquo;

			if (setDocumentTitle) {
				documentTitle += components[0];
				if (components.length > 2 || singleMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
				documentTitle += "(" + util._t("#by-date") + ")";
			}

			for (i = 2; i < components.length; ++i) {
				if (i < components.length - 1 || singleMedia !== null)
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i - 1]) + "'>";
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


				if (i < components.length - 1 || singleMedia !== null)
					title += "</a>";
				else
					title += "</span>";
				if (i < components.length - 1 || singleMedia !== null)
					title += raquo;

				if (setDocumentTitle) {
					// keep building the html page title
					documentTitle = textComponents[i] + documentTitle;
					if (i < components.length - 1 || singleMedia !== null)
						documentTitle = " \u00ab " + documentTitle;
				}
			}

			title += fillInSpan;

			if (components.length > 1 && singleMedia === null && ! isMobile.any()) {
				title += "<span class='title-count'>(";
				if (components.length === 2)
					title += mediaTotalInSubAlbums + " ";
				else
					title += mediaTotalInAlbum + " ";
				if (! imagesTotalInAlbum && videosTotalInAlbum)
					title += util._t(".title-videos");
				else if (imagesTotalInAlbum && ! videosTotalInAlbum)
					title += util._t(".title-images");
				else {
					title += "<span class='title-count-detail' title='";
					if (components.length === 2)
						title += util.escapeSingleQuotes(imagesTotalInSubAlbums + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums + " " + util._t(".title-videos"));
					else
						title += util.escapeSingleQuotes(imagesTotalInAlbum + " " + util._t(".title-images") + ", " + videosTotalInAlbum + " " + util._t(".title-videos"));
					title += "'>";
					title += util._t(".title-media");
					title += "</span>";
				}
				if (components.length >= 5)
					title += " " + util._t(".title-in-day-album");
				else if (components.length >= 3)
					title += " " + util._t(".title-in-date-album");
				title += ")</span>";
			}
		} else if (isGpsTitle) {
			title = "<a class='" + titleAnchorClasses + "' href='#!/'>" + components[0] + "</a>" + raquo;
			title += "<a class='" + titleAnchorClasses + "' href='#!/" + Options.by_gps_string + "'>(" + util._t("#by-gps") + ")</a>";

			if (components.length > 2 || singleMedia !== null)
				title += raquo;

			if (setDocumentTitle) {
				documentTitle += components[0];
				if (components.length > 2 || singleMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
				documentTitle += "(" + util._t("#by-gps") + ")";
			}

			for (i = 2; i < components.length; ++i) {
				if (i == components.length - 1 && currentAlbum.ancestorsNames[i - 1].match(/_[0-9]+$/)) {
					gpsName = util.transformAltPlaceName(currentAlbum.ancestorsNames[i - 1]);
				} else {
					gpsName = currentAlbum.ancestorsNames[i - 1];
				}

				if (gpsName === '')
					gpsName = util._t('.not-specified');
				gpsHtmlTitle = util._t("#place-icon-title") + gpsName;

				if (i < components.length - 1 || singleMedia !== null) {
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i - 1]) + "'";
					title += " title='" + util.escapeSingleQuotes(util._t("#place-icon-title") + gpsName + util._t("#place-icon-title-end")) + "'";
					title += ">";
				} else
					title += "<span class='title-no-anchor'>";
				title += gpsName;
				if (i < components.length - 1 || singleMedia !== null)
					title += "</a>";
				else
					title += "</span>";

				if (singleMedia !== null) {
					latitude = singleMedia.metadata.latitude;
					longitude = singleMedia.metadata.longitude;
				} else {
					arrayCoordinates = currentAlbum.ancestorsCenters[i - 1];
					latitude = arrayCoordinates.latitude;
					longitude = arrayCoordinates.longitude;
				}

				if (i < components.length - 1 || singleMedia !== null)
					title += raquo;

				if (setDocumentTitle) {
					// keep buildimg the html page title
					documentTitle = gpsName + documentTitle;
					if (i < components.length - 1 || singleMedia !== null)
						documentTitle = " \u00ab " + documentTitle;
				}
			}

			title += fillInSpan;

			if (components.length > 1 && singleMedia === null && ! isMobile.any()) {
				title += "<span class='title-count'>(";
				if (components.length === 2)
					title += mediaTotalInSubAlbums + " ";
				else
					title += mediaTotalInAlbum + " ";
				if (! imagesTotalInAlbum && videosTotalInAlbum)
					title += util._t(".title-videos");
				else if (imagesTotalInAlbum && ! videosTotalInAlbum)
					title += util._t(".title-images");
				else {
					title += "<span class='title-count-detail' title='";
					if (components.length === 2)
						title += util.escapeSingleQuotes(imagesTotalInSubAlbums + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums + " " + util._t(".title-videos"));
					else
						title += util.escapeSingleQuotes(imagesTotalInAlbum + " " + util._t(".title-images") + ", " + videosTotalInAlbum + " " + util._t(".title-videos"));
					title += "'>";
					title += util._t(".title-media");
					title += "</span>";
				}
				if (components.length >= gpsLevelNumber + 2)
					title += " " + util._t(".title-in-gps-album");
				else if (components.length >= 3)
					title += " " + util._t(".title-in-gpss-album");
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
				! util.isAnyRootHash(Options.cache_base_to_search_in)
			) {
				title += "<span id='search-album-to-be-filled'></span>" + raquo;
			}
			var searchClass = "search-link";

			if (
				Options.search_current_album &&
				! util.isAnyRootHash(Options.cache_base_to_search_in)
			) {
				searchClass = "main-search-link";
				searchFolderHash = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
			}
			where =
				"<a class='" + searchClass + "' href='#!/" + currentAlbum.cacheBase + "'>" +
				util._t("#by-search") +
				"</a>";

			title += "<span class='title-no-anchor'>(" + where + ")</span>";
			where = util.stripHtmlAndReplaceEntities(where);

			// do not show the options and the search words, they are visible in the menu
			// show the image name, if it is there
			if (singleMedia !== null) {
				title += raquo;
			}

			title += fillInSpan;

			if (
				components.length > 2 &&
				(singleMedia === null && ! util.isAlbumWithOneMedia(currentAlbum)) &&
				(util.imagesAndVideosTotal(currentAlbum.numMedia) || currentAlbum.subalbums.length) &&
				! isMobile.any()
			) {
				title += "<span class='title-count'>(";
				title += util._t(".title-found") + ' ';
				if (util.imagesAndVideosTotal(currentAlbum.numMedia)) {
					title += mediaTotalInAlbum + " ";
					if (! imagesTotalInAlbum && videosTotalInAlbum)
						title += util._t(".title-videos");
					else if (imagesTotalInAlbum && ! videosTotalInAlbum)
						title += util._t(".title-images");
					else
						title += util._t(".title-media");
					if (currentAlbum.subalbums.length)
						title += " " + util._t(".title-and");
				}
				if (currentAlbum.subalbums.length) {
					title += " " + currentAlbum.subalbums.length;
					title += " " + util._t(".title-albums");
				}

				if (currentAlbum.hasOwnProperty("removedStopWords") && currentAlbum.removedStopWords.length) {
					// say that some search word hasn't been used
					title += " - " + currentAlbum.removedStopWords.length + " " + util._t("#removed-stopwords") + ": ";
					for (i = 0; i < currentAlbum.removedStopWords.length; i ++) {
						if (i)
							title += ", ";
						title += currentAlbum.removedStopWords[i];
					}
				}

				title += ")</span>";
			}

			if (setDocumentTitle) {
				// build the html page title
				documentTitle += " (" + where +") \u00ab " + components[0];
				if (singleMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
			}
		} else if (isMapTitle) {
			// i=0: title
			// i=1: Options.by_search_string
			// (optional) i=2: image cache or folder
			// (optional) i=3 up: folder or image
			// (optional) i=n: image
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>" + raquo;

			where =
				"<a class='search-link' href='#!/" + currentAlbum.cacheBase + "'>" +
				util._t("#by-map") +
				"</a>";

			title += "<span class='title-no-anchor'>(" + where + ")</span>";
			where = util.stripHtmlAndReplaceEntities(where);

			// do not show the options and the search words, they are visible in the menu
			// show the image name, if it is there
			if (singleMedia !== null) {
				title += raquo;
			}

			title += fillInSpan;

			if (
				components.length > 2 &&
				(singleMedia === null && ! util.isAlbumWithOneMedia(currentAlbum)) &&
				(util.imagesAndVideosTotal(currentAlbum.numMedia) || currentAlbum.subalbums.length) &&
				! isMobile.any()
			) {
				title += "<span class='title-count'>(";
				if (util.imagesAndVideosTotal(currentAlbum.numMedia)) {
					title += mediaTotalInAlbum + " ";
					if (! imagesTotalInAlbum && videosTotalInAlbum)
						title += util._t(".title-videos");
					else if (imagesTotalInAlbum && ! videosTotalInAlbum)
						title += util._t(".title-images");
					else
						title += util._t(".title-media");
					if (currentAlbum.subalbums.length)
						title += " " + util._t(".title-and");
				}
				if (currentAlbum.subalbums.length) {
					title += " " + currentAlbum.subalbums.length;
					title += " " + util._t(".title-albums");
				}
				title += ")</span>";
			}

			if (setDocumentTitle) {
				// build the html page title
				documentTitle += " (" + where +") \u00ab " + components[0];
				if (singleMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
			}
		} else {
			// folders title
			title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>";
			if (components.length > 2 || singleMedia !== null)
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
				if (components.length > 2 || singleMedia !== null)
					documentTitle = " \u00ab " + documentTitle;
			}

			initialValue = 2;
			if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
				// the folders from the first until the search folder inclusive must not be shown
				initialValue = savedSearchAlbumHash.split(Options.cache_folder_separator).slice(2).length + 1;
			}
			for (i = initialValue; i < components.length; ++i) {
				if (i < components.length - 1 || singleMedia !== null)
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i - 1]) + "'>";
				else
					title += "<span class='title-no-anchor'>";

				title += textComponents[i];

				if (i < components.length - 1 || singleMedia !== null)
					title += "</a>";
				else
					title += "</span>";

				if (i < components.length - 1 || singleMedia !== null)
					title += raquo;
			}

			title += fillInSpan;

			if (components.length > 1 && singleMedia === null && ! isMobile.any()) {
				title += "<span class='title-count'>(";
				if (util.imagesAndVideosTotal(currentAlbum.numMedia)) {
					title += mediaTotalInAlbum + " ";
					if (! imagesTotalInAlbum && videosTotalInAlbum)
						title += util._t(".title-videos") + " ";
					else if (imagesTotalInAlbum && ! videosTotalInAlbum)
						title += util._t(".title-images") + " ";
					else {
						title += "<span class='title-count-detail' title='";
						if (components.length === 2)
							title += util.escapeSingleQuotes(imagesTotalInSubAlbums + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums + " " + util._t(".title-videos"));
						else
							title += util.escapeSingleQuotes(imagesTotalInAlbum + " " + util._t(".title-images") + ", " + videosTotalInAlbum + " " + util._t(".title-videos"));
						title += "'>";
						title += util._t(".title-media");
						title += "</span>";
					}
					title += util._t(".title-in-album");
					if (mediaTotalInSubAlbums)
						title += ", ";
				}
				if (mediaTotalInSubAlbums) {
					title += mediaTotalInSubAlbums + " ";
					if (! imagesTotalInSubAlbums && videosTotalInSubAlbums)
						title += util._t(".title-videos");
					else if (imagesTotalInSubAlbums && ! videosTotalInSubAlbums)
						title += util._t(".title-images");
					else {
						title += "<span class='title-count-detail' title='";
						title += util.escapeSingleQuotes(imagesTotalInSubAlbums + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums + " " + util._t(".title-videos"));
						title += "'>";
						title += util._t(".title-media");
						title += "</span>";
					}
					title += " " + util._t(".title-in-subalbums");
				}
				if (mediaTotalInAlbum && mediaTotalInSubAlbums) {
					title += ", ";
					title += "<span class='title-count-detail' title='";
					title += util.escapeSingleQuotes(imagesTotalInSubTree + " " + util._t(".title-images") + ", " + videosTotalInSubTree + " " + util._t(".title-videos"));
					title += "'>";
					title += util._t(".title-total") + " ";
					title += mediaTotalInSubTree;
					title += "</span> ";
				}
				title += ")</span>";
			}

			if (setDocumentTitle) {
				for (i = initialValue; i < components.length; ++i) {
					// keep building the html page title
					documentTitle = textComponents[i] + documentTitle;
					if (i < components.length - 1 || singleMedia !== null)
						documentTitle = " \u00ab " + documentTitle;
				}
			}
		}

		if (singleMedia !== null) {
			title += "<span class='media-name'>" + singleMedia.name + "</span>";
			if (util.hasGpsData(currentMedia))
				title += "<a class='map-popup-trigger'>" +
					"<img class='title-img' title='" + util.escapeSingleQuotes(util._t("#show-on-map")) + " [s]' alt='" + util.escapeSingleQuotes(util._t("#show-on-map")) + "' height='20px' src='img/ic_place_white_24dp_2x.png'>" +
					"</a>";
		} else if (title.includes(fillInSpan) && currentAlbum.numPositionsInTree) {
			title = title.replace(
				fillInSpan,
				"<a class='map-popup-trigger'>" +
				"<img class='title-img' " +
					"title='" + util.escapeSingleQuotes(util._t("#show-markers-on-map")) + " [s]' " +
					"alt='" + util.escapeSingleQuotes(util._t("#show-markers-on-map")) + "' " +
					"height='20px' " +
					"src='img/ic_place_white_24dp_2x.png'" +
				">" +
				"</a>"
			);
		}

		if (isMobile.any()) {
			// leave only the last link on mobile
			// separate on "&raquo;""

			var titleArray = title.split(raquo);

			for (i = titleArray.length - 1; i >= 0; i --) {
				if (titleArray[i].indexOf(" href='#!") != -1) {
					linkCount ++;
					if (linkCount > linksToLeave) {
						title =
							"<span class='dots-surroundings'><span class='title-no-anchor dots'>...</span></span>" +
							"<span class='hidden-title'>" + titleArray.slice(0, i + 1).join(raquo) + "</span>" + raquo + titleArray.slice(i + 1).join(raquo);
						break;
					}
				}
			}
		}

		if (id === "album")
			$("#album-view .title-string").html(title);
		else
			$(".media-box#" + id + " .title-string").html(title);


		if (isMobile.any()) {
			$(".dots").off('click').on(
				'click',
				function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						$(".dots-surroundings").hide();
						$(".hidden-title").show();
						return false;
					}
				}
			);
		}

		if (setDocumentTitle) {
			// keep generating the html page title
			if (singleMedia !== null)
				documentTitle = singleMedia.name + documentTitle;
			else if (currentAlbum !== null && ! currentAlbum.subalbums.length && util.imagesAndVideosTotal(currentAlbum.numMedia) == 1)
				documentTitle = util.trimExtension(currentAlbum.media[0].name) + " \u00ab " + documentTitle;

			document.title = documentTitle;
		}


		if (singleMedia === null && currentAlbum !== null && ! currentAlbum.subalbums.length && util.imagesAndVideosTotal(currentAlbum.numMedia) == 1) {
			title += raquo + "<span class='media-name'>" + util.trimExtension(currentAlbum.media[0].name) + "</span>";
		}

		if ($("#search-album-to-be-filled").length) {
			// for searches in current folder we must get the names from the album
			// we must use getAlbum() because the album could not be in the cache yet (as when ctl-r is pressed)
			var promise = phFl.getAlbum(searchFolderHash, util.errorThenGoUp, {"getMedia": true, "getPositions": true});
			promise.then(
				function(theAlbum) {
					var whereLinks = '', thisCacheBase, name, documentTitle;

					if (theAlbum.hasOwnProperty('ancestorsNames')) {
						for (var i = 0; i < theAlbum.ancestorsNames.length; i ++) {
							name = theAlbum.ancestorsNames[i];
							if (i === 0) {
								if (name == Options.by_date_string)
									name = "(" + util._t("#by-date") + ")";
								else if (name == Options.by_gps_string)
									name = "(" + util._t("#by-gps") + ")";
								if (name == Options.by_map_string)
									name = "(" + util._t("#by-map") + ")";
							} else if (i === 2 && util.isByDateCacheBase(Options.cache_base_to_search_in))
								// convert the month number to localized month name
								name = util._t("#month-" + name);
							thisCacheBase = "#!/" + theAlbum.ancestorsCacheBase[i];
							if (i > 0 && (i !== 1 || theAlbum.ancestorsNames[0] !== ""))
								whereLinks += raquo;
							if (name)
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

					TopFunctions.trackPiwik(id);
				},
				function() {
					console.trace();
				}
			);
		} else {
			TopFunctions.trackPiwik(id);
		}

		f.setOptions();

		// activate the map popup trigger in the title
		$(".map-popup-trigger").off('click').on(
			'click',
			function(ev, from) {
				selectorClickedToOpenTheMap = ".map-popup-trigger";
				TopFunctions.generateMapFromDefaults(ev, from);
			}
		);

		$('.modal-close').on(
			'click',
			function() {
				$("#my-modal.modal").css("display", "none");
				// popupRefreshType = "previousAlbum";
				$('#mapdiv').empty();
			}
		);
	};

	TopFunctions.trackPiwik = function(id) {
		// trigger piwik tracking. It's here because it needs document.title
		if (Options.piwik_server && Options.piwik_id && (id === "album" || id === "center")) {
			_paq.push(['setCustomUrl', '/' + window.location.hash.substr(1)]);
			// _paq.push(['setDocumentTitle', PhotoFloat.cleanHash(location.hash)]);
			let titleElement, titleText, splittedTitle;
			if (id === "center") {
				titleText = $(".media-box#center .title-string")[0].textContent;
			} else {
				// id === "album": temporaly detach the counts, get the text and append the counts again
				let titleCount = $("#album-view .title-string .title-count").detach();
				titleText = $("#album-view .title-string")[0].textContent;
				$("#album-view .title-string").append(titleCount);
			}
			splittedTitle = titleText.split("»");
			if (splittedTitle.length > 1)
				splittedTitle.shift();
			titleText = splittedTitle.join(" » ");
			// let title = $(".media-box#center .title-string")[0].textContent.replace(/»/g, " » ").replace(/&#(\d+);/g, function(match, dec) {
			// 	return String.fromCharCode(dec);
			// });
			_paq.push(['setDocumentTitle', titleText]);
			_paq.push(['trackPageView']);
		}
	};

	TopFunctions.showBrowsingModeMessage = function(selector) {
		$(".browsing-mode-message").stop().hide().css("opacity", "");
		$(selector).show();
		$(selector).fadeOut(
			2500,
			function(){
				util.HideId(selector);
			}
		);
		isABrowsingModeChange = true;
	};

	TopFunctions.bindChangeBrowsingEvents = function(thisAlbum) {

		function actuallyBind(thisAlbum, hasGpsData) {
			// this function is called by bindChangeBrowsingEvents when an asyncronous function has ended
			function changeToFoldersView() {
				TopFunctions.showBrowsingModeMessage("#folders-browsing");
				window.location.href = foldersViewLink;
				return false;
			}

			function changeToByDateView() {
				TopFunctions.showBrowsingModeMessage("#by-date-browsing");
				window.location.href = byDateViewLink;
				return false;
			}

			function changeToByGpsView() {
				TopFunctions.showBrowsingModeMessage("#by-gps-browsing");
				window.location.href = byGpsViewLink;
				return false;
			}

			function changeToByMapView() {
				TopFunctions.showBrowsingModeMessage("#by-map-browsing");
				window.location.href = byMapViewLink;
				return false;
			}

			function changeToBySearcView() {
				TopFunctions.showBrowsingModeMessage("#by-search-browsing");
				window.location.href = bySearchViewLink;
				return false;
			}

			var foldersViewLink, byDateViewLink, byGpsViewLink;
			if (currentMedia !== null) {
				foldersViewLink = "#!/" + util.pathJoin([
					currentMedia.foldersCacheBase,
					currentMedia.cacheBase
				]);

				byDateViewLink = "#!/" + util.pathJoin([
					currentMedia.dayAlbumCacheBase,
					currentMedia.foldersCacheBase,
					currentMedia.cacheBase
				]);

				if (currentMedia.gpsAlbumCacheBase) {
					byGpsViewLink = "#!/" + util.pathJoin([
						currentMedia.gpsAlbumCacheBase,
						currentMedia.foldersCacheBase,
						currentMedia.cacheBase
					]);
				}
			} else {
				// we are in a root album
				foldersViewLink = "#!/" + encodeURIComponent(Options.folders_string);

				byDateViewLink = "#!/" + encodeURIComponent(Options.by_date_string);

				if (hasGpsData) {
					byGpsViewLink = "#!/" + encodeURIComponent(Options.by_gps_string);
				}
			}
			$(".browsing-mode-switcher").off("click");

			$("#folders-view").on("click", changeToFoldersView);
			$("#by-date-view").on("click", changeToByDateView);
			if (hasGpsData)
				$("#by-gps-view").on("click", changeToByGpsView);
			if (byMapViewLink !== null)
				$("#by-map-view").on("click", changeToByMapView);
			if (bySearchViewLink !== null)
				$("#by-search-view").on("click", changeToBySearcView);

			if (util.isFolderCacheBase(thisAlbum.cacheBase)) {
				$("#folders-view").off("click");

				// add the browsing mode switcher links
				nextBrowsingModeSelector = "#by-date-view";
				if (bySearchViewLink !== null) {
					prevBrowsingModeSelector = "#by-search-view";
				} else if (byMapViewLink !== null) {
					prevBrowsingModeSelector = "#by-map-view";
				} else if (hasGpsData) {
					prevBrowsingModeSelector = "#by-gps-view";
				} else {
					prevBrowsingModeSelector = "#by-date-view";
				}
			} else if (util.isByDateCacheBase(thisAlbum.cacheBase)) {
				$("#by-date-view").off("click");

				// add the browsing mode switcher links
				if (hasGpsData) {
					nextBrowsingModeSelector = "#by-gps-view";
				} else if (byMapViewLink !== null) {
					nextBrowsingModeSelector = "#by-map-view";
				} else if (bySearchViewLink !== null) {
					nextBrowsingModeSelector = "#by-search-view";
				} else {
					nextBrowsingModeSelector = "#folders-view";
				}
				prevBrowsingModeSelector = "#folders-view";
			} else if (util.isByGpsCacheBase(thisAlbum.cacheBase)) {
				$("#by-gps-view").off("click");

				// add the browsing mode switcher links
				if (byMapViewLink !== null) {
					nextBrowsingModeSelector = "#by-map-view";
				} else if (bySearchViewLink !== null) {
					nextBrowsingModeSelector = "#by-search-view";
				} else {
					nextBrowsingModeSelector = "#folders-view";
				}
				prevBrowsingModeSelector = "#by-date-view";
			} else if (util.isMapCacheBase(thisAlbum.cacheBase)) {
				$("#by-map-view").off("click");

				byMapViewLink = location.hash;

				// add the browsing mode switcher links
				if (bySearchViewLink !== null) {
					nextBrowsingModeSelector = "#by-search-view";
				} else {
					nextBrowsingModeSelector = "#folders-view";
				}
				if (hasGpsData) {
					prevBrowsingModeSelector = "#by-gps-view";
				} else {
					prevBrowsingModeSelector = "#by-date-view";
				}
			} else if (util.isSearchCacheBase(thisAlbum.cacheBase)) {
				$("#by-search-view").off("click");

				bySearchViewLink = location.hash;

				// add the browsing mode switcher links
				nextBrowsingModeSelector = "#folders-view";
				if (byMapViewLink !== null) {
					prevBrowsingModeSelector = "#by-map-view";
				} else if (hasGpsData) {
					prevBrowsingModeSelector = "#by-gps-view";
				} else {
					prevBrowsingModeSelector = "#by-date-view";
				}
			}
			f.updateMenu(thisAlbum, hasGpsData);
		}

		// end of subfunctions, function execution begins here
		// The actuallyBind function is needed because, in order to know whether geotagged photos exist,
		// an asyncronous function has to be called
		if (currentMedia !== null) {
			actuallyBind(thisAlbum, util.hasGpsData(currentMedia));
		} else {
			// we are in a root album
			var promise = phFl.geotaggedPhotosExist();
			promise.then(
				function(hasGpsData) {
					actuallyBind(thisAlbum, hasGpsData);
				},
				function(album) {
					console.trace();
				}
			);
		}

	};

	TopFunctions.showMedia = function(album, singleMedia, id) {

		function loadNextPrevMedia(containerHeight, containerWidth) {

			$(mediaSelector).off(triggerLoad);

			if (id === "center") {
				$("#pinch-in").off("click").on("click", pS.pinchIn);
				$("#pinch-out").off("click").on("click", pS.pinchOut);

				if (singleMedia.mimeType.indexOf("image") === 0) {
					pS.addMediaGesturesDetection();
					util.setPinchButtonsPosition();
					util.correctPrevNextPosition();
				}

				if (util.imagesAndVideosTotal(album.numMedia) > 1) {
					TopFunctions.showMedia(album, prevMedia, 'left');
					TopFunctions.showMedia(album, nextMedia, 'right');
				}

				$(window).off("resize").on(
					"resize",
					function () {
						windowWidth = $(window).outerWidth();
						windowHeight = $(window).outerHeight();

						$("#loading").show();

						var event = {data: {}};

						event.data.resize = true;

						event.data.id = "center";
						event.data.media = singleMedia;
						event.data.currentZoom = pS.getCurrentZoom();
						event.data.initialZoom = pS.getInitialZoom();
						let scaleMediaPromise = util.scaleMedia(event);
						scaleMediaPromise.then(
							function() {
								if (singleMedia.mimeType.indexOf("image") === 0) {
									f.pinchSwipeInitialization();
									Utilities.setPinchButtonsPosition();
									Utilities.correctPrevNextPosition();
								}
							}
						);

						if (util.imagesAndVideosTotal(album.numMedia) > 1) {
							event.data.id = "left";
							event.data.media = prevMedia;
							util.scaleMedia(event);

							event.data.id = "right";
							event.data.media = nextMedia;
							util.scaleMedia(event);
						}

						var isPopup = $('.leaflet-popup').html() ? true : false;
						var isMap = $('#mapdiv').html() ? true : false;
						if (isMap) {
							// the map must be generated again including the points that only carry protected content
							mapRefreshType = "resize";

							if (isPopup) {
								popupRefreshType = "mapAlbum";
								$('.leaflet-popup-close-button')[0].click();
							} else {
								popupRefreshType = "none";
							}

							// close the map and reopen it
							$('.modal-close')[0].click();
							$(selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
						}
					}
				);
			}
		}

		var text, thumbnailSize, triggerLoad, mediaHtml, mediaSelector, mediaSrc;
		var exposureTime, heightForMedia, heightForMediaAndTitle;
		var previousMediaIndex, nextMediaIndex;

		$(".media-bar").show();
		$("#downloading-media").hide();

		if (id === "center")
			$("#media-view").removeClass("hidden");

		var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

		mediaLink = phFl.encodeHash(currentAlbum, singleMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
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
			TopFunctions.setTitle(id, singleMedia);

			if (Options.hide_caption) {
				$("#caption").addClass("hidden-by-option");
			} else {
				$("#caption").removeClass("hidden-by-option");
			}

			if (Options.hide_bottom_thumbnails) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}

			if (util.imagesAndVideosTotal(currentAlbum.numMedia) == 1) {
				$("#album-view").addClass("hidden");
			} else {
				$("#album-view, #album-view #subalbums").removeClass("hidden");
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
		} else if (id === "left") {
			TopFunctions.setTitle(id, prevMedia);
		} else if (id === "right") {
			TopFunctions.setTitle(id, nextMedia);
		}

		heightForMediaAndTitle = util.mediaBoxContainerHeight();

		if ($(".media-box#" + id + " .title").is(":visible"))
			titleHeight = $(".media-box#" + id + " .title").outerHeight();
		else
			titleHeight = 0;

		heightForMedia = heightForMediaAndTitle - titleHeight;

		if (id === "center") {
			$("#media-box-container").css("width", windowWidth * 3).css("height", heightForMediaAndTitle);
			$("#media-box-container").css("transform", "translate(-" + windowWidth + "px, 0px)");
			$(".media-box").css("width", windowWidth).css("height", heightForMediaAndTitle);
			$(".media-box .media-box-inner").css("width", windowWidth).css("height", heightForMedia);
			$(".media-box").show();

			if (util.imagesAndVideosTotal(currentAlbum.numMedia) == 1) {
				$("#next").hide();
				$("#prev").hide();
			} else {
				$("#next").show();
				$("#prev").show();
			}

			currentAlbum.media[currentMediaIndex].byDateName =
				util.pathJoin([currentAlbum.media[currentMediaIndex].dayAlbum, currentAlbum.media[currentMediaIndex].name]);
			if (currentAlbum.media[currentMediaIndex].hasOwnProperty("gpsAlbum"))
				currentAlbum.media[currentMediaIndex].byGpsName =
					util.pathJoin([currentAlbum.media[currentMediaIndex].gpsAlbum, currentAlbum.media[currentMediaIndex].name]);

			nextMedia = null;
			prevMedia = null;
			if (util.imagesAndVideosTotal(currentAlbum.numMedia) > 1) {
				// prepare for previous media
				previousMediaIndex = (currentMediaIndex === 0 ?
										util.imagesAndVideosTotal(currentAlbum.numMedia) - 1 :
										currentMediaIndex - 1);
				prevMedia = currentAlbum.media[previousMediaIndex];
				prevMedia.byDateName = util.pathJoin([prevMedia.dayAlbum, prevMedia.name]);
				if (prevMedia.hasOwnProperty("gpsAlbum"))
					prevMedia.byGpsName = util.pathJoin([prevMedia.gpsAlbum, prevMedia.name]);

				// prepare for next media
				nextMediaIndex = (currentMediaIndex === util.imagesAndVideosTotal(currentAlbum.numMedia) - 1 ?
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

		if (singleMedia.mimeType.indexOf("video") === 0 && ! f.videoOK()) {
			mediaBoxInnerElement.empty();
			f.addVideoUnsupportedMarker(id);
			if (id === "center")
				loadNextPrevMedia();
		} else {
			if (singleMedia.mimeType.indexOf("video") === 0) {
				mediaSelector = ".media-box#" + id + " .media-box-inner video";
			} else {
				mediaSelector = ".media-box#" + id + " .media-box-inner img";
			}
			// is the following line correct for videos?
			mediaSrc = util.chooseMediaReduction(singleMedia, id, fullScreenStatus);
			mediaHtml = util.createMediaHtml(singleMedia, id, fullScreenStatus);

			triggerLoad = util.chooseTriggerEvent(singleMedia);

			if (mediaBoxInnerElement.html() !== mediaHtml) {
				// only replace the media-box-inner content if it's not yet there
				mediaBoxInnerElement.empty();
				mediaBoxInnerElement.show().append(mediaHtml);

				if (id === "center") {
					$("link[rel=image_src]").remove();
					$('link[rel="video_src"]').remove();
				}
				$("head").append(util.createMediaLinkTag(singleMedia, mediaSrc));
			}

			if (id === "center")
				$(mediaBoxInnerElement).css("opacity", 1);

			$(mediaSelector).off(triggerLoad).on(
				triggerLoad,
				{
					id: id,
					media: singleMedia,
					resize: false,
				},
				function (event) {
					let scaleMediaPromise = util.scaleMedia(event);
					scaleMediaPromise.then(
						function() {
							Utilities.setPinchButtonsPosition();
							Utilities.correctPrevNextPosition();
							if (singleMedia.mimeType.indexOf("image") === 0) {
								loadNextPrevMedia(containerHeight, containerWidth);
							}
						}
					);
				}
			);
			// in case the image has been already loaded, trigger the event
			if ($(mediaSelector)[0].complete)
				$(mediaSelector).trigger(triggerLoad);

			if (id === "center") {
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

			upLink = util.upHash();

			mediaBoxInnerElement.off('mousewheel');
			if (singleMedia.mimeType.indexOf("image") === 0)
				mediaBoxInnerElement.on('mousewheel', pS.swipeOnWheel);

			$(".media-box#center .media-box-inner .media-bar").on(
				'click',
				function(ev) {
					ev.stopPropagation();
				}
			).on(
				'contextmenu',
				function(ev) {
					ev.stopPropagation();
				}
			);

			if (util.imagesAndVideosTotal(currentAlbum.numMedia) == 1) {
				mediaBoxInnerElement.css('cursor', 'default');
			} else {
				[albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

				$("#next").show();
				$("#prev").show();
				mediaBoxInnerElement.css('cursor', '').on(
					'contextmenu',
					function(ev) {
						if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
							ev.preventDefault();
							if (pS.getCurrentZoom() == 1) {
								pS.swipeRight(prevMedia);
								return false;
							}
						}
						contextMenu = true;
						return true;
					}
				);

				$("#prev").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						pS.swipeRight(prevMedia);
						return false;
					}
					return true;
				});
				$("#next").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						pS.swipeLeft(nextMedia);
						return false;
					}
					return true;
				});
			}
		}

		var originalMediaPath = encodeURI(util.originalMediaPath(singleMedia));
		var trueOriginalMediaPath = encodeURI(util.trueOriginalMediaPath(singleMedia));
		$(".media-box#" + id + " .original-link").attr("target", "_blank").attr("href", originalMediaPath);
		$(".media-box#" + id + " .download-link").attr("href", trueOriginalMediaPath).attr("download", "");
		if (util.hasGpsData(singleMedia)) {
			$(".media-box#" + id + " .menu-map-link").on(
				'click',
				function() {
					$(".map-popup-trigger")[0].click();
				}
			);
			$(".media-box#" + id + " .menu-map-link").show();
			$(".media-box#" + id + " .menu-map-divider").show();
		} else {
			$(".media-box#" + id + " .menu-map-link").removeAttr("href");
			// $(".media-box#" + id + " .menu-map-link").removeAttr("href").css("cursor", "pointer");
			$(".media-box#" + id + " .menu-map-link").hide();
			$(".media-box#" + id + " .menu-map-divider").hide();
		}

		if (id === "center") {
			TopFunctions.bindChangeBrowsingEvents(currentAlbum);
			f.updateMenu(currentAlbum);

			$(".media-box#center .metadata-show").off('click').on('click', f.toggleMetadataFromMouse);
			$(".media-box#center .metadata-hide").off('click').on('click', f.toggleMetadataFromMouse);
			$(".media-box#center .metadata").off('click').on('click', f.toggleMetadataFromMouse);
			$(".media-box#center .fullscreen").off('click').on('click', TopFunctions.goFullscreenFromMouse);

			// set social buttons events
			if (currentMedia.mimeType.indexOf("video") === 0)
				$("#media-center").on("loadstart", f.socialButtons);
			else
				$("#media-center").on("load", f.socialButtons);
		}

		$(".media-box#" + id + " .metadata tr.gps").off('click');
		text = "<table>";
		// Here we keep only the technical metadata
		if (typeof singleMedia.date !== "undefined")
			text += "<tr><td class='metadata-data-date'></td><td>" + singleMedia.date + "</td></tr>";
		var fileSize = singleMedia.fileSizes[0].images;
		if (singleMedia.mimeType.indexOf("video") === 0)
			fileSize = singleMedia.fileSizes[0].videos;
		text += "<tr><td class='metadata-data-file-size'></td><td>" + f.humanFileSize(fileSize) + "</td></tr>";
		if (typeof singleMedia.metadata.size !== "undefined")
			text += "<tr><td class='metadata-data-size'></td><td>" + singleMedia.metadata.size[0] + " x " + singleMedia.metadata.size[1] + "</td></tr>";
		if (typeof singleMedia.metadata.make !== "undefined")
			text += "<tr><td class='metadata-data-make'></td><td>" + singleMedia.metadata.make + "</td></tr>";
		if (typeof singleMedia.metadata.model !== "undefined")
			text += "<tr><td class='metadata-data-model'></td><td>" + singleMedia.metadata.model + "</td></tr>";
		if (typeof singleMedia.metadata.aperture !== "undefined")
			text += "<tr><td class='metadata-data-aperture'></td><td> f/" + singleMedia.metadata.aperture + "</td></tr>";
		if (typeof singleMedia.metadata.focalLength !== "undefined")
			text += "<tr><td class='metadata-data-focalLength'></td><td>" + singleMedia.metadata.focalLength + " mm</td></tr>";
		if (typeof singleMedia.metadata.subjectDistanceRange !== "undefined")
			text += "<tr><td class='metadata-data-subjectDistanceRange'></td><td>" + singleMedia.metadata.subjectDistanceRange + "</td></tr>";
		if (typeof singleMedia.metadata.iso !== "undefined")
			text += "<tr><td class='metadata-data-iso'></td><td>" + singleMedia.metadata.iso + "</td></tr>";
		if (typeof singleMedia.metadata.sceneCaptureType !== "undefined")
			text += "<tr><td class='metadata-data-sceneCaptureType'></td><td>" + singleMedia.metadata.sceneCaptureType + "</td></tr>";
		if (typeof singleMedia.metadata.exposureTime !== "undefined") {
			if (typeof singleMedia.metadata.exposureTime === "string")
				exposureTime = singleMedia.metadata.exposureTime;
			else if (singleMedia.metadata.exposureTime > 0.3)
				exposureTime = Math.round(singleMedia.metadata.exposureTime * 10 ) / 10;
			else
				exposureTime = "1/" + Math.round(1 / singleMedia.metadata.exposureTime);
			text += "<tr><td class='metadata-data-exposureTime'></td><td>" + exposureTime + " sec</td></tr>";
		}
		if (typeof singleMedia.metadata.exposureProgram !== "undefined")
			text += "<tr><td class='metadata-data-exposureProgram'></td><td>" + singleMedia.metadata.exposureProgram + "</td></tr>";
		if (typeof singleMedia.metadata.exposureCompensation !== "undefined")
			text += "<tr><td class='metadata-data-exposureCompensation'></td><td>" + singleMedia.metadata.exposureCompensation + "</td></tr>";
		if (typeof singleMedia.metadata.spectralSensitivity !== "undefined")
			text += "<tr><td class='metadata-data-spectralSensitivity'></td><td>" + singleMedia.metadata.spectralSensitivity + "</td></tr>";
		if (typeof singleMedia.metadata.sensingMethod !== "undefined")
			text += "<tr><td class='metadata-data-sensingMethod'></td><td>" + singleMedia.metadata.sensingMethod + "</td></tr>";
		if (typeof singleMedia.metadata.lightSource !== "undefined")
			text += "<tr><td class='metadata-data-lightSource'></td><td>" + singleMedia.metadata.lightSource + "</td></tr>";
		if (typeof singleMedia.metadata.flash !== "undefined")
			text += "<tr><td class='metadata-data-flash'></td><td>" + singleMedia.metadata.flash + "</td></tr>";
		if (typeof singleMedia.metadata.orientationText !== "undefined")
			text += "<tr><td class='metadata-data-orientation'></td><td>" + singleMedia.metadata.orientationText + "</td></tr>";
		if (typeof singleMedia.metadata.duration !== "undefined")
			text += "<tr><td class='metadata-data-duration'></td><td>" + singleMedia.metadata.duration + " sec</td></tr>";
		if (typeof singleMedia.metadata.latitude !== "undefined")
			text += "<tr class='map-link' class='gps'><td class='metadata-data-latitude'></td><td>" + singleMedia.metadata.latitudeMS + " </td></tr>";
		if (typeof singleMedia.metadata.longitude !== "undefined")
			text += "<tr class='gps'><td class='metadata-data-longitude'></td><td>" + singleMedia.metadata.longitudeMS + " </td></tr>";
		text += "</table>";
		$(".media-box#" + id + " .metadata").html(text);
		var linkTitle = util._t('#show-map');
		$(".media-box#" + id + " .metadata tr.gps").attr("title", linkTitle).on(
			'click',
			function() {
				$(".map-popup-trigger")[0].click();
			}
		);

		if (id === "center") {
			if (singleMedia != null) {
				TopFunctions.setCaption(singleMedia.metadata.title, singleMedia.metadata.description);
				TopFunctions.positionCaption('media');
			}
		}

		util.translate();

		$("#subalbums").hide();
	};

	TopFunctions.scrollBottomThumbs = function(e, delta) {
		this.scrollLeft -= (delta * 80);
		e.preventDefault();
	};

	TopFunctions.scrollAlbum = function(e, delta) {
		this.scrollTop -= (delta * 80);
		e.preventDefault();
	};


	TopFunctions.prototype.showAlbumOrMedia = function(album, mediaIndex) {
		var populateAlbum;
		var currentAlbumPath, currentAlbumPathArray;

		if (util.imagesAndVideosTotal(album.numMediaInSubTree) == 0 && ! util.isSearchCacheBase(album.cacheBase)) {
			// the album hasn't any content:
			// either the hash is wrong or it's a protected content album
			// go up
			window.location.href = util.upHash();
			return;
		}

		util.undie();
		$("#loading").hide();

		if (album != currentAlbum) {
			previousAlbum = currentAlbum;
			currentAlbum = null;
		}

		if (currentAlbum && util.isByDateCacheBase(currentAlbum.cacheBase) && mediaIndex !== -1) {
			previousMedia = album.media[mediaIndex];
		} else {
			previousMedia = currentMedia;
		}

		if (previousMedia !== null && previousMedia.mimeType.indexOf("video") === 0)
			// stop the video, otherwise it will keep playing
			$("#media-center")[0].pause();

		currentAlbum = album;
		currentMedia = null;
		if (mediaIndex !== -1)
			currentMedia = album.media[mediaIndex];
		currentMediaIndex = mediaIndex;

		var isAlbumWithOneMedia = util.isAlbumWithOneMedia(currentAlbum);

		f.setOptions();

		if (currentMedia === null || typeof currentMedia === "object") {
			util.initializeSortPropertiesAndCookies(currentAlbum);
			$("#menu-icon").attr("title", util._t("#menu-icon-title"));
			util.sortAlbumsMedia(currentAlbum);
		}

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
			prevMedia = null;
			TopFunctions.showMedia(currentAlbum, currentMedia, 'center');

			// we are in showAlbumOrMedia
			// activate the map and the popup when coming back from a map album
			if (
				previousAlbum !== null &&
				util.isMapCacheBase(previousAlbum.cacheBase) && previousMedia === null &&
				fromEscKey ||
				mapRefreshType !== "none"
			) {
				$(selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
			}
		} else {
			TopFunctions.setTitle("album", null);
			$("#album-view").removeClass("media-view-container");
		}

		if ($("#album-view").is(":visible")) {
			populateAlbum =
				previousAlbum === null ||
			 	previousAlbum.cacheBase !== currentAlbum.cacheBase ||
				util.imagesAndVideosTotal(previousAlbum.numMediaInSubTree) !== util.imagesAndVideosTotal(currentAlbum.numMediaInSubTree) ||
				currentMedia === null && previousMedia !== null;
			TopFunctions.showAlbum(populateAlbum);
		}

		// options function must be called again in order to set elements previously absent
		f.setOptions();
		if (currentMedia !== null) {
			// no subalbums, nothing to wait
		} else if (
			currentAlbum !== null && ! currentAlbum.subalbums.length ||
			numSubAlbumsReady >= album.subalbums.length
		) {
			// no subalbums
			// set social buttons href's when all the stuff is loaded
			$(window).on("load", f.socialButtons());
		} else {
			// subalbums are present, we have to wait when all the random thumbnails will be loaded
		}
		fromEscKey = false;
	};

	TopFunctions.bindSortEvents = function(thisAlbum) {
		// binds the click events to the sort buttons

		$("li.sort").off('click');
		$("li.album-sort.by-date").on(
			'click',
			function(ev) {
				TopFunctions.sortAlbumsByDate(ev, thisAlbum);
			}
		);
		$("li.album-sort.by-name").on(
			'click',
			function(ev) {
				TopFunctions.sortAlbumsByName(ev, thisAlbum);
			}
		);
		$("li.album-sort.reverse").on(
			'click',
			function(ev) {
				TopFunctions.sortAlbumsReverse(ev, thisAlbum);
			}
		);
		$("li.media-sort.by-date").on(
			'click',
			function(ev) {
				TopFunctions.sortMediaByDate(ev, thisAlbum);
			}
		);
		$("li.media-sort.by-name").on(
			'click',
			function(ev) {
				TopFunctions.sortMediaByName(ev, thisAlbum);
			}
		);
		$("li.media-sort.reverse").on(
			'click',
			function(ev) {
				TopFunctions.sortMediaReverse(ev, thisAlbum);
			}
		);
	};

	TopFunctions.sortAlbumsByDate = function(ev, thisAlbum) {
		if (
			thisAlbum.albumNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("albumNameSortRequested", false);
			f.setBooleanCookie("albumReverseSortRequested", thisAlbum.albumReverseSort);
			util.sortAlbumsMedia(thisAlbum);
			f.updateMenu(thisAlbum);
			TopFunctions.showAlbum("refreshSubalbums");
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.sortAlbumsByName = function(ev, thisAlbum) {
		if (
			! thisAlbum.albumNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("albumNameSortRequested", true);
			f.setBooleanCookie("albumReverseSortRequested", thisAlbum.albumReverseSort);
			util.sortAlbumsMedia(thisAlbum);
			f.updateMenu(thisAlbum);
			TopFunctions.showAlbum("refreshSubalbums");
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.sortAlbumsReverse = function(ev, thisAlbum) {
		if (
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("albumReverseSortRequested", ! thisAlbum.albumReverseSort);
			util.sortAlbumsMedia(thisAlbum);
			f.updateMenu(thisAlbum);
			TopFunctions.showAlbum("refreshSubalbums");
			// util.focusSearchField();
		}
		return false;
	};
	// media

	TopFunctions.sortMediaByDate = function (ev, thisAlbum) {
		if (
			thisAlbum.mediaNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("mediaNameSortRequested", false);
			f.setBooleanCookie("mediaReverseSortRequested", thisAlbum.mediaReverseSort);
			util.sortAlbumsMedia(thisAlbum);
			f.updateMenu(thisAlbum);
			if (thisAlbum.cacheBase == currentAlbum.cacheBase)
				TopFunctions.showAlbum("refreshMedia");
			else
				map.updatePopup(MapFunctions.titleWrapper1 + map.generateHtmlForImages(thisAlbum) + MapFunctions.titleWrapper2);
			// util.focusSearchField();
		}
		return false;
	};


	TopFunctions.sortMediaByName = function(ev, thisAlbum) {
		if (
			! thisAlbum.mediaNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("mediaNameSortRequested", true);
			f.setBooleanCookie("mediaReverseSortRequested", thisAlbum.mediaReverseSort);
			util.sortAlbumsMedia(thisAlbum);
			f.updateMenu(thisAlbum);
			if (thisAlbum.cacheBase == currentAlbum.cacheBase)
				TopFunctions.showAlbum("refreshMedia");
			else
				map.updatePopup(MapFunctions.titleWrapper1 + map.generateHtmlForImages(thisAlbum) + MapFunctions.titleWrapper2);
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.sortMediaReverse = function(ev, thisAlbum) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			f.setBooleanCookie("mediaReverseSortRequested", ! f.getBooleanCookie("mediaReverseSortRequested"));

			util.sortAlbumsMedia(thisAlbum);
			f.updateMenu(thisAlbum);
			if (thisAlbum.cacheBase == currentAlbum.cacheBase)
				TopFunctions.showAlbum("refreshMedia");
			else
				map.updatePopup(MapFunctions.titleWrapper1 + map.generateHtmlForImages(thisAlbum) + MapFunctions.titleWrapper2);
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleTitle = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.hide_title = ! Options.hide_title;
			f.setBooleanCookie("hide_title", Options.hide_title);
			f.updateMenu();
			if (Options.hide_title) {
				$(".title").addClass("hidden-by-option");
			} else {
				$(".title").removeClass("hidden-by-option");
				TopFunctions.showAlbum("refreshMedia");
			}
			if (currentMedia !== null) {
				TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
				if (nextMedia !== null)
					TopFunctions.showMedia(currentAlbum, nextMedia, 'right');
				if (prevMedia !== null)
					TopFunctions.showMedia(currentAlbum, prevMedia, 'left');
			} else
				TopFunctions.showAlbum(false);
			util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleCaption = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.hide_caption = ! Options.hide_caption;
			f.setBooleanCookie("hide_caption", Options.hide_caption);
			f.updateMenu();
			if (Options.hide_caption) {
				$("#caption").addClass("hidden-by-option");
			} else {
				$("#caption").removeClass("hidden-by-option");
				TopFunctions.showAlbum("refreshMedia");
			}
			if (currentMedia !== null) {
				TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
				if (nextMedia !== null)
					TopFunctions.showMedia(currentAlbum, nextMedia, 'right');
				if (prevMedia !== null)
					TopFunctions.showMedia(currentAlbum, prevMedia, 'left');
			} else
				TopFunctions.showAlbum(false);
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleBottomThumbnails = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.hide_bottom_thumbnails = ! Options.hide_bottom_thumbnails;
			f.setBooleanCookie("hide_bottom_thumbnails", Options.hide_bottom_thumbnails);
			f.updateMenu();
			if (Options.hide_bottom_thumbnails) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}
			TopFunctions.showAlbum("refreshMedia");
			if (currentMedia !== null) {
				TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
				TopFunctions.showMedia(currentAlbum, nextMedia, 'right');
				TopFunctions.showMedia(currentAlbum, prevMedia, 'left');
			} else
				TopFunctions.showAlbum(false);
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleSlideMode = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.albums_slide_style = ! Options.albums_slide_style;
			f.setBooleanCookie("albums_slide_style", Options.albums_slide_style);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleSpacing = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if (Options.spacing)
				Options.spacing = 0;
			else
				Options.spacing = Options.spacingToggle;
			f.setCookie("spacing", Options.spacing);
			f.updateMenu();
			if (currentAlbum.subalbums.length > 1 && util.imagesAndVideosTotal(currentAlbum.numMedia) > 1)
				TopFunctions.showAlbum("refreshBoth");
			else if (currentAlbum.subalbums.length > 1)
				TopFunctions.showAlbum("refreshSubalbums");
			else if (util.imagesAndVideosTotal(currentAlbum.numMedia) > 1)
				TopFunctions.showAlbum("refreshMedia");

			if ($('.leaflet-popup').html())
				map.updatePopup(MapFunctions.titleWrapper1 + map.generateHtmlForImages(MapFunctions.mapAlbum) + MapFunctions.titleWrapper2);
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumNames = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_album_names_below_thumbs = ! Options.show_album_names_below_thumbs;
			f.setBooleanCookie("show_album_names_below_thumbs", Options.show_album_names_below_thumbs);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaCount = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_album_media_count = ! Options.show_album_media_count;
			f.setBooleanCookie("show_album_media_count", Options.show_album_media_count);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaNames = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_media_names_below_thumbs = ! Options.show_media_names_below_thumbs;
			f.setBooleanCookie("show_media_names_below_thumbs", Options.show_media_names_below_thumbs);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumsSquare = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.album_thumb_type = Options.album_thumb_type == "square" ? "fit" : "square";
			f.setCookie("album_thumb_type", Options.album_thumb_type);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaSquare = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.media_thumb_type = Options.media_thumb_type == "square" ? "fixed_height" : "square";
			f.setCookie("media_thumb_type", Options.media_thumb_type);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			if ($('.leaflet-popup').html())
				map.updatePopup(MapFunctions.titleWrapper1 + map.generateHtmlForImages(MapFunctions.mapAlbum) + MapFunctions.titleWrapper2);
			// util.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleBigAlbumsShow = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if ($("#error-too-many-images").is(":visible")) {
				$("#error-too-many-images").hide();
			}
			$("#loading").show();
			Options.show_big_virtual_folders = ! Options.show_big_virtual_folders;
			if (Options.show_big_virtual_folders)
				$("#show-them:hover").css("color", "").css("cursor", "");
			else
				$("#show-them:hover").css("color", "inherit").css("cursor", "auto");
			f.setBooleanCookie("show_big_virtual_folders", Options.show_big_virtual_folders);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			// util.focusSearchField();
		}
		return false;
	};


	TopFunctions.showAlbum = function(populate) {
		function insertRandomImage(randomSubAlbum, index, subalbum) {
			var titleName, randomMediaLink, goTo, humanGeonames;
			var randomMedia = randomSubAlbum.media[index];
			var id = phFl.hashCode(subalbum.cacheBase);
			var mediaSrc = util.chooseThumbnail(randomSubAlbum, randomMedia, Options.album_thumb_size);

			$("#downloading-media").hide();

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
			} else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
				humanGeonames = util.pathJoin([Options.by_gps_string, randomMedia.geoname.country_name, randomMedia.geoname.region_name, randomMedia.geoname.place_name]);
				titleName = util.pathJoin([humanGeonames, randomMedia.name]);
			} else if (util.isSearchCacheBase(currentAlbum.cacheBase)) {
				titleName = util.pathJoin([randomMedia.albumName, randomMedia.name]);
			} else {
				titleName = util.pathJoin([randomMedia.albumName, randomMedia.name]);
			}
			randomMediaLink = phFl.encodeHash(randomSubAlbum, randomMedia);

			titleName = titleName.substr(titleName.indexOf('/') + 1);
			goTo = util._t(".go-to") + " " + titleName;
			$("#" + id + " .album-button a").attr("href", randomMediaLink);
			$("#" + id + " img.album-button-random-media-link").attr("title", goTo).attr("alt", goTo);
			$("#" + id + " img.thumbnail").attr("title", titleName).attr("alt", titleName);
			$("#" + id + " img.thumbnail").attr("data-src", encodeURI(mediaSrc));
			$("#" + id + " img.thumbnail").css("width", thumbWidth).css("height", thumbHeight);

			$(function() {
				$("img.lazyload-album-" + id).Lazy(
					{
						chainable: false,
						threshold: Options.media_thumb_size,
						bind: 'event',
						removeAttribute: true
					}
				);
			});

			container = $("#" + phFl.hashCode(subalbum.cacheBase));
			// add the click event
			container.off('click').on(
			// container.off('click').css("cursor", "pointer").on(
				'click',
				function() {
					var subfolderHash;
					if (util.isSearchCacheBase(currentAlbum.cacheBase))
						subfolderHash = phFl.encodeHash(subalbum, null, subalbum.cacheBase, currentAlbum.cacheBase);
					else {
						if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
							subfolderHash = phFl.encodeHash(subalbum.cacheBase, null, savedSearchSubAlbumHash, savedSearchAlbumHash);
						else
							subfolderHash = phFl.encodeHash(subalbum, null);
					}

					window.location.href = subfolderHash;
				}
			);
		}
		// end of insertRandomImage function


		var i, imageLink, linkContainer, container, image, media, thumbsElement, subalbumsElement, thumbHash, thumbnailSize;
		var width, height, thumbWidth, thumbHeight, imageString, imgString, img, calculatedWidth, calculatedHeight, populateMedia;
		var albumViewWidth, correctedAlbumThumbSize = Options.album_thumb_size;
		var mediaWidth, mediaHeight, slideBorder = 0, scrollBarWidth = 0, buttonBorder = 0, margin, imgTitle;
		var tooBig = false, isVirtualAlbum = false;
		var mapLinkIcon, id, ithMedia;
		var caption, captionColor, captionHtml, captionHeight, captionFontSize, buttonAndCaptionHeight, albumButtonAndCaptionHtml, heightfactor;
		var folderArray, folder, folderName, folderTitle;

		numSubAlbumsReady = 0;

		var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

		if (Options.albums_slide_style)
			slideBorder = 3;

		// When there is both a media and an album, we display the media's caption; else it's the album's one
		if (currentMedia === null) {
			TopFunctions.setCaption(currentAlbum.title, currentAlbum.description);
			TopFunctions.positionCaption('album');
		} else {
			TopFunctions.setCaption(currentMedia.metadata.title, currentMedia.metadata.description);
			TopFunctions.positionCaption('media');
		}

		if (currentMedia === null)
			$("#album-view").off('mousewheel');
		if (currentMedia === null && previousMedia === null)
			$("html, body").stop().animate({ scrollTop: 0 }, "slow");
		if (populate) {
			thumbnailSize = Options.media_thumb_size;

			populateMedia = populate;
			isVirtualAlbum = (
				util.isByDateCacheBase(currentAlbum.cacheBase) ||
				util.isByGpsCacheBase(currentAlbum.cacheBase) ||
				util.isSearchCacheBase(currentAlbum.cacheBase) ||
				util.isMapCacheBase(currentAlbum.cacheBase)
			);
			tooBig = currentAlbum.path.split("/").length < 4 && util.imagesAndVideosTotal(currentAlbum.numMedia) > Options.big_virtual_folders_threshold;
			if (populateMedia === true && isVirtualAlbum)
				populateMedia = populateMedia && (! tooBig || Options.show_big_virtual_folders);

			if (isVirtualAlbum && tooBig && ! Options.show_big_virtual_folders) {
				$("#thumbs").empty();
				var tooManyImagesText =
					"<span id='too-many-images'>" + util._t('#too-many-images') + "</span>: " + util.imagesAndVideosTotal(currentAlbum.numMedia) +
					", <span id='too-many-images-limit-is'>" + util._t('#too-many-images-limit-is') + "</span> " + Options.big_virtual_folders_threshold + "</span>, " +
					"<span id='show-them'>" + util._t("#show-them") + "</span>";
				$("#error-too-many-images").html(tooManyImagesText).show();
				if (! $("ul#right-menu").hasClass("expand")) {
					$("#show-them:hover").css("color", "").css("cursor", "");
					$("#show-them").on(
						"click",
						function() {
							$("ul#right-menu").addClass("expand");
						}
					);
				} else {
					$("#show-them:hover").css("color", "inherit").css("cursor", "auto");
				}
			} else if (
				populateMedia === true ||
				populateMedia == "refreshMedia" ||
				populateMedia == "refreshBoth"
			) {
				media = [];

				//
				// media loop
				//
				for (i = 0; i < util.imagesAndVideosTotal(currentAlbum.numMedia); ++i) {
					ithMedia = currentAlbum.media[i];

					width = ithMedia.metadata.size[0];
					height = ithMedia.metadata.size[1];
					thumbHash = util.chooseThumbnail(currentAlbum, ithMedia, thumbnailSize);

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
					imgTitle = util.pathJoin([ithMedia.albumName, ithMedia.name]);
					calculatedHeight = Options.media_thumb_size;

					var albumViewPadding = $("#album-view").css("padding");
					if (! albumViewPadding)
						albumViewPadding = 0;
					else
						albumViewPadding = parseInt(albumViewPadding);
					calculatedWidth = Math.min(
						calculatedWidth,
						$(window).innerWidth() - 2 * albumViewPadding
					);
					calculatedHeight = calculatedWidth / thumbWidth * thumbHeight;

					mapLinkIcon = "";
					if (util.hasGpsData(ithMedia)) {
						mapLinkIcon =
							"<a id='media-map-link-" + i + "'>" +
								"<img " +
									// "id='media-map-link-" + i + "' " +
									"class='thumbnail-map-link' " +
									"title='" + util.escapeSingleQuotes(util._t("#show-on-map")) + "' " +
									"alt='" + util.escapeSingleQuotes(util._t("#show-on-map")) + "' " +
									"height='20px' " +
									"src='img/ic_place_white_24dp_2x.png'" +
								">" +
							"</a>";
					}

					imgString = "<img " +
									"data-src='" + encodeURI(thumbHash) + "' " +
									"src='img/image-placeholder.png' " +
									"class='thumbnail lazyload-media" + "' " +
									"height='" + thumbHeight + "' " +
									"width='" + thumbWidth + "' " +
									"style='" +
										 "width: " + calculatedWidth + "px; " +
										 "height: " + calculatedHeight + "px;" +
										 "'" +
								"/>";
					img = $(imgString);
					img.attr("title", imgTitle).attr("alt", util.trimExtension(ithMedia.name));

					imageString =
						"<div class='thumb-and-caption-container' style='" +
									"width: " + calculatedWidth + "px; " +
						"'>" +
							"<div class='thumb-container' " + "style='" +
									// "width: " + calculatedWidth + "px; " +
									"width: " + calculatedWidth + "px; " +
									"height: " + calculatedHeight + "px;" +
							"'>" +
							mapLinkIcon +
							"<span class='helper'></span>" +
							img.prop("outerHTML") +
							"</div>" +
							"<div class='media-caption'>" +
								"<span>";
					imageString +=
									ithMedia.name.replace(/ /g, "</span> <span style='white-space: nowrap;'>");
					imageString +=
								"</span>";
					imageString +=
							"</div>" +
						"</div>";
					image = $(imageString);

					image.get(0).media = ithMedia;
					if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
						mediaHash = phFl.encodeHash(currentAlbum, ithMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
					else
						mediaHash = phFl.encodeHash(currentAlbum, ithMedia);

					imageLink = $("<a id='link-" + ithMedia.foldersCacheBase + "-" + ithMedia.cacheBase + "'></a>");
					imageLink.append(image);
					media.push(imageLink);

					imageLink.off('click').on(
					// imageLink.off('click').css("cursor", "pointer").on(
						'click',
						{hash: mediaHash},
						function(ev) {
							window.location.href = ev.data.hash;
						}
					);

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
				for (i = 0; i < util.imagesAndVideosTotal(currentAlbum.numMedia); ++i) {
					$("#media-map-link-" + i).off('click').on(
						'click',
						{media: ithMedia, album: currentAlbum, clickedSelector: "#media-map-link-" + i},
						function(ev, from) {
							selectorClickedToOpenTheMap = ev.data.clickedSelector;
							ev.stopPropagation();
							TopFunctions.generateMapFromMedia(ev, from);
						}
					);
				}
			}

			if (currentMedia === null) {
				if (fromEscKey && firstEscKey) {
					// respect the existing mediaLink (you cannot do it more than once)
					firstEscKey = false;
				} else {
					// reset mediaLink
					if (util.imagesAndVideosTotal(currentAlbum.numMedia))
						mediaLink = phFl.encodeHash(currentAlbum, currentAlbum.media[0], savedSearchSubAlbumHash, savedSearchAlbumHash);
					else
						mediaLink = "#!/" + currentAlbum.cacheBase;

					firstEscKey = true;
				}

				upLink = util.upHash();

				if (
					populate === true ||
					populate == "refreshSubalbums" ||
					populateMedia == "refreshBoth"
				) {
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
					// The promise in order to know when everything has come to its end
					var subalbumsPromises = [];
					for (i = 0; i < currentAlbum.subalbums.length; ++i) {
						let subalbumPromise = new Promise(
							function(resolve_subalbumPromise) {
								var ithSubalbum = currentAlbum.subalbums[i];

								// generate the subalbum caption
								if (util.isByDateCacheBase(currentAlbum.cacheBase)) {
									folderArray = ithSubalbum.cacheBase.split(Options.cache_folder_separator);
									folderName = "";
									if (folderArray.length == 2) {
										folderName += parseInt(folderArray[1]);
									} else if (folderArray.length == 3)
										folderName += " " + util._t("#month-" + folderArray[2]);
									else if (folderArray.length == 4)
										folderName += util._t("#day") + " " + parseInt(folderArray[3]);
										folderTitle = folderName;
								} else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
									folderName = '';
									folderTitle = '';
									if (ithSubalbum.name === '')
										folderName = util._t('.not-specified');
									else if (ithSubalbum.hasOwnProperty('altName'))
										folderName = util.transformAltPlaceName(ithSubalbum.altName);
									else
										folderName = ithSubalbum.name;
									folderTitle = util._t('#place-icon-title') + folderName;

								}
								else {
									folderName = ithSubalbum.path;
									folderTitle = folderName;
								}

								folder = "<span class='folder-name'>" +
													folderName;
								if (ithSubalbum.hasOwnProperty("numPositionsInTree") && ithSubalbum.numPositionsInTree)
									folder += "<a id='subalbum-map-link-" + i + "' >" +
													"<img " +
														"class='title-img' " +
														"title='" + util.escapeSingleQuotes(folderTitle) + "' " +
														"alt='" + util.escapeSingleQuotes(folderTitle) + "' " +
														"height='15px' " +
														"src='img/ic_place_white_24dp_2x.png' " +
													"/>" +
												"</a>";
								folder += "</span>";

								// // get the value in style sheet (element with that class doesn't exist in DOM)
								// var $el = $('<div class="album-caption"></div>');
								// $($el).appendTo('body');
								// $($el).remove();
								captionColor = Options.albums_slide_style ? Options.slide_album_caption_color : Options.album_caption_color;

								captionHtml = "<div class='album-caption";
								if (util.isFolderCacheBase(currentAlbum.cacheBase) && ! Options.show_album_names_below_thumbs)
									captionHtml += " hidden";
								captionHtml += "' id='album-caption-" + phFl.hashCode(ithSubalbum.cacheBase) + "' " +
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
								captionHtml +=		util.imagesAndVideosTotal(ithSubalbum.numMediaInSubTree);
								captionHtml +=		" <span class='title-media'>";
								captionHtml +=		util._t(".title-media");
								captionHtml +=		"</span>";
								captionHtml += ")</div>";
								caption = $(captionHtml);


								// a dot could be present in a cache base, making $("#" + cacheBase) fail, beware...
								id = phFl.hashCode(ithSubalbum.cacheBase);
								albumButtonAndCaptionHtml =
									"<div id='" + id + "' " +
										"class='album-button-and-caption";
								if (Options.albums_slide_style)
									albumButtonAndCaptionHtml += " slide";
								albumButtonAndCaptionHtml +=
										"' " +
										"style='" +
											"margin-right: " + Options.spacing + "px; " +
											"margin-bottom: " + Options.spacing + "px; " +
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
										"<img src='img/image-placeholder.png' class='thumbnail lazyload-album-" + id + "'>" +
									"</div>"
								);
								linkContainer.append(image);
								linkContainer.append(caption);

								subalbumsElement.append(linkContainer);

								//////////////////// begin anonymous function /////////////////////
								//      })(ithSubalbum, image, container, id);
								(function(theSubalbum, theImage) {
									// function(subalbum, error)
									var promise = phFl.pickRandomMedia(
										theSubalbum,
										function error() {
											currentAlbum.subalbums.splice(currentAlbum.subalbums.indexOf(theSubalbum), 1);
											theImage.parent().remove();
											resolve_subalbumPromise();
											// subalbums.splice(subalbums.indexOf(theLink), 1);
										}
									);
									promise.then(
										function([album, index]) {
											insertRandomImage(album, index, theSubalbum);
											resolve_subalbumPromise();
										},
										function(album) {
											console.trace();
										}
									);
								})(ithSubalbum, image);
								//////////////////// end anonymous function /////////////////////
							}
						);
						subalbumsPromises.push(subalbumPromise);
					}

					Promise.all(subalbumsPromises).then(
						function allRandomImagesGot() {
							// we can run the function that prepare the stuffs for sharing
							f.socialButtons();

							// check for overflow in album-caption class in order to adapt album caption height to the string length
							// when diving into search subalbum, the whole album path is showed and it can be lengthy
							if (Options.show_album_names_below_thumbs) {
								var maxHeight = null;
								$('.album-caption').each(
									function() {
										var thisHeight = $(this)[0].scrollHeight;
										maxHeight = (thisHeight > maxHeight) ? thisHeight : maxHeight;
									}
								);
								var difference = maxHeight - parseFloat($(".album-caption").css("height"));
								$(".album-button-and-caption").css("height", (parseInt($(".album-button-and-caption").css("height")) + difference) + 'px');
								$(".album-caption").css("height", maxHeight + 'px');
							}
						},
						function() {
							console.trace();
						}
					);

					for (i = 0; i < currentAlbum.subalbums.length; ++i) {
						let ithSubalbum = currentAlbum.subalbums[i];
						if (ithSubalbum.hasOwnProperty("numPositionsInTree") && ithSubalbum.numPositionsInTree) {
							$("#subalbum-map-link-" + i).off('click').on(
								'click',
								{subalbum: ithSubalbum, clickedSelector: "#subalbum-map-link-" + i},
								function(ev, from) {
									selectorClickedToOpenTheMap = ev.data.clickedSelector;
									TopFunctions.generateMapFromSubalbum(ev, from);
								}
							);
						}
					}

					$("#subalbums").show();
					$("#album-view").removeClass("media-view-container");

					if (Options.albums_slide_style)
						$(".album-button").css("background-color", Options.album_button_background_color);
					else
						$(".album-button").css("border", "none");
				}
			}

			$("#loading").hide();
		}

		if (populateMedia) {
			if (! $("#album-view").hasClass("media-view-container"))
				$("img.lazyload-media").Lazy(
					{
						// threshold: 2 * Options.media_thumb_size,
						appendScroll: $(window)
					}
				);
				$("#album-view.media-view-container img.lazyload-media").Lazy(
					{
						// threshold: 2 * Options.media_thumb_size,
						appendScroll: $("#album-view")
					}
				);
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
			$("#album-view, #album-view #subalbums").removeClass("hidden");

			$("#powered-by").show();

			$("body").off('mousewheel').on('mousewheel', TopFunctions.scrollAlbum);
		} else {
			// currentMedia !== null
			$("#media-view").removeClass("hidden");

			if (util.imagesAndVideosTotal(currentAlbum.numMedia) == 1)
				$("#album-view").addClass("hidden");
			else
				$("#album-view, #album-view #subalbums").removeClass("hidden");
			$("#powered-by").hide();

			$(".media-view-container").off('mousewheel').on('mousewheel', TopFunctions.scrollBottomThumbs);
		}

		f.setOptions();

		TopFunctions.bindSortEvents(currentAlbum);
		TopFunctions.bindChangeBrowsingEvents(currentAlbum);

		// we are in showAlbum
		// activate the map and the popup when coming back from a map album
		if (
			previousAlbum !== null &&
			util.isMapCacheBase(previousAlbum.cacheBase) && previousMedia === null &&
			fromEscKey ||
			mapRefreshType == "refresh"
		)
			$(selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);

		if (! $("#album-view").hasClass("hidden"))
			setTimeout(f.scrollToThumb, 1);

		if (! $("#album-view").hasClass("media-view-container")) {
			$(window).off("resize").on(
				"resize",
				function () {
					var previousWindowWidth = windowWidth;
					windowWidth = $(window).outerWidth();
					windowHeight = $(window).outerHeight();
					if (windowWidth == previousWindowWidth)
						// avoid considering a resize when the mobile browser shows/hides the location bar
						return;

					$("#loading").show();

					TopFunctions.showAlbum("refreshSubalbums");

					var isPopup = $('.leaflet-popup').html() ? true : false;
					var isMap = $('#mapdiv').html() ? true : false;
					if (isMap) {
						// the map must be generated again including the points that only carry protected content
						mapRefreshType = "resize";

						if (isPopup) {
							popupRefreshType = "mapAlbum";
							$('.leaflet-popup-close-button')[0].click();
						} else {
							popupRefreshType = "none";
						}

						// close the map and reopen it
						$('.modal-close')[0].click();
						$(selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
					}
				}
			);
		}
	};

	TopFunctions.goFullscreen = function(e) {
		if (Modernizr.fullscreen) {
			e.preventDefault();
			$("#album-view").addClass('hidden');
			$("#media-view-container").fullScreen({
				callback: function(isFullscreen) {
					$("#loading").hide();
					fullScreenStatus = isFullscreen;
					$(".enter-fullscreen").toggle();
					$(".exit-fullscreen").toggle();
					TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
				}
			});
		} else {
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
			TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
		}
	};

	TopFunctions.goFullscreenFromMouse = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			TopFunctions.goFullscreen(ev);
			return false;
		}
	};

	TopFunctions.generateMapFromMedia = function(ev, from) {

		if (util.hasGpsData(ev.data.media)) {
			ev.preventDefault();
			var point =
				{
					'lng': parseFloat(ev.data.media.metadata.longitude),
					'lat' : parseFloat(ev.data.media.metadata.latitude),
					'mediaNameList': [{
						'name': util.pathJoin([ev.data.media.albumName, ev.data.media.name]),
						'cacheBase': ev.data.media.cacheBase,
						'albumCacheBase': ev.data.album.cacheBase,
						'foldersCacheBase': ev.data.media.foldersCacheBase
					}]
				};
			TopFunctions.generateMap(ev, [point], from);
		}
	};

	TopFunctions.generateMapFromSubalbum = function(ev, from) {

		var subalbumPromise = phFl.getAlbum(ev.data.subalbum.cacheBase, util.errorThenGoUp, {"getMedia": false, "getPositions": true});
		subalbumPromise.then(
			function(subalbum) {
				if (subalbum.positionsAndMediaInTree.length) {
					ev.stopPropagation();
					ev.preventDefault();
					TopFunctions.generateMap(ev, subalbum.positionsAndMediaInTree, from);
				} else {
					$("#warning-no-geolocated-media").stop().fadeIn(200);
					$("#warning-no-geolocated-media").fadeOut(3000);
				}
			},
			function() {
				console.trace();
			}
		);
	};

	TopFunctions.generateMapFromDefaults = function(ev, from) {
		var pointList;
		if (currentMedia !== null && util.hasGpsData(currentMedia)) {
			pointList = [
				{
					'lng': parseFloat(currentMedia.metadata.longitude),
					'lat' : parseFloat(currentMedia.metadata.latitude),
					'mediaNameList': [{
						'name': util.pathJoin([currentMedia.albumName, currentMedia.name]),
						'cacheBase': currentMedia.cacheBase,
						'albumCacheBase': currentAlbum.cacheBase,
						'foldersCacheBase': currentMedia.foldersCacheBase
					}]
				}
			];
		} else if (currentAlbum.positionsAndMediaInTree.length) {
			pointList = currentAlbum.positionsAndMediaInTree;
		}

		if (pointList.length > 0)
			TopFunctions.generateMap(ev, pointList, from);
	};

	TopFunctions.generateMap = function(ev, pointList, from) {
		// pointList is an array of uniq points with a list of the media geolocated there

		var i;
		MapFunctions.titleWrapper1 =
			'<div id="popup-photo-count" style="max-width: ' + MapFunctions.maxWidthForPopupContent + 'px;">' +
				'<span id="popup-photo-count-number"></span> ' + util._t("#images") +
			'</div>' +
			'<div id="popup-images-wrapper">';
		MapFunctions.titleWrapper2 = '</div>';

		$("#my-modal.modal").css("display", "block");
		if (isMobile.any()) {
			$("#my-modal .modal-content").css("width", (windowWidth - 12).toString() + "px").css("height", (windowHeight - 12).toString() + "px").css("padding", "5px");
			$("#my-modal.modal").css("top", "0").css("padding-top", "0");
			$("#my-modal.modal-close").css("top", "22px").css("right", "22px");
		} else {
			$("#my-modal .modal-content").css("width", (windowWidth - 55).toString() + "px").css("height", (windowHeight - 60).toString() + "px");
		}

		if(pointList) {
			// maximum OSM zoom is 19
			const maxOSMZoom = 19;
			// calculate the center
			var center = MapFunctions.averagePosition(pointList);

			var br = '<br />';
			// var thumbAndCaptionHeight = 0;

			// default zoom is used for single media or media list with one point
			var maxXDistance = Options.photo_map_size;
			var maxYDistance = Options.photo_map_size;
			if (pointList.length > 1) {
				// calculate the maximum distance from the center
				// it's needed in order to calculate the zoom level
				maxXDistance = 0;
				maxYDistance = 0;
				for (i = 0; i < pointList.length; ++i) {
					maxXDistance = Math.max(maxXDistance, Math.abs(util.xDistanceBetweenCoordinatePoints(center, pointList[i])));
					maxYDistance = Math.max(maxYDistance, Math.abs(util.yDistanceBetweenCoordinatePoints(center, pointList[i])));
				}
			}
			// calculate the zoom level needed in order to have all the points inside the map
			// see https://wiki.openstreetmap.org/wiki/Zoom_levels
			var earthCircumference = 40075016;
			var xZoom = Math.min(maxOSMZoom, parseInt(Math.log2((windowWidth / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxXDistance)));
			var yZoom = Math.min(maxOSMZoom, parseInt(Math.log2((windowHeight / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxYDistance)));
			var zoom = Math.min(xZoom, yZoom);

			$("#loading").hide();

			$('.map-container').show();
			$(".map-container").css("max-height", $(window).height() - 54).css("max-width", $(window).width() - 54).css("right", "44px").css("top", "24px");
			$(".map-container").css("display", "grid");

				var markers = [];
			// initialize the markers clusters
			var pruneCluster = new PruneClusterForLeaflet(150, 70);
			PruneCluster.Cluster.ENABLE_MARKERS_LIST = true;

			// modify the prunecluster so that the click can be managed in order to show the photo popup
			pruneCluster.BuildLeafletCluster = function (cluster, position) {
				var m = new L.Marker(position, {
					icon: pruneCluster.BuildLeafletClusterIcon(cluster)
				});
				m._leafletClusterBounds = cluster.bounds;
				m.on(
					'click',
					function(ev) {
						var updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, pruneCluster.Cluster._clusters);
						updatePromise.then(
							TopFunctions.prepareAndDoPopupUpdate,
							function() {
								console.trace();
							}
						);
					}
				);
				return m;
			};

			// modify the cluster marker so that it shows the number of photos rather than the number of clusters
			pruneCluster.BuildLeafletClusterIcon = function (cluster) {
				var c = 'prunecluster prunecluster-';
				var iconSize = 38;
				var maxPopulation = pruneCluster.Cluster.GetPopulation();
				var markers = cluster.GetClusterMarkers();
				var population = 0;
				// count the number of photos in a cluster
				for(var i = 0; i < markers.length; i ++) {
					population += markers[i].data.mediaNameList.length;
				}

				if (population < Math.max(10, maxPopulation * 0.01)) {
					c += 'small';
				}
				else if (population < Math.max(100, maxPopulation * 0.05)) {
					c += 'medium';
					iconSize = 40;
				}
				else {
					c += 'large';
					iconSize = 44;
				}
				return new L.DivIcon({
					html: "<div><span>" + population + "</span></div>",
					className: c,
					iconSize: L.point(iconSize, iconSize)
				});
			};

			if (mapIsInitialized)
				MapFunctions.mymap.remove();

			MapFunctions.mymap = L.map('mapdiv', {'closePopupOnClick': false}).setView([center.lat, center.lng], zoom);
			$(".map-container > div").css("min-height", (windowHeight -50).toString() + "px");
			mapIsInitialized = true;

			L.tileLayer(
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
					maxZoom: 21,
					maxNativeZoom: maxOSMZoom,
					id: 'mapbox.streets'
				}
			).addTo(MapFunctions.mymap);
			L.control.scale().addTo(MapFunctions.mymap);

			var cacheBases;
			for (var iPoint = 0; iPoint < pointList.length; iPoint ++) {
				cacheBases = '';
						for(var iPhoto = 0; iPhoto < pointList[iPoint].mediaNameList.length; iPhoto ++) {
							// we must get the media corresponding to the name in the point
				if (cacheBases)
					cacheBases += br;
				cacheBases += pointList[iPoint].mediaNameList[iPhoto].cacheBase;
				}

				markers[iPoint] = new PruneCluster.Marker(
					pointList[iPoint].lat,
					pointList[iPoint].lng,
					{
						icon:	new L.NumberedDivIcon({number: pointList[iPoint].mediaNameList.length})
					}
				);
				pruneCluster.RegisterMarker(markers[iPoint]);
				markers[iPoint].data.tooltip = cacheBases;
				markers[iPoint].data.mediaNameList = pointList[iPoint].mediaNameList;
				markers[iPoint].weight = pointList[iPoint].mediaNameList.length;
			}

			MapFunctions.mymap.addLayer(pruneCluster);

			/**
			* Add a click handler to the map to render the popup.
			*/
			MapFunctions.mymap.on(
				'click',
				function(ev) {
					var updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, pruneCluster.Cluster._clusters);
					updatePromise.then(
						TopFunctions.prepareAndDoPopupUpdate,
						function() {
							console.trace();
						}
					);

				}
			);

			if (typeof from !== "undefined") {
				if (popupRefreshType == "previousAlbum")
					TopFunctions.prepareAndDoPopupUpdate();
				else if (popupRefreshType == "mapAlbum") {
					function playClickElement(clickHistory, iClick) {
						var clickHistoryElement = clickHistory[iClick];
						var promise = new Promise(
							function(resolve_playClickElement) {
								MapFunctions.mymap.setView(clickHistoryElement.center, clickHistoryElement.zoom, {animate: false});
								ev = {
									"latlng": clickHistoryElement.latlng,
									"originalEvent": {
										"shiftKey": clickHistoryElement.shiftKey,
										"ctrlKey": clickHistoryElement.ctrlKey,
									}
								};
								var updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, pruneCluster.Cluster._clusters, false);
								updatePromise.then(
									resolve_playClickElement,
									function() {
										console.trace();
									}
								);

							}
						);

						promise.then(
							function() {
								if (iClick < clickHistory.length - 1)
									playClickElement(clickHistory, iClick + 1);
								else
									TopFunctions.prepareAndDoPopupUpdate();
							},
							function(album) {
								console.trace();
							}
						);
					}

					var clickHistory = MapFunctions.mapAlbum.clickHistory;
					delete MapFunctions.mapAlbum;
					playClickElement(clickHistory, 0);

				}
			}
		}
	};

	TopFunctions.prepareAndDoPopupUpdate = function() {
		MapFunctions.calculatePopupSizes();

		if (MapFunctions.popup) {
			MapFunctions.popup.remove();
			$(".leaflet-popup").remove();
		}
		MapFunctions.popup = L.popup(
			{
				maxWidth: MapFunctions.maxWidthForPopupContent,
				maxHeight: MapFunctions.maxHeightForPopupContent,
				autoPan: false
			}
		).setContent(MapFunctions.titleWrapper1 + MapFunctions.titleWrapper2)
		.setLatLng(MapFunctions.averagePosition(MapFunctions.mapAlbum.positionsAndMediaInTree))
		.openOn(MapFunctions.mymap);

		map.addPopupMover();

		var promise = phFl.endPreparingAlbumAndKeepOn(
			MapFunctions.mapAlbum,
			null,
			null
		);
		promise.then(
			function() {
				map.updatePopup(MapFunctions.titleWrapper1 + map.generateHtmlForImages(MapFunctions.mapAlbum) + MapFunctions.titleWrapper2);
				$("#loading").hide();
			}
		);
	};

	TopFunctions.updateMapAlbumOnMapClick = function(evt, clusters, updateMapAlbum = true) {

		return new Promise(
			function(resolve_updateMapAlbumOnMapClick, reject_updateMapAlbumOnMapClick) {
				var i;
				var clickHistoryElement;

				$("#loading").show();

				if (evt !== null && typeof evt.latlng !== "undefined") {
					clickHistoryElement = {
							latlng: evt.latlng,
							shiftKey: evt.originalEvent.shiftKey,
							ctrlKey: evt.originalEvent.ctrlKey,
							zoom: MapFunctions.mymap.getZoom(),
							center: MapFunctions.mymap.getCenter()
					};
				}

				var clickedPosition = evt.latlng;

				// reset the thumbnails if not shift- nor ctrl-clicking
				if (! evt.originalEvent.shiftKey && ! evt.originalEvent.ctrlKey) {
					$("#popup-images-wrapper").html("");
				}

				// decide what point is to be used: the nearest to the clicked position
				var minimumDistance = false, newMinimumDistance, distance, index, iMediaPosition;
				for(i = 0; i < clusters.length; i ++) {
					distance = Math.abs(
						util.distanceBetweenCoordinatePoints(
							{lng: clickedPosition.lng, lat: clickedPosition.lat},
							{lng: clusters[i].averagePosition.lng, lat: clusters[i].averagePosition.lat}
						)
					);
					// console.log(i, distance);
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
				var currentCluster = clusters[index];
				currentCluster.data.mediaNameList = [];

				// build the cluster's media name list
				var positionsAndCounts = [];
				for(i = 0; i < currentCluster._clusterMarkers.length; i ++) {
					currentCluster.data.mediaNameList = currentCluster.data.mediaNameList.concat(currentCluster._clusterMarkers[i].data.mediaNameList);
					positionsAndCounts.push(
						{
							"lat": currentCluster._clusterMarkers[i].position.lat,
							"lng": currentCluster._clusterMarkers[i].position.lng,
							"mediaNameList": currentCluster._clusterMarkers[i].data.mediaNameList,
							"count": currentCluster._clusterMarkers[i].data.mediaNameList.length
						}
					);
				}

				var indexPositions, imageLoadPromise, mediaNameListElement;
				if (evt.originalEvent.ctrlKey) {
					if (! jQuery.isEmptyObject(MapFunctions.mapAlbum)) {
						// control click: remove the points

						MapFunctions.mapAlbum.clickHistory.push(clickHistoryElement);

						var matchingIndex, matchingMedia, positionsAndCountsElement;
						for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
							positionsAndCountsElement = positionsAndCounts[indexPositions];
							if (
								MapFunctions.mapAlbum.positionsAndMediaInTree.some(
									function(element, index) {
										matchingIndex = index;
										return matchPositionAndCount(positionsAndCountsElement, element);
									}
								)
							) {
								// the position was present: remove the position itself...
								MapFunctions.mapAlbum.positionsAndMediaInTree.splice(matchingIndex, 1);

								// ...and the corresponding photos
								for (iMediaPosition = 0; iMediaPosition < positionsAndCountsElement.mediaNameList.length; iMediaPosition ++) {
									mediaNameListElement = positionsAndCountsElement.mediaNameList[iMediaPosition];
									if (
										MapFunctions.mapAlbum.media.some(
											function(media, index) {
												matchingMedia = index;
												var match = (media.cacheBase == mediaNameListElement.cacheBase && media.foldersCacheBase == mediaNameListElement.foldersCacheBase);
												return match;
											}
										)
									)
										MapFunctions.mapAlbum.media.splice(matchingMedia, 1);
								}
							}
						}

						if (! util.imagesAndVideosTotal(MapFunctions.mapAlbum.numMedia)) {
							$("#loading").hide();
							MapFunctions.popup.remove();
						} else {
							endPreparingMapAlbumAndUpdatePopup();
						}
					}
				} else {
					// not control click: add (with shift) or replace (without shift) the positions
					imageLoadPromise = new Promise(
						function(resolve_imageLoad) {
							var indexPositions, positionsAndCountsElement;

							if (jQuery.isEmptyObject(MapFunctions.mapAlbum) || util.imagesAndVideosTotal(MapFunctions.mapAlbum.numMedia) == 0 || ! evt.originalEvent.shiftKey) {
								// normal click or shift click without previous content

								lastAlbumIndex ++;
								MapFunctions.mapAlbum = map.initializeMapAlbum(lastAlbumIndex);

								MapFunctions.mapAlbum.clickHistory = [clickHistoryElement];

								MapFunctions.addMediaFromPositionsToMapAlbum(positionsAndCounts, MapFunctions.mapAlbum, resolve_imageLoad);
							} else {
								// shift-click with previous content
								MapFunctions.mapAlbum.clickHistory.push(clickHistoryElement);

								// determine what positions aren't yet in selectedPositions array
								var missingPositions = [];
								for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
									positionsAndCountsElement = positionsAndCounts[indexPositions];
									if (
										MapFunctions.mapAlbum.positionsAndMediaInTree.every(
											function(element) {
												return ! matchPositionAndCount(positionsAndCountsElement, element);
											}
										)
									) {
										missingPositions.push(positionsAndCountsElement);
										MapFunctions.mapAlbum.positionsAndMediaInTree.push(positionsAndCountsElement);
									}
								}
								positionsAndCounts = missingPositions;
								if (missingPositions.length > 0)
									MapFunctions.addMediaFromPositionsToMapAlbum(positionsAndCounts, MapFunctions.mapAlbum, resolve_imageLoad);
								else
									$("#loading").hide();
							}

						}
					);

					imageLoadPromise.then(
						endPreparingMapAlbumAndUpdatePopup,
						function() {
							console.trace();
						}
					);
					// }
				}
				// end of function updateMapAlbumOnMapClick body

				function matchPositionAndCount(reference, element) {
					return (JSON.stringify([reference.lat, reference.lng]) === JSON.stringify([element.lat, element.lng]));
				}

				function endPreparingMapAlbumAndUpdatePopup() {
					if (updateMapAlbum) {
						MapFunctions.mapAlbum.numMedia = util.imagesAndVideosCount;
						MapFunctions.mapAlbum.numMediaInSubTree = MapFunctions.mapAlbum.numMedia;
						MapFunctions.mapAlbum.numPositionsInTree = MapFunctions.mapAlbum.positionsAndMediaInTree.length;
						MapFunctions.mapAlbum.numsProtectedMediaInSubTree = {"": MapFunctions.mapAlbum.numMedia};
						// media must be initially sorted by date not reverse, as json they are in albums
						util.sortByDate(MapFunctions.mapAlbum.media);
						MapFunctions.mapAlbum.mediaNameSort = false;
						MapFunctions.mapAlbum.mediaReverseSort = false;
						util.initializeSortPropertiesAndCookies(MapFunctions.mapAlbum);
						// now sort them according to options
						util.sortAlbumsMedia(MapFunctions.mapAlbum);

						// update the map root album in cache
						var rootMapAlbum = phFl.getAlbumFromCache(Options.by_map_string);
						if (! rootMapAlbum)
							rootMapAlbum = PhotoFloat.initializeMapRootAlbum();
						rootMapAlbum.numMediaInSubTree += MapFunctions.mapAlbum.numMediaInSubTree;
						rootMapAlbum.subalbums.push(MapFunctions.mapAlbum);
						rootMapAlbum.positionsAndMediaInTree = util.mergePoints(rootMapAlbum.positionsAndMediaInTree, MapFunctions.mapAlbum.positionsAndMediaInTree);
						rootMapAlbum.numPositionsInTree += MapFunctions.mapAlbum.numPositionsInTree;
						rootMapAlbum.numsProtectedMediaInSubTree[""] += MapFunctions.mapAlbum.numsProtectedMediaInSubTree[""];

						TopFunctions.bindSortEvents(MapFunctions.mapAlbum);
					}
					resolve_updateMapAlbumOnMapClick();
				}
			}
		);
	};

	TopFunctions.setCaption = function(title, description) {
		// Replace CRLF by <br> and remove all useless <br>.
		function formatText(text) {
		  text = text.replace(/<(\/?\w+)>\s*\n\s*<(\/?\w+)>/g, "<$1><$2>");
		  text = text.replace(/\n/g, "</p><p class='caption-text'>");
		  return "<p class='caption-text'>" + text + "</p>";
		}

		var nullTitle = title === undefined || ! title;
		var nullDescription = description === undefined || ! description;

		if (! nullTitle) {
		  $("#caption-title").html(formatText(title));
		} else {
		  $("#caption-title").html("");
		}

		if (! nullDescription) {
		  $("#caption-description").html(formatText(description));
		} else {
		  $("#caption-description").html("");
		}

		if (nullTitle && nullDescription) {
		  $("#caption").addClass("hidden");
		} else {
		  $("#caption").removeClass("hidden");
		}
	};

	TopFunctions.positionCaption = function(captionType) {
		// Size of caption varies if on album or media
		if (captionType == 'media') {
			var mediaHeight = parseInt($(".media-box#center").css("height"));
			$("#caption").css("top", mediaHeight * 0.7);
			$("#caption").css("bottom", "");
			$("#caption").css("height", "");
			$("#caption").css("max-height", mediaHeight * 0.2);
		} else if (captionType == 'album') {
			var titleHeight = parseInt($("#album-view .title").css("height"));
			var albumTop = parseInt($("#album-view").css("top"));
			var albumHeight = parseInt($("#album-view").css("height"));
			var thumbsHeight = parseInt($("#thumbs").css("height"));
			var subalbumsHeight = parseInt($("#subalbums").css("height"));
			// TODO: How to adapt height to different platforms?
			$("#caption").css("top", "");
			$("#caption").css("bottom", 0);
			$("#caption").css("height", (albumHeight + thumbsHeight + subalbumsHeight) * 0.6);
			$("#caption").css("max-height", (albumHeight + thumbsHeight + subalbumsHeight) * 0.6);
		}
	}


	TopFunctions.prototype.goFullscreen = TopFunctions.goFullscreen;
	TopFunctions.prototype.showBrowsingModeMessage = TopFunctions.showBrowsingModeMessage;
	// TopFunctions.prototype.goUpIfProtected = TopFunctions.goUpIfProtected;

	window.TopFunctions = TopFunctions;
}());
