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

	Utilities.prototype.openInNewTab = function(hash) {
		// albums is a list of objects {albumName: album}
		var typeOfPackedAlbum, stringifiedPackedAlbum, albumName;

		var newForm = jQuery(
			"<form>",
			{
				action: hash,
				// "action": imgData.hash,
				target: "_blank",
				method: "post"
			}
		);

		let albums = [];
		if (Utilities.somethingIsInMapAlbum()) {
			albums.push(env.mapAlbum);
		}
		if (Utilities.somethingIsSelected()) {
			albums.push(env.selectionAlbum);
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
						name: "albumName_" + iString,
						value: albumName,
						type: "hidden"
					}
				)
			).append(
				jQuery(
					"<input>",
					{
						name: "stringifiedPackedAlbum_" + iString,
						value: stringifiedPackedAlbum,
						type: "hidden"
					}
				)
			).append(
				jQuery(
					"<input>",
					{
						name: "typeOfPackedAlbum_" + iString,
						value: typeOfPackedAlbum,
						type: "hidden"
					}
				)
			);
		}

		newForm.append(
			jQuery(
				"<input>",
				{
					name: "selectorClickedToOpenTheMap",
					value: env.selectorClickedToOpenTheMap,
					type: "hidden"
				}
			)
		);

		let currentAlbumIs = "";
		if (env.currentAlbum === env.mapAlbum)
			currentAlbumIs = "mapAlbum";
		else if (env.currentAlbum === env.selectionAlbum)
			currentAlbumIs = "selectionAlbum";
		newForm.append(
			jQuery(
				"<input>",
				{
					name: "currentAlbumIs",
					value: currentAlbumIs,
					type: "hidden"
				}
			)
		);

		if (PhotoFloat.guessedPasswordsMd5.length) {
			newForm.append(
				jQuery(
					"<input>",
					{
						name: "guessedPasswordsMd5",
						value: PhotoFloat.guessedPasswordsMd5.join('-'),
						type: "hidden"
					}
				)
			).append(
				jQuery(
					"<input>",
					{
						name: "guessedPasswordCodes",
						value: PhotoFloat.guessedPasswordCodes.join('-'),
						type: "hidden"
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
		env.selectorClickedToOpenTheMap = postData.selectorClickedToOpenTheMap;

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
				env.mapAlbum = uncompressedAlbum;
			} else if (albumName === "selectionAlbum") {
				env.selectionAlbum = uncompressedAlbum;
			}
			index ++;
		}
		if (postData.currentAlbumIs === "mapAlbum")
			env.currentAlbum = env.mapAlbum;
		else if (postData.currentAlbumIs === "selectionAlbum")
			env.currentAlbum = env.selectionAlbum;
		// invalidate the variable so that it's not used any more
		postData = null;
	};

	Utilities.initializeOrGetMapRootAlbum = function() {
		// prepare the root of the map albums and put it in the cache
		var rootMapAlbum = env.cache.getAlbum(env.options.by_map_string);
		if (! rootMapAlbum) {
			rootMapAlbum = new Album(env.options.by_map_string);
			env.cache.putAlbum(rootMapAlbum);
		}
		// rootMapAlbum.cacheBase = env.options.by_map_string;
		// rootMapAlbum.media = [];
		// rootMapAlbum.numsMedia = new ImagesAndVideos();
		// rootMapAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// rootMapAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// rootMapAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// rootMapAlbum.subalbums = [];
		// rootMapAlbum.positionsAndMediaInTree = [];
		// rootMapAlbum.numPositionsInTree = 0;
		// rootMapAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// rootMapAlbum.ancestorsCacheBase = [env.options.by_map_string];
		// rootMapAlbum.includedFilesByCodesSimpleCombination = {};
		// rootMapAlbum.includedFilesByCodesSimpleCombination[","] = false;
		return rootMapAlbum;
	};

	Utilities.prototype.initializeMapAlbum = function() {
		var rootMapAlbum = env.cache.getAlbum(env.options.by_map_string);
		// if (! rootMapAlbum)
		// 	rootMapAlbum = Utilities.initializeOrGetMapRootAlbum();

		lastMapAlbumIndex ++;

		// initializes the map album
		var newMapAlbum = new Album(env.options.by_map_string + env.options.cache_folder_separator + lastMapAlbumIndex + env.options.cache_folder_separator + env.currentAlbum.cacheBase);
		// newMapAlbum.media = [];
		// newMapAlbum.numsMedia = new ImagesAndVideos();
		// newMapAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// newMapAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// newMapAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// newMapAlbum.subalbums = [];
		// newMapAlbum.positionsAndMediaInTree = [];
		// newMapAlbum.numPositionsInTree = 0;
		// newMapAlbum.cacheBase = env.options.by_map_string + env.options.cache_folder_separator + lastMapAlbumIndex + env.options.cache_folder_separator + env.currentAlbum.cacheBase;
		newMapAlbum.path = newMapAlbum.cacheBase.replace(env.options.cache_folder_separator, "/");
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
		newSearchAlbum.path = newSearchAlbum.cacheBase.replace(env.options.cache_folder_separator, "/");
		// newSearchAlbum.physicalPath = newSearchAlbum.path;
		// newSearchAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// newSearchAlbum.includedFilesByCodesSimpleCombination = {};
		// newSearchAlbum.includedFilesByCodesSimpleCombination[","] = false;

		return newSearchAlbum;
	};

	Utilities.prototype.initializeSearchAlbumEnd = function() {
		var rootSearchAlbum = env.cache.getAlbum(env.options.by_search_string);
		if (! rootSearchAlbum) {
			rootSearchAlbum = new Album(env.options.by_search_string);
			env.cache.putAlbum(rootSearchAlbum);
		}

		rootSearchAlbum.numsMediaInSubTree.sum(env.searchAlbum.numsMediaInSubTree);
		// rootSearchAlbum.subalbums.push(newSearchAlbum);
		rootSearchAlbum.positionsAndMediaInTree.mergePositionsAndMedia(env.searchAlbum.positionsAndMediaInTree);
		rootSearchAlbum.numPositionsInTree = rootSearchAlbum.positionsAndMediaInTree.length;
		// rootSearchAlbum.numPositionsInTree += env.searchAlbum.numPositionsInTree;
		rootSearchAlbum.numsProtectedMediaInSubTree[","].sum(env.searchAlbum.numsProtectedMediaInSubTree[","]);

		env.searchAlbum.ancestorsCacheBase = rootSearchAlbum.ancestorsCacheBase.slice();
		env.searchAlbum.ancestorsCacheBase.push(env.searchAlbum.cacheBase);
	};

	Utilities.initializeSelectionRootAlbum = function() {
		// prepare the root of the selections albums and put it in the cache
		var rootSelectionAlbum = env.cache.getAlbum(env.options.by_selection_string);
		if (! rootSelectionAlbum) {
			rootSelectionAlbum = new Album(env.options.by_selection_string);
			env.cache.putAlbum(rootSelectionAlbum);
		}
		// rootSelectionAlbum.cacheBase = env.options.by_selection_string;
		// rootSelectionAlbum.media = [];
		// rootSelectionAlbum.numsMedia = new ImagesAndVideos();
		// rootSelectionAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// rootSelectionAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// rootSelectionAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// rootSelectionAlbum.subalbums = [];
		// rootSelectionAlbum.positionsAndMediaInTree = [];
		// rootSelectionAlbum.numPositionsInTree = 0;
		// rootSelectionAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// rootSelectionAlbum.ancestorsCacheBase = [env.options.by_selection_string];
		// rootSelectionAlbum.includedFilesByCodesSimpleCombination = {};
		// rootSelectionAlbum.includedFilesByCodesSimpleCombination[","] = false;

		return rootSelectionAlbum;
	};

	Utilities.initializeSelectionAlbum = function() {
		// initializes the selection album

		var rootSelectionAlbum = env.cache.getAlbum(env.options.by_selection_string);
		// if (! rootSelectionAlbum)
		// 	rootSelectionAlbum = Utilities.initializeSelectionRootAlbum();

		lastSelectionAlbumIndex ++;

		env.selectionAlbum = new Album(env.options.by_selection_string + env.options.cache_folder_separator + lastSelectionAlbumIndex);
		// newSelectionAlbum.media = [];
		// newSelectionAlbum.numsMedia = new ImagesAndVideos();
		// newSelectionAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// newSelectionAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// newSelectionAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// newSelectionAlbum.subalbums = [];
		// newSelectionAlbum.positionsAndMediaInTree = [];
		// newSelectionAlbum.numPositionsInTree = 0;
		// newSelectionAlbum.cacheBase = env.options.by_selection_string + env.options.cache_folder_separator + lastSelectionAlbumIndex;
		env.selectionAlbum.path = env.selectionAlbum.cacheBase.replace(env.options.cache_folder_separator, "/");
		// newSelectionAlbum.physicalPath = newSelectionAlbum.path;
		// newSelectionAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		// newSelectionAlbum.includedFilesByCodesSimpleCombination = {};
		// newSelectionAlbum.includedFilesByCodesSimpleCombination[","] = false;

		rootSelectionAlbum.numsMediaInSubTree.sum(env.selectionAlbum.numsMediaInSubTree);
		rootSelectionAlbum.subalbums.push(env.selectionAlbum);
		rootSelectionAlbum.positionsAndMediaInTree.mergePositionsAndMedia(env.selectionAlbum.positionsAndMediaInTree);
		rootSelectionAlbum.numPositionsInTree = rootSelectionAlbum.positionsAndMediaInTree.length;
		// rootSelectionAlbum.numPositionsInTree += env.selectionAlbum.numPositionsInTree;
		rootSelectionAlbum.numsProtectedMediaInSubTree[","].sum(env.selectionAlbum.numsProtectedMediaInSubTree[","]);

		env.selectionAlbum.ancestorsCacheBase = rootSelectionAlbum.ancestorsCacheBase.slice();
		env.selectionAlbum.ancestorsCacheBase.push(env.selectionAlbum.cacheBase);
	};

	Utilities._t = function(id) {
		env.language = Utilities.getLanguage();
		if (translations[env.language][id])
			return translations[env.language][id];
		else
			return translations.en[id];
	};

	Utilities.prototype.convertProtectedCacheBaseToCodesSimpleCombination = function(protectedCacheBase) {
		var protectedDirectory = protectedCacheBase.split("/")[0];
		var [albumMd5, mediaMd5] = protectedDirectory.substring(env.options.protected_directories_prefix.length).split(',');
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
		var [albumMd5, mediaMd5] = protectedDirectory.substring(env.options.protected_directories_prefix.length).split(',');
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

		env.language = Utilities.getLanguage();
		for (var key in translations.en) {
			if (translations[env.language].hasOwnProperty(key) || translations.en.hasOwnProperty(key)) {
				keyLanguage = env.language;
				if (! translations[env.language].hasOwnProperty(key))
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
		var language = "en";
		if (env.options.language && translations[env.options.language] !== undefined)
			language = env.options.language;
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
		return Object.assign({}, object);
	};

	// Utilities.prototype.arrayIntersect = function(a, b) {
	// 	if (b.length > a.length) {
	// 		// indexOf to loop over shorter
	// 		[a, b] = [b, a];
	// 	}
	//
	// 	let intersection = [];
	// 	for (let i = 0; i < b.length; i ++) {
	// 		let elementB = b[i];
	// 		if (a.indexOf(elementB) !== -1)
	// 			intersection.push(elementB);
	// 	}
	//
	// 	return intersection;
	// };

	Utilities.mediaOrSubalbumsIntersectionForSearches = function(a, b) {
		if (! a.length || ! b.length) {
			a.length = 0;
			return;
		}

		var property = 'albumName';
		if (! a[0].hasOwnProperty('albumName'))
			// searched albums hasn't albumName property
			property = 'path';

		b.forEach(
			function(elementB) {
				let found = false;
				let indexA;
				for (indexA = a.length - 1; indexA >= 0; indexA --) {
					let elementA = a[indexA];
					var aValue = elementA[property];
					var bValue = elementB[property];
					if (property == 'albumName') {
						aValue = Utilities.pathJoin([aValue, elementA.name]);
						bValue = Utilities.pathJoin([bValue, elementB.name]);
					}
					if (Utilities.normalizeAccordingToOptions(bValue) === Utilities.normalizeAccordingToOptions(aValue)) {
						found = true;
						break;
					}
				}
				if (! found)
					a.splice(indexA, 1);
			}
		);
	};

	Media.prototype.intersectionForSearches = function(other) {
		Utilities.mediaOrSubalbumsIntersectionForSearches(this, other);
	};

	Subalbums.prototype.intersectionForSearches = function(other) {
		Utilities.mediaOrSubalbumsIntersectionForSearches(this, other);
	};

	PositionsAndMedia.prototype.addPositionAndMedia = function(newPositionAndMedia) {
		var positionAndMedia, newMediaNameListElement;
		for (var iOld = 0; iOld < this.length; iOld ++) {
			positionAndMedia = this[iOld];
			if (newPositionAndMedia.lng == positionAndMedia.lng && newPositionAndMedia.lat == positionAndMedia.lat) {
				for (var iNew = 0; iNew < newPositionAndMedia.mediaList.length; iNew ++) {
					newMediaNameListElement = newPositionAndMedia.mediaList[iNew];
					// the following check is needed for searches only?
					if (
						positionAndMedia.mediaList.every(
							function(mediaListElement) {
								return ! mediaListElement.isEqual(newPositionAndMedia.mediaList[iNew]);
							}
						)
					)
						this[iOld].mediaList.push(newPositionAndMedia.mediaList[iNew]);
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

	PositionsAndMedia.prototype.addSingleMediaToPositionsAndMedia = function(singleMedia) {
		this.addPositionAndMedia(singleMedia.generatePositionAndMedia());
	};

	PositionsAndMedia.prototype.removeSingleMedia = function(singleMedia) {
		this.removePositionAndMedia(singleMedia.generatePositionAndMedia());
	};

	PositionsAndMedia.prototype.removePositionAndMedia = function(positionAndMediaToRemove) {
		var matchingPositionAndMediaIndex = -1;
		var matchingMediaIndexes = [];
		var self = this;

		this.some(
			function(positionAndMedia, positionAndMediaIndex) {
				matchingPositionAndMediaIndex = positionAndMediaIndex;
				if (positionAndMedia.matchPosition(positionAndMediaToRemove)) {
					positionAndMediaToRemove.mediaList.forEach(
						function(mediaNameListToRemoveElement) {
							for (let index = positionAndMedia.mediaList.length - 1; index >= 0; index --) {
								mediaListElement = positionAndMedia.mediaList[index];
								if (mediaListElement.isEqual(mediaNameListToRemoveElement)) {
								// 	mediaListElement.albumCacheBase === mediaNameListToRemoveElement.albumCacheBase &&
								// 	mediaListElement.cacheBase === mediaNameListToRemoveElement.cacheBase
								// ) {
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
			if (this[matchingPositionAndMediaIndex].mediaList.length === matchingMediaIndexes.length) {
				this.splice(matchingPositionAndMediaIndex, 1);
			} else {
				matchingMediaIndexes.forEach(
					function(index) {
						self[matchingPositionAndMediaIndex].mediaList.splice(index, 1);
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


	Utilities.mediaOrSubalbumsUnionForSearches = function(a, b) {
		if (! a.length) {
			a.push(... b);
			return;
		}
		if (! b.length) {
			return;
		}

		var property = 'albumName';
		if (! a[0].hasOwnProperty('albumName'))
			// searched albums haven't albumName property
			property = 'path';

		for (var i = 0; i < b.length; i ++) {
			let elementB = b[i];
			if (! a.some(
				function (elementA) {
					var bValue = elementB[property];
					var aValue = elementA[property];
					if (property == 'albumName') {
						bValue = Utilities.pathJoin([bValue, elementB.name]);
						aValue = Utilities.pathJoin([aValue, elementA.name]);
					}
					return Utilities.normalizeAccordingToOptions(bValue) == Utilities.normalizeAccordingToOptions(aValue);
				})
			)
				a.push(elementB);
		}
	};

	Media.prototype.unionForSearches = function(other) {
		Utilities.mediaOrSubalbumsUnionForSearches(this, other);
	};

	Subalbums.prototype.unionForSearches = function(other) {
		Utilities.mediaOrSubalbumsUnionForSearches(this, other);
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
				let elementB = b[i];
				if (union.indexOf(elementB) == -1)
					union.push(elementB);
			}
		} else {
			for (i = 0; i < b.length; i ++) {
				let elementB = b[i];
				if (
					a.every(
						function notEqual(element) {
							return ! equalityFunction(element, elementB);
						}
					)
				)
					union.push(elementB);
			}
		}
		return union;
	};

	Utilities.normalizeAccordingToOptions = function(object) {
		var string = object;
		if (typeof object === "object")
			string = string.join('|');

		if (! env.options.search_case_sensitive)
			string = string.toLowerCase();
		if (! env.options.search_accent_sensitive)
			string = Utilities.removeAccents(string);

		if (typeof object === "object")
			object = string.split('|');
		else
			object = string;

		return object;
	};

	Utilities.removeAccents = function(string) {
		string = string.normalize('NFD');
		var stringArray = Array.from(string);
		var resultString = '';
		for (var i = 0; i < stringArray.length; i ++) {
			if (env.options.unicode_combining_marks.indexOf(stringArray[i]) == -1)
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
			function(a, b) {
				return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
			}
		);
	};

	Utilities.sortByDate = function (subalbums) {
		subalbums.sort(
			function(a, b) {
				return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
			}
		);
	};

	Media.prototype.sortReverse = function() {
		this.reverse();
	};

	// Utilities.isSearchRootCacheBase = function(cacheBase) {
	// 	return cacheBase.indexOf(env.options.by_search_string) === 0;
	// 	// return cacheBase.indexOf(env.options.by_search_string) === 0 && cacheBase.split(env.options.cache_folder_separator).length === 3;
	// };
	//
	// Utilities.isMapRootCacheBase = function(cacheBase) {
	// 	return cacheBase.indexOf(env.options.by_map_string) === 0 && cacheBase.split(env.options.cache_folder_separator).length === 3;
	// };
	//
	// Utilities.isSelectionRootCacheBase = function(cacheBase) {
	// 	return cacheBase.indexOf(env.options.by_selection_string) === 0 && cacheBase.split(env.options.cache_folder_separator).length === 2;
	// };

	Utilities.isAnyRootHash = function(hash) {
		var cacheBase = hash;
		if (hash.indexOf(env.hashBeginning) === 0)
			cacheBase = hash.substring(env.hashBeginning);
		return Utilities.isAnyRootCacheBase(cacheBase);
	};

	Utilities.isAnyRootCacheBase = function(cacheBase) {
		var result =
			[env.options.folders_string, env.options.by_date_string, env.options.by_gps_string].indexOf(cacheBase) !== -1 ||
			Utilities.isSearchCacheBase(cacheBase) ||
			Utilities.isMapCacheBase(cacheBase) ||
			Utilities.isSelectionCacheBase(cacheBase);
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

	Utilities.isFolderCacheBase = function(cacheBase) {
		return cacheBase == env.options.folders_string || cacheBase.indexOf(env.options.foldersStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isFolder = function() {
		return Utilities.isFolderCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isFolder = function() {
		return Utilities.isFolderCacheBase(this.cacheBase);
	};

	Utilities.isByDateCacheBase = function(cacheBase) {
		return cacheBase == env.options.by_date_string || cacheBase.indexOf(env.options.byDateStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isByDate = function() {
		return Utilities.isByDateCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isByDate = function() {
		return Utilities.isByDateCacheBase(this.cacheBase);
	};

	Utilities.isByGpsCacheBase = function(cacheBase) {
		return cacheBase == env.options.by_gps_string || cacheBase.indexOf(env.options.byGpsStringWithTrailingSeparator) === 0;
	};

	Utilities.isSearchCacheBase = function(cacheBase) {
		return cacheBase.indexOf(env.options.bySearchStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isByGps = function() {
		return Utilities.isByGpsCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isByGps = function() {
		return Utilities.isByGpsCacheBase(this.cacheBase);
	};

	Album.prototype.isSearch = function() {
		return Utilities.isSearchCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isSearch = function() {
		return Utilities.isSearchCacheBase(this.cacheBase);
	};

	Utilities.isSelectionCacheBase = function(cacheBase) {
		return cacheBase.indexOf(env.options.bySelectionStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isSelection = function() {
		return Utilities.isSelectionCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isSelection = function() {
		return Utilities.isSelectionCacheBase(this.cacheBase);
	};

	Utilities.isMapCacheBase = function(cacheBase) {
		return cacheBase.indexOf(env.options.byMapStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isMap = function() {
		return Utilities.isMapCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isMap = function() {
		return Utilities.isMapCacheBase(this.cacheBase);
	};

	Album.prototype.isTransversal =  function() {
		return this.isByDate() || this.isByGps();
	};

	Subalbum.prototype.isTransversal =  function() {
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

	Subalbum.prototype.isGenerated =  function() {
		return this.isTransversal() || this.isCollection();
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
		env.currentAlbum = album;
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
		if (! env.isMobile.any()) {
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
			if (env.options.albums_slide_style)
				return Math.round((thumbnailWidth + 2 * buttonBorder) * 1.1);
			else
				return thumbnailWidth + 2 * buttonBorder;
	};

	Utilities.prototype.removeFolderString = function (cacheBase) {
		if (this.isFolderCacheBase(cacheBase)) {
			cacheBase = cacheBase.substring(env.options.folders_string.length);
			if (cacheBase.length > 0)
				cacheBase = cacheBase.substring(1);
		}
		return cacheBase;
	};

	SingleMedia.prototype.isInMapAlbum = function() {
		if (! Utilities.somethingIsInMapAlbum())
			return false;
		else {
			var index = env.mapAlbum.media.findIndex(x => x.isEqual(this));
			// var index = env.mapAlbum.media.findIndex(x => x.foldersCacheBase === this.foldersCacheBase && x.cacheBase === this.cacheBase);
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
			var index = env.searchAlbum.media.findIndex(x => x.isEqual(this));
			// var index = env.searchAlbum.media.findIndex(x => x.foldersCacheBase === this.foldersCacheBase && x.cacheBase === this.cacheBase);
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
			var foundAlbum = env.searchAlbum.subalbums.find(x => this.foldersCacheBase.indexOf(x.cacheBase) === 0);
			if (foundAlbum !== undefined)
				return foundAlbum;
			else
				return false;
		}
	};

	Utilities.somethingIsInMapAlbum = function() {
		if (env.mapAlbum.hasOwnProperty("numsMediaInSubTree") && env.mapAlbum.numsMediaInSubTree.imagesAndVideosTotal())
			return true;
		else
			return false;
	};

	Utilities.somethingIsSearched = function() {
		if (
			env.searchAlbum.hasOwnProperty("numsMediaInSubTree") && env.searchAlbum.numsMediaInSubTree.imagesAndVideosTotal() ||
			env.searchAlbum.hasOwnProperty("subalbums") && env.searchAlbum.subalbums.length
		)
			return true;
		else
			return false;
	};

	Utilities.nothingIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			return true;
		} else {
			if (env.selectionAlbum.media.length || env.selectionAlbum.subalbums.length)
				return false;
			else
				return true;
		}
	};

	Utilities.somethingIsSelected = function() {
		return ! Utilities.nothingIsSelected();
	};

	SingleMedia.prototype.isSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			return false;
		} else {
			var index = env.selectionAlbum.media.findIndex(x => x.isEqual(this));
			// var index = env.selectionAlbum.media.findIndex(x => x.foldersCacheBase === this.foldersCacheBase && x.cacheBase === this.cacheBase);
			if (index > -1)
				return true;
			else
				return false;
		}
	};

	Utilities.albumIsSelected = function(album) {
		if (env.selectionAlbum.isEmpty()) {
			return false;
		} else {
			var index = env.selectionAlbum.subalbums.findIndex(x => x.cacheBase === album.cacheBase);
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
	// 	if (env.selectionAlbum.isEmpty())
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
		if (env.selectionAlbum.isEmpty()) {
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
	// 	if (env.selectionAlbum.isEmpty()) {
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
		if (env.selectionAlbum.isEmpty()) {
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
			if (env.selectionAlbum.isEmpty())
				Utilities.initializeSelectionAlbum();
			// this.parent = env.selectionAlbum;
			env.selectionAlbum.media.push(this);

			if (this.hasGpsData()) {
				// add the media position
				env.selectionAlbum.positionsAndMediaInTree.addSingleMediaToPositionsAndMedia(this);
				env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
			}
			var singleMediaArray = new Media([this]);
			env.selectionAlbum.numsMedia.sum(singleMediaArray.imagesAndVideosCount());
			env.selectionAlbum.numsMediaInSubTree.sum(singleMediaArray.imagesAndVideosCount());
			env.selectionAlbum.sizesOfAlbum.sum(this.fileSizes);
			env.selectionAlbum.sizesOfSubTree.sum(this.fileSizes);

			env.selectionAlbum.media.sortByDate();
			env.selectionAlbum.mediaNameSort = false;
			env.selectionAlbum.mediaReverseSort = false;
			env.selectionAlbum.initializeSortPropertiesAndCookies();
			env.selectionAlbum.sortAlbumsMedia();

			// update the selector
			$(clickedSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-single-media"));
			var singleMediaSelector = "#media-select-box";
			var otherSelector;
			if (clickedSelector === singleMediaSelector) {
				otherSelector = singleMediaSelector + "-" + env.currentMediaIndex + " img";
				if ($(otherSelector).is(":visible")) {
					$(otherSelector).attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-single-media"));
				}
			} else if (parseInt(clickedSelector.substring(singleMediaSelector.length + 1)) === env.currentMediaIndex && $(singleMediaSelector).is(":visible")) {
				$(singleMediaSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-single-media"));
			}
			this.parent.invalidateAuxiliaryPositionsAndMedia();
		}

	};

	SingleMedia.prototype.removeFromSelection = function(clickedSelector) {
		if (this.isSelected()) {
			var index = env.selectionAlbum.media.findIndex(x => x.isEqual(this));
			// var index = env.selectionAlbum.media.findIndex(x => x.foldersCacheBase === this.foldersCacheBase && x.cacheBase === this.cacheBase);
			env.selectionAlbum.media.splice(index, 1);

			env.selectionAlbum.positionsAndMediaInTree.removeSingleMedia(this);
			var singleMediaArray = new Media([this]);
			env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
			env.selectionAlbum.numsMedia.subtract(singleMediaArray.imagesAndVideosCount());
			env.selectionAlbum.numsMediaInSubTree.subtract(singleMediaArray.imagesAndVideosCount());
			env.selectionAlbum.sizesOfAlbum.subtract(this.fileSizes);
			env.selectionAlbum.sizesOfSubTree.subtract(this.fileSizes);

			var singleMediaSelector = "#media-select-box";
			var otherSelector;
			if (clickedSelector === singleMediaSelector) {
				otherSelector = singleMediaSelector + "-" + env.currentMediaIndex + " img";
				if ($(otherSelector).is(":visible")) {
					$(otherSelector).attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-single-media"));
				}
			} else if (parseInt(clickedSelector.substring(singleMediaSelector.length + 1)) === env.currentMediaIndex && $(singleMediaSelector).is(":visible")) {
				$(singleMediaSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-single-media"));
			}

			if (env.currentAlbum.isSelection()) {
				if (Utilities.nothingIsSelected()) {
					Utilities.initializeSelectionAlbum();
					window.location.href = Utilities.upHash();
				} else if (env.currentMedia === null) {
					if (env.currentAlbum.isAlbumWithOneMedia()) {
						env.currentAlbum.prepareForShowing(0);
					} else {
						TopFunctions.showAlbum("refreshMedia");
					}
				} else {
					let clickedMediaIndex = parseInt(clickedSelector.split('-').pop());
					if (clickedSelector === singleMediaSelector || clickedMediaIndex === env.currentMediaIndex) {
						env.currentAlbum.prepareForShowing(-1);
					} else {
						if (env.currentMediaIndex === env.currentAlbum.media.length)
							env.currentMediaIndex -= 1;
						env.currentAlbum.prepareForShowing(env.currentMediaIndex);
					}
				}
			} else {
				// update the selector
				$(clickedSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-single-media"));
			}
			this.parent.invalidateAuxiliaryPositionsAndMedia();
		}
	};

	Album.prototype.addSubalbumToSelection = function(iSubalbum, clickedSelector) {
		var self = this;
		var subalbum = self.subalbums[iSubalbum];
		return new Promise(
			function(resolve_addSubalbum) {
				if (subalbum.isSelected()) {
					resolve_addSubalbum();
				} else {
					let convertSubalbumPromise = self.convertSubalbum(iSubalbum, null, {getMedia: false, getPositions: true});
					convertSubalbumPromise.then(
						function(iSubalbum) {
							var subalbum = self.subalbums[iSubalbum];
							if (Utilities.nothingIsSelected())
								Utilities.initializeSelectionAlbum();
							env.selectionAlbum.subalbums.push(subalbum);

							env.selectionAlbum.positionsAndMediaInTree.mergePositionsAndMedia(subalbum.positionsAndMediaInTree);
							env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
							// env.selectionAlbum.numsMedia.sum(subalbum.numsMedia);
							env.selectionAlbum.numsMediaInSubTree.sum(subalbum.numsMediaInSubTree);
							// env.selectionAlbum.sizesOfAlbum.sum(subalbum.sizesOfAlbum);
							env.selectionAlbum.sizesOfSubTree.sum(subalbum.sizesOfSubTree);
							env.selectionAlbum.numsProtectedMediaInSubTree.sum(subalbum.numsProtectedMediaInSubTree);

							subalbum.generateAlbumNameForSelectionAndSearchAlbum().then(
								function() {
									Utilities.sortByDate(env.selectionAlbum.subalbums);
									env.selectionAlbum.albumNameSort = false;
									env.selectionAlbum.albumReverseSort = false;
									env.selectionAlbum.initializeSortPropertiesAndCookies();
									env.selectionAlbum.sortAlbumsMedia();
									resolve_addSubalbum();
								}
							);
						}
					);
					$(clickedSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-subalbum"));
					self.invalidateAuxiliaryPositionsAndMedia();
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
					// if (env.selectionAlbum.numsMediaInSubTree.imagesAndVideosTotal()) {
					let convertSubalbumPromise = self.convertSubalbum(iSubalbum, null, {getMedia: true, getPositions: true});
					convertSubalbumPromise.then(
						function(iSubalbum) {
							var subalbum = self.subalbums[iSubalbum];
							env.selectionAlbum.subalbums.splice(iSubalbum, 1);

							if (subalbum.positionsAndMediaInTree.length) {
								env.selectionAlbum.positionsAndMediaInTree.removePositionsAndMedia(subalbum.positionsAndMediaInTree);
								env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
							}
							// env.selectionAlbum.numsMedia.subtract(subalbum.numsMedia);
							env.selectionAlbum.numsMediaInSubTree.subtract(subalbum.numsMediaInSubTree);
							// env.selectionAlbum.subtract(subalbum.sizesOfAlbum);
							env.selectionAlbum.sizesOfSubTree.subtract(subalbum.sizesOfSubTree);
							env.selectionAlbum.numsProtectedMediaInSubTree.subtract(subalbum.numsProtectedMediaInSubTree);

							if (env.currentAlbum.isSelection()) {
								if (Utilities.nothingIsSelected()) {
									Utilities.initializeSelectionAlbum();
									window.location.href = Utilities.upHash();
								} else {
									env.currentAlbum.prepareForShowing(-1);
								}
							}

							resolve_removeSubalbum();
						}
					);
					// }

					if (! env.currentAlbum.isSelection()) {
						$(clickedSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-subalbum"));
					}
					self.invalidateAuxiliaryPositionsAndMedia();
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

	SingleMedia.prototype.chooseReducedPhoto = function(container, fullScreenStatus) {
		var chosenMedia, reducedWidth, reducedHeight;
		var mediaWidth = this.metadata.size[0], mediaHeight = this.metadata.size[1];
		var mediaSize = Math.max(mediaWidth, mediaHeight);
		var mediaRatio = mediaWidth / mediaHeight, containerRatio;

		chosenMedia = this.originalMediaPath();
		env.maxSize = 0;

		if (container === null) {
			// try with what is more probable to be the container
			if (fullScreenStatus)
				container = $(window);
			else {
				container = $(".media-box#center .media-box-inner");
			}
		}

		var containerWidth = container.width();
		var containerHeight = container.height();
		containerRatio = container.width() / container.height();

		if (
			mediaRatio >= containerRatio && mediaWidth <= containerWidth * env.devicePixelRatio ||
			mediaRatio < containerRatio && mediaHeight <= containerHeight * env.devicePixelRatio
		) {
			// the original media is smaller than the container, use it
		} else {
			for (var i = 0; i < env.options.reduced_sizes.length; i++) {
				if (env.options.reduced_sizes[i] < mediaSize) {
					if (mediaWidth > mediaHeight) {
						reducedWidth = env.options.reduced_sizes[i];
						reducedHeight = env.options.reduced_sizes[i] * mediaHeight / mediaWidth;
					} else {
						reducedHeight = env.options.reduced_sizes[i];
						reducedWidth = env.options.reduced_sizes[i] * mediaWidth / mediaHeight;
					}

					if (
						mediaRatio > containerRatio && reducedWidth < containerWidth * env.devicePixelRatio ||
						mediaRatio < containerRatio && reducedHeight < containerHeight * env.devicePixelRatio
					)
						break;
				}
				chosenMedia = this.mediaPath(env.options.reduced_sizes[i]);
				env.maxSize = env.options.reduced_sizes[i];
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

			mediaSrc = this.chooseReducedPhoto(container, fullScreenStatus);
		}

		return mediaSrc;
	};

	Sizes.prototype.sum = function(sizes2) {
		var keys = Object.keys(this);
		for (var i = 0; i < keys.length; i++)
			this[keys[i]] = new ImagesAndVideos(
				{
					images: this[keys[i]].images + sizes2[keys[i]].images,
					videos: this[keys[i]].videos + sizes2[keys[i]].videos
				}
			);
	};

	NumsProtected.prototype.sum = function(numsProtectedSize2) {
		var keys = Utilities.arrayUnion(Object.keys(this), Object.keys(numsProtectedSize2));
		for (var i = 0; i < keys.length; i++) {
			if (this[keys[i]] !== undefined && numsProtectedSize2[keys[i]] !== undefined) {
				this[keys[i]] = new ImagesAndVideos(
					{
						images: this[keys[i]].images + numsProtectedSize2[keys[i]].images,
						videos: this[keys[i]].videos + numsProtectedSize2[keys[i]].videos
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
					images: this[keys[i]].images - sizes2[keys[i]].images,
					videos: this[keys[i]].videos - sizes2[keys[i]].videos
				}
			);
	};

	NumsProtected.prototype.subtract = function(numsProtectedSize2) {
		var keys = Utilities.arrayUnion(Object.keys(this), Object.keys(numsProtectedSize2));
		for (var i = 0; i < keys.length; i++) {
			if (this[keys[i]] !== undefined && numsProtectedSize2[keys[i]] !== undefined) {
				this[keys[i]] = new ImagesAndVideos(
					{
						images: this[keys[i]].images - numsProtectedSize2[keys[i]].images,
						videos: this[keys[i]].videos - numsProtectedSize2[keys[i]].videos
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
		for (var i = 0; i < env.options.reduced_sizes.length; i ++) {
			if (currentReduction === env.currentMedia.mediaPath(env.options.reduced_sizes[i])) {
				return [env.options.reduced_sizes[i], i];
			}
		}

		// default: it's the original image
		return [Math.max(env.currentMedia.metadata.size[0], env.currentMedia.metadata.size[1]), -1];
	};

	Utilities.nextSizeAndIndex = function() {
		// Returns the size of the reduction immediately bigger than that in the DOM and its reduction index
		// Returns the original photo size and -1 if the reduction in the DOM is the biggest one
		// Returns [false, false] if the original image is already in the DOM

		var [currentReductionSize, currentReductionIndex] = Utilities.currentSizeAndIndex();
		if (currentReductionIndex === -1)
			return [false, false];

		if (currentReductionIndex === 0)
			return [Math.max(env.currentMedia.metadata.size[0], env.currentMedia.metadata.size[1]), -1];

		return [env.options.reduced_sizes[currentReductionIndex - 1], currentReductionIndex - 1];


		// var theNextSizeIndex = Utilities.nextSizeIndex();
		//
		// if (theNextSizeIndex === false)
		// 	return false;
		// else if (theNextSizeIndex === -1)
		// 	return 0;
		// else
		// 	return env.options.reduced_sizes[theNextSizeIndex];
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
			return Utilities.pathJoin([env.currentMedia.albumName, env.currentMedia.name]);

		return env.currentMedia.mediaPath(nextReductionSize);
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

			mediaSrc = this.chooseReducedPhoto(container, fullScreenStatus);

			if (env.maxSize) {
				// correct phisical width and height according to reduction sizes
				if (mediaWidth > mediaHeight) {
					attrWidth = env.maxSize;
					attrHeight = Math.round(mediaHeight / mediaWidth * env.maxSize);
				} else {
					attrHeight = env.maxSize;
					attrWidth = Math.round(mediaWidth / mediaHeight * env.maxSize);
				}
			}

			mediaElement = $('<img/>');
			if (env.currentAlbum.isFolder())
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
		if (env.options.browser_unsupported_mime_types.includes(this.mimeType))
			return Utilities.pathJoin([env.options.server_cache_path, this.convertedPath]);
		else
			return this.trueOriginalMediaPath();
	};

	SingleMedia.prototype.trueOriginalMediaPath = function() {
		return Utilities.pathJoin([this.albumName, this.name]);
	};

	SingleMedia.prototype.mediaPath = function(size) {
		var suffix = env.options.cache_folder_separator, hash, rootString = "root-";
		if (
			this.mimeType.indexOf("image") === 0 ||
			this.mimeType.indexOf("video") === 0 && [env.options.album_thumb_size, env.options.media_thumb_size].indexOf(size) != -1
		) {
			var actualSize = size;
			var albumThumbSize = env.options.album_thumb_size;
			var mediaThumbSize = env.options.media_thumb_size;
			if ((size == albumThumbSize || size == mediaThumbSize) && env.devicePixelRatio > 1) {
				actualSize = Math.round(actualSize * env.options.mobile_thumbnail_factor);
				albumThumbSize = Math.round(albumThumbSize * env.options.mobile_thumbnail_factor);
				mediaThumbSize = Math.round(mediaThumbSize * env.options.mobile_thumbnail_factor);
			}
			suffix += actualSize.toString();
			if (size == env.options.album_thumb_size) {
				suffix += "a";
				if (env.options.album_thumb_type == "square")
					suffix += "s";
				else if (env.options.album_thumb_type == "fit")
					suffix += "f";
			}
			else if (size == env.options.media_thumb_size) {
				suffix += "t";
				if (env.options.media_thumb_type == "square")
					suffix += "s";
				else if (env.options.media_thumb_type == "fixed_height")
					suffix += "f";
			}
			suffix += ".jpg";
		} else if (this.mimeType.indexOf("video") === 0) {
			suffix += "transcoded.mp4";
		}

		hash = this.foldersCacheBase + env.options.cache_folder_separator + this.cacheBase + suffix;
		if (hash.indexOf(rootString) === 0)
			hash = hash.substring(rootString.length);
		else {
			if (Utilities.isFolderCacheBase(hash))
				hash = hash.substring(env.options.foldersStringWithTrailingSeparator.length);
			else if (Utilities.isByDateCacheBase(hash))
				hash = hash.substring(env.options.byDateStringWithTrailingSeparator.length);
			else if (Utilities.isByGpsCacheBase(hash))
				hash = hash.substring(env.options.byGpsStringWithTrailingSeparator.length);
			else if (Utilities.isSearchCacheBase(hash))
				hash = hash.substring(env.options.bySearchStringWithTrailingSeparator.length);
			else if (Utilities.isSelectionCacheBase(hash))
				hash = hash.substring(env.options.bySelectionStringWithTrailingSeparator.length);
			else if (Utilities.isMapCacheBase(hash))
				hash = hash.substring(env.options.byMapStringWithTrailingSeparator.length);
		}
		if (this.cacheSubdir)
			return Utilities.pathJoin([env.options.server_cache_path, this.cacheSubdir, hash]);
		else
			return Utilities.pathJoin([env.options.server_cache_path, hash]);
	};

	Utilities.mediaBoxContainerHeight = function() {
		var heightForMediaAndTitle;
		env.windowHeight = $(window).innerHeight();
		heightForMediaAndTitle = env.windowHeight;
		if ($("#album-view").is(":visible"))
			// 22 is for the scroll bar and the current media marker
			// 5 is an extra space
			heightForMediaAndTitle -= env.options.media_thumb_size + 22 + 5;

		return heightForMediaAndTitle;
	};

	Utilities.prototype.scaleMedia = function(event) {
		// this function works on the img tag identified by event.data.id
		// it adjusts width, height and position so that it fits in its parent (<div class="media-box-inner">, or the whole window)
		// and centers vertically
		return new Promise(
			function(resolve_scaleMedia) {
				var singleMedia = event.data.singleMedia, mediaElement, container, photoSrc, previousSrc;
				var containerHeight = $(window).innerHeight(), containerWidth = $(window).innerWidth(), containerRatio;
				var mediaBarBottom = 0;
				var mediaWidth, mediaHeight, attrWidth, attrHeight;
				var id = event.data.id;
				var heightForMedia, heightForMediaAndTitle, titleHeight;

				env.windowWidth = $(window).innerWidth();
				heightForMediaAndTitle = Utilities.mediaBoxContainerHeight();

				// widths must be set before calculating title height
				if (event.data.resize && id === "center") {
					// this is executed only when resizing, it's not needed when first scaling
					$("#media-box-container").css("width", env.windowWidth * 3).css("transform", "translate(-" + env.windowWidth + "px, 0px)");
					$(".media-box").css("width", env.windowWidth);
					$(".media-box .media-box-inner").css("width", env.windowWidth);
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

				if (singleMedia.mimeType.indexOf("image") === 0)
					mediaElement = $(".media-box#" + id + " .media-box-inner img");
				else if (singleMedia.mimeType.indexOf("video") === 0)
					mediaElement = $(".media-box#" + id + " .media-box-inner video");

				mediaWidth = singleMedia.metadata.size[0];
				mediaHeight = singleMedia.metadata.size[1];
				attrWidth = mediaWidth;
				attrHeight = mediaHeight;

				if (env.fullScreenStatus && Modernizr.fullscreen)
					container = $(window);
				else {
					container = $(".media-box#" + id + " .media-box-inner");
				}

				containerHeight = heightForMedia;
				containerRatio = containerWidth / containerHeight;

				if (singleMedia.mimeType.indexOf("image") === 0) {
					photoSrc = singleMedia.chooseReducedPhoto(container, env.fullScreenStatus);
					previousSrc = mediaElement.attr("src");

					if (encodeURI(photoSrc) != previousSrc && event.data.currentZoom === event.data.initialZoom) {
						// resizing had the effect that a different reduction has been choosed

						// chooseReducedPhoto() sets env.maxSize to 0 if it returns the original media
						if (env.maxSize) {
							if (mediaWidth > mediaHeight) {
								attrWidth = env.maxSize;
								attrHeight = Math.round(mediaHeight / mediaWidth * attrWidth);
							} else {
								attrHeight = env.maxSize;
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
					resolve_scaleMedia([containerHeight, containerWidth]);

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
		var basePath = env.currentAlbum.path;
		zipFilename = env.options.page_title + '.';
		if (env.currentAlbum.isSearch()) {
			zipFilename += Utilities._t("#by-search") + " '" + $("#search-field").val() + "'";
		} else if (env.currentAlbum.isSelection()) {
			zipFilename += Utilities._t("#by-selection");
		} else if (env.currentAlbum.isByDate()) {
			let textComponents = env.currentAlbum.path.split("/").splice(1);
			if (textComponents.length > 1)
				textComponents[1] = Utilities._t("#month-" + textComponents[1]);

			zipFilename += textComponents.join('-');
		} else if (env.currentAlbum.isByGps()) {
			zipFilename += env.currentAlbum.ancestorsNames.splice(1).join('-');
		} else if (env.currentAlbum.isMap()) {
			zipFilename += Utilities._t("#from-map");
		} else if (env.currentAlbum.cacheBase !== env.options.folders_string)
			zipFilename += env.currentAlbum.name;

		zipFilename += ".zip";

		var addMediaAndSubalbumsPromise = addMediaAndSubalbumsFromAlbum(env.currentAlbum);
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

		function addMediaAndSubalbumsFromAlbum(album, subalbum = "") {
			return new Promise(
				function(resolve_addMediaAndSubalbumsFromAlbum) {
					var albumPromises = [];

					for (let iMedia = 0; iMedia < album.media.length; iMedia ++) {
						if (
							album.media[iMedia].mimeType.indexOf("image") === 0 && what === "videos" ||
							album.media[iMedia].mimeType.indexOf("video") === 0 && what === "images"
						)
							continue;

						let mediaPromise = new Promise(
							function(resolveMediaPromise) {
								let url;
								if (size === 0)
									url = encodeURI(album.media[iMedia].trueOriginalMediaPath());
								else
									url = encodeURI(album.media[iMedia].mediaPath(size));
								let name = album.media[iMedia].name;
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
										resolveMediaPromise();
									}
								);
							}
						);
						albumPromises.push(mediaPromise);
					}

					if (everything) {
						for (let iSubalbum = 0; iSubalbum < album.subalbums.length; iSubalbum ++) {
							let subalbumPromise = new Promise(
								function(resolveSubalbumPromise) {
									// let ithSubalbum = album.subalbums[iSubalbum];
									let convertSubalbumPromise = album.convertSubalbum(iSubalbum, null, {getMedia: true, getPositions: false});
									convertSubalbumPromise.then(
										function(iSubalbum) {
											let albumPath = album.subalbums[iSubalbum].path;
											if (album.isSearch() || album.isSelection())
												// remove the leading folders/date/gps/map string
												albumPath = albumPath.split('/').splice(1).join('/');
											else
												albumPath = albumPath.substring(basePath.length + 1);
											let addMediaAndSubalbumsPromise = addMediaAndSubalbumsFromAlbum(album.subalbums[iSubalbum], albumPath);
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
		var result = firstLine + env.positionMarker;
		if (secondLine)
			result += "<br /><span class='second-line'>" + secondLine + "</span>";
		return result;
	};

	Utilities.convertByDateAncestosNames = function(ancestorsNames) {
		if (ancestorsNames[0] === env.options.by_date_string && ancestorsNames.length > 2) {
			let result = ancestorsNames.slice();
			result[2] = Utilities._t("#month-" + result[2]);
			return result;
		} else {
			return ancestorsNames;
		}

	};

	Album.prototype.generateAlbumNameForSelectionAndSearchAlbum = function() {
		var self = this;
		return new Promise(
			function (resolve_folderNameAndTitle) {
				var folderName = "", firstLine = '', secondLine = '';
				var raquo = "<span class='gray separated'>&raquo;</span>";
				var folderArray = self.cacheBase.split(env.options.cache_folder_separator);
				var nameSorting = Utilities.convertByDateAncestosNames(self.ancestorsNames).slice(1).reverse().join(env.options.cache_folder_separator).replace(/^0+/, '');
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
											secondLine = secondLine.replace(marker, "<a href='" + env.hashBeginning + gottenAlbum.cacheBase+ "'>" + albumName + "</a>");
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
					for (let iCacheBase = 0; iCacheBase < self.ancestorsCacheBase.length - 1; iCacheBase ++) {
						if (iCacheBase == 0 && self.ancestorsCacheBase.length === 2) {
							secondLine = "<span class='gray'>(" + Utilities._t("#regular-album") + ")</span> ";
						} else {
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
												secondLine = secondLine.replace(marker, "<a href='" + env.hashBeginning + gottenAlbum.cacheBase+ "'>" + gottenAlbum.name + "</a>");
												// $("#subalbums").html($("#subalbums").html().replace(marker, albumName));
												resolve_ithCacheBasePromise();
											}
										);
									}
								)
							);
						}
					}
					Promise.all(cacheBasesPromises).then(
						function() {
							folderName = Utilities.combineFirstAndSecondLine(firstLine, secondLine);
							self.selectionAlbumName = folderName;
							self.selectionAlbumNameSorting = nameSorting;
							resolve_folderNameAndTitle();
						}
					);
				}
			}
		);
	};

	Album.prototype.subalbumName = function(subalbum) {
		var folderName = '';
		if (this.isSelection() || this.isSearch() && subalbum.hasOwnProperty("selectionAlbumName")) {
			folderName = subalbum.selectionAlbumName;
		} else if (this.isByDate()) {
			let folderArray = subalbum.cacheBase.split(env.options.cache_folder_separator);
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
		containerHeight = env.windowHeight - titleHeight - albumHeight;
		containerWidth = env.windowWidth;
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
		containerHeight = env.windowHeight - titleHeight - albumHeight;
		containerWidth = env.windowWidth;
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
		var result = new NumsProtected({}), i, codesComplexcombination, albumOrSubalbum;

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
			Utilities.distanceBetweenCoordinatePoints({lng: point1.lng, lat: point1.lat}, {lng: point2.lng, lat: point1.lat}),
			Utilities.distanceBetweenCoordinatePoints({lng: point1.lng, lat: point2.lat}, {lng: point2.lng, lat: point2.lat})
		);
	};

	Utilities.yDistanceBetweenCoordinatePoints = function(point1, point2) {
		return Utilities.distanceBetweenCoordinatePoints({lng: point1.lng, lat: point1.lat}, {lng: point1.lng, lat: point2.lat});
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
		if (env.isMobile.any()) {
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
		if (env.isMobile.any()) {
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
		if (! env.fullScreenStatus && env.currentAlbum.numsMedia.imagesAndVideosTotal() > 1) {
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
				if (env.currentAlbum === null) {
					env.fromEscKey = true;
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
			hash = window.location.hash;
		var [albumHash, mediaHash, mediaFolderHash, foundAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(hash);

		if (mediaHash === null || env.currentAlbum.isAlbumWithOneMedia()) {
			// hash of an album: go up in the album tree
			if (savedSearchAlbumHash !== null) {
				if (albumHash == foundAlbumHash)
					resultHash = savedSearchAlbumHash;
				else {
					// we must go up in the sub folder
					albumHash = albumHash.split(env.options.cache_folder_separator).slice(0, -1).join(env.options.cache_folder_separator);
					resultHash = Utilities.pathJoin([
						albumHash,
						foundAlbumHash,
						savedSearchAlbumHash
					]);
				}
			} else {
				if (albumHash == env.options.folders_string) {
					// stay there
					resultHash = albumHash;
				} else if (Utilities.isAnyRootHash(albumHash)) {
					// go to folders root
					resultHash = env.options.folders_string;
				} else if (Utilities.isSearchCacheBase(albumHash) || Utilities.isMapCacheBase(albumHash)) {
					// the return folder must be extracted from the album hash
					resultHash = albumHash.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
				} else {
					let album = env.cache.getAlbum(albumHash);
					if (Utilities.isSelectionCacheBase(albumHash) && ! album) {
						resultHash = env.options.folders_string;
					} else if (Utilities.isSelectionCacheBase(albumHash) && album.media.length > 1) {
						// if all the media belong to the same album => the parent
						// other ways => the common root of the selected media
						let minimumLength = 100000;
						let parts = [];
						for (let iMedia = 0; iMedia < album.media.length; iMedia ++) {
							let splittedSelectedMediaCacheBase = album.media[iMedia].foldersCacheBase.split(env.options.cache_folder_separator);
							if (splittedSelectedMediaCacheBase.length < minimumLength)
								minimumLength = splittedSelectedMediaCacheBase.length;
						}
						for (let iPart = 0; iPart < minimumLength; iPart ++)
							parts[iPart] = [];
						for (let iMedia = 0; iMedia < album.media.length; iMedia ++) {
							let splittedSelectedMediaCacheBase = album.media[iMedia].foldersCacheBase.split(env.options.cache_folder_separator);
							for (let iPart = 0; iPart < minimumLength; iPart ++) {
								if (! iPart)
									parts[iPart][iMedia] = splittedSelectedMediaCacheBase[iPart];
								else
									parts[iPart][iMedia] = parts[iPart - 1][iMedia] + env.options.cache_folder_separator + splittedSelectedMediaCacheBase[iPart];
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
						resultHash = albumHash.split(env.options.cache_folder_separator).slice(0, -1).join(env.options.cache_folder_separator);
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

		return env.hashBeginning + resultHash;
	};


	/* Error displays */
	Utilities.prototype.errorThenGoUp = function(error) {
		if (error == 403) {
			$("#auth-text").stop().fadeIn(1000);
			$("#password").focus();
		} else {
			// Jason's code only had the following line
			//$("#error-text").stop().fadeIn(2500);

			var rootHash = env.hashBeginning + env.options.folders_string;

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
			if (env.currentMedia !== null && (env.currentAlbum === null || this.cacheBase === env.currentAlbum.cacheBase)) {
				env.currentMediaIndex = this.media.findIndex(
					function(thisMedia) {
						var matches =
							thisMedia.cacheBase == env.currentMedia.cacheBase && thisMedia.foldersCacheBase == env.currentMedia.foldersCacheBase;
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
			Functions.setBooleanCookie("albumNameSortRequested", env.options.default_album_name_sort);
		if (Functions.getBooleanCookie("albumReverseSortRequested") === null)
			Functions.setBooleanCookie("albumReverseSortRequested", env.options.default_album_reverse_sort);

		if (Functions.getBooleanCookie("mediaNameSortRequested") === null)
			Functions.setBooleanCookie("mediaNameSortRequested", env.options.default_media_name_sort);
		if (Functions.getBooleanCookie("mediaReverseSortRequested") === null)
			Functions.setBooleanCookie("mediaReverseSortRequested", env.options.default_media_reverse_sort);
	};

	/* make static methods callable as member functions */
	// Utilities.prototype.convertComplexCombinationToCodesComplexCombination = Utilities.convertComplexCombinationToCodesComplexCombination;
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
	Utilities.prototype.somethingIsSelected = Utilities.somethingIsSelected;
	Utilities.prototype.somethingIsSearched = Utilities.somethingIsSearched;
	Utilities.prototype.somethingIsInMapAlbum = Utilities.somethingIsInMapAlbum;
	Utilities.prototype.initializeSelectionAlbum = Utilities.initializeSelectionAlbum;
	Utilities.prototype.transformAltPlaceName = Utilities.transformAltPlaceName;
	// Utilities.prototype.arrayUnion = Utilities.arrayUnion;
	Utilities.prototype.normalizeAccordingToOptions = Utilities.normalizeAccordingToOptions;
	Utilities.prototype.removeAccents = Utilities.removeAccents;

	window.Utilities = Utilities;
}());
