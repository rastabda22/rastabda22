(function() {

	var util = new Utilities();

	/* constructor */
	function PhotoFloat() {
		PhotoFloat.albumCache = [];
		this.geotaggedPhotosFound = null;
		this.searchWordsFromJsonFile = [];
		this.searchAlbumCacheBaseFromJsonFile = [];

		PhotoFloat.searchAndSubalbumHash = '';
		PhotoFloat.searchWordsFromJsonFile = this.searchWordsFromJsonFile;
		PhotoFloat.searchAlbumCacheBaseFromJsonFile = this.searchAlbumCacheBaseFromJsonFile;

	}

	/* public member functions */
	PhotoFloat.addPositionsToSubalbums = function(thisAlbum) {
		var iSubalbum, iPosition, iPhoto, position, subalbumCacheKey;
		var positions = thisAlbum.positionsAndMediaInTree;
		if (thisAlbum.hasOwnProperty("subalbums")) {
			for (iSubalbum = 0; iSubalbum < thisAlbum.subalbums.length; ++ iSubalbum) {
				thisAlbum.subalbums[iSubalbum].positionsAndMediaInTree = [];
				for (iPosition = 0; iPosition < positions.length; ++ iPosition) {
					position = {};
					position.lat = positions[iPosition].lat;
					position.long = positions[iPosition].long;
					position.mediaNameList = [];
					for (iPhoto = 0; iPhoto < positions[iPosition].mediaNameList.length; ++ iPhoto) {
						// add the photos belonging to this subalbum
						if (positions[iPosition].mediaNameList[iPhoto].albumCacheBase.indexOf(thisAlbum.subalbums[iSubalbum].cacheBase) == 0) {
							position.mediaNameList.push(positions[iPosition].mediaNameList[iPhoto]);
						}
					}
					if (position.mediaNameList.length)
						thisAlbum.subalbums[iSubalbum].positionsAndMediaInTree.push(position);
				}

				// save in the cache
				subalbumCacheKey = thisAlbum.subalbums[iSubalbum].cacheBase + ".positions";
				PhotoFloat.albumCache[subalbumCacheKey] = thisAlbum.subalbums[iSubalbum].positionsAndMediaInTree;
			}
		}
	};

	PhotoFloat.getPositions = function(thisAlbum, callback, error) {
		var cacheFile = util.pathJoin([Options.server_cache_path, thisAlbum.cacheBase + ".positions.json"]);
		var ajaxOptions;
		// before getting the positions check whether it's in the cache
		var cacheKey = thisAlbum.cacheBase + ".positions";
		if (PhotoFloat.albumCache.hasOwnProperty(cacheKey)) {
			thisAlbum.positionsAndMediaInTree = PhotoFloat.albumCache[cacheKey];
			// we must add the corresponding positions to every subalbum too
			PhotoFloat.addPositionsToSubalbums(thisAlbum);
			callback(thisAlbum);
		} else {
			// get the file
			ajaxOptions = {
				type: "GET",
				dataType: "json",
				url: cacheFile,
				success: function(positions) {
					thisAlbum.positionsAndMediaInTree = positions;
					// we must add the corresponding positions to every subalbums
					PhotoFloat.addPositionsToSubalbums(thisAlbum);

					PhotoFloat.albumCache[cacheKey] = positions;

					callback(thisAlbum);
				}
			};
			if (typeof error !== "undefined" && error !== null) {
				ajaxOptions.error = function(jqXHR, textStatus, errorThrown) {
					error(jqXHR.status);
				};
			}
			$.ajax(ajaxOptions);
		}
	};

	PhotoFloat.getStopWords = function(callback, error) {
		if (! Options.search_inside_words && Options.use_stop_words) {
			var stopWordsFileName = 'stopwords.json';
			// before getting the file check whether it's in the cache
			if (PhotoFloat.albumCache.hasOwnProperty(stopWordsFileName)) {
				callback(PhotoFloat.albumCache[stopWordsFileName]);
			} else {
				// get the file
				var stopWordsFile = util.pathJoin([Options.server_cache_path, stopWordsFileName]);
				var ajaxOptions = {
					type: "GET",
					dataType: "json",
					url: stopWordsFile,
					success: function(stopWords) {
						PhotoFloat.albumCache[stopWordsFileName] = stopWords['stopWords'];
						callback(stopWords['stopWords']);
					}
				};
				if (typeof error !== "undefined" && error !== null) {
					ajaxOptions.error = function(jqXHR, textStatus, errorThrown) {
						error(jqXHR.status);
					};
				}
				$.ajax(ajaxOptions);
			}
		} else {
			// stop words aren't used, pass to callback a void list
			callback([]);
		}
	};

	PhotoFloat.prototype.getAlbum = function(thisAlbum, callback, error, thisIndexWords, thisIndexAlbums) {
		var cacheKey, ajaxOptions, self;

		if (typeof thisAlbum.media !== "undefined" && thisAlbum.media !== null) {
			callback(thisAlbum);
			return;
		}
		if (Object.prototype.toString.call(thisAlbum).slice(8, -1) === "String") {
			if (util.isSearchCacheBase(thisAlbum) && thisAlbum.indexOf('/') != -1)
				cacheKey = thisAlbum.substr(0, thisAlbum.indexOf('/'));
			else
				cacheKey = thisAlbum;
		} else
			cacheKey = thisAlbum.cacheBase;

		if (PhotoFloat.albumCache.hasOwnProperty(cacheKey)) {
			var executeCallback = function() {
				if (typeof thisIndexWords === "undefined" && typeof thisIndexAlbums === "undefined") {
					callback(PhotoFloat.albumCache[cacheKey]);
				} else {
					callback(PhotoFloat.albumCache[cacheKey], thisIndexWords, thisIndexAlbums);
				}
			};
			if (! PhotoFloat.albumCache[cacheKey].numPositionsInTree || PhotoFloat.albumCache[cacheKey].hasOwnProperty("positionsAndMediaInTree")) {
				executeCallback();
			} else {
				// the positions are missing, get them
				PhotoFloat.getPositions(
					thisAlbum,
					executeCallback,
					error
				);
			}
		} else {
			var cacheFile = util.pathJoin([Options.server_cache_path, cacheKey + ".json"]);
			self = this;
			ajaxOptions = {
				type: "GET",
				dataType: "json",
				url: cacheFile,
				success: function(theAlbum) {
					var albumGot = function() {
						var i;
						if (cacheKey == Options.by_search_string) {
							// root of search albums: build the word list
							for (i = 0; i < theAlbum.subalbums.length; ++i) {
								PhotoFloat.searchWordsFromJsonFile.push(theAlbum.subalbums[i].unicodeWords);
								PhotoFloat.searchAlbumCacheBaseFromJsonFile.push(theAlbum.subalbums[i].cacheBase);
							}
						} else if (! util.isSearchCacheBase(cacheKey)) {
							for (i = 0; i < theAlbum.subalbums.length; ++i)
								theAlbum.subalbums[i].parent = theAlbum;
							for (i = 0; i < theAlbum.media.length; ++i)
								theAlbum.media[i].parent = theAlbum;
						}

						PhotoFloat.albumCache[cacheKey] = theAlbum;

						if (typeof thisIndexWords === "undefined" && typeof thisIndexAlbums === "undefined")
							callback(theAlbum);
						else
							callback(theAlbum, thisIndexWords, thisIndexAlbums);
					};
					if (theAlbum.numPositionsInTree)
						PhotoFloat.getPositions(
							theAlbum,
							albumGot,
							error
						);
					else
						albumGot();
				}
			};
			if (typeof error !== "undefined" && error !== null) {
				ajaxOptions.error = function(jqXHR, textStatus, errorThrown) {
					error(jqXHR.status);
				};
			}
			$.ajax(ajaxOptions);
		}
	};

	PhotoFloat.prototype.pickRandomMedia = function(subalbum, container, callback, error) {
		var nextAlbum, self;
		self = this;
		nextAlbum = function(album) {
			var index = Math.floor(Math.random() * (album.numMediaInSubTree));
			if (index >= album.media.length) {
				index -= album.media.length;
				for (var i = 0; i < album.subalbums.length; i ++) {
					if (index >= album.subalbums[i].numMediaInSubTree)
						index -= album.subalbums[i].numMediaInSubTree;
					else
						break;
				}
				self.getAlbum(album.subalbums[i], nextAlbum, error);
			} else
				callback(album, album.media[index], container, subalbum);
		};
		if (typeof subalbum.media !== "undefined" && subalbum.media !== null)
			nextAlbum(subalbum);
		else
			this.getAlbum(subalbum, nextAlbum, error);
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
				util.isSearchCacheBase(albumHash) && (typeof savedSearchAlbumHash === "undefined" || savedSearchAlbumHash === null)
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

	PhotoFloat.prototype.addClickToByGpsButton = function(link) {
		var self;
		// this function returns true if the root album has the by gps subalbum
		if (this.geotaggedPhotosFound !== null) {
			if (this.geotaggedPhotosFound) {
				$("#by-gps-view").off("click");
				$("#by-gps-view").removeClass("hidden").addClass("active").on("click", function(ev) {
					$(".search-failed").hide();
					$("#album-view").removeClass("hidden");
					window.location.href = link;
					return false;
				});
			} else {
				$("#by-gps-view").addClass("hidden");
			}
		} else {
			self = this;
			this.getAlbum(
				// thisAlbum
				Options.folders_string,
				// callback
				function(foldersAlbum) {
					if (! foldersAlbum.numPoints) {
						$("#by-gps-view").addClass("hidden");
						self.geotaggedPhotosFound = false;
					} else {
						self.geotaggedPhotosFound = true;
						$("#by-gps-view").off("click");
						$("#by-gps-view").removeClass("hidden").addClass("active").on("click", function(ev) {
							$(".search-failed").hide();
							$("#album-view").removeClass("hidden");
							window.location.href = link;
							return false;
						});
					}
				},
				// error
				// execution arrives here if no gps json file has been found
				// (but gps json file must exist)
				function() {
					$("#by-gps-view").addClass("hidden");
					self.geotaggedPhotosFound = false;
				}
			);
		}
	};

	PhotoFloat.upHash = function(hash) {
		var resultHash;
		var array = PhotoFloat.decodeHash(hash);
		// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
		var albumHash = array[0];
		var mediaHash = array[1];
		var savedSearchSubAlbumHash = array[3];
		var savedSearchAlbumHash = array[4];

		if (mediaHash !== null) {
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
		} else {
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
				else if (albumHash == Options.by_date_string || albumHash == Options.by_gps_string)
					// go to folders root
					resultHash = Options.folders_string;
				else if (util.isSearchCacheBase(albumHash)) {
					// the return folder must be extracted from the album hash
					resultHash = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
				} else {
					// we must go up in the sub folders tree
					resultHash = albumHash.split(Options.cache_folder_separator).slice(0, -1).join(Options.cache_folder_separator);
				}
			}
		}

		return "#!/" + resultHash;
	};

	PhotoFloat.prototype.parseHash = function(hash, callback, error) {
		var self, albumHashToGet, albumHashes;
		var SearchWordsFromUser, SearchWordsFromUserNormalized, SearchWordsFromUserNormalizedAccordingToOptions;
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

		albumHashes = [];
		SearchWordsFromUser = [];
		SearchWordsFromUserNormalized = [];
		SearchWordsFromUserNormalizedAccordingToOptions = [];
		if (albumHash) {
			albumHash = decodeURI(albumHash);

			if ([Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(albumHash) !== -1)
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
					Options.search_inside_words = searchOptions.indexOf('i') > -1;
					Options.search_any_word = searchOptions.indexOf('n') > -1;
					Options.search_case_sensitive = searchOptions.indexOf('c') > -1;
					Options.search_accent_sensitive = searchOptions.indexOf('a') > -1;
					Options.search_current_album = searchOptions.indexOf('o') > -1;
					// Options.search_refine = searchOptions.indexOf('e') > -1;
				}

				Options.album_to_search_in = splittedAlbumHash.slice(2).join(Options.cache_folder_separator);

				if ([Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(Options.album_to_search_in) !== -1)
					$("ul#right-menu li#album-search").addClass("dimmed");

				// if (util.isSearchHash(location.hash) && Options.search_refine)
				// 	Options.album_to_search_in = albumHash;

				$("ul#right-menu #search-field").attr("value", wordsStringOriginal);
				wordsString = util.normalizeAccordingToOptions(wordsString);
				SearchWordsFromUser = wordsString.split('_');
				SearchWordsFromUserNormalizedAccordingToOptions = wordsStringNormalizedAccordingToOptions.split(' ');
				SearchWordsFromUserNormalized = wordsStringNormalized.split(' ');

				if (SearchWordsFromUser.length == 1)
					$("ul#right-menu li#any-word").addClass("dimmed");

				var searchResultsAlbumFinal = {};
				searchResultsAlbumFinal.positionsAndMediaInTree = [];
				searchResultsAlbumFinal.media = [];
				searchResultsAlbumFinal.subalbums = [];
				searchResultsAlbumFinal.numMediaInAlbum = 0;
				searchResultsAlbumFinal.numMediaInSubTree = 0;
				searchResultsAlbumFinal.cacheBase = albumHash;
				searchResultsAlbumFinal.parentCacheBase = Options.by_search_string;
				searchResultsAlbumFinal.path = searchResultsAlbumFinal.cacheBase.replace(Options.cache_folder_separator, "/");
				searchResultsAlbumFinal.physicalPath = searchResultsAlbumFinal.path;
				searchResultsAlbumFinal.searchInFolderCacheBase = mediaFolderHash;

				if (albumHash == Options.by_search_string) {
					util.noResults('#no-search-string');
					callback(searchResultsAlbumFinal, null, -1);
					return;
				}
			}
		}

		if (util.isSearchCacheBase(albumHash)) {
			albumHashToGet = albumHash;
		// same conditions as before????????????????
		} else if (util.isSearchCacheBase(albumHash)) {
			albumHashToGet = util.pathJoin([albumHash, mediaFolderHash]);
		} else {
			albumHashToGet = albumHash;
		}

		if (mediaHash)
			mediaHash = decodeURI(mediaHash);
		if (mediaFolderHash)
			mediaFolderHash = decodeURI(mediaFolderHash);
		if (PhotoFloat.searchAndSubalbumHash)
			PhotoFloat.searchAndSubalbumHash = decodeURI(PhotoFloat.searchAndSubalbumHash);

		if (PhotoFloat.albumCache.hasOwnProperty(albumHashToGet)) {
			if (! PhotoFloat.albumCache[albumHashToGet].subalbums.length && ! PhotoFloat.albumCache[albumHashToGet].media.length)
				util.noResults();
			PhotoFloat.selectMedia(PhotoFloat.albumCache[albumHashToGet], mediaFolderHash, mediaHash, callback);
		} else if (! util.isSearchCacheBase(albumHash) || SearchWordsFromUser.length === 0) {
			this.getAlbum(
				albumHashToGet,
				function(theAlbum) {
					PhotoFloat.selectMedia(theAlbum, mediaFolderHash, mediaHash, callback);
				},
				error
			);
		} else {
			// it's a search!
			self = this;
			var removedStopWords = [];

			buildSearchResult = function() {
				searchResultsAlbumFinal.removedStopWords = removedStopWords;
				// has any word remained after stop words have been removed?
				if (SearchWordsFromUser.length == 0) {
					util.noResults('#no-search-string-after-stopwords-removed');
					callback(searchResultsAlbumFinal, null, -1);
					return;
				}

				// get the search root album before getting the search words ones
				self.getAlbum(
					Options.by_search_string,
					// success:
					function(bySearchRootAlbum) {
						var lastIndex, i, j, wordHashes, numSearchAlbumsReady = 0, numSubAlbumsToGet = 0, normalizedWords;
						var searchResultsMedia = [];
						var searchResultsSubalbums = [];
						searchResultsAlbumFinal.ancestorsCacheBase = bySearchRootAlbum.ancestorsCacheBase.slice();
						searchResultsAlbumFinal.ancestorsCacheBase.push(wordsWithOptionsString);
						if (! Options.search_any_word)
							// when serching all the words, getting the first album is enough, media that do not match the other words will be escluded later
							lastIndex = 0;
						else
							lastIndex = SearchWordsFromUser.length - 1;
						if (Options.search_inside_words) {
							// we must determine the albums that could match the words given by the user, word by word
							for (i = 0; i <= lastIndex; i ++) {
								wordHashes = [];
								for (j = 0; j < PhotoFloat.searchWordsFromJsonFile.length; j ++) {
									if (PhotoFloat.searchWordsFromJsonFile[j].some(function(word) {
										return word.indexOf(SearchWordsFromUserNormalized[i]) > -1;
									})) {
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
								if (PhotoFloat.searchWordsFromJsonFile.some(function(words, index, searchWords) {
									if (words.indexOf(SearchWordsFromUserNormalized[i]) > -1) {
										albumHashes.push([PhotoFloat.searchAlbumCacheBaseFromJsonFile[index]]);
										return true;
									}
									return false;
								})) {
									numSubAlbumsToGet ++;
								} else {
									albumHashes.push([]);
								}
						}

						if (numSubAlbumsToGet === 0) {
							util.noResults();
							callback(searchResultsAlbumFinal, null, -1);
						} else if (numSubAlbumsToGet > Options.max_search_album_number) {
							util.noResults('#search-too-wide');
							callback(searchResultsAlbumFinal, null, -1);
						} else {
							$("#album-view").removeClass("hidden");
							$(".search-failed").hide();
							for (indexWords = 0; indexWords <= lastIndex; indexWords ++) {
								searchResultsMedia[indexWords] = [];
								searchResultsSubalbums[indexWords] = [];
								for (indexAlbums = 0; indexAlbums < albumHashes[indexWords].length; indexAlbums ++) {
									// getAlbum is called here with 2 more parameters, indexAlbums and indexWords, in order to know their ValueError
									// if they are not passed as arguments, the success function will see their values updates (getAlbum is an asyncronous function)
									self.getAlbum(
										albumHashes[indexWords][indexAlbums],
										// success:
										function(theAlbum, thisIndexWords, thisIndexAlbums) {
											var matchingMedia = [], matchingSubalbums = [], match, indexMedia, indexSubalbums, indexWordsLeft, resultAlbum, indexWords1;

											resultAlbum = util.cloneObject(theAlbum);
											// media in the album still has to be filtered according to search criteria
											if (! Options.search_inside_words) {
												// whole word
												for (indexMedia = 0; indexMedia < theAlbum.media.length; indexMedia ++) {
													if (
														util.normalizeAccordingToOptions(theAlbum.media[indexMedia].words).indexOf(SearchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]) > -1 && (
															! Options.search_current_album ||
															[Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(Options.album_to_search_in) !== -1 || (
																// check whether the media is inside the current album tree
																theAlbum.media[indexMedia].foldersCacheBase.indexOf(Options.album_to_search_in) === 0 ||
																theAlbum.media[indexMedia].hasOwnProperty("dayAlbumCacheBase") && theAlbum.media[indexMedia].dayAlbumCacheBase.indexOf(Options.album_to_search_in) === 0 ||
																theAlbum.media[indexMedia].hasOwnProperty("gpsAlbumCacheBase") && theAlbum.media[indexMedia].gpsAlbumCacheBase.indexOf(Options.album_to_search_in) === 0
															)
														)
													)
														matchingMedia.push(theAlbum.media[indexMedia]);
												}
												for (indexSubalbums = 0; indexSubalbums < theAlbum.subalbums.length; indexSubalbums ++) {
													if (
														util.normalizeAccordingToOptions(theAlbum.subalbums[indexSubalbums].words).indexOf(SearchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]) > -1 &&
														(
															! Options.search_current_album ||
															[Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(Options.album_to_search_in) !== -1 || (
																// check whether the media is inside the current album tree
																theAlbum.subalbums[indexSubalbums].cacheBase.indexOf(Options.album_to_search_in) === 0 &&
																theAlbum.subalbums[indexSubalbums].cacheBase != Options.album_to_search_in
															)
														)
													)
														matchingSubalbums.push(theAlbum.subalbums[indexSubalbums]);
												}
											} else {
												// inside words
												for (indexMedia = 0; indexMedia < theAlbum.media.length; indexMedia ++) {
													normalizedWords = util.normalizeAccordingToOptions(theAlbum.media[indexMedia].words);
													if (
														normalizedWords.some(
															function(element) {
																return element.indexOf(SearchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]) > -1;
															}
														) && (
															! Options.search_current_album ||
															[Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(Options.album_to_search_in) !== -1 || (
																// check whether the media is inside the current album tree
																theAlbum.media[indexMedia].foldersCacheBase.indexOf(Options.album_to_search_in) === 0 ||
																theAlbum.media[indexMedia].hasOwnProperty("dayAlbumCacheBase") && theAlbum.media[indexMedia].dayAlbumCacheBase.indexOf(Options.album_to_search_in) === 0 ||
																theAlbum.media[indexMedia].hasOwnProperty("gpsAlbumCacheBase") && theAlbum.media[indexMedia].gpsAlbumCacheBase.indexOf(Options.album_to_search_in) === 0
															)
														)
													)
														matchingMedia.push(theAlbum.media[indexMedia]);
												}
												for (indexSubalbums = 0; indexSubalbums < theAlbum.subalbums.length; indexSubalbums ++) {
													normalizedWords = util.normalizeAccordingToOptions(theAlbum.subalbums[indexSubalbums].words);
													if (
														normalizedWords.some(
															function(element) {
																return element.indexOf(SearchWordsFromUserNormalizedAccordingToOptions[thisIndexWords]) > -1;
															}
														) && (
															! Options.search_current_album ||
															[Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(Options.album_to_search_in) !== -1 || (
																// check whether the media is inside the current album tree
																theAlbum.subalbums[indexSubalbums].cacheBase.indexOf(Options.album_to_search_in) === 0 &&
																theAlbum.subalbums[indexSubalbums].cacheBase != Options.album_to_search_in
															)
														)
													)
														matchingSubalbums.push(theAlbum.subalbums[indexSubalbums]);
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

												if (lastIndex != SearchWordsFromUser.length - 1) {
													// we still have to filter out the media that do not match the words after the first
													// we are in all words search mode
													matchingMedia = [];
													for (indexMedia = 0; indexMedia < searchResultsAlbumFinal.media.length; indexMedia ++) {
														match = true;
														if (! Options.search_inside_words) {
															// whole word
															normalizedWords = util.normalizeAccordingToOptions(searchResultsAlbumFinal.media[indexMedia].words);
															if (SearchWordsFromUserNormalizedAccordingToOptions.some(function(element, index) {
																return index > lastIndex && normalizedWords.indexOf(element) == -1;
															}))
																match = false;
														} else {
															// inside words
															for (indexWordsLeft = lastIndex + 1; indexWordsLeft < SearchWordsFromUser.length; indexWordsLeft ++) {
																normalizedWords = util.normalizeAccordingToOptions(searchResultsAlbumFinal.media[indexMedia].words);
																if (! normalizedWords.some(function(element) {
																	return element.indexOf(SearchWordsFromUserNormalizedAccordingToOptions[indexWordsLeft]) > -1;
																})) {
																	match = false;
																	break;
																}
															}
														}
														if (match && matchingMedia.indexOf(searchResultsAlbumFinal.media[indexMedia]) == -1)
															matchingMedia.push(searchResultsAlbumFinal.media[indexMedia]);
													}
													searchResultsAlbumFinal.media = matchingMedia;

													// search albums need to conform to default behaviour of albums: json files have subalbums and media sorted by date not reversed
													searchResultsAlbumFinal.media = util.sortByDate(searchResultsAlbumFinal.media);

													matchingSubalbums = [];
													for (indexSubalbums = 0; indexSubalbums < searchResultsAlbumFinal.subalbums.length; indexSubalbums ++) {
														match = true;
														if (! Options.search_inside_words) {
															// whole word
															normalizedWords = util.normalizeAccordingToOptions(searchResultsAlbumFinal.subalbums[indexSubalbums].words);
															if (SearchWordsFromUserNormalizedAccordingToOptions.some(function(element, index) {
																return index > lastIndex && normalizedWords.indexOf(element) == -1;
															}))
																match = false;
														} else {
															// inside words
															for (indexWordsLeft = lastIndex + 1; indexWordsLeft < SearchWordsFromUser.length; indexWordsLeft ++) {
																normalizedWords = util.normalizeAccordingToOptions(searchResultsAlbumFinal.subalbums[indexSubalbums].words);
																if (! normalizedWords.some(function(element) {
																	return element.indexOf(SearchWordsFromUserNormalizedAccordingToOptions[indexWordsLeft]) > -1;
																})) {
																	match = false;
																	break;
																}
															}
														}
														if (match && matchingSubalbums.indexOf(searchResultsAlbumFinal.subalbums[indexSubalbums]) == -1)
															matchingSubalbums.push(searchResultsAlbumFinal.subalbums[indexSubalbums]);
													}

													searchResultsAlbumFinal.subalbums = matchingSubalbums;

													// search albums need to conform to default behaviour of albums: json files have subalbums and media sorted by date not reversed
													searchResultsAlbumFinal.subalbums = util.sortByDate(searchResultsAlbumFinal.subalbums);
												}
												if (searchResultsAlbumFinal.media.length === 0 && searchResultsAlbumFinal.subalbums.length === 0) {
													util.noResults();
												} else {
													$("#album-view").removeClass("hidden");
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

												searchResultsAlbumFinal.numMediaInAlbum = searchResultsAlbumFinal.media.length;

												var numSubalbumsProcessed = 0;
												searchResultsAlbumFinal.numMediaInSubTree = searchResultsAlbumFinal.numMediaInAlbum;
												if (searchResultsAlbumFinal.subalbums.length) {
													for (var indexSubalbums = 0; indexSubalbums < searchResultsAlbumFinal.subalbums.length; indexSubalbums ++) {
														// update the media count
														searchResultsAlbumFinal.numMediaInSubTree += searchResultsAlbumFinal.subalbums[indexSubalbums].numMediaInSubTree;
														// add the points from the subalbums

														// the subalbum could still have no positionsAndMediaInTree array, get it
														if (! searchResultsAlbumFinal.subalbums[indexSubalbums].hasOwnProperty("positionsAndMediaInTree"))
															searchResultsAlbumFinal.subalbums[indexSubalbums].positionsAndMediaInTree = [];

														PhotoFloat.getPositions(
															searchResultsAlbumFinal.subalbums[indexSubalbums],
															function(subalbum) {
																searchResultsAlbumFinal.positionsAndMediaInTree = util.mergePoints(
																				searchResultsAlbumFinal.positionsAndMediaInTree,
																				subalbum.positionsAndMediaInTree
																);
																numSubalbumsProcessed ++;
																if (numSubalbumsProcessed >= searchResultsAlbumFinal.subalbums.length) {
																	// now all the subalbums have the positionsAndMediaInTree array, we can go on

																	PhotoFloat.endPreparingSearchAlbumAndKeepOn(searchResultsAlbumFinal, mediaHash, callback);
																}
															},
															util.die
														);
													}
												} else {
													// no subalbums, call the exit function
													PhotoFloat.endPreparingSearchAlbumAndKeepOn(searchResultsAlbumFinal, mediaHash, callback);
												}
											}
										},
										error,
										indexWords,
										indexAlbums
									);
								}
							}
						}
					},
					error
				);
			};

			// possibly we need the stop words, because if some searched word is a stop word it must be removed from the search
			PhotoFloat.getStopWords(
				function(stopWords) {
					// remove the stop words from the search words lists

					var SearchWordsFromUserWithoutStopWords = [];
					var SearchWordsFromUserWithoutStopWordsNormalized = [];
					var SearchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions = [];
					for (var i = 0; i < SearchWordsFromUser.length; i ++) {
						if (
							stopWords.every(
								function(word) {
									return word !== SearchWordsFromUserNormalized[i];
								}
							)
						) {
							SearchWordsFromUserWithoutStopWords.push(SearchWordsFromUser[i]);
							SearchWordsFromUserWithoutStopWordsNormalized.push(SearchWordsFromUserNormalized[i]);
							SearchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions.push(SearchWordsFromUserNormalizedAccordingToOptions[i]);
						} else {
							removedStopWords.push(SearchWordsFromUser[i]);
						}
					}

					SearchWordsFromUser = SearchWordsFromUserWithoutStopWords;
					SearchWordsFromUserNormalized = SearchWordsFromUserWithoutStopWordsNormalized;
					SearchWordsFromUserNormalizedAccordingToOptions = SearchWordsFromUserWithoutStopWordsNormalizedAccordingToOptions;

					buildSearchResult();
				},
				util.die
			);
		}
	};

	PhotoFloat.endPreparingSearchAlbumAndKeepOn = function(searchResultsAlbumFinal, mediaHash, callback) {
		// add the point count
		searchResultsAlbumFinal.numPositionsInTree = searchResultsAlbumFinal.positionsAndMediaInTree.length;
		// save in the cash array
		if (! PhotoFloat.albumCache.hasOwnProperty(searchResultsAlbumFinal.cacheBase)) {
			PhotoFloat.albumCache[searchResultsAlbumFinal.cacheBase] = searchResultsAlbumFinal;
			PhotoFloat.albumCache[searchResultsAlbumFinal.cacheBase + ".positions"] = searchResultsAlbumFinal.positionsAndMediaInTree;
		}

		PhotoFloat.selectMedia(searchResultsAlbumFinal, null, mediaHash, callback);

	};

	PhotoFloat.selectMedia = function(theAlbum, mediaFolderHash, mediaHash, callback) {
		var i = -1;
		var media = null;
		if (mediaHash !== null) {
			for (i = 0; i < theAlbum.media.length; ++i) {
				if (
					theAlbum.media[i].cacheBase === mediaHash &&
					(mediaFolderHash === null || theAlbum.media[i].foldersCacheBase === mediaFolderHash)
				) {
					media = theAlbum.media[i];
					break;
				}
			}
			if (i >= theAlbum.media.length) {
				$("#album-view").fadeOut(200);
				$("#media-view").fadeOut(200);
				$("#album-view").stop().fadeIn(3500);
				$("#error-text-image").stop().fadeIn(200);
				$("#error-text-image, #error-overlay, #auth-text").fadeOut(2500);
				window.location.href = "#!" + theAlbum.cacheBase;
				i = -1;
			}
		}
		callback(theAlbum, media, i);
		if (util.isSearchCacheBase(theAlbum.cacheBase) && (media === null && ! util.isAlbumWithOneMedia(theAlbum)))
			$("ul#right-menu").addClass("expand");

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

	PhotoFloat.prototype.authenticate = function(password, result) {
		var ajaxOptions = {
			type: "GET",
			dataType: "text",
			url: "auth?username=photos&password=" + password,
			success: function() {
				result(true);
			},
			error: function() {
				result(false);
			}
		};
		$.ajax(ajaxOptions);
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
	PhotoFloat.prototype.cacheBase = PhotoFloat.cacheBase;
	PhotoFloat.prototype.mediaHash = PhotoFloat.mediaHash;
	PhotoFloat.prototype.encodeHash = PhotoFloat.encodeHash;
	PhotoFloat.prototype.cleanHash = PhotoFloat.cleanHash;
	PhotoFloat.prototype.decodeHash = PhotoFloat.decodeHash;
	PhotoFloat.prototype.upHash = PhotoFloat.upHash;
	PhotoFloat.prototype.hashCode = PhotoFloat.hashCode;
	/* expose class globally */
	window.PhotoFloat = PhotoFloat;
	PhotoFloat.searchAndSubalbumHash = this.searchAndSubalbumHash;
}());
