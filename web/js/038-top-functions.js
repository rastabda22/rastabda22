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
				function searchCacheBaseIsCurrentAlbumOnly(collectionCacheBase) {
					if (collectionCacheBase)
						return collectionCacheBase.split(env.options.cache_folder_separator)[1].split(env.options.search_options_separator).slice(0, -1).indexOf('o') > -1;
					else
						return false;
				}

				function getSearchFolderCacheBase(collectionCacheBase) {
					if (collectionCacheBase)
						return collectionCacheBase.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
					else
						return false;
				}

				var title, titleCount = {}, documentTitle, i, isFolderTitle, isDateTitle, isGpsTitle, isSearchTitle, isInsideCollectionTitle, isSearchCurrentAlbumOnly, isSelectionTitle, isMapTitle;
				var titleAnchorClasses, searchFolderCacheBase, searchCacheBase;
				var linkCount = 0, linksToLeave = 1;
				const raquo = "&raquo;";
				const raquoForTitle = " \u00ab ";
				// gpsLevelNumber is the number of levels for the by gps tree
				// current levels are country, region, place => 3
				var gpsLevelNumber = 3;
				var gpsName = '';
				var setDocumentTitle = (id === "center" || id === "album");
				var titleComponents = [];
				var cacheBasesForTitleComponents = [];
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

				var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);

				isFolderTitle = (env.currentAlbum.ancestorsCacheBase[0] === env.options.folders_string);
				isDateTitle = (env.currentAlbum.ancestorsCacheBase[0] === env.options.by_date_string);
				isGpsTitle = (env.currentAlbum.ancestorsCacheBase[0] === env.options.by_gps_string);
				isSearchTitle = (env.currentAlbum.ancestorsCacheBase[0] === env.options.by_search_string);
				isSelectionTitle = (env.currentAlbum.ancestorsCacheBase[0] === env.options.by_selection_string);
				isMapTitle = (env.currentAlbum.ancestorsCacheBase[0] === env.options.by_map_string);
				isInsideCollectionTitle = false;
				isSearchCurrentAlbumOnly = false;
				if (isFolderTitle && collectionCacheBase) {
					isInsideCollectionTitle = true;
					searchCacheBase = collectionCacheBase;
					if (util.isSearchCacheBase(searchCacheBase) && searchCacheBaseIsCurrentAlbumOnly(searchCacheBase)) {
						isSearchCurrentAlbumOnly = true;
						searchFolderCacheBase = getSearchFolderCacheBase(searchCacheBase);
					}
				} else if (isSearchTitle) {
					searchCacheBase = albumCacheBase;
					if (searchCacheBaseIsCurrentAlbumOnly(searchCacheBase)) {
						isSearchCurrentAlbumOnly = true;
						searchFolderCacheBase = getSearchFolderCacheBase(searchCacheBase);
					}
				}
				isSearchCurrentAlbumOnly = (isSearchCurrentAlbumOnly && searchFolderCacheBase !== util.isAnyRootCacheBase(searchFolderCacheBase));

				titleAnchorClasses = 'title-anchor';
				// if (env.isMobile.any())
				// 	titleAnchorClasses += ' mobile';

				var mediaTotalInAlbum, imagesTotalInAlbum, videosTotalInAlbum;
				var mediaTotalInSubTree, imagesTotalInSubTree, videosTotalInSubTree;
				var mediaTotalInSubAlbums, imagesTotalInSubAlbums, videosTotalInSubAlbums;
				var numSubalbums = {
					gps: env.currentAlbum.subalbums.length,
					nonGps: env.currentAlbum.subalbums.filter(
						ithAlbum =>
							ithAlbum.numsMediaInSubTree.imagesAndVideosTotal() &&
							ithAlbum.numsMediaInSubTree.imagesAndVideosTotal() === ithAlbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal()
					).length
				};
				if (singleMedia === null) {
					mediaTotalInAlbum = {
						gps: env.currentAlbum.numsMedia.imagesAndVideosTotal(),
						nonGps: env.currentAlbum.media.filter(ithMedia => ! ithMedia.hasGpsData()).length
					};
					imagesTotalInAlbum = {
						gps: env.currentAlbum.numsMedia.images,
						nonGps: env.currentAlbum.media.filter(ithMedia => ithMedia.isImage() && ! ithMedia.hasGpsData()).length
					};
					videosTotalInAlbum = {
						gps: env.currentAlbum.numsMedia.videos,
						nonGps: env.currentAlbum.media.filter(ithMedia => ithMedia.isVideo() && ! ithMedia.hasGpsData()).length
					};
					mediaTotalInSubTree = {
						gps: env.currentAlbum.numsMediaInSubTree.imagesAndVideosTotal(),
						nonGps: env.currentAlbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal()
					};
					imagesTotalInSubTree = {
						gps: env.currentAlbum.numsMediaInSubTree.images,
						nonGps: env.currentAlbum.nonGeotagged.numsMediaInSubTree.images
					};
					videosTotalInSubTree = {
						gps: env.currentAlbum.numsMediaInSubTree.videos,
						nonGps: env.currentAlbum.nonGeotagged.numsMediaInSubTree.videos
					};
					mediaTotalInSubAlbums = {
						gps: mediaTotalInSubTree.gps - mediaTotalInAlbum.gps,
						nonGps: mediaTotalInSubTree.nonGps - mediaTotalInAlbum.nonGps
					};
					imagesTotalInSubAlbums = {
						gps: imagesTotalInSubTree.gps - imagesTotalInAlbum.gps,
						nonGps: imagesTotalInSubTree.nonGps - imagesTotalInAlbum.nonGps
					};
					videosTotalInSubAlbums = {
						gps: videosTotalInSubTree.gps - videosTotalInAlbum.gps,
						nonGps: videosTotalInSubTree.nonGps - videosTotalInAlbum.nonGps
					};
				}

				// the first component of the title is always the root album
				if (env.options.page_title !== "")
					titleComponents[0] = env.options.page_title;
				else
					titleComponents[0] = util._t(".title-string");
				cacheBasesForTitleComponents[0] = env.options.folders_string;
				classesForTitleComponents[0] = [""];

				let promises = [];

				if (isSearchTitle || isInsideCollectionTitle) {
					if (isSearchCurrentAlbumOnly) {
						// put the components of the album searched in
						let splittedCacheBaseSearchedIn = searchFolderCacheBase.split(env.options.cache_folder_separator);
						let cacheBasesToAdd = splittedCacheBaseSearchedIn.map((x, i) => splittedCacheBaseSearchedIn.slice(0, i + 1).join(env.options.cache_folder_separator));
						if (splittedCacheBaseSearchedIn[0] === env.options.folders_string) {
							splittedCacheBaseSearchedIn.shift();
							cacheBasesToAdd.shift();
						}
						let classesToAdd = splittedCacheBaseSearchedIn.map((x, i) => ["pre-cache-base-" + id + "-" + i]);

						// substitute each album cache base with the right name
						cacheBasesToAdd.forEach(
							function(cacheBase, i) {
								let ithPromise = new Promise(
									function(resolve_ithPromise) {
										let cacheBasePromise = phFl.getAlbum(cacheBase, null, {getMedia: false, getPositions: false});
										cacheBasePromise.then(
											function(theAlbum) {
												titleComponents[1 + i] = theAlbum.nameForShowing();
												resolve_ithPromise();
											}
										);
									}
								);
								promises.push(ithPromise);
							}
						);

						titleComponents = titleComponents.concat(splittedCacheBaseSearchedIn);
						cacheBasesForTitleComponents = cacheBasesForTitleComponents.concat(cacheBasesToAdd);
						classesForTitleComponents = classesForTitleComponents.concat(classesToAdd);
					}

					// put the search cacheBase
					if (searchCacheBase) {
						cacheBasesForTitleComponents.push(searchCacheBase);
						classesForTitleComponents.push(["search-link"]);
						if (util.isSearchCacheBase(searchCacheBase)) {
							titleComponents.push("(" + util._t("#by-search") + ")");
						} else if (util.isSelectionCacheBase(searchCacheBase)) {
							titleComponents.push("(" + util._t("#by-selection") + ")");
						}
					}

					if (isInsideCollectionTitle) {
						// put the components of the found album and (if any) its subalbums
						let splittedAlbumCacheBase = albumCacheBase.split(env.options.cache_folder_separator);
						let splittedFoundAlbumCacheBase, cacheBasesForSplittedAlbumCacheBase;
						if (isSearchCurrentAlbumOnly) {
							splittedFoundAlbumCacheBase = foundAlbumCacheBase.split(env.options.cache_folder_separator);
							cacheBasesForSplittedAlbumCacheBase = splittedAlbumCacheBase.map((x, i) => splittedAlbumCacheBase.slice(0, i + 1).join(env.options.cache_folder_separator)).slice(splittedFoundAlbumCacheBase.length - 1);
						} else {
							cacheBasesForSplittedAlbumCacheBase = splittedAlbumCacheBase.map((x, i) => splittedAlbumCacheBase.slice(0, i + 1).join(env.options.cache_folder_separator)).slice(1);
						}

						let cacheBasesToAdd = cacheBasesForSplittedAlbumCacheBase.slice();
						let classesToAdd = cacheBasesForSplittedAlbumCacheBase.map((x, i) => ["post-cache-base-" + id + "-" + i]);

						let titleComponentsLenghtBeforeConcatenating = titleComponents.length;

						titleComponents = titleComponents.concat(cacheBasesForSplittedAlbumCacheBase);
						cacheBasesForTitleComponents = cacheBasesForTitleComponents.concat(cacheBasesToAdd);
						classesForTitleComponents = classesForTitleComponents.concat(classesToAdd);
						cacheBasesToAdd.forEach(
							function(cacheBase, i) {
								let ithPromise = new Promise(
									function(resolve_ithPromise) {
										let cacheBasePromise = phFl.getAlbum(cacheBase, null, {getMedia: false, getPositions: false});
										cacheBasePromise.then(
											function(theAlbum) {
												theAlbum.generateCaptionsForSearch();
												let name = theAlbum.nameForShowing();
												let [fakeName, subalbumPosition] = theAlbum.captionsForSearch;
												if (i === 0) {
													name =
														"<span class='with-second-part'>" +
															"<span id='album-name-first-part'>" + name + "</span> " +
															"<span id='album-name-second-part'>" + subalbumPosition + "</span>" +
														"</span> ";
												}
												titleComponents[titleComponentsLenghtBeforeConcatenating + i] = name;
												resolve_ithPromise();
											}
										);
									}
								);
								promises.push(ithPromise);
							}
						);
					}

					// the counts for inside a search are generated further
					for (const mode in numSubalbums) {
						if (
							isSearchTitle &&
							singleMedia === null &&
							(mediaTotalInAlbum[mode] || numSubalbums[mode])
						) {
							titleCount[mode] = "<span class='title-count'>(" + util._t(".title-found") + " ";
							if (numSubalbums[mode]) {
								titleCount[mode] += numSubalbums[mode] + " " + util._t(".title-albums");
							}

							if (mediaTotalInAlbum[mode] && numSubalbums[mode])
								titleCount[mode] += " " + util._t(".title-and") + " ";

							if (mediaTotalInAlbum[mode]) {
								titleCount[mode] += mediaTotalInAlbum[mode] + " ";
								if (! imagesTotalInAlbum[mode] && videosTotalInAlbum[mode])
									titleCount[mode] += util._t(".title-videos");
								else if (imagesTotalInAlbum[mode] && ! videosTotalInAlbum[mode])
									titleCount[mode] += util._t(".title-images");
								else
									titleCount[mode] += util._t(".title-media");
							}

							if (env.currentAlbum.hasOwnProperty("removedStopWords") && env.currentAlbum.removedStopWords.length) {
								// say that some search word hasn't been used
								titleCount[mode] += " - " + env.currentAlbum.removedStopWords.length + " " + util._t("#removed-stopwords") + ": ";
								for (i = 0; i < env.currentAlbum.removedStopWords.length; i ++) {
									if (i)
										titleCount[mode] += ", ";
									titleCount[mode] += env.currentAlbum.removedStopWords[i];
								}
							}

							titleCount[mode] += ")</span>";
						}
					}
				} else {
					let titleComponentsToAdd;
					if (env.currentAlbum.hasOwnProperty("ancestorsTitles") && env.currentAlbum.hasOwnProperty("ancestorsNames")) {
						titleComponentsToAdd = env.currentAlbum.ancestorsNames.map(
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
						titleComponentsToAdd = env.currentAlbum.ancestorsNames.slice();
					} else {
						titleComponentsToAdd = env.currentAlbum.path.split("/");
					}

					let cacheBasesToAdd = env.currentAlbum.ancestorsCacheBase.slice();
					let classesToAdd = env.currentAlbum.ancestorsCacheBase.map(x => [""]);

					if (cacheBasesToAdd[0] === env.options.folders_string) {
						titleComponentsToAdd = titleComponentsToAdd.slice(1);
						cacheBasesToAdd = cacheBasesToAdd.slice(1);
						classesToAdd = classesToAdd.slice(1);
					}

					titleComponents = titleComponents.concat(titleComponentsToAdd);
					cacheBasesForTitleComponents = cacheBasesForTitleComponents.concat(cacheBasesToAdd);
					classesForTitleComponents = classesForTitleComponents.concat(classesToAdd);

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

						if (singleMedia === null) {
							for (const mode in numSubalbums) {
								titleCount[mode] = "<span class='title-count'>(";
								if (titleComponents.length === 2)
									titleCount[mode] += mediaTotalInSubAlbums[mode] + " ";
								else
									titleCount[mode] += mediaTotalInAlbum[mode] + " ";
								if (! imagesTotalInAlbum[mode] && videosTotalInAlbum[mode])
									titleCount[mode] += util._t(".title-videos");
								else if (imagesTotalInAlbum[mode] && ! videosTotalInAlbum[mode])
									titleCount[mode] += util._t(".title-images");
								else {
									let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
									let titleCountObject = $(titleCountHtml);
									if (titleComponents.length === 2)
										titleCountObject.attr("title", imagesTotalInSubAlbums[mode] + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums[mode] + " " + util._t(".title-videos"));
									else
										titleCountObject.attr("title", imagesTotalInAlbum[mode] + " " + util._t(".title-images") + ", " + videosTotalInAlbum[mode] + " " + util._t(".title-videos"));
									titleCount[mode] += titleCountObject.wrapAll('<div>').parent().html();
								}
								if (titleComponents.length >= 5)
									titleCount[mode] += " " + util._t(".title-in-day-album");
								else if (titleComponents.length >= 3)
									titleCount[mode] += " " + util._t(".title-in-date-album");
								titleCount[mode] += ")</span>";
							}
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

							let aObject = $("<a></a>");
							aObject.attr("title", util._t("#place-icon-title") + gpsName + util._t("#place-icon-title-end"));
							titlesForTitleComponents[i] = aObject.attr("title");

							titleComponents[i] = gpsName;
						}

						if (singleMedia === null) {
							for (const mode in numSubalbums) {
								titleCount[mode] = "<span class='title-count'>(";
								if (titleComponents.length === 2)
									titleCount[mode] += mediaTotalInSubAlbums[mode] + " ";
								else
									titleCount[mode] += mediaTotalInAlbum[mode] + " ";
								if (! imagesTotalInAlbum[mode] && videosTotalInAlbum[mode])
									titleCount[mode] += util._t(".title-videos");
								else if (imagesTotalInAlbum[mode] && ! videosTotalInAlbum[mode])
									titleCount[mode] += util._t(".title-images");
								else {
									let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
									let titleCountObject = $(titleCountHtml);
									if (titleComponents.length === 2)
										titleCountObject.attr("title", imagesTotalInSubAlbums[mode] + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums[mode] + " " + util._t(".title-videos"));
									else
										titleCountObject.attr("title", imagesTotalInAlbum[mode] + " " + util._t(".title-images") + ", " + videosTotalInAlbum[mode] + " " + util._t(".title-videos"));
									titleCount[mode] += titleCountObject.wrapAll('<div>').parent().html();
								}
								if (titleComponents.length >= gpsLevelNumber + 2)
									titleCount[mode] += " " + util._t(".title-in-gps-album");
								else if (titleComponents.length >= 3)
									titleCount[mode] += " " + util._t(".title-in-gpss-album");
								titleCount[mode] += ")</span>";
							}
						}
					} else if (isSelectionTitle) {
						titleComponents.pop();
						cacheBasesForTitleComponents.pop();

						titleComponents[1] = "(" + util._t("#by-selection") + ")";

						for (const mode in numSubalbums) {
							if (
								singleMedia === null &&
								(mediaTotalInAlbum[mode] || numSubalbums[mode])
							) {
								titleCount[mode] = "<span class='title-count'>(";
								if (numSubalbums[mode]) {
									titleCount[mode] += numSubalbums[mode];
									titleCount[mode] += " " + util._t(".title-albums");
								}

								if (mediaTotalInAlbum[mode] && numSubalbums[mode])
									titleCount[mode] += " " + util._t(".title-and") + " ";

								if (mediaTotalInAlbum[mode]) {
									titleCount[mode] += mediaTotalInAlbum[mode] + " ";
									if (! imagesTotalInAlbum[mode] && videosTotalInAlbum[mode])
										titleCount[mode] += util._t(".title-videos");
									else if (imagesTotalInAlbum[mode] && ! videosTotalInAlbum[mode])
										titleCount[mode] += util._t(".title-images");
									else
										titleCount[mode] += util._t(".title-media");
								}

								titleCount[mode] += ")</span>";
							}
						}
					} else if (isMapTitle) {
						titleComponents.pop();
						cacheBasesForTitleComponents.pop();

						titleComponents[1] = "(" + util._t("#by-map") + ")";

						for (const mode in numSubalbums) {
							if (
								titleComponents.length > 2 &&
								singleMedia === null &&
								mediaTotalInAlbum[mode]
							) {
								titleCount[mode] = "<span class='title-count'>(";
								titleCount[mode] += mediaTotalInAlbum[mode] + " ";
								if (! imagesTotalInAlbum[mode] && videosTotalInAlbum[mode])
									titleCount[mode] += util._t(".title-videos");
								else if (imagesTotalInAlbum[mode] && ! videosTotalInAlbum[mode])
									titleCount[mode] += util._t(".title-images");
								else
									titleCount[mode] += util._t(".title-media");
								titleCount[mode] += ")</span>";
							}
						}
					} else {
						// folders title

						// counts are added further
						// nothing to do
					}
				}

				if (isInsideCollectionTitle || isFolderTitle) {
					for (const mode in numSubalbums) {
						if (singleMedia === null) {
							titleCount[mode] = "<span class='title-count'>(";
							if (numSubalbums[mode]) {
								titleCount[mode] += numSubalbums[mode] + " " + util._t(".title-albums");
							}

							if ((mediaTotalInAlbum[mode] || mediaTotalInSubAlbums) && numSubalbums[mode])
								titleCount[mode] += ", ";

							if (mediaTotalInAlbum[mode]) {
								titleCount[mode] += mediaTotalInAlbum[mode] + " ";
								if (! imagesTotalInAlbum[mode] && videosTotalInAlbum[mode]) {
									titleCount[mode] += util._t(".title-videos") + " ";
								} else if (imagesTotalInAlbum[mode] && ! videosTotalInAlbum[mode]) {
									titleCount[mode] += util._t(".title-images") + " ";
								} else {

									let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
									let titleCountObject = $(titleCountHtml);
									if (titleComponents.length === 2)
										titleCountObject.attr("title", imagesTotalInSubAlbums[mode] + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums[mode] + " " + util._t(".title-videos"));
									else
										titleCountObject.attr("title", imagesTotalInAlbum[mode] + " " + util._t(".title-images") + ", " + videosTotalInAlbum[mode] + " " + util._t(".title-videos"));
									titleCount[mode] += titleCountObject.wrapAll('<div>').parent().html() + " ";
								}
								titleCount[mode] += util._t(".title-in-album");
								if (mediaTotalInSubAlbums)
									titleCount[mode] += ", ";
							}
							if (mediaTotalInSubAlbums) {
								titleCount[mode] += mediaTotalInSubAlbums[mode] + " ";
								if (! imagesTotalInSubAlbums[mode] && videosTotalInSubAlbums[mode])
									titleCount[mode] += util._t(".title-videos");
								else if (imagesTotalInSubAlbums[mode] && ! videosTotalInSubAlbums[mode])
									titleCount[mode] += util._t(".title-images");
								else {
									let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
									let titleCountObject = $(titleCountHtml);
									titleCountObject.attr("title", imagesTotalInSubAlbums[mode] + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums[mode] + " " + util._t(".title-videos"));
									titleCount[mode] += titleCountObject.wrapAll('<div>').parent().html();
								}
								titleCount[mode] += " " + util._t(".title-in-subalbums");
							}
							if (mediaTotalInAlbum[mode] && mediaTotalInSubAlbums[mode]) {
								titleCount[mode] += ", ";

								let spanTitle = imagesTotalInSubTree[mode] + " " + util._t(".title-images") + ", " + videosTotalInSubTree[mode] + " " + util._t(".title-videos");
								let titleSpanHtml = "<span class='title-count-detail'>" + util._t(".title-total") + " " + mediaTotalInSubTree[mode] + " " + util._t(".title-media") + "</span>";
								let titleSpanObject = $(titleSpanHtml);
								titleSpanObject.attr("title", spanTitle);

								titleCount[mode] += titleSpanObject.wrapAll('<div>').parent().html() + " ";
							}
							titleCount[mode] += ")</span>";
						}
					}
				}

				// if (addSearchMarker) {
				// 	let numElements = searchFolderCacheBase.split(env.options.cache_folder_separator).length;
				// 	titleComponents.splice(numElements, 0, " (" + util._t("#by-search") + ")");
				// 	cacheBasesForTitleComponents.splice(numElements, 0, env.options.by_search_string);
				// }

				promises.push(env.currentAlbum.generatePositionsAndMediaInMediaAndSubalbums());
				// let promise = env.currentAlbum.generatePositionsAndMediaInMediaAndSubalbums();

				Promise.all(promises).then(
					function() {
						let documentTitleComponents = titleComponents.map(component => util.stripHtmlAndReplaceEntities(component));
						if (singleMedia !== null) {
							let singleMediaNameHtml;
							let [singleMediaName, singleMediaTitle] = singleMedia.nameAndTitleForShowing(env.currentAlbum, true);
							if (isSearchTitle || isSelectionTitle || isMapTitle) {
								let name, mediaNamePosition;
								if (isSearchTitle)
									[name, mediaNamePosition] = singleMedia.captionsForSearch;
								else if (isSelectionTitle)
									[name, mediaNamePosition] = singleMedia.captionsForSelection;
								else if (isMapTitle)
									[name, mediaNamePosition] = singleMedia.captionsForPopup;
								if (! mediaNamePosition && singleMedia.titleForShowing) {
									mediaNamePosition = singleMedia.titleForShowing;
									singleMediaNameHtml =
										"<span class='media-name with-second-part'>" +
										"<span id='media-name-first-part'>" + name + "</span> " +
										"<span id='media-name-second-part'>(" + mediaNamePosition + ")</span>" +
										"</span> ";
								} else {
									singleMediaNameHtml = "<span class='media-name'>" + name + "</span>";
								}
							} else if (singleMediaTitle) {
								singleMediaNameHtml =
									"<span class='media-name with-second-part'>" +
									"<span id='media-name-first-part'>" + singleMediaName + "</span> " +
									"<span id='media-name-second-part'>(" + singleMediaTitle + ")</span>" +
									"</span> ";
							} else {
								singleMediaNameHtml = "<span class='media-name'>" + singleMediaName + "</span>";
							}

							if (singleMedia.hasGpsData()) {
								let imgHtml = "<img class='title-img gps' height='20px' src='img/ic_place_white_24dp_2x.png'>";
								let imgObject = $(imgHtml);
								let imgTitle = util._t("#show-on-map");
								if (! env.isMobile.any())
									imgTitle += " [" + util._t(".map-link-shortcut") + "]";
								imgObject.attr("title", imgTitle);
								imgObject.attr("alt", imgTitle);
								singleMediaNameHtml += "<a class='map-popup-trigger'>" + imgObject.wrapAll('<div>').parent().html() + "</a>";
							}
							titleComponents.push(singleMediaNameHtml);
							classesForTitleComponents.push([""]);
							titlesForTitleComponents.push([singleMediaTitle]);
							documentTitleComponents.push(util.stripHtmlAndReplaceEntities(singleMediaName));
						}

						title = titleComponents.map(
							(component, i) => {
								let titleElement;
								let aTagBegin = "";
								let aTagEnd = "";
								if (cacheBasesForTitleComponents[i] !== undefined && cacheBasesForTitleComponents[i] !== "") {
									aTagBegin = "<a class='" + titleAnchorClasses + "' href='" + env.hashBeginning + encodeURI(cacheBasesForTitleComponents[i]) + "'>";
									aTagEnd = "</a>";
								}
								let aObject;
								if (component.indexOf("<a href=") !== -1) {
									let firstClosingAngularBracketPosition = component.indexOf(">");
									let secondOpeningAngularBracketPosition = component.indexOf(" <", 2);
									aObject = $(
										component.substring(0, firstClosingAngularBracketPosition + 1) + // <span class='with-second-part'>
										aTagBegin +
										component.substring(firstClosingAngularBracketPosition + 1, secondOpeningAngularBracketPosition) + // the album name
										aTagEnd +
										component.substring(secondOpeningAngularBracketPosition)
									);
								} else {
									aObject = $(aTagBegin + component + aTagEnd);
								}
								if (classesForTitleComponents[i] !== "")
									classesForTitleComponents[i].forEach(singleClass => aObject.addClass(singleClass));
								if (titlesForTitleComponents[i] !== "")
									aObject.attr("title", titlesForTitleComponents[i]);
								titleElement = aObject.wrapAll('<div>').parent().html();
								// } else {
								// 	titleElement = "<span class='title-no-anchor'>" + component + "</span>";
								// }
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
									"class='title-img gps' " +
									"height='20px' " +
									"src='" + imgSrc1 + "'" +
								">";
							let imgObject = $(imgHtml);
							imgObject.attr("alt", imgAlt);

							if (showSingleMarker) {
								if (! env.isMobile.any() && ! showDoubleMarker)
									imgTitle1 += " [" + util._t(".map-link-shortcut") + "]";
								imgObject.attr("title", imgTitle1);
								imgObject.attr("src", imgSrc1);
								markers += "<a class='map-popup-trigger'>" + imgObject.wrapAll('<div>').parent().html() + "</a>";
							}
							if (showDoubleMarker) {
								if (! env.isMobile.any())
									imgTitle2 += " [" + util._t(".map-link-shortcut") + "]";
								imgObject.attr("title", imgTitle2);
								imgObject.attr("src", imgSrc2);
								markers += "<a class='map-popup-trigger-double'>" + imgObject.wrapAll('<div>').parent().html() + "</a>";
							}

							title += markers;
						}

						if (env.currentMedia === null) {
							title += "<span class='hidden-geotagged-media'>[" + util._t(".hidden-geotagged-media") + "]</span> ";
						}

						// leave only the last link on mobile
						// separate on "&raquo;""
						let titleArray = title.split(raquo);
						for (i = titleArray.length - 1; i >= 0; i --) {
							if (titleArray[i].indexOf(" href=") !== -1) {
								linkCount ++;
								if (linkCount > linksToLeave) {
									title =
										"<span class='dots-surroundings'><span class='title-no-anchor dots'>...</span></span>" +
										"<span class='hidden-title'>" + titleArray.slice(0, i + 1).join(raquo) + "</span>" + raquo + titleArray.slice(i + 1).join(raquo);
									break;
								}
							}
						}

						title = "<span class='title-main'>" + title + "</span>";

						if (Object.keys(titleCount).length > 0) {
							for (const mode in titleCount) {
								let modeClass = mode;
								if (mode === "nonGps")
									modeClass = "non-gps";
								title += "<span class='" + modeClass + "'>" + titleCount[mode] + "</span>";
							}
						}

						if (id === "album")
							$("#album-view .title-string").html(title);
						else
							$(".media-box#" + id + " .title-string").html(title);

						$(".hidden-geotagged-media").attr("title", util._t("#hide-geotagged-media"));

						if (id == "center" || id == "album") {
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
											let scalePromise = ev.data.singleMedia.scale(event);
											scalePromise.then(
												function() {
													if (ev.data.singleMedia.isImage()) {
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

						if (setDocumentTitle) {
							document.title = documentTitle;
						}
						TopFunctions.trackPiwik(id);

						util.setTitleOptions();

						// activate the map popup trigger in the title
						$(".map-popup-trigger").off("click").on(
							"click",
							function(ev, from) {
								// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
								env.selectorClickedToOpenTheMap = ".map-popup-trigger";
								if (env.currentMedia !== null && env.currentMedia.hasGpsData()) {
									TopFunctions.generateMapFromTitle(ev, from);
								} else {
									TopFunctions.generateMapFromTitleWithoutSubalbums(ev, from);
								}
								// focus the map, so that the arrows and +/- work
								$("#mapdiv").focus();
							}
						);

						$(".map-popup-trigger-double").off("click").on(
							"click",
							function(ev, from) {
								// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
								env.selectorClickedToOpenTheMap = ".map-popup-trigger-double";
								TopFunctions.generateMapFromTitle(ev, from);
								// focus the map, so that the arrows and +/- work
								$("#mapdiv").focus();
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
						// if (toBeResolved)

						if (env.currentMedia === null) {
							util.addClickToHiddenGeotaggedMediaPhrase();
						}

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

	TopFunctions.showBrowsingModeMessage = function(ev, selector) {
		$(".browsing-mode-message").stop().hide().css("opacity", "");
		$(selector).show();
		$(selector).fadeOut(
			2500,
			function(){
				util.HideId(selector);
			}
		);
		if (ev.originalEvent !== undefined && ev.originalEvent.x !== 0 && ev.originalEvent.y !== 0)
			env.isABrowsingModeChangeFromMouseClick = true;
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
		if (env.selectingSelectors.indexOf(clickedSelector) !== -1)
			// do not run the function for the same selector while it's already running for it
			return;
		env.selectingSelectors.push(clickedSelector);
		if (env.selectionAlbum.isEmpty())
			util.initializeSelectionAlbum();
		var iSubalbum = this.subalbums.findIndex(subalbum => subalbum.cacheBase === $(clickedSelector).parent().parent().attr("id"));
		var subalbum = this.subalbums[iSubalbum];
		if (subalbum.isSelected()) {
			let removeSubalbumPromise = this.removeSubalbumFromSelection(clickedSelector);
			removeSubalbumPromise.then(
				function subalbumRemoved() {
					env.selectingSelectors = env.selectingSelectors.filter(selector => selector !== clickedSelector);

					if (util.nothingIsSelected()) {
						util.initializeSelectionAlbum();
					}
					f.updateMenu();
				}
			);
		} else {
			let addSubalbumPromise = this.addSubalbumToSelection(iSubalbum, clickedSelector);
			addSubalbumPromise.then(
				function subalbumAdded() {
					env.selectingSelectors = env.selectingSelectors.filter(selector => selector !== clickedSelector);

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
				function() {
					util.resizeSingleMediaWithPrevAndNext(self, album);
				}
			);
			// }
		}
		// end of loadNextPrevMedia auxiliary function

		//////////////////////////////////
		// beginning of SingleMedia show method body
		//////////////////////////////////
		var text, mediaSelector;
		var exposureTime, heightForMedia, heightForMediaAndTitle;
		var previousMediaIndex, nextMediaIndex, whatMedia;

		$("#downloading-media").hide();

		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);

		env.mediaLink = phFl.encodeHash(env.currentAlbum.cacheBase, this, foundAlbumCacheBase, collectionCacheBase);
		env.firstEscKey = true;

		if (id === "center") {
			$(".media-bar").show();
			whatMedia = this;
		} else if (id === "left") {
			whatMedia = env.prevMedia;
		} else if (id === "right") {
			whatMedia = env.nextMedia;
		}

		if (id === "center") {
			$("#media-view").removeClass("hidden");
			$("#album-and-media-container").addClass("show-media");
			if (
				! env.options.hide_bottom_thumbnails && ! env.currentAlbum.isAlbumWithOneMedia() && $("#thumbs").html() === "" ||
				env.albumOfPreviousState !== env.currentAlbum ||
				env.albumOfPreviousState !== null && env.isFromAuthForm
			) {
				env.currentAlbum.showThumbs();
			} else {
				util.scrollBottomMediaToHighlightedThumb();
			}
			util.addMediaLazyLoader();
			env.isFromAuthForm = false;
			$("#powered-by").hide();

			$("#album-view").off('mousewheel').on('mousewheel', TopFunctions.scrollBottomThumbs);
		}

		var setTitlePromise = TopFunctions.setTitle(id, whatMedia, this);
		setTitlePromise.then(
			function titleSet(self) {
				$("#subalbums").addClass("hidden");

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

					let numVisibleMedia = env.currentAlbum.numsMedia.imagesAndVideosTotal();
					let onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
					if (onlyShowNonGeotaggedContent)
						numVisibleMedia = $("#thumbs > a:not(.gps)").length;

					if (! env.currentAlbum.isAlbumWithOneMedia()) {
						// prepare for previous media
						previousMediaIndex = env.currentMediaIndex;
						while (true) {
							previousMediaIndex --;
							if (previousMediaIndex < 0)
								previousMediaIndex = env.currentAlbum.numsMedia.imagesAndVideosTotal() - 1;
							if (previousMediaIndex === env.currentMediaIndex)
								break
							if (! onlyShowNonGeotaggedContent || ! env.currentAlbum.media[previousMediaIndex].hasGpsData()) {
								env.prevMedia = env.currentAlbum.media[previousMediaIndex];
								env.prevMedia.byDateName = util.pathJoin([env.prevMedia.dayAlbum, env.prevMedia.name]);
								if (env.prevMedia.hasOwnProperty("gpsAlbum"))
									env.prevMedia.byGpsName = util.pathJoin([env.prevMedia.gpsAlbum, env.prevMedia.name]);
								break;
							}
						}

						// prepare for next media
						nextMediaIndex = env.currentMediaIndex;
						while (true) {
							nextMediaIndex ++;
							if (nextMediaIndex > env.currentAlbum.numsMedia.imagesAndVideosTotal() - 1)
								nextMediaIndex = 0;
							if (nextMediaIndex === env.currentMediaIndex)
								break
							if (! onlyShowNonGeotaggedContent || ! env.currentAlbum.media[nextMediaIndex].hasGpsData()) {
								env.nextMedia = env.currentAlbum.media[nextMediaIndex];
								env.nextMedia.byDateName = util.pathJoin([env.nextMedia.dayAlbum, env.nextMedia.name]);
								if (env.nextMedia.hasOwnProperty("gpsAlbum"))
									env.nextMedia.byGpsName = util.pathJoin([env.nextMedia.gpsAlbum, env.nextMedia.name]);
								break;
							}
						}
					}
				}

				var mediaBoxInnerObject = $(".media-box#" + id + " .media-box-inner");
				// empty the img container: another image will be put in there

				if (self.isVideo() && ! f.videoOK()) {
					mediaBoxInnerObject.empty();
					f.addVideoUnsupportedMarker(id);
					if (id === "center")
						loadNextPrevMedia(self);
				} else {
					let newMediaObject;
					if (self.isVideo()) {
						mediaSelector = ".media-box#" + id + " .media-box-inner video";
						newMediaObject = $("<video>");
					} else {
						mediaSelector = ".media-box#" + id + " .media-box-inner img";
						newMediaObject = $("<img>");
					}
					// is the following line correct for videos?
					let mediaSrc = self.chooseMediaReduction(id, env.fullScreenStatus);
					let mediaHtml = self.createMediaHtml(album, id, env.fullScreenStatus);

					let loadEvent = self.chooseTriggerEvent();

					if (mediaBoxInnerObject.html() !== mediaHtml) {
						// only replace the media-box-inner content if it's not yet there
						mediaBoxInnerObject.empty();
						mediaBoxInnerObject.show().append(mediaHtml);

						if (id === "center") {
							$("link[rel=image_src]").remove();
							$('link[rel="video_src"]').remove();
						}
						$("head").append(self.createMediaLinkTag(mediaSrc));
					}

					if (id === "center") {
						mediaBoxInnerObject.css("opacity", 1);
						self.setDescription();
					}

					// we use a trick in order to manage the loading of the image/video, from https://www.seancdavis.com/blog/wait-until-all-images-loaded/
					// the trick is to bind the event to a generic element not in the DOM, and to set its source after the onload event is bound
					newMediaObject.off(loadEvent).on(
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
					newMediaObject.attr("src", $(mediaSelector).attr("src"));
					if (id === "center") {
						if (! env.options.persistent_metadata) {
							$(".media-box .metadata").hide();
							$(".media-box .metadata-show").show();
							$(".media-box .metadata-hide").hide();
						}
					}
				}

				if (id === "center") {
					mediaBoxInnerObject.off('contextmenu click mousewheel');
					$(".media-box#center .media-box-inner .media-bar").off();
					$("#next").off();
					$("#prev").off();

					if (self.isImage())
						mediaBoxInnerObject.off("mousewheel").on("mousewheel", pS.swipeOnWheel);

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
						mediaBoxInnerObject.css('cursor', 'default');
					} else {
						[albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);

						// $("#next").show();
						// $("#prev").show();
						mediaBoxInnerObject.css('cursor', '').off("contextmenu").on(
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
					// When there is both a single media and an album, we display the media's description; else it's the album's one
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

				$("#subalbums").addClass("hidden");
				util.highlightSearchedWords();
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

		if (! util.isSearchHash() || env.currentAlbum.subalbums.length || env.currentAlbum.media.length)
			$("#subalbums, #thumbs, #media-view").removeClass("hidden-by-no-results");

		if (env.currentMedia !== null) {
			env.nextMedia = null;
			env.prevMedia = null;
			$("#subalbums").addClass("hidden");
			env.currentMedia.show(env.currentAlbum, 'center');
		} else {
			// currentMedia is null
			$("#media-view").addClass("hidden");
			$("#album-and-media-container").removeClass("show-media");
			$("#album-view").removeAttr("height");

			if (env.previousMedia === null)
				$("html, body").stop().animate({ scrollTop: 0 }, "slow");
			$("#album-view").off('mousewheel');
			$("#thumbs").css("height", "");
			$(".thumb-container").removeClass("current-thumb");
			$("#media-view, #album-view").removeClass("no-bottom-space");
			$("#album-view").removeClass("hidden");
			if (env.currentAlbum.subalbums.length)
				$("#subalbums").removeClass("hidden");
			else
				$("#subalbums").addClass("hidden");
			util.removeHighligths();
			$("body").off('mousewheel').on('mousewheel', TopFunctions.scrollAlbum);

			util.setMediaOptions();

			env.currentAlbum.setDescription();
			util.setDescriptionOptions();

			if ($("#album-view").is(":visible")) {
				if (env.currentAlbum.subalbums.length) {
					env.currentAlbum.showSubalbums();
				} else {
					$("#subalbums").addClass("hidden");
				}
				if (
					env.albumOfPreviousState === null || (
						env.albumOfPreviousState !== env.currentAlbum ||
						env.albumOfPreviousState !== null && env.isFromAuthForm
					)
				) {
					env.currentAlbum.showThumbs();
				} else {
					util.adaptMediaCaptionHeight(false);
					util.scrollAlbumViewToHighlightedThumb();
				}
				util.addMediaLazyLoader();
				env.windowWidth = $(window).innerWidth();

				util.highlightSearchedWords();
			}

			let titlePromise = TopFunctions.setTitle("album", null);
			titlePromise.then(
				function titleSet() {
					if ($("#album-view").is(":visible")) {
						$(window).off("resize").on(
							"resize",
							function () {
								var previousWindowWidth = env.windowWidth;
								var previousWindowHeight = env.windowHeight;
								env.windowWidth = $(window).innerWidth();
								env.windowHeight = $(window).innerHeight();
								if (env.windowWidth === previousWindowWidth && (env.isMobile.any() || env.windowHeight === previousWindowHeight))
									// avoid considering a resize when the mobile browser shows/hides the location bar
									return;

								$("#loading").show();

								util.socialButtons();
								util.setSubalbumsOptions();

								util.adaptSubalbumCaptionHeight();

								if (util.isMap() || util.isPopup()) {
									// the map must be generated again including the points that only carry protected content
									env.mapRefreshType = "resize";
									if ($("#popup-images-wrapper .highlighted").length)
										env.highlightedObjectId = $("#popup-images-wrapper .highlighted").attr("id");

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

								if (env.currentAlbum.subalbums.length && util.aSubalbumIsHighlighted())
									util.scrollToHighlightedSubalbum($("#subalbums .highlighted"));
								if (env.currentAlbum.media.length && util.aSingleMediaIsHighlighted())
									util.scrollAlbumViewToHighlightedThumb($("#thumbs .highlighted"));
								if (util.isPopup())
									util.scrollPopupToHighlightedThumb($("#popup-images-wrapper .highlighted"));

								$("#loading").hide();
							}
						);

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

		$("li.album-sort.by-date").off("click").on(
			"click",
			function(ev) {
				util.addHighlightToItem($(this));
				self.sortSubalbumsByDate(ev);
			}
		);
		$("li.album-sort.by-name").off("click").on(
			"click",
			function(ev) {
				util.addHighlightToItem($(this));
				self.sortSubalbumsByName(ev);
			}
		);
		$("li.album-sort.reverse").off("click").on(
			"click",
			function(ev) {
				util.addHighlightToItem($(this));
				self.sortSubalbumsReverse(ev);
			}
		);
	};

	Album.prototype.bindMediaSortEvents = function() {
		// binds the click events to the sort buttons

		var self = this;

		$("li.media-sort.by-date").off("click").on(
			"click",
			function(ev) {
				util.addHighlightToItem($(this));
				self.sortMediaByDate(ev);
			}
		);
		$("li.media-sort.by-name").off("click").on(
			"click",
			function(ev) {
				util.addHighlightToItem($(this));
				self.sortMediaByName(ev);
			}
		);
		$("li.media-sort.reverse").off("click").on(
			"click",
			function(ev) {
				util.addHighlightToItem($(this));
				self.sortMediaReverse(ev);
			}
		);
	};

	Album.prototype.sortSubalbumsByDate = function(ev) {
		ev.stopPropagation();
		if (
			this.isUndefinedOrTrue("albumNameSort") &&
			(ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.albumNameSort = false;
			f.setBooleanCookie("albumNameSortRequested", false);
			// f.setBooleanCookie("albumReverseSortRequested", this.albumReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			let highlightedSubalbumId = $("#subalbums .highlighted").attr("id");
			env.currentAlbum.showSubalbums(true);
			util.scrollToHighlightedSubalbum($("#" + highlightedSubalbumId));
		}
		return false;
	};

	Album.prototype.sortSubalbumsByName = function(ev) {
		ev.stopPropagation();
		if (
			this.isUndefinedOrFalse("albumNameSort") &&
			(ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.albumNameSort = true;
			f.setBooleanCookie("albumNameSortRequested", true);
			this.sortAlbumsMedia();
			f.updateMenu(this);

			let highlightedSubalbumId = $("#subalbums .highlighted").attr("id");
			env.currentAlbum.showSubalbums(true);
			util.scrollToHighlightedSubalbum($("#" + highlightedSubalbumId));
		}
		return false;
	};

	Album.prototype.sortSubalbumsReverse = function(ev) {
		ev.stopPropagation();
		if (
			(ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.albumReverseSort = ! env.albumReverseSort;
			f.setBooleanCookie("albumReverseSortRequested", env.albumReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			let highlightedSubalbumId = $("#subalbums .highlighted").attr("id");
			env.currentAlbum.showSubalbums(true);
			util.scrollToHighlightedSubalbum($("#" + highlightedSubalbumId));
		}
		return false;
	};

	Album.prototype.sortMediaByDate = function (ev) {
		ev.stopPropagation();
		if (
			this.mediaNameSort &&
			(ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.mediaNameSort = false;
			f.setBooleanCookie("mediaNameSortRequested", false);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			let inThumbs = true;
			let highlightedObjectSelector = "#" + util.highlightedObject(inThumbs).parent().attr("id");
			this.showThumbs();
			if (env.currentMedia !== null) {
				util.scrollBottomMediaToHighlightedThumb($(highlightedObjectSelector).children());
			} else {
				util.scrollAlbumViewToHighlightedThumb($(highlightedObjectSelector).children());
			}

			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				let highlightedObjectSelector = "#" + util.highlightedObject().attr("id");
				env.mapAlbum.showThumbs();
				$("#popup-images-wrapper .highlighted").removeClass("highlighted");
				$(highlightedObjectSelector).addClass("highlighted");
				util.scrollPopupToHighlightedThumb();
				map.updatePopup();
			}
		}
		return false;
	};


	Album.prototype.sortMediaByName = function(ev) {
		ev.stopPropagation();
		if (
			! this.mediaNameSort &&
			(ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			env.mediaNameSort = true;
			f.setBooleanCookie("mediaNameSortRequested", true);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			let inThumbs = true;
			let highlightedObjectSelector = "#" + util.highlightedObject(inThumbs).parent().attr("id");
			this.showThumbs();
			if (env.currentMedia !== null) {
				util.scrollBottomMediaToHighlightedThumb($(highlightedObjectSelector).children());
			} else {
				util.scrollAlbumViewToHighlightedThumb($(highlightedObjectSelector).children());
			}

			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				let highlightedObjectSelector = "#" + util.highlightedObject().attr("id");
				env.mapAlbum.showThumbs();
				$("#popup-images-wrapper .highlighted").removeClass("highlighted");
				$(highlightedObjectSelector).addClass("highlighted");
				util.scrollPopupToHighlightedThumb();
				map.updatePopup();
			}
		}
		return false;
	};

	Album.prototype.sortMediaReverse = function(ev) {
		ev.stopPropagation();
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.mediaReverseSort = ! env.mediaReverseSort;
			f.setBooleanCookie("mediaReverseSortRequested", env.mediaReverseSort);
			this.sortAlbumsMedia();
			f.updateMenu(this);
			let inThumbs = true;
			let highlightedObjectSelector = "#" + util.highlightedObject(inThumbs).parent().attr("id");
			this.showThumbs();
			if (env.currentMedia !== null) {
				util.scrollBottomMediaToHighlightedThumb($(highlightedObjectSelector).children());
			} else {
				util.scrollAlbumViewToHighlightedThumb($(highlightedObjectSelector).children());
			}

			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				let highlightedObjectSelector = "#" + util.highlightedObject().attr("id");
				env.mapAlbum.showThumbs();
				$("#popup-images-wrapper .highlighted").removeClass("highlighted");
				$(highlightedObjectSelector).addClass("highlighted");
				util.scrollPopupToHighlightedThumb();
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
				util.adaptSubalbumCaptionHeight();
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

	TopFunctions.toggleTitle = function(ev) {
		// next line: why [1, 9].indexOf(ev.which) !== -1 ?!?!?
		// if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
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

	TopFunctions.toggleBottomThumbnails = function(ev) {
		if (ev.which === undefined || [1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
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
				env.currentAlbum.showThumbs();
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

	TopFunctions.toggleDescriptions = function(ev) {
		if (ev.which === undefined || [1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_descriptions = ! env.options.hide_descriptions;
			f.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);

			if (util.isPopup() || env.currentMedia === null && env.currentAlbum.media.length) {
				util.setMediaOptions();
			}
			util.adaptMediaCaptionHeight(false);
			if (! util.isPopup() && env.currentMedia === null && env.currentAlbum.subalbums.length) {
				util.setSubalbumsOptions();
			}
			util.setDescriptionOptions();
			util.correctElementPositions();

			f.updateMenu();
			if (util.isPopup()) {
				map.updatePopup();
				util.adaptMediaCaptionHeight(true);
			}

			if (env.currentAlbum.subalbums.length)
				util.adaptSubalbumCaptionHeight();
		}
		return false;
	};

	TopFunctions.toggleTags = function(ev) {
		if (ev.which === undefined || [1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_tags = ! env.options.hide_tags;
			f.setBooleanCookie("hideTags", env.options.hide_tags);

			if (util.isPopup() || env.currentMedia === null && env.currentAlbum.media.length) {
				util.setMediaOptions();
			}
			util.adaptMediaCaptionHeight(false);
			if (! util.isPopup() && env.currentMedia === null && env.currentAlbum.subalbums.length) {
				util.setSubalbumsOptions();
			}
			util.setDescriptionOptions();
			util.correctElementPositions();

			f.updateMenu();
			if (util.isPopup()) {
				map.updatePopup();
				util.adaptMediaCaptionHeight(true);
			}

			if (env.currentAlbum.subalbums.length)
				util.adaptSubalbumCaptionHeight();
		}
		return false;
	};

	TopFunctions.toggleSlideMode = function(ev) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.albums_slide_style = ! env.options.albums_slide_style;
			f.setBooleanCookie("albumsSlideStyle", env.options.albums_slide_style);
			f.updateMenu();
			let highlightedSubalbumId = $("#subalbums .highlighted").attr("id");
			util.setSubalbumsOptions();
			util.scrollToHighlightedSubalbum($("#" + highlightedSubalbumId));
			if (env.currentAlbum.subalbums.length)
				util.adaptSubalbumCaptionHeight();
		}
		return false;
	};

	TopFunctions.toggleSpacing = function(ev) {
		ev.stopPropagation();
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
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
				util.adaptSubalbumCaptionHeight();

			if (util.isPopup()) {
				map.updatePopup();
			}
		}
		return false;
	};

	TopFunctions.toggleAlbumNames = function(ev) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_album_names_below_thumbs = ! env.options.show_album_names_below_thumbs;
			f.setBooleanCookie("showAlbumNamesBelowThumbs", env.options.show_album_names_below_thumbs);
			f.updateMenu();
			util.setSubalbumsOptions();
			if (env.currentAlbum.subalbums.length)
				util.adaptSubalbumCaptionHeight();
		}
		return false;
	};

	TopFunctions.toggleMediaCount = function(ev) {
		ev.stopPropagation();
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_album_media_count = ! env.options.show_album_media_count;
			f.setBooleanCookie("showAlbumMediaCount", env.options.show_album_media_count);
			f.updateMenu();
			// f.setOptions();
			util.setTitleOptions();
			util.setSubalbumsOptions();
			if (env.currentAlbum.subalbums.length)
				util.adaptSubalbumCaptionHeight();
		}
		return false;
	};

	TopFunctions.toggleMediaNames = function(ev) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_media_names_below_thumbs = ! env.options.show_media_names_below_thumbs;
			f.setBooleanCookie("showMediaNamesBelowThumbs", env.options.show_media_names_below_thumbs);
			f.updateMenu();
			// f.setOptions();
			util.setMediaOptions();
			// util.setSubalbumsOptions();
			if (env.currentAlbum.media.length)
				util.adaptMediaCaptionHeight(false);

			if (util.isPopup()) {
				map.updatePopup();
				util.adaptMediaCaptionHeight(true);
			}
		}
		return false;
	};

	TopFunctions.toggleAlbumsSquare = function(ev) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.album_thumb_type = env.options.album_thumb_type.indexOf("square") > -1 ? "album_fit" : "album_square";
			f.setCookie("albumThumbType", env.options.album_thumb_type);
			f.updateMenu();
			let highlightedSubalbumId = $("#subalbums .highlighted").attr("id");
			util.setSubalbumsOptions();
			util.scrollToHighlightedSubalbum($("#" + highlightedSubalbumId));
			if (env.currentAlbum.subalbums.length)
				util.adaptSubalbumCaptionHeight();
		}
		return false;
	};

	TopFunctions.toggleMediaSquare = function(ev) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.media_thumb_type = env.options.media_thumb_type.indexOf("square") > -1 ? "media_fixed_height" : "media_square";
			f.setCookie("mediaThumbType", env.options.media_thumb_type);
			f.updateMenu();
			if (env.currentAlbum.media.length) {
				let highlightedSingleMediaId = $("#thumbs .highlighted img.thumbnail").attr("id");
				env.currentAlbum.showThumbs();
				if (env.currentMedia !== null) {
					util.scrollBottomMediaToHighlightedThumb($("#" + highlightedSingleMediaId).parent().parent());
				} else {
					util.scrollAlbumViewToHighlightedThumb($("#" + highlightedSingleMediaId).parent().parent());
				}
			}

			if (util.isPopup()) {
				map.updatePopup();
				let highlightedSingleMediaInPopupId = $("#popup-images-wrapper .highlighted img.thumbnail").attr("id");
				env.mapAlbum.showThumbs();
				$("#popup-images-wrapper .highlighted").removeClass("highlighted");
				util.scrollPopupToHighlightedThumb($("#" + highlightedSingleMediaInPopupId));
			}
		}
		return false;
	};

	TopFunctions.prototype.restoreDisplaySettings = function(ev) {
		var oldOptions = {};
		oldOptions.hide_title = env.options.hide_title;
		oldOptions.show_album_media_count = env.options.show_album_media_count;

		oldOptions.albums_slide_style = env.options.albums_slide_style;
		oldOptions.album_thumb_type = env.options.album_thumb_type;
		oldOptions.show_album_names_below_thumbs = env.options.show_album_names_below_thumbs;

		oldOptions.media_thumb_type = env.options.media_thumb_type;
		oldOptions.show_media_names_below_thumbs = env.options.show_media_names_below_thumbs;

		oldOptions.hide_descriptions = env.options.hide_descriptions;
		oldOptions.hide_tags = env.options.hide_tags;
		oldOptions.spacing = env.options.spacing;
		oldOptions.hide_bottom_thumbnails = env.options.hide_bottom_thumbnails;
		// oldOptions.default_album_name_sort = env.options.default_album_name_sort;
		// oldOptions.default_album_reverse_sort = env.options.default_album_reverse_sort;
		// oldOptions.default_media_name_sort = env.options.default_media_name_sort;
		// oldOptions.default_media_reverse_sort = env.options.default_media_reverse_sort;
		var promise = f.getOptions(true);
		promise.then(
			function optionsHaveBeenReset() {
				// f.setOptions();

				if (oldOptions.show_album_media_count !== env.options.show_album_media_count) {
					env.options.show_album_media_count = oldOptions.show_album_media_count;
					TopFunctions.toggleMediaCount(ev);
				}
				if (oldOptions.hide_title !== env.options.hide_title) {
					env.options.hide_title = oldOptions.hide_title;
					TopFunctions.toggleTitle(ev);
				}

				if (oldOptions.albums_slide_style !== env.options.albums_slide_style) {
					env.options.albums_slide_style = oldOptions.albums_slide_style;
					TopFunctions.toggleSlideMode(ev);
				}
				if (oldOptions.album_thumb_type !== env.options.album_thumb_type) {
					env.options.album_thumb_type = oldOptions.album_thumb_type;
					TopFunctions.toggleAlbumsSquare(ev);
				}
				if (oldOptions.show_album_names_below_thumbs !== env.options.show_album_names_below_thumbs) {
					env.options.show_album_names_below_thumbs = oldOptions.show_album_names_below_thumbs;
					TopFunctions.toggleAlbumNames(ev);
				}

				if (oldOptions.media_thumb_type !== env.options.media_thumb_type) {
					env.options.media_thumb_type = oldOptions.media_thumb_type;
					TopFunctions.toggleMediaSquare(ev);
				}
				if (oldOptions.show_media_names_below_thumbs !== env.options.show_media_names_below_thumbs) {
					env.options.show_media_names_below_thumbs = oldOptions.show_media_names_below_thumbs;
					TopFunctions.toggleMediaNames(ev);
				}

				if (oldOptions.hide_descriptions !== env.options.hide_descriptions) {
					env.options.hide_descriptions = oldOptions.hide_descriptions;
					TopFunctions.toggleDescriptions(ev);
				}
				if (oldOptions.hide_tags !== env.options.hide_tags) {
					env.options.hide_tags = oldOptions.hide_tags;
					TopFunctions.toggleTags(ev);
				}
				if (oldOptions.spacing !== env.options.spacing) {
					env.options.spacing = oldOptions.spacing;
					TopFunctions.toggleSpacing(ev);
				}
				if (oldOptions.hide_bottom_thumbnails !== env.options.hide_bottom_thumbnails) {
					env.options.hide_bottom_thumbnails = oldOptions.hide_bottom_thumbnails;
					TopFunctions.toggleBottomThumbnails(ev);
				}

				if (env.currentMedia === null && env.currentAlbum.subalbums.length && $("#subalbums").is(":visible")) {
					util.adaptSubalbumCaptionHeight();
				}

				$("#ui-settings-restored").stop().fadeIn(
					200,
					function() {
						$("#ui-settings-restored").fadeOut(2500);
					}
				);

				f.updateMenu();
			}
		);
		return false;
	};

	TopFunctions.prototype.toggleBigAlbumsShow = function(ev) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
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
			env.currentAlbum.showThumbs();
			$("#loading").hide();
		}
		return false;
	};

	Album.prototype.showThumbs = function(populateMedia = true) {
		var inPopup = false;
		if (this.isEqual(env.mapAlbum) && util.isPopup())
			inPopup = true;

		var thumbnailSize = env.options.media_thumb_size;
		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);
		var self = this;
		var lazyClass, thumbsSelector;
		if (inPopup) {
			thumbsSelector = "#popup-images-wrapper";
			lazyClass = "lazyload-popup-media";
		} else {
			thumbsSelector = "#thumbs";
			lazyClass = "lazyload-media";
		}

		let tooBig = this.path.split("/").length < 4 && this.numsMedia.imagesAndVideosTotal() > env.options.big_virtual_folders_threshold;
		if (populateMedia && this.isTransversal())
			populateMedia = populateMedia && (! tooBig || env.options.show_big_virtual_folders);

		if (this.isTransversal() && tooBig) {
			let tooManyImagesText, isShowing = false;
			if (env.options.show_big_virtual_folders) {
				tooManyImagesText =
					"<span id='too-many-images'>" + util._t('#too-many-images') + "</span>: " + this.numsMedia.imagesAndVideosTotal() +
					", <span id='too-many-images-limit-is'>" + util._t('#too-many-images-limit-is') + "</span> " + env.options.big_virtual_folders_threshold + "</span>, " +
					"<span id='show-hide-them'>" + util._t("#hide-them") + "</span>";
			} else {
				$("#thumbs").empty();
				tooManyImagesText =
					"<span id='too-many-images'>" + util._t('#too-many-images') + "</span>: " + this.numsMedia.imagesAndVideosTotal() +
					", <span id='too-many-images-limit-is'>" + util._t('#too-many-images-limit-is') + "</span> " + env.options.big_virtual_folders_threshold + "</span>, " +
					"<span id='show-hide-them'>" + util._t("#show-them") + "</span>";
				isShowing = true;
			}
			$("#message-too-many-images").html(tooManyImagesText).show();
			if (! $("ul#right-menu").hasClass("expanded")) {
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

		if (populateMedia && (! this.isTransversal() || ! tooBig || env.options.show_big_virtual_folders)) {
		// if (! (this.isTransversal() && tooBig && ! env.options.show_big_virtual_folders) && populateMedia) {
			$(thumbsSelector).empty();

			//
			// media loop
			//
			for (let i = 0; i < this.media.length; ++i) {
				let iMedia = i;
				let ithMedia = this.media[iMedia];

				let width = ithMedia.metadata.size[0];
				let height = ithMedia.metadata.size[1];
				let thumbHash = ithMedia.chooseMediaThumbnail(thumbnailSize);
				let thumbHeight, thumbWidth, calculatedWidth, calculatedHeight;

				if (env.options.media_thumb_type.indexOf("fixed_height") > -1) {
					if (height < env.options.media_thumb_size) {
						thumbHeight = height;
						thumbWidth = width;
					} else {
						thumbHeight = env.options.media_thumb_size;
						thumbWidth = thumbHeight * width / height;
					}
					calculatedWidth = thumbWidth;
				} else if (env.options.media_thumb_type.indexOf("square") > -1) {
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
				calculatedWidth = Math.min(calculatedWidth, env.windowWidth - 2 * albumViewPadding);
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
						mapLinkIcon = "<a id='media-map-link-" + iMedia + "'>" + imgHtml + "</a>";
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

				let mediaSelectBoxSelectorPart = "media-select-box-";
				if (inPopup)
					mediaSelectBoxSelectorPart = "map-" + mediaSelectBoxSelectorPart;

				let selectBoxHtml = "<a id='" + mediaSelectBoxSelectorPart + iMedia + "'>" + imgHtml + "</a>";

				let mediaHash;
				if (collectionCacheBase !== undefined && collectionCacheBase !== null)
					mediaHash = phFl.encodeHash(this.cacheBase, ithMedia, foundAlbumCacheBase, collectionCacheBase);
				else
					mediaHash = phFl.encodeHash(this.cacheBase, ithMedia);

				let data = "", popupPrefix = "";
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
					popupPrefix = "popup-";
				}

				imgHtml =
					"<img " +
						"data-src='" + encodeURI(thumbHash) + "' " +
						"src='img/image-placeholder.png' " +
						data +
						"class='thumbnail " + lazyClass + "' " +
						"height='" + thumbHeight + "' " +
						"width='" + thumbWidth + "' " +
						"id='" + popupPrefix + ithMedia.foldersCacheBase + "--" + ithMedia.cacheBase + "' " +
						"style='" +
							 "width: " + calculatedWidth + "px; " +
							 "height: " + calculatedHeight + "px;" +
							 "'" +
					"/>";

				let imageId = ithMedia.foldersCacheBase + "--" + ithMedia.cacheBase;
				if (! inPopup)
					imageId = "album-view-" + imageId;
				else
					imageId = "popup-" + imageId;

				let imageString =
					"<div class='thumb-and-caption-container' style='" +
								"width: " + calculatedWidth + "px;" +
								"'";
				if (inPopup)
					imageString += " id='" + imageId + "'";
				imageString +=
					">" +
						"<div class='thumb-container' " + "style='" +
								// "width: " + calculatedWidth + "px; " +
								"height: " + env.options.media_thumb_size + "px;" +
						"'>" +
							mapLinkIcon +
							selectBoxHtml +
							"<span class='helper'></span>" +
							imgHtml +
						"</div>" +
						"<div class='media-caption'>";
				let name, title;
				if ((util.isPopup() || this.isMap()) && ithMedia.hasOwnProperty("captionsForPopup") && ithMedia.captionsForPopup[0])
					name = ithMedia.captionsForPopup.join(env.br);
				else if (this.isSearch() && ithMedia.hasOwnProperty("captionsForSearch") && ithMedia.captionsForSearch[0])
					name = ithMedia.captionsForSearch.join(env.br);
				else if (this.isSelection() && ithMedia.hasOwnProperty("captionsForSelection") && ithMedia.captionsForSelection[0])
					name = ithMedia.captionsForSelection.join(env.br);
				else {

					[name, title] = ithMedia.nameAndTitleForShowing(this, true, true);
				}

				let spanHtml =
							"<span class='media-name'>" +
									name +
							"</span>";

				imageString += spanHtml;

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

				if (inPopup) {
					$(thumbsSelector).append(imageString);
				} else {
					let aHtml = "<a href='" + mediaHash + "' id='" + imageId + "'></a>";
					$(thumbsSelector).append(aHtml);
					$(thumbsSelector + " #" + imageId).append(imageString);
				}

				if (! inPopup && ithMedia.hasGpsData())
					$("#" + imageId + " img.thumbnail-map-link").attr("title", util._t("#show-on-map")).attr("alt", util._t("#show-on-map"));
				$("#" + imageId + " img.select-box").attr("title", util._t(titleSelector)).attr("alt", util._t("#selector"));
				let [nameForShowing, titleForShowing] = ithMedia.nameAndTitleForShowing(this);
				$("#" + imageId + " img.thumbnail").attr("title", util.pathJoin([ithMedia.albumName, nameForShowing])).attr("alt", util.trimExtension(ithMedia.name));
				$("#" + imageId + " .media-caption .media-name").attr("title", titleForShowing);
				if (ithMedia.metadata.hasOwnProperty("description")) {
					$("#" + imageId + " .description.ellipsis").attr("title", util.stripHtmlAndReplaceEntities(ithMedia.metadata.description));
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

				if (ithMedia.hasGpsData())
					$("#" + imageId).addClass("gps");

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
					let imageId = ithMedia.foldersCacheBase + "--" + ithMedia.cacheBase;
					$("#album-view-" + imageId + ", #popup-" + imageId).off("auxclick").on(
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
		if (self.media.length && env.currentMedia === null)
			util.adaptMediaCaptionHeight(inPopup);

	 	if ($(thumbsSelector).is(":visible") || util.isPopup()) {
			if ($("#album-and-media-container").hasClass("show-media"))
				util.scrollBottomMediaToHighlightedThumb();
			else if (util.isPopup())
				util.scrollPopupToHighlightedThumb();
			else
				util.scrollAlbumViewToHighlightedThumb();
			util.addMediaLazyLoader();
		}

		f.updateMenu();
		this.bindMediaSortEvents();

		util.setDescriptionOptions();
		util.correctElementPositions();

		$("#loading").hide();
	};


	Album.prototype.pickRandomMediaAndInsertIt = function(iSubalbum, resolve_subalbumPromise) {
		function insertRandomImage(randomSubAlbum, index, iSubalbum) {
			var titleName, randomMediaLink;
			var randomMedia = randomSubAlbum.media[index];
			var id = phFl.convertCacheBaseToId(self.subalbums[iSubalbum].cacheBase);
			var mediaSrc = randomMedia.chooseSubalbumThumbnail(env.options.album_thumb_size);

			$("#downloading-media").hide();

			if (self.isByDate()) {
				titleName = util.pathJoin([randomMedia.dayAlbum, randomMedia.name]);
			} else if (self.isByGps()) {
				let humanGeonames = util.pathJoin([env.options.by_gps_string, randomMedia.geoname.country_name, randomMedia.geoname.region_name, randomMedia.geoname.place_name]);
				titleName = util.pathJoin([humanGeonames, randomMedia.name]);
			// } else if (self.isSearch()) {
			// 	titleName = util.pathJoin([randomMedia.albumName, randomMedia.name]);
			} else {
				let [name, title] = randomMedia.nameAndTitleForShowing(randomSubAlbum);
				titleName = util.pathJoin([randomMedia.albumName, name]);
			}
			if (self.isSearch())
				randomMediaLink = phFl.encodeHash(randomSubAlbum.cacheBase, randomMedia, randomSubAlbum.cacheBase, self.cacheBase);
			else
				randomMediaLink = phFl.encodeHash(randomSubAlbum.cacheBase, randomMedia);

			titleName = titleName.substr(titleName.indexOf('/') + 1);
			var goTo = util._t(".go-to") + " " + titleName;
			$("#" + id + " .album-button a.random-media-link").attr("href", randomMediaLink);
			$("#" + id + " img.album-button-random-media-link").attr("title", goTo).attr("alt", goTo);
			// replacing is needed in order to reactivate the lazy loader
			$("#" + id + " img.thumbnail").replaceWith($("#" + id + " img.thumbnail")[0].outerHTML);
			$("#" + id + " img.thumbnail").attr("title", titleName).attr("alt", titleName);
			$("#" + id + " img.thumbnail").attr("data-src", encodeURI(mediaSrc));

			if (util.onlyShowNonGeotaggedContent()) {
				$("#" + id + " img.thumbnail").attr("src", "img/image-placeholder.png");
			}

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
		// body of pickRandomMediaAndInsertIt function begins

		var self = this;
		var promise = this.pickRandomMedia(
			iSubalbum,
			function error() {
				// executions shoudn't arrive here, if it arrives it's because of some error
				console.trace();
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

	Album.prototype.showSubalbums = function(forcePopulate = false) {
		let [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);
		var self = this;

		if (env.fromEscKey && env.firstEscKey) {
			// respect the existing mediaLink (you cannot do it more than once)
			env.firstEscKey = false;
		} else {
			// reset mediaLink
			if (self.numsMedia.imagesAndVideosTotal())
				env.mediaLink = phFl.encodeHash(self.cacheBase, self.media[0], foundAlbumCacheBase, collectionCacheBase);
			else
				env.mediaLink = env.hashBeginning + self.cacheBase;

			env.firstEscKey = true;
		}

		// insert into DOM
		let subalbumsPromises = [];
		if (! self.subalbums.length)
			$("#subalbums").addClass("hidden");
			// $("#subalbums").hide();

		let populateSubalbums =
			forcePopulate ||
			env.albumInSubalbumDiv === null ||
			self === null ||
			(env.albumInSubalbumDiv !== self || env.isFromAuthForm) && self.subalbums.length;

		if (populateSubalbums) {
			$("#subalbums").empty();
			// $("#subalbums").insertBefore("#message-too-many-images");

			//
			// subalbums loop
			//
			// The promises are needed in order to know when everything has come to its end
			for (let i = 0; i < self.subalbums.length; i ++) {
				let iSubalbum = i;
				let subalbumPromise = new Promise(
					function(resolve_subalbumPromise) {
						var ithSubalbum = self.subalbums[iSubalbum];
						var ithSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: false, getPositions: true});
						ithSubalbumPromise.then(
							function(ithAlbum) {
								var id = phFl.convertCacheBaseToId(ithAlbum.cacheBase);

								let nameHtml;
								if (self.isSearch())
									nameHtml = ithAlbum.captionsForSearch.join(env.br);
								else if (self.isSelection())
									nameHtml = ithAlbum.captionsForSelection.join(env.br);
								else {
									nameHtml = ithAlbum.nameForShowing(self, true, true);
									if (nameHtml === "")
										nameHtml = "<span class='italic gray'>(" + util._t("#root-album") + ")</span>";
								}

								let captionId = "album-caption-" + id;
								let captionHtml =
									"<div class='album-caption' id='" + captionId + "'>";
								captionHtml +=
										"<div class='album-name'>" + nameHtml + "</div>";

								if (ithAlbum.hasOwnProperty("description")) {
									captionHtml +=
										"<div class='album-description'>" +
											"<div class='description ellipsis'>" + util.stripHtmlAndReplaceEntities(ithAlbum.description) + "</div>" +
										"</div>";
								}

								if (ithAlbum.hasOwnProperty("tags") && ithAlbum.tags.length) {
									captionHtml +=
										"<div class='album-tags'>" +
											"<span class='tags'>" + util._t("#tags") + ": <span class='tag'>" + ithAlbum.tags.map(tag => util.addTagLink(tag)).join("</span>, <span class='tag'>") + "</span></span>" +
										"</div>";
								}

								captionHtml +=
										"<div class='album-caption-count'>" +
											"(" +
											"<span class='gps'>" +
											ithAlbum.numsMediaInSubTree.imagesAndVideosTotal() +
											"</span>" +
											"<span class='non-gps'>" +
											ithAlbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal() +
											"</span>" +
											" " +
											"<span class='title-media'>" + util._t(".title-media") + "</span>" +
											")" +
										"</div>" +
									"</div>";

								let captionObject = $(captionHtml);

								let selectSrc = 'img/checkbox-unchecked-48px.png';
								let titleSelector = "#select-subalbum";
								if (ithAlbum.isSelected()) {
									selectSrc = 'img/checkbox-checked-48px.png';
									titleSelector = "#unselect-subalbum";
								}

								let positionHtml = "";
								let folderMapTitleWithoutHtmlTags;
								if (ithAlbum.numPositionsInTree) {
									folderMapTitleWithoutHtmlTags = self.folderMapTitle(ithAlbum, nameHtml).replace(/<br \/>/gm, ' ').replace(/<[^>]*>?/gm, '');
									positionHtml =
										"<a id='subalbum-map-link-" + id + "' >" +
											"<img " +
												"class='thumbnail-map-link gps' " +
												"height='15px' " +
												"src='img/ic_place_white_24dp_2x.png' " +
											"/>" +
										"</a>";
								}

								// a dot could be present in a cache base, making $("#" + cacheBase) fail, beware...
								let subfolderHash;
								// TO DO: verify that isMap() is not missing in the following line
								if (self.isSearch() || self.isSelection()) {
									subfolderHash = phFl.encodeHash(ithAlbum.cacheBase, null, ithAlbum.cacheBase, self.cacheBase);
								} else {
									if (typeof collectionCacheBase !== "undefined" && collectionCacheBase !== null)
										subfolderHash = phFl.encodeHash(ithAlbum.cacheBase, null, foundAlbumCacheBase, collectionCacheBase);
									else
										subfolderHash = phFl.encodeHash(ithAlbum.cacheBase, null);
								}

								let gpsClass = "";
								if (
									// ithAlbum.numPositionsInTree &&
									! ithAlbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal()
								)
									gpsClass = " class='all-gps'";

								let aHrefHtml = "<a href='" + subfolderHash + "'" + gpsClass + "></a>";
								let aHrefObject = $(aHrefHtml);
								let albumButtonAndCaptionHtml =
									"<div id='" + id + "' class='album-button-and-caption'></div>";
								let albumButtonAndCaptionObject = $(albumButtonAndCaptionHtml);

								let selectBoxHtml =
									"<a id='subalbum-select-box-" + id + "'>" +
										"<img " +
											"class='select-box' " +
											"src='" + selectSrc + "' " +
											"style='display: none;'" +
										">" +
									"</a>";

								let imageObject = $(
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
								albumButtonAndCaptionObject.append(imageObject);
								albumButtonAndCaptionObject.append(captionObject);
								aHrefObject.append(albumButtonAndCaptionObject);

								$("#subalbums").append(aHrefObject);

								if (ithAlbum.numPositionsInTree) {
									$("#subalbum-map-link-" + id + " img.thumbnail-map-link").attr("title", folderMapTitleWithoutHtmlTags);
									$("#subalbum-map-link-" + id + " img.thumbnail-map-link").attr("alt", folderMapTitleWithoutHtmlTags);
								}
								$("#subalbum-select-box-" + id + " img.select-box").attr("title", util._t(titleSelector));
								$("#subalbum-select-box-" + id + " img.select-box").attr("alt", util._t("#selector"));

								if (ithAlbum.hasOwnProperty("description"))
									$("#" + captionId + " .description").attr("title", util.stripHtmlAndReplaceEntities(ithAlbum.description));

								if (ithAlbum.hasOwnProperty("numPositionsInTree") && ithAlbum.numPositionsInTree) {
									$("#subalbum-map-link-" + id).off("click").on(
										"click",
										{ithAlbum: ithAlbum},
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

								self.pickRandomMediaAndInsertIt(iSubalbum, resolve_subalbumPromise);
							}
						);
					}
				);
				subalbumsPromises.push(subalbumPromise);
			}
		}

		Promise.all(subalbumsPromises).then(
			function allRandomImagesGot() {
				if (! Utilities.aSingleMediaIsHighlighted())
					util.scrollToHighlightedSubalbum();
				if (populateSubalbums)
					env.albumInSubalbumDiv = self;
				$("#loading").hide();

				if (self.subalbums.length) {
					$("#album-and-media-container").removeClass("show-media");
					$("#subalbums").removeClass("hidden");
					// $("#subalbums").show();
					$("#album-view").removeAttr("height");
				}

				util.setSubalbumsOptions();
				if (self.subalbums.length)
					util.adaptSubalbumCaptionHeight();
				util.correctElementPositions();

				// we can run the function that prepare the stuffs for sharing
				util.socialButtons();

				f.updateMenu();
				self.bindSubalbumSortEvents();
			},
			function() {
				console.trace();
			}
		);
	};

	TopFunctions.toggleFullscreen = function(e) {
		function afterToggling(isFullscreen) {
			if (! isFullscreen) {
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
				let isFullScreenToggling = true;
				util.resizeSingleMediaWithPrevAndNext(env.currentMedia, env.currentAlbum, isFullScreenToggling);
			}
		}

		if (Modernizr.fullscreen) {
			e.preventDefault();

			$("#fullscreen-wrapper").fullScreen(
				{
					callback: function(isFullscreen) {
						afterToggling(isFullscreen);
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
		var subalbumPromise = ev.data.ithAlbum.toAlbum(util.errorThenGoUp, {getMedia: false, getPositions: true});
		subalbumPromise.then(
			function(album) {
				// var album = env.currentAlbum.subalbums[iSubalbum];
				if (album.positionsAndMediaInTree.length) {
					ev.stopPropagation();
					ev.preventDefault();
					album.positionsAndMediaInTree.generateMap(ev, from);
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

	TopFunctions.playClickElement = function(clickHistory, iClick = 0) {
		return new Promise(
			function(resolve_playClickElement) {
				var clickHistoryElement = clickHistory[iClick];
				var oneClickPromise = new Promise(
					function(resolve_oneClickPromise) {
						env.mymap.setView(clickHistoryElement.center, clickHistoryElement.zoom, {animate: false});
						// sometimes on mobile after resizing the cluster may be out of the map bounds -> move the cluster to the center of the map
						if (! env.mymap.getBounds().contains(clickHistoryElement.latlng))
							env.mymap.setView(clickHistoryElement.latlng, clickHistoryElement.zoom, {animate: false});
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
		function updateMapAndContinue(ev, isLongTap = false) {
			var updatePromise;
			if (isLongTap) {
				updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, env.pruneCluster.Cluster._clusters, true, "shift");
			} else {
				updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, env.pruneCluster.Cluster._clusters);
			}
			updatePromise.then(
				TopFunctions.prepareAndDoPopupUpdate,
				function() {
					console.trace();
				}
			);
		}

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
						updateMapAndContinue(ev);
					}
				);
				m.off("contextmenu").on(
					"contextmenu",
					function(ev) {
						if (env.isMobile.any() && ev.originalEvent.button === 0) {
							updateMapAndContinue(ev, true);
							return false;
						}
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
						cacheBases += env.br;
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
					updateMapAndContinue(ev);
				}
			);
			env.mymap.off("contextmenu").on(
				"contextmenu",
				function(ev) {
					if (env.isMobile.any() && ev.originalEvent.button === 0) {
						updateMapAndContinue(ev, true);
						return false;
					}
				}
			);

			if (from !== undefined) {
				if (env.popupRefreshType === "previousAlbum")
					TopFunctions.prepareAndDoPopupUpdate();
				else if (env.popupRefreshType === "mapAlbum") {
					var clickHistory = env.mapAlbum.clickHistory;
					env.mapAlbum = new Album();
					TopFunctions.playClickElement(clickHistory);
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
				// focus the map, so that the arrows and +/- work
				$("#mapdiv").focus();
			}
		);

		map.addPopupMover();

		var promise = phFl.endPreparingAlbumAndKeepOn(env.mapAlbum, null, null);
		promise.then(
			function() {
				env.mapAlbum.showThumbs();
				map.updatePopup();
				if ($("#" + env.highlightedObjectId).length) {
					util.scrollPopupToHighlightedThumb($("#" + env.highlightedObjectId));
				}
				$("#loading").hide();
			}
		);
	};

	TopFunctions.updateMapAlbumOnMapClick = function(evt, clusters, updateMapAlbum = true, shiftOrControl = "") {

		return new Promise(
			function(resolve_updateMapAlbumOnMapClick, reject_updateMapAlbumOnMapClick) {
				var i;
				var clickHistoryElement;
				var shiftKey = shiftOrControl === "shift" ? true : evt.originalEvent.shiftKey;
				var ctrlKey = shiftOrControl === "control" ? true : evt.originalEvent.ctrlKey;

				$("#loading").show();

				var clickedPosition = evt.latlng;

				if (evt !== null && evt.latlng !== undefined) {
					clickHistoryElement = {
							// warning: the value of latlng here is provisional: it will be updated to the cluster latlng
							latlng: clickedPosition,
							shiftKey: shiftKey,
							ctrlKey: ctrlKey,
							zoom: env.mymap.getZoom(),
							center: env.mymap.getCenter()
					};
				}


				// reset the thumbnails if not shift- nor ctrl-clicking
				if (! shiftKey && ! ctrlKey) {
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
				// update the value of latlng property to the cluster latlng
				clickHistoryElement.latlng = clusters[index].averagePosition;
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
				if (ctrlKey) {
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

							if (env.mapAlbum.isEmpty() || env.mapAlbum.numsMedia.imagesAndVideosTotal() === 0 || ! shiftKey) {
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
	TopFunctions.prototype.toggleMediaCount = TopFunctions.toggleMediaCount;
	TopFunctions.prototype.toggleMediaNames = TopFunctions.toggleMediaNames;
	TopFunctions.prototype.toggleTitle = TopFunctions.toggleTitle;
	TopFunctions.prototype.toggleSlideMode = TopFunctions.toggleSlideMode;
	TopFunctions.prototype.toggleAlbumsSquare = TopFunctions.toggleAlbumsSquare;
	TopFunctions.prototype.toggleAlbumNames = TopFunctions.toggleAlbumNames;
	TopFunctions.prototype.toggleMediaSquare = TopFunctions.toggleMediaSquare;
	TopFunctions.prototype.toggleDescriptions = TopFunctions.toggleDescriptions;
	TopFunctions.prototype.toggleTags = TopFunctions.toggleTags;
	TopFunctions.prototype.toggleSpacing = TopFunctions.toggleSpacing;
	TopFunctions.prototype.toggleBottomThumbnails = TopFunctions.toggleBottomThumbnails;

	window.TopFunctions = TopFunctions;
}());
