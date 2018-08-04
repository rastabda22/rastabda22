(function() {

  var phFl = new PhotoFloat();
  var util = new Utilities();

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
    return $(mediaSelector).attr("width");
  }

  PinchSwipe.reductionHeight = function(mediaSelector) {
    return $(mediaSelector).attr("height");
  }

  PinchSwipe.pinched = function(mediaSelector, initialCssWidth) {
    return PinchSwipe.cssWidth(mediaSelector) > initialCssWidth;
  }

  // define the actions to be taken on pinch, swipe, tap, double tap
	PinchSwipe.addGesturesDetection = function(detectionSelector) {

    mediaSelector = "#media";
		// get the two initial values:

		// the reduction width and height in the page
		var myCssWidth = PinchSwipe.cssWidth(mediaSelector);
		var myCssHeight = PinchSwipe.cssHeight(mediaSelector);

		// the reduction width and height
		var myReductionWidth = PinchSwipe.reductionWidth(mediaSelector);
		var myReductionHeight = PinchSwipe.reductionHeight(mediaSelector);

		if (mediaSelector) {
			$(detectionSelector).swipe(
				{
					tap:function(event, target) {
						// when small => swipe left
						// when big => pinch out (make smaller)
						if (! PinchSwipe.pinched(mediaSelector, myCssWidth)) {
	 						PinchSwipe.swipeLeft(prevMedia);
						} else {
							$(mediaSelector).animate(
								{
					        'width': myCssWidth,
									'height': myCssHeight
					    	}
							);
						}
	        },
	        doubleTap:function(event, target) {
						// when small => pinch in (make bigger)
						// when big => pinch further in choosing a bigger reduction
						if (! PinchSwipe.pinched(mediaSelector, myCssWidth)) {
							$(mediaSelector).animate(
								{
					        'width': myReductionWidth,
									'height': myReductionHeight
					    	}
							);
						} else {
							// TO DO: select next bigger reduction
						}
	        },
					swipeLeft:function(event, direction, distance, duration, fingerCount) {
						// when small => swipe next media
						// when big => let media scroll
						if (fingerCount === 1) {
						 	if (! pinched(mediaSelector, myCssWidth)) {
		 						PinchSwipe.swipeLeft(prevMedia);
		 					} else {
								return true;
							}
						}
					},
					swipeRight:function(event, direction, distance, duration, fingerCount) {
						// when small => swipe previous media
						// when big => let media scroll
						if (fingerCount === 1) {
						 	if (! pinched(mediaSelector, myCssWidth)) {
								PinchSwipe.swipeRight(prevMedia);
							} else {
								return true;
							}
						}
					},
					swipeDown:function(event, direction, distance, duration, fingerCount) {
						// when small => go from media to its album
						// when big => nothing
						if (fingerCount === 1 && ! pinched(mediaSelector, myCssWidth) && upLink) {
							fromEscKey = true;
							swipeDown(upLink);
						}
					},
					pinchIn:function(event, direction, distance, duration, fingerCount, pinchZoom) {
						// when small => pinch in (make bigger)
						// when big => pinch further in choosing a bigger reduction
						if (fingerCount > 1) {
							if (! pinched(mediaSelector, myCssWidth)) {
								$(mediaSelector).animate(
									{
						        'width': myReductionWidth,
										'height': myReductionHeight
						    	}
								);
								return false;
							} else {
								// TO DO: select next bigger reduction
							}
						}
					},
					pinchOut:function(event, direction, distance, duration, fingerCount, pinchZoom) {
						// when small => nothing
						// when big => pinch out
						if (fingerCount > 1) {
							if (pinched(mediaSelector, myCssWidth)) {
								$(mediaSelector).animate(
									{
						        'width': myCssWidth,
										'height': myCssHeight
						    	}
								);
							}
						}
					},
					fingers:$.fn.swipe.fingers.ALL
				}
			);
		} else {
			// it's an album
			$(detectionSelector).swipe(
				{
					swipeUp:function(event, direction, distance, duration, fingerCount) {
						// when small => go from album to its 1st media
						// when big => nothing
						if (fingerCount === 1 && ! pinched(mediaSelector, myCssWidth))
							swipeUp(mediaLink);
					},
					fingers:$.fn.swipe.fingers.ALL
				}
			);
		}
	};



	// // adapted from https://stackoverflow.com/questions/15084675/how-to-implement-swipe-gestures-for-mobile-devices#answer-27115070
	// function addSwipeDetection(el,callback) {
	// 	var swipe_det, ele, min_x, min_y, max_x, max_y, direc;
	// 	var touchStart, touchMove, touchEnd;
	// 	touchStart = function(e) {
	// 		var t = e.touches[0];
	// 		swipe_det.sX = t.screenX;
	// 		swipe_det.sY = t.screenY;
	// 	};
	// 	touchMove = function(e) {
	// 		e.preventDefault();
	// 		var t = e.touches[0];
	// 		swipe_det.eX = t.screenX;
	// 		swipe_det.eY = t.screenY;
	// 	};
	// 	touchEnd = function(e) {
	// 		//horizontal detection
	// 		if (
	// 			(swipe_det.eX - min_x > swipe_det.sX || swipe_det.eX + min_x < swipe_det.sX) &&
	// 			swipe_det.eY < swipe_det.sY + max_y &&
	// 			swipe_det.sY > swipe_det.eY - max_y &&
	// 			swipe_det.eX > 0
	// 		) {
	// 			if(swipe_det.eX > swipe_det.sX)
	// 				direc = "r";
	// 			else
	// 				direc = "l";
	// 		}
	// 		//vertical detection
	// 		else if (
	// 			(swipe_det.eY - min_y > swipe_det.sY || swipe_det.eY + min_y < swipe_det.sY) &&
	// 			swipe_det.eX < swipe_det.sX + max_x &&
	// 			swipe_det.sX > swipe_det.eX - max_x &&
	// 			swipe_det.eY > 0
	// 		) {
	// 			if(swipe_det.eY > swipe_det.sY)
	// 				direc = "d";
	// 			else
	// 				direc = "u";
	// 		}
	//
	// 		if (direc !== "") {
	// 			if(typeof callback == 'function')
	// 				callback(el,direc);
	// 		}
	// 		direc = "";
	// 		swipe_det.sX = 0;
	// 		swipe_det.eX = 0;
	// 	};
	// 	swipe_det = {};
	// 	swipe_det.sX = 0; swipe_det.eX = 0;
	// 	min_x = 30;  //min x swipe for horizontal swipe
	// 	max_x = 30;  //max x difference for vertical swipe
	// 	min_y = 50;  //min y swipe for vertical swipe
	// 	max_y = 60;  //max y difference for horizontal swipe
	// 	direc = "";
	// 	ele = document.getElementById(el);
	// 	ele.addEventListener('touchstart', touchStart, false);
	// 	ele.addEventListener('touchmove', touchMove, false);
	// 	ele.addEventListener('touchend', touchEnd, false);
	// }
	//
	// function swipe(el,d) {
	// 	if (d == "r") {
	// 		swipeRight(prevMedia);
	// 	} else if (d == "l") {
	// 		swipeLeft(nextMedia);
	// 	} else if (d == "d") {
	// 		if (upLink) {
	// 			fromEscKey = true;
	// 			swipeDown(upLink);
	// 		}
	// 	} else if (d == "u") {
	// 		if (currentMedia === null)
	// 			swipeUp(mediaLink);
	// 	}
	// }

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
		var array, savedSearchSubAlbumHash, savedSearchAlbumHash, element, triggerLoad, link;

		if (media && ! $("#album-view").hasClass('animation-fired')) {
			$("#album-view").addClass('animation-fired');

			array = phFl.decodeHash(location.hash);
			// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
			savedSearchSubAlbumHash = array[3];
			savedSearchAlbumHash = array[4];

			link = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
			$("#next-media").prepend('<div class="media-box-inner left" style="right: 100%;"></div>');
			if (
				media.mediaType == "photo" ||
				media.mediaType == "video" && videoOK(media, '.media-box-inner left')
			) {
				array = util.createMedia(media, 'media-left', fullScreenStatus);
				element = array[0];
				triggerLoad = array[2];
				$(".media-box-inner.left").append(element);
				$('#media-left').on(
					triggerLoad,
					{
						id: '#media-left',
						media: media,
						callback: function() {
							// animation must wait for load completion
							$.when(
								$(".media-box-inner.left").animate({
									right: 0,
								}, 300).promise(),
								$("#media-box-inner").animate({
										left: "100%",
									}, 300
								).promise()
							).done(
								function() {
									$("#media-box-inner").remove();
									$(".media-box-inner.left").removeClass('left').attr('id', 'media-box-inner').css("right", "");
									// since the id #media-box-inner has been moved from one element to another, swipe detection must be enabled again
									// addSwipeDetection('media-box-inner',swipe);
									PinchSwipe.addGesturesDetection('#media-view');
									$("#media-left").attr('id', 'media');
									$("#album-view").removeClass('animation-fired');
									window.location.href = link;
								}
							);
						}
					},
					util.scaleMedia
				);
			}
		}
	}

	PinchSwipe.swipeLeft = function(media) {
		var array, savedSearchSubAlbumHash, savedSearchAlbumHash, element, triggerLoad, link;

		if (media && ! $("#album-view").hasClass('animation-fired')) {
			$("#album-view").addClass('animation-fired');

			array = phFl.decodeHash(location.hash);
			// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
			savedSearchSubAlbumHash = array[3];
			savedSearchAlbumHash = array[4];

			link = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
			$("#next-media").append('<div class="media-box-inner right" style="left: 100%;"></div>');
			if (
				media.mediaType == "photo" ||
				media.mediaType == "video" && videoOK(media, '.media-box-inner right')
			) {
				array = util.createMedia(media, 'media-right', fullScreenStatus);
				element = array[0];
				triggerLoad = array[2];
				$(".media-box-inner.right").append(element);
				$('#media-right').on(
					triggerLoad,
          {
						id: '#media-right',
						media: media,
						callback: function() {
							// animation must wait for load completion
							$.when(
								$(".media-box-inner.right").animate({
									left: 0,
								}, 300).promise(),
								$("#media-box-inner").animate({
										right: "100%",
									}, 300
								).promise()
							).done(
								function() {
									$("#media-box-inner").remove();
									$(".media-box-inner.right").removeClass('right').attr('id', 'media-box-inner').css("left", "");
									// since the id #media-box-inner has been moved from one element to another, swipe detection must be enabled again
									// addSwipeDetection('media-box-inner',swipe);
									PinchSwipe.addGesturesDetection('#media-view');
									$("#media-right").attr('id', 'media');
									$("#album-view").removeClass('animation-fired');
									window.location.href = link;
								}
							);
						}
					},
					util.scaleMedia
				);
			}
		}
	}

	PinchSwipe.prototype.swipeUp = function(dest) {
		// Actually swiping up is passing from an album to a media, so there is no animation
		// ...or... the media could be let enter from below, as in horizontal swipe... TO DO
		if (dest) {
			$("#media-box-inner").stop().animate({
				top: "-=" + window.innerHeight,
			}, 300, function() {
				window.location.href = dest;
				$("#media-box-inner").hide().css('top', "");
			});
		}
	}

  PinchSwipe.prototype.swipeDown = function(dest) {
		if (dest) {
			$("#media-box-inner").stop().animate({
				top: "+=" + window.innerHeight,
			}, 300, function() {
				window.location.href = dest;
				$("#media-box-inner").hide().css('top', "");
			});
		}
	}

  /* make static methods callable as member functions */
	PinchSwipe.prototype.swipeLeft = PinchSwipe.swipeLeft;
	PinchSwipe.prototype.swipeRight = PinchSwipe.swipeRight;
	PinchSwipe.prototype.addGesturesDetection = PinchSwipe.addGesturesDetection;

  window.PinchSwipe = PinchSwipe;
}());
