/* jshint esversion: 6 */
(function() {

	class ImagesAndVideos {
		constructor(object) {
			if (object === undefined) {
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
			if (object === undefined) {
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
			if (object === undefined) {
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
			if (object === undefined) {
				this[0] = new ImagesAndVideos();
				for (let iSize = 0; iSize < Options.reduced_sizes.length; iSize ++) {
					this[Options.reduced_sizes[iSize]] = new ImagesAndVideos();
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
			this.fileSizes = new Sizes(this.fileSizes);
		}
	}

	class Media extends Array {
		constructor(media) {
			if (Array.isArray(media))
				super(... media.map(singleMedia => new SingleMedia(singleMedia)));
			else
				super(media);
		}

		getAndPutIntoCache() {
			this.forEach(
				function(singleMedia, index, media) {
					var singleMediaFromCache = cache.getSingleMedia(singleMedia);
					if (singleMediaFromCache !== false) {
						media[index] = singleMediaFromCache;
					}
				}
			);
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
				this.numsProtectedMediaInSubTree = new NumsProtected();
				if (cacheBase.split(Options.cache_folder_separator).length === 1)
					this.ancestorsCacheBase = [cacheBase];
				// this.path = cacheBase.replace(Options.cache_folder_separator, "/");
				this.physicalPath = this.path;
				this.empty = false;
				if (Utilities.isMapCacheBase(cacheBase)) {
					this.clickHistory = [];
				}
			} else if (typeof objectOrCacheBase === "object") {
				let object = objectOrCacheBase;
				Object.keys(object).forEach(
					(key) => {
						this[key] = object[key];
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
					this.media.getAndPutIntoCache();

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
			} else if (objectOrCacheBase === undefined) {
				this.empty = true;
			}

			if (objectOrCacheBase !== undefined) {
				if (! this.hasOwnProperty("includedFilesByCodesSimpleCombination")) {
					this.includedFilesByCodesSimpleCombination = new IncludedFiles({",": false});
				}
				if (this.codesComplexCombination === undefined)
					cache.putAlbum(this);
			}
		}

		isEmpty() {
			return this.empty !== undefined && this.empty;
		}

		convertSubalbum(subalbumIndex, error, {getMedia = false, getPositions = false}) {
			var self = this;
			var wasASubalbum = this.subalbums[subalbumIndex] instanceof Subalbum;
			return new Promise(
				function(resolve_convertIntoAlbum) {
					let promise = PhotoFloat.getAlbum(self.subalbums[subalbumIndex].cacheBase, error, {"getMedia": false, "getPositions": false});
					promise.then(
						function(convertedSubalbum) {
							if (wasASubalbum)
								self.subalbums[subalbumIndex] = convertedSubalbum;
							resolve_convertIntoAlbum(subalbumIndex);
						}
					);
				}
			);
		}
	}

	class Cache {
		constructor() {
			this.js_cache_levels = [
				{"mediaThreshold": 10000, "max": 1},
				{"mediaThreshold": 2000, "max": 2},
				{"mediaThreshold": 500, "max": 10},
				{"mediaThreshold": 200, "max": 50}
			];
			this.albums = {};
			this.albums.index = {};

			this.media = {};
		}

		putAlbum(album) {
			var done = false, level, cacheLevelsLength = this.js_cache_levels.length, firstCacheBase;
			var albumCacheBase = album.cacheBase;
			// check if the album is already in cache (it could be there with another media number)
			// if it is there, remove it
			if (this.albums.index.hasOwnProperty(albumCacheBase)) {
				level = this.albums.index[albumCacheBase];
				delete this.albums[level][albumCacheBase];
				delete this.albums[level].queue[albumCacheBase];
				delete this.albums.index[albumCacheBase];
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
						this.albums.index[albumCacheBase] = level;
						this.albums[level].queue.push(albumCacheBase);
						this.albums[level][albumCacheBase] = album;
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
				this.albums.index[albumCacheBase] = cacheLevelsLength;
				this.albums[cacheLevelsLength].queue.push(albumCacheBase);
				this.albums[cacheLevelsLength][albumCacheBase] = album;
			}
		}

		getAlbum(albumCacheBase) {
			if (this.albums.index.hasOwnProperty(albumCacheBase)) {
				var cacheLevel = this.albums.index[albumCacheBase];
				var cachedAlbum = this.albums[cacheLevel][albumCacheBase];
				return cachedAlbum;
			} else
				return false;
		}

		// WARNING: unused method
		removeAlbum(albumCacheBase) {
			if (this.albums.index.hasOwnProperty(albumCacheBase)) {
				var level = this.albums.index[albumCacheBase];
				var queueIndex = this.albums[level].queue.indexOf(albumCacheBase);
				this.albums[level].queue.splice(queueIndex, 1);
				delete this.albums[level][albumCacheBase];
				delete this.albums.index[albumCacheBase];
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


	window.Cache = Cache;
	window.Album = Album;
	window.Subalbum = Subalbum;
	window.SingleMedia = SingleMedia;
	window.Media = Media;
	window.ImagesAndVideos = ImagesAndVideos;
	window.IncludedFiles = IncludedFiles;
	window.NumsProtected = NumsProtected;
	window.Sizes = Sizes;
	window.PositionAndMedia = PositionAndMedia;
	window.PositionsAndMedia = PositionsAndMedia;
}());
