/*jshint esversion: 6 */
(function() {
	var lastSelectionAlbumIndex = 0;
	var lastMapAlbumIndex = 0;
	/* constructor */
	function Utilities() {
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

		if (env.guessedPasswordsMd5.length) {
			newForm.append(
				jQuery(
					"<input>",
					{
						name: "guessedPasswordsMd5",
						value: env.guessedPasswordsMd5.join('-'),
						type: "hidden"
					}
				)
			).append(
				jQuery(
					"<input>",
					{
						name: "guessedPasswordCodes",
						value: env.guessedPasswordCodes.join('-'),
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
			env.guessedPasswordsMd5 = postData.guessedPasswordsMd5.split('-');
			env.guessedPasswordCodes = postData.guessedPasswordCodes.split('-');
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
		// rootMapAlbum.numsProtectedMediaInSubTree[","].sum(newMapAlbum.numsProtectedMediaInSubTree[","]);

		newMapAlbum.ancestorsCacheBase = rootMapAlbum.ancestorsCacheBase.slice();
		newMapAlbum.ancestorsCacheBase.push(newMapAlbum.cacheBase);

		return newMapAlbum;
	};

	Utilities.prototype.initializeSearchAlbumBegin = function(albumCacheBase) {
		var newSearchAlbum = new Album(albumCacheBase);
		// newSearchAlbum.positionsAndMediaInTree = [];
		// newSearchAlbum.media = [];
		// newSearchAlbum.subalbums = [];
		// newSearchAlbum.numsMedia = new ImagesAndVideos();
		// newSearchAlbum.numsMediaInSubTree = new ImagesAndVideos();
		// newSearchAlbum.sizesOfAlbum = JSON.parse(JSON.stringify(initialSizes));
		// newSearchAlbum.sizesOfSubTree = JSON.parse(JSON.stringify(initialSizes));
		// newSearchAlbum.cacheBase = albumCacheBase;
		newSearchAlbum.path = newSearchAlbum.cacheBase.replace(env.options.cache_folder_separator, "/");
		newSearchAlbum.ancestorsNames = [env.options.by_search_string, newSearchAlbum.cacheBase];
		// newSearchAlbum.physicalPath = newSearchAlbum.path;
		// newSearchAlbum.numsProtectedMediaInSubTree = {",": new ImagesAndVideos()};
		newSearchAlbum.includedFilesByCodesSimpleCombination = new IncludedFiles({",": {}});
		// newSearchAlbum.includedFilesByCodesSimpleCombination[","] = false;

		return newSearchAlbum;
	};

	Album.prototype.initializeSearchAlbumEnd = function() {
		var rootSearchAlbum = env.cache.getAlbum(env.options.by_search_string);
		if (! rootSearchAlbum) {
			rootSearchAlbum = new Album(env.options.by_search_string);
			env.cache.putAlbum(rootSearchAlbum);
		}

		rootSearchAlbum.numsMediaInSubTree.sum(this.numsMediaInSubTree);
		// rootSearchAlbum.subalbums.push(newSearchAlbum);
		rootSearchAlbum.positionsAndMediaInTree.mergePositionsAndMedia(this.positionsAndMediaInTree);
		rootSearchAlbum.numPositionsInTree = rootSearchAlbum.positionsAndMediaInTree.length;
		// rootSearchAlbum.numPositionsInTree += this.numPositionsInTree;
		// rootSearchAlbum.numsProtectedMediaInSubTree[","].sum(this.numsProtectedMediaInSubTree[","]);

		this.ancestorsCacheBase = rootSearchAlbum.ancestorsCacheBase.slice();
		this.ancestorsCacheBase.push(this.cacheBase);
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
		// rootSelectionAlbum.numsProtectedMediaInSubTree[","].sum(env.selectionAlbum.numsProtectedMediaInSubTree[","]);

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
		var keysWithShorcut = [
			"#next-media-title",
			"#prev-media-title",
			".metadata-show",
			".metadata-hide",
			".original-link",
			".download-link",
			".map-link",
			".enter-fullscreen",
			".exit-fullscreen"
		];

		env.language = Utilities.getLanguage();
		for (var key in translations.en) {
			if (translations[env.language].hasOwnProperty(key) || translations.en.hasOwnProperty(key)) {
				keyLanguage = env.language;
				if (! translations[env.language].hasOwnProperty(key))
					keyLanguage = 'en';

				if (key === '.title-string' && document.title.substr(0, 5) != "<?php")
					// don't set page title, php has already set it
					continue;
				selector = $(key);
				if (selector.length) {
					let translation = translations[keyLanguage][key];
					if (! env.isMobile.any() && keysWithShorcut.indexOf(key) !== -1)
						translation += " [" + translations[keyLanguage][key + "-shortcut"] + "]"
					selector.html(translation);
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

	Album.prototype.guessedPasswordCodes = function() {
		return Utilities.arrayIntersect(this.passwordCodes(), env.guessedPasswordCodes);
	};

	Album.prototype.passwordCodes = function() {
		var self;
		if (this.isSearch())
			self = env.cache.getAlbum(env.options.by_search_string);
		else
			self = this;

		var codes = [];
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

	Utilities.prototype.windowVerticalScrollbarWidth = function() {
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

	Utilities.arrayIntersect = function(a, b) {
		if (b.length > a.length) {
			// indexOf to loop over shorter
			[a, b] = [b, a];
		}

		let intersection = [];
		for (let i = 0; i < b.length; i ++) {
			let elementB = b[i];
			if (a.indexOf(elementB) !== -1)
				intersection.push(elementB);
		}

		return intersection;
	};

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
					if (property === 'albumName') {
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
			if (newPositionAndMedia.lng === positionAndMedia.lng && newPositionAndMedia.lat === positionAndMedia.lat) {
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
				return;
			}
		}
		this.push(newPositionAndMedia);
	};

	PositionAndMedia.prototype.matchPosition = function(positionAndMedia2) {
		return (JSON.stringify([this.lat, this.lng]) === JSON.stringify([positionAndMedia2.lat, positionAndMedia2.lng]));
	};

	PositionsAndMedia.prototype.mergePositionsAndMedia = function(newPositionsAndMedia) {
		for (var i = 0; i < newPositionsAndMedia.length; i ++) {
			this.addPositionAndMedia(newPositionsAndMedia[i]);
		}
	};

	PositionsAndMedia.prototype.removePositionsAndMedia = function(positionsAndMediaToRemove) {
		for (let indexPositions = positionsAndMediaToRemove.length - 1; indexPositions >= 0; indexPositions --) {
			let positionAndMediaToRemove = positionsAndMediaToRemove[indexPositions];
			this.removePositionAndMedia(positionAndMediaToRemove);
		}
	};

	PositionsAndMedia.prototype.addSingleMedia = function(singleMedia, album) {
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
								if (positionAndMedia.mediaList[index].isEqual(mediaNameListToRemoveElement)) {
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
				for (let i = 0; i < self.subalbums.length; i ++) {
					let iSubalbum = i;
					let ithSubalbum = self.subalbums[iSubalbum];
					let ithPromise = new Promise(
						function(resolve_ithPromise) {
							let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: false});
							convertSubalbumPromise.then(
								function(ithSubalbum) {
									self.subalbums[iSubalbum] = ithSubalbum;
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
				for (let i = 0; i < self.subalbums.length; i ++) {
					let iSubalbum = i;
					let ithSubalbum = self.subalbums[iSubalbum];
					let ithPromise = new Promise(
						function(resolve_ithPromise) {
							let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: false});
							convertSubalbumPromise.then(
								function(ithSubalbum) {
									self.subalbums[iSubalbum] = ithSubalbum;
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
					for (let i = 0; i < self.subalbums.length; i ++) {
						let iSubalbum = i;
						let ithSubalbum = self.subalbums[iSubalbum];
						let ithPromise = new Promise(
							function(resolve_ithPromise, reject_ithPromise) {
								let convertSubalbumPromise = ithSubalbum.toAlbum(null, {getMedia: true, getPositions: false});
								convertSubalbumPromise.then(
									function(ithSubalbum) {
										self.subalbums[iSubalbum] = ithSubalbum;
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
					if (property === 'albumName') {
						bValue = Utilities.pathJoin([bValue, elementB.name]);
						aValue = Utilities.pathJoin([aValue, elementA.name]);
					}
					return Utilities.normalizeAccordingToOptions(bValue) === Utilities.normalizeAccordingToOptions(aValue);
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
				if (union.indexOf(elementB) === -1)
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

	Utilities.prototype.encodeNonLetters = function(object) {
		var string = object;
		if (typeof object === "object")
			string = string.join('|');

		string = string.replace(/([^\p{L}_])/ug, match => match === "-" ? "%2D" : encodeURIComponent(match));

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
			if (env.options.unicode_combining_marks.indexOf(stringArray[i]) === -1)
				resultString += stringArray[i];
		}
		return resultString;
	};

	Utilities.pathJoin = function(pathArr) {
		var result = '';
		for (var i = 0; i < pathArr.length; ++i) {
			if (i < pathArr.length - 1 && pathArr[i] && pathArr[i][pathArr[i].length - 1] != "/")
				pathArr[i] += '/';
			if (i && pathArr[i] && pathArr[i][0] === "/")
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
				Utilities.sortBy(this.subalbums, ['captionForSelectionSorting']);
				// this.subalbums = Utilities.sortBy(this.subalbums, ['altName', 'name', 'path']);
			} else if (this.isSearch()) {
				Utilities.sortBy(this.subalbums, ['captionForSelectionSorting']);
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

	Utilities.prototype.isSearchRootCacheBase = function(cacheBase) {
		return cacheBase.indexOf(env.options.by_search_string) === 0;
		// return cacheBase.indexOf(env.options.by_search_string) === 0 && cacheBase.split(env.options.cache_folder_separator).length === 3;
	};

	// Utilities.isMapRootCacheBase = function(cacheBase) {
	// 	return cacheBase.indexOf(env.options.by_map_string) === 0 && cacheBase.split(env.options.cache_folder_separator).length === 3;
	// };
	//
	// Utilities.isSelectionRootCacheBase = function(cacheBase) {
	// 	return cacheBase.indexOf(env.options.by_selection_string) === 0 && cacheBase.split(env.options.cache_folder_separator).length === 2;
	// };

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
		return cacheBase === env.options.folders_string || cacheBase.indexOf(env.options.foldersStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isFolder = function() {
		return Utilities.isFolderCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isFolder = function() {
		return Utilities.isFolderCacheBase(this.cacheBase);
	};

	Utilities.isByDateCacheBase = function(cacheBase) {
		return cacheBase === env.options.by_date_string || cacheBase.indexOf(env.options.byDateStringWithTrailingSeparator) === 0;
	};

	Album.prototype.isByDate = function() {
		return Utilities.isByDateCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isByDate = function() {
		return Utilities.isByDateCacheBase(this.cacheBase);
	};

	Utilities.isByGpsCacheBase = function(cacheBase) {
		return cacheBase === env.options.by_gps_string || cacheBase.indexOf(env.options.byGpsStringWithTrailingSeparator) === 0;
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

	Utilities.prototype.isCollectionCacheBase = function(cacheBase) {
		return Utilities.isMapCacheBase(cacheBase) || Utilities.isSearchCacheBase(cacheBase) || Utilities.isSelectionCacheBase(cacheBase);
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
		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, savedSearchAlbumCacheBase] = PhotoFloat.decodeHash(location.hash);
		var cacheBase = PhotoFloat.convertHashToCacheBase(location.hash);
		if (Utilities.isSearchCacheBase(cacheBase) || savedSearchAlbumCacheBase !== null)
			return true;
		else
			return false;
	};

	Utilities.toggleMenu = function() {
		$("ul#right-menu").toggleClass("expand");
		if ($("ul#right-menu").hasClass("expand")) {
			if (! $(".sub-menu:not(.hidden)").length)
				Utilities.focusSearchField();
			$("#album-view").css("opacity", "0.3");
			$(".leaflet-popup-content-wrapper").css("background-color", "darkgray");
			Functions.updateMenu();
		} else {
			$("#album-view").css("opacity", "");
			$(".leaflet-popup-content-wrapper").css("background-color", "");
		}
	};

	Utilities.prototype.noResults = function(album, resolveParseHash, selector) {
		// no media found or other search fail, show the message
		env.currentAlbum = album;
		TopFunctions.setTitle("album", null);
		if (! $("ul#right-menu").hasClass("expand"))
			Utilities.toggleMenu();
		$("#album-view #subalbums, #album-view #thumbs").addClass("hidden");
		$("#media-view").addClass("hidden");
		$("#loading").hide();
		if (typeof selector === "undefined")
			selector = '#no-results';
		$(".search-failed").hide();
		$(selector).stop().fadeIn(
			1000,
			function() {
				resolveParseHash([album, -1]);
			}
		);
		// $(selector).fadeOut(4000);
	};

	Utilities.focusSearchField = function() {
		if (! env.isMobile.any()) {
			$("#search-field").focus();
		} else {
			$("#search-field").blur();
		}
		$("ul#right-menu li.search ul").removeClass("hidden");
	};

	Utilities.stripHtmlAndReplaceEntities = function(htmlString) {
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

	Utilities.albumButtonWidth = function(thumbnailWidth) {
		if (env.options.albums_slide_style) {
			return Math.ceil(thumbnailWidth * (1 + 2 * env.slideMarginFactor) + 2 * env.slideAlbumButtonBorder + 2 * env.slideBorder);
		} else {
			return Math.ceil(thumbnailWidth + 1 * env.options.spacing);
		}
	};

	Utilities.thumbnailWidth = function(albumButtonWidth) {
		if (env.options.albums_slide_style) {
			return Math.floor((albumButtonWidth - 2 * env.slideAlbumButtonBorder - 2 * env.slideBorder) / (1 + 2 * env.slideMarginFactor));
		} else {
			return Math.floor(albumButtonWidth - 1 * env.options.spacing);
		}
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
			if (typeof foundAlbum !== "undefined")
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
			var index = env.selectionAlbum.subalbums.findIndex(x => x.isEqual(album));
			if (index > -1)
				return true;
			else
				return false;
		}
	};

	Album.prototype.noSubalbumIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			return true;
		} else {
			return ! this.subalbums.some(subalbum => subalbum.isSelected());
		}
	};

	Album.prototype.someSubalbumIsSelected = function() {
		return ! this.noSubalbumIsSelected();
	};

	Album.prototype.noMediaIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			return true;
		} else {
			return ! this.media.some(singleMedia => singleMedia.isSelected());
		}
	};

	Album.prototype.someMediaIsSelected = function() {
		return ! this.noMediaIsSelected();
	};

	Album.prototype.everyMediaIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			Utilities.initializeSelectionAlbum();
			return false;
		} else {
			return this.media.every(singleMedia => singleMedia.isSelected());
		}
	};

	Album.prototype.everySubalbumIsSelected = function() {
		if (env.selectionAlbum.isEmpty()) {
			Utilities.initializeSelectionAlbum();
			return false;
		} else {
			return this.subalbums.every(subalbum => subalbum.isSelected());
		}
	};

	Album.prototype.isSelected = function() {
		return Utilities.albumIsSelected(this);
	};

	Subalbum.prototype.isSelected = function() {
		return Utilities.albumIsSelected(this);
	};

	Album.prototype.addAllMediaToSelection = function() {
		for (let indexMedia = this.media.length - 1; indexMedia >= 0; indexMedia --) {
			let singleMedia = this.media[indexMedia];
			var firstPartOfSelector = "media-select-box-";
			if (Utilities.isPopup())
				firstPartOfSelector = "map-" + firstPartOfSelector;
			if (this.isCollection()) {
				singleMedia.addToSelection(null, "#" + firstPartOfSelector + indexMedia);
			} else {
				singleMedia.addToSelection(this, "#" + firstPartOfSelector + indexMedia);
			}
		}
	};

	Album.prototype.removeAllMediaFromSelection = function() {
		for (let indexMedia = this.media.length - 1; indexMedia >= 0; indexMedia --) {
			let singleMedia = this.media[indexMedia];
			var firstPartOfSelector = "media-select-box-";
			if (Utilities.isPopup())
				firstPartOfSelector = "map-" + firstPartOfSelector;
			singleMedia.removeFromSelection("#" + firstPartOfSelector + indexMedia);
		}
	};

	Album.prototype.addAllSubalbumsToSelection = function() {
		var self = this;
		return new Promise(
			function(resolve_addAllSubalbums) {
				var subalbumsPromises = [];
				for (let indexSubalbum = self.subalbums.length - 1; indexSubalbum >= 0; indexSubalbum --) {
					let id = PhotoFloat.convertCacheBaseToId(self.subalbums[indexSubalbum].cacheBase);
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
					for (let indexSubalbum = self.subalbums.length - 1; indexSubalbum >= 0; indexSubalbum --) {
						// let subalbum = self.subalbums[indexSubalbum];
						let id = PhotoFloat.convertCacheBaseToId(self.subalbums[indexSubalbum].cacheBase);
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


	SingleMedia.prototype.isInsideSelectedAlbums = function() {
		var self = this;
		if (
			env.selectionAlbum.subalbums.some(
				selectedAlbum =>
					self.foldersCacheBase.indexOf(selectedAlbum.cacheBase) === 0 ||
					self.hasOwnProperty("dayAlbumCacheBase") && self.dayAlbumCacheBase.indexOf(selectedAlbum.cacheBase) === 0 ||
					self.hasOwnProperty("gpsAlbumCacheBase") && self.gpsAlbumCacheBase.indexOf(selectedAlbum.cacheBase) === 0
			)
		) {
			return true;
		} else {
			return false;
		}
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

	SingleMedia.prototype.addToSelection = function(album, clickedSelector) {
		// if album is null, it means that it couldn't be determined, do determine it here
		if (! this.isSelected()) {
			if (env.selectionAlbum.isEmpty())
				Utilities.initializeSelectionAlbum();
			// this.parent = env.selectionAlbum;
			env.selectionAlbum.media.push(this);

			if (this.hasGpsData()) {
				// add the media position
				env.selectionAlbum.positionsAndMediaInTree.addSingleMedia(this);
				env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
			}
			var singleMediaArray = new Media([this]);
			env.selectionAlbum.numsMedia.sum(singleMediaArray.imagesAndVideosCount());
			env.selectionAlbum.sizesOfAlbum.sum(this.fileSizes);
			if (! this.isInsideSelectedAlbums()) {
				env.selectionAlbum.numsMediaInSubTree.sum(singleMediaArray.imagesAndVideosCount());
				env.selectionAlbum.sizesOfSubTree.sum(this.fileSizes);
			}

			// if (! Utilities.isPopup())
			if (album === null) {
				this.generateCaptionForSelection(env.cache.getAlbum(this.foldersCacheBase));
			} else {
				this.generateCaptionForSelection(album);
			}
			delete env.selectionAlbum.mediaNameSort;
			delete env.selectionAlbum.mediaReverseSort;
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
			this.parent.invalidatePositionsAndMediaInAlbumAndSubalbums();
		}

	};

	SingleMedia.prototype.removeFromSelection = function(clickedSelector) {
		if (this.isSelected()) {
			var index = env.selectionAlbum.media.findIndex(x => x.isEqual(this));
			env.selectionAlbum.media.splice(index, 1);

			if (this.hasGpsData()) {
				env.selectionAlbum.positionsAndMediaInTree.removeSingleMedia(this);
				env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
			}
			var singleMediaArray = new Media([this]);
			env.selectionAlbum.numsMedia.subtract(singleMediaArray.imagesAndVideosCount());
			env.selectionAlbum.sizesOfAlbum.subtract(this.fileSizes);
			if (! this.isInsideSelectedAlbums()) {
				env.selectionAlbum.numsMediaInSubTree.subtract(singleMediaArray.imagesAndVideosCount());
				env.selectionAlbum.sizesOfSubTree.subtract(this.fileSizes);
			}

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

			delete env.selectionAlbum.mediaNameSort;
			delete env.selectionAlbum.mediaReverseSort;
			env.selectionAlbum.sortAlbumsMedia();

			if (env.currentAlbum.isSelection()) {
				if (Utilities.nothingIsSelected()) {
					// nothing has remained in the selection
					Utilities.initializeSelectionAlbum();
					window.location.href = Utilities.upHash();
				} else if (env.currentMedia === null) {
					// we are in album view
					if (env.currentAlbum.isAlbumWithOneMedia()) {
						// only one media has remained after the removal
						env.currentMedia = env.currentAlbum.media[0];
						env.currentMediaIndex = 0;
						$("#media-view-container").removeClass("hidden");
						env.currentMedia.show(env.currentAlbum, "center");
						// env.currentAlbum.prepareForShowing(0);
					} else {
						// more than one media has remained after the removal: remove the single media thumbnail
						$(clickedSelector).parent().parent().parent().remove();
					}
				} else {
					// we are in media view
					let clickedMediaIndex = parseInt(clickedSelector.split('-').pop());
					if (clickedSelector === singleMediaSelector || clickedMediaIndex === env.currentMediaIndex) {
						// currentMedia ha been removed: show the album
						window.location.href = Utilities.upHash();
						// env.currentAlbum.prepareForShowing(-1);
					} else {
						// another media which is not currentMedia has been removed among the bottom thumbnails:
						// keep showing the same media, but remove the media
						if (env.currentAlbum.isAlbumWithOneMedia()) {
							// only one media has remained after the removal
							env.currentMedia = env.currentAlbum.media[0];
							env.currentMediaIndex = 0;
							$("#media-view-container").removeClass("hidden");
							env.currentMedia.show(env.currentAlbum, "center");
							// env.currentAlbum.prepareForShowing(0);
						} else if (clickedMediaIndex < env.currentMediaIndex) {
							env.currentMediaIndex --;
							env.currentAlbum.showMedia();
						}
					}
				}
			} else {
				// update the selector
				$(clickedSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-single-media"));
			}
			this.parent.invalidatePositionsAndMediaInAlbumAndSubalbums();
		}
	};

	Utilities.isPopup = function() {
		return $('.leaflet-popup').html() ? true : false;
	};

	Utilities.prototype.isMap = function() {
		return ($('#mapdiv').html() ? true : false) && ! Utilities.isPopup();
	};

	Album.prototype.collectMediaInTree = function() {
		var self = this;
		return new Promise(
			function (resolve_collect) {
				var mediaInAlbum = [];
				if (self.media.length)
					mediaInAlbum = [... self.media];
				var subalbumsPromises = [];
				self.subalbums.forEach(
					function(subalbum) {
						var subalbumPromise = new Promise(
							function(resolve_subalbumPromise) {
								var toAlbumPromise = subalbum.toAlbum(null, {getMedia: true, getPositions: true});
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
		var subalbum = this.subalbums[iSubalbum];
		var self = this;
		return new Promise(
			function(resolve_addSubalbum) {
				function continue_addSubalbumToSelection(album) {
					env.selectionAlbum.subalbums.push(album);

					album.generateCaptionForSelection();
					delete env.selectionAlbum.albumNameSort;
					delete env.selectionAlbum.albumReverseSort;
					env.selectionAlbum.sortAlbumsMedia();

					$(clickedSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", Utilities._t("#unselect-subalbum"));
					self.invalidatePositionsAndMediaInAlbumAndSubalbums();

					resolve_addSubalbum();
				}

				if (subalbum.isSelected()) {
					resolve_addSubalbum();
				} else {
					if (Utilities.nothingIsSelected())
						Utilities.initializeSelectionAlbum();

					let convertSubalbumPromise = subalbum.toAlbum(null, {getMedia: true, getPositions: true});
					convertSubalbumPromise.then(
						function(album) {
							self.subalbums[iSubalbum] = album;

							var albumIsInsideSelectedAlbums = album.isInsideSelectedAlbums();
							if (albumIsInsideSelectedAlbums) {
								continue_addSubalbumToSelection(album);
							} else {
								var collectPromise = album.collectMediaInTree();
								collectPromise.then(
									function(mediaInAlbumTree) {
										var mediaInAlbumNotSelectedNorInsideSelectedAlbums = [];
										mediaInAlbumTree.forEach(
											function(singleMedia) {
												if (! singleMedia.isInsideSelectedAlbums() && ! singleMedia.isSelected())
													mediaInAlbumNotSelectedNorInsideSelectedAlbums.push(singleMedia);
											}
										);
										// var mediaInAlbumNotSelectedNorInsideSelectedAlbums = Utilities.arrayUnion(mediaInAlbumNotSelected, mediaInAlbumNotInsideSelectedAlbums);

										mediaInAlbumNotSelectedNorInsideSelectedAlbums.forEach(
											singleMedia => {
												if (singleMedia.hasGpsData())
													env.selectionAlbum.positionsAndMediaInTree.addSingleMedia(singleMedia);
												env.selectionAlbum.sizesOfSubTree.sum(singleMedia.fileSizes);
											}
										);
										// env.selectionAlbum.positionsAndMediaInTree.mergePositionsAndMedia(album.positionsAndMediaInTree);
										env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;

										env.selectionAlbum.numsMediaInSubTree.sum(new Media(mediaInAlbumNotSelectedNorInsideSelectedAlbums).imagesAndVideosCount());

										continue_addSubalbumToSelection(album);
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
		var iSubalbum = this.subalbums.findIndex(subalbum => subalbum.cacheBase === $(clickedSelector).parent().parent().attr("id"))
		var subalbum = this.subalbums[iSubalbum];
		// var subalbum = this.subalbums[iSubalbum];
		var self = this;
		return new Promise(
			function(resolve_removeSubalbum) {
				if (! subalbum.isSelected()) {
					if (subalbum.isEmpty())
						Utilities.initializeSelectionAlbum();
					resolve_removeSubalbum();
				} else {
					let convertSubalbumPromise = subalbum.toAlbum(null, {getMedia: true, getPositions: true});
					convertSubalbumPromise.then(
						function(subalbum) {
							self.subalbums[iSubalbum] = subalbum;

							var selectedMediaInsideSelectedAlbums = [];
							env.selectionAlbum.media.forEach(
								function(singleMedia) {
									if (singleMedia.isInsideSelectedAlbums())
										selectedMediaInsideSelectedAlbums.push(singleMedia);
								}
							);

							var subalbumIsInsideSelectedAlbums = subalbum.isInsideSelectedAlbums();

							var indexInSelection = env.selectionAlbum.subalbums.findIndex(selectedSubalbum => selectedSubalbum.isEqual(subalbum));
							env.selectionAlbum.subalbums.splice(indexInSelection, 1);

							if (subalbum.positionsAndMediaInTree.length) {
								if (subalbum.numPositionsInTree >  env.selectionAlbum.numPositionsInTree / 10) {
									let newPos = new PositionsAndMedia();
									let firstTime = true;
									env.selectionAlbum.subalbums.forEach(
										function(selectedAlbum) {
											if (firstTime) {
												newPos = new PositionsAndMedia(selectedAlbum);
												firstTime = false;
											} else {
												newPos.mergePositionsAndMedia(selectedAlbum.positionsAndMediaInTree);
											}
										}
									);
								} else {
									env.selectionAlbum.positionsAndMediaInTree.removePositionsAndMedia(subalbum.positionsAndMediaInTree);
								}
								env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
							}

							if (! subalbumIsInsideSelectedAlbums) {
								env.selectionAlbum.numsMediaInSubTree.subtract(subalbum.numsMediaInSubTree);
								env.selectionAlbum.sizesOfSubTree.subtract(subalbum.sizesOfSubTree);
								selectedMediaInsideSelectedAlbums.forEach(
									function(singleMedia) {
										if (! singleMedia.isInsideSelectedAlbums()) {
											var singleMediaArray = new Media([singleMedia]);
											env.selectionAlbum.numsMediaInSubTree.sum(singleMediaArray.imagesAndVideosCount());
											env.selectionAlbum.sizesOfSubTree.sum(singleMedia.fileSizes);
										}
									}
								);
								// env.selectionAlbum.numsProtectedMediaInSubTree.subtract(subalbum.numsProtectedMediaInSubTree);
							}

							if (! env.currentAlbum.isSelection()) {
								$(clickedSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", Utilities._t("#select-subalbum"));
							}
							self.invalidatePositionsAndMediaInAlbumAndSubalbums();

							delete env.selectionAlbum.albumNameSort;
							delete env.selectionAlbum.albumReverseSort;
							env.selectionAlbum.sortAlbumsMedia();

							if (env.currentAlbum.isSelection()) {
								env.albumInSubalbumDiv = null;
								if (Utilities.nothingIsSelected()) {
									Utilities.initializeSelectionAlbum();
									window.location.href = Utilities.upHash();
								} else {
									// env.currentAlbum.prepareForShowing(-1);
									$(clickedSelector).parent().parent().parent().remove();
								}
							}

							resolve_removeSubalbum();
						}
					);
				}
			}
		);
	};


	Utilities.prototype.setSubalbumsOptions = function() {
		let scrollBarWidth = window.innerWidth - document.body.clientWidth || 15;

		// resize down the album buttons if they are too wide
		let albumViewWidth =
			$("body").width() -
			parseInt($("#album-view").css("padding-left")) -
			parseInt($("#album-view").css("padding-right")) -
			scrollBarWidth;
		env.correctedAlbumThumbSize = env.options.album_thumb_size;
		let correctedAlbumButtonSize = Utilities.albumButtonWidth(env.options.album_thumb_size);
		if (albumViewWidth / (correctedAlbumButtonSize + env.options.spacing) < env.options.min_album_thumbnail) {
			env.correctedAlbumThumbSize = Math.floor(Utilities.thumbnailWidth(albumViewWidth / env.options.min_album_thumbnail - env.options.spacing)) - 1;
			correctedAlbumButtonSize = Utilities.albumButtonWidth(env.correctedAlbumThumbSize);
		}
		let captionFontSize = Math.round(Utilities.em2px("body", 1) * env.correctedAlbumThumbSize / env.options.album_thumb_size);
		let captionHeight = parseInt(captionFontSize * 1.1) + 1;
		let margin = 0;
		if (env.options.albums_slide_style)
			margin = Math.round(env.correctedAlbumThumbSize * env.slideMarginFactor);

		let buttonAndCaptionHeight = correctedAlbumButtonSize + captionHeight;

		let slideBorder = 0;
		if (env.options.albums_slide_style)
			slideBorder = env.slideBorder;

		if (env.options.albums_slide_style) {
			$(".album-name").css("color", env.options.album_slide_name_color);
			$(".album-button-and-caption").css("background-color", env.options.album_slide_background_color);
			$(".album-button").css("background-color", env.options.album_slide_background_color);
			$(".album-caption, .album-caption .real-name").css("color", env.options.album_slide_caption_color);
			$(".album-button-and-caption").addClass("slide");
		} else {
			$(".album-name").css("color", env.options.album_name_color);
			$(".album-button-and-caption").css("background-color", "");
			$(".album-button").css("background-color", "");
			$(".album-caption, .album-caption .real-name").css("color", env.options.album_caption_color);
			$(".album-button").css("border", "none");
			$(".album-button-and-caption").removeClass("slide");
		}

		let marginBottom = env.options.spacing;
		if (! env.options.albums_slide_style)
			marginBottom += Utilities.em2px("body", 2);
		$(".album-button-and-caption").css("width", (correctedAlbumButtonSize - 2 * slideBorder) + "px");
		$(".album-button-and-caption").css("height", buttonAndCaptionHeight + "px");
		$(".album-button-and-caption").css("margin-right", env.options.spacing.toString() + "px");
		$(".album-button-and-caption").css("margin-bottom", marginBottom.toString() + "px");

		$(".album-button").css("margin", margin + "px");
		$(".album-button").css("width", env.correctedAlbumThumbSize + "px");
		$(".album-button").css("height", env.correctedAlbumThumbSize + "px");

		$(".album-caption").css("width", env.correctedAlbumThumbSize + "px");
		$(".album-caption").css("height", captionHeight + "px");
		$(".album-caption").css("font-size", captionFontSize + "px");

		$(".album-tags").css("font-size", (Math.round(captionFontSize * 0.75)) + "px");


		if (! env.options.show_album_media_count)
			$(".album-caption-count").addClass("hidden-by-option");
		else
			$(".album-caption-count").removeClass("hidden-by-option");
	};

	Utilities.addTagLink = function(tag) {
		// tags can be phrases (e.g. with automatic tags from person recognition)

		// now replace space -> underscore
		var tagForHref = tag.replace(/ /g, "_");
		// all non-letter character must be converted to space
		tagForHref = tagForHref.replace(/([^\p{L}_])/ug, match => match === "-" ? "%2D" : encodeURIComponent(match));

		var hash = "#!/_bs" + env.options.cache_folder_separator +  "t" + env.options.search_options_separator + "o" + env.options.search_options_separator + tagForHref + env.options.cache_folder_separator + env.currentAlbum.cacheBase;
		return "<a href='" + hash + "'>" + tag + "</a>";
	};

	Utilities.em2px = function(selector, em) {
		var emSize = parseFloat($(selector).css("font-size"));
		return (em * emSize);
	};

	Album.prototype.isAlbumWithOneMedia = function() {
		return this !== null && ! this.subalbums.length && this.numsMedia.imagesAndVideosTotal() === 1;
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

		if (this.mimeType.indexOf("video/") === 0) {
			if (fullScreenStatus && this.name.match(/\.avi$/) === null) {
				mediaSrc = this.originalMediaPath();
			} else {
				// .avi videos are not played by browsers, use the transcoded one
				mediaSrc = this.mediaPath("");
			}
		} else if (this.mimeType.indexOf("image/") === 0) {
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

	SingleMedia.prototype.createMediaHtml = function(album, id, fullScreenStatus) {
		// creates a media element that can be inserted in DOM (e.g. with append/prepend methods)

		// the actual sizes of the image
		var mediaWidth = this.metadata.size[0], mediaHeight = this.metadata.size[1];
		var mediaSrc, mediaElement, container;
		var attrWidth = mediaWidth, attrHeight = mediaHeight;

		if (this.mimeType.indexOf("video/") === 0) {
			if (fullScreenStatus && this.name.match(/\.avi$/) === null) {
				mediaSrc = this.originalMediaPath();
			} else {
				// .avi videos are not played by browsers, use the transcoded one
				mediaSrc = this.mediaPath("");
			}

			mediaElement = $('<video/>', {controls: true });
		} else if (this.mimeType.indexOf("image/") === 0) {
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
				mediaElement.attr("title", Utilities.pathJoin([this.albumName, this.nameForShowing(album)]));
		}

		mediaElement
			.attr("id", "media-" + id)
			.attr("width", attrWidth)
			.attr("height", attrHeight)
			.attr("ratio", mediaWidth / mediaHeight)
			.attr("src", encodeURI(mediaSrc))
			.attr("alt", this.nameForShowing(album));

		return mediaElement[0].outerHTML;
	};

	SingleMedia.prototype.createMediaLinkTag = function(mediaSrc) {
		// creates a link tag to be inserted in <head>

		if (this.mimeType.indexOf("video/") === 0) {
			return '<link rel="video_src" href="' + encodeURI(mediaSrc) + '" />';
		} else if (this.mimeType.indexOf("image/") === 0) {
			return '<link rel="image_src" href="' + encodeURI(mediaSrc) + '" />';
		}
	};

	SingleMedia.prototype.chooseTriggerEvent = function() {
		// choose the event that must trigger the scale function

		if (this.mimeType.indexOf("video/") === 0) {
			return "loadstart";
		} else if (this.mimeType.indexOf("image/") === 0) {
			return "load";
		}
	};

	SingleMedia.prototype.originalMediaPath = function() {
		if (env.options.browser_unsupported_mime_types.includes(this.mimeType))
			return Utilities.pathJoin([env.server_cache_path, this.convertedPath]);
		else
			return this.trueOriginalMediaPath();
	};

	SingleMedia.prototype.trueOriginalMediaPath = function() {
		return Utilities.pathJoin([this.albumName, this.name]);
	};

	SingleMedia.prototype.mediaPath = function(size) {
		var suffix = env.options.cache_folder_separator, cacheBase, rootString = "root-";
		if (
			this.mimeType.indexOf("image/") === 0 ||
			this.mimeType.indexOf("video/") === 0 && [env.options.album_thumb_size, env.options.media_thumb_size].indexOf(size) != -1
		) {
			var actualSize = size;
			var albumThumbSize = env.options.album_thumb_size;
			var mediaThumbSize = env.options.media_thumb_size;
			if ((size === albumThumbSize || size === mediaThumbSize) && env.devicePixelRatio > 1) {
				actualSize = Math.round(actualSize * env.options.mobile_thumbnail_factor);
				albumThumbSize = Math.round(albumThumbSize * env.options.mobile_thumbnail_factor);
				mediaThumbSize = Math.round(mediaThumbSize * env.options.mobile_thumbnail_factor);
			}
			suffix += actualSize.toString();
			if (size === env.options.album_thumb_size) {
				suffix += "a";
				if (env.options.album_thumb_type === "square")
					suffix += "s";
				else if (env.options.album_thumb_type === "fit")
					suffix += "f";
			}
			else if (size === env.options.media_thumb_size) {
				suffix += "t";
				if (env.options.media_thumb_type === "square")
					suffix += "s";
				else if (env.options.media_thumb_type === "fixed_height")
					suffix += "f";
			}
			suffix += ".jpg";
		} else if (this.mimeType.indexOf("video/") === 0) {
			suffix += "transcoded.mp4";
		}

		cacheBase = this.foldersCacheBase + env.options.cache_folder_separator + this.cacheBase + suffix;
		if (cacheBase.indexOf(rootString) === 0)
			cacheBase = cacheBase.substring(rootString.length);
		else {
			if (Utilities.isFolderCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.foldersStringWithTrailingSeparator.length);
			else if (Utilities.isByDateCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byDateStringWithTrailingSeparator.length);
			else if (Utilities.isByGpsCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byGpsStringWithTrailingSeparator.length);
			else if (Utilities.isSearchCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.bySearchStringWithTrailingSeparator.length);
			else if (Utilities.isSelectionCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.bySelectionStringWithTrailingSeparator.length);
			else if (Utilities.isMapCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byMapStringWithTrailingSeparator.length);
		}
		if (this.cacheSubdir)
			return Utilities.pathJoin([env.server_cache_path, this.cacheSubdir, cacheBase]);
		else
			return Utilities.pathJoin([env.server_cache_path, cacheBase]);
	};

	Utilities.mediaBoxContainerHeight = function() {
		var heightForMediaAndTitle;
		// env.windowHeight = $(window).innerHeight();
		heightForMediaAndTitle = env.windowHeight;
		if ($("#album-view").is(":visible"))
			heightForMediaAndTitle -= $("#album-view")[0].offsetHeight;
			// heightForMediaAndTitle -= parseInt($("#album-view").css("height"));
			// // 22 is for the scroll bar and the current media marker
			// // 5 is an extra space
			// heightForMediaAndTitle -= env.options.media_thumb_size + 22 + 5;

		return heightForMediaAndTitle;
	};

	SingleMedia.prototype.scale = function(event) {
		// this function works on the img tag identified by event.data.id
		// it adjusts width, height and position so that it fits in its parent (<div class="media-box-inner">, or the whole window)
		// and centers vertically
		var self = this;
		return new Promise(
			function(resolve_scale) {
				var mediaElement, container, photoSrc, previousSrc;
				var containerHeight = $(window).innerHeight(), containerWidth = $(window).innerWidth(), containerRatio;
				var mediaBarBottom = 0;
				var mediaWidth, mediaHeight, attrWidth, attrHeight;
				var id = event.data.id;
				var heightForMedia, heightForMediaAndTitle, titleHeight;

				if ($("#album-view").is(":visible")) {
					let height = env.options.media_thumb_size + Utilities.horizontalScrollBarThickness($("#album-view")[0]);
					$("#album-view").css("height", height.toString() + "px");
				}

				env.windowWidth = $(window).innerWidth();
				heightForMediaAndTitle = Utilities.mediaBoxContainerHeight();

				// widths must be set before calculating title height
				if (event.data.resize && id === "center") {
					// this is executed only when resizing, it's not needed when first scaling
					$("#media-box-container").css("width", env.windowWidth * 3).css("transform", "translate(-" + env.windowWidth + "px, 0px)");
				}
				$(".media-box#" + id).css("width", env.windowWidth);
				$(".media-box#" + id + " .media-box-inner").css("width", env.windowWidth);
				$(".media-box#" + id).show();
				if ($(".media-box#" + id + " .title").is(":visible"))
					titleHeight = $(".media-box#" + id + " .title").outerHeight();
				else
					titleHeight = 0;

				heightForMedia = heightForMediaAndTitle - titleHeight;
				$("#media-box-container").css("height", heightForMediaAndTitle);
				$(".media-box#" + id).css("height", heightForMediaAndTitle);
				$(".media-box#" + id + " .media-box-inner").css("height", heightForMedia);
				$(".media-box#" + id).show();

				if (self.mimeType.indexOf("image/") === 0)
					mediaElement = $(".media-box#" + id + " .media-box-inner img");
				else if (self.mimeType.indexOf("video/") === 0)
					mediaElement = $(".media-box#" + id + " .media-box-inner video");

				mediaWidth = self.metadata.size[0];
				mediaHeight = self.metadata.size[1];
				attrWidth = mediaWidth;
				attrHeight = mediaHeight;

				if (env.fullScreenStatus && Modernizr.fullscreen)
					container = $(window);
				else {
					container = $(".media-box#" + id + " .media-box-inner");
				}

				containerHeight = heightForMedia;
				containerRatio = containerWidth / containerHeight;

				if (self.mimeType.indexOf("image/") === 0) {
					photoSrc = self.chooseReducedPhoto(container, env.fullScreenStatus);
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
					if (self.mimeType.indexOf("image/") === 0) {
						Functions.pinchSwipeInitialization();
						Utilities.setPinchButtonsPosition();
						PinchSwipe.setPinchButtonsVisibility();
					}
					Utilities.setSelectButtonPosition();
					Utilities.correctPrevNextPosition();
					Utilities.setDescriptionOptions();

				}

				if (Utilities.bottomSocialButtons()) {
					mediaBarBottom = $(".ssk").outerHeight();
				}
				$(".media-box#" + id + " .media-bar").css("bottom", mediaBarBottom);

				Utilities.scrollToThumb();
				if (id === "center")
					resolve_scale([containerHeight, containerWidth]);

				$("#loading").hide();
			}
		);
	};

	Utilities.scrollToThumb = function() {
		var singleMedia = env.currentMedia, thumb;


		if (! Utilities.isPopup() && $("#album-view").is(":visible") && (env.currentMedia !== null || env.previousMedia !== null)) {
			if (env.currentMedia === null && env.previousMedia !== null) {
				singleMedia = env.previousMedia;
			}

			thumb = $("#" + singleMedia.foldersCacheBase + "--" + singleMedia.cacheBase);
			// let id = Utilities.pathJoin([singleMedia.foldersCacheBase, singleMedia.cacheBase]);
			// $("#thumbs img.thumbnail").each(
			// 	function() {
			// 		if (this.id === id) {
			// 			thumb = $(this);
			// 			return false;
			// 		}
			// 	}
			// );

			if (thumb[0] !== undefined) {
			 	if (env.currentMedia !== null && ! env.currentAlbum.isAlbumWithOneMedia()) {
					var scroller = $("#album-view");
					scroller.stop().animate(
						{
							scrollLeft: thumb.parent().position().left + scroller.scrollLeft() - scroller.width() / 2 + thumb.width() / 2
						},
						"fast"
					);
				} else {
					$("html, body").stop().animate(
						{
							scrollTop: thumb.offset().top + thumb.height() / 2 - env.windowHeight / 2
						},
						"fast"
					);
				}

				$(".thumb-container").removeClass("current-thumb");
				if (env.currentMedia !== null) {
					thumb.parent().addClass("current-thumb");
				}
			}
		}
	};

	Utilities.prototype.addMediaLazyLoader = function() {
		$(
			function() {
				$("img.lazyload-popup-media").Lazy(
					{
						afterLoad: MapFunctions.addClickToPopupPhoto,
						autoDestroy: true,
						onError: function(element) {
							console.log(element[0]);
						},
						chainable: false,
						threshold: env.options.media_thumb_size,
						removeAttribute: true,
						appendScroll: $('#popup-images-wrapper')
					}
				);
			}
		);
		$(
			function() {
				$("#album-view:not(.media-view-container) img.lazyload-media").Lazy(
					{
						// threshold: 2 * env.options.media_thumb_size,
						appendScroll: $(window)
					}
				);
			}
		);
		$(
			function() {
				$("#album-view.media-view-container img.lazyload-media").Lazy(
					{
						// threshold: 2 * env.options.media_thumb_size,
						appendScroll: $("#album-view")
					}
				);
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
			else if (this[i].mimeType.indexOf("video/") === 0)
				result.videos += 1;
		}
		return result;
	};

	Album.prototype.downloadAlbum = function(everything = false, what = "all", size = 0) {
		// adapted from https://gist.github.com/c4software/981661f1f826ad34c2a5dc11070add0f
		//
		// this function must be converted to streams, example at https://jimmywarting.github.io/StreamSaver.js/examples/saving-multiple-files.html
		//
		// what is one of "all", "images" or "videos"

		$("#downloading-media").html(Utilities._t("#downloading-media")).show();
		$("#downloading-media").append("<br /><span id='file-name'></span>");
		size = parseInt(size);

		var zip = new JSZip();
		var zipFilename;
		// var basePath = this.path;
		zipFilename = env.options.page_title;
		if (this.isSearch()) {
			zipFilename += '.' + Utilities._t("#by-search") + " '" + $("#search-field").val() + "'";
		} else if (this.isSelection()) {
			zipFilename += '.' + Utilities._t("#by-selection");
		} else if (this.isByDate()) {
			let textComponents = this.path.split("/").splice(1);
			if (textComponents.length > 1)
				textComponents[1] = Utilities._t("#month-" + textComponents[1]);
			if (textComponents.length)
				zipFilename += '.' + textComponents.join('-');
		} else if (this.isByGps()) {
			zipFilename += '.' + this.ancestorsNames.splice(1).join('-');
		} else if (this.isMap()) {
			zipFilename += '.' + Utilities._t("#from-map");
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
				$("#preparing-zip").html(Utilities._t("#preparing-zip")).show();
				$("#preparing-zip").append("<br /><div id='file-name'></div>");
				zip.generateAsync(
					{type:'blob'},
					function onUpdate(meta) {
						if (meta.currentFile)
							$("#preparing-zip #file-name").html(meta.currentFile + "<br />" + meta.percent.toFixed(1) + "%");
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
					var albumPromises = [];

					if (! album.isTransversal() || album.ancestorsNames.length >= 4) {
						for (let iMedia = 0; iMedia < album.media.length; iMedia ++) {
							let ithMedia = album.media[iMedia];
							if (
								ithMedia.mimeType.indexOf("image/") === 0 && what === "videos" ||
								ithMedia.mimeType.indexOf("video/") === 0 && what === "images" ||
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
												fileName = subalbum + "/" + fileName;
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
										function(ithSubalbum) {
											album.subalbums[iSubalbum] = ithSubalbum;
											let ancestorsNamesList = ithSubalbum.ancestorsNames.slice(1);
											if (ancestorsNamesList.length > 2) {
												ancestorsNamesList[2] = Utilities.transformAltPlaceName(ancestorsNamesList[2]);
											}
											let albumPath = ancestorsNamesList.join('/');
											// let albumPath = ithSubalbum.path;
											// // if (true || album.isSearch() || album.isSelection())
											// // 	// remove the leading folders/date/gps/map string
											// albumPath = albumPath.split('/').splice(1).join('/');
											// else
											// 	albumPath = albumPath.substring(basePath.length + 1);
											let addMediaAndSubalbumsPromise = addMediaAndSubalbumsFromAlbum(ithSubalbum, albumPath);
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

	Utilities.convertByDateAncestorNames = function(ancestorsNames) {
		if (ancestorsNames[0] === env.options.by_date_string && ancestorsNames.length > 2) {
			let result = ancestorsNames.slice();
			result[2] = Utilities._t("#month-" + result[2]);
			return result;
		} else {
			return ancestorsNames;
		}

	};

	Album.prototype.getCaptionForSelection = function(html, br) {
		return this.getCaptionForCollection("Selection", html, br);
	};

	Album.prototype.getCaptionForSearch = function(html, br) {
		return this.getCaptionForCollection("Search", html, br);
	};

	Album.prototype.getCaptionForPopup = function(html, br) {
		return this.getCaptionForCollection("Popup", html, br);
	};

	Album.prototype.getCaptionForCollection = function(type, html, br) {
		return Utilities.getCaptionForCollection(this, type, html, br);
	};

	SingleMedia.prototype.getCaptionForSelection = function(html, br) {
		return this.getCaptionForCollection("Selection", html, br);
	};

	SingleMedia.prototype.getCaptionForSearch = function(html, br) {
		return this.getCaptionForCollection("Search", html, br);
	};

	SingleMedia.prototype.getCaptionForPopup = function(html, br) {
		return this.getCaptionForCollection("Popup", html, br);
	};

	SingleMedia.prototype.getCaptionForCollection = function(type, html, br) {
		return Utilities.getCaptionForCollection(this, type, html, br);
	};

	Utilities.getCaptionForCollection = function(albumOrSingleMedia, type, html, br) {
		if (! albumOrSingleMedia.hasOwnProperty(type)) {
			if (albumOrSingleMedia === "Selection")
				albumOrSingleMedia.generateCaptionForSelection();
			else if (albumOrSingleMedia === "Search")
				albumOrSingleMedia.generateCaptionForSearch();
			else if (type === "Popup")
				albumOrSingleMedia.generateCaptionForPopup();
		}
		var caption = albumOrSingleMedia["captionFor" + type];

		if (! html || ! br) {
			caption = caption.replace(/<br \/>/g, " ");
			if (! html) {
				caption = Utilities.stripHtmlAndReplaceEntities(caption);
			}
		}
		return caption;
	};

	Album.prototype.generateCaptionForSelection = function() {
		[this.captionForSelection, this.captionForSelectionSorting] = Utilities.generateAlbumCaptionForCollections(this);
	};

	Album.prototype.generateCaptionForSearch = function() {
		[this.captionForSearch, this.captionForSearchSorting] = Utilities.generateAlbumCaptionForCollections(this);
	};

	Utilities.generateAlbumCaptionForCollections = function(album) {
		var firstLine, secondLine = '';

		var raquo = " <span class='gray'>&raquo;</span> ";
		var folderArray = album.cacheBase.split(env.options.cache_folder_separator);
		if (album.isByDate()) {
			firstLine = Utilities.dateElementForFolderName(folderArray, folderArray.length - 1);
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
		} else if (album.isByGps()) {
			if (album.name === '')
				firstLine = Utilities._t('.not-specified');
			else if (album.hasOwnProperty('altName'))
				firstLine = Utilities.transformAltPlaceName(album.altName);
			else
				firstLine = album.nameForShowing(null, true, true);

			for (let iCacheBase = 1; iCacheBase < album.ancestorsCacheBase.length - 1; iCacheBase ++) {
				let albumName;
				if (album.ancestorsNames[iCacheBase] === '')
					albumName = Utilities._t('.not-specified');
				else
					albumName = album.ancestorsNames[iCacheBase];
				if (iCacheBase === 1)
					secondLine = "<span class='gray'>(" + Utilities._t("#by-gps-album-in") + "</span> ";
				// let marker = "<marker>" + iCacheBase + "</marker>";
				// secondLine += marker;
				secondLine += "<a href='" + env.hashBeginning + album.ancestorsCacheBase[iCacheBase] + "'>" + albumName + "</a>";
				if (iCacheBase < album.ancestorsCacheBase.length - 2)
					secondLine += raquo;
				if (iCacheBase === album.ancestorsCacheBase.length - 2)
					secondLine += "<span class='gray'>)</span>";

				// secondLine = secondLine.replace(marker, "<a href='" + env.hashBeginning + album.ancestorsCacheBase[iCacheBase] + "'>" + albumName + "</a>");
			}
			if (! secondLine)
				secondLine = "<span class='gray'>(" + Utilities._t("#by-gps-album") + ")</span>";
		} else {
			firstLine = album.nameForShowing(null, true, true);
			for (let iCacheBase = 0; iCacheBase < album.ancestorsCacheBase.length - 1; iCacheBase ++) {
				if (iCacheBase === 0 && album.ancestorsCacheBase.length === 2) {
					secondLine = "<span class='gray'>(" + Utilities._t("#regular-album") + ")</span> ";
				} else {
					if (iCacheBase === 1)
						secondLine = "<span class='gray'>(" + Utilities._t("#regular-album-in") + "</span> ";
					// let marker = "<marker>" + iCacheBase + "</marker>";
					// secondLine += marker;
					secondLine += "<a href='" + env.hashBeginning + album.ancestorsCacheBase[iCacheBase] + "'>" + album.ancestorsNames[iCacheBase] + "</a>";
					if (iCacheBase < album.ancestorsCacheBase.length - 2)
						secondLine += raquo;
					if (iCacheBase === album.ancestorsCacheBase.length - 2)
						secondLine += "<span class='gray'>)</span>";
					// secondLine = secondLine.replace(marker, "<a href='" + env.hashBeginning + album.ancestorsCacheBase[iCacheBase] + "'>" + album.ancestorsNames[iCacheBase] + "</a>");
				}
			}
		}
		var captionForCollection = Utilities.combineFirstAndSecondLine(firstLine, secondLine);
		var captionForCollectionSorting = Utilities.convertByDateAncestorNames(album.ancestorsNames).slice(1).reverse().join(env.options.cache_folder_separator).replace(/^0+/, '');
		return [captionForCollection, captionForCollectionSorting];
	};

	SingleMedia.prototype.generateCaptionForPopup = function(album) {
		[this.captionForPopup, this.captionForPopupSorting] = Utilities.generateSingleMediaCaptionForCollections(this, album);
	};

	SingleMedia.prototype.generateCaptionForSelection = function(album) {
		[this.captionForSelection, this.captionForSelectionSorting] = Utilities.generateSingleMediaCaptionForCollections(this, album);
	};

	SingleMedia.prototype.generateCaptionForSearch = function(album) {
		[this.captionForSearch, this.captionForSearchSorting] = Utilities.generateSingleMediaCaptionForCollections(this, album);
	};

	Utilities.generateSingleMediaCaptionForCollections = function(singleMedia, album) {
		var secondLine = '';
		var raquo = " <span class='gray'>&raquo;</span> ";
		var folderArray = album.cacheBase.split(env.options.cache_folder_separator);

		if (album.isByDate()) {
			secondLine += "<span class='gray'>(";
			if (folderArray.length === 2) {
				secondLine += Utilities._t("#in-year-album") + " ";
			} else if (folderArray.length === 3) {
				secondLine += Utilities._t("#in-month-album") + " ";
			} else if (folderArray.length === 4) {
				secondLine += Utilities._t("#in-day-album") + " ";
			}
			secondLine += "</span>";
			if (folderArray.length > 3)
				secondLine += Utilities.dateElementForFolderName(folderArray, 3) + " ";
			if (folderArray.length > 2)
				secondLine += Utilities.dateElementForFolderName(folderArray, 2) + " ";
			if (folderArray.length > 1)
				secondLine += Utilities.dateElementForFolderName(folderArray, 1);
			secondLine += "<span class='gray'>)</span>";
		} else if (album.isByGps()) {
			for (let iCacheBase = 1; iCacheBase < album.ancestorsCacheBase.length; iCacheBase ++) {
				let albumName;
				if (album.ancestorsNames[iCacheBase] === "")
					albumName = Utilities._t('.not-specified');
				else
					albumName = Utilities.transformAltPlaceName(album.ancestorsNames[iCacheBase]);
				if (iCacheBase === 1)
					secondLine += "<span class='gray'>(" + Utilities._t("#in-by-gps-album") + "</span> ";
				// let marker = "<marker>" + iCacheBase + "</marker>";
				// secondLine += marker;
				secondLine += "<a href='" + env.hashBeginning + album.ancestorsCacheBase[iCacheBase] + "'>" + albumName + "</a>";
				if (iCacheBase < album.ancestorsCacheBase.length - 1)
					secondLine += raquo;
				if (iCacheBase === album.ancestorsCacheBase.length - 1)
					secondLine += "<span class='gray'>)</span>";

				// secondLine = secondLine.replace(marker, "<a href='" + env.hashBeginning + album.ancestorsCacheBase[iCacheBase] + "'>" + albumName + "</a>");
			}
			if (! secondLine)
				secondLine = "<span class='gray'>(" + Utilities._t("#by-gps-album") + ")</span>";
		} else {
			for (let iCacheBase = 1; iCacheBase < album.ancestorsCacheBase.length; iCacheBase ++) {
				if (iCacheBase === 0 && album.ancestorsCacheBase.length === 2) {
					secondLine += "<span class='gray'>(" + Utilities._t("#regular-album") + ")</span>";
				} else {
					if (iCacheBase === 1)
						secondLine += "<span class='gray'>(" + Utilities._t("#in") + "</span> ";
					// let marker = "<marker>" + iCacheBase + "</marker>";
					// secondLine += marker;
					secondLine += "<a href='" + env.hashBeginning + album.ancestorsCacheBase[iCacheBase] + "'>" + album.ancestorsNames[iCacheBase] + "</a>";
					if (iCacheBase < album.ancestorsCacheBase.length - 1)
						secondLine += raquo;
					if (iCacheBase === album.ancestorsCacheBase.length - 1)
						secondLine += "<span class='gray'>)</span>";
					// secondLine = secondLine.replace(marker, "<a href='" + env.hashBeginning + album.ancestorsCacheBase[iCacheBase] + "'>" + album.ancestorsNames[iCacheBase] + "</a>");
				}
			}
		}

		var nameForShowing = singleMedia.nameForShowing(album, true, true);
		var captionForCollection = Utilities.combineFirstAndSecondLine(nameForShowing, secondLine);
		var captionForCollectionSorting = nameForShowing + env.options.cache_folder_separator + Utilities.convertByDateAncestorNames(album.ancestorsNames).slice(1).reverse().join(env.options.cache_folder_separator).replace(/^0+/, '');
		return [captionForCollection, captionForCollectionSorting];
	};

	Album.prototype.nameForShowing = function(parentAlbum, html = false, br = false) {
		return Utilities.nameForShowing(this, parentAlbum, html, br);
	};

	Subalbum.prototype.nameForShowing = function(parentAlbum, html = false, br = false) {
		return Utilities.nameForShowing(this, parentAlbum, html, br);
	};

	Utilities.nameForShowing = function(albumOrSubalbum, parentAlbum, html, br) {
		var folderName = '';
		// if (parentAlbum && parentAlbum.isSelection() && albumOrSubalbum.hasOwnProperty("captionForSelection")) {
		// 	folderName = albumOrSubalbum.captionForSelection;
		// } else if (parentAlbum && parentAlbum.isSearch() && albumOrSubalbum.hasOwnProperty("captionForSearch")) {
		// 	folderName = albumOrSubalbum.captionForSearch;
		// } else if (parentAlbum && parentAlbum.isByDate()) {
		if (parentAlbum && parentAlbum.isByDate()) {
			let folderArray = albumOrSubalbum.cacheBase.split(env.options.cache_folder_separator);
			if (folderArray.length === 2) {
				folderName += parseInt(folderArray[1]);
			} else if (folderArray.length === 3)
				folderName += " " + Utilities._t("#month-" + folderArray[2]);
			else if (folderArray.length === 4)
				folderName += Utilities._t("#day") + " " + parseInt(folderArray[3]);
		} else if (parentAlbum && parentAlbum.isByGps()) {
			if (albumOrSubalbum.name === '')
				folderName = Utilities._t('.not-specified');
			else if (albumOrSubalbum.hasOwnProperty('altName'))
				folderName = Utilities.transformAltPlaceName(albumOrSubalbum.altName);
			else
				folderName = albumOrSubalbum.name;
		} else {
			if (albumOrSubalbum.hasOwnProperty("title") && albumOrSubalbum.title && albumOrSubalbum.title !== albumOrSubalbum.name) {
				folderName = albumOrSubalbum.title;
				if (! br) {
					// remove the tags fronm the title
					folderName = folderName.replace(/<[^>]*>?/gm, ' ');
				}

				if (albumOrSubalbum.name) {
					if (html && br)
						folderName += "<br /><span class='real-name'>[" + albumOrSubalbum.name + "]</span>";
					else if (html)
						folderName += " <span class='real-name'>[" + albumOrSubalbum.name + "]</span>";
					else
						folderName += " [" + albumOrSubalbum.name + "]";
				}
			} else {
				folderName = albumOrSubalbum.name;
			}

			// if (albumOrSubalbum.hasOwnProperty("title") && albumOrSubalbum.title !== albumOrSubalbum.name) {
			// 	folderName = albumOrSubalbum.title + "<br /><span class='real-name'>(" + albumOrSubalbum.name + ")</span>";
			// } else {
			// 	folderName = albumOrSubalbum.name;
			// }
		}

		// if (parentAlbum && parentAlbum.isSelection())
		// 	albumOrSubalbum.captionForSelection = folderName;
		// else if (parentAlbum && parentAlbum.isSearch())
		// 	albumOrSubalbum.captionForSearch = folderName;

		// if (! html || ! br) {
		// 	folderName = folderName.replace(/<br \/>/g, " ");
		// 	if (! html) {
		// 		folderName = Utilities.stripHtmlAndReplaceEntities(folderName);
		// 	}
		// }
		return folderName;
	};

	SingleMedia.prototype.nameForShowing = function(album, html = false, br = false) {
		var mediaName = '';
		// if (Utilities.isPopup() && this.hasOwnProperty("captionForPopup")) {
		// 	mediaName = this.captionForPopup;
		// } else if (album.isSelection() && this.hasOwnProperty("captionForSelection")) {
		// 	mediaName = this.captionForSelection;
		// } else if (album.isSearch() && this.hasOwnProperty("captionForSearch")) {
		// 	mediaName = this.captionForSearch;
		// } else {
		if (this.metadata.hasOwnProperty("title") && this.metadata.title && this.metadata.title !== this.name) {
			mediaName = this.metadata.title;
			if (! br) {
				// remove the tags fronm the title
				mediaName = mediaName.replace(/<[^>]*>?/gm, ' ');
			}

			if (html && br)
				mediaName += "<br /><span class='real-name'>[" + this.name + "]</span>";
			else if (html)
				mediaName += " <span class='real-name'>[" + this.name + "]</span>";
			else
				mediaName += " [" + this.name + "]";
		} else {
			mediaName = this.name;
		}
		// }

		// if (! html) {
		// 	mediaName = mediaName.replace(/<br \/>/g, " ");
		// 	return Utilities.stripHtmlAndReplaceEntities(mediaName);
		// } else if (! br) {
		// 	return mediaName.replace("<br />", " ");
		// } else {
		return mediaName;
		// }
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
				folderMapTitle = subalbum.nameForShowing(this);
			// folderName += folderMapTitle;
			folderMapTitle = Utilities._t('#place-icon-title') + folderMapTitle;
		} else {
			folderMapTitle = Utilities._t('#place-icon-title') + folderName;
		}
		return folderMapTitle;
	};

	Utilities.setPinchButtonsPosition = function(containerHeight, containerWidth) {
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
		// if (containerHeight === undefined) {
		containerHeight = env.windowHeight - titleHeight - albumHeight;
		containerWidth = env.windowWidth;
		// }
		var pinchTop = Math.round(titleHeight + (containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		// var pinchTop = Math.round((containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		var pinchRight = Math.round((containerWidth - actualWidth) / 2 + distanceFromImageBorder);
		$("#pinch-container").css("right", pinchRight.toString() + "px").css("top", pinchTop.toString() + "px");
	};

	Utilities.horizontalScrollBarThickness = function(element) {
		var thickness = element.offsetHeight - element.clientHeight;
		if (! thickness && env.currentAlbum.hasOwnProperty("media")) {
			// sometimes thickness is 0, but the scroll bar could be there
			// let's try to suppose if it's there
			let totalThumbsSize = env.options.media_thumb_size * env.currentAlbum.media.length;
			if (env.options.media_thumb_type === "fixed_height") {
				let sum = 0;
				totalThumbsSize = env.currentAlbum.media.forEach(
					singleMedia => {
						sum += env.options.media_thumb_size / singleMedia.metadata.size[1] * singleMedia.metadata.size[0];
					}
				);
			}
			if (env.options.spacing)
				totalThumbsSize += env.options.spacing * (env.currentAlbum.media.length - 1);

			if (totalThumbsSize > env.windowWidth) {
				// the scrollbar is there
				thickness = 15;

			}
		}
		return thickness;
	};

	Utilities.setSelectButtonPosition = function(containerHeight, containerWidth) {
		// calculate and set pinch buttons position
		if ($(".select-box").attr("src") === undefined)
			return false;

		var mediaElement = $(".media-box#center .media-box-inner img");
		var actualHeight = mediaElement.height();
		var actualWidth = mediaElement.width();
		var titleHeight = 0, albumHeight = 0;
		if ($(".media-box#center .title").is(":visible"))
			titleHeight = $(".media-box#center .title").height();
		if ($("#album-view").is(":visible"))
			albumHeight = Math.max($("#album-view").height(), parseInt($("#album-view").css("height")));
		var distanceFromImageBorder = 15;
		containerHeight = env.windowHeight - titleHeight - albumHeight;
		containerWidth = env.windowWidth;
		// }
		var bottom = Math.round(albumHeight + (containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		var left = Math.round((containerWidth - actualWidth) / 2 + distanceFromImageBorder);
		$("#media-select-box .select-box").css("left", "");
		$("#media-select-box .select-box").css("left", left.toString() + "px").css("bottom", bottom.toString() + "px");
		if (env.isMobile.any() && env.currentMedia !== null) {
			// move the box above the media bar
			while (Utilities.isColliding($("#media-select-box .select-box"), $(".media-box#center .media-bar"))) {
				$("#media-select-box .select-box").css("bottom", (parseInt($("#media-select-box .select-box").css("bottom")) + 5) + "px");
			}
			while (Utilities.isColliding($("#media-select-box .select-box"), $("#prev"))) {
				$("#media-select-box .select-box").css("left", (parseInt($("#media-select-box .select-box").css("left")) + 5) + "px");
			}
		}

		return true;
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

	Utilities.isColliding = function(jQueryObject1, jQueryObject2) {
		// from https://gist.github.com/jtsternberg/c272d7de5b967cec2d3d

		if (! jQueryObject1.is(":visible") || ! jQueryObject2.is(":visible"))
			return false;
		var d1_offset             = jQueryObject1.offset();
		var d1_height             = jQueryObject1.outerHeight(true);
		var d1_width              = jQueryObject1.outerWidth(true);
		var d1_distance_from_top  = d1_offset.top + d1_height;
		var d1_distance_from_left = d1_offset.left + d1_width;

		// Div 2 data
		var d2_offset             = jQueryObject2.offset();
		var d2_height             = jQueryObject2.outerHeight(true);
		var d2_width              = jQueryObject2.outerWidth(true);
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
		return $(".ssk-group").css("display") === "block";
	};

	Utilities.bottomSocialButtons = function() {
		return ! Utilities.lateralSocialButtons();
	};

	Utilities.setLinksVisibility = function() {
		if (env.isMobile.any()) {
			$(".media-box .links").css("display", "inline").css("opacity", 0.5).stop().fadeTo("slow", 0.25);
		} else {
			$("#media-view").off();
			$("#media-view").off('mouseenter').on(
				'mouseenter',
				function() {
					$(".media-box .links").stop().fadeTo("slow", 0.50).css("display", "inline");
				}
			);
			$("#media-view").off('mouseleave').on(
				'mouseleave',
				function() {
					$(".media-box .links").stop().fadeOut("slow");
				}
			);
		}
	};

	Utilities.prototype.setNextPrevVisibility = function() {
		if (env.isMobile.any()) {
			$("#next, #prev").css("display", "inline").css("opacity", 0.5);
		} else {
			$("#next, #prev").off('mouseenter mouseleave');
			$("#next, #prev").off('mouseenter').on(
				'mouseenter',
				function() {
					$(this).stop().fadeTo("fast", 1);
				}
			);

			$("#next, #prev").off('mouseleave').on(
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
		$("#next").css("right", "");
		$("#prev").css("left", "");
		if (! env.fullScreenStatus && env.currentAlbum.numsMedia.imagesAndVideosTotal() > 1) {
			// correct next button position when pinch buttons collide
			let correctionForPinch =
				Utilities.isColliding($("#pinch-container"), $("#next")) ?
					$("#pinch-container").outerWidth() + parseInt($("#pinch-container").css("right")) : 0;
			$("#next").css("right", correctionForPinch.toString() + "px");

			// correct prev button position when social buttons are on the left
			let correctionForSocial =
				Utilities.lateralSocialButtons() && Utilities.isColliding($(".ssk-left"), $("#prev")) ?
					$(".ssk").outerWidth() : 0;

			$("#prev").css("left", correctionForSocial.toString() + "px");
		}
	};

	Utilities.formatDescription = function(text) {
		// Replace CRLF by <p> and remove all useless <br>.
		text = text.replace(/<(\/?\w+)>\s*\n\s*<(\/?\w+)>/g, "<$1><$2>");
		text = text.replace(/\n/g, "</p><p>");
		if (text.substring(0, 3) !== "<p ")
			text = "<p>" + text + "</p>";
		return text;
	};

	Utilities.prototype.adaptCaptionHeight = function() {
		// check for overflow in album-caption class in order to adapt album caption height to the string length
		// when diving into search subalbum, the whole album path is showed and it can be lengthy
		// if (env.options.show_album_names_below_thumbs) {
		var maxHeight = 0;
		// var initialHeight = env.options.album_thumb_size + 10;
		// $(".album-button-and-caption").css("height", initialHeight + 'px');
		$('.album-caption').each(
			function() {
				var thisHeight = $(this)[0].scrollHeight;
				maxHeight = (thisHeight > maxHeight) ? thisHeight : maxHeight;
			}
		);
		var difference = maxHeight - parseFloat($(".album-caption").css("height"));
		$(".album-button-and-caption").css("height", ($(".album-button-and-caption").height() + difference) + 'px');
		$(".album-caption").css("height", maxHeight + 'px');
		// }
	};

	Utilities.hasSomeDescription = function(object, property = null) {
		if (property) {
			if (property === "tags")
				return (object[property] !== undefined && object[property].length);
			else
				return (object[property] !== undefined && object[property]);
		}

		let hasTitle = (object.title !== undefined && object.title);
		let hasDescription = (object.description !== undefined && object.description);
		let hasTags = (object.tags !== undefined && object.tags.length);

		return hasTitle || hasDescription || hasTags;
	};

	Album.prototype.hasSomeDescription = function(property = null) {
		return Utilities.hasSomeDescription(this, property);
	};

	Subalbum.prototype.hasSomeDescription = function(property = null) {
		return Utilities.hasSomeDescription(this, property);
	};

	SingleMedia.prototype.hasSomeDescription = function(property = null) {
		return Utilities.hasSomeDescription(this.metadata, property);
	};

	Utilities.setDescription = function(object) {

		if (! Utilities.hasSomeDescription(object)) {
			$("#description-wrapper").addClass("hidden");
		} else {
			$("#description-wrapper").removeClass("hidden");

			var title = object.title;
			var description = object.description;
			var tags = object.tags;

			var nullTitle = (typeof title === "undefined") || ! title;
			var nullDescription = (typeof description === "undefined") || ! description;
			var nullTags = (typeof tags === "undefined") || ! tags.length;

			// $("#description").css("max-height", (env.windowHeight / 2) + "px");

			if (! nullTitle) {
				$("#description-title").html(Utilities.formatDescription(title));
			} else {
				$("#description-title").html("");
			}

			if (! nullDescription) {
				$("#description-text").html(Utilities.formatDescription(description));
				$("#description-text p").addClass("description-text");
			} else {
				$("#description-text").html("");
			}
			if (! nullTags) {
				// let textualTags = "<p class='tags'> " + Utilities._t("#tags") + ": <span class='tag'>" + tags.join("</span>, <span class='tag'>") + "</span></p>";
				let textualTags = Utilities._t("#tags") + ": <span class='tag'>" + tags.map(tag => Utilities.addTagLink(tag)).join("</span>, <span class='tag'>") + "</span>";
				$("#description-tags").html(textualTags);
			} else {
				$("#description-tags").html("");
			}
		}
	};

	Album.prototype.setDescription = function() {
		Utilities.setDescription(this);
	};

	SingleMedia.prototype.setDescription = function() {
		Utilities.setDescription(this.metadata);
	};

	Utilities.setDescriptionOptions = function() {
		if (env.options.hide_descriptions && env.options.hide_tags)
			$("#description-wrapper").addClass("hidden-by-option");
		else
			$("#description-wrapper").removeClass("hidden-by-option");

		if (env.options.hide_descriptions)
			$("#description").addClass("hidden-by-option");
		else
			$("#descriptiondescription").removeClass("hidden-by-option");

		if (env.options.hide_tags)
			$("#description-tags").addClass("hidden-by-option");
		else
			$("#description-tags").removeClass("hidden-by-option");

		var thumbsHeight = 0;
		if (env.currentMedia !== null && $("#album-view").is(":visible"))
			thumbsHeight = env.options.media_thumb_size + 20;
		$("#description-wrapper").css("bottom", thumbsHeight + 20);

		$("#description-tags").css("right", $("#description-hide-show").outerWidth().toString() + "px");

		var maxHeight = Math.min(env.windowHeight / 3, 500);
		if (env.isMobile.any())
			maxHeight = Math.min(env.windowHeight / 3, 400);

		var maxWidth = Math.min(env.windowWidth / 2, 500);
		if (env.isMobile.any())
			maxWidth = Math.min(env.windowWidth / 2, 400);

		var object = env.currentMedia !== null ? env.currentMedia.metadata : env.currentAlbum;
		var hasDescription = (object.description !== undefined && object.description.length);
		var hasTags = (object.tags !== undefined && object.tags.length);
		$("#description").css("max-height", "");
		$("#description-text").css("max-height", "");
		$("#description-tags").css("max-height", "");
		$("#description-tags").css("position", "");
		if ($("#description-text").is(":visible") && ! env.options.hide_descriptions && hasDescription) {
			$("#description-text").css("max-height", maxHeight.toString() + "px");
		} else if ($("#description-tags").is(":visible") && ! env.options.hide_tags && hasTags) {
			// $("#description-tags").css("position", "static");
			$("#description-tags").css("max-height", maxHeight.toString() + "px");
		} else {
			$("#description").css("max-height", maxHeight.toString() + "px");
		}

		var bottomSpace = $("#description-hide-show").outerHeight();
		if ($("#description-tags").is(":visible") && ! env.options.hide_tags && hasTags)
			bottomSpace = Math.max(bottomSpace, $("#description-tags").outerHeight());
		$("#description").css("margin-bottom", "");
		$("#description-text").css("margin-bottom", "");
		$("#description-text").css("height", "");
		$("#description-wrapper").css("width", "");
		$("#description-tags").css("position", "");
		$("#description-tags").css("margin-left", "");
		if ($("#description-text").is(":visible")) {
			$("#description-text").css("margin-bottom", bottomSpace.toString() + "px");
		} else {
			$("#description").css("margin-bottom", bottomSpace.toString() + "px");
			// $("#description-wrapper").css("width", ($("#description-hide-show").outerWidth() + $("#description-tags").outerWidth()) + "px");
			$("#description-tags").css("position", "relative");
			$("#description-tags").css("margin-left", ($("#description-hide-show").outerWidth()) + "px");
		}

		$("#description-wrapper, #description").css("max-width", maxWidth.toString() + "px");
		$("#description-tags").css("max-width", (maxWidth - 20).toString() + "px");

		// $("#description-wrapper").css("width", "");
		// $("#description-wrapper").css("height", "");
		// $("#description-tags").css("width", "");
		// $("#description-tags").css("height", "");

		while ($("#description-hide-show").outerWidth() + $("#description-tags").outerWidth() > $("#description-wrapper").innerWidth() && $("#description-wrapper").width() < maxWidth) {
			$("#description-wrapper").css("width", ($("#description-wrapper").width() + 5) + "px");
		}

		if (env.isMobile.any()) {
			if (env.currentMedia !== null) {
				// move the box above the media bar
				while (Utilities.isColliding($("#description-wrapper"), $(".media-box#center .media-bar"))) {
					$("#description-wrapper").css("bottom", (parseInt($("#description-wrapper").css("bottom")) + 5) + "px");
				}
			}
			if (Utilities.bottomSocialButtons()) {
				while (Utilities.isColliding($("#description-wrapper"), $("#social > div"))) {
					$("#description-wrapper").css("bottom", (parseInt($("#description-wrapper").css("bottom")) + 5) + "px");
				}
			}
		}
		while (Utilities.isColliding($("#description-wrapper"), $("#next"))) {
			$("#description-wrapper").css("right", (parseInt($("#description-wrapper").css("right")) + 5) + "px");
		}

		$("#description-hide, #description-show").off("click").on(
			"click",
			function() {
				$("#description-hide-show").css("position", "");
				if ($("#description-hide").is(":visible")) {
					// we are hiding
					$("#description-hide-show").css("position", "relative");
				}
				$("#description-hide, #description-show").toggle();
				$("#description, #description-tags").toggle();
				Utilities.setDescriptionOptions();
			}
		);
	};

	Utilities.prototype.numClassesInWorking = function() {
		return $("#working")[0].classList.length > 1;
	};

	Utilities.mediaBoxGenerator = function(id) {
		if (id === 'left')
			$("#media-box-container").prepend(env.originalMediaBoxContainerContent.replace('id="center"', 'id="left"'));
		else if (id === 'right')
			$("#media-box-container").append(env.originalMediaBoxContainerContent.replace('id="center"', 'id="right"'));
		$(".media-box#" + id + " .metadata").css("display", $(".media-box#center .metadata").css("display"));
	};

	Utilities.toggleMenu = function() {
		$("ul#right-menu").toggleClass("expand");
		if ($("ul#right-menu").hasClass("expand")) {
			if (! $(".sub-menu:not(.hidden)").length)
				Utilities.focusSearchField();
			Functions.updateMenu();
		}
	};

	Utilities.prototype.showAuthForm = function(event, maybeProtectedContent = false) {
		$("#album-view, #media-view, #my-modal, #no-results").css("opacity", "0.2");
		$("#loading").hide();
		if ($("ul#right-menu").hasClass("expand")) {
			Utilities.toggleMenu();
		}
		$("#no-results").hide();
		$("#auth-text").stop().fadeIn(1000);
		$("#password").focus();


		$('#auth-close').off("click").on(
			"click",
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
		var resultCacheBase;
		if (hash === undefined)
			hash = window.location.hash;
		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, savedSearchAlbumCacheBase] = PhotoFloat.decodeHash(hash);

		if (mediaCacheBase === null || env.currentAlbum !== null && env.currentAlbum.isAlbumWithOneMedia()) {
			// hash of an album: go up in the album tree
			if (savedSearchAlbumCacheBase !== null) {
				if (albumCacheBase === foundAlbumCacheBase)
					resultCacheBase = savedSearchAlbumCacheBase;
				else {
					// we must go up in the sub folder
					albumCacheBase = albumCacheBase.split(env.options.cache_folder_separator).slice(0, -1).join(env.options.cache_folder_separator);
					resultCacheBase = Utilities.pathJoin([
						albumCacheBase,
						foundAlbumCacheBase,
						savedSearchAlbumCacheBase
					]);
				}
			} else {
				if (albumCacheBase === env.options.folders_string) {
					// stay there
					resultCacheBase = albumCacheBase;
				} else if ([env.options.by_date_string, env.options.by_gps_string].indexOf(albumCacheBase) !== -1) {
					// go to folders root
					resultCacheBase = env.options.folders_string;
				} else if (Utilities.isSearchCacheBase(albumCacheBase) || Utilities.isMapCacheBase(albumCacheBase)) {
					// the return folder must be extracted from the album hash
					// resultCacheBase = albumCacheBase.split(env.options.cache_folder_separator).slice(2).join(env.options.cache_folder_separator);
					resultCacheBase = env.options.cache_base_to_search_in;
				} else {
					let album = env.cache.getAlbum(albumCacheBase);
					if (Utilities.isSelectionCacheBase(albumCacheBase) && ! album) {
						resultCacheBase = env.options.folders_string;
					} else if (Utilities.isSelectionCacheBase(albumCacheBase) && album.media.length > 1) {
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
						resultCacheBase = '';
						for (let iPart = 0; iPart < minimumLength; iPart ++) {
							if (parts[iPart].some((val, i, arr) => val !== arr[0])) {
								break;
							} else {
								resultCacheBase = parts[iPart][0];
							}
						}
					} else if (Utilities.isSelectionCacheBase(albumCacheBase) && album.media.length === 1) {
						resultCacheBase = album.media[0].foldersCacheBase;
					} else {
						// we must go up in the sub folders tree
						resultCacheBase = albumCacheBase.split(env.options.cache_folder_separator).slice(0, -1).join(env.options.cache_folder_separator);
					}
				}
			}
		} else {
			// hash of a media: remove the media
			if (savedSearchAlbumCacheBase !== null || Utilities.isFolderCacheBase(albumCacheBase))
				// media in found album or in one of its subalbum
				// or
				// media in folder hash:
				// remove the trailing media
				resultCacheBase = Utilities.pathJoin(hash.split("/").slice(1, -1));
			else
				// all the other cases
				// remove the trailing media and the folder it's inside
				resultCacheBase = Utilities.pathJoin(hash.split("/").slice(1, -2));
		}

		return env.hashBeginning + resultCacheBase;
	};


	/* Error displays */
	Utilities.prototype.errorThenGoUp = function(error) {
		if (error === 403) {
			$("#auth-text").stop().fadeIn(1000);
			$("#password").focus();
		} else {
			// Jason's code only had the following line
			//$("#error-text").stop().fadeIn(2500);

			var rootHash = env.hashBeginning + env.options.folders_string;

			$("#album-view").fadeOut(200);
			$("#media-view").fadeOut(200);

			$("#loading").hide();
			if (window.location.hash === rootHash) {
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
		var index = env.guessedPasswordsMd5.indexOf(md5);
		return env.guessedPasswordCodes[index];
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
				index = env.guessedPasswordCodes.indexOf(codesList[i]);
				if (index != -1)
					md5sList.push(env.guessedPasswordsMd5[index]);
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

		if (this.subalbums.length) {
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

	Album.prototype.initializeSortProperties = function() {
		// this function sets the subalbum and media properties that attest the lists status
		// json files have subalbums and media sorted according to the options

		if (this.albumNameSort === undefined)
			this.albumNameSort = env.options.default_album_name_sort;
		if (this.albumReverseSort === undefined)
			this.albumReverseSort = env.options.default_album_reverse_sort;

		if (this.mediaNameSort === undefined)
			this.mediaNameSort = env.options.default_media_name_sort;
		if (this.mediaReverseSort === undefined)
			this.mediaReverseSort = env.options.default_media_reverse_sort;
	};

	Utilities.prototype.toggleInsideWordsSearch = function() {
		env.options.search_inside_words = ! env.options.search_inside_words;
		Functions.setBooleanCookie("searchInsideWords", env.options.search_inside_words);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		Utilities.focusSearchField();
	};

	Utilities.prototype.toggleAnyWordSearch = function() {
		env.options.search_any_word = ! env.options.search_any_word;
		Functions.setBooleanCookie("searchAnyWord", env.options.search_any_word);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		Utilities.focusSearchField();
	};

	Utilities.prototype.toggleCaseSensitiveSearch = function() {
		env.options.search_case_sensitive = ! env.options.search_case_sensitive;
		Functions.setBooleanCookie("searchCaseSensitive", env.options.search_case_sensitive);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		Utilities.focusSearchField();

	};

	Utilities.prototype.toggleAccentSensitiveSearch = function() {
		env.options.search_accent_sensitive = ! env.options.search_accent_sensitive;
		Functions.setBooleanCookie("searchAccentSensitive", env.options.search_accent_sensitive);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		Utilities.focusSearchField();
	};

	Utilities.prototype.toggleTagsOnlySearch = function() {
		env.options.search_tags_only = ! env.options.search_tags_only;
		Functions.setBooleanCookie("searchTagsOnly", env.options.search_tags_only);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		Utilities.focusSearchField();
	};

	Utilities.prototype.toggleCurrentAbumSearch = function() {
		env.options.search_current_album = ! env.options.search_current_album;
		Functions.setBooleanCookie("searchCurrentAlbum", env.options.search_current_album);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		Utilities.focusSearchField();
	};

	/* make static methods callable as member functions */
	Utilities.prototype.isFolderCacheBase = Utilities.isFolderCacheBase;
	Utilities.prototype.pathJoin = Utilities.pathJoin;
	Utilities.prototype.setLinksVisibility = Utilities.setLinksVisibility;
	Utilities.prototype.mediaBoxGenerator = Utilities.mediaBoxGenerator;
	Utilities.prototype.currentSizeAndIndex = Utilities.currentSizeAndIndex;
	Utilities.prototype.nextSizeAndIndex = Utilities.nextSizeAndIndex;
	Utilities.prototype.isColliding = Utilities.isColliding;
	Utilities.prototype.distanceBetweenCoordinatePoints = Utilities.distanceBetweenCoordinatePoints;
	Utilities.prototype.xDistanceBetweenCoordinatePoints = Utilities.xDistanceBetweenCoordinatePoints;
	Utilities.prototype.yDistanceBetweenCoordinatePoints = Utilities.yDistanceBetweenCoordinatePoints;
	Utilities.prototype.degreesToRadians = Utilities.degreesToRadians;
	Utilities.prototype.mediaBoxContainerHeight = Utilities.mediaBoxContainerHeight;
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
	Utilities.prototype.isAnyRootCacheBase = Utilities.isAnyRootCacheBase;
	Utilities.prototype.initializeSelectionRootAlbum = Utilities.initializeSelectionRootAlbum;
	Utilities.prototype.initializeOrGetMapRootAlbum = Utilities.initializeOrGetMapRootAlbum;
	Utilities.prototype.nothingIsSelected = Utilities.nothingIsSelected;
	Utilities.prototype.somethingIsSelected = Utilities.somethingIsSelected;
	Utilities.prototype.somethingIsSearched = Utilities.somethingIsSearched;
	Utilities.prototype.somethingIsInMapAlbum = Utilities.somethingIsInMapAlbum;
	Utilities.prototype.initializeSelectionAlbum = Utilities.initializeSelectionAlbum;
	Utilities.prototype.transformAltPlaceName = Utilities.transformAltPlaceName;
	Utilities.prototype.normalizeAccordingToOptions = Utilities.normalizeAccordingToOptions;
	Utilities.prototype.removeAccents = Utilities.removeAccents;
	Utilities.prototype.arrayIntersect = Utilities.arrayIntersect;
	Utilities.prototype.scrollToThumb = Utilities.scrollToThumb;
	Utilities.prototype.focusSearchField = Utilities.focusSearchField;
	Utilities.prototype.addTagLink = Utilities.addTagLink;
	Utilities.prototype.formatDescription = Utilities.formatDescription;
	Utilities.prototype.stripHtmlAndReplaceEntities = Utilities.stripHtmlAndReplaceEntities;
	Utilities.prototype.isPopup = Utilities.isPopup;
	Utilities.prototype.arrayUnion = Utilities.arrayUnion;
	Utilities.prototype.setPinchButtonsPosition = Utilities.setPinchButtonsPosition;
	Utilities.prototype.setSelectButtonPosition = Utilities.setSelectButtonPosition;
	Utilities.prototype.correctPrevNextPosition = Utilities.correctPrevNextPosition;
	Utilities.prototype.setDescriptionOptions = Utilities.setDescriptionOptions;
	Utilities.prototype.toggleMenu = Utilities.toggleMenu;

	window.Utilities = Utilities;
}());
