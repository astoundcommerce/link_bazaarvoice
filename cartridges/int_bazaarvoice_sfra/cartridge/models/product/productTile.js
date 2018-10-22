'use strict';

var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');

var decorators = require('*/cartridge/models/product/decorators/index');

var BV_Constants = require('int_bazaarvoice_sfra/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('int_bazaarvoice_sfra/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

var ratingPref = Site.current.getCustomPreferenceValue('bvEnableInlineRatings_C2013');

module.exports = function(product, apiProduct, productType) {
	//extend the productTile model
	var productTile = module.superModule(product, apiProduct, productType);
	
	//add a product ID we can use for inline ratings.
	if(apiProduct) {
		var pid = (apiProduct.variant && !BV_Constants.UseVariantID) ? apiProduct.variationModel.master.ID : apiProduct.ID;
		pid = BVHelper.replaceIllegalCharacters(pid);
		
		Object.defineProperty(productTile, 'bvProdId', {
	        enumerable: true,
	        value: pid
	    });
		
		Object.defineProperty(productTile, 'rating', {
	        enumerable: true,
	        value: (function () {
	        	if(ratingPref && ratingPref.value.equals('native')) {
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
		        	
		        	return {
		        		enabled: true,
		        		type: 'native',
		        		rating: bvAvgRatingNum.toFixed(1),
		        		range: bvRatingRangeNum.toFixed(0),
		        		count: bvReviewCountNum.toFixed(0),
		        		stars: URLUtils.absStatic('/images/stars/' + starsFile).toString()
		        	};
	        	} else if(ratingPref && ratingPref.value.equals('hosted')) {
	        		return {
	        			enabled: true,
		        		type: 'hosted',
		        		bvscout: BVHelper.getBvLoaderUrl()
	        		};
	        	} else {
	        		return {
	        			enabled: false,
	        			type: 'none'
	        		};
	        	}
	        }())
	    });
		
	}
	
	return productTile;
};