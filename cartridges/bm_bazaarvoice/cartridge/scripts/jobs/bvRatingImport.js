'use strict';

var HashMap = require('dw/util/HashMap');
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var ProductMgr = require('dw/catalog/ProductMgr');
var Status = require('dw/system/Status');
var XMLStreamConstants = require('dw/io/XMLStreamConstants');
var XMLStreamReader = require('dw/io/XMLStreamReader');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'bvRatingImport.js');

var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
var localeHelper = require('./util/localeHelper');

function isIncludeNamespaceTags(namespace, tags) {
    var shift = namespace.length - tags.length;

    if (shift < 0 ) return false;

    for (var i = 0; i < tags.length; i++) {
        if (tags[i] !== namespace[i + shift]) return false;
    }

    return true;
}

function saveRatingToProduct(product, bzvProduct, bvLocaleMap) {
    if (!product) return;

    var localeItemList = bzvProduct.localeDistribution;

    if (localeItemList && localeItemList.length > 0) {
        var bvAverageRating = '';
        var bvReviewCount = '';
        var bvRatingRange = '';

        for (var i = 0; i < localeItemList.length; i++) {
            var localeItem = localeItemList[i];
            var ns = localeItem.namespace();

            var bvLocale = localeItem.ns::DisplayLocale.toString();
            if (bvLocale) {
                if (!empty(localeItem.ns::ReviewStatistics.ns::AverageOverallRating.toString())) {
                    bvAverageRating = localeItem.ns::ReviewStatistics.ns::AverageOverallRating.toString();
                }
                if (!empty(localeItem.ns::ReviewStatistics.ns::TotalReviewCount.toString())) {
                    bvReviewCount = localeItem.ns::ReviewStatistics.ns::TotalReviewCount.toString();
                }
                if (!empty(localeItem.ns::ReviewStatistics.ns::OverallRatingRange.toString())) {
                    bvRatingRange = localeItem.ns::ReviewStatistics.ns::OverallRatingRange.toString();
                }

                var dwLocales = bvLocaleMap.get(bvLocale);
                if (dwLocales && dwLocales != null) {
                    for (var j = 0; j < dwLocales.length; j++) {
                        var dwLocale = dwLocales[j];
                        request.setLocale(dwLocale);
                        product.custom.bvAverageRating = bvAverageRating;
                        product.custom.bvReviewCount = bvReviewCount;
                        product.custom.bvRatingRange = bvRatingRange;
                    }
                }
            }
        }
    } else {
        product.custom.bvAverageRating = bzvProduct.averageOverallRating || '';
        product.custom.bvReviewCount = bzvProduct.totalReviewCount || '';
        product.custom.bvRatingRange = bzvProduct.overallRatingRange || '';
    }
}

function ProductRatingCleaner(enable) {
    var localeHelper = require('./util/localeHelper');
    var localeMap = localeHelper.getLocaleMap('product');

    this.enable = (enable === true);
    this.dwLocales = localeMap.keySet().toArray();
    this.productItr = null;
    this.fileName = [File.TEMP, 'bv', 'ratings', 'ratings_removed.xml'].join(File.SEPARATOR);;
    this.fileWriter = null;
    this.fileXMLWriter = null;
}

ProductRatingCleaner.prototype.open = function () {
    if (!this.enable) return;

    const FileWriter = require('dw/io/FileWriter');
    const XMLStreamWriter = require('dw/io/XMLStreamWriter');
    const BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper()

    var now = new Date();
    var tempFile = new File(this.fileName);

    try {
        this.fileWriter = new FileWriter(tempFile, 'UTF-8');
        this.fileXMLWriter = new XMLStreamWriter(this.fileWriter);

        this.fileXMLWriter.writeStartDocument();
        this.fileXMLWriter.writeStartElement('RemovedItems');
        this.fileXMLWriter.writeAttribute('name', BVHelper.getCustomerName());
        this.fileXMLWriter.writeAttribute('extractDate', now.toISOString());
    } catch (e) {
        Logger.info('Can not open file for writing removed ratings: ', e.message);
        this.enable = false;
        return;
    }

    this.productItr = ProductMgr.queryAllSiteProductsSorted();
}

