'use strict';

var server = require('server');
server.extend(module.superModule);

var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site');
var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

server.append('Confirm', function (req, res, next) {
    var pixelEnabled = Site.getCurrent().getCustomPreferenceValue('bvEnableBVPixel_C2013');

    if (pixelEnabled) {
        var viewData = res.getViewData();
        viewData.bvScout = BVHelper.getBvLoaderUrl();

        var order = OrderMgr.getOrder(req.querystring.ID);
        var bvdata = BVHelper.getDisplayData();

        var pixelObj = {
            orderId: order.orderNo,
            tax: order.totalTax.value,
            shipping: order.adjustedShippingTotalNetPrice.value,
            total: order.adjustedMerchandizeTotalNetPrice.value,
            city: order.billingAddress.city,
            state: order.billingAddress.stateCode,
            country: order.billingAddress.countryCode.value,
            currency: order.currencyCode,
            email: order.customerEmail,
            nickname: order.customerName,
            partnerSource: bvConstants.XML_GENERATOR,
            locale: bvdata.locale,
            deploymentZone: bvdata.zone.toLowerCase().replace(' ', '_', 'g'),
            items: [],
            source: bvConstants.SOURCE,
            sourceVersion: bvConstants.SOURCE_VERSION
        };

        if (order.customerNo) {
            pixelObj.userId = order.customerNo;
        }

        var lineItems = order.allProductLineItems;
        for (var i = 0; i < lineItems.length; i++) {
            var item = lineItems[i];

            if (item.product) {
                var itemObj = {
                    productId: BVHelper.replaceIllegalCharacters((item.product.variant && !bvConstants.UseVariantID) ? item.product.variationModel.master.ID : item.product.ID),
                    name: item.product.name,
                    quantity: item.quantity.value.toFixed(),
                    price: item.price.value
                };

                var img = BVHelper.getImageURL(item.product, bvConstants.PURCHASE);
                if (img) {
                    itemObj.imageURL = img;
                }
                pixelObj.items.push(itemObj);
            }
        }

        viewData.bvpixel = pixelObj;

        res.setViewData(viewData);
    }

    next();
});

module.exports = server.exports();
