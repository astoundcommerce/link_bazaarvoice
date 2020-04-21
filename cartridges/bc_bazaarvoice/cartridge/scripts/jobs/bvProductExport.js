/* eslint-disable consistent-return */
'use strict';

// API Objects
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var ProductMgr = require('dw/catalog/ProductMgr');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'bvProductExport.js');


// BV Helper Scripts
var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
var bvHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
var categoryHelper = require('./util/categoryHelper');
var brandHelper = require('./util/brandHelper');
var localeHelper = require('./util/localeHelper');
var xmlHelper = require('./util/xmlHelper');

var localeMap; var
    dwLocales;
var brandIter; var catIter; var
    prodIter;
var brandCount; var catCount; var
    prodCount;
var xsw;

// keep track of
var currentType; var
    openType;
/**
 * Represents the before step before running the job.
 * @param {string} parameters - check to see if product feed is enabled.
 */
function beforeStep(parameters) {
    Logger.debug('***** Before Step *****');

    // var enabled = Site.current.getCustomPreferenceValue('bvEnableProductFeed_C2013');
    var enabled = parameters.Enabled;
    if (!enabled) {
        Logger.error('Product Feed Enable Parameter is not true!');
        throw new Error('Product Feed Enable Parameter is not true!');
    }

    if (empty(bvHelper.getCustomerName())) {
        Logger.error('Cannot retrieve customer name!');
        throw new Error('Cannot retrieve customer name!');
    }

    // prepare map of locales and determine if:
    // - this will be a multilocale feed, or
    // - if we need to explicitly set a single locale because its not the default locale, or
    // - rely on default DW and BV locales, by building a nonlocalized feed.
    localeMap = localeHelper.getLocaleMap('product');
    dwLocales = localeMap.keySet();
    if (dwLocales.length === 1) {
        Logger.debug('Setting job request locale to: ' + dwLocales[0]);
        request.setLocale(dwLocales[0]);
    }

    var brands = brandHelper.getBrandList();
    brandIter = brands.iterator();
    brandCount = brands.length;

    var categories = categoryHelper.getCategoryList();
    catIter = categories.iterator();
    catCount = categories.length;

    prodIter = ProductMgr.queryAllSiteProducts();
    prodCount = prodIter.count;

    var cal = new Calendar();
    var stamp = StringUtils.formatCalendar(cal, 'yyyyMMddhhmmss');
    var sid = Site.current.ID;
    var path = bvConstants.ProductFeedLocalPath;
    var prefix = bvConstants.ProductFeedPrefix;
    var filename = prefix + '_' + sid + '_' + stamp + '.xml';

    xsw = xmlHelper.getStreamWriter(filename, path);
    if (!xsw) {
        throw new Error('Could not init the XMLStreamWriter.');
    }

    xmlHelper.startProductFeed();
}
/**
 * Log total count of brand and category for products.
 * @returns {number} Sum of brand and category and product
 */
function getTotalCount() {
    Logger.debug('***** Get Total Count *****');

    var total = brandCount + catCount + prodCount;

    Logger.debug('Total Count: ' + total);
    return total;
}

/**
 * Interates through product, brand and categories.
 * @returns {Object} returns object of brand, cat, products
 */
function read() {
    Logger.debug('***** Read *****');

    if (brandIter.hasNext()) {
        return { type: 'Brands', obj: brandIter.next() };
    } else if (catIter.hasNext()) {
        return { type: 'Categories', obj: catIter.next() };
    } else if (prodIter.hasNext()) {
        return { type: 'Products', obj: prodIter.next() };
    }
}
/**
 * @param {Object} item - product item.
 * processing product, brand and categories.
 * @returns {Object} returns object of the process items
 */
function process(item) {
    Logger.debug('***** Process *****');
    return item;
}
/**
 *
 * @param {Array} lines products needs to write in files
 */
function write(lines) {
    Logger.debug('***** Write *****');

    [].forEach.call(lines, function (line) {
        currentType = line.type;
        if (!openType) {
            xmlHelper.transition(false, currentType);
            openType = currentType;
        } else if (openType !== currentType) {
            xmlHelper.transition(true, currentType);
            openType = currentType;
        }

        xmlHelper.writeProductFeedItem(line, localeMap);
    });
}
/**
 */
function afterStep() {
    Logger.debug('***** After Step *****');
    if (openType) {
        xmlHelper.transition(true, null);
        openType = null;
    }

    xmlHelper.finishProductFeed();
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
