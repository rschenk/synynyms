var request = require('request'),
    fakeweb = require('node-fakeweb'),
         fs = require('fs'),
       vows = require('vows'),
     assert = require('assert'),
       eyes = require('eyes'),
        eol = require('../libs/eol');

fakeweb.allowNetConnect = false;
stubUri('http://eol.org/api/pages/1.0/326924.json?common_names=0&details=0&images=0&videos=0&text=0', '326924.json');
stubUri('http://eol.org/api/hierarchy_entries/1.0/29148136.json', '29148136.json');
stubUri('http://eol.org/api/hierarchy_entries/1.0/34291387.json', '34291387.json');
stubUri('http://eol.org/api/hierarchy_entries/1.0/36788824.json', '36788824.json');
stubUri('http://gni.globalnames.org/parsers.json?names=Cavia%20porcellus%20(Linnaeus%2C%201758)','gni_Cavia%20porcellus%20(Linnaeus%2C%201758).json');
stubUri('http://gni.globalnames.org/parsers.json?names=Cavia%20aperea%20porcellus%7CCavia%20cobaya', 'gni_Cavia%20aperea%20porcellus%7CCavia%20cobaya.json')

stubUri('http://eol.org/api/search/1.0/sharks.json', 'sharks.json');

vows.describe('eol').addBatch({
  'synonymsFor': {
    'end': {
      topic: function(){
        var search = eol.synonymsFor(326924);
        search.on("end", this.callback);
        search.init();
      },
      
      'returns an array of the names found': function(names, wtfvows){
        assert.length(names, 3);
      }
    },
    
    'name':{
      topic: function() {
        var search = eol.synonymsFor(326924);
        search.name_count = 0;
        search.on("name", function(){this.name_count++;});
        search.on('end', this.callback);
        search.init();
      },
      
      'is called with each name found': function(names, wtf_vows){
        assert.equal(this.name_count, 3);
      }
    }
  },
  
  'speciesSearch': {
    topic:function(){
      var search = eol.speciesSearch('sharks', this.callback)
    },
    
    'it should hit the search API and limit the results to just species': function(species, wtf_vows) {
      assert.length(species, 4);
    }
  }
}).export(module);



function stubUri(uri, response_file) {
  fakeweb.registerUri({uri: uri,
                       body: fs.readFileSync('./test/fake_http_responses/' + response_file, 'utf8') });
}