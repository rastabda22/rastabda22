(function() {

	var util = new Utilities();

	Media.prototype.getAndPutIntoCache = function() {
		this.forEach(
			function(singleMedia, index, media) {
				var singleMediaFromCache = env.cache.getSingleMedia(singleMedia);
				if (singleMediaFromCache !== false) {
					media[index] = singleMediaFromCache;
				}
			}
		);
	};

	Media.prototype.removeUnnecessaryPropertiesAndAddParent = function(album) {
		var unnecessaryProperties = ['checksum', 'dateTimeDir', 'dateTimeFile'];
		// remove unnecessary properties from each media
		for (let i = this.length - 1; i >= 0; i --) {
			for (let j = 0; j < unnecessaryProperties.length; j ++) {
				if (this[i].hasOwnProperty(unnecessaryProperties[j]))
					delete this[i][unnecessaryProperties[j]];
			}

			this[i].addParent(album);
		}
	};

	Media.prototype.intersectionForSearches = function(other) {
		util.mediaOrSubalbumsIntersectionForSearches(this, other);
	};

	Media.prototype.unionForSearches = function(other) {
		util.mediaOrSubalbumsUnionForSearches(this, other);
	};

	Media.prototype.sortBy = function(fieldArray) {
		util.sortBy(this, fieldArray);
	};

	Media.prototype.sortByName = function() {
		this.sortBy(['name']);
	};

	Media.prototype.sortByDate = function () {
		this.sort(
			function(a, b) {
				return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
			}
		);
	};

	Media.prototype.sortReverse = function() {
		this.reverse();
	};

	Media.prototype.imagesAndVideosCount = function() {
		var result = new ImagesAndVideos();
		for (let i = 0; i < this.length; i ++) {
			if (this[i].isImage())
				result.images += 1;
			else if (this[i].isVideo())
				result.videos += 1;
		}
		return result;
	};

}());
