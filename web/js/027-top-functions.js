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

	TopFunctions.setTitle = function(id, media) {
		var title = "", documentTitle = "", components, i, isDateTitle, isGpsTitle, isSearchTitle, isMapTitle, originalTitle;
		var titleAnchorClasses, titleAnchorClassesItalics, albumTypeString, where, initialValue, searchFolderHash;
		var linkCount = 0, linksToLeave = 1, latitude, longitude, arrayCoordinates, numMediaInSubAlbums;
		var raquo = "&raquo;";
		// gpsLevelNumber is the number of levels for the by gps tree
		// current levels are country, region, place => 3
		var gpsLevelNumber = 3;
		var gpsName = '';
		var gpsHtmlTitle;
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
				// var currentAlbumPath = currentAlbum.ancestorsNames;
				if (i == components.length - 1 && currentAlbum.ancestorsNames[i - 1].match(/_[0-9]+$/)) {
					gpsName = util.transformAltPlaceName(currentAlbum.ancestorsNames[i - 1]);
				} else {
					gpsName = currentAlbum.ancestorsNames[i - 1];
				}

				if (gpsName === '')
					gpsName = util._t('.not-specified');
				gpsHtmlTitle = util._t("#place-icon-title") + gpsName;

				if (i < components.length - 1 || media !== null) {
					title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i - 1]) + "'";
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
					arrayCoordinates = currentAlbum.ancestorsCenter[i - 1];
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
				[Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(Options.album_to_search_in) == -1
			) {
				title += " <span id='search-album-to-be-filled'></span> " + raquo;
			}
			var searchClass = "search-link";

			if (
				Options.search_current_album &&
				[Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(Options.album_to_search_in) == -1
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
			if (media !== null) {
				title += raquo;
			}

			title += fillInSpan;

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
						title += " " + util._t(".title-and") + " ";
				}
				if (currentAlbum.subalbums.length) {
					title += currentAlbum.subalbums.length + " ";
					title += util._t(".title-albums");
				}
				// if (currentAlbum.media.length > 0 && currentAlbum.subalbums.length > 0) {
				//   title += ", ";
				//   title += util._t(".title-total") + " ";
				//   title += currentAlbum.media.length + currentAlbum.subalbums.length;
				// }

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
				if (media !== null)
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
			if (media !== null) {
				title += raquo;
			}

			title += fillInSpan;

			if (
				components.length > 2 &&
				(media === null && ! util.isAlbumWithOneMedia(currentAlbum)) &&
				(currentAlbum.media.length || currentAlbum.subalbums.length)
			) {
				title += " <span class='title-count'>(";
				numMediaInSubAlbums = currentAlbum.numMediaInSubTree - currentAlbum.media.length;
				if (currentAlbum.media.length) {
					title += currentAlbum.media.length + " ";
					title += util._t(".title-media");
					if (currentAlbum.subalbums.length)
						title += " " + util._t(".title-and") + " ";
				}
				if (currentAlbum.subalbums.length) {
					title += currentAlbum.subalbums.length + " ";
					title += util._t(".title-albums");
				}
				// if (currentAlbum.media.length > 0 && currentAlbum.subalbums.length > 0) {
				//   title += ", ";
				//   title += util._t(".title-total") + " ";
				//   title += currentAlbum.media.length + currentAlbum.subalbums.length;
				// }

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
				// the folders from the first until the search folder inclusive must not be shown
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
		} else if (title.includes(fillInSpan) && currentAlbum.numPositionsInTree) {
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
			if (media !== null)
				documentTitle = util.trimExtension(media.name) + documentTitle;
			else if (currentAlbum !== null && ! currentAlbum.subalbums.length && currentAlbum.media.length == 1)
				documentTitle = util.trimExtension(currentAlbum.media[0].name) + " \u00ab " + documentTitle;

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
						albumTypeString = "<a href='#!/" + Options.by_gps_string + "'" + util._t('#by-gps') + ']</a> ' + ' ' + raquo + ' ';
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
				util.die
			);
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

		return;
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
			phFl.geotaggedPhotosExist(
				function(hasGpsData) {
					actuallyBind(thisAlbum, hasGpsData);
				}
			);
		}

	};

	TopFunctions.showMedia = function(album, media, id) {

		function loadNextPrevMedia(containerHeight, containerWidth) {

			$(mediaSelector).off(triggerLoad);

			if (id === "center") {
				$("#pinch-in").off("click").on("click", pS.pinchIn);
				$("#pinch-out").off("click").on("click", pS.pinchOut);

				if (media.mediaType == "photo") {
					pS.addMediaGesturesDetection();
					util.setPinchButtonsPosition();
					util.correctPrevNextPosition();
				}

				if (album.media.length > 1) {
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
						event.data.media = media;
						event.data.callback = f.pinchSwipeInitialization;
						event.data.callbackType = "pinch";
						event.data.currentZoom = pS.getCurrentZoom();
						util.scaleMedia(event);

						if (album.media.length > 1) {
							event.data.id = "left";
							event.data.media = prevMedia;
							event.data.callback = f.pinchSwipeInitialization;
							event.data.callbackType = "pinch";
							util.scaleMedia(event);

							event.data.id = "right";
							event.data.media = nextMedia;
							event.data.callback = f.pinchSwipeInitialization;
							event.data.callbackType = "pinch";
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
							// $(window).hashchange();

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
		var savedSearchSubAlbumHash, savedSearchAlbumHash;
		var previousMediaIndex, nextMediaIndex, array;

		$(".media-bar").show();

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
			TopFunctions.setTitle(id, media);

			if (Options.hide_bottom_thumbnails) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}

			if (currentAlbum.media.length == 1) {
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

		if (media.mediaType == "video" && ! f.videoOK()) {
			mediaBoxInnerElement.empty();
			f.addVideoUnsupportedMarker(id);
			if (id === "center")
				loadNextPrevMedia();
		} else {
			if (media.mediaType == "video") {
				mediaSelector = ".media-box#" + id + " .media-box-inner video";
			} else {
				mediaSelector = ".media-box#" + id + " .media-box-inner img";
				mediaSrc = util.chooseMediaReduction(media, id, fullScreenStatus);
			}
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

			$(mediaSelector).off(triggerLoad).on(
				triggerLoad,
				{
					id: id,
					media: media,
					resize: false,
					callback: loadNextPrevMedia,
					callbackType: "load"
				},
				util.scaleMedia
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

			upLink = phFl.upHash(location.hash);
			if (currentAlbum.media.length == 1) {
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
				mediaBoxInnerElement.css('cursor', '').on(
					'contextmenu',
					function(ev) {
						if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
							ev.preventDefault();
							if (pS.getCurrentZoom() == 1)
								pS.swipeRight(prevMedia);
						}
					}
				);

				mediaBoxInnerElement.off('mousewheel');
				if (media.mediaType == "photo")
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

				$("#prev").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						pS.swipeRight(prevMedia);
						return false;
					}
				});
				$("#next").on('click', function(ev) {
					if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
						pS.swipeLeft(nextMedia);
						return false;
					}
				});
			}

			// $(".links").removeClass("hidden");
		}

		var originalMediaPath = encodeURI(util.originalMediaPath(media));
		$(".media-box#" + id + " .original-link").attr("target", "_blank").attr("href", originalMediaPath);
		$(".media-box#" + id + " .download-link").attr("href", originalMediaPath).attr("download", "");
		if (util.hasGpsData(media)) {
			$(".media-box#" + id + " .menu-map-link").on(
				'click',
				function(ev) {
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
			if (currentMedia.mediaType == "video")
				$("#media-center").on("loadstart", f.socialButtons);
			else
				$("#media-center").on("load", f.socialButtons);
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
		$(".media-box#" + id + " .metadata tr.gps").attr("title", linkTitle).on(
			'click',
			function(ev) {
				$(".map-popup-trigger")[0].click();
			}
		);

		util.translate();

		$("#subalbums").hide();
		// $("#media-view").removeClass("hidden");
	};

	TopFunctions.scrollBottomThumbs = function(e, delta) {
		this.scrollLeft -= (delta * 80);
		e.preventDefault();
	};

	TopFunctions.scrollAlbum = function(e, delta) {
		this.scrollTop -= (delta * 80);
		e.preventDefault();
	};


	/* Entry point for most events */

	TopFunctions.hashParsed = function(album, media, mediaIndex) {
		var populateAlbum;
		var currentAlbumPath, currentAlbumPathArray;

		if (album.numMediaInSubTree == 0 && ! util.isSearchCacheBase(album.cacheBase)) {
			// the album hasn't any content:
			// either the hash is wrong or it's a protected content
			// go up
			util.goUpInHash(window.location.hash);
			return;
		}

		util.undie();
		$("#loading").hide();

		if (album != currentAlbum) {
			previousAlbum = currentAlbum;
			currentAlbum = null;
		}

		if (previousMedia !== null && previousMedia.mediaType == "video")
			// stop the video, otherwise it will keep playing
			$("#media-center")[0].pause();

		if (currentAlbum && util.isByDateCacheBase(currentAlbum.cacheBase) && media !== null) {
			previousMedia = media;
		} else {
			previousMedia = currentMedia;
		}
		currentAlbum = album;
		currentMedia = media;
		currentMediaIndex = mediaIndex;

		var isAlbumWithOneMedia = util.isAlbumWithOneMedia(currentAlbum);
		// var passwordList = null;
		// if (currentMedia == null) {
		// 	if (! isAlbumWithOneMedia) {
		// 		if (currentAlbum.hasOwnProperty("passwordsMd5"))
		// 			// virtual albums don't have the passwordsMd5 property
		// 			passwordList = currentAlbum.passwordsMd5;
		// 	} else
		// 		passwordList = currentAlbum.media[0].passwordsMd5;
		// } else {
		// 	passwordList = currentMedia.passwordsMd5;
		// }

		f.setOptions();

		if (currentMedia === null || typeof currentMedia === "object") {
			util.initializeSortPropertiesAndCookies(currentAlbum);
			$("#menu-icon").attr("title", util._t("#menu-icon-title"));
			util.sortAlbumsMedia(currentAlbum);
			// f.updateMenu();
		}

		currentAlbumPathArray = currentAlbum.path.split('/').slice(1);
		if (util.isByGpsCacheBase(currentAlbum.cacheBase))
			currentAlbumPathArray = currentAlbum.ancestorsNames.slice(2);
		currentAlbumPath = currentAlbumPathArray.join('/');

		$("#album-search").attr('title', util._t("#current-album-is") + '"'+ currentAlbumPath + '"');


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
			// $("#album-view .title").hide();
			// $("#media-view .title").show();
			TopFunctions.showMedia(currentAlbum, currentMedia, 'center');

			// we are in hashParsed
			// activate the map and the popup when coming back from a map album
			if (
				previousAlbum !== null &&
				util.isMapCacheBase(previousAlbum.cacheBase) &&
				// fromEscKey || mapRefreshType == "refresh"
				fromEscKey || mapRefreshType !== "none"
				// && currentMedia === null && ! util.isAlbumWithOneMedia(currentAlbum)
			) {
				$(selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
			}
		} else {
			// $("#album-view .title").show();
			TopFunctions.setTitle("album", null);
			// $("#media-view .title").hide();
			$("#album-view").removeClass("media-view-container");
		}

		// if (! isAlbumWithOneMedia || $("#album-view").is(":visible")) {
		if ($("#album-view").is(":visible")) {
			populateAlbum =
				previousAlbum === null ||
			 	previousAlbum.cacheBase !== currentAlbum.cacheBase ||
				currentMedia === null && previousMedia !== null;
			 	// previousAlbum !== currentAlbum || previousMedia !== currentMedia;
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
		// mapRefreshType = "none";

		return;
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
			f.focusSearchField();
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
			f.focusSearchField();
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
			f.focusSearchField();
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
				map.updatePopup(
					MapFunctions.titleWrapper1.replace(
						"maxWidthForThumbnails",
						MapFunctions.maxWidthForThumbnails
					) +
					map.generateHtmlForImages(thisAlbum) + MapFunctions.titleWrapper2
				);
			f.focusSearchField();
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
				map.updatePopup(
					MapFunctions.titleWrapper1.replace(
						"maxWidthForThumbnails",
						MapFunctions.maxWidthForThumbnails
					) +
					map.generateHtmlForImages(thisAlbum) + MapFunctions.titleWrapper2
				);
			f.focusSearchField();
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
				map.updatePopup(
					MapFunctions.titleWrapper1.replace(
						"maxWidthForThumbnails",
						MapFunctions.maxWidthForThumbnails
					) +
					map.generateHtmlForImages(thisAlbum) + MapFunctions.titleWrapper2
				);
			f.focusSearchField();
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
				TopFunctions.showMedia(currentAlbum, nextMedia, 'right');
				TopFunctions.showMedia(currentAlbum, prevMedia, 'left');
			} else
				TopFunctions.showAlbum(false);
			f.focusSearchField();
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
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleSlideMode = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.albums_slide_style = ! Options.albums_slide_style;
			f.setBooleanCookie("albums_slide_style", Options.albums_slide_style);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
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
			if (currentAlbum.subalbums.length > 1 && currentAlbum.media.length > 1)
				TopFunctions.showAlbum("refreshBoth");
			else if (currentAlbum.subalbums.length > 1)
				TopFunctions.showAlbum("refreshSubalbums");
			else if (currentAlbum.media.length > 1)
				TopFunctions.showAlbum("refreshMedia");

			if ($('.leaflet-popup').html())
				map.updatePopup(
					MapFunctions.titleWrapper1.replace(
						"maxWidthForThumbnails",
						MapFunctions.titleWrapper
					) +
					map.generateHtmlForImages(MapFunctions.mapAlbum) +
					MapFunctions.titleWrapper2
				);
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumNames = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_album_names_below_thumbs = ! Options.show_album_names_below_thumbs;
			f.setBooleanCookie("show_album_names_below_thumbs", Options.show_album_names_below_thumbs);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaCount = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_album_media_count = ! Options.show_album_media_count;
			f.setBooleanCookie("show_album_media_count", Options.show_album_media_count);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaNames = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_media_names_below_thumbs = ! Options.show_media_names_below_thumbs;
			f.setBooleanCookie("show_media_names_below_thumbs", Options.show_media_names_below_thumbs);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumsSquare = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.album_thumb_type = Options.album_thumb_type == "square" ? "fit" : "square";
			f.setCookie("album_thumb_type", Options.album_thumb_type);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
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
				map.updatePopup(
					MapFunctions.titleWrapper1.replace(
						"maxWidthForThumbnails",
						MapFunctions.titleWrapper
					) +
					map.generateHtmlForImages(MapFunctions.mapAlbum) +
					MapFunctions.titleWrapper2
				);
			f.focusSearchField();
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
			f.focusSearchField();
		}
		return false;
	};


	TopFunctions.showAlbum = function(populate) {
		function insertRandomImage(randomAlbum, randomMedia, subalbum, id, resolve) {
			var titleName, randomMediaLink, goTo, humanGeonames;
			var mediaSrc = util.chooseThumbnail(randomAlbum, randomMedia, Options.album_thumb_size);

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
				titleName = util.pathJoin([randomMedia.albumName, randomMedia.name]);
				// randomMediaLink = util.pathJoin(["#!", randomMedia.foldersCacheBase, currentAlbum.cacheBase + Options.cache_folder_separator + theSubalbum.cacheBase, randomMedia.cacheBase]);
			} else {
				titleName = util.pathJoin([randomMedia.albumName, randomMedia.name]);
				// randomMediaLink = util.pathJoin(["#!", randomMedia.foldersCacheBase, randomMedia.cacheBase]);
			}
			randomMediaLink = phFl.encodeHash(randomAlbum, randomMedia);

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
				function(ev) {
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

			numSubAlbumsReady ++;
			if (numSubAlbumsReady >= currentAlbum.subalbums.length) {
				// now all the subalbums random thumbnails has been loaded
				resolve();
			}
		}
		// end of insertRandomImage function


		var i, imageLink, linkContainer, container, image, media, thumbsElement, subalbums, subalbumsElement, mediaHash, thumbHash, thumbnailSize;
		var width, height, thumbWidth, thumbHeight, imageString, calculatedWidth, calculatedHeight, populateMedia;
		var albumViewWidth, correctedAlbumThumbSize = Options.album_thumb_size;
		var mediaWidth, mediaHeight, slideBorder = 0, scrollBarWidth = 0, buttonBorder = 0, margin, imgTitle;
		var tooBig = false, isVirtualAlbum = false;
		var mapLinkIcon, id, ithMedia, ithSubalbum;
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
			isVirtualAlbum = (
				util.isByDateCacheBase(currentAlbum.cacheBase) ||
				util.isByGpsCacheBase(currentAlbum.cacheBase) ||
				util.isSearchCacheBase(currentAlbum.cacheBase) ||
				util.isMapCacheBase(currentAlbum.cacheBase)
			);
			tooBig = currentAlbum.path.split("/").length < 4 && currentAlbum.media.length > Options.big_virtual_folders_threshold;
			if (populateMedia === true && isVirtualAlbum)
				populateMedia = populateMedia && (! tooBig || Options.show_big_virtual_folders);

			if (isVirtualAlbum && tooBig && ! Options.show_big_virtual_folders) {
				$("#thumbs").empty();
				var tooManyImagesText =
					"<span id='too-many-images'>" + util._t('#too-many-images') + "</span>: " + currentAlbum.media.length +
					", <span id='too-many-images-limit-is'>" + util._t('#too-many-images-limit-is') + "</span> " + Options.big_virtual_folders_threshold + "</span>, " +
					"<span id='show-them'>" + util._t("#show-them") + "</span>";
				$("#error-too-many-images").html(tooManyImagesText).show();
				if (! $("ul#right-menu").hasClass("expand")) {
					$("#show-them:hover").css("color", "").css("cursor", "");
					$("#show-them").on(
						"click",
						function(ev) {
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
				for (i = 0; i < currentAlbum.media.length; ++i) {
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
										"alt='" + util.trimExtension(ithMedia.name) + "' ";
					imageString +=
										"data-src='" + encodeURI(thumbHash) + "' ";
					imageString +=
										"src='img/image-placeholder.png' " +
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
								"<span>";
					imageString +=
									ithMedia.name.replace(/ /g, "</span> <span style='white-space: nowrap;'>");
					imageString +=
								"</span>";
					imageString += "</div>" +
							"</div>";
					image = $(imageString);

					image.get(0).media = ithMedia;
					if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
						mediaHash = phFl.encodeHash(currentAlbum, ithMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
					else
						mediaHash = phFl.encodeHash(currentAlbum, ithMedia);
					imageLink = $("<a id='link-" + ithMedia.cacheBase + "'></a>");
					// imageLink = $("<a id='link-" + mediaHash + "' href='" + mediaHash + "'></a>");
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
				for (i = 0; i < currentAlbum.media.length; ++i) {
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
					// The promise in order to know when everything has come to its end
					var subalbumsPromise = new Promise(
						function(resolve, reject) {
							for (i = 0; i < currentAlbum.subalbums.length; ++i) {
								ithSubalbum = currentAlbum.subalbums[i];

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
								if (ithSubalbum.hasOwnProperty("positionsAndMediaInTree") && ithSubalbum.positionsAndMediaInTree.length)
									folder += "<a id='subalbum-map-link-" + i + "' >" +
													"<img " +
														"class='title-img' " +
														"title='" + folderTitle + "' " +
														"alt='" + folderTitle + "' " +
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
								captionHtml +=		ithSubalbum.numMediaInSubTree;
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
								(function(theSubalbum, theImage, theLink, id) {
									// function(subalbum, container, callback, error)  ---  callback(album,   album.media[index], container,            subalbum);
									phFl.pickRandomMedia(
										theSubalbum,
										resolve,
										id,
										insertRandomImage,
										function error() {
											currentAlbum.subalbums.splice(currentAlbum.subalbums.indexOf(theSubalbum), 1);
											theImage.parent().remove();
											// subalbums.splice(subalbums.indexOf(theLink), 1);
										}
									);
									i ++; i --;
								})(ithSubalbum, image, container, id);
								//////////////////// end anonymous function /////////////////////
							}
						}
					);
					subalbumsPromise.then(
						function() {
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
						}
					);

					for (i = 0; i < currentAlbum.subalbums.length; ++i) {
						ithSubalbum = currentAlbum.subalbums[i];
						if (ithSubalbum.hasOwnProperty("positionsAndMediaInTree") && ithSubalbum.positionsAndMediaInTree.length) {
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
			// $("#media-box-inner").show().children().last().remove();
			// $("#media-box").hide();
			$("#album-view, #album-view #subalbums").removeClass("hidden");

			$("#powered-by").show();

			// $("html, body").off('mousewheel').on('mousewheel', TopFunctions.scrollAlbum);
		} else {
			// currentMedia !== null
			$("#media-view").removeClass("hidden");

			if (currentAlbum.media.length == 1)
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
			(
				util.isMapCacheBase(previousAlbum.cacheBase) &&
				fromEscKey
			) || mapRefreshType == "refresh"
			// && currentMedia === null && ! util.isAlbumWithOneMedia(currentAlbum)
		)
			$(selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);

		if (! $("#album-view").hasClass("hidden"))
			// f.scrollToThumb();
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
						// $(window).hashchange();

						// close the map and reopen it
						$('.modal-close')[0].click();
						$(selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
					}
				}
			);
		}
	};

	TopFunctions.goFullscreen = function(e) {
		// $("#media").off();
		if (Modernizr.fullscreen) {
			e.preventDefault();
			$("#album-view").addClass('hidden');
			$("#media-view").fullScreen({
				callback: function(isFullscreen) {
					$("#loading").hide();
					fullScreenStatus = isFullscreen;
					$(".enter-fullscreen").toggle();
					$(".exit-fullscreen").toggle();
					TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
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

		if (ev.data.subalbum.positionsAndMediaInTree.length) {
			ev.stopPropagation();
			ev.preventDefault();
			TopFunctions.generateMap(ev, ev.data.subalbum.positionsAndMediaInTree, from);
		} else {
			$("#warning-no-geolocated-media").stop().fadeIn(200);
			$("#warning-no-geolocated-media").fadeOut(3000);
		}
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
			'<div id="popup-photo-count" style="max-width: ' + MapFunctions.titleWrapper + 'px;">' +
				'<span id="popup-photo-count-number"></span> ' + util._t("#photos") +
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
			// maximum OSM zoom is 19
			var earthCircumference = 40075016;
			var xZoom = Math.min(19, parseInt(Math.log2((windowWidth / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxXDistance)));
			var yZoom = Math.min(19, parseInt(Math.log2((windowHeight / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxYDistance)));
			// var minZoom = parseInt(Math.log2(Math.min(windowWidth, windowHeight) / 256));
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
						TopFunctions.updateMapAlbumOnMapClick(ev, pruneCluster.Cluster._clusters, TopFunctions.prepareAndDoPopupUpdate);
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
					maxNativeZoom: 18,
					id: 'mapbox.streets'
				}
			).addTo(MapFunctions.mymap);
			L.control.scale().addTo(MapFunctions.mymap);

			var cacheBases;
			for (var iPoint = 0; iPoint < pointList.length; iPoint ++) {
				// console.log(iPoint + "/" + pointList.length);
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
					TopFunctions.updateMapAlbumOnMapClick(ev, pruneCluster.Cluster._clusters, TopFunctions.prepareAndDoPopupUpdate);
				}
			);

			if (typeof from !== "undefined") {
				if (popupRefreshType == "previousAlbum")
					TopFunctions.prepareAndDoPopupUpdate();
					// TopFunctions.updateMapAlbumOnMapClick(null, pruneCluster.Cluster._clusters, TopFunctions.prepareAndDoPopupUpdate, previousAlbum);
				else if (popupRefreshType == "mapAlbum") {
					function playClickElement(clickHistory, iClick) {
						var clickHistoryElement = clickHistory[iClick];
						var promise = new Promise(
							function(playResolve) {
								MapFunctions.mymap.setView(clickHistoryElement.center, clickHistoryElement.zoom, {animate: false});
								ev = {
									"latlng": clickHistoryElement.latlng,
									"originalEvent": {
										"shiftKey": clickHistoryElement.shiftKey,
										"ctrlKey": clickHistoryElement.ctrlKey,
									}
								};
								// return;
								TopFunctions.updateMapAlbumOnMapClick(ev, pruneCluster.Cluster._clusters, null, playResolve);
							}
						);

						promise.then(
							function() {
								if (iClick < clickHistory.length - 1)
									playClickElement(clickHistory, iClick + 1);
								else
									TopFunctions.prepareAndDoPopupUpdate();
									// TopFunctions.updateMapAlbumOnMapClick(null, pruneCluster.Cluster._clusters, TopFunctions.prepareAndDoPopupUpdate);
							}
						);
					}

					var clickHistory = MapFunctions.mapAlbum.clickHistory;
					delete MapFunctions.mapAlbum;
					playClickElement(clickHistory, 0);

				}
			}
			// popupRefreshType = "previousAlbum";
		}
	};

	TopFunctions.prepareAndDoPopupUpdate = function() {
		MapFunctions.getImagesWrapperSizes();

		if (MapFunctions.popup) {
			MapFunctions.popup.remove();
			$(".leaflet-popup").remove();
		}
		MapFunctions.popup = L.popup(
			{
				maxWidth: MapFunctions.maxWidthForThumbnails,
				maxHeight: MapFunctions.maxHeightForThumbnails,
				autoPan: false
			}
		).setContent(
			MapFunctions.titleWrapper1.replace(
				"maxWidthForThumbnails",
				MapFunctions.titleWrapper
			) +
			 MapFunctions.titleWrapper2
		 )
		.setLatLng(MapFunctions.averagePosition(MapFunctions.mapAlbum.positionsAndMediaInTree))
		.openOn(MapFunctions.mymap);

		map.addPopupMover();

		// $('.leaflet-popup-close-button')[0].click();
		// // $('#popup #popup-content').html("");
		// $('.modal-close')[0].click();

		phFl.endPreparingAlbumAndKeepOn(
			MapFunctions.mapAlbum,
			null,
			function() {
				map.updatePopup(MapFunctions.titleWrapper1.replace(
					"maxWidthForThumbnails",
					MapFunctions.titleWrapper) + map.generateHtmlForImages(MapFunctions.mapAlbum) + MapFunctions.titleWrapper2
				);
				$("#loading").hide();
			}
		);
	};

	TopFunctions.updateMapAlbumOnMapClick = function(evt, clusters, callback, playResolve) {
		var i;
		var clickHistoryElement;

		function matchPositionAndCount(reference, element) {
			return JSON.stringify([reference.lat, reference.lng]) === JSON.stringify([element.lat, element.lng]);
		}

		// function getCodedHashId(mediaNameListElement) {
		// 	var hash = mediaNameListElement.albumCacheBase + "--" + mediaNameListElement.cacheBase;
		// 	return "popup-img-" + phFl.hashCode(hash);
		// }

		function endPreparingMapAlbumAndUpdatePopup() {
			if (typeof playResolve !== "undefined") {
				playResolve();
				return;
			}

			MapFunctions.mapAlbum.numMediaInSubTree = MapFunctions.mapAlbum.media.length;
			MapFunctions.mapAlbum.numPositionsInTree = MapFunctions.mapAlbum.positionsAndMediaInTree.length;
			// media must be initially sorted by date not reverse, as json they are in albums
			MapFunctions.mapAlbum.media = util.sortByDate(MapFunctions.mapAlbum.media);
			MapFunctions.mapAlbum.mediaNameSort = false;
			MapFunctions.mapAlbum.mediaReverseSort = false;
			util.initializeSortPropertiesAndCookies(MapFunctions.mapAlbum);
			// now sort them according to options
			util.sortAlbumsMedia(MapFunctions.mapAlbum);

			// update the map root album in cache
			var rootMapAlbum = phFl.getAlbumFromCache(Options.by_map_string);
			if (! rootMapAlbum)
				rootMapAlbum = PhotoFloat.initializeMapRootAlbum();
			rootMapAlbum.subalbums.push(MapFunctions.mapAlbum);
			rootMapAlbum.positionsAndMediaInTree = util.mergePoints(rootMapAlbum.positionsAndMediaInTree, MapFunctions.mapAlbum.positionsAndMediaInTree);
			rootMapAlbum.numMediaInSubTree += MapFunctions.mapAlbum.numMediaInSubTree;

			TopFunctions.bindSortEvents(MapFunctions.mapAlbum);

			if (callback !== null)
				callback();

		}

		// end of subfunctions, begin function code

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

		// if (typeof previousAlbum !== "undefined" && previousAlbum !== null) {
		// 	// the map has been shown when coming from a map album, we must show the popup with the media it had when it was previously built
		// 	endPreparingMapAlbumAndUpdatePopup(previousAlbum);
		// } else {
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
				// $("#loading").show();

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
										var match =
										 	media.cacheBase == mediaNameListElement.cacheBase &&
											media.foldersCacheBase == mediaNameListElement.foldersCacheBase;
										return match;
									}
								)
							)
								MapFunctions.mapAlbum.media.splice(matchingMedia, 1);
						}
					}
				}

				if (! MapFunctions.mapAlbum.media.length) {
					$("#loading").hide();
					MapFunctions.popup.remove();
				} else {
					endPreparingMapAlbumAndUpdatePopup();
				}
			}
		} else {
			// not control click: add (with shift) or replace (without shift) the positions
			imageLoadPromise = new Promise(
				function(resolve, reject) {
					var indexPositions, positionsAndCountsElement;

					// $("#loading").show();

					if (jQuery.isEmptyObject(MapFunctions.mapAlbum) || MapFunctions.mapAlbum.media.length == 0 || ! evt.originalEvent.shiftKey) {
						// normal click or shift click without previous content

						lastAlbumIndex ++;
						MapFunctions.mapAlbum = map.initializeMapAlbum(lastAlbumIndex);

						MapFunctions.mapAlbum.clickHistory = [clickHistoryElement];

						MapFunctions.addMediaFromPositionsToMapAlbum(positionsAndCounts, MapFunctions.mapAlbum, resolve);
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
							MapFunctions.addMediaFromPositionsToMapAlbum(positionsAndCounts, MapFunctions.mapAlbum, resolve);
						else
							$("#loading").hide();
					}

				}
			);

			imageLoadPromise.then(
				function() {
					endPreparingMapAlbumAndUpdatePopup();
				}
			);
			// }
		}

		return;
	};

	TopFunctions.prototype.goFullscreen = TopFunctions.goFullscreen;
	TopFunctions.prototype.hashParsed = TopFunctions.hashParsed;
	TopFunctions.prototype.showBrowsingModeMessage = TopFunctions.showBrowsingModeMessage;
	// TopFunctions.prototype.goUpIfProtected = TopFunctions.goUpIfProtected;

	window.TopFunctions = TopFunctions;
}());