ProductRatingCleaner.prototype.close = function () {
    if (!this.enable) return;

    if (this.productItr) {
        this.productItr.close();
        this.productItr = null;
    }

    if (this.fileXMLWriter) {
        this.fileXMLWriter.writeEndElement();
        this.fileXMLWriter.writeEndDocument();
        this.fileXMLWriter.close();
        this.fileXMLWriter = null;
    }

    if (this.fileWriter) {
        this.fileWriter.close();
        this.fileWriter = null;
    }
}

ProductRatingCleaner.prototype.clean = function (product) {
    if (!this.enable) return;

    var pid = product ? product.ID : null;

    while (this.productItr.hasNext()) {
        var prod = this.productItr.next();
        var obj = {};

        if (pid && prod.ID >= pid) { break; }

        this.dwLocales.forEach(function (dwLocale) {
            request.setLocale(dwLocale);

            if (Object.hasOwnProperty.call(prod.custom, 'bvAverageRating')) {
                if (empty(obj[dwLocale])) { obj[dwLocale] = [{name:'bvAverageRating', value: prod.custom.bvAverageRating}]; }
                else { obj[dwLocale].push({name:'bvAverageRating', value: prod.custom.bvAverageRating}); }
                delete prod.custom.bvAverageRating;
            }
            if (Object.hasOwnProperty.call(prod.custom, 'bvReviewCount')) {
                if (empty(obj[dwLocale])) { obj[dwLocale] = [{name:'bvReviewCount', value: prod.custom.bvReviewCount}]; }
                else { obj[dwLocale].push({name:'bvReviewCount', value: prod.custom.bvReviewCount}); }
                delete prod.custom.bvReviewCount;
            }
            if (Object.hasOwnProperty.call(prod.custom, 'bvRatingRange')) {
                if (empty(obj[dwLocale])) { obj[dwLocale] = [{name:'bvRatingRange', value: prod.custom.bvRatingRange}]; }
                else { obj[dwLocale].push({name:'bvRatingRange', value: prod.custom.bvRatingRange}); }
                delete prod.custom.bvRatingRange;
            }
        });

        if (Object.keys(obj).length > 0) {
            var that = this;

            that.fileXMLWriter.writeStartElement('Product');
            that.fileXMLWriter.writeAttribute('id', prod.ID);

            Object.keys(obj).forEach(function (dwLocale) {
                var fields = obj[dwLocale];
                fields.forEach(function (field) {
                    that.fileXMLWriter.writeStartElement(field.name);
                    that.fileXMLWriter.writeAttribute('locale', dwLocale);
                    that.fileXMLWriter.writeCharacters(field.value);
                    that.fileXMLWriter.writeEndElement();
                });
            });

            that.fileXMLWriter.writeEndElement();
        }
    }
}

