var eol = require('../libs/eol');


exports.show = function(req,res){
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
};

exports.search = function(req, res) {
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
};