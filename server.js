var util = require('util');
var express = require('express');
var connect = require('connect');
var jade = require('jade');
var stylus = require('stylus');
var nib = require('nib');
var _   = require('underscore');
var eol = require('./libs/eol');
var bhl = require('./libs/bhl');



var app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

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
  app.use(function(err, req, res, next){
    // if an error occurs Connect will pass it down
    // through these "error-handling" middleware
    // allowing you to respond however you like
    util.puts(err.stack);
    res.statusCode=500;
    res.render('500.jade', { title:"Uh Oh", error:err });
  })
  
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
        // do a litle hack to get a bigger image from EOL
        page.image = page.image.split('_')[0] + '_580_360.jpg';
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


server.listen(app.settings.port || 3000);
console.log("Express server listening on " + util.inspect(server.address()));


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