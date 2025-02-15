'use strict';

var Site = require('dw/system/Site');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var ProductMgr = require('dw/catalog/ProductMgr');
var CSVStreamWriter = require('dw/io/CSVStreamWriter');
var Logger = require('dw/system/Logger');

var configs = require('*/cartridge/scripts/jobs/util/productCatalogDataConfig').productFeed();
var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

var IsDebug = false;

/**
 * Iterates over all products and generates an XML feed
 * @returns {boolean} the status of the feed
 */
function generateProductFeed() {
    var args = arguments[0];
    IsDebug = args.IsDebug ? args.IsDebug : IsDebug;
    var result = true;
    var fileConfig = {};

    // iterate over all product feed configs
    Object.keys(configs).forEach(function (key) {
        var config = configs[key];
        var dirPath = config.baseDir + config.dirName;
        var baseDir = new File(dirPath);
        if (!baseDir.exists()) {
            baseDir.mkdirs();
        }

        var csvName = dirPath + config.fileName + '-' + Site.current.ID + config.fileExt;
        var csv = new File(csvName);
        if (!csv.exists()) {
            csv.createNewFile();
        }
        var fileWriter = new FileWriter(csv, 'UTF-8');
        var csvWriter = new CSVStreamWriter(fileWriter, config.separator);
        // write header
        csvWriter.writeNext(config.header);

        // save writer and mappings
        fileConfig[key] = {
            id: key,
            attributeMapping: config.attributeMapping,
            fileWriter: fileWriter,
            csvWriter: csvWriter
        };
    });

    var products = ProductMgr.queryAllSiteProducts();
    try {
        var counter = 0;
        while (products.hasNext() && (!IsDebug || counter <= 50)) {
            var product = products.next();
            var productData = BVHelper.getProductData(product);
            if (product.online && productData) {
                productData.locale = Site.current.defaultLocale;
                productData.familyID = product.isVariant() ? product.getMasterProduct().ID : product.ID;
                productData.category = BVHelper.getProductCategoryName(product);
                productData.manufacturerSKU = product.manufacturerSKU;

                productData.ean = '';
                if (productData.eans) {
                    for (var i = 0; i < productData.eans.length; i++) {
                        productData.ean += productData.eans[i];
                        if (i !== (productData.eans.length - 1)) {
                            productData.ean += ',';
                        }
                    }
                }

                productData.upc = '';
                if (productData.upcs) {
                    for (var k = 0; k < productData.upcs.length; k++) {
                        productData.upc += productData.upcs[k];
                        if (k !== (productData.upcs.length - 1)) {
                            productData.upc += ',';
                        }
                    }
                }

                // iterate over file configs
                // eslint-disable-next-line no-loop-func
                Object.keys(fileConfig).forEach(function (key) {
                    var feedConfig = fileConfig[key];
                    var writer = feedConfig.csvWriter;
                    var lineArray = [];
                    // get the required data
                    Object.keys(feedConfig.attributeMapping).forEach(function (attr) {
                        var data = productData[feedConfig.attributeMapping[attr]];
                        lineArray.push(data || '');
                    });
                    writer.writeNext(lineArray);
                });
                counter++;
            }
        }
    } catch (ex) {
        Logger.error('Product feed has failed with the following error: {0}', ex.toString());
        result = false;
    } finally {
        products.close();
        Object.keys(fileConfig).forEach(function (key) {
            if (fileConfig[key].csvWriter) {
                fileConfig[key].csvWriter.close();
            }
            if (fileConfig[key].fileWriter) {
                fileConfig[key].fileWriter.close();
            }
        });
    }

    return result;
}

module.exports = {
    execute: generateProductFeed
};
