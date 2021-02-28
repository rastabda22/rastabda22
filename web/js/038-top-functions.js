/*jshint esversion: 6 */
(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var map = new MapFunctions();
	var pS = new PinchSwipe();
	var f = new Functions();
	var mapIsInitialized = false;

	/* constructor */
	function TopFunctions() {
	}

	Album.prototype.generatePositionsAndMediaInMediaAndSubalbums = function() {
		var self = this;
		return new Promise(
			function(resolve_generatePositionsAndMediaInMediaAndSubalbums) {
				let numSubalbums = self.subalbums.length;
				if (
					self.hasValidPositionsAndMediaInMediaAndSubalbums() ||
					(
						! self.numsMedia.imagesAndVideosTotal() || ! self.hasPositionsInMedia()
					) && ! numSubalbums
				) {
					resolve_generatePositionsAndMediaInMediaAndSubalbums();
				} else {
					let hasPositionsInMedia = (self.hasPositionsInMedia() && (! self.isTransversal() || numSubalbums === 0));
					if (! hasPositionsInMedia) {
						// no media or date/gps album with subalbums
						self.positionsAndMediaInMedia = new PositionsAndMedia([]);
						self.numPositionsInMedia = 0;
						self.positionsAndMediaInSubalbums = self.positionsAndMediaInTree;
						self.numPositionsInSubalbums = self.positionsAndMediaInSubalbums.length;
						resolve_generatePositionsAndMediaInMediaAndSubalbums();
					} else if (numSubalbums === 0) {
						// no subalbums
						self.generatePositionsAndMedia();
						self.numPositionsInMedia = self.positionsAndMediaInMedia.length;
						self.positionsAndMediaInSubalbums = new PositionsAndMedia([]);
						self.numPositionsInSubalbums = 0;
						resolve_generatePositionsAndMediaInMediaAndSubalbums();
					} else {
						// we have media and subalbum, but we don't know if positionsAndMediaInTree property is there
						let promise = phFl.getAlbum(self, null, {getMedia: true, getPositions: true});
						promise.then(
							function(album) {
								self = album;
								self.generatePositionsAndMedia();
								self.numPositionsInMedia = self.positionsAndMediaInMedia.length;
								self.positionsAndMediaInSubalbums = new PositionsAndMedia(self.positionsAndMediaInTree);
								self.positionsAndMediaInSubalbums.removePositionsAndMedia(self.positionsAndMediaInMedia);
								self.numPositionsInSubalbums = self.positionsAndMediaInSubalbums.length;
								resolve_generatePositionsAndMediaInMediaAndSubalbums();
							}
						);
					}
				}
			}
		);
	};

	TopFunctions.setTitle = function(id, singleMedia, self) {
		return new Promise(
			function (resolve_setTitle) {
				function isSearchInCurrentAlbumOnly(savedSearchAlbumCacheBase) {
					return savedSearchAlbumCacheBase.split(env.options.cache_folder_separator)[1].split(env.options.search_options_separator).slice(0, -1).indexOf('o') > -1;
				}

				function getSearchFolderCacheBase(savedSearchAlbumCacheBase) {
					return savedSearchAlbumCacheBase.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
				}

				var title, titleCount, documentTitle, i, isFolderTitle, isDateTitle, isGpsTitle, isSearchTitle, isSelectionTitle, isMapTitle;
				var titleAnchorClasses, where, initialValue, searchFolderCacheBase;
				var linkCount = 0, linksToLeave = 1, latitude, longitude, arrayCoordinates;
				const raquo = "&raquo;";
				const raquoForTitle = " \u00ab ";
				// gpsLevelNumber is the number of levels for the by gps tree
				// current levels are country, region, place => 3
				var gpsLevelNumber = 3;
				var gpsName = '';
				var setDocumentTitle = (id === "center" || id === "album");
				var titleComponents = [];
				var linksForTitleComponents = [];
				var titlesForTitleComponents = [];
				var classesForTitleComponents = [];

				// f.updateMenu();

				if (id === "album") {
					$(".media-box#" + id + " .title").addClass("hidden");
					$("#album-view .title").removeClass("hidden");
				} else {
					$(".media-box#" + id + " .title").removeClass("hidden");
					$("#album-view .title").addClass("hidden");
					$("#album-view .title-string").html("");
				}

				if (env.currentAlbum.hasOwnProperty("ancestorsTitles") && env.currentAlbum.hasOwnProperty("ancestorsNames")) {
					titleComponents = env.currentAlbum.ancestorsNames.map(
						(ithComponent, i) => {
							if (
								env.currentAlbum.ancestorsTitles[i] &&
								env.currentAlbum.ancestorsNames[i] &&
								env.currentAlbum.ancestorsTitles[i] !== env.currentAlbum.ancestorsNames[i]
							)
								return env.currentAlbum.ancestorsTitles[i] + " <span class='real-name'>(" + env.currentAlbum.ancestorsNames[i] + ")";
							else if (env.currentAlbum.ancestorsTitles[i])
								return env.currentAlbum.ancestorsTitles[i];
							else
								return env.currentAlbum.ancestorsNames[i];
						}
					);
				} else if (env.currentAlbum.hasOwnProperty("ancestorsNames")) {
					titleComponents = env.currentAlbum.ancestorsNames.slice();
				} else {
					titleComponents = env.currentAlbum.path.split("/");
				}

				linksForTitleComponents = env.currentAlbum.ancestorsCacheBase;

				isFolderTitle = (linksForTitleComponents[0] === env.options.folders_string);
				isDateTitle = (linksForTitleComponents[0] === env.options.by_date_string);
				isGpsTitle = (linksForTitleComponents[0] === env.options.by_gps_string);
				isSearchTitle = (linksForTitleComponents[0] === env.options.by_search_string);
				isSelectionTitle = (linksForTitleComponents[0] === env.options.by_selection_string);
				isMapTitle = (linksForTitleComponents[0] === env.options.by_map_string);

				// 'textComponents = titleComponents' doesn't work: textComponents becomes a pointer to titleComponents
				var textComponents = titleComponents.slice();

				// generate the title in the page top
				titleAnchorClasses = 'title-anchor';
				if (env.isMobile.any())
					titleAnchorClasses += ' mobile';

				var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, savedSearchAlbumCacheBase] = phFl.decodeHash(location.hash);
				var fillInSpan = "<span id='fill-in-map-link'></span>";

				var mediaTotalInAlbum, imagesTotalInAlbum, videosTotalInAlbum;
				var mediaTotalInSubTree, imagesTotalInSubTree, videosTotalInSubTree;
				var mediaTotalInSubAlbums, imagesTotalInSubAlbums, videosTotalInSubAlbums;
				if (singleMedia === null) {
					mediaTotalInAlbum = env.currentAlbum.numsMedia.imagesAndVideosTotal();
					imagesTotalInAlbum = env.currentAlbum.numsMedia.images;
					videosTotalInAlbum = env.currentAlbum.numsMedia.videos;
					mediaTotalInSubTree = env.currentAlbum.numsMediaInSubTree.imagesAndVideosTotal();
					imagesTotalInSubTree = env.currentAlbum.numsMediaInSubTree.images;
					videosTotalInSubTree = env.currentAlbum.numsMediaInSubTree.videos;
					mediaTotalInSubAlbums = mediaTotalInSubTree - mediaTotalInAlbum;
					imagesTotalInSubAlbums = imagesTotalInSubTree - imagesTotalInAlbum;
					videosTotalInSubAlbums = videosTotalInSubTree - videosTotalInAlbum;
				}

				// title = "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + "'>" + titleComponents[0] + "</a>";
				if (! isFolderTitle) {
				// if (! isFolderTitle && (! isSearchTitle || titleComponents[0] === env.options.by_search_string)) {
					if (env.options.page_title !== "")
						titleComponents.unshift(env.options.page_title);
					else
						titleComponents.unshift(util._t(".title-string"));
					linksForTitleComponents.unshift(env.options.folders_string);
				} else {
					if (env.options.page_title !== "")
						titleComponents[0] = env.options.page_title;
					else
						titleComponents[0] = util._t(".title-string");
				}

				var addSearchMarker = false;
				var addSelectionMarker = false;

				if (isDateTitle) {
					titleComponents[1] = "(" + util._t("#by-date") + ")";

					if (titleComponents.length > 2) {
						titleComponents[2] = parseInt(titleComponents[2]).toString();
						if (titleComponents.length > 3) {
							titleComponents[3] = util._t("#month-" + titleComponents[3]);
							if (titleComponents.length > 4) {
								titleComponents[4] = parseInt(titleComponents[4]).toString();
							}
						}
					}

					if (
						(singleMedia === null) &&
						! env.isMobile.any()
					) {
						titleCount = "<span class='title-count'>(";
						if (titleComponents.length === 2)
							titleCount += mediaTotalInSubAlbums + " ";
						else
							titleCount += mediaTotalInAlbum + " ";
						if (! imagesTotalInAlbum && videosTotalInAlbum)
							titleCount += util._t(".title-videos");
						else if (imagesTotalInAlbum && ! videosTotalInAlbum)
							titleCount += util._t(".title-images");
						else {
							let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
							let titleCountObject = $(titleCountHtml);
							if (titleComponents.length === 2)
								titleCountObject.attr("title", imagesTotalInSubAlbums + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums + " " + util._t(".title-videos"));
							else
								titleCountObject.attr("title", imagesTotalInAlbum + " " + util._t(".title-images") + ", " + videosTotalInAlbum + " " + util._t(".title-videos"));
							titleCount += titleCountObject.prop("outerHTML");
						}
						if (titleComponents.length >= 5)
							titleCount += " " + util._t(".title-in-day-album");
						else if (titleComponents.length >= 3)
							titleCount += " " + util._t(".title-in-date-album");
						titleCount += ")</span>";
					}
				} else if (isGpsTitle) {
					titleComponents[1] = "(" + util._t("#by-gps") + ")";

					for (i = 2; i < titleComponents.length; i ++) {
						if (i === titleComponents.length - 1) {
							gpsName = util.transformAltPlaceName(titleComponents[i]);
						} else {
							gpsName = titleComponents[i];
						}

						if (gpsName === '')
							gpsName = util._t('.not-specified');

						let a = $("<a></a>");
						a.attr("title", util._t("#place-icon-title") + gpsName + util._t("#place-icon-title-end"));
						titlesForTitleComponents[i] = a.attr("title");

						titleComponents[i] = gpsName;
					}

					if (singleMedia === null && ! env.isMobile.any()) {
						titleCount = "<span class='title-count'>(";
						if (titleComponents.length === 2)
							titleCount += mediaTotalInSubAlbums + " ";
						else
							titleCount += mediaTotalInAlbum + " ";
						if (! imagesTotalInAlbum && videosTotalInAlbum)
							titleCount += util._t(".title-videos");
						else if (imagesTotalInAlbum && ! videosTotalInAlbum)
							titleCount += util._t(".title-images");
						else {
							let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
							let titleCountObject = $(titleCountHtml);
							if (titleComponents.length === 2)
								titleCountObject.attr("title", imagesTotalInSubAlbums + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums + " " + util._t(".title-videos"));
							else
								titleCountObject.attr("title", imagesTotalInAlbum + " " + util._t(".title-images") + ", " + videosTotalInAlbum + " " + util._t(".title-videos"));
							titleCount += titleCountObject.prop("outerHTML");
						}
						if (titleComponents.length >= gpsLevelNumber + 2)
							titleCount += " " + util._t(".title-in-gps-album");
						else if (titleComponents.length >= 3)
							titleCount += " " + util._t(".title-in-gpss-album");
						titleCount += ")</span>";
					}
				} else if (isSearchTitle) {
					// i=0: title
					// i=1: env.options.by_search_string
					// (optional) i=2: image cache or folder
					// (optional) i=3 up: folder or image
					// (optional) i=n: image

					// if (
					// 	env.options.search_current_album &&
					// 	! util.isAnyRootCacheBase(env.options.cache_base_to_search_in)
					// ) {
					// 	title += "<span id='search-album-to-be-filled'></span>" + raquo;
					// }
					titleComponents[1] = "(" + util._t("#by-search") + ")";
					linksForTitleComponents[1] = env.currentAlbum.cacheBase;
					classesForTitleComponents[1] = ["search-link"];
					if (
						env.options.search_current_album &&
						! util.isAnyRootCacheBase(env.options.cache_base_to_search_in)
					) {
						classesForTitleComponents[1] = ["main-search-link"];
						// searchFolderCacheBase = albumCacheBase.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
						searchFolderCacheBase = env.options.cache_base_to_search_in;
						addSearchMarker = true;
					}
					titleComponents.pop();
					linksForTitleComponents.pop();
					// where =
					// 	"<a class='" + searchClass + "' href='" + env.hashBeginning + env.currentAlbum.cacheBase + "'>" +
					// 	util._t("#by-search") +
					// 	"</a>";

					// title += "<span class='title-no-anchor'>(" + where + ")</span>";
					// where = util.stripHtmlAndReplaceEntities(where);
					//
					// // do not show the options and the search words, they are visible in the menu
					// // show the image name, if it is there
					// if (singleMedia !== null) {
					// 	title += raquo;
					// }
					//
					// title += fillInSpan;

					if (
						singleMedia === null &&
						(env.currentAlbum.numsMedia.imagesAndVideosTotal() || env.currentAlbum.subalbums.length) &&
						! env.isMobile.any()
					) {
						titleCount = "<span class='title-count'>(";
						titleCount += util._t(".title-found") + ' ';
						if (env.currentAlbum.numsMedia.imagesAndVideosTotal()) {
							titleCount += mediaTotalInAlbum + " ";
							if (! imagesTotalInAlbum && videosTotalInAlbum)
								titleCount += util._t(".title-videos");
							else if (imagesTotalInAlbum && ! videosTotalInAlbum)
								titleCount += util._t(".title-images");
							else
								titleCount += util._t(".title-media");
							if (env.currentAlbum.subalbums.length)
								titleCount += " " + util._t(".title-and");
						}
						if (env.currentAlbum.subalbums.length) {
							titleCount += " " + env.currentAlbum.subalbums.length;
							titleCount += " " + util._t(".title-albums");
						}

						if (env.currentAlbum.hasOwnProperty("removedStopWords") && env.currentAlbum.removedStopWords.length) {
							// say that some search word hasn't been used
							titleCount += " - " + env.currentAlbum.removedStopWords.length + " " + util._t("#removed-stopwords") + ": ";
							for (i = 0; i < env.currentAlbum.removedStopWords.length; i ++) {
								if (i)
									titleCount += ", ";
								titleCount += env.currentAlbum.removedStopWords[i];
							}
						}

						titleCount += ")</span>";
					}

					// if (setDocumentTitle) {
					// 	// build the html page title
					// 	documentTitle += " (" + where +")" + raquoForTitle + documentTitle;
					// 	if (singleMedia !== null)
					// 		documentTitle = raquoForTitle + documentTitle;
					// }
				} else if (isSelectionTitle) {
					// i=0: title
					// i=1: env.options.by_selection_string
					// (optional) i=2: media folder cache base
					// (optional) i=3: media cache base

					titleComponents[1] = "(" + util._t("#by-selection") + ")";
					// title += raquo;
					// title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + env.options.by_selection_string + "'>(" + util._t("#by-selection") + ")</a>";
					// if (singleMedia !== null) {
					// 	title += raquo;
					// }
					//
					// title += fillInSpan;
					//
					// if (setDocumentTitle) {
					// 	documentTitle = " (" + util._t("#by-selection") + ")";
					// 	if (singleMedia !== null)
					// 		documentTitle += raquoForTitle + documentTitle;
					// }

					if (
						singleMedia === null &&
						(env.currentAlbum.numsMedia.imagesAndVideosTotal() || env.currentAlbum.subalbums.length) &&
						! env.isMobile.any()
					) {
						titleCount = "<span class='title-count'>(";
						// titleCount += util._t(".title-selected") + ' ';
						if (env.currentAlbum.numsMedia.imagesAndVideosTotal()) {
							titleCount += mediaTotalInAlbum + " ";
							if (! imagesTotalInAlbum && videosTotalInAlbum)
								titleCount += util._t(".title-videos");
							else if (imagesTotalInAlbum && ! videosTotalInAlbum)
								titleCount += util._t(".title-images");
							else
								titleCount += util._t(".title-media");
							if (env.currentAlbum.subalbums.length)
								titleCount += " " + util._t(".title-and");
						}
						if (env.currentAlbum.subalbums.length) {
							titleCount += " " + env.currentAlbum.subalbums.length;
							titleCount += " " + util._t(".title-albums");
						}

						titleCount += ")</span>";
					}

					// if (setDocumentTitle) {
					// 	if (singleMedia !== null)
					// 		documentTitle = raquoForTitle + documentTitle;
					// }
				} else if (isMapTitle) {
					// i=0: title
					// i=1: env.options.by_search_string
					// (optional) i=2: image cache or folder
					// (optional) i=3 up: folder or image
					// (optional) i=n: image
					titleComponents[1] = "(" + util._t("#by-map") + ")";
					// title += raquo;
					//
					// where =
					// 	"<a class='search-link' href='" + env.hashBeginning + env.currentAlbum.cacheBase + "'>" +
					// 	util._t("#by-map") +
					// 	"</a>";
					//
					// title += "<span class='title-no-anchor'>(" + where + ")</span>";
					// where = util.stripHtmlAndReplaceEntities(where);
					//
					// // do not show the options and the search words, they are visible in the menu
					// // show the image name, if it is there
					// if (singleMedia !== null) {
					// 	title += raquo;
					// }
					//
					// title += fillInSpan;

					if (
						titleComponents.length > 2 &&
						singleMedia === null &&
						(env.currentAlbum.numsMedia.imagesAndVideosTotal()) &&
						! env.isMobile.any()
					) {
						titleCount = "<span class='title-count'>(";
						titleCount += mediaTotalInAlbum + " ";
						if (! imagesTotalInAlbum && videosTotalInAlbum)
							titleCount += util._t(".title-videos");
						else if (imagesTotalInAlbum && ! videosTotalInAlbum)
							titleCount += util._t(".title-images");
						else
							titleCount += util._t(".title-media");
						titleCount += ")</span>";
					}

					// if (setDocumentTitle) {
					// 	// build the html page title
					// 	documentTitle += " (" + where + ")" + raquoForTitle + titleComponents[0];
					// 	if (singleMedia !== null)
					// 		documentTitle = raquoForTitle + documentTitle;
					// }
				} else {
					// folders title

					// if (titleComponents.length > 2 || singleMedia !== null)
					// 	title += raquo;

					let classes, link, titleElement;
					classes = ["search-link"];

					if (savedSearchAlbumCacheBase !== undefined && savedSearchAlbumCacheBase !== null) {
						searchFolderCacheBase = env.options.cache_base_to_search_in;
						// searchFolderCacheBase = getSearchFolderCacheBase(savedSearchAlbumCacheBase);
						// let searchIsInCurrentAlbumOnly = isSearchInCurrentAlbumOnly(savedSearchAlbumCacheBase);
						link = savedSearchAlbumCacheBase;
						classes = ["search-link"];
						if (util.isSearchCacheBase(savedSearchAlbumCacheBase)) {
							titleElement = util._t("#by-search");
							addSearchMarker = true;
							if (searchFolderCacheBase.split(env.options.cache_folder_separator).length > 1 && env.options.search_current_album) {
								classes = ["main-search-link"];
								// where =
								// 	"<a class='main-search-link' href='" + env.hashBeginning + savedSearchAlbumCacheBase + "'>" +
								// 	util._t("#by-search") +
								// 	"</a>";
							} else if (searchFolderCacheBase.split(env.options.cache_folder_separator).length <= 1 || ! env.options.search_current_album) {
								// where =
								// 	"<a class='search-link' href='" + env.hashBeginning + savedSearchAlbumCacheBase + "'>" +
								// 	util._t("#by-search") +
								// 	"</a>";
							}
						} else {
							// album in a selection
							titleElement = util._t("#by-selection");
							addSelectionMarker = true;
							// where =
							// 	"<a class='search-link' href='" + env.hashBeginning + savedSearchAlbumCacheBase + "'>" +
							// 	util._t("#by-selection") +
							// 	"</a>";
						}

						// if (addSearchMarker) {
						// 	title += "<span id='search-album-to-be-filled'></span>";
						// 	title += raquo;
						// }
						// title += "<span class='title-no-anchor'>(" + where + ")</span>";
						// title += raquo;
						// where = util.stripHtmlAndReplaceEntities(where);
						//
						// if (setDocumentTitle) {
						// 	documentTitle += " (" + where +")" + raquoForTitle + documentTitle;
						// }
					}

					// if (setDocumentTitle) {
					// 	if (titleComponents.length > 2 || singleMedia !== null)
					// 		documentTitle = raquoForTitle + documentTitle;
					// }

					// initialValue = 2;
					// if (
					// 	savedSearchAlbumCacheBase !== undefined &&
					// 	savedSearchAlbumCacheBase !== null &&
					// 	util.isSearchCacheBase(savedSearchAlbumCacheBase)
					// ) {
					// 	// the folders from the first until the search folder inclusive must not be shown
					// 	initialValue = savedSearchAlbumCacheBase.split(env.options.cache_folder_separator).slice(2).length + 1;
					// }
					// for (i = initialValue; i < titleComponents.length; ++i) {
					// 	if (i < titleComponents.length - 1 || singleMedia !== null)
					// 		title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + encodeURI(env.currentAlbum.ancestorsCacheBase[i - 1]) + "'>";
					// 	else
					// 		title += "<span class='title-no-anchor'>";
					//
					// 	title += textComponents[i];
					//
					// 	if (i < titleComponents.length - 1 || singleMedia !== null)
					// 		title += "</a>";
					// 	else
					// 		title += "</span>";
					//
					// 	if (i < titleComponents.length - 1 || singleMedia !== null)
					// 		title += raquo;
					// }
					//
					// title += fillInSpan;

					if (
						titleComponents.length > 1 &&
						(singleMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) &&
						! env.isMobile.any()
					) {
						titleCount = "<span class='title-count'>(";
						if (env.currentAlbum.numsMedia.imagesAndVideosTotal()) {
							titleCount += mediaTotalInAlbum + " ";
							if (! imagesTotalInAlbum && videosTotalInAlbum)
								titleCount += util._t(".title-videos") + " ";
							else if (imagesTotalInAlbum && ! videosTotalInAlbum)
								titleCount += util._t(".title-images") + " ";
							else {

								let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
								let titleCountObject = $(titleCountHtml);
								if (titleComponents.length === 2)
									titleCountObject.attr("title", imagesTotalInSubAlbums + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums + " " + util._t(".title-videos"));
								else
									titleCountObject.attr("title", imagesTotalInAlbum + " " + util._t(".title-images") + ", " + videosTotalInAlbum + " " + util._t(".title-videos"));
								titleCount += titleCountObject.prop("outerHTML");
							}
							titleCount += util._t(".title-in-album");
							if (mediaTotalInSubAlbums)
								titleCount += ", ";
						}
						if (mediaTotalInSubAlbums) {
							titleCount += mediaTotalInSubAlbums + " ";
							if (! imagesTotalInSubAlbums && videosTotalInSubAlbums)
								titleCount += util._t(".title-videos");
							else if (imagesTotalInSubAlbums && ! videosTotalInSubAlbums)
								titleCount += util._t(".title-images");
							else {
								let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
								let titleCountObject = $(titleCountHtml);
								titleCountObject.attr("title", imagesTotalInSubAlbums + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums + " " + util._t(".title-videos"));
								titleCount += titleCountObject.prop("outerHTML");
							}
							titleCount += " " + util._t(".title-in-subalbums");
						}
						if (mediaTotalInAlbum && mediaTotalInSubAlbums) {
							titleCount += ", ";

							let spanTitle = imagesTotalInSubTree + " " + util._t(".title-images") + ", " + videosTotalInSubTree + " " + util._t(".title-videos");
							let titleSpanHtml = "<span class='title-count-detail'>" + util._t(".title-total") + " " + mediaTotalInSubTree + "</span>";
							let titleSpan = $(titleSpanHtml);
							titleSpan.attr("title", spanTitle);

							titleCount += titleSpan.prop("outerHTML") + " ";
						}
						titleCount += ")</span>";
					}

					// if (setDocumentTitle) {
					// 	for (i = initialValue; i < titleComponents.length; ++i) {
					// 		// keep building the html page title
					// 		documentTitle = textComponents[i] + documentTitle;
					// 		if (i < titleComponents.length - 1 || singleMedia !== null)
					// 			documentTitle = raquoForTitle + documentTitle;
					// 	}
					// }
				}

				if (addSearchMarker) {
					numElements = searchFolderCacheBase.split(env.options.cache_folder_separator).length;
					titleComponents.splice(numElements, 0, " (" + util._t("#by-search") + ")");
					linksForTitleComponents.splice(numElements, 0, env.options.by_search_string);
				}

				let promise = env.currentAlbum.generatePositionsAndMediaInMediaAndSubalbums();

				promise.then(
					function() {
						documentTitleComponents = titleComponents.slice();
						if (singleMedia !== null) {
							let singleMediaName = singleMedia.nameForShowing(env.currentAlbum, true);
							let singleMediaNameHtml = "<span class='media-name'>" + singleMediaName + "</span>";

							// title += "<span class='media-name'>" + singleMedia.nameForShowing(env.currentAlbum, true) + "</span>";

							if (env.currentMedia.hasGpsData()) {
								let imgHtml = "<img class='title-img' height='20px' src='img/ic_place_white_24dp_2x.png'>";
								let img = $(imgHtml);
								let imgTitle = util._t("#show-on-map");
								if (! env.isMobile.any())
									imgTitle += " [" + util._t(".map-link-shortcut") + "]";
								img.attr("title", imgTitle);
								img.attr("alt", imgTitle);
								singleMediaNameHtml += "<a class='map-popup-trigger'>" + img.prop("outerHTML") + "</a>";
							}
							titleComponents.push(singleMediaNameHtml);
							documentTitleComponents.push(singleMediaName);
						}

						title = titleComponents.map(
							(component, i) => {
								let titleElement;
								if (linksForTitleComponents[i] !== undefined) {
									let a = $("<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + encodeURI(linksForTitleComponents[i]) + "'>" + component + "</a>");
									if (classesForTitleComponents[i] !== undefined)
										classesForTitleComponents[i].forEach(singleClass => a.addClass(singleClass));
									if (titlesForTitleComponents[i] !== undefined)
										a.attr("title", titlesForTitleComponents[i]);
									titleElement = a.prop("outerHTML");
								} else {
									titleElement = "<span class='title-no-anchor'>" + component + "</span>";
								}
								return titleElement;
							}
						).join(raquo);

						documentTitle = documentTitleComponents.reverse().join(raquoForTitle);

						if (singleMedia === null && env.currentAlbum.numPositionsInTree) {
							let markers = "";

							let showSingleMarker = (env.currentAlbum.numPositionsInMedia > 0 && env.currentAlbum.numPositionsInTree !== env.currentAlbum.numPositionsInSubalbums);
							let showDoubleMarker = (env.currentAlbum.numPositionsInSubalbums > 0);

							let imgTitle1, imgTitle2;
							let imgSrc1 = "img/ic_place_white_24dp_2x.png";
							let imgSrc2 = "img/ic_place_white_24dp_2x_double.png";
							if (showSingleMarker && ! showDoubleMarker || ! showSingleMarker && showDoubleMarker) {
								imgTitle1 = util._t("#show-markers-on-map");
								imgTitle2 = imgTitle1;
							} else if (showSingleMarker && showDoubleMarker){
								imgTitle1 = util._t("#show-album-markers-on-map");
								imgTitle2 = util._t("#show-tree-markers-on-map");
							}
							let imgAlt = util._t("#show-markers-on-map");
							let imgHtml =
								"<img " +
									"class='title-img' " +
									"height='20px' " +
									"src='" + imgSrc1 + "'" +
								">";
							let img = $(imgHtml);
							img.attr("alt", imgAlt);

							if (showSingleMarker) {
								if (! env.isMobile.any() && ! showDoubleMarker)
									imgTitle1 += " [" + util._t(".map-link-shortcut") + "]";
								img.attr("title", imgTitle1);
								img.attr("src", imgSrc1);
								markers += "<a class='map-popup-trigger'>" + img.prop("outerHTML") + "</a>";
							}
							if (showDoubleMarker) {
								if (! env.isMobile.any())
									imgTitle2 += " [" + util._t(".map-link-shortcut") + "]";
								img.attr("title", imgTitle2);
								img.attr("src", imgSrc2);
								markers += "<a class='map-popup-trigger-double'>" + img.prop("outerHTML") + "</a>";
							}

							// title = title.markers(
							// 	fillInSpan,
							// 	markers
							// );
							title += markers;
						}

						if (env.isMobile.any()) {
							// leave only the last link on mobile
							// separate on "&raquo;""
							let titleArray = title.split(raquo);

							for (i = titleArray.length - 1; i >= 0; i --) {
								if (titleArray[i].indexOf(" href='#!") !== -1) {
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

						title = "<span class='title-main'>" + title + "</span>";

						if (id === "album")
							$("#album-view .title-string").html(title);
						else
							$(".media-box#" + id + " .title-string").html(title);

						if (env.isMobile.any() && (id == "center" || id == "album")) {
							$(".dots").off("click").on(
								"click",
								{singleMedia: singleMedia},
								function(ev) {
									if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
										$(".dots-surroundings").hide();
										$(".hidden-title").show();

										if (id === "center") {
											let event = {data: {}};
											event.data.resize = true;
											event.data.id = "center";
											let scalePromise = ev.data.currentMedia.scale(event);
											scalePromise.then(
												function() {
													if (ev.data.currentMedia.isImage()) {
														util.setPinchButtonsPosition();
														util.setPinchButtonsVisibility();
													}
													util.setSelectButtonPosition();
													util.setDescriptionOptions();
													util.correctElementPositions();
												}
											);
										}

										return false;
									}
								}
							);
						}

						// if (setDocumentTitle) {
						// 	// keep generating the html page title
						// 	if (singleMedia !== null)
						// 		documentTitle = singleMedia.nameForShowing(env.currentAlbum) + documentTitle;
						// 	else if (env.currentAlbum !== null && ! env.currentAlbum.subalbums.length)
						// 		documentTitle = util.trimExtension(env.currentAlbum.media[0].name) + raquoForTitle + documentTitle;
						//
						// 	document.title = documentTitle;
						// }

						var toBeResolved = true;
						if (addSearchMarker) {
							toBeResolved = false;
							// for searches in current folder we must get the names from the album
							// we must use getAlbum() because the album could not be in the cache yet (as when ctl-r is pressed)
							var promise = phFl.getAlbum(searchFolderCacheBase, util.errorThenGoUp, {getMedia: true, getPositions: true});
							promise.then(
								function(theAlbum) {
									var whereLinks = '', whereLinksArray = [], thisCacheBase, name, documentTitle;

									if (theAlbum.hasOwnProperty('ancestorsNames')) {
										for (var i = 0; i < theAlbum.ancestorsNames.length; i ++) {
											if (theAlbum.hasOwnProperty("ancestorsTitles") && theAlbum.ancestorsTitles[i] !== theAlbum.ancestorsNames[i])
												name = theAlbum.ancestorsTitles[i] + "<span class='real-name'>(" + theAlbum.ancestorsNames[i] + ")";
											else
												name = theAlbum.ancestorsNames[i];
											if (i === 0) {
												if (name === env.options.by_date_string)
													name = "(" + util._t("#by-date") + ")";
												else if (name === env.options.by_gps_string)
													name = "(" + util._t("#by-gps") + ")";
												if (name === env.options.by_map_string)
													name = "(" + util._t("#by-map") + ")";
											} else if (i === 2 && util.isByDateCacheBase(env.options.cache_base_to_search_in)) {
											// convert the month number to the localized month name
												name = util._t("#month-" + name);
											}
											thisCacheBase = env.hashBeginning + theAlbum.ancestorsCacheBase[i];
											if (name)
												whereLinksArray.push("<a class='search-link' href='" + thisCacheBase + "'>" + name + "</a>");
										}
										whereLinks = whereLinksArray.join(raquo);
									}

									// insert the album tree links in DOM (if )
									$("#search-album-to-be-filled").replaceWith(whereLinks);

									if (setDocumentTitle) {
										// correct the page title too
										documentTitle = $(document).attr('title');
										documentTitle = documentTitle.replace(
											"(" + util._t("#by-search") + ")",
											"(" + util._t("#by-search") + ")" + raquoForTitle + util.stripHtmlAndReplaceEntities(whereLinksArray.reverse().join(raquoForTitle))
										);
										document.title = documentTitle;
									}

									TopFunctions.trackPiwik(id);

									resolve_setTitle(self);
								},
								function() {
									console.trace();
								}
							);
						} else {
							TopFunctions.trackPiwik(id);
						}

						util.setTitleOptions();

						// activate the map popup trigger in the title
						$(".map-popup-trigger").off("click").on(
							"click",
							function(ev, from) {
								// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
								env.selectorClickedToOpenTheMap = ".map-popup-trigger";
								if (env.currentMedia !== null && env.currentMedia.hasGpsData() || env.currentMedia === null && env.currentAlbum.numPositionsInTree) {
									TopFunctions.generateMapFromTitle(ev, from);
								} else {
									TopFunctions.generateMapFromTitleWithoutSubalbums(ev, from);
								}
							}
						);

						$(".map-popup-trigger-double").off("click").on(
							"click",
							function(ev, from) {
								// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
								env.selectorClickedToOpenTheMap = ".map-popup-trigger-double";
								TopFunctions.generateMapFromTitle(ev, from);
							}
						);

						if (
							[".map-popup-trigger", ".map-popup-trigger-double"].indexOf(env.selectorClickedToOpenTheMap) !== -1 &&
							env.previousAlbum !== null &&
							env.previousAlbum.isMap() && (
								env.previousMedia === null ||
								env.previousAlbum.isAlbumWithOneMedia()
							) &&
							env.fromEscKey ||
							env.mapRefreshType !== "none"
						) {
							env.fromEscKey = false;
							$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
						}

						$('.modal-close').off("click").on(
							"click",
							function() {
								$("#my-modal.modal").css("display", "none");
								// env.popupRefreshType = "previousAlbum";
								$('#mapdiv').empty();
							}
						);
						if (toBeResolved)
							resolve_setTitle(self);
					}
				);
			}
		);
	};

	TopFunctions.trackPiwik = function(id) {
		// trigger piwik tracking. It's here because it needs document.title
		if (env.options.piwik_server && env.options.piwik_id && (id === "album" || id === "center")) {
			_paq.push(['setCustomUrl', '/' + window.location.hash.substr(1)]);
			// _paq.push(['setDocumentTitle', PhotoFloat.convertHashToCacheBase(location.hash)]);
			let titleText, splittedTitle;
			if (id === "center") {
				titleText = $(".media-box#center .title-string")[0].textContent;
			} else {
				// id is "album"
				// let titleCount = $("#album-view .title-string .title-count").detach();
				// let tags = $("#album-view .title-string .tags").detach();
				// titleText = $("#album-view .title-string")[0].textContent;
				// $("#album-view .title-string").append(titleCount);
				// $("#album-view .title-string").append(tags);
				titleText = $("#album-view .title-string .title-main")[0].textContent;
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
		env.isABrowsingModeChange = true;
	};

	SingleMedia.prototype.toggleSelectedStatus = function(album, clickedSelector) {
		if (env.selectionAlbum.isEmpty())
			util.initializeSelectionAlbum();
		if (this.isSelected()) {
			this.removeFromSelection(clickedSelector);
			if (util.isPopup() && env.currentAlbum.isSelection()) {
				$('.leaflet-popup-close-button')[0].click();
				if (env.mapAlbum.media.length > 1) {
					env.popupRefreshType = "mapAlbum";
					// close the map and reopen it
					$('.modal-close')[0].click();
					$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
				}
				if (env.mapAlbum.media.length === 1) {
					// we are in a map: close it
					$('.modal-close')[0].click();
				}
			}
			f.updateMenu();
			if (env.currentAlbum.isSelection() && env.currentMedia === null && ! env.currentAlbum.isAlbumWithOneMedia())
				TopFunctions.setTitle("album", null);
		} else {
			if (util.nothingIsSelected())
				util.initializeSelectionAlbum();
			this.addToSelection(album, clickedSelector);
			f.updateMenu();
		}
	};

	Album.prototype.toggleSubalbumSelection = function(clickedSelector) {
		if (env.selectionAlbum.isEmpty())
			util.initializeSelectionAlbum();
		var iSubalbum = this.subalbums.findIndex(subalbum => subalbum.cacheBase === $(clickedSelector).parent().parent().attr("id"));
		var subalbum = this.subalbums[iSubalbum];
		if (subalbum.isSelected()) {
			let removeSubalbumPromise = this.removeSubalbumFromSelection(clickedSelector);
			removeSubalbumPromise.then(
				function subalbumRemoved() {
					if (util.nothingIsSelected()) {
						util.initializeSelectionAlbum();
					} else if (env.currentAlbum.isSelection()) {
						// env.currentAlbum.showSubalbums();
					}
					f.updateMenu();
				}
			);
		} else {
			let addSubalbumPromise = this.addSubalbumToSelection(iSubalbum, clickedSelector);
			addSubalbumPromise.then(
				function subalbumAdded() {
					f.updateMenu();
				}
			);
		}
	};

	SingleMedia.prototype.show = function(album, id) {

		function loadNextPrevMedia(self, containerHeight, containerWidth) {

			// $(mediaSelector).off(loadEvent);

			// if (id === "center") {
			$("#pinch-in").off("click").on("click", pS.pinchIn);
			$("#pinch-out").off("click").on("click", pS.pinchOut);

			let selectSrc = 'img/checkbox-unchecked-48px.png';
			let titleSelector = "#select-single-media";
			if (self.isSelected()) {
				selectSrc = 'img/checkbox-checked-48px.png';
				titleSelector = "#unselect-single-media";
			}
			$("#media-select-box .select-box").attr("title", util._t(titleSelector)).attr("alt", util._t("#selector")).attr("src", selectSrc);
			$("#media-select-box").off("click").on(
				"click",
				{singleMedia: self, clickedSelector: "#media-select-box"},
				function(ev) {
					ev.stopPropagation();
					ev.preventDefault();
					ev.data.singleMedia.toggleSelectedStatus(album, ev.data.clickedSelector);
				}
			);

			if (self.isImage()) {
				pS.addMediaGesturesDetection();
				util.setPinchButtonsPosition();
				util.setPinchButtonsVisibility();
			}
			util.setSelectButtonPosition();
			util.setDescriptionOptions();
			util.correctElementPositions();

			if (album.numsMedia.imagesAndVideosTotal() > 1) {
				env.prevMedia.show(album, 'left');
				env.nextMedia.show(album, 'right');
			}

			$(window).off("resize").on(
				"resize",
				function () {
					env.windowWidth = $(window).outerWidth();
					env.windowHeight = $(window).outerHeight();

					$("#loading").show();

					var event = {data: {}};

					event.data.resize = true;

					event.data.id = "center";

					// prev and next tree in the DOM must be given the correct sizes
					$(".media-box#left, .media-box#right").css("width", env.windowWidth);
					$(".media-box#left, .media-box#right").css("height", env.windowHeight);

					let scalePromise = self.scale(event);
					scalePromise.then(
						function() {
							if (self.isImage()) {
								if (env.currentZoom === env.initialZoom)
									f.pinchSwipeInitialization();
								util.setPinchButtonsPosition();
								util.setPinchButtonsVisibility();
							}
							util.setSelectButtonPosition();
							util.setDescriptionOptions();
							util.correctElementPositions();
						}
					);

					if (album.numsMedia.imagesAndVideosTotal() > 1) {
						event.data.id = "left";
						env.prevMedia.scale(event);

						event.data.id = "right";
						env.nextMedia.scale(event);
					}

					if (util.isMap()) {
						// the map must be generated again including the points that only carry protected content
						env.mapRefreshType = "resize";

						if (util.isPopup()) {
							env.popupRefreshType = "mapAlbum";
							$('.leaflet-popup-close-button')[0].click();
						} else {
							env.popupRefreshType = "none";
						}

						// close the map and reopen it
						$('.modal-close')[0].click();
						$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
					}
				}
			);
			// }
		}
		// end of loadNextPrevMedia auxiliary function

		//////////////////////////////////
		// beginning of show method body
		//////////////////////////////////
		var text, mediaSelector;
		var exposureTime, heightForMedia, heightForMediaAndTitle;
		var previousMediaIndex, nextMediaIndex, whatMedia;

		$("#downloading-media").hide();

		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, savedSearchAlbumCacheBase] = phFl.decodeHash(location.hash);

		env.mediaLink = phFl.encodeHash(env.currentAlbum.cacheBase, this, foundAlbumCacheBase, savedSearchAlbumCacheBase);
		env.firstEscKey = true;

		if (id === "center") {
			$(".media-bar").show();
			whatMedia = this;
		} else if (id === "left") {
			whatMedia = env.prevMedia;
		} else if (id === "right") {
			whatMedia = env.nextMedia;
		}

		$("#media-view").removeClass("hidden");
		$("#album-and-media-container").addClass("show-media");
		if (
			! env.options.hide_bottom_thumbnails && ! env.currentAlbum.isAlbumWithOneMedia() && $("#thumbs").html() === "" ||
			env.albumOfPreviousState !== env.currentAlbum ||
			env.albumOfPreviousState !== null && env.isFromAuthForm
		) {
			env.currentAlbum.showMedia();
		} else {
			util.scrollToThumb();
		}
		util.addMediaLazyLoader();
		env.isFromAuthForm = false;
		$("#powered-by").hide();

		$("#thumbs").off('mousewheel').on('mousewheel', TopFunctions.scrollBottomThumbs);


		var setTitlePromise = TopFunctions.setTitle(id, whatMedia, this);
		setTitlePromise.then(
			function titleSet(self) {
				heightForMediaAndTitle = util.mediaBoxContainerHeight();

				var titleHeight = 0;
				if ($(".media-box#" + id + " .title").is(":visible"))
					titleHeight = $(".media-box#" + id + " .title").outerHeight();

				heightForMedia = heightForMediaAndTitle - titleHeight;

				if (id === "center") {
					$("#media-box-container").css("width", env.windowWidth * 3).css("height", heightForMediaAndTitle);
					$("#media-box-container").css("transform", "translate(-" + env.windowWidth + "px, 0px)");
					$(".media-box").css("width", env.windowWidth).css("height", heightForMediaAndTitle);
					$(".media-box .media-box-inner").css("width", env.windowWidth).css("height", heightForMedia);
					$(".media-box").show();

					env.currentAlbum.media[env.currentMediaIndex].byDateName =
						util.pathJoin([env.currentAlbum.media[env.currentMediaIndex].dayAlbum, env.currentAlbum.media[env.currentMediaIndex].name]);
					if (env.currentAlbum.media[env.currentMediaIndex].hasOwnProperty("gpsAlbum"))
						env.currentAlbum.media[env.currentMediaIndex].byGpsName =
							util.pathJoin([env.currentAlbum.media[env.currentMediaIndex].gpsAlbum, env.currentAlbum.media[env.currentMediaIndex].name]);

					if (! env.currentAlbum.isAlbumWithOneMedia()) {
						// prepare for previous media
						previousMediaIndex = (env.currentMediaIndex === 0 ?
												env.currentAlbum.numsMedia.imagesAndVideosTotal() - 1 :
												env.currentMediaIndex - 1);
						env.prevMedia = env.currentAlbum.media[previousMediaIndex];
						env.prevMedia.byDateName = util.pathJoin([env.prevMedia.dayAlbum, env.prevMedia.name]);
						if (env.prevMedia.hasOwnProperty("gpsAlbum"))
							env.prevMedia.byGpsName = util.pathJoin([env.prevMedia.gpsAlbum, env.prevMedia.name]);

						// prepare for next media
						nextMediaIndex = (env.currentMediaIndex === env.currentAlbum.numsMedia.imagesAndVideosTotal() - 1 ?
											0 :
											env.currentMediaIndex + 1);
						env.nextMedia = env.currentAlbum.media[nextMediaIndex];
						env.nextMedia.byDateName = util.pathJoin([env.nextMedia.dayAlbum, env.nextMedia.name]);
						if (env.nextMedia.hasOwnProperty("gpsAlbum"))
							env.nextMedia.byGpsName = util.pathJoin([env.nextMedia.gpsAlbum, env.nextMedia.name]);
					}
				}

				var mediaBoxInnerElement = $(".media-box#" + id + " .media-box-inner");
				// empty the img container: another image will be put in there

				if (self.isVideo() && ! f.videoOK()) {
					mediaBoxInnerElement.empty();
					f.addVideoUnsupportedMarker(id);
					if (id === "center")
						loadNextPrevMedia(self);
				} else {
					let newMedia;
					if (self.isVideo()) {
						mediaSelector = ".media-box#" + id + " .media-box-inner video";
						newMedia = $("<video>");
					} else {
						mediaSelector = ".media-box#" + id + " .media-box-inner img";
						newMedia = $("<img>");
					}
					// is the following line correct for videos?
					let mediaSrc = self.chooseMediaReduction(id, env.fullScreenStatus);
					let mediaHtml = self.createMediaHtml(album, id, env.fullScreenStatus);

					let loadEvent = self.chooseTriggerEvent();

					if (mediaBoxInnerElement.html() !== mediaHtml) {
						// only replace the media-box-inner content if it's not yet there
						mediaBoxInnerElement.empty();
						mediaBoxInnerElement.show().append(mediaHtml);

						if (id === "center") {
							$("link[rel=image_src]").remove();
							$('link[rel="video_src"]').remove();
						}
						$("head").append(self.createMediaLinkTag(mediaSrc));
					}

					if (id === "center") {
						$(mediaBoxInnerElement).css("opacity", 1);
						self.setDescription();
					}

					// we use a trick in order to manage the loading of the image/video, from https://www.seancdavis.com/blog/wait-until-all-images-loaded/
					// the trick is to bind the event to a generic element not in the DOM, and to set its source after the onload event is bound
					newMedia.off(loadEvent).on(
					// $(mediaSelector).off(loadEvent).on(
						loadEvent,
						{
							id: id,
							resize: false,
						},
						function (event) {
							$(mediaSelector).off(loadEvent);
							let scalePromise = self.scale(event);
							scalePromise.then(
								function([containerHeight, containerWidth]) {
									if (id === "center") {
										loadNextPrevMedia(self, containerHeight, containerWidth);
									}
									// }
								}
							);
						}
					);
					newMedia.attr("src", $(mediaSelector).attr("src"));
					if (id === "center") {
						if (! env.options.persistent_metadata) {
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

					if (self.isImage())
						mediaBoxInnerElement.off("mousewheel").on("mousewheel", pS.swipeOnWheel);

					$(".media-box#center .media-box-inner .media-bar").off("click").on(
						"click",
						function(ev) {
							ev.stopPropagation();
						}
					).off("contextmenu").on(
						"contextmenu",
						function(ev) {
							ev.stopPropagation();
						}
					);

					if (env.currentAlbum.isAlbumWithOneMedia()) {
						mediaBoxInnerElement.css('cursor', 'default');
					} else {
						[albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, savedSearchAlbumCacheBase] = phFl.decodeHash(location.hash);

						// $("#next").show();
						// $("#prev").show();
						mediaBoxInnerElement.css('cursor', '').off("contextmenu").on(
							"contextmenu",
							function(ev) {
								if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
									if (env.currentZoom === env.initialZoom) {
										ev.preventDefault();
										env.prevMedia.swipeRight();
										return false;
									}
								}
								// contextMenu = true;
								return true;
							}
						);

						$("#prev").off("click").on("click", function(ev) {
							if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
								env.prevMedia.swipeRight();
								return false;
							}
							return true;
						});
						$("#next").off("click").on("click", function(ev) {
							if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
								env.nextMedia.swipeLeft();
								return false;
							}
							return true;
						});
					}

					var trueOriginalMediaPath = encodeURI(self.trueOriginalMediaPath());
					$(".download-single-media .download-link").attr("href", trueOriginalMediaPath).attr("download", "");
				}

				var originalMediaPath = encodeURI(self.originalMediaPath());
				$(".media-box#" + id + " .original-link").attr("target", "_blank").attr("href", originalMediaPath);
				if (self.hasGpsData()) {
					$(".media-box#" + id + " .map-link").off("click").on(
						"click",
						function() {
							$(".map-popup-trigger")[0].click();
						}
					);
					$(".media-box#" + id + " .map-link").show();
					$(".media-box#" + id + " .menu-map-divider").show();
				} else {
					$(".media-box#" + id + " .map-link").removeAttr("href");
					// $(".media-box#" + id + " .map-link").removeAttr("href").css("cursor", "pointer");
					$(".media-box#" + id + " .map-link").hide();
					$(".media-box#" + id + " .menu-map-divider").hide();
				}

				if (id === "center") {
					$(".media-box#center .metadata-show").off("click").on("click", f.toggleMetadataFromMouse);
					$(".media-box#center .metadata-hide").off("click").on("click", f.toggleMetadataFromMouse);
					$(".media-box#center .metadata").off("click").on("click", f.toggleMetadataFromMouse);
					$(".media-box#center .fullscreen").off("click").on("click", TopFunctions.toggleFullscreenFromMouse);

					// set social buttons events
					if (env.currentMedia.isVideo())
						$("#media-center").off("loadstart").on("loadstart", util.socialButtons);
					else
						$("#media-center").off("load").on("load", util.socialButtons);
				}

				$(".media-box#" + id + " .metadata tr.gps").off("click");
				text = "<table>";
				// Here we keep only the technical metadata
				if (self.metadata.hasOwnProperty("title") && self.metadata.title && self.metadata.title !== self.name)
					text += "<tr><td class='metadata-data-name'></td><td>" + self.name + "</td></tr>";
				if (self.date !== undefined)
					text += "<tr><td class='metadata-data-date'></td><td>" + self.date + "</td></tr>";
				var fileSize = self.fileSizes[0].images;
				if (self.isVideo())
					fileSize = self.fileSizes[0].videos;
				text += "<tr><td class='metadata-data-file-size'></td><td>" + f.humanFileSize(fileSize) + "</td></tr>";
				if (self.metadata.size !== undefined)
					text += "<tr><td class='metadata-data-size'></td><td>" + self.metadata.size[0] + " x " + self.metadata.size[1] + "</td></tr>";
				if (self.metadata.make !== undefined)
					text += "<tr><td class='metadata-data-make'></td><td>" + self.metadata.make + "</td></tr>";
				if (self.metadata.model !== undefined)
					text += "<tr><td class='metadata-data-model'></td><td>" + self.metadata.model + "</td></tr>";
				if (self.metadata.aperture !== undefined)
					text += "<tr><td class='metadata-data-aperture'></td><td> f/" + self.metadata.aperture + "</td></tr>";
				if (self.metadata.focalLength !== undefined)
					text += "<tr><td class='metadata-data-focalLength'></td><td>" + self.metadata.focalLength + " mm</td></tr>";
				if (self.metadata.subjectDistanceRange !== undefined)
					text += "<tr><td class='metadata-data-subjectDistanceRange'></td><td>" + self.metadata.subjectDistanceRange + "</td></tr>";
				if (self.metadata.iso !== undefined)
					text += "<tr><td class='metadata-data-iso'></td><td>" + self.metadata.iso + "</td></tr>";
				if (self.metadata.sceneCaptureType !== undefined)
					text += "<tr><td class='metadata-data-sceneCaptureType'></td><td>" + self.metadata.sceneCaptureType + "</td></tr>";
				if (self.metadata.exposureTime !== undefined) {
					if (typeof self.metadata.exposureTime === "string")
						exposureTime = self.metadata.exposureTime;
					else if (self.metadata.exposureTime > 0.3)
						exposureTime = Math.round(self.metadata.exposureTime * 10 ) / 10;
					else
						exposureTime = "1/" + Math.round(1 / self.metadata.exposureTime);
					text += "<tr><td class='metadata-data-exposureTime'></td><td>" + exposureTime + " sec</td></tr>";
				}
				if (self.metadata.exposureProgram !== undefined)
					text += "<tr><td class='metadata-data-exposureProgram'></td><td>" + self.metadata.exposureProgram + "</td></tr>";
				if (self.metadata.exposureCompensation !== undefined)
					text += "<tr><td class='metadata-data-exposureCompensation'></td><td>" + self.metadata.exposureCompensation + "</td></tr>";
				if (self.metadata.spectralSensitivity !== undefined)
					text += "<tr><td class='metadata-data-spectralSensitivity'></td><td>" + self.metadata.spectralSensitivity + "</td></tr>";
				if (self.metadata.sensingMethod !== undefined)
					text += "<tr><td class='metadata-data-sensingMethod'></td><td>" + self.metadata.sensingMethod + "</td></tr>";
				if (self.metadata.lightSource !== undefined)
					text += "<tr><td class='metadata-data-lightSource'></td><td>" + self.metadata.lightSource + "</td></tr>";
				if (self.metadata.flash !== undefined)
					text += "<tr><td class='metadata-data-flash'></td><td>" + self.metadata.flash + "</td></tr>";
				if (self.metadata.orientationText !== undefined)
					text += "<tr><td class='metadata-data-orientation'></td><td>" + self.metadata.orientationText + "</td></tr>";
				if (self.metadata.duration !== undefined)
					text += "<tr><td class='metadata-data-duration'></td><td>" + self.metadata.duration + " sec</td></tr>";
				if (self.metadata.latitude !== undefined)
					text += "<tr class='map-link-from-gps gps'><td class='metadata-data-latitude'></td><td>" + self.metadata.latitudeMS + " </td></tr>";
				if (self.metadata.longitude !== undefined)
					text += "<tr class='map-link-from-gps gps'><td class='metadata-data-longitude'></td><td>" + self.metadata.longitudeMS + " </td></tr>";
				if (self.metadata.altitude !== undefined)
					text += "<tr class='map-link-from-gps gps'><td class='metadata-data-altitude'></td><td>" + self.metadata.altitude + " m</td></tr>";
				text += "</table>";
				$(".media-box#" + id + " .metadata").html(text);
				var linkTitle = util._t('#show-map');
				if (! env.isMobile.any())
					linkTitle += " [" + util._t(".map-link-shortcut") + "]";
				$(".media-box#" + id + " .metadata tr.gps").attr("title", linkTitle).off("click").on(
					"click",
					function() {
						$(".map-popup-trigger")[0].click();
					}
				);

				if (id === "center") {
					// When there is both a media and an album, we display the media's description; else it's the album's one
					if (env.currentMedia === null || ! env.currentMedia.hasSomeDescription()) {
						env.currentAlbum.setDescription();
					} else {
						env.currentMedia.setDescription();
					}
					util.setDescriptionOptions();
					util.correctElementPositions();
					util.setMediaOptions();

					f.updateMenu();
				}

				util.translate();

				$("#subalbums").hide();
			}
		);
	};

	TopFunctions.scrollBottomThumbs = function(e, delta) {
		this.scrollLeft -= (delta * 80);
		e.preventDefault();
	};

	TopFunctions.scrollAlbum = function(e, delta) {
		this.scrollTop -= (delta * 80);
		e.preventDefault();
	};


	Album.prototype.prepareForShowing = function(mediaIndex) {

		if (env.currentMedia !== null && env.currentMedia.isVideo())
			// stop the video, otherwise it will keep playing
			$("video#media-center")[0].pause();

		if (this.numsMediaInSubTree.imagesAndVideosTotal() === 0 && ! this.isSearch()) {
			// the album hasn't any content:
			// either the hash is wrong or it's a protected content album
			// go up
			window.location.href = util.upHash();
			return;
		}

		util.undie();
		$("#loading").hide();

		if (this !== env.currentAlbum) {
			// this if condition is required for when a password is guessed
			env.previousAlbum = env.currentAlbum;
		}
		env.albumOfPreviousState = env.currentAlbum;
		env.currentAlbum = this;

		// if (this !== env.currentAlbum) {
		// 	env.previousAlbum = env.currentAlbum;
		// 	env.currentAlbum = null;
		// }

		// if (env.currentAlbum && mediaIndex !== -1) {
		// // if (env.currentAlbum && env.currentAlbum.isByDate() && mediaIndex !== -1) {
		// 	env.previousMedia = this.media[mediaIndex];
		// } else {
		env.previousMedia = env.currentMedia;
		// }

		env.currentMedia = null;
		if (mediaIndex !== -1)
			env.currentMedia = env.currentAlbum.media[mediaIndex];
		env.currentMediaIndex = mediaIndex;

		var isAlbumWithOneMedia = env.currentAlbum.isAlbumWithOneMedia();

		// f.setOptions();

		let menuIconTitle = util._t("#menu-icon-title");
		if (! env.isMobile.any())
			menuIconTitle += " [" + util._t("#menu-icon-title-shortcut") + util._t("#menu-icon-title-end") + "]";
		$("#menu-icon").attr("title", menuIconTitle);
		if (env.currentMedia === null)
			env.currentAlbum.sortAlbumsMedia();

		if (isAlbumWithOneMedia) {
			env.currentMedia = env.currentAlbum.media[0];
			env.currentMediaIndex = 0;
			$("#media-view").css("cursor", "default");
			$("#album-and-media-container").addClass("one-media");
			env.nextMedia = null;
			env.prevMedia = null;
		} else {
			$("#album-and-media-container").removeClass("one-media");
			$("#media-view").css("cursor", "ew-resize");
		}

		$("#album-view #subalbums, #album-view #thumbs, #media-view").removeClass("hidden-by-no-results");

		if (env.currentMedia !== null) {
			env.nextMedia = null;
			env.prevMedia = null;
			env.currentMedia.show(env.currentAlbum, 'center');
		} else {
			// currentMedia is null
			$("#media-view").addClass("hidden");
			$("#album-and-media-container").removeClass("show-media");
			$("#album-view").removeAttr("height");

			if (env.previousMedia === null)
				$("html, body").stop().animate({ scrollTop: 0 }, "slow");
			$("#thumbs").off('mousewheel');
			$("#thumbs").css("height", "");
			$(".thumb-container").removeClass("current-thumb");
			$("#media-view, #album-view").removeClass("no-bottom-space");
			$("#album-view, #album-view #subalbums").removeClass("hidden");
			$("body").off('mousewheel').on('mousewheel', TopFunctions.scrollAlbum);

			util.setMediaOptions();

			TopFunctions.setTitle("album", null).then(
				function titleSet() {
					if ($("#album-view").is(":visible")) {
						env.currentAlbum.showSubalbums();
						if (
							env.albumOfPreviousState === null || (
								env.albumOfPreviousState !== env.currentAlbum ||
								env.albumOfPreviousState !== null && env.isFromAuthForm
							)
						) {
							env.currentAlbum.showMedia();
						} else {
							util.scrollToThumb();
						}
						util.addMediaLazyLoader();
						env.isFromAuthForm = false;
					}
				}
			);
			$("#powered-by").show();
		}

		// // options function must be called again in order to set elements previously absent
		// f.setOptions();
		if (env.currentMedia === null && env.currentAlbum !== null && ! env.currentAlbum.subalbums.length) {
			// no subalbums: set social buttons href's when all the stuff is loaded
			$(window).off("load").on("load", util.socialButtons());
		} else {
			// subalbums are present, we have to wait when all the random thumbnails will be loaded
		}
	};

	Album.prototype.bindSubalbumSortEvents = function() {
		// binds the click events to the sort buttons

		var self = this;

		$("li.album-sort").off("click");
		$("li.album-sort.by-date").on(
			"click",
			function(ev) {
				self.sortSubalbumsByDate(ev);
			}
		);
		$("li.album-sort.by-name").on(
			"click",
			function(ev) {
				self.sortSubalbumsByName(ev);
			}
		);
		$("li.album-sort.reverse").on(
			"click",
			function(ev) {
				self.sortSubalbumsReverse(ev);
			}
		);
	};

	Album.prototype.bindMediaSortEvents = function() {
		// binds the click events to the sort buttons

		var self = this;

		$("li.media-sort").off("click");
		$("li.media-sort.by-date").on(
			"click",
			function(ev) {
				self.sortMediaByDate(ev);
			}
		);
		$("li.media-sort.by-name").on(
			"click",
			function(ev) {
				self.sortMediaByName(ev);
			}
		);
		$("li.media-sort.reverse").on(
			"click",
			function(ev) {
				self.sortMediaReverse(ev);
			}
		);
	};

	Album.prototype.sortSubalbumsByDate = function(ev) {
		if (
			this.isUndefinedOrTrue("albumNameSort") &&
			ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.albumNameSort = false;
			f.setBooleanCookie("albumNameSortRequested", false);
			// f.setBooleanCookie("albumReverseSortRequested", this.albumReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			env.currentAlbum.showSubalbums(true);
		}
		return false;
	};

	Album.prototype.sortSubalbumsByName = function(ev) {
		if (
			this.isUndefinedOrFalse("albumNameSort") &&
			ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.albumNameSort = true;
			f.setBooleanCookie("albumNameSortRequested", true);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			env.currentAlbum.showSubalbums(true);
		}
		return false;
	};

	Album.prototype.sortSubalbumsReverse = function(ev) {
		if (
			ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.albumReverseSort = ! env.albumReverseSort;
			f.setBooleanCookie("albumReverseSortRequested", env.albumReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			env.currentAlbum.showSubalbums(true);
		}
		return false;
	};

	Album.prototype.sortMediaByDate = function (ev) {
		if (
			this.mediaNameSort &&
			ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.mediaNameSort = false;
			f.setBooleanCookie("mediaNameSortRequested", false);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			this.showMedia();
			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				env.mapAlbum.showMedia();
				map.updatePopup();
			}
		}
		return false;
	};


	Album.prototype.sortMediaByName = function(ev) {
		if (
			! this.mediaNameSort &&
			ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.mediaNameSort = true;
			f.setBooleanCookie("mediaNameSortRequested", true);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			this.showMedia();

			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				env.mapAlbum.showMedia();
				map.updatePopup();
			}
		}
		return false;
	};

	Album.prototype.sortMediaReverse = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.mediaReverseSort = ! env.mediaReverseSort;
			f.setBooleanCookie("mediaReverseSortRequested", env.mediaReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			this.showMedia();

			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				env.mapAlbum.showMedia();
				map.updatePopup();
			}
		}
		return false;
	};

	TopFunctions.prototype.toggleTitleAndBottomThumbnailsAndDescriptionsAndTags = function(ev) {
		// if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
		var howMany = 0;
		if (env.options.hide_title)
			howMany ++;
		if (env.options.hide_bottom_thumbnails)
			howMany ++;
		if (env.options.hide_descriptions)
			howMany ++;
		if (env.options.hide_tags)
			howMany ++;

		var previousTitleVisibility = $("#album-view .title").is(":visible");
		var previousBottomThumbnailsVisibility = $("#album-and-media-container.show-media #thumbs").is(":visible");
		if (env.currentMedia !== null) {
			previousTitleVisibility = $(".media-box#center .title").is(":visible");
		}
		if (howMany > 2) {
			env.options.hide_title = false;
			env.options.hide_bottom_thumbnails = false;
			env.options.hide_descriptions = false;
			env.options.hide_tags = false;
		} else {
			env.options.hide_title = true;
			env.options.hide_bottom_thumbnails = true;
			env.options.hide_descriptions = true;
			env.options.hide_tags = true;
		}
		f.setBooleanCookie("hideTitle", env.options.hide_title);
		f.setBooleanCookie("hideBottomThumbnails", env.options.hide_bottom_thumbnails);
		f.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);
		f.setBooleanCookie("hideTags", env.options.hide_tags);
		f.updateMenu();

		if (util.isPopup()) {
			map.updatePopup();
		}

		util.setTitleOptions();
		util.setMediaOptions();
		if (env.currentMedia === null) {
			util.setSubalbumsOptions();
			if (env.currentAlbum.subalbums.length)
				util.adaptCaptionHeight();
		}

		var currentTitleVisibility = $("#album-view .title").is(":visible");
		var currentBottomThumbnailsVisibility = $("#album-and-media-container.show-media #thumbs").is(":visible");
		if (env.currentMedia !== null) {
			currentTitleVisibility = $(".media-box#center .title").is(":visible");
		}

		if (env.currentMedia !== null) {
			if (currentTitleVisibility !== previousTitleVisibility || currentBottomThumbnailsVisibility !== previousBottomThumbnailsVisibility) {
				let event = {data: {}};
				event.data.resize = true;
				event.data.id = "center";
				let scalePromise = env.currentMedia.scale(event);
				scalePromise.then(
					function() {
						if (env.currentMedia.isImage()) {
							util.setPinchButtonsPosition();
							util.setPinchButtonsVisibility();
						}
						util.setSelectButtonPosition();
						util.setDescriptionOptions();
						util.correctElementPositions();
					}
				);
				if (env.nextMedia !== null) {
					event.data.id = "right";
					env.nextMedia.scale(event);
				}
				if (env.prevMedia !== null) {
					event.data.id = "left";
					env.prevMedia.scale(event);
				}
			}
		}

		return false;
	};

	TopFunctions.prototype.toggleTitle = function(ev) {
		// next line: why [1, 9].indexOf(ev.which) !== -1 ?!?!?
		// if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_title = ! env.options.hide_title;
			f.setBooleanCookie("hideTitle", env.options.hide_title);
			f.updateMenu();
			if (env.options.hide_title) {
				$(".title").addClass("hidden-by-option");
			} else {
				$(".title").removeClass("hidden-by-option");
			}
			if (env.currentMedia !== null) {
				let event = {data: {}};
				event.data.resize = true;
				event.data.id = "center";
				let scalePromise = env.currentMedia.scale(event);
				scalePromise.then(
					function() {
						if (env.currentMedia.isImage()) {
							util.setPinchButtonsPosition();
							util.setPinchButtonsVisibility();
						}
						util.setSelectButtonPosition();
						util.setDescriptionOptions();
						util.correctElementPositions();
					}
				);
				if (env.nextMedia !== null) {
					event.data.id = "right";
					env.nextMedia.scale(event);
				}
				if (env.prevMedia !== null) {
					event.data.id = "left";
					env.prevMedia.scale(event);
				}
			} else {
				util.setTitleOptions();
			}
		}
		return false;
	};

	TopFunctions.prototype.toggleBottomThumbnails = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_bottom_thumbnails = ! env.options.hide_bottom_thumbnails;
			f.setBooleanCookie("hideBottomThumbnails", env.options.hide_bottom_thumbnails);
			f.updateMenu();
			if (env.options.hide_bottom_thumbnails) {
				$("#album-and-media-container.show-media #thumbs").addClass("hidden-by-option");
			} else {
				$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-option");
			}
			if (! $("#album-and-media-container").hasClass("show-media")) {
				$("#album-and-media-container").addClass("show-media");
				env.currentAlbum.showMedia();
			}
			if (env.currentMedia !== null) {
				let event = {data: {}};
				event.data.resize = true;
				event.data.id = "center";
				let scalePromise = env.currentMedia.scale(event);
				scalePromise.then(
					function() {
						if (env.currentMedia.isImage()) {
							util.setPinchButtonsPosition();
							util.setPinchButtonsVisibility();
						}
						util.setSelectButtonPosition();
						util.setDescriptionOptions();
						util.correctElementPositions();
					}
				);
				if (env.nextMedia !== null) {
					event.data.id = "right";
					env.nextMedia.scale(event);
				}
				if (env.prevMedia !== null) {
					event.data.id = "left";
					env.prevMedia.scale(event);
				}
			}
		}
		return false;
	};

	TopFunctions.prototype.toggleDescriptions = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_descriptions = ! env.options.hide_descriptions;
			f.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);

			if (util.isPopup() || env.currentMedia === null) {
				util.setMediaOptions();
			}
			if (! util.isPopup() && env.currentMedia === null)
				util.setSubalbumsOptions();
			util.setDescriptionOptions();
			util.correctElementPositions();

			f.updateMenu();
			if (util.isPopup()) {
				// env.mapAlbum.showMedia();
				map.updatePopup();
			}

			if (env.currentAlbum.subalbums.length)
				util.adaptCaptionHeight();
		}
		return false;
	};

	TopFunctions.prototype.toggleTags = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_tags = ! env.options.hide_tags;
			f.setBooleanCookie("hideTags", env.options.hide_tags);


			if (util.isPopup() || env.currentMedia === null) {
				util.setMediaOptions();
			}
			if (! util.isPopup() && env.currentMedia === null)
				util.setSubalbumsOptions();
			util.setDescriptionOptions();
			util.correctElementPositions();

			f.updateMenu();
			if (util.isPopup()) {
				// env.mapAlbum.showMedia();
				map.updatePopup();
			}

			if (env.currentAlbum.subalbums.length)
				util.adaptCaptionHeight();
		}
		return false;
	};

	TopFunctions.prototype.toggleSlideMode = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.albums_slide_style = ! env.options.albums_slide_style;
			f.setBooleanCookie("albumsSlideStyle", env.options.albums_slide_style);
			f.updateMenu();
			util.setSubalbumsOptions();
			if (env.currentAlbum.subalbums.length)
				util.adaptCaptionHeight();
			// env.currentAlbum.showSubalbums(true);
		}
		return false;
	};

	TopFunctions.prototype.toggleSpacing = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if (env.options.spacing)
				env.options.spacing = 0;
			else
				env.options.spacing = env.options.spacingSavedValue;
			f.setCookie("spacing", env.options.spacing);
			f.updateMenu();
			// f.setOptions();
			util.setMediaOptions();
			util.setSubalbumsOptions();
			if (env.currentAlbum.subalbums.length)
				util.adaptCaptionHeight();

			if (util.isPopup()) {
				// env.mapAlbum.showMedia();
				map.updatePopup();
			}
			// if (env.currentAlbum.subalbums.length > 1) {
			// 	env.currentAlbum.showSubalbums(true);
			// }
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumNames = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_album_names_below_thumbs = ! env.options.show_album_names_below_thumbs;
			f.setBooleanCookie("showAlbumNamesBelowThumbs", env.options.show_album_names_below_thumbs);
			f.updateMenu();
			// f.setOptions();
			util.setSubalbumsOptions();
			if (env.currentAlbum.subalbums.length)
				util.adaptCaptionHeight();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaCount = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_album_media_count = ! env.options.show_album_media_count;
			f.setBooleanCookie("showAlbumMediaCount", env.options.show_album_media_count);
			f.updateMenu();
			// f.setOptions();
			util.setTitleOptions();
			util.setSubalbumsOptions();
			if (env.currentAlbum.subalbums.length)
				util.adaptCaptionHeight();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaNames = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_media_names_below_thumbs = ! env.options.show_media_names_below_thumbs;
			f.setBooleanCookie("showMediaNamesBelowThumbs", env.options.show_media_names_below_thumbs);
			f.updateMenu();
			// f.setOptions();
			util.setMediaOptions();
			// util.setSubalbumsOptions();
			// if (env.currentAlbum.subalbums.length)
			// 	util.adaptCaptionHeight();

			if (util.isPopup()) {
				// env.mapAlbum.showMedia();
				map.updatePopup();
			}
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumsSquare = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.album_thumb_type = env.options.album_thumb_type === "square" ? "fit" : "square";
			f.setCookie("albumThumbType", env.options.album_thumb_type);
			f.updateMenu();
			env.currentAlbum.showSubalbums(true);
			if (env.currentAlbum.subalbums.length)
				util.adaptCaptionHeight();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaSquare = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.media_thumb_type = env.options.media_thumb_type === "square" ? "fixed_height" : "square";
			f.setCookie("mediaThumbType", env.options.media_thumb_type);
			f.updateMenu();
			env.currentAlbum.showMedia();
			// f.setOptions();
			// if (env.currentAlbum.subalbums.length)
			// 	util.adaptCaptionHeight();

			if (util.isPopup()) {
				env.mapAlbum.showMedia();
				map.updatePopup();
			}
		}
		return false;
	};

	TopFunctions.prototype.resetDisplaySettings = function(ev) {
		var promise = f.getOptions(true);
		promise.then(
			function optionsHaveBeenReset() {
				f.setOptions();
				if (env.currentMedia !== null || env.currentAlbum.subalbums.length) {
					util.adaptCaptionHeight();
					$("#ui-settings-restored").stop().fadeIn(
						200,
						function() {
							$("#ui-settings-restored").fadeOut(2500);
						}
					);
				}

				f.updateMenu();
			}
		);
	};

	TopFunctions.prototype.toggleBigAlbumsShow = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if ($("#message-too-many-images").is(":visible")) {
				$("#message-too-many-images").css("display", "");
			}
			$("#loading").show();
			env.options.show_big_virtual_folders = ! env.options.show_big_virtual_folders;
			if (env.options.show_big_virtual_folders)
				$("#show-hide-them:hover").css("color", "").css("cursor", "");
			else
				$("#show-hide-them:hover").css("color", "inherit").css("cursor", "auto");
			f.setBooleanCookie("showBigVirtualFolders", env.options.show_big_virtual_folders);
			f.updateMenu();
			env.currentAlbum.showMedia();
			$("#loading").hide();
		}
		return false;
	};

	Album.prototype.showMedia = function(populateMedia = true) {
		var inPopup = false;
		if (this.isEqual(env.mapAlbum) && util.isPopup())
			inPopup = true;

		var thumbnailSize = env.options.media_thumb_size;
		var imageLink;
		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, savedSearchAlbumCacheBase] = phFl.decodeHash(location.hash);
		var self = this;
		var lazyClass, thumbsSelector;
		if (inPopup) {
			thumbsSelector = "#popup-images-wrapper";
			lazyClass = "lazyload-popup-media";
		} else {
			thumbsSelector = "#thumbs";
			lazyClass = "lazyload-media";
		}

		let tooBig = env.currentAlbum.path.split("/").length < 4 && env.currentAlbum.numsMedia.imagesAndVideosTotal() > env.options.big_virtual_folders_threshold;
		if (populateMedia && env.currentAlbum.isTransversal())
			populateMedia = populateMedia && (! tooBig || env.options.show_big_virtual_folders);

		if (env.currentAlbum.isTransversal() && tooBig) {
			let tooManyImagesText, isShowing = false;
			if (env.options.show_big_virtual_folders) {
				tooManyImagesText =
					"<span id='too-many-images'>" + util._t('#too-many-images') + "</span>: " + env.currentAlbum.numsMedia.imagesAndVideosTotal() +
					", <span id='too-many-images-limit-is'>" + util._t('#too-many-images-limit-is') + "</span> " + env.options.big_virtual_folders_threshold + "</span>, " +
					"<span id='show-hide-them'>" + util._t("#hide-them") + "</span>";
			} else {
				$("#thumbs").empty();
				tooManyImagesText =
					"<span id='too-many-images'>" + util._t('#too-many-images') + "</span>: " + env.currentAlbum.numsMedia.imagesAndVideosTotal() +
					", <span id='too-many-images-limit-is'>" + util._t('#too-many-images-limit-is') + "</span> " + env.options.big_virtual_folders_threshold + "</span>, " +
					"<span id='show-hide-them'>" + util._t("#show-them") + "</span>";
				isShowing = true;
			}
			$("#message-too-many-images").html(tooManyImagesText).show();
			if (! $("ul#right-menu").hasClass("expand")) {
				$("#show-hide-them:hover").css("color", "").css("cursor", "");
			} else {
				$("#show-hide-them:hover").css("color", "inherit").css("cursor", "auto");
			}
			$("#show-hide-them").off("click").on(
				"click",
				function() {
					if (isShowing) {
						$("#loading").fadeIn(
							500,
							function() {
								$("#show-big-albums")[0].click();
							}
						);
					} else {
						$("#show-big-albums")[0].click();
					}
				}
			);
		}

		if (populateMedia && (! env.currentAlbum.isTransversal() || ! tooBig || env.options.show_big_virtual_folders)) {
		// if (! (env.currentAlbum.isTransversal() && tooBig && ! env.options.show_big_virtual_folders) && populateMedia) {
			$(thumbsSelector).empty();

			//
			// media loop
			//
			for (let i = 0; i < this.media.length; ++i) {
				let iMedia = i;
				let ithMedia = this.media[iMedia];

				let width = ithMedia.metadata.size[0];
				let height = ithMedia.metadata.size[1];
				let thumbHash = ithMedia.chooseThumbnail(thumbnailSize);
				let thumbHeight, thumbWidth, calculatedWidth, calculatedHeight;

				if (env.options.media_thumb_type === "fixed_height") {
					if (height < env.options.media_thumb_size) {
						thumbHeight = height;
						thumbWidth = width;
					} else {
						thumbHeight = env.options.media_thumb_size;
						thumbWidth = thumbHeight * width / height;
					}
					calculatedWidth = thumbWidth;
				} else if (env.options.media_thumb_type === "square") {
					thumbHeight = thumbnailSize;
					thumbWidth = thumbnailSize;
					calculatedWidth = env.options.media_thumb_size;
				}
				calculatedHeight = env.options.media_thumb_size;

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

				let mapLinkIcon = "";
				if (! inPopup) {
					if (ithMedia.hasGpsData()) {
						let imgHtml =
								"<img " +
									"class='thumbnail-map-link' " +
									"height='20px' " +
									"src='img/ic_place_white_24dp_2x.png'" +
								">";
						let img = $(imgHtml);
						img.attr("title", util._t("#show-on-map"));
						img.attr("alt", util._t("#show-on-map"));
						mapLinkIcon =
							"<a id='media-map-link-" + iMedia + "'>" + img.prop("outerHTML") + "</a>";
					}
				}
				let selectSrc = 'img/checkbox-unchecked-48px.png';
				let titleSelector = "#select-single-media";
				if (ithMedia.isSelected()) {
					selectSrc = 'img/checkbox-checked-48px.png';
					titleSelector = "#unselect-single-media";
				}

				let imgHtml =
						"<img " +
							"class='select-box' " +
							"src='" + selectSrc + "'" +
						">";
				let img = $(imgHtml);
				img.attr("title", util._t(titleSelector));
				img.attr("alt", util._t("#selector"));

				let mediaSelectBoxSelectorPart = "media-select-box-";
				if (inPopup)
					mediaSelectBoxSelectorPart = "map-" + mediaSelectBoxSelectorPart;

				let selectBoxHtml =
					"<a id='" + mediaSelectBoxSelectorPart + iMedia + "'>" + img.prop("outerHTML") + "</a>";

				// imageElement.get(0).media = ithMedia;
				let mediaHash;
				if (typeof savedSearchAlbumCacheBase !== "undefined" && savedSearchAlbumCacheBase !== null)
					mediaHash = phFl.encodeHash(this.cacheBase, ithMedia, foundAlbumCacheBase, savedSearchAlbumCacheBase);
				else
					mediaHash = phFl.encodeHash(this.cacheBase, ithMedia);

				let data = "";
				if (inPopup) {
					data =
						"data='" +
							JSON.stringify(
								{
									width: ithMedia.metadata.size[0],
									height: ithMedia.metadata.size[1],
									albumCacheBase: this.cacheBase,
									mediaHash: mediaHash
								}
							) +
						"' ";
				}

				imgHtml =
					"<img " +
						"data-src='" + encodeURI(thumbHash) + "' " +
						"src='img/image-placeholder.png' " +
						data +
						"class='thumbnail " + lazyClass + "' " +
						"height='" + thumbHeight + "' " +
						"width='" + thumbWidth + "' " +
						"id='" + ithMedia.foldersCacheBase + "--" + ithMedia.cacheBase + "' " +
						"style='" +
							 "width: " + calculatedWidth + "px; " +
							 "height: " + calculatedHeight + "px;" +
							 "'" +
					"/>";
				img = $(imgHtml);
				img.attr("title", util.pathJoin([ithMedia.albumName, ithMedia.nameForShowing(this)]));
				img.attr("alt", util.trimExtension(ithMedia.name));

				let imageString =
					"<div class='thumb-and-caption-container' style='" +
								"width: " + calculatedWidth + "px; " +
					"'>" +
						"<div class='thumb-container' " + "style='" +
								// "width: " + calculatedWidth + "px; " +
								"width: " + calculatedWidth + "px; " +
								"height: " + calculatedHeight + "px;" +
						"'>" +
							mapLinkIcon +
							selectBoxHtml +
							"<span class='helper'></span>" +
							img.prop("outerHTML") +
						"</div>" +
						"<div class='media-caption'>";
				let name;
				if (util.isPopup() || this.isMap())
					name = ithMedia.captionForPopup;
				else if (this.isSearch())
					name = ithMedia.captionForSearch;
				else if (this.isSelection())
					name = ithMedia.captionForSelection;
				else
					name = ithMedia.nameForShowing(this, true, true);

				let spanHtml =
							"<span class='media-name'>" +
								// "<span>" +
									name +
									// ithMedia.nameForShowing(this, true, true).replace(/( |<br \/>)/g, "</span>$&<span>") +
								// "</span>" +
							"</span>";
				let span = $(spanHtml);
				span.attr("title", ithMedia.nameForShowing(this));

				imageString += span.prop("outerHTML");

				if (ithMedia.metadata.hasOwnProperty("description")) {
					let description = $("<div class='description ellipsis'>" + util.stripHtmlAndReplaceEntities(ithMedia.metadata.description) + "</div>");
					description.attr("title", util.stripHtmlAndReplaceEntities(ithMedia.metadata.description));
					imageString +=
							"<div class='media-description'>" +
								description.prop("outerHTML") +
							"</div>";
				}
				if (ithMedia.metadata.hasOwnProperty("tags") && ithMedia.metadata.tags.length) {
					imageString +=
							"<div class='media-tags'>" +
								"<span class='tags'>" + util._t("#tags") + ": <span class='tag'>" + ithMedia.metadata.tags.map(tag => util.addTagLink(tag)).join("</span>, <span class='tag'>") + "</span></span>" +
							"</div>";
				}
				imageString +=
						"</div>" +
					"</div>";
				let imageElement = $(imageString);

				let imageId = "link-" + ithMedia.foldersCacheBase + "-" + ithMedia.cacheBase;
				if (inPopup) {
					imageElement.attr("id", imageId);
					$(thumbsSelector).append(imageElement);
				} else {
					imageLink = $("<a href='" + mediaHash + "' id='" + imageId + "'></a>");
					imageLink.append(imageElement);
					$(thumbsSelector).append(imageLink);
				}

				if (! inPopup && ithMedia.hasGpsData()) {
					$("#media-map-link-" + iMedia).off("click").on(
						"click",
						{singleMedia: ithMedia, album: this, clickedSelector: "#media-map-link-" + iMedia},
						function(ev, from) {
							// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
							env.selectorClickedToOpenTheMap = ev.data.clickedSelector;
							ev.stopPropagation();
							ithMedia.generateMapFromSingleMedia(ev, from);
						}
					);
				}

				if (
					! inPopup &&
					env.selectorClickedToOpenTheMap === "#media-map-link-" + iMedia &&
					env.previousAlbum !== null &&
					env.previousAlbum.isMap() && (
						env.previousMedia === null ||
						env.previousAlbum.isAlbumWithOneMedia()
					) &&
					env.fromEscKey ||
					env.mapRefreshType === "refresh"
				) {
					env.fromEscKey = false;
					$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
				}

				$("#" + mediaSelectBoxSelectorPart + iMedia).off("click").on(
					"click",
					{media: ithMedia, clickedSelector: "#" + mediaSelectBoxSelectorPart + iMedia},
					function(ev) {
						ev.stopPropagation();
						ev.preventDefault();
						ithMedia.toggleSelectedStatus(self, ev.data.clickedSelector);
						// ev.data.media.toggleSelectedStatus(self, ev.data.clickedSelector);
					}
				);

				if (
					typeof isPhp === "function" && (
						util.somethingIsInMapAlbum() || util.somethingIsSelected() || env.guessedPasswordsMd5.length
					)
				) {
					// execution enters here if we are using index.php
					$("#link-" + ithMedia.foldersCacheBase + "-" + ithMedia.cacheBase).off("auxclick").on(
						"auxclick",
						{mediaHash: phFl.encodeHash(this.cacheBase, ithMedia)},
						function (ev) {
							if (ev.which === 2) {
								util.openInNewTab(ev.data.mediaHash);
								return false;
							}
						}
					);
				}
			}
		}

		util.setMediaOptions();

	 	if ($(thumbsSelector).is(":visible") || util.isPopup()) {
	 	// if (! $("#album-view").hasClass("hidden")) {
			util.scrollToThumb();
			util.addMediaLazyLoader();
			// setTimeout(util.scrollToThumb, 1);
		}

		f.updateMenu();
		env.currentAlbum.bindMediaSortEvents();
		$("#loading").hide();
	};


	Album.prototype.showSubalbums = function(forcePopulate = false) {
		function insertRandomImage(randomSubAlbum, index, iSubalbum) {
			var titleName, randomMediaLink;
			var randomMedia = randomSubAlbum.media[index];
			var id = phFl.convertCacheBaseToId(self.subalbums[iSubalbum].cacheBase);
			var mediaSrc = randomMedia.chooseThumbnail(env.options.album_thumb_size);

			$("#downloading-media").hide();

			if (self.isByDate()) {
				titleName = util.pathJoin([randomMedia.dayAlbum, randomMedia.name]);
			} else if (self.isByGps()) {
				let humanGeonames = util.pathJoin([env.options.by_gps_string, randomMedia.geoname.country_name, randomMedia.geoname.region_name, randomMedia.geoname.place_name]);
				titleName = util.pathJoin([humanGeonames, randomMedia.name]);
			// } else if (self.isSearch()) {
			// 	titleName = util.pathJoin([randomMedia.albumName, randomMedia.name]);
			} else {
				titleName = util.pathJoin([randomMedia.albumName, randomMedia.nameForShowing(randomSubAlbum)]);
			}
			if (self.isSearch())
				randomMediaLink = phFl.encodeHash(randomSubAlbum.cacheBase, randomMedia, randomSubAlbum.cacheBase, self.cacheBase);
			else
				randomMediaLink = phFl.encodeHash(randomSubAlbum.cacheBase, randomMedia);

			titleName = titleName.substr(titleName.indexOf('/') + 1);
			var goTo = util._t(".go-to") + " " + titleName;
			$("#" + id + " .album-button a.random-media-link").attr("href", randomMediaLink);
			$("#" + id + " img.album-button-random-media-link").attr("title", goTo).attr("alt", goTo);
			$("#" + id + " img.thumbnail").attr("title", titleName).attr("alt", titleName);
			$("#" + id + " img.thumbnail").attr("data-src", encodeURI(mediaSrc));

			// util.adaptSubalbumThumbnailSize(id, randomMedia);

			$(
				function() {
					$("img.lazyload-album-" + id).Lazy(
						{
							chainable: false,
							threshold: env.options.media_thumb_size,
							bind: 'event',
							removeAttribute: true
						}
					);
				}
			);
		}
		// end of insertRandomImage function

		function pickRandomMediaAndInsertIt(iSubalbum, theImage, resolve_subalbumPromise) {
			// function(subalbum, error)
			var promise = phFl.pickRandomMedia(
				iSubalbum,
				function error() {
					// executions shoudn't arrive here, if it arrives it's because of some error
					console.trace();
					// self.subalbums.splice(iSubalbum, 1);
					// theImage.parent().remove();
					// resolve_subalbumPromise();
				}
			);
			promise.then(
				function([album, index]) {
					insertRandomImage(album, index, iSubalbum);
					resolve_subalbumPromise();
				},
				function(album) {
					console.trace();
				}
			);
		}
		// end of pickRandomMediaAndInsertIt function

		/////////////////////////////////////////////
		// beginning of showSubalbums function
		let [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, savedSearchAlbumCacheBase] = phFl.decodeHash(location.hash);
		var self = this;

		if (env.fromEscKey && env.firstEscKey) {
			// respect the existing mediaLink (you cannot do it more than once)
			env.firstEscKey = false;
		} else {
			// reset mediaLink
			if (self.numsMedia.imagesAndVideosTotal())
				env.mediaLink = phFl.encodeHash(self.cacheBase, self.media[0], foundAlbumCacheBase, savedSearchAlbumCacheBase);
			else
				env.mediaLink = env.hashBeginning + self.cacheBase;

			env.firstEscKey = true;
		}

		// insert into DOM
		let subalbumsElement = $("#subalbums");

		let subalbumsPromises = [];
		if (! self.subalbums.length)
			subalbumsElement.hide();

		let populateSubalbums =
			forcePopulate ||
			env.albumInSubalbumDiv === null ||
			self === null ||
			(env.albumInSubalbumDiv !== self || env.isFromAuthForm) && self.subalbums.length;

		if (populateSubalbums) {
			subalbumsElement.empty();
			subalbumsElement.insertBefore("#message-too-many-images");

			//
			// subalbums loop
			//
			// The promises are needed in order to know when everything has come to its end
			for (let i = 0; i < self.subalbums.length; i ++) {
				let iSubalbum = i;
				let subalbumPromise = new Promise(
					function(resolve_subalbumPromise) {
						var ithSubalbum = self.subalbums[iSubalbum];
						var id = phFl.convertCacheBaseToId(ithSubalbum.cacheBase);

						let nameHtml;
						if (self.isSearch())
							nameHtml = ithSubalbum.captionForSearch;
						else if (self.isSelection())
							nameHtml = ithSubalbum.captionForSelection;
						else {
							nameHtml = ithSubalbum.nameForShowing(self, true, true);
							if (nameHtml === "")
								nameHtml = "<span class='italic gray'>(" + util._t("#root-album") + ")</span>";
						}

						let captionId = "album-caption-" + id;
						let captionHtml =
							"<div class='album-caption' id='" + captionId + "'>";
						captionHtml +=
								"<div class='album-name'>" + nameHtml + "</div>";

						if (ithSubalbum.hasOwnProperty("description")) {
							captionHtml +=
								"<div class='album-description'>" +
									"<div class='description ellipsis'>" + util.stripHtmlAndReplaceEntities(ithSubalbum.description) + "</div>" +
								"</div>";
						}

						if (ithSubalbum.hasOwnProperty("tags") && ithSubalbum.tags.length) {
							captionHtml +=
								"<div class='album-tags'>" +
									"<span class='tags'>" + util._t("#tags") + ": <span class='tag'>" + ithSubalbum.tags.map(tag => util.addTagLink(tag)).join("</span>, <span class='tag'>") + "</span></span>" +
								"</div>";
						}

						captionHtml +=
								"<div class='album-caption-count'>" +
									"(" + ithSubalbum.numsMediaInSubTree.imagesAndVideosTotal() + " " +
									"<span class='title-media'>" + util._t(".title-media") + "</span>" +
									")" +
								"</div>" +
							"</div>";

						let caption = $(captionHtml);

						let selectSrc = 'img/checkbox-unchecked-48px.png';
						let titleSelector = "#select-subalbum";
						if (ithSubalbum.isSelected()) {
							selectSrc = 'img/checkbox-checked-48px.png';
							titleSelector = "#unselect-subalbum";
						}

						let positionHtml = "";
						let folderMapTitleWithoutHtmlTags;
						if (ithSubalbum.numPositionsInTree.length) {
							folderMapTitleWithoutHtmlTags = self.folderMapTitle(ithSubalbum, nameHtml).replace(/<br \/>/gm, ' ').replace(/<[^>]*>?/gm, '');
							positionHtml =
								"<a id='subalbum-map-link-" + id + "' >" +
									"<img " +
										"class='thumbnail-map-link' " +
										"height='15px' " +
										"src='img/ic_place_white_24dp_2x.png' " +
									"/>" +
								"</a>";
						}

						// a dot could be present in a cache base, making $("#" + cacheBase) fail, beware...
						let subfolderHash;
						// TO DO: verify that isMap() is not missing in the following line
						if (self.isSearch() || self.isSelection()) {
							subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null, ithSubalbum.cacheBase, self.cacheBase);
						} else {
							if (typeof savedSearchAlbumCacheBase !== "undefined" && savedSearchAlbumCacheBase !== null)
								subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null, foundAlbumCacheBase, savedSearchAlbumCacheBase);
							else
								subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null);
						}

						let aHrefHtml = "<a href='" + subfolderHash + "'></a>";
						let aHrefHtmlContainer = $(aHrefHtml);
						let albumButtonAndCaptionHtml =
							"<div id='" + id + "' class='album-button-and-caption'></div>";
						let linkContainer = $(albumButtonAndCaptionHtml);

						let selectBoxHtml =
							"<a id='subalbum-select-box-" + id + "'>" +
								"<img " +
									"class='select-box' " +
									"src='" + selectSrc + "' " +
									"style='display: none;'" +
								">" +
							"</a>";

						let imageElement = $(
							"<div class='album-button'>" +
								selectBoxHtml +
								positionHtml +
								"<a class='random-media-link' href=''>" +
									"<img src='img/link-arrow.png' class='album-button-random-media-link'>" +
								"</a>" +
								"<span class='helper'></span>" +
								"<img src='img/image-placeholder.png' class='thumbnail lazyload-album-" + id + "'>" +
							"</div>"
						);
						linkContainer.append(imageElement);
						linkContainer.append(caption);
						aHrefHtmlContainer.append(linkContainer);

						subalbumsElement.append(aHrefHtmlContainer);

						if (ithSubalbum.numPositionsInTree.length) {
							$("#subalbum-map-link-" + id + " img.thumbnail-map-link").attr("title", folderMapTitleWithoutHtmlTags);
							$("#subalbum-map-link-" + id + " img.thumbnail-map-link").attr("alt", folderMapTitleWithoutHtmlTags);
						}
						$("#subalbum-select-box-" + id + " img.select-box").attr("title", util._t(titleSelector));
						$("#subalbum-select-box-" + id + " img.select-box").attr("alt", util._t("#selector"));

						if (ithSubalbum.hasOwnProperty("description"))
							$("#" + captionId + " .description").attr("title", util.stripHtmlAndReplaceEntities(ithSubalbum.description));

						if (ithSubalbum.hasOwnProperty("numPositionsInTree") && ithSubalbum.numPositionsInTree) {
							$("#subalbum-map-link-" + id).off("click").on(
								"click",
								{ithSubalbum: ithSubalbum},
								function(ev, from) {
									// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
									ev.preventDefault();
									env.selectorClickedToOpenTheMap = "#subalbum-map-link-" + id;
									TopFunctions.generateMapFromSubalbum(ev, from);
								}
							);
						}

						if (
							env.selectorClickedToOpenTheMap === "#subalbum-map-link-" + id &&
							env.previousAlbum !== null &&
							env.previousAlbum.isMap() &&
							(
								env.previousMedia === null ||
								env.previousAlbum.isAlbumWithOneMedia()
							) &&
							env.fromEscKey ||
							env.mapRefreshType === "refresh"
						) {
							env.fromEscKey = false;
							$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
						}

						if (
							typeof isPhp === "function" && (
								util.somethingIsInMapAlbum() || util.somethingIsSelected() || env.guessedPasswordsMd5.length
							)
						) {
							// execution enters here if we are using index.php
							$("#" + id).off("auxclick").off("auxclick").on(
								"auxclick",
								// {subfolderHash: subfolderHash},
								function (ev) {
									if (ev.which === 2) {
										util.openInNewTab(subfolderHash);
										return false;
									}
								}
							);
						}

						$("#subalbum-select-box-" + id + " .select-box").show();
						$("#subalbum-select-box-" + id).off("click").on(
							"click",
							function(ev) {
								ev.stopPropagation();
								ev.preventDefault();
								self.toggleSubalbumSelection("#subalbum-select-box-" + id);
							}
						);

						pickRandomMediaAndInsertIt(iSubalbum, imageElement, resolve_subalbumPromise);
					}
				);
				subalbumsPromises.push(subalbumPromise);
			}
		}

		Promise.all(subalbumsPromises).then(
			function allRandomImagesGot() {
				// we can run the function that prepare the stuffs for sharing
				util.socialButtons();
				util.setSubalbumsOptions();
				if (self.subalbums.length)
					util.adaptCaptionHeight();

				// When there is both a media and an album, we display the media's description; else it's the album's one
				if (env.currentMedia === null || ! env.currentMedia.hasSomeDescription()) {
					self.setDescription();
				} else {
					env.currentMedia.setDescription();
				}
				util.setDescriptionOptions();
				util.correctElementPositions();
				if (populateSubalbums)
					env.albumInSubalbumDiv = self;
				$("#loading").hide();
			},
			function() {
				console.trace();
			}
		);

		if (self.subalbums.length) {
			$("#album-and-media-container").removeClass("show-media");
			$(subalbumsElement).show();
			$("#album-view").removeAttr("height");
		}

		util.setSubalbumsOptions();
		f.updateMenu();
		self.bindSubalbumSortEvents();

		if (! $("#album-and-media-container").hasClass("show-media")) {
			$(window).off("resize").on(
				"resize",
				function () {
					var previousWindowWidth = env.windowWidth;
					env.windowWidth = $(window).outerWidth();
					env.windowHeight = $(window).outerHeight();
					if (env.windowWidth === previousWindowWidth)
						// avoid considering a resize when the mobile browser shows/hides the location bar
						return;

					$("#loading").show();

					util.socialButtons();
					util.setSubalbumsOptions();
					// self.subalbums.forEach(
					// 	(ithSubalbum, iSubalbum) => {
					// 		var id = phFl.convertCacheBaseToId(ithSubalbum.cacheBase);
					// 		util.adaptSubalbumThumbnailSize(id);
					// 	}
					// );


					util.adaptCaptionHeight();
					// self.showSubalbums("refreshDisplay");

					if (util.isMap() || util.isPopup()) {
						// the map must be generated again including the points that only carry protected content
						env.mapRefreshType = "resize";

						if (util.isPopup()) {
							env.popupRefreshType = "mapAlbum";
							$('.leaflet-popup-close-button')[0].click();
						} else {
							env.popupRefreshType = "none";
						}

						// close the map and reopen it
						$('.modal-close')[0].click();
						$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
					}
					$("#loading").hide();
				}
			);
		}
	};

	TopFunctions.toggleFullscreen = function(e) {
		function afterToggling() {
			if (! env.fullScreenStatus) {
				$(".enter-fullscreen").hide();
				$(".exit-fullscreen").show();
				env.fullScreenStatus = true;
			} else {
				$(".enter-fullscreen").show();
				$(".exit-fullscreen").hide();
				env.fullScreenStatus = false;
			}
			$("#loading").hide();

			if (env.currentMedia !== null) {
				let event = {data: {}};
				event.data.resize = true;
				event.data.id = "center";
				let scalePromise = env.currentMedia.scale(event);
				scalePromise.then(
					function() {
						if (env.currentMedia.isImage()) {
							util.setPinchButtonsPosition();
							util.setPinchButtonsVisibility();
						}
						util.setSelectButtonPosition();
						util.setDescriptionOptions();
						util.correctElementPositions();
					}
				);
			}
		}

		if (Modernizr.fullscreen) {
			e.preventDefault();

			$("#fullscreen-wrapper").fullScreen(
				{
					callback: function(isFullscreen) {
						afterToggling();
					}
				}
			);
		} else {
			afterToggling();
		}
	};

	TopFunctions.toggleFullscreenFromMouse = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			TopFunctions.toggleFullscreen(ev);
			return false;
		}
	};

	SingleMedia.prototype.generateMapFromSingleMedia = function(ev, from) {
		if (this.hasGpsData()) {
			ev.preventDefault();
			var positionsAndMedia = new PositionsAndMedia([this.generatePositionAndMedia()]);
			positionsAndMedia.generateMap(ev, from);
		}
	};

	TopFunctions.generateMapFromSubalbum = function(ev, from) {
		var subalbumPromise = ev.data.ithSubalbum.toAlbum(util.errorThenGoUp, {getMedia: false, getPositions: true});
		subalbumPromise.then(
			function(subalbum) {
				// var subalbum = env.currentAlbum.subalbums[iSubalbum];
				if (subalbum.positionsAndMediaInTree.length) {
					ev.stopPropagation();
					ev.preventDefault();
					subalbum.positionsAndMediaInTree.generateMap(ev, from);
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

	TopFunctions.generateMapFromTitle = function(ev, from) {
		var pointList;
		if (env.currentMedia !== null && env.currentMedia.hasGpsData()) {
			pointList = new PositionsAndMedia([env.currentMedia.generatePositionAndMedia()]);
		} else if (env.currentAlbum.positionsAndMediaInTree.length) {
			pointList = env.currentAlbum.positionsAndMediaInTree;
		}

		pointList.generateMap(ev, from);
	};

	TopFunctions.generateMapFromTitleWithoutSubalbums = function(ev, from) {
		if (env.currentAlbum.positionsAndMediaInMedia.length)
			env.currentAlbum.positionsAndMediaInMedia.generateMap(ev, from);
	};

	TopFunctions.playClickElement = function(clickHistory, iClick) {
		return new Promise(
			function(resolve_playClickElement) {
				var clickHistoryElement = clickHistory[iClick];
				var oneClickPromise = new Promise(
					function(resolve_oneClickPromise) {
						env.mymap.setView(clickHistoryElement.center, clickHistoryElement.zoom, {animate: false});
						let ev = {
							latlng: clickHistoryElement.latlng,
							originalEvent: {
								shiftKey: clickHistoryElement.shiftKey,
								ctrlKey: clickHistoryElement.ctrlKey,
							}
						};
						var updateMapPromise = TopFunctions.updateMapAlbumOnMapClick(ev, env.pruneCluster.Cluster._clusters, false);
						updateMapPromise.then(
							function() {
								resolve_oneClickPromise();
							},
							function() {
								console.trace();
							}
						);

					}
				);

				oneClickPromise.then(
					function() {
						if (iClick < clickHistory.length - 1) {
							let newPlayPromise = TopFunctions.playClickElement(clickHistory, iClick + 1);
							newPlayPromise.then(
								function() {
									resolve_playClickElement();
								}
							);
						} else {
							TopFunctions.prepareAndDoPopupUpdate();
							resolve_playClickElement();
						}
					},
					function(album) {
						console.trace();
					}
				);
			}
		);
	};

	PositionsAndMedia.prototype.generateMap = function(ev, from) {
		// this is an array of uniq points with a list of the media geolocated there

		var i;
		env.titleWrapper =
			"<div id='popup-photo-count' style='max-width: " + env.maxWidthForPopupContent + "px;'>" +
				"<span id='popup-photo-count-number'></span> " + util._t("#images") +
			"</div>" +
			"<div id='popup-images-wrapper'>" +
			"</div>";

		$("#my-modal.modal").css("display", "block");
		if (env.isMobile.any()) {
			$("#my-modal .modal-content").css("width", (env.windowWidth - 12).toString() + "px");
			$("#my-modal .modal-content").css("height", (env.windowHeight - 12).toString() + "px");
			$("#my-modal .modal-content").css("padding", "5px");
			$("#my-modal.modal").css("top", "0");
			$("#my-modal.modal").css("padding-top", "0");
			$("#my-modal.modal-close").css("top", "22px");
			$("#my-modal.modal-close").css("right", "22px");
		} else {
			$("#my-modal .modal-content").css("width", (env.windowWidth - 55).toString() + "px");
			$("#my-modal .modal-content").css("height", (env.windowHeight - 60).toString() + "px");
			$("#my-modal .modal-content").css("padding", "");
			$("#my-modal.modal").css("top", "");
			$("#my-modal.modal").css("padding-top", "");
			$("#my-modal.modal-close").css("top", "");
			$("#my-modal.modal-close").css("right", "");
		}

		if (this) {
			// maximum OSM zoom is 19
			const maxOSMZoom = 19;
			// calculate the center
			var center = this.averagePosition();

			var br = '<br />';
			// var thumbAndCaptionHeight = 0;

			// default zoom is used for single media or media list with one point
			var maxXDistance = env.options.photo_map_size;
			var maxYDistance = env.options.photo_map_size;
			if (this.length > 1) {
				// calculate the maximum distance from the center
				// it's needed in order to calculate the zoom level
				maxXDistance = 0;
				maxYDistance = 0;
				for (i = 0; i < this.length; ++i) {
					maxXDistance = Math.max(maxXDistance, Math.abs(util.xDistanceBetweenCoordinatePoints(center, this[i])));
					maxYDistance = Math.max(maxYDistance, Math.abs(util.yDistanceBetweenCoordinatePoints(center, this[i])));
				}
			}
			// calculate the zoom level needed in order to have all the points inside the map
			// see https://wiki.openstreetmap.org/wiki/Zoom_levels
			var earthCircumference = 40075016;
			var xZoom = Math.min(maxOSMZoom, parseInt(Math.log2((env.windowWidth / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxXDistance)));
			var yZoom = Math.min(maxOSMZoom, parseInt(Math.log2((env.windowHeight / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxYDistance)));
			var zoom = Math.min(xZoom, yZoom);

			$("#loading").hide();

			$('.map-container').show();
			$(".map-container").css("max-height", $(window).height() - 54).css("max-width", $(window).width() - 54).css("right", "44px").css("top", "24px");
			$(".map-container").css("display", "grid");

			var markers = [];
			// initialize the markers clusters
			env.pruneCluster = new PruneClusterForLeaflet(150, 70);
			PruneCluster.Cluster.ENABLE_MARKERS_LIST = true;

			// modify the prunecluster so that the click can be managed in order to show the photo popup
			env.pruneCluster.BuildLeafletCluster = function (cluster, position) {
				var m = new L.Marker(position, {
					icon: env.pruneCluster.BuildLeafletClusterIcon(cluster)
				});
				m._leafletClusterBounds = cluster.bounds;
				m.off("click").on(
					"click",
					function(ev) {
						var updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, env.pruneCluster.Cluster._clusters);
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
			env.pruneCluster.BuildLeafletClusterIcon = function (cluster) {
				var c = 'prunecluster prunecluster-';
				var iconSize = 38;
				var maxPopulation = env.pruneCluster.Cluster.GetPopulation();
				var markers = cluster.GetClusterMarkers();
				var population = 0;
				// count the number of photos in a cluster
				for(var i = 0; i < markers.length; i ++) {
					population += markers[i].data.mediaList.length;
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
				env.mymap.remove();

			env.mymap = L.map('mapdiv', {'closePopupOnClick': false}).setView([center.lat, center.lng], zoom);
			$(".map-container > div").css("min-height", (env.windowHeight -50).toString() + "px");
			mapIsInitialized = true;

			L.tileLayer(
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
					maxZoom: 21,
					maxNativeZoom: maxOSMZoom,
					id: 'mapbox.streets'
				}
			).addTo(env.mymap);
			L.control.scale().addTo(env.mymap);

			var cacheBases;
			for (var iPoint = 0; iPoint < this.length; iPoint ++) {
				cacheBases = '';
				for(var iPhoto = 0; iPhoto < this[iPoint].mediaList.length; iPhoto ++) {
					// we must get the media corresponding to the name in the point
					if (cacheBases)
						cacheBases += br;
					cacheBases += this[iPoint].mediaList[iPhoto].cacheBase;
				}

				markers[iPoint] = new PruneCluster.Marker(
					this[iPoint].lat,
					this[iPoint].lng,
					{
						icon:	new L.NumberedDivIcon({number: this[iPoint].mediaList.length})
					}
				);
				env.pruneCluster.RegisterMarker(markers[iPoint]);
				markers[iPoint].data.tooltip = cacheBases;
				markers[iPoint].data.mediaList = this[iPoint].mediaList;
				markers[iPoint].weight = this[iPoint].mediaList.length;
			}

			env.mymap.addLayer(env.pruneCluster);

			/**
			* Add a click handler to the map to render the popup.
			*/
			env.mymap.off("click").on(
				"click",
				function(ev) {
					var updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, env.pruneCluster.Cluster._clusters);
					updatePromise.then(
						TopFunctions.prepareAndDoPopupUpdate,
						function() {
							console.trace();
						}
					);

				}
			);

			if (typeof from !== "undefined") {
				if (env.popupRefreshType === "previousAlbum")
					TopFunctions.prepareAndDoPopupUpdate();
				else if (env.popupRefreshType === "mapAlbum") {
					var clickHistory = env.mapAlbum.clickHistory;
					env.mapAlbum = new Album();
					TopFunctions.playClickElement(clickHistory, 0);
				}
			}
		}
	};

	TopFunctions.prepareAndDoPopupUpdate = function() {
		map.calculatePopupSizes();

		if (env.popup) {
			env.popup.remove();
			$(".leaflet-popup").remove();
		}
		$(".modal-close").hide();
		env.popup = L.popup(
			{
				maxWidth: env.maxWidthForPopupContent,
				maxHeight: env.maxHeightForPopupContent,
				autoPan: false
			}
		).setContent(env.titleWrapper)
		.setLatLng(env.mapAlbum.positionsAndMediaInTree.averagePosition())
		.openOn(env.mymap);

		$('.leaflet-popup-close-button').off("click").on(
			"click",
			function() {
				$(".modal-close").show();
			}
		);

		map.addPopupMover();

		var promise = phFl.endPreparingAlbumAndKeepOn(env.mapAlbum, null, null);
		promise.then(
			function() {
				env.mapAlbum.showMedia();
				map.updatePopup();
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

				if (evt !== null && evt.latlng !== undefined) {
					clickHistoryElement = {
							latlng: evt.latlng,
							shiftKey: evt.originalEvent.shiftKey,
							ctrlKey: evt.originalEvent.ctrlKey,
							zoom: env.mymap.getZoom(),
							center: env.mymap.getCenter()
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
				currentCluster.data.mediaList = [];

				// build the cluster's media name list
				var positionsAndCounts = new PositionsAndMedia([]);
				for(i = 0; i < currentCluster._clusterMarkers.length; i ++) {
					currentCluster.data.mediaList = currentCluster.data.mediaList.concat(currentCluster._clusterMarkers[i].data.mediaList);
					positionsAndCounts.push(new PositionAndMedia(
							{
								lat: currentCluster._clusterMarkers[i].position.lat,
								lng: currentCluster._clusterMarkers[i].position.lng,
								mediaList: currentCluster._clusterMarkers[i].data.mediaList,
								count: currentCluster._clusterMarkers[i].data.mediaList.length
							}
						)
					);
				}

				var indexPositions, imageLoadPromise, mediaListElement;
				if (evt.originalEvent.ctrlKey) {
					if (! env.mapAlbum.isEmpty()) {
						// control click: remove the points

						env.mapAlbum.clickHistory.push(clickHistoryElement);

						var matchingIndex, matchingMedia, positionsAndCountsElement;
						for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
							positionsAndCountsElement = positionsAndCounts[indexPositions];
							if (
								env.mapAlbum.positionsAndMediaInTree.some(
									function(element, index) {
										matchingIndex = index;
										return positionsAndCountsElement.matchPosition(element);
									}
								)
							) {
								// the position was present: remove the position itself...
								env.mapAlbum.positionsAndMediaInTree.splice(matchingIndex, 1);
								env.mapAlbum.numPositionsInTree = env.mapAlbum.positionsAndMediaInTree.length;

								// ...and the corresponding photos
								for (iMediaPosition = 0; iMediaPosition < positionsAndCountsElement.mediaList.length; iMediaPosition ++) {
									mediaListElement = positionsAndCountsElement.mediaList[iMediaPosition];
									if (
										env.mapAlbum.media.some(
											function(media, index) {
												matchingMedia = index;
												var match = media.isEqual(mediaListElement);
												return match;
											}
										)
									)
										env.mapAlbum.media.splice(matchingMedia, 1);
								}
							}
						}

						if (! env.mapAlbum.numsMedia.imagesAndVideosTotal()) {
							$("#loading").hide();
							env.popup.remove();
						} else {
							endPreparingMapAlbumAndUpdatePopup();
						}
					}
				} else {
					// not control click: add (with shift) or replace (without shift) the positions
					imageLoadPromise = new Promise(
						function(resolve_imageLoad) {
							var indexPositions, positionsAndCountsElement;

							if (env.mapAlbum.isEmpty() || env.mapAlbum.numsMedia.imagesAndVideosTotal() === 0 || ! evt.originalEvent.shiftKey) {
								// normal click or shift click without previous content

								env.mapAlbum = util.initializeMapAlbum();

								env.mapAlbum.clickHistory = [clickHistoryElement];

								env.mapAlbum.addMediaFromPositionsToMapAlbum(positionsAndCounts, resolve_imageLoad);
							} else {
								// shift-click with previous content
								env.mapAlbum.clickHistory.push(clickHistoryElement);

								// determine what positions aren't yet in selectedPositions array
								var missingPositions = new PositionsAndMedia([]);
								for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
									positionsAndCountsElement = positionsAndCounts[indexPositions];
									if (
										env.mapAlbum.positionsAndMediaInTree.every(
											function(element) {
												return ! positionsAndCountsElement.matchPosition(element);
											}
										)
									) {
										missingPositions.push(positionsAndCountsElement);
										env.mapAlbum.positionsAndMediaInTree.push(positionsAndCountsElement);
										env.mapAlbum.numPositionsInTree = env.mapAlbum.positionsAndMediaInTree.length;
									}
								}
								positionsAndCounts = missingPositions;
								if (missingPositions.length > 0)
									env.mapAlbum.addMediaFromPositionsToMapAlbum(positionsAndCounts, resolve_imageLoad);
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

				function endPreparingMapAlbumAndUpdatePopup() {
					if (updateMapAlbum) {
						env.mapAlbum.numsMedia = env.mapAlbum.media.imagesAndVideosCount();
						env.mapAlbum.numsMediaInSubTree = new ImagesAndVideos(env.mapAlbum.numsMedia);
						env.mapAlbum.numPositionsInTree = env.mapAlbum.positionsAndMediaInTree.length;
						env.mapAlbum.numsProtectedMediaInSubTree = new NumsProtected({",": env.mapAlbum.numsMedia});
						delete env.mapAlbum.mediaNameSort;
						delete env.mapAlbum.mediaReverseSort;
						// now sort them according to options
						env.mapAlbum.sortAlbumsMedia();

						// update the map root album in cache
						var rootMapAlbum = env.cache.getAlbum(env.options.by_map_string);
						if (! rootMapAlbum)
							rootMapAlbum = util.initializeOrGetMapRootAlbum();
						rootMapAlbum.numsMediaInSubTree.sum(env.mapAlbum.numsMediaInSubTree);
						rootMapAlbum.subalbums.push(env.mapAlbum);
						rootMapAlbum.positionsAndMediaInTree.mergePositionsAndMedia(env.mapAlbum.positionsAndMediaInTree);
						rootMapAlbum.numPositionsInTree += env.mapAlbum.positionsAndMediaInTree.length;

						// do not call bindSortEvents method on env.mapAlbum: bindings have already been set for currentAlbum
					}
					resolve_updateMapAlbumOnMapClick();
				}
			}
		);
	};

	TopFunctions.prototype.toggleFullscreen = TopFunctions.toggleFullscreen;
	TopFunctions.prototype.showBrowsingModeMessage = TopFunctions.showBrowsingModeMessage;
	TopFunctions.prototype.prepareAndDoPopupUpdate = TopFunctions.prepareAndDoPopupUpdate;
	TopFunctions.prototype.playClickElement = TopFunctions.playClickElement;

	window.TopFunctions = TopFunctions;
}());
