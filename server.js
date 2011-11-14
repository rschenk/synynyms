var express = require('express');
var connect = require('connect');
var jade = require('jade');
var stylus = require('stylus');
var nib = require('nib');
var _   = require('underscore');
var eol = require('./libs/eol');
var bhl = require('./libs/bhl');

var app = express.createServer();
var io  = require('socket.io').listen(app);



// FOR TESTING ONLY
/* var fakeweb = require('node-fakeweb');
var fs = require('fs');
function stubUri(uri, response_file) {
  response_file = response_file || unescape(_(uri.split('/')).last());
  
  fakeweb.registerUri({
    uri: uri,
    body: fs.readFileSync('./test/fake_http_responses/' + response_file, 'utf8') 
  });
}
stubUri("http://eol.org/api/pages/1.0/795869.json?common_names=0&details=0&images=0&videos=0&text=0");
stubUri("http://gni.globalnames.org/parsers.json?names=Anolis%20carolinensis%20Voigt%2C%201832");
stubUri("http://eol.org/api/hierarchy_entries/1.0/24917138.json");
stubUri("http://eol.org/api/hierarchy_entries/1.0/29138121.json");
stubUri("http://eol.org/api/hierarchy_entries/1.0/34308252.json");
stubUri("http://eol.org/api/hierarchy_entries/1.0/36759263.json");
stubUri("http://gni.globalnames.org/parsers.json?names=Anolis%20bullaris%20DAUDIN%201802%7CAnolis%20principalis%20GRAY%201845%7CDactyloa%20(Ctenocercus)%20carolinensis%20FITZINGER%201843%7CLacerta%20principalis%20LINNAEUS%201758");
stubUri("http://www.biodiversitylibrary.org/Services/NameListDownloadService.ashx?type=c&name=Anolis%20carolinensis");
stubUri("http://www.biodiversitylibrary.org/Services/NameListDownloadService.ashx?type=c&name=Anolis%20bullaris");
stubUri("http://www.biodiversitylibrary.org/Services/NameListDownloadService.ashx?type=c&name=Anolis%20principalis");
stubUri("http://www.biodiversitylibrary.org/Services/NameListDownloadService.ashx?type=c&name=Dactyloa%20carolinensis");
stubUri("http://www.biodiversitylibrary.org/Services/NameListDownloadService.ashx?type=c&name=Lacerta%20principalis");
*/

app.configure(function(){
  app.set('view engine', 'jade');
  app.set('views', __dirname + '/views');
  

  app.use(stylus.middleware({
    force: true,
    src: __dirname,
    dest: __dirname + '/public',
    compile: compile
  }));
  
  app.use(express.logger());
  app.use(app.router);
  app.use(require('connect-assets')());
});

app.configure('development', function(){
  app.use(connect.static(__dirname + '/public'));
  app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
  app.set('port', 3000);
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
  app.set('port', 80);
});

io.configure('production', function(){
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
  io.set('transports', [                     // enable all transports (optional if you want flashsocket)
      'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
});

app.get('/', function(req, res){
  res.render('index', {title: 'Visualize Taxononmic Synonyms'});
});

app.get('/about', function(req, res){
  res.render('about', {title: 'About'});
});

app.get('/taxon/:id', function(req,res){
  eol.page(req.params.id, function(err, page){
    if(err){
      res.render('taxon-error', {status: 502, message: 'Bad Gateway', title: "Problem Connecting to EoL"});
    } else {
      if( page.image ) {
        page.image = page.image.replace('_medium', '_580_360'); // do a litle hack to get a bigger image from EOL
      } else {
        page.image = 'http://eol.org/images/v2/img_taxon-placeholder.png';
      }
      res.render('taxon', {page: page, title: page.scientificName});
    }
  });
});

app.get('/search', function(req, res) {
  if(req.query.q === parseInt(req.query.q).toString()) {
    res.redirect('/taxon/' + req.query.q);
    return;
  }
  
   eol.speciesSearch(req.query.q, function(species){
     if(species.length === 1) {
       res.redirect('/taxon/' + species[0].id)
     } else {
       res.render('search', {
         query: req.query.q,
         results: species,
         title: req.query.q
       });
     }
   });
});

app.error(function(err,req,res){
  res.render('500.jade', { status:500, title:"Uh Oh", error:err });
});

app.listen(app.settings.port || 3000);
console.log("Express server listening on port " + app.address().port);

io.set('log level', 2);
io.sockets.on('connection',function(socket) {
  socket.on('searchFor', function(taxa_id) {
    console.log("searching for " + taxa_id);
    var taxa = {};
    
    // periodically send out delta updates
    var interval = setInterval( function(){
      var unfinished_taxa = _(taxa).reject(function(taxon){
        return taxon.done || taxon.years.length === 0
      });
      
      if(unfinished_taxa.length === 0 ) return; 
      
      socket.emit('chunk', unfinished_taxa);
      
      _(unfinished_taxa).each(function(taxon){ taxon.years = [] });
    }, 100);
    
    eol.synonymsFor(taxa_id, function(res) {
      res.on('name', function onSynonymName(name){
        socket.emit('name', name);

        taxa[name] = {name: name, done: false, years:[]};
        
        bhl.namesList(name, function(bhl) {
        
          bhl.on('data', function onBhlData(year){
            taxa[name].years.push(year);
          });
          
          bhl.on('end', function onBhlEnd() {     
            socket.emit('done', {name:name, years: taxa[name].years});
            taxa[name].done = true;
            
            if(_(taxa).all(function(t){ return t.done })) {
              clearInterval(interval);
            }
          });
        });
      });
      
      res.on('end', function onSynonymEnd(name_list) {
        socket.emit('names', name_list);
      });
    });
  });
});

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib());
}