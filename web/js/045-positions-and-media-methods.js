(function() {

	var util = new Utilities();
	var tF = new TopFunctions();
	var mapIsInitialized = false;

	PositionsAndMedia.prototype.countMedia = function() {
		var count = 0;
		this.forEach(
			function(positionAndMedia) {
				count += positionAndMedia.mediaList.length;
			}
		);
		return count;
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

	PositionsAndMedia.prototype.averagePosition = function() {
		var averageLatLng = L.latLng(0, 0);
		var lat, lng, countTotal = 0;
		for (var i = 0; i < this.length; i ++) {
			lat = this[i].lat;
			lng = this[i].lng;
			if (this[i].hasOwnProperty("count")) {
				lat *= this[i].count;
				lng *= this[i].count;
			}
			averageLatLng.lat += lat;
			averageLatLng.lng += lng;
			if (this[i].hasOwnProperty("count"))
				countTotal += this[i].count;
			else
				countTotal += 1;
		}
		averageLatLng.lat /= countTotal;
		averageLatLng.lng /= countTotal;

		return averageLatLng;
	};

	PositionsAndMedia.prototype.generateMap = function(ev, from) {
		function updateMapAndContinue(ev, isLongTap = false) {
			var updatePromise;
			if (isLongTap) {
				updatePromise = tF.updateMapAlbumOnMapClick(ev, env.pruneCluster.Cluster._clusters, true, true);
			} else {
				updatePromise = tF.updateMapAlbumOnMapClick(ev, env.pruneCluster.Cluster._clusters);
			}
			updatePromise.then(
				tF.prepareAndDoPopupUpdate,
				function() {
					console.trace();
				}
			);
		}

		var i;
		env.titleWrapper =
			"<div id='popup-photo-count' style='max-width: " + env.maxWidthForPopupContent + "px;'>" +
				"<span id='popup-photo-count-number'></span> " + util._t("#images") +
			"</div>" +
			"<div id='popup-images-wrapper'>" +
			"</div>";

		$("#my-modal.modal").css("display", "block");
		if (env.isMobile.any()) {
			$("#my-modal .modal-content").css("width", (env.windowWidth - 12).toString() + "px");
			$("#my-modal .modal-content").css("height", (env.windowHeight - 12).toString() + "px");
			$("#my-modal .modal-content").css("padding", "5px");
			$("#my-modal.modal").css("top", "0");
			$("#my-modal.modal").css("padding-top", "0");
			$("#my-modal.modal-close").css("top", "22px");
			$("#my-modal.modal-close").css("right", "22px");
		} else {
			$("#my-modal .modal-content").css("width", (env.windowWidth - 55).toString() + "px");
			$("#my-modal .modal-content").css("height", (env.windowHeight - 60).toString() + "px");
			$("#my-modal .modal-content").css("padding", "");
			$("#my-modal.modal").css("top", "");
			$("#my-modal.modal").css("padding-top", "");
			$("#my-modal.modal-close").css("top", "");
			$("#my-modal.modal-close").css("right", "");
		}

		if (this) {
			// maximum OSM zoom is 19
			const maxOSMZoom = 19;
			// calculate the center
			var center;
			if (this.length)
				center = this.averagePosition();
			else if (env.lastMapPositionAndZoom.center)
				center = env.lastMapPositionAndZoom.center;
			else
				center = {lat: 0, lng: 0};

			// var thumbAndCaptionHeight = 0;

			// default zoom is used for single media or media list with one point
			var maxXDistance = env.options.photo_map_size;
			var maxYDistance = env.options.photo_map_size;
			if (this.length > 1) {
				// calculate the maximum distance from the center
				// it's needed in order to calculate the zoom level
				maxXDistance = 0;
				maxYDistance = 0;
				for (i = 0; i < this.length; ++i) {
					maxXDistance = Math.max(maxXDistance, Math.abs(util.xDistanceBetweenCoordinatePoints(center, this[i])));
					maxYDistance = Math.max(maxYDistance, Math.abs(util.yDistanceBetweenCoordinatePoints(center, this[i])));
				}
			}
			// calculate the zoom level needed in order to have all the points inside the map
			// see https://wiki.openstreetmap.org/wiki/Zoom_levels
			var earthCircumference = 40075016;
			var xZoom = Math.min(maxOSMZoom, parseInt(Math.log2((env.windowWidth / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxXDistance)));
			var yZoom = Math.min(maxOSMZoom, parseInt(Math.log2((env.windowHeight / 2 * 0.9) * earthCircumference * Math.cos(util.degreesToRadians(center.lat)) / 256 / maxYDistance)));
			var zoom = Math.min(xZoom, yZoom);

			if (! this.length)
				zoom = 3;

			$("#loading").hide();

			$('.map-container').show();
			$(".map-container").css("max-height", $(window).height() - 54).css("max-width", $(window).width() - 54).css("right", "44px").css("top", "24px");
			$(".map-container").css("display", "grid");

			var markers = [];
			// initialize the markers clusters
			env.pruneCluster = new PruneClusterForLeaflet(150, 70);
			PruneCluster.Cluster.ENABLE_MARKERS_LIST = true;

			// modify the marker and the prunecluster so that the click can be managed in order to show the photo popup
			env.pruneCluster.BuildLeafletMarker	 = function (marker, position) {
				var m = new L.Marker(position);
				this.PrepareLeafletMarker(m, marker.data, marker.category);
				m.off("click").on(
					"click",
					function(ev) {
						updateMapAndContinue(ev);
					}
				);
				m.off("contextmenu").on(
					"contextmenu",
					function(ev) {
						ev.originalEvent.preventDefault();
						updateMapAndContinue(ev, true);
						return false;
					}
				);
				return m;
			};

			env.pruneCluster.BuildLeafletCluster = function (cluster, position) {
				var m = new L.Marker(position, {
					icon: env.pruneCluster.BuildLeafletClusterIcon(cluster)
				});
				m._leafletClusterBounds = cluster.bounds;
				m.off("click").on(
					"click",
					function(ev) {
						updateMapAndContinue(ev);
					}
				);
				m.off("contextmenu").on(
					"contextmenu",
					function(ev) {
						ev.originalEvent.preventDefault();
						updateMapAndContinue(ev, true);
						return false;
					}
				);
				return m;
			};

			// modify the cluster marker so that it shows the number of photos rather than the number of clusters
			env.pruneCluster.BuildLeafletClusterIcon = function (cluster) {
				var c = 'prunecluster prunecluster-';
				var iconSize = 38;
				var maxPopulation = env.pruneCluster.Cluster.GetPopulation();
				var markers = cluster.GetClusterMarkers();
				var population = 0;
				// count the number of photos in a cluster
				for(var i = 0; i < markers.length; i ++) {
					population += markers[i].data.mediaList.length;
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
				env.mymap.remove();

			env.mymap = L.map('mapdiv', {'closePopupOnClick': false}).setView([center.lat, center.lng], zoom);
			$(".map-container > div").css("min-height", (env.windowHeight -50).toString() + "px");
			mapIsInitialized = true;

			L.tileLayer(
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
					maxZoom: 21,
					maxNativeZoom: maxOSMZoom,
					subdomains: 'abc',
					id: 'mapbox.streets'
				}
			).addTo(env.mymap);

			L.control.scale().addTo(env.mymap);

			if (Modernizr.geolocation && window.location.protocol === "https:") {
				L.Control.myLocationButton = L.Control.extend({
					onAdd: function(map) {
						var img = L.DomUtil.create('img');

						img.src = 'img/current-location.png';
						img.style.width = '50px';

						return img;
					},

					onRemove: function(map) {
						// Nothing to do here
					}
				});

				L.control.myLocationButton = function(opts) {
					return new L.Control.myLocationButton(opts);
				};

				L.control.myLocationButton(
					{
						position: 'bottomright'
					}
				).addTo(env.mymap);
				$(".leaflet-bottom.leaflet-right").attr("title", util._t("#click-for-your-position"));
				$(".leaflet-bottom.leaflet-right").off("click").on(
					"click",
					function(ev) {
						ev.stopPropagation();
						ev.preventDefault();
						$("#error-getting-current-location").stop().hide();
						navigator.geolocation.getCurrentPosition(
							function geolocationSuccess(position) {
								env.mymap.panTo(new L.LatLng(position.coords.latitude, position.coords.longitude));
							},
							function geolocationError(err) {
								ev.stopPropagation();
								$("#error-getting-current-location").empty();
								$("#error-getting-current-location").html(
									util._t("#error-getting-current-location") + " <span id='error-getting-current-location-question-mark'>?</span>" +
									env.br +
									"<div id='error-getting-current-location-little'>" + "(" + err.message + ")</div>"
								);
								$("#error-getting-current-location").stop().fadeIn(
									1000,
									function() {
										$("#error-getting-current-location").stop().fadeOut(5000);
									}
								);
								$("#error-getting-current-location-question-mark, #error-getting-current-location").off().on(
									"click",
									function(ev) {
										ev.stopPropagation();
										$("#error-getting-current-location").stop().fadeIn(100);
										$("#error-getting-current-location-question-mark, #error-getting-current-location").off("click").on(
											"click",
											function() {
												$("#error-getting-current-location").hide();
											}
										);
										$("#error-getting-current-location-little").show();
									}
								);
							},
							{
								timeout: 1000
							}
						);
					}
				);
			}

			if (
				env.currentMedia !== null && ! env.currentMedia.hasGpsData() &&
				util.isPhp() && env.options.user_may_suggest_location && env.options.request_password_email
			) {
				// show the central marker, in order to permit the user to suggest by email the geolocation of current media
				if (env.lastMapPositionAndZoom.center !== false)
					env.mymap.setView(env.lastMapPositionAndZoom.center, env.lastMapPositionAndZoom.zoom, {animate: false});
				$(".map-marker-centered").show();
				$(".map-marker-centered-send-suggestion").show();
				$(".map-marker-centered-send-suggestion").attr("title", util._t("#click-to-suggest-position-on-map"));
				if (env.keepShowingGeolocationSuggestText) {
					$("#you-can-suggest-photo-position").stop().fadeIn(500);
					$("#you-can-suggest-photo-position").stop().fadeIn(500);
					if ($("#you-can-suggest-photo-position").children().length === 2) {
						$("#you-can-suggest-photo-position").append('<div class="keep-showing suggest-button">' + util._t("#keep-showing") + '</div>');
						$("#you-can-suggest-photo-position").append('<div class="stop-showing suggest-button">' + util._t("#stop-showing") + '</div>');
						$(".stop-showing").on(
							"click",
							function() {
								env.keepShowingGeolocationSuggestText = false;
								$("#you-can-suggest-photo-position").fadeOut(1000);
							}
						);
						$(".keep-showing").on(
							"click",
							function() {
								$("#you-can-suggest-photo-position").fadeOut(1000);
							}
						);
					}
				}
			}

			var cacheBases;
			for (var iPoint = 0; iPoint < this.length; iPoint ++) {
				cacheBases = '';
				for(var iPhoto = 0; iPhoto < this[iPoint].mediaList.length; iPhoto ++) {
					// we must get the media corresponding to the name in the point
					if (cacheBases)
						cacheBases += env.br;
					cacheBases += this[iPoint].mediaList[iPhoto].cacheBase;
				}

				markers[iPoint] = new PruneCluster.Marker(
					this[iPoint].lat,
					this[iPoint].lng,
					{
						icon:	new L.NumberedDivIcon({number: this[iPoint].mediaList.length})
					}
				);
				env.pruneCluster.RegisterMarker(markers[iPoint]);
				markers[iPoint].data.tooltip = cacheBases;
				markers[iPoint].data.mediaList = this[iPoint].mediaList;
				markers[iPoint].weight = this[iPoint].mediaList.length;
			}

			env.mymap.addLayer(env.pruneCluster);

			/**
			* Add a click handler to the map to render the popup.
			*/
			env.mymap.off("click").on(
				"click",
				function(ev) {
					updateMapAndContinue(ev);
				}
			);
			env.mymap.off("contextmenu").on(
				"contextmenu",
				function(ev) {
					ev.originalEvent.preventDefault();
					updateMapAndContinue(ev, true);
					return false;
				}
			);

			if (from !== undefined) {
				if (env.popupRefreshType === "previousAlbum")
					tF.prepareAndDoPopupUpdate();
				else if (env.popupRefreshType === "mapAlbum") {
					var clickHistory = env.mapAlbum.clickHistory;
					env.mapAlbum = new Album();
					tF.playClickElement(clickHistory);
				}
			}
		}
	};

}());
