'use strict';

var Site = require('dw/system/Site');
/**
* This is a function fires off the product feed.
* @returns {string} A color object
*/
function getTriggeringEvent() {
    var triggeringEvent = Site.getCurrent().getCustomPreferenceValue('bvPurchaseFeedTriggeringEvent_C2013');
    if (!triggeringEvent) {
        triggeringEvent = 'purchase';
    } else {
        triggeringEvent = triggeringEvent.toString().toLowerCase();
    }
    return triggeringEvent;
}

/**
* This is a function gets the last order shipment based on order
* @param {string} order - get order object
* @returns {date} shipment date
*/
function getLatestShipmentDate(order) {
    var latestShipment = 0; // initialize to epoch

    var shipments = order.getShipments();
    for (var i = 0; i < shipments.length; i++) {
        var shipment = shipments[i];
        latestShipment = Math.max(latestShipment, shipment.getCreationDate().getTime());
    }

    return new Date(latestShipment);
}


/**
* This is a function gets the last order shipment based on order
* @param {string} order - get order object
* @returns {date} shipment date
 */
function getTransactionDate(order) {
    var txnDate = order.getCreationDate();

    var triggeringEvent = getTriggeringEvent();
    if (triggeringEvent === 'shipping') {
        txnDate = getLatestShipmentDate(order);
    }

    return txnDate;
}

module.exports = {
    getTriggeringEvent: getTriggeringEvent,
    getLatestShipmentDate: getLatestShipmentDate,
    getTransactionDate: getTransactionDate
};
