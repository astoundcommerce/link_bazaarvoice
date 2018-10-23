'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('Show', function(req, res, next) {
	var BVHelper = require('int_bazaarvoice_sfra/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
	var Site = require('dw/system/Site').getCurrent();
	
	var ratingPref = Site.getCustomPreferenceValue('bvEnableInlineRatings_C2013');
	
	if(ratingPref && ratingPref.value && ratingPref.value.equals('hosted')) {
		var viewData = res.getViewData();
		viewData.bvScout = BVHelper.getBvLoaderUrl();
		res.setViewData(viewData);
	}
	
	next();
});

module.exports = server.exports();