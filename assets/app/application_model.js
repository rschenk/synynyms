var ApplicationModel = Backbone.Model.extend({
  initialize: function(){
    this.taxa = new TaxonCollection();
    this.histogramController = new HistogramController();
    this.aggregate = new Taxon({name: "All Names"});
  }
});