(function() {

  var phFl = new PhotoFloat();
  var util = new Utilities();
  var mapIsInitialized = false;
  var mymap;

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
			MapFunctions.generateMap([point]);
		}
	};

	MapFunctions.prototype.generateMapFromSubalbum = function(ev) {
		if (ev.data.subalbum.positionsAndMediaInTree.length) {
			ev.stopPropagation();
			ev.preventDefault();
			MapFunctions.generateMap(ev.data.subalbum.positionsAndMediaInTree);
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
		else if (currentAlbum.positionsAndMediaInTree.length)
			pointList = currentAlbum.positionsAndMediaInTree;

		if (pointList != [])
			MapFunctions.generateMap(pointList);
	};

  MapFunctions.mapClick = function(evt, pointList, lastIndex) {
    var clickedPosition = evt.latlng, i;
    // console.log(clickedPosition, pointList);

    // decide what point is to be used: the nearest to the clicked position
    var minimumDistance = false, newMinimumDistance, distance, index;
    for(i = 0; i < pointList.length; i ++) {
    	distance = Math.abs(util.distanceBetweenCoordinatePoints({long: clickedPosition.lng, lat: clickedPosition.lat}, pointList[i]));
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
    var maxHeightForThumbnails = parseInt($("#mapdiv").height() * 0.8);
    var indexMediaInDOM;

    if (! evt.originalEvent.shiftKey && ! evt.originalEvent.ctrlKey) {
      // reset the thumbnails if not shift- nor ctrl-clicking
    	// content.innerHTML = '';
      lastIndex = 0;
    }

    // console.log(index, clickedPosition, pointList[index], minimumDistance);
    var coordinatesForPopup = [pointList[index].lat, pointList[index].long];
    var imagesGot = 0;
    var mediaHashes = [];
    var imagesString = '';
    if (evt.originalEvent.shiftKey || evt.originalEvent.ctrlKey)
      imagesString = $(".leaflet-popup-content").html();

    for(i = 0; i < pointList[index].mediaNameList.length; i ++) {
    	// we must get the media corresponding to the name in the point
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
    			var width = theAlbum.media[indexInAlbum].metadata.size[0];
    			var height = theAlbum.media[indexInAlbum].metadata.size[1];
    			var thumbnailSize = Options.media_thumb_size;
    			var thumbHash = util.chooseThumbnail(theAlbum, theAlbum.media[indexInAlbum], thumbnailSize);
          var thumbHeight, thumbWidth;

          var calculatedWidth, calculatedHeight;
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
    			var imgTitle = theAlbum.media[indexInAlbum].albumName;
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
              $(codedHashClassSelector).remove();
              // close the popup if no image in it
              if (! $(".leaflet-popup .thumb-and-caption-container").length) {
                $('.leaflet-popup-close-button')[0].click();
                return;
              }
            }
          } else if (evt.originalEvent.shiftKey && $(codedHashClassSelector).length) {
            // shift click doesn't anything if the image is already there
          } else {
            indexMediaInDOM = i + lastIndex;
    				imagesString +=
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
    				// image = $(imageString);
    				// image.get(0).media = theAlbum.media[indexInAlbum];

            // $("#popup-content").append($(imageString));
            // thumbAndCaptionHeight = Math.max(thumbAndCaptionHeight, parseInt($("popup-image-" + indexMediaInDOM).height()));
            // $("#popup-content .thumb-and-caption-container").height(thumbAndCaptionHeight + "px");

          }
  				imagesGot += 1;

  				if (imagesGot == pointList[index].mediaNameList.length) {

            if (evt.originalEvent.ctrlKey)
              imagesString = $(".leaflet-popup-content").html();
            if (! imagesString)
              return;

            var popup = L.popup({maxWidth: maxWidthForThumbnails, maxHeight: maxHeightForThumbnails})
              .setLatLng(coordinatesForPopup)
              .setContent(imagesString)
              .openOn(mymap);
            // all the images have been fetched and put in DOM: we can generate the popup,
  					// but before set a css value: position: absolute make the popup to be shown in a wrong position

            // add the popup mover
            $(".popup-mover").remove();
            $(".leaflet-popup-close-button").after('<a id="popup-mover" class="popup-mover"></a>');
            // add the corresponding listener
            $(".popup-mover")
              .on(
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
  					if (
  						Options.available_map_popup_positions.every(
  							function(orientation) {
  								return ! $(".leaflet-popup").hasClass(orientation);
  							}
  						)
  					) {
  						$(".leaflet-popup").addClass(Options.default_map_popup_position);
  					}

  					// add the click events to every image
  					for(var ii = 0; ii < pointList[index].mediaNameList.length; ii ++) {
  						$("#popup-image-" + (ii + lastIndex)).on('click', {ii: ii}, function(ev) {
  							$('.leaflet-popup-close-button')[0].click();
  							// $('#popup #popup-content').html("");
  							$('.map-close-button')[0].click();
  							window.location.href = mediaHashes[ev.data.ii];
  						});
  					}
            lastIndex += pointList[index].mediaNameList.length;
  				}
    		},
    		util.die,
    		i,
        cacheBase
    	);
    }
  };

	MapFunctions.generateMap = function(pointList) {
		// pointList is an array of uniq points with a list of the media geolocated there

    var i;
		if(pointList) {
			// calculate the center
			var center = {'lat': 0, 'long': 0};
			for (i = 0; i < pointList.length; ++i) {
				center.lat += pointList[i].lat;
				center.long += pointList[i].long;
			}
			center.lat /= pointList.length;
			center.long /= pointList.length;

      var br = '<br />';
      // var thumbAndCaptionHeight = 0;

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
      $(".map-container > div").css("min-height", $(window).height() * .90);
      $(".map-container").css("display", "grid");

			// var markers = [];
      // initialize the markers clusters
      var markers = L.markerClusterGroup();

      if (mapIsInitialized)
        mymap.remove();

      mymap = L.map('mapdiv').setView([center.lat, center.long], zoom);
      mapIsInitialized = true;


      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          maxZoom: 18,
          id: 'mapbox.streets'
        }
      ).addTo(mymap);
      L.control.scale().addTo(mymap);

      var lastIndex = 0;
      var cacheBases;
      for (var iPoint = 0; iPoint < pointList.length; iPoint ++) {
        console.log(iPoint + "/" + pointList.length);
        cacheBases = '';
				for(var iPhoto = 0; iPhoto < pointList[iPoint].mediaNameList.length; iPhoto ++) {
					// we must get the media corresponding to the name in the point
          if (cacheBases)
            cacheBases += br;
          cacheBases += pointList[iPoint].mediaNameList[iPhoto].cacheBase;
        }

        markers.addLayer(L.marker([pointList[iPoint].lat, pointList[iPoint].long]));
        markers[iPoint] = L.marker([pointList[iPoint].lat, pointList[iPoint].long]).addTo(mymap);
        // the tooltip
        markers[iPoint].bindTooltip(cacheBases);
        // make markers react to click like the other map points
        markers[iPoint].on(
          'click',
          function(e) {
            MapFunctions.mapClick(e, pointList, lastIndex);
          }
        );
      }

      mymap.addLayer(markers);

      /**
       * Add a click handler to the map to render the popup.
       */
      mymap.on(
        'click',
        function(e) {
          MapFunctions.mapClick(e, pointList);
        }
      );
		}
	};

  window.MapFunctions = MapFunctions;
}());
