'use strict';

const ArrayList = require('dw/util/ArrayList');
const CatalogMgr = require('dw/catalog/CatalogMgr');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'CategoryHelper.js');

var categoryList = new ArrayList();

function getCategoryList() {
	Logger.debug('*** getCategoryList() ***');
	
	var siteCatalog = CatalogMgr.getSiteCatalog();
	var root = siteCatalog.getRoot();
	getCategory(root);
	
	Logger.debug(categoryList.length + ' categories found.');
	return categoryList;
}

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