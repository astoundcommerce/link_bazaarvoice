/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Tile
*/

'use strict';

var server = require('server');
server.extend(module.superModule);

var Site = require('dw/system/Site').getCurrent();
var URLUtils = require('dw/web/URLUtils');

server.append('Show', function (req, res, next) {
    var viewData = res.getViewData();

    var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
    var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
    var ratingPref = Site.current.getCustomPreferenceValue('bvEnableInlineRatings_C2013');
    var ProductMgr = require('dw/catalog/ProductMgr');

    var apiProduct = ProductMgr.getProduct(viewData.product.id);
    var pid = (apiProduct.variant && !bvConstants.UseVariantID) ? apiProduct.variationModel.master.ID : apiProduct.ID;
    pid = BVHelper.replaceIllegalCharacters(pid);

    viewData.bvDisplay = {
        bvPid: pid,
        bvScout: BVHelper.getBvLoaderUrl(),
        rating: {
            enabled: false,
            type: 'none'
        }
    };

    if (ratingPref && ratingPref.value && ratingPref.value.equals('native')) {
        var masterProduct = (apiProduct.variant) ? apiProduct.variationModel.master : apiProduct;
        var bvAvgRating = masterProduct.custom.bvAverageRating;
        var bvRatingRange = masterProduct.custom.bvRatingRange;
        var bvReviewCount = masterProduct.custom.bvReviewCount;
        var bvAvgRatingNum = Number(bvAvgRating);
        var bvRatingRangeNum = Number(bvRatingRange);
        var bvReviewCountNum = Number(bvReviewCount);

        var starsFile = null;
        if (isFinite(bvAvgRatingNum) && bvAvgRating && isFinite(bvRatingRangeNum) && bvRatingRange && isFinite(bvReviewCountNum) && bvReviewCount) {
            starsFile = 'rating-' + bvAvgRatingNum.toFixed(1).toString().replace('.', '_') + '.gif';
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
    } else if (ratingPref && ratingPref.value && ratingPref.value.equals('hosted')) {
        viewData.bvDisplay.rating = {
            enabled: true,
            type: 'hosted'
        };
    }

    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
