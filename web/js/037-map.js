/*jshint esversion: 6 */
(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var f = new Functions();

	/* constructor */
	function MapFunctions() {
		MapFunctions.titleWrapper1 = "";
		MapFunctions.titleWrapper2 = "";
		MapFunctions.maxWidthForPopupContent = 0;
		MapFunctions.maxWidthForImagesInPopup = 0;
		MapFunctions.maxHeightForPopupContent = 0;
		MapFunctions.mymap = null;
		MapFunctions.popup = null;
	}

	MapFunctions.averagePosition = function(latLngArray) {
		var averageLatLng = L.latLng(0, 0);
		var lat, lng, countTotal = 0;
		for (var i = 0; i < latLngArray.length; i ++) {
			lat = latLngArray[i].lat;
			lng = latLngArray[i].lng;
			if (latLngArray[i].hasOwnProperty("count")) {
				lat *= latLngArray[i].count;
				lng *= latLngArray[i].count;
			}
			averageLatLng.lat += lat;
			averageLatLng.lng += lng;
			if (latLngArray[i].hasOwnProperty("count"))
				countTotal += latLngArray[i].count;
			else
				countTotal += 1;
		}
		averageLatLng.lat /= countTotal;
		averageLatLng.lng /= countTotal;

		return averageLatLng;
	};

	Album.prototype.generateHtmlForImages = function() {
		// we must get the media corresponding to the name in the point
		// var markerClass;
		var mediaIndex, mediaHash, thumbHeight, thumbWidth, width, height;
		var ithMedia, images = "", calculatedWidth, calculatedHeight, imageString, imgString, img, thumbHash, imgTitle;
		var albumViewPadding = $("#album-view").css("padding");
		if (! albumViewPadding)
			albumViewPadding = 0;
		else
			albumViewPadding = parseInt(albumViewPadding);

		for(mediaIndex = 0; mediaIndex < this.numsMedia.imagesAndVideosTotal(); mediaIndex ++) {

			ithMedia = this.media[mediaIndex];

			mediaHash = phFl.encodeHash(this.cacheBase, ithMedia);
			// var codedHashId = getCodedHashId(photosInAlbumCopy[photoIndex].element);
			thumbHash = ithMedia.chooseThumbnail(env.options.media_thumb_size);
			imgTitle = util.pathJoin([ithMedia.albumName, ithMedia.name]);

			// calculate the width and height values
			width = ithMedia.metadata.size[0];
			height = ithMedia.metadata.size[1];

			if (env.options.media_thumb_type == "fixed_height") {
				if (height < env.options.media_thumb_size) {
					thumbHeight = height;
					thumbWidth = width;
				} else {
					thumbHeight = env.options.media_thumb_size;
					thumbWidth = thumbHeight * width / height;
				}
				calculatedWidth = thumbWidth;
			} else if (env.options.media_thumb_type == "square") {
				thumbHeight = env.options.media_thumb_size;
				thumbWidth = env.options.media_thumb_size;
				calculatedWidth = env.options.media_thumb_size;
			}

			calculatedWidth = Math.min(
				calculatedWidth,
				$(window).innerWidth() - 2 * albumViewPadding
			);
			calculatedHeight = calculatedWidth / thumbWidth * thumbHeight;

			let selectSrc = 'img/checkbox-unchecked-48px.png';
			let titleSelector = "#select-single-media";
			if (ithMedia.isSelected()) {
				selectSrc = 'img/checkbox-checked-48px.png';
				titleSelector = "#unselect-single-media";
			}
			let selectBoxHtml =
				"<a id='map-media-select-box-" + mediaIndex + "'>" +
					"<img " +
						"class='select-box' " +
						"title='" + util.escapeSingleQuotes(util._t(titleSelector)) + "' " +
						"alt='" + util.escapeSingleQuotes(util._t("#selector")) + "' " +
						"src='" + selectSrc + "'" +
					">" +
				"</a>";

			imgString =	"<img " +
							"data-src='" + encodeURI(thumbHash) + "' " +
							"src='img/image-placeholder.png' " +
							"data='" +
							JSON.stringify(
								{
									width: ithMedia.metadata.size[0],
									height: ithMedia.metadata.size[1],
									albumCacheBase: this.cacheBase,
									mediaHash: mediaHash
								}
							) +
							"' " +
							"class='lazyload-popup-media thumbnail' " +
							"height='" + thumbHeight + "' " +
							"width='" + thumbWidth + "' " +
							" style='" +
								 "width: " + calculatedWidth + "px; " +
								 "height: " + calculatedHeight + "px;" +
								 "'" +
						"/>";

			img = $(imgString);
			img.attr("title", imgTitle).attr("alt", util.trimExtension(ithMedia.name));

			imageString =
				"<div class='thumb-and-caption-container' " +
					"style='" +
						"width: " + calculatedWidth + "px;";
			if (env.options.spacing)
				imageString +=
						" margin-right: " + env.options.spacingToggle + "px;" +
						" margin-bottom: " + env.options.spacingToggle + "px;";
			imageString +=
				"'>" +
					"<div class='thumb-container'" +
						" style='" +
							"width: " + calculatedWidth + "px; " +
							"height: " + calculatedHeight + "px;" +
							// "'" +
							"'>" +
						selectBoxHtml +
						"<span class='helper'></span>" +
						img.prop("outerHTML") +
					"</div>" +
					"<div class='media-caption'>" +
						"<span>" +
						ithMedia.name.replace(/ /g, "</span> <span style='white-space: nowrap;'>") +
						"</span>" +
					"</div>" +
				"</div>";

			images += imageString;
		}

		return images;
	};


	MapFunctions.prototype.updatePopup = function(imagesHtml) {
		$(".leaflet-popup-content").html(imagesHtml);
		f.setOptions();
		MapFunctions.popup.setContent($(".leaflet-popup-content").html());
		MapFunctions.calculatePopupSizes();
		$(".leaflet-popup-content").css("max-width", MapFunctions.maxWidthForPopupContent + "px");
		// $(".leaflet-popup-content").css("width", MapFunctions.);
		$("#popup-images-wrapper").css("max-height", ($(".leaflet-popup-content").outerHeight() - $("#popup-photo-count").outerHeight(true)) + "px");
		$("#popup-images-wrapper").css("max-width", MapFunctions.maxWidthForImagesInPopup + "px");
		// $("#popup-images-wrapper").css("width", MapFunctions.maxWidthForImagesInPopup);
		$("#popup-photo-count").css("max-width", MapFunctions.maxWidthForPopupContent + "px");
		// $(".leaflet-popup-content").css("max-width", MapFunctions.maxWidthForImagesInPopup).css("width", MapFunctions.maxWidthForImagesInPopup);
		MapFunctions.popup.setLatLng(MapFunctions.averagePosition(env.mapAlbum.positionsAndMediaInTree));
		MapFunctions.buildPopupHeader();

		MapFunctions.setPopupPosition();
		MapFunctions.panMap();
		MapFunctions.addLazy("img.lazyload-popup-media");
		f.updateMenu();
	};

	MapFunctions.calculatePopupSizes = function() {
		var scrollerSize = util.detectScrollbarWidth();
		if ($("#popup-images-wrapper")[0]) {
			var popupHasScrollBar = ($("#popup-images-wrapper")[0].offsetWidth !== $("#popup-images-wrapper")[0].clientWidth);
			if (popupHasScrollBar)
				scrollerSize = util.detectScrollbarWidth();
		}

		// how much space is available horizontally for the thumbnails?
		MapFunctions.maxWidthForPopupContent = parseInt($("#mapdiv").width() * 0.85);
		// the space for the images: remove the margin
		MapFunctions.maxWidthForImagesInPopup = MapFunctions.maxWidthForPopupContent - 15 - 15;
		// square thumbnails: set the value to a shorter one, in order to avoid right white space
		if (env.options.media_thumb_type == "square") {
			var thumbSize = env.options.media_thumb_size;
			var spacing = 0;
			if (env.options.spacing)
				spacing = Math.ceil(env.options.spacingToggle);
			var numThumbnailsInLine = parseInt((MapFunctions.maxWidthForImagesInPopup - scrollerSize + spacing) / (thumbSize + spacing));
			if (numThumbnailsInLine === 1)
				MapFunctions.maxWidthForImagesInPopup = thumbSize + 1;
			else
				MapFunctions.maxWidthForImagesInPopup = numThumbnailsInLine * thumbSize + numThumbnailsInLine * spacing + scrollerSize;
			MapFunctions.maxWidthForPopupContent = MapFunctions.maxWidthForImagesInPopup + 15 + 15;
		}
		// vertical popup size
		MapFunctions.maxHeightForPopupContent = parseInt($("#mapdiv").height() * 0.85);
	};

	MapFunctions.buildPopupHeader = function() {
		$("#popup-photo-count-number").html(env.mapAlbum.numsMedia.imagesAndVideosTotal());
		$("#popup-photo-count").css("max-width", MapFunctions.maxWidthForPopupContent);
		// add the click event for showing the photos in the popup as an album
		$("#popup-photo-count").on(
			"click",
			function() {
				$('.leaflet-popup-close-button')[0].click();
				// $('#popup #popup-content').html("");
				$('.modal-close')[0].click();
				env.popupRefreshType = "previousAlbum";
				env.mapRefreshType = "none";

				var promise = phFl.endPreparingAlbumAndKeepOn(
					env.mapAlbum,
					null,
					null
				);
				promise.then(
					function(){
						$("#album-view").addClass("hidden");
						$("#loading").show();
						window.location.href = "#!" + env.mapAlbum.cacheBase;
					}
				);
			}
		);
	};

	MapFunctions.setPopupPosition = function() {
		if (
			env.options.available_map_popup_positions.every(
				function(orientation) {
					return ! $(".leaflet-popup").hasClass(orientation);
				}
			)
		) {
			$(".leaflet-popup").addClass(env.options.default_map_popup_position);
		}
	};

	MapFunctions.addClickToPopupPhoto = function(element) {
		element.parent().parent().on(
			'click',
			function(ev) {
				ev.stopPropagation();
				ev.preventDefault();
				var imgData = JSON.parse(element.attr("data"));
				// called after an element was successfully handled
				$('.leaflet-popup-close-button')[0].click();
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
					if (ev.which == 2) {
						var imgData = JSON.parse(element.attr("data"));
						util.openInNewTab(imgData.mediaHash);
						return false;
					}
				}
			);
		}

		var mediaBoxSelectElement = element.siblings('a');
		var id = mediaBoxSelectElement.attr("id");
		mediaBoxSelectElement.on(
			'click',
			{id: id},
			function(ev) {
				var imgData = JSON.parse(element.attr("data"));
				ev.stopPropagation();
				var cachedAlbum = env.cache.getAlbum(imgData.albumCacheBase);
				for (let iMedia = 0; iMedia < cachedAlbum.media.length; iMedia ++) {
					if (imgData.mediaHash.split('/').pop() == cachedAlbum.media[iMedia].cacheBase) {
						ev.stopPropagation();
						ev.preventDefault();
						cachedAlbum.media[iMedia].toggleSelectedStatus(mapAlbum, '#' + id);
						break;
					}
				}
			}
		);
	};

	MapFunctions.addLazy = function(selector) {
		$(function() {
			$(selector).Lazy(
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
		});
	};

	MapFunctions.panMap = function() {
		// pan the map so that the popup is inside the map
		var popupPosition = MapFunctions.mymap.latLngToContainerPoint(MapFunctions.popup.getLatLng());
		var popupWidth = $(".leaflet-popup-content-wrapper").width();
		var popupHeight = $(".leaflet-popup-content-wrapper").height();
		var mapWidth = $("#mapdiv").width();
		var mapHeight = $("#mapdiv").height();
		var panX = 0, panY = 0;
		if (popupPosition.x + popupWidth > mapWidth) {
			panX = popupWidth - (mapWidth - popupPosition.x);
		} else if (popupPosition.x < 0)
			panX = popupPosition.x - 50;

		if (popupPosition.y + popupHeight > mapHeight) {
			panY = popupHeight - (mapHeight - popupPosition.y) + 50;
		} else if (popupPosition.y < 0)
			panY = popupPosition.y - 20;
		MapFunctions.mymap.panBy([panX, panY], {animate: false});
	};

	MapFunctions.prototype.addPopupMover = function() {
		// add the popup mover
		$(".popup-mover").remove();
		$(".leaflet-popup-close-button").after('<a id="popup-mover" class="popup-mover"></a>');
		// add the corresponding listener
		$(".popup-mover").on(
			"click",
			function() {
				var currentIndex = env.options.available_map_popup_positions.findIndex(
					function(orientation) {
						return $(".leaflet-popup").hasClass(orientation);
					}
				);
				var nextIndex = currentIndex + 1;
				if (currentIndex == env.options.available_map_popup_positions.length - 1)
					nextIndex = 0;
				$(".leaflet-popup").
					removeClass(env.options.available_map_popup_positions[currentIndex]).
					addClass(env.options.available_map_popup_positions[nextIndex]);
				return false;
			}
		);

		$(".leaflet-popup-content").css("max-height", parseInt(env.windowHeight * 0.8)).css("max-width", parseInt(env.windowWidth * 0.8));
		MapFunctions.setPopupPosition();
	};

	Album.prototype.addMediaFromPositionsToMapAlbum = function(positionsAndCounts, resolve_imageLoad) {

		var mediaListElement, indexPositions, indexPhoto, markerClass, photoIndex, mediaIndex;
		var photosByAlbum = {}, positionsAndCountsElement;
		var self = this;

		// in order to add the html code for the images to a string,
		// we group the photos by album: this way we rationalize the process of getting them
		for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
			positionsAndCountsElement = positionsAndCounts[indexPositions];
			markerClass = getMarkerClass(positionsAndCountsElement);
			for (indexPhoto = 0; indexPhoto < positionsAndCountsElement.mediaList.length; indexPhoto ++) {
				mediaListElement = positionsAndCountsElement.mediaList[indexPhoto];
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
						var getAlbumPromise = phFl.getAlbum(foldersCacheBase, util.errorThenGoUp, {getMedia: true, getPositions: true});
						getAlbumPromise.then(
							function(theAlbum) {
								for (mediaIndex = 0; mediaIndex < theAlbum.numsMedia.imagesAndVideosTotal(); mediaIndex ++) {
									for (photoIndex = 0; photoIndex < photosInAlbum.length; photoIndex ++) {
										if (theAlbum.media[mediaIndex].cacheBase == photosInAlbum[photoIndex].element.cacheBase) {
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
				self.positionsAndMediaInTree.mergePositionsAndMedia(positionsAndCounts);
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

	L.NumberedDivIcon = L.Icon.extend({
		options: {
			// EDIT THIS TO POINT TO THE FILE AT http://www.charliecroom.com/marker_hole.png (or your own marker)
			iconUrl: 'css/images/marker_hole.png',
			number: '',
			shadowUrl: null,
			iconSize: new L.Point(25, 41),
			iconAnchor: new L.Point(13, 41),
			popupAnchor: new L.Point(0, -33),
			/*
			iconAnchor: (Point)
			popupAnchor: (Point)
			*/
			className: 'leaflet-div-icon'
		},

		createIcon: function () {
			var div = document.createElement('div');
			var img = this._createImg(this.options.iconUrl);
			var numdiv = document.createElement('div');
			numdiv.setAttribute ( "class", "number" );
			numdiv.innerHTML = this.options.number || '';
			div.appendChild ( img );
			div.appendChild ( numdiv );
			this._setIconStyles(div, 'icon');
			return div;
		},

		//you could change this to add a shadow like in the normal marker if you really wanted
		createShadow: function () {
			return null;
		}
	});

	window.MapFunctions = MapFunctions;
}());
