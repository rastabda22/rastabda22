/* jshint esversion: 6 */
(function() {
	var util = new Utilities();

	/* constructor */
	function PhotoFloat() {
	}

	PhotoFloat.getStopWords = function() {
		return new Promise(
			function(resolve_getStopWords) {
				if (! env.options.search_inside_words && env.options.use_stop_words) {
					// before getting the file check whether it's in the cache
					if (env.cache.hasOwnProperty("stopWords") && env.cache.stopWords.length) {
						resolve_getStopWords();
					} else {
						env.cache.stopWords = [];
						// get the file
						var stopWordsFile = util.pathJoin([env.server_cache_path, 'stopwords.json']);
						var ajaxOptions = {
							type: "GET",
							dataType: "json",
							url: stopWordsFile,
							success: function(stopWords) {
								env.cache.stopWords = stopWords.stopWords;
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
					env.cache.stopWords = [];
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
						url: util.pathJoin([env.server_cache_path, jsonRelativeFileName]),
						type: "GET",
						dataType: "json",
						success: function(albumOrPositionsOrMedia) {
							let indexPosition = jsonRelativeFileName.lastIndexOf(".positions.json");
							let indexMedia = jsonRelativeFileName.lastIndexOf(".media.json");
							if (indexPosition >= 0 && indexPosition === jsonRelativeFileName.length - ".positions.json".length) {
								// positions file
								resolve_getJsonFile(albumOrPositionsOrMedia);
							} else if (indexMedia >= 0 && indexMedia === jsonRelativeFileName.length - ".media.json".length) {
								// media file
								let mediaGot = new Media(albumOrPositionsOrMedia);
								mediaGot.getAndPutIntoCache();
								resolve_getJsonFile(mediaGot);
							} else {
								resolve_getJsonFile(albumOrPositionsOrMedia);
							}
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
								positions = new PositionsAndMedia(object);
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

	PhotoFloat.getSingleUnprotectedCacheBaseWithExternalMediaAndPositions = function(unprotectedCacheBase, {getMedia, getPositions}) {
		// this function is called when the album isn't in the cache
		// a brand new album is created

		return new Promise(
			function(resolve_getSingleUnprotectedCacheBase, reject_getSingleUnprotectedCacheBase) {
				var jsonFile = unprotectedCacheBase + ".json";

				var promise = PhotoFloat.getJsonFile(jsonFile);
				promise.then(
					function unprotectedFileExists(object) {
						album = new Album(object);
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

	Album.prototype.initializeIncludedFilesByCodesSimpleCombinationProperty = function(codesSimpleCombination, number) {
		if (! this.hasOwnProperty("includedFilesByCodesSimpleCombination"))
			this.includedFilesByCodesSimpleCombination = new IncludedFiles();
		if (typeof codesSimpleCombination !== "undefined") {
			if (! this.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination))
				this.includedFilesByCodesSimpleCombination[codesSimpleCombination] = {};
			if (typeof number !== "undefined" && codesSimpleCombination !== ",") {
				if (! this.includedFilesByCodesSimpleCombination[codesSimpleCombination].hasOwnProperty(number)) {
					this.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] = {};
					this.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album = {};
				}
			}
		}
	};

	Album.prototype.getSingleProtectedCacheBaseWithExternalMediaAndPositions = function(protectedCacheBase, {getMedia, getPositions}) {
		// this function gets a single protected json file

		var self = this;
		var splittedProtectedCacheBase = protectedCacheBase.split('.');
		var number = parseInt(splittedProtectedCacheBase[splittedProtectedCacheBase.length - 1]);
		var codesSimpleCombination = util.convertProtectedCacheBaseToCodesSimpleCombination(protectedCacheBase);
		self.initializeIncludedFilesByCodesSimpleCombinationProperty(codesSimpleCombination, number);
		// if (! self.hasOwnProperty("includedFilesByCodesSimpleCombination"))
		// 	self.includedFilesByCodesSimpleCombination = new IncludedFiles();
		// if (! self.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination))
		// 	self.includedFilesByCodesSimpleCombination[codesSimpleCombination] = {};
		// if (codesSimpleCombination !== "," && ! self.includedFilesByCodesSimpleCombination[codesSimpleCombination].hasOwnProperty(number)) {
		// 	self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] = {};
		// 	self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album = {};
		// }

		return new Promise(
			function(resolve_getSingleProtectedCacheBase, reject_getSingleProtectedCacheBase) {
				// let's check whether the protected cache base has been already loaded
				if (self.includedFilesByCodesSimpleCombination[codesSimpleCombination] === false) {
				// if (self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] === false) {
					// the protected cache base doesn't exist
					reject_getSingleProtectedCacheBase();
				} else if (self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot")) {
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
						function protectedFileExists(object) {
							protectedAlbum = new Album(object);
							if (! self.hasOwnProperty("numsProtectedMediaInSubTree") || self.empty)
								// this is needed when getSingleProtectedCacheBaseWithExternalMediaAndPositions() is called by getNumsProtectedMediaInSubTreeProperty()
								self.numsProtectedMediaInSubTree = protectedAlbum.numsProtectedMediaInSubTree;

							if (! self.hasOwnProperty("name"))
								self.name = protectedAlbum.name;
							if (! self.hasOwnProperty("altName") && protectedAlbum.hasOwnProperty("altName"))
								self.altName = protectedAlbum.altName;
							if (! self.hasOwnProperty("ancestorsNames") && protectedAlbum.hasOwnProperty("ancestorsNames"))
								self.ancestorsNames = protectedAlbum.ancestorsNames;
							if (! self.hasOwnProperty("ancestorsCenters") && protectedAlbum.hasOwnProperty("ancestorsCenters"))
								self.ancestorsCenters = protectedAlbum.ancestorsCenters;

							self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].codesComplexCombination = protectedAlbum.codesComplexCombination;

							if (! protectedAlbum.hasOwnProperty("numsMedia"))
								protectedAlbum.numsMedia = protectedAlbum.media.imagesAndVideosCount();

							if (! self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot")) {
								if (protectedAlbum.subalbums.length) {
									self.mergeProtectedSubalbums(protectedAlbum, codesSimpleCombination, number);
								}

								self.numsMedia.sum(protectedAlbum.numsMedia);
								if (! self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("countsGot")) {
									self.numsMediaInSubTree.sum(protectedAlbum.numsMediaInSubTree);
									self.sizesOfSubTree.sum(protectedAlbum.sizesOfSubTree);
									self.sizesOfAlbum.sum(protectedAlbum.sizesOfAlbum);
									self.numPositionsInTree += protectedAlbum.numPositionsInTree;
								}
								if (! self.hasOwnProperty("path"))
									self.path = protectedAlbum.path;
								self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.protectedAlbumGot = true;

								if (protectedAlbum.hasOwnProperty("media")) {
									if (! self.hasOwnProperty("media"))
										self.media = protectedAlbum.media;
									else
										self.media = self.media.concat(protectedAlbum.media);
									self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.mediaGot = true;
								}

								if (protectedAlbum.hasOwnProperty("positionsAndMediaInTree")) {
									if (! self.hasOwnProperty("positionsAndMediaInTree"))
										self.positionsAndMediaInTree = protectedAlbum.positionsAndMediaInTree;
									else
										self.positionsAndMediaInTree.mergePositionsAndMedia(protectedAlbum.positionsAndMediaInTree);
									self.numPositionsInTree = self.positionsAndMediaInTree.length;
									self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.positionsGot = true;
								}

								// add pointers to the same object for the symlinks
								for (let iSymlink = 0; iSymlink < protectedAlbum.symlinkCodesAndNumbers.length; iSymlink ++) {
									let symlinkCodesAndNumbersItem = protectedAlbum.symlinkCodesAndNumbers[iSymlink];
									if (
										! self.includedFilesByCodesSimpleCombination.hasOwnProperty(symlinkCodesAndNumbersItem.codesSimpleCombination) ||
										! Object.keys(self.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination]).some(
											function(thisNumber) {
												thisNumber = parseInt(thisNumber);
												var result =
													self.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][thisNumber].codesComplexCombination ==
														symlinkCodesAndNumbersItem.codesComplexCombination &&
													self.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][thisNumber].hasOwnProperty("protectedAlbumGot");
												return result;
											}
										)
									) {
										// actually add the pointer
										if (! self.includedFilesByCodesSimpleCombination.hasOwnProperty(symlinkCodesAndNumbersItem.codesSimpleCombination))
											self.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination] = {};
										if (! self.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination].hasOwnProperty(symlinkCodesAndNumbersItem.number))
											self.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][symlinkCodesAndNumbersItem.number] = {};
										self.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][symlinkCodesAndNumbersItem.number].album =
											self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album;
										self.includedFilesByCodesSimpleCombination[symlinkCodesAndNumbersItem.codesSimpleCombination][symlinkCodesAndNumbersItem.number].codesComplexCombination =
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
								self.includedFilesByCodesSimpleCombination[codesSimpleCombination] = false;

							// do not do anything, i.e. another protected cache base will be processed
							reject_getSingleProtectedCacheBase();
						}
					);
				}
				// end of getSingleProtectedCacheBaseWithExternalMediaAndPositions function body

				function addExternalMediaAndPositionsFromProtectedAlbum() {
					return new Promise(
						function(resolve_addExternalMediaAndPositionsFromProtectedAlbum) {
							var mustGetMedia = getMedia && ! self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("mediaGot");
							var mustGetPositions = getPositions && ! self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("positionsGot");
							if (! mustGetMedia && ! mustGetPositions) {
								resolve_addExternalMediaAndPositionsFromProtectedAlbum();
							} else {
								var promise = PhotoFloat.getMediaAndPositions(protectedCacheBase, {mustGetMedia: mustGetMedia, mustGetPositions: mustGetPositions});
								promise.then(
									function([mediaGot, positionsGot]) {
										if (mediaGot) {
											if (! self.hasOwnProperty("media"))
												self.media = mediaGot;
											else
												self.media = self.media.concat(mediaGot);
											// self.includedFilesByCodesSimpleCombination[","].mediaGot = true;
											self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.mediaGot = true;
										}

										if (positionsGot) {
											if (! self.hasOwnProperty("positionsAndMediaInTree") || ! self.positionsAndMediaInTree.length)
												self.positionsAndMediaInTree = positionsGot;
											else
												self.positionsAndMediaInTree.mergePositionsAndMedia(positionsGot);
											self.numPositionsInTree = self.positionsAndMediaInTree.length;
											// self.includedFilesByCodesSimpleCombination[","].positionsGot = true;
											self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.positionsGot = true;
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

	// WARNING: making this function an Album method doesn't work. Why?!?
	PhotoFloat.codesSimpleCombinationsToGet = function(album, {getMedia, getPositions}) {
		var iAlbumPassword, iMediaPassword, albumGuessedPassword, mediaGuessedPassword;
		var albumCode, mediaCode;
		var codesComplexCombinationInAlbum;

		var result = [];
		for (iAlbumPassword = 0; iAlbumPassword <= env.guessedPasswordsMd5.length; iAlbumPassword ++) {
			if (iAlbumPassword === env.guessedPasswordsMd5.length) {
				albumCode = '';
			} else {
				albumGuessedPassword = env.guessedPasswordsMd5[iAlbumPassword];
				albumCode = util.convertMd5ToCode(albumGuessedPassword);
			}
			for (iMediaPassword = 0; iMediaPassword <= env.guessedPasswordsMd5.length; iMediaPassword ++) {
				if (iMediaPassword === env.guessedPasswordsMd5.length) {
					mediaCode = '';
				} else {
					mediaGuessedPassword = env.guessedPasswordsMd5[iMediaPassword];
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
							let numProtectedCacheBases = album.getNumProtectedCacheBases(codesComplexCombinationInAlbum);
							if (
								! (codesSimpleCombination in album.includedFilesByCodesSimpleCombination)
								||
								Object.values(album.includedFilesByCodesSimpleCombination[codesSimpleCombination]).filter(
									objectWithNumberKey => objectWithNumberKey.album === {countsGot: true}
								).length < numProtectedCacheBases
									// ||
									// Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombination]).length < numProtectedCacheBases
								||
								getMedia && Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombination]).some(
									number => ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination][parseInt(number)].album.hasOwnProperty("mediaGot")
								)
								||
								getPositions && Object.keys(album.includedFilesByCodesSimpleCombination[codesSimpleCombination]).some(
									number => ! album.includedFilesByCodesSimpleCombination[codesSimpleCombination][parseInt(number)].album.hasOwnProperty("positionsGot")
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

	// WARNING: making this function an Album method doesn't work. Why?!?
	Album.prototype.getNumsProtectedMediaInSubTreeProperty = function() {
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
						var protectedCacheBase = protectedDirectory + '/' + self.cacheBase + '.0';

						var promise = self.getSingleProtectedCacheBaseWithExternalMediaAndPositions(protectedCacheBase, {getMedia: false, getPositions: false});
						promise.then(
							function getSingleProtectedCacheBaseWithExternalMediaAndPositions_resolved() {
								// ok, we got what we were looking for: numsProtectedMediaInSubTree property has been added by getSingleProtectedCacheBaseWithExternalMediaAndPositions()

								delete self.mediaNameSort;
								delete self.mediaReverseSort;
								delete self.albumNameSort;
								delete self.albumReverseSort;
								self.sortAlbumsMedia();

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
		// end of getNextProtectedDirectory function

		var iDirectory = -1;
		var self = this;
		var theProtectedDirectoriesToGet;
		return new Promise(
			function(resolve_getNumsProtectedMediaInSubTreeProperty, reject_getNumsProtectedMediaInSubTreeProperty) {
				theProtectedDirectoriesToGet = PhotoFloat.protectedDirectoriesToGet();
				if (! theProtectedDirectoriesToGet.length) {
					reject_getNumsProtectedMediaInSubTreeProperty();
				} else {
					if (self.hasOwnProperty("numsProtectedMediaInSubTree") && ! self.empty) {
						resolve_getNumsProtectedMediaInSubTreeProperty();
					} else {
						var getNumsProtectedMediaInSubTreePropertyPromise = getNextProtectedDirectory();
						getNumsProtectedMediaInSubTreePropertyPromise.then(
							resolve_getNumsProtectedMediaInSubTreeProperty,
							reject_getNumsProtectedMediaInSubTreeProperty
						);
					}
				}
			}
		);
	};


	PhotoFloat.mergeProtectedSubalbum = function(subalbum, protectedSubalbum, codesSimpleCombination, number) {
		subalbum.numsMediaInSubTree.sum(protectedSubalbum.numsMediaInSubTree);
		subalbum.sizesOfSubTree.sum(protectedSubalbum.sizesOfSubTree);
		subalbum.sizesOfAlbum.sum(protectedSubalbum.sizesOfAlbum);
		subalbum.numPositionsInTree += protectedSubalbum.numPositionsInTree;

		if (subalbum instanceof Album) {
			subalbum.initializeIncludedFilesByCodesSimpleCombinationProperty(codesSimpleCombination, number);
			// if (! subalbum.hasOwnProperty("includedFilesByCodesSimpleCombination"))
			// 	subalbum.includedFilesByCodesSimpleCombination = new IncludedFiles();
			// if (! subalbum.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination))
			// 	subalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination] = {};
			// if (codesSimpleCombination !== "," && ! subalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination].hasOwnProperty(number)) {
			// 	subalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] = {};
			// 	subalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album = {};
			// }
			subalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.countsGot = true;
		}
	};

	Album.prototype.mergeProtectedSubalbums = function(protectedAlbum, codesSimpleCombination, number) {
		var cacheBases = [], i, ithProtectedSubalbum;
		this.subalbums.forEach(
			function(subalbum) {
				cacheBases.push(subalbum.cacheBase);
			}
		);
		var self = this;
		// for (i = 0; i < protectedAlbum.subalbums.length; i ++) {
		protectedAlbum.subalbums.forEach(
			function(ithProtectedSubalbum) {
				if (cacheBases.indexOf(ithProtectedSubalbum.cacheBase) === -1) {
					self.subalbums.push(ithProtectedSubalbum);

					if (ithProtectedSubalbum instanceof Album) {
						ithProtectedSubalbum.initializeIncludedFilesByCodesSimpleCombinationProperty(codesSimpleCombination, number);
						// if (! ithProtectedSubalbum.hasOwnProperty("includedFilesByCodesSimpleCombination"))
						// 	ithProtectedSubalbum.includedFilesByCodesSimpleCombination = new IncludedFiles();
						// if (! ithProtectedSubalbum.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination))
						// 	ithProtectedSubalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination] = {};
						// if (codesSimpleCombination !== "," && ! ithProtectedSubalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination].hasOwnProperty(number)) {
						// 	ithProtectedSubalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] = {};
						// 	ithProtectedSubalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album = {};
						// }
						ithProtectedSubalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.countsGot = true;
					}
				} else {
					self.subalbums.forEach(
						function(subalbum) {
							if (subalbum.isEqual(ithProtectedSubalbum))
								PhotoFloat.mergeProtectedSubalbum(subalbum, ithProtectedSubalbum, codesSimpleCombination, number);
						}
					);
				}
			}
		);
	};

	Album.prototype.hasUnloadedProtectedContent = function({getMedia, getPositions}) {
		var self = this;
		var numUnveiledPasswords = this.numPasswords(true);
		if (numUnveiledPasswords) {
			let codesSimpleCombinations = Object.keys(self.includedFilesByCodesSimpleCombination);
			let indexOfComma = codesSimpleCombinations.indexOf(",");
			if (indexOfComma !== -1)
				codesSimpleCombinations.splice(indexOfComma, 1);
			if (
				codesSimpleCombinations.length > 0 &&
				codesSimpleCombinations.every(
					function(codesSimpleCombination) {
						return Object.keys(self.includedFilesByCodesSimpleCombination[codesSimpleCombination]).every(
							function(number) {
								var result =
									self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot") &&
									(! getMedia || self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("mediaGot")) &&
									(! getPositions || self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("positionsGot"));
								return result
							}
						)
					}
				)
			) {
				return false;
			}
		}
		return true;
	};


	Album.prototype.addProtectedContent = function({getMedia, getPositions}, numsProtectedMediaInSubTree) {
		// this function adds the protected content to the given album
		var self = this;

		return new Promise(
			function(resolve_addProtectedContent, reject_addProtectedContent) {
				if (self.isMap() || self.isSelection()) {
					// map and selection albums do not admit adding protected content
					resolve_addProtectedContent();
				} else {
					var numsPromise;
					if (self.isEmpty() && typeof numsProtectedMediaInSubTree !== "undefined") {
						self.numsProtectedMediaInSubTree = numsProtectedMediaInSubTree;
					}
					// if (self.hasOwnProperty("numsProtectedMediaInSubTree")) {
					if (self.hasOwnProperty("numsProtectedMediaInSubTree") && ! self.isEmpty()) {
						numsPromise = continueAddProtectedContent();
						numsPromise.then(
							function() {
								self.invalidatePositionsAndMediaInAlbumAndSubalbums();
								resolve_addProtectedContent();
							},
							function() {
								console.trace();
							}
						);
					} else {
						// the album hasn't unprotected content and no protected cache base has been processed yet:
						// a protected album must be loaded in order to know the complex combinations

						// var theProtectedDirectoriesToGet = PhotoFloat.protectedDirectoriesToGet();
						// if (! theProtectedDirectoriesToGet.length) {
						// 	reject_addProtectedContent();
						// } else {
							// var promise = self.getNumsProtectedMediaInSubTreeProperty(theProtectedDirectoriesToGet);
						var promise = self.getNumsProtectedMediaInSubTreeProperty();
						promise.then(
							function() {
								self.empty = false;
								numsPromise = continueAddProtectedContent();
								numsPromise.then(
									function() {
										self.invalidatePositionsAndMediaInAlbumAndSubalbums();
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
						// }
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
					var theCodesSimpleCombinationsToGet = PhotoFloat.codesSimpleCombinationsToGet(self, {getMedia: getMedia, getPositions: getPositions});
					if (! theCodesSimpleCombinationsToGet.length) {
						if (! env.cache.getAlbum(self.cacheBase))
							env.cache.putAlbum(self);
						resolve_continueAddProtectedContent();
					} else {
						// prepare and get the protected content from the protected directories
						let protectedPromises = [];
						// let codesSimpleCombinationGot = [];

						// loop on the simple combinations, i.e. on the protected directories
						for (let iSimple = 0; iSimple < theCodesSimpleCombinationsToGet.length; iSimple ++) {
							let codesSimpleCombination = theCodesSimpleCombinationsToGet[iSimple];
							// let codesCombinationsLists = PhotoFloat.convertComplexCombinationsIntoLists(codesSimpleCombination);
							let [albumMd5, mediaMd5] = util.convertCodesListToMd5sList(codesSimpleCombination.split(','));
							// codesSimpleCombinationGot.push(codesSimpleCombination);

							let protectedDirectory = env.options.protected_directories_prefix;
							if (albumMd5)
								protectedDirectory += albumMd5;
							protectedDirectory += ',';
							if (mediaMd5)
								protectedDirectory += mediaMd5;

							// if (! self.includedFilesByCodesSimpleCombination.hasOwnProperty(codesSimpleCombination) || ! self.includedFilesByCodesSimpleCombination[codesSimpleCombination]){
							// 	// TO DO: check if it's safe to do this when self.includedFilesByCodesSimpleCombination[codesSimpleCombination] === false
							// 	self.includedFilesByCodesSimpleCombination[codesSimpleCombination] = {};
							// }

							// we can know how many files/symlinks we have to get in the protected directory
							let numProtectedCacheBases = self.getNumProtectedCacheBases(codesSimpleCombination);
							for (let iCacheBase = 0; iCacheBase < numProtectedCacheBases; iCacheBase ++) {
								let number = iCacheBase;
								let protectedCacheBase = protectedDirectory + '/' + self.cacheBase + '.' + iCacheBase;
								self.initializeIncludedFilesByCodesSimpleCombinationProperty(codesSimpleCombination, number);
								// if (! self.includedFilesByCodesSimpleCombination[codesSimpleCombination].hasOwnProperty(number)) {
								// 	self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number] = {};
								// 	self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album = {};
								// }

								let ithPromise = new Promise(
									function(resolve_ithPromise, reject) {
										if (
											self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot") &&
											(! getMedia || self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("mediaGot")) &&
											(! getPositions || self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("positionsGot"))
										) {
											// this cache base has been already loaded and either media/positions are already there or aren't needed now
											resolve_ithPromise();
										} else {
											let promise = self.getSingleProtectedCacheBaseWithExternalMediaAndPositions(protectedCacheBase, {getMedia: getMedia, getPositions: getPositions});
											promise.then(
												function() {
													if (self.isEmpty())
														self.empty = false;
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

								if (! util.isSearchRootCacheBase(self.cacheBase)) {
									delete self.mediaNameSort;
									delete self.mediaReverseSort;
									delete self.albumNameSort;
									delete self.albumReverseSort;
									self.sortAlbumsMedia();
								}
								resolve_continueAddProtectedContent();
							}
						);
					}
				}
			);
		}
	};

	Album.prototype.getNumProtectedCacheBases = function(codesComplexCombination) {
		var [albumCodesComplexCombinationList, mediaCodesComplexCombinationList] = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombination);

		var count = 0;
		for (var codesComplexCombinationFromObject in this.numsProtectedMediaInSubTree) {
			if (this.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationFromObject) && codesComplexCombinationFromObject !== ",") {
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

	Album.prototype.hasProtectedContent = function() {
		return this.numPasswords() > 0;
		//
		// if (
		// 	Object.keys(this.numsProtectedMediaInSubTree).length > 1 ||
		// 	Object.keys(this.numsProtectedMediaInSubTree).length == 1 &&
		// 	! this.numsProtectedMediaInSubTree.hasOwnProperty(",")
		// 	// Object.keys(this.numsProtectedMediaInSubTree).length > 0 && (
		// 	// 	! this.numsProtectedMediaInSubTree.hasOwnProperty(",") ||
		// 	// 	Object.keys(this.numsProtectedMediaInSubTree).length > 1
		// 	// )
		// )
		// 	return true;
		// else
		// 	return false;
	};

	Album.prototype.hasVeiledProtectedContent = function() {
		var numUnveiledPasswords = this.numPasswords(true);
		var numPasswords = this.numPasswords(false);
		return numPasswords && numPasswords - numUnveiledPasswords > 0;
		// if (
		// 	Object.keys(this.numsProtectedMediaInSubTree).length > env.guessedPasswordCodes.length && (
		// 		! this.numsProtectedMediaInSubTree.hasOwnProperty(",") ||
		// 		Object.keys(this.numsProtectedMediaInSubTree).length > env.guessedPasswordCodes.length + 1
		// 	)
		// )
		// 	return true;
		// else
		// 	return false;
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

				if (album) {
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
									// 		return singleMedia1.foldersCacheBase === singleMedia2.foldersCacheBase && singleMedia1.cacheBase === singleMedia2.cacheBase;
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

							if (! album.hasOwnProperty("numsProtectedMediaInSubTree") || album.hasUnloadedProtectedContent({getMedia: getMedia, getPositions: getPositions})) {
								var protectedContentPromise = album.addProtectedContent({getMedia: getMedia, getPositions: getPositions});
								protectedContentPromise.then(
									function() {
										thingsToBeDoneBeforeResolvingGetAlbum(album);
										resolve_getAlbum(album);
									},
									function() {
										if (getAlbum_error)
											getAlbum_error();
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
					var unprotectedCacheBasePromise = PhotoFloat.getSingleUnprotectedCacheBaseWithExternalMediaAndPositions(cacheBase, {getMedia: getMedia, getPositions: getPositions});
					unprotectedCacheBasePromise.then(
						function unprotectedAlbumGot(album) {
							if (album.hasProtectedContent()) {
								var protectedContentPromise = album.addProtectedContent({getMedia: getMedia, getPositions: getPositions});
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
											getAlbum_error();
									}
								);
							}
							// end of unprotectedAlbumUnexisting function body

							function numsProtectedMediaInSubTreePropertyIsThere() {
								var protectedContentPromise = emptyAlbum.addProtectedContent({getMedia: getMedia, getPositions: getPositions});
								protectedContentPromise.then(
									function unprotectedAlbumUnexistingProtectedAlbumExisting() {
										thingsToBeDoneBeforeResolvingGetAlbum(emptyAlbum);
										resolve_getAlbum(emptyAlbum);
									},
									function unprotectedAlbumUnexistingProtectedAlbumUnexisting() {
										// neither the unprotected nor any protected album exists => nonexistent album
										if (getAlbum_error)
											getAlbum_error();
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

	Album.prototype.generateAncestorsCacheBase = function() {
		if (! this.hasOwnProperty("ancestorsCacheBase")) {
			var i;
			this.ancestorsCacheBase = [];
			var splittedCacheBase = this.cacheBase.split(env.options.cache_folder_separator);
			this.ancestorsCacheBase[0] = splittedCacheBase[0];
			var length = splittedCacheBase.length;
			if (this.isSearch())
				length = 2;
			for (i = 1; i < length; i ++) {
				this.ancestorsCacheBase[i] = [this.ancestorsCacheBase[i - 1], splittedCacheBase[i]].join(env.options.cache_folder_separator);
			}
		}

		return;
	};

	PhotoFloat.prototype.pickRandomMedia = function(iSubalbum, error) {
		var index;
		ithSubalbum = env.currentAlbum.subalbums[iSubalbum];

		return new Promise(
			function(resolve_pickRandomMedia) {
				var promise = ithSubalbum.toAlbum(error, {getMedia: false, getPositions: false});
				promise.then(
					function beginPick(album) {
						env.currentAlbum.subalbums[iSubalbum] = album;
						// var album = env.currentAlbum.subalbums[iSubalbum];
						// index = 0;
						let nMedia = album.numsMediaInSubTree.imagesAndVideosTotal();
						if (album.isTransversal() && album.subalbums.length > 0)
							nMedia -= album.numsMedia.imagesAndVideosTotal();

						index = Math.floor(Math.random() * nMedia);
						nextAlbum(album, resolve_pickRandomMedia);
					},
					function() {
						console.trace();
					}
				);
			}
		);
		//// end of function pickRandomMedia ////////////////////

		function nextAlbum(album, resolve_pickRandomMedia) {
			var i, nMediaInAlbum;

			if (! album.numsMediaInSubTree.imagesAndVideosTotal()) {
				error();
				return;
			}

			if (album.isTransversal() && album.subalbums.length > 0) {
				// do not get the random media from the year/country nor the month/state albums
				// this way loading of albums is much faster
				nMediaInAlbum = 0;
			} else {
				nMediaInAlbum = album.numsMedia.imagesAndVideosTotal();
			}
			if (index >= nMediaInAlbum) {
				index -= nMediaInAlbum;
				if (album.subalbums.length) {
					let found = false;
					for (i = 0; i < album.subalbums.length; i ++) {
						if (index >= album.subalbums[i].numsMediaInSubTree.imagesAndVideosTotal())
							index -= album.subalbums[i].numsMediaInSubTree.imagesAndVideosTotal();
						else {
							var promise = album.subalbums[i].toAlbum(error, {getMedia: false, getPositions: false});
							promise.then(
								function(targetSubalbum) {
									album.subalbums[i] = targetSubalbum;
									nextAlbum(targetSubalbum, resolve_pickRandomMedia);
								},
								function() {
									console.trace();
								}
							);
							found = true;
							break;
						}
					}
					if (! found)
						error();
				}
			} else {
				var lastPromise = PhotoFloat.getAlbum(album, error, {getMedia: true, getPositions: true});
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
	};

	PhotoFloat.encodeHash = function(cacheBase, media, foundAlbumHash, savedSearchAlbumHash) {
		var hash;

		if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
			savedSearchAlbumHash = PhotoFloat.cleanHash(savedSearchAlbumHash);
			foundAlbumHash = PhotoFloat.cleanHash(foundAlbumHash);
		}

		if (media !== null) {
			// media hash
			if (util.isFolderCacheBase(cacheBase)) {
				if (typeof savedSearchAlbumHash === "undefined" || savedSearchAlbumHash === null)
					// media in folders album, count = 2
					hash = util.pathJoin([
						cacheBase,
						media.cacheBase
					]);
				else
					// media in found album or in one of its subalbum, count = 4
					hash = util.pathJoin([
						cacheBase,
						foundAlbumHash,
						savedSearchAlbumHash,
						media.cacheBase
					]);
			} else if (
				util.isByDateCacheBase(cacheBase) ||
				util.isByGpsCacheBase(cacheBase) ||
				util.isSearchCacheBase(cacheBase) && (typeof savedSearchAlbumHash === "undefined" || savedSearchAlbumHash === null) ||
				util.isSelectionCacheBase(cacheBase) ||
				util.isMapCacheBase(cacheBase)
			)
				// media in date or gps album, count = 3
				hash = util.pathJoin([
					cacheBase,
					media.foldersCacheBase,
					media.cacheBase
				]);
		} else {
			// no media: album hash
			if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
				// found album or one of its subalbums, count = 3
				hash = util.pathJoin([
					cacheBase,
					foundAlbumHash,
					savedSearchAlbumHash
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

		var hashParts, hashPartsCount, albumHash, mediaFolderHash = null, mediaHash = null;
		var savedSearchAlbumHash = null, foundAlbumHash = null;

		hash = PhotoFloat.cleanHash(hash);

		if (! hash.length) {
			albumHash = env.options.folders_string;
		} else {
			// split on the slash and count the number of parts
			hashParts = hash.split("/");
			hashPartsCount = hashParts.length;
			env.searchAndSubalbumHash = "";

			if (hashPartsCount === 1) {
				// folders or gps or date hash: album only
				albumHash = hash;
			} else if (hashPartsCount === 2) {
				// media in folders album: album, media
				albumHash = hashParts[0];
				mediaHash = hashParts[1];
			} else if (hashPartsCount === 3) {
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
			} else if (hashPartsCount === 4) {
				albumHash = hashParts[0];
				foundAlbumHash = hashParts[1];
				savedSearchAlbumHash = hashParts[2];
				mediaHash = hashParts[3];
			}
		}
		return [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash];
	};

	PhotoFloat.prototype.parseHashAndReturnAlbumAndMedia = function(hash) {
		return new Promise(
			function(resolve_parseHash, reject_parseHash) {
				var removedStopWords = [];
				var searchWordsFromUser = [], searchWordsFromUserNormalized = [], searchWordsFromUserNormalizedAccordingToOptions = [];
				var albumCacheBaseToGet, albumHashes = [], wordSubalbums = new Subalbums([]);
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

					let splittedAlbumHash = albumHash.split(env.options.cache_folder_separator);
					if (util.isSearchCacheBase(albumHash)) {

						// wordsWithOptionsString = albumHash.substring(env.options.by_search_string.length + 1);
						wordsWithOptionsString = splittedAlbumHash[1];
						var wordsAndOptions = wordsWithOptionsString.split(env.options.search_options_separator);
						var wordsString = wordsAndOptions[wordsAndOptions.length - 1];
						var wordsStringOriginal = wordsString.replace(/_/g, ' ');
						// the normalized words are needed in order to compare with the search cache json files names, which are normalized
						var wordsStringNormalizedAccordingToOptions = util.normalizeAccordingToOptions(wordsStringOriginal);
						var wordsStringNormalized = util.removeAccents(wordsStringOriginal.toLowerCase());
						if (wordsAndOptions.length > 1) {
							var searchOptions = wordsAndOptions.slice(0, -1);
							env.options.search_inside_words = searchOptions.includes('i');
							env.options.search_any_word = searchOptions.includes('n');
							env.options.search_case_sensitive = searchOptions.includes('c');
							env.options.search_accent_sensitive = searchOptions.includes('a');
							env.options.search_current_album = searchOptions.includes('o');
						}

						$("ul#right-menu #search-field").attr("value", wordsStringOriginal);
						wordsString = util.normalizeAccordingToOptions(wordsString);
						searchWordsFromUser = wordsString.split('_');
						searchWordsFromUserNormalizedAccordingToOptions = wordsStringNormalizedAccordingToOptions.split(' ');
						searchWordsFromUserNormalized = wordsStringNormalized.split(' ');

						if (searchWordsFromUser.length === 1)
							$("ul#right-menu li#any-word").addClass("dimmed").off("click");


						if (albumHash === env.options.by_search_string) {
							env.searchAlbum = util.initializeSearchAlbumBegin(albumHash, mediaFolderHash);
							// no search term
							// TO DO: does execution actually arrive here?
							util.noResults(env.searchAlbum, '#no-search-string');
							// the resolve function is needed at least in order to show the title
							resolve_parseHash([env.searchAlbum, -1]);
							return;
						}
					}
					if (util.isSearchCacheBase(albumHash) || util.isMapCacheBase(albumHash)) {
						env.options.cache_base_to_search_in = splittedAlbumHash.slice(2).join(env.options.cache_folder_separator);
					}
				}

				if (util.isSearchCacheBase(albumHash)) {
					albumCacheBaseToGet = albumHash;
				// // same conditions as before????????????????
				// } else if (util.isSearchCacheBase(albumHash)) {
				// 	albumCacheBaseToGet = util.pathJoin([albumHash, mediaFolderHash]);
				} else {
					albumCacheBaseToGet = albumHash;
				}

				if (mediaHash)
					mediaHash = decodeURI(mediaHash);
				if (mediaFolderHash)
					mediaFolderHash = decodeURI(mediaFolderHash);
				if (env.searchAndSubalbumHash)
					env.searchAndSubalbumHash = decodeURI(env.searchAndSubalbumHash);

				var albumFromCache = env.cache.getAlbum(albumCacheBaseToGet), promise;
				if (
					albumFromCache &&
					! albumFromCache.hasVeiledProtectedContent() &&
					// ! env.guessedPasswordsMd5.length &&
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
						let result = albumFromCache.getMediaIndex(mediaFolderHash, mediaHash);
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
					promise = PhotoFloat.getAlbum(albumCacheBaseToGet, reject_parseHash, {getMedia: true, getPositions: true});
					promise.then(
						function(album) {
							let result = album.getMediaIndex(mediaFolderHash, mediaHash);
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
					env.searchAlbum = util.initializeSearchAlbumBegin(albumHash, mediaFolderHash);
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
				// end of parseHashAndReturnAlbumAndMedia promise code

				function subalbumsAbsentOrGot() {
					var indexMedia, indexSubalbums;
					if (env.searchAlbum.media.length === 0 && env.searchAlbum.subalbums.length === 0) {
						util.noResults(env.searchAlbum);
					} else {
						$(".search-failed").hide();
					}

					for (indexMedia = 0; indexMedia < env.searchAlbum.media.length; indexMedia ++) {
						// add the parent to the media
						env.searchAlbum.media[indexMedia].addParent(env.searchAlbum);
						if (env.searchAlbum.media[indexMedia].hasGpsData()) {
							// add the media position
							env.searchAlbum.positionsAndMediaInTree.addSingleMediaToPositionsAndMedia(env.searchAlbum.media[indexMedia]);
							env.searchAlbum.numPositionsInTree = env.searchAlbum.positionsAndMediaInTree.length;
						}
					}

					if (env.searchAlbum.subalbums.length) {
						let subalbumPromises = [];
						for (indexSubalbums = 0; indexSubalbums < env.searchAlbum.subalbums.length; indexSubalbums ++) {
							let thisSubalbum = env.searchAlbum.subalbums[indexSubalbums];
							let thisIndex = indexSubalbums;
							// update the media count
							env.searchAlbum.numsMediaInSubTree.sum(env.searchAlbum.numsMediaInSubTree, thisSubalbum.numsMediaInSubTree);
							// update the size totals
							env.searchAlbum.sizesOfSubTree.sum(thisSubalbum.sizesOfSubTree);
							env.searchAlbum.sizesOfAlbum.sum(thisSubalbum.sizesOfAlbum);
							// add the points from the subalbums

							// the subalbum could still have no positionsAndMediaInTree array, get it
							if (! thisSubalbum.hasOwnProperty("positionsAndMediaInTree")) {
								let subalbumPromise = new Promise(
									function(resolve_subalbumPromise) {
										let promise = PhotoFloat.getAlbum(thisSubalbum.cacheBase, null, {getMedia: false, getPositions: true});
										promise.then(
											function(thisSubalbum) {
												env.searchAlbum.subalbums[thisIndex] = thisSubalbum;
												env.searchAlbum.positionsAndMediaInTree.mergePositionsAndMedia(thisSubalbum.positionsAndMediaInTree);
												env.searchAlbum.numPositionsInTree = env.searchAlbum.positionsAndMediaInTree.length;
												// thisSubalbum.positionsAndMediaInTree = positionsGot;
												// thisSubalbum.numPositionsInTree = album.positionsAndMediaInTree.length;
												// thisSubalbum.includedFilesByCodesSimpleCombination[","].positionsGot = true;
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
							Promise.all(subalbumPromises).then(
								function() {
									var promise = PhotoFloat.endPreparingAlbumAndKeepOn(env.searchAlbum, mediaHash, mediaFolderHash);
									promise.then(
										function(i) {
											resolve_parseHash([env.searchAlbum, i]);
										}
									);
								}
							);
						}
					} else {
						var promise = PhotoFloat.endPreparingAlbumAndKeepOn(env.searchAlbum, mediaHash, mediaFolderHash);
						promise.then(
							function(i) {
								resolve_parseHash([env.searchAlbum, i]);
							}
						);
					}
				}

				function buildSearchResult() {
					env.searchAlbum.removedStopWords = removedStopWords;
					// has any word remained after stop words have been removed?
					if (searchWordsFromUser.length === 0) {
						util.noResults(env.searchAlbum, '#no-search-string-after-stopwords-removed');
						resolve_parseHash([env.searchAlbum, -1]);
						return;
					}

					// get the search root album before getting the search words ones
					var promise = PhotoFloat.getAlbum(env.options.by_search_string, reject_parseHash, {getMedia: true, getPositions: true});
					promise.then(
						function(bySearchRootAlbum) {
							var lastIndex, i, j, wordHashes, numSearchAlbumsReady = 0, numSubAlbumsToGet = 0, normalizedWords;
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
									wordHashes = [];
									for (j = 0; j < env.searchWordsFromJsonFile.length; j ++) {
										if (
											env.searchWordsFromJsonFile[j].some(
												function(word) {
													return word.includes(searchWordsFromUserNormalized[i]);
												}
											)
										) {
											wordHashes.push(env.searchAlbumCacheBasesFromJsonFile[j]);
											wordSubalbums.push(env.searchAlbumSubalbumsFromJsonFile[j]);
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
										env.searchWordsFromJsonFile.some(
											function(words, index) {
												if (words.includes(searchWordsFromUserNormalized[i])) {
													albumHashes.push([env.searchAlbumCacheBasesFromJsonFile[index]]);
													wordSubalbums.push(env.searchAlbumSubalbumsFromJsonFile[index]);
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
								util.noResults(env.searchAlbum);
								resolve_parseHash([env.searchAlbum, -1]);
							} else if (numSubAlbumsToGet > env.options.max_search_album_number) {
								util.noResults(env.searchAlbum, '#search-too-wide');
								resolve_parseHash([env.searchAlbum, -1]);
							} else {
								$(".search-failed").hide();
								util.initializeSearchAlbumEnd();
								env.searchAlbum.numsProtectedMediaInSubTree = util.sumNumsProtectedMediaOfArray(wordSubalbums);
								for (indexWords = 0; indexWords <= lastIndex; indexWords ++) {
									searchResultsMedia[indexWords] = new Media([]);
									searchResultsSubalbums[indexWords] = new Subalbums([]);
									for (indexAlbums = 0; indexAlbums < albumHashes[indexWords].length; indexAlbums ++) {
										let thisIndexWords = indexWords, thisIndexAlbums = indexAlbums;
										var promise = PhotoFloat.getAlbum(albumHashes[thisIndexWords][thisIndexAlbums], reject_parseHash, {getMedia: true, getPositions: true});
										promise.then(
											function(theAlbum) {
												var matchingMedia = new Media([]), matchingSubalbums = new Subalbums([]), match, indexMedia, indexSubalbums, indexWordsLeft, resultAlbum, indexWords1, ithMedia, ithSubalbum;

												env.cache.putAlbum(theAlbum);

												resultAlbum = theAlbum.clone();
												// media in the album still has to be filtered according to search criteria
												if (! env.options.search_inside_words) {
													// whole word
													for (indexMedia = 0; indexMedia < theAlbum.media.length; indexMedia ++) {
														ithMedia = theAlbum.media[indexMedia];
														if (
															util.normalizeAccordingToOptions(ithMedia.words).includes(searchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]) && (
																! env.options.search_current_album ||
																util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
																	// check whether the media is inside the current album tree
																	ithMedia.foldersCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
																	ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
																	ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
																	util.isMapCacheBase(env.options.cache_base_to_search_in) &&
																	env.cache.getAlbum(env.options.cache_base_to_search_in).media.some(
																		function(singleMedia) {
																			return singleMedia.cacheBase === ithMedia.cacheBase && singleMedia.foldersCacheBase === ithMedia.foldersCacheBase;
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
																! env.options.search_current_album ||
																util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
																	// check whether the media is inside the current album tree
																	ithSubalbum.cacheBase.indexOf(env.options.cache_base_to_search_in) === 0 &&
																	ithSubalbum.cacheBase != env.options.cache_base_to_search_in
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
																! env.options.search_current_album ||
																util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
																	// check whether the media is inside the current album tree
																	ithMedia.foldersCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
																	ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
																	ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
																	util.isMapCacheBase(env.options.cache_base_to_search_in) &&
																	env.cache.getAlbum(env.options.cache_base_to_search_in).media.some(
																		function(singleMedia) {
																			return singleMedia.cacheBase === ithMedia.cacheBase && singleMedia.foldersCacheBase === ithMedia.foldersCacheBase;
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
																! env.options.search_current_album ||
																util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
																	// check whether the media is inside the current album tree
																	ithSubalbum.cacheBase.indexOf(env.options.cache_base_to_search_in) === 0 &&
																	ithSubalbum.cacheBase != env.options.cache_base_to_search_in
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
													searchResultsMedia[thisIndexWords].unionForSearches(resultAlbum.media);
													searchResultsSubalbums[thisIndexWords].unionForSearches(resultAlbum.subalbums);
												}
												// the following instruction makes me see that numSearchAlbumsReady never reaches numSubAlbumsToGet when numSubAlbumsToGet is > 1000,
												// numSearchAlbumsReady remains < 1000

												numSearchAlbumsReady ++;
												if (numSearchAlbumsReady >= numSubAlbumsToGet) {
													// all the albums have been got, we can merge the results
													env.searchAlbum.media = searchResultsMedia[0];
													env.searchAlbum.subalbums = searchResultsSubalbums[0];
													for (indexWords1 = 1; indexWords1 <= lastIndex; indexWords1 ++) {
														if (indexWords1 in searchResultsMedia) {
															if (env.options.search_any_word)
																env.searchAlbum.media.unionForSearches(searchResultsMedia[indexWords1]);
															else
																env.searchAlbum.media.intersectionForSearches(searchResultsMedia[indexWords1]);
															// env.searchAlbum.media = env.options.search_any_word ?
															// 	util.mediaOrSubalbumsUnionForSearches(env.searchAlbum.media, searchResultsMedia[indexWords1]) :
															// 	util.intersect(env.searchAlbum.media, searchResultsMedia[indexWords1]);
														}
														if (indexWords1 in searchResultsSubalbums) {
															if (env.options.search_any_word)
																env.searchAlbum.subalbums.unionForSearches(searchResultsSubalbums[indexWords1]);
															else
																env.searchAlbum.subalbums.intersectionForSearches(searchResultsSubalbums[indexWords1]);
															// env.searchAlbum.subalbums = env.options.search_any_word ?
															// 	util.mediaOrSubalbumsUnionForSearches(env.searchAlbum.subalbums, searchResultsSubalbums[indexWords1]) :
															// 	util.intersect(env.searchAlbum.subalbums, searchResultsSubalbums[indexWords1]);
														}
													}

													if (lastIndex != searchWordsFromUser.length - 1) {
														// we still have to filter out the media that do not match the words after the first
														// we are in all words search mode
														matchingMedia = new Media([]);
														for (indexMedia = 0; indexMedia < env.searchAlbum.media.length; indexMedia ++) {
															match = true;
															if (! env.options.search_inside_words) {
																// whole word
																normalizedWords = util.normalizeAccordingToOptions(env.searchAlbum.media[indexMedia].words);
																if (
																	searchWordsFromUserNormalizedAccordingToOptions.some(
																		function(element, index) {
																			return index > lastIndex && normalizedWords.indexOf(element) === -1;
																		}
																	)
																)
																	match = false;
															} else {
																// inside words
																for (indexWordsLeft = lastIndex + 1; indexWordsLeft < searchWordsFromUser.length; indexWordsLeft ++) {
																	normalizedWords = util.normalizeAccordingToOptions(env.searchAlbum.media[indexMedia].words);
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
															if (match && matchingMedia.indexOf(env.searchAlbum.media[indexMedia]) === -1)
																matchingMedia.push(env.searchAlbum.media[indexMedia]);
														}
														env.searchAlbum.media = matchingMedia;

														matchingSubalbums = new Subalbums([]);
														for (indexSubalbums = 0; indexSubalbums < env.searchAlbum.subalbums.length; indexSubalbums ++) {
															match = true;
															if (! env.options.search_inside_words) {
																// whole word
																normalizedWords = util.normalizeAccordingToOptions(env.searchAlbum.subalbums[indexSubalbums].words);
																if (
																	searchWordsFromUserNormalizedAccordingToOptions.some(
																		function(element, index) {
																			return index > lastIndex && normalizedWords.indexOf(element) === -1;
																		}
																	)
																)
																	match = false;
															} else {
																// inside words
																for (indexWordsLeft = lastIndex + 1; indexWordsLeft < searchWordsFromUser.length; indexWordsLeft ++) {
																	normalizedWords = util.normalizeAccordingToOptions(env.searchAlbum.subalbums[indexSubalbums].words);
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
															if (match && matchingSubalbums.indexOf(env.searchAlbum.subalbums[indexSubalbums]) === -1)
																matchingSubalbums.push(env.searchAlbum.subalbums[indexSubalbums]);
														}

														env.searchAlbum.subalbums = matchingSubalbums;
													}

													let promises = [];
													if (env.searchAlbum.media.length) {
														// search albums need to conform to default behaviour of albums:
														// json files have subalbums and media sorted according to options
														env.searchAlbum.media.forEach(
															function(singleMedia) {
																let promise = new Promise(
																	function(resolve_singleMedia) {
																		let cacheBase = singleMedia.foldersCacheBase
																		let albumHash = PhotoFloat.decodeHash(window.location.hash)[0];
																		// let searchStartCacheBase = albumHash.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
																		if (Utilities.isByDateCacheBase(env.options.cache_base_to_search_in) && singleMedia.hasOwnProperty("dayAlbumCacheBase"))
																			cacheBase = singleMedia.dayAlbumCacheBase;
																		else if (Utilities.isByGpsCacheBase(env.options.cache_base_to_search_in) && singleMedia.hasGpsData())
																			cacheBase = singleMedia.gpsAlbumCacheBase;
																		let parentAlbumPromise = PhotoFloat.getAlbum(cacheBase, null, {getMedia: false, getPositions: false});
																		parentAlbumPromise.then(
																			function(parentAlbum) {
																				singleMedia.generateCaptionForSearch(parentAlbum);
																				resolve_singleMedia();
																			}
																		);
																	}
																);
																promises.push(promise);
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
																				env.searchAlbum.subalbums[iSubalbum].generateAlbumCaptionForSearch();
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
				if (
					env.cache.stopWords.every(
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
		// this function is called after a search album or a map album is prepared
		return new Promise(
			function(resolve_endPreparingAlbumAndKeepOn) {
				// add the various counts
				resultsAlbumFinal.numsMediaInSubTree = resultsAlbumFinal.media.imagesAndVideosCount();
				resultsAlbumFinal.numsMedia = resultsAlbumFinal.media.imagesAndVideosCount();
				resultsAlbumFinal.numPositionsInTree = resultsAlbumFinal.positionsAndMediaInTree.length;
				// save in the cache array
				if (! env.cache.getAlbum(resultsAlbumFinal.cacheBase))
					env.cache.putAlbum(resultsAlbumFinal);

				resultsAlbumFinal.sortAlbumsMedia();

				var result = resultsAlbumFinal.getMediaIndex(mediaFolderHash, mediaHash);
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

	Album.prototype.getMediaIndex = function(mediaFolderHash, mediaHash) {
		// returns the index of the media identified by the arguments
		// returns null if no media matches

		var mediaIndex = -1;
		if (mediaHash !== null) {
			mediaIndex = this.media.findIndex(
				function(thisMedia) {
					var matches =
						thisMedia.cacheBase === mediaHash &&
						(mediaFolderHash === null || thisMedia.foldersCacheBase === mediaFolderHash);
					return matches;
				}
			);
			if (mediaIndex === -1) {
				$("#loading").stop().hide();

				// let unveiledOnly = true;
				if (
					this.hasVeiledProtectedContent()
					// this.numPasswords(unveiledOnly) && (
					// 	this.subalbums.length === 0 ||
					// 	this.numsProtectedMediaInSubTree.sumUpNumsProtectedMedia() > util.sumNumsProtectedMediaOfArray(this.subalbums).sumUpNumsProtectedMedia()
					// )
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
							window.location.href = "#!" + this.cacheBase;
							// mediaIndex = -1;
							// keepOn();
							$("#media-view").fadeIn(100);
						}
					);
				}
				return null;
			}
		}
		if (this.isSearch() && mediaIndex === -1) {
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

	// PhotoFloat.mediaHash = function(album, singleMedia) {
	// 	return singleMedia.cacheBase;
	// };

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
			hash = env.options.folders_string;
		return hash;
	};


	/* make static methods callable as member functions */
	PhotoFloat.prototype.getAlbum = PhotoFloat.getAlbum;
	PhotoFloat.prototype.mediaHash = PhotoFloat.mediaHash;
	PhotoFloat.prototype.encodeHash = PhotoFloat.encodeHash;
	PhotoFloat.prototype.cleanHash = PhotoFloat.cleanHash;
	PhotoFloat.prototype.decodeHash = PhotoFloat.decodeHash;
	PhotoFloat.prototype.hashCode = PhotoFloat.hashCode;
	PhotoFloat.prototype.endPreparingAlbumAndKeepOn = PhotoFloat.endPreparingAlbumAndKeepOn;
	PhotoFloat.prototype.getStopWords = PhotoFloat.getStopWords;
	PhotoFloat.prototype.removeStopWords = PhotoFloat.removeStopWords;
	PhotoFloat.prototype.hasProtectedContent = PhotoFloat.hasProtectedContent;

	/* expose class globally */
	window.PhotoFloat = PhotoFloat;
}());
