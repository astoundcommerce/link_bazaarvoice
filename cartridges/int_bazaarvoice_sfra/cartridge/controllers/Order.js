'use strict';

var server = require('server');
server.extend(module.superModule);

var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site');
var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

server.append('Confirm', function (req, res, next) {
    var pixelEnabled = Site.getCurrent().getCustomPreferenceValue('bvEnableBVPixel');

    if (pixelEnabled) {
        var viewData = res.getViewData();
        var order = OrderMgr.getOrder(res.viewData.order.orderNumber, req.form.orderToken);

        if (!empty(order)) {
            viewData.bvScout = BVHelper.getBvLoaderUrl();
            viewData.bvpixel = BVHelper.getOrderPixel(order);
        }

        res.setViewData(viewData);
    }

    next();
});

module.exports = server.exports();
