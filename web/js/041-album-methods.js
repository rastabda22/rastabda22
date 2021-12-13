(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var mapF = new MapFunctions();
	var menuF = new MenuFunctions();
	var tF = new TopFunctions();

  Album.prototype.generatePositionsAndMedia = function() {
		this.positionsAndMediaInMedia = new PositionsAndMedia([]);
		var self = this;
		this.media.forEach(
			function(singleMedia) {
				if (singleMedia.hasGpsData())
					self.positionsAndMediaInMedia.addPositionAndMedia(singleMedia.generatePositionAndMedia(self));
			}
		);
	};

	Album.prototype.isEmpty = function() {
		return this.empty !== undefined && this.empty;
	};

	Album.prototype.hasGpsData = function() {
		return this.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal() === 0;
	};

	Album.prototype.toAlbum = function(error, {getMedia = false, getPositions = false}) {
		var self = this;
		return new Promise(
			function(resolve_convertIntoAlbum) {
				let promise = phFl.getAlbum(self.cacheBase, error, {getMedia: getMedia, getPositions: getPositions});
				promise.then(
					function(convertedSubalbum) {
						resolve_convertIntoAlbum(convertedSubalbum);
					}
				);
			}
		);
	};

	Album.prototype.clone = function(putIntoCache = false) {
		return new Album(util.cloneObject(this), putIntoCache);
	};

	Album.prototype.toSubalbum = function() {
		var subalbumProperties = [
			"cacheBase",
			"date",
			"name",
			"nonGeotagged",
			"numPositionsInTree",
			"numsMedia",
			"numsMediaInSubTree",
			"numsProtectedMediaInSubTree",
			"path",
			"randomMedia",
			"captionsForSelection",
			"captionForSelectionSorting",
			"captionsForSearch",
			"captionForSearchSorting",
			"sizesOfAlbum",
			"sizesOfSubTree",
			"unicodeWords",
			"words",
			"tags"
		];
		var clonedAlbum = this.clone();
		Object.keys(this).forEach(
			function(key) {
				if (subalbumProperties.indexOf(key) === -1) {
					delete clonedAlbum[key];
				}
			}
		);
		return new Subalbum(clonedAlbum);
	};

	Album.prototype.toJson = function() {
		var albumProperties = [
			"albumNameSort",
			"albumReverseSort",
			"ancestorsCacheBase",
			"ancestorsNames",
			"ancestorsTitles",
			"cacheBase",
			"cacheSubdir",
			"compositeImageSize",
			"date",
			"includedFilesByCodesSimpleCombination",
			"description",
			"jsonVersion",
			"media",
			"mediaNameSort",
			"mediaReverseSort",
			"name",
			"nonGeotagged",
			"numPositionsInMedia",
			"numPositionsInSubalbums",
			"numPositionsInTree",
			"numsMedia",
			"numsMediaInSubTree",
			"numsProtectedMediaInSubTree",
			"path",
			"physicalPath",
			"positionsAndMediaInMedia",
			"positionsAndMediaInSubalbums",
			"positionsAndMediaInTree",
			"captionsForSelection",
			"captionForSelectionSorting",
			"captionsForSearch",
			"captionForSearchSorting",
			"sizesOfAlbum",
			"sizesOfSubTree",
			"subalbums",
			"tags",
			"title"
		];
		var clonedAlbum = this.clone();
		Object.keys(this).forEach(
			function(key) {
				if (albumProperties.indexOf(key) === -1) {
					delete clonedAlbum[key];
				}
			}
		);
		clonedAlbum.subalbums.forEach(
			function(subalbum, index) {
				clonedAlbum.subalbums[index] = subalbum.toSubalbum();
			}
		);
		clonedAlbum.media.forEach(
			function(singleMedia, index) {
				clonedAlbum.media[index] = singleMedia.cloneAndDeleteParent();
			}
		);
		return JSON.stringify(clonedAlbum);
	};

	Album.prototype.removeUnnecessaryPropertiesAndAddParentToMedia = function() {
		// remove unnecessary properties from album
		var unnecessaryProperties = ['albumIniMTime', 'passwordMarkerMTime'];
		for (let j = 0; j < unnecessaryProperties.length; j ++)
			if (this.hasOwnProperty(unnecessaryProperties[j]))
				delete this[unnecessaryProperties[j]];
		if (this.hasOwnProperty("media"))
			this.media.removeUnnecessaryPropertiesAndAddParent(this);
	};

	Album.prototype.hasPositionsInMedia = function() {
		var result =
			// this.numPositionsInTree &&
			this.media.length &&
			this.media.some(singleMedia => singleMedia.hasGpsData());
		return result;
	};

	Album.prototype.hasValidPositionsAndMediaInMediaAndSubalbums = function() {
		return this.hasOwnProperty("positionsAndMediaInMedia");
	};

	Album.prototype.invalidatePositionsAndMediaInAlbumAndSubalbums = function() {
		if (this.hasOwnProperty("positionsAndMediaInMedia"))
			delete this.positionsAndMediaInMedia;
	};

	Album.prototype.isEqual = function(otherAlbum) {
		return otherAlbum !== null && this.cacheBase === otherAlbum.cacheBase;
	};

  Album.prototype.initializeSearchAlbumEnd = function() {
		var rootSearchAlbum = env.cache.getAlbum(env.options.by_search_string);
		if (! rootSearchAlbum) {
			util.initializeSearchRootAlbum();
			rootSearchAlbum = env.cache.getAlbum(env.options.by_search_string);
		}

		rootSearchAlbum.numsMediaInSubTree.sum(this.numsMediaInSubTree);
		// rootSearchAlbum.subalbums.push(newSearchAlbum);
		if (rootSearchAlbum.hasOwnProperty("positionsAndMediaInTree") && this.hasOwnProperty("positionsAndMediaInTree")) {
			rootSearchAlbum.positionsAndMediaInTree.mergePositionsAndMedia(this.positionsAndMediaInTree);
		}
		rootSearchAlbum.numPositionsInTree += this.numPositionsInTree;

		this.ancestorsCacheBase = rootSearchAlbum.ancestorsCacheBase.slice();
		this.ancestorsCacheBase.push(this.cacheBase);
	};

  Album.prototype.guessedPasswordCodes = function() {
		return util.arrayIntersect(this.passwordCodes(), env.guessedPasswordCodes);
	};

	Album.prototype.passwordCodes = function() {
		var self;
		if (this.isSearch())
			self = env.cache.getAlbum(env.options.by_search_string);
		else
			self = this;

		var codes = [];
		if (self.hasOwnProperty("numsProtectedMediaInSubTree")) {
			Object.keys(self.numsProtectedMediaInSubTree).forEach(
				function(codesComplexCombination) {
					if (codesComplexCombination === ",")
						return;
					let combinations = codesComplexCombination.replace(',', '-').split('-');
					var indexOfVoidString = combinations.indexOf("");
					if (indexOfVoidString !== -1)
						combinations.splice(indexOfVoidString, 1);

					combinations.forEach(
						function(combination) {
							var codesFromCombination = combination.split('-');
							if (typeof codesList === "string")
								codesFromCombination = [codesFromCombination];
							codesFromCombination.forEach(
								function(code) {
									if (! codes.includes(code))
										codes.push(code);
								}
							);
						}
					);
				}
			);
		}
		return codes;
	};

	Album.prototype.guessedCodesSimpleCombinations = function() {
		var guessed = [];
		this.codesSimpleCombinations().forEach(
			codesSimpleCombination => {
				var albumCombination = codesSimpleCombination.split(',')[0];
				var mediaCombination = codesSimpleCombination.split(',')[1];
				if (
					(albumCombination === "" || env.guessedPasswordCodes.indexOf(albumCombination) !== -1) &&
					(mediaCombination === "" || env.guessedPasswordCodes.indexOf(mediaCombination) !== -1)
				)
					guessed.push(codesSimpleCombination);
			}
		);
		return guessed;
	};

	Album.prototype.codesSimpleCombinations = function() {
		var self;
		if (this.isSearch())
			self = env.cache.getAlbum(env.options.by_search_string);
		else
			self = this;

		var codesSimpleCombinations = [];
		Object.keys(self.numsProtectedMediaInSubTree).forEach(
			function(codesComplexCombination) {
				if (codesComplexCombination === ",")
					return;
				var albumCombinations = codesComplexCombination.split(',')[0].split('-');
				if (albumCombinations.length && typeof albumCombinations === "string")
					albumCombinations = [albumCombinations];
				var mediaCombinations = codesComplexCombination.split(',')[1].split('-');
				if (mediaCombinations.length && typeof mediaCombinations === "string")
					mediaCombinations = [mediaCombinations];
				if (albumCombinations.length) {
					albumCombinations.forEach(
						albumCode => {
							var combination = albumCode + ',';
							if (mediaCombinations.length) {
								mediaCombinations.forEach(
									mediaCode => {
										combination = albumCode + ',' + mediaCode;
										if (codesSimpleCombinations.indexOf(combination) === -1)
											codesSimpleCombinations.push(combination);
									}
								);
							} else {
								if (codesSimpleCombinations.indexOf(combination) === -1)
									codesSimpleCombinations.push(combination);
							}
						}
					);
				} else {
					mediaCombinations.forEach(
						mediaCode => {
							var combination = ',' + mediaCode;
							if (codesSimpleCombinations.indexOf(combination) === -1)
								codesSimpleCombinations.push(combination);
						}
					);
				}
			}
		);
		return codesSimpleCombinations;
	};

  Album.prototype.recursivelySelectMedia = function() {
		var self = this;
		return new Promise(
			function (resolve_promise) {
				self.addAllMediaToSelection();
				let promises = [];
				var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
				for (let i = 0; i < self.subalbums.length; i ++) {
					let iSubalbum = i;
					let ithSubalbum = self.subalbums[iSubalbum];
					if (onlyShowNonGeotaggedContent && ithSubalbum.hasGpsData())
						continue;
					let ithPromise = new Promise(
						function(resolve_ithPromise) {
							let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: false});
							convertSubalbumPromise.then(
								function(ithAlbum) {
									self.subalbums[iSubalbum] = ithAlbum;
									let promise = self.subalbums[iSubalbum].recursivelySelectMedia();
									promise.then(
										function() {
											resolve_ithPromise();
										}
									);
								}
							);
						}
					);
					promises.push(ithPromise);
				}
				Promise.all(promises).then(
					function() {
						resolve_promise();
					}
				);
			}
		);
	};

	Album.prototype.recursivelyRemoveMedia = function() {
		var self = this;
		return new Promise(
			function (resolve_promise) {
				self.removeAllMediaFromSelection();
				let promises = [];
				var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
				for (let i = 0; i < self.subalbums.length; i ++) {
					let iSubalbum = i;
					let ithSubalbum = self.subalbums[iSubalbum];
					if (onlyShowNonGeotaggedContent && ithSubalbum.hasGpsData())
						continue;
					let ithPromise = new Promise(
						function(resolve_ithPromise) {
							let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: false});
							convertSubalbumPromise.then(
								function(ithAlbum) {
									self.subalbums[iSubalbum] = ithAlbum;
									let promise = self.subalbums[iSubalbum].recursivelyRemoveMedia();
									promise.then(
										function() {
											resolve_ithPromise();
										}
									);
								}
							);
						}
					);
					promises.push(ithPromise);
				}
				Promise.all(promises).then(
					function() {
						resolve_promise();
					}
				);
			}
		);
	};

	Album.prototype.recursivelyAllMediaAreSelected = function() {
		var self = this;
		return new Promise(
			function (resolve_promise, reject_promise) {
				if (! self.everyMediaIsSelected()) {
					reject_promise();
				} else {
					let promises = [];
					var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
					for (let i = 0; i < self.subalbums.length; i ++) {
						let iSubalbum = i;
						let ithSubalbum = self.subalbums[iSubalbum];
						if (onlyShowNonGeotaggedContent && ithSubalbum.hasGpsData())
							continue;
						let ithPromise = new Promise(
							function(resolve_ithPromise, reject_ithPromise) {
								let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: false});
								convertSubalbumPromise.then(
									function(ithAlbum) {
										self.subalbums[iSubalbum] = ithAlbum;
										let promise = self.subalbums[iSubalbum].recursivelyAllMediaAreSelected();
										promise.then(
											function() {
												resolve_ithPromise();
											},
											function() {
												reject_ithPromise();
											}
										);
									}
								);
							}
						);
						promises.push(ithPromise);
					}
					Promise.all(promises).then(
						function() {
							resolve_promise(true);
						},
						function() {
							reject_promise(false);
						}
					);
				}
			}
		);
	};

  Album.prototype.sortByPath = function() {
		if (this.subalbums.length) {
			if (this.isSelection()) {
				util.sortBy(this.subalbums, ['captionForSelectionSorting']);
				// this.subalbums = util.sortBy(this.subalbums, ['altName', 'name', 'path']);
			} else if (this.isSearch()) {
				util.sortBy(this.subalbums, ['captionForSelectionSorting']);
				// this.subalbums = util.sortBy(this.subalbums, ['altName', 'name', 'path']);
			} else if (this.isByGps()) {
				if (this.subalbums[0].hasOwnProperty('altName'))
					util.sortBy(this.subalbums, ['altName']);
				else
					util.sortBy(this.subalbums, ['name']);
			} else {
				util.sortBy(this.subalbums, ['path']);
			}
		}
	};

  Album.prototype.isAnyRoot = function() {
		return util.isAnyRootCacheBase(this.cacheBase);
	};

  Album.prototype.isFolder = function() {
		return util.isFolderCacheBase(this.cacheBase);
	};

	Album.prototype.isByDate = function() {
		return util.isByDateCacheBase(this.cacheBase);
	};

	Album.prototype.isByGps = function() {
		return util.isByGpsCacheBase(this.cacheBase);
	};

	Album.prototype.isSearch = function() {
		return util.isSearchCacheBase(this.cacheBase);
	};

	Album.prototype.isSelection = function() {
		return util.isSelectionCacheBase(this.cacheBase);
	};

	Album.prototype.isMap = function() {
		return util.isMapCacheBase(this.cacheBase);
	};

	Album.prototype.isTransversal =  function() {
		return this.isByDate() || this.isByGps();
	};

	Album.prototype.isVirtual =  function() {
		return this.isSelection() || this.isMap();
	};

	Album.prototype.isCollection =  function() {
		return this.isSearch() || this.isVirtual();
	};

	Album.prototype.isGenerated =  function() {
		return this.isTransversal() || this.isCollection();
	};

  Album.prototype.noSubalbumIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			return true;
		} else {
			return ! this.subalbums.filter(subalbum => ! util.onlyShowNonGeotaggedContent() || ! subalbum.hasGpsData()).some(subalbum => subalbum.isSelected());
		}
	};

	Album.prototype.someSubalbumIsSelected = function() {
		return ! this.noSubalbumIsSelected();
	};

	Album.prototype.noMediaIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			return true;
		} else {
			return ! this.media.filter(singleMedia => ! util.onlyShowNonGeotaggedContent() || ! singleMedia.hasGpsData()).some(singleMedia => singleMedia.isSelected());
		}
	};

	Album.prototype.someMediaIsSelected = function() {
		return ! this.noMediaIsSelected();
	};

	Album.prototype.everyMediaIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			util.initializeSelectionAlbum();
			return false;
		} else {
			return this.media.filter(singleMedia => ! util.onlyShowNonGeotaggedContent() || ! singleMedia.hasGpsData()).every(singleMedia => singleMedia.isSelected());
		}
	};

	Album.prototype.everySubalbumIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			util.initializeSelectionAlbum();
			return false;
		} else {
			let onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
			return this.subalbums.filter(subalbum => ! util.onlyShowNonGeotaggedContent() || ! subalbum.hasGpsData()).every(subalbum => subalbum.isSelected());
		}
	};

	Album.prototype.isSelected = function() {
		return util.albumIsSelected(this);
	};

  Album.prototype.addAllMediaToSelection = function() {
		var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
		for (let indexMedia = this.media.length - 1; indexMedia >= 0; indexMedia --) {
			let ithMedia = this.media[indexMedia];
			if (onlyShowNonGeotaggedContent && ithMedia.hasGpsData())
				continue;
			var firstPartOfSelector = "media-select-box-";
			if (util.isPopup())
				firstPartOfSelector = "map-" + firstPartOfSelector;
			if (this.isCollection()) {
				ithMedia.addToSelection(null, "#" + firstPartOfSelector + indexMedia);
			} else {
				ithMedia.addToSelection(this, "#" + firstPartOfSelector + indexMedia);
			}
		}
	};

	Album.prototype.removeAllMediaFromSelection = function() {
		var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
		for (let indexMedia = this.media.length - 1; indexMedia >= 0; indexMedia --) {
			let ithMedia = this.media[indexMedia];
			if (onlyShowNonGeotaggedContent && ithMedia.hasGpsData())
				continue;
			var firstPartOfSelector = "media-select-box-";
			if (util.isPopup())
				firstPartOfSelector = "map-" + firstPartOfSelector;
			ithMedia.removeFromSelection("#" + firstPartOfSelector + indexMedia);
		}
	};

	Album.prototype.addAllSubalbumsToSelection = function() {
		var self = this;
		return new Promise(
			function(resolve_addAllSubalbums) {
				var subalbumsPromises = [];
				var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
				for (let indexSubalbum = self.subalbums.length - 1; indexSubalbum >= 0; indexSubalbum --) {
					if (onlyShowNonGeotaggedContent && self.subalbums[indexSubalbum].hasGpsData())
						continue;
					let id = phFl.convertCacheBaseToId(self.subalbums[indexSubalbum].cacheBase);
					let addSubalbumPromise = self.addSubalbumToSelection(indexSubalbum, "#subalbum-select-box-" + id);
					subalbumsPromises.push(addSubalbumPromise);
				}
				Promise.all(subalbumsPromises).then(
					function() {
						resolve_addAllSubalbums();
					}
				);
			}
		);
	};

	Album.prototype.removeAllSubalbumsFromSelection = function() {
		var self = this;
		return new Promise(
			function(resolve_removeAllSubalbums) {
				if (self.subalbums !== undefined) {
					let subalbumsPromises = [];
					var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
					for (let indexSubalbum = self.subalbums.length - 1; indexSubalbum >= 0; indexSubalbum --) {
						if (onlyShowNonGeotaggedContent && self.subalbums[indexSubalbum].hasGpsData())
							continue;
						let id = phFl.convertCacheBaseToId(self.subalbums[indexSubalbum].cacheBase);
						let removeSubalbumPromise = self.removeSubalbumFromSelection("#subalbum-select-box-" + id);
						subalbumsPromises.push(removeSubalbumPromise);
					}
					Promise.all(subalbumsPromises).then(
						function() {
							resolve_removeAllSubalbums();
						}
					);
				}
			}
		);
	};

  Album.prototype.isInsideSelectedAlbums = function() {
		var self = this;
		if (
			env.selectionAlbum.subalbums.some(
				selectedAlbum =>
					self.cacheBase.indexOf(selectedAlbum.cacheBase) === 0 &&
					self.cacheBase !== selectedAlbum.cacheBase
			)
		) {
			return true;
		} else {
			return false;
		}
	};

  Album.prototype.collectMediaInTree = function() {
		var self = this;
		return new Promise(
			function (resolve_collect) {
				var mediaInAlbum = [];
				var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
				if (self.media.length)
					mediaInAlbum = [... self.media.filter(singleMedia => ! onlyShowNonGeotaggedContent || ! singleMedia.hasGpsData())];
				var subalbumsPromises = [];
				self.subalbums.filter(subalbum => ! onlyShowNonGeotaggedContent || ! subalbum.hasGpsData()).forEach(
					function(subalbum) {
						var subalbumPromise = new Promise(
							function(resolve_subalbumPromise) {
								var toAlbumPromise = subalbum.toAlbum(null, {getMedia: true, getPositions: ! env.options.save_data});
								toAlbumPromise.then(
									function(album) {
										var collectPromise = album.collectMediaInTree();
										collectPromise.then(
											function(mediaInSubalbum) {
												resolve_subalbumPromise(mediaInSubalbum);
											}
										);
									}
								);
							}
						);
						subalbumsPromises.push(subalbumPromise);
					}
				);
				Promise.all(subalbumsPromises).then(
					function(arrayMedia) {
						arrayMedia.forEach(
							function(media) {
								media.forEach(
									singleMedia => {
										if (mediaInAlbum.indexOf(singleMedia) === -1)
											mediaInAlbum.push(singleMedia);
									}
								);
							}
						);
						resolve_collect(mediaInAlbum);
					}
				);
			}
		);
	};

	Album.prototype.addSubalbumToSelection = function(iSubalbum, clickedSelector) {
		var ithSubalbum = this.subalbums[iSubalbum];
		var self = this;
		return new Promise(
			function(resolve_addSubalbum) {
				///// sub-function //////////
				function continue_addSubalbumToSelection(ithAlbum) {
					env.selectionAlbum.subalbums.push(ithAlbum);

					ithAlbum.generateCaptionsForSelection();
					delete env.selectionAlbum.albumNameSort;
					delete env.selectionAlbum.albumReverseSort;
					env.selectionAlbum.sortAlbumsMedia();

					$(clickedSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", util._t("#unselect-subalbum"));
					self.invalidatePositionsAndMediaInAlbumAndSubalbums();

					resolve_addSubalbum();
				}
				///// end of sub-function //////////

				if (ithSubalbum.isSelected()) {
					resolve_addSubalbum();
				} else {
					if (util.nothingIsSelected())
						util.initializeSelectionAlbum();

					let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: ! env.options.save_data});
					convertSubalbumPromise.then(
						function(ithAlbum) {
							self.subalbums[iSubalbum] = ithAlbum;

							var albumIsInsideSelectedAlbums = ithAlbum.isInsideSelectedAlbums();
							if (albumIsInsideSelectedAlbums) {
								continue_addSubalbumToSelection(ithAlbum);
							} else {
								var collectPromise = ithAlbum.collectMediaInTree();
								collectPromise.then(
									function(mediaInAlbumTree) {
										var mediaInAlbumNotSelectedNorInsideSelectedAlbums = [];
										var mediaInAlbumNotSelectedNorInsideSelectedAlbumsNorGeotagged = [];
										mediaInAlbumTree.forEach(
											function(singleMedia) {
												if (! singleMedia.isInsideSelectedAlbums() && ! singleMedia.isSelected()) {
													mediaInAlbumNotSelectedNorInsideSelectedAlbums.push(singleMedia);
													if (! singleMedia.hasGpsData())
														mediaInAlbumNotSelectedNorInsideSelectedAlbumsNorGeotagged.push(singleMedia);
												}
											}
										);

										mediaInAlbumNotSelectedNorInsideSelectedAlbums.forEach(
											singleMedia => {
												if (singleMedia.hasGpsData()) {
													env.selectionAlbum.positionsAndMediaInTree.addSingleMedia(singleMedia);
												}
												env.selectionAlbum.sizesOfSubTree.sum(singleMedia.fileSizes);
											}
										);
										mediaInAlbumNotSelectedNorInsideSelectedAlbumsNorGeotagged.forEach(
											singleMedia => {
												env.selectionAlbum.nonGeotagged.sizesOfSubTree.sum(singleMedia.fileSizes);
											}
										);
										// env.selectionAlbum.positionsAndMediaInTree.mergePositionsAndMedia(ithAlbum.positionsAndMediaInTree);
										env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;

										env.selectionAlbum.numsMediaInSubTree.sum(new Media(mediaInAlbumNotSelectedNorInsideSelectedAlbums).imagesAndVideosCount());
										env.selectionAlbum.nonGeotagged.numsMediaInSubTree.sum(new Media(mediaInAlbumNotSelectedNorInsideSelectedAlbumsNorGeotagged).imagesAndVideosCount());

										continue_addSubalbumToSelection(ithAlbum);
									}
								);
							}
						}
					);
				}
			}
		);
	};

	Album.prototype.removeSubalbumFromSelection = function(clickedSelector) {
		var iSubalbum = this.subalbums.findIndex(subalbum => subalbum.cacheBase === $(clickedSelector).parent().parent().attr("id"));
		var ithSubalbum = this.subalbums[iSubalbum];
		// var ithSubalbum = this.subalbums[iSubalbum];
		var self = this;
		return new Promise(
			function(resolve_removeSubalbum) {
				if (! ithSubalbum.isSelected()) {
					if (ithSubalbum.isEmpty())
						util.initializeSelectionAlbum();
					resolve_removeSubalbum();
				} else {
					let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: ! env.options.save_data});
					convertSubalbumPromise.then(
						function(ithAlbum) {
							self.subalbums[iSubalbum] = ithAlbum;

							var selectedMediaInsideSelectedAlbums = [];
							env.selectionAlbum.media.forEach(
								function(singleMedia) {
									if (singleMedia.isInsideSelectedAlbums())
										selectedMediaInsideSelectedAlbums.push(singleMedia);
								}
							);

							var subalbumIsInsideSelectedAlbums = ithAlbum.isInsideSelectedAlbums();

							var indexInSelection = env.selectionAlbum.subalbums.findIndex(selectedSubalbum => selectedSubalbum.isEqual(ithAlbum));
							env.selectionAlbum.subalbums.splice(indexInSelection, 1);

							if (
								ithAlbum.hasOwnProperty("positionsAndMediaInTree") && ithAlbum.positionsAndMediaInTree.length &&
								selectedSubalbum.hasOwnProperty("positionsAndMediaInTree") && selectedSubalbum.positionsAndMediaInTree.length
							) {
								// if (ithAlbum.numPositionsInTree >  env.selectionAlbum.numPositionsInTree / 10) {
								// 	let newPositions = new PositionsAndMedia();
								// 	env.selectionAlbum.subalbums.forEach(
								// 		function(selectedSubalbum) {
								// 			newPositions.mergePositionsAndMedia(selectedSubalbum.positionsAndMediaInTree);
								// 		}
								// 	);
								// } else {
								env.selectionAlbum.positionsAndMediaInTree.removePositionsAndMedia(ithAlbum.positionsAndMediaInTree);
								// }
								env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
							}

							if (! subalbumIsInsideSelectedAlbums) {
								env.selectionAlbum.numsMediaInSubTree.subtract(ithAlbum.numsMediaInSubTree);
								env.selectionAlbum.nonGeotagged.numsMediaInSubTree.subtract(ithAlbum.nonGeotagged.numsMediaInSubTree);
								env.selectionAlbum.sizesOfSubTree.subtract(ithAlbum.sizesOfSubTree);
								env.selectionAlbum.nonGeotagged.sizesOfSubTree.subtract(ithAlbum.nonGeotagged.sizesOfSubTree);
								// selectedMediaInsideSelectedAlbums.forEach(
								// 	function(singleMedia) {
								// 		if (! singleMedia.isInsideSelectedAlbums()) {
								// 			var singleMediaArrayCounts = new Media([singleMedia]).imagesAndVideosCount();
								// 			env.selectionAlbum.numsMediaInSubTree.sum(singleMediaArrayCounts);
								// 			env.selectionAlbum.sizesOfSubTree.sum(singleMedia.fileSizes);
								// 		}
								// 	}
								// );
								// env.selectionAlbum.numsProtectedMediaInSubTree.subtract(ithAlbum.numsProtectedMediaInSubTree);
							}

							if (! env.currentAlbum.isSelection()) {
								$(clickedSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", util._t("#select-subalbum"));
							}
							self.invalidatePositionsAndMediaInAlbumAndSubalbums();

							delete env.selectionAlbum.albumNameSort;
							delete env.selectionAlbum.albumReverseSort;
							env.selectionAlbum.sortAlbumsMedia();

							if (env.currentAlbum.isSelection()) {
								env.albumInSubalbumDiv = null;
								if (util.nothingIsSelected()) {
									util.initializeSelectionAlbum();
									window.location.href = util.upHash();
								} else {
									let highlightedObject = util.highlightedObject();
									if (highlightedObject.children(".album-button").children(clickedSelector).length > 0) {
										// the clicked object is the highlighted one:
										// before removing it, highlight the previous or next object
										let nextObject;
										if (highlightedObject.parent().parent().children().length === 1 && env.currentAlbum.media.length) {
											nextObject = util.nextObjectForHighlighting(highlightedObject);
											util.scrollAlbumViewToHighlightedThumb(nextObject);
										} else {
											if (highlightedObject.parent().is(":last-child")) {
												nextObject = util.prevObjectForHighlighting(highlightedObject);
											} else {
												nextObject = util.nextObjectForHighlighting(highlightedObject);
											}
											util.scrollToHighlightedSubalbum(nextObject);
										}
									}

									$(clickedSelector).parent().parent().parent().remove();
									tF.setTitle("album", null);
								}
							}

							resolve_removeSubalbum();
						}
					);
				}
			}
		);
	};

  Album.prototype.isAlbumWithOneMedia = function() {
		var result;

		result = (
			this !== null && ! this.subalbums.length && (
				util.onlyShowNonGeotaggedContent() && this.nonGeotagged.numsMedia.imagesAndVideosTotal() === 1 ||
				! util.onlyShowNonGeotaggedContent() && this.numsMedia.imagesAndVideosTotal() === 1
			)
		);
		return result;
	};

  Album.prototype.downloadAlbum = function(everything = false, what = "all", size = 0) {
		// adapted from https://gist.github.com/c4software/981661f1f826ad34c2a5dc11070add0f
		//
		// this function must be converted to streams, example at https://jimmywarting.github.io/StreamSaver.js/examples/saving-multiple-files.html
		//
		// what is one of "all", "images" or "videos"

		$("#downloading-media").html(util._t("#downloading-media")).show();
		$("#downloading-media").append(env.br + "<span id='file-name'></span>");
		size = parseInt(size);

		var zip = new JSZip();
		var zipFilename;
		// var basePath = this.path;
		zipFilename = env.options.page_title;
		if (this.isSearch()) {
			zipFilename += '.' + util._t("#by-search") + " '" + $("#search-field").val() + "'";
		} else if (this.isSelection()) {
			zipFilename += '.' + util._t("#by-selection");
		} else if (this.isByDate()) {
			let textComponents = this.path.split("/").splice(1);
			if (textComponents.length > 1)
				textComponents[1] = util._t("#month-" + textComponents[1]);
			if (textComponents.length)
				zipFilename += '.' + textComponents.join('-');
		} else if (this.isByGps()) {
			zipFilename += '.' + this.ancestorsNames.splice(1).join('-');
		} else if (this.isMap()) {
			zipFilename += '.' + util._t("#from-map");
		} else if (this.cacheBase !== env.options.folders_string) {
			zipFilename += '.' + this.nameForShowing(null);
		}

		zipFilename += ".zip";

		var includedMedia = [];

		var addMediaAndSubalbumsPromise = addMediaAndSubalbumsFromAlbum(this);
		addMediaAndSubalbumsPromise.then(
			// the complete zip can be generated...
			function() {
				$("#downloading-media").hide();
				$("#preparing-zip").html(util._t("#preparing-zip")).show();
				$("#preparing-zip").append(env.br + "<div id='file-name'></div>");
				zip.generateAsync(
					{type:'blob'},
					function onUpdate(meta) {
						if (meta.currentFile)
							$("#preparing-zip #file-name").html(meta.currentFile + env.br + meta.percent.toFixed(1) + "%");
					}
				).then(
					function(content) {
						// ... and saved
						saveAs(content, zipFilename);
						$("#preparing-zip").hide();
					}
				);
			}
		);
		// end of function

		function addMediaAndSubalbumsFromAlbum(album, subalbum = "") {
			return new Promise(
				function(resolve_addMediaAndSubalbumsFromAlbum) {
					var onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
					var albumPromises = [];

					if (! album.isTransversal() || album.ancestorsNames.length >= 4) {
						for (let iMedia = 0; iMedia < album.media.length; iMedia ++) {
							let ithMedia = album.media[iMedia];
							if (
								onlyShowNonGeotaggedContent && ithMedia.hasGpsData() ||
								ithMedia.isImage() && what === "videos" ||
								ithMedia.isVideo() && what === "images" ||
								includedMedia.some(singleMedia => singleMedia.isEqual(ithMedia))
							)
								continue;

							includedMedia.push(ithMedia);
							let mediaPromise = new Promise(
								function(resolveMediaPromise) {
									let url;
									if (size === 0)
										url = encodeURI(ithMedia.trueOriginalMediaPath());
									else
										url = encodeURI(ithMedia.mediaPath(size));
									let name = ithMedia.name;
									// load a file and add it to the zip file
									JSZipUtils.getBinaryContent(
										url,
										function (err, data) {
											if (err) {
												throw err; // or handle the error
											}
											let fileName = name;
											if (subalbum)
												fileName = util.pathJoin([subalbum, fileName]);
											$("#downloading-media #file-name").html(fileName);
											zip.file(fileName, data, {binary:true});
											resolveMediaPromise();
										}
									);
								}
							);
							albumPromises.push(mediaPromise);
						}
					}

					if (everything) {
						// sort subalbums: regular albums, then by date ones, then by gps ones, then searches, then maps
						let regulars = [], byDate = [], byGps = [], searches = [], fromMap = [], selections = [];
						let sortedSubalbums = [];
						for (let iSubalbum = 0; iSubalbum < album.subalbums.length; iSubalbum ++) {
							let ithSubalbum = album.subalbums[iSubalbum];
							if (onlyShowNonGeotaggedContent && ithSubalbum.hasGpsData())
								continue;

							if (ithSubalbum.isFolder())
								regulars.push(ithSubalbum);
							if (ithSubalbum.isByDate())
								byDate.push(ithSubalbum);
							if (ithSubalbum.isByGps())
								byGps.push(ithSubalbum);
							if (ithSubalbum.isSearch())
								searches.push(ithSubalbum);
							if (ithSubalbum.isMap())
								fromMap.push(ithSubalbum);
							if (ithSubalbum.isSelection())
								selections.push(ithSubalbum);
						}
						sortedSubalbums.push(... regulars);
						sortedSubalbums.push(... byDate);
						sortedSubalbums.push(... byGps);
						sortedSubalbums.push(... searches);
						sortedSubalbums.push(... fromMap);
						sortedSubalbums.push(... selections);

						for (let i = 0; i < sortedSubalbums.length; i ++) {
							let iSubalbum = album.subalbums.findIndex(subalbum => sortedSubalbums[i].isEqual(subalbum));
							let ithSubalbum = sortedSubalbums[i];
							let subalbumPromise = new Promise(
								function(resolveSubalbumPromise) {
									let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: false});
									convertSubalbumPromise.then(
										function(ithAlbum) {
											album.subalbums[iSubalbum] = ithAlbum;
											let ancestorsNamesList = ithAlbum.ancestorsNames.slice(1);
											if (ancestorsNamesList.length > 2) {
												ancestorsNamesList[2] = util.transformAltPlaceName(ancestorsNamesList[2]);
											}
											let albumPath = ancestorsNamesList.join('/');
											// let albumPath = ithAlbum.path;
											// // if (true || album.isSearch() || album.isSelection())
											// // 	// remove the leading folders/date/gps/map string
											// albumPath = albumPath.split('/').splice(1).join('/');
											// else
											// 	albumPath = albumPath.substring(basePath.length + 1);
											let addMediaAndSubalbumsPromise = addMediaAndSubalbumsFromAlbum(ithAlbum, albumPath);
											addMediaAndSubalbumsPromise.then(
												function() {
													resolveSubalbumPromise();
												}
											);
										}
									);
								}
							);
							albumPromises.push(subalbumPromise);
						}
					}

					Promise.all(albumPromises).then(
						function() {
							resolve_addMediaAndSubalbumsFromAlbum();
						}
					);
				}
			);
		}
	};

  Album.prototype.generateCaptionsForSelection = function() {
		[this.captionsForSelection, this.captionForSelectionSorting] = util.generateAlbumCaptionsForCollections(this);
	};

	Album.prototype.generateCaptionsForSearch = function() {
		[this.captionsForSearch, this.captionForSearchSorting] = util.generateAlbumCaptionsForCollections(this);
	};

  Album.prototype.nameForShowing = function(parentAlbum, html = false, br = false) {
		return util.nameForShowing(this, parentAlbum, html, br);
	};

  Album.prototype.folderMapTitle = function(subalbum, folderName) {
		var folderMapTitle;
		if (this.isSelection() && subalbum.isByDate()) {
			let reducedFolderName = folderName.substring(0, folderName.indexOf(env.br));
			folderMapTitle = util._t('#place-icon-title') + reducedFolderName;
		} else if (this.isSelection() && subalbum.isByGps()) {
			if (subalbum.name === '')
				folderMapTitle = util._t('.not-specified');
			else if (subalbum.hasOwnProperty('altName'))
				folderMapTitle = util.transformAltPlaceName(subalbum.altName);
			else
				folderMapTitle = subalbum.nameForShowing(this);
			folderMapTitle = util._t('#place-icon-title') + folderMapTitle;
		} else {
			folderMapTitle = util._t('#place-icon-title') + folderName;
		}
		return folderMapTitle;
	};

  Album.prototype.hasProperty = function(property) {
		return util.hasProperty(this, property);
	};

	Album.prototype.hasSomeDescription = function(property = null) {
		return util.hasSomeDescription(this, property);
	};

  Album.prototype.setDescription = function() {
		util.setDescription(this);
	};

  Album.prototype.sortAlbumsMedia = function() {
		// this function applies the sorting on the media and subalbum lists
		// and sets the album properties that attest the lists status

		// album properties reflect the current sorting of album and media objects
		// json files have subalbums and media sorted by date not reversed

		if (this.subalbums.length) {
			if (this.needAlbumNameSort()) {
				this.sortByPath();
				this.albumNameSort = true;
				this.albumReverseSort = false;
			} else if (this.needAlbumDateSort()) {
				util.sortByDate(this.subalbums);
				this.albumNameSort = false;
				this.albumReverseSort = false;
			}
			if (this.needAlbumDateReverseSort() || this.needAlbumNameReverseSort()) {
				this.subalbums.reverse();
				this.albumReverseSort = ! this.albumReverseSort;
			}
		}

		if (this.hasOwnProperty("media") && this.media.length) {
			if (this.needMediaNameSort()) {
				this.media.sortByName();
				this.mediaNameSort = true;
				this.mediaReverseSort = false;
			} else if (this.needMediaDateSort()) {
				this.media.sortByDate();
				this.mediaNameSort = false;
				this.mediaReverseSort = false;
			}
			if (this.needMediaDateReverseSort() || this.needMediaNameReverseSort()) {
				this.media.sortReverse();
				this.mediaReverseSort = ! this.mediaReverseSort;
			}

			// calculate the new index
			if (env.currentMedia !== null && (env.currentAlbum === null || this.isEqual(env.currentAlbum))) {
				env.currentMediaIndex = this.media.findIndex(
					function(thisMedia) {
						var matches = thisMedia.isEqual(env.currentMedia);
						return matches;
					}
				);
			}
		}
	};

	// Album.prototype.initializeSortProperties = function() {
	// 	// this function sets the subalbum and media properties that attest the lists status
	// 	// json files have subalbums and media sorted according to the options
	//
	// 	if (this.albumNameSort === undefined)
	// 		this.albumNameSort = env.options.default_album_name_sort;
	// 	if (this.albumReverseSort === undefined)
	// 		this.albumReverseSort = env.options.default_album_reverse_sort;
	//
	// 	if (this.mediaNameSort === undefined)
	// 		this.mediaNameSort = env.options.default_media_name_sort;
	// 	if (this.mediaReverseSort === undefined)
	// 		this.mediaReverseSort = env.options.default_media_reverse_sort;
	// };

  Album.prototype.initializeIncludedFilesByCodesSimpleCombinationProperty = function(codesSimpleCombination, number) {
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

					var promise = phFl.getJsonFile(jsonFile);
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
									self.nonGeotagged.numsMedia.sum(protectedAlbum.nonGeotagged.numsMedia);
									self.numsMediaInSubTree.sum(protectedAlbum.numsMediaInSubTree);
									self.sizesOfSubTree.sum(protectedAlbum.sizesOfSubTree);
									self.sizesOfAlbum.sum(protectedAlbum.sizesOfAlbum);
									self.numPositionsInTree += protectedAlbum.numPositionsInTree;

									self.nonGeotagged.numsMediaInSubTree.sum(protectedAlbum.nonGeotagged.numsMediaInSubTree);
									self.nonGeotagged.sizesOfSubTree.sum(protectedAlbum.nonGeotagged.sizesOfSubTree);
									self.nonGeotagged.sizesOfAlbum.sum(protectedAlbum.nonGeotagged.sizesOfAlbum);
								}
								if (! self.hasOwnProperty("path"))
									self.path = protectedAlbum.path;
								self.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.protectedAlbumGot = true;

								if (protectedAlbum.hasOwnProperty("media")) {
									protectedAlbum.media.forEach(singleMedia => {singleMedia.protected = true;});
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

								if (protectedAlbum.hasOwnProperty("date")) {
									if (! self.hasOwnProperty("date"))
										self.date = protectedAlbum.date;
									else if (protectedAlbum.date > self.date)
										self.date = protectedAlbum.date;
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
								var promise = phFl.getMediaAndPositions(protectedCacheBase, {mustGetMedia: mustGetMedia, mustGetPositions: mustGetPositions});
								promise.then(
									function([mediaGot, positionsGot]) {
										if (mediaGot) {
											mediaGot.forEach(singleMedia => {singleMedia.protected = true;});
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
						let [albumCodesComplexCombinationList, mediaCodesComplexCombinationList] = phFl.convertComplexCombinationsIntoLists(codesComplexCombinationInAlbum);

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
						var protectedCacheBase = util.pathJoin([protectedDirectory, self.cacheBase + '.0']);
						if (self.cacheBase.indexOf(env.options.by_gps_string) === 0)
							protectedCacheBase = util.pathJoin([protectedDirectory, env.options.by_gps_album_subdir, self.cacheBase + '.0']);
						else if (self.cacheBase.indexOf(env.options.by_date_string) === 0)
							protectedCacheBase = util.pathJoin([protectedDirectory, env.options.by_date_album_subdir, self.cacheBase + '.0']);
						else if (self.cacheBase.indexOf(env.options.by_search_string) === 0)
							protectedCacheBase = util.pathJoin([protectedDirectory, env.options.by_search_album_subdir, self.cacheBase + '.0']);

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
				theProtectedDirectoriesToGet = phFl.protectedDirectoriesToGet();
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
						ithProtectedSubalbum.includedFilesByCodesSimpleCombination[codesSimpleCombination][number].album.countsGot = true;
					}
				} else {
					self.subalbums.forEach(
						function(subalbum) {
							if (subalbum.isEqual(ithProtectedSubalbum))
								phFl.mergeProtectedSubalbum(subalbum, ithProtectedSubalbum, codesSimpleCombination, number);
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
							// let codesCombinationsLists = phFl.convertComplexCombinationsIntoLists(codesSimpleCombination);
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
								let protectedCacheBase = util.pathJoin([protectedDirectory, self.cacheBase + '.' + iCacheBase]);
								if (self.cacheBase.indexOf(env.options.by_date_string) === 0)
									protectedCacheBase = util.pathJoin([protectedDirectory, env.options.by_date_album_subdir, self.cacheBase + '.' + iCacheBase]);
								else if (self.cacheBase.indexOf(env.options.by_gps_string) === 0)
									protectedCacheBase = util.pathJoin([protectedDirectory, env.options.by_gps_album_subdir, self.cacheBase + '.' + iCacheBase]);
								else if (self.cacheBase.indexOf(env.options.by_search_string) === 0)
									protectedCacheBase = util.pathJoin([protectedDirectory, env.options.by_search_album_subdir, self.cacheBase + '.' + iCacheBase]);
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
		var [albumCodesComplexCombinationList, mediaCodesComplexCombinationList] = phFl.convertComplexCombinationsIntoLists(codesComplexCombination);

		var count = 0;
		for (var codesComplexCombinationFromObject in this.numsProtectedMediaInSubTree) {
			if (this.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombinationFromObject) && codesComplexCombinationFromObject !== ",") {
				var [albumCodesComplexCombinationListFromObject, mediaCodesComplexCombinationListFromObject] =
					phFl.convertComplexCombinationsIntoLists(codesComplexCombinationFromObject);

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

	Album.prototype.pickRandomMedia = function(iSubalbum, error, onlyShowNonGeotaggedContent) { // from old version
		var self = this;
		var index;
		var ithSubalbum = env.currentAlbum.subalbums[iSubalbum];

		return new Promise(
			function(resolve_pickRandomMedia) {
				var promise = ithSubalbum.toAlbum(error, {getMedia: false, getPositions: false});
				promise.then(
					function beginPick(ithAlbum) {
						self.subalbums[iSubalbum] = ithAlbum;
						let nMedia;
						if (onlyShowNonGeotaggedContent)
							nMedia = ithAlbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal();
						else
							nMedia = ithAlbum.numsMediaInSubTree.imagesAndVideosTotal();

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

		function nextAlbum(ithAlbum, resolve_pickRandomMedia) {
			var nMediaInAlbum;

			if (
				! onlyShowNonGeotaggedContent && ! ithAlbum.numsMediaInSubTree.imagesAndVideosTotal() ||
				onlyShowNonGeotaggedContent && ! ithAlbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal()
			) {
				error();
				return;
			}

			if (onlyShowNonGeotaggedContent)
				nMediaInAlbum = ithAlbum.nonGeotagged.numsMedia.imagesAndVideosTotal();
			else
				nMediaInAlbum = ithAlbum.numsMedia.imagesAndVideosTotal();

			if (ithAlbum.isTransversal() && ithAlbum.subalbums.length > 0) {
				// do not get the random media from the year/country nor the month/state albums
				// this way loading of albums is much faster
				nMediaInAlbum = 0;
			}

			if (index >= nMediaInAlbum) {
				index -= nMediaInAlbum;
				if (ithAlbum.subalbums.length) {
					let found = false;
					for (let j = 0; j < ithAlbum.subalbums.length; j ++) {
						let jthSubalbum = ithAlbum.subalbums[j];
						if (onlyShowNonGeotaggedContent && jthSubalbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal() === 0)
							continue;
						if (onlyShowNonGeotaggedContent && index >= jthSubalbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal()) {
							index -= jthSubalbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal();
						} else if (! onlyShowNonGeotaggedContent && index >= jthSubalbum.numsMediaInSubTree.imagesAndVideosTotal()) {
							index -= jthSubalbum.numsMediaInSubTree.imagesAndVideosTotal();
						} else {
							var promise = jthSubalbum.toAlbum(error, {getMedia: false, getPositions: false});
							promise.then(
								function(jthAlbum) {
									nextAlbum(jthAlbum, resolve_pickRandomMedia);
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
				var lastPromise = phFl.getAlbum(ithAlbum, error, {getMedia: true, getPositions: ! env.options.save_data});
				lastPromise.then(
					function(ithAlbumWithMediaAndPositions) {
						if (onlyShowNonGeotaggedContent) {
							// index is referred to non geotagged media, find the correct value for all the media
							let trueIndex;
							let counter = 0;
							for (trueIndex = 0; trueIndex < ithAlbumWithMediaAndPositions.media.length; trueIndex ++) {
								let thisMedia = ithAlbumWithMediaAndPositions.media[trueIndex];
								if (thisMedia.hasGpsData())
									continue;
								if (counter === index) {
									resolve_pickRandomMedia([ithAlbumWithMediaAndPositions, trueIndex]);
									break;
								}
								counter ++;
							}
						} else {
							resolve_pickRandomMedia([ithAlbumWithMediaAndPositions, index]);
						}
					},
					function() {
						console.trace();
					}
				);
			}
		}
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
		// 	if (! $("#right-and-search-menu").hasClass("expanded"))
		// 		util.openMenu();
		// 	util.focusSearchField();
		// }
		return mediaIndex;
	};

  Album.prototype.isUndefinedOrFalse = function(property) {
		return ! this.hasOwnProperty(property) || ! this[property];
	};

	Album.prototype.isUndefinedOrTrue = function(property) {
		return ! this.hasOwnProperty(property) || this[property];
	};

	// this function refer to the need that the html showed be sorted
	Album.prototype.needAlbumNameSort = function() {
		return this.isUndefinedOrFalse("albumNameSort") && env.albumNameSort;
	};

	Album.prototype.needAlbumDateSort = function() {
		return this.isUndefinedOrTrue("albumNameSort") && ! env.albumNameSort;
	};

	Album.prototype.needAlbumDateReverseSort = function() {
		return this.needAlbumDateSort && (
			this.isUndefinedOrTrue("albumReverseSort") && ! env.albumReverseSort ||
			this.isUndefinedOrFalse("albumReverseSort") && env.albumReverseSort
		);
	};

	Album.prototype.needAlbumNameReverseSort = function() {
		return this.needAlbumNameSort() && (
			this.isUndefinedOrTrue("albumReverseSort") && ! env.albumReverseSort ||
			this.isUndefinedOrFalse("albumReverseSort") && env.albumReverseSort
		);
	};

	Album.prototype.needMediaNameSort = function() {
		return this.isUndefinedOrFalse("mediaNameSort") && env.mediaNameSort;
	};

	Album.prototype.needMediaDateSort = function() {
		return this.isUndefinedOrTrue("mediaNameSort") && ! env.mediaNameSort;
	};

	Album.prototype.needMediaDateReverseSort = function() {
		return this.needMediaDateSort && (
			this.isUndefinedOrTrue("mediaReverseSort") && ! env.mediaReverseSort ||
			this.isUndefinedOrFalse("mediaReverseSort") && env.mediaReverseSort
		);
	};

	Album.prototype.needMediaNameReverseSort = function() {
		return this.needMediaNameSort() && (
			this.isUndefinedOrTrue("mediaReverseSort") && ! env.mediaReverseSort ||
			this.isUndefinedOrFalse("mediaReverseSort") && env.mediaReverseSort
		);
	};

  Album.prototype.addMediaFromPositionsToMapAlbum = function(positionsAndMedia, resolve_imageLoad) {

		var mediaListElement, indexPositions, indexPhoto, markerClass, photoIndex, mediaIndex;
		var photosByAlbum = {}, positionsAndMediaElement;
		var self = this;

		// in order to add the html code for the images to a string,
		// we group the photos by album: this way we rationalize the process of getting them
		for (indexPositions = 0; indexPositions < positionsAndMedia.length; indexPositions ++) {
			positionsAndMediaElement = positionsAndMedia[indexPositions];
			markerClass = getMarkerClass(positionsAndMediaElement);
			for (indexPhoto = 0; indexPhoto < positionsAndMediaElement.mediaList.length; indexPhoto ++) {
				mediaListElement = positionsAndMediaElement.mediaList[indexPhoto];
				if (! photosByAlbum.hasOwnProperty(mediaListElement.foldersCacheBase)) {
					photosByAlbum[mediaListElement.foldersCacheBase] = [];
				}
				photosByAlbum[mediaListElement.foldersCacheBase].push(
					{
						element: mediaListElement,
						markerClass: markerClass
					}
				);
			}
		}

		// ok, now we can interate over the object we created and add the media to the map album
		var cacheBasesPromises = [];
		for (var foldersCacheBase in photosByAlbum) {
			if (photosByAlbum.hasOwnProperty(foldersCacheBase)) {
				let cacheBasePromise = new Promise(
					function(resolve_cacheBasePromise) {
						let photosInAlbum = photosByAlbum[foldersCacheBase];
						var getAlbumPromise = phFl.getAlbum(foldersCacheBase, util.errorThenGoUp, {getMedia: true, getPositions: ! env.options.save_data});
						getAlbumPromise.then(
							function(theAlbum) {
								for (mediaIndex = 0; mediaIndex < theAlbum.numsMedia.imagesAndVideosTotal(); mediaIndex ++) {
									for (photoIndex = 0; photoIndex < photosInAlbum.length; photoIndex ++) {
										if (theAlbum.media[mediaIndex].cacheBase === photosInAlbum[photoIndex].element.cacheBase) {
											theAlbum.media[mediaIndex].generateCaptionsForPopup(theAlbum);
											self.media.push(theAlbum.media[mediaIndex]);
											self.sizesOfAlbum.sum(theAlbum.media[mediaIndex].fileSizes);
											self.sizesOfSubTree.sum(theAlbum.media[mediaIndex].fileSizes);
										}
									}
								}
								resolve_cacheBasePromise();
							},
							function() {
								console.trace();
							}
						);
					}
				);
				cacheBasesPromises.push(cacheBasePromise);
			}
		}
		Promise.all(cacheBasesPromises).then(
			function() {
				self.numsMedia = self.media.imagesAndVideosCount();
				self.positionsAndMediaInTree.mergePositionsAndMedia(positionsAndMedia);
				self.numPositionsInTree = self.positionsAndMediaInTree.length;
				resolve_imageLoad(self);
			}
		);
		// end of function addMediaFromPositionsToMapAlbum body

		function getMarkerClass(positionAndCount) {
			var imgClass =
				"popup-img-" +
				(positionAndCount.lat / 1000).toString().replace('.', '') +
				'-' +
				(positionAndCount.lng / 1000).toString().replace('.', '');
			return imgClass;
		}
	};

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
						let promise = phFl.getAlbum(self, null, {getMedia: true, getPositions: ! env.options.save_data});
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
					menuF.updateMenu();
				}
			);
		} else {
			let addSubalbumPromise = this.addSubalbumToSelection(iSubalbum, clickedSelector);
			addSubalbumPromise.then(
				function subalbumAdded() {
					env.selectingSelectors = env.selectingSelectors.filter(selector => selector !== clickedSelector);

					menuF.updateMenu();
				}
			);
		}
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

		// menuF.setOptions();

		let menuIconTitle = util._t(".menu-icon-title");
		if (! env.isMobile.any())
			menuIconTitle += ", " + util._t(".menu-icon-title-end");
		$("#menu-icon").attr("title", menuIconTitle);

		let infoIconTitle = util._t(".info-icon-title");
		$(".info-icon").attr("title", infoIconTitle);

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
			$("body").off('mousewheel').on('mousewheel', tF.scrollAlbum);

			util.setMediaOptions();

			env.currentAlbum.setDescription();
			util.setDescriptionOptions();

			if ($("#album-view").is(":visible")) {
				if (env.currentAlbum.subalbums.length) {
					env.currentAlbum.showSubalbums();
				} else {
					$("#subalbums").addClass("hidden");
				}
				if (env.currentAlbum.media.length) {
					if (
						env.albumOfPreviousState === null || (
							env.albumOfPreviousState !== env.currentAlbum ||
							env.albumOfPreviousState !== null && env.isFromAuthForm
						) ||
						! $("#thumbs").children().length
					) {
						env.currentAlbum.showMedia();
					} else {
						util.adaptMediaCaptionHeight(false);
						util.scrollAlbumViewToHighlightedThumb();
					}
				} else {
					$("#thumbs").addClass("hidden");
				}

				env.windowWidth = $(window).innerWidth();

				menuF.updateMenu();
				if (env.currentAlbum.subalbums.length)
					this.bindSubalbumSortEvents();
				if (env.currentAlbum.media.length)
					this.bindMediaSortEvents();

				util.addMediaLazyLoader();
			}


			let titlePromise = tF.setTitle("album", null);
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
								util.adaptMediaCaptionHeight(false);
								if (util.isPopup()) {
									mapF.updatePopup();
									util.adaptMediaCaptionHeight(true);
								}


								if (util.isMap() || util.isPopup()) {
									// the map must be generated again including the points that only carry protected content
									env.mapRefreshType = "resize";
									if ($("#popup-images-wrapper .highlighted").length)
										env.highlightedObjectId = $("#popup-images-wrapper .highlighted").attr("id");

									if (util.isPopup()) {
										env.popupRefreshType = "mapAlbum";
										if (util.isShiftOrControl())
											$(".shift-or-control .leaflet-popup-close-button")[0].click();
										$(".media-popup .leaflet-popup-close-button")[0].click();
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

								menuF.updateMenu();
							}
						);

						env.isFromAuthForm = false;
					}
				}
			);
			$("#powered-by").show();
		}

		// // options function must be called again in order to set elements previously absent
		// menuF.setOptions();
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
			menuF.setBooleanCookie("albumNameSortRequested", false);
			// menuF.setBooleanCookie("albumReverseSortRequested", this.albumReverseSort);
			this.sortAlbumsMedia();
			menuF.updateMenu(this);
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
			menuF.setBooleanCookie("albumNameSortRequested", true);
			this.sortAlbumsMedia();
			menuF.updateMenu(this);

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
			menuF.setBooleanCookie("albumReverseSortRequested", env.albumReverseSort);
			this.sortAlbumsMedia();
			menuF.updateMenu(this);
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
			menuF.setBooleanCookie("mediaNameSortRequested", false);
			this.sortAlbumsMedia();
			menuF.updateMenu(this);
			let inThumbs = true;
			let highlightedObjectSelector = "#" + util.highlightedObject(inThumbs).parent().attr("id");
			this.showMedia();
			if (env.currentMedia !== null) {
				util.scrollBottomMediaToHighlightedThumb(util.addMediaLazyLoader);
			} else {
				util.scrollAlbumViewToHighlightedThumb($(highlightedObjectSelector).children());
			}

			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				let highlightedObjectSelector = "#" + util.highlightedObject().attr("id");
				env.mapAlbum.showMedia();
				$("#popup-images-wrapper .highlighted").removeClass("highlighted");
				$(highlightedObjectSelector).addClass("highlighted");
				util.scrollPopupToHighlightedThumb();
				mapF.updatePopup();
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
			menuF.setBooleanCookie("mediaNameSortRequested", true);
			this.sortAlbumsMedia();
			menuF.updateMenu(this);
			let inThumbs = true;
			let highlightedObjectSelector = "#" + util.highlightedObject(inThumbs).parent().attr("id");
			this.showMedia();
			if (env.currentMedia !== null) {
				util.scrollBottomMediaToHighlightedThumb(util.addMediaLazyLoader);
			} else {
				util.scrollAlbumViewToHighlightedThumb($(highlightedObjectSelector).children());
			}

			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				let highlightedObjectSelector = "#" + util.highlightedObject().attr("id");
				env.mapAlbum.showMedia();
				$("#popup-images-wrapper .highlighted").removeClass("highlighted");
				$(highlightedObjectSelector).addClass("highlighted");
				util.scrollPopupToHighlightedThumb();
				mapF.updatePopup();
			}
		}
		return false;
	};

	Album.prototype.sortMediaReverse = function(ev) {
		ev.stopPropagation();
		if ((ev.button === 0 || ev.button === undefined) && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			env.mediaReverseSort = ! env.mediaReverseSort;
			menuF.setBooleanCookie("mediaReverseSortRequested", env.mediaReverseSort);
			this.sortAlbumsMedia();
			menuF.updateMenu(this);
			let inThumbs = true;
			let highlightedObjectSelector = "#" + util.highlightedObject(inThumbs).parent().attr("id");
			this.showMedia();
			if (env.currentMedia !== null) {
				util.scrollBottomMediaToHighlightedThumb(util.addMediaLazyLoader);
			} else {
				util.scrollAlbumViewToHighlightedThumb($(highlightedObjectSelector).children());
			}

			if (util.isPopup()) {
				env.mapAlbum.sortAlbumsMedia();
				let highlightedObjectSelector = "#" + util.highlightedObject().attr("id");
				env.mapAlbum.showMedia();
				$("#popup-images-wrapper .highlighted").removeClass("highlighted");
				$(highlightedObjectSelector).addClass("highlighted");
				util.scrollPopupToHighlightedThumb();
				mapF.updatePopup();
			}
		}
		return false;
	};

  Album.prototype.showMedia = function(populateMedia = true) {
		var inPopup = false;
		if (this.isEqual(env.mapAlbum) && util.isPopup())
			inPopup = true;

		var thumbnailSize = env.options.media_thumb_size;
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
			if (! $("#right-and-search-menu").hasClass("expanded")) {
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

		if (
			populateMedia &&
			$("#thumbs").is(":visible") && (
				! this.isTransversal() || ! tooBig || env.options.show_big_virtual_folders || env.isRevertingFromHidingGeotaggedMedia
			)
		) {
			$(thumbsSelector).empty();

			if (env.isRevertingFromHidingGeotaggedMedia)
				env.isRevertingFromHidingGeotaggedMedia = false;

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
				if (env.collectionCacheBase !== undefined && env.collectionCacheBase !== null)
					mediaHash = phFl.encodeHash(this.cacheBase, ithMedia, env.foundAlbumCacheBase, env.collectionCacheBase);
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
						"src='img/image-placeholder.jpg' " +
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

					[name, title] = ithMedia.nameAndTitleForShowing(true, true);
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
					$("#" + imageId + " img.thumbnail-map-link").attr("title", util._t("#show-on-map")).attr("alt", util._t(".marker"));
				$("#" + imageId + " img.select-box").attr("title", util._t(titleSelector)).attr("alt", util._t("#selector"));
				let [nameForShowing, titleForShowing] = ithMedia.nameAndTitleForShowing();
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
				util.scrollBottomMediaToHighlightedThumb(util.addMediaLazyLoader);
			else if (util.isPopup())
				util.scrollPopupToHighlightedThumb();
			else {
				util.scrollAlbumViewToHighlightedThumb();
				util.addMediaLazyLoader();
			}
		}

		util.setDescriptionOptions();
		util.correctElementPositions();

		util.highlightSearchedWords();

		$("#loading").hide();
	};

	Album.prototype.insertRandomImage = function(randomSubAlbumCacheBase, randomMedia, iSubalbum) {
		var titleName, randomMediaLink;
		var id = phFl.convertCacheBaseToId(this.subalbums[iSubalbum].cacheBase);
		var mediaSrc = randomMedia.chooseSubalbumThumbnail(env.options.album_thumb_size);

		$("#downloading-media").hide();

		var [fake_albumCacheBase, fake_mediaCacheBase, fake_mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(randomSubAlbumCacheBase);
		if (this.isSearch() || this.isSelection()) {
			let [name, fake_title] = randomMedia.nameAndTitleForShowing();
			titleName = util.pathJoin([randomMedia.albumName, name]);
			randomMediaLink = phFl.encodeHash(randomSubAlbumCacheBase, randomMedia, foundAlbumCacheBase, collectionCacheBase);
		} else if (this.isByDate()) {
			titleName = util.pathJoin([randomMedia.dayAlbum, randomMedia.name]);
			randomMediaLink = phFl.encodeHash(randomMedia.dayAlbumCacheBase, randomMedia);
		} else if (this.isByGps()) {
			let humanGeonames = util.pathJoin([env.options.by_gps_string, randomMedia.geoname.country_name, randomMedia.geoname.region_name, randomMedia.geoname.place_name]);
			titleName = util.pathJoin([humanGeonames, randomMedia.name]);
			randomMediaLink = phFl.encodeHash(randomMedia.gpsAlbumCacheBase, randomMedia);
		// } else if (this.isSearch()) {
		// 	titleName = util.pathJoin([randomMedia.albumName, randomMedia.name]);
		} else {
			let [name, fake_title] = randomMedia.nameAndTitleForShowing();
			titleName = util.pathJoin([randomMedia.albumName, name]);
			if (this.isSearch())
				randomMediaLink = phFl.encodeHash(randomMedia.foldersCacheBase, randomMedia, randomSubAlbumCacheBase, this.cacheBase);
			else
				randomMediaLink = phFl.encodeHash(randomMedia.foldersCacheBase, randomMedia);
		}

		titleName = titleName.substr(titleName.indexOf('/') + 1);
		var goTo = util._t(".go-to") + " " + titleName;
		$("#" + id + " .album-button a.random-media-link").attr("href", randomMediaLink);
		$("#" + id + " img.album-button-random-media-link").attr("title", goTo).attr("alt", util._t(".arrow"));
		// replacing is needed in order to reactivate the lazy loader
		$("#" + id + " img.thumbnail").replaceWith($("#" + id + " img.thumbnail")[0].outerHTML);
		$("#" + id + " img.thumbnail").attr("title", titleName).attr("alt", titleName);
		$("#" + id + " img.thumbnail").attr("data-src", encodeURI(mediaSrc));

		if (util.onlyShowNonGeotaggedContent()) {
			$("#" + id + " img.thumbnail").attr("src", "img/image-placeholder.jpg");
		}

		$(
			function() {
				var threshold = env.options.album_thumb_size;
				if (env.options.save_data)
					threshold = 0;
				$("img.lazyload-album-" + id).Lazy(
					{
						chainable: false,
						threshold: threshold,
						bind: 'event',
						removeAttribute: true
					}
				);
			}
		);
	};


	Album.prototype.pickRandomMediaAndInsertIt = function(iSubalbum, onlyShowNonGeotaggedContent = false) {
		var self = this;
		var promise = self.pickRandomMedia(
			iSubalbum,
			function error() {
				// executions shoudn't arrive here, if it arrives it's because of some error
				console.trace();
			},
			onlyShowNonGeotaggedContent
		);
		promise.then(
			function([randomAlbum, index]) {
				var thisSubalbumCacheBase = self.subalbums[iSubalbum].cacheBase;
				// var subalbumsCacheBases = env.currentAlbum.subalbums.map(subalbum => subalbum.cacheBase);
				// var thisSubalbumCacheBase = subalbumsCacheBases.filter(cacheBase => randomAlbum.cacheBase.indexOf(cacheBase) === 0)[0];
				if (util.onlyShowNonGeotaggedContent() && randomAlbum.media[index].hasGpsData() && $("#" + thisSubalbumCacheBase).is(":visible")) {
					env.currentAlbum.pickRandomMediaAndInsertIt(iSubalbum, true);
				} else {
					self.insertRandomImage(randomAlbum.cacheBase, randomAlbum.media[index], iSubalbum);
				}
			},
			function(album) {
				console.trace();
			}
		);
	};

	Album.prototype.showSubalbums = function(forcePopulate = false) {
		var self = this;

		if (env.fromEscKey && env.firstEscKey) {
			// respect the existing mediaLink (you cannot do it more than once)
			env.firstEscKey = false;
		} else {
			// reset mediaLink
			if (self.numsMedia.imagesAndVideosTotal())
				env.mediaLink = phFl.encodeHash(self.cacheBase, self.media[0], env.foundAlbumCacheBase, env.collectionCacheBase);
			else
				env.mediaLink = env.hashBeginning + self.cacheBase;

			env.firstEscKey = true;
		}

		// insert into DOM
		if (! self.subalbums.length)
			$("#subalbums").addClass("hidden");
			// $("#subalbums").hide();

		let populateSubalbums =
			forcePopulate ||
			env.albumInSubalbumDiv === null ||
			self === null ||
			(env.albumInSubalbumDiv !== self || env.isFromAuthForm || env.isRevertingFromHidingGeotaggedMedia) && self.subalbums.length;

		if (env.isRevertingFromHidingGeotaggedMedia)
			env.isRevertingFromHidingGeotaggedMedia = false;

		let objects = [];
		if (populateSubalbums) {
			$("#subalbums").empty();
			// $("#subalbums").insertBefore("#message-too-many-images");

			//
			// subalbums loop
			//
			// The promises are needed in order to know when everything has come to its end
			for (let i = 0; i < self.subalbums.length; i ++) {
				let iSubalbum = i;
				var ithSubalbum = self.subalbums[iSubalbum];
				var id = phFl.convertCacheBaseToId(ithSubalbum.cacheBase);

				let nameHtml;
				if (self.isSearch())
					nameHtml = ithSubalbum.captionsForSearch.join(env.br);
				else if (self.isSelection())
					nameHtml = ithSubalbum.captionsForSelection.join(env.br);
				else {
					nameHtml = ithSubalbum.nameForShowing(self, true, true);
					if (nameHtml === "")
						nameHtml = "<span class='italic gray'>(" + util._t("#root-album") + ")</span>";
				}

				let captionId = "album-caption-" + id;
				let captionHtml =
					"<div class='album-caption' id='" + captionId + "'>";
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
						"<div class='album-tags'>" +
							"<span class='tags'>" + util._t("#tags") + ": <span class='tag'>" + ithSubalbum.tags.map(tag => util.addTagLink(tag)).join("</span>, <span class='tag'>") + "</span></span>" +
						"</div>";
				}

				captionHtml +=
						"<div class='album-caption-count'>" +
							"(" +
							"<span class='gps'>" +
							ithSubalbum.numsMediaInSubTree.imagesAndVideosTotal() +
							"</span>" +
							"<span class='non-gps'>" +
							ithSubalbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal() +
							"</span>" +
							" " +
							"<span class='title-media'>" + util._t(".title-media") + "</span>" +
							")" +
						"</div>" +
					"</div>";

				let captionObject = $(captionHtml);

				let selectSrc = 'img/checkbox-unchecked-48px.png';
				let titleSelector = "#select-subalbum";
				if (ithSubalbum.isSelected()) {
					selectSrc = 'img/checkbox-checked-48px.png';
					titleSelector = "#unselect-subalbum";
				}

				let positionHtml = "";
				let folderMapTitleWithoutHtmlTags;
				if (ithSubalbum.numPositionsInTree && ! env.options.save_data) {
					folderMapTitleWithoutHtmlTags = self.folderMapTitle(ithSubalbum, nameHtml).replace(/<br \/>/gm, ' ').replace(/<[^>]*>?/gm, '');
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
					subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null, ithSubalbum.cacheBase, self.cacheBase);
				} else {
					if (typeof env.collectionCacheBase !== "undefined" && env.collectionCacheBase !== null)
						subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null, env.foundAlbumCacheBase, env.collectionCacheBase);
					else
						subfolderHash = phFl.encodeHash(ithSubalbum.cacheBase, null);
				}

				let gpsClass = "";
				if (
					// ithSubalbum.numPositionsInTree &&
					! ithSubalbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal()
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
						"<img src='img/image-placeholder.jpg' class='thumbnail lazyload-album-" + id + "'>" +
					"</div>"
				);
				albumButtonAndCaptionObject.append(imageObject);
				albumButtonAndCaptionObject.append(captionObject);
				aHrefObject.append(albumButtonAndCaptionObject);

				objects[iSubalbum] = {
					aHrefObject: aHrefObject,
					ithSubalbum: ithSubalbum,
					id: id,
					captionId: captionId,
					folderMapTitleWithoutHtmlTags: folderMapTitleWithoutHtmlTags,
					titleSelector: titleSelector,
					subfolderHash: subfolderHash
					// from: from
				};
			}

			// perform the last operations with each subalbum
			for (let i = 0; i < self.subalbums.length; i ++) {
				let iSubalbum = i;
				let aHrefObject = objects[iSubalbum].aHrefObject;
				let ithSubalbum = objects[iSubalbum].ithSubalbum;
				let id = objects[iSubalbum].id;
				let captionId = objects[iSubalbum].captionId;
				let folderMapTitleWithoutHtmlTags = objects[iSubalbum].folderMapTitleWithoutHtmlTags;
				let titleSelector = objects[iSubalbum].titleSelector;
				let subfolderHash = objects[iSubalbum].subfolderHash;
				// let from = objects[iSubalbum].from;

				$("#subalbums").append(aHrefObject);

				if (ithSubalbum.numPositionsInTree && ! env.options.save_data) {
					$("#subalbum-map-link-" + id + " img.thumbnail-map-link").attr("title", folderMapTitleWithoutHtmlTags);
					$("#subalbum-map-link-" + id + " img.thumbnail-map-link").attr("alt", util._t(".marker"));
				}
				$("#subalbum-select-box-" + id + " img.select-box").attr("title", util._t(titleSelector));
				$("#subalbum-select-box-" + id + " img.select-box").attr("alt", util._t("#selector"));

				if (ithSubalbum.hasOwnProperty("description"))
					$("#" + captionId + " .description").attr("title", util.stripHtmlAndReplaceEntities(ithSubalbum.description));

				if (ithSubalbum.hasOwnProperty("numPositionsInTree") && ! env.options.save_data && ithSubalbum.numPositionsInTree) {
					$("#subalbum-map-link-" + id).off("click").on(
						"click",
						{ithSubalbum: ithSubalbum},
						function(ev, from) {
							// do not remove the from parameter, it is valored when the click is activated via the trigger() jquery function
							ev.preventDefault();
							env.selectorClickedToOpenTheMap = "#subalbum-map-link-" + id;
							tF.generateMapFromSubalbum(ev, from);
						}
					);
				}

				if (
					! env.options.save_data &&
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

				let onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent() && ithSubalbum.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal();
				if (
					! env.options.save_data ||
					onlyShowNonGeotaggedContent && ithSubalbum.randomMedia.every(singleMedia => singleMedia.hasGpsData())
				) {
					self.pickRandomMediaAndInsertIt(iSubalbum, onlyShowNonGeotaggedContent);
				} else {
					let randomMedia;
					if (onlyShowNonGeotaggedContent) {
						while (true) {
							randomMedia = ithSubalbum.randomMedia[parseInt(Math.floor(Math.random() * ithSubalbum.randomMedia.length))];
							if (! randomMedia.hasGpsData())
								break;
						}
					} else {
						randomMedia = ithSubalbum.randomMedia[parseInt(Math.floor(Math.random() * ithSubalbum.randomMedia.length))];
					}

					var randomMediaFromCache = env.cache.getSingleMedia(randomMedia);
					if (randomMediaFromCache !== false)
						randomMedia = randomMediaFromCache;
					self.insertRandomImage(randomMedia.foldersCacheBase, randomMedia, iSubalbum);
				}
			}

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

			util.highlightSearchedWords();
		}

		if (! util.aSingleMediaIsHighlighted())
			util.scrollToHighlightedSubalbum();
	};

}());
