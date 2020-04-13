'use strict';

const HashMap = require('dw/util/HashMap');
const File = require('dw/io/File');
const FileReader = require('dw/io/FileReader');
const ProductMgr = require('dw/catalog/ProductMgr');
const Status = require('dw/system/Status');
const StringUtils = require('dw/util/StringUtils');
const XMLStreamConstants = require('dw/io/XMLStreamConstants');
const XMLStreamReader = require('dw/io/XMLStreamReader');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'bvRatingImport.js');

const BV_Constants = require('*/cartridge/scripts/lib/libConstants').getConstants();
const BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
const LocaleHelper = require('./util/localeHelper');

module.exports.execute = function(parameters) {
	try {
		//generate a locale map
		//also generate a reverse map of:
		//   BV locale ==> Array of DW locales
		//maps to an Array because multiple DW locales can map to a single BV locale
		var localeMap = LocaleHelper.getLocaleMap('rating');
		var multiLocale = LocaleHelper.isMultiLocale(localeMap);
		var bvLocaleMap = new HashMap();
		if(multiLocale) {
			bvLocaleMap = LocaleHelper.getBVLocaleMap(localeMap);
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
			if (xmlReader.getEventType() == XMLStreamConstants.START_ELEMENT && xmlReader.getLocalName() == 'Product') {
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