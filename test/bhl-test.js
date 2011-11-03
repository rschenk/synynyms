var request = require('request'),
    fakeweb = require('node-fakeweb'),
         fs = require('fs'),
     assert = require('assert'),
       eyes = require('eyes'),
        bhl = require('../libs/bhl');
        
fakeweb.allowNetConnect = false;

stubUri('http://www.biodiversitylibrary.org/Services/NameListDownloadService.ashx?type=c&name=Cavia%20porcellus', 'names.csv');

stubUri('http://www.biodiversitylibrary.org/Services/NameListDownloadService.ashx?type=c&name=Some%20duplicate%20years', 'names-with-dupes.csv');


/*
 * data event should emit the publication year of every unique work
 */
var yearCounts = {}
bhl.namesList("Some duplicate years", function(names){
  names.on('data', function onNamesData(year){
    if(! yearCounts[year] ) {
      yearCounts[year] = 1;
    } else {
      yearCounts[year]++;
    }
  });
  
  names.on("end", function onNamesEnd(){
    assert.equal(yearCounts[1917], 1);
    assert.equal(yearCounts[1872], 1);
  });
});


/*
 * end event should not emit any arguments
 */
bhl.namesList("Cavia porcellus", function(names){
  names.on("end", function onNamesEnd(){
    assert.equal(arguments.length, 0, "names.end passed in arguments");
  });
});





function stubUri(uri, response_file) {
  fakeweb.registerUri({
    uri: uri,
    body: fs.readFileSync('./test/fake_http_responses/' + response_file, 'utf8') 
  });
}
