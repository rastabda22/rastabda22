(function() {

	var util = new Utilities();

	Subalbums.prototype.intersectionForSearches = function(other) {
		util.mediaOrSubalbumsIntersectionForSearches(this, other);
	};

	Subalbums.prototype.unionForSearches = function(other) {
		util.mediaOrSubalbumsUnionForSearches(this, other);
	};

	SingleMediaInPositions.prototype.isEqual = function(otherMedia) {
		return this.foldersCacheBase === otherMedia.foldersCacheBase && this.cacheBase === otherMedia.cacheBase;
	};

	PositionAndMedia.prototype.matchPosition = function(positionAndMedia2) {
		return (JSON.stringify([this.lat, this.lng]) === JSON.stringify([positionAndMedia2.lat, positionAndMedia2.lng]));
	};

	NumsProtected.prototype.sum = function(numsProtectedSize2) {
		var keys = util.arrayUnion(Object.keys(this), Object.keys(numsProtectedSize2));
		for (var i = 0; i < keys.length; i++) {
			if (this[keys[i]] !== undefined && numsProtectedSize2[keys[i]] !== undefined) {
				this[keys[i]] = new ImagesAndVideos(
					{
						images: this[keys[i]].images + numsProtectedSize2[keys[i]].images,
						videos: this[keys[i]].videos + numsProtectedSize2[keys[i]].videos
					}
				);
			} else if (this[keys[i]] === undefined) {
				this[keys[i]] = numsProtectedSize2[keys[i]];
			}
		}
	};

	NumsProtected.prototype.subtract = function(numsProtectedSize2) {
		var keys = util.arrayUnion(Object.keys(this), Object.keys(numsProtectedSize2));
		for (var i = 0; i < keys.length; i++) {
			if (this[keys[i]] !== undefined && numsProtectedSize2[keys[i]] !== undefined) {
				this[keys[i]] = new ImagesAndVideos(
					{
						images: this[keys[i]].images - numsProtectedSize2[keys[i]].images,
						videos: this[keys[i]].videos - numsProtectedSize2[keys[i]].videos
					}
				);
			} else if (this[keys[i]] === undefined) {
				// execution shouldn't arrive here
				console.trace();
			}
		}
	};

	NumsProtected.prototype.sumUpNumsProtectedMedia = function() {
		var result = new ImagesAndVideos(), codesComplexcombination;
		for (codesComplexcombination in this) {
			if (this.hasOwnProperty(codesComplexcombination) && codesComplexcombination !== ",") {
				result.sum(this[codesComplexcombination]);
			}
		}
		return result.images + result.videos;
	};

	ImagesAndVideos.prototype.imagesAndVideosTotal = function() {
		return this.images + this.videos;
	};

	ImagesAndVideos.prototype.sum = function(imagesAndVideos) {
		this.images = this.images + imagesAndVideos.images;
		this.videos = this.videos + imagesAndVideos.videos;
	};

	ImagesAndVideos.prototype.subtract = function(imagesAndVideos) {
		this.images = this.images - imagesAndVideos.images;
		this.videos = this.videos - imagesAndVideos.videos;
	};

	Sizes.prototype.sum = function(sizes2) {
		var keys = Object.keys(this);
		for (var i = 0; i < keys.length; i++)
			this[keys[i]] = new ImagesAndVideos(
				{
					images: this[keys[i]].images + sizes2[keys[i]].images,
					videos: this[keys[i]].videos + sizes2[keys[i]].videos
				}
			);
	};

	Sizes.prototype.subtract = function(sizes2) {
		var keys = Object.keys(this);
		for (var i = 0; i < keys.length; i++)
			this[keys[i]] = new ImagesAndVideos(
				{
					images: this[keys[i]].images - sizes2[keys[i]].images,
					videos: this[keys[i]].videos - sizes2[keys[i]].videos
				}
			);
	};

	Cache.prototype.putAlbum = function(album) {
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
	};

	Cache.prototype.getAlbum = function(cacheBase) {
		if (this.albums.index.hasOwnProperty(cacheBase)) {
			var cacheLevel = this.albums.index[cacheBase];
			var cachedAlbum = this.albums[cacheLevel][cacheBase];
			return cachedAlbum;
		} else
			return false;
	};

	Cache.prototype.getSingleMedia = function(singleMedia) {
		var foldersCacheBase = singleMedia.foldersCacheBase;
		var cacheBase = singleMedia.cacheBase;

		if (! this.media.hasOwnProperty(foldersCacheBase)) {
			this.media[foldersCacheBase] = {};
		}
		if (! this.media[foldersCacheBase].hasOwnProperty(cacheBase)) {
			this.media[foldersCacheBase][cacheBase] = singleMedia;
			return false;
		} else {
			return this.media[foldersCacheBase][cacheBase];
		}
	};

	Cache.prototype.getMedia = function(foldersCacheBase, cacheBase) {
		return this.media[foldersCacheBase][cacheBase];
	};
}());
