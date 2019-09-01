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
		this.searchAlbumCacheBaseFromJsonFile = [];

		PhotoFloat.searchAndSubalbumHash = '';
		PhotoFloat.searchWordsFromJsonFile = this.searchWordsFromJsonFile;
		PhotoFloat.searchAlbumCacheBaseFromJsonFile = this.searchAlbumCacheBaseFromJsonFile;

		// temporary, will be removed later
		PhotoFloat.js_cache_levels = [
			{"numMedia": 10000, "max": 1},
			{"numMedia": 2000, "max": 2},
			{"numMedia": 500, "max": 10},
			{"numMedia": 200, "max": 50}
		];
	}

	/* public member functions */
	PhotoFloat.initializeMapRootAlbum = function() {
		// prepare the root of the map albums and put it in the cache
		var rootMapAlbum = {};
		rootMapAlbum.cacheBase = Options.by_map_string;
		rootMapAlbum.subalbums = [];
		rootMapAlbum.media = [];
		rootMapAlbum.positionsAndMediaInTree = [];

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
	 		if (album.media.length >= Options.js_cache_levels[level].numMedia) {
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
		var iSubalbum, iPosition, iPhoto, position, subalbum;
		var positions = thisAlbum.positionsAndMediaInTree;
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
						error: reject_getJsonFile
					}
				);
			}
		);
	};

	PhotoFloat.addPositionsAndMedia = function(theAlbum, {getPositions = false, getMedia = false} = {}) {

		var positionsPromise = addPositions(theAlbum);
		var mediaPromise = addMedia(theAlbum);
		return new Promise(
			function(resolve_AddPositionsAndMedia) {
				Promise.all([positionsPromise, mediaPromise]).then(
					function() {
						resolve_AddPositionsAndMedia(theAlbum);
					}
				// ).catch(
				// 	function(album) {
				// 		console.trace();
				// 	}
				);
			}
		);

		// auxiliary functions

		function addPositions(album) {
			return new Promise(
				function(resolve_addPositions, reject_addPositionsAndMedia) {
					var positionJsonFile;
					// are positions still missing?
					if (getPositions && ! album.hasOwnProperty("positionsAndMediaInTree")) {
						if (album.hasOwnProperty("cacheBaseToGet"))
							positionJsonFile = album.cacheBaseToGet + '.positions.json';
						else
							positionJsonFile = album.cacheBase + '.positions.json';
						var promise = PhotoFloat.getJsonFile(positionJsonFile);
						promise.then(
							function(positions) {
								album.positionsAndMediaInTree = positions;
								// // we must add the corresponding positions to every subalbums
								if (album.cacheBase != Options.by_search_string)
									PhotoFloat.addPositionsToSubalbums(album);
								resolve_addPositions(album);
							}
						);
						promise.catch(
							function(album) {
								resolve_addPositions(album);
							}
						);
					} else {
						resolve_addPositions(album);
					}
				}
			);
		}

		function addMedia(album) {
			return new Promise(
				function(resolve_addMedia, internalReject) {
					var mediaJsonFile;
					// are media still missing?
					if (getMedia && ! album.hasOwnProperty("media")) {
						if (album.hasOwnProperty("cacheBaseToGet"))
							mediaJsonFile = album.cacheBaseToGet + '.media.json';
						else
							mediaJsonFile = album.cacheBase + '.media.json';
						var promise = PhotoFloat.getJsonFile(mediaJsonFile);
						promise.then(
							function(media) {
								album.media = media;
								resolve_addMedia(album);
							}
						);
						promise.catch(
							function(album) {
								resolve_addMedia(album);
							}
						);
					} else {
						resolve_addMedia(album);
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

	PhotoFloat.getSingleUnprotectedCacheBase = function(albumCacheBase, {getPositions = false, getMedia = false} = {}) {
		// this function is needed in order to get a single json file, either protected or not
		//
		// album only makes sense if albumCacheBase is a protected one

		return new Promise(
			function(resolve_getSingleUnprotectedCacheBase) {
				var jsonFile = albumCacheBase + ".json";

				var promise = PhotoFloat.getJsonFile(jsonFile);
				promise.then(
					function fileExists(theAlbum) {
						// function fileExists(theAlbum, getJsonData) {
						// var getPositions = getJsonData.getPositions;
						// var getMedia = getJsonData.getMedia;
						var promise;
						promise = PhotoFloat.addPositionsAndMedia(theAlbum, {"getPositions": getPositions, "getMedia": getMedia});
						promise.then(
							function(theAlbum) {
								resolve_getSingleUnprotectedCacheBase(theAlbum);
							}
						);
						promise.catch(
							function(album) {
								console.trace();
							}
						);
					}
				);
				promise.catch(
					function FileDoesntExist() {
						// execution arrives here if the json file doesn't exist
						var emptyAlbum = {
							"cacheBase": albumCacheBase,
							"subalbums": [],
							"numMedia": 0,
							"numMediaInSubTree": 0,
							"numPositionsInTree": 0,
							// "includedProtectedDirectories": [],
							"includedCodesComplexCombinations": [],
							// "includedCodesComplexCombinationsCounts": [],
							"empty": true
						};

						if (! PhotoFloat.guessedPasswordsMd5.length) {
							emptyAlbum.media = [];
							emptyAlbum.subalbums = [];
							emptyAlbum.path = albumCacheBase.replace(Options.cache_folder_separator, "/");
							if (util.isSearchCacheBase(albumCacheBase))
								util.noResults(emptyAlbum);
						} else {
							// look for a protected album
							// baseJsonFileExists = false;
							var cacheBase = albumCacheBase.substring(albumCacheBase.lastIndexOf('/') + 1);
							emptyAlbum.cacheBase = cacheBase;
							var promise = PhotoFloat.addProtectedContent(emptyAlbum, {"getPositions": getPositions, "getMedia": getMedia});
							promise.then(
								function() {
									resolve_getSingleUnprotectedCacheBase(emptyAlbum);
								}
							);
							promise.catch(
								function(album) {
									console.trace();
								}
							);
						}
					}
				);
			}
		);
	};

	PhotoFloat.getSingleProtectedCacheBase = function(protectedCacheBase, album, {getPositions = false, getMedia = false} = {}) {
		var protectedDirectory = protectedCacheBase.substring(0, protectedCacheBase.indexOf('/'));

		// this function is needed in order to get a single json file, either protected or not

		return new Promise(
			function(resolve_getSingleProtectedCacheBase, reject_getSingleProtectedCacheBase) {
				var jsonFile = protectedCacheBase + ".json";

				var promise = PhotoFloat.getJsonFile(jsonFile);
				promise.then(
					function fileExists(protectedAlbum) {
						// if (album.includedCodesComplexCombinations.indexOf(protectedAlbum.codesComplexCombination) !== -1) {
						// 	// the protected album is already included, pass a null album so that nothing is done with it
						// 	resolve_getSingleProtectedCacheBase(null);
						// } else {
						protectedAlbum.cacheBaseToGet = protectedCacheBase;
						var promise = PhotoFloat.addPositionsAndMedia(protectedAlbum);
						promise.then(
							function(protectedAlbum) {
								resolve_getSingleProtectedCacheBase(protectedAlbum);
							}
						);
						promise.catch(
							function(album) {
								console.trace();
							}
						);
						// }
					}
				);
				promise.catch(
					function FileDoesntExist() {
						// execution arrives here if the json file doesn't exist
						// do not do anything, i.e. another protected cache base will be processed
						reject_getSingleProtectedCacheBase();
					}
				);
			}
		);
	};

	PhotoFloat.protectedDirectoriesToGet = function() {
		var iAlbumPassword, iMediaPassword, albumGuessedPassword, mediaGuessedPassword, protectedDirectory;
		var theProtectedDirectoriesToGet = [];

		for (iAlbumPassword = 0; iAlbumPassword < PhotoFloat.guessedPasswordsMd5.length; iAlbumPassword ++) {
			albumGuessedPassword = PhotoFloat.guessedPasswordsMd5[iAlbumPassword];
			protectedDirectory = Options.protected_directories_prefix + albumGuessedPassword + ',';
			theProtectedDirectoriesToGet.push(protectedDirectory);
		}
		for (iMediaPassword = 0; iMediaPassword < PhotoFloat.guessedPasswordsMd5.length; iMediaPassword ++) {
			mediaGuessedPassword = PhotoFloat.guessedPasswordsMd5[iMediaPassword];
			protectedDirectory = Options.protected_directories_prefix + ',' + mediaGuessedPassword;
			theProtectedDirectoriesToGet.push(protectedDirectory);
		}
		for (iAlbumPassword = 0; iAlbumPassword < PhotoFloat.guessedPasswordsMd5.length; iAlbumPassword ++) {
			albumGuessedPassword = PhotoFloat.guessedPasswordsMd5[iAlbumPassword];
			for (iMediaPassword = 0; iMediaPassword < PhotoFloat.guessedPasswordsMd5.length; iMediaPassword ++) {
				mediaGuessedPassword = PhotoFloat.guessedPasswordsMd5[iMediaPassword];
				protectedDirectory = Options.protected_directories_prefix + albumGuessedPassword + ',' + mediaGuessedPassword;
				theProtectedDirectoriesToGet.push(protectedDirectory);
			}
		}
		return theProtectedDirectoriesToGet;
	};


	PhotoFloat.codesComplexCombinationsToGet = function(album) {
		var iAlbumPassword, iMediaPassword, albumGuessedPassword, mediaGuessedPassword;
		var albumCode, mediaCode, lists, albumCodesComplexCombinationList, mediaCodesComplexCombinationList;
		var codesComplexCombinationInAlbum;

		var result = [];
		for (iAlbumPassword = 0; iAlbumPassword < PhotoFloat.guessedPasswordsMd5.length; iAlbumPassword ++) {
			for (iMediaPassword = 0; iMediaPassword < PhotoFloat.guessedPasswordsMd5.length; iMediaPassword ++) {
				albumGuessedPassword = PhotoFloat.guessedPasswordsMd5[iAlbumPassword];
				albumCode = util.convertMd5ToCode(albumGuessedPassword);
				mediaGuessedPassword = PhotoFloat.guessedPasswordsMd5[iMediaPassword];
				mediaCode = util.convertMd5ToCode(mediaGuessedPassword);
				for (codesComplexCombinationInAlbum in album.numsProtectedMediaInSubTree) {
					if (album.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationInAlbum) && codesComplexCombinationInAlbum != "") {
						lists = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombinationInAlbum);
						albumCodesComplexCombinationList = lists[0];
						mediaCodesComplexCombinationList = lists[1];
						if (
							! albumCodesComplexCombinationList.length &&
							mediaCodesComplexCombinationList.length &&
							mediaCodesComplexCombinationList.indexOf(mediaCode) != -1 ||

							albumCodesComplexCombinationList.length &&
							albumCodesComplexCombinationList.indexOf(albumCode) != -1 &&
							! mediaCodesComplexCombinationList.length ||

							albumCodesComplexCombinationList.length &&
							mediaCodesComplexCombinationList.length &&
							albumCodesComplexCombinationList.indexOf(albumCode) != -1 &&
							mediaCodesComplexCombinationList.indexOf(mediaCode) != -1
						) {
							if (album.includedCodesComplexCombinations.indexOf(codesComplexCombinationInAlbum) == -1)
								result.push(codesComplexCombinationInAlbum);
						}
					}
				}
			}
		}
		return result;
	};

	PhotoFloat.getNumsProtectedMediaInSubTree = function(album, theProtectedDirectoriesToGet, iDirectory, {getPositions = false, getMedia = false} = {}) {

		var protectedDirectory = theProtectedDirectoriesToGet[iDirectory];
		var protectedCacheBase = protectedDirectory + '/' + album.cacheBase;
		return new Promise(
			function(resolve_getNumsProtectedMediaInSubTree) {
				var promise = PhotoFloat.getSingleProtectedCacheBase(protectedCacheBase, album, {"getPositions": getPositions, "getMedia": getMedia});
				promise.then(
					function(protectedAlbum) {
						if (typeof protectedAlbum !== "undefined") {
							album.numsProtectedMediaInSubTree = protectedAlbum.numsProtectedMediaInSubTree;
							resolve_getNumsProtectedMediaInSubTree();
						}
					}
				);
				promise.catch(
					function getSingleProtectedCacheBase_rejected() {
						var promise = PhotoFloat.getNumsProtectedMediaInSubTree(album, theProtectedDirectoriesToGet, iDirectory + 1, {"getPositions": getPositions, "getMedia": getMedia});
						promise.then(
							function() {
								resolve_getNumsProtectedMediaInSubTree();
							}
						);
						promise.catch(
							function(album) {
								console.trace();
							}
						);
					}
				);
			}
		);
	};

	PhotoFloat.mergeProtectedAlbum = function(album, protectedAlbum, codesComplexCombination) {
		// add the protected album content to the unprotected one
		if (protectedAlbum.hasOwnProperty("media")) {
			if (album.hasOwnProperty("media")) {
				album.media = album.media.concat(protectedAlbum.media);
			} else {
				album.media = protectedAlbum.media;
			}
		}
		if (album.hasOwnProperty("media")) {
			album.media = Utilities.sortByDate(album.media);
			album.mediaNameSort = false;
			album.mediaReverseSort = false;
		}

		PhotoFloat.mergeSubalbums(album, protectedAlbum, codesComplexCombination);
		album.subalbums = Utilities.sortByDate(album.subalbums);
		album.albumNameSort = false;
		album.albumReverseSort = false;
		util.sortAlbumsMedia(album);

		if (! album.hasOwnProperty("numMedia"))
			album.numMedia = album.media.length;
		if (! protectedAlbum.hasOwnProperty("numMedia"))
			protectedAlbum.numMedia = album.media.length;
		album.numMedia += protectedAlbum.numMedia;
		album.numMediaInSubTree += protectedAlbum.numMediaInSubTree;
		album.numPositionsInTree += protectedAlbum.numPositionsInTree;
		if (! album.hasOwnProperty("path"))
			album.path = protectedAlbum.path;

		if (protectedAlbum.hasOwnProperty("positionsAndMediaInTree")) {
			if (album.hasOwnProperty("positionsAndMediaInTree"))
				album.positionsAndMediaInTree = util.mergePoints(
					album.positionsAndMediaInTree,
					protectedAlbum.positionsAndMediaInTree
				);
			else
				album.positionsAndMediaInTree = protectedAlbum.positionsAndMediaInTree;
		}
	};

	PhotoFloat.mergeSubalbum = function(album, subalbum, subalbum2, codesComplexCombination) {
		if (
			subalbum.cacheBase == subalbum2.cacheBase
			// subalbum.cacheBase == subalbum2.cacheBase &&
			// album.includedCodesComplexCombinations.indexOf(codesComplexCombination) === -1
		) {
			subalbum.numMediaInSubTree += subalbum2.numMediaInSubTree;
			subalbum.numPositionsInTree += subalbum2.numPositionsInTree;
			subalbum.words = util.arrayUnion(subalbum.words, subalbum2.words);
		}
	};

	PhotoFloat.mergeProtectedSubalbums = function(album, protectedAlbum, codesComplexCombination) {
		var cacheBases = [], i, protectedSubalbum;
		album.subalbums.forEach(
			function(subalbum) {
				cacheBases.push(subalbum.cacheBase);
			}
		);
		for (i = 0; i < protectedAlbum.subalbums.length; i ++) {
			protectedSubalbum = protectedAlbum.subalbums[i];
			if (cacheBases.indexOf(protectedSubalbum.cacheBase) == -1) {
				album.subalbums.push(protectedSubalbum);
			// // if media or positions are missing the combination must not be reported as included
			// } else if (album.hasOwnProperty("media") && album.hasOwnProperty("positionsAndMediaInTree")) {
			} else {
				album.subalbums.forEach(
					function(subalbum) {
						if (subalbum.cacheBase == protectedSubalbum.cacheBase)
							PhotoFloat.mergeProtectedSubalbum(subalbum, protectedSubalbum, codesComplexCombination);
					}
				);
			}
		}
	};

	PhotoFloat.getNumberedCacheBases = function(album, protectedCacheBase, {getPositions, getMedia, codesComplexCombination}) {
		var nLink = 0;
		return new Promise(
			function(resolve_getNumberedCacheBases, reject_getNumberedCacheBases) {
				getRemainingNumberedCacheBases();

				function getRemainingNumberedCacheBases() {
					nLink ++;
					var numberedCacheBase = protectedCacheBase + '.' + nLink;

					var promise = PhotoFloat.getSingleProtectedCacheBase(numberedCacheBase, album, {"getPositions": getPositions, "getMedia": getMedia, "codesComplexCombination": codesComplexCombination});
					promise.then(
						function(numberedAlbum) {
							getRemainingNumberedCacheBases();

							if (numberedAlbum !== null && album.includedCodesComplexCombinations.indexOf(numberedAlbum.codesComplexCombination) === -1) {
								PhotoFloat.mergeProtectedAlbum(album, numberedAlbum, {"getPositions": getPositions, "getMedia": getMedia, "codesComplexCombination": codesComplexCombination});
								album.includedCodesComplexCombinations.push(numberedAlbum.codesComplexCombination);
							}
						}
					);
					promise.catch(
						function() {
							resolve_getNumberedCacheBases();
						}
					);
				}
			}
		);
	};


	PhotoFloat.addProtectedContent = function(album, {getPositions = false, getMedia = false} = {}) {

		return new Promise(
			function(resolve_addProtectedContent, reject) {
				var numsPromise;
				if (! PhotoFloat.isEmpty(album)) {
					// if (! album.hasOwnProperty("includedProtectedDirectories"))
					// 	album.includedProtectedDirectories = [];
					if (! album.hasOwnProperty("includedCodesComplexCombinations"))
						album.includedCodesComplexCombinations = [];
					// if (! album.hasOwnProperty("includedCodesComplexCombinationsCounts"))
						// album.includedCodesComplexCombinationsCounts = [];

					numsPromise = continueAddProtectedContent(album);
					numsPromise.then(
						function(album) {
							resolve_addProtectedContent({"getPositions": getPositions, "getMedia": getMedia});
						}
					);
					numsPromise.catch(
						function(album) {
							console.trace();
						}
					);
				} else {
					// a protected album must be loaded in order to know the complex combinations
					var theProtectedDirectoriesToGet = PhotoFloat.protectedDirectoriesToGet();
					if (! theProtectedDirectoriesToGet.length) {
						// executions shouldn't arrive here
						resolve_addProtectedContent({"getPositions": getPositions, "getMedia": getMedia});
					} else {
						// declaration: PhotoFloat.getNumsProtectedMediaInSubTree = function(album, theProtectedDirectoriesToGet, iDirectory, otherArguments)
						var promise = PhotoFloat.getNumsProtectedMediaInSubTree(album, theProtectedDirectoriesToGet, 0, {"getPositions": getPositions, "getMedia": getMedia});
						promise.then(
							function() {
								numsPromise = continueAddProtectedContent(album);
								numsPromise.then(
									function(album) {
										resolve_addProtectedContent({"getPositions": getPositions, "getMedia": getMedia});
									}
								);
								numsPromise.catch(
									function(album) {
										console.trace();
									}
								);
							}
						);
						promise.catch(
							function(album) {
								console.trace();
							}
						);
					}
				}
			}
		);
		// end of function code


		function continueAddProtectedContent(album) {
			// this function keeps on the job of addProtectedContent
			// it is called when numsProtectedMediaInSubTree is in the album

			var theCodesComplexCombinationsToGet = PhotoFloat.codesComplexCombinationsToGet(album);
			var codesComplexCombination, numProtected, iComplex, protectedCacheBase;

			return new Promise(
				function(resolve_continueAddProtectedContent) {
					if (! theCodesComplexCombinationsToGet.length) {
						PhotoFloat.putAlbumIntoCache(album.cacheBase, album);
						// resolve_addProtectedContent(album, {"getPositions": getPositions, "getMedia": getMedia});
						resolve_continueAddProtectedContent(album);
					} else {
						// prepare and get the protected content from the protected directories
						numProtected = 0;
						for (iComplex = 0; iComplex < theCodesComplexCombinationsToGet.length; iComplex ++) {
							codesComplexCombination = theCodesComplexCombinationsToGet[iComplex];
							// if (codesComplexCombination in album.numsProtectedMediaInSubTree)
							numProtected += album.numsProtectedMediaInSubTree[codesComplexCombination];
						}
						if (
							! PhotoFloat.isEmpty(album) && numProtected == 0 &&
							album.cacheBase !== Options.by_search_string &&
							! util.isSearchCacheBase(album.cacheBase)
						) {
							// no need to get any protected content for this md5
							// resolve_addProtectedContent(album, {"getPositions": getPositions, "getMedia": getMedia});
							resolve_continueAddProtectedContent(album);
						} else {
							// for (iDirectory = 0; iDirectory < theProtectedDirectoriesToGet.length; iDirectory ++) {
							var promises = [];
							for (iComplex = 0; iComplex < theCodesComplexCombinationsToGet.length; iComplex ++) {
								let ithPromise = new Promise(
									function(resolve_ithPromise, reject) {

										let index = iComplex;
										let codesComplexCombination = theCodesComplexCombinationsToGet[iComplex];
										let codesCombinationsLists = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombination);
										let albumMd5CombinationsList = util.convertCodesListToMd5sList(codesCombinationsLists[0]);
										let mediaMd5CombinationList = util.convertCodesListToMd5sList(codesCombinationsLists[1]);
										let protectedDirectory = Options.protected_directories_prefix;
										if (albumMd5CombinationsList.length)
											protectedDirectory += albumMd5CombinationsList[0];
										protectedDirectory += ',';
										if (mediaMd5CombinationList.length)
											protectedDirectory += mediaMd5CombinationList[0];

										// if (album.includedProtectedDirectories.indexOf(protectedDirectory) !== -1) {
										// 	// the directory has already been included
										// 	resolve_ithPromise();
										// } else {
										// // if media or positions are missing the protected directories must not be reported as included
										// if (album.hasOwnProperty("media") && album.hasOwnProperty("positionsAndMediaInTree"))
										// 	album.includedProtectedDirectories.push(protectedDirectory);

										protectedCacheBase = protectedDirectory + '/' + album.cacheBase;
										let promise;
										if (typeof getPositions !== "undefined") {
											promise = PhotoFloat.getSingleProtectedCacheBase(
												protectedCacheBase,
												album,
												{
													"getPositions": getPositions,
													"getMedia": getMedia,
													"codesComplexCombination": codesComplexCombination
												}
											);
										} else {
											promise = PhotoFloat.getSingleProtectedCacheBase(
												protectedCacheBase,
												album,
												{"codesComplexCombination": codesComplexCombination}

											);
										}
										promise.then(
											function(protectedAlbum) {
												if (typeof protectedAlbum === "undefined")
													protectedAlbum = null;

												if (protectedAlbum !== null) {
													if (PhotoFloat.isEmpty(album)) {
														delete album.empty;
														album.hasntUnprotectedContent = true;
														for (var property in Object.keys(protectedAlbum)) {
															if (protectedAlbum.hasOwnProperty(property))
																album[property] = protectedAlbum[property];
														}
														// album.includedProtectedDirectories = [];
														album.includedCodesComplexCombinations = [];
														// album.includedCodesComplexCombinationsCounts = [];
													} else if (album.includedCodesComplexCombinations.indexOf(protectedAlbum.codesComplexCombination) === -1) {
														PhotoFloat.mergeProtectedAlbum(album, protectedAlbum, codesComplexCombination);
														album.includedCodesComplexCombinations.push(protectedAlbum.codesComplexCombination);
													}
												}

												// get the symlinks
												let nextPromise = PhotoFloat.getNumberedCacheBases(
													album,
													protectedCacheBase,
													{"getPositions": getPositions, "getMedia": getMedia, "codesComplexCombination": codesComplexCombination}
												);
												nextPromise.then(
													resolve_ithPromise
												);
												nextPromise.catch(
													function(album) {
														console.trace();
													}
												);
											}
										);
										promise.catch(
											resolve_ithPromise
										);
										// }
									}
								);
								promises.push(ithPromise);
							}
							Promise.all(promises).then(
								function() {
									// execution arrives here when all the protected json has been loaded and processed

									// if media or positions are missing the combination must not be reported as included
									// if (album.hasOwnProperty("media") && album.hasOwnProperty("positionsAndMediaInTree"))
									// 	album.includedCodesComplexCombinations = album.includedCodesComplexCombinations.concat(theCodesComplexCombinationsToGet);
									// album.includedCodesComplexCombinationsCounts = util.arrayUnion(album.includedCodesComplexCombinationsCounts, theCodesComplexCombinationsToGet);
									resolve_continueAddProtectedContent(album);
								}
							);
						}
					}
				}
			);
		}
	};

	PhotoFloat.hasProtectedContent = function(album) {
		if (
			album.hasOwnProperty("numsProtectedMediaInSubTree") && (
				! Object.keys(album.numsProtectedMediaInSubTree).length ||
				album.numsProtectedMediaInSubTree.hasOwnProperty("") &&
				Object.keys(album.numsProtectedMediaInSubTree).length == 1
			)
		)
			return false;
		return true;
	};

	PhotoFloat.isEmpty = function(album) {
		return album.hasOwnProperty("empty");
	};

	PhotoFloat.hasntUnprotectedContent = function(album) {
		return album.hasOwnProperty("hasntUnprotectedContent");
	};

	PhotoFloat.goOnTowardResolvingGetAlbum = function(theAlbum, {thisIndexWords, thisIndexAlbums}) {
		var i, j;
		if (theAlbum.cacheBase == Options.by_search_string) {
			// root of search albums: build the word list
			for (i = 0; i < theAlbum.subalbums.length; ++i) {
				if (PhotoFloat.searchWordsFromJsonFile.indexOf(theAlbum.subalbums[i].unicodeWords) == -1) {
					PhotoFloat.searchWordsFromJsonFile.push(theAlbum.subalbums[i].unicodeWords);
					PhotoFloat.searchAlbumCacheBaseFromJsonFile.push(theAlbum.subalbums[i].cacheBase);
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

		PhotoFloat.putAlbumIntoCache(theAlbum.cacheBase, theAlbum);
	};

	PhotoFloat.getAlbum = function(albumCacheBase, error, {getPositions = false, getMedia = false, thisIndexWords = false, thisIndexAlbums = false} = {}) {
		// error is executed when in no way the album can be retrieved:
		// either it doesn't exist or it could be a protected one

		return new Promise(
			function(resolve_getAlbum, reject) {
				var albumFromCache = PhotoFloat.getAlbumFromCache(albumCacheBase);
				var promise;
				if (albumFromCache) {
					promise = PhotoFloat.addPositionsAndMedia(albumFromCache, {"getPositions": getPositions, "getMedia": getMedia});
					promise.then(
						function(albumFromCache) {
							if (PhotoFloat.hasProtectedContent(albumFromCache)) {
								var promise = PhotoFloat.addProtectedContent(albumFromCache);
								promise.then(
									function() {
										PhotoFloat.goOnTowardResolvingGetAlbum(albumFromCache, {"thisIndexWords": thisIndexWords, "thisIndexAlbums": thisIndexAlbums});
										resolve_getAlbum([albumFromCache, {"thisIndexWords": thisIndexWords, "thisIndexAlbums": thisIndexAlbums}]);
									}
								);
								promise.catch(
									function(album) {
										console.trace();
									}
								);
							} else {
								PhotoFloat.goOnTowardResolvingGetAlbum(albumFromCache, {"thisIndexWords": thisIndexWords, "thisIndexAlbums": thisIndexAlbums});
								resolve_getAlbum([albumFromCache, {"thisIndexWords": thisIndexWords, "thisIndexAlbums": thisIndexAlbums}]);
							}
						}
					);
					promise.catch(
						function(album) {
							console.trace();
						}
					);
					// promise.catch(
					// 	error
					// );
					// if (PhotoFloat.hasntUnprotectedContent(albumFromCache)) {
					// 	promise = PhotoFloat.addProtectedContent(albumFromCache);
					// 	promise.then(
					// 		PhotoFloat.goOnTowardResolvingGetAlbum(albumFromCache, thisIndexWords, thisIndexAlbums)
					// 	);
					// } else {
					// 	promise = PhotoFloat.addPositionsAndMedia(albumFromCache, {"getPositions": getPositions, "getMedia": getMedia});
					// 	promise.then(
					// 		function() {
					// 			if (PhotoFloat.hasProtectedContent(albumFromCache)) {
					// 				var promise = PhotoFloat.addProtectedContent(albumFromCache);
					// 				promise.then(
					// 					PhotoFloat.goOnTowardResolvingGetAlbum(albumFromCache, thisIndexWords, thisIndexAlbums)
					// 				);
					// 			} else {
					// 				PhotoFloat.goOnTowardResolvingGetAlbum(albumFromCache, thisIndexWords, thisIndexAlbums);
					// 			}
					// 		}
					// 	);
					// 	promise.catch(
					// 		error
					// 	);
					// }
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
					promise = PhotoFloat.getSingleUnprotectedCacheBase(albumCacheBase);
					promise.then(
						function(album) {
							if (PhotoFloat.isEmpty(album) || PhotoFloat.hasProtectedContent(album)) {
								var promise = PhotoFloat.addProtectedContent(album);
								promise.then(
									function() {
										PhotoFloat.goOnTowardResolvingGetAlbum(album, {"thisIndexWords": thisIndexWords, "thisIndexAlbums": thisIndexAlbums});
										resolve_getAlbum([album, {"thisIndexWords": thisIndexWords, "thisIndexAlbums": thisIndexAlbums}]);
									}
								);
								promise.catch(
									function(album) {
										console.trace();
									}
								);
							} else {
								PhotoFloat.goOnTowardResolvingGetAlbum(album, {"thisIndexWords": thisIndexWords, "thisIndexAlbums": thisIndexAlbums});
								resolve_getAlbum([album, {"thisIndexWords": thisIndexWords, "thisIndexAlbums": thisIndexAlbums}]);
							}
						}
					);
					promise.catch(
						function(album) {
							console.trace();
						}
					);
				}
			}
		);
	};

	PhotoFloat.prototype.pickRandomMedia = function(theSubalbum, error) {
		return new Promise(
			function(resolve_pickRandomMedia) {
				var promise = PhotoFloat.getAlbum(theSubalbum.cacheBase, error, {"getPositions": false, "getMedia": false});
				promise.then(
					function([album]) {
						nextAlbum(album);
					}
				);
				promise.catch(
					function(album) {
						console.trace();
					}
				);
				//// end of function pickRandomMedia ////////////////////

				function nextAlbum(album) {
					var index = Math.floor(Math.random() * (album.numMediaInSubTree));
					var i, numMedia, subalbum;

					if (album.numMediaInSubTree == 0) {
						error();
						return;
					}

					if (album.hasOwnProperty("media"))
						numMedia = album.media.length;
					else
						numMedia = album.numMedia;
					if (index >= numMedia) {
						index -= numMedia;
						for (i = 0; i < album.subalbums.length; i ++) {
							if (index >= album.subalbums[i].numMediaInSubTree)
								index -= album.subalbums[i].numMediaInSubTree;
							else {
								subalbum = album.subalbums[i];
								break;
							}
						}
						var promise = PhotoFloat.getAlbum(subalbum.cacheBase, error, {"getPositions": false, "getMedia": false});
						promise.then(
							function(returnValue) {
								nextAlbum(returnValue[0]);
							}
						);
						promise.catch(
							function(album) {
								console.trace();
							}
						);
					} else {
						var lastPromise = PhotoFloat.getAlbum(album.cacheBase, error, {"getPositions": true, "getMedia": true});
						lastPromise.then(
							function(returnValue) {
								var album = returnValue[0];
								album.randomMediaIndex = index;
								album.theSubalbum = theSubalbum;
								resolve_pickRandomMedia([album, index]);
							}
						);
						lastPromise.catch(
							function(album) {
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
						{"getPositions": true, "getMedia": false}
					);
					promise.then(
						function(returnValue) {
							var foldersRootAlbum = returnValue[0];
							if (! foldersRootAlbum.numPositionsInTree) {
								// $("#by-gps-view").addClass("hidden");
								self.geotaggedPhotosFound = false;
								resolveGeotaggedPhotosExist(false);
							} else {
								self.geotaggedPhotosFound = true;
								resolveGeotaggedPhotosExist(true);
							}
						}
					);
					promise.catch(
						function(album) {
							console.trace();
						}
					);
				}
			}
		);
	};

	PhotoFloat.upHash = function(hash) {
		var resultHash;
		var array = PhotoFloat.decodeHash(hash);
		// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
		var albumHash = array[0];
		var mediaHash = array[1];
		var savedSearchSubAlbumHash = array[3];
		var savedSearchAlbumHash = array[4];

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

			searchResultsAlbumFinal.numMediaInSubTree = searchResultsAlbumFinal.media.length;
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
			PhotoFloat.endPreparingAlbumAndKeepOn(searchResultsAlbumFinal, mediaHash, hashParsed);
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
			var promise = PhotoFloat.getAlbum(Options.by_search_string, error, {"getPositions": true, "getMedia": true});
			promise.then(
				function(returnValue) {
					var bySearchRootAlbum = returnValue[0];
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
									wordHashes.push(PhotoFloat.searchAlbumCacheBaseFromJsonFile[j]);
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
											albumHashes.push([PhotoFloat.searchAlbumCacheBaseFromJsonFile[index]]);
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
						for (indexWords = 0; indexWords <= lastIndex; indexWords ++) {
							searchResultsMedia[indexWords] = [];
							searchResultsSubalbums[indexWords] = [];
							for (indexAlbums = 0; indexAlbums < albumHashes[indexWords].length; indexAlbums ++) {
								// getAlbum is called here with 2 more parameters, indexAlbums and indexWords, in order to use their value
								// if they are not passed as arguments, the success function would see their values updates (getAlbum is an asyncronous function)
								var promise = PhotoFloat.getAlbum(
									albumHashes[indexWords][indexAlbums],
									error,
									{"getPositions": true, "getMedia": true, "thisIndexWords": indexWords, "thisIndexAlbums": indexAlbums}
								);
								promise.then(
									function([theAlbum, {thisIndexWords, thisIndexAlbums}]) {
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
												searchResultsAlbumFinal.media = util.sortByDate(searchResultsAlbumFinal.media);

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
													searchResultsAlbumFinal.subalbums = util.sortByDate(searchResultsAlbumFinal.subalbums);
												}
											}
											subalbumsAbsentOrGot();
										}
									}
								);
								promise.catch(
									function(album) {
										console.trace();
									}
								);
							}
						}
					}
				}
			);
			promise.catch(
				function(album) {
					console.trace();
				}
			);
		}


		// begin body of parseHash = function(hash, hashParsed, error) {

		var albumHashToGet, albumHashes;
		var searchWordsFromUser, searchWordsFromUserNormalized, searchWordsFromUserNormalizedAccordingToOptions;
		var indexWords, indexAlbums, wordsWithOptionsString;
		// this vars are defined here and not at the beginning of the file because the options must have been read

		$("#error-too-many-images").hide();
		$(".search-failed").hide();
		// $("#media-view").removeClass("hidden");
		// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
		var array = PhotoFloat.decodeHash(hash);
		var albumHash = array[0];
		var mediaHash = array[1];
		var mediaFolderHash = array[2];
		$("ul#right-menu li#album-search").removeClass("dimmed");
		$("ul#right-menu li#any-word").removeClass("dimmed");
		$("#album-view, #album-view #subalbums, #album-view #thumbs").removeClass("hidden");

		albumHashes = [];
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
			promise = PhotoFloat.getAlbum(albumHashToGet, error, {"getPositions": true, "getMedia": true});
			promise.then(
				function(returnValue) {
					var theAlbum = returnValue[0];
					PhotoFloat.selectMedia(theAlbum, mediaFolderHash, mediaHash, hashParsed);
				}
			);
			promise.catch(
				function(album) {
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
				}
			);
			promise.catch(
				function(album) {
					console.trace();
				}
			);
		}
	};

	PhotoFloat.endPreparingAlbumAndKeepOn = function(resultsAlbumFinal, mediaHash, hashParsed) {
		// add the point count
		resultsAlbumFinal.numPositionsInTree = resultsAlbumFinal.positionsAndMediaInTree.length;
		// save in the cash array
			PhotoFloat.putAlbumIntoCache(resultsAlbumFinal.cacheBase, resultsAlbumFinal);

		PhotoFloat.selectMedia(resultsAlbumFinal, null, mediaHash, hashParsed);

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
					util.numProtectedKeys(theAlbum) &&
					// ! jQuery.isEmptyObject(theAlbum.numsProtectedMediaInSubTree) &&
					(
						theAlbum.subalbums.length == 0 ||
						util.sumUpNumsProtectedMedia(theAlbum.numsProtectedMediaInSubTree) > util.sumUpNumsProtectedMedia(util.sumNumsProtectedMediaOfArray(theAlbum.subalbums))
					)
				) {
					// the media not found could be a protected one, show the authentication dialog
					perhapsIsAProtectedMedia = true;
					util.showAuthForm();
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

	// PhotoFloat.prototype.authenticate = function(password, result) {
	// 	var ajaxOptions = {
	// 		type: "GET",
	// 		dataType: "text",
	// 		url: "auth?username=photos&password=" + password,
	// 		success: function() {
	// 			result(true);
	// 		},
	// 		error: function() {
	// 			result(false);
	// 		}
	// 	};
	// 	$.ajax(ajaxOptions);
	// };

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
	// PhotoFloat.prototype.removeAlbumFromCache = PhotoFloat.removeAlbumFromCache;
	/* expose class globally */
	window.PhotoFloat = PhotoFloat;
}());
