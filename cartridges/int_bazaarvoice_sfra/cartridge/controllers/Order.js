'use strict';

var server = require('server');
server.extend(module.superModule);

var OrderMgr = require('dw/order/OrderMgr');

var BV_Constants = require('bc_bazaarvoice/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('bc_bazaarvoice/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();


server.append('Confirm', function (req, res, next) {
    var pixelEnabled = dw.system.Site.getCurrent().getCustomPreferenceValue('bvEnableBVPixel_C2013');

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
            partnerSource: BV_Constants.XML_GENERATOR,
            locale: bvdata.locale,
            deploymentZone: bvdata.zone.toLowerCase().replace(' ', '_', 'g'),
            items: []
        };

        if (order.customerNo) {
            pixelObj.userId = order.customerNo;
        }

        var lineItems = order.allProductLineItems;
        for (var i = 0; i < lineItems.length; i++) {
            var item = lineItems[i];

            if (item.product) {
                var itemObj = {
                    sku: BVHelper.replaceIllegalCharacters((item.product.variant && !BV_Constants.UseVariantID) ? item.product.variationModel.master.ID : item.product.ID),
                    name: item.product.name,
                    quantity: item.quantity.value.toFixed(),
                    price: item.price.value
                };

                var img = BVHelper.getImageURL(item.product, BV_Constants.PURCHASE);
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
