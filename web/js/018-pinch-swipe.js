(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var swipeSpeed = 350;
	var pinchSpeed = 500;
	var dragSpeed = 500;
	var mediaContainerSelector = ".media-box#center .media-box-inner";
	var mediaSelector = mediaContainerSelector + " img";
	var currentZoom, zoomAfterFirstPinch, zoomIncrement = 1.5625, zoomDecrement = 1 / zoomIncrement;
	var maxAllowedZoom;
	var currentTranslateX = 0;
	var currentTranslateY = 0;
	var nextSizeReduction = false;
	var initialMediaWidthOnScreen;

	var maxAllowedTranslateX, minAllowedTranslateX, maxAllowedTranslateY, minAllowedTranslateY;
	var mediaWidth, mediaHeight;
	var mediaBoxInnerWidth, mediaBoxInnerHeight;

	var baseTranslateX = 0, baseTranslateY = 0;

	var dragVector;



	/* constructor */
	function PinchSwipe() {
	}

	PinchSwipe.cssWidth = function(mediaSelector) {
		return parseInt($(mediaSelector).css("width"));
	};

	PinchSwipe.cssHeight = function(mediaSelector) {
		return parseInt($(mediaSelector).css("height"));
	};

	PinchSwipe.reductionWidth = function(mediaSelector) {
		return parseInt($(mediaSelector).attr("width"));
	};

	PinchSwipe.reductionHeight = function(mediaSelector) {
		return parseInt($(mediaSelector).attr("height"));
	};

	PinchSwipe.pinched = function(mediaSelector, initialCssWidth) {
		return PinchSwipe.cssWidth(mediaSelector) > initialCssWidth;
	};

	PinchSwipe.scrollMedia = function(distance) {
		$("#media-box-container").css("transition-duration", "0s");

		//inverse the number we set in the css
		var value = (distance <= 0 ? "" : "-") + Math.abs(distance).toString();
		$("#media-box-container").css("transform", "translate(" + value + "px,0)");
	};

	PinchSwipe.swipeMedia = function(distance) {
		$("#media-box-container").css("transition-duration", swipeSpeed + "ms");

		//inverse the number we set in the css
		var value = (distance <= 0 ? "" : "-") + Math.abs(distance).toString();
		$("#media-box-container").css("transform", "translate(" + value + "px,0)");
	};

	PinchSwipe.pinchInOut = function(baseZoom, pinchZoom, duration, callback) {
		var nextSize, photoWidth, photoHeight, width, height;
		currentZoom = Number(Math.max(Math.min((baseZoom * pinchZoom), maxAllowedZoom), 1).toFixed(2));
		if (pinchZoom < 1 && baseZoom > 1) {
			// translation must be reduced too
			currentTranslateX = Number((currentTranslateX * (currentZoom - 1) / (baseZoom - 1)).toFixed(2));
			currentTranslateY = Number((currentTranslateY * (currentZoom - 1) / (baseZoom - 1)).toFixed(2));
			baseTranslateX = currentTranslateX;
			baseTranslateY = currentTranslateY;
		} else if (currentZoom == maxAllowedZoom) {
			if (nextSizeReduction !== false) {
				nextSize = util.nextSize();
				if (nextSize !== false) {
					if (nextSize === 0)
						// util.nextSize() returns zero for the original image
						nextSize = Math.max(currentMedia.metadata.size[0], currentMedia.metadata.size[1]);
					photoWidth = currentMedia.metadata.size[0];
					photoHeight = currentMedia.metadata.size[1];
					if (photoWidth > photoHeight) {
						width = nextSize;
						height = Number((nextSize / photoWidth * photoHeight).toFixed(0));
					} else {
						height = nextSize;
						width = Number((nextSize / photoHeight * photoWidth).toFixed(0));
					}
					$(mediaSelector).attr("width", width).attr("height", height).attr("src", nextSizeReduction);
					maxAllowedZoom = Number(($(mediaSelector).attr("width") / initialMediaWidthOnScreen).toFixed(2));
				}
			}
			baseZoom = maxAllowedZoom;
		}

		var xString = currentTranslateX.toString();
		var yString = currentTranslateY.toString();
		var zoomString = currentZoom.toString();

		$(mediaSelector).css("transition-duration", duration + "ms");
		$(mediaSelector).css("transform", "translate(" + xString + "px," + yString + "px) scale(" + zoomString + ")");

		if (currentZoom == 1 && typeof callback !== "undefined")
			// callback is the function that possibly shows the title and the bottom thumbnails
			window.setTimeout(callback, duration * 1.2);

		if (pinchZoom > 1) {
			// preload next size photo
			nextSizeReduction = util.nextSizeReduction();
			if (nextSizeReduction !== false) {
				$.preloadImages(nextSizeReduction);
			}
			$(mediaSelector).css("cursor", "all-scroll");
		} else {
			$(mediaSelector).css("cursor", "");
		}

		maxAllowedTranslateX = Math.max(currentZoom * mediaWidth - mediaBoxInnerWidth, 0) / 2;
		minAllowedTranslateX = - maxAllowedTranslateX;
		maxAllowedTranslateY = Math.max(currentZoom * mediaHeight - mediaBoxInnerHeight, 0) / 2;
		minAllowedTranslateY = - maxAllowedTranslateY;

		PinchSwipe.setPinchButtonsVisibility();
	};

	PinchSwipe.setPinchButtonsVisibility = function() {
		$("#pinch-container").removeClass("hidden");

		$("#pinch-in").off("click");
		if (currentZoom == maxAllowedZoom) {
			$("#pinch-in").addClass("disabled");
		} else {
			$("#pinch-in").on("click", PinchSwipe.pinchIn);
			$("#pinch-in").removeClass("disabled");
		}

		$("#pinch-out").off("click");
		if (currentZoom == 1 && ! $(".title").hasClass("hidden-by-pinch")) {
			$("#pinch-out").addClass("disabled");
		} else {
			$("#pinch-out").on("click", PinchSwipe.pinchOut);
			$("#pinch-out").removeClass("disabled");
		}
	};

	PinchSwipe.pinchIn = function(requiredZoom) {
		if (typeof requiredZoom !== "undefined") {
			PinchSwipe.pinchInOut(
				currentZoom,
				maxAllowedZoom / currentZoom,
				pinchSpeed,
				function () {
					if (requiredZoom == 2) {
						PinchSwipe.pinchInOut(currentZoom, 2, pinchSpeed);
					}
				}
			);
			return;
		}
		var keepPinching = true;
		if (currentZoom == 1 && ! $(".title").hasClass("hidden-by-pinch") && ($(".title").is(":visible") || $("#album-view").is(":visible"))) {
			keepPinching = false;
			$(".title").addClass("hidden-by-pinch");
			$("#album-view").addClass("hidden-by-pinch");

			pastMediaWidthOnScreen = $(mediaSelector)[0].width;
			pastMediaHeightOnScreen = $(mediaSelector)[0].height;
			pastMediaRatioOnScreen = pastMediaWidthOnScreen / pastMediaHeightOnScreen;
			windowRatio = windowWidth / windowHeight;

			if (
				pastMediaRatioOnScreen > windowRatio &&
				$(".media-box#center .media-box-inner img").outerWidth() == windowWidth
			)
				keepPinching = true;

			var event = {data: {}};
			event.data.resize = true;
			event.data.id = "center";
			event.data.media = currentMedia;
			event.data.callback = function() {
				mediaWidthOnScreen = $(mediaSelector)[0].width;
				// currentZoom = currentZoom * mediaWidthOnScreen / pastMediaWidthOnScreen;
				// zoomAfterFirstPinch = currentZoom;
				util.setPinchButtonsPosition();
				util.correctPrevNextPosition();
				PinchSwipe.setPinchButtonsVisibility();
				mediaWidth = parseInt($(mediaSelector).css("width"));
				mediaHeight = parseInt($(mediaSelector).css("height"));
			};
			event.data.callbackType = "pinch";
			event.data.currentZoom = currentZoom;

			util.scaleMedia(event);
		}
		if (keepPinching)
			PinchSwipe.pinchInOut(currentZoom, zoomIncrement, pinchSpeed);
	};

	PinchSwipe.pinchOut = function() {
		function showTitleAndBottomThumbnails() {
			$(".title").removeClass("hidden-by-pinch");
			$("#album-view").removeClass("hidden-by-pinch");
			var event = {data: {}};
			event.data.resize = true;
			event.data.id = "center";
			event.data.media = currentMedia;
			event.data.callback = function() {
				mediaWidthOnScreen = $(mediaSelector)[0].width;
				// currentZoom = currentZoom * mediaWidthOnScreen / pastMediaWidthOnScreen;
				// currentZoom = 1;
				// zoomAfterFirstPinch = currentZoom;
				util.setPinchButtonsPosition();
				util.correctPrevNextPosition();
				PinchSwipe.setPinchButtonsVisibility();
				mediaWidth = parseInt($(mediaSelector).css("width"));
				mediaHeight = parseInt($(mediaSelector).css("height"));
			};
			event.data.callbackType = "pinch";
			event.data.currentZoom = currentZoom;
			pastMediaWidthOnScreen = $(mediaSelector)[0].width;
			util.scaleMedia(event);
		}

		if (currentZoom <= 1 && $(".title").hasClass("hidden-by-pinch")) {
		// if (currentZoom <= zoomAfterFirstPinch && $(".title").hasClass("hidden-by-pinch")) {
			showTitleAndBottomThumbnails();
		} else {
			PinchSwipe.pinchInOut(
				currentZoom,
				zoomDecrement,
				pinchSpeed,
				function () {
					// check whether the final pinchout (re-establishing title and the bottom thumbnails) has to be performed
					mediaWidthOnScreen = $(mediaSelector)[0].width;
					mediaHeightOnScreen = $(mediaSelector)[0].height;
					mediaRatioOnScreen = pastMediaWidthOnScreen / pastMediaHeightOnScreen;
					windowRatio = windowWidth / windowHeight;

					if (
						mediaRatioOnScreen > windowRatio &&
						$(".media-box#center .media-box-inner img").outerWidth() == windowWidth
					)
						showTitleAndBottomThumbnails();
				}
			);
		}
	};

	PinchSwipe.drag = function(distance, dragVector, duration) {
		$(mediaSelector).css("transition-duration", duration + "ms");

		// currentTranslateX = Number(Math.max(Math.min(baseTranslateX + distance * dragVector.x, maxAllowedTranslateX * currentZoom), minAllowedTranslateX * currentZoom).toFixed(0));
		// currentTranslateY = Number(Math.max(Math.min(baseTranslateY + distance * dragVector.y, maxAllowedTranslateY * currentZoom), minAllowedTranslateY * currentZoom).toFixed(0));
		currentTranslateX = Number(Math.max(Math.min(baseTranslateX + distance * dragVector.x, maxAllowedTranslateX), minAllowedTranslateX).toFixed(0));
		currentTranslateY = Number(Math.max(Math.min(baseTranslateY + distance * dragVector.y, maxAllowedTranslateY), minAllowedTranslateY).toFixed(0));

		var xString = currentTranslateX.toString();
		var yString = currentTranslateY.toString();
		var zoomString = currentZoom.toString();

		$(mediaSelector).css("transform", "translate(" + xString + "px," + yString + "px) scale(" + zoomString + ")");
		$(mediaSelector).css("transform", "translate(" + xString + "px," + yString + "px) scale(" + zoomString + ")");
	};

	// define the actions to be taken on pinch, swipe, tap, double tap
	PinchSwipe.addMediaGesturesDetection = function() {
		// swipe and drag gestures are detected on the media
		// pinch gesture is detected on its container, .media-box-inner
		// they must be separated because it seems that detecting drag and pinch on the same selector
		// has troubles: start event is reported on pinch or on drag, but not on both

		/**
		 * Catch each phase of the swipe.
		 * move : we drag the div
		 * cancel : we animate back to where we were
		 * end : we animate to the next image
		 */
		function swipeStatus(event, phase, direction, distance, duration, fingerCount) {
			//If we are moving before swipe, and we are going L or R in X mode, or U or D in Y mode then drag.
			if (phase == "start")
				isLongTap = false;

			// when dragging with the mouse, fingerCount is 0
			if (distance >= tapDistanceThreshold && fingerCount <= 1) {
				if (currentZoom == 1) {
					// zoom = 1: swipe
					if (phase == "move") {
						if (direction == "left") {
							PinchSwipe.scrollMedia(windowWidth + distance);
						} else if (direction == "right") {
							PinchSwipe.scrollMedia(windowWidth - distance);
						}
					} else if (phase == "cancel") {
						PinchSwipe.swipeMedia(windowWidth);
					} else if (phase == "end") {
						if (direction == "right") {
							PinchSwipe.swipeRight(prevMedia);
						} else if (direction == "left") {
							PinchSwipe.swipeLeft(nextMedia);
						} else if (direction == "down") {
							PinchSwipe.swipeDown(upLink);
						}
					}
				} else {
					// zoom > 1: drag
					if (
						phase == "start" || phase == "end" || phase == "cancel" || distance == 0
					) {
						// distance = 0
						baseTranslateX = currentTranslateX;
						baseTranslateY = currentTranslateY;
					} else {
						// distance is the cumulative value from start
						// dragVector is calculated by pinchStatus
						PinchSwipe.drag(distance / devicePixelRatio, dragVector, 0);
						// PinchSwipe.drag(distance / currentZoom / devicePixelRatio, dragVector, 0);
					}
				}
			}
		}

		function pinchStatus(event, phase, direction, distance , duration , fingerCount, pinchZoom, fingerData) {
			// the drag vector is calculated here for use in the swipeStatus function
			// lamentably, swipeStatus doesn't return info about the swipe vector
			var dragVectorX = fingerData[0].end.x - fingerData[0].start.x;
			var dragVectorY = fingerData[0].end.y - fingerData[0].start.y;
			var dragVectorLength = Math.sqrt(dragVectorX * dragVectorX + dragVectorY * dragVectorY);
			if (dragVectorLength)
				// normalize the vector
				dragVector = {
					"x": dragVectorX / dragVectorLength,
					"y": dragVectorY / dragVectorLength
				};
			else
				dragVector = [0, 0];

			if (phase === "start") {
				// distance = 0
				baseZoom = currentZoom;
			} else if (phase === "move" && fingerCount >= 2) {
				// phase is "move"
				PinchSwipe.pinchInOut(baseZoom, pinchZoom, duration);
			}
		}

		function hold(event, target) {
			isLongTap = true;
		}

		function tap(event, target) {
			if (currentZoom == 1) {
				if (event.which === 3) {
					// right click
					if (prevMedia !== null)
						PinchSwipe.swipeRight(prevMedia);
				} else if (! isLongTap) {
					if (! fromResetZoom) {
						if (nextMedia !== null)
							PinchSwipe.swipeLeft(nextMedia);
					} else
						fromResetZoom = false;
				}
			}
		}

		function longTap(event, target) {
			PinchSwipe.swipeRight(prevMedia);
		}

		function doubleTap(event, target) {
			if (currentZoom == 1) {
				PinchSwipe.swipeRight(prevMedia);
			} else {
				// currentZoom > 1
				// image scaled up, reduce it to base zoom
				$(mediaSelector).css("transform", "scale(1)");
				currentZoom = 1;
				fromResetZoom = true;
			}
		}

		var tapDistanceThreshold = 2;
		var isLongTap;

		var baseZoom = 1;
		var fromResetZoom = false;

		mediaWidth = parseInt($(mediaSelector).css("width"));
		mediaHeight = parseInt($(mediaSelector).css("height"));

		currentZoom = 1;
		baseTranslateX = 0;
		baseTranslateY = 0;
		currentTranslateX = 0;
		currentTranslateY = 0;

		$(mediaSelector).css("transition-duration", "0ms");

		var swipeOrDragOptions = {
			triggerOnTouchEnd: true,
			allowPageScroll: "none",
			swipeStatus: swipeStatus,
			tap: tap,
			longTap: longTap,
			doubleTap: doubleTap,
			hold: hold,
			// allowPageScroll: "vertical",
			threshold: 75,
			fingers: 1
		};

		var pinchOptions = {
			triggerOnTouchEnd: true,
			allowPageScroll: "none",
			preventDefaultEvents: true,
			pinchStatus: pinchStatus,
			// allowPageScroll: "vertical",
			threshold: 10,
			fingers: 2
		};

		nextSizeReduction = util.nextSizeReduction();
		PinchSwipe.initialize();

		$(mediaContainerSelector).swipe(swipeOrDragOptions);
		$(mediaSelector).swipe(pinchOptions);
	};

	PinchSwipe.prototype.getCurrentZoom = function () {
		return currentZoom;
	};

	PinchSwipe.initialize = function () {
		// $('#album-view').swipe('destroy');

		var pastInitialMediaWidthOnScreen, pastCurrentZoom;
		mediaBoxInnerWidth = parseInt($(mediaContainerSelector).css("width"));
		mediaBoxInnerHeight = parseInt($(mediaContainerSelector).css("height"));

		if (currentZoom > 1) {
			pastInitialMediaWidthOnScreen = initialMediaWidthOnScreen;
			pastCurrentZoom = currentZoom;
		}
		initialMediaWidthOnScreen = $(mediaSelector)[0].width;
		//maxAllowedZoom = Number(($(mediaSelector).attr("width") / initialMediaWidthOnScreen).toFixed(2));
		maxAllowedZoom = Number((currentMedia.metadata.size[0] / initialMediaWidthOnScreen).toFixed(2));
		if (currentZoom > 1) {
			// change zoom so that the photo looks like before
			currentZoom = currentZoom / initialMediaWidthOnScreen * pastInitialMediaWidthOnScreen;
			PinchSwipe.pinchInOut(pastCurrentZoom, currentZoom / pastCurrentZoom, 0);

			maxAllowedTranslateX = Math.max(currentZoom * mediaWidth - mediaBoxInnerWidth, 0) / 2;
			minAllowedTranslateX = - maxAllowedTranslateX;
			maxAllowedTranslateY = Math.max(currentZoom * mediaHeight - mediaBoxInnerHeight, 0) / 2;
			minAllowedTranslateY = - maxAllowedTranslateY;
		}

		PinchSwipe.setPinchButtonsVisibility();
	};

	PinchSwipe.prototype.swipeOnWheel = function(event, delta) {
		if (currentMedia === null)
			return true;
		if (! event.shiftKey && ! event.altKey && ! event.ctrlKey) {
			if (currentZoom == 1) {
				// mouse wheel with no key: swipe
				if (delta < 0) {
					PinchSwipe.swipeLeft(nextMedia);
					return false;
				} else if (delta > 0) {
					PinchSwipe.swipeRight(prevMedia);
					return false;
				}
			} else {
				// drag
				if (event.deltaY < 0) {
					PinchSwipe.drag(mediaBoxInnerWidth / 10, {x: 0, y: -1}, dragSpeed);
					return false;
				} else if (event.deltaY > 0) {
					PinchSwipe.drag(mediaBoxInnerWidth / 10, {x: 0, y: 1}, dragSpeed);
					return false;
				} else if (event.deltaX < 0) {
					PinchSwipe.drag(mediaBoxInnerWidth / 10, {x: 1, y: 0}, dragSpeed);
					return false;
				} else if (event.deltaX > 0) {
					PinchSwipe.drag(mediaBoxInnerWidth / 10, {x: -1, y: 0}, dragSpeed);
					return false;
				}
			}
		} else {
			// mouse wheel with shift/control/alt key: pinch
			if (delta < 0) {
				PinchSwipe.pinchOut();
				return false;
			} else if (delta > 0) {
				PinchSwipe.pinchIn();
				return false;
			}
		}
		return true;
	};

	PinchSwipe.prototype.swipeRightOrDrag = function(media) {
		if (currentZoom == 1) {
			if (! $(".title").hasClass("hidden-by-pinch"))
				$("#prev")[0].click();
			// PinchSwipe.swipeRight(media);
		} else {
			// drag
			PinchSwipe.drag(mediaBoxInnerWidth / 10, {x: 1, y: 0}, dragSpeed);
		}
	};

	PinchSwipe.swipeRight = function(media) {
		$("#media-box-container").on(
			'webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd',
			function() {
				var savedSearchSubAlbumHash, savedSearchAlbumHash;

				$("#media-box-container").off('webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd');
				$("#media-box-container").css("transition-duration", "0s");

				// remove right image and move html code to left side
				$(".media-box#right").remove();
				// $("#media-box-container").css("transform", "translate(0px,0)");
				$(".media-box#center").attr('id', 'right');
				$(".media-box#left").attr('id', 'center');
				util.mediaBoxGenerator('left');
				$(".media-box#left").css("width", $(".media-box#center").attr('width')).css("height", $(".media-box#center").attr('height'));

				var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);
				window.location.href = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
			}
		);

		$("#pinch-container").addClass("hidden");
		PinchSwipe.swipeMedia(0);
	};

	PinchSwipe.prototype.swipeLeftOrDrag = function(media) {
		if (currentZoom == 1) {
			if (! $(".title").hasClass("hidden-by-pinch"))
				$("#next")[0].click();
			// PinchSwipe.swipeLeft(media);
		} else {
			// drag
			PinchSwipe.drag(mediaBoxInnerWidth / 10, {x: -1, y: 0}, dragSpeed);
		}
	};

	PinchSwipe.swipeLeft = function(media) {
		$("#media-box-container").on(
			'webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd',
			function() {
				var savedSearchSubAlbumHash, savedSearchAlbumHash;

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
				// if (! isMobile(any))
				$("#media-box-container").css("transform", "translate(-" + windowWidth + "px, 0px)");

				var [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash] = phFl.decodeHash(location.hash);
				window.location.href = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
			}
		);

		$("#pinch-container").addClass("hidden");
		PinchSwipe.swipeMedia(windowWidth * 2);
	};

	PinchSwipe.prototype.swipeUpOrDrag = function(media) {
		if (currentZoom == 1) {
			if (! $(".title").hasClass("hidden-by-pinch"))
				PinchSwipe.swipeUp(media);
		} else {
			// drag
			PinchSwipe.drag(mediaBoxInnerWidth / 10, {x: 0, y: -1}, dragSpeed);
		}
	};

	PinchSwipe.swipeUp = function(dest) {
		// Actually swiping up is passing from an album to a media, so there is no animation
		// ...or... the media could be let enter from below, as in horizontal swipe... TO DO
		// As is, it doesn't work
		if (dest) {
			$(mediaContainerSelector).stop().animate(
				{
					top: "-=" + window.innerHeight,
				},
				300,
				function() {
					window.location.href = dest;
					$(mediaContainerSelector).hide().css('top', "");
				}
			);
		}
	};

	PinchSwipe.prototype.swipeDownOrDrag = function(media) {
		if (currentZoom == 1) {
			if (! $(".title").hasClass("hidden-by-pinch"))
				PinchSwipe.swipeDown(media);
		} else {
			// drag
			PinchSwipe.drag(mediaBoxInnerWidth / 10, {x: 0, y: 1}, dragSpeed);
		}
	};

	PinchSwipe.swipeDown = function(dest) {
		if (dest && window.location.hash !== dest) {
			$(mediaContainerSelector).stop().animate(
				{
					top: "+=" + window.innerHeight,
					opacity: 0
				},
				300,
				function() {
					// if (window.location.hash !== dest)
					// 	$(window).hashchange();
					// else
					window.location.href = dest;
					// $("#media-view").addClass("hidden");
					$(mediaContainerSelector).css('top', "");
				}
			);
		}
	};

	/* make static methods callable as member functions */
	PinchSwipe.prototype.swipeLeft = PinchSwipe.swipeLeft;
	PinchSwipe.prototype.swipeRight = PinchSwipe.swipeRight;
	PinchSwipe.prototype.swipeDown = PinchSwipe.swipeDown;
	PinchSwipe.prototype.pinchIn = PinchSwipe.pinchIn;
	PinchSwipe.prototype.pinchOut = PinchSwipe.pinchOut;
	PinchSwipe.prototype.addMediaGesturesDetection = PinchSwipe.addMediaGesturesDetection;
	PinchSwipe.prototype.addAlbumGesturesDetection = PinchSwipe.addAlbumGesturesDetection;
	PinchSwipe.prototype.setPinchButtonsVisibility = PinchSwipe.setPinchButtonsVisibility;
	PinchSwipe.prototype.initialize = PinchSwipe.initialize;
	PinchSwipe.prototype.swipeUp = PinchSwipe.swipeUp;

	window.PinchSwipe = PinchSwipe;
}());
