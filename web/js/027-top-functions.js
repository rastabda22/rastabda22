(function() {

  var phFl = new PhotoFloat();
  var util = new Utilities();
  var map = new MapFunctions();
  var pS = new PinchSwipe();
  var f = new Functions();
  var numSubAlbumsReady = 0;

	/* constructor */
	function TopFunctions() {
	}

  TopFunctions.setTitle = function(id, media) {
    var title = "", documentTitle = "", components, i, isDateTitle, isGpsTitle, isSearchTitle, originalTitle;
    var titleAnchorClasses, titleAnchorClassesItalics, hiddenTitle = "", albumTypeString, where, initialValue, searchFolderHash;
    var beginLink, linksToLeave, numLinks, beginAt, latitude, longitude, arrayCoordinates, numMediaInSubAlbums, raquo = "&raquo;", lastRaquoPosition;
    // gpsLevelNumber is the number of levels for the by gps tree
    // current levels are country, region, place => 3
    var gpsLevelNumber = 3;
    var gpsName = '';
    var gpsHtmlTitle;
    var setDocumentTitle = (id === "center" || id === "album");

    f.updateMenu();

    if (id === "album") {
      $(".media-box#" + id + " .title").addClass("hidden");
      $("#album-view .title").removeClass("hidden");
    } else {
      $(".media-box#" + id + " .title").removeClass("hidden");
      $("#album-view .title").addClass("hidden");
      $("#album-view .title-string").html("");
    }


    if (Options.page_title !== "")
      originalTitle = Options.page_title;
    else
      originalTitle = translations[language][".title-string"];


    if (! currentAlbum.path.length)
      components = [originalTitle];
    else {
      components = currentAlbum.path.split("/");
      components.unshift(originalTitle);
    }

    isDateTitle = (components.length > 1 && components[1] == Options.by_date_string);
    isGpsTitle = (components.length > 1 && components[1] == Options.by_gps_string);
    isSearchTitle = (components.length > 1 && components[1] == Options.by_search_string);

    // 'textComponents = components' doesn't work: textComponents becomes a pointer to components
    var textComponents = components.slice();

    // generate the title in the page top
    titleAnchorClasses = 'title-anchor';
    if (isMobile.any())
      titleAnchorClasses += ' mobile';
    titleAnchorClassesItalics = titleAnchorClasses + ' italic';

    var array = phFl.decodeHash(location.hash);
    // array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
    var albumHash = array[0];
    // var mediaHash = array[1];
    // var mediaFolderHash = array[2];
    // var savedSearchSubAlbumHash = array[3];
    var savedSearchAlbumHash = array[4];
    var fillInSpan = "<span id='fill-in-map-link'></span>";

    if (isDateTitle) {
      title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>";
      title += "<a class='" + titleAnchorClasses + "' href='#!/" + Options.by_date_string + "'>(" + util._t("#by-date") + ")</a>";

      if (components.length > 2 || media !== null)
        title += raquo;

      if (setDocumentTitle) {
        documentTitle += components[0];
        if (components.length > 2 || media !== null)
          documentTitle = " \u00ab " + documentTitle;
        documentTitle += " (" + util._t("#by-date") + ")";
      }

      for (i = 2; i < components.length; ++i) {
        if (i < components.length - 1 || media !== null)
          title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'>";
        else
          title += "<span class='title-no-anchor'>";

        if (i == 3) {
          textComponents[i] = util._t("#month-" + textComponents[i]);
          title += textComponents[i];
        } else if (i == 2 || i == 4) {
          textComponents[i] = parseInt(textComponents[i]);
          title += textComponents[i];
        } else
          title += textComponents[i];


        if (i < components.length - 1 || media !== null)
          title += "</a>";
        else
          title += "</span>";
        if (i < components.length - 1 || media !== null)
          title += raquo;

        if (setDocumentTitle) {
          // keep building the html page title
          documentTitle = textComponents[i] + documentTitle;
          if (i < components.length - 1 || media !== null)
            documentTitle = " \u00ab " + documentTitle;
        }
      }

      title += fillInSpan;

      if (components.length > 1 && media === null) {
        if (! isMobile.any()) {
          title += " <span class='title-count'>(";
          title += currentAlbum.media.length + " ";
          title += util._t(".title-media") + " ";
          if (components.length >= 5)
            title += util._t(".title-in-day-album");
          else
            title += util._t(".title-in-date-album");
          title += ")</span>";
        }
        title += "</span>";
      }
    } else if (isGpsTitle) {
      title = "<a class='" + titleAnchorClasses + "' href='#!/'>" + components[0] + "</a>";
      title += "<a class='" + titleAnchorClasses + "' href='#!/" + Options.by_gps_string + "'>(" + util._t("#by-gps") + ")</a>";

      if (components.length > 2 || media !== null)
        title += raquo;

      if (setDocumentTitle) {
        documentTitle += components[0];
        if (components.length > 2 || media !== null)
          documentTitle = " \u00ab " + documentTitle;
        documentTitle += " (" + util._t("#by-gps") + ")";
      }

      for (i = 2; i < components.length; ++i) {
        var currentAlbumPath = currentAlbum.ancestorsNames;
        gpsName = currentAlbumPath[i];

        if (gpsName === '')
          gpsName = util._t('.not-specified');
        gpsHtmlTitle = util._t("#place-icon-title") + gpsName;

        if (i < components.length - 1 || media !== null) {
          title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'";
          title += " title='" + util._t("#place-icon-title") + gpsName + util._t("#place-icon-title-end") + "'";
          title += ">";
        } else
          title += "<span class='title-no-anchor'>";
        title += gpsName;
        if (i < components.length - 1 || media !== null)
          title += "</a>";
        else
          title += "</span>";

        if (media !== null) {
          latitude = media.metadata.latitude;
          longitude = media.metadata.longitude;
        } else {
           arrayCoordinates = currentAlbum.ancestorsCenter[i];
           latitude = arrayCoordinates.latitude;
           longitude = arrayCoordinates.longitude;
        }

        if (i < components.length - 1 || media !== null)
          title += raquo;

        if (setDocumentTitle) {
          // keep buildimg the html page title
          documentTitle = gpsName + documentTitle;
          if (i < components.length - 1 || media !== null)
            documentTitle = " \u00ab " + documentTitle;
        }
      }

      title += fillInSpan;

      if (components.length > 1 && media === null) {
        title += " <span class='title-count'>(";
        title += currentAlbum.media.length + " ";
        title += util._t(".title-media") + " ";
        if (components.length >= gpsLevelNumber + 2)
          title += util._t(".title-in-gps-album");
        else
          title += util._t(".title-in-gpss-album");
        title += ")</span>";
      }
    } else if (isSearchTitle) {
      // i=0: title
      // i=1: Options.by_search_string
      // (optional) i=2: image cache or folder
      // (optional) i=3 up: folder or image
      // (optional) i=n: image
      title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>" + raquo;

      if (
        Options.search_current_album &&
        [Options.folders_string, Options.by_date_string, Options.by_gps_string].indexOf(Options.album_to_search_in) == -1
      ) {
        searchFolderHash = albumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
        where =
           "<a class='main-search-link' href='#!/" + currentAlbum.cacheBase + "'>" +
           util._t("#by-search") +
           "</a> " +
           util._t("#in") +
           " <span id='search-album-to-be-filled'></span>";
      } else {
        where =
          "<a class='search-link' href='#!/" + currentAlbum.cacheBase + "'>" +
          util._t("#by-search") +
          "</a>";
      }

      title += "<span class='title-no-anchor'>(" + where + ")</span>";
      where = util.stripHtmlAndReplaceEntities(where);

      // do not show the options and the search words, they are visible in the menu
      // show the image name, if it is there
      if (media !== null) {
        title += raquo;
      }

      title += fillInSpan;

      if (
        components.length > 2 &&
        (media === null && ! util.isAlbumWithOneMedia(currentAlbum)) &&
        (currentAlbum.media.length || currentAlbum.subalbums.length)
      ) {
        title += " <span class='title-count'>(";
        title += util._t(".title-found") + ' ';
        numMediaInSubAlbums = currentAlbum.numMediaInSubTree - currentAlbum.media.length;
        if (currentAlbum.media.length) {
          title += currentAlbum.media.length + " ";
          title += util._t(".title-media");
          if (currentAlbum.subalbums.length)
            title += " " + util._t(".title-and") + " ";
        }
        if (currentAlbum.subalbums.length) {
          title += currentAlbum.subalbums.length + " ";
          title += util._t(".title-albums");
        }
        // if (currentAlbum.media.length > 0 && currentAlbum.subalbums.length > 0) {
        //   title += ", ";
        //   title += util._t(".title-total") + " ";
        //   title += currentAlbum.media.length + currentAlbum.subalbums.length;
        // }
        title += ")</span>";
      }

      if (setDocumentTitle) {
        // build the html page title
        documentTitle += " (" + where +") \u00ab " + components[0];
        if (media !== null)
          documentTitle = " \u00ab " + documentTitle;
      }
    } else {
      // folders title
      title = "<a class='" + titleAnchorClasses + "' href='#!/" + "'>" + components[0] + "</a>";
      if (components.length > 2 || media !== null)
        title += raquo;

      if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
        searchFolderHash = savedSearchAlbumHash.split(Options.cache_folder_separator).slice(2).join(Options.cache_folder_separator);
        if (searchFolderHash.split(Options.cache_folder_separator).length > 1) {
          where =
             "<a class='main-search-link' href='#!/" + savedSearchAlbumHash + "'>" +
             util._t("#by-search") +
             "</a> " +
             util._t("#in") +
             " <span id='search-album-to-be-filled'></span>";
        } else {
          where =
            "<a class='search-link' href='#!/" + savedSearchAlbumHash + "'>" +
            util._t("#by-search") +
            "</a>";
        }

        title += "<span class='title-no-anchor'>(" + where + ")</span>";
        title += raquo;
        where = util.stripHtmlAndReplaceEntities(where);

        if (setDocumentTitle) {
          documentTitle += " (" + where +") \u00ab " + documentTitle;
        }
      }

      if (setDocumentTitle) {
        documentTitle += components[0];
        if (components.length > 2 || media !== null)
          documentTitle = " \u00ab " + documentTitle;
      }

      initialValue = 2;
      if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null) {
        // the  folders from the first until the search folder inclusive must not be shown
        initialValue = savedSearchAlbumHash.split(Options.cache_folder_separator).slice(2).length + 1;
      }
      for (i = initialValue; i < components.length; ++i) {
        if (i < components.length - 1 || media !== null)
          title += "<a class='" + titleAnchorClasses + "' href='#!/" + encodeURI(currentAlbum.ancestorsCacheBase[i]) + "'>";
        else
          title += "<span class='title-no-anchor'>";

        title += textComponents[i];

        if (i < components.length - 1 || media !== null)
          title += "</a>";
        else
          title += "</span>";

        if (i < components.length - 1 || media !== null)
          title += raquo;
      }

      title += fillInSpan;

      if (components.length > 1 && media === null) {
        title += " <span class='title-count'>(";
        numMediaInSubAlbums = currentAlbum.numMediaInSubTree - currentAlbum.media.length;
        if (currentAlbum.media.length) {
          title += currentAlbum.media.length + " ";
          title += util._t(".title-media") + " ";
          title += util._t(".title-in-album");
          if (numMediaInSubAlbums)
            title += ", ";
        }
        if (numMediaInSubAlbums) {
          title += numMediaInSubAlbums + " ";
          if (! currentAlbum.media.length)
            title += util._t(".title-media") + " ";
          title += util._t(".title-in-subalbums");
        }
        if (currentAlbum.media.length > 0 && numMediaInSubAlbums > 0) {
          title += ", ";
          title += util._t(".title-total") + " ";
          title += currentAlbum.media.length + numMediaInSubAlbums;
        }
        title += ")</span>";
      }

      if (setDocumentTitle) {
        for (i = initialValue; i < components.length; ++i) {
          // keep building the html page title
          documentTitle = textComponents[i] + documentTitle;
          if (i < components.length - 1 || media !== null)
            documentTitle = " \u00ab " + documentTitle;
        }
      }
    }

    if (media !== null) {
      title += "<span class='media-name'>" + util.trimExtension(media.name) + "</span>";
      if (util.hasGpsData(currentMedia))
        title += "<a class='map-popup-trigger'>" +
          "<img class='title-img' title='" + util._t("#show-on-map") + " [s]' alt='" + util._t("#show-on-map") + "' height='20px' src='img/ic_place_white_24dp_2x.png'>" +
        "</a>";
    } else if (title.indexOf(fillInSpan) > -1 && currentAlbum.numPositionsInTree) {
      title = title.replace(
        fillInSpan,
        "<a class='map-popup-trigger'>" +
          "<img class='title-img' " +
              "title='" + util._t("#show-markers-on-map") + "' " +
              "alt='" + util._t("#show-markers-on-map") + "' " +
              "height='20px' " +
              "src='img/ic_place_white_24dp_2x.png'" +
            ">" +
        "</a>"
      );
    }

    if (isMobile.any()) {
      // leave only the last link on mobile
      // separate on "&raquo;""
      if (title.indexOf("search-album-to-be-filled") !== -1)
        beginAt = title.indexOf("search-album-to-be-filled");
      else
        beginAt = 0;

      numLinks = (title.substring(beginAt).match(/<a class='title/g) || []).length;
      linksToLeave = 1;
      if (numLinks > linksToLeave) {
        for (i = 1; i <= numLinks; i ++) {
          beginLink = title.indexOf("<a class=", beginAt);
          if (i <= linksToLeave) {
            beginAt = beginLink + 1;
          } else {
            // be sure to separate on "&raquo;"
            lastRaquoPosition = title.substring(0, beginLink).lastIndexOf(raquo);
            if (lastRaquoPosition + raquo.length !== beginLink)
              beginLink = lastRaquoPosition + raquo.length;
            hiddenTitle += title.substring(0, beginLink);
            title = title.substring(beginLink);
            break;
          }
        }
        title =
          "<span class='dots-surroundings'><span class='title-no-anchor dots'>...</span>" + raquo +"</span>" +
          " <span class='hidden-title'>" + hiddenTitle + "</span> " + title;
      }
    }

    if (id === "album")
      $("#album-view .title-string").html(title);
    else
      $(".media-box#" + id + " .title-string").html(title);


    if (isMobile.any()) {
      $(".dots").off();

      $(".dots").on('click', function(ev) {
        if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
          $(".dots-surroundings").hide();
          $(".hidden-title").show();
          return false;
        }
      });
    }

    if (setDocumentTitle) {
      // keep generating the html page title
      if (media !== null)
        documentTitle = util.trimExtension(media.name) + documentTitle;
      else if (currentAlbum !== null && ! currentAlbum.subalbums.length && currentAlbum.media.length == 1)
        documentTitle =  util.trimExtension(currentAlbum.media[0].name) + " \u00ab " + documentTitle;

      document.title = documentTitle;
    }


    if (media === null && currentAlbum !== null && ! currentAlbum.subalbums.length && currentAlbum.media.length == 1) {
      title += " " + raquo + "<span class='media-name'>" + util.trimExtension(currentAlbum.media[0].name) + "</span>";
    }

    if ($("#search-album-to-be-filled").length) {
      // for searches in current folder we must get the names from the album
      // we must use getAlbum() because the album could not be in the cache yet (as when ctl-r is pressed)
      phFl.getAlbum(
        searchFolderHash,
        function(theAlbum) {
          var whereLinks = '', thisCacheBase, name, documentTitle;

          if (theAlbum.hasOwnProperty('ancestorsNames')) {
            albumTypeString = "<a href='#!/" + Options.by_gps_string + "'"  + util._t('#by-gps') + ']</a> ' + ' ' + raquo + ' ';
            for (var i = 2; i < theAlbum.ancestorsNames.length; i ++) {
              name = theAlbum.ancestorsNames[i];
              if (i == 3 && util.isByDateCacheBase(Options.album_to_search_in))
                // convert the month number to localized month name
                name = util._t("#month-" + name);
              thisCacheBase = "#!/" + theAlbum.ancestorsCacheBase.slice(2, i + 1).join(Options.cache_folder_separator);
              if (i > 2)
                whereLinks += ' ' + raquo + ' ';
              whereLinks += "<a class='search-link' href='" + thisCacheBase + "'>" + name + "</a>";
            }
          }

          // insert the album tree links in DOM (if )
          $("#search-album-to-be-filled").replaceWith(whereLinks);

          if (setDocumentTitle) {
            // correct the page title too
            documentTitle = $(document).attr('title');
            documentTitle = documentTitle.replace(
              util._t("#by-search") + ' ' + util._t("#-in") + ' ',
              util._t("#by-search") + ' ' + util._t("#-in") + ' ' + util.stripHtmlAndReplaceEntities(whereLinks)
            );
            document.title = documentTitle;
          }
        },
        util.die
      );
    }

    f.setOptions();

    // activate the map popup trigger in the title
    $(".map-popup-trigger").off();
    $(".map-popup-trigger").click(map.generateMapFromDefaults);



    $('.map-close-button').click(function(){
      $('.map-container').hide();
      $('#mapdiv').empty();
    });

    return;
  };

  TopFunctions.showMedia = function(album, media, id) {

    function loadNextPrevMedia(containerHeight, containerWidth) {
      $("#pinch-in").off("click");
      $("#pinch-out").off("click");
      $("#pinch-in").on("click", pS.pinchIn);
      $("#pinch-out").on("click", pS.pinchOut);

      $(mediaSelector).off(triggerLoad);

      if (id === "center") {
        pS.addMediaGesturesDetection();
        pS.setPinchButtonsPosition(containerHeight, containerWidth);
        util.correctPrevNextPosition();

        if (album.media.length > 1) {
          TopFunctions.showMedia(album, prevMedia, 'left');
          TopFunctions.showMedia(album, nextMedia, 'right');
        }
      }
    }

    var text, thumbnailSize, triggerLoad, mediaHtml, mediaSelector, mediaSrc;
    var exposureTime, heightForMedia, heightForMediaAndTitle;
    var savedSearchSubAlbumHash, savedSearchAlbumHash;
    var previousMediaIndex, nextMediaIndex, array;

    if (id === "center")
      $("#media-view").removeClass("hidden");

    array = phFl.decodeHash(location.hash);
    // array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
    savedSearchSubAlbumHash = array[3];
    savedSearchAlbumHash = array[4];

    mediaLink = phFl.encodeHash(currentAlbum, media, savedSearchSubAlbumHash, savedSearchAlbumHash);
    firstEscKey = true;

    thumbnailSize = Options.media_thumb_size;

    if (id === "center") {
      if (Options.hide_title) {
        $("#" + id + " .title").addClass("hidden-by-option");
      } else {
        $("#" + id + " .title").removeClass("hidden-by-option");
      }
      if (fullScreenStatus) {
        $("#" + id + " .title").addClass("hidden-by-fullscreen");
      } else {
        $("#" + id + " .title").removeClass("hidden-by-fullscreen");
      }
      TopFunctions.setTitle(id, currentMedia);

      if (Options.hide_bottom_thumbnails) {
        $("#album-view").addClass("hidden-by-option");
      } else {
        $("#album-view").removeClass("hidden-by-option");
      }

      if (currentAlbum.media.length == 1) {
        $("#album-view").addClass("hidden");
      } else {
        $("#album-view").removeClass("hidden");
      }

      if (fullScreenStatus) {
        $("#album-view").addClass("hidden-by-fullscreen");
      } else {
        $("#album-view").removeClass("hidden-by-fullscreen");
      }

      if ($("#album-view").is(":visible")) {
        $("#album-view").css("height", (thumbnailSize + 22).toString() + "px");
        $("#album-view").addClass("media-view-container");
      }
    } else if (id === "left")
      TopFunctions.setTitle(id, prevMedia);
    else if (id === "right")
      TopFunctions.setTitle(id, nextMedia);

    heightForMediaAndTitle = util.mediaBoxContainerHeight();

    heightForMedia = heightForMediaAndTitle - $(".media-box#" + id + " .title").outerHeight();

    if (id === "center") {
      $("#media-box-container").css("width", windowWidth * 3).css("height", heightForMediaAndTitle);
      $("#media-box-container").css("transform", "translate(-" + windowWidth + "px, 0px)");
      $(".media-box").css("width", windowWidth).css("height", heightForMediaAndTitle);
      $(".media-box .media-box-inner").css("width", windowWidth).css("height", heightForMedia);
      // $(".links").addClass("hidden");
      $(".media-box").show();

      if (currentAlbum.media.length == 1) {
        $("#next").hide();
        $("#prev").hide();
        // $("#media-view").addClass("no-bottom-space");
        // $("#album-view").addClass("no-bottom-space");
      } else {
        $("#next").show();
        $("#prev").show();
        // $("#media-view").removeClass("no-bottom-space");
        // $("#album-view").removeClass("no-bottom-space");
      }

      currentAlbum.media[currentMediaIndex].byDateName =
        util.pathJoin([currentAlbum.media[currentMediaIndex].dayAlbum, currentAlbum.media[currentMediaIndex].name]);
      if (currentAlbum.media[currentMediaIndex].hasOwnProperty("gpsAlbum"))
        currentAlbum.media[currentMediaIndex].byGpsName =
            util.pathJoin([currentAlbum.media[currentMediaIndex].gpsAlbum, currentAlbum.media[currentMediaIndex].name]);

      nextMedia = null;
      prevMedia = null;
      if (currentAlbum.media.length > 1) {
        // prepare for previous media
        previousMediaIndex = (currentMediaIndex === 0 ?
                                currentAlbum.media.length - 1 :
                                currentMediaIndex - 1);
        prevMedia = currentAlbum.media[previousMediaIndex];
        prevMedia.byDateName = util.pathJoin([prevMedia.dayAlbum, prevMedia.name]);
        if (prevMedia.hasOwnProperty("gpsAlbum"))
          prevMedia.byGpsName = util.pathJoin([prevMedia.gpsAlbum, prevMedia.name]);

        // prepare for next media
        nextMediaIndex = (currentMediaIndex === currentAlbum.media.length - 1 ?
                            0 :
                            currentMediaIndex + 1);
        nextMedia = currentAlbum.media[nextMediaIndex];
        nextMedia.byDateName = util.pathJoin([nextMedia.dayAlbum, nextMedia.name]);
        if (nextMedia.hasOwnProperty("gpsAlbum"))
          nextMedia.byGpsName = util.pathJoin([nextMedia.gpsAlbum, nextMedia.name]);
      }
    }

    var mediaBoxInnerElement = $(".media-box#" + id + " .media-box-inner");
    // empty the img container: another image will be put in there

    if (currentMedia.mediaType == "video" && ! f.videoOK()) {
      mediaBoxInnerElement.empty();
      addVideoUnsupportedMarker(id);
      if (id === "center")
        loadNextPrevMedia();
    } else {
      mediaSelector = ".media-box#" + id + " .media-box-inner img";
      mediaSrc = util.chooseMediaReduction(media, id, fullScreenStatus);
      mediaHtml = util.createMediaHtml(media, id, fullScreenStatus);
      triggerLoad = util.chooseTriggerEvent(media);

      if (mediaBoxInnerElement.html() !== mediaHtml) {
        // only replace the media-box-inner content if it's not yet there
        mediaBoxInnerElement.empty();
        mediaBoxInnerElement.show().append(mediaHtml);

        $("link[rel=image_src]").remove();
        $('link[rel="video_src"]').remove();
        $("head").append(util.createMediaLinkTag(media, mediaSrc));
      }

      if (id === "center")
        $(mediaBoxInnerElement).css("opacity", 1);
      $(mediaSelector).off(triggerLoad);
      $(mediaSelector).on(
        triggerLoad,
        {
          // id: mediaId,
          id: id,
          media: media,
          resize: false,
          callback: loadNextPrevMedia
        },
        util.scaleMedia
      );
      // in case the image has been already loaded, trigger the event
      if ($(mediaSelector)[0].complete)
        $(mediaSelector).trigger(triggerLoad);

      if (id === "center") {
        $(window).off("resize");
        $(window).on(
          "resize",
          function () {
            var event = {data: {}};

            event.data.resize = true;

            event.data.id = "center";
            event.data.media = media;
            event.data.callback = f.pinchSwipeInitialization;
            event.data.currentZoom = pS.getCurrentZoom();
            util.scaleMedia(event);

            if (album.media.length > 1) {
              event.data.id = "left";
              event.data.media = prevMedia;
              event.data.callback = f.pinchSwipeInitialization;
              util.scaleMedia(event);

              event.data.id = "right";
              event.data.media = nextMedia;
              event.data.callback = f.pinchSwipeInitialization;
              util.scaleMedia(event);
            }
          }
        );

        if (! Options.persistent_metadata) {
          $(".media-box .metadata").hide();
          $(".media-box .metadata-show").show();
          $(".media-box .metadata-hide").hide();
        }
      }
    }

    if (id === "center") {
      mediaBoxInnerElement.off('contextmenu click mousewheel');
      $(".media-box#center .media-box-inner .media-bar").off();
      $("#next").off();
      $("#prev").off();

      upLink = phFl.upHash(location.hash);
      if (currentAlbum.media.length == 1) {
        // nextLink = "";
        // prevLink = "";
        mediaBoxInnerElement.css('cursor', 'default');
      } else {
        array = phFl.decodeHash(location.hash);
        // array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
        savedSearchSubAlbumHash = array[3];
        savedSearchAlbumHash = array[4];

        // nextLink = phFl.encodeHash(currentAlbum, nextMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
        // prevLink = phFl.encodeHash(currentAlbum, prevMedia, savedSearchSubAlbumHash, savedSearchAlbumHash);
        $("#next").show();
        $("#prev").show();
        mediaBoxInnerElement
          .css('cursor', '')
          .on(
            'contextmenu',
            function(ev) {
              if (! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
                ev.preventDefault();
                if (pS.getCurrentZoom() == 1)
                  pS.swipeRight(prevMedia);
              }
            }
          )
          .on('mousewheel', pS.swipeOnWheel);
          $(".media-box#center .media-box-inner .media-bar").on('click', function(ev) {
            ev.stopPropagation();
          }).on('contextmenu', function(ev) {
            ev.stopPropagation();
          });

        $("#prev").on('click', function(ev) {
          if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
            pS.swipeRight(prevMedia);
            return false;
          }
        });
        $("#next").on('click', function(ev) {
          if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
            pS.swipeLeft(nextMedia);
            return false;
          }
        });
      }

      // $(".links").removeClass("hidden");
    }

    var originalMediaPath = encodeURI(util.originalMediaPath(currentMedia));
    $(".media-box#" + id + " .original-link").attr("target", "_blank").attr("href", originalMediaPath);
    $(".media-box#" + id + " .download-link").attr("href", originalMediaPath).attr("download", "");
    if (util.hasGpsData(currentMedia)) {
      $(".media-box#" + id + " .menu-map-link").on('click', function(ev) {
        $(".map-popup-trigger")[0].click();
      });
      $(".media-box#" + id + " .menu-map-link").show();
      $(".media-box#" + id + " .menu-map-divider").show();
    } else {
      $(".media-box#" + id + " .menu-map-link").removeAttr("href").css("cursor","pointer");
      $(".media-box#" + id + " .menu-map-link").hide();
      $(".media-box#" + id + " .menu-map-divider").hide();
    }

    if (id === "center") {
      var foldersViewLink = "#!/" + util.pathJoin([
                    currentMedia.foldersCacheBase,
                    currentMedia.cacheBase
                  ]);
      var byDateViewLink = "#!/" + util.pathJoin([
                    currentMedia.dayAlbumCacheBase,
                    currentMedia.foldersCacheBase,
                    currentMedia.cacheBase
                  ]);
      if (currentMedia.gpsAlbumCacheBase)
        var byGpsViewLink = "#!/" + util.pathJoin([
                    currentMedia.gpsAlbumCacheBase,
                    currentMedia.foldersCacheBase,
                    currentMedia.cacheBase
                  ]);


      $(".day-gps-folders-view").addClass("active").removeClass("hidden").removeClass("selected").off("click");
      if (util.isFolderCacheBase(currentAlbum.cacheBase)) {
        // folder album: change to by date or by gps view
        $("#folders-view").removeClass("active").addClass("selected").off("click");
        $("#by-date-view").on("click", function(ev) {
          window.location.href = byDateViewLink;
          return false;
        });

        if (! util.hasGpsData(currentMedia)) {
          $("#by-gps-view").addClass("hidden");
        } else {
          $("#by-gps-view").on("click", function(ev) {
            window.location.href = byGpsViewLink;
            return false;
          });
        }
      } else if (util.isByDateCacheBase(currentAlbum.cacheBase)) {
        // by date album: change to folder or by gps view
        $("#folders-view").on("click", function(ev) {
          window.location.href = foldersViewLink;
          return false;
        });
        $("#by-date-view").removeClass("active").addClass("selected").off("click");
        if (! util.hasGpsData(currentMedia)) {
          $("#by-gps-view").addClass("hidden");
        } else {
          $("#by-gps-view").on("click", function(ev) {
            window.location.href = byGpsViewLink;
            return false;
          });
        }
      } else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
        $("#folders-view").on("click", function(ev) {
          window.location.href = foldersViewLink;
          return false;
        });
        $("#by-date-view").on("click", function(ev) {
          window.location.href = byDateViewLink;
          return false;
        });
        // by gps album: change to folder or by day view
        $("#by-gps-view").removeClass("active").addClass("selected").off("click");
      } else if (util.isSearchCacheBase(currentAlbum.cacheBase)) {
        // by search album: change to folder or by gps or by view
        $("#folders-view").on("click", function(ev) {
          window.location.href = foldersViewLink;
          return false;
        });
        $("#by-date-view").on("click", function(ev) {
          window.location.href = byDateViewLink;
          return false;
        });
        if (! util.hasGpsData(currentMedia)) {
          $("#by-gps-view").addClass("hidden");
        } else {
          $("#by-gps-view").on("click", function(ev) {
            window.location.href = byGpsViewLink;
            return false;
          });
        }
      }
    }

    $(".media-box#" + id + " .metadata tr.gps").off('click');
    text = "<table>";
    if (typeof media.metadata.title !== "undefined")
      text += "<tr><td class='metadata-data-title'></td><td>" + media.metadata.title.replace(/\n/g, "<br>") + "</td></tr>";
    if (typeof media.metadata.description !== "undefined")
      text += "<tr><td class='metadata-data-description'></td><td>" + media.metadata.description.replace(/\n/g, "<br>") + "</td></tr>";
    if (typeof media.metadata.tags !== "undefined")
      text += "<tr><td class='metadata-data-tags'></td><td>" + media.metadata.tags + "</td></tr>";
    if (typeof media.date !== "undefined")
      text += "<tr><td class='metadata-data-date'></td><td>" + media.date + "</td></tr>";
    if (typeof media.metadata.size !== "undefined")
      text += "<tr><td class='metadata-data-size'></td><td>" + media.metadata.size[0] + " x " + media.metadata.size[1] + "</td></tr>";
    if (typeof media.metadata.make !== "undefined")
      text += "<tr><td class='metadata-data-make'></td><td>" + media.metadata.make + "</td></tr>";
    if (typeof media.metadata.model !== "undefined")
      text += "<tr><td class='metadata-data-model'></td><td>" + media.metadata.model + "</td></tr>";
    if (typeof media.metadata.aperture !== "undefined")
      text += "<tr><td class='metadata-data-aperture'></td><td> f/" + media.metadata.aperture + "</td></tr>";
    if (typeof media.metadata.focalLength !== "undefined")
      text += "<tr><td class='metadata-data-focalLength'></td><td>" + media.metadata.focalLength + " mm</td></tr>";
    if (typeof media.metadata.subjectDistanceRange !== "undefined")
      text += "<tr><td class='metadata-data-subjectDistanceRange'></td><td>" + media.metadata.subjectDistanceRange + "</td></tr>";
    if (typeof media.metadata.iso !== "undefined")
      text += "<tr><td class='metadata-data-iso'></td><td>" + media.metadata.iso + "</td></tr>";
    if (typeof media.metadata.sceneCaptureType !== "undefined")
      text += "<tr><td class='metadata-data-sceneCaptureType'></td><td>" + media.metadata.sceneCaptureType + "</td></tr>";
    if (typeof media.metadata.exposureTime !== "undefined") {
      if (typeof media.metadata.exposureTime === "string")
        exposureTime = media.metadata.exposureTime;
      else if (media.metadata.exposureTime > 0.3)
        exposureTime = Math.round(media.metadata.exposureTime * 10 ) / 10;
      else
        exposureTime = "1/" + Math.round(1 / media.metadata.exposureTime);
      text += "<tr><td class='metadata-data-exposureTime'></td><td>" + exposureTime + " sec</td></tr>";
    }
    if (typeof media.metadata.exposureProgram !== "undefined")
      text += "<tr><td class='metadata-data-exposureProgram'></td><td>" + media.metadata.exposureProgram + "</td></tr>";
    if (typeof media.metadata.exposureCompensation !== "undefined")
      text += "<tr><td class='metadata-data-exposureCompensation'></td><td>" + media.metadata.exposureCompensation + "</td></tr>";
    if (typeof media.metadata.spectralSensitivity !== "undefined")
      text += "<tr><td class='metadata-data-spectralSensitivity'></td><td>" + media.metadata.spectralSensitivity + "</td></tr>";
    if (typeof media.metadata.sensingMethod !== "undefined")
      text += "<tr><td class='metadata-data-sensingMethod'></td><td>" + media.metadata.sensingMethod + "</td></tr>";
    if (typeof media.metadata.lightSource !== "undefined")
      text += "<tr><td class='metadata-data-lightSource'></td><td>" + media.metadata.lightSource + "</td></tr>";
    if (typeof media.metadata.flash !== "undefined")
      text += "<tr><td class='metadata-data-flash'></td><td>" + media.metadata.flash + "</td></tr>";
    if (typeof media.metadata.orientationText !== "undefined")
      text += "<tr><td class='metadata-data-orientation'></td><td>" + media.metadata.orientationText + "</td></tr>";
    if (typeof media.metadata.duration !== "undefined")
      text += "<tr><td class='metadata-data-duration'></td><td>" + media.metadata.duration + " sec</td></tr>";
    if (typeof media.metadata.latitude !== "undefined")
      text += "<tr class='map-link' class='gps'><td class='metadata-data-latitude'></td><td>" + media.metadata.latitudeMS + " </td></tr>";
    if (typeof media.metadata.longitude !== "undefined")
      text += "<tr class='gps'><td class='metadata-data-longitude'></td><td>" + media.metadata.longitudeMS + " </td></tr>";
    text += "</table>";
    $(".media-box#" + id + " .metadata").html(text);
    var linkTitle = util._t('#show-map');
    $(".media-box#" + id + " .metadata tr.gps").attr("title", linkTitle).on('click', function(ev) {
      $(".map-popup-trigger")[0].click();
    });

    util.translate();

    $("#subalbums").hide();
    // $("#media-view").removeClass("hidden");
  };


  /* Entry point for most events */

	TopFunctions.prototype.hashParsed = function(album, media, mediaIndex) {
		var populateAlbum;
		var currentAlbumPath, currentAlbumPathArray;

		util.undie();
		$("#loading").hide();

		$(window).off("resize");
		$(window).on(
			"resize",
			function () {
				windowWidth = $(window).outerWidth();
				windowHeight = $(window).outerHeight();
			}
		);

		if (album === currentAlbum && media === currentMedia)
			return;
		if (album != currentAlbum)
			currentAlbum = null;

		previousAlbum = currentAlbum;
		if (currentAlbum && util.isByDateCacheBase(currentAlbum.cacheBase) && media !== null) {
			previousMedia = media;
		} else {
			previousMedia = currentMedia;
		}
		currentAlbum = album;
		currentMedia = media;
		currentMediaIndex = mediaIndex;

		f.setOptions();

		if (currentMedia === null || typeof currentMedia === "object") {
			f.initializeSortPropertiesAndCookies();
			$("#menu-icon").attr("title", util._t("#menu-icon-title"));
			f.sortAlbumsMedia();
			f.updateMenu();
		}

		currentAlbumPathArray = currentAlbum.path.split('/').slice(1);
		if (util.isByGpsCacheBase(currentAlbum.cacheBase))
			currentAlbumPathArray = currentAlbum.ancestorsNames.slice(2);
		currentAlbumPath = currentAlbumPathArray.join('/');

		$("#album-search").attr('title', util._t("#current-album-is") + '"'+ currentAlbumPath + '"');

		var isAlbumWithOneMedia = util.isAlbumWithOneMedia(currentAlbum);
		if (currentMedia !== null || isAlbumWithOneMedia) {
			if (isAlbumWithOneMedia) {
				currentMedia = currentAlbum.media[0];
				currentMediaIndex = 0;
				$("#media-view").css("cursor", "default");
				$("#album-view").addClass("hidden");
			} else {
				$("#media-view").css("cursor", "ew-resize");
			}
			nextMedia = null;
			previousMedia = null;
			// $("#album-view .title").hide();
			// $("#media-view .title").show();
			TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
		} else {

			// $("#album-view .title").show();
			TopFunctions.setTitle("album", null);
			// $("#media-view .title").hide();
			$("#album-view").removeClass("media-view-container");
		}

		// if (! isAlbumWithOneMedia || $("#album-view").is(":visible")) {
		if ($("#album-view").is(":visible")) {
			populateAlbum =
			 	previousAlbum !== currentAlbum || previousMedia !== currentMedia;
			TopFunctions.showAlbum(populateAlbum);
		}

		// options function must be called again in order to set elements previously absent
		f.setOptions();
		if (currentMedia !== null) {
			// no subalbums, nothing to wait
			// set social buttons events
			if (currentMedia.mediaType == "video")
				$("#media").on("loadstart", f.socialButtons);
			else
				$("#media").on("load", f.socialButtons);
		} else  if (
			currentAlbum !== null && ! currentAlbum.subalbums.length ||
			numSubAlbumsReady >= album.subalbums.length
		) {
			// no subalbums
			// set social buttons href's when all the stuff is loaded
			$(window).on("load", f.socialButtons());
		} else {
			// subalbums are present, we have to wait when all the random thumbnails will be loaded
		}
		fromEscKey = false;

		return;
	};

  TopFunctions.prototype.sortAlbumsByDate = function(ev) {
		if (
			currentAlbum.albumNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("albumNameSortRequested", false);
			f.setBooleanCookie("albumDateReverseSortRequested", currentAlbum.albumNameReverseSort);
			f.sortAlbumsMedia();
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.sortAlbumsByName = function(ev) {
		if (
			! currentAlbum.albumNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("albumNameSortRequested", true);
			f.setBooleanCookie("albumNameReverseSortRequested", currentAlbum.albumDateReverseSort);
			f.sortAlbumsMedia();
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.sortAlbumsReverse = function(ev) {
		if (
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			if (currentAlbum.albumNameSort)
				f.setBooleanCookie("albumNameReverseSortRequested", ! currentAlbum.albumNameReverseSort);
			else
				f.setBooleanCookie("albumDateReverseSortRequested", ! currentAlbum.albumDateReverseSort);
			f.sortAlbumsMedia();
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};
	// media

	TopFunctions.prototype.sortMediaByDate = function (ev) {
		if (
			currentAlbum.mediaNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("mediaNameSortRequested", false);
			f.setBooleanCookie("mediaDateReverseSortRequested", f.getBooleanCookie("mediaDateReverseSortRequested"));
			f.sortAlbumsMedia();
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			f.focusSearchField();
		}
		return false;
	};


	TopFunctions.prototype.sortMediaByName = function(ev) {
		if (
			! currentAlbum.mediaNameSort &&
			ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey
		) {
			f.setBooleanCookie("mediaNameSortRequested", true);
			f.setBooleanCookie("mediaNameReverseSortRequested", f.getBooleanCookie("mediaNameReverseSortRequested"));
			f.sortAlbumsMedia();
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.sortMediaReverse = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if (currentAlbum.mediaNameSort)
				f.setBooleanCookie("mediaNameReverseSortRequested", ! f.getBooleanCookie("mediaNameReverseSortRequested"));
			else
				f.setBooleanCookie("mediaDateReverseSortRequested", ! f.getBooleanCookie("mediaDateReverseSortRequested"));

			f.sortAlbumsMedia();
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleTitle = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.hide_title = ! Options.hide_title;
			f.setBooleanCookie("hide_title", Options.hide_title);
			f.updateMenu();
			if (Options.hide_title) {
				$(".title").addClass("hidden-by-option");
			} else {
				$(".title").removeClass("hidden-by-option");
				TopFunctions.showAlbum("refreshMedia");
			}
			if (currentMedia !== null) {
				TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
				TopFunctions.showMedia(currentAlbum, nextMedia, 'right');
				TopFunctions.showMedia(currentAlbum, prevMedia, 'left');
			} else
				TopFunctions.showAlbum(false);
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleBottomThumbnails = function(ev) {
		if ([1, 9].indexOf(ev.which) !== -1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.hide_bottom_thumbnails = ! Options.hide_bottom_thumbnails;
			f.setBooleanCookie("hide_bottom_thumbnails", Options.hide_bottom_thumbnails);
			f.updateMenu();
			if (Options.hide_bottom_thumbnails) {
				$("#album-view").addClass("hidden-by-option");
			} else {
				$("#album-view").removeClass("hidden-by-option");
			}
			TopFunctions.showAlbum("refreshMedia");
			if (currentMedia !== null) {
				TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
				TopFunctions.showMedia(currentAlbum, nextMedia, 'right');
				TopFunctions.showMedia(currentAlbum, prevMedia, 'left');
			} else
				TopFunctions.showAlbum(false);
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleSlideMode = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.albums_slide_style = ! Options.albums_slide_style;
			f.setBooleanCookie("albums_slide_style", Options.albums_slide_style);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleSpacing = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			if (Options.spacing)
				Options.spacing = 0;
			else
				Options.spacing = Options.spacingToggle;
			f.setCookie("spacing", Options.spacing);
			f.updateMenu();
			TopFunctions.showAlbum("refreshBoth");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumNames = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_album_names_below_thumbs = ! Options.show_album_names_below_thumbs;
			f.setBooleanCookie("show_album_names_below_thumbs", Options.show_album_names_below_thumbs);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaCount = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_album_media_count = ! Options.show_album_media_count;
			f.setBooleanCookie("show_album_media_count", Options.show_album_media_count);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaNames = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.show_media_names_below_thumbs = ! Options.show_media_names_below_thumbs;
			f.setBooleanCookie("show_media_names_below_thumbs", Options.show_media_names_below_thumbs);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleAlbumsSquare = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.album_thumb_type = Options.album_thumb_type == "square" ? "fit" : "square";
			f.setCookie("album_thumb_type", Options.album_thumb_type);
			f.updateMenu();
			TopFunctions.showAlbum("refreshSubalbums");
			f.focusSearchField();
		}
		return false;
	};

	TopFunctions.prototype.toggleMediaSquare = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			Options.media_thumb_type = Options.media_thumb_type == "square" ? "fixed_height" : "square";
			f.setCookie("media_thumb_type", Options.media_thumb_type);
			f.updateMenu();
			TopFunctions.showAlbum("refreshMedia");
			f.focusSearchField();
		}
		return false;
	};


  TopFunctions.showAlbum = function(populate) {
		var i, imageLink, linkContainer, container, image, media, thumbsElement, subalbums, subalbumsElement, mediaHash, subfolderHash, thumbHash, thumbnailSize;
		var width, height, thumbWidth, thumbHeight, imageString, calculatedWidth, calculatedHeight, populateMedia;
		var albumViewWidth, correctedAlbumThumbSize = Options.album_thumb_size;
		var mediaWidth, mediaHeight, slideBorder = 0, scrollBarWidth = 0, buttonBorder = 0, margin, imgTitle;
		var tooBig = false, isVirtualAlbum = false;
		var mapLinkIcon, id;
		var caption, captionColor, captionHtml, captionHeight, captionFontSize, buttonAndCaptionHeight, albumButtonAndCaptionHtml, heightfactor;
		var array, folderArray, folder, folderName, folderTitle, savedSearchSubAlbumHash, savedSearchAlbumHash;

		phFl.subalbumIndex = 0;
		numSubAlbumsReady = 0;

		array = phFl.decodeHash(location.hash);
		// array is [albumHash, mediaHash, mediaFolderHash, savedSearchSubAlbumHash, savedSearchAlbumHash]
		savedSearchSubAlbumHash = array[3];
		savedSearchAlbumHash = array[4];

		if (Options.albums_slide_style)
			slideBorder = 3;

		if (currentMedia === null && previousMedia === null)
			$("html, body").stop().animate({ scrollTop: 0 }, "slow");
		if (populate) {
			thumbnailSize = Options.media_thumb_size;

			populateMedia = populate;
			isVirtualAlbum = (util.isByDateCacheBase(currentAlbum.cacheBase) || util.isByGpsCacheBase(currentAlbum.cacheBase) || util.isSearchCacheBase(currentAlbum.cacheBase) );
			tooBig = currentAlbum.path.split("/").length < 4 && currentAlbum.media.length > Options.big_virtual_folders_threshold;
			if (populateMedia === true && isVirtualAlbum)
				populateMedia = populateMedia && ! tooBig;

			if (isVirtualAlbum && tooBig) {
				$("#thumbs").empty();
				$("#error-too-many-images").html(
					"<span id='too-many-images'>" + util._t('#too-many-images') + "</span>: " + currentAlbum.media.length +
					" (<span id='too-many-images-limit-is'>" + util._t('#too-many-images-limit-is') + "</span> " + Options.big_virtual_folders_threshold +  ")</span>"
				).show();
			} else if (
				populateMedia === true ||
				populateMedia == "refreshMedia" ||
				populateMedia == "refreshBoth"
			) {
				media = [];

				//
				// media loop
				//
				for (i = 0; i < currentAlbum.media.length; ++i) {
					width = currentAlbum.media[i].metadata.size[0];
					height = currentAlbum.media[i].metadata.size[1];
					thumbHash = util.chooseThumbnail(currentAlbum, currentAlbum.media[i], thumbnailSize);

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
					imgTitle = currentAlbum.media[i].albumName;
					calculatedHeight = Options.media_thumb_size;

          var albumViewPadding = $("#album-view").css("padding");
          if (! albumViewPadding)
            albumViewPadding = 0;
          else
            albumViewPadding = parseInt(albumViewPadding);
          calculatedWidth = Math.min(
						calculatedWidth,
						($(window).innerWidth() - 2 * albumViewPadding)
					);
					calculatedHeight = calculatedWidth / thumbWidth * thumbHeight;

					mapLinkIcon = "";
					if (util.hasGpsData(currentAlbum.media[i])) {
						mapLinkIcon =
							"<a id='media-map-link-" + i + "'>" +
								"<img " +
									// "id='media-map-link-" + i + "' " +
									"class='thumbnail-map-link' " +
									"title='" + util._t("#show-on-map") + "' " +
									"alt='" + util._t("#show-on-map") + "' " +
									"height='20px' " +
									"src='img/ic_place_white_24dp_2x.png'" +
								">" +
							"</a>";
					}

					imageString =	"<div class='thumb-and-caption-container' style='" +
										"width: " + calculatedWidth + "px; " +
									"'>" +
								"<div class='thumb-container' " + "style='" +
										// "width: " + calculatedWidth + "px; " +
										"width: " + calculatedWidth + "px; " +
										"height: " + calculatedHeight + "px;" +
									"'>" +
									mapLinkIcon +
									"<span class='helper'></span>" +
									"<img title='" + imgTitle + "' " +
										"alt='" + util.trimExtension(currentAlbum.media[i].name) + "' " +
										"data-src='" +  encodeURI(thumbHash) + "' " +
										"class='thumbnail lazyload-media" + "' " +
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
								currentAlbum.media[i].name.replace(/ /g, "</span> <span style='white-space: nowrap;'>") +
								"</span>";
					imageString += "</div>" +
							"</div>";
					image = $(imageString);

					image.get(0).media = currentAlbum.media[i];
					if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
						mediaHash = phFl.encodeHash(currentAlbum, currentAlbum.media[i], savedSearchSubAlbumHash, savedSearchAlbumHash);
					else
						mediaHash = phFl.encodeHash(currentAlbum, currentAlbum.media[i]);
					imageLink = $("<a id='link-" + mediaHash + "' href='" + mediaHash + "'></a>");
					imageLink.append(image);
					media.push(imageLink);
					(function(theLink, theImage) {
						theImage.on("error", function() {
							media.splice(media.indexOf(theLink), 1);
							theLink.remove();
							currentAlbum.media.splice(currentAlbum.media.indexOf(theImage.get(0).media), 1);
						});
					})(imageLink, image);
				}

				thumbsElement = $("#thumbs");
				thumbsElement.empty();
				thumbsElement.append.apply(thumbsElement, media);

				// generate the click event for the map for every media
				for (i = 0; i < currentAlbum.media.length; ++i) {
					$("#media-map-link-" + i).off();
					$("#media-map-link-" + i).on('click', {media: currentAlbum.media[i], album: currentAlbum}, map.generateMapFromMedia);
				}
			}
			lazyload(document.querySelectorAll(".lazyload-media"));

			if (currentMedia === null) {
				if (fromEscKey && firstEscKey) {
					// respect the existing mediaLink (you cannot do it more than once)
					firstEscKey = false;
				} else {
					// reset mediaLink
					if (currentAlbum.media.length)
						mediaLink = phFl.encodeHash(currentAlbum, currentAlbum.media[0], savedSearchSubAlbumHash, savedSearchAlbumHash);
					else
						mediaLink = "#!/" + currentAlbum.cacheBase;

					firstEscKey = true;
				}

				upLink = phFl.upHash(location.hash);

				if (
					populate === true ||
					populate == "refreshSubalbums" ||
					populateMedia == "refreshBoth"
				) {
					subalbums = [];

					// resize down the album buttons if they are too wide
					albumViewWidth = $("body").width() -
							parseInt($("#album-view").css("padding-left")) -
							parseInt($("#album-view").css("padding-right")) -
							scrollBarWidth;
					if ((util.albumButtonWidth(correctedAlbumThumbSize, buttonBorder) + Options.spacing) * Options.min_album_thumbnail > albumViewWidth) {
						if (Options.albums_slide_style)
							correctedAlbumThumbSize =
								Math.floor((albumViewWidth / Options.min_album_thumbnail - Options.spacing - 2 * slideBorder) / 1.1 - 2 * buttonBorder);
						else
							correctedAlbumThumbSize =
								Math.floor(albumViewWidth / Options.min_album_thumbnail - Options.spacing - 2 * buttonBorder);
					}
					margin = 0;
					if (Options.albums_slide_style)
						margin = Math.round(correctedAlbumThumbSize * 0.05);

					captionFontSize = Math.round(util.em2px("body", 1) * correctedAlbumThumbSize / Options.album_thumb_size);
					captionHeight = parseInt(captionFontSize * 1.1) + 1;
					if (util.isFolderCacheBase(currentAlbum.cacheBase) && ! Options.show_album_names_below_thumbs)
						heightfactor = 0;
					else if (! Options.show_album_media_count)
						heightfactor = 1.6;
					else
						heightfactor = 2.8;
					buttonAndCaptionHeight = util.albumButtonWidth(correctedAlbumThumbSize, buttonBorder) + captionHeight * heightfactor;

					// insert into DOM
					subalbumsElement = $("#subalbums");
					subalbumsElement.empty();
					subalbumsElement.insertBefore(thumbsElement);

					//
					// subalbum loop
					//
					for (i = 0; i < currentAlbum.subalbums.length; ++i) {
						if (util.isSearchCacheBase(currentAlbum.cacheBase))
							subfolderHash = phFl.encodeHash(currentAlbum.subalbums[i], null, currentAlbum.subalbums[i].cacheBase, currentAlbum.cacheBase);
						else {
							if (typeof savedSearchAlbumHash !== "undefined" && savedSearchAlbumHash !== null)
								subfolderHash = phFl.encodeHash(currentAlbum.subalbums[i].cacheBase, null, savedSearchSubAlbumHash, savedSearchAlbumHash);
							else
								subfolderHash = phFl.encodeHash(currentAlbum.subalbums[i], null);
						}

						// generate the subalbum caption
						if (util.isByDateCacheBase(currentAlbum.cacheBase)) {
							folderArray = currentAlbum.subalbums[i].cacheBase.split(Options.cache_folder_separator);
							folderName = "";
							if (folderArray.length == 2) {
								folderName += parseInt(folderArray[1]);
							} else if (folderArray.length == 3)
								folderName += " " + util._t("#month-" + folderArray[2]);
							else if (folderArray.length == 4)
								folderName += util._t("#day") + " " + parseInt(folderArray[3]);
								folderTitle = folderName;
						} else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
							folderName = '';
							folderTitle = '';
							if (currentAlbum.subalbums[i].name === '')
								folderName = util._t('.not-specified');
							else if (currentAlbum.subalbums[i].hasOwnProperty('altName'))
								folderName = util.transformAltPlaceName(currentAlbum.subalbums[i].altName);
							else
								folderName = currentAlbum.subalbums[i].name;
							folderTitle = util._t('#place-icon-title') + folderName;

						}
						else {
							folderName = currentAlbum.subalbums[i].path;
							folderTitle = folderName;
						}

						folder = "<span class='folder-name'>" +
											folderName;
            if (currentAlbum.subalbums[i].hasOwnProperty("positionsAndMediaInTree") && currentAlbum.subalbums[i].positionsAndMediaInTree.length)
  						folder += "<a id='subalbum-map-link-" + i + "' >" +
  												"<img " +
  													"class='title-img' " +
  													"title='" + folderTitle + "' " +
  													"alt='" + folderTitle + "' " +
  													"height='15px' " +
  													"src='img/ic_place_white_24dp_2x.png' " +
  												"/>" +
  											"</a>";
						folder += "</span>";

						// // get the value in style sheet (element with that class doesn't exist in DOM)
						// var $el = $('<div class="album-caption"></div>');
						// $($el).appendTo('body');
						// $($el).remove();
						captionColor = Options.albums_slide_style ? Options.slide_album_caption_color : Options.album_caption_color;

						captionHtml = "<div class='album-caption";
						if (util.isFolderCacheBase(currentAlbum.cacheBase) && ! Options.show_album_names_below_thumbs)
							captionHtml += " hidden";
						captionHtml += "' id='album-caption-" + phFl.hashCode(currentAlbum.subalbums[i].cacheBase) + "' " +
													"style='" +
														"width: " + correctedAlbumThumbSize + "px; " +
														"font-size: " + captionFontSize + "px; " +
														"height: " + captionHeight + "px; " +
														"color: " + captionColor + ";" +
													"'" +
													">" + folder + "</div>";

						captionHtml += "<div class='album-caption-count";
						if (util.isFolderCacheBase(currentAlbum.cacheBase) && ! Options.show_album_names_below_thumbs || ! Options.show_album_media_count)
							captionHtml += " hidden";
						captionHtml += "' " +
									"style='" +
										"font-size: " + Math.round((captionFontSize / 1.5)) + "px; " +
										"height: " + captionHeight + "px; " +
										"color: " + captionColor + ";" +
									"'" +
								">(";
						captionHtml +=		currentAlbum.subalbums[i].numMediaInSubTree;
						captionHtml +=		" <span class='title-media'>";
						captionHtml +=		util._t(".title-media");
						captionHtml +=		"</span>";
						captionHtml += ")</div>";
						caption = $(captionHtml);


						// a dot could be present in a cache base, making $("#" + cacheBase) fail, beware...
						id = phFl.hashCode(currentAlbum.subalbums[i].cacheBase);
						albumButtonAndCaptionHtml =
							"<div id='" + id + "' " +
								"class='album-button-and-caption";
						if (Options.albums_slide_style)
							albumButtonAndCaptionHtml += " slide";
						albumButtonAndCaptionHtml +=
								"' " +
								"style='" +
									"margin-right: " + Options.spacing + "px; " +
									"margin-top: " + Options.spacing + "px; " +
									"height: " + buttonAndCaptionHeight + "px; " +
									"width: " + util.albumButtonWidth(correctedAlbumThumbSize, buttonBorder) + "px; ";
						if (Options.albums_slide_style)
							albumButtonAndCaptionHtml += "background-color:" + Options.album_button_background_color + ";";
						albumButtonAndCaptionHtml +=
								"'" +
							">" +
							"</div>";
						linkContainer = $(albumButtonAndCaptionHtml);

						image = $(
											"<div " +
											 	"class='album-button' " +
												"style='" +
													"width:" + correctedAlbumThumbSize + "px; " +
													"height:" + correctedAlbumThumbSize + "px; " +
													"margin:" + margin + "px;" +
												"'" +
												">" +
												"<a href=''>" +
													"<img " +
														"src='img/link-arrow.png' " +
														"class='album-button-random-media-link' " +
														"style='" +
															"width: 20px;" +
															" height: 20px;" +
															"'" +
														">" +
												"</a>" +
												"<span class='helper'></span>" +
												"<img class='thumbnail lazyload-album-" + id + "'>" +
											"</div>"
										);
						linkContainer.append(image);
						linkContainer.append(caption);

						subalbumsElement.append(linkContainer);
						container = $("#" + phFl.hashCode(currentAlbum.subalbums[i].cacheBase));
						// add the clicks
						container.off('click').css("cursor", "pointer").on('click', {hash: subfolderHash}, function(ev) {
							window.location.href = ev.data.hash;
						});

						//////////////////// begin anonymous function /////////////////////
						//      })(currentAlbum.subalbums[i], image, container);
						(function(theSubalbum, theImage, theLink, id) {
							// function(subalbum, container, callback, error)  ---  callback(album,   album.media[index], container,            subalbum);
							phFl.pickRandomMedia(
								theSubalbum,
								currentAlbum,
								function(randomAlbum, randomMedia, theOriginalAlbumContainer, subalbum) {
									var titleName, randomMediaLink, goTo, humanGeonames;
									var mediaSrc = util.chooseThumbnail(randomAlbum, randomMedia, Options.album_thumb_size);

									phFl.subalbumIndex ++;
									mediaWidth = randomMedia.metadata.size[0];
									mediaHeight = randomMedia.metadata.size[1];
									if (Options.album_thumb_type == "fit") {
										if (mediaWidth < correctedAlbumThumbSize && mediaHeight < correctedAlbumThumbSize) {
											thumbWidth = mediaWidth;
											thumbHeight = mediaHeight;
										} else {
											if (mediaWidth > mediaHeight) {
												thumbWidth = correctedAlbumThumbSize;
												thumbHeight = Math.floor(correctedAlbumThumbSize * mediaHeight / mediaWidth);
											} else {
												thumbWidth = Math.floor(correctedAlbumThumbSize * mediaWidth / mediaHeight);
												thumbHeight = correctedAlbumThumbSize;
											}
										}
									} else if (Options.album_thumb_type == "square") {
										thumbWidth = correctedAlbumThumbSize;
										thumbHeight = correctedAlbumThumbSize;
									}

									if (util.isByDateCacheBase(currentAlbum.cacheBase)) {
										titleName = util.pathJoin([randomMedia.dayAlbum, randomMedia.name]);
										// randomMediaLink = util.pathJoin(["#!", randomMedia.dayAlbumCacheBase, randomMedia.foldersCacheBase, randomMedia.cacheBase]);
									} else if (util.isByGpsCacheBase(currentAlbum.cacheBase)) {
										humanGeonames = util.pathJoin([Options.by_gps_string, randomMedia.geoname.country_name, randomMedia.geoname.region_name, randomMedia.geoname.place_name]);
										titleName = util.pathJoin([humanGeonames, randomMedia.name]);
										// randomMediaLink = util.pathJoin(["#!", randomMedia.gpsAlbumCacheBase, randomMedia.foldersCacheBase, randomMedia.cacheBase]);
									} else if (util.isSearchCacheBase(currentAlbum.cacheBase)) {
										titleName = randomMedia.albumName;
										// randomMediaLink = util.pathJoin(["#!", randomMedia.foldersCacheBase, currentAlbum.cacheBase + Options.cache_folder_separator + theSubalbum.cacheBase, randomMedia.cacheBase]);
									} else {
										titleName = randomMedia.albumName;
										// randomMediaLink = util.pathJoin(["#!", randomMedia.foldersCacheBase, randomMedia.cacheBase]);
									}
									randomMediaLink = phFl.encodeHash(randomAlbum, randomMedia);

									titleName = titleName.substr(titleName.indexOf('/') + 1);
									goTo = util._t(".go-to") + " " + titleName;
									$("#" + id + " .album-button a").attr("href", randomMediaLink);
									$("#" + id + " img.album-button-random-media-link").attr("title", goTo).attr("alt", goTo);
									$("#" + id + " img.thumbnail").attr("title", titleName).attr("alt", titleName).attr("data-src", encodeURI(mediaSrc));
									$("#" + id + " img.thumbnail").css("width", thumbWidth).css("height", thumbHeight);

									lazyload(document.querySelectorAll(".lazyload-album-" + id));

									numSubAlbumsReady ++;
									if (numSubAlbumsReady >= theOriginalAlbumContainer.subalbums.length) {
										// now all the subalbums random thumbnails has been loaded
										// we can run the function that prepare the stuffs for sharing
										f.socialButtons();
									}
								},
								function error() {
									currentAlbum.subalbums.splice(currentAlbum.subalbums.indexOf(theSubalbum), 1);
									theLink.remove();
									subalbums.splice(subalbums.indexOf(theLink), 1);
								}
							);
							i ++; i --;
						})(currentAlbum.subalbums[i], image, container, id);
						//////////////////// end anonymous function /////////////////////
					}

					for (i = 0; i < currentAlbum.subalbums.length; ++i) {
						$("#subalbum-map-link-" + i).off();
            if (currentAlbum.subalbums[i].hasOwnProperty("positionsAndMediaInTree") && currentAlbum.subalbums[i].positionsAndMediaInTree.length)
              $("#subalbum-map-link-" + i).on('click', {subalbum: currentAlbum.subalbums[i]}, map.generateMapFromSubalbum);
					}

					$("#subalbums").show();
					$("#album-view").removeClass("media-view-container");

					// check for overflow in album-caption class in order to adapt album caption height to the string length
					// when diving into search subalbum, the whole album path is showed and it can be lengthy
					if (Options.show_album_names_below_thumbs) {
						var maxHeight = null;
						$('.album-caption').each(function() {
							var thisHeight = $(this)[0].scrollHeight;
							maxHeight = (thisHeight > maxHeight) ? thisHeight : maxHeight;
						});
						var difference = maxHeight - parseFloat($(".album-caption").css("height"));
						$(".album-button-and-caption").css("height", (parseInt($(".album-button-and-caption").css("height")) + difference) + 'px');
						$(".album-caption").css("height", maxHeight + 'px');
					}

					if (Options.albums_slide_style)
						$(".album-button").css("background-color", Options.album_button_background_color);
					else
						$(".album-button").css("border", "none");
				}
			}

		}

		if (currentMedia === null && ! util.isAlbumWithOneMedia(currentAlbum)) {
			$("#media-view").addClass("hidden");
			$(".thumb-container").removeClass("current-thumb");
			$("#album-view").removeClass("media-view-container");
			if (currentAlbum.subalbums.length > 0)
				$("#subalbums").show();
			else
				$("#subalbums").hide();
			$("#media-view").removeClass("no-bottom-space");
			$("#album-view").removeClass("no-bottom-space");
			// $("#media-box-inner").show().children().last().remove();
			// $("#media-box").hide();
			$("#album-view").removeClass("hidden");
			var foldersViewLink = "#!/" + encodeURIComponent(Options.folders_string);
			var byDateViewLink = "#!/" + encodeURIComponent(Options.by_date_string);
			var byGpsViewLink = "#!/" + encodeURIComponent(Options.by_gps_string);
			$(".day-gps-folders-view").removeClass("selected").addClass("active").removeClass("hidden").off("click");
			if (currentAlbum.cacheBase == Options.folders_string) {
				$("#folders-view").removeClass("active").addClass("selected");
				$("#by-date-view").on("click", function(ev) {
					window.location.href = byDateViewLink;
				});
				phFl.addClickToByGpsButton(byGpsViewLink);
			} else if (currentAlbum.cacheBase == Options.by_date_string) {
				$("#folders-view").on("click", function(ev) {
					window.location.href = foldersViewLink;
				});
				$("#by-date-view").removeClass("active").addClass("selected");
				phFl.addClickToByGpsButton(byGpsViewLink);
			}	else if (currentAlbum.cacheBase == Options.by_gps_string) {
				$("#folders-view").on("click", function(ev) {
					window.location.href = foldersViewLink;
				});
				$("#by-date-view").on("click", function(ev) {
					window.location.href = byDateViewLink;
				});
				$("#by-gps-view").removeClass("active").addClass("selected");
			} else if (
				util.isSearchCacheBase(currentAlbum.cacheBase) && currentAlbum.media.length === 0 && currentAlbum.subalbums.length === 0
			) {
				$("#folders-view").on("click", function(ev) {
					$("#album-view").removeClass("hidden");
					$(".search-failed").hide();
					window.location.href = foldersViewLink;
				});
				$("#by-date-view").on("click", function(ev) {
					$(".search-failed").hide();
					$("#album-view").removeClass("hidden");
					window.location.href = byDateViewLink;
				});
				phFl.addClickToByGpsButton(byGpsViewLink);
			} else {
				$(".day-gps-folders-view").addClass("hidden");
			}
			$("#powered-by").show();

			// pS.addAlbumGesturesDetection();
		} else {
			// currentMedia !== null
			$("#media-view").removeClass("hidden");

			if (currentAlbum.media.length == 1)
				$("#album-view").addClass("hidden");
			else
				$("#album-view").removeClass("hidden");
			$("#powered-by").hide();
		}

		f.setOptions();

		if (! $("#album-view").hasClass("hidden"))
			setTimeout(f.scrollToThumb, 1);
	};

  TopFunctions.goFullscreen = function(e) {
		// $("#media").off();
		if (Modernizr.fullscreen) {
			e.preventDefault();
			$("#album-view").addClass('hidden');
			$("#media-view").fullScreen({
				callback: function(isFullscreen) {
					fullScreenStatus = isFullscreen;
					$(".enter-fullscreen").toggle();
					$(".exit-fullscreen").toggle();
					TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
				}
			});
		} else {
			// $("#media").off();
			if (! fullScreenStatus) {
				$(".title").addClass("hidden-by-fullscreen");
				$("#album-view").addClass('hidden-by-fullscreen');
				$(".enter-fullscreen").toggle();
				$(".exit-fullscreen").toggle();
				fullScreenStatus = true;
			} else {
				$(".title").removeClass("hidden-by-fullscreen");
				$("#album-view").removeClass('hidden-by-fullscreen');
				$(".enter-fullscreen").toggle();
				$(".exit-fullscreen").toggle();
				fullScreenStatus = false;
			}
			TopFunctions.showMedia(currentAlbum, currentMedia, 'center');
		}
	};

  TopFunctions.prototype.goFullscreenFromMouse = function(ev) {
		if (ev.which == 1 && ! ev.shiftKey && ! ev.ctrlKey && ! ev.altKey) {
			TopFunctions.goFullscreen(ev);
			return false;
		}
	};

  TopFunctions.prototype.goFullscreen = TopFunctions.goFullscreen;

  window.TopFunctions = TopFunctions;
}());
