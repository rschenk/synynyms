// This takes care of rendering the Taxon model to HTML, as well as drawing the graph in The SVGs.
//
// The event handling in here is not as straightforward as it could be, because the straightfoward way of doing it
// led to horribe performance, with some redraws happening in factorial time due to the way events cascaded 
// through Backbone's data binding magic. That's less than ideal for an app that you want to update 10x / second.
//
// One thing to keep in mind is that TaxonView resamples the Taxon's histogram from 1-year buckets
// to 5-year buckets to smooth out the graphs. I did this resampling up in the View layer so that, in theory,
// different views of the same data could be swapped. For instance, replace the blobby graphs with sparklines.
var TaxonView = Backbone.View.extend({
  initialize: function(args){  
    _.bindAll(this, 'changeHistogram', 'renderHistogram', 'done');
    
    this.histogramController = args.histogramController;
    
    this.model.bind('change:histogram', this.changeHistogram);
    this.model.bind('change:done',  this.done);
    this.model.bind('remove', this.remove);
    this.histogramController.bind('change:max', this.renderHistogram);
  },
  
  render: function(){
    this.el = ich.taxon(this.model.toJSON());
    this.$taxon = this.$(".taxon");
    this.$taxon.addClass('loading').addClass('noData');
    this.graph_container = this.$('.graph').get(0);
    this.paper = Raphael( this.graph_container, 940, 88);
    this.changeHistogram();
    
    return this;
  },
  
  // Redraws the graph.
  renderHistogram:function(){
    if( !this.histogram ) { return; }    
        
    var max_value = this.histogramController.get('max');
    this.paper.clear();
    this.paper.path(this.path(this.histogram))
              .scale(
                2.9, this.paper.height/2/max_value,
                0, this.paper.height/2
              ).translate(-1700, this.paper.height/2);
    this.paper.safari();
  },
  
  // This function resample's the Taxon model's histogram from 1-year intervals to 5-year intervals.
  // 
  // It does not redraw the graph, though, that is left for renderHistogram. For performance reasons, we would 
  // like to update the view's histogram without redrawing when new data comes in, then trigger one single
  // redraw for all the graphs once they've all been updated.
  changeHistogram: function(){
    if( this.model.get('histogram').length === 0) {
      return;
    }
    
    this.histogram = this.model.get('histogram').rebucket(5);
    if(this.histogram.maxValue > this.histogramController.get('max') ) {
      // This silent:true increases performance by preventing renders from cascading in factorial time.
      this.histogramController.set({max: this.histogram.maxValue}, {silent: true}); 
    }
    
    this.$taxon.removeClass('noData');
  },
  
  // Takes a histogram, and returns an SVG bezier path descriptor for the blobby graphs.
  path: function(numeric_histogram){
  	var dx = numeric_histogram.bucketSize / 2;
  	var path_description = 'M' + (numeric_histogram.minBucket - numeric_histogram.bucketSize + dx) +',0';

    // Draw one side of the blobby graph
    for(var year=numeric_histogram.minBucket - numeric_histogram.bucketSize; year <= numeric_histogram.maxBucket + numeric_histogram.bucketSize; year+=numeric_histogram.bucketSize) {
     path_description += 'S' + [year, numeric_histogram.get(year), year + dx, numeric_histogram.get(year)].join(',');
    }
    
    // Draw the reflection
  	for(var year=numeric_histogram.maxBucket + numeric_histogram.bucketSize; year >= numeric_histogram.minBucket - numeric_histogram.bucketSize; year-=numeric_histogram.bucketSize) {
  		path_description += 'S' + [year + dx + dx, -numeric_histogram.get(year), year + dx, -numeric_histogram.get(year)].join(',');
  	}
  	path_description += 'Z';

  	return path_description;
	},
  
  done: function(){
    this.$taxon.removeClass('loading');
  }
});