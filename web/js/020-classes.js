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


	class Media {
		constructor(object) {
			Object.keys(object).forEach(
				(key) => {
					this[key] = object[key];
				}
			);
			this.fileSizes = new Sizes(this.fileSizes);
		}
	}


	class Album {
		constructor(objectOrCacheBase) {
			if (typeof objectOrCacheBase === "string") {
				this.cacheBase = objectOrCacheBase;
				this.media = [];
				this.numsMedia = new ImagesAndVideos();
				this.numsMediaInSubTree = new ImagesAndVideos();
				this.sizesOfAlbum = new Sizes();
				this.sizesOfSubTree = new Sizes();
				this.subalbums = [];
				this.positionsAndMediaInTree = [];
				this.numPositionsInTree = 0;
				this.numsProtectedMediaInSubTree = new NumsProtected();
				this.ancestorsCacheBase = [objectOrCacheBase];
				this.path = objectOrCacheBase.replace(Options.cache_folder_separator, "/");
				this.physicalPath = this.path;
				this.empty = false;
				if (Utilities.isMapCacheBase(objectOrCacheBase)) {
					this.clickHistory = [];
				}
			} else if (typeof objectOrCacheBase === "object") {
				Object.keys(objectOrCacheBase).forEach(
					(key) => {
						this[key] = objectOrCacheBase[key];
					}
				);
				if (this.hasOwnProperty("media")) {
					for (let iMedia = 0; iMedia < this.media.length; iMedia ++)
						this.media[iMedia] = new Media(this.media[iMedia]);
					this.numsMedia = Utilities.imagesAndVideosCount(this.media);
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

			}
			if (objectOrCacheBase !== undefined) {
				if (! this.hasOwnProperty("includedFilesByCodesSimpleCombination")) {
					this.includedFilesByCodesSimpleCombination = new IncludedFiles({",": false});
				}
				if (this.codesComplexCombination === undefined)
					PhotoFloat.putAlbumIntoCache(this.cacheBase, this);
			}
		}
	}

	window.Album = Album;
	window.Media = Media;
	window.ImagesAndVideos = ImagesAndVideos;
	window.IncludedFiles = IncludedFiles;
	window.NumsProtected = NumsProtected;
	window.Sizes = Sizes;
}());
