(function() {

	var util = new Utilities();
	var phFl = new PhotoFloat();

	Subalbum.prototype.toSubalbum = function() {
		return (new Album(this)).toSubalbum();
	};

	Subalbum.prototype.hasGpsData = function() {
		return this.nonGeotagged.numsMediaInSubTree.imagesAndVideosTotal() === 0;
	};

	Subalbum.prototype.isEqual = function(otherSubalbum) {
		return otherSubalbum !== null && this.cacheBase === otherSubalbum.cacheBase;
	};

	Subalbum.prototype.toAlbum = function(error, {getMedia = false, getPositions = false}) {
		var self = this;
		return new Promise(
			function(resolve_convertIntoAlbum) {
				let promise;
				if (self.hasOwnProperty("numsProtectedMediaInSubTree"))
					promise = phFl.getAlbum(self.cacheBase, error, {getMedia: getMedia, getPositions: getPositions}, self.numsProtectedMediaInSubTree);
				else
					promise = phFl.getAlbum(self.cacheBase, error, {getMedia: getMedia, getPositions: getPositions});
				promise.then(
					function(convertedSubalbum) {
						let properties = [
							"randomMedia",
							"captionsForSelection",
							"captionForSelectionSorting",
							"captionsForSearch",
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
	};

	Subalbum.prototype.isFolder = function() {
		return util.isFolderCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isByDate = function() {
		return util.isByDateCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isByGps = function() {
		return util.isByGpsCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isSearch = function() {
		return util.isSearchCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isSelection = function() {
		return util.isSelectionCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isMap = function() {
		return util.isMapCacheBase(this.cacheBase);
	};

	Subalbum.prototype.isTransversal =  function() {
		return this.isByDate() || this.isByGps();
	};

	Subalbum.prototype.isGenerated =  function() {
		return this.isTransversal() || this.isCollection();
	};

	Subalbum.prototype.isSelected = function() {
		return util.albumIsSelected(this);
	};

	Subalbum.prototype.nameForShowing = function(parentAlbum, html = false, br = false) {
		return util.nameForShowing(this, parentAlbum, html, br);
	};

	Subalbum.prototype.hasProperty = function(property) {
		return util.hasProperty(this, property);
	};

	Subalbum.prototype.hasSomeDescription = function(property = null) {
		return util.hasSomeDescription(this, property);
	};

}());
