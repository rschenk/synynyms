var EventEmitter = require('events').EventEmitter,
         request = require('request'),
     querystring = require('querystring'),
              _ = require('underscore');

//var eyes = require('eyes');

// Emits two events
// 'name' with each new name found
// 'end' when done, with the entire list of names

module.exports = {
	synonymsFor: function(taxon_id, callback) {
		var s = new SynonymSearch(taxon_id);
		if(callback) {
      callback(s);
      s.init();
    } else {
		  return s;
		}
	},
	
	speciesSearch: function(speciesName, callback) {
	  var search = new SpeciesSearch(speciesName, callback);
	},
	
	page: function(taxonId, callback) {
	  var page = new Page(taxonId, callback);
	}
}

function SynonymSearch(taxon_id) {
	this.taxon_id = taxon_id;
	this.names = [];
	this.outstanding_requests = 0;
}
SynonymSearch.prototype.__proto__ = EventEmitter.prototype;

// Sends the initial request to the EoL API, and sends the response to parsePageResponse
SynonymSearch.prototype.init = function() {
	var self = this,
	     url = 'http://eol.org/api/pages/1.0/'+this.taxon_id+'.json?common_names=0&details=0&images=0&videos=0&text=0';

	// console.log("FETCHING page for " + this.taxon_id);

	// console.log("REQUESTING " + url);
	self.incrementRequests();
	request.get( {url: url}, function(error, response, body) {
		if (!error && response.statusCode == 200) {
	      	self.findHierarchies( JSON.parse(body) );
	    } else {
			console.error('ERROR fetching ' + url + ': '+ response.statusCode);
			console.error(body);
		}
		self.decrementRequests();
	});
};

SynonymSearch.prototype.incrementRequests = function(){
	this.outstanding_requests++;
};

SynonymSearch.prototype.decrementRequests = function() {
	if( --this.outstanding_requests == 0 ) {
		this.emit('end', this.names);
	}
};

// This function gets called with each name found by the GNI name parser,
// from parseHierarchyResponse. It acts as a deduplicator, first checking
// to see if we've already found the current name; if not, it adds it to
// the list, and emits a 'name' event with the new name.
SynonymSearch.prototype.foundName = function(name) {
	if( !_.include(this.names, name) ) {
		// Hooray! We found a new name
		// // console.log("FOUND: " + name);
		this.names.push(name);
		this.emit('name', name);
	}
};

// Looks through the response from the Page API for hierarchies.
// For each hierarchy found, it sends out a Hierarchy API call
SynonymSearch.prototype.findHierarchies = function(page){
	var self = this;
	
	// console.log("FOUND " + page.taxonConcepts.length + " taxon concepts, requesting them...")
	
	this.fetchCannonicalName(page.scientificName);

	_.each(page.taxonConcepts, function(taxon_concept){	
		var url = 'http://eol.org/api/hierarchy_entries/1.0/'+taxon_concept.identifier+'.json';
		
		// Fetch the hierarchy, and look for snynonymns in it
		// console.log('REQUESTING: ' + url);
		self.incrementRequests();
		request.get( {url:url}, function(error, response, body) {
			if (!error && response.statusCode == 200) {
		      	self.findSynonyms( JSON.parse(body) );
		    } else {
				console.error('ERROR fetching '+ url + ': ' + response.statusCode);
				console.error(body);
			}
			self.decrementRequests();
		});
	});
};

// Looks through the response from the Hierarchy API for synonyms.
// For each synonym found, it sends out a call to the GNI name parsing service
SynonymSearch.prototype.findSynonyms = function(hierarchy){
	var synonyms = _(hierarchy.synonyms).chain()
	                   .map(function(synonym) {
	                     // default a blank taxonomicStatus to a synonym, per Patrick's advice
                        if(synonym.taxonomicStatus === undefined || synonym.taxonomicStatus.toLowerCase() === 'synonym') 
                           return synonym.scientificName;
	                   })
	                   .compact()
	                   .value();
	if(synonyms.length > 0)
		this.fetchCannonicalName(synonyms);	
};

// Hits the GNI API with a scientific name, and fetches the cannonical names
// Multiple names can be fetched by passing an array
SynonymSearch.prototype.fetchCannonicalName = function(name) {
	if( _.isArray(name) ) name = name.join('|');
	var self = this,
	     url = 'http://gni.globalnames.org/parsers.json?' + querystring.stringify({names: name});
	
	// console.log('REQUESTING: ' + url);
	self.incrementRequests();
	request.get( {url:url}, function(error, response, body) {
		if (!error && response.statusCode == 200) {
	      	var results = JSON.parse(body);
			_.each(results, function(result){
				// Freaking finally
				self.foundName(result.scientificName.canonical);
			});
	  } else {
	    // TODO raise an exception
			console.error('ERROR fetching '+ url + ': ' + response.statusCode);
			console.error(body);
			throw(error);
		}
		self.decrementRequests();
	});
};


SpeciesSearch = function(query, callback) {
  this.query = query;
  this.callback = callback;
  
  this.searchFor(query);
  
  return this;
}

SpeciesSearch.prototype = {
  searchUrlBase:  'http://eol.org/api/search/1.0/',
  pageUrlBase:    'http://eol.org/api/pages/1.0/',
  
  searchFor: function(q) {
    var self = this;
    var url = this.searchUrlBase + escape(q) + '.json';
    // console.log(url);
    
    request.get( {url:url}, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var searchResults = JSON.parse(body);
        var species = _.filter(searchResults.results, function(result){ return result.title.match(/ [a-z]/); })
        
        self.callback(species);
        
      } else {
        // TODO throw an error
        console.error('ERROR fetching '+ url + ': ' + response.statusCode);
        console.error(body);
        throw(error);
      }
    });
  }
}

Page = function(taxonId, callback) {
  this.taxonId = taxonId;
  this.callback = callback;
  
  this.retrievePage(taxonId);

  return this;
}
Page.prototype = {
  pageUrlBase: 'http://eol.org/api/pages/1.0/', // good idea to refactor all these to a central place
  dataObjectUrlBase: 'http://eol.org/api/data_objects/1.0/',
  
  // hits the pages api, then goes and fetches an image from data_objects
  retrievePage:function(taxonId) {
    var self = this;
    var url = this.pageUrlBase + taxonId + '.json?images=1&videos=0&text=0'
    
    //console.log('REQUESTING: ' + url );
    request.get({url:url}, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var page = JSON.parse(body);
        var image = _(page.dataObjects).filter(function(o){ return o.dataType === 'http://purl.org/dc/dcmitype/StillImage' })[0];
        
        if(image){
          //console.log('REQUESTING: ' + self.dataObjectUrlBase + image.identifier + '.json' );
          
          request.get({url: self.dataObjectUrlBase + image.identifier + '.json'}, function(error, response, body){
            if (!error && response.statusCode == 200) {
              var dataObject = JSON.parse(body);
              page.image = dataObject.dataObjects[0].eolThumbnailURL;
              
              return self.callback(null, page);
            } else {
              // Couldn't load image from EoL... Really not a big deal, so let's just ignore it for now.
              return self.callback(null, page);
            }
          });
        } else {
          return self.callback(null, page);
        }
        
      } else {
        // Could not load page from EoL. This is a problem.
        return self.callback("Could not load page from EoL API", null);
      }
    });
  }
}