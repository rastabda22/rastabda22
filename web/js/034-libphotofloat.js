(function() {
	var util = new Utilities();

	/* constructor */
	function PhotoFloat() {
	}

	PhotoFloat.getStopWords = function() {
		if (! env.options.search_inside_words && env.options.use_stop_words) {
			// before getting the file check whether it's in the cache
			if (env.cache.hasOwnProperty("stopWords") && env.cache.stopWords.length) {
				return Promise.resolve();
			} else {
				return new Promise(
					function(resolve_getStopWords) {
						env.cache.stopWords = [];
						// get the file
						// var stopWordsFile = util.pathJoin(["cache", 'stopwords.json']);
						var promise = PhotoFloat.getJsonFile("stopwords.json");
						promise.then(
							function(stopWords) {
								env.cache.stopWords = stopWords.stopWords;
								resolve_getStopWords();
							},
							function(jqXHR) {
								// TO DO something different should be made here?
								util.errorThenGoUp(jqXHR.status);
							}
						);
						// var ajaxOptions = {
						// 	type: "GET",
						// 	dataType: "json",
						// 	url: stopWordsFile,
						// 	success: function(stopWords) {
						// 		env.cache.stopWords = stopWords.stopWords;
						// 		resolve_getStopWords();
						// 	}
						// };
						// ajaxOptions.error = function(jqXHR) {
						// 	// TO DO something different should be made here?
						// 	util.errorThenGoUp(jqXHR.status);
						// };
						// $.ajax(ajaxOptions);
					}
				);
			}
		} else {
			// stop words aren't used
			env.cache.stopWords = [];
			return Promise.resolve();
		}
	};

	PhotoFloat.getJsonFile = function(jsonRelativeFileName) {
		if (env.cache.inexistentFiles.indexOf(jsonRelativeFileName) !== -1) {
			return Promise.reject();
		} else {
			return new Promise(
				function(resolve_getJsonFile, reject_getJsonFile) {
					$.ajax(
						{
							url: util.pathJoin(["cache", jsonRelativeFileName]),
							type: "GET",
							dataType: "json",
							success: function(albumOrPositionsOrMedia) {
								resolve_getJsonFile(albumOrPositionsOrMedia);
							},
							error: function() {
								env.cache.inexistentFiles.push(jsonRelativeFileName);
								reject_getJsonFile();
							}
						}
					);
				}
			);
		}
	};

	PhotoFloat.getMediaAndPositions = function(theAlbumCacheBase, {mustGetMedia, mustGetPositions}) {

		var mediaPromise = getMedia(theAlbumCacheBase);
		var positionsPromise = getPositions(theAlbumCacheBase);

		return new Promise(
			function(resolve_AddPositionsAndMedia) {
				Promise.all([mediaPromise, positionsPromise]).then(
					function([mediaGot, positionsGot]) {
						resolve_AddPositionsAndMedia([mediaGot, positionsGot]);
					}
				);
			}
		);
		// end of function getMediaAndPositions body

		// auxiliary functions
		function getMedia(cacheBase) {
			return new Promise(
				function(resolve_getMedia, reject_getMedia) {
					var mediaJsonFile;
					// are media still missing?
					if (mustGetMedia) {
						mediaJsonFile = cacheBase + '.media.json';
						var promise = PhotoFloat.getJsonFile(mediaJsonFile);
						promise.then(
							function(object) {
								var media = new Media (object);
								resolve_getMedia(media);
							},
							function() {
								resolve_getMedia(false);
							}
						);
					} else {
						resolve_getMedia(false);
					}
				}
			);
		}

		function getPositions(cacheBase) {
			return new Promise(
				function(resolve_getPositions, reject_getPositions) {
					var positionJsonFile;
					// are positions still missing?
					if (mustGetPositions) {
						positionJsonFile = cacheBase + '.positions.json';
						var promise = PhotoFloat.getJsonFile(positionJsonFile);
						promise.then(
							function(object) {
								var positions = new PositionsAndMedia(object);
								resolve_getPositions(positions);
							},
							function() {
								resolve_getPositions(false);
							}
						);
					} else {
						resolve_getPositions(false);
					}
				}
			);
		}
	};

	PhotoFloat.prototype.convertComplexCombinationsIntoLists = function(codesComplexCombination) {
		var albumCombinationList, mediaCombinationList;
		var albumCombination = codesComplexCombination.split(',')[0];
		if (albumCombination === "")
			albumCombinationList = [];
		else
			albumCombinationList = albumCombination.split('-');
		var mediaCombination = codesComplexCombination.split(',')[1];
		if (mediaCombination === "")
			mediaCombinationList = [];
		else
			mediaCombinationList = mediaCombination.split('-');
		return [albumCombinationList, mediaCombinationList];
	};

	PhotoFloat.isProtectedCacheBase = function(cacheBase) {
		return cacheBase.indexOf(env.options.protected_directories_prefix) === 0;
	};

	PhotoFloat.getAlbumFromSingleUnprotectedCacheBaseWithExternalMediaAndPositions = function(unprotectedCacheBase, {getMedia, getPositions}) {
		// this function is called when the album isn't in the cache
		// a brand new album is created

		return new Promise(
			function(resolve_getSingleUnprotectedCacheBase, reject_getSingleUnprotectedCacheBase) {
				var jsonFile = unprotectedCacheBase + ".json";

				var promise = PhotoFloat.getJsonFile(jsonFile);
				promise.then(
					function unprotectedFileExists(object) {
						var album = new Album(object);
						if (album.hasOwnProperty("media"))
							album.numsMedia = album.media.imagesAndVideosCount();
						album.includedFilesByCodesSimpleCombination = new IncludedFiles({",": {}});
						if (album.hasOwnProperty("media"))
							album.includedFilesByCodesSimpleCombination[","].mediaGot = true;
						if (album.hasOwnProperty("positionsAndMediaInTree"))
							album.includedFilesByCodesSimpleCombination[","].positionsGot = true;
						var mustGetMedia = getMedia && ! album.includedFilesByCodesSimpleCombination[","].hasOwnProperty("mediaGot");
						var mustGetPositions = getPositions && ! album.includedFilesByCodesSimpleCombination[","].hasOwnProperty("positionsGot");
						var promise = PhotoFloat.getMediaAndPositions(album.cacheBase, {mustGetMedia: mustGetMedia,mustGetPositions: mustGetPositions});
						promise.then(
							function([mediaGot, positionsGot]) {
								if (mediaGot) {
									album.media = mediaGot;
									album.includedFilesByCodesSimpleCombination[","].mediaGot = true;
								}

								if (positionsGot) {
									album.positionsAndMediaInTree = positionsGot;
									album.numPositionsInTree = album.positionsAndMediaInTree.length;
									album.includedFilesByCodesSimpleCombination[","].positionsGot = true;
								}

								resolve_getSingleUnprotectedCacheBase(album);
							},
							function() {
								console.trace();
							}
						);
					},
					function unprotectedFileDoesntExist() {
						// execution arrives here if the json file doesn't exist
						var emptyAlbum = new Album(unprotectedCacheBase);
						emptyAlbum.empty = true;
						emptyAlbum.includedFilesByCodesSimpleCombination = new IncludedFiles({",": false});

						reject_getSingleUnprotectedCacheBase(emptyAlbum);
					}
				);
			}
		);
	};

	PhotoFloat.protectedDirectoriesToGet = function() {
		var iAlbumPassword, iMediaPassword, albumGuessedPassword, mediaGuessedPassword, protectedDirectory;
		var result = [];

		for (iAlbumPassword = 0; iAlbumPassword < env.guessedPasswordsMd5.length; iAlbumPassword ++) {
			albumGuessedPassword = env.guessedPasswordsMd5[iAlbumPassword];
			protectedDirectory = env.options.protected_directories_prefix + albumGuessedPassword + ',';
			result.push(protectedDirectory);
		}
		for (iMediaPassword = 0; iMediaPassword < env.guessedPasswordsMd5.length; iMediaPassword ++) {
			mediaGuessedPassword = env.guessedPasswordsMd5[iMediaPassword];
			protectedDirectory = env.options.protected_directories_prefix + ',' + mediaGuessedPassword;
			result.push(protectedDirectory);
		}
		for (iAlbumPassword = 0; iAlbumPassword < env.guessedPasswordsMd5.length; iAlbumPassword ++) {
			albumGuessedPassword = env.guessedPasswordsMd5[iAlbumPassword];
			for (iMediaPassword = 0; iMediaPassword < env.guessedPasswordsMd5.length; iMediaPassword ++) {
				mediaGuessedPassword = env.guessedPasswordsMd5[iMediaPassword];
				protectedDirectory = env.options.protected_directories_prefix + albumGuessedPassword + ',' + mediaGuessedPassword;
				result.push(protectedDirectory);
			}
		}
		return result;
	};



	PhotoFloat.prototype.mergeProtectedSubalbum = function(subalbum, protectedSubalbum, codesSimpleCombination, number) {
		if (subalbum.hasOwnProperty("randomMedia") && protectedSubalbum.hasOwnProperty("randomMedia"))
			subalbum.randomMedia = subalbum.randomMedia.concat(protectedSubalbum.randomMedia);
		else
			subalbum.randomMedia = protectedSubalbum.randomMedia;
		subalbum.numsMediaInSubTree.sum(protectedSubalbum.numsMediaInSubTree);
		subalbum.sizesOfSubTree.sum(protectedSubalbum.sizesOfSubTree);
		subalbum.sizesOfAlbum.sum(protectedSubalbum.sizesOfAlbum);
		subalbum.numPositionsInTree += protectedSubalbum.numPositionsInTree;

		subalbum.nonGeotagged.numsMedia.sum(protectedSubalbum.nonGeotagged.numsMedia);
		subalbum.nonGeotagged.numsMediaInSubTree.sum(protectedSubalbum.nonGeotagged.numsMediaInSubTree);
		subalbum.nonGeotagged.sizesOfSubTree.sum(protectedSubalbum.nonGeotagged.sizesOfSubTree);
		subalbum.nonGeotagged.sizesOfAlbum.sum(protectedSubalbum.nonGeotagged.sizesOfAlbum);

		if (subalbum instanceof Album) {
			subalbum.initializeIncludedFilesByCodesSimpleCombinationProperty(codesSimpleCombination, number);
			subalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.countsGot = true;
		}
	};

	PhotoFloat.getAlbum = function(albumOrCacheBase, getAlbum_error, {getMedia = false, getPositions = false}, numsProtectedMediaInSubTree) {
		// getAlbum_error is a function, and is executed when the album cannot be retrieved:
		// either because it doesn't exist or is a protected one
		var albumForResolving = null;

		return new Promise(
			function(resolve_getAlbum) {
				var cacheBase, album;
				if (typeof albumOrCacheBase === "string") {
					cacheBase = albumOrCacheBase;
					album = env.cache.getAlbum(cacheBase);
				} else {
					album = albumOrCacheBase;
					cacheBase = album.cacheBase;
				}

				if (album && ! album.isEmpty()) {
					if (! album.hasOwnProperty("numsProtectedMediaInSubTree") && numsProtectedMediaInSubTree !== undefined) {
						// we arrive here when getAlbum is called by Subalbum.toAlbum():
						// the numsProtectedMediaInSubTree property was built in the subalbum, and now it's passed to the album
						album.numsProtectedMediaInSubTree = numsProtectedMediaInSubTree;
					}

					// add media and positions
					var mediaAndPositionsPromise;
					if (
						// map albums and search albums already have all the media and positions
						album.isCollection() ||
						// util.isMapCacheBase(cacheBase) || util.isSearchCacheBase(cacheBase) || util.isSelectionCacheBase(cacheBase) ||
						// the album hasn't unprotected content
						album.includedFilesByCodesSimpleCombination[","] === false
					) {
						// not adding media/positions  => go immediately to mediaAndPositionsPromise.then
						mediaAndPositionsPromise = Promise.resolve([false, false]);
						// mediaAndPositionsPromise = new Promise(
						// 	function(resolve) {
						// 		resolve([false, false]);
						// 	}
						// );
					} else {
						var mustGetMedia = getMedia && (
							! album.hasOwnProperty("media") ||
							album.includedFilesByCodesSimpleCombination[","] !== false && ! album.includedFilesByCodesSimpleCombination[","].hasOwnProperty("mediaGot")
						);
						var mustGetPositions = getPositions && (
							! album.hasOwnProperty("positionsAndMediaInTree") ||
							album.includedFilesByCodesSimpleCombination[","] !== false && ! album.includedFilesByCodesSimpleCombination[","].hasOwnProperty("positionsGot")
						);
						// this call to getMediaAndPositions adds positions and media of the unprotected album only
						mediaAndPositionsPromise = PhotoFloat.getMediaAndPositions(album.cacheBase, {mustGetMedia: mustGetMedia, mustGetPositions: mustGetPositions});
					}
					mediaAndPositionsPromise.then(
						function mediaAndPositionsGot([mediaGot, positionsGot]) {
							if (mediaGot) {
								if (! album.hasOwnProperty("media") || ! album.media.length)
									album.media = mediaGot;
								else
									// TO DO: verify that concat is enough
									album.media = album.media.concat(mediaGot);
									// album.media = util.arrayUnion(
									// 	album.media,
									// 	mediaGot,
									// 	function(singleMedia1, singleMedia2) {
									// 		return singleMedia1.isEqual(singleMedia2);
									// 	}
									// );
								album.includedFilesByCodesSimpleCombination[","].mediaGot = true;
							}

							if (positionsGot) {
								if (! album.hasOwnProperty("positionsAndMediaInTree") || ! album.positionsAndMediaInTree.length)
									album.positionsAndMediaInTree = positionsGot;
								else
									album.positionsAndMediaInTree.mergePositionsAndMedia(positionsGot);
								album.numPositionsInTree = album.positionsAndMediaInTree.length;
								album.includedFilesByCodesSimpleCombination[","].positionsGot = true;
							}

							if (! album.hasOwnProperty("numsProtectedMediaInSubTree") || album.hasUnloadedProtectedContent(getMedia, getPositions)) {
								var protectedContentPromise = album.addProtectedContent(getMedia, getPositions);
								protectedContentPromise.then(
									function() {
										thingsToBeDoneBeforeResolvingGetAlbum(album);
										resolve_getAlbum(album);
									},
									function() {
										if (getAlbum_error)
											getAlbum_error(album);
									}
								);
							} else {
								thingsToBeDoneBeforeResolvingGetAlbum(album);
								resolve_getAlbum(album);
							}
						},
						function() {
							console.trace();
						}
					);
				} else if (util.isMapCacheBase(cacheBase) || util.isSelectionCacheBase(cacheBase)) {
					// map and selection albums are not on server:
					// if the album hasn't been passed as argument and isn't in cache => it could have been passed with POST and be put in postData["packedAlbum"]
					// alert("alt");
					if (albumForResolving !== null) {
						resolve_getAlbum(albumForResolving);
					} else {
						// go to root album
						// execution arrives here if a map album is reloaded or opened from a link
						$("#loading").hide();
						let selector = "#error-nonexistent-map-album";
						if (util.isSelectionCacheBase(cacheBase))
							selector = "#error-nonexistent-selection-album";
						$(selector).stop().fadeIn(200);
						$(selector).fadeOut(2000);
						window.location.href = util.upHash();
					}
				} else {
					// album is false
					// neither the album has been passed as argument, nor is in cache, get it brand new
					var unprotectedCacheBasePromise = PhotoFloat.getAlbumFromSingleUnprotectedCacheBaseWithExternalMediaAndPositions(cacheBase, {getMedia: getMedia, getPositions: getPositions});
					unprotectedCacheBasePromise.then(
						function unprotectedAlbumGot(album) {
							if (! album.hasOwnProperty("numsProtectedMediaInSubTree") || album.hasUnloadedProtectedContent(getMedia, getPositions)) {
								var protectedContentPromise = album.addProtectedContent(getMedia, getPositions);
								protectedContentPromise.then(
									function() {
										thingsToBeDoneBeforeResolvingGetAlbum(album);
										resolve_getAlbum(album);
									},
									function() {
										console.trace();
									}
								);
							} else {
								thingsToBeDoneBeforeResolvingGetAlbum(album);
								resolve_getAlbum(album);
							}
						},
						function unprotectedAlbumUnexisting(emptyAlbum) {
							// look for a protected album: something must be there
							if (typeof numsProtectedMediaInSubTree !== "undefined") {
								emptyAlbum.numsProtectedMediaInSubTree = numsProtectedMediaInSubTree;
								numsProtectedMediaInSubTreePropertyIsThere();
							} else {
								// since the album hasn't unprotected content and no protected cache base has been processed yet, the numsProtectedMediaInSubTree property isn't there
								// It must be loaded in order to to know the complex combinations
								// The function getNumsProtectedMediaInSubTreeProperty will do that looking for and loading a protected album
								var numsProtectedMediaPromise = emptyAlbum.getNumsProtectedMediaInSubTreeProperty();
								numsProtectedMediaPromise.then(
									function() {
										numsProtectedMediaInSubTreePropertyIsThere();
									},
									function() {
										// neither the unprotected nor any protected album exists => nonexistent album
										if (getAlbum_error)
											getAlbum_error(emptyAlbum);
									}
								);
							}
							// end of unprotectedAlbumUnexisting function body

							function numsProtectedMediaInSubTreePropertyIsThere() {
								var protectedContentPromise = emptyAlbum.addProtectedContent(getMedia, getPositions);
								protectedContentPromise.then(
									function unprotectedAlbumUnexistingProtectedAlbumExisting() {
										thingsToBeDoneBeforeResolvingGetAlbum(emptyAlbum);
										resolve_getAlbum(emptyAlbum);
									},
									function unprotectedAlbumUnexistingProtectedAlbumUnexisting() {
										// neither the unprotected nor any protected album exists => nonexistent album
										if (getAlbum_error)
											getAlbum_error(emptyAlbum);
									}
								);
							}
						}
					);
				}
			}
		);
		// end of getalbum function

		function thingsToBeDoneBeforeResolvingGetAlbum(theAlbum) {
			var i;
			if (theAlbum.cacheBase === env.options.by_search_string) {
				// root of search albums: build the word list
				for (i = 0; i < theAlbum.subalbums.length; ++i) {
					if (env.searchWordsFromJsonFile.indexOf(theAlbum.subalbums[i].unicodeWords) === -1) {
						env.searchWordsFromJsonFile.push(theAlbum.subalbums[i].unicodeWords);
						env.searchAlbumCacheBasesFromJsonFile.push(theAlbum.subalbums[i].cacheBase);
						env.searchAlbumSubalbumsFromJsonFile.push(theAlbum.subalbums[i]);
					}
				}
			} else if (! theAlbum.isSearch()) {
				theAlbum.removeUnnecessaryPropertiesAndAddParentToMedia();
			}

			if (! theAlbum.isMap())
				theAlbum.generateAncestorsCacheBase();
			if (! env.cache.getAlbum(theAlbum.cacheBase))
				env.cache.putAlbum(theAlbum);
		}
		//////// end of thingsToBeDoneBeforeResolvingGetAlbum function

	};

	PhotoFloat.encodeHash = function(cacheBase, singleMedia, foundAlbumCacheBase, collectionCacheBase) {
		var hash;

		if (collectionCacheBase !== undefined && collectionCacheBase !== null) {
			collectionCacheBase = PhotoFloat.convertHashToCacheBase(collectionCacheBase);
			foundAlbumCacheBase = PhotoFloat.convertHashToCacheBase(foundAlbumCacheBase);
		}

		if (singleMedia !== null) {
			// media hash
			if (util.isFolderCacheBase(cacheBase)) {
				if (collectionCacheBase === undefined || collectionCacheBase === null)
					// media in folders album, count = 2
					hash = util.pathJoin([
						cacheBase,
						singleMedia.cacheBase
					]);
				else
					// media in found album or in one of its subalbum, count = 4
					hash = util.pathJoin([
						cacheBase,
						foundAlbumCacheBase,
						collectionCacheBase,
						singleMedia.cacheBase
					]);
			} else if (
				util.isByDateCacheBase(cacheBase) ||
				util.isByGpsCacheBase(cacheBase) ||
				util.isSearchCacheBase(cacheBase) && (collectionCacheBase === undefined || collectionCacheBase === null) ||
				util.isSelectionCacheBase(cacheBase) ||
				util.isMapCacheBase(cacheBase)
			)
				// media in date or gps album, count = 3
				hash = util.pathJoin([
					cacheBase,
					singleMedia.foldersCacheBase,
					singleMedia.cacheBase
				]);
		} else {
			// no media: album hash
			if (collectionCacheBase !== undefined && collectionCacheBase !== null)
				// found album or one of its subalbums, count = 3
				hash = util.pathJoin([
					cacheBase,
					foundAlbumCacheBase,
					collectionCacheBase
				]);
			else
				// plain search album, count = 1
				// folders album, count = 1
				hash = cacheBase;
		}
		return env.hashBeginning + hash;
	};

	PhotoFloat.decodeHash = function(hash) {
		// decodes the hash and returns its components

		var cacheBaseParts, cacheBasePartsCount, albumCacheBase, mediaFolderCacheBase = null, mediaCacheBase = null;
		var collectionCacheBase = null, foundAlbumCacheBase = null;

		var cacheBase = PhotoFloat.convertHashToCacheBase(hash);

		if (! cacheBase.length) {
			albumCacheBase = env.options.folders_string;
		} else {
			// split on the slash and count the number of parts
			cacheBaseParts = cacheBase.split("/");
			cacheBasePartsCount = cacheBaseParts.length;

			if (cacheBasePartsCount === 1) {
				// folders or gps or date hash: album only
				albumCacheBase = cacheBase;
			} else if (cacheBasePartsCount === 2) {
				// media in folders album: album, media
				albumCacheBase = cacheBaseParts[0];
				mediaCacheBase = cacheBaseParts[1];
			} else if (cacheBasePartsCount === 3) {
				// gps or date or search or selection hash: album, album where the image is, media
				// subfolder of search hash: album, search subalbum, search album
				if (util.isSearchCacheBase(cacheBaseParts[2]) || util.isSelectionCacheBase(cacheBaseParts[2])) {
					albumCacheBase = cacheBaseParts[0];
					foundAlbumCacheBase = cacheBaseParts[1];
					collectionCacheBase = cacheBaseParts[2];
				} else {
					albumCacheBase = cacheBaseParts[0];
					mediaFolderCacheBase = cacheBaseParts[1];
					mediaCacheBase = cacheBaseParts[2];
				}
			} else if (cacheBasePartsCount === 4) {
				albumCacheBase = cacheBaseParts[0];
				foundAlbumCacheBase = cacheBaseParts[1];
				collectionCacheBase = cacheBaseParts[2];
				mediaCacheBase = cacheBaseParts[3];
			}
		}
		return [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase];
	};

	PhotoFloat.prototype.parseHashAndReturnAlbumAndMediaIndex = function(hash) {
		return new Promise(
			function(resolve_parseHash, reject_parseHash) {
				var removedStopWords = [];
				var searchWordsFromUser = [], searchWordsFromUserNormalized = [], searchWordsFromUserNormalizedAccordingToOptions = [];
				var albumCacheBaseToGet, albumCacheBases = [], wordSubalbums = new Subalbums([]);
				var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase] = PhotoFloat.decodeHash(hash);
				var indexWords, indexAlbums, wordsWithOptionsString;
				// this vars are defined here and not at the beginning of the file because the options must have been read

				$("#message-too-many-images").css("display", "");
				$(".search-failed").hide();
				// $("#media-view").removeClass("hidden");
				// $("ul#right-menu li#album-search").removeClass("hidden");
				// $("ul#right-menu li#any-word").addClass("active").off("click").on("click", util.toggleAnyWordSearch);
				$("#album-view, #subalbums, #thumbs").removeClass("hidden");

				if (albumCacheBase) {
					if (util.isSearchCacheBase(albumCacheBase)) {
						// encoded hashes must be preserved, in order to make tag only search work when a dash is inside the tag
						let splittedCacheBase = albumCacheBase.split("%2D");
						splittedCacheBase = splittedCacheBase.map(hash => decodeURI(hash));
						albumCacheBase = splittedCacheBase.join("%2D");
					} else {
						albumCacheBase = decodeURI(albumCacheBase);
					}

					let splittedAlbumCacheBase = albumCacheBase.split(env.options.cache_folder_separator);
					if (util.isSearchCacheBase(albumCacheBase)) {

						// wordsWithOptionsString = albumCacheBase.substring(env.options.by_search_string.length + 1);
						wordsWithOptionsString = splittedAlbumCacheBase[1];
						var wordsAndOptions = wordsWithOptionsString.split(env.options.search_options_separator);
						var wordsString = wordsAndOptions[wordsAndOptions.length - 1];
						var wordsStringOriginal = wordsString.replace(/_/g, ' ');
						// the normalized words are needed in order to compare with the search cache json files names, which are normalized
						var wordsStringNormalizedAccordingToOptions = util.normalizeAccordingToOptions(wordsStringOriginal);
						var wordsStringNormalized = wordsStringOriginal.toLowerCase();
						wordsStringNormalized = util.removeAccents(wordsStringNormalized);
						if (wordsAndOptions.length > 1) {
							var searchOptions = wordsAndOptions.slice(0, -1);
							env.options.search_inside_words = searchOptions.includes('i');
							env.options.search_any_word = searchOptions.includes('n');
							env.options.search_case_sensitive = searchOptions.includes('c');
							env.options.search_accent_sensitive = searchOptions.includes('a');
							env.options.search_tags_only = searchOptions.includes('t');
							env.options.search_current_album = searchOptions.includes('o');
						}

						$("ul#right-menu #search-field").attr("value", decodeURIComponent(wordsStringOriginal));
						wordsString = util.normalizeAccordingToOptions(wordsString);
						if (env.options.search_tags_only) {
							searchWordsFromUser = [decodeURIComponent(wordsString).replace(/_/g, " ")];
							searchWordsFromUserNormalizedAccordingToOptions = [decodeURIComponent(wordsStringNormalizedAccordingToOptions)];
							searchWordsFromUserNormalized = [decodeURIComponent(wordsStringNormalized)];
							env.searchWords = [decodeURIComponent(wordsStringOriginal).replace(/_/g, " ")];
						} else {
							searchWordsFromUser = wordsString.split('_');
							searchWordsFromUserNormalizedAccordingToOptions = wordsStringNormalizedAccordingToOptions.split(' ');
							searchWordsFromUserNormalized = wordsStringNormalized.split(' ');
							env.searchWords = wordsStringOriginal.split(' ');
						}

						if (albumCacheBase === env.options.by_search_string) {
							env.searchAlbum = util.initializeSearchAlbumBegin(albumCacheBase, mediaFolderCacheBase);
							// no search term
							// TO DO: does execution actually arrive here?
							util.noResults(env.searchAlbum, resolve_parseHash, '#no-search-string');
							return;
						}
					}
					if (util.isSearchCacheBase(albumCacheBase) || util.isMapCacheBase(albumCacheBase)) {
						env.options.cache_base_to_search_in = splittedAlbumCacheBase.slice(2).join(env.options.cache_folder_separator);
					}
				}

				if (util.isSearchCacheBase(albumCacheBase)) {
					albumCacheBaseToGet = albumCacheBase;
				// // same conditions as before????????????????
				// } else if (util.isSearchCacheBase(albumCacheBase)) {
				// 	albumCacheBaseToGet = util.pathJoin([albumCacheBase, mediaFolderCacheBase]);
				} else {
					albumCacheBaseToGet = albumCacheBase;
				}

				if (mediaCacheBase)
					mediaCacheBase = decodeURI(mediaCacheBase);
				if (mediaFolderCacheBase)
					mediaFolderCacheBase = decodeURI(mediaFolderCacheBase);

				var albumFromCache = env.cache.getAlbum(albumCacheBaseToGet), promise;

				if (
					albumFromCache &&
					! albumFromCache.isEmpty() &&
					! albumFromCache.hasUnloadedProtectedContent(true, true) &&
					albumFromCache.hasOwnProperty("subalbums") &&
					albumFromCache.hasOwnProperty("media") &&
					albumFromCache.hasOwnProperty("positionsAndMediaInTree")
				) {
					if (
						util.isSearchCacheBase(albumCacheBase) &&
						! albumFromCache.subalbums.length &&
						! albumFromCache.media.length
					) {
						// it's a search with no results
						if (albumFromCache.hasOwnProperty("removedStopWords") && albumFromCache.removedStopWords.length > 0)
							util.noResults(albumFromCache, resolve_parseHash, '#no-search-string-after-stopwords-removed');
						else
							util.noResults(albumFromCache, resolve_parseHash);
					} else {
						// it's not a search without results: everything is ok, resolve!
						let result = albumFromCache.getMediaIndex(mediaFolderCacheBase, mediaCacheBase);
						if (result === null) {
							// getMediaIndex arguments don't match any media in the album,
							// in getMediaIndex either the authentication dialog has been shown or the hash has been changed to the album
							// Nothing to do
						} else {
							resolve_parseHash([albumFromCache, result]);
						}
					}
				} else if (! util.isSearchCacheBase(albumCacheBase) || searchWordsFromUser.length === 0) {
					// something is missing, getAlbum must be called
					promise = PhotoFloat.getAlbum(albumCacheBaseToGet, reject_parseHash, {getMedia: true, getPositions: ! env.options.save_data});
					promise.then(
						function(album) {
							let result = album.getMediaIndex(mediaFolderCacheBase, mediaCacheBase);
							if (result === null) {
								// getMediaIndex arguments don't match any media in the album,
								// in getMediaIndex either the authentication dialog has been shown or the hash has been changed to the album
								// Nothing to do
							} else {
								resolve_parseHash([album, result]);
							}
						},
						function() {
							console.trace();
						}
					);
				} else {
					// it's a search!
					env.searchAlbum = util.initializeSearchAlbumBegin(albumCacheBase, mediaFolderCacheBase);
					env.searchAlbum.generateAncestorsCacheBase();

					// possibly we need the stop words, because if some searched word is a stop word it must be removed from the search
					promise = PhotoFloat.getStopWords();
					promise.then(
						function () {
							[searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions, removedStopWords] =
								PhotoFloat.removeStopWords(searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions);
							buildSearchResult();
						},
						function() {
							console.trace();
						}
					);
				}
				// end of parseHashAndReturnAlbumAndMediaIndex promise code

				function subalbumsAbsentOrGot() {
					var indexMedia, indexSubalbums;
					if (env.searchAlbum.media.length === 0 && env.searchAlbum.subalbums.length === 0) {
						util.noResults(env.searchAlbum, resolve_parseHash);
					} else {
						$(".search-failed").hide();

						for (indexMedia = 0; indexMedia < env.searchAlbum.media.length; indexMedia ++) {
							let ithMedia = env.searchAlbum.media[indexMedia];
							// add the parent to the media
							ithMedia.addParent(env.searchAlbum);
							let ithMediaArray = new Media([ithMedia]);
							env.searchAlbum.numsMediaInSubTree.sum(ithMediaArray.imagesAndVideosCount());
							if (ithMedia.hasGpsData()) {
								// add the media position
								env.searchAlbum.positionsAndMediaInTree.addSingleMedia(ithMedia);
								env.searchAlbum.numPositionsInTree = env.searchAlbum.positionsAndMediaInTree.length;
							} else {
								env.searchAlbum.nonGeotagged.numsMediaInSubTree.sum(ithMediaArray.imagesAndVideosCount());
								env.searchAlbum.nonGeotagged.sizesOfSubTree.sum(ithMedia.fileSizes);
								env.searchAlbum.nonGeotagged.sizesOfAlbum.sum(ithMedia.fileSizes);
							}
							env.searchAlbum.sizesOfSubTree.sum(ithMedia.fileSizes);
							env.searchAlbum.sizesOfAlbum.sum(ithMedia.fileSizes);
						}

						if (env.searchAlbum.subalbums.length) {
							let subalbumPromises = [];
							for (indexSubalbums = 0; indexSubalbums < env.searchAlbum.subalbums.length; indexSubalbums ++) {
								let thisSubalbum = env.searchAlbum.subalbums[indexSubalbums];
								let thisIndex = indexSubalbums;
								// update the media counts
								env.searchAlbum.numsMediaInSubTree.sum(thisSubalbum.numsMediaInSubTree);
								env.searchAlbum.nonGeotagged.numsMediaInSubTree.sum(thisSubalbum.nonGeotagged.numsMediaInSubTree);
								// update the size totals
								env.searchAlbum.sizesOfSubTree.sum(thisSubalbum.sizesOfSubTree);
								env.searchAlbum.sizesOfAlbum.sum(thisSubalbum.sizesOfAlbum);
								env.searchAlbum.nonGeotagged.sizesOfSubTree.sum(thisSubalbum.nonGeotagged.sizesOfSubTree);
								env.searchAlbum.nonGeotagged.sizesOfAlbum.sum(thisSubalbum.nonGeotagged.sizesOfAlbum);

								// add the points from the subalbums

								// the subalbum could still have no positionsAndMediaInTree array, get it
								if (! thisSubalbum.hasOwnProperty("positionsAndMediaInTree")) {
									let subalbumPromise = new Promise(
										function(resolve_subalbumPromise) {
											let promise = PhotoFloat.getAlbum(thisSubalbum.cacheBase, null, {getMedia: false, getPositions: ! env.options.save_data});
											promise.then(
												function(thisAlbum) {
													env.searchAlbum.subalbums[thisIndex] = thisAlbum;
													env.searchAlbum.positionsAndMediaInTree.mergePositionsAndMedia(thisAlbum.positionsAndMediaInTree);
													env.searchAlbum.numPositionsInTree = env.searchAlbum.positionsAndMediaInTree.length;
													// thisAlbum.positionsAndMediaInTree = positionsGot;
													// thisAlbum.numPositionsInTree = album.positionsAndMediaInTree.length;
													// thisAlbum.includedFilesByCodesSimpleCombination[","].positionsGot = true;
													resolve_subalbumPromise();
												},
												function() {
													console.trace();
												}
											);
										}
									);
									subalbumPromises.push(subalbumPromise);
								}
							}
							Promise.all(subalbumPromises).then(
								function() {
									var promise = PhotoFloat.endPreparingAlbumAndKeepOn(env.searchAlbum, mediaCacheBase, mediaFolderCacheBase);
									promise.then(
										function(i) {
											resolve_parseHash([env.searchAlbum, i]);
										}
									);
								}
							);
						} else {
							var promise = PhotoFloat.endPreparingAlbumAndKeepOn(env.searchAlbum, mediaCacheBase, mediaFolderCacheBase);
							promise.then(
								function(i) {
									resolve_parseHash([env.searchAlbum, i]);
								}
							);
						}
					}
				}

				function buildSearchResult() {
					function rootSearchAlbumNonExistent() {
						util.noResults(env.searchAlbum, resolve_parseHash, '#nothing-to-search');
					}

					// get the search root album before getting the search words ones
					// var promise = PhotoFloat.getAlbum(env.options.by_search_string, reject_parseHash, {getMedia: false, getPositions: false});
					var promise = PhotoFloat.getAlbum(env.options.by_search_string, rootSearchAlbumNonExistent, {getMedia: false, getPositions: false});
					promise.then(
						function(bySearchRootAlbum) {
							env.searchAlbum.removedStopWords = removedStopWords;
							// has any word remained after stop words have been removed?
							if (searchWordsFromUser.length === 0) {
								util.noResults(env.searchAlbum, resolve_parseHash, '#no-search-string-after-stopwords-removed');
								// resolve_parseHash([env.searchAlbum, -1]);
								return;
							}

							var lastIndex, i, j, wordCacheBases, numSearchAlbumsReady = 0, numSubAlbumsToGet = 0;
							var searchResultsMedia = [];
							var searchResultsSubalbums = [];

							// env.searchAlbum.ancestorsCacheBase = bySearchRootAlbum.ancestorsCacheBase.slice();
							// env.searchAlbum.ancestorsCacheBase.push(wordsWithOptionsString);
							if (! env.options.search_any_word)
								// when serching all the words, getting the first album is enough, media that do not match the other words will be escluded later
								lastIndex = 0;
							else
								lastIndex = searchWordsFromUser.length - 1;
							if (env.options.search_inside_words) {
								// we must determine the albums that could match the words given by the user, word by word
								for (i = 0; i <= lastIndex; i ++) {
									wordCacheBases = [];
									for (j = 0; j < env.searchWordsFromJsonFile.length; j ++) {
										if (
											env.searchWordsFromJsonFile[j].some(
												function(word) {
													return word.includes(searchWordsFromUserNormalized[i]);
												}
											)
										) {
											wordCacheBases.push(env.searchAlbumCacheBasesFromJsonFile[j]);
											wordSubalbums.push(env.searchAlbumSubalbumsFromJsonFile[j]);
											numSubAlbumsToGet ++;
										}
									}
									if (wordCacheBases.length)
										albumCacheBases.push(wordCacheBases);
									else
										albumCacheBases.push([]);
								}
							} else {
								// whole words
								for (i = 0; i <= lastIndex; i ++) {
									if (
										env.searchWordsFromJsonFile.some(
											function(words, index) {
												if (words.includes(searchWordsFromUserNormalized[i].replace(/([^\p{L}])/ug, " "))) {
													albumCacheBases.push([env.searchAlbumCacheBasesFromJsonFile[index]]);
													wordSubalbums.push(env.searchAlbumSubalbumsFromJsonFile[index]);
													return true;
												}
												return false;
											}
										)
									) {
										numSubAlbumsToGet ++;
									} else {
										albumCacheBases.push([]);
									}
								}
							}

							if (numSubAlbumsToGet === 0) {
								util.noResults(env.searchAlbum, resolve_parseHash);
							} else if (numSubAlbumsToGet > env.options.max_search_album_number) {
								util.noResults(env.searchAlbum, resolve_parseHash, '#search-too-wide');
							} else {
								$(".search-failed").hide();
								env.searchAlbum.initializeSearchAlbumEnd();
								env.searchAlbum.numsProtectedMediaInSubTree = util.sumNumsProtectedMediaOfArray(wordSubalbums);
								for (indexWords = 0; indexWords <= lastIndex; indexWords ++) {
									searchResultsMedia[indexWords] = new Media([]);
									searchResultsSubalbums[indexWords] = new Subalbums([]);
									for (indexAlbums = 0; indexAlbums < albumCacheBases[indexWords].length; indexAlbums ++) {
										let thisIndexWords = indexWords, thisIndexAlbums = indexAlbums;
										var promise = PhotoFloat.getAlbum(albumCacheBases[thisIndexWords][thisIndexAlbums], reject_parseHash, {getMedia: true, getPositions: ! env.options.save_data});
										promise.then(
											function(wordAlbum) {
												env.cache.putAlbum(wordAlbum);

												var resultAlbum = wordAlbum.clone();
												// media in the album still has to be filtered according to search criteria
												resultAlbum.filterMediaAgainstOneWordAndAlbumSearchedIn(searchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]);
												resultAlbum.filterSubalbumsAgainstOneWordAndAlbumSearchedIn(searchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]);

												if (! (thisIndexWords in searchResultsMedia)) {
													searchResultsMedia[thisIndexWords] = resultAlbum.media;
													searchResultsSubalbums[thisIndexWords] = resultAlbum.subalbums;
												} else {
													searchResultsMedia[thisIndexWords].unionForSearches(resultAlbum.media);
													searchResultsSubalbums[thisIndexWords].unionForSearches(resultAlbum.subalbums);
												}

												// the following instruction makes me see that numSearchAlbumsReady never reaches numSubAlbumsToGet when numSubAlbumsToGet is > 1000,
												// numSearchAlbumsReady remains < 1000

												numSearchAlbumsReady ++;
												if (numSearchAlbumsReady >= numSubAlbumsToGet) {
													// all the word albums have been fetched and worked out, we can merge the results
													env.searchAlbum.media = new Media(searchResultsMedia[0]);
													env.searchAlbum.subalbums = new Subalbums(searchResultsSubalbums[0]);
													for (let indexWords1 = 1; indexWords1 <= lastIndex; indexWords1 ++) {
														if (indexWords1 in searchResultsMedia) {
															if (env.options.search_any_word)
																env.searchAlbum.media.unionForSearches(searchResultsMedia[indexWords1]);
															else
																env.searchAlbum.media.intersectionForSearches(searchResultsMedia[indexWords1]);
														}
														if (indexWords1 in searchResultsSubalbums) {
															if (env.options.search_any_word)
																env.searchAlbum.subalbums.unionForSearches(searchResultsSubalbums[indexWords1]);
															else
																env.searchAlbum.subalbums.intersectionForSearches(searchResultsSubalbums[indexWords1]);
														}
													}

													if (lastIndex != searchWordsFromUser.length - 1) {
														// we still have to filter out the media and subalbums that do not match the words after the first
														// we are in all words search mode

														env.searchAlbum.filterMediaAgainstEveryWord(searchWordsFromUserNormalizedAccordingToOptions, lastIndex);
														env.searchAlbum.filterSubalbumsAgainstEveryWord(searchWordsFromUserNormalizedAccordingToOptions, lastIndex);
													}

													// search albums need to conform to default behaviour of albums:
													// json files must have subalbums and media sorted according to options
													let promises = [];
													if (env.searchAlbum.media.length) {

														// collect the cache bases to get, so that the album for a cachebase is fetched only once
														let cacheBasesAndMediaToGet = [];
														env.searchAlbum.media.forEach(
															function(singleMedia) {
																let cacheBase = singleMedia.foldersCacheBase;
																// let albumCacheBase = PhotoFloat.decodeHash(window.location.hash)[0];
																// let searchStartCacheBase = albumCacheBase.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
																if (util.isByDateCacheBase(env.options.cache_base_to_search_in) && singleMedia.hasOwnProperty("dayAlbumCacheBase"))
																	cacheBase = singleMedia.dayAlbumCacheBase;
																else if (util.isByGpsCacheBase(env.options.cache_base_to_search_in) && singleMedia.hasGpsData())
																	cacheBase = singleMedia.gpsAlbumCacheBase;
																let matchingIndex = cacheBasesAndMediaToGet.findIndex(cacheBaseAndMedia => cacheBaseAndMedia.cacheBase === cacheBase);
																if (matchingIndex !== -1)
																	cacheBasesAndMediaToGet[matchingIndex].media.push(singleMedia);
																else
																	cacheBasesAndMediaToGet.push({cacheBase: cacheBase, media: [singleMedia]});
															}
														);
														cacheBasesAndMediaToGet.forEach(
															function getCacheBase(cacheBaseAndMedia) {
																let cacheBasePromise = new Promise(
																	function(resolve_getAlbum) {
																		let parentAlbumPromise = PhotoFloat.getAlbum(cacheBaseAndMedia.cacheBase, null, {getMedia: false, getPositions: false});
																		parentAlbumPromise.then(
																			function albumGot(parentAlbum) {
																				cacheBaseAndMedia.media.forEach(
																					singleMedia => {
																						singleMedia.generateCaptionsForSearch(parentAlbum);
																					}
																				);
																				resolve_getAlbum();
																			}
																		);
																	}
																);
																promises.push(cacheBasePromise);
															}
														);
													}

													if (env.searchAlbum.subalbums.length) {
														// search albums need to conform to default behaviour of albums: json files have subalbums and media sorted according to options
														env.searchAlbum.subalbums.forEach(
															function(subalbum, iSubalbum) {
																let promise = new Promise(
																	function(resolve_subalbum) {
																		var convertAlbumPromise = subalbum.toAlbum(null, {getMedia: false, getPositions: false});
																		convertAlbumPromise.then(
																			function(subalbum) {
																				env.searchAlbum.subalbums[iSubalbum] = subalbum;
																				env.searchAlbum.subalbums[iSubalbum].generateCaptionsForSearch();
																				resolve_subalbum();
																			},
																			function() {
																				console.trace();
																			}
																		);
																	}
																);
																promises.push(promise);
															}
														);
													}

													Promise.all(promises).then(
														function() {
															delete env.searchAlbum.mediaNameSort;
															delete env.searchAlbum.mediaReverseSort;
															delete env.searchAlbum.albumNameSort;
															delete env.searchAlbum.albumReverseSort;

															if (env.searchAlbum.media.length || env.searchAlbum.subalbums.length) {
																env.searchAlbum.sortAlbumsMedia();
															}

															subalbumsAbsentOrGot();
														}
													);
												}
											},
											function() {
												console.trace();
											}
										);
									}
								}
							}
						},
						function() {
							console.trace();
						}
					);
				}
				// end of auxiliary functions
			}
		);
	};

	PhotoFloat.removeStopWords = function(searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions) {
		// remove the stop words from the search words lists

		var removedStopWords = [];
		var searchWordsFromUserWithoutStopWords = [];
		var searchWordsFromUserWithoutStopWordsNormalized = [];
		var searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions = [];
		if (! env.cache.stopWords.length) {
			searchWordsFromUserWithoutStopWords = searchWordsFromUser;
			searchWordsFromUserWithoutStopWordsNormalized = searchWordsFromUserNormalized;
			searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions = searchWordsFromUserNormalizedAccordingToOptions;
		} else {
			for (var i = 0; i < searchWordsFromUser.length; i ++) {
				if (env.cache.stopWords.every(stopWord => stopWord !== searchWordsFromUserNormalized[i])) {
					searchWordsFromUserWithoutStopWords.push(searchWordsFromUser[i]);
					searchWordsFromUserWithoutStopWordsNormalized.push(searchWordsFromUserNormalized[i]);
					searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions.push(searchWordsFromUserNormalizedAccordingToOptions[i]);
				} else {
					removedStopWords.push(searchWordsFromUser[i]);
				}
			}
		}

		return [searchWordsFromUserWithoutStopWords, searchWordsFromUserWithoutStopWordsNormalized, searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions, removedStopWords];
	};

	PhotoFloat.endPreparingAlbumAndKeepOn = function(resultsAlbumFinal, mediaCacheBase, mediaFolderCacheBase) {
		// this function is called after a search album or a map album is prepared
		return new Promise(
			function(resolve_endPreparingAlbumAndKeepOn) {
				// add the various counts
				// resultsAlbumFinal.numsMediaInSubTree = resultsAlbumFinal.media.imagesAndVideosCount();
				resultsAlbumFinal.numsMedia = resultsAlbumFinal.media.imagesAndVideosCount();
				// resultsAlbumFinal.numPositionsInTree = resultsAlbumFinal.positionsAndMediaInTree.length;

				resultsAlbumFinal.nonGeotagged.numsMedia = resultsAlbumFinal.media.filter(
					singleMedia => ! singleMedia.hasGpsData()
				).imagesAndVideosCount();

				resultsAlbumFinal.numPositionsInTree = resultsAlbumFinal.positionsAndMediaInTree.length;
				// save in the cache array
				if (! env.cache.getAlbum(resultsAlbumFinal.cacheBase))
					env.cache.putAlbum(resultsAlbumFinal);

				resultsAlbumFinal.sortAlbumsMedia();

				var result = resultsAlbumFinal.getMediaIndex(mediaFolderCacheBase, mediaCacheBase);
				if (result === null) {
					// getMediaIndex arguments don't match any media in the album,
					// in getMediaIndex either the authentication dialog has been shown or the hash has been changed to the album
					// Nothing to do
				} else {
					resolve_endPreparingAlbumAndKeepOn(result);
				}

				$("#loading").hide();
			}
		);
	};

	PhotoFloat.convertCacheBaseToId = function(cacheBase) {
		var codedHash, i, chr;

		if (cacheBase.length === 0)
			return 0;
		else if (cacheBase.indexOf('.') === -1)
			return cacheBase;
		else {
			for (i = 0; i < cacheBase.length; i++) {
				chr = cacheBase.charCodeAt(i);
				codedHash = ((codedHash << 5) - codedHash) + chr;
				codedHash |= 0; // Convert to 32bit integer
			}
			return cacheBase.replace(/\./g, '_') + '_' + codedHash;
		}
	};

	// PhotoFloat.mediaCacheBase = function(album, singleMedia) {
	// 	return singleMedia.cacheBase;
	// };

	PhotoFloat.convertHashToCacheBase = function(hash) {
		while (hash.length) {
			if (hash.charAt(0) === "#")
				hash = hash.substring(1);
			else if (hash.charAt(0) === "!")
				hash = hash.substring(1);
			else if (hash.charAt(0) === "/")
				hash = hash.substring(1);
			else if (hash.substring(0, 3) === "%21")
				hash = hash.substring(3);
			else if (hash.charAt(hash.length - 1) === "/")
				hash = hash.substring(0, hash.length - 1);
			else
				break;
		}

		if (! hash)
			hash = env.options.folders_string;
		return hash;
	};


	/* make static methods callable as member functions */
	PhotoFloat.prototype.getAlbum = PhotoFloat.getAlbum;
	// PhotoFloat.prototype.mediaCacheBase = PhotoFloat.mediaCacheBase;
	PhotoFloat.prototype.encodeHash = PhotoFloat.encodeHash;
	PhotoFloat.prototype.convertHashToCacheBase = PhotoFloat.convertHashToCacheBase;
	PhotoFloat.prototype.decodeHash = PhotoFloat.decodeHash;
	PhotoFloat.prototype.endPreparingAlbumAndKeepOn = PhotoFloat.endPreparingAlbumAndKeepOn;
	PhotoFloat.prototype.getStopWords = PhotoFloat.getStopWords;
	PhotoFloat.prototype.removeStopWords = PhotoFloat.removeStopWords;
	PhotoFloat.prototype.hasProtectedContent = PhotoFloat.hasProtectedContent;
	PhotoFloat.prototype.convertCacheBaseToId = PhotoFloat.convertCacheBaseToId;
	PhotoFloat.prototype.getJsonFile = PhotoFloat.getJsonFile;
	PhotoFloat.prototype.getMediaAndPositions = PhotoFloat.getMediaAndPositions;

	/* expose class globally */
	window.PhotoFloat = PhotoFloat;
}());
