(function() {

  var phFl = new PhotoFloat();
  var util = new Utilities();
  var swipeSpeed = 800;
  var pinchSpeed = 500;
  var mediaContainerSelector = ".media-box#center .media-box-inner";
  var mediaSelector = mediaContainerSelector + " img";
  var currentZoom, zoomIncrement = 1.5, zoomDecrement = 0.666666667;
  var maxAllowedZoom;
  // minAllowedZoom must be <=1
  var minAllowedZoom = 1;
  var currentTranslateX = 0;
  var currentTranslateY = 0;
  var nextSizeReduction = false;
  var initialMediaWidthOnScreen;

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

  PinchSwipe.pinchInOut = function(baseZoom, pinchZoom, duration) {
    console.log("----", baseZoom, pinchZoom);
    var nextSize, photoWidth, photoHeight, width, height;
    currentZoom = Math.max(Math.min((baseZoom * pinchZoom).toFixed(2), maxAllowedZoom), minAllowedZoom);
    console.log(currentZoom);
    if (pinchZoom < 1 && baseZoom > 1) {
      // translation must be reduced too
      currentTranslateX = (currentTranslateX * (currentZoom - 1) / (baseZoom - 1)).toFixed(2);
      currentTranslateY = (currentTranslateY * (currentZoom - 1) / (baseZoom - 1)).toFixed(2);
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
            height = (nextSize / photoWidth * photoHeight).toFixed(0);
          } else {
            height = nextSize;
            width = (nextSize / photoHeight * photoWidth).toFixed(0);
          }
          $(mediaSelector).attr("width", width).attr("height", height).attr("src", nextSizeReduction);
          maxAllowedZoom = ($(mediaSelector).attr("width") / initialMediaWidthOnScreen).toFixed(2);
          console.log($(mediaSelector).attr("src"), $(mediaSelector).attr("width"), "max", maxAllowedZoom);
        }
      }
      baseZoom = maxAllowedZoom;
    }

    var xString = currentTranslateX.toString();
    var yString = currentTranslateY.toString();
    var zoomString = currentZoom.toString();

    $(mediaSelector).css("transition-duration", duration + "ms");
    $(mediaSelector).css("transform", "translate(" + xString + "px," + yString + "px) scale(" + zoomString + ")");

    if (pinchZoom > 1) {
      // preload next size photo
      // A CHECK THAT IT'S A PHOTO IS MISSING
      $(mediaSelector).on(
        'webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd',
        function() {
          $(mediaSelector).off('webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd');

          nextSizeReduction = util.nextSizeReduction();
          if (nextSizeReduction !== false) {
            $.preloadImages(nextSizeReduction);
          }
        }
      );
    }

    PinchSwipe.setPinchButtonsVisibility();
  };

  PinchSwipe.setPinchButtonsVisibility = function() {
    $("#pinch-container").removeClass("hidden");

    if (currentZoom == maxAllowedZoom) {
      $("#pinch-in").off("click");
      $("#pinch-in").addClass("disabled");
    } else {
      $("#pinch-in").on("click", ps.pinchIn);
      $("#pinch-in").removeClass("disabled");
    }

    if (currentZoom == minAllowedZoom) {
      $("#pinch-out").off("click");
      $("#pinch-out").addClass("disabled");
    } else {
      $("#pinch-out").on("click", ps.pinchOut);
      $("#pinch-out").removeClass("disabled");
    }
  };

  PinchSwipe.prototype.setPinchButtonsPosition = function(containerHeight, containerWidth) {
		// calculate and set pinch buttons position

		var mediaElement = $(".media-box#center .media-box-inner img");
		var actualHeight = mediaElement.height();
		var actualWidth = mediaElement.width();
		var distanceFromImageBorder = 15;
		var pinchBottom = Math.round((containerHeight - actualHeight) / 2 + distanceFromImageBorder);
		var pinchRight = Math.round((containerWidth - actualWidth) / 2 + distanceFromImageBorder);
		$("#pinch-container").css("right", pinchRight.toString() + "px").css("bottom", pinchBottom.toString() + "px");

		if ($("#center .links").is(":visible")) {
			while (Utilities.isColliding($("#pinch-container"), $("#center .links")) || Utilities.isColliding($("#pinch-container"), $(".ssk-group"))) {
				// overlap with the links bar: move up the pinch buttons
				pinchBottom += 5;
				$("#pinch-container").css("bottom", pinchBottom.toString() + "px");
			}
			// add some more space
			$("#pinch-container").css("bottom", (pinchBottom + distanceFromImageBorder).toString() + "px");
		}
	};

  PinchSwipe.pinchIn = function() {
    PinchSwipe.pinchInOut(currentZoom, zoomIncrement, pinchSpeed);
  };

  PinchSwipe.pinchOut = function() {
    PinchSwipe.pinchInOut(currentZoom, zoomDecrement, pinchSpeed);
  };

  // // define the actions to be taken on pinch, swipe, tap, double tap
	// PinchSwipe.addAlbumGesturesDetection = function() {
  //
  //   var swipeOptions = {
  //     triggerOnTouchEnd: true,
  //     swipeStatus: swipeStatus,
  //     allowPageScroll: "vertical",
  //     // allowPageScroll: "vertical",
  //     threshold: 75
  //   };
  //
  //   /**
  //    * Catch each phase of the swipe.
  //    * move : we drag the div
  //    * cancel : we animate back to where we were
  //    * end : we animate to the next image
  //    */
  //   function swipeStatus(event, phase, direction, distance , duration , fingerCount) {
  //     //If we are moving before swipe, and we are going L or R in X mode, or U or D in Y mode then drag.
  //     console.log(event, phase, direction, distance , duration , fingerCount);
  //     if (phase == "move" && direction == "down") {
  //       PinchSwipe.swipeDown(upLink);
  //     }
  //   }
  //
  //   /**
  //    * Manually update the position of the imgs on drag
  //    */
  //
  //   $(function () {
  //     $(mediaContainerSelector).swipe('destroy');
  //     $(mediaSelector).swipe('destroy');
  //     $('#album-view').swipe(swipeOptions);
  //   });
	// };

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
    function swipeStatus(event, phase, direction, distance , duration , fingerCount) {
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
          var maxAllowedTranslateX = Math.max(currentZoom * mediaWidth - mediaBoxInnerWidth, 0) / 2;
          var minAllowedTranslateX = - maxAllowedTranslateX;
          var maxAllowedTranslateY = Math.max(currentZoom * mediaHeight - mediaBoxInnerHeight, 0) / 2;
          var minAllowedTranslateY = - maxAllowedTranslateY;
          if (
            phase == "start" || phase == "end" || phase == "cancel" || distance == 0
          ) {
            // distance = 0
            baseTranslateX = currentTranslateX;
            baseTranslateY = currentTranslateY;
          } else {
            // distance is the cumulative value from start
            // dragVector is calculated by pinchStatus
            currentTranslateX = Math.max(Math.min(baseTranslateX + distance * dragVector.x, maxAllowedTranslateX), minAllowedTranslateX);
            currentTranslateY = Math.max(Math.min(baseTranslateY + distance * dragVector.y, maxAllowedTranslateY), minAllowedTranslateY);
          }

          var xString = currentTranslateX.toString();
          var yString = currentTranslateY.toString();
          var zoomString = currentZoom.toString();

          $(mediaSelector).css("transform", "translate(" + xString + "px," + yString + "px) scale(" + zoomString + ")");
        }
      }
    }

    function pinchStatus(event, phase, direction, distance , duration , fingerCount, pinchZoom, fingerData) {
      // the drag vector is calculated here for use in the swipeStatus function
      // lamentably, swipeStatus doesn't return info about the swipt vector
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
        PinchSwipe.pinchInOut(baseZoom, pinchZoom, 0);
      }
    }

    function hold(event, target) {
      isLongTap = true;
    }

    function tap(event, target) {
      if (currentZoom == 1) {
        if (event.which === 3)
          // right click
          PinchSwipe.swipeRight(prevMedia);
        else if (! isLongTap) {
          if (! fromResetZoom)
            PinchSwipe.swipeLeft(nextMedia);
          else
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

    var baseTranslateX = 0;
    var baseTranslateY = 0;

    var dragVector = [0, 0];

    var mediaWidth = parseInt($(mediaSelector).css("width"));
    var mediaHeight = parseInt($(mediaSelector).css("height"));
    var mediaBoxInnerWidth = parseInt($(mediaContainerSelector).css("width"));
    var mediaBoxInnerHeight = parseInt($(mediaContainerSelector).css("height"));

    currentZoom = 1;

    $(mediaSelector).css("transition-duration", "0ms");

		// get the two initial values:

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

  PinchSwipe.initialize = function () {
    // $('#album-view').swipe('destroy');

    if (currentZoom > 1) {
      var pastInitialMediaWidthOnScreen = initialMediaWidthOnScreen;
      var pastCurrentZoom = currentZoom;
    }
    initialMediaWidthOnScreen = $(mediaSelector)[0].width;
    maxAllowedZoom = ($(mediaSelector).attr("width") / initialMediaWidthOnScreen).toFixed(2);
    if (currentZoom > 1) {
      // change currentZoom so that the photo looks like before
      currentZoom = currentZoom / initialMediaWidthOnScreen * pastInitialMediaWidthOnScreen;
      PinchSwipe.pinchInOut(pastCurrentZoom, currentZoom / pastCurrentZoom, 0);
    }
    console.log(pastInitialMediaWidthOnScreen, initialMediaWidthOnScreen, pastCurrentZoom, currentZoom, $(mediaSelector).attr("src"), "max", maxAllowedZoom);

    PinchSwipe.setPinchButtonsVisibility();
  };

  PinchSwipe.prototype.swipeOnWheel = function(event, delta) {
		if (currentMedia === null)
			return true;
    if (! event.shiftKey && ! event.altKey && ! event.ctrlKey) {
      // mouse wheel with no key: swipe
  		if (delta < 0) {
  			PinchSwipe.swipeLeft(nextMedia);
  			return false;
  		} else if (delta > 0) {
  			PinchSwipe.swipeRight(prevMedia);
  			return false;
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

  PinchSwipe.swipeRight = function(media) {
		$("#media-box-container").on(
      'webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd',
      function() {
        var array, savedSearchSubAlbumHash, savedSearchAlbumHash;

        $("#media-box-container").off('webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd');
        $("#media-box-container").css("transition-duration", "0s");

        // remove right image and move html code to left side
        $(".media-box#right").remove();
        // $("#media-box-container").css("transform", "translate(0px,0)");
        $(".media-box#center").attr('id', 'right');
        $(".media-box#left").attr('id', 'center');
        util.mediaBoxGenerator('left');
        $(".media-box#left").css("width", $(".media-box#center").attr('width')).css("height", $(".media-box#center").attr('height'));


        array = phFl.decodeHash(location.hash);
        // array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
        savedSearchSubAlbumHash = array[3];
        savedSearchAlbumHash = array[4];
        window.location.href = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
      }
    );

    $("#pinch-container").addClass("hidden");
    PinchSwipe.swipeMedia(0);
	};

	PinchSwipe.swipeLeft = function(media) {
    $("#media-box-container").on(
      'webkitTransitionEnd oTransitionEnd transitionend msTransitionEnd',
      function() {
        var array, savedSearchSubAlbumHash, savedSearchAlbumHash;

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

        array = phFl.decodeHash(location.hash);
        // array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
        savedSearchSubAlbumHash = array[3];
        savedSearchAlbumHash = array[4];
        window.location.href = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
      }
    );

    $("#pinch-container").addClass("hidden");
    PinchSwipe.swipeMedia(windowWidth * 2);
	};

	PinchSwipe.prototype.swipeUp = function(dest) {
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
		if (dest) {
			$(mediaContainerSelector).stop().animate(
        {
  				top: "+=" + window.innerHeight,
  			},
        300,
        function() {
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

  window.PinchSwipe = PinchSwipe;
}());
