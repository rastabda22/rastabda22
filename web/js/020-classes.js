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
	};

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
	};

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
	};

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
	};

	class PositionAndMedia {
		constructor(object) {
			Object.keys(object).forEach(
				(key) => {
					this[key] = object[key];
				}
			);
		}
	};

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
					this.media = new Media(this.media);;

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
					this.putAlbumIntoCache(this.cacheBase);
			}
		}

		isEmpty() {
			return this.empty !== undefined && this.empty;
		}


		putAlbumIntoCache = function(albumCacheBase) {
			if (! Options.hasOwnProperty("js_cache_levels"))
				Options.js_cache_levels = PhotoFloat.js_cache_levels;

			var done = false, level, cacheLevelsLength = Options.js_cache_levels.length, firstKey;
			// check if the album is already in cache (it could be there with another media number)
			// if it is there, remove it
			if (PhotoFloat.cache.albums.index.hasOwnProperty(albumCacheBase)) {
				level = PhotoFloat.cache.albums.index[albumCacheBase];
				delete PhotoFloat.cache.albums[level][albumCacheBase];
				delete PhotoFloat.cache.albums[level].queue[albumCacheBase];
				delete PhotoFloat.cache.albums.index[albumCacheBase];
			}

			if (this.hasOwnProperty("media")) {
				for (level = 0; level < cacheLevelsLength; level ++) {
					if (this.numsMedia.imagesAndVideosTotal() >= Options.js_cache_levels[level].mediaThreshold) {
						if (! PhotoFloat.cache.albums.hasOwnProperty(level)) {
							PhotoFloat.cache.albums[level] = [];
							PhotoFloat.cache.albums[level].queue = [];
						}
						if (PhotoFloat.cache.albums[level].queue.length >= Options.js_cache_levels[level].max) {
							// remove the first element
							firstKey = PhotoFloat.cache.albums[level].queue[0];
							PhotoFloat.cache.albums[level].queue.shift();
							delete PhotoFloat.cache.albums.index[firstKey];
							delete PhotoFloat.cache.albums[level][firstKey];
						}
						PhotoFloat.cache.albums.index[albumCacheBase] = level;
						PhotoFloat.cache.albums[level].queue.push(albumCacheBase);
						PhotoFloat.cache.albums[level][albumCacheBase] = this;
						done = true;
						break;
					}
				}
			}
			if (! done) {
				if (! PhotoFloat.cache.albums.hasOwnProperty(cacheLevelsLength)) {
					PhotoFloat.cache.albums[cacheLevelsLength] = [];
					PhotoFloat.cache.albums[cacheLevelsLength].queue = [];
				}
				PhotoFloat.cache.albums.index[albumCacheBase] = cacheLevelsLength;
				PhotoFloat.cache.albums[cacheLevelsLength].queue.push(albumCacheBase);
				PhotoFloat.cache.albums[cacheLevelsLength][albumCacheBase] = this;
			}
		}
	}

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
