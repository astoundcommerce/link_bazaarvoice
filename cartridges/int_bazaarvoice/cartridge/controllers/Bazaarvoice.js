'use strict';

/**
 * Controller that renders the home page.
 *
 * @module controllers/Bazaarvoice
 */
var Cartridge = require('dw/system/Site').getCurrent().getCustomPreferenceValue('bvControllerCartridge').toString();

var app = require(Cartridge + '/cartridge/scripts/app');
var guard = require(Cartridge + '/cartridge/scripts/guard');


function container() {
	app.getView().render('bv/container/container');
}

/*
 * Export the publicly available controller methods
 */
/** Renders the home page.
 * @see module:controllers/Bazaarvoice-Container */
exports.Container = guard.ensure(['get'], container);