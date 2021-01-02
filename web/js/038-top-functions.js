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

	Album.prototype.generatePositionsAndMediaInAlbumAndSubalbums = function() {
		var self = this;
		return new Promise(
			function(resolve_generatePositionsAndMediaInAlbumAndSubalbums) {
				if (self.hasValidPositionsAndMediaInAlbumAndSubalbums()) {
					resolve_generatePositionsAndMediaInAlbumAndSubalbums();
				} else {
					self.positionsAndMediaInSubalbums = new PositionsAndMedia([]);
					self.numPositionsInSubalbums = 0;
					self.positionsAndMediaInAlbum = new PositionsAndMedia([]);
					self.numPositionsInAlbum = 0;
					let numSubalbums = self.subalbums.length;
					let hasPositions = (
						self.hasPositions() && (
							! self.isTransversal() || ! Boolean(numSubalbums)
						)
					);
					// let fewMedia = (self.media.length < self.numPositionsInTree);
					if (! hasPositions || (! numSubalbums || self.isCollection())) {
					// if (! hasPositions || ! numSubalbums || fewMedia) {
						if (! hasPositions) {
							self.positionsAndMediaInSubalbums = self.positionsAndMediaInTree;
							self.numPositionsInSubalbums = self.positionsAndMediaInSubalbums.length;
						} else {
							self.positionsAndMediaInAlbum = self.media.generatePositionsAndMedia();
							self.numPositionsInAlbum = self.positionsAndMediaInAlbum.length;
							self.positionsAndMediaInSubalbums = new PositionsAndMedia(self.positionsAndMediaInTree);
							self.positionsAndMediaInSubalbums.removePositionsAndMedia(self.positionsAndMediaInAlbum);
							self.numPositionsInSubalbums = self.positionsAndMediaInSubalbums.length;
						}
						resolve_generatePositionsAndMediaInAlbumAndSubalbums();
					} else {
						let subalbumPromises = [];
						if (hasPositions)
							self.positionsAndMediaInAlbum = new PositionsAndMedia(self.positionsAndMediaInTree);
						self.subalbums.forEach(
							function(thisSubalbum, thisIndex) {
								let subalbumPromise;
								if (thisSubalbum.hasOwnProperty("positionsAndMediaInTree")) {
									self.positionsAndMediaInSubalbums.mergePositionsAndMedia(thisSubalbum.positionsAndMediaInTree);
									self.numPositionsInSubalbums = self.positionsAndMediaInSubalbums.length;
									if (hasPositions) {
										self.positionsAndMediaInAlbum.removePositionsAndMedia(thisSubalbum.positionsAndMediaInTree);
										self.numPositionsInAlbum = self.positionsAndMediaInAlbum.length;
									}
									subalbumPromise = new Promise(
										function(resolve_subalbumPromise) {
											resolve_subalbumPromise();
										}
									);
								} else {
									subalbumPromise = new Promise(
										function(resolve_subalbumPromise) {
											let promise = phFl.getAlbum(thisSubalbum.cacheBase, null, {getMedia: false, getPositions: true});
											promise.then(
												function(thisSubalbum) {
													self.subalbums[thisIndex] = thisSubalbum;
													self.positionsAndMediaInSubalbums.mergePositionsAndMedia(thisSubalbum.positionsAndMediaInTree);
													self.numPositionsInSubalbums = self.positionsAndMediaInSubalbums.length;
													if (hasPositions) {
														self.positionsAndMediaInAlbum.removePositionsAndMedia(thisSubalbum.positionsAndMediaInTree);
														self.numPositionsInAlbum = self.positionsAndMediaInAlbum.length;
													}
													resolve_subalbumPromise();
												},
												function() {
													console.trace();
												}
											);
										}
									);
								}
								subalbumPromises.push(subalbumPromise);
							}
						);
						Promise.all(subalbumPromises).then(
							function() {
								resolve_generatePositionsAndMediaInAlbumAndSubalbums();
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
				var title = "<span class='title-main'>", documentTitle = "", components, i, isDateTitle, isGpsTitle, isSearchTitle, isSelectionTitle, isMapTitle, originalTitle;
				var titleAnchorClasses, where, initialValue, searchFolderHash;
				var linkCount = 0, linksToLeave = 1, latitude, longitude, arrayCoordinates;
				var raquo = "&raquo;";
				// gpsLevelNumber is the number of levels for the by gps tree
				// current levels are country, region, place => 3
				var gpsLevelNumber = 3;
				var gpsName = '';
				var setDocumentTitle = (id === "center" || id === "album");

				// f.updateMenu();

				if (id === "album") {
					$(".media-box#" + id + " .title").addClass("hidden");
					$("#album-view .title").removeClass("hidden");
				} else {
					$(".media-box#" + id + " .title").removeClass("hidden");
					$("#album-view .title").addClass("hidden");
					$("#album-view .title-string").html("");
				}


				if (env.options.page_title !== "")
					originalTitle = env.options.page_title;
				else
					originalTitle = util._t(".title-string");


				if (! env.currentAlbum.path.length)
					components = [originalTitle];
				else {
					if (env.currentAlbum.hasOwnProperty("ancestorsTitles")) {
						components = env.currentAlbum.ancestorsNames;
						components = components.map(
							(ithComponent, i) =>
								i && env.currentAlbum.ancestorsTitles[i] && env.currentAlbum.ancestorsTitles[i] !== ithComponent ? env.currentAlbum.ancestorsTitles[i] + " <span class='media-real-name'>(" + ithComponent + ")" : ithComponent
						);
						components.unshift(components[0] && originalTitle !== components[0] ? originalTitle + " <span class='media-real-name'>(" + components[0] + ")" : originalTitle);
					} else {
						components = env.currentAlbum.path.split("/");
						components.unshift(originalTitle);
					}
				}

				isDateTitle = (components.length > 1 && components[1] === env.options.by_date_string);
				isGpsTitle = (components.length > 1 && components[1] === env.options.by_gps_string);
				isSearchTitle = (components.length > 1 && components[1] === env.options.by_search_string);
				isSelectionTitle = (components.length > 1 && components[1] === env.options.by_selection_string);
				isMapTitle = (components.length > 1 && components[1] === env.options.by_map_string);

				// 'textComponents = components' doesn't work: textComponents becomes a pointer to components
				var textComponents = components.slice();

				// generate the title in the page top
				titleAnchorClasses = 'title-anchor';
				if (env.isMobile.any())
					titleAnchorClasses += ' mobile';

				var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);
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

				if (isDateTitle) {
					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + "'>" + components[0] + "</a>" + raquo;
					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + env.options.by_date_string + "'>(" + util._t("#by-date") + ")</a>";

					if (components.length > 2 || singleMedia !== null)
						title += raquo;

					if (setDocumentTitle) {
						documentTitle += components[0];
						if (components.length > 2 || singleMedia !== null)
							documentTitle = " \u00ab " + documentTitle;
						documentTitle += " (" + util._t("#by-date") + ")";
					}

					for (i = 2; i < components.length; ++i) {
						if (i < components.length - 1 || singleMedia !== null)
							title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + encodeURI(env.currentAlbum.ancestorsCacheBase[i - 1]) + "'>";
						else
							title += "<span class='title-no-anchor'>";

						if (i === 3) {
							textComponents[i] = util._t("#month-" + textComponents[i]);
							title += textComponents[i];
						} else if (i === 2 || i === 4) {
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

					if (
						components.length > 1 &&
						(singleMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) &&
						! env.isMobile.any()
					) {
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
					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + "'>" + components[0] + "</a>" + raquo;
					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + env.options.by_gps_string + "'>(" + util._t("#by-gps") + ")</a>";

					if (components.length > 2 || singleMedia !== null)
						title += raquo;

					if (setDocumentTitle) {
						documentTitle += components[0];
						if (components.length > 2 || singleMedia !== null)
							documentTitle = " \u00ab " + documentTitle;
						documentTitle += " (" + util._t("#by-gps") + ")";
					}

					for (i = 2; i < components.length; ++i) {
						if (i === components.length - 1) {
							gpsName = util.transformAltPlaceName(env.currentAlbum.ancestorsNames[i - 1]);
						} else {
							gpsName = env.currentAlbum.ancestorsNames[i - 1];
						}

						if (gpsName === '')
							gpsName = util._t('.not-specified');
						// gpsHtmlTitle = util._t("#place-icon-title") + gpsName;

						if (i < components.length - 1 || singleMedia !== null) {
							title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + encodeURI(env.currentAlbum.ancestorsCacheBase[i - 1]) + "'";
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
							arrayCoordinates = env.currentAlbum.ancestorsCenters[i - 1];
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

					if (
						components.length > 1 &&
						(singleMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) &&
						! env.isMobile.any()
					) {
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
					// i=1: env.options.by_search_string
					// (optional) i=2: image cache or folder
					// (optional) i=3 up: folder or image
					// (optional) i=n: image

					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + "'>" + components[0] + "</a>" + raquo;
					if (
						env.options.search_current_album &&
						! util.isAnyRootCacheBase(env.options.cache_base_to_search_in)
					) {
						title += "<span id='search-album-to-be-filled'></span>" + raquo;
					}
					var searchClass = "search-link";

					if (
						env.options.search_current_album &&
						! util.isAnyRootCacheBase(env.options.cache_base_to_search_in)
					) {
						searchClass = "main-search-link";
						// searchFolderHash = albumHash.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
						searchFolderHash = env.options.cache_base_to_search_in;
					}
					where =
						"<a class='" + searchClass + "' href='" + env.hashBeginning + env.currentAlbum.cacheBase + "'>" +
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
						(singleMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) &&
						(env.currentAlbum.numsMedia.imagesAndVideosTotal() || env.currentAlbum.subalbums.length) &&
						! env.isMobile.any()
					) {
						title += "<span class='title-count'>(";
						title += util._t(".title-found") + ' ';
						if (env.currentAlbum.numsMedia.imagesAndVideosTotal()) {
							title += mediaTotalInAlbum + " ";
							if (! imagesTotalInAlbum && videosTotalInAlbum)
								title += util._t(".title-videos");
							else if (imagesTotalInAlbum && ! videosTotalInAlbum)
								title += util._t(".title-images");
							else
								title += util._t(".title-media");
							if (env.currentAlbum.subalbums.length)
								title += " " + util._t(".title-and");
						}
						if (env.currentAlbum.subalbums.length) {
							title += " " + env.currentAlbum.subalbums.length;
							title += " " + util._t(".title-albums");
						}

						if (env.currentAlbum.hasOwnProperty("removedStopWords") && env.currentAlbum.removedStopWords.length) {
							// say that some search word hasn't been used
							title += " - " + env.currentAlbum.removedStopWords.length + " " + util._t("#removed-stopwords") + ": ";
							for (i = 0; i < env.currentAlbum.removedStopWords.length; i ++) {
								if (i)
									title += ", ";
								title += env.currentAlbum.removedStopWords[i];
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
				} else if (isSelectionTitle) {
					// i=0: title
					// i=1: env.options.by_selection_string
					// (optional) i=2: media folder cache base
					// (optional) i=3: media cache base

					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + "'>" + components[0] + "</a>" + raquo;
					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + env.options.by_selection_string + "'>(" + util._t("#by-selection") + ")</a>";
					if (singleMedia !== null) {
						title += raquo;
					}

					title += fillInSpan;

					if (setDocumentTitle) {
						documentTitle += components[0];
						documentTitle += " (" + util._t("#by-selection") + ")";
						if (singleMedia !== null)
							documentTitle += " \u00ab " + documentTitle;
					}

					if (
						(singleMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) &&
						(env.currentAlbum.numsMedia.imagesAndVideosTotal() || env.currentAlbum.subalbums.length) &&
						! env.isMobile.any()
					) {
						title += "<span class='title-count'>(";
						// title += util._t(".title-selected") + ' ';
						if (env.currentAlbum.numsMedia.imagesAndVideosTotal()) {
							title += mediaTotalInAlbum + " ";
							if (! imagesTotalInAlbum && videosTotalInAlbum)
								title += util._t(".title-videos");
							else if (imagesTotalInAlbum && ! videosTotalInAlbum)
								title += util._t(".title-images");
							else
								title += util._t(".title-media");
							if (env.currentAlbum.subalbums.length)
								title += " " + util._t(".title-and");
						}
						if (env.currentAlbum.subalbums.length) {
							title += " " + env.currentAlbum.subalbums.length;
							title += " " + util._t(".title-albums");
						}

						title += ")</span>";
					}

					if (setDocumentTitle) {
						// documentTitle += " (" + where +") \u00ab " + components[0];
						if (singleMedia !== null)
							documentTitle = " \u00ab " + documentTitle;
					}
				} else if (isMapTitle) {
					// i=0: title
					// i=1: env.options.by_search_string
					// (optional) i=2: image cache or folder
					// (optional) i=3 up: folder or image
					// (optional) i=n: image
					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + "'>" + components[0] + "</a>" + raquo;

					where =
						"<a class='search-link' href='" + env.hashBeginning + env.currentAlbum.cacheBase + "'>" +
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
						(singleMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) &&
						(env.currentAlbum.numsMedia.imagesAndVideosTotal() || env.currentAlbum.subalbums.length) &&
						! env.isMobile.any()
					) {
						title += "<span class='title-count'>(";
						if (env.currentAlbum.numsMedia.imagesAndVideosTotal()) {
							title += mediaTotalInAlbum + " ";
							if (! imagesTotalInAlbum && videosTotalInAlbum)
								title += util._t(".title-videos");
							else if (imagesTotalInAlbum && ! videosTotalInAlbum)
								title += util._t(".title-images");
							else
								title += util._t(".title-media");
							if (env.currentAlbum.subalbums.length)
								title += " " + util._t(".title-and");
						}
						if (env.currentAlbum.subalbums.length) {
							title += " " + env.currentAlbum.subalbums.length;
							title += " " + util._t(".title-albums");
						}
						title += ")</span>";
					}

					if (setDocumentTitle) {
						// build the html page title
						documentTitle += " (" + where + ") \u00ab " + components[0];
						if (singleMedia !== null)
							documentTitle = " \u00ab " + documentTitle;
					}
				} else {
					// folders title
					title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + "'>" + components[0] + "</a>";
					if (components.length > 2 || singleMedia !== null)
						title += raquo;

					if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
						searchFolderHash = savedSearchAlbumHash.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
						let addSearchFolder = false;
						if (searchFolderHash.split(env.options.cache_folder_separator).length > 1) {
							where =
								"<a class='main-search-link' href='" + env.hashBeginning + savedSearchAlbumHash + "'>" +
								util._t("#by-search") +
								"</a>";
								addSearchFolder = true;
						} else if (util.isSearchCacheBase(savedSearchAlbumHash)) {
							where =
								"<a class='search-link' href='" + env.hashBeginning + savedSearchAlbumHash + "'>" +
								util._t("#by-search") +
								"</a>";
						} else {
							// album in a selection
							where =
								"<a class='search-link' href='" + env.hashBeginning + savedSearchAlbumHash + "'>" +
								util._t("#by-selection") +
								"</a>";
						}

						if (addSearchFolder) {
							title += "<span id='search-album-to-be-filled'></span>";
							title += raquo;
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
					if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null && util.isSearchCacheBase(savedSearchAlbumHash)) {
						// the folders from the first until the search folder inclusive must not be shown
						initialValue = savedSearchAlbumHash.split(env.options.cache_folder_separator).slice(2).length + 1;
					}
					for (i = initialValue; i < components.length; ++i) {
						if (i < components.length - 1 || singleMedia !== null)
							title += "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + encodeURI(env.currentAlbum.ancestorsCacheBase[i - 1]) + "'>";
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

					if (
						components.length > 1 &&
						(singleMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) &&
						! env.isMobile.any()
					) {
						title += "<span class='title-count'>(";
						if (env.currentAlbum.numsMedia.imagesAndVideosTotal()) {
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
								title += "</span> ";
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

				let promise = env.currentAlbum.generatePositionsAndMediaInAlbumAndSubalbums();

				promise.then(
					function() {
						if (singleMedia !== null || env.currentAlbum.isAlbumWithOneMedia()) {
							if (singleMedia === null)
								singleMedia = currentAlbum.media[0];
							title += "<span class='media-name'>" + singleMedia.nameForShowing(env.currentAlbum, true) + "</span>";
							if (env.currentMedia.hasGpsData()) {
								title += "<a class='map-popup-trigger'>" +
								"<img class='title-img' title='" + util.escapeSingleQuotes(util._t("#show-on-map")) + " [s]' alt='" + util.escapeSingleQuotes(util._t("#show-on-map")) + "' height='20px' src='img/ic_place_white_24dp_2x.png'>" +
								"</a>";
							}
						} else if (title.includes(fillInSpan) && env.currentAlbum.numPositionsInTree) {
							let replace = "";
							let shortcutAdded = false;
							let marker = "<marker>";
							// close the .title-main span
							replace += "</span>";
							if (env.currentAlbum.numPositionsInAlbum && env.currentAlbum.numPositionsInTree !== env.currentAlbum.numPositionsInSubalbums) {
								replace +=
									"<a class='map-popup-trigger'>" +
										"<img class='title-img' " +
											"title='" + marker;
								if (! env.currentAlbum.numPositionsInSubalbums) {
									replace += " " + util.escapeSingleQuotes(util._t("#show-markers-on-map-shortcut"));
									shortcutAdded = true;
								}
								replace +=
											"' " +
											"alt='" + util.escapeSingleQuotes(util._t("#show-markers-on-map")) + "' " +
											"height='20px' " +
											"src='img/ic_place_white_24dp_2x.png'" +
										">" +
									"</a>";
							}
							if (env.currentAlbum.numPositionsInSubalbums) {
								replace +=
									"<a class='map-popup-trigger-double'>" +
										"<img class='title-img' " +
											"title='" + marker;
								if (! shortcutAdded) {
									replace += " " + util.escapeSingleQuotes(util._t("#show-markers-on-map-shortcut"));
								}
								replace +=
											"' " +
											"alt='" + util.escapeSingleQuotes(util._t("#show-markers-on-map")) + "' " +
											"height='20px' " +
											"src='img/ic_place_white_24dp_2x_double.png'" +
										">" +
									"</a>";
							}
							let firstIndex = replace.indexOf(marker);
							let lastIndex = replace.lastIndexOf(marker);
							let markerLength = marker.length;
							if (firstIndex === lastIndex) {
								replace = replace.substring(0, firstIndex) + util.escapeSingleQuotes(util._t("#show-markers-on-map")) + replace.substring(firstIndex + markerLength);
							} else {
								replace = replace.substring(0, lastIndex) + util.escapeSingleQuotes(util._t("#show-tree-markers-on-map")) + replace.substring(lastIndex + markerLength);
								replace = replace.substring(0, firstIndex) + util.escapeSingleQuotes(util._t("#show-album-markers-on-map")) + replace.substring(firstIndex + markerLength);
							}

							title = title.replace(
								fillInSpan,
								replace
							);
						} else {
							// close the .title-main span
							title += "</span>";
						}

						if (env.isMobile.any()) {
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


						if (env.isMobile.any()) {
							$(".dots").off('click').on(
								'click',
								function(ev) {
									if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
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
								documentTitle = singleMedia.nameForShowing(env.currentAlbum) + documentTitle;
							else if (env.currentAlbum !== null && ! env.currentAlbum.subalbums.length && env.currentAlbum.numsMedia.imagesAndVideosTotal() === 1)
								documentTitle = util.trimExtension(env.currentAlbum.media[0].name) + " \u00ab " + documentTitle;

							document.title = documentTitle;
						}

						var toBeResolved = true;
						if ($("#search-album-to-be-filled").length) {
							toBeResolved = false;
							// for searches in current folder we must get the names from the album
							// we must use getAlbum() because the album could not be in the cache yet (as when ctl-r is pressed)
							var promise = phFl.getAlbum(searchFolderHash, util.errorThenGoUp, {getMedia: true, getPositions: true});
							promise.then(
								function(theAlbum) {
									var whereLinks = '', whereLinksArray = [], thisCacheBase, name, documentTitle;

									if (theAlbum.hasOwnProperty('ancestorsNames')) {
										for (var i = 0; i < theAlbum.ancestorsNames.length; i ++) {
											if (theAlbum.hasOwnProperty("ancestorsTitles") && theAlbum.ancestorsTitles[i] !== theAlbum.ancestorsNames[i])
												name = theAlbum.ancestorsTitles[i] + "<span class='media-real-name'>(" + theAlbum.ancestorsNames[i] + ")";
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
											"(" + util._t("#by-search") + ") \u00ab " + util.stripHtmlAndReplaceEntities(whereLinksArray.reverse().join(" \u00ab "))
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

						f.setOptions();

						// activate the map popup trigger in the title
						$(".map-popup-trigger").off('click').on(
							'click',
							function(ev, from) {
								// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
								env.selectorClickedToOpenTheMap = ".map-popup-trigger";
								if (env.currentMedia !== null && env.currentMedia.hasGpsData()) {
									TopFunctions.generateMapFromTitle(ev, from);
								} else {
									TopFunctions.generateMapFromTitleWithoutSubalbums(ev, from);
								}
							}
						);

						$(".map-popup-trigger-double").off('click').on(
							'click',
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

						$('.modal-close').on(
							'click',
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
			// _paq.push(['setDocumentTitle', PhotoFloat.cleanHash(location.hash)]);
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
			let isPopup = $('.leaflet-popup').html() ? true : false;
			let isMap = ($('#mapdiv').html() ? true : false) && ! isPopup;
			if (isPopup) {
				$('.leaflet-popup-close-button')[0].click();
				if (env.mapAlbum.media.length > 1) {
					env.popupRefreshType = "mapAlbum";
					// close the map and reopen it
					$('.modal-close')[0].click();
					$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
				}
				if ((isMap || isPopup) && env.currentAlbum.media.length === 1) {
					// we are in a map: close it
					$('.modal-close')[0].click();
				}
			}
			this.removeFromSelection(clickedSelector);
			f.updateMenu();
			if (env.currentAlbum.isSelection() && env.currentMedia === null && ! env.currentAlbum.isAlbumWithOneMedia())
				TopFunctions.setTitle("album", null);
		} else {
			if (util.nothingIsSelected())
				util.initializeSelectionAlbum();
			this.addToSelection(album, clickedSelector);
			if (env.currentAlbum.isSelection()) {
				TopFunctions.showAlbum("refreshMedia");
			}
			f.updateMenu();
		}
	};

	Album.prototype.toggleSubalbumSelection = function(iSubalbum, clickedSelector) {
		if (env.selectionAlbum.isEmpty())
			util.initializeSelectionAlbum();
		var subalbum = this.subalbums[iSubalbum];
		if (subalbum.isSelected()) {
			let removeSubalbumPromise = this.removeSubalbumFromSelection(iSubalbum, clickedSelector);
			removeSubalbumPromise.then(
				function subalbumRemoved() {
					if (util.nothingIsSelected())
						util.initializeSelectionAlbum();
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
			$("#media-select-box").off('click').on(
				'click',
				{singleMedia: self, clickedSelector: "#media-select-box"},
				function(ev) {
					ev.stopPropagation();
					ev.preventDefault();
					ev.data.singleMedia.toggleSelectedStatus(album, ev.data.clickedSelector);
				}
			);

			if (self.mimeType.indexOf("image/") === 0) {
				pS.addMediaGesturesDetection();
				util.setPinchButtonsPosition();
			}
			util.correctPrevNextPosition();
			if (util.setSelectButtonPosition())
				util.setDescriptionPosition('media');

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
					event.data.currentZoom = pS.getCurrentZoom();
					event.data.initialZoom = pS.getInitialZoom();
					let scalePromise = self.scale(event);
					scalePromise.then(
						function() {
							if (self.mimeType.indexOf("image/") === 0) {
								f.pinchSwipeInitialization();
								util.setPinchButtonsPosition();
							}
							if (util.setSelectButtonPosition())
								util.setDescriptionPosition('media');
							util.correctPrevNextPosition();
						}
					);

					if (album.numsMedia.imagesAndVideosTotal() > 1) {
						event.data.id = "left";
						env.prevMedia.scale(event);

						event.data.id = "right";
						env.nextMedia.scale(event);
					}

					var isPopup = $('.leaflet-popup').html() ? true : false;
					var isMap = $('#mapdiv').html() ? true : false;
					if (isMap) {
						// the map must be generated again including the points that only carry protected content
						env.mapRefreshType = "resize";

						if (isPopup) {
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

		var text, thumbnailSize, loadEvent, mediaHtml, mediaSelector, mediaSrc;
		var exposureTime, heightForMedia, heightForMediaAndTitle;
		var previousMediaIndex, nextMediaIndex, whatMedia;

		$(".media-bar").show();
		$("#downloading-media").hide();

		if (id === "center")
			$("#media-view").removeClass("hidden");

		var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

		env.mediaLink = phFl.encodeHash(env.currentAlbum.cacheBase, this, foundAlbumHash, savedSearchAlbumHash);
		env.firstEscKey = true;

		thumbnailSize = env.options.media_thumb_size;

		if (id === "center") {
			if (env.options.hide_title) {
				$("#" + id + " .title").addClass("hidden-by-option");
			} else {
				$("#" + id + " .title").removeClass("hidden-by-option");
			}

			if (env.fullScreenStatus) {
				$("#" + id + " .title").addClass("hidden-by-fullscreen");
			} else {
				$("#" + id + " .title").removeClass("hidden-by-fullscreen");
			}

			if (env.options.hide_descriptions) {
				$("#description-title, #description-text, .media-description").addClass("hidden-by-option");
			} else {
				$("#description-title, #description-text, .media-description").removeClass("hidden-by-option");
			}

			if (env.options.hide_tags) {
				$("#description-tags, .media-tags").addClass("hidden-by-option");
			} else {
				$("#description-tags, .media-tags").removeClass("hidden-by-option");
			}

			if (env.options.hide_bottom_thumbnails) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}

			if (env.currentAlbum.numsMedia.imagesAndVideosTotal() === 1) {
				$("#album-view").addClass("hidden");
			} else {
				$("#album-view, #album-view #subalbums").removeClass("hidden");
			}

			if (env.fullScreenStatus) {
				$("#album-view").addClass("hidden-by-fullscreen");
			} else {
				$("#album-view").removeClass("hidden-by-fullscreen");
			}

			if ($("#album-view").is(":visible")) {
				$("#album-view").addClass("media-view-container");
			}
			whatMedia = this;
		} else if (id === "left") {
			whatMedia = env.prevMedia;
		} else if (id === "right") {
			whatMedia = env.nextMedia;
		}

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

					if (env.currentAlbum.numsMedia.imagesAndVideosTotal() === 1) {
						$("#next").hide();
						$("#prev").hide();
					} else {
						$("#next").show();
						$("#prev").show();
					}

					env.currentAlbum.media[env.currentMediaIndex].byDateName =
						util.pathJoin([env.currentAlbum.media[env.currentMediaIndex].dayAlbum, env.currentAlbum.media[env.currentMediaIndex].name]);
					if (env.currentAlbum.media[env.currentMediaIndex].hasOwnProperty("gpsAlbum"))
						env.currentAlbum.media[env.currentMediaIndex].byGpsName =
							util.pathJoin([env.currentAlbum.media[env.currentMediaIndex].gpsAlbum, env.currentAlbum.media[env.currentMediaIndex].name]);

					env.nextMedia = null;
					env.prevMedia = null;
					if (env.currentAlbum.numsMedia.imagesAndVideosTotal() > 1) {
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

				if (self.mimeType.indexOf("video/") === 0 && ! f.videoOK()) {
					mediaBoxInnerElement.empty();
					f.addVideoUnsupportedMarker(id);
					if (id === "center")
						loadNextPrevMedia(self);
				} else {
					if (self.mimeType.indexOf("video/") === 0) {
						mediaSelector = ".media-box#" + id + " .media-box-inner video";
					} else {
						mediaSelector = ".media-box#" + id + " .media-box-inner img";
					}
					// is the following line correct for videos?
					mediaSrc = self.chooseMediaReduction(id, env.fullScreenStatus);
					mediaHtml = self.createMediaHtml(album, id, env.fullScreenStatus);

					loadEvent = self.chooseTriggerEvent();

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
						util.setDescription(self.metadata.title, self.metadata.description, self.metadata.tags);
					}

					// var self = self;
					$(mediaSelector).off(loadEvent).on(
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
										if (self.mimeType.indexOf("image/") === 0) {
											util.setPinchButtonsPosition();
										}
										if (util.setSelectButtonPosition())
											util.setDescriptionPosition('media');
										util.correctPrevNextPosition();
										loadNextPrevMedia(self, containerHeight, containerWidth);
									}
									// }
								}
							);
						}
					);
					// in case the image has been already loaded, trigger the event
					if ($(mediaSelector)[0].complete)
						$(mediaSelector).trigger(loadEvent);

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

					mediaBoxInnerElement.off('mousewheel');
					if (self.mimeType.indexOf("image/") === 0)
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

					if (env.currentAlbum.numsMedia.imagesAndVideosTotal() === 1) {
						mediaBoxInnerElement.css('cursor', 'default');
					} else {
						[albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

						$("#next").show();
						$("#prev").show();
						mediaBoxInnerElement.css('cursor', '').on(
							'contextmenu',
							function(ev) {
								if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
									ev.preventDefault();
									if (pS.getCurrentZoom() === 1) {
										env.prevMedia.swipeRight();
										return false;
									}
								}
								// contextMenu = true;
								return true;
							}
						);

						$("#prev").on('click', function(ev) {
							if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
								env.prevMedia.swipeRight();
								return false;
							}
							return true;
						});
						$("#next").on('click', function(ev) {
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
					$(".media-box#center .metadata-show").off('click').on('click', f.toggleMetadataFromMouse);
					$(".media-box#center .metadata-hide").off('click').on('click', f.toggleMetadataFromMouse);
					$(".media-box#center .metadata").off('click').on('click', f.toggleMetadataFromMouse);
					$(".media-box#center .fullscreen").off('click').on('click', TopFunctions.goFullscreenFromMouse);

					// set social buttons events
					if (env.currentMedia.mimeType.indexOf("video/") === 0)
						$("#media-center").on("loadstart", f.socialButtons);
					else
						$("#media-center").on("load", f.socialButtons);
				}

				$(".media-box#" + id + " .metadata tr.gps").off('click');
				text = "<table>";
				// Here we keep only the technical metadata
				if (self.date !== undefined)
					text += "<tr><td class='metadata-data-date'></td><td>" + self.date + "</td></tr>";
				var fileSize = self.fileSizes[0].images;
				if (self.mimeType.indexOf("video/") === 0)
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
					text += "<tr class='map-link' class='gps'><td class='metadata-data-latitude'></td><td>" + self.metadata.latitudeMS + " </td></tr>";
				if (self.metadata.longitude !== undefined)
					text += "<tr class='gps'><td class='metadata-data-longitude'></td><td>" + self.metadata.longitudeMS + " </td></tr>";
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
					// if (self != null) {
					// 	util.setDescription(self.metadata.title, self.metadata.description, self.metadata.tags);
					// 	util.setDescriptionPosition('media');
					// }

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
		var populateAlbum;

		if (env.currentMedia !== null && env.currentMedia.mimeType.indexOf("video/") === 0)
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

		if (! this.isEqual(env.currentAlbum)) {
			// this if condition is required for when a password is guessed
			env.previousAlbum = env.currentAlbum;
		}
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

		f.setOptions();

		if (env.currentMedia === null) {
			$("#menu-icon").attr("title", util._t("#menu-icon-title"));
			env.currentAlbum.sortAlbumsMedia();
		}

		if (env.currentMedia !== null || isAlbumWithOneMedia) {
			if (isAlbumWithOneMedia) {
				env.currentMedia = env.currentAlbum.media[0];
				env.currentMediaIndex = 0;
				$("#media-view").css("cursor", "default");
				$("#album-view").addClass("hidden");
			} else {
				$("#media-view").css("cursor", "ew-resize");
			}
			env.nextMedia = null;
			env.prevMedia = null;
			$("#album-view").addClass("media-view-container")
			if (env.currentMedia !== null && env.previousMedia === null) {
				TopFunctions.showAlbum("refreshMedia");
			} else {
				util.scrollToThumb();
			}
			env.currentMedia.show(env.currentAlbum, 'center');
		} else {
			TopFunctions.setTitle("album", null).then(
				function titleSet() {
					$("#album-view").removeClass("media-view-container").removeAttr("height");

					if ($("#album-view").is(":visible")) {
						populateAlbum = false;
						if (
							env.currentMedia === null && ! env.currentAlbum.isAlbumWithOneMedia() && (
								env.previousAlbum === null ||
								! env.previousAlbum.isEqual(env.currentAlbum) ||
								env.previousAlbum.numsMediaInSubTree.imagesAndVideosTotal() !== env.currentAlbum.numsMediaInSubTree.imagesAndVideosTotal()
							) ||
							env.currentMedia !== null && env.previousMedia === null
						)
							populateAlbum = true;
						TopFunctions.showAlbum(populateAlbum);
					}
				}
			);
		}

		// options function must be called again in order to set elements previously absent
		f.setOptions();
		if (env.currentMedia === null && env.currentAlbum !== null && ! env.currentAlbum.subalbums.length) {
			// no subalbums: set social buttons href's when all the stuff is loaded
			$(window).on("load", f.socialButtons());
		} else {
			// subalbums are present, we have to wait when all the random thumbnails will be loaded
		}
	};

	Album.prototype.bindSortEvents = function() {
		// binds the click events to the sort buttons

		var self = this;

		$("li.sort").off('click');
		$("li.album-sort.by-date").on(
			'click',
			function(ev) {
				self.sortSubalbumsByDate(ev);
			}
		);
		$("li.album-sort.by-name").on(
			'click',
			function(ev) {
				self.sortSubalbumsByName(ev);
			}
		);
		$("li.album-sort.reverse").on(
			'click',
			function(ev) {
				self.sortSubalbumsReverse(ev);
			}
		);
		$("li.media-sort.by-date").on(
			'click',
			function(ev) {
				self.sortMediaByDate(ev);
			}
		);
		$("li.media-sort.by-name").on(
			'click',
			function(ev) {
				self.sortMediaByName(ev);
			}
		);
		$("li.media-sort.reverse").on(
			'click',
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
			TopFunctions.showAlbum("refreshSubalbums");
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
			// f.setBooleanCookie("albumReverseSortRequested", this.albumReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			TopFunctions.showAlbum("refreshSubalbums");
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
			TopFunctions.showAlbum("refreshSubalbums");
		}
		return false;
	};
	// media

	Album.prototype.sortMediaByDate = function (ev) {
		if (
			this.mediaNameSort &&
			ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.mediaNameSort = false;
			f.setBooleanCookie("mediaNameSortRequested", false);
			// f.setBooleanCookie("mediaReverseSortRequested", this.mediaReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			if (this.cacheBase === env.currentAlbum.cacheBase)
				TopFunctions.showAlbum("refreshMedia");
			else
				map.updatePopup(MapFunctions.titleWrapper1 + this.generateHtmlForImages() + MapFunctions.titleWrapper2);
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
			// f.setBooleanCookie("mediaReverseSortRequested", this.mediaReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			if (this.cacheBase === env.currentAlbum.cacheBase)
				TopFunctions.showAlbum("refreshMedia");
			else
				map.updatePopup(MapFunctions.titleWrapper1 + this.generateHtmlForImages() + MapFunctions.titleWrapper2);
		}
		return false;
	};

	Album.prototype.sortMediaReverse = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.mediaReverseSort = ! env.mediaReverseSort;
			f.setBooleanCookie("mediaReverseSortRequested", env.mediaReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			if (this.cacheBase === env.currentAlbum.cacheBase)
				TopFunctions.showAlbum("refreshMedia");
			else
				map.updatePopup(MapFunctions.titleWrapper1 + this.generateHtmlForImages() + MapFunctions.titleWrapper2);
		}
		return false;
	};

	TopFunctions.prototype.toggleTitleAndBottomThumbnailsAndDescriptionsAndTags = function(ev) {
		// if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
		env.options.hide_title = ! env.options.hide_title;
		f.setBooleanCookie("hideTitle", env.options.hide_title);
		env.options.hide_bottom_thumbnails = ! env.options.hide_bottom_thumbnails;
		f.setBooleanCookie("hideBottomThumbnails", env.options.hide_bottom_thumbnails);
		env.options.hide_descriptions = ! env.options.hide_descriptions;
		env.options.hide_tags = ! env.options.hide_tags;
		f.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);
		f.setBooleanCookie("hideTags", env.options.hide_tags);
		f.updateMenu();
		if (env.options.hide_title) {
			$(".title").addClass("hidden-by-option");
		} else {
			$(".title").removeClass("hidden-by-option");
		}
		if (env.options.hide_bottom_thumbnails) {
			$("#album-view").addClass("hidden-by-option");
		} else {
			$("#album-view").removeClass("hidden-by-option");
		}
		if (env.options.hide_descriptions) {
			$("#description-title, #description-text, .media-description, .album-description").addClass("hidden-by-option");
		} else {
			$("#description-title, #description-text, .media-description, .album-description").removeClass("hidden-by-option");
		}
		if (env.options.hide_tags) {
			$("#description-tags, .media-tags, .album-tags").addClass("hidden-by-option");
		} else {
			$("#description-tags, .media-tags, .album-tags").removeClass("hidden-by-option");
		}
		if (! $("#thumbs").children().length)
			$("#album-view").addClass("media-view-container");
		TopFunctions.showAlbum("refreshMedia");
		// else
		// 	TopFunctions.showAlbum(true);
		// 	env.currentAlbum.prepareForShowing(env.currentMediaIndex);
		if (env.currentMedia !== null) {
			let event = {data: {}};
			event.data.resize = true;
			event.data.id = "center";
			env.currentMedia.scale(event);
			if (env.nextMedia !== null) {
				event.data.id = "right";
				env.nextMedia.scale(event);
			}
			if (env.prevMedia !== null) {
				event.data.id = "left";
				env.prevMedia.scale(event);
			}
		} else {
			TopFunctions.showAlbum(false);
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
				TopFunctions.showAlbum("refreshMedia");
			}
			if (env.currentMedia !== null) {
				let event = {data: {}};
				event.data.resize = true;
				event.data.id = "center";
				env.currentMedia.scale(event);
				if (env.nextMedia !== null) {
					event.data.id = "right";
					env.nextMedia.scale(event);
				}
				if (env.prevMedia !== null) {
					event.data.id = "left";
					env.prevMedia.scale(event);
				}
			} else
				TopFunctions.showAlbum(false);
		}
		return false;
	};

	TopFunctions.prototype.toggleBottomThumbnails = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_bottom_thumbnails = ! env.options.hide_bottom_thumbnails;
			f.setBooleanCookie("hideBottomThumbnails", env.options.hide_bottom_thumbnails);
			f.updateMenu();
			if (env.options.hide_bottom_thumbnails) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}
			// if ($("#thumbs").children().length)
			if (! $("#album-view").hasClass("hide-bottom-thumbnails")) {
				$("#album-view").addClass("media-view-container");
				TopFunctions.showAlbum("refreshMedia");
			}
			// else
			// 	env.currentAlbum.prepareForShowing(env.currentMediaIndex);
			if (env.currentMedia !== null) {
				let event = {data: {}};
				event.data.resize = true;
				event.data.id = "center";
				env.currentMedia.scale(event);
				if (env.nextMedia !== null) {
					event.data.id = "right";
					env.nextMedia.scale(event);
				}
				if (env.prevMedia !== null) {
					event.data.id = "left";
					env.prevMedia.scale(event);
				}
			} else
				TopFunctions.showAlbum(false);
		}
		return false;
	};

	TopFunctions.prototype.toggleDescriptions = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_descriptions = ! env.options.hide_descriptions;
			f.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);
			f.updateMenu();
			if (env.options.hide_descriptions && env.options.hide_tags) {
				$("#description").addClass("hidden-by-option");
			} else {
				$("#description").removeClass("hidden-by-option");
			}
			if (env.options.hide_descriptions) {
				$("#description-title, #description-text, .media-description, .album-description").addClass("hidden-by-option");
			} else {
				$("#description-title, #description-text, .media-description, .album-description").removeClass("hidden-by-option");
				// TopFunctions.showAlbum("refreshMedia");
			}
			if (env.currentMedia !== null) {
				let event = {data: {}};
				event.data.resize = true;
				event.data.id = "center";
				env.currentMedia.scale(event);
				if (env.nextMedia !== null) {
					event.data.id = "right";
					env.nextMedia.scale(event);
				}
				if (env.prevMedia !== null) {
					event.data.id = "left";
					env.prevMedia.scale(event);
				}
			} else
				TopFunctions.showAlbum("refreshBoth");
		}
		return false;
	};

	TopFunctions.prototype.toggleTags = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_tags = ! env.options.hide_tags;
			f.setBooleanCookie("hideTags", env.options.hide_tags);
			f.updateMenu();
			if (env.options.hide_descriptions && env.options.hide_tags) {
				$("#description").addClass("hidden-by-option");
			} else {
				$("#description").removeClass("hidden-by-option");
			}
			if (env.options.hide_tags) {
				$("#description-tags, .media-tags, .album-tags").addClass("hidden-by-option");
			} else {
				$("#description-tags, .media-tags, .album-tags").removeClass("hidden-by-option");
				// TopFunctions.showAlbum("refreshMedia");
			}
			if (env.currentMedia !== null) {
				let event = {data: {}};
				event.data.resize = true;
				event.data.id = "center";
				env.currentMedia.scale(event);
				if (env.nextMedia !== null) {
					event.data.id = "right";
					env.nextMedia.scale(event);
				}
				if (env.prevMedia !== null) {
					event.data.id = "left";
					env.prevMedia.scale(event);
				}
			} else
				TopFunctions.showAlbum("refreshBoth");
		}
		return false;
	};

	TopFunctions.prototype.toggleSlideMode = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.albums_slide_style = ! env.options.albums_slide_style;
			f.setBooleanCookie("albumsSlideStyle", env.options.albums_slide_style);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
		}
		return false;
	};

	TopFunctions.prototype.toggleSpacing = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if (env.options.spacing)
				env.options.spacing = 0;
			else
				env.options.spacing = env.options.spacingToggle;
			f.setCookie("spacing", env.options.spacing);
			f.updateMenu();
			if (env.currentAlbum.subalbums.length > 1 && env.currentAlbum.numsMedia.imagesAndVideosTotal() > 1)
				TopFunctions.showAlbum("refreshBoth");
			else if (env.currentAlbum.subalbums.length > 1)
				TopFunctions.showAlbum("refreshSubalbums");
			else if (env.currentAlbum.numsMedia.imagesAndVideosTotal() > 1)
				TopFunctions.showAlbum("refreshMedia");

			if ($('.leaflet-popup').html())
				map.updatePopup(MapFunctions.titleWrapper1 + env.mapAlbum.generateHtmlForImages() + MapFunctions.titleWrapper2);
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumNames = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_album_names_below_thumbs = ! env.options.show_album_names_below_thumbs;
			f.setBooleanCookie("showAlbumNamesBelowThumbs", env.options.show_album_names_below_thumbs);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			// if (env.options.show_album_names_below_thumbs) {
			// 	$(".album-name").removeClass("hidden-by-option");
			// } else {
			// 	$(".album-name").addClass("hidden-by-option");
			// }
			// util.adaptCaptionHeight();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaCount = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_album_media_count = ! env.options.show_album_media_count;
			f.setBooleanCookie("showAlbumMediaCount", env.options.show_album_media_count);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaNames = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_media_names_below_thumbs = ! env.options.show_media_names_below_thumbs;
			f.setBooleanCookie("showMediaNamesBelowThumbs", env.options.show_media_names_below_thumbs);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumsSquare = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.album_thumb_type = env.options.album_thumb_type === "square" ? "fit" : "square";
			f.setCookie("albumThumbType", env.options.album_thumb_type);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaSquare = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.media_thumb_type = env.options.media_thumb_type === "square" ? "fixed_height" : "square";
			f.setCookie("mediaThumbType", env.options.media_thumb_type);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			if ($('.leaflet-popup').html())
				map.updatePopup(MapFunctions.titleWrapper1 + env.mapAlbum.generateHtmlForImages() + MapFunctions.titleWrapper2);
		}
		return false;
	};

	TopFunctions.prototype.toggleBigAlbumsShow = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if ($("#message-too-many-images").is(":visible")) {
				$("#message-too-many-images").hide();
			}
			$("#loading").show();
			env.options.show_big_virtual_folders = ! env.options.show_big_virtual_folders;
			if (env.options.show_big_virtual_folders)
				$("#show-hide-them:hover").css("color", "").css("cursor", "");
			else
				$("#show-hide-them:hover").css("color", "inherit").css("cursor", "auto");
			f.setBooleanCookie("showBigVirtualFolders", env.options.show_big_virtual_folders);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
		}
		return false;
	};


	TopFunctions.showAlbum = function(populate) {
		function insertRandomImage(randomSubAlbum, index, iSubalbum) {
			var titleName, randomMediaLink, goTo, humanGeonames;
			var randomMedia = randomSubAlbum.media[index];
			var id = phFl.hashCode(env.currentAlbum.subalbums[iSubalbum].cacheBase);
			var mediaSrc = randomMedia.chooseThumbnail(env.options.album_thumb_size);

			$("#downloading-media").hide();

			mediaWidth = randomMedia.metadata.size[0];
			mediaHeight = randomMedia.metadata.size[1];
			if (env.options.album_thumb_type === "fit") {
				if (mediaWidth < env.correctedAlbumThumbSize && mediaHeight < env.correctedAlbumThumbSize) {
					thumbWidth = mediaWidth;
					thumbHeight = mediaHeight;
				} else {
					if (mediaWidth > mediaHeight) {
						thumbWidth = env.correctedAlbumThumbSize;
						thumbHeight = Math.floor(env.correctedAlbumThumbSize * mediaHeight / mediaWidth);
					} else {
						thumbWidth = Math.floor(env.correctedAlbumThumbSize * mediaWidth / mediaHeight);
						thumbHeight = env.correctedAlbumThumbSize;
					}
				}
			} else if (env.options.album_thumb_type === "square") {
				thumbWidth = env.correctedAlbumThumbSize;
				thumbHeight = env.correctedAlbumThumbSize;
			}

			if (env.currentAlbum.isByDate()) {
				titleName = util.pathJoin([randomMedia.dayAlbum, randomMedia.name]);
			} else if (env.currentAlbum.isByGps()) {
				humanGeonames = util.pathJoin([env.options.by_gps_string, randomMedia.geoname.country_name, randomMedia.geoname.region_name, randomMedia.geoname.place_name]);
				titleName = util.pathJoin([humanGeonames, randomMedia.name]);
			// } else if (env.currentAlbum.isSearch()) {
			// 	titleName = util.pathJoin([randomMedia.albumName, randomMedia.name]);
			} else {
				titleName = util.pathJoin([randomMedia.albumName, randomMedia.nameForShowing(randomSubAlbum)]);
			}
			randomMediaLink = phFl.encodeHash(randomSubAlbum.cacheBase, randomMedia);

			titleName = titleName.substr(titleName.indexOf('/') + 1);
			goTo = util._t(".go-to") + " " + titleName;
			$("#" + id + " .album-button a.random-media-link").attr("href", randomMediaLink);
			$("#" + id + " img.album-button-random-media-link").attr("title", goTo).attr("alt", goTo);
			$("#" + id + " img.thumbnail").attr("title", titleName).attr("alt", titleName);
			$("#" + id + " img.thumbnail").attr("data-src", encodeURI(mediaSrc));
			$("#" + id + " img.thumbnail").css("width", thumbWidth).css("height", thumbHeight);

			$(function() {
				$("img.lazyload-album-" + id).Lazy(
					{
						chainable: false,
						threshold: env.options.media_thumb_size,
						bind: 'event',
						removeAttribute: true
					}
				);
			});
		}
		// end of insertRandomImage function

		function pickRandomMediaAndInsertIt(iSubalbum, theImage, resolve_subalbumPromise) {
			// function(subalbum, error)
			var promise = phFl.pickRandomMedia(
				iSubalbum,
				function error() {
					// executions shoudn't arrive here, if it arrives it's because of some error
					console.trace();
					// env.currentAlbum.subalbums.splice(iSubalbum, 1);
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

		var i, imageLink, linkContainer, imageElement, media, thumbsElement, subalbumsElement, thumbHash, thumbnailSize;
		var width, height, thumbWidth, thumbHeight, imageString, imgString, img, calculatedWidth, calculatedHeight, populateMedia;
		var albumViewWidth;
		var mediaWidth, mediaHeight, slideBorder = 0, buttonBorder = 0, margin, imgTitle;
		var scrollBarWidth = window.innerWidth - document.body.clientWidth || 15;
		var tooBig = false, isTransversalAlbum;
		var mapLinkIcon, selectBoxHtml, selectSrc, titleSelector, id;
		var caption, captionHtml, buttonAndCaptionHeight, albumButtonAndCaptionHtml, heightfactor;

		var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);

		if (env.options.albums_slide_style)
			slideBorder = env.slideBorder;

		if (env.currentMedia === null)
			$("#album-view").off('mousewheel');
		if (env.currentMedia === null && env.previousMedia === null)
			$("html, body").stop().animate({ scrollTop: 0 }, "slow");
		if (populate) {
			thumbnailSize = env.options.media_thumb_size;

			populateMedia = populate;
			isTransversalAlbum = env.currentAlbum.isTransversal();
			tooBig = env.currentAlbum.path.split("/").length < 4 && env.currentAlbum.numsMedia.imagesAndVideosTotal() > env.options.big_virtual_folders_threshold;
			if (populateMedia === true && isTransversalAlbum)
				populateMedia = populateMedia && (! tooBig || env.options.show_big_virtual_folders);

			if (isTransversalAlbum && tooBig) {
				var tooManyImagesText, isShowing = false;
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
					// $("ul#right-menu").addClass("expand");
				} else {
					$("#show-hide-them:hover").css("color", "inherit").css("cursor", "auto");
				}
				$("#show-hide-them").on(
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

			if (
				! (isTransversalAlbum && tooBig && ! env.options.show_big_virtual_folders) && (
					populateMedia === true ||
					populateMedia === "refreshMedia" ||
					populateMedia === "refreshBoth"
				)
			) {
				media = [];

				thumbsElement = $("#thumbs");
				thumbsElement.empty();

				//
				// media loop
				//
				for (i = 0; i < env.currentAlbum.numsMedia.imagesAndVideosTotal(); ++i) {
					let iMedia = i;
					let ithMedia = env.currentAlbum.media[iMedia];

					width = ithMedia.metadata.size[0];
					height = ithMedia.metadata.size[1];
					thumbHash = ithMedia.chooseThumbnail(thumbnailSize);

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
					imgTitle = util.pathJoin([ithMedia.albumName, ithMedia.nameForShowing(env.currentAlbum)]);
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

					mapLinkIcon = "";
					if (ithMedia.hasGpsData()) {
						mapLinkIcon =
							"<a id='media-map-link-" + iMedia + "'>" +
								"<img " +
									"class='thumbnail-map-link' " +
									"title='" + util.escapeSingleQuotes(util._t("#show-on-map")) + "' " +
									"alt='" + util.escapeSingleQuotes(util._t("#show-on-map")) + "' " +
									"height='20px' " +
									"src='img/ic_place_white_24dp_2x.png'" +
								">" +
							"</a>";
					}
					selectSrc = 'img/checkbox-unchecked-48px.png';
					titleSelector = "#select-single-media";
					if (ithMedia.isSelected()) {
						selectSrc = 'img/checkbox-checked-48px.png';
						titleSelector = "#unselect-single-media";
					}
					selectBoxHtml =
						"<a id='media-select-box-" + iMedia + "'>" +
							"<img " +
								"class='select-box' " +
								"title='" + util.escapeSingleQuotes(util._t(titleSelector)) + "' " +
								"alt='" + util.escapeSingleQuotes(util._t("#selector")) + "' " +
								"src='" + selectSrc + "'" +
							">" +
						"</a>";

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
					img.attr("title", imgTitle).attr("alt", util.trimExtension(ithMedia.nameForShowing(env.currentAlbum)));

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
								selectBoxHtml +
								"<span class='helper'></span>" +
								img.prop("outerHTML") +
							"</div>" +
							"<div class='media-caption'>";
					// if (ithMedia.metadata.hasOwnProperty("title") && ithMedia.metadata.title !== ithMedia.name) {
					imageString +=
								"<span title='" + util.escapeSingleQuotes(ithMedia.nameForShowing(env.currentAlbum)) + "' class='media-name'>" +
									"<span>" +
										ithMedia.nameForShowing(env.currentAlbum, true, true).replace(/ /g, "</span> <span style='white-space: nowrap;'>") +
									"</span>" +
								"</span>";
					// } else {
					// 	imageString +=
					// 			"<span class='media-name'>" +
					// 				"<span>" +
					// 					ithMedia.name.replace(/ /g, "</span> <span style='white-space: nowrap;'>") +
					// 				"</span>" +
					// 			"</span>";
					// }
					if (ithMedia.metadata.hasOwnProperty("description")) {
						imageString +=
								"<div class='media-description'>" +
									"<div class='description ellipsis'>" + util.stripHtmlAndReplaceEntities(ithMedia.metadata.description) + "</div>" +
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
					imageElement = $(imageString);

					imageElement.get(0).media = ithMedia;
					if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
						mediaHash = phFl.encodeHash(env.currentAlbum.cacheBase, ithMedia, foundAlbumHash, savedSearchAlbumHash);
					else
						mediaHash = phFl.encodeHash(env.currentAlbum.cacheBase, ithMedia);

					let imageId = "link-" + ithMedia.foldersCacheBase + "-" + ithMedia.cacheBase;
					imageLink = $("<a href='" + mediaHash + "' id='" + imageId + "'></a>");
					imageLink.append(imageElement);

					media.push(imageLink);

					(function(theLink, theImage) {
						theImage.on("error", function() {
							console.trace();
							// media.splice(media.indexOf(theLink), 1);
							// theLink.remove();
							// env.currentAlbum.media.splice(env.currentAlbum.media.indexOf(theImage.get(0).media), 1);
						});
					})(imageLink, imageElement);

					thumbsElement.append(imageLink);

					if (ithMedia.metadata.hasOwnProperty("description"))
						$("#" + imageId + " .description").attr("title", Utilities.stripHtmlAndReplaceEntities(ithMedia.metadata.description));

					if (env.currentAlbum.isCollection()) {
						// the folder name must be added the second line
						let cacheBase = ithMedia.foldersCacheBase
						if (env.currentAlbum.isSearch()) {
							let albumHash = phFl.decodeHash(window.location.hash)[0];
							let searchStartCacheBase = albumHash.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
							if (util.isByDateCacheBase(searchStartCacheBase) && ithMedia.hasOwnProperty("dayAlbumCacheBase"))
								cacheBase = ithMedia.dayAlbumCacheBase;
							else if (util.isByGpsCacheBase(searchStartCacheBase) && ithMedia.hasGpsData())
								cacheBase = ithMedia.gpsAlbumCacheBase;
						}
						let parentAlbumPromise = phFl.getAlbum(cacheBase, null, {getMedia: false, getPositions: false});
						parentAlbumPromise.then(
							function(parentAlbum) {
								$("#" + imageId + " .media-name").html(ithMedia.nameForShowing(env.currentAlbum));
							}
						);
					}

					if (ithMedia.hasGpsData()) {
						$("#media-map-link-" + iMedia).off('click').on(
							'click',
							{singleMedia: ithMedia, album: env.currentAlbum, clickedSelector: "#media-map-link-" + iMedia},
							function(ev, from) {
								// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
								env.selectorClickedToOpenTheMap = ev.data.clickedSelector;
								ev.stopPropagation();
								ithMedia.generateMapFromSingleMedia(ev, from);
							}
						);
					}

					if (
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

					$("#media-select-box-" + iMedia).off('click').on(
						'click',
						{media: ithMedia, clickedSelector: "#media-select-box-" + iMedia},
						function(ev) {
							ev.stopPropagation();
							ev.preventDefault();
							ithMedia.toggleSelectedStatus(env.currentAlbum, ev.data.clickedSelector);
							// ev.data.media.toggleSelectedStatus(env.currentAlbum, ev.data.clickedSelector);
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
							{mediaHash: phFl.encodeHash(env.currentAlbum.cacheBase, ithMedia)},
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

			if (env.options.hide_descriptions)
				$("#description-title, #description-text, .media-description, .album-description").addClass("hidden-by-option");

			if (env.options.hide_tags)
				$("#description-tags, .media-tags, .album-tags").addClass("hidden-by-option");

			if (env.currentMedia === null) {
				if (env.fromEscKey && env.firstEscKey) {
					// respect the existing mediaLink (you cannot do it more than once)
					env.firstEscKey = false;
				} else {
					// reset mediaLink
					if (env.currentAlbum.numsMedia.imagesAndVideosTotal())
						env.mediaLink = phFl.encodeHash(env.currentAlbum.cacheBase, env.currentAlbum.media[0], foundAlbumHash, savedSearchAlbumHash);
					else
						env.mediaLink = env.hashBeginning + env.currentAlbum.cacheBase;

					env.firstEscKey = true;
				}

				if (
					populate === true ||
					populate === "refreshSubalbums" ||
					populateMedia === "refreshBoth"
				) {
					// resize down the album buttons if they are too wide
					albumViewWidth =
						$("body").width() -
						parseInt($("#album-view").css("padding-left")) -
						parseInt($("#album-view").css("padding-right")) -
						scrollBarWidth;
					env.captionColor = env.options.albums_slide_style ? env.options.slide_album_caption_color : env.options.album_caption_color;
					env.correctedAlbumThumbSize = env.options.album_thumb_size;
					var correctedAlbumButtonSize = util.albumButtonWidth(env.options.album_thumb_size);
					if (albumViewWidth / (correctedAlbumButtonSize + env.options.spacing) < env.options.min_album_thumbnail) {
						env.correctedAlbumThumbSize = Math.floor(util.thumbnailWidth(albumViewWidth / env.options.min_album_thumbnail - env.options.spacing)) - 1;
						correctedAlbumButtonSize = util.albumButtonWidth(env.correctedAlbumThumbSize);
					}
					env.captionFontSize = Math.round(util.em2px("body", 1) * env.correctedAlbumThumbSize / env.options.album_thumb_size);
					env.captionHeight = parseInt(env.captionFontSize * 1.1) + 1;
					margin = 0;
					if (env.options.albums_slide_style)
						margin = Math.round(env.correctedAlbumThumbSize * env.slideMarginFactor);

					// if (env.currentAlbum.isFolder() && ! env.options.show_album_names_below_thumbs)
					// 	heightfactor = 0;
					// else if (! env.options.show_album_media_count)
					// 	heightfactor = 1.6;
					// else
					// 	heightfactor = 2.8;
					// buttonAndCaptionHeight = correctedAlbumButtonSize + env.captionHeight * heightfactor;
					buttonAndCaptionHeight = correctedAlbumButtonSize + env.captionHeight;

					// insert into DOM
					subalbumsElement = $("#subalbums");
					subalbumsElement.empty();
					subalbumsElement.insertBefore("#message-too-many-images");

					//
					// subalbums loop
					//
					// The promises are needed in order to know when everything has come to its end
					var subalbumsPromises = [];
					var indexCompletedSearchAlbums = 0;
					for (i = 0; i < env.currentAlbum.subalbums.length; i ++) {
						let iSubalbum = i;
						let subalbumPromise = new Promise(
							function(resolve_subalbumPromise) {
								var ithSubalbum = env.currentAlbum.subalbums[iSubalbum];

								let nameHtml = ithSubalbum.nameForShowing(env.currentAlbum);
								if (nameHtml === "")
									nameHtml = "<span class='italic'>(" + util._t("#root-album") + ")</span>";

								let captionId = "album-caption-" + phFl.hashCode(ithSubalbum.cacheBase);
								captionHtml =
									"<div class='album-caption' " +
										"id='" + captionId + "' " +
										"style='" +
											"width: " + env.correctedAlbumThumbSize + "px; " +
											"font-size: " + env.captionFontSize + "px; " +
											"height: " + env.captionHeight + "px; " +
											"color: " + env.captionColor + ";" +
										"'" +
										">";
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
										"<div class='album-tags' " +
											"style='" +
												"font-size: " + Math.round((env.captionFontSize / 1.5)) + "px; " +
												// "height: " + env.captionHeight + "px; " +
												"color: " + env.captionColor + ";" +
											"'" +
										">" +
											"<span class='tags'>" + util._t("#tags") + ": <span class='tag'>" + ithSubalbum.tags.map(tag => util.addTagLink(tag)).join("</span>, <span class='tag'>") + "</span></span>" +
										"</div>";
								}

								captionHtml +=
										"<div class='album-caption-count'>" +
											"(" + ithSubalbum.numsMediaInSubTree.imagesAndVideosTotal() + " " +
											"<span class='title-media'>" + util._t(".title-media") + "</span>" +
											")" +
										"</div>";
									"</div>";

								caption = $(captionHtml);

								selectSrc = 'img/checkbox-unchecked-48px.png';
								titleSelector = "#select-subalbum";
								if (ithSubalbum.isSelected()) {
									selectSrc = 'img/checkbox-checked-48px.png';
									titleSelector = "#unselect-subalbum";
								}
								selectBoxHtml =
									"<a id='subalbum-select-box-" + iSubalbum + "'>" +
										"<img " +
											"class='select-box' " +
											"title='" + util.escapeSingleQuotes(util._t(titleSelector)) + "' " +
											"alt='" + util.escapeSingleQuotes(util._t("#selector")) + "' " +
											"src='" + selectSrc + "' " +
											"style='display: none;'" +
										">" +
									"</a>";

								let folderMapTitleWithoutHtmlTags = env.currentAlbum.folderMapTitle(ithSubalbum, nameHtml).replace(/<[^>]*>?/gm, '');
								let positionHtml =
									"<a id='subalbum-map-link-" + iSubalbum + "' >" +
										"<img " +
											"class='thumbnail-map-link' " +
											"title='" + util.escapeSingleQuotes(folderMapTitleWithoutHtmlTags) + "' " +
											"alt='" + util.escapeSingleQuotes(folderMapTitleWithoutHtmlTags) + "' " +
											"height='15px' " +
											"src='img/ic_place_white_24dp_2x.png' " +
										"/>" +
									"</a>";

								// a dot could be present in a cache base, making $("#" + cacheBase) fail, beware...
								id = phFl.hashCode(ithSubalbum.cacheBase);
								let subfolderHash;
								// TO DO: verify that isMap() is not missing in the following line
								if (env.currentAlbum.isSearch() || env.currentAlbum.isSelection()) {
									subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null, ithSubalbum.cacheBase, env.currentAlbum.cacheBase);
								} else {
									if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
										subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null, foundAlbumHash, savedSearchAlbumHash);
									else
										subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null);
								}

								let aHrefHtml = "<a href='" + subfolderHash + "'></a>";
								let aHrefHtmlContainer = $(aHrefHtml);
								albumButtonAndCaptionHtml =
									"<div id='" + id + "' " +
										"class='album-button-and-caption";
								let marginBottom = env.options.spacing;
								if (env.options.albums_slide_style) {
									albumButtonAndCaptionHtml += " slide";
								} else {
									marginBottom += util.em2px("body", 2);
								}
								albumButtonAndCaptionHtml +=
										"' " +
										"style='" +
											"margin-right: " + env.options.spacing + "px; " +
											"margin-bottom: " + marginBottom + "px; " +
											"height: " + buttonAndCaptionHeight + "px; " +
											"width: " + (correctedAlbumButtonSize - 2 * slideBorder) + "px; ";
								if (env.options.albums_slide_style)
									albumButtonAndCaptionHtml += "background-color:" + env.options.album_button_background_color + ";";
								albumButtonAndCaptionHtml +=
										"'" +
									">" +
									"</div>";
								linkContainer = $(albumButtonAndCaptionHtml);

								imageElement = $(
									"<div " +
										"class='album-button' " +
										"style='" +
											"width:" + env.correctedAlbumThumbSize + "px; " +
											"height:" + env.correctedAlbumThumbSize + "px; " +
											"margin:" + margin + "px;" +
										"'" +
										">" +
										selectBoxHtml +
										positionHtml +
										"<a class='random-media-link' href=''>" +
											"<img " +
												"src='img/link-arrow.png' " +
												"class='album-button-random-media-link'" +
												">" +
										"</a>" +
										"<span class='helper'></span>" +
										"<img src='img/image-placeholder.png' class='thumbnail lazyload-album-" + id + "'>" +
									"</div>"
								);
								linkContainer.append(imageElement);
								linkContainer.append(caption);
								aHrefHtmlContainer.append(linkContainer);

								// subalbumsElement.append(linkContainer);
								subalbumsElement.append(aHrefHtmlContainer);

								if (ithSubalbum.hasOwnProperty("description"))
									$("#" + captionId + " .description").attr("title", Utilities.stripHtmlAndReplaceEntities(ithSubalbum.description));

								if (ithSubalbum.hasOwnProperty("numPositionsInTree") && ithSubalbum.numPositionsInTree) {
									$("#subalbum-map-link-" + iSubalbum).off('click').on(
										'click',
										{ithSubalbum: ithSubalbum},
										function(ev, from) {
											// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
											ev.preventDefault();
											env.selectorClickedToOpenTheMap = "#subalbum-map-link-" + iSubalbum;
											TopFunctions.generateMapFromSubalbum(ev, from);
										}
									);
								}

								if (
									env.selectorClickedToOpenTheMap === "#subalbum-map-link-" + iSubalbum &&
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
									$("#" + id).off("auxclick").on(
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

								$("#subalbum-select-box-" + iSubalbum + " .select-box").show();
								$("#subalbum-select-box-" + iSubalbum).off('click').on(
									'click',
									function(ev) {
										ev.stopPropagation();
										ev.preventDefault();
										env.currentAlbum.toggleSubalbumSelection(iSubalbum, "#subalbum-select-box-" + iSubalbum);
									}
								);

								// if (env.currentAlbum.isCollection()) {
								// 	// the folder name must be added the second line
								// 	let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: false, getPositions: false});
								// 	convertSubalbumPromise.then(
								// 		function(ithSubalbum) {
								// 			env.currentAlbum.subalbums[iSubalbum] = ithSubalbum;
								// 			// ithSubalbum.generateCaptionForCollections();
								// 			let captionId = "album-caption-" + phFl.hashCode(ithSubalbum.cacheBase);
								// 			$("#" + captionId + " .album-name").html(nameHtml);
								// 		}
								// 	);
								// }

								// let ithSubalbum = env.currentAlbum.subalbums[iSubalbum];
								// let id = phFl.hashCode(ithSubalbum.cacheBase);
								pickRandomMediaAndInsertIt(iSubalbum, imageElement, resolve_subalbumPromise);
							}
						);
						subalbumsPromises.push(subalbumPromise);
					}

					// if (env.currentAlbum.isFolder() && ! env.options.show_album_names_below_thumbs || ! env.options.show_album_media_count)
					if (env.currentAlbum.isFolder() && ! env.options.show_album_names_below_thumbs)
						$(".album-name").addClass("hidden-by-option");

					if (! env.options.show_album_media_count)
						$(".album-caption-count").addClass("hidden-by-option");

					if (env.options.hide_descriptions)
						$("#description-title, #description-text, .media-description, .album-description").addClass("hidden-by-option");

					if (env.options.hide_tags)
						$("#description-tags, .media-tags, .album-tags").addClass("hidden-by-option");



					Promise.all(subalbumsPromises).then(
						function allRandomImagesGot() {
							// we can run the function that prepare the stuffs for sharing
							f.socialButtons();
							util.adaptCaptionHeight();

							// When there is both a media and an album, we display the media's description; else it's the album's one
							if (env.currentMedia === null) {
								util.setDescription(env.currentAlbum.title, env.currentAlbum.description, env.currentAlbum.tags);
								util.setDescriptionPosition('album');
							} else {
								util.setDescription(env.currentMedia.metadata.title, env.currentMedia.metadata.description, env.currentMedia.metadata.description);
								util.setDescriptionPosition('media');
							}
						},
						function() {
							console.trace();
						}
					);

					$("#subalbums").show();
					$("#album-view").removeClass("media-view-container").removeAttr("height");

					if (env.options.albums_slide_style)
						$(".album-button").css("background-color", env.options.album_button_background_color);
					else
						$(".album-button").css("border", "none");
				}
			}

			$("#loading").hide();
		}

		if (env.currentMedia === null && ! env.currentAlbum.isAlbumWithOneMedia()) {
			$("#media-view").addClass("hidden");
			$(".thumb-container").removeClass("current-thumb");
			$("#album-view").removeClass("media-view-container").removeAttr("height");
			if (env.currentAlbum.subalbums.length > 0)
				$("#subalbums").show();
			else
				$("#subalbums").hide();
			$("#media-view").removeClass("no-bottom-space");
			$("#album-view").removeClass("no-bottom-space");
			$("#album-view, #album-view #subalbums").removeClass("hidden");

			$("#powered-by").show();

			$("body").off('mousewheel').on('mousewheel', TopFunctions.scrollAlbum);
		} else {
			// env.currentMedia !== null
			$("#media-view").removeClass("hidden");

			if (env.currentAlbum.numsMedia.imagesAndVideosTotal() === 1)
				$("#album-view").addClass("hidden");
			else
				$("#album-view, #album-view #subalbums").removeClass("hidden");
			$("#powered-by").hide();

			$(".media-view-container").off('mousewheel').on('mousewheel', TopFunctions.scrollBottomThumbs);
		}

		f.setOptions();

		env.currentAlbum.bindSortEvents();

		if (! $("#album-view").hasClass("hidden"))
			util.scrollToThumb();
			// setTimeout(util.scrollToThumb, 1);

		if (! $("#album-view").hasClass("media-view-container")) {
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

					TopFunctions.showAlbum("refreshSubalbums");

					var isPopup = $('.leaflet-popup').html() ? true : false;
					var isMap = $('#mapdiv').html() ? true : false;
					if (isMap) {
						// the map must be generated again including the points that only carry protected content
						env.mapRefreshType = "resize";

						if (isPopup) {
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
		}

		if (populateMedia) {
			if (! $("#album-view").hasClass("media-view-container")) {
				$("img.lazyload-media").Lazy(
					{
						// threshold: 2 * env.options.media_thumb_size,
						appendScroll: $(window)
					}
				);
			} else {
				$("#album-view.media-view-container img.lazyload-media").Lazy(
					{
						// threshold: 2 * env.options.media_thumb_size,
						appendScroll: $("#album-view")
					}
				);
			}
		}

		f.updateMenu();
	};

	TopFunctions.goFullscreen = function(e) {
		if (Modernizr.fullscreen) {
			e.preventDefault();
			$("#album-view").addClass('hidden');
			$("#media-view-container").fullScreen({
				callback: function(isFullscreen) {
					$("#loading").hide();
					env.fullScreenStatus = isFullscreen;
					$(".enter-fullscreen").toggle();
					$(".exit-fullscreen").toggle();
					env.currentMedia.show(env.currentAlbum, 'center');
				}
			});
		} else {
			if (! env.fullScreenStatus) {
				$(".title").addClass("hidden-by-fullscreen");
				$("#album-view").addClass('hidden-by-fullscreen');
				$(".enter-fullscreen").toggle();
				$(".exit-fullscreen").toggle();
				env.fullScreenStatus = true;
			} else {
				$(".title").removeClass("hidden-by-fullscreen");
				$("#album-view").removeClass('hidden-by-fullscreen');
				$(".enter-fullscreen").toggle();
				$(".exit-fullscreen").toggle();
				env.fullScreenStatus = false;
			}
			env.currentMedia.show(env.currentAlbum, 'center');
		}
	};

	TopFunctions.goFullscreenFromMouse = function(ev) {
		if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			TopFunctions.goFullscreen(ev);
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
		if (env.currentAlbum.positionsAndMediaInAlbum.length)
			env.currentAlbum.positionsAndMediaInAlbum.generateMap(ev, from);
	};

	PositionsAndMedia.prototype.generateMap = function(ev, from) {
		// this is an array of uniq points with a list of the media geolocated there

		function playClickElement(clickHistory, iClick) {
			var clickHistoryElement = clickHistory[iClick];
			var promise = new Promise(
				function(resolve_playClickElement) {
					MapFunctions.mymap.setView(clickHistoryElement.center, clickHistoryElement.zoom, {animate: false});
					ev = {
						latlng: clickHistoryElement.latlng,
						originalEvent: {
							shiftKey: clickHistoryElement.shiftKey,
							ctrlKey: clickHistoryElement.ctrlKey,
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
		// end of auxiliary function

		var i;
		MapFunctions.titleWrapper1 =
			'<div id="popup-photo-count" style="max-width: ' + MapFunctions.maxWidthForPopupContent + 'px;">' +
				'<span id="popup-photo-count-number"></span> ' + util._t("#images") +
			'</div>' +
			'<div id="popup-images-wrapper">';
		MapFunctions.titleWrapper2 = '</div>';

		$("#my-modal.modal").css("display", "block");
		if (env.isMobile.any()) {
			$("#my-modal .modal-content").css("width", (env.windowWidth - 12).toString() + "px").css("height", (env.windowHeight - 12).toString() + "px").css("padding", "5px");
			$("#my-modal.modal").css("top", "0").css("padding-top", "0");
			$("#my-modal.modal-close").css("top", "22px").css("right", "22px");
		} else {
			$("#my-modal .modal-content").css("width", (env.windowWidth - 55).toString() + "px").css("height", (env.windowHeight - 60).toString() + "px");
		}

		if(this) {
			// maximum OSM zoom is 19
			const maxOSMZoom = 19;
			// calculate the center
			var center = MapFunctions.averagePosition(this);

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
				MapFunctions.mymap.remove();

			MapFunctions.mymap = L.map('mapdiv', {'closePopupOnClick': false}).setView([center.lat, center.lng], zoom);
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
			).addTo(MapFunctions.mymap);
			L.control.scale().addTo(MapFunctions.mymap);

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
				pruneCluster.RegisterMarker(markers[iPoint]);
				markers[iPoint].data.tooltip = cacheBases;
				markers[iPoint].data.mediaList = this[iPoint].mediaList;
				markers[iPoint].weight = this[iPoint].mediaList.length;
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
				if (env.popupRefreshType === "previousAlbum")
					TopFunctions.prepareAndDoPopupUpdate();
				else if (env.popupRefreshType === "mapAlbum") {
					var clickHistory = env.mapAlbum.clickHistory;
					env.mapAlbum = new Album();
					// env.mapAlbum = {};
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
		.setLatLng(MapFunctions.averagePosition(env.mapAlbum.positionsAndMediaInTree))
		.openOn(MapFunctions.mymap);

		map.addPopupMover();

		var promise = phFl.endPreparingAlbumAndKeepOn(env.mapAlbum, null, null);
		promise.then(
			function() {
				map.updatePopup(MapFunctions.titleWrapper1 + env.mapAlbum.generateHtmlForImages() + MapFunctions.titleWrapper2);
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
												var match = (media.cacheBase === mediaListElement.cacheBase && media.foldersCacheBase === mediaListElement.foldersCacheBase);
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
						// rootMapAlbum.numPositionsInTree += env.mapAlbum.numPositionsInTree;
						// rootMapAlbum.numsProtectedMediaInSubTree[","].sum(env.mapAlbum.numsProtectedMediaInSubTree[","]);

						env.mapAlbum.bindSortEvents();
					}
					resolve_updateMapAlbumOnMapClick();
				}
			}
		);
	};

	TopFunctions.prototype.goFullscreen = TopFunctions.goFullscreen;
	TopFunctions.prototype.showBrowsingModeMessage = TopFunctions.showBrowsingModeMessage;
	TopFunctions.prototype.prepareAndDoPopupUpdate = TopFunctions.prepareAndDoPopupUpdate;
	// TopFunctions.prototype.goUpIfProtected = TopFunctions.goUpIfProtected;

	window.TopFunctions = TopFunctions;
}());
