// i typically avoid doing this sort of thing...
// but Array.prototype.last really needs to be a thing
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

const utils = {
  // from underscore
  debounce: function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
  },

  randomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },

  objectsAreEqual(objA, objB) {
    return JSON.stringify(objA) === JSON.stringify(objB);
  },

  roundToFixed(number, decimals) {
    return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }
};

if (typeof module !== 'undefined') {
  module.exports = utils;
}
