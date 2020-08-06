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

	MapFunctions.prototype.generateHtmlForImages = function(theAlbum) {
		// we must get the media corresponding to the name in the point
		// var markerClass;
		var mediaIndex, mediaHash, albumCacheBase, thumbHeight, thumbWidth, width, height;
		var ithMedia, images = "", calculatedWidth, calculatedHeight, imageString, imgString, img, thumbHash, imgTitle;
		var albumViewPadding = $("#album-view").css("padding");
		if (! albumViewPadding)
			albumViewPadding = 0;
		else
			albumViewPadding = parseInt(albumViewPadding);

		for(mediaIndex = 0; mediaIndex < util.imagesAndVideosTotal(theAlbum.numMedia); mediaIndex ++) {

			ithMedia = theAlbum.media[mediaIndex];

			mediaHash = phFl.encodeHash(theAlbum, ithMedia);
			albumCacheBase = theAlbum.cacheBase;
			// var codedHashId = getCodedHashId(photosInAlbumCopy[photoIndex].element);
			thumbHash = util.chooseThumbnail(theAlbum, ithMedia, Options.media_thumb_size);
			imgTitle = util.pathJoin([ithMedia.albumName, ithMedia.name]);

			// calculate the width and height values
			width = ithMedia.metadata.size[0];
			height = ithMedia.metadata.size[1];

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

			selectSrc = 'img/checkbox-unchecked-48px.png';
			if (util.singleMediaIsSelected(ithMedia)) {
				selectSrc = 'img/checkbox-checked-48px.png';
			}
			selectBoxHtml =
				"<a id='media-select-box-" + mediaIndex + "'>" +
					"<img " +
						"class='select-box' " +
						"title='" + util.escapeSingleQuotes(util._t("#select-single-media")) + "' " +
						"alt='" + util.escapeSingleQuotes(util._t("#select-single-media")) + "' " +
						"src='" + selectSrc + "'" +
					">" +
				"</a>";

			imgString =	"<img " +
							"data-src='" + encodeURI(thumbHash) + "' " +
							"src='img/image-placeholder.png' " +
							"data='" +
							JSON.stringify(
								{
									"width": ithMedia.metadata.size[0],
									"height": ithMedia.metadata.size[1],
									"albumCacheBase": albumCacheBase,
									"mediaHash": mediaHash
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
							// "'" +
							"'>" +
						selectBoxHtml +
						"<span class='helper'></span>" +
						img.prop("outerHTML") +
					"</div>" +
					"<div class='media-caption'>" +
						"<span>";
			imageString +=
						ithMedia.name.replace(/ /g, "</span> <span style='white-space: nowrap;'>");
			imageString +=
						"</span>" +
					"</div>" +
				"</div>";


			// $("#popup-images-wrapper").html(imageString);
			images += imageString;
		}

		return images;
	};


	MapFunctions.prototype.updatePopup = function(images) {
		$(".leaflet-popup-content").html(images);
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
		MapFunctions.popup.setLatLng(MapFunctions.averagePosition(mapAlbum.positionsAndMediaInTree));
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
		if (Options.media_thumb_type == "square") {
			var thumbSize = Options.media_thumb_size;
			var spacing = 0;
			if (Options.spacing)
				spacing = Math.ceil(Options.spacingToggle);
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
		$("#popup-photo-count-number").html(util.imagesAndVideosTotal(mapAlbum.numMedia));
		$("#popup-photo-count").css("max-width", MapFunctions.maxWidthForPopupContent);
		// add the click event for showing the photos in the popup as an album
		$("#popup-photo-count").on(
			"click",
			function() {
				$('.leaflet-popup-close-button')[0].click();
				// $('#popup #popup-content').html("");
				$('.modal-close')[0].click();
				popupRefreshType = "previousAlbum";
				mapRefreshType = "none";

				var promise = phFl.endPreparingAlbumAndKeepOn(
					mapAlbum,
					null,
					null
				);
				promise.then(
					function(){
						$("#album-view").addClass("hidden");
						$("#loading").show();
						window.location.href = "#!" + mapAlbum.cacheBase;
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
				popupRefreshType = "previousAlbum";
				mapRefreshType = "none";
				window.location.href = imgData.mediaHash;
			}
		);
		var mediaBoxSelectElement = element.siblings('a');
		var id = mediaBoxSelectElement.attr("id");
		mediaBoxSelectElement.on(
			'click',
			{id: id},
			function(ev) {
				var imgData = JSON.parse(element.attr("data"));
				ev.stopPropagation();
				var album = phFl.getAlbumFromCache(imgData.albumCacheBase);
				for (iMedia = 0; iMedia < album.media.length; iMedia ++) {
					if (imgData.mediaHash.split('/').pop() == album.media[iMedia].cacheBase) {
						TopFunctions.toggleSelectedMedia(album.media[iMedia], '#' + id);
						break;
					}
				}
				// var getAlbumPromise = PhotoFloat.getAlbum(imgData.albumCacheBase, null, {"getMedia": true, "getPositions": false});
				// getAlbumPromise.then(
				// 	function(album) {
				// 		for (iMedia = 0; iMedia < album.media.length; iMedia ++) {
				// 			if (imgData.mediaHash.split('/').pop() == album.media[iMedia].cacheBase) {
				// 				TopFunctions.toggleSelectedMedia(album.media[iMedia], 'a');
				// 				break;
				// 			}
				// 		}
				// 	}
				// );
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

	MapFunctions.addMediaFromPositionsToMapAlbum = function(positionsAndCounts, thisMapAlbum, resolve_imageLoad) {

		var mediaNameListElement, indexPositions, indexPhoto, markerClass, photoIndex, mediaIndex;
		var photosByAlbum = {}, positionsAndCountsElement;

		// in order to add the html code for the images to a string,
		// we group the photos by album: this way we rationalize the process of getting them
		for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
			positionsAndCountsElement = positionsAndCounts[indexPositions];
			markerClass = getMarkerClass(positionsAndCountsElement);
			for (indexPhoto = 0; indexPhoto < positionsAndCountsElement.mediaNameList.length; indexPhoto ++) {
				mediaNameListElement = positionsAndCountsElement.mediaNameList[indexPhoto];
				if (! photosByAlbum.hasOwnProperty(mediaNameListElement.albumCacheBase)) {
					photosByAlbum[mediaNameListElement.albumCacheBase] = [];
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
		var cacheBasesPromises = [];
		for (var albumCacheBase in photosByAlbum) {
			if (photosByAlbum.hasOwnProperty(albumCacheBase)) {
				let cacheBasePromise = new Promise(
					function(resolve_cacheBasePromise) {
						let photosInAlbum = photosByAlbum[albumCacheBase];
						var getAlbumPromise = phFl.getAlbum(albumCacheBase, util.errorThenGoUp, {"getMedia": true, "getPositions": true});
						getAlbumPromise.then(
							function(theAlbum) {
								for (mediaIndex = 0; mediaIndex < util.imagesAndVideosTotal(theAlbum.numMedia); mediaIndex ++) {
									for (photoIndex = 0; photoIndex < photosInAlbum.length; photoIndex ++) {
										if (theAlbum.media[mediaIndex].cacheBase == photosInAlbum[photoIndex].element.cacheBase) {
											thisMapAlbum.media.push(theAlbum.media[mediaIndex]);
											thisMapAlbum.sizesOfAlbum = util.sumSizes(thisMapAlbum.sizesOfAlbum, theAlbum.media[mediaIndex].fileSizes);
											thisMapAlbum.sizesOfSubTree = util.sumSizes(thisMapAlbum.sizesOfSubTree, theAlbum.media[mediaIndex].fileSizes);
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
				thisMapAlbum.positionsAndMediaInTree = util.mergePositionsAndMedia(thisMapAlbum.positionsAndMediaInTree, positionsAndCounts);
				resolve_imageLoad(thisMapAlbum);
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
