/*jshint esversion: 6 */
(function() {

	var phFl = new PhotoFloat();
	var util = new Utilities();
	var swipeSpeed = 350;
	var pinchSpeed = 500;
	var dragSpeed = 500;
	var mediaContainerSelector = ".media-box#center .media-box-inner";
	var mediaSelector = mediaContainerSelector + " img";
	var zoomIncrement = 1.5625, zoomDecrement = 1 / zoomIncrement;
	var currentTranslateX = 0;
	var currentTranslateY = 0;
	var previousClientX;
	var previousClientY;
	// var nextReduction = false;
	// var initialMediaWidthOnScreen;
	var baseZoom;

	var maxAllowedTranslateX, maxAllowedTranslateY;
	var mediaWidth, mediaHeight;
	var mediaBoxInnerWidth, mediaBoxInnerHeight;
	var photoWidth, photoHeight;
	var previousFingerEnd;


	var dragVector;
	var pastMediaWidthOnScreen, pastMediaHeightOnScreen, pastMediaRatioOnScreen;

	/* constructor */
	function PinchSwipe() {
	}

	PinchSwipe.cssWidth = function(mediaSelector) {
		return $(mediaSelector).css("width");
	};

	PinchSwipe.cssHeight = function(mediaSelector) {
		return $(mediaSelector).css("height");
	};

	PinchSwipe.reductionWidth = function(mediaSelector) {
		return $(mediaSelector).attr("width");
	};

	PinchSwipe.reductionHeight = function(mediaSelector) {
		return $(mediaSelector).attr("height");
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

	PinchSwipe.pinchInOut = function(startZoom, finalZoom, duration, center = null) {
		return new Promise(
			function(resolve_pinchInOut) {
				var windowCenter = {x: env.windowWidth / 2, y: env.windowHeight / 2};
				if (center === null)
					center = windowCenter;
				var centersDifference = {x: center.x - windowCenter.x, y: center.y - windowCenter.y};
				var [currentReductionSize, currentReductionIndex] = util.currentSizeAndIndex();
				var width, height;
				var photoSize = Math.max(... env.currentMedia.metadata.size);
				// scaleZoom is the value we must give to the scale part of the transform css property.
				// In css("transform", ...), scale(1) means that the image fits into the given width/height values
				var scaleZoom = finalZoom / env.initialZoom;

				var cssTransformTranslateX = 0;
				var cssTransformTranslateY = 0;
				var cssTransformScale = 1;
				if ($(mediaSelector).css("transform") !== "none") {
					cssTransformTranslateX = parseFloat($(mediaSelector).css("transform").split("(")[1].split(",")[4]);
					cssTransformTranslateY = parseFloat($(mediaSelector).css("transform").split("(")[1].split(",")[5].split(")")[0]);
					cssTransformScale = parseFloat($(mediaSelector).css("transform").split("(")[1].split(",")[0]);
				}

				if (startZoom > env.initialZoom) {
					// translation must be changed accordingly
					cssTransformTranslateX = (cssTransformTranslateX - centersDifference.x) * (finalZoom - env.initialZoom) / (startZoom - env.initialZoom) + centersDifference.x;
					cssTransformTranslateY = (cssTransformTranslateY - centersDifference.y) * (finalZoom - env.initialZoom) / (startZoom - env.initialZoom) + centersDifference.y;
				}

				// the following values are expressed in terms of the current zoom sizes

				maxAllowedTranslateX = (photoWidth * finalZoom - env.windowWidth) / 2;
				if (maxAllowedTranslateX < 0)
					maxAllowedTranslateX = 0;
				maxAllowedTranslateY = (photoHeight * finalZoom - env.windowHeight) / 2;
				if (maxAllowedTranslateY < 0)
					maxAllowedTranslateY = 0;

				cssTransformTranslateX = Math.max(Math.min(cssTransformTranslateX, maxAllowedTranslateX), - maxAllowedTranslateX);
				cssTransformTranslateY = Math.max(Math.min(cssTransformTranslateY, maxAllowedTranslateY), - maxAllowedTranslateY);

				// if (maxAllowedTranslateX) {
				// 	if (cssTransformTranslateX > maxAllowedTranslateX)
				// 		cssTransformTranslateX = maxAllowedTranslateX;
				// 	if (cssTransformTranslateX < - maxAllowedTranslateX)
				// 		cssTransformTranslateX = - maxAllowedTranslateX;
				// }
				// if (maxAllowedTranslateY) {
				// 	if (cssTransformTranslateY > maxAllowedTranslateY)
				// 		cssTransformTranslateY = maxAllowedTranslateY;
				// 	if (cssTransformTranslateY < - maxAllowedTranslateY)
				// 		cssTransformTranslateY = - maxAllowedTranslateY;
				// }

				// cssTransformScale = cssTransformScale * finalZoom / startZoom;
				var cssTranslateXString = cssTransformTranslateX.toString();
				var cssTranslateYString = cssTransformTranslateY.toString();
				var cssScale = scaleZoom.toString();

				$(mediaSelector).css("transition-duration", duration + "ms");
				$(mediaSelector).css("transform", "translate(" + cssTranslateXString + "px," + cssTranslateYString + "px) scale(" + cssScale + ")");

				if (finalZoom > startZoom) {
					var nextReductionSize = currentReductionSize;
					var nextReductionIndex = currentReductionIndex;
					if (currentReductionIndex !== -1) {
						while (nextReductionIndex !== -1 && nextReductionSize < photoSize * finalZoom) {
							if (nextReductionIndex === 0) {
								nextReductionIndex = -1;
								nextReductionSize = photoSize;
							} else {
								nextReductionIndex -= 1;
								nextReductionSize = env.options.reduced_sizes[nextReductionIndex];
							}
						}

						if (photoWidth > photoHeight) {
							width = nextReductionSize;
							height = parseInt(nextReductionSize / photoWidth * photoHeight);
						} else {
							height = nextReductionSize;
							width = parseInt(nextReductionSize / photoHeight * photoWidth);
						}
						let photoSrc;
						if (nextReductionIndex === -1)
							photoSrc = env.currentMedia.originalMediaPath();
						else
							photoSrc = env.currentMedia.mediaPath(nextReductionSize);
						$(mediaSelector).attr("width", width).attr("height", height).attr("src", photoSrc);
					}
				}

				if (finalZoom <= env.initialZoom)
					// resolving will possibly show the title and the bottom thumbnails
					window.setTimeout(resolve_pinchInOut, duration * 1.2);

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

				// util.setPinchButtonsPosition();
				// util.setPinchButtonsVisibility();
				util.setSelectButtonPosition();
				util.setDescriptionOptions();
				util.correctElementPositions();

				env.currentZoom = finalZoom;
			}
		);
	};

	PinchSwipe.pinchIn = function(event, finalZoom, duration = pinchSpeed, center = null) {
		var windowRatio;
		// var mediaWidthOnScreen;
		if (
			env.currentZoom === env.initialZoom &&
			! $("#album-and-media-container.show-media #thumbs").hasClass("hidden-by-pinch") && (
				$("#center .title").is(":visible") || $("#album-and-media-container.show-media #thumbs").is(":visible")
			)
		) {
			// hide the title and the bottom thumbnails

			pastMediaWidthOnScreen = $(mediaSelector)[0].width;
			pastMediaHeightOnScreen = $(mediaSelector)[0].height;
			pastMediaRatioOnScreen = pastMediaWidthOnScreen / pastMediaHeightOnScreen;
			windowRatio = env.windowWidth / env.windowHeight;

			$("#center .title").addClass("hidden-by-pinch");
			$("#album-and-media-container.show-media #thumbs").addClass("hidden-by-pinch");

			if (event === null)
				event = {};
			event.data = {};
			event.data.resize = true;
			event.data.pinch = true;
			event.data.id = "center";

			let scalePromise = env.currentMedia.scale(event);
			scalePromise.then(
				function() {
					$("#media-center").off("load").on(
						"load",
						function() {
							$("#media-center").off("load");
							var newInitialZoom = PinchSwipe.screenZoom();
							if (newInitialZoom !== env.initialZoom) {
								// hiding the bottom thumbnails has resized the image
								env.initialZoom = newInitialZoom;

								// mediaWidthOnScreen = $(mediaSelector)[0].width;
								// env.currentZoom = env.currentZoom * mediaWidthOnScreen / pastMediaWidthOnScreen;
								// zoomAfterFirstPinch = env.currentZoom;
								// util.setPinchButtonsPosition();
								// util.setPinchButtonsVisibility();
								util.setSelectButtonPosition();
								util.setDescriptionOptions();
								util.correctElementPositions();

								mediaWidth = $(mediaSelector).css("width");
								mediaHeight = $(mediaSelector).css("height");
								mediaBoxInnerWidth = $(mediaContainerSelector).css("width");
								mediaBoxInnerHeight = $(mediaContainerSelector).css("height");

								env.currentZoom = env.initialZoom;
								if (typeof finalZoom === "undefined")
									finalZoom = null;
								if (finalZoom === null || finalZoom < env.currentZoom)
									finalZoom = env.currentZoom;
							} else if (finalZoom === null || typeof finalZoom === "undefined") {
								finalZoom = env.currentZoom * zoomIncrement;
							}
							let pinchInOutPromise = PinchSwipe.pinchInOut(env.currentZoom, finalZoom, duration, center);
							pinchInOutPromise.then(
								function() {
									// do nothing
								}
							);
						}
					);
					// in case the image has been already loaded, trigger the event
					if ($("#media-center")[0].complete)
						$("#media-center").trigger("load");
				}
			);
		} else {
			if (finalZoom === null || typeof finalZoom === "undefined")
				finalZoom = env.currentZoom * zoomIncrement;
			let pinchInOutPromise = PinchSwipe.pinchInOut(env.currentZoom, finalZoom, duration, center);
			pinchInOutPromise.then(
				function() {
					// do nothing
				}
			);
		}
	};

	PinchSwipe.pinchOut = function(event, finalZoom = null, duration = pinchSpeed) {
		// var mediaWidthOnScreen, mediaHeightOnScreen;
		var mediaRatioOnScreen, windowRatio;
		var finalZoomWasZero = false;
		if (typeof finalZoom === "undefined")
			finalZoom = null;
		if (finalZoom === null)
			finalZoom = env.currentZoom * zoomDecrement;
		if (! finalZoom)
			finalZoomWasZero = true;
		if (env.currentZoom > env.initialZoom) {
			if (finalZoom < env.initialZoom)
				finalZoom = env.initialZoom;
			let pinchInOutPromise = PinchSwipe.pinchInOut(env.currentZoom, finalZoom, duration);
			pinchInOutPromise.then(
				function() {
					// check whether the final pinchout (re-establishing title and the bottom thumbnails) has to be performed
					// mediaWidthOnScreen = $(mediaSelector)[0].width;
					// mediaHeightOnScreen = $(mediaSelector)[0].height;
					mediaRatioOnScreen = pastMediaWidthOnScreen / pastMediaHeightOnScreen;
					windowRatio = env.windowWidth / env.windowHeight;
					mediaBoxInnerWidth = $(mediaContainerSelector).css("width");
					mediaBoxInnerHeight = $(mediaContainerSelector).css("height");

					if (
						finalZoomWasZero ||
						mediaRatioOnScreen > windowRatio &&
						$(mediaSelector).outerWidth() === env.windowWidth || (
							$("#center .title").hasClass("hidden") ||
							$("#center .title").hasClass("hidden-by-option") ||
							$("#center .title").hasClass("hidden-by-fullscreen")
						) && (
							$("#album-and-media-container.show-media #thumbs").hasClass("hidden") ||
							$("#album-and-media-container.show-media #thumbs").hasClass("hidden-by-option") ||
							$("#album-and-media-container.show-media #thumbs").hasClass("hidden-by-fullscreen")
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
			$("#album-and-media-container.show-media #thumbs").removeClass("hidden-by-pinch");
			$(mediaSelector).css("transform", "scale(1)");
			var event = {data: {}};
			event.data.resize = true;
			event.data.pinch = true;
			event.data.id = "center";
			pastMediaWidthOnScreen = $(mediaSelector)[0].width;
			let scalePromise = env.currentMedia.scale(event);
			scalePromise.then(
				function() {
					// mediaWidthOnScreen = $(mediaSelector)[0].width;
					// env.currentZoom = env.currentZoom * mediaWidthOnScreen / pastMediaWidthOnScreen;
					// env.currentZoom = 1;
					// zoomAfterFirstPinch = env.currentZoom;
					// util.setPinchButtonsPosition();
					// util.setPinchButtonsVisibility();
					util.setSelectButtonPosition();
					util.setDescriptionOptions();
					util.correctElementPositions();

					mediaWidth = $(mediaSelector).css("width");
					mediaHeight = $(mediaSelector).css("height");
					env.initialZoom = PinchSwipe.screenZoom();
					env.currentZoom = env.initialZoom;
				}
			);
		}
	};

	PinchSwipe.drag = function(distance, dragVector, duration = dragSpeed) {
		$(mediaSelector).css("transition-duration", duration + "ms");

		var cssTransformTranslateX = 0;
		var cssTransformTranslateY = 0;
		var cssTransformScale = 1;
		if ($(mediaSelector).css("transform") !== "none") {
			cssTransformTranslateX = parseFloat($(mediaSelector).css("transform").split("(")[1].split(",")[4]);
			cssTransformTranslateY = parseFloat($(mediaSelector).css("transform").split("(")[1].split(",")[5].split(")")[0]);
			cssTransformScale = parseFloat($(mediaSelector).css("transform").split("(")[1].split(",")[0]);
		}

		cssTransformTranslateX = cssTransformTranslateX + distance * dragVector.x;
		cssTransformTranslateY = cssTransformTranslateY + distance * dragVector.y;
		cssTransformTranslateX = Math.max(Math.min(cssTransformTranslateX, maxAllowedTranslateX), - maxAllowedTranslateX);
		cssTransformTranslateY = Math.max(Math.min(cssTransformTranslateY, maxAllowedTranslateY), - maxAllowedTranslateY);

		var cssTranslateXString = cssTransformTranslateX.toString();
		var cssTranslateYString = cssTransformTranslateY.toString();

		$(mediaSelector).css("transform", "translate(" + cssTranslateXString + "px," + cssTranslateYString + "px) scale(" + cssTransformScale + ")");
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

			if (event.button === 2 && (event.shiftKey || event.ctrlKey || event.altKey)) {
				return;
			}

			var clientX, clientY;

			if (phase === "start") {
				isLongTap = false;
			}

			// if (true || event.buttons > 0) {
			// when dragging with the mouse, fingerCount is 0
			if (event.touches === undefined || fingerCount === 1) {
				if (env.currentZoom === env.initialZoom) {
					// zoom = 1: swipe
					if (phase === "move" && event.buttons > 0) {
						if (direction === "left") {
							PinchSwipe.scrollMedia(env.windowWidth + distance);
						} else if (direction === "right") {
							PinchSwipe.scrollMedia(env.windowWidth - distance);
						}
					} else if (phase === "cancel" && event.buttons > 0) {
						PinchSwipe.swipeMedia(env.windowWidth);
					} else if (phase === "end") {
						if (direction === "right") {
							env.prevMedia.swipeRight();
						} else if (direction === "left") {
							env.nextMedia.swipeLeft();
						} else if (direction === "down" || direction === "up") {
							PinchSwipe.swipeDown(util.upHash());
						}
					}
				} else {
					// zoom > 1: drag

					if (event.clientX !== undefined) {
						clientX = event.clientX;
						clientY = event.clientY;
					} else if (event.touches !== undefined && event.touches.length > 0) {
						clientX = event.touches[0].clientX;
						clientY = event.touches[0].clientY;
					} else if (event.changedTouches !== undefined && event.changedTouches.length > 0) {
						clientX = event.changedTouches[0].clientX;
						clientY = event.changedTouches[0].clientY;
					}
					if (phase === "start"  && event.buttons > 0 || phase === "end" || phase === "cancel"  && event.buttons > 0 || distance === 0) {
						if (phase === "start") {
							previousClientX = clientX;
							previousClientY = clientY;
						}
						// distance = 0
						// baseTranslateX = currentTranslateX;
						// baseTranslateY = currentTranslateY;
					} else {
						var dragVectorX = clientX - previousClientX;
						var dragVectorY = clientY - previousClientY;
						previousClientX = clientX;
						previousClientY = clientY;
						// var dragVectorX = event.movementX;
						// var dragVectorY = event.movementY;
						var dragVectorLength = Math.sqrt(dragVectorX * dragVectorX + dragVectorY * dragVectorY);
						if (dragVectorLength)
							// normalize the vector
							dragVector = {
								x: dragVectorX / dragVectorLength,
								y: dragVectorY / dragVectorLength
							};
						else
							dragVector = [0, 0];
						// } else {
						// 	// the dragVector calculated by pinchStatus is used
						// }

						// PinchSwipe.drag(dragVectorLength / devicePixelRatio, dragVector, 0);
						PinchSwipe.drag(dragVectorLength, dragVector, 0);
					}
				}
			}
			// }
		}

		function pinchStatus(event, phase, direction, distance , duration , fingerCount, pinchZoom, fingerData) {
			// the drag vector is calculated here for use in the swipeStatus function
			// lamentably, swipeStatus doesn't return info about the swipe vector

			pinchZoom = parseFloat(pinchZoom);
			if (event.button === 2 && (event.shiftKey || event.ctrlKey || event.altKey)) {
				return;
			}

			if (phase === "start") {
				// distance = 0
				baseZoom = env.currentZoom;
				if (fingerCount < 2)
					previousFingerEnd = {x: fingerData[0].start.x, y: fingerData[0].start.y};
			} else if (phase === "move" && fingerCount >= 2) {
				// phase is "move"
				let center = {x: 0, y: 0};
				for (let i = 0; i < event.touches.length; i ++) {
					center.x += event.touches[i].clientX / event.touches.length;
					center.y += event.touches[i].clientY / event.touches.length;
				}

				let finalZoom = baseZoom * pinchZoom;
				// env.currentZoom = baseZoom;
				if (pinchZoom > 1) {
					PinchSwipe.pinchIn(event, finalZoom, 0, center);
				} else {
					PinchSwipe.pinchOut(event, finalZoom, 0);
				}
			}

			if (fingerCount < 2) {
				// calculate the dragVector for dragging
				var dragVectorX = fingerData[0].end.x - previousFingerEnd.x;
				var dragVectorY = fingerData[0].end.y - previousFingerEnd.y;
				previousFingerEnd = {x: fingerData[0].end.x, y: fingerData[0].end.y};
				var dragVectorLength = Math.sqrt(dragVectorX * dragVectorX + dragVectorY * dragVectorY);
				if (dragVectorLength)
					// normalize the vector
					dragVector = {
						x: dragVectorX / dragVectorLength,
						y: dragVectorY / dragVectorLength
					};
				else
					dragVector = [0, 0];
			}
		}

		function hold(event, target) {
			isLongTap = true;
		}

		function tap(event, target) {
			if (env.currentZoom === env.initialZoom) {
				if (event.button === 2) {
					// right click
					if (env.prevMedia !== null) {
						env.prevMedia.swipeRight();
						return false;
					}
				} else if (! isLongTap) {
					if (! fromResetZoom) {
						if (env.nextMedia !== null) {
							env.nextMedia.swipeLeft();
							return false;
						}
					} else
						fromResetZoom = false;
				}
			}
			return true;
		}

		function longTap(event, target) {
			env.prevMedia.swipeRight();
		}

		function doubleTap(event, target) {
			if (env.currentZoom === env.initialZoom) {
				env.prevMedia.swipeRight();
			} else {
				// env.currentZoom > env.initialZoom
				// image scaled up, reduce it to base zoom
				$(mediaSelector).css("transform", "scale(1)");
				env.currentZoom = env.initialZoom;
				fromResetZoom = true;
			}
		}

		// var tapDistanceThreshold = 2;
		var isLongTap;

		env.initialZoom = PinchSwipe.screenZoom();
		var fromResetZoom = false;

		mediaWidth = $(mediaSelector).css("width");
		mediaHeight = $(mediaSelector).css("height");

		env.currentZoom = env.initialZoom;
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
		var imageRatio = env.currentMedia.metadata.size[0] / env.currentMedia.metadata.size[1];
		var mediaBoxInnerRatio = parseInt($("#center .media-box-inner").css("width")) / parseInt($("#center .media-box-inner").css("height"));
		if (imageRatio > mediaBoxInnerRatio)
			return $(mediaSelector)[0].width / env.currentMedia.metadata.size[0];
		else
			return $(mediaSelector)[0].height / env.currentMedia.metadata.size[1];
		// if (imageRatio > mediaBoxInnerRatio)
		// 	return $(mediaSelector)[0].width / parseInt($("#center .media-box-inner").css("width"));
		// else
		// 	return $(mediaSelector)[0].height / parseInt($("#center .media-box-inner").css("height"));
	};

	PinchSwipe.getInitialZoom = function () {
		return env.initialZoom;
	};

	PinchSwipe.initialize = function () {
		// $('#album-view').swipe('destroy');

		mediaBoxInnerWidth = $(mediaContainerSelector).css("width");
		mediaBoxInnerHeight = $(mediaContainerSelector).css("height");
		photoWidth = env.currentMedia.metadata.size[0];
		photoHeight = env.currentMedia.metadata.size[1];

		// env.initialZoom = PinchSwipe.screenZoom();
		var newInitialZoom = PinchSwipe.screenZoom();
		if (newInitialZoom === env.initialZoom)
			env.currentZoom = newInitialZoom;
		env.initialZoom = newInitialZoom;

		util.setPinchButtonsVisibility();
	};

	PinchSwipe.prototype.swipeOnWheel = function(event, delta) {
		if (env.currentMedia === null)
			return true;
		if (! event.shiftKey && ! event.altKey && ! event.ctrlKey) {
			if (env.currentMedia.isVideo() || env.currentMedia.isImage() && env.currentZoom === env.initialZoom) {
				// mouse wheel with no key: swipe
				if (delta < 0) {
					env.nextMedia.swipeLeft();
					return false;
				} else if (delta > 0) {
					env.prevMedia.swipeRight();
					return false;
				}
			} else {
				// drag
				if (event.deltaY < 0) {
					PinchSwipe.drag(photoHeight / 5, {x: 0, y: -1});
					return false;
				} else if (event.deltaY > 0) {
					PinchSwipe.drag(photoHeight / 5, {x: 0, y: 1});
					return false;
				} else if (event.deltaX < 0) {
					PinchSwipe.drag(photoWidth / 5, {x: 1, y: 0});
					return false;
				} else if (event.deltaX > 0) {
					PinchSwipe.drag(photoWidth / 5, {x: -1, y: 0});
					return false;
				}
			}
		} else if (env.currentMedia.isImage()) {
			// mouse wheel with shift/control/alt key: pinch
			if (delta < 0) {
				PinchSwipe.pinchOut(event, env.currentZoom * 0.95, 0);
				return false;
			} else if (delta > 0) {
				PinchSwipe.pinchIn(event, env.currentZoom * 1.05, 0);
				return false;
			}
		}
		return true;
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
		PinchSwipe.swipeMedia(0);
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
		PinchSwipe.swipeMedia(env.windowWidth * 2);
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
	PinchSwipe.prototype.swipeDown = PinchSwipe.swipeDown;
	PinchSwipe.prototype.drag = PinchSwipe.drag;
	PinchSwipe.prototype.pinchIn = PinchSwipe.pinchIn;
	PinchSwipe.prototype.pinchOut = PinchSwipe.pinchOut;
	PinchSwipe.prototype.addAlbumGesturesDetection = PinchSwipe.addAlbumGesturesDetection;
	PinchSwipe.prototype.swipeUp = PinchSwipe.swipeUp;
	PinchSwipe.prototype.initialize = PinchSwipe.initialize;

	window.PinchSwipe = PinchSwipe;
}());
