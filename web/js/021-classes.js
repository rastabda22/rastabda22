(function() {

	var translations = new Translations();

	class Env {
		constructor() {
			this.translations = translations.getTranslations();
			this.shortcuts = translations.getShortcuts();
			this.guessedPasswordCodes = [];
			this.guessedPasswordsMd5 = [];
			this.searchWordsFromJsonFile = [];
			this.searchAlbumCacheBasesFromJsonFile = [];
			this.searchAlbumSubalbumsFromJsonFile = [];
			this.fullScreenStatus = false;
			this.currentAlbum = null;
			this.currentMedia = null;
			this.currentMediaIndex = -1;
			this.previousAlbum = null;
			this.albumOfPreviousState = null;
			this.albumInSubalbumDiv = null;
			this.previousMedia = null;
			this.nextMedia = null;
			this.prevMedia = null;
			this.isABrowsingModeChangeFromMouseClick = false;
			// beware: $(window).innerWidth(); doesn't cosider the scroll bar yet
			this.windowWidth = $(window).innerWidth();
			this.windowHeight = $(window).innerHeight();
			this.fromEscKey = false;
			this.firstEscKey = true;
			this.mapRefreshType = "none";
			this.selectorClickedToOpenTheMap = false;
			this.popupRefreshType = "previousAlbum";
			this.hashBeginning = "#!/";
			this.isFromAuthForm = false;
			this.highlightedObjectId = null;
			this.selectingSelectors = [];
			// var nextLink = "", prevLink = "";
			this.mediaLink = "";
			this.searchWords = [];
			this.loadedImages = [];
			this.isASaveDataChange = false;
			// scrollbarWidth;
			// contextMenu = false;

			this.albumCacheBase = "";
			this.mediaCacheBase = "";
			this.mediaFolderCacheBase = "";
			this.foundAlbumCacheBase = "";
			this.collectionCacheBase = "";

			// initialSizes = {};
			// initialSizes[0] = new ImagesAndVideos();
			this.positionMarker = "<marker>position</marker>";
			this.markTagBegin = "<mark data-markjs";
			this.br = "<br />";

			this.lastMapPositionAndZoom = {
				center: false,
				zoom: false
			};
			this.keepShowingGeolocationSuggestText = true;

			this.options = {};
			this.cache = new Cache();
			var self = this;
			this.isMobile = {
				Android: function() {
					return navigator.userAgent.match(/Android/i);
				},
				BlackBerry: function() {
					return navigator.userAgent.match(/BlackBerry/i);
				},
				iOS: function() {
					return navigator.userAgent.match(/iPhone|iPad|iPod/i);
				},
				Opera: function() {
					return navigator.userAgent.match(/Opera Mini/i);
				},
				Windows: function() {
					return navigator.userAgent.match(/IEMobile/i);
				},
				any: function() {
					return (self.isMobile.Android() || self.isMobile.BlackBerry() || self.isMobile.iOS() || self.isMobile.Opera() || self.isMobile.Windows());
				}
			};
			// the property devicePixelRatio permits to take into account the real mobile device pixels when deciding the size of reduced size image which is going to be loaded
			if (this.isMobile.any())
				this.devicePixelRatio =  window.devicePixelRatio || 1;
			else
				this.devicePixelRatio = 1;

			this.maxSize = 0;
			this.language = "en";
			// var nextLink = "", prevLink = "";

			this.titleWrapper = "";
			this.maxWidthForPopupContent = 0;
			this.maxWidthForImagesInPopup = 0;
			this.maxHeightForPopupContent = 0;
			this.mymap = null;
			this.popup = null;

			if ($(".media-box#center").length) {
				var originalMediaBoxContainerHtml = $(".media-box#center")[0].outerHTML;
				if (originalMediaBoxContainerHtml.indexOf('<div class="title">') === -1) {
					var titleContent = $("#album-view").clone().children().first();
					this.originalMediaBoxContainerContent = $(originalMediaBoxContainerHtml).prepend(titleContent)[0].outerHTML;
				} else {
					this.originalMediaBoxContainerContent = originalMediaBoxContainerHtml;
				}
			}
		}
	}


	class SingleMediaInPositions {
		constructor(object) {
			Object.keys(object).forEach(
				(key) => {
					this[key] = object[key];
				}
			);
		}
	}

	class MediaInPositions extends Array {
		constructor(mediaInPositions) {
			if (Array.isArray(mediaInPositions))
				super(... mediaInPositions.map(singleMediaInPositions => new SingleMediaInPositions(singleMediaInPositions)));
			else
				super(mediaInPositions);
		}
	}

	class ImagesAndVideos {
		constructor(object) {
			if (typeof object === "undefined") {
				this.images = 0;
				this.videos = 0;
			} else {
				this.images = object.images;
				this.videos = object.videos;
			}
		}
	}

	class IncludedFiles {
		constructor(object) {
			if (typeof object === "undefined") {
				// do nothing, the resulting object will be the void object
			} else  {
				Object.keys(object).forEach(
					(key) => {
						this[key] = object[key];
					}
				);
			}
		}
	}

	class NumsProtected {
		constructor(object) {
			if (typeof object === "undefined") {
				this[","] = new ImagesAndVideos();
			} else {
				Object.keys(object).forEach(
					(key) => {
						this[key] = new ImagesAndVideos(object[key]);
					}
				);
			}
		}
	}

	class Sizes {
		constructor(object) {
			if (typeof object === "undefined") {
				this[0] = new ImagesAndVideos();
				for (let iSize = 0; iSize < env.options.reduced_sizes.length; iSize ++) {
					this[env.options.reduced_sizes[iSize]] = new ImagesAndVideos();
				}
			} else {
				Object.keys(object).forEach(
					(key) => {
						this[key] = new ImagesAndVideos(object[key]);
					}
				);
			}
		}
	}

	class PositionAndMedia {
		constructor(object) {
			Object.keys(object).forEach(
				(key) => {
					this[key] = object[key];
				}
			);
			this.mediaList = new MediaInPositions(this.mediaList);
		}
	}

	class PositionsAndMedia extends Array {
		constructor(positionsAndMedia) {
			if (Array.isArray(positionsAndMedia))
				super(... positionsAndMedia.map(positionAndMedia => new PositionAndMedia(positionAndMedia)));
			else
				super(positionsAndMedia);
		}
	}

	class SingleMedia {
		constructor(object) {
			Object.keys(object).forEach(
				(key) => {
					this[key] = object[key];
				}
			);
			if (! this.hasOwnProperty("fileSizes"))
				this.fileSizes = new Sizes(this.fileSizes);
		}
	}

	class Media extends Array {
		constructor(media) {
			if (Array.isArray(media)) {
				super(... media.map(singleMedia => new SingleMedia(singleMedia)));
				this.getAndPutIntoCache();
			} else {
				super(media);
			}
		}
	}

	class Subalbum {
		constructor(object) {
			Object.keys(object).forEach(
				(key) => {
					this[key] = object[key];
				}
			);
			this.numsMediaInSubTree = new ImagesAndVideos(this.numsMediaInSubTree);
			this.sizesOfAlbum = new Sizes(this.sizesOfAlbum);
			this.sizesOfSubTree = new Sizes(this.sizesOfSubTree);
			this.nonGeotagged.numsMedia = new ImagesAndVideos(this.nonGeotagged.numsMedia);
			this.nonGeotagged.numsMediaInSubTree = new ImagesAndVideos(this.nonGeotagged.numsMediaInSubTree);
			this.nonGeotagged.sizesOfSubTree = new Sizes(this.nonGeotagged.sizesOfSubTree);
			this.nonGeotagged.sizesOfAlbum = new Sizes(this.nonGeotagged.sizesOfAlbum);
			this.numsProtectedMediaInSubTree = new NumsProtected(this.numsProtectedMediaInSubTree);
			if (this.hasOwnProperty("randomMedia")) {
				if (! Array.isArray(this.randomMedia))
					this.randomMedia = [new SingleMedia(this.randomMedia)];
			}
		}
	}

	class Subalbums extends Array {
		constructor(subalbums) {
			if (Array.isArray(subalbums))
				super(
					... subalbums.map(
						albumOrSubalbum => {
							if (albumOrSubalbum instanceof Album)
								return new Album(albumOrSubalbum);
							else
								return new Subalbum(albumOrSubalbum);
						}
					)
				);
			else
				super(subalbums);
		}
	}

	class Album {
		// album types:
		// - folder albums: the original albums, as they are on disk
		// - by date albums: the albums where the media are organized by year/month/day; they are generated by the python scanner
		// - by gps albums: the albums where the media are organized by country/state-region/province; they are generated by the python scanner
		// - by search albums: the result of a js search, they may have both media (searched by name) and albums (searched by their name as folder album)
		// - by map albums: the result of a set of click on a map: they are first presented in a map popup, and from there they can be showed as the other albums; they only have media
		// - by selection albums: the result of the manual or group (through menu commands) selection of media and albums

		// album groups:
		// - generated albums: all types except folder albums
		// - transversal albums: by date and by gps
		// - virtual albums: by map and by selection: they are generated through user direct choices, and for this reason they cannot be represented by a cache base
		// - collection albums: by search, by map and by selection albums

		constructor(objectOrCacheBase, putIntoCache = true) {
			if (typeof objectOrCacheBase === "string") {
				let cacheBase = objectOrCacheBase;
				this.cacheBase = cacheBase;
				this.media = new Media([]);
				this.numsMedia = new ImagesAndVideos();
				this.numsMediaInSubTree = new ImagesAndVideos();
				this.sizesOfSubTree = new Sizes();
				this.sizesOfAlbum = new Sizes();
				this.subalbums = new Subalbums([]);
				this.positionsAndMediaInTree = new PositionsAndMedia([]);
				this.numPositionsInTree = 0;
				this.nonGeotagged = {};
				this.nonGeotagged.numsMedia = new ImagesAndVideos();
				this.nonGeotagged.numsMediaInSubTree = new ImagesAndVideos();
				this.nonGeotagged.sizesOfAlbum = new Sizes();
				this.nonGeotagged.sizesOfSubTree = new Sizes();
				// this.numsProtectedMediaInSubTree = new NumsProtected();
				if (cacheBase.split(env.options.cache_folder_separator).length === 1)
					this.ancestorsCacheBase = [cacheBase];
				// this.path = cacheBase.replace(env.options.cache_folder_separator, "/");
				this.physicalPath = this.path;
				this.empty = false;
				if (Utilities.isMapCacheBase(cacheBase)) {
					this.clickHistory = [];
				}
			} else if (typeof objectOrCacheBase === "object") {
				Object.keys(objectOrCacheBase).forEach(
					key => {
						this[key] = objectOrCacheBase[key];
					}
				);

				if (this.hasOwnProperty("numsMedia")) {
					this.numsMedia = new ImagesAndVideos(this.numsMedia);
				}
				if (this.hasOwnProperty("media")) {
					this.media = new Media(this.media);
					this.numsMedia = this.media.imagesAndVideosCount();
				}
				if (this.hasOwnProperty("positionsAndMediaInTree")) {
					this.positionsAndMediaInTree = new PositionsAndMedia(this.positionsAndMediaInTree);
					// this.positionsAndMediaInTree = this.positionsAndMediaInTree.map(positionAndMedia => new PositionAndMedia(positionAndMedia));
				}
				this.numsMediaInSubTree = new ImagesAndVideos(this.numsMediaInSubTree);
				this.sizesOfSubTree = new Sizes(this.sizesOfSubTree);
				this.sizesOfAlbum = new Sizes(this.sizesOfAlbum);
				this.nonGeotagged.numsMedia = new ImagesAndVideos(this.nonGeotagged.numsMedia);
				this.nonGeotagged.numsMediaInSubTree = new ImagesAndVideos(this.nonGeotagged.numsMediaInSubTree);
				this.nonGeotagged.sizesOfSubTree = new Sizes(this.nonGeotagged.sizesOfSubTree);
				this.nonGeotagged.sizesOfAlbum = new Sizes(this.nonGeotagged.sizesOfAlbum);
				if (this.hasOwnProperty("numsProtectedMediaInSubTree")) {
					this.numsProtectedMediaInSubTree = new NumsProtected(this.numsProtectedMediaInSubTree);
				}
				this.subalbums = new Subalbums(this.subalbums);

				this.removeUnnecessaryPropertiesAndAddParentToMedia();
			} else if (objectOrCacheBase === undefined) {
				this.empty = true;
			}

			// if (objectOrCacheBase !== undefined) {
			// 	if (! this.hasOwnProperty("includedFilesByCodesSimpleCombination")) {
			// 		this.includedFilesByCodesSimpleCombination = new IncludedFiles({",": false});
			// 	}
			// }
			if (putIntoCache && objectOrCacheBase !== undefined && this.codesComplexCombination === undefined) {
				env.cache.putAlbum(this);
			}
		}
	}

	class Cache {
		constructor() {
			this.js_cache_levels = [
				{mediaThreshold: 10000, max: 1},
				{mediaThreshold: 2000, max: 2},
				{mediaThreshold: 500, max: 10},
				{mediaThreshold: 200, max: 50}
			];
			this.albums = {};
			this.albums.index = {};

			this.media = {};

			this.inexistentFiles = [];
		}
	}

	window.Env = Env;
	window.Album = Album;
	window.Subalbum = Subalbum;
	window.Subalbums = Subalbums;
	window.SingleMedia = SingleMedia;
	window.Media = Media;
	window.ImagesAndVideos = ImagesAndVideos;
	window.IncludedFiles = IncludedFiles;
	window.NumsProtected = NumsProtected;
	window.Sizes = Sizes;
	window.PositionAndMedia = PositionAndMedia;
	window.PositionsAndMedia = PositionsAndMedia;
	window.SingleMediaInPositions = SingleMediaInPositions;
	window.Cache = Cache;
}());
