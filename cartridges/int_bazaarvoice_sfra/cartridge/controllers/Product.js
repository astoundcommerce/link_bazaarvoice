'use strict';

var server = require('server');

var Site = require('dw/system/Site').getCurrent();
var ProductMgr = require('dw/catalog/ProductMgr');

var BV_Constants = require('int_bazaarvoice/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('int_bazaarvoice_sfra/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();	

server.extend(module.superModule);

function appendBVData(req, res) {
	if(BVHelper.isRREnabled() || BVHelper.isQAEnabled()) {
		
		var viewData = res.getViewData();
		viewData.bvScout = BVHelper.getBvLoaderUrl();
		
		var apiProduct = ProductMgr.getProduct(viewData.product.id);
		var pid = (apiProduct.variant && !BV_Constants.UseVariantID) ? apiProduct.variationModel.master.ID : apiProduct.ID;
		pid = BVHelper.replaceIllegalCharacters(pid);
		
		viewData.bvDisplay = {
			rr: {
				enabled: BVHelper.isRREnabled()
			},
			qa: {
				enabled: BVHelper.isQAEnabled()
			},
			bvPId : pid,
			showSummary : true
		};
		res.setViewData(viewData);
	}
}

server.append('Show', function(req, res, next) {
	appendBVData(req, res);
	next();
});


server.append('ShowInCategory', function(req, res, next) {
	appendBVData(req, res);
	next();
});


module.exports = server.exports();