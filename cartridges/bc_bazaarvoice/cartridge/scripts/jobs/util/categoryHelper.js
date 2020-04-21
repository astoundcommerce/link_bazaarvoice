'use strict';

var ArrayList = require('dw/util/ArrayList');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'CategoryHelper.js');

var categoryList = new ArrayList();
/**
 * To get the category
 * @param {dw.catalog.category} cat Category Object
 */
function getCategory(cat) {
    if (cat) {
        categoryList.add1(cat);

        var subCats = cat.getSubCategories();
        if (subCats) {
            for (var i = 0; i < subCats.length; i++) {
                var subCat = subCats[i];
                getCategory(subCat);
            }
        }
    }
}
/**
 * function to getCategoryList
 * @returns {List} categoryList
 */
function getCategoryList() {
    Logger.debug('*** getCategoryList() ***');

    var siteCatalog = CatalogMgr.getSiteCatalog();
    var root = siteCatalog.getRoot();
    getCategory(root);

    Logger.debug(categoryList.length + ' categories found.');
    return categoryList;
}

module.exports = {
    getCategoryList: getCategoryList
};
