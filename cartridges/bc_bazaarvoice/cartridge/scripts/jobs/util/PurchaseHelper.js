'use strict';

const Site = require('dw/system/Site');

function getTriggeringEvent() {
    var triggeringEvent = Site.getCurrent().getCustomPreferenceValue('bvPurchaseFeedTriggeringEvent_C2013');
    if (!triggeringEvent) {
        triggeringEvent = 'purchase';
    } else {
        triggeringEvent = triggeringEvent.toString().toLowerCase();
    }
    return triggeringEvent;
}

function getLatestShipmentDate(order) {
	var latestShipment = 0; // initialize to epoch
	
	var shipments = order.getShipments();
	for(var i = 0; i < shipments.length; i++) {
		var shipment = shipments[i];
        latestShipment = Math.max(latestShipment, shipment.getCreationDate().getTime());
    }
    
    return new Date(latestShipment);
}

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