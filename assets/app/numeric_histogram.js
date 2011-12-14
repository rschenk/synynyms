// Require Underscore, if we're on the server, and it's not already present.
//
// This file really should be symlinked
var _ = _;
if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;

var NumericHistogram = function(numberList, bucketSize) {
  this.h = {};
  this.bucketSize = bucketSize || 1;
  this.maxValue  = Number.MIN_VALUE;
	this.minBucket = Number.MAX_VALUE;
	this.maxBucket = Number.MIN_VALUE;
	this.length    = 0;
  
  if( _.isArray(numberList) ) {
    _(numberList).each( function(n){ this.push(n); }, this );
  }
};

NumericHistogram.prototype = {
  push: function(key){
    if(_.isArray(key)) {
      _(key).each(function(k){ this.push(k) }, this);
    } else {
      var value;
      key = key - (key % this.bucketSize);
    
      if(this.h[key] === undefined) {
        value = this.h[key] = 1;
      } else {
        value = ++this.h[key];
      }
  
      this._updateStats(key, value);
    }
  },
  
  get: function(key) {
    if(key % this.bucketSize > 0) {
      throw new Error(key + " is an invalid bucket! Did you mean " +
        (key - (key % this.bucketSize)) + "?");
    }
    return this.h[key] || 0;
  },
  
  each: function(iterator, context) {
    for(var b = this.minBucket; b <= this.maxBucket; b += this.bucketSize) {
      iterator.call(context, this.get(b), b);
    }
  },
  
  // Returns an object for JSON stringification
  toJSON: function(){
    var obj = {};
    this.each( function(v,k){ obj[k] = v; });
    return obj;
  },
  
  // Whoa nelly, this is pretty hacktocious
  // This functionality would be better off in a constructor that accepts a hash.
  rebucket: function(bucketSize){
    if(bucketSize < this.bucketSize) throw new Error("You can't rebucket into a smaller bucketSize");
    
    var newHisto = new NumericHistogram([], bucketSize);
    _(this.h).each(function(value, key){
      key = key - (key % bucketSize);
      newHisto.h[key] = newHisto.get(key) + value; 
      newHisto._updateStats(key, newHisto.get(key) );
    });
    
    return newHisto;
  },
  
  _updateStats: function(key, value) {
    if(key < this.minBucket) {
      this.minBucket = key;
      this.length = (this.maxBucket - this.minBucket) / this.bucketSize + 1;
    }
    if(key > this.maxBucket){
      this.maxBucket = key;
      this.length = (this.maxBucket - this.minBucket) / this.bucketSize + 1;
    }
    if(value > this.maxValue) this.maxValue = value;
  }
}

if(typeof module !== 'undefined' && module.exports) {
  module.exports = NumericHistogram;
}