/**
* Bazaarvoice.js
*
* Used to host the Bazaarvoice Container page.
*
* @module  controllers/Bazaarvoice
*/

'use strict';

var server = require('server');

/**
* Container
*
* Simply loads the bv.js scout file on a blank page.  Used by Bazaarvoice as a review submission container for mobile
* reviews and non-mobile reviews from emails.
*
* @return {String} The string 'myFunction'
*/
server.get('Container', function (req, res, next) {
    var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

    res.render('bv/container/container', {
        bvScout: BVHelper.getBvLoaderUrl()
    });

    next();
});

module.exports = server.exports();
