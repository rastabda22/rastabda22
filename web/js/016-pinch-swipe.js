(function() {

  var phFl = new PhotoFloat();
  var util = new Utilities();
  var speed = 500;

	/* constructor */
	function PinchSwipe() {
	}

  PinchSwipe.cssWidth = function(mediaSelector) {
    return parseInt($(mediaSelector).css("width"));
  }

  PinchSwipe.cssHeight = function(mediaSelector) {
    return parseInt($(mediaSelector).css("height"));
  }

  PinchSwipe.reductionWidth = function(mediaSelector) {
    return parseInt($(mediaSelector).attr("width"));
  }

  PinchSwipe.reductionHeight = function(mediaSelector) {
    return parseInt($(mediaSelector).attr("height"));
  }

  PinchSwipe.pinched = function(mediaSelector, initialCssWidth) {
    return PinchSwipe.cssWidth(mediaSelector) > initialCssWidth;
  }

  PinchSwipe.scrollMedia = function(distance) {
    $("#media-box-container").css("transition-duration", "0s");

    //inverse the number we set in the css
    var value = (distance <= 0 ? "" : "-") + Math.abs(distance).toString();
    $("#media-box-container").css("transform", "translate(" + value + "px,0)");
  }

  PinchSwipe.swipeMedia = function(distance) {
      $("#media-box-container").css("transition-duration", "0.5s");

      //inverse the number we set in the css
      var value = (distance <= 0 ? "" : "-") + Math.abs(distance).toString();
      $("#media-box-container").css("transform", "translate(" + value + "px,0)");
  }

  // define the actions to be taken on pinch, swipe, tap, double tap
	PinchSwipe.addAlbumGesturesDetection = function() {

    var swipeOptions = {
      triggerOnTouchEnd: true,
      swipeStatus: swipeStatus,
      // allowPageScroll: "vertical",
      threshold: 75
    };

    /**
     * Catch each phase of the swipe.
     * move : we drag the div
     * cancel : we animate back to where we were
     * end : we animate to the next image
     */
    function swipeStatus(event, phase, direction, distance , duration , fingerCount) {
      //If we are moving before swipe, and we are going L or R in X mode, or U or D in Y mode then drag.
      // console.log(event, phase, direction, distance);
      if (phase == "move" && direction == "down") {
        PinchSwipe.swipeDown(upLink);
      }
    }

    /**
     * Manually update the position of the imgs on drag
     */

    $(function () {
      $(".media-box#center .media-box-inner").swipe('destroy');
      $(".media-box#center .media-box-inner img").swipe('destroy');
      $('#album-view').swipe(swipeOptions);
    });
	};

  // define the actions to be taken on pinch, swipe, tap, double tap
	PinchSwipe.addMediaGesturesDetection = function() {

    var mediaSelector = ".media-box#center .media-box-inner img";
    var tapDistanceThreshold = 3;
    var longTap;
    // the initial scale of the image is surely <= 1
    var initialMediaScale = $(mediaSelector).css("width") / $(mediaSelector).attr("width");

    var maxAllowedZoom;
    // minAllowedZoom must be <=1
    var minAllowedZoom = 1;
    var baseZoom = 1;
    var currentZoom = 1;
    var fromResetZoom = false;

    var baseTranslateX = 0;
    var baseTranslateY = 0;
    var currentTranslateX = 0;
    var currentTranslateY = 0;

    var mediaWidth = parseInt($(mediaSelector).css("width"));
    var mediaHeight = parseInt($(mediaSelector).css("height"));
    var mediaBoxInnerWidth = parseInt($(mediaSelector).parent().css("width"));
    var mediaBoxInnerHeight = parseInt($(mediaSelector).parent().css("height"));

    milliseconds = currentMilliseconds();

    $(mediaSelector).css("transition-duration", "0s");

		// get the two initial values:

    var swipeOptions = {
      triggerOnTouchEnd: true,
      swipeStatus: swipeStatus,
      tap: tap,
      longTap: longTap,
      doubleTap: doubleTap,
      hold: hold,
      // allowPageScroll: "vertical",
      threshold: 75
    };

    var pinchOptions = {
      triggerOnTouchEnd: true,
      swipeStatus: dragStatus,
      pinchStatus: pinchStatus,
      tap: tap,
      // allowPageScroll: "vertical",
      threshold: 10
    };

    function currentMilliseconds() {
      var date = new Date();
      return date.getTime();
    }

    /**
     * Catch each phase of the swipe.
     * move : we drag the div
     * cancel : we animate back to where we were
     * end : we animate to the next image
     */
    function swipeStatus(event, phase, direction, distance , duration , fingerCount) {
      //If we are moving before swipe, and we are going L or R in X mode, or U or D in Y mode then drag.
      // console.log("__swipeStatus__, zoom="+baseZoom, event, phase, direction, distance , duration , fingerCount);
      if (phase == "start")
        longTap = false;

      if (distance >= tapDistanceThreshold && fingerCount == 1 && currentZoom == 1) {
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
      }
    }

    function dragStatus(event, phase, direction, distance , duration , fingerCount) {
      //If we are moving before swipe, and we are going L or R in X mode, or U or D in Y mode then drag.

      if (distance > tapDistanceThreshold && fingerCount == 1 && currentZoom > 1) {
        console.log("__dragStatus__, zoom="+currentZoom.toString(), "curTrY=" + currentTranslateY.toString(), event, phase, direction, distance);
        if (["start", "move"].indexOf(phase) !== -1) {
          maxAllowedTranslateX = Math.abs(currentZoom * mediaWidth - mediaBoxInnerWidth) / 2;
          minAllowedTranslateX = - maxAllowedTranslateX;
          maxAllowedTranslateY = Math.abs(currentZoom * mediaHeight - mediaBoxInnerHeight) / 2;
          minAllowedTranslateY = - maxAllowedTranslateY;
          if (
            phase == "start" || distance == 0
            // || currentMilliseconds() - milliseconds > 1000
          ) {
            // distance = 0
            baseTranslateX = currentTranslateX;
            baseTranslateY = currentTranslateY;
            milliseconds = currentMilliseconds();
          } else {
            // distance is the cumulative value from start
            if (direction == "right")
              currentTranslateX = Math.max(Math.min(baseTranslateX + distance, maxAllowedTranslateX), minAllowedTranslateX);
            else if (direction == "left")
              currentTranslateX = Math.max(Math.min(baseTranslateX - distance, maxAllowedTranslateX), minAllowedTranslateX);
            else if (direction == "down")
              currentTranslateY = Math.max(Math.min(baseTranslateY + distance, maxAllowedTranslateY), minAllowedTranslateY);
            else if (direction == "up")
              currentTranslateY = Math.max(Math.min(baseTranslateY - distance, maxAllowedTranslateY), minAllowedTranslateY);
          }

          var xString = currentTranslateX.toString();
          var yString = currentTranslateY.toString();
          var zoomString = currentZoom.toString();

          $(mediaSelector).css("transform", "scale(" + zoomString + "," + zoomString + ") translate(" + xString + "px," + yString + "px)");
        }
      }
    }

    function pinchStatus(event, phase, direction, distance , duration , fingerCount, pinchZoom, fingerData) {
      // console.log("pinchStatus, zoom="+currentZoom, event, phase, direction, distance , duration , fingerCount, pinchZoom, fingerData, ["start", "move"].indexOf(phase))

      if (["start", "move"].indexOf(phase) !== -1) {
        if (
          phase == "start"
          // || currentMilliseconds() - milliseconds > 1000
        ) {
          // distance = 0
          baseZoom = currentZoom;
          milliseconds = currentMilliseconds();
          console.log("start", baseZoom, currentZoom);
        } else if(fingerCount >= 2) {
          // distance is the cumulative value from start
          // if (direction == "in")
          //   zoom = baseZoom * pinchZoom;
          // else if (direction == "out")
          currentZoom = Math.max(Math.min((baseZoom * pinchZoom).toFixed(2), maxAllowedZoom), minAllowedZoom);
          }
        }

        var xString = currentTranslateX.toString();
        var yString = currentTranslateY.toString();
        var zoomString = currentZoom.toString();
        if (currentZoom > 1) {
          $(mediaSelector).parent().swipe("disable");
        } else {
          $(mediaSelector).parent().swipe("enable");
        }


          console.log("scale(" + zoomString + "," + zoomString + ") translate(" + xString + "px," + yString + "px)");
        $(mediaSelector).css("transform", "scale(" + zoomString + "," + zoomString + ") translate(" + xString + "px," + yString + "px)");
      }
    }

    function hold(event, target) {
      longTap = true;
    }

    function tap(event, target) {
      if (currentZoom == 1) {
        if (event.which === 3)
          // right click
          PinchSwipe.swipeRight(prevMedia);
        else if (! longTap) {
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
         $(mediaSelector).css("transform", "scale(1,1)");
         currentZoom = 1;
         $(mediaSelector).parent().swipe("enable");
         fromResetZoom = true;
       }
    }

    /**
     * Manually update the position of the imgs on drag
     */

    $(function () {
      $('#album-view').swipe('destroy');

      maxAllowedZoom = $(mediaSelector).attr("width") / parseInt($(mediaSelector).parent().css("width")) * devicePixelRatio;
      $(mediaSelector).parent().swipe(swipeOptions);
      $(mediaSelector).swipe(pinchOptions);
    });
	};

  PinchSwipe.prototype.swipeOnWheel = function(event, delta) {
		if (currentMedia === null)
			return true;
		if (delta < 0) {
			PinchSwipe.swipeLeft(nextMedia);
			return false;
		} else if (delta > 0) {
			PinchSwipe.swipeRight(prevMedia);
			return false;
		}
		return true;
	}

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

    PinchSwipe.swipeMedia(0);
	}

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
        if (isMobile(any))
          $("#media-box-container").css("transform", "translate(-" + windowWidth + "px, 0px)");

        array = phFl.decodeHash(location.hash);
        // array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
        savedSearchSubAlbumHash = array[3];
        savedSearchAlbumHash = array[4];
        window.location.href = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
      }
    );

    PinchSwipe.swipeMedia(windowWidth * 2);
	}

	PinchSwipe.prototype.swipeUp = function(dest) {
		// Actually swiping up is passing from an album to a media, so there is no animation
		// ...or... the media could be let enter from below, as in horizontal swipe... TO DO
    // As is, it doesn't work
		if (dest) {
			$(".media-box#center .media-box-inner").stop().animate(
        {
  				top: "-=" + window.innerHeight,
  			},
        300,
        function() {
  				window.location.href = dest;
  				$(".media-box#center .media-box-inner").hide().css('top', "");
  			}
      );
		}
	}

  PinchSwipe.swipeDown = function(dest) {
		if (dest) {
			$(".media-box#center .media-box-inner").stop().animate(
        {
  				top: "+=" + window.innerHeight,
  			},
        300,
        function() {
  				window.location.href = dest;
  				$("#media-view").hide();
  				$(".media-box#center .media-box-inner").css('top', "");
  			}
      );
		}
	}

  /* make static methods callable as member functions */
	PinchSwipe.prototype.swipeLeft = PinchSwipe.swipeLeft;
	PinchSwipe.prototype.swipeRight = PinchSwipe.swipeRight;
	PinchSwipe.prototype.swipeDown = PinchSwipe.swipeDown;
	PinchSwipe.prototype.addMediaGesturesDetection = PinchSwipe.addMediaGesturesDetection;
	PinchSwipe.prototype.addAlbumGesturesDetection = PinchSwipe.addAlbumGesturesDetection;

  window.PinchSwipe = PinchSwipe;
}());
