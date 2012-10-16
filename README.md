synynyms
========

This is a data visualization app that I wrote for the Life and Literature Code Challenge. It's my first node.js app, and my first Backbone.js app. Look out! 

The server lives in server.js, and includes libraries that I wrote from /libs. The Backbone app lives in /assets/app. Tests are in /test.

Caveat: We have a bit of an inconvenience, as this app was written for Node 0.4, and that is what my hosting http://no.de services uses, even though 0.6 is the new hotness. 

Installation
------------
- Install node.js `brew install node`
- Install npm `curl http://npmjs.org/install.sh | sh`
- Clone synynyms `git clone git@github.com:rschenk/synynyms.git; cd synynyms`
- Install dependencies `npm install .`
- Run it! `node app`

By default it will listen on port 3000

You can run it with `NODE_ENV=production node server.js` which will cause it to run on port 80, enable asset compression, caching, etc.