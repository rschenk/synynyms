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
  
  onName: function(name){
    this.model.taxa.add({name:name}); 
  },
  
  onChunk: function(data) {    
    _(data).each(function(d){
      this.model.aggregate.push(d.years);
      
      var taxon = this.model.taxa.get(d.name);
      taxon.push(d.years);
    }, this);
    
    this.model.histogramController.trigger('change:max');
  },
  
  onDone: function(data){    
	  var taxon = this.model.taxa.get(data.name);
    this.model.aggregate.push(data.years);
    taxon.push(data.years);
    taxon.set({done: true});
    
    if( this.model.taxa.all(function(m) { return m.get('done'); }) ) {
      this.model.aggregate.set({done:true});
      this.model.histogramController.trigger('change:max');
    }
    
	}
};