module.exports.execute = function (parameters) {
    var enabled = parameters.Enabled;

    if (!enabled) {
        Logger.info('Import Ratings Enable Parameter is not true!');
        return new Status(Status.OK);
    }

    var productRatingCleaner = new ProductRatingCleaner(parameters.RemoveOldRatings);

    try {
        // generate a locale map
        // also generate a reverse map of:
        //   BV locale ===> Array of DW locales
        // maps to an Array because multiple DW locales can map to a single BV locale
        var localeMap = localeHelper.getLocaleMap('rating');
        var multiLocale = localeHelper.isMultiLocale(localeMap);
        var bvLocaleMap = new HashMap();
        if (multiLocale) {
            bvLocaleMap = localeHelper.getBVLocaleMap(localeMap);
        }

        // get the rating feed we just downloaded
        var tempPath = [File.TEMP, 'bv', 'ratings', 'ratings.xml'].join(File.SEPARATOR);
        var tempFile = new File(tempPath);
        if (!tempFile.exists()) {
            throw new Error('TEMP/bv/ratings/ratings.xml does not exist!');
        }

        productRatingCleaner.open();

        // open the feed and start stream reading
        var fileReader = new FileReader(tempFile, 'UTF-8');
        var xmlReader = new XMLStreamReader(fileReader);

        var useCaseInsensitivePid = BVHelper.useCaseInsensitivePid();
        var stackNameXML = [];
        var blrProduct = null;

        while (xmlReader.hasNext()) {
            xmlReader.next();
            if (xmlReader.getEventType() === XMLStreamConstants.START_ELEMENT) {
                var tagName = xmlReader.getLocalName();
                stackNameXML.push(tagName);

                // Reset product
                if (tagName === 'Product') {
                    blrProduct = {
                        localeDistribution: []
                    };
                }

                if (isIncludeNamespaceTags(stackNameXML, ['Product', 'ExternalId'])) {
                    var productIdXML = xmlReader.readXMLObject();  // get product ID
                    stackNameXML.pop();
                    var id = productIdXML.toString();
                    var productId = id ? BVHelper.decodeId(id) : null;
                    blrProduct.id = productId;
                } else if (isIncludeNamespaceTags(stackNameXML, ['Product', 'ReviewStatistics', 'LocaleDistribution', 'LocaleDistributionItem'])) {
                    var localeDistributionItemXML = xmlReader.readXMLObject(); // get LocaleDistributionItem
                    stackNameXML.pop();
                    blrProduct.localeDistribution.push(localeDistributionItemXML);
                } else if (isIncludeNamespaceTags(stackNameXML, ['Product', 'ReviewStatistics', 'AverageOverallRating'])) {
                    var averageOverallRatingXML = xmlReader.readXMLObject(); // get AverageOverallRating
                    stackNameXML.pop();
                    blrProduct.averageOverallRating = averageOverallRatingXML.toString();
                } else if (isIncludeNamespaceTags(stackNameXML, ['Product', 'ReviewStatistics', 'TotalReviewCount'])) {
                    var totalReviewCountXML = xmlReader.readXMLObject(); // get TotalReviewCount
                    stackNameXML.pop();
                    blrProduct.totalReviewCount = totalReviewCountXML.toString();
                } else if (isIncludeNamespaceTags(stackNameXML, ['Product', 'ReviewStatistics', 'OverallRatingRange'])) {
                    var overallRatingRangeXML = xmlReader.readXMLObject(); // get OverallRatingRange
                    stackNameXML.pop();
                    blrProduct.overallRatingRange = overallRatingRangeXML.toString();
                }
            } else if (xmlReader.getEventType() === XMLStreamConstants.END_ELEMENT) {
                var openTagName = stackNameXML.pop();
                var closeTagName = xmlReader.getLocalName();

                if (openTagName !== closeTagName) {
                    Logger.error('Error XML file format. Tag <' + openTagName + '> not closed');
                    return new Status(Status.ERROR, 'ERROR', 'Error XML file format. Tag <' + openTagName + '> not closed');
                }

                if (blrProduct && blrProduct.id && closeTagName === 'Product') {
                    var product = ProductMgr.getProduct(blrProduct.id);
                    if (product) { 
                        productRatingCleaner.clean(product);
                        saveRatingToProduct(product, blrProduct, bvLocaleMap);
                    }

                    if (useCaseInsensitivePid) {
                        product = ProductMgr.getProduct(productId.toLowerCase());
                        if (product) { 
                            productRatingCleaner.clean(product);
                            saveRatingToProduct(product, blrProduct, bvLocaleMap);
                        }

                        product = ProductMgr.getProduct(productId.toUpperCase());
                        if (product) { 
                            productRatingCleaner.clean(product);
                            saveRatingToProduct(product, blrProduct, bvLocaleMap);
                        }
                    }
                }
            }
        }

        productRatingCleaner.clean();
        productRatingCleaner.close();
        xmlReader.close();
        fileReader.close();
    } catch (e) {
        productRatingCleaner.close();
        Logger.error('Exception caught: ' + e.message);
        return new Status(Status.ERROR, 'ERROR', e.message);
    }

    return new Status(Status.OK);
};
