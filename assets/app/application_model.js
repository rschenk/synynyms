var ApplicationModel = Backbone.Model.extend({
  initialize: function(){
    this.taxa = new TaxonCollection();                    // List of all the synonyms for the species in question
    this.aggregate = new Taxon({name: "All Names"});      // An aggregate of all the names
    this.histogramController = new HistogramController(); // Used for scaling and redrawing the plots in the view
  }
});