/*jshint esversion: 6 */
(function() {
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

	Utilities.prototype.numPasswords = function(album, unveiledOnly = false) {
		var codes = [];
		for (let codesComplexCombination in album.numsProtectedMediaInSubTree) {
			if (album.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexCombination) && codesComplexCombination !== ",") {
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
						codes = this.arrayUnion(codes, combinationList);
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

	Utilities.prototype.cloneObject = function(object) {
		return Object.assign({}, object);
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

	Utilities.prototype.addPointToPoints = function(oldPoints, newPoint) {
		var oldPoint, newElement;
		for (var iOld = 0; iOld < oldPoints.length; iOld ++) {
			oldPoint = oldPoints[iOld];
			if (newPoint.lng == oldPoint.lng && newPoint.lat == oldPoint.lat) {
				for (var iNew = 0; iNew < newPoint.mediaNameList.length; iNew ++) {
					newElement = newPoint.mediaNameList[iNew];
					// the following check is needed for searches only?
					if (
						oldPoint.mediaNameList.every(
							function(element) {
								return element.albumCacheBase != newElement.albumCacheBase || element.cacheBase != newElement.cacheBase;
							}
						)
					)
						oldPoints[iOld].mediaNameList.push(newPoint.mediaNameList[iNew]);
				}
				return oldPoints;
			}
		}
		oldPoints.push(newPoint);
		return oldPoints;
	};

	Utilities.prototype.mergePoints = function(oldPoints, newPoints) {
		for (var i = 0; i < newPoints.length; i ++) {
			oldPoints = this.addPointToPoints(oldPoints, newPoints[i]);
		}
		return oldPoints;
	};

	Utilities.prototype.addMediaToPoints = function(oldPoints, newMedia) {
		var newPoint = {
			'lng': parseFloat(newMedia.metadata.longitude),
			'lat' : parseFloat(newMedia.metadata.latitude),
			'mediaNameList': [{
				'cacheBase': newMedia.cacheBase,
				'albumCacheBase': newMedia.parent.cacheBase,
				'foldersCacheBase': newMedia.foldersCacheBase
			}]
		};
		return this.addPointToPoints(oldPoints, newPoint);
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

	Utilities.prototype.arrayUnion = function(a, b, equalityFunction = null) {
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
	Utilities.sortBy = function(albumOrMediaList, field) {
		return albumOrMediaList.sort(
			function(a,b) {
				var aValue = a[field];
				var bValue = b[field];
				if (['name', 'altName', 'path'].indexOf(field) > -1) {
					// make name search case insensitive
					aValue = aValue.toLowerCase();
					bValue = bValue.toLowerCase();
				}
				return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
			}
		);
	};

	 Utilities.sortByName = function(mediaList) {
		mediaList = this.sortBy(mediaList, 'name');
	};

	Utilities.sortByPath = function(albumList) {
		if (albumList.length) {
			if (Utilities.isByGpsCacheBase(albumList[0].cacheBase)) {
				if (albumList[0].hasOwnProperty('altName'))
					albumList = this.sortBy(albumList, 'altName');
				else
					albumList = this.sortBy(albumList, 'name');
			} else {
				albumList = this.sortBy(albumList, 'path');
			}
		}
	};

	Utilities.sortByDate = function (albumOrMediaList) {
		albumOrMediaList = albumOrMediaList.sort(
			function(a,b) {
				return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
				// var aValue = new Date(a.date);
				// var bValue = new Date(b.date);
				// return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
			}
		);
	};

	Utilities.sortReverse = function(albumOrMediaList) {
		var sortedAlbum = albumOrMediaList.reverse();

		return sortedAlbum;
	};

	Utilities.prototype.isAnyRootHash = function(hash) {
		return [Options.folders_string, Options.by_date_string, Options.by_gps_string, Options.by_map_string].indexOf(hash) !== -1;
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

	Utilities.isByDateCacheBase = function(string) {
		return string == Options.by_date_string || string.indexOf(Options.byDateStringWithTrailingSeparator) === 0;
	};

	Utilities.isByGpsCacheBase = function(string) {
		return string == Options.by_gps_string || string.indexOf(Options.byGpsStringWithTrailingSeparator) === 0;
	};

	Utilities.isSearchCacheBase = function(string) {
		return string.indexOf(Options.bySearchStringWithTrailingSeparator) === 0;
	};

	Utilities.isMapCacheBase = function(string) {
		return string.indexOf(Options.byMapStringWithTrailingSeparator) === 0;
	};

	Utilities.prototype.isSearchHash = function(hash) {
		hash = PhotoFloat.cleanHash(hash);
		var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(hash);
		if (this.isSearchCacheBase(hash) || savedSearchAlbumHash !== null)
			return true;
		else
			return false;
	};

	Utilities.prototype.isMapHash = function(hash) {
		hash = PhotoFloat.cleanHash(hash);
		var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(hash);
		if (this.isMapCacheBase(hash) || savedSearchAlbumHash !== null)
			return true;
		else
			return false;
	};

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

	Utilities.prototype.transformAltPlaceName = function(altPlaceName) {
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

	Utilities.prototype.hasGpsData = function(media) {
		return media.mimeType.indexOf("image") === 0 && typeof media.metadata.latitude !== "undefined";
	};

	Utilities.prototype.em2px = function(selector, em) {
		var emSize = parseFloat($(selector).css("font-size"));
		return (em * emSize);
	};

	Utilities.isAlbumWithOneMedia = function(currentAlbum) {
		return currentAlbum !== null && ! currentAlbum.subalbums.length && Utilities.imagesAndVideosTotal(currentAlbum.numMedia) == 1;
	};

	Utilities.chooseReducedPhoto = function(media, container, fullScreenStatus) {
		var chosenMedia, reducedWidth, reducedHeight;
		var mediaWidth = media.metadata.size[0], mediaHeight = media.metadata.size[1];
		var mediaSize = Math.max(mediaWidth, mediaHeight);
		var mediaRatio = mediaWidth / mediaHeight, containerRatio;

		chosenMedia = this.originalMediaPath(media);
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
				chosenMedia = this.mediaPath(currentAlbum, media, Options.reduced_sizes[i]);
				maxSize = Options.reduced_sizes[i];
			}
		}
		return chosenMedia;
	};

	Utilities.prototype.chooseMediaReduction = function(media, id, fullScreenStatus) {
		// chooses the proper reduction to use depending on the container size
		var container, mediaSrc;

		if (media.mimeType.indexOf("video") === 0) {
			if (fullScreenStatus && media.name.match(/\.avi$/) === null) {
				mediaSrc = Utilities.originalMediaPath(media);
			} else {
				// .avi videos are not played by browsers, use the transcoded one
				mediaSrc = this.mediaPath(currentAlbum, media, "");
			}
		} else if (media.mimeType.indexOf("image") === 0) {
			if (fullScreenStatus && Modernizr.fullscreen)
				container = $(window);
			else
				container = $(".media-box#" + id + " .media-box-inner");

			mediaSrc = Utilities.chooseReducedPhoto(media, container, fullScreenStatus);
		}

		return mediaSrc;
	};

	Utilities.prototype.sumSizes = function(sizes1, sizes2) {
		var result = {};
		var keys = Object.keys(sizes1);
		for (var i = 0; i < keys.length; i++)
			result[keys[i]] = {
				"images": sizes1[keys[i]].images + sizes2[keys[i]].images,
				"videos": sizes1[keys[i]].videos + sizes2[keys[i]].videos
			};
		return result;
	};

	Utilities.currentSizeAndIndex = function() {
		// Returns the pixel size of the photo in DOM and the corresponding reduction index
		// If the original photo is in the DOM, returns its size and -1

		var currentReduction = $(".media-box#center .media-box-inner img").attr("src");

		// check if it's a reduction
		for (var i = 0; i < Options.reduced_sizes.length; i ++) {
			if (currentReduction === Utilities.mediaPath(currentAlbum, currentMedia, Options.reduced_sizes[i])) {
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

	// Utilities.nextSizeIndex = function() {
	// 	// returns the index of the next bigger reduction size than that of the photo in DOM
	// 	// returns -1 if the next bigger image is the original image
	// 	// returns false if in the DOM there is the original image
	//
	// 	var currentPhotoSize = Utilities.currentSize();
	// 	if (currentPhotoSize == 0) {
	// 		return false;
	// 	} else {
	// 		if (currentPhotoSize === Options.reduced_sizes[0])
	// 			return -1;
	// 		for (var i = 1; i < Options.reduced_sizes.length - 1; i ++) {
	// 			if (currentPhotoSize === Options.reduced_sizes[i]) {
	// 				return i - 1;
	// 			}
	// 		}
	// 	}
	// 	return 0;
	// };

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

		return Utilities.mediaPath(currentAlbum, currentMedia, nextReductionSize);
	};

	Utilities.prototype.createMediaHtml = function(media, id, fullScreenStatus) {
		// creates a media element that can be inserted in DOM (e.g. with append/prepend methods)

		// the actual sizes of the image
		var mediaWidth = media.metadata.size[0], mediaHeight = media.metadata.size[1];
		var mediaSrc, mediaElement, container;
		var attrWidth = mediaWidth, attrHeight = mediaHeight;

		if (media.mimeType.indexOf("video") === 0) {
			if (fullScreenStatus && media.name.match(/\.avi$/) === null) {
				mediaSrc = Utilities.originalMediaPath(media);
			} else {
				// .avi videos are not played by browsers, use the transcoded one
				mediaSrc = this.mediaPath(currentAlbum, media, "");
			}

			mediaElement = $('<video/>', {controls: true });
		} else if (media.mimeType.indexOf("image") === 0) {
			if (fullScreenStatus && Modernizr.fullscreen)
				container = $(window);
			else
				container = $(".media-box#" + id + " .media-box-inner");

			mediaSrc = Utilities.chooseReducedPhoto(media, container, fullScreenStatus);

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
			if (this.isFolderCacheBase(currentAlbum.cacheBase))
				mediaElement.attr("title", media.date);
			else
				mediaElement.attr("title", this.pathJoin([media.albumName, media.name]));
		}

		mediaElement
			.attr("id", "media-" + id)
			.attr("width", attrWidth)
			.attr("height", attrHeight)
			.attr("ratio", mediaWidth / mediaHeight)
			.attr("src", encodeURI(mediaSrc))
			.attr("alt", media.name);

		return mediaElement[0].outerHTML;
	};

	Utilities.prototype.createMediaLinkTag = function(media, mediaSrc) {
		// creates a link tag to be inserted in <head>

		if (media.mimeType.indexOf("video") === 0) {
			return '<link rel="video_src" href="' + encodeURI(mediaSrc) + '" />';
		} else if (media.mimeType.indexOf("image") === 0) {
			return '<link rel="image_src" href="' + encodeURI(mediaSrc) + '" />';
		}
	};

	Utilities.prototype.chooseTriggerEvent = function(media) {
		// choose the event that must trigger the scaleMedia function

		if (media.mimeType.indexOf("video") === 0) {
			return "loadstart";
		} else if (media.mimeType.indexOf("image") === 0) {
			return "load";
		}
	};

	Utilities.originalMediaPath = function(media) {
		if (Options.browser_unsupported_mime_types.includes(media.mimeType))
			return Utilities.pathJoin([Options.server_cache_path, media.convertedPath]);
		else
			return Utilities.trueOriginalMediaPath(media);
	};

	Utilities.trueOriginalMediaPath = function(media) {
		return Utilities.pathJoin([media.albumName, media.name]);
	};

	Utilities.mediaPath = function(album, singleMedia, size) {
		var suffix = Options.cache_folder_separator, hash, rootString = "root-";
		if (
			singleMedia.mimeType.indexOf("image") === 0 ||
			singleMedia.mimeType.indexOf("video") === 0 && [Options.album_thumb_size, Options.media_thumb_size].indexOf(size) != -1
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
		} else if (singleMedia.mimeType.indexOf("video") === 0) {
			suffix += "transcoded.mp4";
		}

		hash = singleMedia.foldersCacheBase + Options.cache_folder_separator + singleMedia.cacheBase + suffix;
		if (hash.indexOf(rootString) === 0)
			hash = hash.substring(rootString.length);
		else {
			if (this.isFolderCacheBase(hash))
				hash = hash.substring(Options.foldersStringWithTrailingSeparator.length);
			else if (this.isByDateCacheBase(hash))
				hash = hash.substring(Options.byDateStringWithTrailingSeparator.length);
			else if (this.isByGpsCacheBase(hash))
				hash = hash.substring(Options.byGpsStringWithTrailingSeparator.length);
			else if (this.isSearchCacheBase(hash))
				hash = hash.substring(Options.bySearchStringWithTrailingSeparator.length);
			else if (this.isMapCacheBase(hash))
				hash = hash.substring(Options.byMapStringWithTrailingSeparator.length);
		}
		if (singleMedia.cacheSubdir)
			return this.pathJoin([Options.server_cache_path, singleMedia.cacheSubdir, hash]);
		else
			return this.pathJoin([Options.server_cache_path, hash]);
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
					titleHeight = parseInt($(".media-box#center .title").css("height"));
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

	Utilities.prototype.imagesTotal = function(imagesAndVideos) {
		return imagesAndVideos.images;
	};

	Utilities.prototype.videosTotal = function(imagesAndVideos) {
		return imagesAndVideos.videos;
	};

	Utilities.imagesAndVideosTotal = function(imagesAndVideos) {
		return imagesAndVideos.images + imagesAndVideos.videos;
	};

	Utilities.imagesAndVideosSum = function(imagesAndVideos1, imagesAndVideos2) {
		var result = JSON.parse(JSON.stringify(imagesAndVideos0));
		result.images = imagesAndVideos1.images + imagesAndVideos2.images;
		result.videos = imagesAndVideos1.videos + imagesAndVideos2.videos;
		return result;
	};

	Utilities.prototype.imagesAndVideosCount = function(mediaList) {
		var result = JSON.parse(JSON.stringify(imagesAndVideos0));
		for (let i = 0; i < mediaList.length; i ++) {
			if (mediaList[i].mimeType.indexOf("image/") === 0)
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
		if (Utilities.isSearchCacheBase(currentAlbum.cacheBase)) {
			zipFilename += Utilities._t("#by-search") + " '" + $("#search-field").val() + "'";
		} else if (Utilities.isByDateCacheBase(currentAlbum.cacheBase)) {
			let textComponents = currentAlbum.path.split("/").splice(1);
			if (textComponents.length > 1)
				textComponents[1] = Utilities._t("#month-" + textComponents[1]);

			zipFilename += textComponents.join('-');
		} else if (Utilities.isByGpsCacheBase(currentAlbum.cacheBase)) {
			zipFilename += currentAlbum.ancestorsNames.splice(1).join('-');
		} else if (Utilities.isMapCacheBase(currentAlbum.cacheBase)) {
			zipFilename += Utilities._t("#from-map");
		} else if (currentAlbum.cacheBase !== Options.folders_string)
			zipFilename += currentAlbum.name;

		zipFilename += ".zip";

		var addMediaPromise = addMediaFromAlbum(currentAlbum);
		addMediaPromise.then(
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

		function addMediaFromAlbum(currentAlbum, subalbum = "") {
			return new Promise(
				function(resolve_addMediaFromAlbum) {
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
									url = encodeURI(Utilities.trueOriginalMediaPath(currentAlbum.media[iMedia]));
								else
									url = encodeURI(Utilities.mediaPath(currentAlbum, currentAlbum.media[iMedia], size));
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
									let ithSubalbum = currentAlbum.subalbums[iSubalbum];
									let getAlbumPromise = PhotoFloat.getAlbum(ithSubalbum.cacheBase, null, {"getMedia": true, "getPositions": false});
									getAlbumPromise.then(
										function(subalbum) {
											let albumPath = subalbum.path;
											if (Utilities.isSearchCacheBase(currentAlbum.cacheBase))
												// remove the leading folders/date/gps/map string
												albumPath = albumPath.split('/').splice(1).join('/');
											else
												albumPath = albumPath.substring(basePath.length + 1);
											let addMediaPromise = addMediaFromAlbum(subalbum, albumPath);
											addMediaPromise.then(
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
							resolve_addMediaFromAlbum();
						}
					);
				}
			);
		}
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
		// if (typeof containerHeight === "undefined") {
		containerHeight = windowHeight - titleHeight - albumHeight;
		containerWidth = windowWidth;
		// }
		var pinchTop = Math.round(titleHeight + (containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		// var pinchTop = Math.round((containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		var pinchRight = Math.round((containerWidth - actualWidth) / 2 + distanceFromImageBorder);
		$("#pinch-container").css("right", pinchRight.toString() + "px").css("top", pinchTop.toString() + "px");
	};

	Utilities.prototype.sumUpNumsProtectedMedia = function(numsProtectedMediaInSubTree) {
		var sum = imagesAndVideos0, codesComplexcombination;
		for (codesComplexcombination in numsProtectedMediaInSubTree) {
			if (numsProtectedMediaInSubTree.hasOwnProperty(codesComplexcombination) && codesComplexcombination !== ",") {
				sum = Utilities.imagesAndVideosSum(sum, numsProtectedMediaInSubTree[codesComplexcombination]);
			}
		}
		return sum.images + sum.videos;
	};
	Utilities.prototype.sumNumsProtectedMediaOfArray = function(arrayOfAlbumsOrSubalbunms) {
		var result = {}, i, codesComplexcombination, albumOrSubalbum;

		for (i = 0; i < arrayOfAlbumsOrSubalbunms.length; i ++) {
			albumOrSubalbum = arrayOfAlbumsOrSubalbunms[i];
			for (codesComplexcombination in albumOrSubalbum.numsProtectedMediaInSubTree) {
				if (albumOrSubalbum.numsProtectedMediaInSubTree.hasOwnProperty(codesComplexcombination) && codesComplexcombination !== ",") {
					if (! result.hasOwnProperty(codesComplexcombination))
						result[codesComplexcombination] = {images: 0, videos: 0};
					result[codesComplexcombination] = Utilities.imagesAndVideosSum(result[codesComplexcombination], albumOrSubalbum.numsProtectedMediaInSubTree[codesComplexcombination]);
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
		return text.replace(/'/g, "\\'");;
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
		if (! fullScreenStatus && Utilities.imagesAndVideosTotal(currentAlbum.numMedia) > 1) {
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
		$("#auth-text").stop().fadeIn(1000);
		$("#password").focus();

		$('#auth-close').off('click').on(
			'click',
			function() {
				$("#auth-text").hide();
				$("#album-view, #media-view, #my-modal").css("opacity", "");
				if (maybeProtectedContent)
					window.location.href = Utilities.upHash();
			}
		);
	};

	Utilities.prototype.showPasswordRequestForm = function(event) {
		$("#auth-form").hide();
		$("#password-request-form").show();
		$("#please-fill").hide();
		$("#identity").attr("title", Utilities._t("#identity-explication"));
	};

	Utilities.upHash = function() {
		var resultHash;
		var hash = window.location.hash;
		var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = PhotoFloat.decodeHash(hash);

		if (mediaHash === null || Utilities.isAlbumWithOneMedia(currentAlbum)) {
			// hash of an album: go up in the album tree
			if (savedSearchAlbumHash !== null) {
				if (albumHash == savedSearchSubAlbumHash)
					resultHash = savedSearchAlbumHash;
				else {
					// we must go up in the sub folder
					albumHash = albumHash.split(Options.cache_folder_separator).slice(0, -1).join(Options.cache_folder_separator);
					resultHash = Utilities.pathJoin([
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
				else if (Utilities.isSearchCacheBase(albumHash) || Utilities.isMapCacheBase(albumHash)) {
					// the return folder must be extracted from the album hash
					resultHash = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
				} else {
					// we must go up in the sub folders tree
					resultHash = albumHash.split(Options.cache_folder_separator).slice(0, -1).join(Options.cache_folder_separator);
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

		return "#!/" + resultHash;
	};


	/* Error displays */
	Utilities.prototype.errorThenGoUp = function(error) {
		if (error == 403) {
			$("#auth-text").stop().fadeIn(1000);
			$("#password").focus();
		} else {
			// Jason's code only had the following line
			//$("#error-text").stop().fadeIn(2500);

			var rootLink = "#!/" + Options.folders_string;

			$("#album-view").fadeOut(200);
			$("#media-view").fadeOut(200);

			if (window.location.href == rootLink) {
				$("#loading").hide();
				$("#error-text-folder").stop();
				$("#error-root-folder").stop().fadeIn(2000);
				$("#powered-by").show();
			} else {
				$("#error-text-folder").stop().fadeIn(
					200,
					function() {
						window.location.href = Utilities.upHash();

						// var splittedHash = location.hash.split(Options.cache_folder_separator);
						// if (splittedHash.length > 2) {
						// 	splittedHash.pop();
						// 	window.location.href = splittedHash.join(Options.cache_folder_separator);
						// } else {
						// 	window.location.href = rootLink;
						// }
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

	Utilities.prototype.chooseThumbnail	= function(album, singleMedia, thumbnailSize) {
		return this.mediaPath(album, singleMedia, thumbnailSize);
	};

	Utilities.sortAlbumsMedia = function(thisAlbum) {
		// this function applies the sorting on the media and subalbum lists
		// and sets the album properties that attest the lists status

		// album properties reflect the current sorting of album and media objects
		// json files have subalbums and media sorted by date not reversed

		if (Functions.needAlbumNameSort(thisAlbum)) {
			Utilities.sortByPath(thisAlbum.subalbums);
			thisAlbum.albumNameSort = true;
			thisAlbum.albumReverseSort = false;
			// $("li.album-sort.by-name").addClass("selected");
		} else if (Functions.needAlbumDateSort(thisAlbum)) {
			Utilities.sortByDate(thisAlbum.subalbums);
			thisAlbum.albumNameSort = false;
			thisAlbum.albumReverseSort = false;
		}
		if (Functions.needAlbumDateReverseSort(thisAlbum) || Functions.needAlbumNameReverseSort(thisAlbum)) {
			thisAlbum.subalbums = Utilities.sortReverse(thisAlbum.subalbums);
			thisAlbum.albumReverseSort = ! thisAlbum.albumReverseSort;
		}

		if (thisAlbum.hasOwnProperty("media")) {
			if (Functions.needMediaNameSort(thisAlbum)) {
				Utilities.sortByName(thisAlbum.media);
				thisAlbum.mediaNameSort = true;
				thisAlbum.mediaReverseSort = false;
				if (currentMedia !== null) {
					currentMediaIndex = thisAlbum.media.findIndex(
						function(thisMedia) {
							var matches =
								thisMedia.cacheBase == currentMedia.cacheBase && thisMedia.foldersCacheBase == currentMedia.foldersCacheBase;
							return matches;
						}
					);
				}
			} else if (Functions.needMediaDateSort(thisAlbum)) {
				Utilities.sortByDate(thisAlbum.media);
				thisAlbum.mediaNameSort = false;
				thisAlbum.mediaReverseSort = false;
				if (currentMedia !== null) {
					currentMediaIndex = thisAlbum.media.findIndex(
						function(thisMedia) {
							var matches =
								thisMedia.cacheBase == currentMedia.cacheBase && thisMedia.foldersCacheBase == currentMedia.foldersCacheBase;
							return matches;
						}
					);
				}
			}
			if (Functions.needMediaDateReverseSort(thisAlbum) || Functions.needMediaNameReverseSort(thisAlbum)) {
				thisAlbum.media = Utilities.sortReverse(thisAlbum.media);
				thisAlbum.mediaReverseSort = ! thisAlbum.mediaReverseSort;
				if (typeof currentMediaIndex !== "undefined" && currentMediaIndex != -1)
					currentMediaIndex = Utilities.imagesAndVideosTotal(thisAlbum.numMedia) - 1 - currentMediaIndex;
			}
		}
	};

	Utilities.prototype.initializeSortPropertiesAndCookies = function(thisAlbum) {
		// this function applies the sorting on the media and subalbum lists
		// and sets the album properties that attest the lists status

		// album properties reflect the current sorting of album and media objects
		// json files have subalbums and media sorted by date not reversed

		if (typeof thisAlbum.albumNameSort === "undefined") {
			thisAlbum.albumNameSort = false;
		}
		if (typeof thisAlbum.albumReverseSort === "undefined") {
			thisAlbum.albumReverseSort = false;
		}

		if (typeof thisAlbum.mediaNameSort === "undefined") {
			thisAlbum.mediaNameSort = false;
		}
		if (typeof thisAlbum.mediaReverseSort === "undefined") {
			thisAlbum.mediaReverseSort = false;
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
	Utilities.prototype.sortAlbumsMedia = Utilities.sortAlbumsMedia;
	Utilities.prototype.chooseReducedPhoto = Utilities.chooseReducedPhoto;
	Utilities.prototype.originalMediaPath = Utilities.originalMediaPath;
	Utilities.prototype.trueOriginalMediaPath = Utilities.trueOriginalMediaPath;
	Utilities.prototype.mediaPath = Utilities.mediaPath;
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
	Utilities.prototype.sortReverse = Utilities.sortReverse;
	Utilities.prototype.sortByName = Utilities.sortByName;
	Utilities.prototype.sortByDate = Utilities.sortByDate;
	Utilities.prototype.sortByPath = Utilities.sortByPath;
	Utilities.prototype.sortBy = Utilities.sortBy;
	Utilities.prototype.isByDateCacheBase = Utilities.isByDateCacheBase;
	Utilities.prototype.isByGpsCacheBase = Utilities.isByGpsCacheBase;
	Utilities.prototype.isSearchCacheBase = Utilities.isSearchCacheBase;
	Utilities.prototype.isMapCacheBase = Utilities.isMapCacheBase;
	Utilities.prototype.setPinchButtonsPosition = Utilities.setPinchButtonsPosition;
	Utilities.prototype.convertMd5ToCode = Utilities.convertMd5ToCode;
	Utilities.prototype._t = Utilities._t;
	Utilities.prototype.getLanguage = Utilities.getLanguage;
	Utilities.prototype.imagesAndVideosTotal = Utilities.imagesAndVideosTotal;
	Utilities.prototype.imagesAndVideosSum = Utilities.imagesAndVideosSum;
	Utilities.prototype.upHash = Utilities.upHash;
	Utilities.prototype.isAlbumWithOneMedia = Utilities.isAlbumWithOneMedia;

	window.Utilities = Utilities;
}());
