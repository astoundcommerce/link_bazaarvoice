'use strict';

var server = require('server');
server.extend(module.superModule);

var Site = require('dw/system/Site').getCurrent();
var ProductMgr = require('dw/catalog/ProductMgr');
var URLUtils = require('dw/web/URLUtils');

var BV_Constants = require('bc_bazaarvoice/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('bc_bazaarvoice/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

function appendBVData(req, res) {
	var BV_SEO = require('bc_bazaarvoice/cartridge/scripts/lib/libCloudSEO.ds');
	
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
			bvPid : pid,
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
	
		viewData.bvDisplay = {
			bvPid: pid,
			qvType: quickviewPref.value
		};
		
		if(quickviewPref.value.equals('inlineratings')) {
			if(ratingPref && ratingPref.value && ratingPref.value.equals('native')) {
				var masterProduct = (apiProduct.variant) ? apiProduct.variationModel.master : apiProduct;
		    	var bvAvgRating = masterProduct.custom.bvAverageRating;
		    	var bvRatingRange = masterProduct.custom.bvRatingRange;
		    	var bvReviewCount = masterProduct.custom.bvReviewCount;
		    	var bvAvgRatingNum = new Number(bvAvgRating);
		    	var bvRatingRangeNum = new Number(bvRatingRange);
		    	var bvReviewCountNum = new Number(bvReviewCount);
		    	
		    	var starsFile = null;
		    	if (isFinite(bvAvgRatingNum) && bvAvgRating && isFinite(bvRatingRangeNum) && bvRatingRange && isFinite(bvReviewCountNum) && bvReviewCount) {
		    		starsFile = 'rating-' + bvAvgRatingNum.toFixed(1).toString().replace('.','_') + '.gif';
		    	} else {
		    		starsFile = 'rating-0_0.gif';
		    	}
		    	
		    	viewData.bvDisplay.rating = {
		    		enabled: true,
		    		type: 'native',
		    		rating: bvAvgRatingNum.toFixed(1),
		    		range: bvRatingRangeNum.toFixed(0),
		    		count: bvReviewCountNum.toFixed(0),
		    		stars: URLUtils.absStatic('/images/stars/' + starsFile).toString()
		    	};
			} else if(ratingPref && ratingPref.value && ratingPref.value.equals('hosted')) {
				viewData.bvDisplay.rating = {
					enabled: true,
					type: 'hosted'
				}
			} else {
				viewData.bvDisplay.rating = {
					enabled: false,
					type: 'none'
				};
			}
			
		} else if(quickviewPref.value.equals('pdpsummary')) {
			viewData.bvDisplay.rr = {
				enabled: BVHelper.isRREnabled(),
			};
			viewData.bvDisplay.showSummary = true;
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