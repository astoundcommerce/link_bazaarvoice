'use strict';

var server = require('server');
server.extend(module.superModule);

var Site = require('dw/system/Site').getCurrent();
var ProductMgr = require('dw/catalog/ProductMgr');


function appendBVData(req, res) {
	var BV_Constants = require('int_bazaarvoice_sfra/cartridge/scripts/lib/libConstants').getConstants();
	var BVHelper = require('int_bazaarvoice_sfra/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
	var BV_SEO = require('int_bazaarvoice_sfra/cartridge/scripts/lib/libCloudSEO.ds');
	
	if(BVHelper.isRREnabled() || BVHelper.isQAEnabled()) {
		
		var viewData = res.getViewData();
		viewData.bvScout = BVHelper.getBvLoaderUrl();
		
		var apiProduct = ProductMgr.getProduct(viewData.product.id);
		var pid = (apiProduct.variant && !BV_Constants.UseVariantID) ? apiProduct.variationModel.master.ID : apiProduct.ID;
		pid = BVHelper.replaceIllegalCharacters(pid);
		
		var seoData = BV_SEO.getBVSEO({'product_id' : pid});
		var seoReviews = seoData.reviews();
		var seoQuestions = seoData.questions();
		
		viewData.bvDisplay = {
			rr: {
				enabled: BVHelper.isRREnabled(),
				seo: {
					aggregateRating: seoReviews.getAggregateRating(),
					reviews: seoReviews.getReviews(),
					content: seoReviews.getContent()
				}
			},
			qa: {
				enabled: BVHelper.isQAEnabled(),
				seo: {
					content: seoQuestions.getContent()
				}
			},
			bvPId : pid,
			showSummary : true
		};
		res.setViewData(viewData);
	}
}

function appendBVQuickViewData(req, res) {
	var ratingPref = Site.current.getCustomPreferenceValue('bvEnableInlineRatings_C2013');
	var quickviewPref = Site.current.getCustomPreferenceValue('bvQuickViewRatingsType_C2013');
	
	if(quickviewPref && quickviewPref.value && !quickviewPref.value.equals('none')) {
		var viewData = res.getViewData();
		
		var apiProduct = ProductMgr.getProduct(viewData.product.id);
		var pid = (apiProduct.variant && !BV_Constants.UseVariantID) ? apiProduct.variationModel.master.ID : apiProduct.ID;
		pid = BVHelper.replaceIllegalCharacters(pid);
	
		if(quickviewPref.value.equals('inlineratings')) {
			
		} else if(quickviewPref.value.equals('pdpsummary')) {
			
		}
	
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

server.append('ShowQuickView', function(req, res, next) {
	appendBVQuickViewData(req, res);
	next();
});


module.exports = server.exports();