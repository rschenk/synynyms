var ApplicationController = {
  init: function(socket){
    this.socket = socket;
    this.model = new ApplicationModel();
    this.view = new ApplicationView({model: this.model});
    
    _.bindAll(this, 'onName', 'onChunk', 'onDone');
    this.socket.on('name', this.onName);
    this.socket.on('chunk', this.onChunk);
  	this.socket.on('done', this.onDone);
    
    this.chunkCount = 0;
    
    return this;
  },
  
  // This message arrives when a new name synonym is comes from EoL
  onName: function(name){
    this.model.taxa.add({name:name}); 
  },
  
  // Delta updates of years as they stream in from BHL 
  // This message contains an array of {name: n, years: []} objects
  // The name is used as a key, and the years array is a delta update
  // of the publication years that have streamed in since the last onChunk
  onChunk: function(data) {    
    _(data).each(function(d){
      // All years for every name get pushed into the aggregate histogram
      this.model.aggregate.push(d.years);
      
      var taxon = this.model.taxa.get(d.name);
      taxon.push(d.years);
    }, this);
    
    // Explicitly trigger an event to rescale all the graph views.
    // We do this explicitly for performance reasons.
    this.model.histogramController.trigger('change:max');
  },
  
  // All data has arrived from BHL for a particular name
  // This message includes the last delta update, with a 
  // message format the same as onChunk: {name: n, years: []}
  onDone: function(data){    
	  var taxon = this.model.taxa.get(data.name);
    this.model.aggregate.push(data.years);
    taxon.push(data.years);
    taxon.set({done: true});
    
    if( this.model.taxa.all(function(m) { return m.get('done'); }) ) {
      this.model.aggregate.set({done:true});
      this.model.histogramController.trigger('change:max'); // trigger one final redraw
    }
    
	}
};