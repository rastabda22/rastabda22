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
		PhotoFloat.geotaggedPhotosFound = null;
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
		 		if (util.imagesAndVideosTotal(album.numsMedia) >= Options.js_cache_levels[level].mediaThreshold) {
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
			var cachedAlbum = PhotoFloat.cache.albums[cacheLevel][albumCacheBase];
			return cachedAlbum;
		} else
			return false;
	};

	PhotoFloat.removeAlbumFromCache = function(albumCacheBase) {
		if (! Options.hasOwnProperty("js_cache_levels"))
			Options.js_cache_levels = PhotoFloat.js_cache_levels;

		if (PhotoFloat.cache.albums.index.hasOwnProperty(albumCacheBase)) {
			var level = PhotoFloat.cache.albums.index[albumCacheBase];
			var queueIndex = PhotoFloat.cache.albums[level].queue.indexOf(albumCacheBase);
			PhotoFloat.cache.albums[level].queue.splice(queueIndex, 1);
			delete PhotoFloat.cache.albums[level][albumCacheBase];
			delete PhotoFloat.cache.albums.index[albumCacheBase];
			return true;
		} else
			return false;
	};

	PhotoFloat.addPositionsToSubalbums = function(thisAlbum) {
		var iPosition, iPhoto, position, subalbum, albumFromCache;
		var positions = thisAlbum.positionsAndMediaInTree;
		if (! thisAlbum.hasOwnProperty("subalbums")) {
			albumFromCache = PhotoFloat.getAlbumFromCache(thisAlbum.cacheBase);
			if (albumFromCache)
				thisAlbum = albumFromCache;
		}

		if (thisAlbum.hasOwnProperty("subalbums")) {
			for (let iSubalbum = 0; iSubalbum < thisAlbum.subalbums.length; ++ iSubalbum) {
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

	PhotoFloat.getStopWords = function() {
		return new Promise(
			function(resolve_getStopWords) {
				if (! Options.search_inside_words && Options.use_stop_words) {
					// before getting the file check whether it's in the cache
					if (PhotoFloat.cache.hasOwnProperty("stopWords") && PhotoFloat.cache.stopWords.length) {
						resolve_getStopWords();
					} else {
						PhotoFloat.cache.stopWords = [];
						// get the file
						var stopWordsFile = util.pathJoin([Options.server_cache_path, 'stopwords.json']);
						var ajaxOptions = {
							type: "GET",
							dataType: "json",
							url: stopWordsFile,
							success: function(stopWords) {
								PhotoFloat.cache.stopWords = stopWords.stopWords;
								resolve_getStopWords();
							}
						};
						ajaxOptions.error = function(jqXHR) {
							// TO DO something different should be made here?
							util.errorThenGoUp(jqXHR.status);
						};
						$.ajax(ajaxOptions);
					}
				} else {
					// stop words aren't used
					PhotoFloat.cache.stopWords = [];
					resolve_getStopWords();
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
						success: function(albumOrPositionsOrMedia) {
							let indexPosition = jsonRelativeFileName.lastIndexOf(".positions.json");
							let indexMedia = jsonRelativeFileName.lastIndexOf(".media.json");
							if (indexPosition >= 0 && indexPosition === jsonRelativeFileName.length - ".positions.json".length) {
								// positions file
							} else if (indexMedia >= 0 && indexMedia === jsonRelativeFileName.length - ".media.json".length) {
								// media file
								for (let iMedia = 0; iMedia < albumOrPositionsOrMedia.length; iMedia ++)
									albumOrPositionsOrMedia[iMedia] = new Media(albumOrPositionsOrMedia[iMedia]);
							} else {
								albumOrPositionsOrMedia = new Album(albumOrPositionsOrMedia);
							}
							resolve_getJsonFile(albumOrPositionsOrMedia);
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
							album.numsMedia = util.imagesAndVideosCount(album.media);
						album.includedFilesByCodesSimpleCombination = new IncludedFiles({",": {}});
						if (album.hasOwnProperty("media"))
							album.includedFilesByCodesSimpleCombination[","].mediaGot = true;
						if (album.hasOwnProperty("positionsAndMediaInTree"))
							album.includedFilesByCodesSimpleCombination[","].positionsGot = true;
						var mustGetMedia = getMedia && ! album.includedFilesByCodesSimpleCombination[","].hasOwnProperty("mediaGot");
						var mustGetPositions = getPositions && ! album.includedFilesByCodesSimpleCombination[","].hasOwnProperty("positionsGot");
						var promise = PhotoFloat.getMediaAndPositions(album.cacheBase, {"mustGetMedia": mustGetMedia,"mustGetPositions": mustGetPositions});
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
						// var emptyAlbum = {
						// 	"cacheBase": unprotectedCacheBase,
						// 	"subalbums": [],
						// 	"numsMedia": new ImagesAndVideos(),
						// 	"numsMediaInSubTree": new ImagesAndVideos(),
						// 	"sizesOfAlbum": JSON.parse(JSON.stringify(initialSizes)),
						// 	"sizesOfSubTree": JSON.parse(JSON.stringify(initialSizes)),
						// 	"numPositionsInTree": 0,
						// 	// "includedProtectedDirectories": [],
						// 	"empty": true
						// };
						// emptyAlbum.includedFilesByCodesSimpleCombination = new IncludedFiles({",": false});

						reject_getSingleUnprotectedCacheBase(emptyAlbum);
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
			album.includedFilesByCodesSimpleCombination = new IncludedFiles();
		if (! album.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination)) {
			album.includedFilesByCodesSimpleCombination[codesSimpleCombination] = {};
			if (codesSimpleCombination !== "," && ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination].hasOwnProperty(number))
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

							if (! album.hasOwnProperty("numsProtectedMediaInSubTree") || album.empty)
								// this is needed when getSingleProtectedCacheBaseWithExternalMediaAndPositions() is called by getNumsProtectedMediaInSubTreeProperty()
								album.numsProtectedMediaInSubTree = protectedAlbum.numsProtectedMediaInSubTree;

							if (! album.hasOwnProperty("name"))
								album.name = protectedAlbum.name;
							if (! album.hasOwnProperty("altName") && protectedAlbum.hasOwnProperty("altName"))
								album.altName = protectedAlbum.altName;
							if (! album.hasOwnProperty("ancestorsNames") && protectedAlbum.hasOwnProperty("ancestorsNames"))
								album.ancestorsNames = protectedAlbum.ancestorsNames;
							if (! album.hasOwnProperty("ancestorsCenters") && protectedAlbum.hasOwnProperty("ancestorsCenters"))
								album.ancestorsCenters = protectedAlbum.ancestorsCenters;

							album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].codesComplexCombination = protectedAlbum.codesComplexCombination;

							if (! protectedAlbum.hasOwnProperty("numsMedia"))
								protectedAlbum.numsMedia = util.imagesAndVideosCount(protectedAlbum.media);

							if (! album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot")) {
								if (protectedAlbum.subalbums.length)
									PhotoFloat.mergeProtectedSubalbums(album, protectedAlbum);

								album.numsMedia = util.imagesAndVideosSum(album.numsMedia, protectedAlbum.numsMedia);
								album.numsMediaInSubTree = util.imagesAndVideosSum(album.numsMediaInSubTree, protectedAlbum.numsMediaInSubTree);
								album.sizesOfSubTree = util.sumSizes(album.sizesOfSubTree, protectedAlbum.sizesOfSubTree);
								album.sizesOfAlbum = util.sumSizes(album.sizesOfAlbum, protectedAlbum.sizesOfAlbum);
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
										album.positionsAndMediaInTree = util.mergePositionsAndMedia(album.positionsAndMediaInTree, protectedAlbum.positionsAndMediaInTree);
									album.numPositionsInTree = album.positionsAndMediaInTree.length;
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
											// album.includedFilesByCodesSimpleCombination[","].mediaGot = true;
											album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.mediaGot = true;
										}

										if (positionsGot) {
											if (! album.hasOwnProperty("positionsAndMediaInTree") || ! album.positionsAndMediaInTree.length)
												album.positionsAndMediaInTree = positionsGot;
											else
												album.positionsAndMediaInTree = util.mergePositionsAndMedia(album.positionsAndMediaInTree, positionsGot);
											album.numPositionsInTree = album.positionsAndMediaInTree.length;
											// album.includedFilesByCodesSimpleCombination[","].positionsGot = true;
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
					if (album.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationInAlbum) && codesComplexCombinationInAlbum != ",") {
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
				if (album.hasOwnProperty("numsProtectedMediaInSubTree") && ! album.empty) {
					resolve_getNumsProtectedMediaInSubTreeProperty();
				} else {
					var iDirectory = -1;
					var getNumsProtectedMediaInSubTreePropertyPromise = getNextProtectedDirectory();
					getNumsProtectedMediaInSubTreePropertyPromise.then(
						resolve_getNumsProtectedMediaInSubTreeProperty,
						reject_getNumsProtectedMediaInSubTreeProperty
					);
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
		subalbum.numsMediaInSubTree = util.imagesAndVideosSum(subalbum.numsMediaInSubTree, protectedSubalbum.numsMediaInSubTree);
		subalbum.sizesOfSubTree = util.sumSizes(subalbum.sizesOfSubTree, protectedSubalbum.sizesOfSubTree);
		subalbum.sizesOfAlbum = util.sumSizes(subalbum.sizesOfAlbum, protectedSubalbum.sizesOfAlbum);
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
			function(resolve_addProtectedContent, reject_addProtectedContent) {
				var numsPromise;
				if (album.hasOwnProperty("numsProtectedMediaInSubTree") && ! album.empty) {
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
						reject_addProtectedContent();
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
								// numsProtectedMediaInSubTree couldn't be retrieved because no protected album was found
								reject_addProtectedContent();
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
					if (util.isMapCacheBase(album.cacheBase)) {
						// map albums are fixed, i.e. do not admit adding protected content
						resolve_continueAddProtectedContent();
					} else {
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
								if (! album.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination) || ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination])
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
												(! getMedia || album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("mediaGot")) &&
												(! getPositions || album.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("positionsGot"))
											) {
												// this cache base has been already loaded and either media/positions are already there or aren't needed now
												resolve_ithPromise();
											} else {
												let promise = PhotoFloat.getSingleProtectedCacheBaseWithExternalMediaAndPositions(protectedCacheBase, album, {"getMedia": getMedia, "getPositions": getPositions});
												promise.then(
													function() {
														if (PhotoFloat.isEmpty(album))
															album.empty = false;
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
				}
			);
		}

		// function isEquivalent(codesSimpleCombination, codesComplexCombinationGot) {
		// 	let codesCombinationsLists = PhotoFloat.convertComplexCombinationsIntoLists(codesSimpleCombination);
		// 	let albumCodesCombinationsList = codesCombinationsLists[0];
		// 	let mediaCodesCombinationList = codesCombinationsLists[1];
		// 	let codesCombinationsListsGot = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombinationGot);
		// 	let albumCodesCombinationsListGot = codesCombinationsListsGot[0];
		// 	let mediaCodesCombinationListGot = codesCombinationsListsGot[1];
		// 	var result =
		// 		! albumCodesCombinationsList.length &&
		// 		! albumCodesCombinationsListGot.length &&
		// 		mediaCodesCombinationList.length &&
		// 		mediaCodesCombinationListGot.length &&
		// 		util.arrayIntersect(mediaCodesCombinationList, mediaCodesCombinationListGot).length
		// 		||
		// 		albumCodesCombinationsList.length &&
		// 		albumCodesCombinationsListGot.length &&
		// 		! mediaCodesCombinationList.length &&
		// 		! mediaCodesCombinationListGot.length &&
		// 		util.arrayIntersect(albumCodesCombinationsList, albumCodesCombinationsListGot).length
		// 		||
		// 		albumCodesCombinationsList.length &&
		// 		albumCodesCombinationsListGot.length &&
		// 		mediaCodesCombinationList.length &&
		// 		mediaCodesCombinationListGot.length &&
		// 		util.arrayIntersect(albumCodesCombinationsList, albumCodesCombinationsListGot).length &&
		// 		util.arrayIntersect(mediaCodesCombinationList, mediaCodesCombinationListGot).length;
		// 	// result == true means that the combination is equivalent to the got one
		// 	return result;
		// }
	};

	PhotoFloat.getNumProtectedCacheBases = function(numsProtectedMediaInSubTree, codesComplexCombination) {
		var [albumCodesComplexCombinationList, mediaCodesComplexCombinationList] = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombination);

		var count = 0;
		for (var codesComplexCombinationFromObject in numsProtectedMediaInSubTree) {
			if (numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationFromObject) && codesComplexCombinationFromObject !== ",") {
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
		return album.empty;
	};

	PhotoFloat.hasUnprotectedContent = function(album) {
		return album.includedFilesByCodesSimpleCombination[","] !== false;
	};

	PhotoFloat.getAlbum = function(albumOrCacheBase, getAlbum_error, {getMedia = false, getPositions = false}) {
		// getAlbum_error is a function, and is executed when the album cannot be retrieved:
		// either because it doesn't exist or is a protected one

		return new Promise(
			function(resolve_getAlbum) {
				var albumCacheBase, album;
				if (typeof albumOrCacheBase === "string") {
					albumCacheBase = albumOrCacheBase;
					album = PhotoFloat.getAlbumFromCache(albumCacheBase);
				} else {
					album = albumOrCacheBase;
					albumCacheBase = album.cacheBase;
				}

				var promise;
				// add media and positions
				if (album) {
					if (
						// map albums and search albums already have all the media and positions
						util.isMapCacheBase(album.cacheBase) || util.isSearchCacheBase(album.cacheBase) || util.isSelectionCacheBase(album.cacheBase) ||
						// the album hasn't unprotected content
						album.includedFilesByCodesSimpleCombination[","] === false
					) {
						// not adding media/positions  => go immediately to promise.then
						promise = new Promise(
							function(resolve) {
								resolve([false, false]);
							}
						);
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
								album.includedFilesByCodesSimpleCombination[","].mediaGot = true;
							}

							if (positionsGot) {
								if (! album.hasOwnProperty("positionsAndMediaInTree") || ! album.positionsAndMediaInTree.length)
									album.positionsAndMediaInTree = positionsGot;
								else
									album.positionsAndMediaInTree = util.mergePositionsAndMedia(album.positionsAndMediaInTree, positionsGot);
								album.numPositionsInTree = album.positionsAndMediaInTree.length;
								album.includedFilesByCodesSimpleCombination[","].positionsGot = true;
							}

							var promise = PhotoFloat.addProtectedContent(album, {"getMedia": getMedia, "getPositions": getPositions});
							promise.then(
								function() {
									thingsToBeDoneBeforeResolvingGetAlbum(album);
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
				} else if (util.isMapCacheBase(albumCacheBase) || util.isSelectionCacheBase(albumCacheBase)) {
					// map albums are not on server:
					// if the album hasn't been passed as argument and isn't in cache => it could have been passed with POST and be put in postData["packedAlbum"]
					let stringifiedPackedAlbum, packedAlbum;
					if (typeof isPhp === "function" && typeof postData !== "undefined") {
						stringifiedPackedAlbum = postData.stringifiedPackedAlbum;
						console.log(stringifiedPackedAlbum);
						if (postData.typeOfPackedAlbum === "object") {
							packedAlbum = stringifiedPackedAlbum.split(',').map(x => parseInt(x, 10));
						} else {
							packedAlbum = stringifiedPackedAlbum;
						}
						selectorClickedToOpenTheMap = postData.selectorClickedToOpenTheMap;
						if (util.isMapCacheBase(albumCacheBase)) {
							mapAlbum = new Album(JSON.retrocycle(lzwCompress.unpack(packedAlbum)));
							// mapAlbum = JSON.retrocycle(lzwCompress.unpack(packedAlbum));
							resolve_getAlbum(mapAlbum);
						} else if (util.isSelectionCacheBase(albumCacheBase)) {
							selectionAlbum = new Album(JSON.retrocycle(lzwCompress.unpack(packedAlbum)));
							// mapAlbum = JSON.retrocycle(lzwCompress.unpack(packedAlbum));
							resolve_getAlbum(selectionAlbum);
						} else {
							album = new Album(JSON.retrocycle(lzwCompress.unpack(packedAlbum)));
							resolve_getAlbum(album);
						}
					} else {
						// go to root album
						// execution arrives here if a map album is reloaded or opened from a link
						$("#loading").hide();
						$("#error-nonexistent-map-album").stop().fadeIn(200);
						$("#error-nonexistent-map-album").fadeOut(
							2000,
							function () {
								window.location.href = util.upHash();
							}
						);
					}
				} else {
					// neiter the album has been passed as argument, nor is in cache, get it brand new
					promise = PhotoFloat.getSingleUnprotectedCacheBaseWithExternalMediaAndPositions(albumCacheBase, {"getMedia": getMedia, "getPositions": getPositions});
					promise.then(
						function unprotectedAlbumGot(album) {
							if (PhotoFloat.hasProtectedContent(album)) {
								var promise = PhotoFloat.addProtectedContent(album, {"getMedia": getMedia, "getPositions": getPositions});
								promise.then(
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
							var promise = PhotoFloat.addProtectedContent(emptyAlbum, {"getMedia": getMedia, "getPositions": getPositions});
							promise.then(
								function() {
									thingsToBeDoneBeforeResolvingGetAlbum(emptyAlbum);
									resolve_getAlbum(emptyAlbum);
								},
								function() {
									// neither the unprotected nor any protected album exists = nonexistent album
									getAlbum_error();
								}
								// function() {
								// 	console.trace();
								// }
							);
						}
					);
				}
			}
		);
		// end of getalbum function

		function thingsToBeDoneBeforeResolvingGetAlbum(theAlbum) {
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
				// if (! theAlbum.hasOwnProperty("positionsAndMediaInTree"))
				// 	theAlbum.numPositionsInTree = 0;

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
		//////// end of thingsToBeDoneBeforeResolvingGetAlbum function

		// auxiliary function
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
						index = Math.floor(Math.random() * (util.imagesAndVideosTotal(album.numsMediaInSubTree)));
						nextAlbum(album);
					},
					function() {
						console.trace();
					}
				);
				//// end of function pickRandomMedia ////////////////////

				function nextAlbum(album) {

					var i, nMediaInAlbum;

					if (! util.imagesAndVideosTotal(album.numsMediaInSubTree)) {
						error();
						return;
					}

					nMediaInAlbum = util.imagesAndVideosTotal(album.numsMedia);
					if (index >= nMediaInAlbum) {
						index -= nMediaInAlbum;
						let found = false;
						let targetCacheBase;
						// if (! album.subalbums.length) {
						// 	found = true;
						// 	targetCacheBase = album.cacheBase;
						// }
						for (i = 0; i < album.subalbums.length; i ++) {
							if (index >= util.imagesAndVideosTotal(album.subalbums[i].numsMediaInSubTree))
								index -= util.imagesAndVideosTotal(album.subalbums[i].numsMediaInSubTree);
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

	PhotoFloat.encodeHash = function(albumCacheBase, media, foundAlbumHash, savedSearchAlbumHash) {
		var hash;

		if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
			savedSearchAlbumHash = PhotoFloat.cleanHash(savedSearchAlbumHash);
			foundAlbumHash = PhotoFloat.cleanHash(foundAlbumHash);
		}

		if (media !== null) {
			// media hash
			if (util.isFolderCacheBase(albumCacheBase)) {
				if (typeof savedSearchAlbumHash === "undefined" || savedSearchAlbumHash === null)
					// media in folders album, count = 2
					hash = util.pathJoin([
						albumCacheBase,
						media.cacheBase
					]);
				else
					// media in found album or in one of its subalbum, count = 4
					hash = util.pathJoin([
						albumCacheBase,
						foundAlbumHash,
						savedSearchAlbumHash,
						media.cacheBase
					]);
			} else if (
				util.isByDateCacheBase(albumCacheBase) ||
				util.isByGpsCacheBase(albumCacheBase) ||
				util.isSearchCacheBase(albumCacheBase) && (typeof savedSearchAlbumHash === "undefined" || savedSearchAlbumHash === null) ||
				util.isSelectionCacheBase(albumCacheBase) ||
				util.isMapCacheBase(albumCacheBase)
			)
				// media in date or gps album, count = 3
				hash = util.pathJoin([
					albumCacheBase,
					media.foldersCacheBase,
					media.cacheBase
				]);
		} else {
			// no media: album hash
			if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
				// found album or one of its subalbums, count = 3
				hash = util.pathJoin([
					albumCacheBase,
					foundAlbumHash,
					savedSearchAlbumHash
				]);
			else
				// plain search album, count = 1
				// folders album, count = 1
				hash = albumCacheBase;
		}
		return hashBeginning + hash;
	};

	PhotoFloat.decodeHash = function(hash) {
		// decodes the hash and returns its components

		var hashParts, hashPartsCount, albumHash, mediaFolderHash = null, mediaHash = null;
		var savedSearchAlbumHash = null, foundAlbumHash = null;

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
				// gps or date or search or selection hash: album, album where the image is, media
				// subfolder of search hash: album, search subalbum, search album
				if (util.isSearchCacheBase(hashParts[2]) || util.isSelectionCacheBase(hashParts[2])) {
					albumHash = hashParts[0];
					foundAlbumHash = hashParts[1];
					savedSearchAlbumHash = hashParts[2];
				} else {
					albumHash = hashParts[0];
					mediaFolderHash = hashParts[1];
					mediaHash = hashParts[2];
				}
			} else if (hashPartsCount == 4) {
				albumHash = hashParts[0];
				foundAlbumHash = hashParts[1];
				savedSearchAlbumHash = hashParts[2];
				mediaHash = hashParts[3];
			}
		}
		return [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash];
	};

	// PhotoFloat.prototype.geotaggedPhotosExist = function() {
	// 	return (Options.num_positions_in_tree > 0);
		// return new Promise(
		// 	function(resolveGeotaggedPhotosExist) {
		// 		var self;
		// 		// this function returns true if the root album has the by gps subalbum
		// 		if (PhotoFloat.geotaggedPhotosFound !== null) {
		// 			if (PhotoFloat.geotaggedPhotosFound) {
		// 				resolveGeotaggedPhotosExist(true);
		// 			} else {
		// 				resolveGeotaggedPhotosExist(false);
		// 			}
		// 		} else {
		// 			self = this;
		// 			// error is executed if no gps json file has been found (but gps json file must exist)
		// 			var promise = PhotoFloat.getAlbum(
		// 				Options.folders_string,
		// 				function() {
		// 					PhotoFloat.geotaggedPhotosFound = false;
		// 					resolveGeotaggedPhotosExist(false);
		// 				},
		// 				{"getMedia": false, "getPositions": true}
		// 			);
		// 			promise.then(
		// 				function(foldersRootAlbum) {
		// 					if (! foldersRootAlbum.numPositionsInTree) {
		// 						// $("#by-gps-view").addClass("hidden");
		// 						PhotoFloat.geotaggedPhotosFound = false;
		// 						resolveGeotaggedPhotosExist(false);
		// 					} else {
		// 						PhotoFloat.geotaggedPhotosFound = true;
		// 						resolveGeotaggedPhotosExist(true);
		// 					}
		// 				},
		// 				function() {
		// 					console.trace();
		// 				}
		// 			);
		// 		}
		// 	}
		// );
	// };

	PhotoFloat.prototype.parseHashAndReturnAlbumAndMedia = function(hash) {
		return new Promise(
			function(resolve_parseHash, reject_parseHash) {
				var removedStopWords = [];
				var searchWordsFromUser = [], searchWordsFromUserNormalized = [], searchWordsFromUserNormalizedAccordingToOptions = [];
				var albumHashToGet, albumHashes = [], wordSubalbums = [];
				var [albumHash, mediaHash, mediaFolderHash] = PhotoFloat.decodeHash(hash);
				var indexWords, indexAlbums, wordsWithOptionsString;
				// this vars are defined here and not at the beginning of the file because the options must have been read

				$("#message-too-many-images").hide();
				$(".search-failed").hide();
				// $("#media-view").removeClass("hidden");
				// $("ul#right-menu li#album-search").removeClass("hidden");
				$("ul#right-menu li#any-word").removeClass("dimmed");
				$("#album-view, #album-view #subalbums, #album-view #thumbs").removeClass("hidden");

				if (albumHash) {
					albumHash = decodeURI(albumHash);

					// if (util.isAnyRootHash(albumHash))
					// 	$("ul#right-menu li#album-search").addClass("hidden");

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

						Options.cache_base_to_search_in = splittedAlbumHash.slice(2).join(Options.cache_folder_separator);

						// if (util.isAnyRootCacheBase(Options.cache_base_to_search_in))
						// 	$("ul#right-menu li#album-search").addClass("hidden");

						// if (util.isSearchHash() && Options.search_refine)
						// 	Options.cache_base_to_search_in = albumHash;

						$("ul#right-menu #search-field").attr("value", wordsStringOriginal);
						wordsString = util.normalizeAccordingToOptions(wordsString);
						searchWordsFromUser = wordsString.split('_');
						searchWordsFromUserNormalizedAccordingToOptions = wordsStringNormalizedAccordingToOptions.split(' ');
						searchWordsFromUserNormalized = wordsStringNormalized.split(' ');

						if (searchWordsFromUser.length == 1)
							$("ul#right-menu li#any-word").addClass("dimmed").off("click");


						if (albumHash == Options.by_search_string) {
							searchAlbum = util.initializeSearchAlbumBegin(albumHash, mediaFolderHash);
							// no search term
							// TO DO: does execution actually arrive here?
							util.noResults(searchAlbum, '#no-search-string');
							// the resolve function is needed at least in order to show the title
							resolve_parseHash([searchAlbum, -1]);
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
				if (
					albumFromCache &&
					! PhotoFloat.guessedPasswordsMd5.length &&
					albumFromCache.hasOwnProperty("subalbums") &&
					albumFromCache.hasOwnProperty("media") &&
					albumFromCache.hasOwnProperty("positionsAndMediaInTree")
				) {
					if (
						util.isSearchCacheBase(albumHash) &&
						! albumFromCache.subalbums.length &&
						! albumFromCache.media.length
					) {
						// it's a search with no results
						util.noResults(albumFromCache);
						// the resolve function is needed at least in order to show the title
						resolve_parseHash([albumFromCache, -1]);
					} else {
						// it's not a search without results: everything is ok, resolve!
						let result = PhotoFloat.getMediaIndex(albumFromCache, mediaFolderHash, mediaHash);
						if (result === null) {
							// getMediaIndex arguments don't match any media in the album,
							// in getMediaIndex either the authentication dialog has been shown or the hash has been changed to the album
							// Nothing to do
						} else {
							resolve_parseHash([albumFromCache, result]);
						}
					}
				} else if (! util.isSearchCacheBase(albumHash) || searchWordsFromUser.length === 0) {
					// something is missing, getAlbum must be called
					promise = PhotoFloat.getAlbum(albumHashToGet, reject_parseHash, {"getMedia": true, "getPositions": true});
					promise.then(
						function(album) {
							let result = PhotoFloat.getMediaIndex(album, mediaFolderHash, mediaHash);
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
					searchAlbum = util.initializeSearchAlbumBegin(albumHash, mediaFolderHash);

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
				// end of parseHashAndReturnAlbumAndMedia promise code

				function subalbumsAbsentOrGot() {
					var indexMedia, indexSubalbums;
					if (searchAlbum.media.length === 0 && searchAlbum.subalbums.length === 0) {
						util.noResults(searchAlbum);
					} else {
						$(".search-failed").hide();
					}

					for (indexMedia = 0; indexMedia < searchAlbum.media.length; indexMedia ++) {
						// add the parent to the media
						searchAlbum.media[indexMedia].parent = searchAlbum;
						if (util.hasGpsData(searchAlbum.media[indexMedia]))
							// add the media position
							searchAlbum.positionsAndMediaInTree =
								util.addSingleMediaToPositionsAndMedia(
									searchAlbum.positionsAndMediaInTree,
									searchAlbum.media[indexMedia]
								);
							searchAlbum.numPositionsInTree = searchAlbum.positionsAndMediaInTree.length;
					}

					if (searchAlbum.subalbums.length) {
						for (indexSubalbums = 0; indexSubalbums < searchAlbum.subalbums.length; indexSubalbums ++) {
							// update the media count
							searchAlbum.numsMediaInSubTree = util.imagesAndVideosSum(searchAlbum.numsMediaInSubTree, searchAlbum.subalbums[indexSubalbums].numsMediaInSubTree);
							// update the size totals
							searchAlbum.sizesOfSubTree = util.sumSizes(searchAlbum.sizesOfSubTree, searchAlbum.subalbums[indexSubalbums].sizesOfSubTree);
							searchAlbum.sizesOfAlbum = util.sumSizes(searchAlbum.sizesOfAlbum, searchAlbum.subalbums[indexSubalbums].sizesOfAlbum);
							// add the points from the subalbums

							// the subalbum could still have no positionsAndMediaInTree array, get it
							if (! searchAlbum.subalbums[indexSubalbums].hasOwnProperty("positionsAndMediaInTree"))
								searchAlbum.subalbums[indexSubalbums].positionsAndMediaInTree = [];
								searchAlbum.subalbums[indexSubalbums].numPositionsInTree = 0;
						}
					}
					var promise = PhotoFloat.endPreparingAlbumAndKeepOn(searchAlbum, mediaHash, mediaFolderHash);
					promise.then(
						function(i) {
							resolve_parseHash([searchAlbum, i]);
						}
					);
				}

				function buildSearchResult() {
					searchAlbum.removedStopWords = removedStopWords;
					// has any word remained after stop words have been removed?
					if (searchWordsFromUser.length == 0) {
						util.noResults(searchAlbum, '#no-search-string-after-stopwords-removed');
						resolve_parseHash([searchAlbum, -1]);
						return;
					}

					// get the search root album before getting the search words ones
					var promise = PhotoFloat.getAlbum(Options.by_search_string, reject_parseHash, {"getMedia": true, "getPositions": true});
					promise.then(
						function(bySearchRootAlbum) {
							var lastIndex, i, j, wordHashes, numSearchAlbumsReady = 0, numSubAlbumsToGet = 0, normalizedWords;
							var searchResultsMedia = [];
							var searchResultsSubalbums = [];

							PhotoFloat.putAlbumIntoCache(Options.by_search_string, bySearchRootAlbum);

							// searchAlbum.ancestorsCacheBase = bySearchRootAlbum.ancestorsCacheBase.slice();
							// searchAlbum.ancestorsCacheBase.push(wordsWithOptionsString);
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
								util.noResults(searchAlbum);
								resolve_parseHash([searchAlbum, -1]);
							} else if (numSubAlbumsToGet > Options.max_search_album_number) {
								util.noResults(searchAlbum, '#search-too-wide');
								resolve_parseHash([searchAlbum, -1]);
							} else {
								$(".search-failed").hide();
								util.initializeSearchAlbumEnd();
								searchAlbum.numsProtectedMediaInSubTree = util.sumNumsProtectedMediaOfArray(wordSubalbums);
								for (indexWords = 0; indexWords <= lastIndex; indexWords ++) {
									searchResultsMedia[indexWords] = [];
									searchResultsSubalbums[indexWords] = [];
									for (indexAlbums = 0; indexAlbums < albumHashes[indexWords].length; indexAlbums ++) {
										let thisIndexWords = indexWords, thisIndexAlbums = indexAlbums;
										var promise = PhotoFloat.getAlbum(albumHashes[thisIndexWords][thisIndexAlbums], reject_parseHash, {"getMedia": true, "getPositions": true});
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
																util.isAnyRootCacheBase(Options.cache_base_to_search_in) || (
																	// check whether the media is inside the current album tree
																	ithMedia.foldersCacheBase.indexOf(Options.cache_base_to_search_in) === 0 ||
																	ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(Options.cache_base_to_search_in) === 0 ||
																	ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(Options.cache_base_to_search_in) === 0 ||
																	util.isMapCacheBase(Options.cache_base_to_search_in) &&
																	PhotoFloat.getAlbumFromCache(Options.cache_base_to_search_in).media.some(
																		function(singleMedia) {
																			return singleMedia.cacheBase == ithMedia.cacheBase && singleMedia.foldersCacheBase == ithMedia.foldersCacheBase;
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
																util.isAnyRootCacheBase(Options.cache_base_to_search_in) || (
																	// check whether the media is inside the current album tree
																	ithSubalbum.cacheBase.indexOf(Options.cache_base_to_search_in) === 0 &&
																	ithSubalbum.cacheBase != Options.cache_base_to_search_in
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
																util.isAnyRootCacheBase(Options.cache_base_to_search_in) || (
																	// check whether the media is inside the current album tree
																	ithMedia.foldersCacheBase.indexOf(Options.cache_base_to_search_in) === 0 ||
																	ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(Options.cache_base_to_search_in) === 0 ||
																	ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(Options.cache_base_to_search_in) === 0 ||
																	util.isMapCacheBase(Options.cache_base_to_search_in) &&
																	PhotoFloat.getAlbumFromCache(Options.cache_base_to_search_in).media.some(
																		function(singleMedia) {
																			return singleMedia.cacheBase == ithMedia.cacheBase && singleMedia.foldersCacheBase == ithMedia.foldersCacheBase;
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
																util.isAnyRootCacheBase(Options.cache_base_to_search_in) || (
																	// check whether the media is inside the current album tree
																	ithSubalbum.cacheBase.indexOf(Options.cache_base_to_search_in) === 0 &&
																	ithSubalbum.cacheBase != Options.cache_base_to_search_in
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
													searchAlbum.media = searchResultsMedia[0];
													searchAlbum.subalbums = searchResultsSubalbums[0];
													for (indexWords1 = 1; indexWords1 <= lastIndex; indexWords1 ++) {
														if (indexWords1 in searchResultsMedia) {
															searchAlbum.media = Options.search_any_word ?
																util.union(searchAlbum.media, searchResultsMedia[indexWords1]) :
																util.intersect(searchAlbum.media, searchResultsMedia[indexWords1]);
														}
														if (indexWords1 in searchResultsSubalbums) {
															searchAlbum.subalbums = Options.search_any_word ?
																util.union(searchAlbum.subalbums, searchResultsSubalbums[indexWords1]) :
																util.intersect(searchAlbum.subalbums, searchResultsSubalbums[indexWords1]);
														}
													}

													if (lastIndex != searchWordsFromUser.length - 1) {
														// we still have to filter out the media that do not match the words after the first
														// we are in all words search mode
														matchingMedia = [];
														for (indexMedia = 0; indexMedia < searchAlbum.media.length; indexMedia ++) {
															match = true;
															if (! Options.search_inside_words) {
																// whole word
																normalizedWords = util.normalizeAccordingToOptions(searchAlbum.media[indexMedia].words);
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
																	normalizedWords = util.normalizeAccordingToOptions(searchAlbum.media[indexMedia].words);
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
															if (match && matchingMedia.indexOf(searchAlbum.media[indexMedia]) == -1)
																matchingMedia.push(searchAlbum.media[indexMedia]);
														}
														searchAlbum.media = matchingMedia;

														// search albums need to conform to default behaviour of albums:
														// json files have subalbums and media sorted by date not reversed
														util.sortByDate(searchAlbum.media);

														matchingSubalbums = [];
														for (indexSubalbums = 0; indexSubalbums < searchAlbum.subalbums.length; indexSubalbums ++) {
															match = true;
															if (! Options.search_inside_words) {
																// whole word
																normalizedWords = util.normalizeAccordingToOptions(searchAlbum.subalbums[indexSubalbums].words);
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
																	normalizedWords = util.normalizeAccordingToOptions(searchAlbum.subalbums[indexSubalbums].words);
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
															if (match && matchingSubalbums.indexOf(searchAlbum.subalbums[indexSubalbums]) == -1)
																matchingSubalbums.push(searchAlbum.subalbums[indexSubalbums]);
														}

														searchAlbum.subalbums = matchingSubalbums;

														if (searchAlbum.subalbums.length) {
															// search albums need to conform to default behaviour of albums: json files have subalbums and media sorted by date not reversed
															util.sortByDate(searchAlbum.subalbums);
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
		if (! PhotoFloat.cache.stopWords.length) {
			searchWordsFromUserWithoutStopWords = searchWordsFromUser;
			searchWordsFromUserWithoutStopWordsNormalized = searchWordsFromUserNormalized;
			searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions = searchWordsFromUserNormalizedAccordingToOptions;
		} else {
			for (var i = 0; i < searchWordsFromUser.length; i ++) {
				if (
					PhotoFloat.cache.stopWords.every(
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
		}

		return [searchWordsFromUserWithoutStopWords, searchWordsFromUserWithoutStopWordsNormalized, searchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions, removedStopWords];
	};

	PhotoFloat.endPreparingAlbumAndKeepOn = function(resultsAlbumFinal, mediaHash, mediaFolderHash) {
		return new Promise(
			function(resolve_endPreparingAlbumAndKeepOn) {
				// add the various counts
				resultsAlbumFinal.numsMediaInSubTree = util.imagesAndVideosCount(resultsAlbumFinal.media);
				resultsAlbumFinal.numsMedia = util.imagesAndVideosCount(resultsAlbumFinal.media);
				resultsAlbumFinal.numPositionsInTree = resultsAlbumFinal.positionsAndMediaInTree.length;
				// save in the cache array
				if (! PhotoFloat.getAlbumFromCache(resultsAlbumFinal.cacheBase))
					PhotoFloat.putAlbumIntoCache(resultsAlbumFinal.cacheBase, resultsAlbumFinal);

				var result = PhotoFloat.getMediaIndex(resultsAlbumFinal, mediaFolderHash, mediaHash);
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

	PhotoFloat.getMediaIndex = function(theAlbum, mediaFolderHash, mediaHash) {
		// returns the index of the media identified by the arguments
		// returns null if no media matches

		util.initializeSortPropertiesAndCookies(theAlbum);
		util.sortAlbumsMedia(theAlbum);

		var mediaIndex = -1;
		if (mediaHash !== null) {
			mediaIndex = theAlbum.media.findIndex(
				function(thisMedia) {
					var matches =
						thisMedia.cacheBase === mediaHash &&
						(mediaFolderHash === null || thisMedia.foldersCacheBase === mediaFolderHash);
					return matches;
				}
			);
			if (mediaIndex === -1) {
				$("#loading").stop().hide();

				if (
					util.numPasswords(theAlbum, true) &&
					// ! jQuery.isEmptyObject(theAlbum.numsProtectedMediaInSubTree) &&
					(
						theAlbum.subalbums.length == 0 ||
						util.sumUpNumsProtectedMedia(theAlbum.numsProtectedMediaInSubTree) > util.sumUpNumsProtectedMedia(util.sumNumsProtectedMediaOfArray(theAlbum.subalbums))
					)
				) {
					// the media not found could be a protected one, show the authentication dialog, it could be a protected media
					util.showAuthForm(null, true);
				} else {
					// surely the media doesn't exist

					$("#album-view").fadeOut(200).fadeIn(3500);
					$("#media-view").fadeOut(200);
					// $("#album-view").stop().fadeIn(3500);
					$("#error-text-image").stop().fadeIn(200);
					$("#error-text-image, #error-overlay, #auth-text").fadeOut(
						2500,
						function() {
							window.location.href = "#!" + theAlbum.cacheBase;
							// mediaIndex = -1;
							// keepOn();
							$("#media-view").fadeIn(100);
						}
					);
				}
				return null;
			}
		}
		if (
			util.isSearchCacheBase(theAlbum.cacheBase)
			// && (media === null && ! util.isAlbumWithOneMedia(theAlbum))
		) {
			$("ul#right-menu").addClass("expand");
			util.focusSearchField();
		}
		return mediaIndex;
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

	PhotoFloat.mediaHash = function(album, singleMedia) {
		return singleMedia.cacheBase;
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

		if (! hash)
			hash = Options.folders_string;
		return hash;
	};


	/* make static methods callable as member functions */
	PhotoFloat.prototype.getAlbum = PhotoFloat.getAlbum;
	PhotoFloat.prototype.getAlbumFromCache = PhotoFloat.getAlbumFromCache;
	PhotoFloat.prototype.mediaHash = PhotoFloat.mediaHash;
	PhotoFloat.prototype.encodeHash = PhotoFloat.encodeHash;
	PhotoFloat.prototype.cleanHash = PhotoFloat.cleanHash;
	PhotoFloat.prototype.decodeHash = PhotoFloat.decodeHash;
	PhotoFloat.prototype.hashCode = PhotoFloat.hashCode;
	PhotoFloat.prototype.endPreparingAlbumAndKeepOn = PhotoFloat.endPreparingAlbumAndKeepOn;
	PhotoFloat.prototype.searchAndSubalbumHash = PhotoFloat.searchAndSubalbumHash;
	PhotoFloat.prototype.getStopWords = PhotoFloat.getStopWords;
	PhotoFloat.prototype.removeStopWords = PhotoFloat.removeStopWords;
	PhotoFloat.prototype.removeAlbumFromCache = PhotoFloat.removeAlbumFromCache;

	/* expose class globally */
	window.PhotoFloat = PhotoFloat;
}());
