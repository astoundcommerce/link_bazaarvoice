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

module.exports.execute = function() {
    try {
        //generate a locale map
        //also generate a reverse map of:
        //   BV locale ===> Array of DW locales
        //maps to an Array because multiple DW locales can map to a single BV locale
        var localeMap = localeHelper.getLocaleMap('rating');
        var multiLocale = localeHelper.isMultiLocale(localeMap);
        var bvLocaleMap = new HashMap();
        if(multiLocale) {
            bvLocaleMap = localeHelper.getBVLocaleMap(localeMap);
        }
        
        //get the rating feed we just downloaded
        var tempPath = [File.TEMP, 'bv', 'ratings', 'ratings.xml'].join(File.SEPARATOR);
        var tempFile = new File(tempPath);
        if(!tempFile.exists()) {
            throw new Error('TEMP/bv/ratings/ratings.xml does not exist!');
        }
        
        //open the feed and start stream reading
        var fileReader = new FileReader(tempFile, 'UTF-8');
        var xmlReader = new XMLStreamReader(fileReader);
        
        while(xmlReader.hasNext()) {
            xmlReader.next();
            if (xmlReader.getEventType() === XMLStreamConstants.START_ELEMENT && xmlReader.getLocalName() === 'Product') {
                var productXML = xmlReader.readXMLObject();
                var bvAverageRating = '';
                var bvReviewCount = '';
                var bvRatingRange = '';
                var ns = productXML.namespace();
                var id = productXML.ns::ExternalId.toString();
                var product = id ? ProductMgr.getProduct(BVHelper.decodeId(id)) : null;
                if(product) {
                    if(multiLocale) {
                        
                        var localeItemList = productXML.ns::ReviewStatistics.ns::LocaleDistribution.ns::LocaleDistributionItem;
                        if(localeItemList && localeItemList.length() > 0) {
                            for(var i = 0; i < localeItemList.length(); i++) {
                                var localeItem = localeItemList[i];
                                
                                var bvLocale = localeItem.ns::DisplayLocale.toString();
                                if(bvLocale) {
                                    
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
                                    if(dwLocales && dwLocales != null){
                                        for(var j = 0; j < dwLocales.length; j++) {
                                            var dwLocale = dwLocales[j];
                                            request.setLocale(dwLocale);
                                            product.custom.bvAverageRating = bvAverageRating;
                                            product.custom.bvReviewCount = bvReviewCount;
                                            product.custom.bvRatingRange = bvRatingRange;
                                        }
                                    }
                                }
                            }
                        }
                        
                    } else {
                        
                        if (!empty(productXML.ns::ReviewStatistics.ns::AverageOverallRating.toString())) {
                            bvAverageRating = productXML.ns::ReviewStatistics.ns::AverageOverallRating.toString();
                        }
                        if (!empty(productXML.ns::ReviewStatistics.ns::TotalReviewCount.toString())) {
                            bvReviewCount = productXML.ns::ReviewStatistics.ns::TotalReviewCount.toString();
                        }
                        if (!empty(productXML.ns::ReviewStatistics.ns::OverallRatingRange.toString())) {
                            bvRatingRange = productXML.ns::ReviewStatistics.ns::OverallRatingRange.toString();
                        }
                        
                        product.custom.bvAverageRating = bvAverageRating;
                        product.custom.bvReviewCount = bvReviewCount;
                        product.custom.bvRatingRange = bvRatingRange;
                    }
                }
            }
        }
        
        xmlReader.close();
        fileReader.close();
        
    } catch(e) {
        Logger.error('Exception caught: ' + e.message);
        return new Status(Status.ERROR, 'ERROR', e.message);
    }
    
    return new Status(Status.OK);
};