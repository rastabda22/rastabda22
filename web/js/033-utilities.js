/*jshint esversion: 6 */
(function() {
	var lastSelectionAlbumIndex = 0;
	var lastMapAlbumIndex = 0;
	/* constructor */
	function Utilities() {
		$(document).ready(
			function() {
				var originalMediaBoxContainerHtml = $(".media-box#center")[0].outerHTML;
				if (originalMediaBoxContainerHtml.indexOf('<div class="title">') === -1) {
					var titleContent = $("#album-view").clone().children().first();
					Utilities.originalMediaBoxContainerContent = $(originalMediaBoxContainerHtml).prepend(titleContent)[0].outerHTML;
				} else {
					Utilities.originalMediaBoxContainerContent = originalMediaBoxContainerHtml;
				}
			}
		);
	}

	Utilities.reduceAlbumtoSubalbum = function(album) {
		var subalbumProperties = [
			'cacheBase',
			'date',
			'name',
			'numPositionsInTree',
			'numsMediaInSubTree',
			'numsProtectedMediaInSubTree',
			'path',
			'selectionAlbumName',
			'selectionAlbumNameSorting',
			'sizesOfAlbum',
			'sizesOfSubTree',
			'words'
		];
		var clonedAlbum = Utilities.cloneObject(album);
		Object.keys(album).forEach(
			function(key) {
				if (subalbumProperties.indexOf(key) === -1) {
					delete clonedAlbum[key];
				}
			}
		);
		return clonedAlbum;
	};

	Utilities.prototype.openInNewTab = function(hash) {
		// albums is a list of objects {albumName: album}
		var typeOfPackedAlbum, stringifiedPackedAlbum, albumName;

		var newForm = jQuery(
			"<form>",
			{
				"action": hash,
				// "action": imgData.hash,
				"target": "_blank",
				"method": "post"
			}
		);

		let albums = [];
		if (Utilities.somethingIsInMapAlbum()) {
			albums.push(mapAlbum);
		}
		if (! Utilities.nothingIsSelected()) {
			albums.push(selectionAlbum);
		}

		for (let iAlbum = 0; iAlbum < albums.length; iAlbum ++) {
			var packedAlbum = lzwCompress.pack(albums[iAlbum].toJson());
			// var packedAlbum = lzwCompress.pack(JSON.decycle(albums[albumName]));
			if (Array.isArray(packedAlbum)) {
				stringifiedPackedAlbum = packedAlbum.join();
				typeOfPackedAlbum = "array";
			} else {
				typeOfPackedAlbum = "string";
				stringifiedPackedAlbum = packedAlbum;
			}
			if (albums[iAlbum].isSelection())
				albumName = "selectionAlbum";
			else
				albumName = "mapAlbum";

			let iString = iAlbum.toString();
			newForm.append(
				jQuery(
					"<input>",
					{
						"name": "albumName_" + iString,
						"value": albumName,
						"type": "hidden"
					}
				)
			).append(
				jQuery(
					"<input>",
					{
						"name": "stringifiedPackedAlbum_" + iString,
						"value": stringifiedPackedAlbum,
						"type": "hidden"
					}
				)
			).append(
				jQuery(
					"<input>",
					{
						"name": "typeOfPackedAlbum_" + iString,
						"value": typeOfPackedAlbum,
						"type": "hidden"
					}
				)
			);
		}

		newForm.append(
			jQuery(
				"<input>",
				{
					"name": "selectorClickedToOpenTheMap",
					"value": selectorClickedToOpenTheMap,
					"type": "hidden"
				}
			)
		);

		let currentAlbumIs = "";
		if (currentAlbum === mapAlbum)
			currentAlbumIs = "mapAlbum";
		else if (currentAlbum === selectionAlbum)
			currentAlbumIs = "selectionAlbum";
		newForm.append(
			jQuery(
				"<input>",
				{
					"name": "currentAlbumIs",
					"value": currentAlbumIs,
					"type": "hidden"
				}
			)
		);

		if (PhotoFloat.guessedPasswordsMd5.length) {
			newForm.append(
				jQuery(
					"<input>",
					{
						"name": "guessedPasswordsMd5",
						"value": PhotoFloat.guessedPasswordsMd5.join('-'),
						"type": "hidden"
					}
				)
			).append(
				jQuery(
					"<input>",
					{
						"name": "guessedPasswordCodes",
						"value": PhotoFloat.guessedPasswordCodes.join('-'),
						"type": "hidden"
					}
				)
			);
		}
		newForm.hide().appendTo("body").submit().remove();
		return false;
	};

	Utilities.prototype.readPostData = function() {
		if (postData.guessedPasswordsMd5) {
			PhotoFloat.guessedPasswordsMd5 = postData.guessedPasswordsMd5.split('-');
			PhotoFloat.guessedPasswordCodes = postData.guessedPasswordCodes.split('-');
			delete postData.guessedPasswordsMd5;
		}
		selectorClickedToOpenTheMap = postData.selectorClickedToOpenTheMap;

		let stringifiedPackedAlbum, packedAlbum, albumName, uncompressedAlbum;
		let index = 0;

		while (postData.hasOwnProperty("albumName_" + index.toString())) {
			albumName = postData["albumName_" + index.toString()];
			stringifiedPackedAlbum = postData["stringifiedPackedAlbum_" + index.toString()];
			if (postData["typeOfPackedAlbum_" + index.toString()] === "array") {
				packedAlbum = stringifiedPackedAlbum.split(',').map(x => parseInt(x, 10));
			} else {
				packedAlbum = stringifiedPackedAlbum;
			}
			uncompressedAlbum = new Album(JSON.parse(lzwCompress.unpack(packedAlbum)));
			if (albumName === "mapAlbum") {
				mapAlbum = uncompressedAlbum;
			} else if (albumName === "selectionAlbum") {
				selectionAlbum = uncompressedAlbum;
			}
			index ++;
		}
		if (postData.currentAlbumIs === "mapAlbum")
			currentAlbum = mapAlbum;
		else if (postData.currentAlbumIs === "selectionAlbum")
			currentAlbum = selectionAlbum;
		// invalidate the variable so that it's not used any more
		postData = null;
	};

	Utilities.initializeOrGetMapRootAlbum = function() {
		// prepare the root of the map albums and put it in the cache
		var rootMapAlbum = cache.getAlbum(Options.by_map_string);
		if (! rootMapAlbum) {
			rootMapAlbum = new Album(Options.by_map_string);
			cache.putAlbum(rootMapAlbum);
		}
		// rootMapAlbum.cacheBase = Options.by_map_string;
		// rootMapAlbum.media = [];
		// rootMapAlbum.numsMedia = new ImagesAndVideos();
		// rootMapAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// rootMapAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// rootMapAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// rootMapAlbum.subalbums = [];
		// rootMapAlbum.positionsAndMediaInTree = [];
		// rootMapAlbum.numPositionsInTree = 0;
		// rootMapAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// rootMapAlbum.ancestorsCacheBase = [Options.by_map_string];
		// rootMapAlbum.includedFilesByCodesSimpleCombination = {};
		// rootMapAlbum.includedFilesByCodesSimpleCombination[","] = false;
		return rootMapAlbum;
	};

	Utilities.prototype.initializeMapAlbum = function() {
		var rootMapAlbum = cache.getAlbum(Options.by_map_string);
		// if (! rootMapAlbum)
		// 	rootMapAlbum = Utilities.initializeOrGetMapRootAlbum();

		lastMapAlbumIndex ++;

		// initializes the map album
		var newMapAlbum = new Album(Options.by_map_string + Options.cache_folder_separator + lastMapAlbumIndex + Options.cache_folder_separator + currentAlbum.cacheBase);
		// newMapAlbum.media = [];
		// newMapAlbum.numsMedia = new ImagesAndVideos();
		// newMapAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// newMapAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// newMapAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// newMapAlbum.subalbums = [];
		// newMapAlbum.positionsAndMediaInTree = [];
		// newMapAlbum.numPositionsInTree = 0;
		// newMapAlbum.cacheBase = Options.by_map_string + Options.cache_folder_separator + lastMapAlbumIndex + Options.cache_folder_separator + currentAlbum.cacheBase;
		newMapAlbum.path = newMapAlbum.cacheBase.replace(Options.cache_folder_separator, "/");
		// newMapAlbum.physicalPath = newMapAlbum.path;
		// newMapAlbum.clickHistory = [];
		// newMapAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// newMapAlbum.includedFilesByCodesSimpleCombination = {};
		// newMapAlbum.includedFilesByCodesSimpleCombination[","] = false;


		rootMapAlbum.numsMediaInSubTree.sum(newMapAlbum.numsMediaInSubTree);
		rootMapAlbum.subalbums.push(newMapAlbum);
		rootMapAlbum.positionsAndMediaInTree.mergePositionsAndMedia(newMapAlbum.positionsAndMediaInTree);
		rootMapAlbum.numPositionsInTree = rootMapAlbum.positionsAndMediaInTree.length;
		// rootMapAlbum.numPositionsInTree += newMapAlbum.numPositionsInTree;
		rootMapAlbum.numsProtectedMediaInSubTree[","].sum(newMapAlbum.numsProtectedMediaInSubTree[","]);

		newMapAlbum.ancestorsCacheBase = rootMapAlbum.ancestorsCacheBase.slice();
		newMapAlbum.ancestorsCacheBase.push(newMapAlbum.cacheBase);

		return newMapAlbum;
	};

	Utilities.prototype.initializeSearchAlbumBegin = function(albumHash) {
		var newSearchAlbum = new Album(albumHash);
		// newSearchAlbum.positionsAndMediaInTree = [];
		// newSearchAlbum.media = [];
		// newSearchAlbum.subalbums = [];
		// newSearchAlbum.numsMedia = new ImagesAndVideos();
		// newSearchAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// newSearchAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// newSearchAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// newSearchAlbum.cacheBase = albumHash;
		newSearchAlbum.path = newSearchAlbum.cacheBase.replace(Options.cache_folder_separator, "/");
		// newSearchAlbum.physicalPath = newSearchAlbum.path;
		// newSearchAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// newSearchAlbum.includedFilesByCodesSimpleCombination = {};
		// newSearchAlbum.includedFilesByCodesSimpleCombination[","] = false;

		return newSearchAlbum;
	};

	Utilities.prototype.initializeSearchAlbumEnd = function() {
		var rootSearchAlbum = cache.getAlbum(Options.by_search_string);
		if (! rootSearchAlbum) {
			rootSearchAlbum = new Album(Options.by_search_string);
			cache.putAlbum(rootSearchAlbum);
		}

		rootSearchAlbum.numsMediaInSubTree.sum(searchAlbum.numsMediaInSubTree);
		// rootSearchAlbum.subalbums.push(newSearchAlbum);
		rootSearchAlbum.positionsAndMediaInTree.mergePositionsAndMedia(searchAlbum.positionsAndMediaInTree);
		rootSearchAlbum.numPositionsInTree = rootSearchAlbum.positionsAndMediaInTree.length;
		// rootSearchAlbum.numPositionsInTree += searchAlbum.numPositionsInTree;
		rootSearchAlbum.numsProtectedMediaInSubTree[","].sum(searchAlbum.numsProtectedMediaInSubTree[","]);

		searchAlbum.ancestorsCacheBase = rootSearchAlbum.ancestorsCacheBase.slice();
		searchAlbum.ancestorsCacheBase.push(searchAlbum.cacheBase);
	};

	Utilities.initializeSelectionRootAlbum = function() {
		// prepare the root of the selections albums and put it in the cache
		var rootSelectionAlbum = cache.getAlbum(Options.by_selection_string);
		if (! rootSelectionAlbum) {
			rootSelectionAlbum = new Album(Options.by_selection_string);
			cache.putAlbum(rootSelectionAlbum);
		}
		// rootSelectionAlbum.cacheBase = Options.by_selection_string;
		// rootSelectionAlbum.media = [];
		// rootSelectionAlbum.numsMedia = new ImagesAndVideos();
		// rootSelectionAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// rootSelectionAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// rootSelectionAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// rootSelectionAlbum.subalbums = [];
		// rootSelectionAlbum.positionsAndMediaInTree = [];
		// rootSelectionAlbum.numPositionsInTree = 0;
		// rootSelectionAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// rootSelectionAlbum.ancestorsCacheBase = [Options.by_selection_string];
		// rootSelectionAlbum.includedFilesByCodesSimpleCombination = {};
		// rootSelectionAlbum.includedFilesByCodesSimpleCombination[","] = false;

		return rootSelectionAlbum;
	};

	Utilities.initializeSelectionAlbum = function() {
		// initializes the selection album

		var rootSelectionAlbum = cache.getAlbum(Options.by_selection_string);
		// if (! rootSelectionAlbum)
		// 	rootSelectionAlbum = Utilities.initializeSelectionRootAlbum();

		lastSelectionAlbumIndex ++;

		selectionAlbum = new Album(Options.by_selection_string + Options.cache_folder_separator + lastSelectionAlbumIndex);
		// newSelectionAlbum.media = [];
		// newSelectionAlbum.numsMedia = new ImagesAndVideos();
		// newSelectionAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// newSelectionAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// newSelectionAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// newSelectionAlbum.subalbums = [];
		// newSelectionAlbum.positionsAndMediaInTree = [];
		// newSelectionAlbum.numPositionsInTree = 0;
		// newSelectionAlbum.cacheBase = Options.by_selection_string + Options.cache_folder_separator + lastSelectionAlbumIndex;
		selectionAlbum.path = selectionAlbum.cacheBase.replace(Options.cache_folder_separator, "/");
		// newSelectionAlbum.physicalPath = newSelectionAlbum.path;
		// newSelectionAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// newSelectionAlbum.includedFilesByCodesSimpleCombination = {};
		// newSelectionAlbum.includedFilesByCodesSimpleCombination[","] = false;

		rootSelectionAlbum.numsMediaInSubTree.sum(selectionAlbum.numsMediaInSubTree);
		rootSelectionAlbum.subalbums.push(selectionAlbum);
		rootSelectionAlbum.positionsAndMediaInTree.mergePositionsAndMedia(selectionAlbum.positionsAndMediaInTree);
		rootSelectionAlbum.numPositionsInTree = rootSelectionAlbum.positionsAndMediaInTree.length;
		// rootSelectionAlbum.numPositionsInTree += selectionAlbum.numPositionsInTree;
		rootSelectionAlbum.numsProtectedMediaInSubTree[","].sum(selectionAlbum.numsProtectedMediaInSubTree[","]);

		selectionAlbum.ancestorsCacheBase = rootSelectionAlbum.ancestorsCacheBase.slice();
		selectionAlbum.ancestorsCacheBase.push(selectionAlbum.cacheBase);
	};

	Utilities._t = function(id) {
		language = Utilities.getLanguage();
		if (translations[language][id])
			return translations[language][id];
		else
			return translations.en[id];
	};

	Utilities.prototype.convertProtectedCacheBaseToCodesSimpleCombination = function(protectedCacheBase) {
		var protectedDirectory = protectedCacheBase.split("/")[0];
		var [albumMd5, mediaMd5] = protectedDirectory.substring(Options.protected_directories_prefix.length).split(',');
		if (albumMd5 && mediaMd5)
			return [Utilities.convertMd5ToCode(albumMd5), Utilities.convertMd5ToCode(mediaMd5)].join(',');
		else if (albumMd5)
			return [Utilities.convertMd5ToCode(albumMd5), ''].join(',');
		else if (mediaMd5)
			return ['', Utilities.convertMd5ToCode(mediaMd5)].join(',');
		else
			return "";
	};

	Utilities.prototype.convertProtectedDirectoryToCodesSimpleCombination = function(protectedDirectory) {
		var [albumMd5, mediaMd5] = protectedDirectory.substring(Options.protected_directories_prefix.length).split(',');
		if (albumMd5 && mediaMd5)
			return [Utilities.convertMd5ToCode(albumMd5), Utilities.convertMd5ToCode(mediaMd5)].join(',');
		else if (albumMd5)
			return [Utilities.convertMd5ToCode(albumMd5), ''].join(',');
		else if (mediaMd5)
			return ['', Utilities.convertMd5ToCode(mediaMd5)].join(',');
		else
			return "";
	};

	Utilities.prototype.translate = function() {
		var selector, keyLanguage;

		language = Utilities.getLanguage();
		for (var key in translations.en) {
			if (translations[language].hasOwnProperty(key) || translations.en.hasOwnProperty(key)) {
				keyLanguage = language;
				if (! translations[language].hasOwnProperty(key))
					keyLanguage = 'en';

				if (key == '.title-string' && document.title.substr(0, 5) != "<?php")
					// don't set page title, php has already set it
					continue;
				selector = $(key);
				if (selector.length) {
					selector.html(translations[keyLanguage][key]);
				}
			}
		}
	};

	Utilities.getLanguage = function() {
		language = "en";
		if (Options.language && translations[Options.language] !== undefined)
			language = Options.language;
		else {
			var userLang = navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage;
			userLang = userLang.split('-')[0];
			if (translations[userLang] !== undefined)
				language = userLang;
		}
		return language;
	};

	Album.prototype.numPasswords = function(unveiledOnly = false) {
		var codes = [];
		for (let codesComplexCombination in this.numsProtectedMediaInSubTree) {
			if (this.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombination) && codesComplexCombination !== ",") {
				var albumCombination = codesComplexCombination.split(',')[0];
				var mediaCombination = codesComplexCombination.split(',')[1];
				let combinations = [albumCombination, mediaCombination];
				for (let i = 0; i < combinations.length; i ++) {
					if (combinations[i]) {
						let combinationList = combinations[i].split('-');
						if (unveiledOnly) {
							for (let j = 0; j < combinationList.length; j ++) {
								if (PhotoFloat.guessedPasswordCodes.includes(combinationList[j]))
									combinationList.splice(j, 1);
							}
						}
						codes = Utilities.arrayUnion(codes, combinationList);
					}

				}
			}
		}
		return codes.length;
	};

	Utilities.prototype.detectScrollbarWidth = function() {
		// from https://davidwalsh.name/detect-scrollbar-width

		// Create the measurement node
		var scrollDiv = document.createElement("div");
		scrollDiv.className = "scrollbar-measure";
		document.body.appendChild(scrollDiv);

		// Get the scrollbar width
		var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

		// Delete the DIV
		document.body.removeChild(scrollDiv);
		return scrollbarWidth;
	};

	Utilities.cloneObject = function(object) {
		var copy = Object.assign({}, object);
		Object.keys(copy).forEach(
			function(key) {
				if (typeof copy[key] === "object")
					copy[key] = Utilities.cloneObject(copy[key]);
			}
		);
		return copy;
	};

	Utilities.prototype.arrayIntersect = function(a, b) {
		if (b.length > a.length) {
			// indexOf to loop over shorter
			[a, b] = [b, a];
		}

		let intersection = [];
		for (let i = 0; i < b.length; i ++) {
			if (a.indexOf(b[i]) !== -1)
				intersection.push(b[i]);
		}

		return intersection;
	};

	Utilities.prototype.intersect = function(a, b) {
		if (b.length > a.length) {
			// indexOf to loop over shorter
			[a, b] = [b, a];
		}
		var property = 'albumName';
		if (a.length && ! a[0].hasOwnProperty('albumName'))
			// searched albums hasn't albumName property
			property = 'path';

		return a.filter(
			function (e) {
				for (var i = 0; i < b.length; i ++) {
					var first = b[i][property];
					var second = e[property];
					if (property == 'albumName') {
						first = Utilities.pathJoin([first, b[i].name]);
						second = Utilities.pathJoin([second, e.name]);
					}
					if (this.normalizeAccordingToOptions(first) == this.normalizeAccordingToOptions(second))
						return true;
				}
				return false;
			}
		);
	};

	PositionsAndMedia.prototype.addPositionAndMedia = function(newPositionAndMedia) {
		var positionAndMedia, newMediaNameListElement;
		for (var iOld = 0; iOld < this.length; iOld ++) {
			positionAndMedia = this[iOld];
			if (newPositionAndMedia.lng == positionAndMedia.lng && newPositionAndMedia.lat == positionAndMedia.lat) {
				for (var iNew = 0; iNew < newPositionAndMedia.mediaNameList.length; iNew ++) {
					newMediaNameListElement = newPositionAndMedia.mediaNameList[iNew];
					// the following check is needed for searches only?
					if (
						positionAndMedia.mediaNameList.every(
							function(mediaNameListElement) {
								return mediaNameListElement.albumCacheBase != newMediaNameListElement.albumCacheBase || mediaNameListElement.cacheBase != newMediaNameListElement.cacheBase;
							}
						)
					)
						this[iOld].mediaNameList.push(newPositionAndMedia.mediaNameList[iNew]);
				}
				// return positionsAndMedia;
				return;
			}
		}
		this.push(newPositionAndMedia);
		// return positionsAndMedia;
	};

	PositionAndMedia.prototype.matchPosition = function(positionAndMedia2) {
		return (JSON.stringify([this.lat, this.lng]) === JSON.stringify([positionAndMedia2.lat, positionAndMedia2.lng]));
	};

	PositionsAndMedia.prototype.mergePositionsAndMedia = function(newPositionsAndMedia) {
		for (var i = 0; i < newPositionsAndMedia.length; i ++) {
			this.addPositionAndMedia(newPositionsAndMedia[i]);
		}
		// return positionsAndMedia;
	};

	PositionsAndMedia.prototype.removePositionsAndMedia = function(positionsAndMediaToRemove) {
		for (let indexPositions = positionsAndMediaToRemove.length - 1; indexPositions >= 0; indexPositions --) {
			let positionAndMediaToRemove = positionsAndMediaToRemove[indexPositions];
			this.removePositionAndMedia(positionAndMediaToRemove);
		}
	};

	SingleMedia.prototype.positionAndMedia = function() {
		return new PositionAndMedia(
			{
				'lng': parseFloat(this.metadata.longitude),
				'lat' : parseFloat(this.metadata.latitude),
				'mediaNameList': [
					{
						'name': Utilities.pathJoin([this.albumName, this.name]),
						'cacheBase': this.cacheBase,
						'albumCacheBase': this.parent.cacheBase,
						'foldersCacheBase': this.foldersCacheBase
					}
				]
			}
		);
	};

	PositionsAndMedia.prototype.addSingleMediaToPositionsAndMedia = function(singleMedia) {
		this.addPositionAndMedia(singleMedia.positionAndMedia());
	};

	PositionsAndMedia.prototype.removeSingleMedia = function(singleMedia) {
		this.removePositionAndMedia(singleMedia.positionAndMedia());
	};

	PositionsAndMedia.prototype.removePositionAndMedia = function(positionAndMediaToRemove) {
		var matchingPositionAndMediaIndex = -1;
		var matchingMediaIndexes = [];
		var self = this;

		this.some(
			function(positionAndMedia, positionAndMediaIndex) {
				matchingPositionAndMediaIndex = positionAndMediaIndex;
				if (positionAndMedia.matchPosition(positionAndMediaToRemove)) {
					positionAndMediaToRemove.mediaNameList.forEach(
						function(mediaNameListToRemoveElement) {
							for (let index = positionAndMedia.mediaNameList.length - 1; index >= 0; index --) {
								mediaNameListElement = positionAndMedia.mediaNameList[index];
								if (
									mediaNameListElement.albumCacheBase === mediaNameListToRemoveElement.albumCacheBase &&
									mediaNameListElement.cacheBase === mediaNameListToRemoveElement.cacheBase
								) {
									matchingMediaIndexes.push(index);
								}
							}
						}
					);
					return true;
				} else {
					return false;
				}
			}
		);

		if (matchingPositionAndMediaIndex !== -1) {
			if (this[matchingPositionAndMediaIndex].mediaNameList.length === matchingMediaIndexes.length) {
				this.splice(matchingPositionAndMediaIndex, 1);
			} else {
				matchingMediaIndexes.forEach(
					function(index) {
						self[matchingPositionAndMediaIndex].mediaNameList.splice(index, 1);
					}
				);
			}
		}
	};

	Album.prototype.recursivelySelectMedia = function() {
		var self = this;
		return new Promise(
			function (resolve_promise) {
				self.addAllMediaToSelection();
				let promises = [];
				for (let iSubalbum = 0; iSubalbum < self.subalbums.length; iSubalbum ++) {
					let ithPromise = new Promise(
						function(resolve_ithPromise) {
							let convertSubalbumPromise = self.convertSubalbum(iSubalbum, null, {getMedia: true, getPositions: false});
							convertSubalbumPromise.then(
								function(iSubalbum) {
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
				for (let iSubalbum = 0; iSubalbum < self.subalbums.length; iSubalbum ++) {
					let ithPromise = new Promise(
						function(resolve_ithPromise) {
							let convertSubalbumPromise = self.convertSubalbum(iSubalbum, null, {getMedia: true, getPositions: false});
							convertSubalbumPromise.then(
								function(iSubalbum) {
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
					for (let iSubalbum = 0; iSubalbum < self.subalbums.length; iSubalbum ++) {
						let ithPromise = new Promise(
							function(resolve_ithPromise, reject_ithPromise) {
								let convertSubalbumPromise = self.convertSubalbum(iSubalbum, null, {getMedia: true, getPositions: false});
								convertSubalbumPromise.then(
									function(iSubalbum) {
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


	Utilities.prototype.union = function(a, b) {
		var self = this;
		if (a === [])
			return b;
		if (b === [])
			return a;
		// begin cloning the first array
		var union = a.slice(0);

		var property = 'albumName';
		if (a.length && ! a[0].hasOwnProperty('albumName'))
			// searched albums hasn't albumName property
			property = 'path';

		for (var i = 0; i < b.length; i ++) {
			if (! a.some(
				function (e) {
					var first = b[i][property];
					var second = e[property];
					if (property == 'albumName') {
						first = Utilities.pathJoin([first, b[i].name]);
						second = Utilities.pathJoin([second, e.name]);
					}
					return self.normalizeAccordingToOptions(first) == self.normalizeAccordingToOptions(second);
				})
			)
				union.push(b[i]);
		}
		return union;
	};

	Utilities.arrayUnion = function(a, b, equalityFunction = null) {
		if (! a.length)
			return b;
		if (! b.length)
			return a;
		// begin cloning the first array
		var union = a.slice(0);
		var i;

		if (equalityFunction === null) {
			for (i = 0; i < b.length; i ++) {
				if (union.indexOf(b[i]) == -1)
					union.push(b[i]);
			}
		} else {
			for (i = 0; i < b.length; i ++) {
				if (
					a.every(
						function notEqual(element) {
							return ! equalityFunction(element, b[i]);
						}
					)
				)
					union.push(b[i]);
			}
		}
		return union;
	};

	Utilities.prototype.normalizeAccordingToOptions = function(object) {
		var string = object;
		if (typeof object === "object")
			string = string.join('|');

		if (! Options.search_case_sensitive)
			string = string.toLowerCase();
		if (! Options.search_accent_sensitive)
			string = this.removeAccents(string);

		if (typeof object === "object")
			object = string.split('|');
		else
			object = string;

		return object;
	};

	Utilities.prototype.removeAccents = function(string) {
		string = string.normalize('NFD');
		var stringArray = Array.from(string);
		var resultString = '';
		for (var i = 0; i < stringArray.length; i ++) {
			if (Options.unicode_combining_marks.indexOf(stringArray[i]) == -1)
				resultString += stringArray[i];
		}
		return resultString;
	};

	Utilities.pathJoin = function(pathArr) {
		var result = '';
		for (var i = 0; i < pathArr.length; ++i) {
			if (i < pathArr.length - 1 && pathArr[i] && pathArr[i][pathArr[i].length - 1] != "/")
				pathArr[i] += '/';
			if (i && pathArr[i] && pathArr[i][0] == "/")
				pathArr[i] = pathArr[i].slice(1);
			result += pathArr[i];
		}
		return result;
	};

	// see https://stackoverflow.com/questions/1069666/sorting-javascript-object-by-property-value
	Utilities.sortBy = function(albumOrMediaList, fieldArray) {
		albumOrMediaList.sort(
			function(a,b) {
				var aValue, bValue, iField;
				for (iField = 0; iField < fieldArray.length; iField ++) {
					if (a.hasOwnProperty(fieldArray[iField])) {
						aValue = a[fieldArray[iField]].toLowerCase();
						break;
					}
				}
				for (iField = 0; iField < fieldArray.length; iField ++) {
					if (b.hasOwnProperty(fieldArray[iField])) {
						bValue = b[fieldArray[iField]].toLowerCase();
						break;
					}
				}
				return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
			}
		);
	};

	Media.prototype.sortBy = function(fieldArray) {
		Utilities.sortBy(this, fieldArray);
	};

	Media.prototype.sortByName = function() {
		this.sortBy(['name']);
	};

	Album.prototype.sortByPath = function() {
		if (this.subalbums.length) {
			if (this.isSelection()) {
				Utilities.sortBy(this.subalbums, ['selectionAlbumNameSorting']);
				// this.subalbums = Utilities.sortBy(this.subalbums, ['altName', 'name', 'path']);
			} else if (this.isByGps()) {
				if (this.subalbums[0].hasOwnProperty('altName'))
					Utilities.sortBy(this.subalbums, ['altName']);
				else
					Utilities.sortBy(this.subalbums, ['name']);
			} else {
				Utilities.sortBy(this.subalbums, ['path']);
			}
		}
	};

	Media.prototype.sortByDate = function () {
		this.sort(
			function(a,b) {
				return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
			}
		);
	};

	Utilities.sortByDate = function (subalbums) {
		subalbums.sort(
			function(a,b) {
				return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
			}
		);
	};

	Media.prototype.sortReverse = function() {
		this.reverse();
	};

	Utilities.isSearchRootCacheBase = function(cacheBase) {
		return cacheBase.indexOf(Options.by_search_string) === 0 && cacheBase.split(Options.cache_folder_separator).length === 3;
	};

	Utilities.isMapRootCacheBase = function(cacheBase) {
		return cacheBase.indexOf(Options.by_map_string) === 0 && cacheBase.split(Options.cache_folder_separator).length === 3;
	};

	Utilities.isSelectionRootCacheBase = function(cacheBase) {
		return cacheBase.indexOf(Options.by_selection_string) === 0 && cacheBase.split(Options.cache_folder_separator).length === 2;
	};

	Utilities.isAnyRootHash = function(hash) {
		var cacheBase = hash;
		if (hash.indexOf(hashBeginning) === 0)
			cacheBase = hash.substring(hashBeginning);
		return Utilities.isAnyRootCacheBase(cacheBase);
	};

	Utilities.isAnyRootCacheBase = function(cacheBase) {
		var result =
			[Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(cacheBase) !== -1 ||
			Utilities.isSearchRootCacheBase(cacheBase) ||
			Utilities.isMapRootCacheBase(cacheBase) ||
			Utilities.isSelectionRootCacheBase(cacheBase);
		return result;
	};

	Album.prototype.isAnyRoot = function() {
		return Utilities.isAnyRootCacheBase(this.cacheBase);
	};

	Utilities.prototype.trimExtension = function(name) {
		var index = name.lastIndexOf(".");
		if (index !== -1)
			return name.substring(0, index);
		return name;
	};

	Utilities.isFolderCacheBase = function(string) {
		return string == Options.folders_string || string.indexOf(Options.foldersStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isFolder = function() {
		return Utilities.isFolderCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isFolder = function() {
		return Utilities.isFolderCacheBase(this.cacheBase);
	};

	Utilities.isByDateCacheBase = function(string) {
		return string == Options.by_date_string || string.indexOf(Options.byDateStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isByDate = function() {
		return Utilities.isByDateCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isByDate = function() {
		return Utilities.isByDateCacheBase(this.cacheBase);
	};

	Utilities.isByGpsCacheBase = function(string) {
		return string == Options.by_gps_string || string.indexOf(Options.byGpsStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isByGps = function() {
		return Utilities.isByGpsCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isByGps = function() {
		return Utilities.isByGpsCacheBase(this.cacheBase);
	};

	Utilities.isSearchCacheBase = function(string) {
		return string.indexOf(Options.bySearchStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isSearch = function() {
		return Utilities.isSearchCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isSearch = function() {
		return Utilities.isSearchCacheBase(this.cacheBase);
	};

	Utilities.isSelectionCacheBase = function(string) {
		return string.indexOf(Options.bySelectionStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isSelection = function() {
		return Utilities.isSelectionCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isSelection = function() {
		return Utilities.isSelectionCacheBase(this.cacheBase);
	};

	Utilities.isMapCacheBase = function(string) {
		return string.indexOf(Options.byMapStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isMap = function() {
		return Utilities.isMapCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isMap = function() {
		return Utilities.isMapCacheBase(this.cacheBase);
	};

	Utilities.prototype.isSearchHash = function() {
		var hash = PhotoFloat.cleanHash(location.hash);
		var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(hash);
		if (Utilities.isSearchCacheBase(hash) || savedSearchAlbumHash !== null)
			return true;
		else
			return false;
	};

	// Utilities.prototype.isMapHash = function(hash) {
	// 	hash = PhotoFloat.cleanHash(hash);
	// 	var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(hash);
	// 	if (this.isMapCacheBase(hash) || savedSearchAlbumHash !== null)
	// 		return true;
	// 	else
	// 		return false;
	// };

	Utilities.prototype.noResults = function(album, selector) {
		// no media found or other search fail, show the message
		currentAlbum = album;
		TopFunctions.setTitle("album", null);
		$("ul#right-menu").addClass("expand");
		$("#album-view #subalbums, #album-view #thumbs").addClass("hidden");
		$("#media-view").addClass("hidden");
		$("#loading").hide();
		if (typeof selector === "undefined")
			selector = '#no-results';
		$(".search-failed").hide();
		$(selector).stop().fadeIn(1000);
		// $(selector).fadeOut(4000);
	};

	Utilities.prototype.focusSearchField = function() {
		if (! isMobile.any()) {
			$("#search-field").focus();
		} else {
			$("#search-field").blur();
		}
		$("ul#right-menu li.search ul").removeClass("hidden");
	};

	Utilities.prototype.stripHtmlAndReplaceEntities = function(htmlString) {
		// converto for for html page title
		// strip html (https://stackoverflow.com/questions/822452/strip-html-from-text-javascript#822464)
		// and replaces &raquo; with \u00bb
		return htmlString.replace(/<(?:.|\n)*?>/gm, '').replace(/&raquo;/g, '\u00bb');
	};

	Utilities.transformAltPlaceName = function(altPlaceName) {
		var underscoreIndex = altPlaceName.lastIndexOf('_');
		if (underscoreIndex != -1) {
			var number = altPlaceName.substring(underscoreIndex + 1);
			var base = altPlaceName.substring(0, underscoreIndex);
			return base + ' (' + Utilities._t('.subalbum') + parseInt(number) + ')';
		} else {
			return altPlaceName;
		}
	};

	Utilities.prototype.albumButtonWidth = function(thumbnailWidth, buttonBorder) {
			if (Options.albums_slide_style)
				return Math.round((thumbnailWidth + 2 * buttonBorder) * 1.1);
			else
				return thumbnailWidth + 2 * buttonBorder;
	};

	Utilities.prototype.removeFolderMarker = function (cacheBase) {
		if (this.isFolderCacheBase(cacheBase)) {
			cacheBase = cacheBase.substring(Options.folders_string.length);
			if (cacheBase.length > 0)
				cacheBase = cacheBase.substring(1);
		}
		return cacheBase;
	};

	SingleMedia.prototype.hasGpsData = function() {
		return this.mimeType.indexOf("image") === 0 && typeof this.metadata.latitude !== "undefined";
	};


	SingleMedia.prototype.isInMapAlbum = function() {
		if (! Utilities.somethingIsInMapAlbum())
			return false;
		else {
			var index = mapAlbum.media.findIndex(x => x.foldersCacheBase === this.foldersCacheBase && x.cacheBase === this.cacheBase);
			if (index > -1)
				return true;
			else
				return false;
		}
	};

	SingleMedia.prototype.isSearched = function() {
		if (! Utilities.somethingIsSearched())
			return false;
		else {
			var index = searchAlbum.media.findIndex(x => x.foldersCacheBase === this.foldersCacheBase && x.cacheBase === this.cacheBase);
			if (index > -1)
				return true;
			else
				return false;
		}
	};

	SingleMedia.prototype.isInFoundAlbum = function() {
		if (! Utilities.somethingIsSearched())
			return false;
		else {
			var foundAlbum = searchAlbum.subalbums.find(x => this.foldersCacheBase.indexOf(x.cacheBase) === 0);
			if (foundAlbum !== undefined)
				return foundAlbum;
			else
				return false;
		}
	};

	Utilities.somethingIsInMapAlbum = function() {
		if (mapAlbum.hasOwnProperty("numsMediaInSubTree") && mapAlbum.numsMediaInSubTree.imagesAndVideosTotal())
			return true;
		else
			return false;
	};

	Utilities.somethingIsSearched = function() {
		if (
			searchAlbum.hasOwnProperty("numsMediaInSubTree") && searchAlbum.numsMediaInSubTree.imagesAndVideosTotal() ||
			searchAlbum.hasOwnProperty("subalbums") && searchAlbum.subalbums.length
		)
			return true;
		else
			return false;
	};

	Utilities.nothingIsSelected = function() {
		if (selectionAlbum.isEmpty()) {
			return true;
		} else {
			if (selectionAlbum.media.length || selectionAlbum.subalbums.length)
				return false;
			else
				return true;
		}
	};

	SingleMedia.prototype.isSelected = function() {
		if (selectionAlbum.isEmpty()) {
			return false;
		} else {
			var index = selectionAlbum.media.findIndex(x => x.foldersCacheBase === this.foldersCacheBase && x.cacheBase === this.cacheBase);
			if (index > -1)
				return true;
			else
				return false;
		}
	};

	Utilities.albumIsSelected = function(album) {
		if (selectionAlbum.isEmpty()) {
			return false;
		} else {
			var index = selectionAlbum.subalbums.findIndex(x => x.cacheBase === album.cacheBase);
			if (index > -1)
				return true;
			else
				return false;
		}
	};

	Album.prototype.isSelected = function() {
		return Utilities.albumIsSelected(this);
	};

	Subalbum.prototype.isSelected = function() {
		return Utilities.albumIsSelected(this);
	};

	// Media.prototype.someMediaIsSelected = function() {
	// 	if (selectionAlbum.isEmpty())
	// 		return false;
	// 	if (
	// 		this.some(
	// 			function(singleMedia) {
	// 				return singleMedia.isSelected();
	// 			}
	// 		)
	// 	) {
	// 		return true;
	// 	} else {
	// 		return false;
	// 	}
	// };

	Album.prototype.everyMediaIsSelected = function() {
		if (selectionAlbum.isEmpty()) {
			Utilities.initializeSelectionAlbum();
			return false;
		} else {
			if (
				this.media.every(
					function(singleMedia) {
						return singleMedia.isSelected();
					}
				)
			) {
				return true;
			} else {
				return false;
			}
		}
	};

	// Subalbums.prototype.someSubalbumIsSelected = function() {
	// 	if (selectionAlbum.isEmpty()) {
	// 		Utilities.initializeSelectionAlbum();
	// 		return false;
	// 	} else {
	// 		if (
	// 			this.some(
	// 				function(subalbum) {
	// 					return subalbum.isSelected();
	// 				}
	// 			)
	// 		) {
	// 			return true;
	// 		} else {
	// 			return false;
	// 		}
	// 	}
	// };

	Album.prototype.everySubalbumIsSelected = function() {
		if (selectionAlbum.isEmpty()) {
			Utilities.initializeSelectionAlbum();
			return false;
		} else {
			if (
				this.subalbums.every(
					function(subalbum) {
						return subalbum.isSelected();
					}
				)
			) {
				return true;
			} else {
				return false;
			}
		}
	};

	Album.prototype.addAllMediaToSelection = function() {
		for (let indexMedia = this.media.length - 1; indexMedia >= 0; indexMedia --) {
			let singleMedia = this.media[indexMedia];
			singleMedia.addToSelection("#media-select-box-" + indexMedia);
		}
	};

	Album.prototype.removeAllMediaFromSelection = function() {
		if (this !== undefined) {
			for (let indexMedia = this.media.length - 1; indexMedia >= 0; indexMedia --) {
				let singleMedia = this.media[indexMedia];
				singleMedia.removeFromSelection("#media-select-box-" + indexMedia);
			}
		}
	};

	Album.prototype.addAllSubalbumsToSelection = function() {
		var self = this;
		return new Promise(
			function(resolve_addAllSubalbums) {
				var subalbumsPromises = [];
				for (let indexSubalbum = self.subalbums.length - 1; indexSubalbum >= 0; indexSubalbum --) {
					let addSubalbumPromise = self.addSubalbumToSelection(indexSubalbum, "#subalbum-select-box-" + indexSubalbum);
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
					for (let indexSubalbum = self.subalbums.length - 1; indexSubalbum >= 0; indexSubalbum --) {
						let subalbum = self.subalbums[indexSubalbum];
						let removeSubalbumPromise = self.removeSubalbumFromSelection(indexSubalbum, "#subalbum-select-box-" + indexSubalbum);
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


	SingleMedia.prototype.addToSelection = function(clickedSelector) {
		if (! this.isSelected()) {
			if (selectionAlbum.isEmpty())
				Utilities.initializeSelectionAlbum();
			// this.parent = selectionAlbum;
			selectionAlbum.media.push(this);

			if (this.hasGpsData()) {
				// add the media position
				selectionAlbum.positionsAndMediaInTree.addSingleMediaToPositionsAndMedia(this);
				selectionAlbum.numPositionsInTree = selectionAlbum.positionsAndMediaInTree.length;
			}
			var singleMediaArray = new Media([this]);
			selectionAlbum.numsMedia.sum(singleMediaArray.imagesAndVideosCount());
			selectionAlbum.numsMediaInSubTree.sum(singleMediaArray.imagesAndVideosCount());
			selectionAlbum.sizesOfAlbum.sum(this.fileSizes);
			selectionAlbum.sizesOfSubTree.sum(this.fileSizes);

			selectionAlbum.media.sortByDate();
			selectionAlbum.mediaNameSort = false;
			selectionAlbum.mediaReverseSort = false;
			selectionAlbum.initializeSortPropertiesAndCookies();
			selectionAlbum.sortAlbumsMedia();

			// update the selector
			$(clickedSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-single-media"));
			var singleMediaSelector = "#media-select-box";
			var otherSelector;
			if (clickedSelector === singleMediaSelector) {
				otherSelector = singleMediaSelector + "-" + currentMediaIndex + " img";
				if ($(otherSelector).is(":visible")) {
					$(otherSelector).attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-single-media"));
				}
			} else if (parseInt(clickedSelector.substring(singleMediaSelector.length + 1)) === currentMediaIndex && $(singleMediaSelector).is(":visible")) {
				$(singleMediaSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-single-media"));
			}
		}

	};

	SingleMedia.prototype.removeFromSelection = function(clickedSelector) {
		if (this.isSelected()) {
			var index = selectionAlbum.media.findIndex(x => x.foldersCacheBase === this.foldersCacheBase && x.cacheBase === this.cacheBase);
			selectionAlbum.media.splice(index, 1);

			selectionAlbum.positionsAndMediaInTree.removeSingleMedia(this);
			var singleMediaArray = new Media([this]);
			selectionAlbum.numPositionsInTree = selectionAlbum.positionsAndMediaInTree.length;
			selectionAlbum.numsMedia.subtract(singleMediaArray.imagesAndVideosCount());
			selectionAlbum.numsMediaInSubTree.subtract(singleMediaArray.imagesAndVideosCount());
			selectionAlbum.sizesOfAlbum.subtract(this.fileSizes);
			selectionAlbum.sizesOfSubTree.subtract(this.fileSizes);

			var singleMediaSelector = "#media-select-box";
			var otherSelector;
			if (clickedSelector === singleMediaSelector) {
				otherSelector = singleMediaSelector + "-" + currentMediaIndex + " img";
				if ($(otherSelector).is(":visible")) {
					$(otherSelector).attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-single-media"));
				}
			} else if (parseInt(clickedSelector.substring(singleMediaSelector.length + 1)) === currentMediaIndex && $(singleMediaSelector).is(":visible")) {
				$(singleMediaSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-single-media"));
			}

			if (currentAlbum.isSelection()) {
				if (Utilities.nothingIsSelected()) {
					Utilities.initializeSelectionAlbum();
					window.location.href = Utilities.upHash();
				} else if (currentMedia === null) {
					if (currentAlbum.isAlbumWithOneMedia()) {
						currentAlbum.prepareForShowing(0);
					} else {
						TopFunctions.showAlbum("refreshMedia");
					}
				} else {
					let clickedMediaIndex = parseInt(clickedSelector.split('-').pop());
					if (clickedSelector === singleMediaSelector || clickedMediaIndex === currentMediaIndex) {
						currentAlbum.prepareForShowing(-1);
					} else {
						if (currentMediaIndex === currentAlbum.media.length)
							currentMediaIndex -= 1;
						currentAlbum.prepareForShowing(currentMediaIndex);
					}
				}
			} else {
				// update the selector
				$(clickedSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-single-media"));
			}
		}
	};

	Album.prototype.addSubalbumToSelection = function(iSubalbum, clickedSelector) {
		var self = this;
		var subalbum = self.subalbums[iSubalbum];
		return new Promise(
			function(resolve_addSubalbum) {
				if (self.isSelected()) {
					resolve_addSubalbum();
				} else {
					let convertSubalbumPromise = self.convertSubalbum(iSubalbum, null, {getMedia: false, getPositions: true});
					convertSubalbumPromise.then(
						function(iSubalbum) {
							var subalbum = self.subalbums[iSubalbum];
							if (Utilities.nothingIsSelected())
								Utilities.initializeSelectionAlbum();
							selectionAlbum.subalbums.push(subalbum);

							selectionAlbum.positionsAndMediaInTree.mergePositionsAndMedia(subalbum.positionsAndMediaInTree);
							selectionAlbum.numPositionsInTree = selectionAlbum.positionsAndMediaInTree.length;
							// selectionAlbum.numsMedia.sum(subalbum.numsMedia);
							selectionAlbum.numsMediaInSubTree.sum(subalbum.numsMediaInSubTree);
							// selectionAlbum.sizesOfAlbum.sum(subalbum.sizesOfAlbum);
							selectionAlbum.sizesOfSubTree.sum(subalbum.sizesOfSubTree);
							selectionAlbum.numsProtectedMediaInSubTree.sum(subalbum.numsProtectedMediaInSubTree);

							subalbum.generateSubalbumNameForSelectionAlbum().then(
								function([folderName, nameSorting]) {
									subalbum.selectionAlbumName = folderName;
									// if (subalbum.hasOwnProperty("numPositionsInTree") && subalbum.numPositionsInTree)
									// 	subalbum.selectionAlbumName += positionMarker;
									subalbum.selectionAlbumNameSorting = nameSorting;

									Utilities.sortByDate(selectionAlbum.subalbums);
									selectionAlbum.albumNameSort = false;
									selectionAlbum.albumReverseSort = false;
									selectionAlbum.initializeSortPropertiesAndCookies();
									selectionAlbum.sortAlbumsMedia();
									resolve_addSubalbum();
								}
							);
						}
					);
					$(clickedSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-subalbum"));
				}
			}
		);
	};

	Album.prototype.removeSubalbumFromSelection = function(iSubalbum, clickedSelector) {
		var subalbum = this.subalbums[iSubalbum];
		var self = this;
		return new Promise(
			function(resolve_removeSubalbum) {
				if (! subalbum.isSelected()) {
					if (subalbum.isEmpty())
						Utilities.initializeSelectionAlbum();
					resolve_removeSubalbum();
				} else {
					// if (selectionAlbum.numsMediaInSubTree.imagesAndVideosTotal()) {
					let convertSubalbumPromise = self.convertSubalbum(iSubalbum, null, {getMedia: true, getPositions: true});
					convertSubalbumPromise.then(
						function(iSubalbum) {
							var subalbum = self.subalbums[iSubalbum];
							selectionAlbum.subalbums.splice(iSubalbum, 1);

							if (subalbum.positionsAndMediaInTree.length) {
								selectionAlbum.positionsAndMediaInTree.removePositionsAndMedia(subalbum.positionsAndMediaInTree);
								selectionAlbum.numPositionsInTree = selectionAlbum.positionsAndMediaInTree.length;
							}
							// selectionAlbum.numsMedia.subtract(subalbum.numsMedia);
							selectionAlbum.numsMediaInSubTree.subtract(subalbum.numsMediaInSubTree);
							// selectionAlbum.subtract(subalbum.sizesOfAlbum);
							selectionAlbum.sizesOfSubTree.subtract(subalbum.sizesOfSubTree);
							selectionAlbum.numsProtectedMediaInSubTree.subtract(subalbum.numsProtectedMediaInSubTree);

							if (currentAlbum.isSelection()) {
								if (Utilities.nothingIsSelected()) {
									Utilities.initializeSelectionAlbum();
									window.location.href = Utilities.upHash();
								} else {
									currentAlbum.prepareForShowing(-1);
								}
							}

							resolve_removeSubalbum();
						}
					);
					// }

					if (! currentAlbum.isSelection()) {
						$(clickedSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-subalbum"));
					}
				}
			}
		);
	};

	Utilities.prototype.em2px = function(selector, em) {
		var emSize = parseFloat($(selector).css("font-size"));
		return (em * emSize);
	};

	Album.prototype.isAlbumWithOneMedia = function() {
		return this !== null && ! this.subalbums.length && this.numsMedia.imagesAndVideosTotal() == 1;
	};

	Utilities.chooseReducedPhoto = function(media, container, fullScreenStatus) {
		var chosenMedia, reducedWidth, reducedHeight;
		var mediaWidth = media.metadata.size[0], mediaHeight = media.metadata.size[1];
		var mediaSize = Math.max(mediaWidth, mediaHeight);
		var mediaRatio = mediaWidth / mediaHeight, containerRatio;

		chosenMedia = media.originalMediaPath();
		maxSize = 0;

		if (container === null) {
			// try with what is more probable to be the container
			if (fullScreenStatus)
				container = $(window);
			else {
				container = $(".media-box#center .media-box-inner");
			}
		}

		containerWidth = container.width();
		containerHeight = container.height();
		containerRatio = container.width() / container.height();

		if (
			mediaRatio >= containerRatio && mediaWidth <= containerWidth * devicePixelRatio ||
			mediaRatio < containerRatio && mediaHeight <= containerHeight * devicePixelRatio
		) {
			// the original media is smaller than the container, use it
		} else {
			for (var i = 0; i < Options.reduced_sizes.length; i++) {
				if (Options.reduced_sizes[i] < mediaSize) {
					if (mediaWidth > mediaHeight) {
						reducedWidth = Options.reduced_sizes[i];
						reducedHeight = Options.reduced_sizes[i] * mediaHeight / mediaWidth;
					} else {
						reducedHeight = Options.reduced_sizes[i];
						reducedWidth = Options.reduced_sizes[i] * mediaWidth / mediaHeight;
					}

					if (
						mediaRatio > containerRatio && reducedWidth < containerWidth * devicePixelRatio ||
						mediaRatio < containerRatio && reducedHeight < containerHeight * devicePixelRatio
					)
						break;
				}
				chosenMedia = media.mediaPath(Options.reduced_sizes[i]);
				maxSize = Options.reduced_sizes[i];
			}
		}
		return chosenMedia;
	};

	SingleMedia.prototype.chooseMediaReduction = function(id, fullScreenStatus) {
		// chooses the proper reduction to use depending on the container size
		var container, mediaSrc;

		if (this.mimeType.indexOf("video") === 0) {
			if (fullScreenStatus && this.name.match(/\.avi$/) === null) {
				mediaSrc = this.originalMediaPath();
			} else {
				// .avi videos are not played by browsers, use the transcoded one
				mediaSrc = this.mediaPath("");
			}
		} else if (this.mimeType.indexOf("image") === 0) {
			if (fullScreenStatus && Modernizr.fullscreen)
				container = $(window);
			else
				container = $(".media-box#" + id + " .media-box-inner");

			mediaSrc = Utilities.chooseReducedPhoto(this, container, fullScreenStatus);
		}

		return mediaSrc;
	};

	Sizes.prototype.sum = function(sizes2) {
		var keys = Object.keys(this);
		for (var i = 0; i < keys.length; i++)
			this[keys[i]] = new ImagesAndVideos(
				{
					"images": this[keys[i]].images + sizes2[keys[i]].images,
					"videos": this[keys[i]].videos + sizes2[keys[i]].videos
				}
			);
	};

	NumsProtected.prototype.sum = function(numsProtectedSize2) {
		var keys = Utilities.arrayUnion(Object.keys(this), Object.keys(numsProtectedSize2));
		for (var i = 0; i < keys.length; i++) {
			if (this[keys[i]] !== undefined && numsProtectedSize2[keys[i]] !== undefined) {
				this[keys[i]] = new ImagesAndVideos(
					{
						"images": this[keys[i]].images + numsProtectedSize2[keys[i]].images,
						"videos": this[keys[i]].videos + numsProtectedSize2[keys[i]].videos
					}
				);
			} else if (this[keys[i]] === undefined) {
				this[keys[i]] = numsProtectedSize2[keys[i]];
			}
		}
	};

	Sizes.prototype.subtract = function(sizes2) {
		var keys = Object.keys(this);
		for (var i = 0; i < keys.length; i++)
			this[keys[i]] = new ImagesAndVideos(
				{
					"images": this[keys[i]].images - sizes2[keys[i]].images,
					"videos": this[keys[i]].videos - sizes2[keys[i]].videos
				}
			);
	};

	NumsProtected.prototype.subtract = function(numsProtectedSize2) {
		var keys = Utilities.arrayUnion(Object.keys(this), Object.keys(numsProtectedSize2));
		for (var i = 0; i < keys.length; i++) {
			if (this[keys[i]] !== undefined && numsProtectedSize2[keys[i]] !== undefined) {
				this[keys[i]] = new ImagesAndVideos(
					{
						"images": this[keys[i]].images - numsProtectedSize2[keys[i]].images,
						"videos": this[keys[i]].videos - numsProtectedSize2[keys[i]].videos
					}
				);
			} else if (this[keys[i]] === undefined) {
				// execution shouldn't arrive here
				console.trace();
			}
		}
	};

	Utilities.currentSizeAndIndex = function() {
		// Returns the pixel size of the photo in DOM and the corresponding reduction index
		// If the original photo is in the DOM, returns its size and -1

		var currentReduction = $(".media-box#center .media-box-inner img").attr("src");

		// check if it's a reduction
		for (var i = 0; i < Options.reduced_sizes.length; i ++) {
			if (currentReduction === currentMedia.mediaPath(Options.reduced_sizes[i])) {
				return [Options.reduced_sizes[i], i];
			}
		}

		// default: it's the original image
		return [Math.max(currentMedia.metadata.size[0], currentMedia.metadata.size[1]), -1];
	};

	Utilities.nextSizeAndIndex = function() {
		// Returns the size of the reduction immediately bigger than that in the DOM and its reduction index
		// Returns the original photo size and -1 if the reduction in the DOM is the biggest one
		// Returns [false, false] if the original image is already in the DOM

		var [currentReductionSize, currentReductionIndex] = Utilities.currentSizeAndIndex();
		if (currentReductionIndex === -1)
			return [false, false];

		if (currentReductionIndex === 0)
			return [Math.max(currentMedia.metadata.size[0], currentMedia.metadata.size[1]), -1];

		return [Options.reduced_sizes[currentReductionIndex - 1], currentReductionIndex - 1];


		// var theNextSizeIndex = Utilities.nextSizeIndex();
		//
		// if (theNextSizeIndex === false)
		// 	return false;
		// else if (theNextSizeIndex === -1)
		// 	return 0;
		// else
		// 	return Options.reduced_sizes[theNextSizeIndex];
	};

	Utilities.prototype.nextReduction = function() {
		// Returns the file name of the reduction with the next bigger size than the reduction in DOM,
		// possibly the original photo
		// Returns false if the original photo is already in the DOM

		var [nextReductionSize, nextReductionIndex] = Utilities.nextSizeAndIndex();

		if (nextReductionIndex === false)
			// it's already the original image
			return false;
		if (nextReductionIndex === -1)
			return Utilities.pathJoin([currentMedia.albumName, currentMedia.name]);

		return currentMedia.mediaPath(nextReductionSize);
	};

	SingleMedia.prototype.createMediaHtml = function(id, fullScreenStatus) {
		// creates a media element that can be inserted in DOM (e.g. with append/prepend methods)

		// the actual sizes of the image
		var mediaWidth = this.metadata.size[0], mediaHeight = this.metadata.size[1];
		var mediaSrc, mediaElement, container;
		var attrWidth = mediaWidth, attrHeight = mediaHeight;

		if (this.mimeType.indexOf("video") === 0) {
			if (fullScreenStatus && this.name.match(/\.avi$/) === null) {
				mediaSrc = this.originalMediaPath();
			} else {
				// .avi videos are not played by browsers, use the transcoded one
				mediaSrc = this.mediaPath("");
			}

			mediaElement = $('<video/>', {controls: true });
		} else if (this.mimeType.indexOf("image") === 0) {
			if (fullScreenStatus && Modernizr.fullscreen)
				container = $(window);
			else
				container = $(".media-box#" + id + " .media-box-inner");

			mediaSrc = Utilities.chooseReducedPhoto(this, container, fullScreenStatus);

			if (maxSize) {
				// correct phisical width and height according to reduction sizes
				if (mediaWidth > mediaHeight) {
					attrWidth = maxSize;
					attrHeight = Math.round(mediaHeight / mediaWidth * maxSize);
				} else {
					attrHeight = maxSize;
					attrWidth = Math.round(mediaWidth / mediaHeight * maxSize);
				}
			}

			mediaElement = $('<img/>');
			if (currentAlbum.isFolder())
				mediaElement.attr("title", this.date);
			else
				mediaElement.attr("title", Utilities.pathJoin([this.albumName, this.name]));
		}

		mediaElement
			.attr("id", "media-" + id)
			.attr("width", attrWidth)
			.attr("height", attrHeight)
			.attr("ratio", mediaWidth / mediaHeight)
			.attr("src", encodeURI(mediaSrc))
			.attr("alt", this.name);

		return mediaElement[0].outerHTML;
	};

	SingleMedia.prototype.createMediaLinkTag = function(mediaSrc) {
		// creates a link tag to be inserted in <head>

		if (this.mimeType.indexOf("video") === 0) {
			return '<link rel="video_src" href="' + encodeURI(mediaSrc) + '" />';
		} else if (this.mimeType.indexOf("image") === 0) {
			return '<link rel="image_src" href="' + encodeURI(mediaSrc) + '" />';
		}
	};

	SingleMedia.prototype.chooseTriggerEvent = function() {
		// choose the event that must trigger the scaleMedia function

		if (this.mimeType.indexOf("video") === 0) {
			return "loadstart";
		} else if (this.mimeType.indexOf("image") === 0) {
			return "load";
		}
	};

	SingleMedia.prototype.originalMediaPath = function() {
		if (Options.browser_unsupported_mime_types.includes(this.mimeType))
			return Utilities.pathJoin([Options.server_cache_path, this.convertedPath]);
		else
			return this.trueOriginalMediaPath();
	};

	SingleMedia.prototype.trueOriginalMediaPath = function() {
		return Utilities.pathJoin([this.albumName, this.name]);
	};

	SingleMedia.prototype.mediaPath = function(size) {
		var suffix = Options.cache_folder_separator, hash, rootString = "root-";
		if (
			this.mimeType.indexOf("image") === 0 ||
			this.mimeType.indexOf("video") === 0 && [Options.album_thumb_size, Options.media_thumb_size].indexOf(size) != -1
		) {
			var actualSize = size;
			var albumThumbSize = Options.album_thumb_size;
			var mediaThumbSize = Options.media_thumb_size;
			if ((size == albumThumbSize || size == mediaThumbSize) && devicePixelRatio > 1) {
				actualSize = Math.round(actualSize * Options.mobile_thumbnail_factor);
				albumThumbSize = Math.round(albumThumbSize * Options.mobile_thumbnail_factor);
				mediaThumbSize = Math.round(mediaThumbSize * Options.mobile_thumbnail_factor);
			}
			suffix += actualSize.toString();
			if (size == Options.album_thumb_size) {
				suffix += "a";
				if (Options.album_thumb_type == "square")
					suffix += "s";
				else if (Options.album_thumb_type == "fit")
					suffix += "f";
			}
			else if (size == Options.media_thumb_size) {
				suffix += "t";
				if (Options.media_thumb_type == "square")
					suffix += "s";
				else if (Options.media_thumb_type == "fixed_height")
					suffix += "f";
			}
			suffix += ".jpg";
		} else if (this.mimeType.indexOf("video") === 0) {
			suffix += "transcoded.mp4";
		}

		hash = this.foldersCacheBase + Options.cache_folder_separator + this.cacheBase + suffix;
		if (hash.indexOf(rootString) === 0)
			hash = hash.substring(rootString.length);
		else {
			if (Utilities.isFolderCacheBase(hash))
				hash = hash.substring(Options.foldersStringWithTrailingSeparator.length);
			else if (Utilities.isByDateCacheBase(hash))
				hash = hash.substring(Options.byDateStringWithTrailingSeparator.length);
			else if (Utilities.isByGpsCacheBase(hash))
				hash = hash.substring(Options.byGpsStringWithTrailingSeparator.length);
			else if (Utilities.isSearchCacheBase(hash))
				hash = hash.substring(Options.bySearchStringWithTrailingSeparator.length);
			else if (Utilities.isSelectionCacheBase(hash))
				hash = hash.substring(Options.bySelectionStringWithTrailingSeparator.length);
			else if (Utilities.isMapCacheBase(hash))
				hash = hash.substring(Options.byMapStringWithTrailingSeparator.length);
		}
		if (this.cacheSubdir)
			return Utilities.pathJoin([Options.server_cache_path, this.cacheSubdir, hash]);
		else
			return Utilities.pathJoin([Options.server_cache_path, hash]);
	};

	Utilities.mediaBoxContainerHeight = function() {
		var heightForMediaAndTitle;
		windowHeight = $(window).innerHeight();
		heightForMediaAndTitle = windowHeight;
		if ($("#album-view").is(":visible"))
			// 22 is for the scroll bar and the current media marker
			// 5 is an extra space
			heightForMediaAndTitle -= Options.media_thumb_size + 22 + 5;

		return heightForMediaAndTitle;
	};

	Utilities.prototype.scaleMedia = function(event) {
		// this function works on the img tag identified by event.data.id
		// it adjusts width, height and position so that it fits in its parent (<div class="media-box-inner">, or the whole window)
		// and centers vertically
		return new Promise(
			function(resolve_scaleMedia) {
				var media = event.data.media, mediaElement, container, photoSrc, previousSrc;
				var containerHeight = $(window).innerHeight(), containerWidth = $(window).innerWidth(), containerRatio;
				var mediaBarBottom = 0;
				var mediaWidth, mediaHeight, attrWidth, attrHeight;
				var id = event.data.id;
				var heightForMedia, heightForMediaAndTitle, titleHeight;

				windowWidth = $(window).innerWidth();
				heightForMediaAndTitle = Utilities.mediaBoxContainerHeight();

				// widths must be set before calculating title height
				if (event.data.resize && id === "center") {
					// this is executed only when resizing, it's not needed when first scaling
					$("#media-box-container").css("width", windowWidth * 3).css("transform", "translate(-" + windowWidth + "px, 0px)");
					$(".media-box").css("width", windowWidth);
					$(".media-box .media-box-inner").css("width", windowWidth);
					$(".media-box").show();
				}
				if ($(".media-box#" + id + " .title").is(":visible"))
					titleHeight = $(".media-box#" + id + " .title").outerHeight();
				else
					titleHeight = 0;

				heightForMedia = heightForMediaAndTitle - titleHeight;
				$("#media-box-container").css("height", heightForMediaAndTitle);
				$(".media-box").css("height", heightForMediaAndTitle);
				$(".media-box .media-box-inner").css("height", heightForMedia);
				$(".media-box").show();

				if (media.mimeType.indexOf("image") === 0)
					mediaElement = $(".media-box#" + id + " .media-box-inner img");
				else if (media.mimeType.indexOf("video") === 0)
					mediaElement = $(".media-box#" + id + " .media-box-inner video");

				mediaWidth = media.metadata.size[0];
				mediaHeight = media.metadata.size[1];
				attrWidth = mediaWidth;
				attrHeight = mediaHeight;

				if (fullScreenStatus && Modernizr.fullscreen)
					container = $(window);
				else {
					container = $(".media-box#" + id + " .media-box-inner");
				}

				containerHeight = heightForMedia;
				containerRatio = containerWidth / containerHeight;

				if (media.mimeType.indexOf("image") === 0) {
					photoSrc = Utilities.chooseReducedPhoto(media, container, fullScreenStatus);
					previousSrc = mediaElement.attr("src");

					if (encodeURI(photoSrc) != previousSrc && event.data.currentZoom === event.data.initialZoom) {
						// resizing had the effect that a different reduction has been choosed

						// chooseReducedPhoto() sets maxSize to 0 if it returns the original media
						if (maxSize) {
							if (mediaWidth > mediaHeight) {
								attrWidth = maxSize;
								attrHeight = Math.round(mediaHeight / mediaWidth * attrWidth);
							} else {
								attrHeight = maxSize;
								attrWidth = Math.round(mediaWidth / mediaHeight * attrHeight);
							}
						}

						$("link[rel=image_src]").remove();
						$('link[rel="video_src"]').remove();
						$("head").append("<link rel='image_src' href='" + encodeURI(photoSrc) + "' />");
						mediaElement
							.attr("src", encodeURI(photoSrc))
							.attr("width", attrWidth)
							.attr("height", attrHeight);
					}
				}

				mediaElement.show();
				// $("#media-view").removeClass("hidden");

				if (id === "center") {
					// position next/prev buttons verticallly centered in media-box-inner
					var mediaBoxInnerHeight = parseInt($(".media-box#center .media-box-inner").css("height"));
					var prevNextHeight = parseInt($("#next").outerHeight());
					$("#next, #prev").css("top", titleHeight + (mediaBoxInnerHeight - prevNextHeight) / 2);

					Utilities.setLinksVisibility();
				}

				if (Utilities.bottomSocialButtons()) {
					mediaBarBottom = $(".ssk").outerHeight();
				}
				$(".media-box#" + id + " .media-bar").css("bottom", mediaBarBottom);

				if (id === "center")
					resolve_scaleMedia();

				$("#loading").hide();
				// Utilities.setPinchButtonsPosition();
				// Utilities.correctPrevNextPosition();
			}
		);
	};

	ImagesAndVideos.prototype.imagesAndVideosTotal = function() {
		return this.images + this.videos;
	};

	ImagesAndVideos.prototype.sum = function(imagesAndVideos) {
		this.images = this.images + imagesAndVideos.images;
		this.videos = this.videos + imagesAndVideos.videos;
	};

	ImagesAndVideos.prototype.subtract = function(imagesAndVideos) {
		this.images = this.images - imagesAndVideos.images;
		this.videos = this.videos - imagesAndVideos.videos;
	};

	Media.prototype.imagesAndVideosCount = function() {
		var result = new ImagesAndVideos();
		for (let i = 0; i < this.length; i ++) {
			if (this[i].mimeType.indexOf("image/") === 0)
				result.images += 1;
			else
				result.videos += 1;
		}
		return result;
	};

	Utilities.downloadAlbum = function(everything = false, what = "all", size = 0) {
		// adapted from https://gist.github.com/c4software/981661f1f826ad34c2a5dc11070add0f
		//
		// this function must be converted to streams, example at https://jimmywarting.github.io/StreamSaver.js/examples/saving-multiple-files.html
		//
		// what is one of "all", "images" or "videos"

		$("#downloading-media").show();
		size = parseInt(size);

		var zip = new JSZip();
		var zipFilename;
		var basePath = currentAlbum.path;
		zipFilename = Options.page_title + '.';
		if (currentAlbum.isSearch()) {
			zipFilename += Utilities._t("#by-search") + " '" + $("#search-field").val() + "'";
		} else if (currentAlbum.isSelection()) {
			zipFilename += Utilities._t("#by-selection");
		} else if (currentAlbum.isByDate()) {
			let textComponents = currentAlbum.path.split("/").splice(1);
			if (textComponents.length > 1)
				textComponents[1] = Utilities._t("#month-" + textComponents[1]);

			zipFilename += textComponents.join('-');
		} else if (currentAlbum.isByGps()) {
			zipFilename += currentAlbum.ancestorsNames.splice(1).join('-');
		} else if (currentAlbum.isMap()) {
			zipFilename += Utilities._t("#from-map");
		} else if (currentAlbum.cacheBase !== Options.folders_string)
			zipFilename += currentAlbum.name;

		zipFilename += ".zip";

		var addMediaAndSubalbumsPromise = addMediaAndSubalbumsFromAlbum(currentAlbum);
		addMediaAndSubalbumsPromise.then(
			// the complete zip can be generated...
			function() {
				$("#downloading-media").hide();
				$("#preparing-zip").show();
				zip.generateAsync({type:'blob'}).then(
					function(content) {
						// ... and saved
						saveAs(content, zipFilename);
						$("#preparing-zip").hide();
					}
				);
			}
		);
		// end of function

		function addMediaAndSubalbumsFromAlbum(currentAlbum, subalbum = "") {
			return new Promise(
				function(resolve_addMediaAndSubalbumsFromAlbum) {
					var albumPromises = [];

					for (let iMedia = 0; iMedia < currentAlbum.media.length; iMedia ++) {
						if (
							currentAlbum.media[iMedia].mimeType.indexOf("image") === 0 && what === "videos" ||
							currentAlbum.media[iMedia].mimeType.indexOf("video") === 0 && what === "images"
						)
							continue;

						let urlPromise = new Promise(
							function(resolveUrlPromise) {
								let url;
								if (size === 0)
									url = encodeURI(currentAlbum.media[iMedia].trueOriginalMediaPath());
								else
									url = encodeURI(currentAlbum.media[iMedia].mediaPath(size));
								let name = currentAlbum.media[iMedia].name;
								// load a file and add it to the zip file
								JSZipUtils.getBinaryContent(
									url,
									function (err, data) {
										if (err) {
											throw err; // or handle the error
										}
										let fileName = name;
										if (subalbum)
											fileName = subalbum + "/" + fileName;
										zip.file(fileName, data, {binary:true});
										resolveUrlPromise();
									}
								);
							}
						);
						albumPromises.push(urlPromise);
					}

					if (everything) {
						for (let iSubalbum = 0; iSubalbum < currentAlbum.subalbums.length; iSubalbum ++) {
							let subalbumPromise = new Promise(
								function(resolveSubalbumPromise) {
									// let ithSubalbum = currentAlbum.subalbums[iSubalbum];
									let convertSubalbumPromise = currentAlbum.convertSubalbum(iSubalbum, null, {getMedia: true, getPositions: false});
									convertSubalbumPromise.then(
										function(iSubalbum) {
											let albumPath = currentAlbum.subalbums[iSubalbum].path;
											if (currentAlbum.isSearch() || currentAlbum.isSelection())
												// remove the leading folders/date/gps/map string
												albumPath = albumPath.split('/').splice(1).join('/');
											else
												albumPath = albumPath.substring(basePath.length + 1);
											let addMediaAndSubalbumsPromise = addMediaAndSubalbumsFromAlbum(currentAlbum.subalbums[iSubalbum], albumPath);
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

	Utilities.dateElementForFolderName = function(folderArray, index) {
		if (index === 1 || index === 3)
			return parseInt(folderArray[index]);
		else if (index === 2)
			return Utilities._t("#month-" + folderArray[index]);
	};

	Utilities.combineFirstAndSecondLine = function(firstLine, secondLine) {
		var result = firstLine;
		if (secondLine)
			result += "<br /><span class='second-line'>" + secondLine + "</span>";
		return result;
	};

	Utilities.convertByDateAncestosNames = function(ancestorsNames) {
		if (ancestorsNames[0] === Options.by_date_string && ancestorsNames.length > 2) {
			let result = ancestorsNames.slice();
			result[2] = Utilities._t("#month-" + result[2]);
			return result;
		} else {
			return ancestorsNames;
		}

	};

	Album.prototype.generateSubalbumNameForSelectionAlbum = function() {
		var self = this;
		return new Promise(
			function (resolve_folderNameAndTitle) {
				var folderName = "", firstLine = '', secondLine = '';
				var raquo = "<span class='gray separated'>&raquo;</span>";
				var folderArray = self.cacheBase.split(Options.cache_folder_separator);
				var nameSorting = Utilities.convertByDateAncestosNames(self.ancestorsNames).slice(1).reverse().join(Options.cache_folder_separator).replace(/^0+/, '');
				if (self.isByDate()) {
				// if (album.isSelection() && self.isByDate()) {
					// if (folderArray.length === 4)
					// 	firstLine += Utilities._t("#day") + " ";
					firstLine += Utilities.dateElementForFolderName(folderArray, folderArray.length - 1);
					secondLine += "<span class='gray'>(";
					if (folderArray.length === 2) {
						secondLine += Utilities._t("#year-album");
					} else if (folderArray.length === 3) {
						secondLine += Utilities._t("#month-album") + " ";
					} else if (folderArray.length === 4) {
						secondLine += Utilities._t("#day-album") + ", ";
					}
					secondLine += "</span>";
					if (folderArray.length > 2) {
						if (folderArray.length === 4)
							secondLine += Utilities.dateElementForFolderName(folderArray, 2) + " ";
						secondLine += Utilities.dateElementForFolderName(folderArray, 1);
					}
					secondLine += "<span class='gray'>)</span>";

					folderName = Utilities.combineFirstAndSecondLine(firstLine, secondLine);

					resolve_folderNameAndTitle([folderName, nameSorting]);
				} else if (self.isByGps()) {
				// } else if (album.isSelection() && self.isByGps()) {
					let cacheBasesPromises = [];
					if (self.name === '')
						firstLine = Utilities._t('.not-specified');
					else if (self.hasOwnProperty('altName'))
						firstLine = Utilities.transformAltPlaceName(self.altName);
					else
						firstLine = self.name;

					for (let iCacheBase = 1; iCacheBase < self.ancestorsCacheBase.length - 1; iCacheBase ++) {
						if (iCacheBase == 1)
							secondLine = "<span class='gray'>(" + Utilities._t("#by-gps-album-in") + "</span> ";
						let marker = "<marker>" + iCacheBase + "</marker>";
						secondLine += marker;
						if (iCacheBase < self.ancestorsCacheBase.length - 2)
							secondLine += raquo;
						if (iCacheBase === self.ancestorsCacheBase.length - 2)
							secondLine += "<span class='gray'>)</span>";
						cacheBasesPromises.push(
							new Promise(
								function(resolve_ithCacheBasePromise) {
									let cacheBasePromise = PhotoFloat.getAlbum(self.ancestorsCacheBase[iCacheBase], null, {getMedia: false, getPositions: false});
									cacheBasePromise.then(
										function(gottenAlbum) {
											let albumName;
											if (gottenAlbum.name === '')
												albumName = Utilities._t('.not-specified');
											else if (gottenAlbum.hasOwnProperty('altName'))
												albumName = Utilities.transformAltPlaceName(gottenAlbum.altName);
											else
												albumName = gottenAlbum.name;
											secondLine = secondLine.replace(marker, "<a href='" + hashBeginning + gottenAlbum.cacheBase+ "'>" + albumName + "</a>");
											// $("#subalbums").html($("#subalbums").html().replace(marker, albumName));
											resolve_ithCacheBasePromise();
										}
									);
								}
							)
						);
					}
					if (! secondLine)
						secondLine = "<span class='gray'>(" + Utilities._t("#by-gps-album") + ")</span>";
					Promise.all(cacheBasesPromises).then(
						function() {
							folderName = Utilities.combineFirstAndSecondLine(firstLine, secondLine);
							resolve_folderNameAndTitle([folderName, nameSorting]);
						}
					);
				} else {
					let cacheBasesPromises = [];
					firstLine = self.name;
					for (let iCacheBase = 1; iCacheBase < self.ancestorsCacheBase.length - 1; iCacheBase ++) {
						if (iCacheBase == 1)
							secondLine = "<span class='gray'>(" + Utilities._t("#regular-album-in") + "</span> ";
						let marker = "<marker>" + iCacheBase + "</marker>";
						secondLine += marker;
						if (iCacheBase < self.ancestorsCacheBase.length - 2)
							secondLine += raquo;
						if (iCacheBase === self.ancestorsCacheBase.length - 2)
							secondLine += "<span class='gray'>)</span>";
						cacheBasesPromises.push(
							new Promise(
								function(resolve_ithCacheBasePromise) {
									let cacheBasePromise = PhotoFloat.getAlbum(self.ancestorsCacheBase[iCacheBase], null, {getMedia: false, getPositions: false});
									cacheBasePromise.then(
										function(gottenAlbum) {
											secondLine = secondLine.replace(marker, "<a href='" + hashBeginning + gottenAlbum.cacheBase+ "'>" + gottenAlbum.name + "</a>");
											// $("#subalbums").html($("#subalbums").html().replace(marker, albumName));
											resolve_ithCacheBasePromise();
										}
									);
								}
							)
						);
					}
					Promise.all(cacheBasesPromises).then(
						function() {
							folderName = Utilities.combineFirstAndSecondLine(firstLine, secondLine);
							resolve_folderNameAndTitle([folderName, nameSorting]);
						}
					);
				}
			}
		);
	};

	Album.prototype.subalbumName = function(subalbum) {
		var folderName = '';
		if (this.isSelection()) {
			folderName = subalbum.selectionAlbumName;
		} else if (this.isByDate()) {
			let folderArray = subalbum.cacheBase.split(Options.cache_folder_separator);
			if (folderArray.length == 2) {
				folderName += parseInt(folderArray[1]);
			} else if (folderArray.length == 3)
				folderName += " " + Utilities._t("#month-" + folderArray[2]);
			else if (folderArray.length == 4)
				folderName += Utilities._t("#day") + " " + parseInt(folderArray[3]);
		} else if (this.isByGps()) {
			if (subalbum.name === '')
				folderName = Utilities._t('.not-specified');
			else if (subalbum.hasOwnProperty('altName'))
				folderName = Utilities.transformAltPlaceName(subalbum.altName);
			else
				folderName = subalbum.name;
		} else {
			folderName = subalbum.name;
		}

		return folderName;
	};

	Album.prototype.folderMapTitle = function(subalbum, folderName) {
		var folderMapTitle;
		if (this.isSelection() && subalbum.isByDate()) {
			let reducedFolderName = folderName.substring(0, folderName.indexOf("<br />"));
			folderMapTitle = Utilities._t('#place-icon-title') + reducedFolderName;
		} else if (this.isSelection() && subalbum.isByGps()) {
			if (subalbum.name === '')
				folderMapTitle = Utilities._t('.not-specified');
			else if (subalbum.hasOwnProperty('altName'))
				folderMapTitle = Utilities.transformAltPlaceName(subalbum.altName);
			else
				folderMapTitle = subalbum.name;
			// folderName += folderMapTitle;
			folderMapTitle = Utilities._t('#place-icon-title') + folderMapTitle;
		} else {
			folderMapTitle = Utilities._t('#place-icon-title') + folderName;
		}
		return folderMapTitle;
	};

	Utilities.prototype.setPinchButtonsPosition = function(containerHeight, containerWidth) {
		// calculate and set pinch buttons position

		var mediaElement = $(".media-box#center .media-box-inner img");
		var actualHeight = mediaElement.height();
		var actualWidth = mediaElement.width();
		var titleHeight, albumHeight;
		if ($(".media-box#center .title").is(":visible"))
			titleHeight = $(".media-box#center .title").height();
		else
			titleHeight = 0;
		if ($("#album-view").is(":visible"))
			albumHeight = $("#album-view").height();
		else
			albumHeight = 0;
		var distanceFromImageBorder = 15;
		// if (typeof containerHeight === "undefined") {
		containerHeight = windowHeight - titleHeight - albumHeight;
		containerWidth = windowWidth;
		// }
		var pinchTop = Math.round(titleHeight + (containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		// var pinchTop = Math.round((containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		var pinchRight = Math.round((containerWidth - actualWidth) / 2 + distanceFromImageBorder);
		$("#pinch-container").css("right", pinchRight.toString() + "px").css("top", pinchTop.toString() + "px");
	};

	Utilities.prototype.setSelectButtonPosition = function(containerHeight, containerWidth) {
		// calculate and set pinch buttons position

		var mediaElement = $(".media-box#center .media-box-inner img");
		var actualHeight = mediaElement.height();
		var actualWidth = mediaElement.width();
		var titleHeight = 0, albumHeight = 0;
		if ($(".media-box#center .title").is(":visible"))
			titleHeight = $(".media-box#center .title").height();
		if ($("#album-view").is(":visible"))
			albumHeight = Math.max($("#album-view").height(), parseInt($("#album-view").css("height")));
		var distanceFromImageBorder = 15;
		// if (typeof containerHeight === "undefined") {
		containerHeight = windowHeight - titleHeight - albumHeight;
		containerWidth = windowWidth;
		// }
		var bottom = Math.round(albumHeight + (containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		var right = Math.round((containerWidth - actualWidth) / 2 + distanceFromImageBorder);
		$("#media-select-box .select-box").css("right", right.toString() + "px").css("bottom", bottom.toString() + "px");
	};

	NumsProtected.prototype.sumUpNumsProtectedMedia = function() {
		var result = new ImagesAndVideos(), codesComplexcombination;
		for (codesComplexcombination in this) {
			if (this.hasOwnProperty(codesComplexcombination) && codesComplexcombination !== ",") {
				result.sum(this[codesComplexcombination]);
			}
		}
		return result.images + result.videos;
	};
	Utilities.prototype.sumNumsProtectedMediaOfArray = function(arrayOfAlbumsOrSubalbunms) {
		var result = {}, i, codesComplexcombination, albumOrSubalbum;

		for (i = 0; i < arrayOfAlbumsOrSubalbunms.length; i ++) {
			albumOrSubalbum = arrayOfAlbumsOrSubalbunms[i];
			for (codesComplexcombination in albumOrSubalbum.numsProtectedMediaInSubTree) {
				if (albumOrSubalbum.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexcombination) && codesComplexcombination !== ",") {
					if (! result.hasOwnProperty(codesComplexcombination))
						result[codesComplexcombination] = new ImagesAndVideos();
					result[codesComplexcombination].sum(albumOrSubalbum.numsProtectedMediaInSubTree[codesComplexcombination]);
				}
			}
		}

		return result;
	};

	Utilities.isColliding = function(div1, div2) {
		// from https://gist.github.com/jtsternberg/c272d7de5b967cec2d3d
		// Div 1 data
		var d1_offset             = div1.offset();
		var d1_height             = div1.outerHeight(true);
		var d1_width              = div1.outerWidth(true);
		var d1_distance_from_top  = d1_offset.top + d1_height;
		var d1_distance_from_left = d1_offset.left + d1_width;

		// Div 2 data
		var d2_offset             = div2.offset();
		var d2_height             = div2.outerHeight(true);
		var d2_width              = div2.outerWidth(true);
		var d2_distance_from_top  = d2_offset.top + d2_height;
		var d2_distance_from_left = d2_offset.left + d2_width;

		var not_colliding = ( d1_distance_from_top < d2_offset.top || d1_offset.top > d2_distance_from_top || d1_distance_from_left < d2_offset.left || d1_offset.left > d2_distance_from_left );

		// Return whether it IS colliding
		return ! not_colliding;
	};

	Utilities.degreesToRadians = function(degrees) {
		var pi = Math.PI;
		return degrees * (pi/180);
	};

	Utilities.prototype.escapeSingleQuotes = function(text) {
		return text.replace(/'/g, "\\'");
	};

	Utilities.xDistanceBetweenCoordinatePoints = function(point1, point2) {
		return Math.max(
			Utilities.distanceBetweenCoordinatePoints({"lng": point1.lng, "lat": point1.lat}, {"lng": point2.lng, "lat": point1.lat}),
			Utilities.distanceBetweenCoordinatePoints({"lng": point1.lng, "lat": point2.lat}, {"lng": point2.lng, "lat": point2.lat})
		);
	};

	Utilities.yDistanceBetweenCoordinatePoints = function(point1, point2) {
		return Utilities.distanceBetweenCoordinatePoints({"lng": point1.lng, "lat": point1.lat}, {"lng": point1.lng, "lat": point2.lat});
	};

	Utilities.distanceBetweenCoordinatePoints = function(point1, point2) {
		// converted from Geonames.py
		// Calculate the great circle distance in meters between two points on the earth (specified in decimal degrees)

		// convert decimal degrees to radians
		var r_lon1 = Utilities.degreesToRadians(point1.lng);
		var r_lat1 = Utilities.degreesToRadians(point1.lat);
		var r_lon2 = Utilities.degreesToRadians(point2.lng);
		var r_lat2 = Utilities.degreesToRadians(point2.lat);
		// haversine formula
		var d_r_lon = r_lon2 - r_lon1;
		var d_r_lat = r_lat2 - r_lat1;
		var a = Math.pow(Math.sin(d_r_lat / 2), 2) + Math.cos(r_lat1) * Math.cos(r_lat2) * Math.pow(Math.sin(d_r_lon / 2), 2);
		var c = 2 * Math.asin(Math.sqrt(a));
		var earth_radius = 6371000;  // radius of the earth in m
		var dist = earth_radius * c;
		return dist;
	};

	Utilities.lateralSocialButtons = function() {
		return $(".ssk-group").css("display") == "block";
	};

	Utilities.bottomSocialButtons = function() {
		return ! Utilities.lateralSocialButtons();
	};

	Utilities.setLinksVisibility = function() {
		if (isMobile.any()) {
			$(".media-box .links").css("display", "inline").css("opacity", 0.5).stop().fadeTo("slow", 0.25);
		} else {
			$("#media-view").off();
			$("#media-view").on('mouseenter', function() {
				$(".media-box .links").stop().fadeTo("slow", 0.50).css("display", "inline");
			});
			$("#media-view").on('mouseleave', function() {
				$(".media-box .links").stop().fadeOut("slow");
			});
		}
	};

	Utilities.prototype.setNextPrevVisibility = function() {
		if (isMobile.any()) {
			$("#next, #prev").css("display", "inline").css("opacity", 0.5);
		} else {
			$("#next, #prev").off('mouseenter mouseleave');
			$("#next, #prev").on(
				'mouseenter',
				function() {
					$(this).stop().fadeTo("fast", 1);
				}
			);

			$("#next, #prev").on(
				'mouseleave',
				function() {
					$(this).stop().fadeTo("fast", 0.4);
				}
			);
		}
	};

	Utilities.prototype.HideId = function(id) {
		$(id).hide();
	};

	Utilities.correctPrevNextPosition = function() {
		var correctionForPinch =
			Utilities.isColliding($("#pinch-container"), $("#next")) ?
				$("#pinch-container").outerWidth() + parseInt($("#pinch-container").css("right")) : 0;
		var correctionForSocial =
			Utilities.lateralSocialButtons() && Utilities.isColliding($(".ssk-left"), $("#prev")) ?
				$(".ssk").outerWidth() : 0;

		$("#next").css("right", "");
		$("#prev").css("left", "");
		if (! fullScreenStatus && currentAlbum.numsMedia.imagesAndVideosTotal() > 1) {
			// correct next button position when pinch buttons collide
			$("#next").css("right", correctionForPinch.toString() + "px");
			// correct prev button position when social buttons are on the left
			$("#prev").css("left", correctionForSocial.toString() + "px");
		}
	};

	Utilities.mediaBoxGenerator = function(id) {
		if (id === 'left')
			$("#media-box-container").prepend(Utilities.originalMediaBoxContainerContent.replace('id="center"', 'id="left"'));
		else if (id === 'right')
			$("#media-box-container").append(Utilities.originalMediaBoxContainerContent.replace('id="center"', 'id="right"'));
		$(".media-box#" + id + " .metadata").css("display", $(".media-box#center .metadata").css("display"));
	};

	Utilities.prototype.showAuthForm = function(event, maybeProtectedContent = false) {
		$("#album-view, #media-view, #my-modal, #no-results").css("opacity", "0.2");
		$("#loading").hide();
		$("#auth-text").stop().fadeIn(1000);
		$("#password").focus();

		$('#auth-close').off('click').on(
			'click',
			function() {
				$("#auth-text").hide();
				$("#album-view, #media-view, #my-modal").css("opacity", "");
				if (currentAlbum === null) {
					fromEscKey = true;
					$(window).hashchange();
				} else if (maybeProtectedContent) {
					window.location.href = Utilities.upHash();
				}
			}
		);
	};

	Utilities.prototype.showPasswordRequestForm = function(event) {
		$("#auth-form").hide();
		$("#password-request-form").show();
		$("#please-fill").hide();
		$("#identity").attr("title", Utilities._t("#identity-explication"));
	};

	Utilities.upHash = function(hash) {
		var resultHash;
		if (hash === undefined)
			var hash = window.location.hash;
		var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(hash);

		if (mediaHash === null || currentAlbum.isAlbumWithOneMedia()) {
			// hash of an album: go up in the album tree
			if (savedSearchAlbumHash !== null) {
				if (albumHash == foundAlbumHash)
					resultHash = savedSearchAlbumHash;
				else {
					// we must go up in the sub folder
					albumHash = albumHash.split(Options.cache_folder_separator).slice(0, -1).join(Options.cache_folder_separator);
					resultHash = Utilities.pathJoin([
						albumHash,
						foundAlbumHash,
						savedSearchAlbumHash
					]);
				}
			} else {
				if (albumHash == Options.folders_string) {
					// stay there
					resultHash = albumHash;
				} else if (Utilities.isAnyRootHash(albumHash)) {
					// go to folders root
					resultHash = Options.folders_string;
				} else if (Utilities.isSearchCacheBase(albumHash) || Utilities.isMapCacheBase(albumHash)) {
					// the return folder must be extracted from the album hash
					resultHash = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
				} else {
					let album = cache.getAlbum(albumHash);
					if (Utilities.isSelectionCacheBase(albumHash) && ! album) {
						resultHash = Options.folders_string;
					} else if (Utilities.isSelectionCacheBase(albumHash) && album.media.length > 1) {
						// if all the media belong to the same album => the parent
						// other ways => the common root of the selected media
						let minimumLength = 100000;
						let parts = [];
						for (let iMedia = 0; iMedia < album.media.length; iMedia ++) {
							let splittedSelectedMediaCacheBase = album.media[iMedia].foldersCacheBase.split(Options.cache_folder_separator);
							if (splittedSelectedMediaCacheBase.length < minimumLength)
								minimumLength = splittedSelectedMediaCacheBase.length;
						}
						for (let iPart = 0; iPart < minimumLength; iPart ++)
							parts[iPart] = [];
						for (let iMedia = 0; iMedia < album.media.length; iMedia ++) {
							let splittedSelectedMediaCacheBase = album.media[iMedia].foldersCacheBase.split(Options.cache_folder_separator);
							for (let iPart = 0; iPart < minimumLength; iPart ++) {
								if (! iPart)
									parts[iPart][iMedia] = splittedSelectedMediaCacheBase[iPart];
								else
									parts[iPart][iMedia] = parts[iPart - 1][iMedia] + Options.cache_folder_separator + splittedSelectedMediaCacheBase[iPart];
							}
						}
						resultHash = '';
						for (let iPart = 0; iPart < minimumLength; iPart ++) {
							if (parts[iPart].some((val, i, arr) => val !== arr[0])) {
								break;
							} else {
								resultHash = parts[iPart][0];
							}
						}
					} else if (Utilities.isSelectionCacheBase(albumHash) && album.media.length === 1) {
						resultHash = album.media[0].foldersCacheBase;
					} else {
						// we must go up in the sub folders tree
						resultHash = albumHash.split(Options.cache_folder_separator).slice(0, -1).join(Options.cache_folder_separator);
					}
				}
			}
		} else {
			// hash of a media: remove the media
			if (savedSearchAlbumHash !== null || Utilities.isFolderCacheBase(albumHash))
				// media in found album or in one of its subalbum
				// or
				// media in folder hash:
				// remove the trailing media
				resultHash = Utilities.pathJoin(hash.split("/").slice(1, -1));
			else
				// all the other cases
				// remove the trailing media and the folder it's inside
				resultHash = Utilities.pathJoin(hash.split("/").slice(1, -2));
		}

		return hashBeginning + resultHash;
	};


	/* Error displays */
	Utilities.prototype.errorThenGoUp = function(error) {
		if (error == 403) {
			$("#auth-text").stop().fadeIn(1000);
			$("#password").focus();
		} else {
			// Jason's code only had the following line
			//$("#error-text").stop().fadeIn(2500);

			var rootHash = hashBeginning + Options.folders_string;

			$("#album-view").fadeOut(200);
			$("#media-view").fadeOut(200);

			$("#loading").hide();
			if (window.location.hash == rootHash) {
				$("#error-text-folder").stop();
				$("#error-root-folder").stop().fadeIn(2000);
				$("#powered-by").show();
			} else {
				$("#error-text-folder").stop().fadeIn(
					200,
					function() {
						window.location.href = Utilities.upHash();
					}
				);
				$("#error-text-folder, #error-overlay, #auth-text").fadeOut(3500);
				$("#album-view").stop().fadeOut(100).fadeIn(3500);
				$("#media-view").stop().fadeOut(100).fadeIn(3500);
			}
		}
		// $("#error-overlay").fadeTo(500, 0.8);
		$("body, html").css("overflow", "hidden");
	};

	Utilities.convertMd5ToCode = function(md5) {
		var index = PhotoFloat.guessedPasswordsMd5.indexOf(md5);
		return PhotoFloat.guessedPasswordCodes[index];
	};

	Utilities.prototype.noOp = function() {
		console.trace();
	};

	Utilities.prototype.convertCodesListToMd5sList = function(codesList) {
		var i, index, md5sList = [];
		for (i = 0; i < codesList.length; i ++) {
			if (! codesList[i]) {
				md5sList.push('');
			} else {
				index = PhotoFloat.guessedPasswordCodes.indexOf(codesList[i]);
				if (index != -1)
					md5sList.push(PhotoFloat.guessedPasswordsMd5[index]);
			}
		}
		return md5sList;
	};

	Utilities.prototype.convertCodesComplexCombinationToCodesSimpleCombination = function(codesComplexCombination) {
		let [albumCodesComplexCombinationList, mediaCodesComplexCombinationList] = PhotoFloat.convertComplexCombinationsIntoLists(codesComplexCombination);
		if (albumCodesComplexCombinationList.length && mediaCodesComplexCombinationList.length)
			return [albumCodesComplexCombinationList[0], mediaCodesComplexCombinationList[0]].join (',');
		else if (albumCodesComplexCombinationList.length && ! mediaCodesComplexCombinationList.length)
			return [albumCodesComplexCombinationList[0], ''].join (',');
		else if (! albumCodesComplexCombinationList.length && mediaCodesComplexCombinationList.length)
			return ['', mediaCodesComplexCombinationList[0]].join (',');
		else
			return '';
	};

	Utilities.prototype.undie = function() {
		$(".error, #error-overlay, #auth-text", ".search-failed").fadeOut(500);
		$("body, html").css("overflow", "auto");
	};

	SingleMedia.prototype.chooseThumbnail	= function(thumbnailSize) {
		return this.mediaPath(thumbnailSize);
	};

	Album.prototype.sortAlbumsMedia = function() {
		// this function applies the sorting on the media and subalbum lists
		// and sets the album properties that attest the lists status

		// album properties reflect the current sorting of album and media objects
		// json files have subalbums and media sorted by date not reversed

		if (this.needAlbumNameSort()) {
			this.sortByPath();
			this.albumNameSort = true;
			this.albumReverseSort = false;
			// $("li.album-sort.by-name").addClass("selected");
		} else if (this.needAlbumDateSort()) {
			Utilities.sortByDate(this.subalbums);
			this.albumNameSort = false;
			this.albumReverseSort = false;
		}
		if (this.needAlbumDateReverseSort() || this.needAlbumNameReverseSort()) {
			this.subalbums.reverse();
			this.albumReverseSort = ! this.albumReverseSort;
		}

		if (this.hasOwnProperty("media")) {
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
			if (currentMedia !== null && (currentAlbum === null || this.cacheBase === currentAlbum.cacheBase)) {
				currentMediaIndex = this.media.findIndex(
					function(thisMedia) {
						var matches =
							thisMedia.cacheBase == currentMedia.cacheBase && thisMedia.foldersCacheBase == currentMedia.foldersCacheBase;
						return matches;
					}
				);
			}
		}
	};

	Album.prototype.initializeSortPropertiesAndCookies = function() {
		// this function applies the sorting on the media and subalbum lists
		// and sets the album properties that attest the lists status

		// album properties reflect the current sorting of album and media objects
		// json files have subalbums and media sorted by date not reversed

		if (typeof this.albumNameSort === "undefined") {
			this.albumNameSort = false;
		}
		if (typeof this.albumReverseSort === "undefined") {
			this.albumReverseSort = false;
		}

		if (typeof this.mediaNameSort === "undefined") {
			this.mediaNameSort = false;
		}
		if (typeof this.mediaReverseSort === "undefined") {
			this.mediaReverseSort = false;
		}

		// cookies reflect the requested sorting in ui
		// they remember the ui state when a change in sort is requested (via the top buttons) and when the hash changes
		// if they are not set yet, they are set to default values

		if (Functions.getBooleanCookie("albumNameSortRequested") === null)
			Functions.setBooleanCookie("albumNameSortRequested", Options.default_album_name_sort);
		if (Functions.getBooleanCookie("albumReverseSortRequested") === null)
			Functions.setBooleanCookie("albumReverseSortRequested", Options.default_album_reverse_sort);

		if (Functions.getBooleanCookie("mediaNameSortRequested") === null)
			Functions.setBooleanCookie("mediaNameSortRequested", Options.default_media_name_sort);
		if (Functions.getBooleanCookie("mediaReverseSortRequested") === null)
			Functions.setBooleanCookie("mediaReverseSortRequested", Options.default_media_reverse_sort);
	};

	/* make static methods callable as member functions */
	// Utilities.prototype.convertComplexCombinationToCodesComplexCombination = Utilities.convertComplexCombinationToCodesComplexCombination;
	Utilities.prototype.chooseReducedPhoto = Utilities.chooseReducedPhoto;
	Utilities.prototype.isFolderCacheBase = Utilities.isFolderCacheBase;
	Utilities.prototype.pathJoin = Utilities.pathJoin;
	Utilities.prototype.setLinksVisibility = Utilities.setLinksVisibility;
	Utilities.prototype.mediaBoxGenerator = Utilities.mediaBoxGenerator;
	Utilities.prototype.originalMediaBoxContainerContent = Utilities.originalMediaBoxContainerContent;
	Utilities.prototype.currentSizeAndIndex = Utilities.currentSizeAndIndex;
	Utilities.prototype.nextSizeAndIndex = Utilities.nextSizeAndIndex;
	Utilities.prototype.isColliding = Utilities.isColliding;
	Utilities.prototype.distanceBetweenCoordinatePoints = Utilities.distanceBetweenCoordinatePoints;
	Utilities.prototype.xDistanceBetweenCoordinatePoints = Utilities.xDistanceBetweenCoordinatePoints;
	Utilities.prototype.yDistanceBetweenCoordinatePoints = Utilities.yDistanceBetweenCoordinatePoints;
	Utilities.prototype.degreesToRadians = Utilities.degreesToRadians;
	Utilities.prototype.correctPrevNextPosition = Utilities.correctPrevNextPosition;
	Utilities.prototype.mediaBoxContainerHeight = Utilities.mediaBoxContainerHeight;
	Utilities.prototype.sortByDate = Utilities.sortByDate;
	Utilities.prototype.isByDateCacheBase = Utilities.isByDateCacheBase;
	Utilities.prototype.isByGpsCacheBase = Utilities.isByGpsCacheBase;
	Utilities.prototype.isSearchCacheBase = Utilities.isSearchCacheBase;
	Utilities.prototype.isSelectionCacheBase = Utilities.isSelectionCacheBase;
	Utilities.prototype.isMapCacheBase = Utilities.isMapCacheBase;
	Utilities.prototype.convertMd5ToCode = Utilities.convertMd5ToCode;
	Utilities.prototype._t = Utilities._t;
	Utilities.prototype.getLanguage = Utilities.getLanguage;
	Utilities.prototype.upHash = Utilities.upHash;
	Utilities.prototype.isAlbumWithOneMedia = Utilities.isAlbumWithOneMedia;
	// Utilities.prototype.resetSelectedMedia = Utilities.resetSelectedMedia;
	// Utilities.prototype.resetSelectedSubalbums = Utilities.resetSelectedSubalbums;
	// Utilities.prototype.countSelectedMedia = Utilities.countSelectedMedia;
	// Utilities.prototype.countSelectedSubalbums = Utilities.countSelectedSubalbums;
	Utilities.prototype.isAnyRootHash = Utilities.isAnyRootHash;
	Utilities.prototype.isAnyRootCacheBase = Utilities.isAnyRootCacheBase;
	Utilities.prototype.initializeSelectionRootAlbum = Utilities.initializeSelectionRootAlbum;
	Utilities.prototype.initializeOrGetMapRootAlbum = Utilities.initializeOrGetMapRootAlbum;
	// Utilities.prototype.initializeSearchRootAlbum = Utilities.initializeSearchRootAlbum;
	Utilities.prototype.nothingIsSelected = Utilities.nothingIsSelected;
	Utilities.prototype.somethingIsSearched = Utilities.somethingIsSearched;
	Utilities.prototype.somethingIsInMapAlbum = Utilities.somethingIsInMapAlbum;
	Utilities.prototype.initializeSelectionAlbum = Utilities.initializeSelectionAlbum;
	Utilities.prototype.transformAltPlaceName = Utilities.transformAltPlaceName;
	Utilities.prototype.arrayUnion = Utilities.arrayUnion;
	Utilities.prototype.cloneObject = Utilities.cloneObject;

	window.Utilities = Utilities;
}());
