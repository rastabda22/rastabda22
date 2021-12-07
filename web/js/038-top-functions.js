(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var mapF = new MapFunctions();
	var menuF = new MenuFunctions();

	/* constructor */
	function TopFunctions() {
	}

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

				// menuF.updateMenu();

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
						ithSubalbum => ithSubalbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal()
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
						if (numSubalbums.hasOwnProperty(mode)) {
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
					}
				} else {
					// here: ! (isSearchTitle || isInsideCollectionTitle)
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
								if (numSubalbums.hasOwnProperty(mode)) {
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

							// let aObject = $("<a></a>");
							// aObject.attr("title", util._t("#place-icon-title") + gpsName + util._t("#place-icon-title-end"));
							// titlesForTitleComponents[i] = aObject.attr("title");

							titleComponents[i] = gpsName;
						}

						if (singleMedia === null) {
							for (const mode in numSubalbums) {
								if (numSubalbums.hasOwnProperty(mode)) {
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
						}
					} else if (isSelectionTitle) {
						titleComponents.pop();
						cacheBasesForTitleComponents.pop();

						titleComponents[1] = "(" + util._t("#by-selection") + ")";

						for (const mode in numSubalbums) {
							if (
								numSubalbums.hasOwnProperty(mode) &&
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
								numSubalbums.hasOwnProperty(mode) &&
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

				if (singleMedia === null && (isInsideCollectionTitle || isFolderTitle)) {
					let firstTime = true;
					let previousTotalCount = -1;
					for (const mode in numSubalbums) {
						if (numSubalbums.hasOwnProperty(mode)) {
							let totalCount = numSubalbums[mode] + mediaTotalInAlbum[mode] + mediaTotalInSubAlbums[mode];
							if (firstTime && previousTotalCount > 0 && totalCount > 0)
								titleCount[mode] += " ";
							firstTime = false;
							if (totalCount > 0) {
								titleCount[mode] = "<span class='title-count'>(";
								if (numSubalbums[mode]) {
									titleCount[mode] += numSubalbums[mode] + " " + util._t(".title-albums");
								}

								if ((mediaTotalInAlbum[mode] || mediaTotalInSubAlbums[mode]) && numSubalbums[mode])
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
									if (mediaTotalInSubAlbums[mode])
										titleCount[mode] += ", ";
								}
								if (mediaTotalInSubAlbums[mode]) {
									titleCount[mode] += mediaTotalInSubAlbums[mode] + " ";
									if (! imagesTotalInSubAlbums[mode] && videosTotalInSubAlbums[mode]) {
										titleCount[mode] += util._t(".title-videos");
									} else if (imagesTotalInSubAlbums[mode] && ! videosTotalInSubAlbums[mode]) {
										titleCount[mode] += util._t(".title-images");
									} else if (imagesTotalInSubAlbums[mode] && videosTotalInSubAlbums[mode]) {
										let titleCountHtml = "<span class='title-count-detail'>" + util._t(".title-media") + "</span>";
										let titleCountObject = $(titleCountHtml);
										titleCountObject.attr("title", imagesTotalInSubAlbums[mode] + " " + util._t(".title-images") + ", " + videosTotalInSubAlbums[mode] + " " + util._t(".title-videos"));
										titleCount[mode] += titleCountObject.wrapAll('<div>').parent().html();
									}
									titleCount[mode] += " " + util._t(".title-in-subalbums");
								}
								if (mediaTotalInAlbum[mode] && mediaTotalInSubAlbums[mode]) {
									titleCount[mode] += ", ";

									let spanTitle = "";
									if (imagesTotalInSubTree[mode])
										spanTitle += imagesTotalInSubTree[mode] + " " + util._t(".title-images");
									if (imagesTotalInSubTree[mode] && videosTotalInSubTree[mode])
										spanTitle = ", ";
									if (videosTotalInSubTree[mode])
										spanTitle = videosTotalInSubTree[mode] + " " + util._t(".title-videos");
									let titleSpanHtml = "<span class='title-count-detail'>" + util._t(".title-total") + " " + mediaTotalInSubTree[mode] + " " + util._t(".title-media") + "</span>";
									let titleSpanObject = $(titleSpanHtml);
									titleSpanObject.attr("title", spanTitle);

									titleCount[mode] += titleSpanObject.wrapAll('<div>').parent().html();
									previousTotalCount = totalCount;
								}
								titleCount[mode] += ")</span>";
							}
						}
					}
				}

				// if (addSearchMarker) {
				// 	let numElements = searchFolderCacheBase.split(env.options.cache_folder_separator).length;
				// 	titleComponents.splice(numElements, 0, " (" + util._t("#by-search") + ")");
				// 	cacheBasesForTitleComponents.splice(numElements, 0, env.options.by_search_string);
				// }

				if (! env.options.save_data)
					promises.push(env.currentAlbum.generatePositionsAndMediaInMediaAndSubalbums());

				Promise.all(promises).then(
					function() {
						let documentTitleComponents = titleComponents.map(component => util.stripHtmlAndReplaceEntities(component));
						if (singleMedia !== null) {
							let singleMediaNameHtml;
							let [singleMediaName, singleMediaTitle] = singleMedia.nameAndTitleForShowing(true);
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

							if (
								singleMedia.hasGpsData() ||
								typeof isPhp === "function" && env.options.user_may_suggest_location && env.options.request_password_email
							) {
								let imgHtml;
								if (singleMedia.hasGpsData())
									imgHtml = "<img class='title-img gps' height='20px' src='img/ic_place_white_24dp_2x.png'>";
								else
									imgHtml = "<img class='title-img' height='20px' src='img/ic_place_white_24dp_2x_with_plus.png'>";
								let imgObject = $(imgHtml);
								let imgTitle;
								if (singleMedia.hasGpsData())
									imgTitle = util._t("#show-on-map");
								else
									imgTitle = util._t("#suggest-position-on-map");
								if (! env.isMobile.any())
									imgTitle += " [" + util._s(".map-link-shortcut") + "]";
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

						if (singleMedia === null && env.currentAlbum.numPositionsInTree && ! env.options.save_data) {
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
							let imgAlt = util._t(".marker");
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
									imgTitle1 += " [" + util._s(".map-link-shortcut") + "]";
								imgObject.attr("title", imgTitle1);
								imgObject.attr("src", imgSrc1);
								markers += "<a class='map-popup-trigger'>" + imgObject.wrapAll('<div>').parent().html() + "</a>";
							}
							if (showDoubleMarker) {
								if (! env.isMobile.any())
									imgTitle2 += " [" + util._s(".map-link-shortcut") + "]";
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
								if (titleCount.hasOwnProperty(mode)) {
									let modeClass = mode;
									if (mode === "nonGps")
										modeClass = "non-gps";
									title += "<span class='" + modeClass + "'>" + titleCount[mode] + "</span>";
								}
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
								if (
									env.currentMedia !== null && (
										env.currentMedia.hasGpsData() ||
										typeof isPhp === "function" && env.options.user_may_suggest_location && env.options.request_password_email
									)
								) {
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
								env.lastMapPositionAndZoom = {center: env.mymap.getCenter(), zoom: env.mymap.getZoom()};
								$(".map-marker-centered").hide();
								$(".map-marker-centered-send-suggestion").hide();
								$("#you-can-suggest-photo-position").hide();
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
			let titleText, splittedTitle;
			splittedTitle = document.title.split("«");
			splittedTitle = splittedTitle.map(text => text.trim());
			titleText = splittedTitle.join(" « ");

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

	TopFunctions.scrollBottomThumbs = function(e, delta) {
		this.scrollLeft -= (delta * 80);
		e.preventDefault();
	};

	TopFunctions.scrollAlbum = function(e, delta) {
		this.scrollTop -= (delta * 80);
		e.preventDefault();
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
		menuF.setBooleanCookie("hideTitle", env.options.hide_title);
		menuF.setBooleanCookie("hideBottomThumbnails", env.options.hide_bottom_thumbnails);
		menuF.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);
		menuF.setBooleanCookie("hideTags", env.options.hide_tags);
		menuF.updateMenu();

		if (util.isPopup()) {
			mapF.updatePopup();
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
			menuF.setBooleanCookie("hideTitle", env.options.hide_title);
			menuF.updateMenu();
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
			menuF.setBooleanCookie("hideBottomThumbnails", env.options.hide_bottom_thumbnails);
			menuF.updateMenu();
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

	TopFunctions.toggleSaveData = function(ev) {
		if (ev.which === undefined || [1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.save_data = ! env.options.save_data;
			menuF.setBooleanCookie("saveData", env.options.save_data);

			if (env.options.save_data)
				// do not optimize image formats
				env.devicePixelRatio = 1;
			else
				env.devicePixelRatio =  window.devicePixelRatio || 1;

			menuF.updateMenu();
		}
		return false;
	};

	TopFunctions.toggleDescriptions = function(ev) {
		if (ev.which === undefined || [1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.hide_descriptions = ! env.options.hide_descriptions;
			menuF.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);

			if (util.isPopup() || env.currentMedia === null && env.currentAlbum.media.length) {
				util.setMediaOptions();
			}
			util.adaptMediaCaptionHeight(false);
			if (! util.isPopup() && env.currentMedia === null && env.currentAlbum.subalbums.length) {
				util.setSubalbumsOptions();
			}
			util.setDescriptionOptions();
			util.correctElementPositions();

			menuF.updateMenu();
			if (util.isPopup()) {
				mapF.updatePopup();
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
			menuF.setBooleanCookie("hideTags", env.options.hide_tags);

			if (util.isPopup() || env.currentMedia === null && env.currentAlbum.media.length) {
				util.setMediaOptions();
			}
			util.adaptMediaCaptionHeight(false);
			if (! util.isPopup() && env.currentMedia === null && env.currentAlbum.subalbums.length) {
				util.setSubalbumsOptions();
			}
			util.setDescriptionOptions();
			util.correctElementPositions();

			menuF.updateMenu();
			if (util.isPopup()) {
				mapF.updatePopup();
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
			menuF.setBooleanCookie("albumsSlideStyle", env.options.albums_slide_style);
			menuF.updateMenu();
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
			menuF.setCookie("spacing", env.options.spacing);
			menuF.updateMenu();
			// menuF.setOptions();
			util.setMediaOptions();
			util.setSubalbumsOptions();
			if (env.currentAlbum.subalbums.length)
				util.adaptSubalbumCaptionHeight();

			if (util.isPopup()) {
				mapF.updatePopup();
			}
		}
		return false;
	};

	TopFunctions.toggleAlbumNames = function(ev) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.show_album_names_below_thumbs = ! env.options.show_album_names_below_thumbs;
			menuF.setBooleanCookie("showAlbumNamesBelowThumbs", env.options.show_album_names_below_thumbs);
			menuF.updateMenu();
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
			menuF.setBooleanCookie("showAlbumMediaCount", env.options.show_album_media_count);
			menuF.updateMenu();
			// menuF.setOptions();
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
			menuF.setBooleanCookie("showMediaNamesBelowThumbs", env.options.show_media_names_below_thumbs);
			menuF.updateMenu();
			// menuF.setOptions();
			util.setMediaOptions();
			// util.setSubalbumsOptions();
			if (env.currentAlbum.media.length)
				util.adaptMediaCaptionHeight(false);

			if (util.isPopup()) {
				mapF.updatePopup();
				util.adaptMediaCaptionHeight(true);
			}
		}
		return false;
	};

	TopFunctions.toggleAlbumsSquare = function(ev) {
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.options.album_thumb_type = env.options.album_thumb_type.indexOf("square") > -1 ? "album_fit" : "album_square";
			menuF.setCookie("albumThumbType", env.options.album_thumb_type);
			menuF.updateMenu();
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
			menuF.setCookie("mediaThumbType", env.options.media_thumb_type);
			menuF.updateMenu();
			if (env.currentAlbum.media.length) {
				let highlightedSingleMediaId = $("#thumbs .highlighted img.thumbnail").attr("id");
				env.currentAlbum.showMedia();
				if (env.currentMedia !== null) {
					util.scrollBottomMediaToHighlightedThumb(util.addMediaLazyLoader);
				} else {
					util.scrollAlbumViewToHighlightedThumb($("#" + highlightedSingleMediaId).parent().parent());
				}
			}

			if (util.isPopup()) {
				mapF.updatePopup();
				let highlightedSingleMediaInPopupId = $("#popup-images-wrapper .highlighted img.thumbnail").attr("id");
				env.mapAlbum.showMedia();
				$("#popup-images-wrapper .highlighted").removeClass("highlighted");
				util.scrollPopupToHighlightedThumb($("#" + highlightedSingleMediaInPopupId));
			}
		}
		return false;
	};

	TopFunctions.prototype.restoreSettings = function(ev) {

		// menuF.setBooleanCookie("hideTitle", env.options.hide_title);
		// menuF.setBooleanCookie("hideDescriptions", env.options.hide_descriptions);
		// menuF.setBooleanCookie("hideTags", env.options.hide_tags);
		// menuF.setBooleanCookie("hideBottomThumbnails", env.options.hide_bottom_thumbnails);
		// menuF.setBooleanCookie("saveData", env.options.save_data);
		// menuF.setBooleanCookie("albumsSlideStyle", env.options.albums_slide_style);
		// menuF.setBooleanCookie("spacing", env.options.thumb_spacing);
		// menuF.setBooleanCookie("showAlbumNamesBelowThumbs", env.options.show_album_names_below_thumbs);
		// menuF.setBooleanCookie("showAlbumMediaCount", env.options.show_album_media_count);
		// menuF.setBooleanCookie("showMediaNamesBelowThumbs", env.options.show_media_names_below_thumbs);
		// menuF.setCookie("albumThumbType", env.options.album_thumb_type);
		// menuF.setCookie("mediaThumbType", env.options.media_thumb_type);

		// var oldOptions = {};
		// oldOptions.hide_title = env.options.hide_title;
		// oldOptions.show_album_media_count = env.options.show_album_media_count;
		//
		// oldOptions.albums_slide_style = env.options.albums_slide_style;
		// oldOptions.album_thumb_type = env.options.album_thumb_type;
		// oldOptions.show_album_names_below_thumbs = env.options.show_album_names_below_thumbs;
		//
		// oldOptions.media_thumb_type = env.options.media_thumb_type;
		// oldOptions.show_media_names_below_thumbs = env.options.show_media_names_below_thumbs;
		//
		// oldOptions.hide_descriptions = env.options.hide_descriptions;
		// oldOptions.hide_tags = env.options.hide_tags;
		// oldOptions.spacing = env.options.spacing;
		// oldOptions.hide_bottom_thumbnails = env.options.hide_bottom_thumbnails;
		// oldOptions.save_data = env.options.save_data;
		// // oldOptions.default_album_name_sort = env.options.default_album_name_sort;
		// // oldOptions.default_album_reverse_sort = env.options.default_album_reverse_sort;
		// // oldOptions.default_media_name_sort = env.options.default_media_name_sort;
		// // oldOptions.default_media_reverse_sort = env.options.default_media_reverse_sort;
		// var promise = menuF.getOptions(true);
		// promise.then(
		// 	function optionsHaveBeenReset() {
		// 		// menuF.setOptions();

		if (env.defaultOptions.default_album_name_sort !== env.options.default_album_name_sort) {
			env.options.default_album_name_sort = env.defaultOptions.default_album_name_sort;
			menuF.setBooleanCookie("albumNameSortRequested", env.options.default_album_name_sort);
			env.currentAlbum.sortAlbumsMedia();
		}
		if (env.defaultOptions.default_album_reverse_sort !== env.options.default_album_reverse_sort) {
			env.options.default_album_reverse_sort = env.defaultOptions.default_album_reverse_sort;
			menuF.setBooleanCookie("albumReverseSortCookie", env.options.default_album_reverse_sort);
			env.currentAlbum.sortAlbumsMedia();
		}
		if (env.defaultOptions.default_media_name_sort !== env.options.default_media_name_sort) {
			env.options.default_media_name_sort = env.defaultOptions.default_media_name_sort;
			menuF.setBooleanCookie("mediaNameSortRequested", env.options.default_media_name_sort);
			env.currentAlbum.sortAlbumsMedia();
			if (util.isPopup())
				env.mapAlbum.sortAlbumsMedia();
		}
		if (env.defaultOptions.default_media_reverse_sort !== env.options.default_media_reverse_sort) {
			env.options.default_media_reverse_sort = env.defaultOptions.default_media_reverse_sort;
			menuF.setBooleanCookie("mediaReverseSortRequested", env.options.default_media_reverse_sort);
			env.currentAlbum.sortAlbumsMedia();
			if (util.isPopup())
				env.mapAlbum.sortAlbumsMedia();
		}

		if (env.defaultOptions.show_album_media_count !== env.options.show_album_media_count) {
			// env.options.show_album_media_count = env.defaultOptions.show_album_media_count;
			TopFunctions.toggleMediaCount(ev);
		}
		if (env.defaultOptions.hide_title !== env.options.hide_title) {
			// env.options.hide_title = env.defaultOptions.hide_title;
			TopFunctions.toggleTitle(ev);
		}

		if (env.defaultOptions.albums_slide_style !== env.options.albums_slide_style) {
			// env.options.albums_slide_style = env.defaultOptions.albums_slide_style;
			TopFunctions.toggleSlideMode(ev);
		}
		if (env.defaultOptions.album_thumb_type !== env.options.album_thumb_type) {
			// env.options.album_thumb_type = env.defaultOptions.album_thumb_type;
			TopFunctions.toggleAlbumsSquare(ev);
		}
		if (env.defaultOptions.show_album_names_below_thumbs !== env.options.show_album_names_below_thumbs) {
			// env.options.show_album_names_below_thumbs = env.defaultOptions.show_album_names_below_thumbs;
			TopFunctions.toggleAlbumNames(ev);
		}

		if (env.defaultOptions.media_thumb_type !== env.options.media_thumb_type) {
			// env.options.media_thumb_type = env.defaultOptions.media_thumb_type;
			TopFunctions.toggleMediaSquare(ev);
		}
		if (env.defaultOptions.show_media_names_below_thumbs !== env.options.show_media_names_below_thumbs) {
			// env.options.show_media_names_below_thumbs = env.defaultOptions.show_media_names_below_thumbs;
			TopFunctions.toggleMediaNames(ev);
		}

		if (env.defaultOptions.hide_descriptions !== env.options.hide_descriptions) {
			// env.options.hide_descriptions = env.defaultOptions.hide_descriptions;
			TopFunctions.toggleDescriptions(ev);
		}
		if (env.defaultOptions.hide_tags !== env.options.hide_tags) {
			// env.options.hide_tags = env.defaultOptions.hide_tags;
			TopFunctions.toggleTags(ev);
		}
		if (env.defaultOptions.thumb_spacing !== env.options.spacing) {
			// env.options.spacing = env.defaultOptions.spacing;
			TopFunctions.toggleSpacing(ev);
		}
		if (env.defaultOptions.hide_bottom_thumbnails !== env.options.hide_bottom_thumbnails) {
			// env.options.hide_bottom_thumbnails = env.defaultOptions.hide_bottom_thumbnails;
			TopFunctions.toggleBottomThumbnails(ev);
		}
		if (env.defaultOptions.save_data !== env.options.save_data) {
			// env.options.save_data = env.defaultOptions.save_data;
			TopFunctions.toggleSaveData(ev);
		}

		if (env.defaultOptions.search_inside_words !== env.options.search_inside_words) {
			util.toggleInsideWordsSearch();
		}
		if (env.defaultOptions.search_any_word !== env.options.search_any_word) {
			util.toggleAnyWordSearch();
		}
		if (env.defaultOptions.search_case_sensitive !== env.options.search_case_sensitive) {
			util.toggleCaseSensitiveSearch();
		}
		if (env.defaultOptions.search_accent_sensitive !== env.options.search_accent_sensitive) {
			util.toggleAccentSensitiveSearch();
		}
		if (env.defaultOptions.search_tags_only !== env.options.search_tags_only) {
			util.toggleTagsOnlySearch();
		}
		if (env.defaultOptions.search_current_album !== env.options.search_current_album) {
			util.toggleCurrentAbumSearch();
		}

		if (env.defaultOptions.show_big_virtual_folders !== env.options.show_big_virtual_folders) {
			util.toggleBigAlbumsShow();
		}

		menuF.updateMenu();
		menuF.setOptions();

		if (env.currentMedia === null && env.currentAlbum.subalbums.length && $("#subalbums").is(":visible")) {
			util.adaptSubalbumCaptionHeight();
		}
		if (env.currentMedia === null && env.currentAlbum.media.length && $("#thumbs").is(":visible")) {
			util.adaptMediaCaptionHeight();
		}

		$("#settings-restored").stop().fadeIn(
			200,
			function() {
				$("#settings-restored").fadeOut(2500);
			}
		);
		// 	}
		// );
		return false;
	};

	TopFunctions.generateMapFromSubalbum = function(ev, from) {
		var subalbumPromise = ev.data.ithSubalbum.toAlbum(util.errorThenGoUp, {getMedia: false, getPositions: ! env.options.save_data});
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
		if (env.currentMedia !== null) {
			if (env.currentMedia.hasGpsData()) {
				pointList = new PositionsAndMedia([env.currentMedia.generatePositionAndMedia()]);
			} else if (typeof isPhp === "function" && env.options.user_may_suggest_location && env.options.request_password_email) {
				pointList = new PositionsAndMedia([]);
			}
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

	TopFunctions.prepareAndDoPopupUpdate = function() {
		mapF.calculatePopupSizes();

		if (env.popup) {
			env.popup.remove();
			$(".leaflet-popup").remove();
		}
		$(".modal-close").hide();
		env.popup = L.popup(
			{
				maxWidth: env.maxWidthForPopupContent,
				maxHeight: env.maxHeightForPopupContent,
				autoPan: false,
				className: "media-popup"
			}
		).setContent(env.titleWrapper)
		.setLatLng(env.mapAlbum.positionsAndMediaInTree.averagePosition())
		.openOn(env.mymap);

		$(".media-popup .leaflet-popup-close-button").off("click").on(
			"click",
			function() {
				$(".modal-close").show();
				// focus the map, so that the arrows and +/- work
				$("#mapdiv").focus();
			}
		);

		mapF.addPopupMover();

		var promise = phFl.endPreparingAlbumAndKeepOn(env.mapAlbum, null, null);
		promise.then(
			function() {
				env.mapAlbum.showMedia();
				mapF.updatePopup();
				if ($("#" + env.highlightedObjectId).length) {
					util.scrollPopupToHighlightedThumb($("#" + env.highlightedObjectId));
				}
				$("#loading").hide();
			}
		);
	};

	TopFunctions.updateMapAlbumOnMapClick = function(evt, clusters, updateMapAlbum = true, shiftOrControl = false) {

		return new Promise(
			function(resolve_updateMapAlbumOnMapClick, reject_updateMapAlbumOnMapClick) {
				var i;
				var clickedPosition = evt.latlng;

				$("#loading").show();

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
				var positionsAndMediaInCluster = new PositionsAndMedia([]);
				for(i = 0; i < currentCluster._clusterMarkers.length; i ++) {
					currentCluster.data.mediaList = currentCluster.data.mediaList.concat(currentCluster._clusterMarkers[i].data.mediaList);
					positionsAndMediaInCluster.push(new PositionAndMedia(
							{
								lat: currentCluster._clusterMarkers[i].position.lat,
								lng: currentCluster._clusterMarkers[i].position.lng,
								mediaList: currentCluster._clusterMarkers[i].data.mediaList,
								count: currentCluster._clusterMarkers[i].data.mediaList.length
							}
						)
					);
				}

				var clusterPositionsAlreadyInPopup = new PositionsAndMedia([]);
				var clusterPositionsNotYetInPopup = new PositionsAndMedia([]);
				if (! env.mapAlbum.isEmpty()) {
					for (indexPositions = 0; indexPositions < positionsAndMediaInCluster.length; indexPositions ++) {
						let positionsAndMediaElement = positionsAndMediaInCluster[indexPositions];
						if (env.mapAlbum.positionsAndMediaInTree.findIndex(element => positionsAndMediaElement.matchPosition(element)) !== -1)
							// the position was present
							clusterPositionsAlreadyInPopup.push(positionsAndMediaElement);
						else
							// the position was not present
							clusterPositionsNotYetInPopup.push(positionsAndMediaElement);
					}
				} else {
					clusterPositionsNotYetInPopup = positionsAndMediaInCluster;
				}

				var clickHistoryElement, shiftKey, ctrlKey;
				if (evt.shiftKey !== undefined) {
					shiftKey = evt.shiftKey;
					ctrlKey = evt.ctrlKey;
				} else {
					shiftKey = evt.originalEvent.shiftKey;
					ctrlKey = evt.originalEvent.ctrlKey;
				}
				if (shiftOrControl && evt.fromAddOrSubtract === undefined) {
					if ($('.shift-or-control').length)
						$('.shift-or-control .leaflet-popup-close-button')[0].click();

					let addDimmed = "", subtractDimmed = "";
					if (env.mapAlbum.isEmpty() || ! clusterPositionsAlreadyInPopup.length) {
						// shiftKey = true;
						// ctrlKey = false;
						subtractDimmed = " dimmed";
					} else if (! clusterPositionsNotYetInPopup.length) {
						// shiftKey = false;
						// ctrlKey = true;
						addDimmed = " dimmed";
					}

					// show a popup with + and - in order to tell the app if we must add (shift) or remove (control)
					L.popup({className: "shift-or-control"})
						.setLatLng(currentCluster.averagePosition)
						.setContent('<div class="cluster-add' + addDimmed + '">+</div><div class="cluster-subtract' + subtractDimmed + '">-</div>')
						.addTo(env.mymap)
						.openOn(env.mymap);

					$("#loading").hide();

					if (! addDimmed) {
						$(".cluster-add").off("click").on(
							"click",
							function(ev) {
								$(".shift-or-control .leaflet-popup-close-button")[0].click();
								ev.shiftKey = true;
								ev.ctrlKey = false;
								ev.latlng = evt.latlng;
								ev.fromAddOrSubtract = true;
								let updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, clusters, updateMapAlbum);
								updatePromise.then(
									TopFunctions.prepareAndDoPopupUpdate,
									function() {
										console.trace();
									}
								);
							}
						);
					}

					if (! subtractDimmed) {
						$(".cluster-subtract").off("click").on(
							"click",
							function(ev) {
								$(".shift-or-control .leaflet-popup-close-button")[0].click();
								ev.shiftKey = false;
								ev.ctrlKey = true;
								ev.latlng = evt.latlng;
								ev.fromAddOrSubtract = true;
								let updatePromise = TopFunctions.updateMapAlbumOnMapClick(ev, clusters, updateMapAlbum);
								updatePromise.then(
									TopFunctions.prepareAndDoPopupUpdate,
									function() {
										console.trace();
									}
								);
							}
						);
					}
					return;
				}

				if (evt !== null && evt.latlng !== undefined) {
					clickHistoryElement = {
							latlng: clusters[index].averagePosition,
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

				var indexPositions, imageLoadPromise, mediaListElement;
				if (ctrlKey) {
					if (! env.mapAlbum.isEmpty()) {
						// control click: remove the points

						env.mapAlbum.clickHistory.push(clickHistoryElement);

						var matchingIndex;
						for (indexPositions = 0; indexPositions < clusterPositionsAlreadyInPopup.length; indexPositions ++) {
							let positionsAndMediaElement = clusterPositionsAlreadyInPopup[indexPositions];
							matchingIndex = env.mapAlbum.positionsAndMediaInTree.findIndex((element) => positionsAndMediaElement.matchPosition(element));
							// remove the position from the positions list
							env.mapAlbum.positionsAndMediaInTree.splice(matchingIndex, 1);
							env.mapAlbum.numPositionsInTree = env.mapAlbum.positionsAndMediaInTree.length;

							// ...and the corresponding photos from the media list
							for (iMediaPosition = 0; iMediaPosition < positionsAndMediaElement.mediaList.length; iMediaPosition ++) {
								mediaListElement = positionsAndMediaElement.mediaList[iMediaPosition];
								matchingIndex = env.mapAlbum.media.findIndex(singleMedia => singleMedia.isEqual(mediaListElement));
								env.mapAlbum.media.splice(matchingIndex, 1);
							}
						}

						if (! env.mapAlbum.media.length) {
							$("#loading").hide();
							if (util.isShiftOrControl())
								$(".shift-or-control .leaflet-popup-close-button")[0].click();
							$(".media-popup .leaflet-popup-close-button")[0].click();
						} else {
							env.mapAlbum.numsMedia = env.mapAlbum.media.imagesAndVideosCount();
							endPreparingMapAlbumAndUpdatePopup();
						}
					}
				} else {
					// not control click: add (with shift) or replace (without shift) the positions
					imageLoadPromise = new Promise(
						function(resolve_imageLoad) {
							var indexPositions;

							if (env.mapAlbum.isEmpty() || env.mapAlbum.numsMedia.imagesAndVideosTotal() === 0 || ! shiftKey) {
								// normal click or shift click without previous content

								env.mapAlbum = util.initializeMapAlbum();
								env.mapAlbum.clickHistory = [clickHistoryElement];
								env.mapAlbum.addMediaFromPositionsToMapAlbum(positionsAndMediaInCluster, resolve_imageLoad);
							} else if (clusterPositionsNotYetInPopup.length){
								// shift-click with previous content
								env.mapAlbum.clickHistory.push(clickHistoryElement);

								// determine what positions aren't yet in selectedPositions array
								for (indexPositions = 0; indexPositions < clusterPositionsNotYetInPopup.length; indexPositions ++) {
									let positionsAndMediaElement = clusterPositionsNotYetInPopup[indexPositions];
									env.mapAlbum.positionsAndMediaInTree.push(positionsAndMediaElement);
									env.mapAlbum.numPositionsInTree = env.mapAlbum.positionsAndMediaInTree.length;
								}
								env.mapAlbum.addMediaFromPositionsToMapAlbum(clusterPositionsNotYetInPopup, resolve_imageLoad);
							}
							$("#loading").hide();
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
	TopFunctions.prototype.toggleSaveData = TopFunctions.toggleSaveData;
	TopFunctions.prototype.updateMapAlbumOnMapClick = TopFunctions.updateMapAlbumOnMapClick;
	TopFunctions.prototype.setTitle = TopFunctions.setTitle;

	window.TopFunctions = TopFunctions;
}());
