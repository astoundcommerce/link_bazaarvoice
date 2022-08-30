'use strict';

var server = require('server');
server.extend(module.superModule);

var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site');
var TaxMgr = require('dw/order/TaxMgr');
var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

server.append('Confirm', function (req, res, next) {
    var pixelEnabled = Site.getCurrent().getCustomPreferenceValue('bvEnableBVPixel');
    var purchaseFeedSource = Site.getCurrent().getCustomPreferenceValue('bvPurchaseFeedSource');

    if (pixelEnabled) {
        var viewData = res.getViewData();
        viewData.bvScout = BVHelper.getBvLoaderUrl();

        var order = OrderMgr.getOrder(res.viewData.order.orderNumber, req.form.orderToken);
        var bvdata = BVHelper.getDisplayData();
        if (order != null) {
            var pixelObj = {
                orderId: order.orderNo,
                tax: order.totalTax.value.toFixed(2),
                shipping: order.adjustedShippingTotalNetPrice.value.toFixed(2),
                total: TaxMgr.taxationPolicy === TaxMgr.TAX_POLICY_NET ? order.adjustedMerchandizeTotalNetPrice.value.toFixed(2) : order.adjustedMerchandizeTotalGrossPrice.value.toFixed(2),
                discount: TaxMgr.taxationPolicy === TaxMgr.TAX_POLICY_NET ? order.merchandizeTotalNetPrice.subtract(order.adjustedMerchandizeTotalNetPrice).value.toFixed(2) : order.merchandizeTotalGrossPrice.subtract(order.adjustedMerchandizeTotalGrossPrice).value.toFixed(2),
                city: order.billingAddress.city,
                state: order.billingAddress.stateCode,
                country: order.billingAddress.countryCode.value,
                currency: order.currencyCode,
                email: purchaseFeedSource === 'bvPixel' ? order.customerEmail : null,
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
            var entityId = BVHelper.getEntityId();
            for (var i = 0; i < lineItems.length; i++) {
                var item = lineItems[i];

                if (item.product && !BVHelper.isProductTypeExcluded(item.product)) {
                    var itemObj = {
                        productId: BVHelper.addPrefixPid(BVHelper.replaceIllegalCharacters((item.product.variant && entityId === 'master') ? item.product.variationModel.master.ID : item.product.ID)),
                        name: item.product.name,
                        quantity: item.quantity.value.toFixed(),
                        price: item.basePrice.value.toFixed(2)
                    };

                    var img = BVHelper.getImageURL(item.product, bvConstants.PURCHASE);
                    if (img) {
                        itemObj.imageURL = img;
                    }
                    pixelObj.items.push(itemObj);
                }
            }

            viewData.bvpixel = pixelObj;
        }
        res.setViewData(viewData);
    }

    next();
});

module.exports = server.exports();
