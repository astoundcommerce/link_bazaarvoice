'use strict';

// API Objects
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const ProductMgr = require('dw/catalog/ProductMgr');
const Site = require('dw/system/Site');
const Status = require('dw/system/Status');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'bvProductExport.js');


// BV Helper Scripts
const BV_Constants = require('bc_bazaarvoice/cartridge/scripts/lib/libConstants').getConstants();
const BVHelper = require('bc_bazaarvoice/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
const CategoryHelper = require('./util/CategoryHelper');
const BrandHelper = require('./util/BrandHelper');
const LocaleHelper = require('./util/LocaleHelper');
const XMLHelper = require('./util/XMLHelper');

var localeMap, dwLocales;
var defaultLocale = request.getLocale();
var brandIter, catIter, prodIter;
var brandCount, catCount, prodCount;
var xsw;

//keep track of 
var currentType, openType;

function beforeStep(parameters, stepExecution) {
	Logger.debug('***** Before Step *****');
	
	//var enabled = Site.current.getCustomPreferenceValue('bvEnableProductFeed_C2013');
	var enabled = parameters.Enabled;
	if(!enabled) {
		Logger.error('Product Feed Enable Parameter is not true!');
		throw new Error('Product Feed Enable Parameter is not true!');
	}
	
	if(empty(BVHelper.getCustomerName())) {
		Logger.error('Cannot retrieve customer name!');
		throw new Error('Cannot retrieve customer name!');
	}
	
	//prepare map of locales and determine if:
	// - this will be a multilocale feed, or 
	// - if we need to explicitly set a single locale because its not the default locale, or
	// - rely on default DW and BV locales, by building a nonlocalized feed.
	localeMap = LocaleHelper.getLocaleMap('product');
	dwLocales = localeMap.keySet();
	if(dwLocales.length === 1) {
		Logger.debug('Setting job request locale to: ' + dwLocales[0]);
		request.setLocale(dwLocales[0]);
	}
	
	var brands = BrandHelper.getBrandList();
	brandIter = brands.iterator();
	brandCount = brands.length;
	
	var categories = CategoryHelper.getCategoryList();
	catIter = categories.iterator();
	catCount = categories.length;
	
	prodIter = ProductMgr.queryAllSiteProducts();
	prodCount = prodIter.count;
	
	var cal = new Calendar();
	var stamp = StringUtils.formatCalendar(cal, 'yyyyMMddhhmmss');
	var sid = Site.current.ID;
	var path = BV_Constants.ProductFeedLocalPath;
	var prefix = BV_Constants.ProductFeedPrefix;
    var filename = prefix + '_' + sid + '_' + stamp + '.xml'; 
    
    xsw = XMLHelper.getStreamWriter(filename, path);
	if(!xsw) {
		throw new Error('Could not init the XMLStreamWriter.');
	}
	
	XMLHelper.startProductFeed();
}

function getTotalCount(parameters, stepExecution) {
	Logger.debug('***** Get Total Count *****');
	
	var total = brandCount + catCount + prodCount;
	
	Logger.debug('Total Count: ' + total);
	return total;
}

function read(parameters, stepExecution) {
	Logger.debug('***** Read *****');
	
	if(brandIter.hasNext()) {
		return {type: 'Brands', obj: brandIter.next()};
	} else if(catIter.hasNext()) {
		return {type: 'Categories', obj: catIter.next()};
	} else if(prodIter.hasNext()) {
		return {type: 'Products', obj: prodIter.next()};
	}
}

function process(item, parameters, stepExecution) {
	Logger.debug('***** Process *****');
	return item;
}

function write(lines, parameters, stepExecution) {
	Logger.debug('***** Write *****');
	
	[].forEach.call(lines, function (line) {
		currentType = line.type;
		if(!openType) {
			XMLHelper.transition(false, currentType);
			openType = currentType;
		} else if(openType !== currentType) {
			XMLHelper.transition(true, currentType);
			openType = currentType;
		}
		
		XMLHelper.writeProductFeedItem(line, localeMap);
	 });
}

function afterStep(success, parameters, stepExecution) {
	Logger.debug('***** After Step *****');
	if(openType) {
		XMLHelper.transition(true, null);
		openType = null;
	}
	
	XMLHelper.finishProductFeed();
	prodIter.close();
}

module.exports = {
    beforeStep: beforeStep,
    getTotalCount: getTotalCount,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};