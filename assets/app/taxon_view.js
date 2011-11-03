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
  

  changeHistogram: function(){
    if( this.model.get('histogram').length === 0) {
      return;
    }
    
    this.histogram = this.model.get('histogram').rebucket(5);
    if(this.histogram.maxValue > this.histogramController.get('max') ) {
      this.histogramController.set({max: this.histogram.maxValue}, {silent: true}); // This silent:true business is to try to increase performance by minimizing renders
    }
    
    this.$taxon.removeClass('noData');
  },
  
  
  path: function(numeric_histogram){
  	var dx = numeric_histogram.bucketSize / 2;
  	var path_description = 'M' + (numeric_histogram.minBucket - numeric_histogram.bucketSize + dx) +',0';

    for(var year=numeric_histogram.minBucket - numeric_histogram.bucketSize; year <= numeric_histogram.maxBucket + numeric_histogram.bucketSize; year+=numeric_histogram.bucketSize) {
     path_description += 'S' + [year, numeric_histogram.get(year), year + dx, numeric_histogram.get(year)].join(',');
    }

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