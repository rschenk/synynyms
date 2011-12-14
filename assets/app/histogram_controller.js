// This really should be a singleton, but I don't know how to do that in Backbone Land
//
// This simple object is used to contain the maximum value of all of the histograms.
// We use this maximum value to scale each of the graphs relative to each other.
//
// The change:max event fired by this object is used to orchestrate the redrawing of
// the plots on the screen. Take a closer look at TaxonView for a discussion as to
// why this is necesary and how this works. It's not immediately obvious, because the
// immediately obvious solution has terrible performance.
var HistogramController = Backbone.Model.extend({
  defaults: {
    max: Number.MIN_VALUE
  },
  
  reset: function(){
    this.set({max: this.defaults.max});
  }
});