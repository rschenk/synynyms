var ApplicationView = Backbone.View.extend({
  
  initialize: function(){
    _.bindAll(this, 'addTaxon');
    this.model.taxa.bind('add', this.addTaxon);
    
    this.aggregateList = $('#aggregate');
    this.taxaList = $('#taxa');
    
    this.aggregateView = new TaxonView({
      model: this.model.aggregate,
      histogramController: this.model.histogramController
    });
  },
  
  render: function() {

    this.aggregateList.append( this.aggregateView.render().el );
    
    return this;
  },
  
  addTaxon: function(taxon){
    var view = new TaxonView({
      model:taxon,
      collection: this.model.taxa,
      histogramController: this.model.histogramController // used to scale this histograms proportionally
    });
    this.taxaList.append(view.render().el);
  }
})