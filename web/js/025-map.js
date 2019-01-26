(function() {

  var phFl = new PhotoFloat();
  var util = new Utilities();

	/* constructor */
	function MapFunctions() {
	}

  // MapFunctions.prototype. = function() {
  // };

  MapFunctions.prototype.generateMapFromMedia = function(ev) {
		if (util.hasGpsData(ev.data.media)) {
			ev.preventDefault();
			var point =
				{
					'long': parseFloat(ev.data.media.metadata.longitude),
					'lat' : parseFloat(ev.data.media.metadata.latitude),
					'mediaNameList': [{
						'name': ev.data.media.albumName,
						'cacheBase': ev.data.media.cacheBase,
						'albumCacheBase': ev.data.album.cacheBase
					}]
				};
			generateMap([point]);
		}
	};

	MapFunctions.prototype.generateMapFromSubalbum = function(ev) {
		if (ev.data.subalbum.positionsAndMediaInTree) {
			ev.stopPropagation();
			ev.preventDefault();
			generateMap(ev.data.subalbum.positionsAndMediaInTree);
		} else {
			$("#warning-no-geolocated-media").stop().fadeIn(200);
			$("#warning-no-geolocated-media").fadeOut(3000);
		}
	};

	MapFunctions.prototype.generateMapFromDefaults = function() {
		var pointList = [];

		if (currentMedia !== null && util.hasGpsData(currentMedia))
			pointList = [
				{
					'long': parseFloat(currentMedia.metadata.longitude),
					'lat' : parseFloat(currentMedia.metadata.latitude),
					'mediaNameList': [{
						'name': currentMedia.albumName,
						'cacheBase': currentMedia.cacheBase,
						'albumCacheBase': currentAlbum.cacheBase
					}]
				}
			];
		else if (currentAlbum.positionsAndMediaInTree)
			pointList = currentAlbum.positionsAndMediaInTree;

		if (pointList != [])
			generateMap(pointList);
	};

	function generateMap(pointList) {
		// pointList is an array of uniq points with a list of the media geolocated there
		if(pointList) {
			// calculate the center
			var center = {'lat': 0, 'long': 0};
			for (var i = 0; i < pointList.length; ++i) {
				center.lat += pointList[i].lat;
				center.long += pointList[i].long;
			}
			center.lat /= pointList.length;
			center.long /= pointList.length;

			// default zoom is used for single media or media list with one point
			var maxDistance = Options.photo_map_size;
			if (pointList.length > 1) {
				// calculate the maximum distance from the center
				// it's needed in order to calculate the zoom level
				maxDistance = 0;
				for (i = 0; i < pointList.length; ++i) {
					maxDistance = Math.max(maxDistance, Math.abs(util.distanceBetweenCoordinatePoints(center, pointList[i])));
				}
			}
			// calculate the zoom level needed in order to have all the points inside the map
			// see https://wiki.openstreetmap.org/wiki/Zoom_levels
			// maximum OSM zoom is 19
			var earthCircumference = 40075016;
			var zoom = Math.min(19, parseInt(Math.log2((Math.min(windowWidth, windowHeight) / 2 * 0.95) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxDistance)));

			$('.map-container').show();
			var markersList = [];

			// add the popup code after the #mapdiv element
			// this code cannot be put in index.html/php file, because the "new ol.Overlay()" code removes it (why!?!?!?)
			$("#mapdiv").after(
				'<div id="popup" class="ol-popup">\n' +
				'  <a href="#" id="popup-closer" class="ol-popup-closer"></a>\n' +
				'  <a href="#" id="popup-mover" class="ol-popup-mover"></a>\n' +
				'  <div id="popup-content"></div>\n' +
				'</div>'
			);
			// set this correct value, when showing the popup it was changed in order to show the popup in the right position
			$("#mapdiv .ol-overlaycontainer-stopevent").css("position", "absolute");

			/**
       * Elements that make up the popup.
       */
      var container = document.getElementById('popup');
      var content = document.getElementById('popup-content');
      var closer = document.getElementById('popup-closer');
      var mover = document.getElementById('popup-mover');

      /**
       * Create an overlay to anchor the popup to the map.
       */
      var overlay = new ol.Overlay({
        element: container,
        autoPan: true,
        autoPanAnimation: {
          duration: 250
        }
      });

			/**
       * Add a click handler to hide the popup.
       * @return {boolean} Don't follow the href.
       */
      closer.onclick = function() {
        overlay.setPosition(undefined);
				// set this correct value, when showing the popup it was changed in order to show the popup in the right position
				$("#mapdiv .ol-overlaycontainer-stopevent").css("position", "absolute");
        closer.blur();
        return false;
      };

      mover.onclick = function() {
				var currentIndex = Options.available_map_popup_positions.findIndex(
					function(orientation) {
						return $(".ol-popup").hasClass(orientation);
					}
				);
				var nextIndex = currentIndex + 1;
				if (currentIndex == Options.available_map_popup_positions.length - 1)
					nextIndex = 0;
				$(".ol-popup").
					removeClass(Options.available_map_popup_positions[currentIndex]).
					addClass(Options.available_map_popup_positions[nextIndex]);
        return false;
      };

			// create the map with the proper center
			var map = new ol.Map(
				{
					controls: ol.control.defaults().extend(
						[
							new ol.control.ScaleLine()
						]
					),
					view: new ol.View(
						{
							center: ol.proj.fromLonLat([center.long, center.lat]),
							zoom: zoom
						}
					),
					overlays: [overlay],
					layers: [
						new ol.layer.Tile(
							{
								source: new ol.source.OSM()
							}
						)
					],
					target: 'mapdiv',
					keyboardEventTarget: document
				}
			);

			// the style for the markers
			var markerStyle = new ol.style.Style({
							image: new ol.style.Icon(/** @type {module:ol/style/Icon~Options} */ ({
								anchor: [0.5, 1],
								anchorXUnits: 'fraction',
								anchorYUnits: 'fraction',
								scale: 0.4,
								src: 'img/red_marker_31x44.png'
								// color: 'red'
							}))
						});

			for (i = 0; i < pointList.length; ++i) {
				// add the marker
				markersList[i] = new ol.Feature({
					geometry: new ol.geom.Point(ol.proj.fromLonLat([pointList[i].long, pointList[i].lat]))
				});
				// apply the style to the marker
				markersList[i].setStyle(markerStyle);
			}

			// generate the markers vector
			var markers = new ol.source.Vector({
					features: markersList
			});

			// generate the markers layer
			var markerVectorLayer = new ol.layer.Vector({
					source: markers,
			});

			// add the markers layer to the map
			map.addLayer(markerVectorLayer);

      var usedWidthForThumbnails;
      var start = 0;

			/**
			 * Add a click handler to the map to render the popup.
			 */
			map.on('singleclick', function(evt) {
				var clickedPosition = ol.proj.toLonLat(evt.coordinate), i;
        var br = '<br />';
				// console.log(clickedPosition, pointList);

				// decide what point is to be used: the nearest to the clicked position
				var minimumDistance = false, newMinimumDistance, distance, index;
				for(i = 0; i < pointList.length; i ++) {
					distance = Math.abs(util.distanceBetweenCoordinatePoints({long: clickedPosition[0], lat: clickedPosition[1]}, pointList[i]));
					// console.log(i, distance);
					if (minimumDistance === false) {
						minimumDistance = distance;
						index = i;
					} else {
						newMinimumDistance = Math.min(minimumDistance, distance);
						if (newMinimumDistance != minimumDistance) {
							minimumDistance = newMinimumDistance;
							index = i;
						}
					}
				}

				// how much space is available horizontally for the thumbnails?
				var maxWidthForThumbnails = parseInt($("#mapdiv").width() * 0.8);
        var indexMediaInDOM;

        if (evt.originalEvent.shiftKey || evt.originalEvent.ctrlKey) {
          // get the space used by the thumbnails
          usedWidthForThumbnails = $("#popup-content").width();
          start = $("#popup .thumb-and-caption-container").length;
        } else {
          // reset the thumbnails if not shift- nor ctrl-clicking
  				content.innerHTML = '';
          usedWidthForThumbnails = 0;
        }

				// console.log(index, clickedPosition, pointList[index], minimumDistance);
				var coordinateForPopup = [pointList[index].long, pointList[index].lat];
				var text = '';
				var imagesGot = 0;
				var mediaHashes = [];
				for(i = 0; i < pointList[index].mediaNameList.length; i ++) {
          indexMediaInDOM = i + start;

					// we must get the media corresponding to the name in the point
					var mediaName = pointList[index].mediaNameList[i].name;
					var cacheBase = pointList[index].mediaNameList[i].cacheBase;
					var albumCacheBase = pointList[index].mediaNameList[i].albumCacheBase;

					phFl.getAlbum(
						albumCacheBase,
						function(theAlbum, i, cacheBase) {
							var j, indexInAlbum;

							for(j = 0; j < theAlbum.media.length; j ++) {
								if (theAlbum.media[j].cacheBase == cacheBase) {
									indexInAlbum = j;
									break;
								}
							}
							width = theAlbum.media[indexInAlbum].metadata.size[0];
							height = theAlbum.media[indexInAlbum].metadata.size[1];
							thumbnailSize = Options.media_thumb_size;
							thumbHash = util.chooseThumbnail(theAlbum, theAlbum.media[indexInAlbum], thumbnailSize);

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
								thumbHeight = thumbnailSize;
								thumbWidth = thumbnailSize;
								calculatedWidth = Options.media_thumb_size;
							}
							imgTitle = theAlbum.media[indexInAlbum].albumName;
							calculatedHeight = Options.media_thumb_size;

							calculatedWidth = Math.min(
								calculatedWidth,
								($(window).innerWidth() - 2 * parseInt($("#album-view").css("padding")))
							);
							calculatedHeight = calculatedWidth / thumbWidth * thumbHeight;

							mediaHashes[i] = phFl.encodeHash(theAlbum, theAlbum.media[indexInAlbum]);
              var hash = theAlbum.cacheBase + "--" + theAlbum.media[indexInAlbum].cacheBase;
              var codedHashClass = "popup-img-" + phFl.hashCode(hash);
              var codedHashClassSelector = "." + codedHashClass;

              if (evt.originalEvent.ctrlKey) {
                if ($(codedHashClassSelector).length) {
                  // ctrl-click removes the images from the popup
                  if (content.innerHTML.indexOf(codedHashClass) > content.innerHTML.lastIndexOf(br))
                    usedWidthForThumbnails -= calculatedWidth;
                  $(codedHashClassSelector).remove();
                  // close the popup if no image in it
                  if (! $("#popup .thumb-and-caption-container").length)
                    $('#popup-closer')[0].click();
                }
              } else if (evt.originalEvent.shiftKey && $(codedHashClassSelector).length) {
                // shift click doesn't anything if the image is already there
                return;
              } else {
  							imageString =
  								"<div id='popup-image-" + indexMediaInDOM + "' class='thumb-and-caption-container " + codedHashClass + "' style='" +
  											"width: " + calculatedWidth + "px; " +
  										"'>" +
  									"<div class='thumb-container' " + "style='" +
  											// "width: " + calculatedWidth + "px; " +
  											"width: " + calculatedWidth + "px; " +
  											"height: " + calculatedHeight + "px;" +
  										"'>" +
  											"<span class='helper'></span>" +
  											"<img title='" + imgTitle + "' " +
  												"alt='" + util.trimExtension(theAlbum.media[indexInAlbum].name) + "' " +
  												"src='" +  encodeURI(thumbHash) + "' " +
  												"class='thumbnail" + "' " +
  												"height='" + thumbHeight + "' " +
  												"width='" + thumbWidth + "' " +
  												"style='" +
  													 "width: " + calculatedWidth + "px; " +
  													 "height: " + calculatedHeight + "px;" +
  													 "'" +
  												"/>" +
  									"</div>" +
  									"<div class='media-caption'>" +
  										"<span>" +
  										theAlbum.media[indexInAlbum].name.replace(/ /g, "</span> <span style='white-space: nowrap;'>") +
  										"</span>" +
  									"</div>" +
  								"</div>";
  							image = $(imageString);
  							image.get(0).media = theAlbum.media[indexInAlbum];

  							if (usedWidthForThumbnails + calculatedWidth > maxWidthForThumbnails) {
  								content.innerHTML += br + imageString;
  								usedWidthForThumbnails = calculatedWidth;
  							} else {
  								content.innerHTML += imageString;
  								usedWidthForThumbnails += calculatedWidth;
  							}

  							imagesGot += 1;

  							if (imagesGot == pointList[index].mediaNameList.length) {
  								// all the images have been fetched and put in DOM: we can generate the popup,
  								// but before set a css value: position: absolute make the popup to be shown in a wrong position

                  $("#mapdiv .ol-overlaycontainer-stopevent").css("position", "unset");
  								$("#popup-content").css("max-height", parseInt(windowHeight * 0.8));
  								if (
  									Options.available_map_popup_positions.every(
  										function(orientation) {
  											return ! $(".ol-popup").hasClass(orientation);
  										}
  									)
  								) {
  									$(".ol-popup").addClass(Options.default_map_popup_position);
  								}
  								overlay.setPosition(ol.proj.fromLonLat(coordinatesForPopup));

  								// add the click events to every image
  								for(var ii = 0; ii < pointList[index].mediaNameList.length; ii ++) {
  									$("#popup-image-" + (ii + start)).on('click', {ii: ii}, function(ev) {
  										$('#popup-closer')[0].click();
  										$('#popup #popup-content').html("");
  										$('.map-close-button')[0].click();
  										window.location.href = mediaHashes[ev.data.ii];
  									});
  								}
  							}
              }
						},
						util.die,
						i,
            cacheBase
					);
				}
			});
		}
	}

  // MapFunctions.prototype.generateMapFromDefaults = MapFunctions.generateMapFromDefaults;

  window.MapFunctions = MapFunctions;
}());
