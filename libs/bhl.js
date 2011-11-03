var EventEmitter = require('events').EventEmitter,
            http = require('http'),
             URL = require('url'),
     querystring = require('querystring'),
             csv = require('csv');

// Emits two events
// 'data' with the publication year of each work found
// 'end' when done
module.exports = {
	namesList: function(name, callback) {
		var n = new NamesList(name);
		callback(n);
		n.init();
		return n;
	}
}

function NamesList(name) {
	this.name = name;
	this.dedup = {}; // this is used to prevent us from counting multiple pages from the same publication as individual hits
}
NamesList.prototype.__proto__ = EventEmitter.prototype;

// 123go!!!
NamesList.prototype.init = function() {
	var self = this,
	    options = {
			host: 'www.biodiversitylibrary.org',
			path: '/Services/NameListDownloadService.ashx?' + querystring.stringify({type: 'c', name: this.name}),
			method: 'GET'
		};
	
	var req = http.request(options, function(res){
		csv()
		.fromStream(res, {columns:true})
		.transform(function(data,index){
			var date = self.extractRecordDate(data),
			    token = data['Title'] + date;
			
			if(!self.dedup[token]) {
				self.dedup[token] = true;
				return date
			}
		})
		.on('data', function(data,index){
		  self.emit('data', data);
		 })
		.on('end',  function(count){ self.emit('end'); });
	});
	req.on('error', function(e){
		console.error('ERROR with request: http://'+options.host + options.path + "\n" + e.message);
	});
	req.end();
	// console.log("REQUESTING: http://"+options.host + options.path);
	
};

// Takes a row object from CSV and returns the date. 
// If it's a non-serial, then it grabs the Date column of the csv data
// If it is a serial, then it tries to find a date in the Volume column,
// and falls back on the Date column
NamesList.prototype.extractRecordDate = function(csv_row) {
	var date = this.findDate( csv_row['Date'] );
	
	if( csv_row['Type'] && csv_row['Type'].toLowerCase() === 'serial' ) {
		var volume_date = this.findDate( csv_row['Volume'] );
		return volume_date || date;
	} else {
		return date;
	}
};

// Attempts to scrape a four-digit year out of an arbitrary string.
NamesList.prototype.findDate = function(str) {
	if(typeof str === 'string') {
		var match = str.match(/\d\d\d\d/);
		return match && +match[0];
	}
};