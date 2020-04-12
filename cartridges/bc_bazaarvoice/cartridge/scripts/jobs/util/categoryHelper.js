'use strict';

const ArrayList = require('dw/util/ArrayList');
const CatalogMgr = require('dw/catalog/CatalogMgr');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'CategoryHelper.js');
var categoryList = new ArrayList();

/**
 * Returns list of system categories
 * @returns {Array} Returns a list of product categories
 */
function getCategoryList() {
    Logger.debug('*** getCategoryList() ***');
	
    var siteCatalog = CatalogMgr.getSiteCatalog();
    var root = siteCatalog.getRoot();
    getCategory(root);
	
    Logger.debug(categoryList.length + ' categories found.');
    return categoryList;
}

/**
* Returns adds category object to the object list
* @param {Object} cat - cat of an object
*/
function getCategory(cat) {
    if(cat) {
        categoryList.add1(cat);
		
        var subCats = cat.getSubCategories();
        if(subCats) {
            for(var i = 0; i < subCats.length; i++) {
                var subCat = subCats[i];
                getCategory(subCat);
            }
        }
    }
}

module.exports = {
    getCategoryList: getCategoryList
};