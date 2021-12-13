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

	Media.prototype.filterAgainstOneWordAndAlbumSearchedIn = function(normalizedWord) {
		var normalizedWords, normalizedTags;
		for (let indexMedia = this.length - 1; indexMedia >= 0 ; indexMedia --) {
			let ithMedia = this[indexMedia];
			if (! env.options.search_inside_words) {
				// whole word
				normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
				if (ithMedia.metadata.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithMedia.metadata.tags);
				if (
					! (
						! env.options.search_tags_only &&
						normalizedWords.includes(normalizedWord) ||
						env.options.search_tags_only &&
						ithMedia.metadata.hasOwnProperty("tags") &&
						normalizedTags.includes(normalizedWord)
					) || ! (
						! env.options.search_current_album ||
						util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
							// check whether the media is inside the current album tree
							ithMedia.foldersCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							util.isMapCacheBase(env.options.cache_base_to_search_in) &&
							env.cache.getAlbum(env.options.cache_base_to_search_in).media.some(singleMedia => singleMedia.isEqual(ithMedia.cacheBase))
						)
					)
				) {
					this.splice(indexMedia, 1);
				}
			} else {
				// inside words
				normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
				if (ithMedia.metadata.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithMedia.metadata.tags);
				if (
					(
						! env.options.search_tags_only &&
						! normalizedWords.some(element => element.includes(normalizedWord)) ||
						env.options.search_tags_only && (
							! ithMedia.metadata.hasOwnProperty("tags") ||
							! normalizedTags.some(element => element.includes(normalizedWord))
						)
					) || ! (
						! env.options.search_current_album ||
						util.isAnyRootCacheBase(env.options.cache_base_to_search_in) || (
							// check whether the media is inside the current album tree
							ithMedia.foldersCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							ithMedia.hasOwnProperty("dayAlbumCacheBase") && ithMedia.dayAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							ithMedia.hasOwnProperty("gpsAlbumCacheBase") && ithMedia.gpsAlbumCacheBase.indexOf(env.options.cache_base_to_search_in) === 0 ||
							util.isMapCacheBase(env.options.cache_base_to_search_in) &&
							env.cache.getAlbum(env.options.cache_base_to_search_in).media.some(singleMedia => singleMedia.isEqual(ithMedia))
						)
					)
				) {
					this.splice(indexMedia, 1);
				}
			}
		}
	};

	Media.prototype.filterAgainstEveryWord = function(searchWordsFromUserNormalizedAccordingToOptions, lastIndex) {
		var normalizedWords, normalizedTags;
		if (lastIndex === undefined)
			lastIndex = -1;

		for (let indexMedia = this.length - 1; indexMedia >= 0 ; indexMedia --) {
			let ithMedia = this[indexMedia];
			if (! env.options.search_inside_words) {
				// whole word
				normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
				if (ithMedia.metadata.hasOwnProperty("tags") && env.options.search_tags_only)
					normalizedTags = util.normalizeAccordingToOptions(ithMedia.metadata.tags);
				if (
					! env.options.search_tags_only &&
					searchWordsFromUserNormalizedAccordingToOptions.some((normalizedSearchWord, index) => index > lastIndex && normalizedWords.indexOf(normalizedSearchWord) === -1) ||
					env.options.search_tags_only && (
						! ithMedia.metadata.hasOwnProperty("tags") ||
						searchWordsFromUserNormalizedAccordingToOptions.some((normalizedSearchWord, index) => index > lastIndex && normalizedTags.indexOf(normalizedSearchWord) === -1)
					)
				) {
					this.splice(indexMedia, 1);
				}
			} else {
				// inside words
				for (let indexWordsLeft = lastIndex + 1; indexWordsLeft < searchWordsFromUserNormalizedAccordingToOptions.length; indexWordsLeft ++) {
					normalizedWords = util.normalizeAccordingToOptions(ithMedia.words);
					if (ithMedia.metadata.hasOwnProperty("tags") && env.options.search_tags_only)
						normalizedTags = util.normalizeAccordingToOptions(ithMedia.metadata.tags);
					if (
						! env.options.search_tags_only &&
						! normalizedWords.some(normalizedSearchWord => normalizedSearchWord.includes(searchWordsFromUserNormalizedAccordingToOptions[indexWordsLeft])) ||
						env.options.search_tags_only && (
							! ithMedia.metadata.hasOwnProperty("tags") ||
							! normalizedTags.some((normalizedSearchWord, index) => index > lastIndex && normalizedTags.indexOf(normalizedSearchWord) === -1)
						)
					) {
						this.splice(indexMedia, 1);
						break;
					}
				}
			}
		}
	};

}());
