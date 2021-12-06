(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var menuF = new MenuFunctions();
	var pS = new PinchSwipe();
	var tF = new TopFunctions();

	SingleMedia.prototype.addParent = function(album) {
		// add parent album
		if (! this.hasOwnProperty("parent"))
			this.parent = album;
	};

	SingleMedia.prototype.clone = function() {
		return new SingleMedia(util.cloneObject(this));
	};

	SingleMedia.prototype.cloneAndDeleteParent = function() {
		let clonedSingleMedia = this.clone();
		delete clonedSingleMedia.parent;
		return clonedSingleMedia;
	};

	SingleMedia.prototype.transformForPositions = function() {
		return new SingleMediaInPositions(
			{
				name: util.pathJoin([this.albumName, this.name]),
				cacheBase: this.cacheBase,
				foldersCacheBase: this.foldersCacheBase
			}
		);
	};

	SingleMedia.prototype.generatePositionAndMedia = function() {
		return new PositionAndMedia(
			{
				'lat' : parseFloat(this.metadata.latitude),
				'lng': parseFloat(this.metadata.longitude),
				'mediaList': [this.transformForPositions()]
			}
		);
	};

	SingleMedia.prototype.isEqual = function(otherMedia) {
		return otherMedia !== null && this.foldersCacheBase === otherMedia.foldersCacheBase && this.cacheBase === otherMedia.cacheBase;
	};

	SingleMedia.prototype.hasGpsData = function() {
		return this.metadata.latitude !== undefined && this.metadata.longitude !== undefined;
	};

	SingleMedia.prototype.swipeRight = function() {
		var self = this;
		$("#media-box-container").off('webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd').on(
			'webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd',
			function() {
				$("#media-box-container").off('webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd');
				$("#media-box-container").css("transition-duration", "0s");

				// remove right image and move html code to left side
				$(".media-box#right").remove();
				// $("#media-box-container").css("transform", "translate(0px,0)");
				$(".media-box#center").attr('id', 'right');
				$(".media-box#left").attr('id', 'center');
				util.mediaBoxGenerator('left');
				$(".media-box#left").css("width", $(".media-box#center").attr('width')).css("height", $(".media-box#center").attr('height'));

				var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);
				window.location.href = phFl.encodeHash(env.currentAlbum.cacheBase, self, foundAlbumCacheBase, collectionCacheBase);
			}
		);

		$("#pinch-container").addClass("hidden");
		pS.swipeMedia(0);
	};

	SingleMedia.prototype.swipeLeft = function() {
		var self = this;
		$("#media-box-container").off('webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd').on(
			'webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd',
			function() {
				$("#media-box-container").off('webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd');
				$("#media-box-container").css("transition-duration", "0s");

				// remove left image and move html code to right side
				$(".media-box#left").remove();
				$("#media-box-container").css("transform", "translate(0px,0)");
				$(".media-box#center").attr('id', 'left');
				$(".media-box#right").attr('id', 'center');
				util.mediaBoxGenerator('right');
				$(".media-box#right").css("width", $(".media-box#center").attr('width')).css("height", $(".media-box#center").attr('height'));
				// this translation avoid the flickering when inserting the right image into the DOM
				// if (! env.isMobile(any))
				$("#media-box-container").css("transform", "translate(-" + env.windowWidth + "px, 0px)");

				var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);
				window.location.href = phFl.encodeHash(env.currentAlbum.cacheBase, self, foundAlbumCacheBase, collectionCacheBase);
			}
		);

		$("#pinch-container").addClass("hidden");
		pS.swipeMedia(env.windowWidth * 2);
	};

	SingleMedia.prototype.isInMapAlbum = function() {
		if (! util.somethingIsInMapAlbum())
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
		if (! util.somethingIsSearched())
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
		if (! util.somethingIsSearched())
			return false;
		else {
			var foundAlbum = env.searchAlbum.subalbums.find(x => this.foldersCacheBase.indexOf(x.cacheBase) === 0);
			if (typeof foundAlbum !== "undefined")
				return foundAlbum;
			else
				return false;
		}
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

	SingleMedia.prototype.addToSelection = function(album, clickedSelector) {
		// if album is null, it means that it couldn't be determined, do determine it here
		if (! this.isSelected()) {
			if (env.selectionAlbum.isEmpty())
				util.initializeSelectionAlbum();
			// this.parent = env.selectionAlbum;
			env.selectionAlbum.media.push(this);

			if (this.hasGpsData()) {
				// add the media position
				env.selectionAlbum.positionsAndMediaInTree.addSingleMedia(this);
				env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
			}
			var singleMediaArrayCounts = new Media([this]).imagesAndVideosCount();
			env.selectionAlbum.numsMedia.sum(singleMediaArrayCounts);
			env.selectionAlbum.sizesOfAlbum.sum(this.fileSizes);
			if (! this.hasGpsData()) {
				env.selectionAlbum.nonGeotagged.numsMedia.sum(singleMediaArrayCounts);
				env.selectionAlbum.nonGeotagged.sizesOfAlbum.sum(this.fileSizes);
			}
			if (! this.isInsideSelectedAlbums()) {
				env.selectionAlbum.numsMediaInSubTree.sum(singleMediaArrayCounts);
				env.selectionAlbum.sizesOfSubTree.sum(this.fileSizes);
				if (! this.hasGpsData()) {
					env.selectionAlbum.nonGeotagged.numsMediaInSubTree.sum(singleMediaArrayCounts);
					env.selectionAlbum.nonGeotagged.sizesOfSubTree.sum(this.fileSizes);
				}
			}

			// if (! util.isPopup())
			if (album === null) {
				this.generateCaptionsForSelection(env.cache.getAlbum(this.foldersCacheBase));
			} else {
				this.generateCaptionsForSelection(album);
			}
			delete env.selectionAlbum.mediaNameSort;
			delete env.selectionAlbum.mediaReverseSort;
			env.selectionAlbum.sortAlbumsMedia();

			// update the selector
			$(clickedSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", util._t("#unselect-single-media"));
			var singleMediaSelector = "#media-select-box";
			var otherSelector;
			if (clickedSelector === singleMediaSelector) {
				otherSelector = singleMediaSelector + "-" + env.currentMediaIndex + " img";
				if ($(otherSelector).is(":visible")) {
					$(otherSelector).attr("src", "img/checkbox-checked-48px.png").attr("title", util._t("#unselect-single-media"));
				}
			} else if (parseInt(clickedSelector.substring(singleMediaSelector.length + 1)) === env.currentMediaIndex && $(singleMediaSelector).is(":visible")) {
				$(singleMediaSelector + " img").attr("src", "img/checkbox-checked-48px.png").attr("title", util._t("#unselect-single-media"));
			}
			this.parent.invalidatePositionsAndMediaInAlbumAndSubalbums();
		}

	};

	SingleMedia.prototype.removeFromSelection = function(clickedSelector) {
		function removeMediaFromSelectionAlbum(self) {
			env.selectionAlbum.media.splice(index, 1);

			if (self.hasGpsData()) {
				env.selectionAlbum.positionsAndMediaInTree.removeSingleMedia(self);
				env.selectionAlbum.numPositionsInTree = env.selectionAlbum.positionsAndMediaInTree.length;
			}
			var singleMediaArrayCounts = new Media([self]).imagesAndVideosCount();
			env.selectionAlbum.numsMedia.subtract(singleMediaArrayCounts);
			env.selectionAlbum.sizesOfAlbum.subtract(self.fileSizes);
			if (! self.hasGpsData()) {
				env.selectionAlbum.nonGeotagged.numsMedia.subtract(singleMediaArrayCounts);
				env.selectionAlbum.nonGeotagged.sizesOfAlbum.subtract(self.fileSizes);
			}
			if (! self.isInsideSelectedAlbums()) {
				env.selectionAlbum.numsMediaInSubTree.subtract(singleMediaArrayCounts);
				env.selectionAlbum.sizesOfSubTree.subtract(self.fileSizes);
				if (! self.hasGpsData()) {
					env.selectionAlbum.nonGeotagged.numsMediaInSubTree.subtract(singleMediaArrayCounts);
					env.selectionAlbum.nonGeotagged.sizesOfSubTree.subtract(self.fileSizes);
				}
			}
		}
		// end of auxiliary function

		if (this.isSelected()) {
			var index = env.selectionAlbum.media.findIndex(x => x.isEqual(this));

			var singleMediaSelector = "#media-select-box";
			var otherSelector;
			if (clickedSelector === singleMediaSelector) {
				otherSelector = singleMediaSelector + "-" + env.currentMediaIndex + " img";
				if ($(otherSelector).is(":visible")) {
					$(otherSelector).attr("src", "img/checkbox-unchecked-48px.png").attr("title", util._t("#select-single-media"));
				}
			} else if (parseInt(clickedSelector.substring(singleMediaSelector.length + 1)) === env.currentMediaIndex && $(singleMediaSelector).is(":visible")) {
				$(singleMediaSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", util._t("#select-single-media"));
			}

			// delete env.selectionAlbum.mediaNameSort;
			// delete env.selectionAlbum.mediaReverseSort;
			// env.selectionAlbum.sortAlbumsMedia();

			if (env.currentAlbum.isSelection()) {
				if (env.currentAlbum.isAlbumWithOneMedia()) {
					// reset the selection
					util.initializeSelectionAlbum();
					window.location.href = util.upHash();
				} else if (env.currentMedia === null) {
					// we are in album view

					let highlightedObject = util.highlightedObject();
					if (highlightedObject.children(".thumb-container").children(clickedSelector).length > 0) {
						// the clicked object is the highlighted one:
						// before removing it, highlight the previous or next object
						let nextObject;
						if (highlightedObject.parent().parent().children().length === 1 && env.currentAlbum.subalbums.length) {
							nextObject = util.prevObjectForHighlighting(highlightedObject);
							util.scrollToHighlightedSubalbum(nextObject);
						} else {
							if (highlightedObject.parent().is(":last-child"))
								nextObject = util.prevObjectForHighlighting(highlightedObject);
							else
								nextObject = util.nextObjectForHighlighting(highlightedObject);
							if (util.isPopup())
								util.scrollPopupToHighlightedThumb(nextObject);
							else
								util.scrollAlbumViewToHighlightedThumb(nextObject);
						}
					}

					// remove the single media from the selection
					removeMediaFromSelectionAlbum(this);
					// remove the single media from the page
					$(clickedSelector).parent().parent().parent().remove();

					if (env.currentAlbum.isAlbumWithOneMedia()) {
						// only one media has remained after the removal
						env.currentMedia = env.currentAlbum.media[0];
						env.currentMediaIndex = 0;
						// $("#album-and-media-container").addClass("one-media");
						// env.currentMedia.show(env.currentAlbum, "center");
						env.currentAlbum.prepareForShowing(0);
					}
					// the Lazy loaders must be re-applied, otherwise it won't work
					util.addMediaLazyLoader();
				} else {
					// we are in media view
					let clickedMediaIndex;
					let upHash = util.upHash();
					if (clickedSelector !== singleMediaSelector)
						clickedMediaIndex = parseInt(clickedSelector.split('-').pop());
					if (clickedSelector === singleMediaSelector || clickedMediaIndex === env.currentMediaIndex) {
						// currentMedia is being removed: show the album
						removeMediaFromSelectionAlbum(this);
						window.location.href = upHash;
						// env.currentAlbum.prepareForShowing(-1);
					} else {
						// another media which is not currentMedia has been removed among the bottom thumbnails:
						// keep showing the same media, but remove the media
						removeMediaFromSelectionAlbum(this);
						if (env.currentAlbum.isAlbumWithOneMedia()) {
							// only one media has remained after the removal
							window.location.href = upHash;
							// env.currentMedia = env.currentAlbum.media[0];
							// env.currentMediaIndex = 0;
							// $("#media-view").removeClass("hidden");
							// env.currentMedia.show(env.currentAlbum, "center");
							// // env.currentAlbum.prepareForShowing(0);
						} else {
							if (clickedMediaIndex < env.currentMediaIndex)
								env.currentMediaIndex --;
							env.currentAlbum.showMedia();
						}
					}
				}
			} else {
				removeMediaFromSelectionAlbum(this);
				// update the selector
				$(clickedSelector + " img").attr("src", "img/checkbox-unchecked-48px.png").attr("title", util._t("#select-single-media"));
			}
			this.parent.invalidatePositionsAndMediaInAlbumAndSubalbums();
		}
	};

	SingleMedia.prototype.chooseReducedPhoto = function(containerObject, fullScreenStatus) {
		var chosenMedia, reducedWidth, reducedHeight;
		var mediaWidth = this.metadata.size[0], mediaHeight = this.metadata.size[1];
		var mediaSize = Math.max(mediaWidth, mediaHeight);
		var mediaRatio = mediaWidth / mediaHeight, containerRatio;

		chosenMedia = this.originalMediaPath();
		env.maxSize = 0;

		if (containerObject === null) {
			// try with what is more probable to be the container
			if (fullScreenStatus)
				containerObject = $(window);
			else {
				containerObject = $(".media-box#center .media-box-inner");
			}
		}

		var containerWidth = containerObject.width();
		var containerHeight = containerObject.height();
		containerRatio = containerObject.width() / containerObject.height();

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
		var containerObject, mediaSrc;

		if (this.isVideo()) {
			if (fullScreenStatus && this.name.match(/\.avi$/) === null) {
				mediaSrc = this.originalMediaPath();
			} else {
				// .avi videos are not played by browsers, use the transcoded one
				mediaSrc = this.mediaPath("");
			}
		} else if (this.isImage()) {
			if (fullScreenStatus && Modernizr.fullscreen)
				containerObject = $(window);
			else
				containerObject = $(".media-box#" + id + " .media-box-inner");

			mediaSrc = this.chooseReducedPhoto(containerObject, fullScreenStatus);
		}

		return mediaSrc;
	};

	SingleMedia.prototype.createMediaHtml = function(album, id, fullScreenStatus) {
		// creates a media element that can be inserted in DOM (e.g. with append/prepend methods)

		// the actual sizes of the image
		var mediaWidth = this.metadata.size[0], mediaHeight = this.metadata.size[1];
		var mediaSrc, mediaElement, containerObject;
		var attrWidth = mediaWidth, attrHeight = mediaHeight;
		var singleMediaName, singleMediaTitle;

		if (this.isVideo()) {
			if (fullScreenStatus && this.name.match(/\.avi$/) === null) {
				mediaSrc = this.originalMediaPath();
			} else {
				// .avi videos are not played by browsers, use the transcoded one
				mediaSrc = this.mediaPath("");
			}

			mediaElement = $('<video/>', {controls: true });
		} else if (this.isImage()) {
			if (fullScreenStatus && Modernizr.fullscreen)
				containerObject = $(window);
			else
				containerObject = $(".media-box#" + id + " .media-box-inner");

			mediaSrc = this.chooseReducedPhoto(containerObject, fullScreenStatus);

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
			if (env.currentAlbum.isFolder()) {
				mediaElement.attr("title", this.date);
			} else {
				[singleMediaName, singleMediaTitle] = this.nameAndTitleForShowing(true);
				mediaElement.attr("title", util.pathJoin([this.albumName, singleMediaName]));
			}
		}

		mediaElement
			.attr("id", "media-" + id)
			.attr("width", attrWidth)
			.attr("height", attrHeight)
			.attr("ratio", mediaWidth / mediaHeight)
			.attr("alt", singleMediaTitle);
		if (! env.options.save_data || id === "center" || util.isLoaded(mediaSrc)) {
			mediaElement.attr("src", encodeURI(mediaSrc));
		} else {
			mediaElement.attr("data-src", encodeURI(mediaSrc));
			mediaElement.attr("src", "img/image-placeholder.jpg");
		}

		return mediaElement[0].outerHTML;
	};

	SingleMedia.prototype.createMediaLinkTag = function(mediaSrc) {
		// creates a link tag to be inserted in <head>

		if (this.isVideo()) {
			return '<link rel="video_src" href="' + encodeURI(mediaSrc) + '" />';
		} else if (this.isImage()) {
			return '<link rel="image_src" href="' + encodeURI(mediaSrc) + '" />';
		}
	};

	SingleMedia.prototype.chooseTriggerEvent = function() {
		// choose the event that must trigger the scale function

		if (this.isVideo()) {
			return "loadstart";
		} else if (this.isImage()) {
			return "load";
		}
	};

	SingleMedia.prototype.isVideo = function() {
		return this.mimeType.indexOf("video/") === 0;
	};

	SingleMedia.prototype.isImage = function() {
		return this.mimeType.indexOf("image/") === 0;
	};

	SingleMedia.prototype.originalMediaPath = function() {
		if (
			! env.options.browser_unsupported_mime_types.includes(this.mimeType) ||
			this.mimeType === "image/webp" && $("html").hasClass("webp")
		) {
			return this.trueOriginalMediaPath();
		} else {
			return util.pathJoin(["cache", this.convertedPath]);
		}
	};

	SingleMedia.prototype.trueOriginalMediaPath = function() {
		return util.pathJoin([this.albumName, this.name]);
	};

	SingleMedia.prototype.thumbnailPath = function(size, subalbumOrMedia) {
		var suffix = env.options.cache_folder_separator, cacheBase, rootString = "root-";

		var actualSize = size;
		if (env.devicePixelRatio > 1) {
			actualSize = Math.round(actualSize * env.options.mobile_thumbnail_factor);
		}
		suffix += actualSize.toString();
		if (subalbumOrMedia === "subalbum") {
			suffix += "a";
			if (env.options.album_thumb_type.indexOf("square") > -1)
				suffix += "s";
			else if (env.options.album_thumb_type.indexOf("fit") > -1)
				suffix += "f";
		} else {
			suffix += "t";
			if (env.options.media_thumb_type.indexOf("square") > -1)
				suffix += "s";
			else if (env.options.media_thumb_type.indexOf("fixed_height") > -1)
				suffix += "f";
		}
		suffix += "." + env.options.format;

		cacheBase = this.foldersCacheBase + env.options.cache_folder_separator + this.cacheBase + suffix;
		if (cacheBase.indexOf(rootString) === 0)
			cacheBase = cacheBase.substring(rootString.length);
		else {
			if (util.isFolderCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.foldersStringWithTrailingSeparator.length);
			else if (util.isByDateCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byDateStringWithTrailingSeparator.length);
			else if (util.isByGpsCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byGpsStringWithTrailingSeparator.length);
			else if (util.isSearchCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.bySearchStringWithTrailingSeparator.length);
			else if (util.isSelectionCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.bySelectionStringWithTrailingSeparator.length);
			else if (util.isMapCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byMapStringWithTrailingSeparator.length);
		}
		if (this.cacheSubdir)
			return util.pathJoin(["cache", this.cacheSubdir, cacheBase]);
		else
			return util.pathJoin(["cache", cacheBase]);
	};

	SingleMedia.prototype.mediaPath = function(size) {
		var suffix = env.options.cache_folder_separator, cacheBase, rootString = "root-";
		if (this.isImage()) {
			suffix += size.toString();
			suffix += "." + env.options.format;
		} else if (this.isVideo()) {
			suffix += "transcoded.mp4";
		}

		cacheBase = this.foldersCacheBase + env.options.cache_folder_separator + this.cacheBase + suffix;
		if (cacheBase.indexOf(rootString) === 0)
			cacheBase = cacheBase.substring(rootString.length);
		else {
			if (util.isFolderCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.foldersStringWithTrailingSeparator.length);
			else if (util.isByDateCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byDateStringWithTrailingSeparator.length);
			else if (util.isByGpsCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byGpsStringWithTrailingSeparator.length);
			else if (util.isSearchCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.bySearchStringWithTrailingSeparator.length);
			else if (util.isSelectionCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.bySelectionStringWithTrailingSeparator.length);
			else if (util.isMapCacheBase(cacheBase))
				cacheBase = cacheBase.substring(env.options.byMapStringWithTrailingSeparator.length);
		}
		if (this.cacheSubdir)
			return util.pathJoin(["cache", this.cacheSubdir, cacheBase]);
		else
			return util.pathJoin(["cache", cacheBase]);
	};

	SingleMedia.prototype.scale = function(event) {
		// this function works on the img tag identified by event.data.id
		// it adjusts width, height and position so that it fits in its parent (<div class="media-box-inner">, or the whole window)
		// and centers vertically
		var self = this;
		return new Promise(
			function(resolve_scale) {
				var mediaElement, containerObject, photoSrc, previousSrc;
				var containerHeight = $(window).innerHeight(), containerWidth = $(window).innerWidth(), containerRatio;
				var mediaWidth, mediaHeight, attrWidth, attrHeight;
				var id = event.data.id;
				var heightForMedia, heightForMediaAndTitle, titleHeight;

				if ($("#thumbs").is(":visible")) {
					// the last 6 is the top border, which is yellow for the current thumbnail when in media view
					let height = env.options.media_thumb_size + util.horizontalScrollBarThickness($("#thumbs")[0]) + 6;
					$("#thumbs").css("height", height.toString() + "px");
				}

				env.windowWidth = $(window).innerWidth();
				heightForMediaAndTitle = util.mediaBoxContainerHeight();

				// widths must be set before calculating title height
				$("#media-box-container").css("width", env.windowWidth * 3).css("transform", "translate(-" + env.windowWidth + "px, 0px)");

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

				if (self.isImage())
					mediaElement = $(".media-box#" + id + " .media-box-inner img");
				else if (self.isVideo())
					mediaElement = $(".media-box#" + id + " .media-box-inner video");

				mediaWidth = self.metadata.size[0];
				mediaHeight = self.metadata.size[1];
				attrWidth = mediaWidth;
				attrHeight = mediaHeight;

				if (env.fullScreenStatus && Modernizr.fullscreen)
					containerObject = $(window);
				else {
					containerObject = $(".media-box#" + id + " .media-box-inner");
				}

				containerHeight = heightForMedia;
				containerRatio = containerWidth / containerHeight;

				if (self.isImage()) {
					photoSrc = self.chooseReducedPhoto(containerObject, env.fullScreenStatus);
					previousSrc = mediaElement.attr("src");

					if (encodeURI(photoSrc) != previousSrc && env.currentZoom === env.initialZoom) {
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
						mediaElement.attr("width", attrWidth).attr("height", attrHeight);
						if (! env.options.save_data || id === "center" || util.isLoaded(photoSrc)) {
							mediaElement.attr("src", encodeURI(photoSrc));
						} else {
							mediaElement.attr("data-src", encodeURI(photoSrc));
							mediaElement.attr("src", "img/image-placeholder.jpg");
						}
					}
				}

				mediaElement.show();

				if (id === "center") {
					// position next/prev buttons verticallly centered in media-box-inner
					var mediaBoxInnerHeight = parseInt($(".media-box#center .media-box-inner").css("height"));
					var prevNextHeight = parseInt($("#next").outerHeight());
					$("#next, #prev").css("top", titleHeight + (mediaBoxInnerHeight - prevNextHeight) / 2);

					util.setLinksVisibility();
					if (self.isImage()) {
						if (env.currentZoom === env.initialZoom) {
							if (! event.data.pinch) {
								pS.initialize();
								util.setPinchButtonsPosition();
							}
							util.setPinchButtonsVisibility();
						}
					}
					util.setSelectButtonPosition();
					util.setDescriptionOptions();
					util.correctElementPositions();

				}

				if (id === "center") {
					if ($("#thumbs").is(":visible")) {
						util.scrollBottomMediaToHighlightedThumb(util.addMediaLazyLoader);
					}
					resolve_scale([containerHeight, containerWidth]);
				}

				$("#loading").hide();

			}
		);
	};

	SingleMedia.prototype.generateCaptionsForPopup = function(album) {
		[this.captionsForPopup, this.captionForPopupSorting, this.titleForShowing] = util.generateSingleMediaCaptionsForCollections(this, album);
	};

	SingleMedia.prototype.generateCaptionsForSelection = function(album) {
		[this.captionsForSelection, this.captionForSelectionSorting, this.titleForShowing] = util.generateSingleMediaCaptionsForCollections(this, album);
	};

	SingleMedia.prototype.generateCaptionsForSearch = function(album) {
		[this.captionsForSearch, this.captionForSearchSorting, this.titleForShowing] = util.generateSingleMediaCaptionsForCollections(this, album);
	};

	SingleMedia.prototype.nameAndTitleForShowing = function(html = false, br = false) {
		var mediaName = '';
		var mediaTitle = '';
		if (this.metadata.hasOwnProperty("title") && this.metadata.title && this.metadata.title !== this.name) {
			mediaName = this.metadata.title;
			mediaTitle = this.name;
			if (! br) {
				// remove the tags fronm the title
				mediaName = mediaName.replace(/<[^>]*>?/gm, ' ');
			}

		} else {
			mediaName = this.name;
		}
		return [mediaName, mediaTitle];
	};

	SingleMedia.prototype.hasProperty = function(property) {
		return util.hasProperty(this.metadata, property);
	};

	SingleMedia.prototype.hasSomeDescription = function(property = null) {
		return util.hasSomeDescription(this, property);
	};

	SingleMedia.prototype.setDescription = function() {
		util.setDescription(this.metadata);
	};

	SingleMedia.prototype.chooseMediaThumbnail	= function(thumbnailSize) {
		return this.thumbnailPath(thumbnailSize, "media");
	};

	SingleMedia.prototype.chooseSubalbumThumbnail	= function(thumbnailSize) {
		return this.thumbnailPath(thumbnailSize, "subalbum");
	};

	SingleMedia.prototype.toggleSelectedStatus = function(album, clickedSelector) {
		if (env.selectionAlbum.isEmpty())
			util.initializeSelectionAlbum();
		if (this.isSelected()) {
			this.removeFromSelection(clickedSelector);
			if (util.isPopup() && env.currentAlbum.isSelection()) {
				if (util.isShiftOrControl())
					$(".shift-or-control .leaflet-popup-close-button")[0].click();
				$(".media-popup .leaflet-popup-close-button")[0].click();
				if (env.mapAlbum.media.length > 1) {
					env.popupRefreshType = "mapAlbum";
					// close the map and reopen it
					$('.modal-close')[0].click();
					$(env.selectorClickedToOpenTheMap).trigger("click", ["fromTrigger"]);
				}
				if (env.mapAlbum.media.length === 1) {
					// we are in a map: close it
					$('.modal-close')[0].click();
				}
			}
			menuF.updateMenu();
			if (env.currentAlbum.isSelection() && env.currentMedia === null && ! env.currentAlbum.isAlbumWithOneMedia())
				tF.setTitle("album", null);
		} else {
			if (util.nothingIsSelected())
				util.initializeSelectionAlbum();
			this.addToSelection(album, clickedSelector);
			menuF.updateMenu();
		}
	};

	SingleMedia.prototype.show = function(album, id) {

		function loadNextPrevMedia(self, containerHeight, containerWidth) {

			$("#pinch-in").off("click").on("click", pS.pinchIn);
			$("#pinch-out").off("click").on("click", pS.pinchOut);

			let selectSrc = 'img/checkbox-unchecked-48px.png';
			let titleSelector = "#select-single-media";
			if (self.isSelected()) {
				selectSrc = 'img/checkbox-checked-48px.png';
				titleSelector = "#unselect-single-media";
			}
			$("#media-select-box .select-box").attr("title", util._t(titleSelector)).attr("alt", util._t("#selector")).attr("src", selectSrc);
			$("#media-select-box").off("click").on(
				"click",
				{singleMedia: self, clickedSelector: "#media-select-box"},
				function(ev) {
					ev.stopPropagation();
					ev.preventDefault();
					ev.data.singleMedia.toggleSelectedStatus(album, ev.data.clickedSelector);
				}
			);

			if (self.isImage()) {
				pS.addMediaGesturesDetection();
				util.setPinchButtonsPosition();
				util.setPinchButtonsVisibility();
			}
			util.setSelectButtonPosition();
			util.setDescriptionOptions();
			util.correctElementPositions();

			if (album.numsMedia.imagesAndVideosTotal() > 1) {
				env.prevMedia.show(album, 'left');
				env.nextMedia.show(album, 'right');
			}

			$(window).off("resize").on(
				"resize",
				function() {
					util.resizeSingleMediaWithPrevAndNext(self, album);
				}
			);
		}
		// end of loadNextPrevMedia auxiliary function

		//////////////////////////////////
		// beginning of SingleMedia show method body
		//////////////////////////////////
		var text, mediaSelector;
		var exposureTime, heightForMedia, heightForMediaAndTitle;
		var previousMediaIndex, nextMediaIndex, whatMedia;

		$("#downloading-media").hide();

		var [albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);

		env.mediaLink = phFl.encodeHash(env.currentAlbum.cacheBase, this, foundAlbumCacheBase, collectionCacheBase);
		env.firstEscKey = true;

		if (id === "center") {
			$(".media-bar").show();
			whatMedia = this;
			util.setNextPrevVisibility();
		} else if (id === "left") {
			whatMedia = env.prevMedia;
		} else if (id === "right") {
			whatMedia = env.nextMedia;
		}

		if (id === "center") {
			$("#media-view").removeClass("hidden");
			$("#album-and-media-container").addClass("show-media");
			if (
				! env.options.hide_bottom_thumbnails && ! env.currentAlbum.isAlbumWithOneMedia() && $("#thumbs").html() === "" ||
				env.albumOfPreviousState !== env.currentAlbum ||
				env.albumOfPreviousState !== null && env.isFromAuthForm
			) {
				env.currentAlbum.showMedia();
			} else {
				util.scrollBottomMediaToHighlightedThumb(util.addMediaLazyLoader);
			}
			env.isFromAuthForm = false;
			$("#powered-by").hide();

			$("#album-view").off('mousewheel').on('mousewheel', tF.scrollBottomThumbs);
		}

		var setTitlePromise = tF.setTitle(id, whatMedia, this);
		setTitlePromise.then(
			function titleSet(self) {
				$("#subalbums").addClass("hidden");

				heightForMediaAndTitle = util.mediaBoxContainerHeight();

				var titleHeight = 0;
				if ($(".media-box#" + id + " .title").is(":visible"))
					titleHeight = $(".media-box#" + id + " .title").outerHeight();

				heightForMedia = heightForMediaAndTitle - titleHeight;

				if (id === "center") {
					$("#media-box-container").css("width", env.windowWidth * 3).css("height", heightForMediaAndTitle);
					$("#media-box-container").css("transform", "translate(-" + env.windowWidth + "px, 0px)");
					$(".media-box").css("width", env.windowWidth).css("height", heightForMediaAndTitle);
					$(".media-box .media-box-inner").css("width", env.windowWidth).css("height", heightForMedia);
					$(".media-box").show();

					env.currentAlbum.media[env.currentMediaIndex].byDateName =
						util.pathJoin([env.currentAlbum.media[env.currentMediaIndex].dayAlbum, env.currentAlbum.media[env.currentMediaIndex].name]);
					if (env.currentAlbum.media[env.currentMediaIndex].hasOwnProperty("gpsAlbum"))
						env.currentAlbum.media[env.currentMediaIndex].byGpsName =
							util.pathJoin([env.currentAlbum.media[env.currentMediaIndex].gpsAlbum, env.currentAlbum.media[env.currentMediaIndex].name]);

					let numVisibleMedia = env.currentAlbum.numsMedia.imagesAndVideosTotal();
					let onlyShowNonGeotaggedContent = util.onlyShowNonGeotaggedContent();
					if (onlyShowNonGeotaggedContent)
						numVisibleMedia = $("#thumbs > a:not(.gps)").length;

					if (! env.currentAlbum.isAlbumWithOneMedia()) {
						// prepare for previous media
						previousMediaIndex = env.currentMediaIndex;
						while (true) {
							previousMediaIndex --;
							if (previousMediaIndex < 0)
								previousMediaIndex = env.currentAlbum.numsMedia.imagesAndVideosTotal() - 1;
							if (previousMediaIndex === env.currentMediaIndex)
								break;
							if (! onlyShowNonGeotaggedContent || ! env.currentAlbum.media[previousMediaIndex].hasGpsData()) {
								env.prevMedia = env.currentAlbum.media[previousMediaIndex];
								env.prevMedia.byDateName = util.pathJoin([env.prevMedia.dayAlbum, env.prevMedia.name]);
								if (env.prevMedia.hasOwnProperty("gpsAlbum"))
									env.prevMedia.byGpsName = util.pathJoin([env.prevMedia.gpsAlbum, env.prevMedia.name]);
								break;
							}
						}

						// prepare for next media
						nextMediaIndex = env.currentMediaIndex;
						while (true) {
							nextMediaIndex ++;
							if (nextMediaIndex > env.currentAlbum.numsMedia.imagesAndVideosTotal() - 1)
								nextMediaIndex = 0;
							if (nextMediaIndex === env.currentMediaIndex)
								break;
							if (! onlyShowNonGeotaggedContent || ! env.currentAlbum.media[nextMediaIndex].hasGpsData()) {
								env.nextMedia = env.currentAlbum.media[nextMediaIndex];
								env.nextMedia.byDateName = util.pathJoin([env.nextMedia.dayAlbum, env.nextMedia.name]);
								if (env.nextMedia.hasOwnProperty("gpsAlbum"))
									env.nextMedia.byGpsName = util.pathJoin([env.nextMedia.gpsAlbum, env.nextMedia.name]);
								break;
							}
						}
					}
				}

				var mediaBoxInnerObject = $(".media-box#" + id + " .media-box-inner");
				// empty the img container: another image will be put in there

				if (self.isVideo() && ! util.videoOK()) {
					mediaBoxInnerObject.empty();
					util.addVideoUnsupportedMarker(id);
					if (id === "center")
						loadNextPrevMedia(self);
				} else {
					let newMediaObject;
					if (self.isVideo()) {
						mediaSelector = ".media-box#" + id + " .media-box-inner video";
						newMediaObject = $("<video>");
					} else {
						mediaSelector = ".media-box#" + id + " .media-box-inner img";
						newMediaObject = $("<img>");
					}
					// is the following line correct for videos?
					let mediaSrc = self.chooseMediaReduction(id, env.fullScreenStatus);
					let mediaHtml = self.createMediaHtml(album, id, env.fullScreenStatus);

					let loadEvent = self.chooseTriggerEvent();

					if (mediaBoxInnerObject.html() !== mediaHtml) {
						// only replace the media-box-inner content if it's not yet there
						mediaBoxInnerObject.empty();
						mediaBoxInnerObject.show().append(mediaHtml);

						if (id === "center" && ! ($("link[rel=image_src]").length || $("link[rel=video_src]").length)) {
							// $("link[rel=image_src]").remove();
							// $('link[rel=video_src]').remove();
							$("head").append(self.createMediaLinkTag(mediaSrc));
						}
					}

					if (id === "center") {
						mediaBoxInnerObject.css("opacity", 1);
						self.setDescription();
					}

					// we use a trick in order to manage the loading of the image/video, from https://www.seancdavis.com/blog/wait-until-all-images-loaded/
					// the trick is to bind the event to a generic element not in the DOM, and to set its source after the onload event is bound
					newMediaObject.off(loadEvent).on(
					// $(mediaSelector).off(loadEvent).on(
						loadEvent,
						{
							id: id,
							resize: false,
						},
						function (event) {
							$(mediaSelector).off(loadEvent);
							let scalePromise = self.scale(event);
							scalePromise.then(
								function([containerHeight, containerWidth]) {
									if (id === "center") {
										loadNextPrevMedia(self, containerHeight, containerWidth);
									}
									// }
								}
							);
						}
					);
					if (! env.options.save_data || id === "center" || util.isLoaded($(mediaSelector).attr("src"))) {
						newMediaObject.attr("src", $(mediaSelector).attr("src"));
						util.setLoaded($(mediaSelector).attr("src"));
					} else {
						newMediaObject.attr("data-src", $(mediaSelector).attr("data-src"));
						newMediaObject.attr("src", $(mediaSelector).attr("src"));
						newMediaObject.addClass("lazyload-next-prev");
						$(
							function() {
								newMediaObject.Lazy(
									{
										threshold: 0,
										appendScroll: $("#media-box-container"),
										afterLoad: function(element) {
											util.setLoaded(newMediaObject.attr("src"));
										}
									}
								);
							}
						);
					}
					if (id === "center") {
						if (! env.options.persistent_metadata) {
							$(".media-box .metadata").hide();
							$(".media-box .metadata-show").show();
							$(".media-box .metadata-hide").hide();
						}
					}
				}

				if (id === "center") {
					mediaBoxInnerObject.off('contextmenu click mousewheel');
					$(".media-box#center .media-box-inner .media-bar").off();
					$("#next").off();
					$("#prev").off();

					if (self.isImage())
						mediaBoxInnerObject.off("mousewheel").on("mousewheel", pS.swipeOnWheel);

					$(".media-box#center .media-box-inner .media-bar").off("click").on(
						"click",
						function(ev) {
							ev.stopPropagation();
						}
					).off("contextmenu").on(
						"contextmenu",
						function(ev) {
							ev.stopPropagation();
						}
					);

					if (env.currentAlbum.isAlbumWithOneMedia()) {
						mediaBoxInnerObject.css('cursor', 'default');
					} else {
						[albumCacheBase, mediaCacheBase, mediaFolderCacheBase, foundAlbumCacheBase, collectionCacheBase] = phFl.decodeHash(location.hash);

						// $("#next").show();
						// $("#prev").show();
						mediaBoxInnerObject.css('cursor', '').off("contextmenu").on(
							"contextmenu",
							function(ev) {
								if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
									if (env.currentZoom === env.initialZoom) {
										ev.preventDefault();
										env.prevMedia.swipeRight();
										return false;
									}
								}
								// contextMenu = true;
								return true;
							}
						);

						$("#prev").off("click").on("click", function(ev) {
							if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
								env.prevMedia.swipeRight();
								return false;
							}
							return true;
						});
						$("#next").off("click").on("click", function(ev) {
							if (ev.button === 0 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
								env.nextMedia.swipeLeft();
								return false;
							}
							return true;
						});
					}

					var trueOriginalMediaPath = encodeURI(self.trueOriginalMediaPath());
					$(".download-single-media .download-link").attr("href", trueOriginalMediaPath).attr("download", "");
				}

				var originalMediaPath = encodeURI(self.originalMediaPath());
				$(".media-box#" + id + " .original-link").attr("target", "_blank").attr("href", originalMediaPath);
				if (self.hasGpsData()) {
					$(".media-box#" + id + " .map-link").off("click").on(
						"click",
						function() {
							$(".map-popup-trigger")[0].click();
						}
					);
					$(".media-box#" + id + " .map-link").show();
					$(".media-box#" + id + " .menu-map-divider").show();
				} else {
					$(".media-box#" + id + " .map-link").removeAttr("href");
					// $(".media-box#" + id + " .map-link").removeAttr("href").css("cursor", "pointer");
					$(".media-box#" + id + " .map-link").hide();
					$(".media-box#" + id + " .menu-map-divider").hide();
				}

				if (id === "center") {
					$(".media-box#center .metadata-show").off("click").on("click", menuF.toggleMetadataFromMouse);
					$(".media-box#center .metadata-hide").off("click").on("click", menuF.toggleMetadataFromMouse);
					$(".media-box#center .metadata").off("click").on("click", menuF.toggleMetadataFromMouse);
					$(".media-box#center .enter-fullscreen").off("click").on("click", menuF.toggleFullscreenFromMouse);
					$(".media-box#center .exit-fullscreen").off("click").on("click", menuF.toggleFullscreenFromMouse);

					// set social buttons events
					if (env.currentMedia.isVideo())
						$("#media-center").off("loadstart").on("loadstart", util.socialButtons);
					else
						$("#media-center").off("load").on("load", util.socialButtons);
				}

				$(".media-box#" + id + " .metadata tr.gps").off("click");
				text = "<table>";
				// Here we keep only the technical metadata
				if (self.metadata.hasOwnProperty("title") && self.metadata.title && self.metadata.title !== self.name)
					text += "<tr><td class='metadata-data-name'></td><td>" + self.name + "</td></tr>";
				if (self.date !== undefined)
					text += "<tr><td class='metadata-data-date'></td><td>" + self.date + "</td></tr>";
				var fileSize = self.fileSizes[0].images;
				if (self.isVideo())
					fileSize = self.fileSizes[0].videos;
				text += "<tr><td class='metadata-data-file-size'></td><td>" + util.humanFileSize(fileSize) + "</td></tr>";
				if (self.metadata.size !== undefined)
					text += "<tr><td class='metadata-data-size'></td><td>" + self.metadata.size[0] + " x " + self.metadata.size[1] + "</td></tr>";
				if (self.metadata.make !== undefined)
					text += "<tr><td class='metadata-data-make'></td><td>" + self.metadata.make + "</td></tr>";
				if (self.metadata.model !== undefined)
					text += "<tr><td class='metadata-data-model'></td><td>" + self.metadata.model + "</td></tr>";
				if (self.metadata.aperture !== undefined)
					text += "<tr><td class='metadata-data-aperture'></td><td> f/" + self.metadata.aperture + "</td></tr>";
				if (self.metadata.focalLength !== undefined)
					text += "<tr><td class='metadata-data-focalLength'></td><td>" + self.metadata.focalLength + " mm</td></tr>";
				if (self.metadata.subjectDistanceRange !== undefined)
					text += "<tr><td class='metadata-data-subjectDistanceRange'></td><td>" + self.metadata.subjectDistanceRange + "</td></tr>";
				if (self.metadata.iso !== undefined)
					text += "<tr><td class='metadata-data-iso'></td><td>" + self.metadata.iso + "</td></tr>";
				if (self.metadata.sceneCaptureType !== undefined)
					text += "<tr><td class='metadata-data-sceneCaptureType'></td><td>" + self.metadata.sceneCaptureType + "</td></tr>";
				if (self.metadata.exposureTime !== undefined) {
					if (typeof self.metadata.exposureTime === "string")
						exposureTime = self.metadata.exposureTime;
					else if (self.metadata.exposureTime > 0.3)
						exposureTime = Math.round(self.metadata.exposureTime * 10 ) / 10;
					else
						exposureTime = "1/" + Math.round(1 / self.metadata.exposureTime);
					text += "<tr><td class='metadata-data-exposureTime'></td><td>" + exposureTime + " sec</td></tr>";
				}
				if (self.metadata.exposureProgram !== undefined)
					text += "<tr><td class='metadata-data-exposureProgram'></td><td>" + self.metadata.exposureProgram + "</td></tr>";
				if (self.metadata.exposureCompensation !== undefined)
					text += "<tr><td class='metadata-data-exposureCompensation'></td><td>" + self.metadata.exposureCompensation + "</td></tr>";
				if (self.metadata.spectralSensitivity !== undefined)
					text += "<tr><td class='metadata-data-spectralSensitivity'></td><td>" + self.metadata.spectralSensitivity + "</td></tr>";
				if (self.metadata.sensingMethod !== undefined)
					text += "<tr><td class='metadata-data-sensingMethod'></td><td>" + self.metadata.sensingMethod + "</td></tr>";
				if (self.metadata.lightSource !== undefined)
					text += "<tr><td class='metadata-data-lightSource'></td><td>" + self.metadata.lightSource + "</td></tr>";
				if (self.metadata.flash !== undefined)
					text += "<tr><td class='metadata-data-flash'></td><td>" + self.metadata.flash + "</td></tr>";
				if (self.metadata.orientationText !== undefined)
					text += "<tr><td class='metadata-data-orientation'></td><td>" + self.metadata.orientationText + "</td></tr>";
				if (self.metadata.duration !== undefined)
					text += "<tr><td class='metadata-data-duration'></td><td>" + self.metadata.duration + " sec</td></tr>";
				if (self.metadata.latitude !== undefined)
					text += "<tr class='map-link-from-gps gps'><td class='metadata-data-latitude'></td><td>" + self.metadata.latitudeMS + " </td></tr>";
				if (self.metadata.longitude !== undefined)
					text += "<tr class='map-link-from-gps gps'><td class='metadata-data-longitude'></td><td>" + self.metadata.longitudeMS + " </td></tr>";
				if (self.metadata.altitude !== undefined)
					text += "<tr class='map-link-from-gps gps'><td class='metadata-data-altitude'></td><td>" + self.metadata.altitude + " m</td></tr>";
				text += "</table>";
				$(".media-box#" + id + " .metadata").html(text);
				var linkTitle = util._t('#show-map');
				if (! env.isMobile.any())
					linkTitle += " [" + util._s(".map-link") + "]";
				$(".media-box#" + id + " .metadata tr.gps").attr("title", linkTitle).off("click").on(
					"click",
					function() {
						$(".map-popup-trigger")[0].click();
					}
				);

				if (id === "center") {
					// When there is both a single media and an album, we display the media's description; else it's the album's one
					if (env.currentMedia === null || ! env.currentMedia.hasSomeDescription()) {
						env.currentAlbum.setDescription();
					} else {
						env.currentMedia.setDescription();
					}
					util.setDescriptionOptions();
					util.correctElementPositions();
					util.setMediaOptions();

					menuF.updateMenu();
				}

				util.translate();

				$("#subalbums").addClass("hidden");
				util.highlightSearchedWords();
			}
		);
	};

	SingleMedia.prototype.generateMapFromSingleMedia = function(ev, from) {
		if (this.hasGpsData()) {
			ev.preventDefault();
			var positionsAndMedia = new PositionsAndMedia([this.generatePositionAndMedia()]);
			positionsAndMedia.generateMap(ev, from);
		}
	};
}());
