'use strict';

var server = require('server');
server.extend(module.superModule);

var Site = require('dw/system/Site').getCurrent();
var ProductMgr = require('dw/catalog/ProductMgr');
var URLUtils = require('dw/web/URLUtils');

var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

/**
 * Returns RR and Questions from BV
 * @param {array} req - request parameters
 * @param {Object} res - json response from BV
 */
function appendBVData(req, res) {
    var BV_SEO = require('*/cartridge/scripts/lib/libCloudSEO.js');
    var viewData = res.getViewData();
    var apiProduct = ProductMgr.getProduct(viewData.product.id);

    // if (BVHelper.isDynamicPixelEnabled()) {
    //     viewData.bvScout = BVHelper.getBvLoaderUrl();

    //     var productData = BVHelper.getProductsData(apiProduct);

    //     viewData.bvDynamicpixel = {
    //         locale: req.locale.id,
    //         productData: productData
    //     };
    //     res.setViewData(viewData);
    // }

    if (BVHelper.isRREnabled() || BVHelper.isQAEnabled()) {
        viewData.bvScout = BVHelper.getBvLoaderUrl();
        var pid = (apiProduct.variant && !bvConstants.UseVariantID) ? apiProduct.variationModel.master.ID : apiProduct.ID;
        var entityId = BVHelper.getEntityId();
        if (entityId === 'master' && apiProduct.variant) {
            pid = apiProduct.variationModel.master.ID;
        }
        pid = BVHelper.replaceIllegalCharacters(pid);

        pid = BVHelper.addPrefixPid(pid);

        var seoData = BV_SEO.getBVSEO({ product_id: pid });
        if (seoData !== null) {
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
                bvPid: pid,
                showSummary: true
            };
        } else {
            viewData.bvDisplay = {
                rr: {
                    enabled: BVHelper.isRREnabled()
                },
                qa: {
                    enabled: BVHelper.isQAEnabled()
                },
                bvPid: pid,
                showSummary: true
            };
        }

        res.setViewData(viewData);
    }
}

/**
 * Returns RR and Questions from BV for quickview
 * @param {array} req - request parameters
 * @param {Object} res - json response from BV
 */
function appendBVQuickViewData(req, res) {
    var ratingPref = Site.current.getCustomPreferenceValue('bvEnableInlineRatings');
    var quickviewPref = Site.current.getCustomPreferenceValue('bvQuickViewRatingsType');

    if (quickviewPref && quickviewPref.value && !quickviewPref.value.equals('none')) {
        var viewData = res.getViewData();

        var apiProduct = ProductMgr.getProduct(viewData.product.id);
        var pid = (apiProduct.variant && !bvConstants.UseVariantID) ? apiProduct.variationModel.master.ID : apiProduct.ID;
        var productUrl = URLUtils.url('Product-Show', 'pid', pid);

        pid = BVHelper.replaceIllegalCharacters(pid);
        pid = BVHelper.addPrefixPid(pid);

        viewData.bvDisplay = {
            bvPid: pid,
            qvType: quickviewPref.value,
            productUrl: productUrl
        };

        if (quickviewPref.value.equals('inlineratings')) {
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
            } else {
                viewData.bvDisplay.rating = {
                    enabled: false,
                    type: 'none'
                };
            }
        } else if (quickviewPref.value.equals('pdpsummary')) {
            viewData.bvDisplay.rr = {
                enabled: BVHelper.isRREnabled()
            };
            viewData.bvDisplay.showSummary = true;
        }

        res.setViewData(viewData);
    }
}

server.append('Show', function (req, res, next) {
    appendBVData(req, res);
    next();
});

server.append('ShowInCategory', function (req, res, next) {
    appendBVData(req, res);
    next();
});

server.append('ShowQuickView', function (req, res, next) {
    appendBVQuickViewData(req, res);
    next();
});

module.exports = server.exports();
