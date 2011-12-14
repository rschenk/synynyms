// The Taxon model stores the name, id, state, and most importantly, the 
// year-counts data as a histogram.

var Taxon = Backbone.Model.extend({
  initialize: function(spec){
    if(!spec || !spec.name) {
      throw "InvalidConstructArgs";
    }
    
    if(!spec.years) spec.years = [];
    
    this.set({
      histogram: new NumericHistogram(spec.years, 1),
      id: spec.name,
      htmlId: 'taxon_' + this.cid,
      done: false
    });
  },
  
  push: function(years, options){
    options = options || {};
    this.get('histogram').push(years);
    years = null; // Try to encourage garbage collection
    
    if(!options.silent)
      this.trigger('change:histogram');
  }
});