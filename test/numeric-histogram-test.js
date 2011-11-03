var vows = require('vows');
var assert = require('assert');
var NumericHistogram = require('../libs/numeric_histogram');

vows.describe('NumericHistogram').addBatch({
  'A NumericHistogram' :{
    'with no elements': {
      topic: new NumericHistogram(),
      
      'should have a length of 0': function(topic) {
        assert.equal(topic.length, 0);
      },
      
      'can push single items': function(topic){
        topic.push(1);
        assert.equal(topic.get(1), 1);
      },
      
      'can push multiple items': function(topic){
        topic.push([2,3,3]);
        assert.equal(topic.get(2), 1);
        assert.equal(topic.get(3), 2);
      }
    },
    
    'with some elements':{
      topic: new NumericHistogram([1,1,1,2,2,4,6]),
      
      'has buckets for each key that we have set': function(topic) {
        assert.equal(topic.get(1), 3);
        assert.equal(topic.get(2), 2);
        assert.equal(topic.get(4), 1);
        assert.equal(topic.get(6), 1);
      },
      
      "returns 0 if asked for a key that we don't know about": function(topic) {
        assert.equal(topic.get(3), 0);
        assert.equal(topic.get(5), 0);
      },
      
      'keeps track of the min and max stats': function(topic) {
        assert.equal(topic.minBucket, 1);
        assert.equal(topic.maxBucket, 6);
        assert.equal(topic.maxValue,  3);
      },
      
      'has a length of maxBucket-minBucket/bucketSize + 1': function(topic) {
        assert.equal(topic.length, 6)
      },
      
      'iterating through the buckets': {
        topic: function(histogram) {
          var k_v = {}
          histogram.each(function(value, key){ k_v[key] = value; });
          return k_v;
        },
        
        "should iterate from minBucket to maxBucket":function(topic) {
          assert.deepEqual(topic,{
            1: 3,
            2: 2,
            3: 0,
            4: 1,
            5: 0,
            6: 1
          });
        }
      },
      
      'converts itself to an object ready for JSON stringification': function(topic) {
        assert.deepEqual(topic.toJSON(), {
          1: 3,
          2: 2,
          3: 0,
          4: 1,
          5: 0,
          6: 1
        })
      },
      
      'when rebucket()ed into a larger bucketSize': {
        topic: function(histogram) {
          return histogram.rebucket(5);
        },
        
        'should have the right buckets' : function(topic) {
          assert.equal(topic.get(0), 6);
          assert.equal(topic.get(5), 1);
        },
        
        'should have the right stats' : function(topic) {
          assert.equal(topic.minBucket, 0);
          assert.equal(topic.maxBucket, 5);
          assert.equal(topic.maxValue,  6);
        },
        
        'should have the right JSON': function(topic){
          assert.deepEqual(topic.toJSON(), { 0:6, 5:1 });
        }
      }
    },
    
    'with an interesting bucketSize': {
      topic: new NumericHistogram([1990,1991,1995,1996,1997,1998,1999], 5),
      
      'assigns values to their respective buckets': function(topic){
        assert.equal(topic.get(1990), 2);
        assert.equal(topic.get(1995), 5);
      },
      
      'respects the bucket size in the statistics': function(topic){
        assert.equal(topic.minBucket, 1990);
        assert.equal(topic.maxBucket, 1995);
      },
      
      'has a length of maxBucket-minBucket/bucketSize + 1': function(topic) {
        assert.equal(topic.length, 2)
      },
      
      'complains if you try to get() an invalid bucket': function(topic){
        assert.throws(function () { topic.get(1991); }, Error);
      },
      
      'iterating through the buckets': {
        topic: function(histogram) {
          var k_v = {}
          histogram.each(function(value, key){ k_v[key] = value; });
          return k_v;
        },
        
        "should iterate from minBucket to maxBucket":function(topic) {
          assert.deepEqual(topic,{
            1990: 2,
            1995: 5
          });
        }
      },
      
      'when rebucket()ed into a smaller bucketSize, should Error': function(topic) {
        assert.throws(function(){ topic.rebucket(1) }, Error);
      }
    }
  }
}).export(module);