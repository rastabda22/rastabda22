/*jshint esversion: 6 */
(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var swipeSpeed = 350;
	var pinchSpeed = 500;
	var dragSpeed = 500;
	var mediaContainerSelector = ".media-box#center .media-box-inner";
	var mediaSelector = mediaContainerSelector + " img";
	var currentZoom, zoomIncrement = 1.5625, zoomDecrement = 1 / zoomIncrement;
	var currentTranslateX = 0;
	var currentTranslateY = 0;
	// var nextReduction = false;
	// var initialMediaWidthOnScreen;
	var initialZoom;

	var maxAllowedTranslateX, minAllowedTranslateX, maxAllowedTranslateY, minAllowedTranslateY;
	var mediaWidth, mediaHeight;
	var mediaBoxInnerWidth, mediaBoxInnerHeight;

	var baseTranslateX = 0, baseTranslateY = 0;

	var dragVector;
	var pastMediaWidthOnScreen, pastMediaHeightOnScreen, pastMediaRatioOnScreen;

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

	PinchSwipe.pinchInOut = function(startZoom, finalZoom, duration, callback) {
		var [currentReductionSize, currentReductionIndex] = util.currentSizeAndIndex();
		var photoWidth, photoHeight, width, height;
		var photoSize = Math.max(currentMedia.metadata.size[0], currentMedia.metadata.size[1]);
		// scaleZoom is the value we must give to the scale part of the transform css property.
		// In css("transform", ...), scale(1) means that the image fits into the given width/height values
		var htmlSize = Math.max(Number($(mediaSelector).attr("width")), Number($(mediaSelector).attr("height")));
		var scaleZoom = finalZoom / initialZoom;
		var xString = currentTranslateX.toFixed(0).toString();
		var yString = currentTranslateY.toFixed(0).toString();
		var scaleString = scaleZoom.toFixed(2).toString();
		var currentCssTransformScale = 1;
		if ($(mediaSelector).css("transform") !== "none")
			currentCssTransformScale = parseFloat($(mediaSelector).css("transform").split("(")[1].split(",")[0]);

		if (finalZoom < startZoom && finalZoom > initialZoom) {
			// translation must be reduced too
			currentTranslateX = Number(currentTranslateX * (finalZoom - 1) / (startZoom - 1));
			currentTranslateY = Number(currentTranslateY * (finalZoom - 1) / (startZoom - 1));
			baseTranslateX = currentTranslateX;
			baseTranslateY = currentTranslateY;
		}

		// currentCssTransformScale = currentCssTransformScale * finalZoom / startZoom;

		$(mediaSelector).css("transition-duration", duration + "ms");
		$(mediaSelector).css("transform", "translate(" + xString + "px," + yString + "px) scale(" + scaleString + ")");
		currentZoom = finalZoom;

		if (finalZoom > startZoom) {
			var [nextReductionSize, nextReductionIndex] = util.nextSizeAndIndex();
			if (nextReductionIndex !== false && photoSize * finalZoom >= currentReductionSize) {
				// use next size reduction
				photoWidth = currentMedia.metadata.size[0];
				photoHeight = currentMedia.metadata.size[1];
				if (photoWidth > photoHeight) {
					width = nextReductionSize;
					height = parseInt(nextReductionSize / photoWidth * photoHeight);
				} else {
					height = nextReductionSize;
					width = parseInt(nextReductionSize / photoHeight * photoWidth);
				}
				$(mediaSelector).attr("width", width).attr("height", height).attr("src", util.nextReduction());
			}
		}

		if (finalZoom <= initialZoom && typeof callback !== "undefined")
			// callback is the function that possibly shows the title and the bottom thumbnails
			window.setTimeout(callback, duration * 1.2);

		if (finalZoom > startZoom) {
			// preload next size photo
			let nextReduction = util.nextReduction();
			if (nextReduction !== false) {
				$.preloadImages(nextReduction);
			}
			$(mediaSelector).css("cursor", "all-scroll");
		} else {
			$(mediaSelector).css("cursor", "");
		}

		maxAllowedTranslateX = Math.max(finalZoom * mediaWidth - mediaBoxInnerWidth, 0) / 2;
		minAllowedTranslateX = - maxAllowedTranslateX;
		maxAllowedTranslateY = Math.max(currentZoom * mediaHeight - mediaBoxInnerHeight, 0) / 2;
		minAllowedTranslateY = - maxAllowedTranslateY;

		PinchSwipe.setPinchButtonsVisibility();
	};

	PinchSwipe.pinchIn = function(event, finalZoom) {
		var windowRatio;
		var mediaWidthOnScreen;
		if (
			currentZoom == initialZoom &&
			! $("#album-view.media-view-container").hasClass("hidden-by-pinch") && (
				$("#center .title").is(":visible") || $("#album-view.media-view-container").is(":visible")
			)
		) {
			// hide the title and the bottom thumbnails

			pastMediaWidthOnScreen = $(mediaSelector)[0].width;
			pastMediaHeightOnScreen = $(mediaSelector)[0].height;
			pastMediaRatioOnScreen = pastMediaWidthOnScreen / pastMediaHeightOnScreen;
			windowRatio = windowWidth / windowHeight;
			var mediaBoxInnerRatio = parseInt($("#center .media-box-inner").css("width")) / parseInt($("#center .media-box-inner").css("height"));

			$("#center .title").addClass("hidden-by-pinch");
			$("#album-view.media-view-container").addClass("hidden-by-pinch");

			// if (
			// 	pastMediaRatioOnScreen > mediaBoxInnerRatio && $(mediaSelector).outerWidth() == windowWidth ||
			// 	typeof finalZoom !== "undefined"
			// )
			// 	keepPinching = true;

			if (event === null)
				var event = {};
			event.data = {};
			event.data.resize = true;
			event.data.id = "center";
			event.data.media = currentMedia;
			event.data.currentZoom = currentZoom;
			event.data.initialZoom = initialZoom;
			event.data.callbackType = "pinch";
			event.data.callback = function() {
				var newInitialZoom = PinchSwipe.screenZoom();
				if (newInitialZoom !== initialZoom) {
					// hiding the bottom thumbnails has resized the image
					initialZoom = newInitialZoom;

					mediaWidthOnScreen = $(mediaSelector)[0].width;
					// currentZoom = currentZoom * mediaWidthOnScreen / pastMediaWidthOnScreen;
					// zoomAfterFirstPinch = currentZoom;
					util.setPinchButtonsPosition();
					util.correctPrevNextPosition();
					PinchSwipe.setPinchButtonsVisibility();
					mediaWidth = parseInt($(mediaSelector).css("width"));
					mediaHeight = parseInt($(mediaSelector).css("height"));
					currentZoom = initialZoom;
					finalZoom = currentZoom;
				} else if (typeof finalZoom === "undefined") {
					finalZoom = currentZoom * zoomIncrement;
				}
					// finalZoom = currentZoom * zoomIncrement;
				PinchSwipe.pinchInOut(currentZoom, finalZoom, pinchSpeed);
			};

			util.scaleMedia(event);
		} else {
			if (typeof finalZoom === "undefined")
				finalZoom = currentZoom * zoomIncrement;
			PinchSwipe.pinchInOut(currentZoom, finalZoom, pinchSpeed);
		}
	};

	PinchSwipe.pinchOut = function(event) {
		var mediaWidthOnScreen, mediaHeightOnScreen, mediaRatioOnScreen, windowRatio;
		var finalZoom = currentZoom * zoomDecrement;
		if (currentZoom > initialZoom) {
			if (finalZoom < initialZoom)
				finalZoom = initialZoom;
			PinchSwipe.pinchInOut(
				currentZoom,
				finalZoom,
				pinchSpeed,
				function () {
					// check whether the final pinchout (re-establishing title and the bottom thumbnails) has to be performed
					mediaWidthOnScreen = $(mediaSelector)[0].width;
					mediaHeightOnScreen = $(mediaSelector)[0].height;
					mediaRatioOnScreen = pastMediaWidthOnScreen / pastMediaHeightOnScreen;
					windowRatio = windowWidth / windowHeight;

					if (
						mediaRatioOnScreen > windowRatio &&
						$(mediaSelector).outerWidth() == windowWidth || (
							$("#center .title").hasClass("hidden") ||
							$("#center .title").hasClass("hidden-by-option") ||
							$("#center .title").hasClass("hidden-by-fullscreen")
						) && (
							$("#album-view.media-view-container").hasClass("hidden") ||
							$("#album-view.media-view-container").hasClass("hidden-by-option") ||
							$("#album-view.media-view-container").hasClass("hidden-by-fullscreen")
						)
					)
						showTitleAndBottomThumbnails();
				}
			);
		} else {
			showTitleAndBottomThumbnails();
		}
		// end of function body

		function showTitleAndBottomThumbnails() {
			$("#center .title").removeClass("hidden-by-pinch");
			$("#album-view.media-view-container").removeClass("hidden-by-pinch");
			$(mediaSelector).css("transform", "scale(1)");
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
				initialZoom = PinchSwipe.screenZoom();
				currentZoom = initialZoom;
			};
			event.data.callbackType = "pinch";
			event.data.currentZoom = currentZoom;
			event.data.initialZoom = initialZoom;
			pastMediaWidthOnScreen = $(mediaSelector)[0].width;
			util.scaleMedia(event);
		}
	};

	PinchSwipe.setPinchButtonsVisibility = function() {
		$("#pinch-container").removeClass("hidden");

		if (currentMedia.mimeType === "video") {
			$("#pinch-container").hide();
		} else {
			$("#pinch-container").show();

			$("#pinch-in").off("click");
			$("#pinch-in").on(
				"click",
				function(ev) {
					PinchSwipe.pinchIn(null);
				}
			);
			$("#pinch-in").removeClass("disabled");

			$("#pinch-out").off("click");
			if (currentZoom === initialZoom && ! $("#center .title").hasClass("hidden-by-pinch")) {
				$("#pinch-out").addClass("disabled");
			} else {
				$("#pinch-out").on(
					"click",
					function(ev) {
						PinchSwipe.pinchOut(null);
					}
				);
				$("#pinch-out").removeClass("disabled");
			}
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
		var scaleString = currentZoom.toString();

		$(mediaSelector).css("transform", "translate(" + xString + "px," + yString + "px) scale(" + scaleString + ")");
		$(mediaSelector).css("transform", "translate(" + xString + "px," + yString + "px) scale(" + scaleString + ")");
	};

	// define the actions to be taken on pinch, swipe, tap, double tap
	PinchSwipe.prototype.addMediaGesturesDetection = function() {
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
			if (event.which === 3 && (event.shiftKey || event.ctrlKey || event.altKey)) {
				return;
			}

			if (phase == "start")
				isLongTap = false;

			// when dragging with the mouse, fingerCount is 0
			if (distance >= tapDistanceThreshold && fingerCount <= 1) {
				if (currentZoom == initialZoom) {
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

			if (event.which === 3 && (event.shiftKey || event.ctrlKey || event.altKey)) {
				return;
			}

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
			if (currentZoom == initialZoom) {
				if (event.which === 3) {
					// right click
					if (prevMedia !== null) {
						PinchSwipe.swipeRight(prevMedia);
						return false;
					}
				} else if (! isLongTap) {
					if (! fromResetZoom) {
						if (nextMedia !== null) {
							PinchSwipe.swipeLeft(nextMedia);
							return false;
						}
					} else
						fromResetZoom = false;
				}
			}
			return true;
		}

		function longTap(event, target) {
			PinchSwipe.swipeRight(prevMedia);
		}

		function doubleTap(event, target) {
			if (currentZoom == initialZoom) {
				PinchSwipe.swipeRight(prevMedia);
			} else {
				// currentZoom > initialZoom
				// image scaled up, reduce it to base zoom
				$(mediaSelector).css("transform", "scale(1)");
				currentZoom = initialZoom;
				fromResetZoom = true;
			}
		}

		var tapDistanceThreshold = 2;
		var isLongTap;

		initialZoom = PinchSwipe.screenZoom();
		var fromResetZoom = false;

		mediaWidth = parseInt($(mediaSelector).css("width"));
		mediaHeight = parseInt($(mediaSelector).css("height"));

		currentZoom = initialZoom;
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

		// nextReduction = util.nextReduction();
		PinchSwipe.initialize();

		$(mediaContainerSelector).swipe(swipeOrDragOptions);
		$(mediaSelector).swipe(pinchOptions);
	};

	PinchSwipe.screenZoom = function() {
		var imageRatio = currentMedia.metadata.size[0] / currentMedia.metadata.size[1];
		var mediaBoxInnerRatio = parseInt($("#center .media-box-inner").css("width")) / parseInt($("#center .media-box-inner").css("height"));
		if (imageRatio > mediaBoxInnerRatio)
			return $(mediaSelector)[0].width / currentMedia.metadata.size[0];
		else
			return $(mediaSelector)[0].height / currentMedia.metadata.size[1];
		// if (imageRatio > mediaBoxInnerRatio)
		// 	return $(mediaSelector)[0].width / parseInt($("#center .media-box-inner").css("width"));
		// else
		// 	return $(mediaSelector)[0].height / parseInt($("#center .media-box-inner").css("height"));
	};

	PinchSwipe.prototype.getCurrentZoom = function () {
		return currentZoom;
	};

	PinchSwipe.prototype.getInitialZoom = function () {
		return initialZoom;
	};

	PinchSwipe.initialize = function () {
		// $('#album-view').swipe('destroy');

		mediaBoxInnerWidth = parseInt($(mediaContainerSelector).css("width"));
		mediaBoxInnerHeight = parseInt($(mediaContainerSelector).css("height"));

		initialZoom = PinchSwipe.screenZoom();
		currentZoom = initialZoom
		// if (currentZoom > initialZoom) {
		// 	pastInitialMediaWidthOnScreen = initialMediaWidthOnScreen;
		// // }
		// // if (currentZoom > initialZoom) {
		// 	// change zoom so that the photo looks like before
		// 	newZoom = currentZoom / initialMediaWidthOnScreen * pastInitialMediaWidthOnScreen;
		// 	PinchSwipe.pinchInOut(currentZoom, newZoom / currentZoom, 0);
		//
		// 	maxAllowedTranslateX = Math.max(newZoom * mediaWidth - mediaBoxInnerWidth, 0) / 2;
		// 	minAllowedTranslateX = - maxAllowedTranslateX;
		// 	maxAllowedTranslateY = Math.max(newZoom * mediaHeight - mediaBoxInnerHeight, 0) / 2;
		// 	minAllowedTranslateY = - maxAllowedTranslateY;
		// }

		PinchSwipe.setPinchButtonsVisibility();
	};

	PinchSwipe.prototype.swipeOnWheel = function(event, delta) {
		if (currentMedia === null)
			return true;
		if (! event.shiftKey && ! event.altKey && ! event.ctrlKey) {
			if (currentMedia.mimeType === "video" || currentMedia.mimeType === "image" && currentZoom == initialZoom) {
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
		} else if (currentMedia.mimeType === "image") {
			// mouse wheel with shift/control/alt key: pinch
			if (delta < 0) {
				PinchSwipe.pinchOut(event);
				return false;
			} else if (delta > 0) {
				PinchSwipe.pinchIn(event);
				return false;
			}
		}
		return true;
	};

	PinchSwipe.prototype.swipeRightOrDrag = function(media) {
		if (currentZoom == initialZoom) {
			$("#album-view.media-view-container").removeClass("hidden-by-pinch");
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
		if (currentZoom == initialZoom) {
			$("#album-view.media-view-container").removeClass("hidden-by-pinch");
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
		if (currentZoom == initialZoom) {
			if (! $("#center .title").hasClass("hidden-by-pinch"))
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
		if (currentZoom == initialZoom) {
			if (! $("#center .title").hasClass("hidden-by-pinch"))
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
	PinchSwipe.prototype.addAlbumGesturesDetection = PinchSwipe.addAlbumGesturesDetection;
	PinchSwipe.prototype.setPinchButtonsVisibility = PinchSwipe.setPinchButtonsVisibility;
	PinchSwipe.prototype.swipeUp = PinchSwipe.swipeUp;
	PinchSwipe.prototype.initialize = PinchSwipe.initialize;

	window.PinchSwipe = PinchSwipe;
}());
