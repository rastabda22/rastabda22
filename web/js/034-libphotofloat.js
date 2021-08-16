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
				if (env.cache.inexistentFiles.indexOf(jsonRelativeFileName) !== -1) {
					reject_getJsonFile();
				} else {
					$.ajax(
						{
							url: util.pathJoin([env.server_cache_path, jsonRelativeFileName]),
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
						emptyAlbum.includedFilesByCodesSimpleCombination = new IncludedFiles({",": false});

						reject_getSingleUnprotectedCacheBase(emptyAlbum);
					}
				);
			}
		);
	};

	Album.prototype.initializeIncludedFilesByCodesSimpleCombinationProperty = function(codesSimpleCombination, number) {
		// if (! this.hasOwnProperty("includedFilesByCodesSimpleCombination"))
		// 	this.includedFilesByCodesSimpleCombination = new IncludedFiles();
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

	Album.prototype.addContentWithExternalMediaAndPositionsFromProtectedCacheBase = function(protectedCacheBase, {getMedia, getPositions}) {
		// this function gets a single protected json file

		var self = this;
		var splittedProtectedCacheBase = protectedCacheBase.split('.');
		var number = parseInt(splittedProtectedCacheBase[splittedProtectedCacheBase.length - 1]);
		var codesSimpleCombination = util.convertProtectedCacheBaseToCodesSimpleCombination(protectedCacheBase);
		self.initializeIncludedFilesByCodesSimpleCombinationProperty(codesSimpleCombination, number);

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
							var protectedAlbum = new Album(object);
							if (! self.hasOwnProperty("numsProtectedMediaInSubTree") || self.empty)
								// this is needed when addContentWithExternalMediaAndPositionsFromProtectedCacheBase() is called by getNumsProtectedMediaInSubTreeProperty()
								self.numsProtectedMediaInSubTree = protectedAlbum.numsProtectedMediaInSubTree;

							if (! self.hasOwnProperty("name"))
								self.name = protectedAlbum.name;
							if (! self.hasOwnProperty("altName") && protectedAlbum.hasOwnProperty("altName"))
								self.altName = protectedAlbum.altName;
							if (! self.hasOwnProperty("ancestorsNames") && protectedAlbum.hasOwnProperty("ancestorsNames"))
								self.ancestorsNames = protectedAlbum.ancestorsNames;
							if (! self.hasOwnProperty("ancestorsTitles") && protectedAlbum.hasOwnProperty("ancestorsTitles"))
								self.ancestorsTitles = protectedAlbum.ancestorsTitles;
							if (! self.hasOwnProperty("ancestorsCenters") && protectedAlbum.hasOwnProperty("ancestorsCenters"))
								self.ancestorsCenters = protectedAlbum.ancestorsCenters;
							if (! self.hasOwnProperty("title") && protectedAlbum.hasOwnProperty("title"))
								self.title = protectedAlbum.title;
							if (! self.hasOwnProperty("description") && protectedAlbum.hasOwnProperty("description"))
								self.description = protectedAlbum.description;
							if (! self.hasOwnProperty("tags") && protectedAlbum.hasOwnProperty("tags"))
								self.tags = protectedAlbum.tags;

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
				// end of addContentWithExternalMediaAndPositionsFromProtectedCacheBase function body

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


	Album.prototype.codesSimpleCombinationsToGet = function(getMedia, getPositions) {
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

				for (codesComplexCombinationInAlbum in this.numsProtectedMediaInSubTree) {
					if (this.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationInAlbum) && codesComplexCombinationInAlbum != ",") {
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
							let numProtectedCacheBases = this.getNumProtectedCacheBases(codesComplexCombinationInAlbum);
							if (
								! (codesSimpleCombination in this.includedFilesByCodesSimpleCombination)
								||
								Object.values(this.includedFilesByCodesSimpleCombination[codesSimpleCombination]).filter(
									objectWithNumberKey => objectWithNumberKey.album === {countsGot: true}
								).length < numProtectedCacheBases
									// ||
									// Object.keys(this.includedFilesByCodesSimpleCombination[codesSimpleCombination]).length < numProtectedCacheBases
								||
								getMedia && Object.keys(this.includedFilesByCodesSimpleCombination[codesSimpleCombination]).some(
									number => ! this.includedFilesByCodesSimpleCombination[codesSimpleCombination][parseInt(number)].this.hasOwnProperty("mediaGot")
								) ||
								getPositions && Object.keys(this.includedFilesByCodesSimpleCombination[codesSimpleCombination]).some(
									number => ! this.includedFilesByCodesSimpleCombination[codesSimpleCombination][parseInt(number)].this.hasOwnProperty("positionsGot")
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

						var promise = self.addContentWithExternalMediaAndPositionsFromProtectedCacheBase(protectedCacheBase, {getMedia: false, getPositions: false});
						promise.then(
							function addContentWithExternalMediaAndPositionsFromProtectedCacheBase_resolved() {
								// ok, we got what we were looking for: numsProtectedMediaInSubTree property has been added by addContentWithExternalMediaAndPositionsFromProtectedCacheBase()

								delete self.mediaNameSort;
								delete self.mediaReverseSort;
								delete self.albumNameSort;
								delete self.albumReverseSort;
								self.sortAlbumsMedia();

								resolve_getNextProtectedDirectory();
							},
							function addContentWithExternalMediaAndPositionsFromProtectedCacheBase_rejected() {
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
		var cacheBases = [];
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

	Album.prototype.hasUnloadedProtectedContent = function(mustGetMedia, mustGetPositions) {
		// this function is for detecting if protected content has to be loaded
		// to detect if the auth dialog has to be shown use hasVeiledProtectedContent() instead
		if (this.isVirtual())
			return false;
		if (! env.guessedPasswordCodes.length)
			return false;
		var self = this;
		var guessedSimpleCombinationFromNumsProtected = this.guessedCodesSimpleCombinations();
		var guessedSimpleCombinationFromIncludedFiles = Object.keys(self.includedFilesByCodesSimpleCombination);
		var indexOfComma = guessedSimpleCombinationFromIncludedFiles.indexOf(",");
		if (indexOfComma !== -1)
			guessedSimpleCombinationFromIncludedFiles.splice(indexOfComma, 1);

		var intersection = util.arrayIntersect(guessedSimpleCombinationFromNumsProtected, guessedSimpleCombinationFromIncludedFiles);

		if (intersection.length < guessedSimpleCombinationFromNumsProtected.length) {
			return true;
		} else if (
			intersection.every(
				codesSimpleCombination => Object.keys(self.includedFilesByCodesSimpleCombination[codesSimpleCombination]).every(
						number =>
							self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("protectedAlbumGot") &&
							(! mustGetMedia || self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("mediaGot")) &&
							(! mustGetPositions || self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.hasOwnProperty("positionsGot"))
				)
			)
		) {
			return false;
		} else {
			return true;
		}
	};


	Album.prototype.addProtectedContent = function(getMedia, getPositions, numsProtectedMediaInSubTree) {
		// this function adds the protected content to the given album
		var self = this;

		return new Promise(
			function(resolve_addProtectedContent, reject_addProtectedContent) {
				if (self.isVirtual()) {
					// map and selection albums do not admit adding protected content
					resolve_addProtectedContent();
				} else {
					var numsPromise;
					if (self.isEmpty() && typeof numsProtectedMediaInSubTree !== "undefined") {
						self.numsProtectedMediaInSubTree = numsProtectedMediaInSubTree;
					}
					// if (self.hasOwnProperty("numsProtectedMediaInSubTree")) {
					if (true || self.hasOwnProperty("numsProtectedMediaInSubTree") && ! self.isEmpty()) {
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
					var theCodesSimpleCombinationsToGet = self.codesSimpleCombinationsToGet(getMedia, getPositions);
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
											let promise = self.addContentWithExternalMediaAndPositionsFromProtectedCacheBase(protectedCacheBase, {getMedia: getMedia, getPositions: getPositions});
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

								delete self.mediaNameSort;
								delete self.mediaReverseSort;
								delete self.albumNameSort;
								delete self.albumReverseSort;
								self.sortAlbumsMedia();

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
		return this.passwordCodes().length > 0;
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
		// this function is for detecting if the auth dialog has to be shown
		// to detect if protected content has to be loaded use hasUnloadedProtectedContent() instead

		if (this.isVirtual())
			return false;
		var numGuessedPasswords = this.guessedPasswordCodes().length;
		var numPasswords = this.passwordCodes().length;
		return numPasswords - numGuessedPasswords > 0;
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

	Album.prototype.generateAncestorsCacheBase = function() {
		if (! this.hasOwnProperty("ancestorsCacheBase")) {
			var i;
			this.ancestorsCacheBase = [];
			var splittedCacheBase = this.cacheBase.split(env.options.cache_folder_separator);
			var length = splittedCacheBase.length;
			this.ancestorsCacheBase[0] = splittedCacheBase[0];
			if (this.isSearch()) {
				this.ancestorsCacheBase[1] = this.cacheBase;
			} else {
				for (i = 1; i < length; i ++) {
					this.ancestorsCacheBase[i] = [this.ancestorsCacheBase[i - 1], splittedCacheBase[i]].join(env.options.cache_folder_separator);
				}
			}
		}


		return;
	};

	Album.prototype.pickRandomMedia = function(iSubalbum, error) {
		var index;
		var self = this;
		var ithSubalbum = self.subalbums[iSubalbum];
		var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();

		return new Promise(
			function(resolve_pickRandomMedia) {
				var promise = ithSubalbum.toAlbum(error, {getMedia: false, getPositions: false});
				promise.then(
					function beginPick(ithAlbum) {
						self.subalbums[iSubalbum] = ithAlbum;
						// var ithAlbum = self.subalbums[iSubalbum];
						// index = 0;
						let nMedia = ithAlbum.numsMediaInSubTree.imagesAndVideosTotal();
						if (onlyShowNonGeotaggedContent)
							nMedia = ithAlbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal();
						// if (ithAlbum.isTransversal() && ithAlbum.subalbums.length > 0)
						// 	nMedia -= ithAlbum.numsMedia.imagesAndVideosTotal();

						index = Math.floor(Math.random() * nMedia);
						nextAlbum(ithAlbum, resolve_pickRandomMedia);
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

			var filteredAlbum = album;
			if (onlyShowNonGeotaggedContent)
				filteredAlbum = album.cloneAndRemoveGeotaggedContent();

			if (! filteredAlbum.numsMediaInSubTree.imagesAndVideosTotal()) {
				error();
				return;
			}

			nMediaInAlbum = filteredAlbum.numsMedia.imagesAndVideosTotal();

			if (filteredAlbum.isTransversal() && filteredAlbum.subalbums.length > 0) {
				// do not get the random media from the year/country nor the month/state albums
				// this way loading of albums is much faster
				nMediaInAlbum = 0;
			}
			if (index >= nMediaInAlbum) {
				index -= nMediaInAlbum;
				if (filteredAlbum.subalbums.length) {
					let found = false;
					for (i = 0; i < filteredAlbum.subalbums.length; i ++) {
						if (index >= filteredAlbum.subalbums[i].numsMediaInSubTree.imagesAndVideosTotal()) {
							index -= filteredAlbum.subalbums[i].numsMediaInSubTree.imagesAndVideosTotal();
						} else {
							var promise = filteredAlbum.subalbums[i].toAlbum(error, {getMedia: false, getPositions: false});
							promise.then(
								function(convertedAlbum) {
									filteredAlbum.subalbums[i] = convertedAlbum;
									nextAlbum(convertedAlbum, resolve_pickRandomMedia);
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
				var lastPromise = PhotoFloat.getAlbum(filteredAlbum, error, {getMedia: true, getPositions: true});
				lastPromise.then(
					function(filteredAlbum) {
						resolve_pickRandomMedia([filteredAlbum, index]);
					},
					function() {
						console.trace();
					}
				);
			}
		}
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
					promise = PhotoFloat.getAlbum(albumCacheBaseToGet, reject_parseHash, {getMedia: true, getPositions: true});
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
							if (ithMedia.hasGpsData()) {
								// add the media position
								env.searchAlbum.positionsAndMediaInTree.addSingleMedia(ithMedia);
								env.searchAlbum.numPositionsInTree = env.searchAlbum.positionsAndMediaInTree.length;
							}
							env.searchAlbum.sizesOfSubTree.sum(ithMedia.fileSizes);
							env.searchAlbum.sizesOfAlbum.sum(ithMedia.fileSizes);
						}

						if (env.searchAlbum.subalbums.length) {
							let subalbumPromises = [];
							for (indexSubalbums = 0; indexSubalbums < env.searchAlbum.subalbums.length; indexSubalbums ++) {
								let thisSubalbum = env.searchAlbum.subalbums[indexSubalbums];
								let thisIndex = indexSubalbums;
								// update the media count
								env.searchAlbum.numsMediaInSubTree.sum(thisSubalbum.numsMediaInSubTree);
								// update the size totals
								env.searchAlbum.sizesOfSubTree.sum(thisSubalbum.sizesOfSubTree);
								// env.searchAlbum.sizesOfAlbum.sum(thisSubalbum.sizesOfAlbum);

								// add the points from the subalbums

								// the subalbum could still have no positionsAndMediaInTree array, get it
								if (! thisSubalbum.hasOwnProperty("positionsAndMediaInTree")) {
									let subalbumPromise = new Promise(
										function(resolve_subalbumPromise) {
											let promise = PhotoFloat.getAlbum(thisSubalbum.cacheBase, null, {getMedia: false, getPositions: true});
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
					// get the search root album before getting the search words ones
					var promise = PhotoFloat.getAlbum(env.options.by_search_string, reject_parseHash, {getMedia: false, getPositions: false});
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
										var promise = PhotoFloat.getAlbum(albumCacheBases[thisIndexWords][thisIndexAlbums], reject_parseHash, {getMedia: true, getPositions: true});
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
																if (Utilities.isByDateCacheBase(env.options.cache_base_to_search_in) && singleMedia.hasOwnProperty("dayAlbumCacheBase"))
																	cacheBase = singleMedia.dayAlbumCacheBase;
																else if (Utilities.isByGpsCacheBase(env.options.cache_base_to_search_in) && singleMedia.hasGpsData())
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

	Album.prototype.filterMediaAgainstOneWordAndAlbumSearchedIn = function(normalizedWord) {
		var normalizedWords, normalizedTags;
		for (let indexMedia = this.media.length - 1; indexMedia >= 0 ; indexMedia --) {
			let ithMedia = this.media[indexMedia];
			if (! env.options.search_inside_words) {
				// whole word
				normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
				if (ithMedia.metadata.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithMedia.metadata.tags);
				if (
					! (
						! env.options.search_tags_only &&
						normalizedWords.includes(normalizedWord) ||
						env.options.search_tags_only &&
						ithMedia.metadata.hasOwnProperty("tags") &&
						normalizedTags.includes(normalizedWord)
					) || ! (
						! env.options.search_current_album ||
						util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
							// check whether the media is inside the current album tree
							ithMedia.foldersCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							util.isMapCacheBase(env.options.cache_base_to_search_in) &&
							env.cache.getAlbum(env.options.cache_base_to_search_in).media.some(singleMedia => singleMedia.isEqual(ithMedia.cacheBase))
						)
					)
				) {
					this.media.splice(indexMedia, 1);
				}
			} else {
				// inside words
				normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
				if (ithMedia.metadata.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithMedia.metadata.tags);
				if (
					! (
						! env.options.search_tags_only &&
						normalizedWords.some(element => element.includes(normalizedWord)) ||
						env.options.search_tags_only &&
						ithMedia.metadata.hasOwnProperty("tags") &&
						normalizedTags.some(element => element.includes(normalizedWord))
					) || ! (
						! env.options.search_current_album ||
						util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
							// check whether the media is inside the current album tree
							ithMedia.foldersCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							util.isMapCacheBase(env.options.cache_base_to_search_in) &&
							env.cache.getAlbum(env.options.cache_base_to_search_in).media.some(singleMedia => singleMedia.isEqual(ithMedia))
						)
					)
				) {
					this.media.splice(indexMedia, 1);
				}
			}
		}
	};

	Album.prototype.filterSubalbumsAgainstOneWordAndAlbumSearchedIn = function(normalizedWord) {
		var normalizedWords, normalizedTags;
		for (let indexSubalbums = this.subalbums.length - 1; indexSubalbums >= 0; indexSubalbums --) {
			let ithSubalbum = this.subalbums[indexSubalbums];
			if (! env.options.search_inside_words) {
				// whole word
				normalizedWords = util.normalizeAccordingToOptions(ithSubalbum.words);
				if (ithSubalbum.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithSubalbum.tags);
				if (
					! (
						! env.options.search_tags_only &&
						normalizedWords.includes(normalizedWord) ||
						env.options.search_tags_only &&
						ithSubalbum.hasOwnProperty("tags") &&
						normalizedTags.includes(normalizedWord)
					) || ! (
						! env.options.search_current_album ||
						env.options.cache_base_to_search_in === env.options.folders_string || (
						// util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
							// check whether the media is inside the current album tree
							ithSubalbum.cacheBase.indexOf(env.options.cache_base_to_search_in) === 0 &&
							ithSubalbum.cacheBase != env.options.cache_base_to_search_in
						)
					)
				) {
					this.subalbums.splice(indexSubalbums, 1);
				}
			} else {
				// inside words
				normalizedWords = util.normalizeAccordingToOptions(ithSubalbum.words);
				if (ithSubalbum.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithSubalbum.tags);
				if (
					! (
						! env.options.search_tags_only &&
						normalizedWords.some(element => element.includes(normalizedWord)) ||
						env.options.search_tags_only &&
						ithSubalbum.hasOwnProperty("tags") &&
						normalizedTags.some(element => element.includes(normalizedWord))
					) || ! (
						! env.options.search_current_album ||
						env.options.cache_base_to_search_in === env.options.folders_string || (
						// util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
							// check whether the media is inside the current album tree
							ithSubalbum.cacheBase.indexOf(env.options.cache_base_to_search_in) === 0 &&
							ithSubalbum.cacheBase != env.options.cache_base_to_search_in
						)
					)
				) {
					this.subalbums.splice(indexSubalbums, 1);
				}
			}
		}
	};

	Album.prototype.filterMediaAgainstEveryWord = function(searchWordsFromUserNormalizedAccordingToOptions, lastIndex) {
		var normalizedWords, normalizedTags;
		if (lastIndex === undefined)
			lastIndex = -1;

		for (let indexMedia = this.media.length - 1; indexMedia >= 0 ; indexMedia --) {
			let ithMedia = this.media[indexMedia];
			if (! env.options.search_inside_words) {
				// whole word
				normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
				if (ithMedia.metadata.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithMedia.metadata.tags);
				if (
					! env.options.search_tags_only &&
					searchWordsFromUserNormalizedAccordingToOptions.some((normalizedSearchWord, index) => index > lastIndex && normalizedWords.indexOf(normalizedSearchWord) === -1) ||
					env.options.search_tags_only && (
						! ithMedia.metadata.hasOwnProperty("tags") ||
						searchWordsFromUserNormalizedAccordingToOptions.some((normalizedSearchWord, index) => index > lastIndex && normalizedTags.indexOf(normalizedSearchWord) === -1)
					)
				) {
					this.media.splice(indexMedia, 1);
				}
			} else {
				// inside words
				for (let indexWordsLeft = lastIndex + 1; indexWordsLeft < searchWordsFromUserNormalizedAccordingToOptions.length; indexWordsLeft ++) {
					normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
					if (ithMedia.metadata.hasOwnProperty("tags") && env.options.search_tags_only)
						normalizedTags = util.normalizeAccordingToOptions(ithMedia.metadata.tags);
					if (
						! env.options.search_tags_only &&
						! normalizedWords.some(normalizedSearchWord => normalizedSearchWord.includes(searchWordsFromUserNormalizedAccordingToOptions[indexWordsLeft])) ||
						env.options.search_tags_only && (
							! ithMedia.metadata.hasOwnProperty("tags") ||
							! normalizedTags.some((normalizedSearchWord, index) => index > lastIndex && normalizedTags.indexOf(normalizedSearchWord) === -1)
						)
					) {
						this.media.splice(indexMedia, 1);
						break;
					}
				}
			}
		}
	};

	Album.prototype.filterSubalbumsAgainstEveryWord = function(searchWordsFromUserNormalizedAccordingToOptions, lastIndex) {
		var normalizedWords, normalizedTags;
		for (let indexSubalbums = this.subalbums.length - 1; indexSubalbums >= 0 ; indexSubalbums --) {
			let ithSubalbum = this.subalbums[indexSubalbums];
			if (! env.options.search_inside_words) {
				// whole word
				normalizedWords = util.normalizeAccordingToOptions(ithSubalbum.words);
				if (ithSubalbum.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithSubalbum.tags);
				if (
					! env.options.search_tags_only &&
					searchWordsFromUserNormalizedAccordingToOptions.some((normalizedSearchWord, index) => index > lastIndex && normalizedWords.indexOf(normalizedSearchWord) === -1) ||
					env.options.search_tags_only && (
						! ithSubalbum.hasOwnProperty("tags") ||
						searchWordsFromUserNormalizedAccordingToOptions.some((normalizedSearchWord, index) => index > lastIndex && normalizedTags.indexOf(normalizedSearchWord) === -1)
					)
				) {
					this.subalbums.splice(indexSubalbums, 1);
				}
			} else {
				// inside words
				for (let indexWordsLeft = lastIndex + 1; indexWordsLeft < searchWordsFromUserNormalizedAccordingToOptions.length; indexWordsLeft ++) {
					normalizedWords = util.normalizeAccordingToOptions(ithSubalbum.words);
					if (ithSubalbum.hasOwnProperty("tags") && env.options.search_tags_only)
						normalizedTags = util.normalizeAccordingToOptions(ithSubalbum.tags);
					if (
						! env.options.search_tags_only &&
						! normalizedWords.some(normalizedWord => normalizedWord.includes(searchWordsFromUserNormalizedAccordingToOptions[indexWordsLeft])) ||
						env.options.search_tags_only && (
							! ithSubalbum.hasOwnProperty("tags") ||
							! normalizedTags.some(normalizedWord => normalizedWord.includes(searchWordsFromUserNormalizedAccordingToOptions[indexWordsLeft]))
						)
					) {
						this.subalbums.splice(indexSubalbums, 1);
						break;
					}
				}
			}
		}
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
				resultsAlbumFinal.numsMediaInSubTree = resultsAlbumFinal.media.imagesAndVideosCount();
				resultsAlbumFinal.numsMedia = resultsAlbumFinal.media.imagesAndVideosCount();
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

	Album.prototype.getMediaIndex = function(mediaFolderCacheBase, mediaCacheBase) {
		// returns the index of the media identified by the arguments
		// returns null if no media matches

		var mediaIndex = -1;
		if (mediaCacheBase !== null) {
			mediaIndex = this.media.findIndex(
				function(thisMedia) {
					var matches =
						thisMedia.cacheBase === mediaCacheBase &&
						(mediaFolderCacheBase === null || thisMedia.foldersCacheBase === mediaFolderCacheBase);
					return matches;
				}
			);
			if (mediaIndex === -1) {
				$("#loading").stop().hide();

				if (this.hasVeiledProtectedContent()) {
				// if (this.hasProtectedContent()) {
					// the media not found could be a protected one, show the authentication dialog, it could be a protected media
					// if (this.hasVeiledProtectedContent())
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
		// if (this.isSearch() && mediaIndex === -1) {
		// 	if (! $("ul#right-menu").hasClass("expanded"))
		// 		util.openMenu();
		// 	util.focusSearchField();
		// }
		return mediaIndex;
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

	/* expose class globally */
	window.PhotoFloat = PhotoFloat;
}());
