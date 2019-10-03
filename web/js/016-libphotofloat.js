/* jshint esversion: 6 */
(function() {

	var util = new Utilities();

	/* constructor */
	function PhotoFloat() {
		PhotoFloat.cache = {};
		PhotoFloat.cache.albums = {};
		PhotoFloat.cache.albums.index = {};
		PhotoFloat.guessedPasswordCodes = [];
		PhotoFloat.guessedPasswordsMd5 = [];
		this.geotaggedPhotosFound = null;
		this.searchWordsFromJsonFile = [];
		this.searchAlbumCacheBasesFromJsonFile = [];
		this.searchAlbumSubalbumsFromJsonFile = [];

		PhotoFloat.searchAndSubalbumHash = '';
		PhotoFloat.searchWordsFromJsonFile = this.searchWordsFromJsonFile;
		PhotoFloat.searchAlbumCacheBasesFromJsonFile = this.searchAlbumCacheBasesFromJsonFile;
		PhotoFloat.searchAlbumSubalbumsFromJsonFile = this.searchAlbumSubalbumsFromJsonFile;

		// temporary, will be removed later
		PhotoFloat.js_cache_levels = [
			{"mediaThreshold": 10000, "max": 1},
			{"mediaThreshold": 2000, "max": 2},
			{"mediaThreshold": 500, "max": 10},
			{"mediaThreshold": 200, "max": 50}
		];
	}

	/* public member functions */
	PhotoFloat.initializeMapRootAlbum = function() {
		// prepare the root of the map albums and put it in the cache
		var rootMapAlbum = {};
		rootMapAlbum.cacheBase = Options.by_map_string;
		rootMapAlbum.media = [];
		rootMapAlbum.numMedia = 0;
		rootMapAlbum.numMediaInSubTree = 0;
		rootMapAlbum.subalbums = [];
		rootMapAlbum.positionsAndMediaInTree = [];
		rootMapAlbum.numPositionsInTree = 0;
		rootMapAlbum.numsProtectedMediaInSubTree = {"": 0};

		PhotoFloat.putAlbumIntoCache(rootMapAlbum.cacheBase, rootMapAlbum);

		return rootMapAlbum;
	};

	PhotoFloat.putAlbumIntoCache = function(albumCacheBase, album) {
		if (! Options.hasOwnProperty("js_cache_levels"))
			Options.js_cache_levels = PhotoFloat.js_cache_levels;

		var done = false, level, cacheLevelsLength = Options.js_cache_levels.length, firstKey;
		// check if the album is already in cache (it could be there with another media number)
		// if it is there, remove it
		if (PhotoFloat.cache.albums.index.hasOwnProperty(albumCacheBase)) {
			level = PhotoFloat.cache.albums.index[albumCacheBase];
			delete PhotoFloat.cache.albums[level][albumCacheBase];
			delete PhotoFloat.cache.albums[level].queue[albumCacheBase];
			delete PhotoFloat.cache.albums.index[albumCacheBase];
		}

		if (album.hasOwnProperty("media")) {
			for (level = 0; level < cacheLevelsLength; level ++) {
		 		if (album.numMedia >= Options.js_cache_levels[level].mediaThreshold) {
					if (! PhotoFloat.cache.albums.hasOwnProperty(level)) {
						PhotoFloat.cache.albums[level] = [];
						PhotoFloat.cache.albums[level].queue = [];
					}
					if (PhotoFloat.cache.albums[level].queue.length >= Options.js_cache_levels[level].max) {
						// remove the first element
						firstKey = PhotoFloat.cache.albums[level].queue[0];
						PhotoFloat.cache.albums[level].queue.shift();
						delete PhotoFloat.cache.albums.index[firstKey];
						delete PhotoFloat.cache.albums[level][firstKey];
					}
					PhotoFloat.cache.albums.index[albumCacheBase] = level;
					PhotoFloat.cache.albums[level].queue.push(albumCacheBase);
					PhotoFloat.cache.albums[level][albumCacheBase] = album;
					done = true;
					break;
				}
			}
		}
		if (! done) {
			if (! PhotoFloat.cache.albums.hasOwnProperty(cacheLevelsLength)) {
				PhotoFloat.cache.albums[cacheLevelsLength] = [];
				PhotoFloat.cache.albums[cacheLevelsLength].queue = [];
			}
			PhotoFloat.cache.albums.index[albumCacheBase] = cacheLevelsLength;
			PhotoFloat.cache.albums[cacheLevelsLength].queue.push(albumCacheBase);
			PhotoFloat.cache.albums[cacheLevelsLength][albumCacheBase] = album;
		}
	};

	PhotoFloat.getAlbumFromCache = function(albumCacheBase) {
		if (! Options.hasOwnProperty("js_cache_levels"))
			Options.js_cache_levels = PhotoFloat.js_cache_levels;

		if (PhotoFloat.cache.albums.index.hasOwnProperty(albumCacheBase)) {
			var cacheLevel = PhotoFloat.cache.albums.index[albumCacheBase];
			var album = PhotoFloat.cache.albums[cacheLevel][albumCacheBase];
			return album;
		} else
			return false;
	};

	PhotoFloat.addPositionsToSubalbums = function(thisAlbum) {
		var iSubalbum, iPosition, iPhoto, position, subalbum, albumFromCache;
		var positions = thisAlbum.positionsAndMediaInTree;
		if (! thisAlbum.hasOwnProperty("subalbums")) {
			albumFromCache = PhotoFloat.getAlbumFromCache(thisAlbum.cacheBase);
			if (albumFromCache)
				thisAlbum = albumFromCache;
		}

		if (thisAlbum.hasOwnProperty("subalbums")) {
			for (iSubalbum = 0; iSubalbum < thisAlbum.subalbums.length; ++ iSubalbum) {
				subalbum = thisAlbum.subalbums[iSubalbum];
				subalbum.positionsAndMediaInTree = [];
				for (iPosition = 0; iPosition < positions.length; ++ iPosition) {
					position = {};
					position.lat = positions[iPosition].lat;
					position.lng = positions[iPosition].lng;
					position.mediaNameList = [];
					for (iPhoto = 0; iPhoto < positions[iPosition].mediaNameList.length; ++ iPhoto) {
						// add the photos belonging to this subalbum
						if (positions[iPosition].mediaNameList[iPhoto].albumCacheBase.indexOf(subalbum.cacheBase) == 0) {
							position.mediaNameList.push(positions[iPosition].mediaNameList[iPhoto]);
						}
					}
					if (position.mediaNameList.length)
						subalbum.positionsAndMediaInTree.push(position);
				}
				// go up recursively
				PhotoFloat.addPositionsToSubalbums(subalbum);
			}
			PhotoFloat.putAlbumIntoCache(thisAlbum.cacheBase, thisAlbum);
		}
	};

	PhotoFloat.getStopWords = function(error) {
		return new Promise(
			function(resolve_getStopWords) {
				if (! Options.search_inside_words && Options.use_stop_words) {
					var stopWordsFileName = 'stopwords.json';
					// before getting the file check whether it's in the cache
					if (PhotoFloat.cache.hasOwnProperty("stopWords")) {
						resolve_getStopWords(PhotoFloat.cache.stopWords);
					} else {
						// get the file
						var stopWordsFile = util.pathJoin([Options.server_cache_path, stopWordsFileName]);
						var ajaxOptions = {
							type: "GET",
							dataType: "json",
							url: stopWordsFile,
							success: function(stopWords) {
								PhotoFloat.cache.stopWords = stopWords.stopWords;
								resolve_getStopWords(stopWords.stopWords);
							}
						};
						if (typeof error !== "undefined" && error !== null) {
							ajaxOptions.error = function(jqXHR) {
								error(jqXHR.status);
							};
						}
						$.ajax(ajaxOptions);
					}
				} else {
					// stop words aren't used, pass to callback a void list
					resolve_getStopWords([]);
				}
			}
		);
	};

	PhotoFloat.getJsonFile = function(jsonRelativeFileName) {
		return new Promise(
			function(resolve_getJsonFile, reject_getJsonFile) {
				$.ajax(
					{
						url: util.pathJoin([Options.server_cache_path, jsonRelativeFileName]),
						type: "GET",
						dataType: "json",
						success: function(album) {
							resolve_getJsonFile(album);
						},
						error: function() {
							reject_getJsonFile();
						}
					}
				);
			}
		);
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
		function getMedia(albumCacheBase) {
			return new Promise(
				function(resolve_getMedia, reject_getMedia) {
					var mediaJsonFile;
					// are media still missing?
					if (mustGetMedia) {
						mediaJsonFile = albumCacheBase + '.media.json';
						var promise = PhotoFloat.getJsonFile(mediaJsonFile);
						promise.then(
							function(media) {
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

		function getPositions(albumCacheBase) {
			return new Promise(
				function(resolve_getPositions, reject_getPositions) {
					var positionJsonFile;
					// are positions still missing?
					if (mustGetPositions) {
						positionJsonFile = albumCacheBase + '.positions.json';
						var promise = PhotoFloat.getJsonFile(positionJsonFile);
						promise.then(
							function(positions) {
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

	PhotoFloat.convertComplexCombinationsIntoLists = function(codesComplexCombination) {
		var albumCombinationList, mediaCombinationList;
		var albumCombination = codesComplexCombination.split(',')[0];
		if (albumCombination == "")
			albumCombinationList = [];
		else
			albumCombinationList = albumCombination.split('-');
		var mediaCombination = codesComplexCombination.split(',')[1];
		if (mediaCombination == "")
			mediaCombinationList = [];
		else
			mediaCombinationList = mediaCombination.split('-');
		return [albumCombinationList, mediaCombinationList];
	};

	PhotoFloat.isProtectedCacheBase = function(albumCacheBase) {
		return albumCacheBase.indexOf(Options.protected_directories_prefix) == 0;
	};

	PhotoFloat.getSingleUnprotectedCacheBaseWithExternalMediaAndPositions = function(unprotectedCacheBase, {getMedia, getPositions}) {
		// this function is called when the album isn't in the cache
		// a brand new album is created

		return new Promise(
			function(resolve_getSingleUnprotectedCacheBase, reject_getSingleUnprotectedCacheBase) {
				var jsonFile = unprotectedCacheBase + ".json";

				var promise = PhotoFloat.getJsonFile(jsonFile);
				promise.then(
					function unprotectedFileExists(album) {
						if (album.hasOwnProperty("media"))
							album.numMedia = album.media.length;
						album.includedFilesByCodesSimpleCombination = {};
						album.includedFilesByCodesSimpleCombination[""] = {};
						if (album.hasOwnProperty("media"))
							album.includedFilesByCodesSimpleCombination[""].mediaGot = true;
						if (album.hasOwnProperty("positionsAndMediaInTree"))
							album.includedFilesByCodesSimpleCombination[""].positionsGot = true;
						var mustGetMedia = getMedia && ! album.includedFilesByCodesSimpleCombination[""].hasOwnProperty("mediaGot");
						var mustGetPositions = getPositions && ! album.includedFilesByCodesSimpleCombination[""].hasOwnProperty("positionsGot");
						var promise = PhotoFloat.getMediaAndPositions(album.cacheBase, {"mustGetMedia": mustGetMedia,"mustGetPositions": mustGetPositions});
						promise.then(
							function([mediaGot, positionsGot]) {
								if (mediaGot) {
									album.media = mediaGot;
									album.includedFilesByCodesSimpleCombination[""].mediaGot = true;
								}

								if (positionsGot) {
									album.positionsAndMediaInTree = positionsGot;
									album.includedFilesByCodesSimpleCombination[""].positionsGot = true;
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
						var emptyAlbum = {
							"cacheBase": unprotectedCacheBase,
							"subalbums": [],
							"numMedia": 0,
							"numMediaInSubTree": 0,
							"numPositionsInTree": 0,
							// "includedProtectedDirectories": [],
							"empty": true
						};
						emptyAlbum.includedFilesByCodesSimpleCombination = {};
						emptyAlbum.includedFilesByCodesSimpleCombination[""] = false;

						if (PhotoFloat.guessedPasswordsMd5.length) {
							reject_getSingleUnprotectedCacheBase(emptyAlbum);
						} else {
							// end here
							if (util.isSearchCacheBase(unprotectedCacheBase)) {
								emptyAlbum.media = [];
								emptyAlbum.subalbums = [];
								emptyAlbum.path = unprotectedCacheBase.replace(Options.cache_folder_separator, "/");
								util.noResults(emptyAlbum);
							} else {
								// wrong hash: it might be the hash of a protected content
								$("#loading").hide();
								util.showAuthForm(true);
							}
						}
					}
				);
			}
		);
	};

	PhotoFloat.getSingleProtectedCacheBaseWithExternalMediaAndPositions = function(protectedCacheBase, album, {getMedia, getPositions}) {
		// this function gets a single protected json file

		var splittedProtectedCacheBase = protectedCacheBase.split('.');
		var number = parseInt(splittedProtectedCacheBase[splittedProtectedCacheBase.length - 1]);
		var codesSimpleCombination = util.convertProtectedCacheBaseToCodesSimpleCombination(protectedCacheBase);
		if (! album.hasOwnProperty("includedFilesByCodesSimpleCombination"))
			album.includedFilesByCodesSimpleCombination = {};
		if (! album.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination)) {
			album.includedFilesByCodesSimpleCombination[codesSimpleCombination] = {};
			if (codesSimpleCombination !== "" && ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination].hasOwnProperty(number))
				album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] = {};
			album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album = {};
		}

		return new Promise(
			function(resolve_getSingleProtectedCacheBase, reject_getSingleProtectedCacheBase) {
				// let's check whether the protected cache base has been already loaded
				if (album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] === false) {
					// the protected cache base doesn't exist
					reject_getSingleProtectedCacheBase();
				} else if (album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot")) {
					// the protected cache base has been already fetched
					// possibly the external media and positions are still missing
					let addMediaAndPositionsPromise = addExternalMediaAndPositionsFromProtectedAlbum();
					addMediaAndPositionsPromise.then(
						function externalMediaAndPositionsAdded() {
							resolve_getSingleProtectedCacheBase();
						}
					);
				} else {
					// the protected cache base hasn't been fetched yet
					var jsonFile = protectedCacheBase + ".json";

					var promise = PhotoFloat.getJsonFile(jsonFile);
					promise.then(
						function protectedFileExists(protectedAlbum) {

							if (! album.hasOwnProperty("numsProtectedMediaInSubTree"))
								// this is needed when getSingleProtectedCacheBaseWithExternalMediaAndPositions() is called by getNumsProtectedMediaInSubTreeProperty()
								album.numsProtectedMediaInSubTree = protectedAlbum.numsProtectedMediaInSubTree;

							album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].codesComplexCombination = protectedAlbum.codesComplexCombination;

							if (! protectedAlbum.hasOwnProperty("numMedia"))
								protectedAlbum.numMedia = protectedAlbum.media.length;

							if (! album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot")) {
								if (protectedAlbum.subalbums.length)
									PhotoFloat.mergeProtectedSubalbums(album, protectedAlbum);

								album.numMedia += protectedAlbum.numMedia;
								album.numMediaInSubTree += protectedAlbum.numMediaInSubTree;
								album.numPositionsInTree += protectedAlbum.numPositionsInTree;
								if (! album.hasOwnProperty("path"))
									album.path = protectedAlbum.path;
								album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.protectedAlbumGot = true;

								if (protectedAlbum.hasOwnProperty("media")) {
									if (! album.hasOwnProperty("media"))
										album.media = protectedAlbum.media;
									else
										album.media = album.media.concat(protectedAlbum.media);
									album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.mediaGot = true;
								}

								if (protectedAlbum.hasOwnProperty("positionsAndMediaInTree")) {
									if (! album.hasOwnProperty("positionsAndMediaInTree"))
										album.positionsAndMediaInTree = protectedAlbum.positionsAndMediaInTree;
									else
										album.positionsAndMediaInTree = util.mergePoints(album.positionsAndMediaInTree, protectedAlbum.positionsAndMediaInTree);
									album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.positionsGot = true;
								}

								// add pointers to the same object for the symlinks
								for (let iSymlink = 0; iSymlink < protectedAlbum.symlinkCodesAndNumbers.length; iSymlink ++) {
									let symlinkCodesAndNumbersItem = protectedAlbum.symlinkCodesAndNumbers[iSymlink];
									if (
										! album.includedFilesByCodesSimpleCombination.hasOwnProperty(symlinkCodesAndNumbersItem.codesSimpleCombination) ||
										! Object.keys(album.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination]).some(
											function(thisNumber) {
												thisNumber = parseInt(thisNumber);
												var result =
													album.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][thisNumber].codesComplexCombination ==
														symlinkCodesAndNumbersItem.codesComplexCombination &&
													album.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][thisNumber].hasOwnProperty("protectedAlbumGot");
												return result;
											}
										)
									) {
										// actually add the pointer
										if (! album.includedFilesByCodesSimpleCombination.hasOwnProperty(symlinkCodesAndNumbersItem.codesSimpleCombination))
											album.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination] = {};
										if (! album.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination].hasOwnProperty(symlinkCodesAndNumbersItem.number))
											album.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][symlinkCodesAndNumbersItem.number] = {};
										album.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][symlinkCodesAndNumbersItem.number].album =
											album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album;
										album.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][symlinkCodesAndNumbersItem.number].codesComplexCombination =
											symlinkCodesAndNumbersItem.codesComplexCombination;
									}
								}
							}

							let addMediaAndPositionsPromise = addExternalMediaAndPositionsFromProtectedAlbum();
							addMediaAndPositionsPromise.then(
								function externalMediaAndPositionsAdded() {
									resolve_getSingleProtectedCacheBase();
								},
								function() {
									console.trace();
								}
							);
						},
						function protectedFileDoesntExist() {
							if (codesSimpleCombination !== null)
								// save the info that the protected cache base doesn't exist
								album.includedFilesByCodesSimpleCombination[codesSimpleCombination] = false;

							// do not do anything, i.e. another protected cache base will be processed
							reject_getSingleProtectedCacheBase();
						}
					);
				}
				// end of getSingleProtectedCacheBaseWithExternalMediaAndPositions function body

				function addExternalMediaAndPositionsFromProtectedAlbum() {
					return new Promise(
						function(resolve_addExternalMediaAndPositionsFromProtectedAlbum) {
							var mustGetMedia = getMedia && ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("mediaGot");
							var mustGetPositions = getPositions && ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("positionsGot");
							if (! mustGetMedia && ! mustGetPositions) {
								resolve_addExternalMediaAndPositionsFromProtectedAlbum();
							} else {
								var promise = PhotoFloat.getMediaAndPositions(protectedCacheBase, {"mustGetMedia": mustGetMedia, "mustGetPositions": mustGetPositions});
								promise.then(
									function([mediaGot, positionsGot]) {
										if (mediaGot) {
											if (! album.hasOwnProperty("media"))
												album.media = mediaGot;
											else
												album.media = album.media.concat(mediaGot);
											// album.includedFilesByCodesSimpleCombination[""].mediaGot = true;
											album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.mediaGot = true;
										}

										if (positionsGot) {
											if (! album.hasOwnProperty("positionsAndMediaInTree") || ! album.positionsAndMediaInTree.length)
												album.positionsAndMediaInTree = positionsGot;
											else
												album.positionsAndMediaInTree = util.mergePoints(album.positionsAndMediaInTree, positionsGot);
											// album.includedFilesByCodesSimpleCombination[""].positionsGot = true;
											album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.positionsGot = true;
										}

										resolve_addExternalMediaAndPositionsFromProtectedAlbum();
									},
									function() {
										console.trace();
									}
								);
							}
						}
					);
				}
			}
		);
	};

	PhotoFloat.protectedDirectoriesToGet = function() {
		var iAlbumPassword, iMediaPassword, albumGuessedPassword, mediaGuessedPassword, protectedDirectory;
		var result = [];

		for (iAlbumPassword = 0; iAlbumPassword < PhotoFloat.guessedPasswordsMd5.length; iAlbumPassword ++) {
			albumGuessedPassword = PhotoFloat.guessedPasswordsMd5[iAlbumPassword];
			protectedDirectory = Options.protected_directories_prefix + albumGuessedPassword + ',';
			result.push(protectedDirectory);
		}
		for (iMediaPassword = 0; iMediaPassword < PhotoFloat.guessedPasswordsMd5.length; iMediaPassword ++) {
			mediaGuessedPassword = PhotoFloat.guessedPasswordsMd5[iMediaPassword];
			protectedDirectory = Options.protected_directories_prefix + ',' + mediaGuessedPassword;
			result.push(protectedDirectory);
		}
		for (iAlbumPassword = 0; iAlbumPassword < PhotoFloat.guessedPasswordsMd5.length; iAlbumPassword ++) {
			albumGuessedPassword = PhotoFloat.guessedPasswordsMd5[iAlbumPassword];
			for (iMediaPassword = 0; iMediaPassword < PhotoFloat.guessedPasswordsMd5.length; iMediaPassword ++) {
				mediaGuessedPassword = PhotoFloat.guessedPasswordsMd5[iMediaPassword];
				protectedDirectory = Options.protected_directories_prefix + albumGuessedPassword + ',' + mediaGuessedPassword;
				result.push(protectedDirectory);
			}
		}
		return result;
	};


	PhotoFloat.codesComplexCombinationsToGet = function(album, {getMedia, getPositions}) {
		var iAlbumPassword, iMediaPassword, albumGuessedPassword, mediaGuessedPassword;
		var albumCode, mediaCode;
		var codesComplexCombinationInAlbum;

		var result = [];
		for (codesComplexCombinationInAlbum in album.numsProtectedMediaInSubTree) {
			if (album.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationInAlbum) && codesComplexCombinationInAlbum != "") {
				for (iAlbumPassword = 0; iAlbumPassword < PhotoFloat.guessedPasswordsMd5.length; iAlbumPassword ++) {
					for (iMediaPassword = 0; iMediaPassword < PhotoFloat.guessedPasswordsMd5.length; iMediaPassword ++) {
						albumGuessedPassword = PhotoFloat.guessedPasswordsMd5[iAlbumPassword];
						albumCode = util.convertMd5ToCode(albumGuessedPassword);
						mediaGuessedPassword = PhotoFloat.guessedPasswordsMd5[iMediaPassword];
						mediaCode = util.convertMd5ToCode(mediaGuessedPassword);
						let [albumCodesComplexCombinationList, mediaCodesComplexCombinationList] = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombinationInAlbum);
						let codesSimpleCombinationInAlbum = util.convertCodesComplexCombinationToCodesSimpleCombination(codesComplexCombinationInAlbum);
						let numProtectedCacheBases = PhotoFloat.getNumProtectedCacheBases(album.numsProtectedMediaInSubTree, codesComplexCombinationInAlbum);
						if (
							! albumCodesComplexCombinationList.length &&
							mediaCodesComplexCombinationList.length &&
							mediaCodesComplexCombinationList.indexOf(mediaCode) != -1
							||
							albumCodesComplexCombinationList.length &&
							albumCodesComplexCombinationList.indexOf(albumCode) != -1 &&
							! mediaCodesComplexCombinationList.length
							||
							albumCodesComplexCombinationList.length &&
							mediaCodesComplexCombinationList.length &&
							albumCodesComplexCombinationList.indexOf(albumCode) != -1 &&
							mediaCodesComplexCombinationList.indexOf(mediaCode) != -1
						) {
							if (
								! (codesSimpleCombinationInAlbum in album.includedFilesByCodesSimpleCombination)
								||
								Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombinationInAlbum]).length < numProtectedCacheBases
								||
								getMedia && Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombinationInAlbum]).some(
									function(number) {
										number = parseInt(number);
										var result = ! album.includedFilesByCodesSimpleCombination[codesSimpleCombinationInAlbum][number].album.hasOwnProperty("mediaGot");
										return result;
									}
								)
								||
								getPositions && Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombinationInAlbum]).some(
									function(number) {
										number = parseInt(number);
										var result = ! album.includedFilesByCodesSimpleCombination[codesSimpleCombinationInAlbum][number].album.hasOwnProperty("positionsGot");
										return result;
									}
								)
							) {
								result.push(codesComplexCombinationInAlbum);
							}
						}
					}
				}
			}
		}
		return result;
	};

	PhotoFloat.codesSimpleCombinationsToGet = function(album, {getMedia, getPositions}) {
		var iAlbumPassword, iMediaPassword, albumGuessedPassword, mediaGuessedPassword;
		var albumCode, mediaCode;
		var codesComplexCombinationInAlbum;

		var result = [];
		for (iAlbumPassword = 0; iAlbumPassword <= PhotoFloat.guessedPasswordsMd5.length; iAlbumPassword ++) {
			if (iAlbumPassword === PhotoFloat.guessedPasswordsMd5.length) {
				albumCode = '';
			} else {
				albumGuessedPassword = PhotoFloat.guessedPasswordsMd5[iAlbumPassword];
				albumCode = util.convertMd5ToCode(albumGuessedPassword);
			}
			for (iMediaPassword = 0; iMediaPassword <= PhotoFloat.guessedPasswordsMd5.length; iMediaPassword ++) {
				if (iMediaPassword === PhotoFloat.guessedPasswordsMd5.length) {
					mediaCode = '';
				} else {
					mediaGuessedPassword = PhotoFloat.guessedPasswordsMd5[iMediaPassword];
					mediaCode = util.convertMd5ToCode(mediaGuessedPassword);
				}
				if (! albumCode && ! mediaCode)
					continue;
				let codesSimpleCombination = albumCode + ',' + mediaCode;

				for (codesComplexCombinationInAlbum in album.numsProtectedMediaInSubTree) {
					if (album.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationInAlbum) && codesComplexCombinationInAlbum != "") {
						let [albumCodesComplexCombinationList, mediaCodesComplexCombinationList] = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombinationInAlbum);

						if (
							! albumCodesComplexCombinationList.length &&
							! albumCode &&
							mediaCodesComplexCombinationList.length &&
							mediaCode &&
							mediaCodesComplexCombinationList.indexOf(mediaCode) != -1
							||
							albumCodesComplexCombinationList.length &&
							albumCode &&
							albumCodesComplexCombinationList.indexOf(albumCode) != -1 &&
							! mediaCodesComplexCombinationList.length &&
							! mediaCode
							||
							albumCodesComplexCombinationList.length &&
							albumCode &&
							albumCodesComplexCombinationList.indexOf(albumCode) != -1 &&
							mediaCodesComplexCombinationList.length &&
							mediaCode &&
							mediaCodesComplexCombinationList.indexOf(mediaCode) != -1
						) {
							let numProtectedCacheBases = PhotoFloat.getNumProtectedCacheBases(album.numsProtectedMediaInSubTree, codesComplexCombinationInAlbum);
							if (
								! (codesSimpleCombination in album.includedFilesByCodesSimpleCombination)
								||
								Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombination]).length < numProtectedCacheBases
								||
								getMedia && Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombination]).some(
									function(number) {
										number = parseInt(number);
										var result = ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("mediaGot");
										return result;
									}
								)
								||
								getPositions && Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombination]).some(
									function(number) {
										number = parseInt(number);
										var result = ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("positionsGot");
										return result;
									}
								)
							) {
								if (! result.includes(codesSimpleCombination))
									result.push(codesSimpleCombination);
							}
						}
					}
				}
			}
		}
		return result;
	};

	PhotoFloat.getNumsProtectedMediaInSubTreeProperty = function(album, theProtectedDirectoriesToGet) {

		return new Promise(
			function(resolve_getNumsProtectedMediaInSubTreeProperty, reject_getNumsProtectedMediaInSubTreeProperty) {
				if (album.hasOwnProperty("numsProtectedMediaInSubTree")) {
					resolve_getNumsProtectedMediaInSubTreeProperty();
				} else {
					var iDirectory = -1;
					var getNumsProtectedMediaInSubTreePropertyPromise = getNextProtectedDirectory();
					getNumsProtectedMediaInSubTreePropertyPromise.then(resolve_getNumsProtectedMediaInSubTreeProperty);
					getNumsProtectedMediaInSubTreePropertyPromise.catch(reject_getNumsProtectedMediaInSubTreeProperty);
				}
				// end of getNumsProtectedMediaInSubTreePropertyProperty function body

				function getNextProtectedDirectory() {
					return new Promise(
						function(resolve_getNextProtectedDirectory, reject_getNextProtectedDirectory) {
							iDirectory ++;
							if (iDirectory >= theProtectedDirectoriesToGet.length) {
								reject_getNextProtectedDirectory();
							} else {
								// since numsProtectedMediaInSubTree isn't in the album,
								// there is no way to know if a protected directory will have the searched content:
								// so we must try until a protected directory has the protected album we need

								var protectedDirectory = theProtectedDirectoriesToGet[iDirectory];
								var protectedCacheBase = protectedDirectory + '/' + album.cacheBase + '.0';

								var promise = PhotoFloat.getSingleProtectedCacheBaseWithExternalMediaAndPositions(protectedCacheBase, album, {"getMedia": false, "getPositions": false});
								promise.then(
									function getSingleProtectedCacheBaseWithExternalMediaAndPositions_resolved() {
										// ok, we got what we were looking for:
										// numsProtectedMediaInSubTree property has already been added by getSingleProtectedCacheBaseWithExternalMediaAndPositions()

										if (album.hasOwnProperty("media")) {
											util.sortByDate(album.media);
											album.mediaNameSort = false;
											album.mediaReverseSort = false;
										}
										util.sortByDate(album.subalbums);
										album.albumNameSort = false;
										album.albumReverseSort = false;
										util.sortAlbumsMedia(album);

										PhotoFloat.putAlbumIntoCache(album.cacheBase, album);

										resolve_getNextProtectedDirectory();
									},
									function getSingleProtectedCacheBaseWithExternalMediaAndPositions_rejected() {
										var promise = getNextProtectedDirectory();
										promise.then(
											function() {
												resolve_getNextProtectedDirectory();
											},
											function() {
												reject_getNextProtectedDirectory();
											}
										);
									}
								);
							}
						}
					);
				}
			}
		);
	};


	PhotoFloat.mergeProtectedSubalbum = function(subalbum, protectedSubalbum) {
		subalbum.numMediaInSubTree += protectedSubalbum.numMediaInSubTree;
		subalbum.numPositionsInTree += protectedSubalbum.numPositionsInTree;
		// subalbum.words = util.arrayUnion(subalbum.words, protectedSubalbum.words);
	};

	PhotoFloat.mergeProtectedSubalbums = function(album, protectedAlbum) {
		var cacheBases = [], i, ithProtectedSubalbum;
		album.subalbums.forEach(
			function(subalbum) {
				cacheBases.push(subalbum.cacheBase);
			}
		);
		for (i = 0; i < protectedAlbum.subalbums.length; i ++) {
			ithProtectedSubalbum = protectedAlbum.subalbums[i];
			if (cacheBases.indexOf(ithProtectedSubalbum.cacheBase) == -1) {
				album.subalbums.push(ithProtectedSubalbum);
			// // if media or positions are missing the combination must not be reported as included
			// } else if (album.hasOwnProperty("media") && album.hasOwnProperty("positionsAndMediaInTree")) {
			} else {
				album.subalbums.forEach(
					function(subalbum) {
						if (subalbum.cacheBase == ithProtectedSubalbum.cacheBase)
							PhotoFloat.mergeProtectedSubalbum(subalbum, ithProtectedSubalbum);
					}
				);
			}
		}
	};


	PhotoFloat.addProtectedContent = function(album, {getMedia, getPositions}) {
		// this function adds the protected content to the given album

		return new Promise(
			function(resolve_addProtectedContent, reject) {
				var numsPromise;
				if (album.hasOwnProperty("numsProtectedMediaInSubTree")) {
					numsPromise = continueAddProtectedContent();
					numsPromise.then(
						function() {
							resolve_addProtectedContent();
						},
						function() {
							console.trace();
						}
					);
				} else {
					// the album hasn't unprotected content and no protected cache base has been processed yet:
					// a protected album must be loaded in order to know the complex combinations
					var theProtectedDirectoriesToGet = PhotoFloat.protectedDirectoriesToGet();
					if (! theProtectedDirectoriesToGet.length) {
						// executions shouldn't arrive here
						resolve_addProtectedContent();
					} else {
						var promise = PhotoFloat.getNumsProtectedMediaInSubTreeProperty(album, theProtectedDirectoriesToGet);
						promise.then(
							function() {
								numsPromise = continueAddProtectedContent();
								numsPromise.then(
									function() {
										resolve_addProtectedContent();
									},
									function() {
										console.trace();
									}
								);
							},
							function() {
								console.trace();
							}
						);
					}
				}
			}
		);
		// end of function code


		function continueAddProtectedContent() {
			// this function keeps on the job of addProtectedContent
			// it is called when the numsProtectedMediaInSubTree property is in the album

			return new Promise(
				function(resolve_continueAddProtectedContent) {
					var theCodesSimpleCombinationsToGet = PhotoFloat.codesSimpleCombinationsToGet(album, {"getMedia": getMedia, "getPositions": getPositions});
					if (! theCodesSimpleCombinationsToGet.length) {
						if (! PhotoFloat.getAlbumFromCache(album.cacheBase))
							PhotoFloat.putAlbumIntoCache(album.cacheBase, album);
						resolve_continueAddProtectedContent();
					} else {
						// prepare and get the protected content from the protected directories
						// let numProtected = 0;
						// let codesComplexCombination;
						// for (let iComplex = 0; iComplex < theCodesComplexCombinationsToGet.length; iComplex ++) {
						// 	codesComplexCombination = theCodesComplexCombinationsToGet[iComplex];
						// 	if (! album.includedFilesByCodesSimpleCombination[codesComplexCombination].mediaGot)
						// 		numProtected += album.numsProtectedMediaInSubTree[codesComplexCombination];
						// }
						// if (
						// 	! PhotoFloat.isEmpty(album) && numProtected == 0 &&
						// 	album.cacheBase !== Options.by_search_string &&
						// 	! util.isSearchCacheBase(album.cacheBase)
						// ) {
						// 	// no need to get any protected content for this md5
						// 	resolve_continueAddProtectedContent(album);
						// } else {
						let protectedPromises = [];
						// let codesSimpleCombinationGot = [];

						// loop on the simple combinations, i.e. on the protected directories
						for (let iSimple = 0; iSimple < theCodesSimpleCombinationsToGet.length; iSimple ++) {
							let codesSimpleCombination = theCodesSimpleCombinationsToGet[iSimple];
							// let codesCombinationsLists = PhotoFloat.convertComplexCombinationsIntoLists(codesSimpleCombination);
							let [albumMd5, mediaMd5] = util.convertCodesListToMd5sList(codesSimpleCombination.split(','));
							// codesSimpleCombinationGot.push(codesSimpleCombination);

							// // check if the combination is equivalent to a got one
							// if (
							// 	codesSimpleCombinationGot.some(
							// 		function(codesComplexCombinationGot) {
							// 			return codesSimpleCombination !== codesComplexCombinationGot && isEquivalent(codesSimpleCombination, codesComplexCombinationGot);
							// 		}
							// 	)
							// ) {
							// 	// is equivalent to one of the got codesSimpleCombination's
							// 	continue;
							// }

							let protectedDirectory = Options.protected_directories_prefix;
							if (albumMd5)
								protectedDirectory += albumMd5;
							protectedDirectory += ',';
							if (mediaMd5)
								protectedDirectory += mediaMd5;
							// let codesSimpleCombination = util.convertProtectedDirectoryToCodesSimpleCombination(protectedDirectory);
							if (! album.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination))
								album.includedFilesByCodesSimpleCombination[codesSimpleCombination] = {};

							// we can know how many files/symlinks we have to get in the protected directory
							let numProtectedCacheBases = PhotoFloat.getNumProtectedCacheBases(album.numsProtectedMediaInSubTree, codesSimpleCombination);
							for (let iCacheBase = 0; iCacheBase < numProtectedCacheBases; iCacheBase ++) {
								let number = iCacheBase;
								let protectedCacheBase = protectedDirectory + '/' + album.cacheBase + '.' + iCacheBase;
								if (! album.includedFilesByCodesSimpleCombination[codesSimpleCombination].hasOwnProperty(number)) {
									album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] = {};
									album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album = {};
								}

								let ithPromise = new Promise(
									function(resolve_ithPromise, reject) {
										if (
											album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot") &&
											! getMedia || album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("mediaGot") &&
											! getPositions || album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("positionsGot")
										) {
											// this cache base has been already loaded and either media/positions are already there or aren't needed now
											resolve_ithPromise();
										} else {
											let promise = PhotoFloat.getSingleProtectedCacheBaseWithExternalMediaAndPositions(protectedCacheBase, album, {"getMedia": getMedia, "getPositions": getPositions});
											promise.then(
												function() {
													if (PhotoFloat.isEmpty(album))
														delete album.empty;
													resolve_ithPromise();
												},
												function() {
													// the protected cache base doesn't exist, keep on!
													// execution shouldn't arrive here
													resolve_ithPromise();
												}
											);
										}
									}
								);
								protectedPromises.push(ithPromise);
							}
						}

						Promise.all(protectedPromises).then(
							function() {
								// execution arrives here when all the protected json has been loaded and processed

								if (album.hasOwnProperty("media")) {
									util.sortByDate(album.media);
									album.mediaNameSort = false;
									album.mediaReverseSort = false;
								}
								util.sortByDate(album.subalbums);
								album.albumNameSort = false;
								album.albumReverseSort = false;
								util.sortAlbumsMedia(album);

								resolve_continueAddProtectedContent();
							}
						);
					}
				}
			);
		}

		function isEquivalent(codesSimpleCombination, codesComplexCombinationGot) {
			let codesCombinationsLists = PhotoFloat.convertComplexCombinationsIntoLists(codesSimpleCombination);
			let albumCodesCombinationsList = codesCombinationsLists[0];
			let mediaCodesCombinationList = codesCombinationsLists[1];
			let codesCombinationsListsGot = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombinationGot);
			let albumCodesCombinationsListGot = codesCombinationsListsGot[0];
			let mediaCodesCombinationListGot = codesCombinationsListsGot[1];
			var result =
				! albumCodesCombinationsList.length &&
				! albumCodesCombinationsListGot.length &&
				mediaCodesCombinationList.length &&
				mediaCodesCombinationListGot.length &&
				util.arrayIntersect(mediaCodesCombinationList, mediaCodesCombinationListGot).length
				||
				albumCodesCombinationsList.length &&
				albumCodesCombinationsListGot.length &&
				! mediaCodesCombinationList.length &&
				! mediaCodesCombinationListGot.length &&
				util.arrayIntersect(albumCodesCombinationsList, albumCodesCombinationsListGot).length
				||
				albumCodesCombinationsList.length &&
				albumCodesCombinationsListGot.length &&
				mediaCodesCombinationList.length &&
				mediaCodesCombinationListGot.length &&
				util.arrayIntersect(albumCodesCombinationsList, albumCodesCombinationsListGot).length &&
				util.arrayIntersect(mediaCodesCombinationList, mediaCodesCombinationListGot).length;
			// result == true means that the combination is equivalent to the got one
			return result;
		}
	};

	PhotoFloat.getNumProtectedCacheBases = function(numsProtectedMediaInSubTree, codesComplexCombination) {
		var [albumCodesComplexCombinationList, mediaCodesComplexCombinationList] = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombination);

		var count = 0;
		for (var codesComplexCombinationFromObject in numsProtectedMediaInSubTree) {
			if (numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationFromObject) && codesComplexCombinationFromObject !== "") {
				var [albumCodesComplexCombinationListFromObject, mediaCodesComplexCombinationListFromObject] =
					PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombinationFromObject);

				if (
					albumCodesComplexCombinationList.length &&
					albumCodesComplexCombinationListFromObject.length &&
					mediaCodesComplexCombinationList.length &&
					mediaCodesComplexCombinationListFromObject.length &&
					albumCodesComplexCombinationListFromObject.indexOf(albumCodesComplexCombinationList[0]) !== -1 &&
					mediaCodesComplexCombinationListFromObject.indexOf(mediaCodesComplexCombinationList[0]) !== -1
					||
					! albumCodesComplexCombinationList.length &&
					! albumCodesComplexCombinationListFromObject.length &&
					mediaCodesComplexCombinationList.length &&
					mediaCodesComplexCombinationListFromObject.length &&
					mediaCodesComplexCombinationListFromObject.indexOf(mediaCodesComplexCombinationList[0]) !== -1
					||
					albumCodesComplexCombinationList.length &&
					albumCodesComplexCombinationListFromObject.length &&
					! mediaCodesComplexCombinationList.length &&
					! mediaCodesComplexCombinationListFromObject.length &&
					albumCodesComplexCombinationListFromObject.indexOf(albumCodesComplexCombinationList[0]) !== -1
				)
					count ++;
			}
		}

		return count;
	};

	PhotoFloat.hasProtectedContent = function(album) {
		if (
			// album.hasOwnProperty("numsProtectedMediaInSubTree") && (
			! Object.keys(album.numsProtectedMediaInSubTree).length ||
			album.numsProtectedMediaInSubTree.hasOwnProperty("") &&
			Object.keys(album.numsProtectedMediaInSubTree).length == 1
			// )
		)
			return false;
		else
			return true;
	};

	PhotoFloat.isEmpty = function(album) {
		return album.hasOwnProperty("empty");
	};

	PhotoFloat.hasUnprotectedContent = function(album) {
		return album.includedFilesByCodesSimpleCombination[""] !== false;
	};

	PhotoFloat.getAlbum = function(albumOrCacheBase, error, {getMedia = false, getPositions = false}) {
		// error is executed when in no way the album can be retrieved:
		// either it doesn't exist or it could be a protected one

		return new Promise(
			function(resolve_getAlbum, reject) {
				var albumCacheBase, album;
				if (typeof albumOrCacheBase === "string") {
					albumCacheBase = albumOrCacheBase;
					album = PhotoFloat.getAlbumFromCache(albumCacheBase);
				} else {
					album = albumOrCacheBase;
					albumCacheBase = album.cacheBase;
				}

				var promise;
				if (album) {
					if (album.includedFilesByCodesSimpleCombination[""] === false) {
						// the album hasn't unprotected content => not adding media/positions  => go immediately to promise.then
						promise = new Promise(
							function(resolve) {
								resolve([false, false]);
							}
						);
					} else {
						var mustGetMedia = getMedia && (
							! album.hasOwnProperty("media") ||
							album.includedFilesByCodesSimpleCombination[""] !== false && ! album.includedFilesByCodesSimpleCombination[""].hasOwnProperty("mediaGot")
						);
						var mustGetPositions = getPositions && (
							! album.hasOwnProperty("positionsAndMediaInTree") ||
							album.includedFilesByCodesSimpleCombination[""] !== false && ! album.includedFilesByCodesSimpleCombination[""].hasOwnProperty("positionsGot")
						);
						// this call to getMediaAndPositions adds positions and media of the unprotected album only
						promise = PhotoFloat.getMediaAndPositions(album.cacheBase, {"mustGetMedia": mustGetMedia, "mustGetPositions": mustGetPositions});
					}
					promise.then(
						function mediaAndPositionsGot([mediaGot, positionsGot]) {
							if (mediaGot) {
								if (! album.hasOwnProperty("media") || ! album.media.length)
									album.media = mediaGot;
								else
									// TO DO: verify that concat is be enough
									// album.media = album.media.concat(mediaGot);
									album.media = util.arrayUnion(
										album.media,
										mediaGot,
										function(singleMedia1, singleMedia2) {
											return singleMedia1.foldersCacheBase == singleMedia2.foldersCacheBase && singleMedia1.cacheBase == singleMedia2.cacheBase;
										}
									);
								album.includedFilesByCodesSimpleCombination[""].mediaGot = true;
							}

							if (positionsGot) {
								if (! album.hasOwnProperty("positionsAndMediaInTree") || ! album.positionsAndMediaInTree.length)
									album.positionsAndMediaInTree = positionsGot;
								else
									album.positionsAndMediaInTree = util.mergePoints(album.positionsAndMediaInTree, positionsGot);
								album.includedFilesByCodesSimpleCombination[""].positionsGot = true;
							}

							var promise = PhotoFloat.addProtectedContent(album, {"getMedia": getMedia, "getPositions": getPositions});
							promise.then(
								function() {
									goOnTowardResolvingGetAlbum(album);
									resolve_getAlbum(album);
								},
								function() {
									console.trace();
								}
							);
						},
						function() {
							console.trace();
						}
					);
				} else if (util.isMapCacheBase(albumCacheBase)) {
					// map album are not on server, if they aren't in cache go to root album
					if (typeof reject !== "undefined")
						reject();
					$("#error-unexistent-map-album").stop().fadeIn(200);
					$("#error-unexistent-map-album").fadeOut(
						2000,
						function () {
							window.location.href = "#!" + Options.folders_string;
						}
					);
				} else {
					// the album is not in cache, get it brand new
					promise = PhotoFloat.getSingleUnprotectedCacheBaseWithExternalMediaAndPositions(albumCacheBase, {"getMedia": getMedia, "getPositions": getPositions});
					promise.then(
						function unprotectedAlbumGot(album) {
							if (PhotoFloat.hasProtectedContent(album)) {
								var promise = PhotoFloat.addProtectedContent(album, {"getMedia": getMedia, "getPositions": getPositions});
								promise.then(
									function() {
										goOnTowardResolvingGetAlbum(album);
										resolve_getAlbum(album);
									},
									function() {
										console.trace();
									}
								);
							} else {
								goOnTowardResolvingGetAlbum(album);
								resolve_getAlbum(album);
							}
						},
						function unprotectedAlbumUnexisting(emptyAlbum) {
							// look for a protected album: something must be there
							var promise = PhotoFloat.addProtectedContent(emptyAlbum, {"getMedia": getMedia, "getPositions": getPositions});
							promise.then(
								function() {
									goOnTowardResolvingGetAlbum(emptyAlbum);
									resolve_getAlbum(emptyAlbum);
								},
								function() {
									console.trace();
								}
							);
						}
					);
				}
			}
		);
		// end of getalbum function

		function goOnTowardResolvingGetAlbum(theAlbum) {
			var i, j;
			if (theAlbum.cacheBase == Options.by_search_string) {
				// root of search albums: build the word list
				for (i = 0; i < theAlbum.subalbums.length; ++i) {
					if (PhotoFloat.searchWordsFromJsonFile.indexOf(theAlbum.subalbums[i].unicodeWords) == -1) {
						PhotoFloat.searchWordsFromJsonFile.push(theAlbum.subalbums[i].unicodeWords);
						PhotoFloat.searchAlbumCacheBasesFromJsonFile.push(theAlbum.subalbums[i].cacheBase);
						PhotoFloat.searchAlbumSubalbumsFromJsonFile.push(theAlbum.subalbums[i]);
					}
				}
			} else if (! util.isSearchCacheBase(theAlbum.cacheBase)) {
				if (! theAlbum.hasOwnProperty("positionsAndMediaInTree"))
					theAlbum.numPositionsInTree = 0;

				if (theAlbum.hasOwnProperty("media")) {
					for (i = theAlbum.media.length - 1; i >= 0; i --) {
						// remove unnecessary properties
						var unnecessaryProperties = ['checksum', 'dateTimeDir', 'dateTimeFile'];
						for (j = 0; j < unnecessaryProperties.length; j ++)
							delete theAlbum.media[i][unnecessaryProperties[j]];

						// add parent album
						theAlbum.media[i].parent = theAlbum;
					}
				}
			}

			if (! util.isMapCacheBase(theAlbum.cacheBase))
				generateAncestorsCacheBase(theAlbum);
			if (! PhotoFloat.getAlbumFromCache(theAlbum.cacheBase))
				PhotoFloat.putAlbumIntoCache(theAlbum.cacheBase, theAlbum);
		}
		//////// end of goOnTowardResolvingGetAlbum function

		// auxiliary functions
		function generateAncestorsCacheBase(album) {
			if (! album.hasOwnProperty("ancestorsCacheBase")) {
				var i;
				album.ancestorsCacheBase = [];
				var splittedCacheBase = album.cacheBase.split(Options.cache_folder_separator);
				album.ancestorsCacheBase[0] = splittedCacheBase[0];
				for (i = 1; i < splittedCacheBase.length; i ++) {
					album.ancestorsCacheBase[i] = [album.ancestorsCacheBase[i - 1], splittedCacheBase[i]].join(Options.cache_folder_separator);
				}
			}

			return;
		}
	};

	PhotoFloat.prototype.pickRandomMedia = function(theSubalbum, error) {
		var index;
		return new Promise(
			function(resolve_pickRandomMedia) {
				var promise = PhotoFloat.getAlbum(theSubalbum.cacheBase, error, {"getMedia": false, "getPositions": false});
				promise.then(
					function(album) {
						// index = 0;
						index = Math.floor(Math.random() * (album.numMediaInSubTree));
						nextAlbum(album);
					},
					function() {
						console.trace();
					}
				);
				//// end of function pickRandomMedia ////////////////////

				function nextAlbum(album) {

					var i, numMedia;

					if (album.numMediaInSubTree == 0) {
						error();
						return;
					}

					// if (album.hasOwnProperty("media"))
					// 	numMedia = album.numMedia;
					// else
					numMedia = album.numMedia;
					if (index >= numMedia) {
						index -= numMedia;
						let found = false;
						let targetCacheBase;
						// if (! album.subalbums.length) {
						// 	found = true;
						// 	targetCacheBase = album.cacheBase;
						// }
						for (i = 0; i < album.subalbums.length; i ++) {
							if (index >= album.subalbums[i].numMediaInSubTree)
								index -= album.subalbums[i].numMediaInSubTree;
							else {
								targetCacheBase = album.subalbums[i].cacheBase;
								found = true;
								break;
							}
						}
						if (! found) {
							error();
						} else {
							var promise = PhotoFloat.getAlbum(targetCacheBase, error, {"getMedia": false, "getPositions": false});
							promise.then(
								function(subalbum) {
									nextAlbum(subalbum);
								},
								function() {
									console.trace();
								}
							);
						}
					} else {
						var lastPromise = PhotoFloat.getAlbum(album, error, {"getMedia": true, "getPositions": true});
						lastPromise.then(
							function(album) {
								resolve_pickRandomMedia([album, index]);
							},
							function() {
								console.trace();
							}
						);
					}
				}
			}
		);
	};

	PhotoFloat.encodeHash = function(album, media, savedSearchSubAlbumHash, savedSearchAlbumHash) {
		var hash, albumHash;
		if (typeof album === "string")
			albumHash = album;
		else
			albumHash = album.cacheBase;

		if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
			savedSearchAlbumHash = PhotoFloat.cleanHash(savedSearchAlbumHash);
			savedSearchSubAlbumHash = PhotoFloat.cleanHash(savedSearchSubAlbumHash);
		}

		if (media !== null) {
			// media hash
			if (util.isFolderCacheBase(albumHash)) {
				if (typeof savedSearchAlbumHash === "undefined" || savedSearchAlbumHash === null)
					// media in folders album, count = 2
					hash = util.pathJoin([
						albumHash,
						media.cacheBase
					]);
				else
					// media in found album or in one of its subalbum, count = 4
					hash = util.pathJoin([
						albumHash,
						savedSearchSubAlbumHash,
						savedSearchAlbumHash,
						media.cacheBase
					]);
			} else if (
				util.isByDateCacheBase(albumHash) ||
				util.isByGpsCacheBase(albumHash) ||
				util.isSearchCacheBase(albumHash) && (typeof savedSearchAlbumHash === "undefined" || savedSearchAlbumHash === null) ||
				util.isMapCacheBase(albumHash)
			)
				// media in date or gps album, count = 3
				hash = util.pathJoin([
					albumHash,
					media.foldersCacheBase,
					media.cacheBase
				]);
		} else {
			// no media: album hash
			if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
				// found album or one of its subalbums, count = 3
				hash = util.pathJoin([
					albumHash,
					savedSearchSubAlbumHash,
					savedSearchAlbumHash
				]);
			else
				// plain search album, count = 1
				// folders album, count = 1
				hash = albumHash;
		}
		return "#!/" + hash;
	};

	PhotoFloat.decodeHash = function(hash) {
		// decodes the hash and returns its components

		var hashParts, hashPartsCount, albumHash, mediaFolderHash = null, mediaHash = null;
		var savedSearchAlbumHash = null, savedSearchSubAlbumHash = null;

		hash = PhotoFloat.cleanHash(hash);

		if (! hash.length) {
			albumHash = Options.folders_string;
		} else {
			// split on the slash and count the number of parts
			hashParts = hash.split("/");
			hashPartsCount = hashParts.length;
			PhotoFloat.searchAndSubalbumHash = "";

			if (hashPartsCount === 1) {
				// folders or gps or date hash: album only
				albumHash = hash;
			} else if (hashPartsCount == 2) {
				// media in folders album: album, media
				albumHash = hashParts[0];
				mediaHash = hashParts[1];
			} else if (hashPartsCount == 3) {
				// gps or date or search hash: album, album where the image is, media
				// subfolder of search hash: album, search subalbum, search album
				if (util.isSearchCacheBase(hashParts[2])) {
					albumHash = hashParts[0];
					savedSearchSubAlbumHash = hashParts[1];
					savedSearchAlbumHash = hashParts[2];
				} else {
					albumHash = hashParts[0];
					mediaFolderHash = hashParts[1];
					mediaHash = hashParts[2];
				}
			} else if (hashPartsCount == 4) {
				albumHash = hashParts[0];
				savedSearchSubAlbumHash = hashParts[1];
				savedSearchAlbumHash = hashParts[2];
				mediaHash = hashParts[3];
			}
		}
		return [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash];
	};

	PhotoFloat.prototype.geotaggedPhotosExist = function() {
		return new Promise(
			function(resolveGeotaggedPhotosExist) {
				var self;
				// this function returns true if the root album has the by gps subalbum
				if (this.geotaggedPhotosFound !== null) {
					if (this.geotaggedPhotosFound) {
						resolveGeotaggedPhotosExist(true);
						// $("#by-gps-view").off("click");
						// $("#by-gps-view").removeClass("hidden").addClass("active").on("click", function(ev) {
						// 	$(".search-failed").hide();
						// 	$("#album-view").removeClass("hidden");
						// 	window.location.href = link;
						// 	return false;
						// });
					} else {
						resolveGeotaggedPhotosExist(false);
					}
				} else {
					self = this;
					var promise = PhotoFloat.getAlbum(
						// thisAlbum
						Options.folders_string,
						// error
						// execution arrives here if no gps json file has been found
						// (but gps json file must exist)
						function() {
							// $("#by-gps-view").addClass("hidden");
							self.geotaggedPhotosFound = false;
							resolveGeotaggedPhotosExist(false);
						},
						{"getMedia": false, "getPositions": true}
					);
					promise.then(
						function(foldersRootAlbum) {
							if (! foldersRootAlbum.numPositionsInTree) {
								// $("#by-gps-view").addClass("hidden");
								self.geotaggedPhotosFound = false;
								resolveGeotaggedPhotosExist(false);
							} else {
								self.geotaggedPhotosFound = true;
								resolveGeotaggedPhotosExist(true);
							}
						},
						function() {
							console.trace();
						}
					);
				}
			}
		);
	};

	PhotoFloat.upHash = function() {
		var resultHash;
		var hash = window.location.hash;
		var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(hash);

		if (mediaHash === null || util.isAlbumWithOneMedia(currentAlbum)) {
			// hash of an album: go up in the album tree
			if (savedSearchAlbumHash !== null) {
				if (albumHash == savedSearchSubAlbumHash)
					resultHash = savedSearchAlbumHash;
				else {
					// we must go up in the sub folder
					albumHash = albumHash.split(Options.cache_folder_separator).slice(0, -1).join(Options.cache_folder_separator);
					resultHash = util.pathJoin([
						albumHash,
						savedSearchSubAlbumHash,
						savedSearchAlbumHash
					]);
				}
			} else {
				if (albumHash == Options.folders_string)
					// stay there
					resultHash = albumHash;
				else if (albumHash == Options.by_date_string || albumHash == Options.by_gps_string || albumHash == Options.by_map_string)
					// go to folders root
					resultHash = Options.folders_string;
				else if (util.isSearchCacheBase(albumHash) || util.isMapCacheBase(albumHash)) {
					// the return folder must be extracted from the album hash
					resultHash = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
				} else {
					// we must go up in the sub folders tree
					resultHash = albumHash.split(Options.cache_folder_separator).slice(0, -1).join(Options.cache_folder_separator);
				}
			}
		} else {
			// hash of a media: remove the media
			if (savedSearchAlbumHash !== null || util.isFolderCacheBase(albumHash))
				// media in found album or in one of its subalbum
				// or
				// media in folder hash:
				// remove the trailing media
				resultHash = util.pathJoin(hash.split("/").slice(1, -1));
			else
				// all the other cases
				// remove the trailing media and the folder it's inside
				resultHash = util.pathJoin(hash.split("/").slice(1, -2));
		}

		return "#!/" + resultHash;
	};


	PhotoFloat.prototype.parseHash = function(hash, hashParsed, error) {
		var albumHashToGet, albumHashes, wordSubalbums;
		var searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions;
		var indexWords, indexAlbums, wordsWithOptionsString;
		// this vars are defined here and not at the beginning of the file because the options must have been read

		$("#error-too-many-images").hide();
		$(".search-failed").hide();
		// $("#media-view").removeClass("hidden");
		var [albumHash, mediaHash, mediaFolderHash] = PhotoFloat.decodeHash(hash);
		$("ul#right-menu li#album-search").removeClass("dimmed");
		$("ul#right-menu li#any-word").removeClass("dimmed");
		$("#album-view, #album-view #subalbums, #album-view #thumbs").removeClass("hidden");

		albumHashes = [];
		wordSubalbums = [];
		searchWordsFromUser = [];
		searchWordsFromUserNormalized = [];
		searchWordsFromUserNormalizedAccordingToOptions = [];
		if (albumHash) {
			albumHash = decodeURI(albumHash);

			if ([Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(albumHash) !== -1)
				$("ul#right-menu li#album-search").addClass("dimmed");

			if (util.isSearchCacheBase(albumHash)) {
				var splittedAlbumHash = albumHash.split(Options.cache_folder_separator);

				// wordsWithOptionsString = albumHash.substring(Options.by_search_string.length + 1);
				wordsWithOptionsString = splittedAlbumHash[1];
				var wordsAndOptions = wordsWithOptionsString.split(Options.search_options_separator);
				var wordsString = wordsAndOptions[wordsAndOptions.length - 1];
				var wordsStringOriginal = wordsString.replace(/_/g, ' ');
				// the normalized words are needed in order to compare with the search cache json files names, which are normalized
				var wordsStringNormalizedAccordingToOptions = util.normalizeAccordingToOptions(wordsStringOriginal);
				var wordsStringNormalized = util.removeAccents(wordsStringOriginal.toLowerCase());
				if (wordsAndOptions.length > 1) {
					var searchOptions = wordsAndOptions.slice(0, -1);
					Options.search_inside_words = searchOptions.includes('i');
					Options.search_any_word = searchOptions.includes('n');
					Options.search_case_sensitive = searchOptions.includes('c');
					Options.search_accent_sensitive = searchOptions.includes('a');
					Options.search_current_album = searchOptions.includes('o');
				}

				Options.album_to_search_in = splittedAlbumHash.slice(2).join(Options.cache_folder_separator);

				if ([Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(Options.album_to_search_in) !== -1)
					$("ul#right-menu li#album-search").addClass("dimmed");

				// if (util.isSearchHash(location.hash) && Options.search_refine)
				// 	Options.album_to_search_in = albumHash;

				$("ul#right-menu #search-field").attr("value", wordsStringOriginal);
				wordsString = util.normalizeAccordingToOptions(wordsString);
				searchWordsFromUser = wordsString.split('_');
				searchWordsFromUserNormalizedAccordingToOptions = wordsStringNormalizedAccordingToOptions.split(' ');
				searchWordsFromUserNormalized = wordsStringNormalized.split(' ');

				if (searchWordsFromUser.length == 1)
					$("ul#right-menu li#any-word").addClass("dimmed");

				var searchResultsAlbumFinal = {};
				searchResultsAlbumFinal.positionsAndMediaInTree = [];
				searchResultsAlbumFinal.media = [];
				searchResultsAlbumFinal.subalbums = [];
				searchResultsAlbumFinal.numMediaInSubTree = 0;
				searchResultsAlbumFinal.cacheBase = albumHash;
				searchResultsAlbumFinal.path = searchResultsAlbumFinal.cacheBase.replace(Options.cache_folder_separator, "/");
				searchResultsAlbumFinal.physicalPath = searchResultsAlbumFinal.path;
				searchResultsAlbumFinal.searchInFolderCacheBase = mediaFolderHash;
				searchResultsAlbumFinal.numsProtectedMediaInSubTree = {"": 0};

				if (albumHash == Options.by_search_string) {
					util.noResults(searchResultsAlbumFinal, '#no-search-string');
					hashParsed(searchResultsAlbumFinal, null, -1);
					return;
				}
			}
		}

		if (util.isSearchCacheBase(albumHash)) {
			albumHashToGet = albumHash;
		// // same conditions as before????????????????
		// } else if (util.isSearchCacheBase(albumHash)) {
		// 	albumHashToGet = util.pathJoin([albumHash, mediaFolderHash]);
		} else {
			albumHashToGet = albumHash;
		}

		if (mediaHash)
			mediaHash = decodeURI(mediaHash);
		if (mediaFolderHash)
			mediaFolderHash = decodeURI(mediaFolderHash);
		if (PhotoFloat.searchAndSubalbumHash)
			PhotoFloat.searchAndSubalbumHash = decodeURI(PhotoFloat.searchAndSubalbumHash);

		var albumFromCache = PhotoFloat.getAlbumFromCache(albumHashToGet), promise;
		if (albumFromCache && ! PhotoFloat.guessedPasswordsMd5.length) {
		// if (albumFromCache && ! PhotoFloat.passwordsToGet(albumFromCache).length) {
			if (! albumFromCache.subalbums.length && ! albumFromCache.media.length)
				util.noResults(albumFromCache);
			PhotoFloat.selectMedia(albumFromCache, mediaFolderHash, mediaHash, hashParsed);
		} else if (! util.isSearchCacheBase(albumHash) || searchWordsFromUser.length === 0) {
			promise = PhotoFloat.getAlbum(albumHashToGet, error, {"getMedia": true, "getPositions": true});
			promise.then(
				function(theAlbum) {
					PhotoFloat.selectMedia(theAlbum, mediaFolderHash, mediaHash, hashParsed);
				},
				function() {
					console.trace();
				}
			);
		} else {
			// it's a search!
			// self = this;
			var removedStopWords = [];

			// possibly we need the stop words, because if some searched word is a stop word it must be removed from the search
			promise = PhotoFloat.getStopWords(util.die);
			promise.then(
				function removeStopWords(stopWords) {
					// remove the stop words from the search words lists

					var searchWordsFromUserWithoutStopWords = [];
					var searchWordsFromUserWithoutStopWordsNormalized = [];
					var searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions = [];
					for (var i = 0; i < searchWordsFromUser.length; i ++) {
						if (
							stopWords.every(
								function(word) {
									return word !== searchWordsFromUserNormalized[i];
								}
							)
						) {
							searchWordsFromUserWithoutStopWords.push(searchWordsFromUser[i]);
							searchWordsFromUserWithoutStopWordsNormalized.push(searchWordsFromUserNormalized[i]);
							searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions.push(searchWordsFromUserNormalizedAccordingToOptions[i]);
						} else {
							removedStopWords.push(searchWordsFromUser[i]);
						}
					}

					searchWordsFromUser = searchWordsFromUserWithoutStopWords;
					searchWordsFromUserNormalized = searchWordsFromUserWithoutStopWordsNormalized;
					searchWordsFromUserNormalizedAccordingToOptions = searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions;

					buildSearchResult();
				},
				function() {
					console.trace();
				}
			);
		}
		// end of body of parseHash

		function subalbumsAbsentOrGot() {
			var indexMedia, indexSubalbums;
			if (searchResultsAlbumFinal.media.length === 0 && searchResultsAlbumFinal.subalbums.length === 0) {
				util.noResults(searchResultsAlbumFinal);
			} else {
				$(".search-failed").hide();
			}

			for (indexMedia = 0; indexMedia < searchResultsAlbumFinal.media.length; indexMedia ++) {
				// add the parent to the media
				searchResultsAlbumFinal.media[indexMedia].parent = searchResultsAlbumFinal;
				if (util.hasGpsData(searchResultsAlbumFinal.media[indexMedia]))
					// add the media position
					searchResultsAlbumFinal.positionsAndMediaInTree =
						util.addMediaToPoints(
							searchResultsAlbumFinal.positionsAndMediaInTree,
							searchResultsAlbumFinal.media[indexMedia]
						);
			}

			if (searchResultsAlbumFinal.subalbums.length) {
				for (indexSubalbums = 0; indexSubalbums < searchResultsAlbumFinal.subalbums.length; indexSubalbums ++) {
					// update the media count
					searchResultsAlbumFinal.numMediaInSubTree += searchResultsAlbumFinal.subalbums[indexSubalbums].numMediaInSubTree;
					// add the points from the subalbums

					// the subalbum could still have no positionsAndMediaInTree array, get it
					if (! searchResultsAlbumFinal.subalbums[indexSubalbums].hasOwnProperty("positionsAndMediaInTree"))
						searchResultsAlbumFinal.subalbums[indexSubalbums].positionsAndMediaInTree = [];
				}
			}
			PhotoFloat.endPreparingAlbumAndKeepOn(searchResultsAlbumFinal, mediaHash, mediaFolderHash, hashParsed);
		}

		function buildSearchResult() {
			searchResultsAlbumFinal.removedStopWords = removedStopWords;
			// has any word remained after stop words have been removed?
			if (searchWordsFromUser.length == 0) {
				util.noResults(searchResultsAlbumFinal, '#no-search-string-after-stopwords-removed');
				hashParsed(searchResultsAlbumFinal, null, -1);
				return;
			}

			// get the search root album before getting the search words ones
			var promise = PhotoFloat.getAlbum(Options.by_search_string, error, {"getMedia": true, "getPositions": true});
			promise.then(
				function(bySearchRootAlbum) {
					var lastIndex, i, j, wordHashes, numSearchAlbumsReady = 0, numSubAlbumsToGet = 0, normalizedWords;
					var searchResultsMedia = [];
					var searchResultsSubalbums = [];

					PhotoFloat.putAlbumIntoCache(Options.by_search_string, bySearchRootAlbum);

					searchResultsAlbumFinal.ancestorsCacheBase = bySearchRootAlbum.ancestorsCacheBase.slice();
					searchResultsAlbumFinal.ancestorsCacheBase.push(wordsWithOptionsString);
					if (! Options.search_any_word)
						// when serching all the words, getting the first album is enough, media that do not match the other words will be escluded later
						lastIndex = 0;
					else
						lastIndex = searchWordsFromUser.length - 1;
					if (Options.search_inside_words) {
						// we must determine the albums that could match the words given by the user, word by word
						for (i = 0; i <= lastIndex; i ++) {
							wordHashes = [];
							for (j = 0; j < PhotoFloat.searchWordsFromJsonFile.length; j ++) {
								if (
									PhotoFloat.searchWordsFromJsonFile[j].some(
										function(word) {
											return word.includes(searchWordsFromUserNormalized[i]);
										}
									)
								) {
									wordHashes.push(PhotoFloat.searchAlbumCacheBasesFromJsonFile[j]);
									wordSubalbums.push(PhotoFloat.searchAlbumSubalbumsFromJsonFile[j]);
									numSubAlbumsToGet ++;
								}
							}
							if (wordHashes.length)
								albumHashes.push(wordHashes);
							else
								albumHashes.push([]);
						}
					} else {
						// whole words
						for (i = 0; i <= lastIndex; i ++)
							if (
								PhotoFloat.searchWordsFromJsonFile.some(
									function(words, index) {
										if (words.includes(searchWordsFromUserNormalized[i])) {
											albumHashes.push([PhotoFloat.searchAlbumCacheBasesFromJsonFile[index]]);
											wordSubalbums.push(PhotoFloat.searchAlbumSubalbumsFromJsonFile[index]);
											return true;
										}
										return false;
									}
								)
							) {
								numSubAlbumsToGet ++;
							} else {
								albumHashes.push([]);
							}
					}

					if (numSubAlbumsToGet === 0) {
						util.noResults(searchResultsAlbumFinal);
						hashParsed(searchResultsAlbumFinal, null, -1);
					} else if (numSubAlbumsToGet > Options.max_search_album_number) {
						util.noResults(searchResultsAlbumFinal, '#search-too-wide');
						hashParsed(searchResultsAlbumFinal, null, -1);
					} else {
						$(".search-failed").hide();
						searchResultsAlbumFinal.numsProtectedMediaInSubTree = util.sumNumsProtectedMediaOfArray(wordSubalbums);
						for (indexWords = 0; indexWords <= lastIndex; indexWords ++) {
							searchResultsMedia[indexWords] = [];
							searchResultsSubalbums[indexWords] = [];
							for (indexAlbums = 0; indexAlbums < albumHashes[indexWords].length; indexAlbums ++) {
								let thisIndexWords = indexWords, thisIndexAlbums = indexAlbums;
								// getAlbum is called here with 2 more parameters, indexAlbums and indexWords, in order to use their value
								// if they are not passed as arguments, the success function would see their values updates (getAlbum is an asyncronous function)
								var promise = PhotoFloat.getAlbum(
									albumHashes[thisIndexWords][thisIndexAlbums],
									error,
									{"getMedia": true, "getPositions": true}
								);
								promise.then(
									function(theAlbum) {
										var matchingMedia = [], matchingSubalbums = [], match, indexMedia, indexSubalbums, indexWordsLeft, resultAlbum, indexWords1, ithMedia, ithSubalbum;

										PhotoFloat.putAlbumIntoCache(albumHashes[thisIndexWords][thisIndexAlbums], theAlbum);

										resultAlbum = util.cloneObject(theAlbum);
										// media in the album still has to be filtered according to search criteria
										if (! Options.search_inside_words) {
											// whole word
											for (indexMedia = 0; indexMedia < theAlbum.media.length; indexMedia ++) {
												ithMedia = theAlbum.media[indexMedia];
												if (
													util.normalizeAccordingToOptions(ithMedia.words).includes(searchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]) && (
														! Options.search_current_album ||
														[Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(Options.album_to_search_in) !== -1 || (
															// check whether the media is inside the current album tree
															ithMedia.foldersCacheBase.indexOf(Options.album_to_search_in) === 0 ||
															ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(Options.album_to_search_in) === 0 ||
															ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(Options.album_to_search_in) === 0 ||
															util.isMapCacheBase(Options.album_to_search_in) &&
															PhotoFloat.getAlbumFromCache(Options.album_to_search_in).media.some(
																function(media) {
																	return media.cacheBase == ithMedia.cacheBase && media.foldersCacheBase == ithMedia.foldersCacheBase;
																}
															)
														)
													)
												)
													matchingMedia.push(ithMedia);
											}
											for (indexSubalbums = 0; indexSubalbums < theAlbum.subalbums.length; indexSubalbums ++) {
												ithSubalbum = theAlbum.subalbums[indexSubalbums];
												if (
													util.normalizeAccordingToOptions(ithSubalbum.words).includes(searchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]) && (
														! Options.search_current_album ||
														[Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(Options.album_to_search_in) !== -1 || (
															// check whether the media is inside the current album tree
															ithSubalbum.cacheBase.indexOf(Options.album_to_search_in) === 0 &&
															ithSubalbum.cacheBase != Options.album_to_search_in
														)
													)
												)
													matchingSubalbums.push(ithSubalbum);
											}
										} else {
											// inside words
											for (indexMedia = 0; indexMedia < theAlbum.media.length; indexMedia ++) {
												ithMedia = theAlbum.media[indexMedia];
												normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
												if (
													normalizedWords.some(
														function(element) {
															return element.includes(searchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]);
														}
													) && (
														! Options.search_current_album ||
														[Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(Options.album_to_search_in) !== -1 || (
															// check whether the media is inside the current album tree
															ithMedia.foldersCacheBase.indexOf(Options.album_to_search_in) === 0 ||
															ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(Options.album_to_search_in) === 0 ||
															ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(Options.album_to_search_in) === 0 ||
															util.isMapCacheBase(Options.album_to_search_in) &&
															PhotoFloat.getAlbumFromCache(Options.album_to_search_in).media.some(
																function(media) {
																	return media.cacheBase == ithMedia.cacheBase && media.foldersCacheBase == ithMedia.foldersCacheBase;
																}
															)
														)
													)
												)
													matchingMedia.push(ithMedia);
											}
											for (indexSubalbums = 0; indexSubalbums < theAlbum.subalbums.length; indexSubalbums ++) {
												ithSubalbum = theAlbum.subalbums[indexSubalbums];
												normalizedWords = util.normalizeAccordingToOptions(ithSubalbum.words);
												if (
													normalizedWords.some(
														function(element) {
															return element.includes(searchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]);
														}
													) && (
														! Options.search_current_album ||
														[Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(Options.album_to_search_in) !== -1 || (
															// check whether the media is inside the current album tree
															ithSubalbum.cacheBase.indexOf(Options.album_to_search_in) === 0 &&
															ithSubalbum.cacheBase != Options.album_to_search_in
														)
													)
												)
													matchingSubalbums.push(ithSubalbum);
											}
										}
										resultAlbum.media = matchingMedia;
										resultAlbum.subalbums = matchingSubalbums;

										if (! (thisIndexWords in searchResultsMedia)) {
											searchResultsMedia[thisIndexWords] = resultAlbum.media;
											searchResultsSubalbums[thisIndexWords] = resultAlbum.subalbums;
										} else {
											searchResultsMedia[thisIndexWords] = util.union(searchResultsMedia[thisIndexWords], resultAlbum.media);
											searchResultsSubalbums[thisIndexWords] = util.union(searchResultsSubalbums[thisIndexWords], resultAlbum.subalbums);
										}
										// the following instruction makes me see that numSearchAlbumsReady never reaches numSubAlbumsToGet when numSubAlbumsToGet is > 1000,
										// numSearchAlbumsReady remains < 1000

										numSearchAlbumsReady ++;
										if (numSearchAlbumsReady >= numSubAlbumsToGet) {
											// all the albums have been got, we can merge the results
											searchResultsAlbumFinal.media = searchResultsMedia[0];
											searchResultsAlbumFinal.subalbums = searchResultsSubalbums[0];
											for (indexWords1 = 1; indexWords1 <= lastIndex; indexWords1 ++) {
												if (indexWords1 in searchResultsMedia) {
													searchResultsAlbumFinal.media = Options.search_any_word ?
														util.union(searchResultsAlbumFinal.media, searchResultsMedia[indexWords1]) :
														util.intersect(searchResultsAlbumFinal.media, searchResultsMedia[indexWords1]);
												}
												if (indexWords1 in searchResultsSubalbums) {
													searchResultsAlbumFinal.subalbums = Options.search_any_word ?
														util.union(searchResultsAlbumFinal.subalbums, searchResultsSubalbums[indexWords1]) :
														util.intersect(searchResultsAlbumFinal.subalbums, searchResultsSubalbums[indexWords1]);
												}
											}

											if (lastIndex != searchWordsFromUser.length - 1) {
												// we still have to filter out the media that do not match the words after the first
												// we are in all words search mode
												matchingMedia = [];
												for (indexMedia = 0; indexMedia < searchResultsAlbumFinal.media.length; indexMedia ++) {
													match = true;
													if (! Options.search_inside_words) {
														// whole word
														normalizedWords = util.normalizeAccordingToOptions(searchResultsAlbumFinal.media[indexMedia].words);
														if (
															searchWordsFromUserNormalizedAccordingToOptions.some(
																function(element, index) {
																	return index > lastIndex && normalizedWords.indexOf(element) == -1;
																}
															)
														)
															match = false;
													} else {
														// inside words
														for (indexWordsLeft = lastIndex + 1; indexWordsLeft < searchWordsFromUser.length; indexWordsLeft ++) {
															normalizedWords = util.normalizeAccordingToOptions(searchResultsAlbumFinal.media[indexMedia].words);
															if (
																! normalizedWords.some(
																	function(element) {
																		return element.includes(searchWordsFromUserNormalizedAccordingToOptions[indexWordsLeft]);
																	}
																)
															) {
																match = false;
																break;
															}
														}
													}
													if (match && matchingMedia.indexOf(searchResultsAlbumFinal.media[indexMedia]) == -1)
														matchingMedia.push(searchResultsAlbumFinal.media[indexMedia]);
												}
												searchResultsAlbumFinal.media = matchingMedia;

												// search albums need to conform to default behaviour of albums:
												// json files have subalbums and media sorted by date not reversed
												util.sortByDate(searchResultsAlbumFinal.media);

												matchingSubalbums = [];
												for (indexSubalbums = 0; indexSubalbums < searchResultsAlbumFinal.subalbums.length; indexSubalbums ++) {
													match = true;
													if (! Options.search_inside_words) {
														// whole word
														normalizedWords = util.normalizeAccordingToOptions(searchResultsAlbumFinal.subalbums[indexSubalbums].words);
														if (
															searchWordsFromUserNormalizedAccordingToOptions.some(
																function(element, index) {
																	return index > lastIndex && normalizedWords.indexOf(element) == -1;
																}
															)
														)
															match = false;
													} else {
														// inside words
														for (indexWordsLeft = lastIndex + 1; indexWordsLeft < searchWordsFromUser.length; indexWordsLeft ++) {
															normalizedWords = util.normalizeAccordingToOptions(searchResultsAlbumFinal.subalbums[indexSubalbums].words);
															if (
																! normalizedWords.some(
																	function(element) {
																		return element.includes(searchWordsFromUserNormalizedAccordingToOptions[indexWordsLeft]);
																	}
																)
															) {
																match = false;
																break;
															}
														}
													}
													if (match && matchingSubalbums.indexOf(searchResultsAlbumFinal.subalbums[indexSubalbums]) == -1)
														matchingSubalbums.push(searchResultsAlbumFinal.subalbums[indexSubalbums]);
												}

												searchResultsAlbumFinal.subalbums = matchingSubalbums;

												if (searchResultsAlbumFinal.subalbums.length) {
													// search albums need to conform to default behaviour of albums: json files have subalbums and media sorted by date not reversed
													util.sortByDate(searchResultsAlbumFinal.subalbums);
												}
											}
											subalbumsAbsentOrGot();
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
	};

	PhotoFloat.endPreparingAlbumAndKeepOn = function(resultsAlbumFinal, mediaHash, mediaFolderHash, hashParsed) {
		// add the various counts
		resultsAlbumFinal.numMediaInSubTree = resultsAlbumFinal.media.length;
		resultsAlbumFinal.numMedia = resultsAlbumFinal.media.length;
		resultsAlbumFinal.numPositionsInTree = resultsAlbumFinal.positionsAndMediaInTree.length;
		// save in the cache array
		PhotoFloat.putAlbumIntoCache(resultsAlbumFinal.cacheBase, resultsAlbumFinal);

		PhotoFloat.selectMedia(resultsAlbumFinal, mediaFolderHash, mediaHash, hashParsed);

		$("#loading").hide();
	};

	PhotoFloat.selectMedia = function(theAlbum, mediaFolderHash, mediaHash, hashParsed) {

		function keepOn() {
			hashParsed(theAlbum, media, i);
			if (util.isSearchCacheBase(theAlbum.cacheBase) && (media === null && ! util.isAlbumWithOneMedia(theAlbum)))
				$("ul#right-menu").addClass("expand");
		}

		util.initializeSortPropertiesAndCookies(theAlbum);
		util.sortAlbumsMedia(theAlbum);

		var i = -1, perhapsIsAProtectedMedia = false;
		var media = null;
		if (mediaHash !== null) {
			i = theAlbum.media.findIndex(
				function(thisMedia) {
					var matches =
						thisMedia.cacheBase === mediaHash &&
						(mediaFolderHash === null || thisMedia.foldersCacheBase === mediaFolderHash);
					return matches;
				}
			);
			if (i !== -1) {
				media = theAlbum.media[i];
				perhapsIsAProtectedMedia = false;
			} else {
				$("#loading").stop().hide();

				if (
					! perhapsIsAProtectedMedia &&
					util.numPasswords(theAlbum) &&
					// ! jQuery.isEmptyObject(theAlbum.numsProtectedMediaInSubTree) &&
					(
						theAlbum.subalbums.length == 0 ||
						util.sumUpNumsProtectedMedia(theAlbum.numsProtectedMediaInSubTree) > util.sumUpNumsProtectedMedia(util.sumNumsProtectedMediaOfArray(theAlbum.subalbums))
					)
				) {
					// the media not found could be a protected one, show the authentication dialog
					perhapsIsAProtectedMedia = true;
					util.showAuthForm(true);
				} else {
					// surely the media doesn't exist

					perhapsIsAProtectedMedia = false;
					$("#album-view").fadeOut(200).fadeIn(3500);
					$("#media-view").fadeOut(200);
					// $("#album-view").stop().fadeIn(3500);
					$("#error-text-image").stop().fadeIn(200);
					$("#error-text-image, #error-overlay, #auth-text").fadeOut(
						2500,
						function() {
							window.location.href = "#!" + theAlbum.cacheBase;
							// i = -1;
							// keepOn();
							$("#media-view").fadeIn(100);
						}
					);
				}
				return;
			}
		}
		keepOn();
	};

	PhotoFloat.hashCode = function(hash) {
		var codedHash, i, chr;

		if (hash.length === 0)
			return 0;
		else if (hash.indexOf('.') === -1)
			return hash;
		else {
			for (i = 0; i < hash.length; i++) {
				chr = hash.charCodeAt(i);
				codedHash = ((codedHash << 5) - codedHash) + chr;
				codedHash |= 0; // Convert to 32bit integer
			}
			return hash.replace(/\./g, '_') + '_' + codedHash;
		}
	};

	PhotoFloat.mediaHash = function(album, media) {
		return media.cacheBase;
	};

	PhotoFloat.cleanHash = function(hash) {
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
		return hash;
	};


	/* make static methods callable as member functions */
	PhotoFloat.prototype.getAlbum = PhotoFloat.getAlbum;
	PhotoFloat.prototype.getAlbumFromCache = PhotoFloat.getAlbumFromCache;
	PhotoFloat.prototype.mediaHash = PhotoFloat.mediaHash;
	PhotoFloat.prototype.encodeHash = PhotoFloat.encodeHash;
	PhotoFloat.prototype.cleanHash = PhotoFloat.cleanHash;
	PhotoFloat.prototype.decodeHash = PhotoFloat.decodeHash;
	PhotoFloat.prototype.upHash = PhotoFloat.upHash;
	PhotoFloat.prototype.hashCode = PhotoFloat.hashCode;
	PhotoFloat.prototype.endPreparingAlbumAndKeepOn = PhotoFloat.endPreparingAlbumAndKeepOn;
	PhotoFloat.prototype.searchAndSubalbumHash = PhotoFloat.searchAndSubalbumHash;

	/* expose class globally */
	window.PhotoFloat = PhotoFloat;
}());
