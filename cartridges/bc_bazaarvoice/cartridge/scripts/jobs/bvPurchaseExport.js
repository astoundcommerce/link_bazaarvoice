'use strict';

// API includes
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const Site = require('dw/system/Site');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice',
    'bvPurchaseExport.js');

// BV Helper Scripts
const BV_Constants = require('bc_bazaarvoice/cartridge/scripts/lib/libConstants').getConstants();
const LocaleHelper = require('./util/localeHelper');
const XMLHelper = require('./util/xmlHelper');
const PurchaseHelper = require('./util/purchaseHelper');

// local variables
var localeMap, dwLocales;
var orderItr, orderCount;
var startDate, endDate;
var triggeringEvent;

/**
 * Sets job request locale and calculate approx time to run job and start purschase feed xml
 * @param {Object} parameters config parameters for job
 */
function beforeStep(parameters) {
    Logger.debug('***** Before Step *****');

    var enabled = parameters.Enabled;
    if (!enabled) {
        Logger.error('Product Feed Enable Parameter is not true!');
        throw new Error('Product Feed Enable Parameter is not true!');
    }

    // prepare map of locales and determine if:
    // - this will be a multilocale feed, or
    // - if we need to explicitly set a single locale because its not the
    // default locale, or
    // - rely on default DW and BV locales, by building a nonlocalized feed.
    localeMap = LocaleHelper.getLocaleMap('purchase');
    dwLocales = localeMap.keySet();
    if (dwLocales.length === 1) {
        Logger.debug('Setting job request locale to: ' + dwLocales[0]);
        request.setLocale(dwLocales[0]);
    }

    // prepare the order query, using the job parameters to determin the
    // timeframe of orders to pull
    // - default to the values set in the constants file
    var numDaysLookback = parameters.PurchaseFeedNumDays
			|| BV_Constants.PurchaseFeedNumDays;
    var startCalendar = new Calendar();
    startCalendar.add(Calendar.DATE, (-1 * numDaysLookback)); // Subtract
    // numDaysLookback
    // days from the
    // current date.
    startDate = startCalendar.getTime();

    var numDaysWait = parameters.PurchaseFeedWaitDays
			|| BV_Constants.PurchaseFeedWaitDays;
    var endCalendar = new Calendar();
    endCalendar.add(Calendar.DATE, (-1 * numDaysWait));
    endDate = endCalendar.getTime();

    var queryString = 'exportStatus = {0} AND creationDate >= {1} AND creationDate <= {2}';
    orderItr = OrderMgr.queryOrders(queryString, 'orderNo ASC',
        Order.EXPORT_STATUS_EXPORTED, startDate, endDate, true);
    orderCount = orderItr.count;

    triggeringEvent = PurchaseHelper.getTriggeringEvent();

    var cal = new Calendar();
    var stamp = StringUtils.formatCalendar(cal, 'yyyyMMddhhmmss');
    var sid = Site.current.ID;
    var path = BV_Constants.PurchaseFeedLocalPath;
    var prefix = BV_Constants.PurchaseFeedPrefix;
    var filename = prefix + '_' + sid + '_' + stamp + '.xml';

    var xsw = XMLHelper.getStreamWriter(filename, path);
    if (!xsw) {
        throw new Error('Could not init the XMLStreamWriter.');
    }

    XMLHelper.startPurchaseFeed();
}

/**
 * Get total order count
 * @param {Object} parameters config params for job
 * @returns {number} total number or orders
 */
function getTotalCount() {
    Logger.debug('***** Get Total Count *****');
    Logger.debug('Total Count: ' + orderCount);
    return orderCount;
}

/**
 * Get total order count
 * @param {Object} parameters config params for job
 * @returns {Object} order object
 */
function read() {
    Logger.debug('***** Read *****');
    if (orderItr.hasNext()) {
        return orderItr.next();
    }
}

/**
 * process order object
 * @param {Object} item - purschase item
 * @returns {Object} item object
 */
function process(item) {
    Logger.debug('***** Process *****');
    return item;
}

/**
 * write order object to XML
 * @param {Object} orders - order to be written to job
 * @param {Object} parameters - config params for job
 */
function write(orders) {
    Logger.debug('***** Write *****');

    [].forEach
        .call(
            orders,
            function(order) {
                // make sure we havent sent this order yet
                // we cannot query against this custom boolean if the
                // value was never set, aka legacy orders
                // if(order.custom[CUSTOM_FLAG] === true) {
                // Logger.debug('Skipping Order:' + order.getOrderNo() +
                // '. Order was already sent to BV.');
                // return;
                // }

                // Our original order query pulled orders that were
                // created before the end date. (same as purchase
                // triggering event)
                // If we are using the shipping trigger, then:
                // - make sure the order shipping status is set
                // - test if the latest shipment was created before our
                // end date.
                if (triggeringEvent === 'shipping') {
                    if (order.getShippingStatus().value !== Order.SHIPPING_STATUS_SHIPPED) {
                        Logger.debug('Skipping Order:'
										+ order.getOrderNo()
										+ '. Not completely shipped.');
                        return;
                    }

                    var latestItemShipDate = PurchaseHelper
                        .getLatestShipmentDate(order);
                    if (latestItemShipDate.getTime() > endDate
                        .getTime()) {
                        Logger
                            .debug('Skipping Order:'
												+ order.getOrderNo()
												+ '. Order\'s latest shipment not before the End Date of: '
												+ endDate.toISOString());
                        return;
                    }
                }

                // Ensure we have everything on this order that would be
                // required in the output feed

                // Nothing fancy, but do we have what basically looks
                // like a legit email address?
                if (order.getCustomerEmail()
								|| !order.getCustomerEmail().match(/@/)) {
                    Logger.debug('kipping Order:' + order.getOrderNo()
									+ '. No valid email address.');
                    return;
                }

                // Does the order have any line items ?
                if (order.getAllProductLineItems().getLength() < 1) {
                    Logger.debug('Skipping order:' + order.getOrderNo()
									+ '. No line items in this order.');
                    return;
                }

                // We need to find out if the order is placed with the
                // current locale
                // we have already verified that we have a matching bv
                // locale in the mappings
                // if(!order.getCustomerLocaleID().equals(currentLocale)
                // && (!localeMap ||
                // !localeMap.get(order.getCustomerLocaleID()))) {
                // Logger.debug('Skipping order: order locale {1} does
                // not have a mapped BV locale.',
                // order.getCustomerLocaleID());
                // return;
                // }

                XMLHelper.writePurchaseFeedItem(order, localeMap);

                // set the flag so we dont export this order again
                order.custom[BV_Constants.CUSTOM_FLAG] = true;
            });
}

/**
 * cleanup and close XML
 * @param {string} success - value
 */
function afterStep(success) {
    Logger.debug('***** After Step *****');
    XMLHelper.finishPurchaseFeed();
    orderItr.close();
}

module.exports = {
    beforeStep : beforeStep,
    getTotalCount : getTotalCount,
    read : read,
    process : process,
    write : write,
    afterStep : afterStep
};