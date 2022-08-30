'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('Show', function (req, res, next) {
    var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
    var Site = require('dw/system/Site').getCurrent();

    var ratingPref = Site.getCustomPreferenceValue('bvEnableInlineRatings');
    var quickviewPref = Site.current.getCustomPreferenceValue('bvQuickViewRatingsType');
    var addScout = false;
    if ((ratingPref && ratingPref.value && ratingPref.value.equals('hosted')) || (quickviewPref && quickviewPref.value && quickviewPref.value.equals('pdpsummary'))) {
        addScout = true;
    }

    if (addScout) {
        var viewData = res.getViewData();
        viewData.bvScout = BVHelper.getBvLoaderUrl();
        res.setViewData(viewData);
    }

    next();
});

module.exports = server.exports();
