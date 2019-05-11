(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var f = new Functions();

	/* constructor */
	function MapFunctions() {
		MapFunctions.titleWrapper1 = "";
		MapFunctions.titleWrapper2 = "";
		MapFunctions.maxWidthForThumbnails = 0;
		MapFunctions.mymap = null;
		MapFunctions.popup = null;
		MapFunctions.mapAlbum = {};
	}

	// MapFunctions.prototype. = function() {
	// };

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

	MapFunctions.generateHtmlForImages = function(theAlbum) {
		// we must get the media corresponding to the name in the point
		// var markerClass;
		var mediaIndex, mediaHash, thumbHeight, thumbWidth, width, height, hideThumbnail;
		var selectedMedia, images = "", calculatedWidth, calculatedHeight, imageString, thumbHash, imgTitle;
		var albumViewPadding = $("#album-view").css("padding");
		if (! albumViewPadding)
			albumViewPadding = 0;
		else
			albumViewPadding = parseInt(albumViewPadding);

		for(mediaIndex = 0; mediaIndex < theAlbum.media.length; mediaIndex ++) {

			selectedMedia = theAlbum.media[mediaIndex];

			mediaHash = phFl.encodeHash(theAlbum, selectedMedia);
			// var codedHashId = getCodedHashId(photosInAlbumCopy[photoIndex].element);
			thumbHash = util.chooseThumbnail(theAlbum, selectedMedia, Options.media_thumb_size);
			imgTitle = util.pathJoin([selectedMedia.albumName, selectedMedia.name]);

			// calculate the width and height values
			width = selectedMedia.metadata.size[0];
			height = selectedMedia.metadata.size[1];

			if (Options.media_thumb_type == "fixed_height") {
				if (height < Options.media_thumb_size) {
					thumbHeight = height;
					thumbWidth = width;
				} else {
					thumbHeight = Options.media_thumb_size;
					thumbWidth = thumbHeight * width / height;
				}
				calculatedWidth = thumbWidth;
			} else if (Options.media_thumb_type == "square") {
				thumbHeight = Options.media_thumb_size;
				thumbWidth = Options.media_thumb_size;
				calculatedWidth = Options.media_thumb_size;
			}

			calculatedWidth = Math.min(
				calculatedWidth,
				$(window).innerWidth() - 2 * albumViewPadding
			);
			calculatedHeight = calculatedWidth / thumbWidth * thumbHeight;

			imageString =
				// "<div id='" + codedHashId + "' class='thumb-and-caption-container " + markerClass +"' ";
				"<div class='thumb-and-caption-container' ";
			imageString +=
					"style='" +
						"width: " + calculatedWidth + "px;";
			if (Options.spacing)
				imageString +=
					"style='" +
						"margin-right: " + Options.spacingToggle + "px; " +
						"margin-bottom: " + Options.spacingToggle + "px;";
			imageString += "'>";
			imageString +=
					"<div class='thumb-container'" +
						" style='" +
							"width: " + calculatedWidth + "px; " +
							"height: " + calculatedHeight + "px;" +
							"'" +
						"'>" +
							"<span class='helper'></span>" +
							"<img title='" + imgTitle + "' " +
								"alt='" + util.trimExtension(selectedMedia.name) + "' ";
			hideThumbnail = phFl.isProtected(selectedMedia);
			if (! hideThumbnail)
				imageString +=
								"data-src='" + encodeURI(thumbHash) + "' ";
			imageString +=
								"src='img/image-placeholder.png' " +
								"data='" +
								JSON.stringify(
									{
										"width": selectedMedia.metadata.size[0],
										"height": selectedMedia.metadata.size[1],
										"mediaHash": mediaHash
									}
								) +
								"' " +
								"class='lazyload-popup-media thumbnail";
			if (hideThumbnail)
				imageString += " add-click-immediately";
			imageString +=
								"' " +
								"height='" + thumbHeight + "' " +
								"width='" + thumbWidth + "' " +
								" style='" +
									 "width: " + calculatedWidth + "px; " +
									 "height: " + calculatedHeight + "px;" +
									 "'" +
								"/>" +
					"</div>" +
					"<div class='media-caption'>" +
						"<span>" +
						selectedMedia.name.replace(/ /g, "</span> <span style='white-space: nowrap;'>") +
						"</span>" +
					"</div>" +
				"</div>";


			// $("#popup-images-wrapper").html(imageString);
			images += imageString;
		}

		return images;
	};


	MapFunctions.updatePopup = function(images) {
		$(".leaflet-popup-content").html(images);
		f.setOptions();
		MapFunctions.popup.setContent($(".leaflet-popup-content").html());
		MapFunctions.getImagesWrapperSizes();
		$(".leaflet-popup-content").css("max-width", MapFunctions.maxWidthForThumbnails);
		// $(".leaflet-popup-content").css("width", MapFunctions.maxWidthForThumbnails);
		$("#popup-images-wrapper").css("max-height", parseInt($(".leaflet-popup-content").css("height")) - 35);
		$("#popup-images-wrapper").css("max-width", MapFunctions.maxWidthForThumbnails);
		// $("#popup-images-wrapper").css("width", MapFunctions.maxWidthForThumbnails);
		$("#popup-photo-count").css("max-width", MapFunctions.maxWidthForThumbnails);
		// $(".leaflet-popup-content").css("max-width", MapFunctions.maxWidthForThumbnails).css("width", MapFunctions.maxWidthForThumbnails);
		MapFunctions.popup.setLatLng(MapFunctions.averagePosition(MapFunctions.mapAlbum.positionsAndMediaInTree));
		MapFunctions.buildPopupHeader();

		MapFunctions.setPopupPosition();
		MapFunctions.panMap();
		MapFunctions.addLazy("img.lazyload-popup-media");
		// add the click event to the protected thumbnails
		$(".add-click-immediately").each(
			function() {
				MapFunctions.addClickToPopupPhoto($(this));
			}
		);
	};

	MapFunctions.getImagesWrapperSizes = function() {
		// how much space is available horizontally for the thumbnails?
		MapFunctions.maxWidthForThumbnails = parseInt($("#mapdiv").width() * 0.8);
		// square thumbnails: set the value to a shorter one, in order to avoid right white space
		if (Options.media_thumb_type == "square") {
			var thumb_size = Options.media_thumb_size;
			if (Options.spacing)
				thumb_size += Options.spacingToggle;
			MapFunctions.maxWidthForThumbnails = parseInt(MapFunctions.maxWidthForThumbnails / thumb_size) * thumb_size;
			// add a constant for the scroller
			MapFunctions.maxWidthForThumbnails += 18;
		}
		// vertical popup size
		maxHeightForThumbnails = parseInt($("#mapdiv").height() * 0.8);
	};

	MapFunctions.buildPopupHeader = function() {
		$("#popup-photo-count-number").html(MapFunctions.mapAlbum.media.length);
		$("#popup-photo-count").css("max-width", MapFunctions.maxWidthForThumbnails);
		// add the click event for showing the photos in the popup as an album
		$("#popup-photo-count").on(
			"click",
			function(ev) {
				$('.leaflet-popup-close-button')[0].click();
				// $('#popup #popup-content').html("");
				$('.modal-close')[0].click();

				phFl.endPreparingAlbumAndKeepOn(MapFunctions.mapAlbum, null,
					 function(){
						 $("#album-view").addClass("hidden");
						 $("#loading").show();
						 window.location.href = "#!" + MapFunctions.mapAlbum.cacheBase;
					 }
				);
			}
		);
	};

	MapFunctions.setPopupPosition = function() {
		if (
			Options.available_map_popup_positions.every(
				function(orientation) {
					return ! $(".leaflet-popup").hasClass(orientation);
				}
			)
		) {
			$(".leaflet-popup").addClass(Options.default_map_popup_position);
		}
	};

	MapFunctions.addClickToPopupPhoto = function(element) {
		element.parent().parent().on(
			'click',
			function() {
				var imgData = JSON.parse(element.attr("data"));
				// called after an element was successfully handled
				$('.leaflet-popup-close-button')[0].click();
				// $('#popup #popup-content').html("");
				$('.modal-close')[0].click();
				window.location.href = imgData.mediaHash;
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
					threshold: Options.media_thumb_size,
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
		MapFunctions.mymap.panBy([panX, panY], {"animate": false});
	};

	MapFunctions.prototype.addPopupMover = function() {
		// add the popup mover
		$(".popup-mover").remove();
		$(".leaflet-popup-close-button").after('<a id="popup-mover" class="popup-mover"></a>');
		// add the corresponding listener
		$(".popup-mover").on(
			"click",
			function() {
				var currentIndex = Options.available_map_popup_positions.findIndex(
					function(orientation) {
						return $(".leaflet-popup").hasClass(orientation);
					}
				);
				var nextIndex = currentIndex + 1;
				if (currentIndex == Options.available_map_popup_positions.length - 1)
					nextIndex = 0;
				$(".leaflet-popup").
					removeClass(Options.available_map_popup_positions[currentIndex]).
					addClass(Options.available_map_popup_positions[nextIndex]);
				return false;
			}
		);

		$(".leaflet-popup-content").css("max-height", parseInt(windowHeight * 0.8)).css("max-width", parseInt(windowWidth * 0.8));
		MapFunctions.setPopupPosition();
	};

	MapFunctions.prototype.initializeMapAlbum = function(mapAlbumHash) {
		// initializes the map album
		var album = {};
		album.positionsAndMediaInTree = [];
		album.media = [];
		album.subalbums = [];
		album.cacheBase = Options.by_map_string + Options.cache_folder_separator + mapAlbumHash + Options.cache_folder_separator + currentAlbum.cacheBase;
		album.path = album.cacheBase.replace(Options.cache_folder_separator, "/");
		album.physicalPath = album.path;
		album.searchInFolderCacheBase = currentAlbum.cacheBase;

		return album;
	};

	MapFunctions.addMediaFromPositionsToMapAlbum = function(positionsAndCounts, mapAlbum, resolve) {

		function getMarkerClass(positionAndCount) {
			var imgClass =
				"popup-img-" +
				(positionAndCount.lat / 1000).toString().replace('.', '') +
				'-' +
				(positionAndCount.lng / 1000).toString().replace('.', '');
			return imgClass;
		}

		var mediaNameListElement, indexPositions, indexPhoto, markerClass, photoIndex, mediaIndex;
		var albumsToGet = 0, albumsGot = 0, photosByAlbum = {}, positionsAndCountsElement, photosInAlbum;

		// in order to add the html code for the images to a string,
		// we group the photos by album: this way we rationalize the process of getting them
		for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
			positionsAndCountsElement = positionsAndCounts[indexPositions];
			markerClass = getMarkerClass(positionsAndCountsElement);
			for (indexPhoto = 0; indexPhoto < positionsAndCountsElement.mediaNameList.length; indexPhoto ++) {
				mediaNameListElement = positionsAndCountsElement.mediaNameList[indexPhoto];
				if (! photosByAlbum.hasOwnProperty(mediaNameListElement.albumCacheBase)) {
					photosByAlbum[mediaNameListElement.albumCacheBase] = [];
					albumsToGet ++;
				}
				photosByAlbum[mediaNameListElement.albumCacheBase].push(
					{
						"element": mediaNameListElement,
						"markerClass": markerClass
					}
				);
			}
		}

		// ok, now we can interate over the object we created and add the media to the map album
		for (var albumCacheBase in photosByAlbum) {
			if (photosByAlbum.hasOwnProperty(albumCacheBase)) {
				photosInAlbum = photosByAlbum[albumCacheBase];
				phFl.getAlbum(
					albumCacheBase,
					function(theAlbum, photosInAlbum) {
						for(mediaIndex = 0; mediaIndex < theAlbum.media.length; mediaIndex ++) {
							for(photoIndex = 0; photoIndex < photosInAlbum.length; photoIndex ++) {
								if (theAlbum.media[mediaIndex].cacheBase == photosInAlbum[photoIndex].element.cacheBase) {
									mapAlbum.media.push(theAlbum.media[mediaIndex]);
								}
							}
						}

						albumsGot ++;
						if (albumsGot == albumsToGet) {
							mapAlbum.positionsAndMediaInTree = util.mergePoints(mapAlbum.positionsAndMediaInTree, positionsAndCounts);
							resolve(mapAlbum);
						}
					},
					util.die,
					photosInAlbum,
					null
				);
			}
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

	MapFunctions.prototype.updatePopup = MapFunctions.prototype.updatePopup;
	MapFunctions.prototype.generateHtmlForImages = MapFunctions.prototype.generateHtmlForImages;
	window.MapFunctions = MapFunctions;
}());
