(function() {
	var lastSelectionAlbumIndex = 0;
	var lastMapAlbumIndex = 0;
	/* constructor */
	function Utilities() {
	}

	Utilities.openInNewTab = function(hash) {
		// albums is a list of objects {albumName: album}
		var typeOfPackedAlbum, stringifiedPackedAlbum, albumName;

		var newFormObject = $(
			"<form>",
			{
				action: hash,
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
			newFormObject.append(
				$(
					"<input>",
					{
						name: "albumName_" + iString,
						value: albumName,
						type: "hidden"
					}
				)
			).append(
				$(
					"<input>",
					{
						name: "stringifiedPackedAlbum_" + iString,
						value: stringifiedPackedAlbum,
						type: "hidden"
					}
				)
			).append(
				$(
					"<input>",
					{
						name: "typeOfPackedAlbum_" + iString,
						value: typeOfPackedAlbum,
						type: "hidden"
					}
				)
			);
		}

		newFormObject.append(
			$(
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
		newFormObject.append(
			$(
				"<input>",
				{
					name: "currentAlbumIs",
					value: currentAlbumIs,
					type: "hidden"
				}
			)
		);

		if (env.guessedPasswordsMd5.length) {
			newFormObject.append(
				$(
					"<input>",
					{
						name: "guessedPasswordsMd5",
						value: env.guessedPasswordsMd5.join('-'),
						type: "hidden"
					}
				)
			).append(
				$(
					"<input>",
					{
						name: "guessedPasswordCodes",
						value: env.guessedPasswordCodes.join('-'),
						type: "hidden"
					}
				)
			);
		}
		newFormObject.hide().appendTo("body").submit().remove();
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
		return rootMapAlbum;
	};

	Utilities.prototype.initializeMapAlbum = function() {
		var rootMapAlbum = env.cache.getAlbum(env.options.by_map_string);
		// if (! rootMapAlbum)
		// 	rootMapAlbum = Utilities.initializeOrGetMapRootAlbum();

		lastMapAlbumIndex ++;

		// initializes the map album
		var newMapAlbum = new Album(env.options.by_map_string + env.options.cache_folder_separator + lastMapAlbumIndex + env.options.cache_folder_separator + env.currentAlbum.cacheBase);
		newMapAlbum.path = newMapAlbum.cacheBase.replace(env.options.cache_folder_separator, "/");

		rootMapAlbum.numsMediaInSubTree.sum(newMapAlbum.numsMediaInSubTree);
		rootMapAlbum.subalbums.push(newMapAlbum);
		rootMapAlbum.positionsAndMediaInTree.mergePositionsAndMedia(newMapAlbum.positionsAndMediaInTree);
		rootMapAlbum.numPositionsInTree = rootMapAlbum.positionsAndMediaInTree.length;

		newMapAlbum.ancestorsCacheBase = rootMapAlbum.ancestorsCacheBase.slice();
		newMapAlbum.ancestorsCacheBase.push(newMapAlbum.cacheBase);

		newMapAlbum.ancestorsNames = [env.options.by_map_string, newMapAlbum.cacheBase];

		return newMapAlbum;
	};

	Utilities.prototype.initializeSearchAlbumBegin = function(albumCacheBase) {
		var newSearchAlbum = new Album(albumCacheBase);
		newSearchAlbum.path = newSearchAlbum.cacheBase.replace(env.options.cache_folder_separator, "/");
		newSearchAlbum.ancestorsNames = [env.options.by_search_string, newSearchAlbum.cacheBase];
		newSearchAlbum.includedFilesByCodesSimpleCombination = new IncludedFiles({",": {}});

		return newSearchAlbum;
	};

	Utilities.initializeSearchRootAlbum = function() {
		var rootSearchAlbum = new Album(env.options.by_search_string);
		env.cache.putAlbum(rootSearchAlbum);
	};


	Utilities.initializeSelectionRootAlbum = function() {
		// prepare the root of the selections albums and put it in the cache
		var rootSelectionAlbum = env.cache.getAlbum(env.options.by_selection_string);
		if (! rootSelectionAlbum) {
			rootSelectionAlbum = new Album(env.options.by_selection_string);
			env.cache.putAlbum(rootSelectionAlbum);
		}

		return rootSelectionAlbum;
	};

	Utilities.initializeSelectionAlbum = function() {
		// initializes the selection album

		var rootSelectionAlbum = env.cache.getAlbum(env.options.by_selection_string);

		lastSelectionAlbumIndex ++;

		env.selectionAlbum = new Album(env.options.by_selection_string + env.options.cache_folder_separator + lastSelectionAlbumIndex);
		env.selectionAlbum.path = env.selectionAlbum.cacheBase.replace(env.options.cache_folder_separator, "/");

		rootSelectionAlbum.numsMediaInSubTree.sum(env.selectionAlbum.numsMediaInSubTree);
		rootSelectionAlbum.subalbums.push(env.selectionAlbum);
		rootSelectionAlbum.positionsAndMediaInTree.mergePositionsAndMedia(env.selectionAlbum.positionsAndMediaInTree);
		rootSelectionAlbum.numPositionsInTree = rootSelectionAlbum.positionsAndMediaInTree.length;

		env.selectionAlbum.ancestorsCacheBase = rootSelectionAlbum.ancestorsCacheBase.slice();
		env.selectionAlbum.ancestorsCacheBase.push(env.selectionAlbum.cacheBase);
		env.selectionAlbum.ancestorsNames = [env.options.by_selection_string, env.selectionAlbum.cacheBase];
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

	Utilities._s = function(key) {
		return env.shortcuts[env.language][key];
	};

	Utilities._t = function(key) {
		let shortcut = env.shortcuts[env.language][key];
		if (shortcut)
			shortcut = " [" + shortcut + "]";
		else
			shortcut = "";
		return env.translations[env.language][key] + shortcut;
	};

	Utilities.prototype.translate = function() {
		for (var key in env.translations.en) {
			if (env.translations[env.language].hasOwnProperty(key)) {
				if (key === '.title-string' && document.title.substr(0, 5) != "<?php")
					// don't set page title, php has already set it
					continue;
				let keyObject = $(key);
				if (keyObject.length) {
					keyObject.html(Utilities._t(key));
				}
			}
		}
		$("ul#right-menu #save-data").attr("title", Utilities._t("#save-data-tip"));
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

	Utilities.prototype.cloneObject = function(object) {
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

	Utilities.prototype.sortByDate = function (subalbums) {
		subalbums.sort(
			function(a, b) {
				return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
			}
		);
	};

	Utilities.isAnyRootCacheBase = function(cacheBase) {
		var result =
			[env.options.folders_string, env.options.by_date_string, env.options.by_gps_string].indexOf(cacheBase) !== -1 ||
			Utilities.isSearchCacheBase(cacheBase) ||
			Utilities.isMapCacheBase(cacheBase) ||
			Utilities.isSelectionCacheBase(cacheBase);
		return result;
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

	Utilities.isByDateCacheBase = function(cacheBase) {
		return cacheBase === env.options.by_date_string || cacheBase.indexOf(env.options.byDateStringWithTrailingSeparator) === 0;
	};

	Utilities.isByGpsCacheBase = function(cacheBase) {
		return cacheBase === env.options.by_gps_string || cacheBase.indexOf(env.options.byGpsStringWithTrailingSeparator) === 0;
	};

	Utilities.isSearchCacheBase = function(cacheBase) {
		return cacheBase.indexOf(env.options.bySearchStringWithTrailingSeparator) === 0;
	};

	Utilities.isSelectionCacheBase = function(cacheBase) {
		return cacheBase.indexOf(env.options.bySelectionStringWithTrailingSeparator) === 0;
	};

	Utilities.prototype.isCollectionCacheBase = function(cacheBase) {
		return Utilities.isMapCacheBase(cacheBase) || Utilities.isSearchCacheBase(cacheBase) || Utilities.isSelectionCacheBase(cacheBase);
	};

	Utilities.isMapCacheBase = function(cacheBase) {
		return cacheBase.indexOf(env.options.byMapStringWithTrailingSeparator) === 0;
	};

	Utilities.isSearchHash = function() {
		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = PhotoFloat.decodeHash(location.hash);
		var cacheBase = PhotoFloat.convertHashToCacheBase(location.hash);
		if (Utilities.isSearchCacheBase(cacheBase) || collectionCacheBase !== null)
			return true;
		else
			return false;
	};

	Utilities.openSearchMenu = function(album) {
		$("#right-menu").addClass("expanded");
		$("#search-icon").addClass("expanded");
		$("#menu-icon").removeClass("expanded");

		$(".search").removeClass("hidden-by-menu-selection");
		$(".first-level").addClass("hidden-by-menu-selection");

		Utilities.highlightMenu();

		$("#album-and-media-container:not(.show-media) #album-view").css("opacity", "0.3");
		$(".media-popup .leaflet-popup-content-wrapper").css("background-color", "darkgray");

		Functions.updateMenu(album);
	};

	Utilities.prototype.toggleSearchMenu = function(ev, album) {
		if (! $("#right-menu").hasClass("expanded") || ! $("#search-icon").hasClass("expanded"))
			Utilities.openSearchMenu(album);
		else
			Utilities.closeMenu();
	};

	Utilities.openRightMenu = function(album) {
		$("#right-menu").addClass("expanded");
		$("#search-icon").removeClass("expanded");
		$("#menu-icon").addClass("expanded");

		$(".first-level").removeClass("hidden-by-menu-selection");
		$(".search").addClass("hidden-by-menu-selection");

		Utilities.highlightMenu();

		$("#album-and-media-container:not(.show-media) #album-view").css("opacity", "0.3");
		$(".media-popup .leaflet-popup-content-wrapper").css("background-color", "darkgray");
		Functions.updateMenu(album);
	};

	Utilities.prototype.toggleRightMenu = function(ev, album) {
		if (! $("#right-menu").hasClass("expanded") || ! $("#menu-icon").hasClass("expanded"))
			Utilities.openRightMenu(album);
		else
			Utilities.closeMenu();
	};

	Utilities.openMenu = function(album) {
		if ($(".first-level").hasClass("hidden-by-menu-selection")) {
			Utilities.openSearchMenu();
		} else {
			Utilities.openRightMenu();
		}

	};

	Utilities.closeMenu = function() {
		$("#right-menu").removeClass("expanded");
		$("#search-icon, #menu-icon").removeClass("expanded");

		$("#album-view").css("opacity", "");
		$(".media-popup .leaflet-popup-content-wrapper").css("background-color", "");
	};

	Utilities.prototype.toggleMenu = function(ev, album) {
		if (! $("#right-menu").hasClass("expanded"))
			Utilities.openMenu(album);
		else
			Utilities.closeMenu();
	};

	Utilities.prototype.noResults = function(album, resolveParseHash, selector) {
		// no media found or other search fail, show the message
		env.currentAlbum = album;
		TopFunctions.setTitle("album", null);
		$("#subalbums, #thumbs, #media-view").addClass("hidden-by-no-results");
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
	};

	Utilities.focusSearchField = function() {
		if (! env.isMobile.any()) {
			$("#search-button").focus();
		} else {
			$("#search-button").blur();
		}
		if (
			! $("#right-menu li.search .highlighted").length &&
			! $("#right-menu li.search .was-highlighted").length
		)
			$("#right-menu li.search:not(.hidden-by-menu-selection)").addClass("highlighted");
		else if (
			! $("#right-menu li.search .highlighted").length &&
			$("#right-menu li.search .was-highlighted").length
		)
			$("#right-menu li.search:not(.hidden-by-menu-selection) .was-highlighted").removeClass("was-highlighted").addClass("highlighted");
	};

	Utilities.highlightMenu = function() {
		if (
			! $("#right-menu li.search.highlighted").length &&
			! $("#right-menu li.search .highlighted").length &&
			! $("#right-menu li.search.was-highlighted").length &&
			! $("#right-menu li.search .was-highlighted").length
		)
			$("#right-menu li.search:not(.hidden-by-menu-selection)").addClass("highlighted");
		else if(
			! $("#right-menu li.search.highlighted").length &&
			! $("#right-menu li.search .highlighted").length && (
				$("#right-menu li.search.was-highlighted").length ||
				$("#right-menu li.search .was-highlighted").length
			)
		)
			$("#right-menu li.search:not(.hidden-by-menu-selection).was-highlighted").removeClass("was-highlighted").addClass("highlighted");

		if (
			! $("#right-menu li.first-level.highlighted").length &&
			! $("#right-menu li.first-level .highlighted").length &&
			! $("#right-menu li.first-level.was-highlighted").length &&
			! $("#right-menu li.first-level .was-highlighted").length
		)
			$("#right-menu li.first-level:not(.hidden-by-menu-selection)").first().addClass("highlighted");
		else if(
			! $("#right-menu li.first-level.highlighted").length &&
			! $("#right-menu li.first-level .highlighted").length && (
				$("#right-menu li.first-level.was-highlighted").length ||
				$("#right-menu li.first-level .was-highlighted").length
			)
		)
			$("#right-menu li.first-level:not(.hidden-by-menu-selection).was-highlighted").removeClass("was-highlighted").addClass("highlighted");
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

	Utilities.removeFolderString = function (cacheBase) {
		if (this.isFolderCacheBase(cacheBase)) {
			cacheBase = cacheBase.substring(env.options.folders_string.length);
			if (cacheBase.length > 0)
				cacheBase = cacheBase.substring(1);
		}
		return cacheBase;
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

	Utilities.prototype.albumIsSelected = function(album) {
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

	Utilities.prototype.downloadSelectionInfo = function() {
		if ($(".download-album.selection").hasClass("highlighted") && $("#right-menu").hasClass("expanded") && $("#menu-icon").hasClass("expanded")) {
			$("#how-to-download-selection").show();
			$("#how-to-download-selection").off("click").on(
				"click",
				function(e) {
					$("#how-to-download-selection").hide();
				}
			);
		} else {
			$("#how-to-download-selection").hide();
		}
	};

	Utilities.isShiftOrControl = function() {
		return $(".shift-or-control").length ? true : false;
	};

	Utilities.isPopup = function() {
		return $(".media-popup.leaflet-popup").html() ? true : false;
	};

	Utilities.isMap = function() {
		return ($('#mapdiv').html() ? true : false) && ! Utilities.isPopup();
	};

	Utilities.prototype.setTitleOptions = function() {
		if (env.options.hide_title)
			$(".title").addClass("hidden-by-option");
		else
			$(".title").removeClass("hidden-by-option");

		if (! env.options.show_album_media_count)
			$(".title-count").addClass("hidden-by-option");
		else
			$(".title-count").removeClass("hidden-by-option");

		$(".title").css("font-size", env.options.title_font_size);
		$(".title-anchor").css("color", env.options.title_color);
		$(".title-anchor").hover(function() {
			//mouse over
			$(this).css("color", env.options.title_color_hover);
		}, function() {
			//mouse out
			$(this).css("color", env.options.title_color);
		});
	};

	Utilities.prototype.changeToBySelectionView = function(ev, thisMedia = null) {
		TopFunctions.showBrowsingModeMessage(ev, "#by-selection-browsing");
		var isShiftOrControl = Utilities.isShiftOrControl();
		var isPopup = Utilities.isPopup();
		var isMap = ($('#mapdiv').html() ? true : false) && ! isPopup;
		if (isShiftOrControl) {
			// close the shift/control buttons
			$(".shift-or-control .leaflet-popup-close-button")[0].click();
		}
		if (isPopup) {
			// the popup is there: close it
			env.highlightedObjectId = null;
			$("media-popup .leaflet-popup-close-button")[0].click();
		}
		if (isMap || isPopup) {
			// we are in a map: close it
			$('.modal-close')[0].click();
		}

		if (thisMedia) {
			$(".title").removeClass("hidden-by-pinch");
			$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
			window.location.href = PhotoFloat.encodeHash(env.selectionAlbum.cacheBase, thisMedia);
		} else {
			window.location.href = PhotoFloat.encodeHash(env.selectionAlbum.cacheBase, null);
		}
		return false;
	};

	Utilities.prototype.setMediaOptions = function() {
		$(".media-name").css("color", env.options.media_name_color);

		if (! env.options.show_media_names_below_thumbs)
			$(".thumb-and-caption-container .media-name").addClass("hidden-by-option");
		else
			$(".thumb-and-caption-container .media-name").removeClass("hidden-by-option");

		$(".thumb-and-caption-container").css("margin-right", env.options.spacing.toString() + "px");
		if ($("#album-and-media-container").hasClass("show-media"))
			$(".thumb-and-caption-container").css("margin-bottom", "0");
		else
			$(".thumb-and-caption-container").css("margin-bottom", env.options.spacing.toString() + "px");

		if (env.options.hide_descriptions)
			$(".media-description").addClass("hidden-by-option");
		else
			$(".media-description").removeClass("hidden-by-option");

		if (env.options.hide_tags)
			$(".media-tags").addClass("hidden-by-option");
		else
			$(".media-tags").removeClass("hidden-by-option");

		$("#album-and-media-container #thumbs").removeClass("hidden-by-option");
		if (env.options.hide_bottom_thumbnails) {
			$("#album-and-media-container.show-media #thumbs").addClass("hidden-by-option");
		}
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

		if (env.currentAlbum.isFolder() && ! env.options.show_album_names_below_thumbs)
			$(".album-name").addClass("hidden-by-option");
		else
			$(".album-name").removeClass("hidden-by-option");

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

		if (
			$("#subalbums .album-button img.thumbnail").length &&
			$("#subalbums").is(":visible")
		) {
			let firstThumbnail = $("#subalbums .album-button img.thumbnail").first();
			if (firstThumbnail.attr("src") !== "img/image-placeholder.jpg") {
				var mustBeSquare = (env.options.album_thumb_type.indexOf("square") > -1);
				var isSquare = (firstThumbnail.attr("src").substr(- env.options.format.length - 2, 1) === "s");
				if (isSquare !== mustBeSquare) {
					$("#subalbums .album-button img.thumbnail").each(
						function() {
							var attribute;
							if (["af." + env.options.format, "as." + env.options.format].indexOf($(this).attr("src").substr(-3 - env.options.format.length)) !== -1)
								attribute = "src";
							else
								// this value is for thumbnails not processed by LazyLoad yet
								attribute = "data-src";

							var srcArray = $(this).attr(attribute).split("");
							var charPosition = srcArray.length - env.options.format.length - 2;
							srcArray[charPosition] = srcArray[charPosition] === "s" ? "f" : "s";
							$(this).attr(attribute, srcArray.join(""));
						}
					);
				}
			}
		}


		if (! env.options.show_album_media_count)
			$(".album-caption-count").addClass("hidden-by-option");
		else
			$(".album-caption-count").removeClass("hidden-by-option");


		if (env.options.hide_descriptions)
			$(".album-description").addClass("hidden-by-option");
		else
			$(".album-description").removeClass("hidden-by-option");

		if (env.options.hide_tags)
			$(".album-tags").addClass("hidden-by-option");
		else
			$(".album-tags").removeClass("hidden-by-option");
	};

	Utilities.addTagLink = function(tag) {
		// tags can be phrases (e.g. with automatic tags from person recognition)

		// now replace space -> underscore
		var tagForHref = tag.replace(/ /g, "_");
		// all non-letter character must be converted to space
		tagForHref = tagForHref.replace(/([^\p{L}_])/ug, match => match === "-" ? "%2D" : encodeURIComponent(match));

		var hash = env.hashBeginning + env.options.by_search_string + env.options.cache_folder_separator +  "t" + env.options.search_options_separator + "o" + env.options.search_options_separator + tagForHref + env.options.cache_folder_separator + env.currentAlbum.cacheBase;
		return "<a href='" + hash + "'>" + tag + "</a>";
	};

	Utilities.em2px = function(selector, em) {
		var emSize = parseFloat($(selector).css("font-size"));
		return (em * emSize);
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

		var [fakeCurrentReductionSize, currentReductionIndex] = Utilities.currentSizeAndIndex();
		if (currentReductionIndex === -1)
			return [false, false];

		if (currentReductionIndex === 0)
			return [Math.max(env.currentMedia.metadata.size[0], env.currentMedia.metadata.size[1]), -1];

		return [env.options.reduced_sizes[currentReductionIndex - 1], currentReductionIndex - 1];
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

	Utilities.prototype.resizeSingleMediaWithPrevAndNext = function(self, album, isFullScreenToggling = false) {
		var previousWindowWidth = env.windowWidth;
		var previousWindowHeight = env.windowHeight;
		env.windowWidth = $(window).innerWidth();
		env.windowHeight = $(window).innerHeight();
		if (env.windowWidth === previousWindowWidth && env.windowHeight === previousWindowHeight && ! isFullScreenToggling)
			// avoid considering a resize when the mobile browser shows/hides the location bar
			return;

		$("#loading").show();

		if (album.media.length && ! $("#thumbs").children().length)
			album.showMedia();

		var event = {data: {}};
		event.data.resize = true;
		event.data.id = "center";

		// prev and next tree in the DOM must be given the correct sizes
		$(".media-box#left, .media-box#right").css("width", env.windowWidth);
		$(".media-box#left, .media-box#right").css("height", env.windowHeight);

		let scalePromise = self.scale(event);
		scalePromise.then(
			function() {
				if (self.isImage()) {
					// if (env.currentZoom === env.initialZoom)
					Functions.pinchSwipeInitialization();
					Utilities.setPinchButtonsPosition();
					Utilities.setPinchButtonsVisibility();
				}
				Utilities.setSelectButtonPosition();
				Utilities.setDescriptionOptions();
				Utilities.correctElementPositions();
			}
		);

		if (album.numsMedia.imagesAndVideosTotal() > 1) {
			event.data.id = "left";
			env.prevMedia.scale(event);

			event.data.id = "right";
			env.nextMedia.scale(event);
		}

		if (Utilities.isMap() || Utilities.isPopup()) {
			// the map must be generated again including the points that only carry protected content
			env.mapRefreshType = "resize";

			if (Utilities.isPopup()) {
				env.popupRefreshType = "mapAlbum";
				env.highlightedObjectId = null;
				if (Utilities.isShiftOrControl())
					$(".shift-or-control .leaflet-popup-close-button")[0].click();
				$(".media-popup .leaflet-popup-close-button")[0].click();
			} else {
				env.popupRefreshType = "none";
			}

			// close the map and reopen it
			$('.modal-close')[0].click();
			$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
		}
	};

	Utilities.isLoaded = function(imgSrc) {
		return env.loadedImages.indexOf(imgSrc) !== -1;
	};

	Utilities.prototype.setLoaded = function(imgSrc) {
		env.loadedImages.push(imgSrc);
	};

	Utilities.onlyShowNonGeotaggedContent = function() {
		return $("#fullscreen-wrapper").hasClass("hide-geotagged");
	};

	Utilities.nextObjectForHighlighting = function(object) {
		var isPopup = Utilities.isPopup();
		var nextObject;

		if (isPopup) {
			nextObject = object.next();
			if (! nextObject.length)
				 nextObject = object.parent().children().first();
		} else {
			let numVisibleSubalbums = env.currentAlbum.subalbums.length;
			let numVisibleMedia = env.currentAlbum.media.length;
			let filter = "*";
			let mediaFilter = "*";
			let subalbumsFilter = "*";
			if (Utilities.onlyShowNonGeotaggedContent()) {
				numVisibleSubalbums = $("#subalbums > a:not(.all-gps)").length;
				numVisibleMedia = $("#thumbs > a:not(.gps)").length;
				mediaFilter = ":not(.gps)";
				subalbumsFilter = ":not(.all-gps)";
				filter = mediaFilter;
				if (Utilities.objectIsASubalbum(object))
					filter = subalbumsFilter;
			}
			let nextObjectParent = object.parent().nextAll(filter).first();
			if (nextObjectParent.length) {
				nextObject = nextObjectParent.children();
			} else {
				if (
					Utilities.objectIsASingleMedia(object) && numVisibleMedia === 1 && ! numVisibleSubalbums ||
					Utilities.objectIsASubalbum(object) && numVisibleSubalbums === 1 && ! numVisibleMedia
				)
					return object;
				else if (Utilities.objectIsASingleMedia(object) && numVisibleSubalbums)
					nextObject = $(".album-button-and-caption").parent().filter(subalbumsFilter).first().children();
				else if (Utilities.objectIsASingleMedia(object) && ! numVisibleSubalbums)
					nextObject = $(".thumb-and-caption-container").parent().prevAll(mediaFilter).last().children();
				else if (Utilities.objectIsASubalbum(object) && numVisibleMedia)
					nextObject = $(".thumb-and-caption-container").parent().filter(mediaFilter).first().children();
				else if (Utilities.objectIsASubalbum(object) && ! numVisibleMedia)
					nextObject = $(".album-button-and-caption").parent().prevAll(subalbumsFilter).last().children();
			}
		}

		return nextObject;
	};

	Utilities.prevObjectForHighlighting = function(object) {
		var isPopup = Utilities.isPopup();
		var prevObject;

		if (isPopup) {
			prevObject = object.prev();
			if (! prevObject.length)
				 prevObject = object.parent().children().last();
		} else {
			let numVisibleSubalbums = env.currentAlbum.subalbums.length;
			let numVisibleMedia = env.currentAlbum.media.length;
			let filter = "*";
			let mediaFilter = "*";
			let subalbumsFilter = "*";
			if (Utilities.onlyShowNonGeotaggedContent()) {
				numVisibleSubalbums = $("#subalbums > a:not(.all-gps)").length;
				numVisibleMedia = $("#thumbs > a:not(.gps)").length;
				mediaFilter = ":not(.gps)";
				subalbumsFilter = ":not(.all-gps)";
				filter = mediaFilter;
				if (Utilities.objectIsASubalbum(object))
					filter = subalbumsFilter;
			}
			let prevObjectParent = object.parent().prevAll(filter).first();
			if (prevObjectParent.length) {
				prevObject = prevObjectParent.children();
			} else {
				if (
					Utilities.objectIsASingleMedia(object) && numVisibleMedia === 1 && ! numVisibleSubalbums ||
					Utilities.objectIsASubalbum(object) && numVisibleSubalbums === 1 && ! numVisibleMedia
				)
					return object;
				else if (Utilities.objectIsASingleMedia(object) && numVisibleSubalbums)
					prevObject = $(".album-button-and-caption").parent().filter(subalbumsFilter).last().children();
				else if (Utilities.objectIsASingleMedia(object) && ! numVisibleSubalbums)
					prevObject = $(".thumb-and-caption-container").parent().nextAll(mediaFilter).last().children();
				else if (Utilities.objectIsASubalbum(object) && numVisibleMedia)
					prevObject = $(".thumb-and-caption-container").parent().filter(mediaFilter).last().children();
				else if (Utilities.objectIsASubalbum(object) && ! numVisibleMedia)
					prevObject = $(".album-button-and-caption").parent().nextAll(subalbumsFilter).last().children();
			}
		}

		return prevObject;
	};

	Utilities.prototype.selectBoxObject = function(object) {
		var isPopup = Utilities.isPopup();
		var selector = "", selectBoxObject;
		if (isPopup)
			selector = "#popup-images-wrapper ";
		if (Utilities.objectIsASubalbum(object) || isPopup) {
			selector += "#" + object.attr("id");
		} else {
			selector += "#" + object.parent().attr("id");
		}
		selectBoxObject = $(selector + " .select-box");
		return selectBoxObject;
	};

	Utilities.prototype.addClickToHiddenGeotaggedMediaPhrase = function() {
		// if ($(".hidden-geotagged-media").is(":visible")) {
		$(".hidden-geotagged-media").off("click").on(
			"click",
			function() {
				$("#hide-geotagged-media").click();
			}
		);
		// }
	};

	Utilities.removeHighligths = function() {
		if (Utilities.isPopup()) {
			$("#popup-images-wrapper .highlighted").removeClass("highlighted");
		} else {
			$("#thumbs .highlighted").removeClass("highlighted");
			$("#subalbums .highlighted").removeClass("highlighted");
		}
	};

	Utilities.removeHighligthsToItems = function() {
		if (! $(".search").hasClass("hidden-by-menu-selection"))
			$("#right-menu .search.highlighted, #right-menu .search .highlighted").removeClass("highlighted");
		else
			$("#right-menu .first-level.highlighted, #right-menu .first-level .highlighted").removeClass("highlighted");
	};

	Utilities.prototype.prevItemForHighlighting = function(object) {
		var isSearchMother = object.hasClass("search");
		var isFirstLevel = object.hasClass("first-level");
		if (isSearchMother) {
			return object.children("ul").children(".active:not(.hidden)").last();
		} else if (isFirstLevel) {
			let prevFirstLevelObject = object.prevAll(".first-level.active:not(.hidden)").first();
			if (! prevFirstLevelObject.length)
				prevFirstLevelObject = object.nextAll(".first-level.active:not(.hidden)").last();

			if (
				prevFirstLevelObject.hasClass("expandable") &&
				prevFirstLevelObject.hasClass("expanded")  &&
				prevFirstLevelObject.children("ul").children(".active:not(.hidden)").length
			) {
				// go to the last child of the previous first level menu item
				return prevFirstLevelObject.children("ul").children(".active:not(.hidden)").last();
			} else {
				// go to the previous first-level menu entry
				return prevFirstLevelObject;
			}
		} else if (! object.prevAll(".active:not(.hidden)").length) {
			// go to its first-level menu entry
			return object.parent().parent();
		} else {
			// go to the previous second-level menu entry
			return object.prevAll(".active:not(.hidden)").first();
		}
	};

	Utilities.prototype.nextItemForHighlighting = function(object) {
		var isSearchMother = object.hasClass("search");
		var isFirstLevel = isSearchMother || object.hasClass("first-level");
		if (isFirstLevel) {
			if (
				! isSearchMother &&
				! object.hasClass("expandable") ||
				object.hasClass("expandable") && ! object.hasClass("expanded") ||
				object.hasClass("expandable") && object.hasClass("expanded") && ! object.children("ul").children(".active:not(.hidden)").length
			) {
				// go to the next first-level menu entry
				let nextFirstLevelObject = object.nextAll(".first-level.active:not(.hidden)").first();
				if (nextFirstLevelObject.length)
					return nextFirstLevelObject;
				else
					return object.siblings(".first-level:not(.hidden)").first();
			} else if (isSearchMother || object.hasClass("expandable") && object.hasClass("expanded")) {
				// go to its first child
				return object.children("ul").children(".active:not(.hidden)").first();
			}
		}

		var isSearchChild = object.parent().parent().hasClass("search");
		if (isSearchChild && ! object.nextAll(".active:not(.hidden)").length) {
			return object.parent().parent();
		} else if (! isSearchChild && ! object.nextAll(".active:not(.hidden)").length) {
			// go to the next first-level menu entry
			let nextFirstLevelObject = object.parent().parent().nextAll(".first-level.active:not(.hidden)").first();
			if (nextFirstLevelObject.length)
				return nextFirstLevelObject;
			else
				return object.parent().parent().siblings(".first-level.active:not(.hidden)").first();
		} else {
			return object.nextAll(".active:not(.hidden)").first();
		}
	};

	Utilities.addHighlight = function(object) {
		Utilities.removeHighligths();
		object.addClass("highlighted");
	};

	Utilities.prototype.addHighlightToItem = function(object) {
		if(object.attr("id") !== "menu-icon" && object.attr("id") !== "search-icon")
			Utilities.removeHighligthsToItems();
		if (object.attr("id") === "save-data") {
			object.parent().addClass("highlighted");
		} else {
			object.addClass("highlighted");
		}
	};

	Utilities.prototype.highlightedItemObject = function() {
		if (! $(".search").hasClass("hidden-by-menu-selection"))
			return $("#right-menu .search.highlighted, #right-menu .search .highlighted");
		else
			return $("#right-menu .first-level.highlighted, #right-menu .first-level .highlighted");
	};

	Utilities.highlightedObject = function(inThumbs = false) {
		if (Utilities.isPopup() && ! inThumbs) {
			return $("#popup-images-wrapper .highlighted");
		} else {
			return $("#album-and-media-container .highlighted");
		}
	};

	Utilities.objectIsASubalbum = function(object) {
		return object.hasClass("album-button-and-caption");
	};

	Utilities.objectIsASingleMedia = function(object) {
		return object.hasClass("thumb-and-caption-container");
	};

	Utilities.aSubalbumIsHighlighted = function() {
		return $("#subalbums .highlighted").length > 0;
	};

	Utilities.aSingleMediaIsHighlighted = function() {
		return $("#thumbs .highlighted").length > 0;
	};

	Utilities.scrollToHighlightedSubalbum = function(object = null) {
		var numVisibleSubalbums = env.currentAlbum.subalbums.length;
		var filter = "*";
		if (Utilities.onlyShowNonGeotaggedContent()) {
			numVisibleSubalbums = $("#subalbums > a:not(.all-gps)").length;
			filter = ":not(.all-gps)";
		}

		if (! Utilities.isPopup() && $("#subalbums").is(":visible") && numVisibleSubalbums) {
			let subalbumObject;
			if (object)
				subalbumObject = object;
			else if (env.previousAlbum !== null && env.previousAlbum.cacheBase.indexOf(env.currentAlbum.cacheBase) === 0)
				subalbumObject = $("#" + env.previousAlbum.cacheBase);
			else
				subalbumObject = $("#subalbums").children(filter).first().children();
			if (subalbumObject !== undefined && subalbumObject.length) {
				$("html, body").stop().animate(
					{
						scrollTop: subalbumObject.offset().top + subalbumObject.height() / 2 - env.windowHeight / 2
					},
					"fast"
				);
				Utilities.addHighlight(subalbumObject);
			}
		}
	};

	Utilities.scrollAlbumViewToHighlightedThumb = function(object = null) {
		var numVisibleMedia = env.currentAlbum.subalbums.length;
		var filter = "*";
		if (Utilities.onlyShowNonGeotaggedContent()) {
			numVisibleMedia = $("#thumbs > a:not(.gps)").length;
			filter = ":not(.gps)";
		}
		if ($("#thumbs").is(":visible")) {
			let thumbObject;
			if (object)
				thumbObject = object.children(".thumb-container").children(".thumbnail");
			else if (env.previousMedia !== null)
				thumbObject = $("#" + env.previousMedia.foldersCacheBase + "--" + env.previousMedia.cacheBase);

			let scrollableObject = $("html, body");

			if (! object && env.previousMedia == null && env.currentAlbum.subalbums.length === 0) {
				if ($("#thumbs .highlighted").length)
					thumbObject = $("#thumbs .highlighted").children(".thumb-container").children(".thumbnail");
				else
					thumbObject = $("#thumbs img.thumbnail").filter(filter).first();
			}

			if (thumbObject !== undefined && thumbObject.length) {
				let offset;
				offset = thumbObject.offset().top - scrollableObject.offset().top + thumbObject.height() / 2 - env.windowHeight / 2;
				if (offset < 0)
					offset = 0;
				// scrollableObject.scrollTop(offset);
				scrollableObject.stop().animate(
					{
						scrollTop: offset
					},
					"fast"
				);
				if (object)
					Utilities.addHighlight(object);
				else
					Utilities.addHighlight(thumbObject.parent().parent());
			}
		}
	};

	Utilities.scrollPopupToHighlightedThumb = function(object = null) {
		let thumbObject;
		if (object)
			thumbObject = object.children(".thumb-container").children(".thumbnail");

		let scrollableObject = $("#popup-images-wrapper");
		let popupHeight = scrollableObject.height();

		if (! object) {
			if ($("#popup-images-wrapper .highlighted").length)
				thumbObject = $("#popup-images-wrapper .highlighted").children(".thumb-container").children(".thumbnail");
			else
				thumbObject = $("#popup-images-wrapper img.thumbnail").first();

			if (thumbObject[0] === undefined)
				return;
		}

		let offset;
		offset = scrollableObject.scrollTop() + thumbObject.offset().top - scrollableObject.offset().top + thumbObject.height() / 2 - popupHeight / 2;
		if (offset < 0)
			offset = 0;
		// scrollableObject.scrollTop(offset);
		scrollableObject.stop().animate(
			{
				scrollTop: offset
			},
			"fast"
		);
		if (object)
			Utilities.addHighlight(object);
		else
			Utilities.addHighlight(thumbObject.parent().parent());
	};

	Utilities.scrollBottomMediaToHighlightedThumb = function(callback) {
		if (! Utilities.isPopup() && $("#thumbs").is(":visible") && env.currentMedia !== null) {
			let thumbObject = $("#" + env.currentMedia.foldersCacheBase + "--" + env.currentMedia.cacheBase);
			if (thumbObject[0] !== undefined && ! env.currentAlbum.isAlbumWithOneMedia()) {
				let scroller = $("#album-view");
				scroller.stop().animate(
					{
						scrollLeft: thumbObject.parent().position().left + scroller.scrollLeft() - scroller.width() / 2 + thumbObject.width() / 2
					},
					"fast",
					callback
				);
				$(".thumb-container").removeClass("current-thumb");
				thumbObject.parent().addClass("current-thumb");
			}
		}
	};

	Utilities.socialButtons = function() {
		var hash, myShareUrl = "";
		var mediaParameter, mediaWidth, mediaHeight, widthParameter, heightParameter;
		var myShareText, myShareTextAdd;

		if (false && ! env.isMobile.any()) {
			$(".ssk-whatsapp").hide();
		} else {
			// with touchscreens luminosity on hover cannot be used
			$(".album-button-and-caption").css("opacity", 1);
			$(".thumb-container").css("opacity", 1);
			$(".album-button-random-media-link").css("opacity", 1);
		}

		var urlWithoutHash = location.href.split("#")[0];

		// image size for sharing must be > 200 and ~ 1200x630, https://kaydee.net/blog/open-graph-image/
		var reducedSizesIndex;
		if (! env.options.reduced_sizes.length || Math.max(... env.options.reduced_sizes) < 200)
			// false means original image: it won't be used
			reducedSizesIndex = false;
		else {
			// use the size nearest to optimal
			let optimalSize = 1200;
			let absoluteDifferences = env.options.reduced_sizes.map(size => Math.abs(size - optimalSize));
			let minimumDifference = Math.min(... absoluteDifferences);
			reducedSizesIndex = absoluteDifferences.findIndex(size => size === minimumDifference);
		}

		var logo = "img/myphotoshareLogo.jpg";
		var logoSize = 1024;
		var whatsAppParameter = "";

		if (
			env.currentMedia === null ||
			! env.options.reduced_sizes.length ||
			reducedSizesIndex === false
		) {
			// use the album composite image, if it exists; otherwise, use MyPhotoShare logo
			if (env.currentAlbum.hasOwnProperty("compositeImageSize")) {
				mediaParameter = Utilities.pathJoin([
					"cache",
					env.options.cache_album_subdir,
					// always use jpg image for sharing
					env.currentAlbum.cacheBase + ".jpg"
					]);
				widthParameter = env.currentAlbum.compositeImageSize;
				heightParameter = env.currentAlbum.compositeImageSize;
			} else {
				mediaParameter = logo;
				widthParameter = logoSize;
				heightParameter = logoSize;
			}
		} else {
			// current media !== null
			if (env.currentMedia.hasOwnProperty("protected")) {
				mediaParameter = logo;
				widthParameter = logoSize;
				heightParameter = logoSize;
			} else {
				let prefix = Utilities.removeFolderString(env.currentMedia.foldersCacheBase);
				if (prefix)
					prefix += env.options.cache_folder_separator;

				if (env.currentMedia && env.currentMedia.isVideo()) {
					mediaParameter = Utilities.pathJoin([
						"cache",
						env.currentMedia.cacheSubdir,
						// always use jpg image for sharing
						prefix + env.currentMedia.cacheBase + env.options.cache_folder_separator + env.currentMedia.imageSize + ".jpg"
					]);
					widthParameter = env.currentMedia.metadata.size[0];
					heightParameter = env.currentMedia.metadata.size[1];
				} else if (env.currentMedia && env.currentMedia.isImage()) {
					mediaWidth = env.currentMedia.metadata.size[0];
					mediaHeight = env.currentMedia.metadata.size[1];

					mediaParameter = Utilities.pathJoin([
						"cache",
						env.currentMedia.cacheSubdir,
						// always use jpg image for sharing
						prefix + env.currentMedia.cacheBase + env.options.cache_folder_separator + env.options.reduced_sizes[reducedSizesIndex] + ".jpg"
					]);
					whatsAppParameter = Utilities.pathJoin([
						"cache",
						env.currentMedia.cacheSubdir,
						// always use jpg image for sharing
						prefix + env.currentMedia.cacheBase + env.options.cache_folder_separator + env.options.media_thumb_size + "ts.jpg"
					]);

					if (mediaWidth > mediaHeight) {
						widthParameter = env.options.reduced_sizes[reducedSizesIndex];
						heightParameter = Math.round(env.options.reduced_sizes[reducedSizesIndex] * mediaHeight / mediaWidth);
					} else {
						heightParameter = env.options.reduced_sizes[reducedSizesIndex];
						widthParameter = Math.round(env.options.reduced_sizes[reducedSizesIndex] * mediaWidth / mediaHeight);
					}
				}
			}
		}

		myShareText = env.options.page_title;
		myShareTextAdd = env.currentAlbum.physicalPath;
		if (myShareTextAdd)
			myShareText += " : " + myShareTextAdd;
		if (env.currentMedia !== null)
			myShareText += "/" + env.currentMedia.name;

		myShareUrl = urlWithoutHash;
		// the following line is needed in order to bypass the browser (?) cache;
		// without the random number the php code isn't executed
		myShareUrl += '?random=' + Math.floor(Math.random() * 10000000);
		myShareUrl += '&w=' + widthParameter;
		myShareUrl += '&h=' + heightParameter;
		myShareUrl += '&url=' + encodeURIComponent(urlWithoutHash);
		myShareUrl += '&title=' + encodeURIComponent(myShareText);
		if (env.currentMedia !== null && env.currentMedia.metadata.hasOwnProperty("title") && env.currentMedia.metadata.title)
			myShareUrl += '&desc=' + encodeURIComponent(env.currentMedia.metadata.title);
		else if (env.currentMedia === null && env.currentAlbum.hasOwnProperty("title") && env.currentAlbum.title)
			myShareUrl += '&desc=' + encodeURIComponent(env.currentAlbum.title);
		hash = location.hash;
		if (hash) {
			myShareUrl += '&hash=' + encodeURIComponent(hash.substring(1));
		}
		var whatsAppUrl = myShareUrl;
		myShareUrl += '&m=' + encodeURIComponent(mediaParameter);
		if (whatsAppParameter)
			whatsAppUrl += '&m=' + encodeURIComponent(whatsAppParameter);
		else
			whatsAppUrl = myShareUrl;
		if (hash) {
			myShareUrl += hash;
			whatsAppUrl += hash;
		}

		jQuery.removeData(".ssk");
		$('.ssk').attr('data-text', myShareText);
		$('.ssk-facebook').attr('data-url', myShareUrl);
		$('.ssk-whatsapp').attr('data-url', whatsAppUrl);
		$('.ssk-twitter').attr('data-url', myShareUrl);
		$('.ssk-google-plus').attr('data-url', myShareUrl);
		$('.ssk-email').attr('data-url', location.href);

		// initialize social buttons (http://socialsharekit.com/)
		SocialShareKit.init({
		});
		if (! Modernizr.flexbox && Utilities.bottomSocialButtons()) {
			var numSocial = 5;
			var socialWidth = Math.floor(window.innerWidth / numSocial);
			$('.ssk').width(socialWidth * 2 + "px");
		}
	};

	Utilities.addClickToPopupPhoto = function(element) {
		element.parent().parent().off("click").on(
			"click",
			function(ev) {
				$("#album-and-media-container").addClass("show-media");
				ev.stopPropagation();
				ev.preventDefault();
				var imgData = JSON.parse(element.attr("data"));
				// called after an element was successfully handled
				env.highlightedObjectId = null;
				if (Utilities.isShiftOrControl())
					$(".shift-or-control .leaflet-popup-close-button")[0].click();
				$(".media-popup .leaflet-popup-close-button")[0].click();
				// $('#popup #popup-content').html("");
				$('.modal-close')[0].click();
				env.popupRefreshType = "previousAlbum";
				env.mapRefreshType = "none";
				window.location.href = imgData.mediaHash;
			}
		);
		if (typeof isPhp === "function") {
			// execution enters here if we are using index.php
			element.parent().parent().off("auxclick").on(
				"auxclick",
				function (ev) {
					if (ev.which === 2) {
						var imgData = JSON.parse(element.attr("data"));
						Utilities.openInNewTab(imgData.mediaHash);
						return false;
					}
				}
			);
		}

		var mediaBoxSelectElement = element.siblings('a');
		var id = mediaBoxSelectElement.attr("id");
		mediaBoxSelectElement.off("click").on(
			"click",
			{id: id},
			function(ev) {
				ev.stopPropagation();
				ev.preventDefault();
				var imgData = JSON.parse(element.attr("data"));
				var cachedAlbum = env.cache.getAlbum(imgData.albumCacheBase);
				var name = imgData.mediaHash.split('/').pop();
				var matchedMedia = cachedAlbum.media.find(singleMedia => name === singleMedia.cacheBase);
				var promise = PhotoFloat.getAlbum(matchedMedia.foldersCacheBase, null, {getMedia: true, getPositions: ! env.options.save_data});
				promise.then(
					function(foldersAlbum) {
						matchedMedia.toggleSelectedStatus(foldersAlbum, '#' + id);
					}
				);
			}
		);
	};

	Utilities.prototype.addMediaLazyLoader = function() {
		var threshold = env.options.media_thumb_size;
		if (env.options.save_data)
			threshold = 0;
		$(
			function() {
				$("img.lazyload-popup-media").Lazy(
					{
						afterLoad: Utilities.addClickToPopupPhoto,
						autoDestroy: true,
						onError: function(element) {
							console.log(element[0]);
						},
						chainable: false,
						threshold: threshold,
						removeAttribute: true,
						appendScroll: $('#popup-images-wrapper')
					}
				);
			}
		);
		$(
			function() {
				$("#album-and-media-container:not(.show-media) #thumbs img.lazyload-media").Lazy(
					{
						threshold: threshold,
						appendScroll: $(window)
					}
				);
			}
		);
		$(
			function() {
				$("#album-and-media-container.show-media #thumbs img.lazyload-media").Lazy(
					{
						threshold: threshold,
						appendScroll: $("#album-view")
					}
				);
			}
		);
	};

	Utilities.prototype.getMediaFromImgObject = function(object) {
		var splittedSrc = object.attr("src").split("/")[2].split(env.options.cache_folder_separator);
		var randomMediaAlbumCacheBase;
		if (splittedSrc.length === 2) {
			randomMediaAlbumCacheBase = env.options.folders_string;
		} else {
			randomMediaAlbumCacheBase = splittedSrc.slice(0, -2).join(env.options.cache_folder_separator);
			if (
				[
					env.options.by_date_string,
					env.options.by_gps_string,
					env.options.by_search_string,
					env.options.by_map_string,
					env.options.by_selection_string
				].indexOf(splittedSrc[0]) === -1
			)
				randomMediaAlbumCacheBase = env.options.folders_string + env.options.cache_folder_separator + randomMediaAlbumCacheBase;
		}
		var randomMediaCacheBase = splittedSrc[splittedSrc.length - 2];
		var randomMedia = env.cache.getMedia(randomMediaAlbumCacheBase, randomMediaCacheBase);
		return [randomMedia, randomMediaAlbumCacheBase];
	};

	Utilities.dateElementForFolderName = function(folderArray, index) {
		if (index === 1 || index === 3)
			return parseInt(folderArray[index]);
		else if (index === 2)
			return Utilities._t("#month-" + folderArray[index]);
	};

	Utilities.addSpanToFirstAndSecondLine = function(firstLine, secondLine) {
		var result = [], index = 0;
		if (firstLine) {
			result[index] = "<span class='first-line'>" + firstLine + "</span>";
			index ++;
		}
		if (secondLine)
			result[index] = "<span class='second-line'>" + secondLine + "</span>";
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

	Utilities.prototype.generateAlbumCaptionsForCollections = function(album) {
		var raquo = " <span class='gray'>&raquo;</span> ";
		var folderArray = album.cacheBase.split(env.options.cache_folder_separator);

		var firstLine;
		if (album.isByDate()) {
			firstLine = Utilities.dateElementForFolderName(folderArray, folderArray.length - 1);
		} else if (album.isByGps()) {
			if (album.name === '')
				firstLine = Utilities._t('.not-specified');
			else if (album.hasOwnProperty('altName'))
				firstLine = Utilities.transformAltPlaceName(album.altName);
			else
				firstLine = album.nameForShowing(null, true, true);
		} else {
			firstLine = album.nameForShowing(null, true, true);
		}

		var secondLine = '';
		if (album.isByDate()) {
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
		} else if (album.cacheBase === env.options.folders_string) {
			secondLine += "<span class='gray'>(" + Utilities._t("#root-album") + ")</span>";
		} else {
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
		var captionsForCollection = Utilities.addSpanToFirstAndSecondLine(firstLine, secondLine);
		var captionForCollectionSorting = Utilities.convertByDateAncestorNames(album.ancestorsNames).slice(1).reverse().join(env.options.cache_folder_separator).replace(/^0+/, '');
		return [captionsForCollection, captionForCollectionSorting];
	};

	Utilities.prototype.generateSingleMediaCaptionsForCollections = function(singleMedia, album) {
		var raquo = " <span class='gray'>&raquo;</span> ";
		var folderArray = album.cacheBase.split(env.options.cache_folder_separator);

		var secondLine = '';
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
				secondLine += "<a href='" + env.hashBeginning + album.ancestorsCacheBase[3] + "'>" + Utilities.dateElementForFolderName(folderArray, 3) + "</a>" + " ";
			if (folderArray.length > 2)
				secondLine += "<a href='" + env.hashBeginning + album.ancestorsCacheBase[2] + "'>" + Utilities.dateElementForFolderName(folderArray, 2) + "</a>" + " ";
			if (folderArray.length > 1)
				secondLine += "<a href='" + env.hashBeginning + album.ancestorsCacheBase[1] + "'>" + Utilities.dateElementForFolderName(folderArray, 1) + "</a>";
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
		// } else if (album.cacheBase === env.options.folders_string) {
		// 	secondLine += "<span class='gray'>(" + Utilities._t("#root-album") + ")</span>";
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

		var [nameForShowing, titleForShowing] = singleMedia.nameAndTitleForShowing(true, true);
		var captionsForCollection = Utilities.addSpanToFirstAndSecondLine(nameForShowing, secondLine);
		var captionForCollectionSorting = nameForShowing + env.options.cache_folder_separator + Utilities.convertByDateAncestorNames(album.ancestorsNames).slice(1).reverse().join(env.options.cache_folder_separator).replace(/^0+/, '');
		return [captionsForCollection, captionForCollectionSorting, titleForShowing];
	};

	Utilities.prototype.nameForShowing = function(albumOrSubalbum, parentAlbum, html, br) {
		var folderName = '';
		if (albumOrSubalbum.cacheBase === env.options.by_date_string) {
			folderName = "(" + Utilities._t("#by-date") + ")";
		} else if (albumOrSubalbum.cacheBase === env.options.by_gps_string) {
			folderName = "(" + Utilities._t("#by-gps") + ")";
		} else if (parentAlbum && parentAlbum.isByDate() || albumOrSubalbum.isByDate()) {
			let folderArray = albumOrSubalbum.cacheBase.split(env.options.cache_folder_separator);
			if (folderArray.length === 2) {
				folderName += parseInt(folderArray[1]);
			} else if (folderArray.length === 3)
				folderName += " " + Utilities._t("#month-" + folderArray[2]);
			else if (folderArray.length === 4)
				folderName += Utilities._t("#day") + " " + parseInt(folderArray[3]);
		} else if (parentAlbum && parentAlbum.isByGps() || albumOrSubalbum.isByGps()) {
			if (albumOrSubalbum.name === '')
				folderName = Utilities._t('.not-specified');
			else if (albumOrSubalbum.hasOwnProperty('altName'))
				folderName = Utilities.transformAltPlaceName(albumOrSubalbum.altName);
			else
				folderName = albumOrSubalbum.name;
		} else if (albumOrSubalbum.hasOwnProperty("title") && albumOrSubalbum.title && albumOrSubalbum.title !== albumOrSubalbum.name) {
			folderName = albumOrSubalbum.title;
			if (! br) {
				// remove the tags fronm the title
				folderName = folderName.replace(/<[^>]*>?/gm, ' ');
			}

			if (albumOrSubalbum.name) {
				if (html && br)
					folderName += env.br + "<span class='real-name'>[" + albumOrSubalbum.name + "]</span>";
				else if (html)
					folderName += " <span class='real-name'>[" + albumOrSubalbum.name + "]</span>";
				else
					folderName += " [" + albumOrSubalbum.name + "]";
			}
		} else {
			folderName = albumOrSubalbum.name;
		}

		return folderName;
	};

	Utilities.setPinchButtonsPosition = function(containerHeight, containerWidth) {
		// calculate and set pinch buttons position

		var mediaElement = $(".media-box#center .media-box-inner img");
		var actualHeight = mediaElement.height();
		var actualWidth = mediaElement.width();
		var titleHeight, thumbsHeight;
		if ($(".media-box#center .title").is(":visible"))
			titleHeight = $(".media-box#center .title").height();
		else
			titleHeight = 0;
		if ($("#thumbs").is(":visible"))
			thumbsHeight = $("#thumbs").height();
		else
			thumbsHeight = 0;
		var distanceFromImageBorder = 15;
		// if (containerHeight === undefined) {
		containerHeight = env.windowHeight - titleHeight - thumbsHeight;
		containerWidth = env.windowWidth;
		// }
		var pinchTop = Math.round(titleHeight + (containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		// var pinchTop = Math.round((containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		var pinchRight = Math.round((containerWidth - actualWidth) / 2 + distanceFromImageBorder);
		$("#pinch-container").css("right", pinchRight.toString() + "px").css("top", pinchTop.toString() + "px");
	};

	Utilities.setPinchButtonsVisibility = function() {
		$("#pinch-container").removeClass("hidden");

		if (! env.currentMedia || env.currentMedia.isVideo()) {
			$("#pinch-container").hide();
		} else {
			$("#pinch-container").show();

			$("#pinch-in").off("click");
			$("#pinch-in").off("click").on(
				"click",
				function(ev) {
					PinchSwipe.pinchIn(null, null);
				}
			);
			$("#pinch-in").removeClass("disabled");

			$("#pinch-out").off("click");
			if (env.currentZoom === env.initialZoom && ! $("#center .title").hasClass("hidden-by-pinch")) {
				$("#pinch-out").addClass("disabled");
			} else {
				$("#pinch-out").off("click").on(
					"click",
					function(ev) {
						PinchSwipe.pinchOut(null, null);
					}
				);
				$("#pinch-out").removeClass("disabled");
			}
		}
	};

	Utilities.prototype.horizontalScrollBarThickness = function(element) {
		var thickness = element.offsetHeight - element.clientHeight;
		if (! thickness && env.currentAlbum.hasOwnProperty("media")) {
			// sometimes thickness is 0, but the scroll bar could be there
			// let's try to suppose if it's there
			let totalThumbsSize = env.options.media_thumb_size * env.currentAlbum.media.length;
			if (env.options.media_thumb_type.indexOf("fixed_height") > -1) {
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
		var titleHeight = 0, thumbsHeight = 0;
		if ($(".media-box#center .title").is(":visible"))
			titleHeight = $(".media-box#center .title").height();
		if ($("#thumbs").is(":visible"))
			thumbsHeight = Math.max($("#thumbs").height(), parseInt($("#thumbs").css("height")));
		var distanceFromImageBorder = 15;
		containerHeight = env.windowHeight - titleHeight - thumbsHeight;
		containerWidth = env.windowWidth;
		// }
		var bottom = Math.round(thumbsHeight + (containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		var left = Math.round((containerWidth - actualWidth) / 2 + distanceFromImageBorder);
		$("#media-select-box .select-box").css("left", "");
		$("#media-select-box .select-box").css("left", left.toString() + "px").css("bottom", bottom.toString() + "px");

		return true;
	};

	Utilities.correctElementPositions = function() {
		function MoveMediaBarAboveBottomSocial() {
			if (env.currentMedia !== null && Utilities.bottomSocialButtons() && Utilities.areColliding($(".media-box#center .media-bar"), $("#social > div"))) {
				// move the media bar above the social buttons
				$(".media-box#center .media-bar").css("bottom", ($("#social > div").outerHeight()) + "px");
			}
		}

		function separateLateralSocialAndPrev() {
			if (env.currentMedia !== null && ! env.currentAlbum.isAlbumWithOneMedia() && Utilities.lateralSocialButtons() && Utilities.areColliding($("#social > div"), $("#prev"))) {
				if (parseFloat($("#prev").css("bottom")) > $("#social > div").outerHeight()) {
					// move social buttons below prev button
					$("#social > div").removeClass("ssk-center").css("top", (parseFloat($("#prev").css("top")) + $("#prev").outerHeight()) + "px" );
				} else {
					// move social buttons to the right of prev button
					$("#social > div").css("left", ($("#prev").outerWidth(true)) + "px");
				}
			}
		}

		function moveSelectBoxAboveBottomSocial() {
			// move the select box above the social buttons and the media bar
			if (env.currentMedia !== null && Utilities.bottomSocialButtons() && Utilities.areColliding($("#media-select-box .select-box"), $("#social > div"))) {
				$("#media-select-box .select-box").css("bottom", ($("#social > div").outerHeight() + 10) + "px");
			}
		}

		function moveSelectBoxAboveMediaBar() {
			if (env.currentMedia !== null && Utilities.areColliding($("#media-select-box .select-box"), $(".media-box#center .media-bar .links"))) {
				$("#media-select-box .select-box").css("bottom", (env.windowHeight - $(".media-box#center .media-bar .links").offset().top + 10).toString() + "px");
			}
		}

		function moveSelectBoxAtTheRightOfPrev() {
			// move the select box at the right of the prev button and lateral social buttons
			if (env.currentMedia !== null && ! env.currentAlbum.isAlbumWithOneMedia() && Utilities.areColliding($("#media-select-box .select-box"), $("#prev"))) {
				$("#media-select-box .select-box").css("left", ($("#prev").outerWidth(true) + 20) + "px");
			}
		}

		function moveSelectBoxAtTheRightOfLateralSocial() {
			if (env.currentMedia !== null && Utilities.lateralSocialButtons() && Utilities.areColliding($("#media-select-box .select-box"), $("#social > div"))) {
				$("#media-select-box .select-box").css("left", ($("#social > div").outerWidth(true) + 20) + "px");
			}
		}

		function movePinchAtTheLeftOfNext() {
			// correct pinch buttons position
			if (env.currentMedia !== null && ! env.currentAlbum.isAlbumWithOneMedia() && Utilities.areColliding($("#pinch-container"), $("#next"))) {
				$("#pinch-container").css("right", ($("#prev").outerWidth(true) + 20) + "px");
			}
		}

		function moveDescriptionAtTheLeftOfNext() {
			// correct description/tags box position
			if (env.currentMedia !== null && ! env.currentAlbum.isAlbumWithOneMedia() && Utilities.areColliding($("#description-wrapper"), $("#next"))) {
				$("#description-wrapper").css("right", ($("#next").outerWidth(true) + 10) + "px");
			}
		}

		function moveDescriptionAboveBottomSocial() {
			if (Utilities.bottomSocialButtons() && Utilities.areColliding($("#description-wrapper"), $("#social > div"))) {
				// move the descriptiont/tags box above the social buttons
				$("#description-wrapper").css("bottom", ($("#social > div").outerHeight() + 10) + "px");
			}
		}

		function MoveDescriptionAboveMediaBar() {
			if (env.currentMedia !== null && Utilities.areColliding($("#description-wrapper"), $(".media-box#center .media-bar .links"))) {
				// move the descriptiont/tags box above the media bar
				let thumbsHeight = 0;
				if ($("#thumbs").is(":visible"))
					thumbsHeight = $("#thumbs").outerHeight();
				$("#description-wrapper").css("bottom", (env.windowHeight - $(".media-box#center .media-bar .links").offset().top + 10).toString() + "px");
			}
		}

		function moveDescriptionAtTheLeftOfPinch() {
			if (env.currentMedia !== null && Utilities.areColliding($("#description-wrapper"), $("#pinch-container"))) {
				// move the descriptiont/tags box to the left of the pinch buttons
				$("#description-wrapper").css("right", (parseFloat($("#pinch-container").css("right")) + $("#pinch-container").outerWidth(true) + 10) + "px");
			}
		}

		$("#social > div").removeClass("ssk-bottom").addClass("ssk-center");
		$("#social > div").css("left", "").css("top", "");
		Utilities.socialButtons();

		var mediaBarHeigth = parseFloat($(".media-box#center .media-bar").outerHeight());
		if (! mediaBarHeigth)
			mediaBarHeigth = 30;
		$(".media-box#center .media-bar").css("bottom", "");

		MoveMediaBarAboveBottomSocial();
		separateLateralSocialAndPrev();
		moveSelectBoxAboveBottomSocial();
		moveSelectBoxAboveMediaBar();
		moveSelectBoxAtTheRightOfPrev();
		moveSelectBoxAtTheRightOfLateralSocial();
		movePinchAtTheLeftOfNext();
		moveDescriptionAtTheLeftOfNext();
		moveDescriptionAtTheLeftOfPinch();
		moveDescriptionAboveBottomSocial();
		MoveDescriptionAboveMediaBar();
		moveDescriptionAtTheLeftOfNext();
		moveDescriptionAtTheLeftOfPinch();
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

	Utilities.areColliding = function(jQueryObject1, jQueryObject2) {
		function isInside(corner, square) {
			return square[0] <= corner[0] && corner[0] <= square[2] && square[1] <= corner[1] && corner[1] <= square[3];
		}

		if (! jQueryObject1.is(":visible") || ! jQueryObject2.is(":visible"))
			return false;
		var offset1 = jQueryObject1.offset();
		var top1 = offset1.top;
		var left1 = offset1.left;
		var height1 = jQueryObject1.outerHeight(true);
		var width1 = jQueryObject1.outerWidth(true);
		var bottom1 = offset1.top + height1;
		var right1 = offset1.left + width1;

		// Div 2 data
		var offset2 = jQueryObject2.offset();
		var top2 = offset2.top;
		var left2 = offset2.left;
		var height2 = jQueryObject2.outerHeight(true);
		var width2 = jQueryObject2.outerWidth(true);
		var bottom2 = offset2.top + height2;
		var right2 = offset2.left + width2;

		var corners1 = [[top1, left1], [top1, right1], [bottom1, left1], [bottom1, right1]];
		var corners2 = [[top2, left2], [top2, right2], [bottom2, left2], [bottom2, right2]];
		var square1 = [top1, left1, bottom1, right1];
		var square2 = [top2, left2, bottom2, right2];

		var colliding = corners1.some(corner => isInside(corner, square2)) || corners2.some(corner => isInside(corner, square1));

		return colliding;
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
			$("#media-view").off('mouseover').on(
				'mouseover',
				function() {
					$(".media-box .links").stop().fadeTo("slow", 0.50).css("display", "inline");
				}
			);
			$("#media-view").off('mouseout').on(
				'mouseout',
				function() {
					$(".media-box .links").stop().fadeOut("slow");
				}
			);
		}
	};

	Utilities.prototype.setNextPrevVisibility = function() {
		if (env.currentMedia === null || env.currentAlbum.isAlbumWithOneMedia())
			$("#next, #prev").hide();
		else
			$("#next, #prev").show();
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

	Utilities.formatDescription = function(text) {
		// Replace CRLF by <p> and remove all useless <br>.
		text = text.replace(/<(\/?\w+)>\s*\n\s*<(\/?\w+)>/g, "<$1><$2>");
		text = text.replace(/\n/g, "</p><p>");
		if (text.substring(0, 3) !== "<p ")
			text = "<p>" + text + "</p>";
		return text;
	};

	Utilities.adaptSubalbumCaptionHeight = function() {
		// check for overflow in album-caption class in order to adapt album caption height to the string length
		// when diving into search subalbum, the whole album path is showed and it can be lengthy
		var maxHeight = 0;
		var top = false;
		var objects = [];
		var counter = 0;
		var length = $('.album-caption').length;
		$('.album-caption').each(
			function() {
				counter ++;
				var newTop = $(this).parent().offset().top;
				if (top !== false && newTop != top) {
					// adapt!
					objects.forEach(
						function(object) {
							// object.css("height", maxHeight + 'px');
							var difference = maxHeight - parseFloat(object.css("height"));
							object.parent().css("height", (object.parent().height() + difference) + 'px');
							object.css("height", maxHeight + 'px');
						}
					);
					// newTop value must be recalculated
					newTop = $(this).parent().offset().top;
					maxHeight = 0;
					objects = [];
				}
				top = newTop;
				objects.push($(this));
				var thisHeight = $(this)[0].scrollHeight;
				maxHeight = (thisHeight > maxHeight) ? thisHeight : maxHeight;

				// one ore adaptation is needed for the last line
				if (counter === length) {
					// adapt!
					objects.forEach(
						function(object) {
							// object.css("height", maxHeight + 'px');
							var difference = maxHeight - parseFloat(object.css("height"));
							object.parent().css("height", (object.parent().height() + difference) + 'px');
							object.css("height", maxHeight + 'px');
						}
					);
				}
			}
		);
		// var difference = maxHeight - parseFloat($(".album-caption").css("height"));
		// $(".album-button-and-caption").css("height", ($(".album-button-and-caption").height() + difference) + 'px');
		// $(".album-caption").css("height", maxHeight + 'px');
	};

	Utilities.adaptMediaCaptionHeight = function(inPopup) {
		// check for overflow in media-caption class in order to adapt media caption height to the string length
		var baseSelector = "#thumbs";
		if (inPopup)
			baseSelector = "#popup-images-wrapper";
		var maxHeight = 0;
		var top = false;
		var objects = [];
		var counter = 0;
		var length = $(baseSelector + " .media-caption").length;
		$(baseSelector + " .media-caption").css("height", 0);
		$(baseSelector + " .media-caption").each(
			function() {
				counter ++;
				var newTop = $(this).offset().top;
				if (top !== false && newTop !== top) {
					// adapt!
					objects.forEach(
						function(object) {
							object.css("height", maxHeight + 'px');
						}
					);
					// newTop value must be recalculated
					newTop = $(this).offset().top;
					maxHeight = 0;
					objects = [];
				}
				top = newTop;
				objects.push($(this));
				var thisHeight = $(this)[0].scrollHeight;
				maxHeight = (thisHeight > maxHeight) ? thisHeight : maxHeight;

				// one ore adaptation is needed for the last line
				if (counter === length) {
					// adapt!
					objects.forEach(
						function(object) {
							object.css("height", maxHeight + 'px');
						}
					);
				}
			}
		);
		// $(baseSelector + " .media-caption").css("height", maxHeight + 'px');
	};

	Utilities.hasProperty = function(object, property) {
		if (! object.hasOwnProperty(property))
			return false;
		else
			// this[property] is array or string
			return object[property].length > 0;
	};

	Utilities.hasSomeDescription = function(albumOrSingleMediaOrMetadata, property = null) {
		var myObject;
		if (albumOrSingleMediaOrMetadata instanceof SingleMedia)
			myObject = albumOrSingleMediaOrMetadata.metadata;
		else
			myObject = albumOrSingleMediaOrMetadata;

		if (property)
			return Utilities.hasProperty(myObject, property);
		else
			return Utilities.hasProperty(myObject, "title") || Utilities.hasProperty(myObject, "description") || Utilities.hasProperty(myObject, "tags");
	};

	Utilities.prototype.setDescription = function(object) {

		var hasTitle = Utilities.hasProperty(object, "title");
		var hasDescription = Utilities.hasProperty(object, "description");
		var hasTags = Utilities.hasProperty(object, "tags");

		if (
			! Utilities.hasSomeDescription(object) || (
				(
					! (hasTitle || hasDescription) || env.options.hide_descriptions
				) && (
					! hasTags || env.options.hide_tags
				)
			)
		) {
			$("#description-wrapper").addClass("hidden");
		} else {
			$("#description-wrapper").removeClass("hidden");

			// $("#description").css("max-height", (env.windowHeight / 2) + "px");

			if (! hasTitle && ! hasDescription) {
				$("#description-title").html("");
				$("#description-text").html("");
			} else {
				// $("#description").show();
				if (! hasTitle) {
					$("#description-title").hide();
					$("#description-title").html("");
				} else {
					$("#description-title").show();
					$("#description-title").html(Utilities.formatDescription(object.title));
				}

				if (! hasDescription) {
					$("#description-text").hide();
					$("#description-text").html("");
				} else {
					$("#description-text").show();
					$("#description-text").html(Utilities.formatDescription(object.description));
					$("#description-text p").addClass("description-text");
				}
			}

			if (! hasTags) {
				$("#description-tags").hide();
				$("#description-tags").html("");
			} else {
				let textualTags = Utilities._t("#tags") + ": <span class='tag'>" + object.tags.map(tag => Utilities.addTagLink(tag)).join("</span>, <span class='tag'>") + "</span>";
				$("#description-tags").show();
				$("#description-tags").html(textualTags);
			}
		}
	};

	Utilities.setDescriptionOptions = function() {
		var forceShowTags = false;
		if ($("#description-tags").html().indexOf(env.markTagBegin) > -1)
			forceShowTags = true;

		if (! forceShowTags && env.options.hide_descriptions && env.options.hide_tags)
			$("#description-wrapper").addClass("hidden-by-option");
		else {
			$("#description-wrapper").removeClass("hidden-by-option");

			if (env.options.hide_descriptions)
				$("#description").addClass("hidden-by-option");
			else
				$("#description").removeClass("hidden-by-option");

			if (! forceShowTags && env.options.hide_tags)
				$("#description-tags").addClass("hidden-by-option");
			else
				$("#description-tags").removeClass("hidden-by-option");

			$("#description-wrapper").css("right", "");
			var thumbsHeight = 0;
			if (env.currentMedia !== null && $("#thumbs").is(":visible"))
				thumbsHeight = env.options.media_thumb_size + 20;
			$("#description-wrapper").css("bottom", thumbsHeight + 20);

			$("#description-tags").css("right", $("#description-hide-show").outerWidth(true).toString() + "px");

			var maxHeight = Math.min(env.windowHeight / 3, 500);
			if (env.isMobile.any())
				maxHeight = Math.min(env.windowHeight / 3, 400);

			var maxWidth = Math.min(env.windowWidth / 2, 500);
			if (env.isMobile.any())
				maxWidth = Math.min(env.windowWidth / 2, 400);

			var object = env.currentMedia !== null ? env.currentMedia.metadata : env.currentAlbum;
			var hasDescription = Utilities.hasProperty(object, "title") || Utilities.hasProperty(object, "description");
			var hasTags = Utilities.hasProperty(object, "tags");
			$("#description").css("max-height", "");
			$("#description-text").css("max-height", "");
			$("#description-tags").css("max-height", "");
			$("#description-tags").css("position", "");
			if ($("#description-text").is(":visible") && ! env.options.hide_descriptions && hasDescription) {
				$("#description-text").css("max-height", maxHeight.toString() + "px");
			} else if ($("#description-tags").is(":visible") && ! env.options.hide_tags && hasTags) {
				$("#description-tags").css("max-height", maxHeight.toString() + "px");
			} else {
				$("#description").css("max-height", maxHeight.toString() + "px");
			}

			$("#description-text").css("margin-bottom", "");
			$("#description-title").css("margin-bottom", "");
			$("#description-text").css("height", "");
			$("#description-wrapper").css("width", "");
			$("#description-wrapper").css("height", "");
			$("#description").css("border", "");
			$("#description-tags").css("position", "");
			$("#description-tags").css("margin-left", "");
			var bottomSpace = $("#description-hide-show").outerHeight();
			if ($("#description-tags").is(":visible") && ! env.options.hide_tags && hasTags)
				bottomSpace = Math.max(bottomSpace, $("#description-tags").outerHeight());
			if ($("#description-text").is(":visible") && $("#description-text").height() > 0) {
				$("#description-text").css("margin-bottom", bottomSpace.toString() + "px");
			} else if ($("#description-title").is(":visible") && $("#description-title").height() > 0) {
				$("#description-title").css("margin-bottom", bottomSpace.toString() + "px");
			} else {
				$("#description").css("border", "0");
				$("#description-tags").css("position", "relative");
				$("#description-tags").css("margin-left", ($("#description-hide-show").outerWidth(true)) + "px");
			}

			$("#description-wrapper, #description").css("max-width", maxWidth.toString() + "px");
			$("#description-tags").css("max-width", (maxWidth - 20).toString() + "px");

			while ($("#description-hide-show").outerWidth(true) + $("#description-tags").outerWidth(true) > $("#description-wrapper").innerWidth() && $("#description-wrapper").width() < maxWidth) {
				$("#description-wrapper").css("width", ($("#description-wrapper").width() + 5) + "px");
			}
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
				$("#description, #description-tags").toggleClass("hidden-by-button");
				// only reposition the button when hiding
				if (! $("#description").hasClass("hidden-by-button")) {
					Utilities.setDescriptionOptions();
					Utilities.correctElementPositions();
				}
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

	Utilities.prototype.showAuthForm = function(event, maybeProtectedContent = false) {
		$("#album-view, #media-view, #my-modal, #no-results").css("opacity", "0.2");
		$("#loading").hide();

		Utilities.closeMenu();

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
		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = PhotoFloat.decodeHash(hash);

		if (mediaCacheBase === null || env.currentAlbum !== null && env.currentAlbum.isAlbumWithOneMedia()) {
			// hash of an album: go up in the album tree
			if (collectionCacheBase !== null) {
				if (albumCacheBase === foundAlbumCacheBase)
					resultCacheBase = collectionCacheBase;
				else {
					// we must go up in the sub folder
					albumCacheBase = albumCacheBase.split(env.options.cache_folder_separator).slice(0, -1).join(env.options.cache_folder_separator);
					resultCacheBase = Utilities.pathJoin([
						albumCacheBase,
						foundAlbumCacheBase,
						collectionCacheBase
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
			if (collectionCacheBase !== null || Utilities.isFolderCacheBase(albumCacheBase)) {
				// media in found album or in one of its subalbum
				// or
				// media in folder hash:
				// remove the trailing media
				resultCacheBase = Utilities.pathJoin(hash.split("/").slice(1, -1));
			} else {
				// all the other cases
				// remove the trailing media and the folder it's inside
				resultCacheBase = Utilities.pathJoin(hash.split("/").slice(1, -2));
			}
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

	Utilities.prototype.toggleInsideWordsSearch = function() {
		env.options.search_inside_words = ! env.options.search_inside_words;
		Functions.setBooleanCookie("searchInsideWords", env.options.search_inside_words);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		// Utilities.focusSearchField();
	};

	Utilities.prototype.toggleAnyWordSearch = function() {
		env.options.search_any_word = ! env.options.search_any_word;
		Functions.setBooleanCookie("searchAnyWord", env.options.search_any_word);
		Functions.updateMenu();
		if (env.searchWords.length < 2)
			return;
		if ($("#search-field").val().trim())
			$('#search-button').click();
		// Utilities.focusSearchField();
	};

	Utilities.prototype.toggleCaseSensitiveSearch = function() {
		env.options.search_case_sensitive = ! env.options.search_case_sensitive;
		Functions.setBooleanCookie("searchCaseSensitive", env.options.search_case_sensitive);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		// Utilities.focusSearchField();

	};

	Utilities.prototype.toggleAccentSensitiveSearch = function() {
		env.options.search_accent_sensitive = ! env.options.search_accent_sensitive;
		Functions.setBooleanCookie("searchAccentSensitive", env.options.search_accent_sensitive);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		// Utilities.focusSearchField();
	};

	Utilities.prototype.toggleTagsOnlySearch = function() {
		env.options.search_tags_only = ! env.options.search_tags_only;
		Functions.setBooleanCookie("searchTagsOnly", env.options.search_tags_only);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		// Utilities.focusSearchField();
	};

	Utilities.prototype.toggleCurrentAbumSearch = function() {
		env.options.search_current_album = ! env.options.search_current_album;
		Functions.setBooleanCookie("searchCurrentAlbum", env.options.search_current_album);
		Functions.updateMenu();
		if ($("#search-field").val().trim())
			$('#search-button').click();
		// Utilities.focusSearchField();
	};

	Utilities.prototype.highlightSearchedWords = function(whenTyping = false) {
		var isSearch = Utilities.isSearchHash();
		if (isSearch || whenTyping) {
			// highlight the searched text

			let searchWords;
			if (whenTyping) {
				let searchString = $("#search-field").val().trim();
				if (env.options.search_tags_only) {
					searchWords = [searchString];
				} else {
					searchWords = searchString.split(' ');
				}
			} else {
				searchWords = env.searchWords;
			}

			let selector = ".title .media-name, #description, #description-tags .tag";

			let baseSelector = "";
			if (Utilities.isPopup())
				baseSelector = "#popup-images-wrapper";
			else if (env.currentMedia === null)
				baseSelector = "#album-and-media-container";

			let mediaNameSelector = ".media-name";
			let albumNameSelector = ".album-name";
			if ($("#subalbums .first-line, #thumbs .first-line").length) {
				mediaNameSelector += " .first-line";
				albumNameSelector += " .first-line";
			}

			if (baseSelector.length) {
				selector += ", " +
					baseSelector + " " + mediaNameSelector + ", " +
					baseSelector + " " + albumNameSelector + ", " +
					baseSelector + " .media-description, " +
					baseSelector + " .album-description, " +
					baseSelector + " .album-tags, " +
					baseSelector + " .media-tags";
			}

			var punctuationArray = ":;.,-–—‒_(){}[]¡!`´·#|@~&/*^¨'+=?¿<>\\\"".split("");
			const options = {
				caseSensitive: env.options.search_case_sensitive,
				diacritics: ! env.options.search_accent_sensitive,
				separateWordSearch: whenTyping ? true : env.options.search_any_word,
				accuracy: env.options.search_inside_words || whenTyping ? "partially" : {
					value: "exactly",
					limiters: punctuationArray
				},
				ignorePunctuation: punctuationArray
			};
			$(selector).unmark(
				{
					done: function() {
						$(selector).mark(
							searchWords,
							options
						);
					}
				}
			);

			// make the descritpion and the tags visible if highlighted
			for (let selector of ["#subalbums", "#thumbs"]) {
				let adapt = false;
				$(selector + " .description.ellipsis").each(
					function() {
						if ($(this).html().indexOf(env.markTagBegin) !== -1) {
							$(this).css("text-overflow", "unset").css("overflow", "visible").css("white-space", "unset");
							adapt = true;
						}
					}
				);
				$(selector + " .album-tags, " + selector + " .media-tags").each(
					function() {
						if ($(this).html().indexOf(env.markTagBegin) !== -1) {
							$(this).removeClass("hidden-by-option");
							adapt = true;
						}
					}
				);
				if (adapt) {
					if (selector === "#subalbums") {
						Utilities.adaptSubalbumCaptionHeight();
					} else {
						Utilities.adaptMediaCaptionHeight(false);
						Utilities.adaptMediaCaptionHeight(true);
					}
				}
			}

			// bottom right tags will be made visible if highlighted in Utilities.setDescriptionOptions()

			// make visible the file name if it's highlighted
			let html = $("#media-name-second-part").html();
			if (html && html.indexOf("<mark data-markjs=") !== -1) {
				$(".with-second-part").addClass("hovered");
			}
		}
	};

	Utilities.prototype.horizontalDistance = function(object1, object2) {
		var leftOffset1 = object1.offset().left;
		var leftOffset2 = object2.offset().left;
		var rightOffset1 = leftOffset1 + object1.outerWidth();
		var rightOffset2 = leftOffset2 + object2.outerWidth();
		return ((rightOffset2 + leftOffset2) / 2 - (rightOffset1 + leftOffset1) / 2);
	};

	Utilities.prototype.verticalDistance = function(object1, object2) {
		var topOffset1 = object1.offset().top;
		var topOffset2 = object2.offset().top;
		var bottomOffset1 = topOffset1 + object1.outerHeight();
		var bottomOffset2 = topOffset2 + object2.outerHeight();
		return ((topOffset2 + bottomOffset2) / 2 - (topOffset1 + bottomOffset1) / 2);
	};

	/* make static methods callable as member functions */
	Utilities.prototype.isFolderCacheBase = Utilities.isFolderCacheBase;
	Utilities.prototype.pathJoin = Utilities.pathJoin;
	Utilities.prototype.setLinksVisibility = Utilities.setLinksVisibility;
	Utilities.prototype.mediaBoxGenerator = Utilities.mediaBoxGenerator;
	Utilities.prototype.currentSizeAndIndex = Utilities.currentSizeAndIndex;
	Utilities.prototype.nextSizeAndIndex = Utilities.nextSizeAndIndex;
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
	Utilities.prototype._s = Utilities._s;
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
	Utilities.prototype.scrollBottomMediaToHighlightedThumb = Utilities.scrollBottomMediaToHighlightedThumb;
	Utilities.prototype.focusSearchField = Utilities.focusSearchField;
	Utilities.prototype.highlightMenu = Utilities.highlightMenu;
	Utilities.prototype.addTagLink = Utilities.addTagLink;
	Utilities.prototype.formatDescription = Utilities.formatDescription;
	Utilities.prototype.stripHtmlAndReplaceEntities = Utilities.stripHtmlAndReplaceEntities;
	Utilities.prototype.isShiftOrControl = Utilities.isShiftOrControl;
	Utilities.prototype.isPopup = Utilities.isPopup;
	Utilities.prototype.arrayUnion = Utilities.arrayUnion;
	Utilities.prototype.setPinchButtonsPosition = Utilities.setPinchButtonsPosition;
	Utilities.prototype.setPinchButtonsVisibility = Utilities.setPinchButtonsVisibility;
	Utilities.prototype.setSelectButtonPosition = Utilities.setSelectButtonPosition;
	Utilities.prototype.setDescriptionOptions = Utilities.setDescriptionOptions;
	Utilities.prototype.correctElementPositions = Utilities.correctElementPositions;
	Utilities.prototype.closeMenu = Utilities.closeMenu;
	Utilities.prototype.openSearchMenu = Utilities.openSearchMenu;
	Utilities.prototype.socialButtons = Utilities.socialButtons;
	Utilities.prototype.openInNewTab = Utilities.openInNewTab;
	Utilities.prototype.isMap = Utilities.isMap;
	Utilities.prototype.removeHighligths = Utilities.removeHighligths;
	Utilities.prototype.addHighlight = Utilities.addHighlight;
	Utilities.prototype.aSingleMediaIsHighlighted = Utilities.aSingleMediaIsHighlighted;
	Utilities.prototype.aSubalbumIsHighlighted = Utilities.aSubalbumIsHighlighted;
	Utilities.prototype.highlightedObject = Utilities.highlightedObject;
	Utilities.prototype.prevObjectForHighlighting = Utilities.prevObjectForHighlighting;
	Utilities.prototype.nextObjectForHighlighting = Utilities.nextObjectForHighlighting;
	Utilities.prototype.scrollPopupToHighlightedThumb = Utilities.scrollPopupToHighlightedThumb;
	Utilities.prototype.scrollAlbumViewToHighlightedThumb = Utilities.scrollAlbumViewToHighlightedThumb;
	Utilities.prototype.scrollToHighlightedSubalbum = Utilities.scrollToHighlightedSubalbum;
	Utilities.prototype.isSearchHash = Utilities.isSearchHash;
	Utilities.prototype.adaptSubalbumCaptionHeight = Utilities.adaptSubalbumCaptionHeight;
	Utilities.prototype.adaptMediaCaptionHeight = Utilities.adaptMediaCaptionHeight;
	Utilities.prototype.openRightMenu = Utilities.openRightMenu;
	Utilities.prototype.onlyShowNonGeotaggedContent = Utilities.onlyShowNonGeotaggedContent;
	Utilities.prototype.isLoaded = Utilities.isLoaded;
	Utilities.prototype.hasSomeDescription = Utilities.hasSomeDescription;

	window.Utilities = Utilities;
}());
