/* jshint esversion: 6 */
(function() {

	class Env {
		constructor() {
			this.guessedPasswordCodes = [];
			this.guessedPasswordsMd5 = [];
			this.searchWordsFromJsonFile = [];
			this.searchAndSubalbumHash = '';
			this.searchAlbumCacheBasesFromJsonFile = [];
			this.searchAlbumSubalbumsFromJsonFile = [];
			this.fullScreenStatus = false;
			this.currentAlbum = null;
			this.currentMedia = null;
			this.currentMediaIndex = -1;
			this.previousAlbum = null;
			this.previousMedia = null;
			this.nextMedia = null;
			this.prevMedia = null;
			this.isABrowsingModeChange = false;
			this.windowWidth = $(window).outerWidth();
			this.windowHeight = $(window).outerHeight();
			this.fromEscKey = false;
			this.firstEscKey = true;
			this.mapRefreshType = "none";
			this.selectorClickedToOpenTheMap = false;
			this.popupRefreshType = "previousAlbum";
			// destHash = null;
			// destMedia = null;
			// destAlbum = null;
			this.hashBeginning = "#!/";
			// var nextLink = "", prevLink = "";
			this.mediaLink = "";
			// scrollbarWidth;
			// contextMenu = false;

			// initialSizes = {};
			// initialSizes[0] = new ImagesAndVideos();
			this.positionMarker = "<marker>position</marker>";

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
			// this variable permits to take into account the real mobile device pixels when deciding the size of reduced size image which is going to be loaded
			this.devicePixelRatio = 1;
			if (this.isMobile.any())
				this.devicePixelRatio =  window.devicePixelRatio || 1;
			else
				this.devicePixelRatio = 1;

			this.maxSize = 0;
			this.language = "en";
			// var nextLink = "", prevLink = "";
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

		isEqual(otherMedia) {
			return this.foldersCacheBase === otherMedia.foldersCacheBase && this.cacheBase === otherMedia.cacheBase;
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

		addParent(album) {
			// add parent album
			if (! this.hasOwnProperty("parent"))
				this.parent = album;
		}

		clone() {
			return Utilities.cloneObject(this);
		}

		cloneAndDeleteParent() {
			let clonedSingleMedia = this.clone();
			delete clonedSingleMedia.parent;
			return clonedSingleMedia;
		}

		transformForPositions() {
			return new SingleMediaInPositions(
				{
					name: Utilities.pathJoin([this.albumName, this.name]),
					cacheBase: this.cacheBase,
					foldersCacheBase: this.foldersCacheBase
				}
			);
		}

		generatePositionAndMedia() {
			return new PositionAndMedia(
				{
					'lat' : parseFloat(this.metadata.latitude),
					'lng': parseFloat(this.metadata.longitude),
					'mediaList': [this.transformForPositions()]
				}
			);
		}

		isEqual(otherMedia) {
			return otherMedia !== null && this.foldersCacheBase === otherMedia.foldersCacheBase && this.cacheBase === otherMedia.cacheBase;
		}

		hasGpsData() {
			return this.metadata.latitude !== undefined && this.metadata.longitude !== undefined;
		}
	}

	class Media extends Array {
		constructor(media) {
			if (Array.isArray(media)) {
				super(... media.map(singleMedia => new SingleMedia(singleMedia))).getAndPutIntoCache();
			} else {
				super(media);
			}
		}

		getAndPutIntoCache() {
			this.forEach(
				function(singleMedia, index, media) {
					var singleMediaFromCache = env.cache.getSingleMedia(singleMedia);
					if (singleMediaFromCache !== false) {
						media[index] = singleMediaFromCache;
					}
				}
			);
		}

		removeUnnecessaryPropertiesAndAddParent(album) {
			var unnecessaryProperties = ['checksum', 'dateTimeDir', 'dateTimeFile'];
			// remove unnecessary properties from each media
			for (let i = this.length - 1; i >= 0; i --) {
				for (let j = 0; j < unnecessaryProperties.length; j ++) {
					if (this[i].hasOwnProperty(unnecessaryProperties[j]))
						delete this[i][unnecessaryProperties[j]];
				}

				this[i].addParent(album);
			}
		}

		generatePositionsAndMedia() {
			var result = new PositionsAndMedia([]);
			this.forEach(
				function(singleMedia) {
					if (singleMedia.hasGpsData())
						result.addPositionAndMedia(singleMedia.generatePositionAndMedia());
				}
			);
			return result;
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
			this.numsProtectedMediaInSubTree = new NumsProtected(this.numsProtectedMediaInSubTree);
			this.sizesOfAlbum = new Sizes(this.sizesOfAlbum);
			this.sizesOfSubTree = new Sizes(this.sizesOfSubTree);
		}

		toSubalbum() {
			return this;
		}

		isEqual(otherSubalbum) {
			return otherSubalbum !== null && this.cacheBase === otherSubalbum.cacheBase;
		}

		toAlbum(error, {getMedia = false, getPositions = false}) {
			var self = this;
			return new Promise(
				function(resolve_convertIntoAlbum) {
					let promise;
					if (self.hasOwnProperty("numsProtectedMediaInSubTree"))
						promise = PhotoFloat.getAlbum(self.cacheBase, error, {getMedia: getMedia, getPositions: getPositions}, self.numsProtectedMediaInSubTree);
					else
						promise = PhotoFloat.getAlbum(self.cacheBase, error, {getMedia: getMedia, getPositions: getPositions});
					promise.then(
						function(convertedSubalbum) {
							let properties = [
								"captionForSelection",
								"captionForSelectionSorting",
								"captionForSearch",
								"captionForSearchSorting",
								"unicodeWords",
								"words",
								"tags"
							];
							properties.forEach(
								function(property) {
									if (self.hasOwnProperty(property)) {
										// transfer subalbums properties to the album
										convertedSubalbum[property] = self[property];
									}
								}
							);
							resolve_convertIntoAlbum(convertedSubalbum);
						}
					);
				}
			);
		}

	}

	class Subalbums extends Array {
		constructor(subalbums) {
			if (Array.isArray(subalbums))
				super(... subalbums.map(subalbum => new Subalbum(subalbum)));
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

		constructor(objectOrCacheBase) {
			if (typeof objectOrCacheBase === "string") {
				let cacheBase = objectOrCacheBase;
				this.cacheBase = cacheBase;
				this.media = new Media([]);
				this.numsMedia = new ImagesAndVideos();
				this.numsMediaInSubTree = new ImagesAndVideos();
				this.sizesOfAlbum = new Sizes();
				this.sizesOfSubTree = new Sizes();
				this.subalbums = new Subalbums([]);
				this.positionsAndMediaInTree = new PositionsAndMedia([]);
				this.numPositionsInTree = 0;
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
					// let newMediaArray = new Media(this.media);
					// newMediaArray = this.media.map(singleMedia => new SingleMedia(singleMedia));
					// this.media = newMediaArray;
					this.media = new Media(this.media);
					// this.media.getAndPutIntoCache();

					this.numsMedia = this.media.imagesAndVideosCount();
				}
				if (this.hasOwnProperty("positionsAndMediaInTree")) {
					this.positionsAndMediaInTree = new PositionsAndMedia(this.positionsAndMediaInTree);
					// this.positionsAndMediaInTree = this.positionsAndMediaInTree.map(positionAndMedia => new PositionAndMedia(positionAndMedia));
				}
				this.numsMediaInSubTree = new ImagesAndVideos(this.numsMediaInSubTree);
				this.sizesOfAlbum = new Sizes(this.sizesOfAlbum);
				this.sizesOfSubTree = new Sizes(this.sizesOfSubTree);
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
			if (objectOrCacheBase !== undefined && this.codesComplexCombination === undefined) {
				env.cache.putAlbum(this);
			}
		}

		isEmpty() {
			return this.empty !== undefined && this.empty;
		}

		toAlbum(error, {getMedia = false, getPositions = false}) {
			var self = this;
			return new Promise(
				function(resolve_convertIntoAlbum) {
					let promise = PhotoFloat.getAlbum(self.cacheBase, error, {getMedia: getMedia, getPositions: getPositions});
					promise.then(
						function(convertedSubalbum) {
							resolve_convertIntoAlbum(convertedSubalbum);
						}
					);
				}
			);
		}

		clone() {
			return Utilities.cloneObject(this);
		}

		toSubalbum() {
			var subalbumProperties = [
				'cacheBase',
				'date',
				'name',
				'numPositionsInTree',
				'numsMediaInSubTree',
				'numsProtectedMediaInSubTree',
				'path',
				'captionForSelection',
				'captionForSelectionSorting',
				'captionForSearch',
				'captionForSearchSorting',
				'sizesOfAlbum',
				'sizesOfSubTree',
				'unicodeWords',
				'words',
				'tags'
			];
			var clonedAlbum = this.clone();
			Object.keys(this).forEach(
				function(key) {
					if (subalbumProperties.indexOf(key) === -1) {
						delete clonedAlbum[key];
					}
				}
			);
			return new Subalbum(clonedAlbum);
		}

		toJson() {
			var albumProperties = [
				'ancestorsNames',
				'ancestorsTitles',
				'cacheBase',
				'cacheSubdir',
				'date',
				'description',
				'jsonVersion',
				'media',
				'name',
				'numPositionsInTree',
				'numsMediaInSubTree',
				'numsProtectedMediaInSubTree',
				'path',
				'physicalPath',
				'positionsAndMediaInTree',
				'captionForSelection',
				'captionForSelectionSorting',
				'captionForSearch',
				'captionForSearchSorting',
				'sizesOfAlbum',
				'sizesOfSubTree',
				'subalbums',
				'tags',
				'title'
			];
			var clonedAlbum = this.clone();
			Object.keys(this).forEach(
				function(key) {
					if (albumProperties.indexOf(key) === -1) {
						delete clonedAlbum[key];
					}
				}
			);
			clonedAlbum.subalbums.forEach(
				function(subalbum, index) {
					clonedAlbum.subalbums[index] = subalbum.toSubalbum();
				}
			);
			clonedAlbum.media.forEach(
				function(singleMedia, index) {
					clonedAlbum.media[index] = singleMedia.cloneAndDeleteParent();
				}
			);
			return JSON.stringify(clonedAlbum);
		}

		removeUnnecessaryPropertiesAndAddParentToMedia() {
			// remove unnecessary properties from album
			var unnecessaryProperties = ['albumIniMTime', 'passwordMarkerMTime'];
			for (let j = 0; j < unnecessaryProperties.length; j ++)
				if (this.hasOwnProperty(unnecessaryProperties[j]))
					delete this[unnecessaryProperties[j]];
			if (this.hasOwnProperty("media"))
				this.media.removeUnnecessaryPropertiesAndAddParent(this);
		}

		hasPositions() {
			var result =
				this.numPositionsInTree &&
				this.media.length &&
				this.media.some(
					function(singleMedia) {
						return singleMedia.hasGpsData();
					}
				);
			return result;
		}

		hasValidPositionsAndMediaInAlbumAndSubalbums() {
			return this.hasOwnProperty("positionsAndMediaInAlbum");
		}

		invalidatePositionsAndMediaInAlbumAndSubalbums() {
			if (this.hasOwnProperty("positionsAndMediaInAlbum"))
				delete this.positionsAndMediaInAlbum;
		}

		isEqual(otherAlbum) {
			return otherAlbum !== null && this.cacheBase === otherAlbum.cacheBase;
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

		putAlbum(album) {
			var done = false, level, cacheLevelsLength = this.js_cache_levels.length, firstCacheBase;
			// check if the album is already in cache (it could be there with another media number)
			// if it is there, remove it
			if (this.albums.index.hasOwnProperty(album.cacheBase)) {
				level = this.albums.index[album.cacheBase];
				delete this.albums[level][album.cacheBase];
				delete this.albums[level].queue[album.cacheBase];
				delete this.albums.index[album.cacheBase];
			}

			if (album.hasOwnProperty("media")) {
				for (level = 0; level < cacheLevelsLength; level ++) {
					if (album.numsMedia.imagesAndVideosTotal() >= this.js_cache_levels[level].mediaThreshold) {
						if (! this.albums.hasOwnProperty(level)) {
							this.albums[level] = [];
							this.albums[level].queue = [];
						}
						if (this.albums[level].queue.length >= this.js_cache_levels[level].max) {
							// remove the first element
							firstCacheBase = this.albums[level].queue[0];
							this.albums[level].queue.shift();
							delete this.albums.index[firstCacheBase];
							delete this.albums[level][firstCacheBase];
						}
						this.albums.index[album.cacheBase] = level;
						this.albums[level].queue.push(album.cacheBase);
						this.albums[level][album.cacheBase] = album;
						done = true;
						break;
					}
				}
			}
			if (! done) {
				if (! this.albums.hasOwnProperty(cacheLevelsLength)) {
					this.albums[cacheLevelsLength] = [];
					this.albums[cacheLevelsLength].queue = [];
				}
				this.albums.index[album.cacheBase] = cacheLevelsLength;
				this.albums[cacheLevelsLength].queue.push(album.cacheBase);
				this.albums[cacheLevelsLength][album.cacheBase] = album;
			}
		}

		getAlbum(cacheBase) {
			if (this.albums.index.hasOwnProperty(cacheBase)) {
				var cacheLevel = this.albums.index[cacheBase];
				var cachedAlbum = this.albums[cacheLevel][cacheBase];
				return cachedAlbum;
			} else
				return false;
		}

		// WARNING: unused method
		removeAlbum(cacheBase) {
			if (this.albums.index.hasOwnProperty(cacheBase)) {
				var level = this.albums.index[cacheBase];
				var queueIndex = this.albums[level].queue.indexOf(cacheBase);
				this.albums[level].queue.splice(queueIndex, 1);
				delete this.albums[level][cacheBase];
				delete this.albums.index[cacheBase];
				return true;
			} else
				return false;
		}

		getSingleMedia(singleMedia) {
			var foldersCacheBase = singleMedia.foldersCacheBase;
			var cacheBase = singleMedia.cacheBase;

			if (! this.media.hasOwnProperty(foldersCacheBase)) {
				this.media[foldersCacheBase] = {};
				return false;
			}
			if (! this.media[foldersCacheBase].hasOwnProperty(cacheBase)) {
				this.media[foldersCacheBase][cacheBase] = singleMedia;
				return false;
			} else {
				return this.media[foldersCacheBase][cacheBase];
			}
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
}());
