'use strict';

var ArrayList = require('dw/util/ArrayList');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'BrandHelper.js');
/**
 * returns the list of brands
 * @returns {Object} returns a list of brands
 */
function getBrandList() {
    var brands = new ArrayList();

    var psm = new ProductSearchModel();
    var siteCatalog = CatalogMgr.getSiteCatalog();
    var root = siteCatalog.getRoot();
    psm.setCategoryID(root.ID);
    psm.search();

    var refinements = psm.getRefinements();
    var brandVals = null;

    try {
        brandVals = refinements.getAllRefinementValues('brand');
    } catch (error) {
        Logger.error('Brand refinement not found');
        return brands;
    }

    if (brandVals && !brandVals.empty) {
        brands = new ArrayList(brandVals);
        Logger.debug('Brand refinement values found: ' + brands.length);
    } else {
        Logger.debug('Brand refinement values not found');
    }

    return brands;
}

module.exports = {
    getBrandList: getBrandList
};
