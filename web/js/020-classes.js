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
				this.subalbums = [];
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
				for (let iSubalbum = 0; iSubalbum < this.subalbums.length; iSubalbum ++) {
					this.subalbums[iSubalbum].numsMediaInSubTree = new ImagesAndVideos(this.subalbums[iSubalbum].numsMediaInSubTree);
					this.subalbums[iSubalbum].numsProtectedMediaInSubTree = new NumsProtected(this.subalbums[iSubalbum].numsProtectedMediaInSubTree);
					this.subalbums[iSubalbum].sizesOfAlbum = new Sizes(this.subalbums[iSubalbum].sizesOfAlbum);
					this.subalbums[iSubalbum].sizesOfSubTree = new Sizes(this.subalbums[iSubalbum].sizesOfSubTree);
				}

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
	}

	class Cache {
		constructor() {
			this.js_cache_levels = [
				{"mediaThreshold": 10000, "max": 1},
				{"mediaThreshold": 2000, "max": 2},
				{"mediaThreshold": 500, "max": 10},
				{"mediaThreshold": 200, "max": 50}
			];
			this.cache = {};
			this.cache.albums = {};
			this.cache.albums.index = {};
		}

		putAlbum(album) {
			var done = false, level, cacheLevelsLength = this.js_cache_levels.length, firstKey;
			var albumCacheBase = album.cacheBase;
			// check if the album is already in cache (it could be there with another media number)
			// if it is there, remove it
			if (this.cache.albums.index.hasOwnProperty(albumCacheBase)) {
				level = this.cache.albums.index[albumCacheBase];
				delete this.cache.albums[level][albumCacheBase];
				delete this.cache.albums[level].queue[albumCacheBase];
				delete this.cache.albums.index[albumCacheBase];
			}

			if (album.hasOwnProperty("media")) {
				for (level = 0; level < cacheLevelsLength; level ++) {
					if (album.numsMedia.imagesAndVideosTotal() >= this.js_cache_levels[level].mediaThreshold) {
						if (! this.cache.albums.hasOwnProperty(level)) {
							this.cache.albums[level] = [];
							this.cache.albums[level].queue = [];
						}
						if (this.cache.albums[level].queue.length >= this.js_cache_levels[level].max) {
							// remove the first element
							firstKey = this.cache.albums[level].queue[0];
							this.cache.albums[level].queue.shift();
							delete this.cache.albums.index[firstKey];
							delete this.cache.albums[level][firstKey];
						}
						this.cache.albums.index[albumCacheBase] = level;
						this.cache.albums[level].queue.push(albumCacheBase);
						this.cache.albums[level][albumCacheBase] = album;
						done = true;
						break;
					}
				}
			}
			if (! done) {
				if (! this.cache.albums.hasOwnProperty(cacheLevelsLength)) {
					this.cache.albums[cacheLevelsLength] = [];
					this.cache.albums[cacheLevelsLength].queue = [];
				}
				this.cache.albums.index[albumCacheBase] = cacheLevelsLength;
				this.cache.albums[cacheLevelsLength].queue.push(albumCacheBase);
				this.cache.albums[cacheLevelsLength][albumCacheBase] = album;
			}
		}

		getAlbum(albumCacheBase) {
			if (this.cache.albums.index.hasOwnProperty(albumCacheBase)) {
				var cacheLevel = this.cache.albums.index[albumCacheBase];
				var cachedAlbum = this.cache.albums[cacheLevel][albumCacheBase];
				return cachedAlbum;
			} else
				return false;
		}

		// WARNING: unused method
		removeAlbumFromCache(albumCacheBase) {
			if (this.cache.albums.index.hasOwnProperty(albumCacheBase)) {
				var level = this.cache.albums.index[albumCacheBase];
				var queueIndex = this.cache.albums[level].queue.indexOf(albumCacheBase);
				this.cache.albums[level].queue.splice(queueIndex, 1);
				delete this.cache.albums[level][albumCacheBase];
				delete this.cache.albums.index[albumCacheBase];
				return true;
			} else
				return false;
		};

	}


	window.Cache = Cache;
	window.Album = Album;
	window.SingleMedia = SingleMedia;
	window.Media = Media;
	window.ImagesAndVideos = ImagesAndVideos;
	window.IncludedFiles = IncludedFiles;
	window.NumsProtected = NumsProtected;
	window.Sizes = Sizes;
	window.PositionAndMedia = PositionAndMedia;
	window.PositionsAndMedia = PositionsAndMedia;
}());
