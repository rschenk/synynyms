// This should be a singleton 
var HistogramController = Backbone.Model.extend({
  defaults: {
    max: Number.MIN_VALUE
  },
  
  reset: function(){
    this.set({max: this.defaults.max});
  }
});