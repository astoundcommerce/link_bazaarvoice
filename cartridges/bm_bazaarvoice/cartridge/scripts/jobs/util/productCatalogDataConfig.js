'use strict';

/**
 * Configs object for feeds.
 */

var File = require('dw/io/File');

var configs = Object.create(null);

configs.productFeed = function () {
    return {
        google: {
            separator: '\t',
            dirName: '/src/feeds/temp/',
            baseDir: File.IMPEX,
            fileName: 'bv-product-data',
            fileExt: '.csv',
            header: [
                'Brand',
                'Locale',
                'Product Family ID',
                'Product ID',
                'EAN',
                'UPC',
                'Product Name',
                'Product Description',
                'Product Page URL',
                'Image URL',
                'ManufacturerPartNumbers',
                'Category'
            ],
            attributeMapping: [
                'brandName',
                'locale',
                'familyID',
                'productId',
                'ean',
                'upc',
                'productName',
                'productDescription',
                'productPageURL',
                'productImageURL',
                'manufacturerSKU',
                'category'
            ]
        }
    };
};

module.exports = configs;
