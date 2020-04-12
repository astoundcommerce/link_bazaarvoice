'use strict';

const ArrayList = require('dw/util/ArrayList');
const ProductSearchModel = require('dw/catalog/ProductSearchModel');
const CatalogMgr = require('dw/catalog/CatalogMgr');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'BrandHelper.js');
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
    var brandVals = refinements.getAllRefinementValues('brand');
    if(!brandVals.empty) {
        brands = new ArrayList(brandVals);
        Logger.debug('Brand refinement values found: ' + brands.length);
    }	
    return brands;
}

module.exports = {
    getBrandList: getBrandList
};