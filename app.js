
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , taxa = require('./routes/taxa')
  , http = require('http')
  , path = require('path')
  , stylus = require('stylus')
  , socketIO = require('socket.io')
  , _ = require('underscore')
  , eol = require('./libs/eol')
  , bhl = require('./libs/bhl');



var app = express(),
    server = http.createServer(app),
    io = socketIO.listen(server);
    
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(require('connect-assets')());
});

app.configure('development', function(){
  app.use(express.errorHandler());
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

app.get('/', routes.index);
app.get('/taxon/:id', taxa.show);
app.get('/search', taxa.search);
app.get('/about', function(req, res){
  res.render('about', { title: 'About Synynyms' });
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});



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
