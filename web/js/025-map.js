(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var f = new Functions();
	var mapIsInitialized = false;
	var mymap, popup, photoNumberInPopup = 0;
	var selectedPositions = [];
	var imagesToAddString = "", dataForClickEvents = [];
	var imagesGot, imagesToGet, promiseActivated = false;
	var titleWrapper1, titleWrapper2;


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
					'lng': parseFloat(ev.data.media.metadata.longitude),
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
					'lng': parseFloat(currentMedia.metadata.longitude),
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


	MapFunctions.mapClick = function(evt, clusters) {
		var clickedPosition = evt.latlng, i;
		var maxWidthForThumbnails, maxHeightForThumbnails;
		// console.log(clickedPosition, clusters);

		function matchPositionAndCount(reference, element) {
			return JSON.stringify([reference.lat, reference.lng]) === JSON.stringify([element.lat, element.lng]);
		}

		function getCodedHashId(mediaNameListElement) {
			var hash = mediaNameListElement.albumCacheBase + "--" + mediaNameListElement.cacheBase;
			return "popup-img-" + phFl.hashCode(hash);
		}

		function getMarkerClass(positionAndCount) {
			var imgClass =
				"popup-img-" +
				(positionAndCount.lat / 1000).toString().replace('.', '') +
				'-' +
				(positionAndCount.lng / 1000).toString().replace('.', '');
			return imgClass;
		}

		function setPopupPosition() {
			if (
				Options.available_map_popup_positions.every(
					function(orientation) {
						return ! $(".leaflet-popup").hasClass(orientation);
					}
				)
			) {
				$(".leaflet-popup").addClass(Options.default_map_popup_position);
			}
		}

		function addPopupMover() {
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
			setPopupPosition();
		}

		function updatePopup(images) {
			popup.setContent(images);
			getImagesWrapperSizes();
			$("#popup-images-wrapper").css("max-height", parseInt($(".leaflet-popup-content").css("height")) - 35);
			$("#popup-images-wrapper").css("max-width", maxWidthForThumbnails).css("width", maxWidthForThumbnails);
			$("#popup-photo-count").css("max-width", maxWidthForThumbnails);
 			popup.setLatLng(MapFunctions.averagePosition(selectedPositions));

			setPhotoCountAndWidth();

			f.setOptions();
			setPopupPosition();
			panMap();
			addLazy("img.lazyload-popup-media");
			// $("[data-src]").attr("src", "");
			// if ($("[data-src]").length) {
			// 	addLazy($("[data-src]"));
			// }
		}

		function addLazy(selector) {
			$(function() {
				$(selector).Lazy(
					{
						afterLoad: function(element) {
							element.parent().parent().on(
								'click',
								function() {
									// called after an element was successfully handled
									$('.leaflet-popup-close-button')[0].click();
									// $('#popup #popup-content').html("");
									$('.map-close-button')[0].click();
									window.location.href = element.attr("mediaHash");
								}
							);
						},
						autoDestroy: true,
						onError: function(element) {
							console.log(element[0]);
						},
						chainable: false,
						threshold: 20,
						bind: 'event'
					}
				);
			});
		}

		function setPhotoCountAndWidth() {
			$("#popup-photo-count").css("max-width", maxWidthForThumbnails);
			$("#popup-photo-count-number").html(photoNumberInPopup);
		}

		function getImagesWrapperSizes() {
			// how much space is available horizontally for the thumbnails?
			maxWidthForThumbnails = parseInt($("#mapdiv").width() * 0.8);
			// square thumbnails: set the value to a shorter one, in order to avoid right white space
			if (Options.media_thumb_type == "square") {
				var thumb_size = Options.media_thumb_size;
				if (Options.spacing)
					thumb_size += Options.spacingToggle;
				maxWidthForThumbnails = parseInt(maxWidthForThumbnails / thumb_size) * thumb_size;
				// add a constant for the scroller
				maxWidthForThumbnails += 18;
			}
			// vertical popup size
			maxHeightForThumbnails = parseInt($("#mapdiv").height() * 0.8);
		}

		function panMap() {
			// pan the map so that the popup is inside the map
			var popupPosition = mymap.latLngToContainerPoint(popup.getLatLng());
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
			mymap.panBy([panX, panY], {"animate": false});
		}

		function addThumbnailToString(mediaNameListElement, markerClass, resolve) {
			// we must get the media corresponding to the name in the point
			var cacheBase = mediaNameListElement.cacheBase;
			var albumCacheBase = mediaNameListElement.albumCacheBase;

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

					var albumViewPadding = $("#album-view").css("padding");
					if (! albumViewPadding)
						albumViewPadding = 0;
					else
						albumViewPadding = parseInt(albumViewPadding);
					calculatedWidth = Math.min(
						calculatedWidth,
						$(window).innerWidth() - 2 * albumViewPadding
					);
					calculatedHeight = calculatedWidth / thumbWidth * thumbHeight;

					mediaHash = phFl.encodeHash(theAlbum, theAlbum.media[indexInAlbum]);
					var codedHashId = getCodedHashId(mediaNameListElement);

					var imageString =
						"<div id='" + codedHashId + "' class='thumb-and-caption-container " + markerClass +"' " +
							"style='" +
								"width: " + calculatedWidth + "px;";
					if (Options.spacing)
						imageString +=
								" margin-right: " + Options.spacingToggle + "px;" +
								" margin-bottom: " + Options.spacingToggle + "px;";
					imageString += "'>";
					imageString +=
							"<div class='thumb-container' " + "style='" +
									// "width: " + calculatedWidth + "px; " +
									"width: " + calculatedWidth + "px; " +
									"height: " + calculatedHeight + "px;" +
								"'>" +
									"<span class='helper'></span>" +
									"<img title='" + imgTitle + "' " +
										"alt='" + util.trimExtension(theAlbum.media[indexInAlbum].name) + "' " +
										"data-src='" + encodeURI(thumbHash) + "' " +
										// "src='img/wait.png' " +
										"src='' " +
										"class='lazyload-popup-media thumbnail" + "' " +
										"height='" + thumbHeight + "' " +
										"width='" + thumbWidth + "' " +
										"mediaHash='" + mediaHash + "' " +
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

					dataForClickEvents.push({"codedHashId": codedHashId, "mediaHash": mediaHash});

					// $("#popup-images-wrapper").html(imageString);
					imagesToAddString += imageString;
					imagesGot ++;
					if (imagesGot >= imagesToGet)
						resolve();

					return;
				},
				util.die,
				i,
				cacheBase
			);
		};

		// decide what point is to be used: the nearest to the clicked position
		var minimumDistance = false, newMinimumDistance, distance, index;
		for(i = 0; i < clusters.length; i ++) {
			distance = Math.abs(
				util.distanceBetweenCoordinatePoints(
					{lng: clickedPosition.lng, lat: clickedPosition.lat},
					{lng: clusters[i].averagePosition.lng, lat: clusters[i].averagePosition.lat}
				)
			);
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

		if (! evt.originalEvent.shiftKey && ! evt.originalEvent.ctrlKey) {
			// reset the thumbnails if not shift- nor ctrl-clicking
			// content.innerHTML = '';
			selectedPositions = [];
			photoNumberInPopup = 0;
			$("#popup-images-wrapper").html("");
			imagesString = '';
		}

		var currentCluster = clusters[index];
		currentCluster.data.mediaNameList = [];
		// build the cluster's media name list
		var positionsAndCounts = [];
		var markerClass;
		for(i = 0; i < currentCluster._clusterMarkers.length; i ++) {
			currentCluster.data.mediaNameList = currentCluster.data.mediaNameList.concat(currentCluster._clusterMarkers[i].data.mediaNameList);
			positionsAndCounts.push(
				{
					"lat": currentCluster._clusterMarkers[i].position.lat,
					"lng": currentCluster._clusterMarkers[i].position.lng,
					"mediaNameList": currentCluster._clusterMarkers[i].data.mediaNameList,
					"count": currentCluster._clusterMarkers[i].data.mediaNameList.length
				}
			);
		}
		// console.log(index, clickedPosition, currentCluster, minimumDistance);
		var indexPositions;
		if (evt.originalEvent.ctrlKey) {
			// control click
		 	if (selectedPositions.length) {
				for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
					var matchingIndex = -1;
					if (
						selectedPositions.some(
							function(element, index) {
								matchingIndex = index;
								return matchPositionAndCount(positionsAndCounts[indexPositions], element);
							}
						)
					) {
						photoNumberInPopup -= positionsAndCounts[indexPositions].count;
						selectedPositions.splice(matchingIndex, 1);
						markerClass = getMarkerClass(positionsAndCounts[indexPositions]);
						$("." + markerClass).remove();
					}
				}

				if (! selectedPositions.length) {
					popup.remove();
					return;
				} else {
					updatePopup($(".leaflet-popup-content").html());
				}
			}
		} else {
			// not control click
			imagesGot = 0;
			imagesToAddString = "";
			dataForClickEvents = [];
			imageLoadPromise = new Promise(
				function(resolve, reject) {
					promiseActivated = true;
					if (! selectedPositions.length || ! evt.originalEvent.shiftKey) {
						// normal click or shift click without previous content

						getImagesWrapperSizes();

						selectedPositions = positionsAndCounts;
						if (typeof popup !== "undefined") {
							popup.remove();
							$(".leaflet-popup").remove();
						}
						popup = L.popup({maxWidth: maxWidthForThumbnails, maxHeight: maxHeightForThumbnails, autoPan: false})
							.setContent(titleWrapper1.replace("maxWidthForThumbnails", maxWidthForThumbnails) + titleWrapper2)
							.setLatLng(MapFunctions.averagePosition(selectedPositions))
							.openOn(mymap);

						// f.setOptions();
						// setPopupPosition();
						// panMap();
						// addPopupMover();
						// getImagesWrapperSizes();
						// $("#popup-images-wrapper").css("max-height", parseInt($(".leaflet-popup-content").css("max-height")) - 75);

						photoNumberInPopup = 0;

						// how many images are we going to add?
						imagesToGet = 0;
						for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++)
							imagesToGet += positionsAndCounts[indexPositions].mediaNameList.length;

						// add the html code for the images to a string
						for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
							photoNumberInPopup += positionsAndCounts[indexPositions].count;
							markerClass = getMarkerClass(positionsAndCounts[indexPositions]);
							for (i = 0; i < positionsAndCounts[indexPositions].mediaNameList.length; i ++) {
								addThumbnailToString(positionsAndCounts[indexPositions].mediaNameList[i], markerClass, resolve);
							}
						}
					} else {
						// shift-click with previous content
						imagesToGet = 0;
						for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++)
							imagesToGet += positionsAndCounts[indexPositions].mediaNameList.length;
						for (indexPositions = 0; indexPositions < positionsAndCounts.length; indexPositions ++) {
							if (
								selectedPositions.every(
									function(element) {
										return ! matchPositionAndCount(positionsAndCounts[indexPositions], element);
									}
								)
							) {
								photoNumberInPopup += positionsAndCounts[indexPositions].count;
								selectedPositions.push(positionsAndCounts[indexPositions]);
								markerClass = getMarkerClass(positionsAndCounts[indexPositions]);
								for (i = 0; i < positionsAndCounts[indexPositions].mediaNameList.length; i ++) {
									addThumbnailToString(positionsAndCounts[indexPositions].mediaNameList[i], markerClass, resolve);
								}
							}
						}
					}
					// popup.setLatLng(MapFunctions.averagePosition(selectedPositions));
				}
			);
		}

		if (promiseActivated) {
			imageLoadPromise.then(
				function() {
					promiseActivated = false;
					var previousImagesString = $("#popup-images-wrapper").html();

					updatePopup(titleWrapper1.replace("maxWidthForThumbnails", maxWidthForThumbnails) + previousImagesString + imagesToAddString + titleWrapper2);
				}
			);
		}

		return;
	};

	MapFunctions.generateMap = function(pointList) {
		// pointList is an array of uniq points with a list of the media geolocated there

		var i;
		titleWrapper1 =
			'<div id="popup-photo-count" style="max-width: maxWidthForThumbnailspx;">' +
				'<span id="popup-photo-count-number"></span> ' + util._t("#photos") +
			'</div>' +
			'<div id="popup-images-wrapper">';
		titleWrapper2 = '</div>';


		if(pointList) {
			selectedPositions = [];
			// calculate the center
			var center = MapFunctions.averagePosition(pointList);

			var br = '<br />';
			// var thumbAndCaptionHeight = 0;

			// default zoom is used for single media or media list with one point
			var maxXDistance = Options.photo_map_size;
			var maxYDistance = Options.photo_map_size;
			if (pointList.length > 1) {
				// calculate the maximum distance from the center
				// it's needed in order to calculate the zoom level
				maxXDistance = 0;
				maxYDistance = 0;
				for (i = 0; i < pointList.length; ++i) {
					maxXDistance = Math.max(maxXDistance, Math.abs(util.xDistanceBetweenCoordinatePoints(center, pointList[i])));
					maxYDistance = Math.max(maxYDistance, Math.abs(util.yDistanceBetweenCoordinatePoints(center, pointList[i])));
				}
			}
			// calculate the zoom level needed in order to have all the points inside the map
			// see https://wiki.openstreetmap.org/wiki/Zoom_levels
			// maximum OSM zoom is 19
			var earthCircumference = 40075016;
			var xZoom = Math.min(19, parseInt(Math.log2((windowWidth / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxXDistance)));
			var yZoom = Math.min(19, parseInt(Math.log2((windowHeight / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxYDistance)));
			// var minZoom = parseInt(Math.log2(Math.min(windowWidth, windowHeight) / 256));
			var zoom = Math.min(xZoom, yZoom);

			$('.map-container').show();
			$(".map-container").css("max-height", $(window).height() - 54).css("max-width", $(window).width() - 54).css("right", "44px").css("top", "24px");
			$(".map-container").css("display", "grid");

				var markers = [];
			// initialize the markers clusters
			var pruneCluster = new PruneClusterForLeaflet(70, 70);
			PruneCluster.Cluster.ENABLE_MARKERS_LIST = true;

			// modify the prunecluster so that the click can be managed in order to show the photo popup
			pruneCluster.BuildLeafletCluster = function (cluster, position) {
				var m = new L.Marker(position, {
					icon: pruneCluster.BuildLeafletClusterIcon(cluster)
				});
				m._leafletClusterBounds = cluster.bounds;
				m.on(
					'click',
					function(e) {
						MapFunctions.mapClick(e, pruneCluster.Cluster._clusters);
					}
				);
				return m;
			};

			// modify the cluster marker so that it shows the number of photos rather than the number of clusters
			pruneCluster.BuildLeafletClusterIcon = function (cluster) {
				var c = 'prunecluster prunecluster-';
				var iconSize = 38;
				var maxPopulation = pruneCluster.Cluster.GetPopulation();
				var markers = cluster.GetClusterMarkers();
				var population = 0;
				// count the number of photos in a cluster
				for(var i = 0; i < markers.length; i ++) {
					population += markers[i].data.mediaNameList.length;
				}

				if (population < Math.max(10, maxPopulation * 0.01)) {
					c += 'small';
				}
				else if (population < Math.max(100, maxPopulation * 0.05)) {
					c += 'medium';
					iconSize = 40;
				}
				else {
					c += 'large';
					iconSize = 44;
				}
				return new L.DivIcon({
					html: "<div><span>" + population + "</span></div>",
					className: c,
					iconSize: L.point(iconSize, iconSize)
				});
			};

			if (mapIsInitialized)
				mymap.remove();

			mymap = L.map('mapdiv', {'closePopupOnClick': false}).setView([center.lat, center.lng], zoom);
			mapIsInitialized = true;


			L.tileLayer(
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
					maxZoom: 21,
					id: 'mapbox.streets'
				}
			).addTo(mymap);
			L.control.scale().addTo(mymap);

			var cacheBases;
			for (var iPoint = 0; iPoint < pointList.length; iPoint ++) {
				// console.log(iPoint + "/" + pointList.length);
				cacheBases = '';
						for(var iPhoto = 0; iPhoto < pointList[iPoint].mediaNameList.length; iPhoto ++) {
							// we must get the media corresponding to the name in the point
				if (cacheBases)
					cacheBases += br;
				cacheBases += pointList[iPoint].mediaNameList[iPhoto].cacheBase;
				}

				markers[iPoint] = new PruneCluster.Marker(
					pointList[iPoint].lat,
					pointList[iPoint].lng,
					{
						icon:	new L.NumberedDivIcon({number: pointList[iPoint].mediaNameList.length})
					}
				);
				pruneCluster.RegisterMarker(markers[iPoint]);
				markers[iPoint].data.tooltip = cacheBases;
				markers[iPoint].data.mediaNameList = pointList[iPoint].mediaNameList;
				markers[iPoint].weight = pointList[iPoint].mediaNameList.length;

				// // the tooltip
				// markers[iPoint].bindTooltip(cacheBases);
				// // make markers react to click like the other map points
				// markers[iPoint].on(
				//	'click',
				//	function(e) {
				//		MapFunctions.mapClick(e, pointList, lastIndex);
				//	}
				// );
			}

			mymap.addLayer(pruneCluster);

			/**
			* Add a click handler to the map to render the popup.
			*/
			mymap.on(
				'click',
				function(e) {
					MapFunctions.mapClick(e, pruneCluster.Cluster._clusters);
				}
			);
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
