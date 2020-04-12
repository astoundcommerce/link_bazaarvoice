'use strict';

const Site = require('dw/system/Site');
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const URLUtils = require('dw/web/URLUtils');
const XMLStreamWriter = require('dw/io/XMLIndentingStreamWriter');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice','XMLHelper.js');
const BV_Constants = require('*/cartridge/scripts/lib/libConstants').getConstants();
const BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
const PurchaseHelper = require('./purchaseHelper');
const LocaleHelper = require('./localeHelper');

let _file, _fileWriter, _xmlStreamWriter;

let defaultLocale = request.getLocale();

/**
 *Function to write file
 * @param {string} filename file name
 * @param {string} localPath path to write file
 * @returns {boolean} flag
 */
function getStreamWriter(filename, localPath) {
    if (_xmlStreamWriter) {
        Logger.debug('Retrieving xml stream writer.');
        return true;
    }

    if (!filename) {
        Logger.error('filename is empty!  Cannot create XMLStreamWriter.');
        return false;
    }

    let filepath = [ File.TEMP, localPath ].join(File.SEPARATOR);
    let filepathFile = new File(filepath);
    filepathFile.mkdirs();
    _file = new File(filepathFile, filename);
    _fileWriter = new FileWriter(_file);
    _xmlStreamWriter = new XMLStreamWriter(_fileWriter);

    return true;
}

/** This function serves to set data for the start of the feed*/
function startProductFeed() {
    let cal = new Calendar();
    let extract = StringUtils.formatCalendar(cal, 'yyyy-MM-dd')
			+ 'T00:00:00.000000';

    _xmlStreamWriter.writeStartDocument('UTF-8', '1.0');
    _xmlStreamWriter.writeCharacters('\n');
    _xmlStreamWriter.writeStartElement('Feed');
    _xmlStreamWriter
        .writeAttribute('xmlns', BV_Constants.XML_NAMESPACE_PRODUCT);
    _xmlStreamWriter.writeAttribute('name', BVHelper.getCustomerName());
    _xmlStreamWriter
        .writeAttribute('incremental', BV_Constants.XML_INCREMENTAL);
    _xmlStreamWriter.writeAttribute('extractDate', extract);
    _xmlStreamWriter.writeAttribute('generator', BV_Constants.XML_GENERATOR);
}


/** This function closes and flushes the feed*/
function finishProductFeed() {
    _xmlStreamWriter.writeEndElement(); //</Feed>
    _xmlStreamWriter.writeEndDocument();

    _xmlStreamWriter.flush();
    _xmlStreamWriter.close();

    _xmlStreamWriter = null;
}

/** This function start purschase feed*/
function startPurchaseFeed() {
    _xmlStreamWriter.writeStartDocument('UTF-8', '1.0');
    _xmlStreamWriter.writeCharacters('\n');
    _xmlStreamWriter.writeStartElement('Feed');
    _xmlStreamWriter.writeAttribute('xmlns',
        BV_Constants.XML_NAMESPACE_PURCHASE);
}


/** This function finish purschase feed*/
function finishPurchaseFeed() {
    _xmlStreamWriter.writeEndElement(); //</Feed>
    _xmlStreamWriter.writeEndDocument();

    _xmlStreamWriter.flush();
    _xmlStreamWriter.close();

    _xmlStreamWriter = null;
}

/**
 * Represents a transition function.
 * 
 * @param {string} endNode - end node from one product.
 * @param {string} startNode - start node for another product.
 */
function transition(endNode, startNode) {
    if (endNode) {
        _xmlStreamWriter.writeEndElement();
    }

    if (startNode) {
        _xmlStreamWriter.writeStartElement(startNode);
    }
}

/**
 * Represents a transition function.
 * 
 * @param {string} item - product item.
 * @param {string} localeMap - set product locale.
 */
function writeProductFeedItem(item, localeMap) {
    let multiLocale = LocaleHelper.isMultiLocale(localeMap);

    switch (item.type) {
        case 'Brands':{
            let brand = item.obj;
            _xmlStreamWriter.writeStartElement('Brand');
            writeElementCDATA('Name', brand.value);
            writeElementCDATA('ExternalId', BVHelper
                .replaceIllegalCharacters(brand.value));
            _xmlStreamWriter.writeEndElement();
        }break;
        

        case 'Categories':{
            let category = item.obj;
            _xmlStreamWriter.writeStartElement('Category');
            writeElement('ExternalId', BVHelper
                .replaceIllegalCharacters(category.ID));

            let parent = category.getParent();
            if (parent != null) {
                //We don't want to set our ParentExternalId to 'root', so make sure the parent of this parent is non-null
                let parentOfParent = parent.getParent();
                if (parentOfParent != null) {
                    writeElement('ParentExternalId', BVHelper
                        .replaceIllegalCharacters(parent.ID));
                }
            }

            writeElementCDATA('Name', category.displayName);
            writeElement('CategoryPageUrl', URLUtils.https('Search-Show', 'cgid',
                category.ID));

            if (multiLocale) {
                let dwLocales = localeMap.keySet();

                _xmlStreamWriter.writeStartElement('CategoryPageUrls');
                for (let i = 0; i < dwLocales.length; i++) {
                    let dwLocale = dwLocales[i];
                    let bvLocale = localeMap.get(dwLocale);
                    request.setLocale(dwLocale);

                    writeLocalizedElement('CategoryPageUrl', bvLocale, URLUtils
                        .https('Search-Show', 'cgid', category.ID));
                }
                _xmlStreamWriter.writeEndElement();

                _xmlStreamWriter.writeStartElement('Names');
                for (let i = 0; i < dwLocales.length; i++) {
                    let dwLocale = dwLocales[i];
                    let bvLocale = localeMap.get(dwLocale);
                    request.setLocale(dwLocale);

                    writeLocalizedElementCDATA('Name', bvLocale,
                        category.displayName);
                }
                _xmlStreamWriter.writeEndElement();
            }

            request.setLocale(defaultLocale);

            _xmlStreamWriter.writeEndElement();
        }break;

        case 'Products':{
            let product = item.obj;
            let enableProductFamilies = Site.getCurrent().getCustomPreferenceValue('bvEnableProductFamilies_C2013');
            if (product.online && product.searchable
				&& (enableProductFamilies || !product.variant)) {
                _xmlStreamWriter.writeStartElement('Product');

                writeElement('ExternalId', BVHelper
                    .replaceIllegalCharacters(product.ID));
                let pname = product.name ? product.name : '';
                writeElementCDATA('Name', pname);
                writeElementCDATA('Description',
                    (product.shortDescription == null ? pname
                        : product.shortDescription));

                if (product.getBrand() != null && product.brand) {
                    writeElementCDATA('BrandExternalId', BVHelper.replaceIllegalCharacters(product.brand));
                }

                let categoryExternalId = BV_Constants.CATEGORY_NONE;
                if (product.primaryCategory != null) {
                    categoryExternalId = product.primaryCategory.ID;
                } else {
                    let allCategories = product.allCategories;
                    if (allCategories.size() > 0) {
                        categoryExternalId = allCategories.iterator().next().ID;
                    }
                }
                writeElement('CategoryExternalId', BVHelper
                    .replaceIllegalCharacters(categoryExternalId));

                writeElement('ProductPageUrl', URLUtils.https('Product-Show',
                    'pid', product.ID));

                let prodImage = BVHelper.getImageURL(product, BV_Constants.PRODUCT);
                let includeImages = false;
                if (prodImage) {
                    writeElement('ImageUrl', prodImage);
                    includeImages = true;
                }

                //Manufacturer Part Number
                if (product.manufacturerSKU != null) {
                    _xmlStreamWriter.writeStartElement('ManufacturerPartNumbers');
                    writeElement('ManufacturerPartNumber', product.manufacturerSKU);
                    _xmlStreamWriter.writeEndElement();
                }

                //European Article Number
                if (product.EAN) {
                    _xmlStreamWriter.writeStartElement('EANs');
                    writeElement('EAN', product.EAN);
                    _xmlStreamWriter.writeEndElement();
                } else if (product.master) {
                    let showEans = false;
                    for (let i = 0; i < product.variants.length; i++) {
                        if (product.variants[i].EAN) {
                            showEans = true;
                            break;
                        }
                    }

                    if (showEans) {
                        _xmlStreamWriter.writeStartElement('EANs');
                        for (let i = 0; i < product.variants.length; i++) {
                            if (product.variants[i].EAN) {
                                writeElement('EAN', product.variants[i].EAN);
                            }
                        }
                        _xmlStreamWriter.writeEndElement();
                    }
                }

                //Universal Product Code
                if (product.UPC) {
                    _xmlStreamWriter.writeStartElement('UPCs');
                    writeElement('UPC', product.UPC);
                    _xmlStreamWriter.writeEndElement();
                } else if (product.master) {
                    let showUpcs = false;
                    for (let i = 0; i < product.variants.length; i++) {
                        if (product.variants[i].UPC) {
                            showUpcs = true;
                            break;
                        }
                    }

                    if (showUpcs) {
                        _xmlStreamWriter.writeStartElement('UPCs');
                        for (let i = 0; i < product.variants.length; i++) {
                            if (product.variants[i].UPC) {
                                writeElement('UPC', product.variants[i].UPC);
                            }
                        }
                        _xmlStreamWriter.writeEndElement();
                    }
                }

                //add product family attributes here for variants and masters,
                //only if Product Families are enabled in libConstants.js
                if (BV_Constants.EnableProductFamilies
					&& (product.master || product.variant)) {
                    _xmlStreamWriter.writeStartElement('Attributes');

                    //use the master ID plus '-family' as the family ID
                    let familyId = product.master ? product.ID
                        : product.letiationModel.master.ID;
                    familyId = BVHelper.replaceIllegalCharacters(familyId
						+ '-family');

                    //write family attribute
                    _xmlStreamWriter.writeStartElement('Attribute');
                    _xmlStreamWriter.writeAttribute('id', 'BV_FE_FAMILY');
                    writeElement('Value', familyId);
                    _xmlStreamWriter.writeEndElement();

                    //write expand attribute
                    _xmlStreamWriter.writeStartElement('Attribute');
                    _xmlStreamWriter.writeAttribute('id', 'BV_FE_EXPAND');
                    writeElement('Value', 'BV_FE_FAMILY:' + familyId);
                    _xmlStreamWriter.writeEndElement();

                    _xmlStreamWriter.writeEndElement();
                }

                if (multiLocale) {
                    let dwLocales = localeMap.keySet();

                    //Localized Names
                    _xmlStreamWriter.writeStartElement('Names');
                    for (let i = 0; i < dwLocales.length; i++) {
                        let dwLocale = dwLocales[i];
                        let bvLocale = localeMap.get(dwLocale);
                        request.setLocale(dwLocale);

                        let lpname = product.name ? product.name : '';
                        writeLocalizedElementCDATA('Name', bvLocale, lpname);
                    }
                    _xmlStreamWriter.writeEndElement();

                    //Localized Descriptions
                    _xmlStreamWriter.writeStartElement('Descriptions');
                    for (let i = 0; i < dwLocales.length; i++) {
                        let dwLocale = dwLocales[i];
                        let bvLocale = localeMap.get(dwLocale);
                        request.setLocale(dwLocale);

                        let lpname = product.name ? product.name : '';
                        writeLocalizedElementCDATA('Description', bvLocale,
                            product.shortDescription ? product.shortDescription
                                : lpname);
                    }
                    _xmlStreamWriter.writeEndElement();

                    //Localized PDP Urls
                    _xmlStreamWriter.writeStartElement('ProductPageUrls');
                    for (let i = 0; i < dwLocales.length; i++) {
                        let dwLocale = dwLocales[i];
                        let bvLocale = localeMap.get(dwLocale);
                        request.setLocale(dwLocale);

                        writeLocalizedElement('ProductPageUrl', bvLocale, URLUtils
                            .https('Product-Show', 'pid', product.ID));
                    }
                    _xmlStreamWriter.writeEndElement();

                    //Localized Image Urls
                    //only attempt this if the default image url was found above.
                    if (includeImages) {
                        _xmlStreamWriter.writeStartElement('ImageUrls');
                        for (let i = 0; i < dwLocales.length; i++) {
                            let dwLocale = dwLocales[i];
                            let bvLocale = localeMap.get(dwLocale);
                            request.setLocale(dwLocale);

                            let _prodImage = BVHelper.getImageURL(product,
                                BV_Constants.PRODUCT);
                            if (_prodImage) {
                                writeLocalizedElement('ImageUrl', bvLocale,_prodImage);
                            }
                        }
                        _xmlStreamWriter.writeEndElement();
                    }
                }

                request.setLocale(defaultLocale);

                _xmlStreamWriter.writeEndElement();
            }
        }break;
    }
}

/**
 * Represents a transition function.
 * 
 * @param {string} order - order object.
 * @param {string} localeMap - set product locale.
 */
function writePurchaseFeedItem(order, localeMap) {
    let multiLocale = LocaleHelper.isMultiLocale(localeMap);
    let bvLocale = null;

    if (multiLocale) {
        bvLocale = localeMap.get(defaultLocale);
        let orderLocale = order.getCustomerLocaleID();

        //if the order is not the default locale, and we have a mapped bv locale for it,
        //then set the locale so we pass the correct product data
        if (!orderLocale.equals(defaultLocale) && bvLocale) {
            request.setLocale(orderLocale);
            Logger.debug(
                'Order has locale: {0}, and is mapped to BV locale: {1}',
                orderLocale, bvLocale);
        }
    }

    let emailAddress = order.getCustomerEmail();
    let userName = order.getCustomerName();
    let userID = order.getCustomerNo();
    let txnDate = PurchaseHelper.getTransactionDate(order);
    let lineItems = order.getAllProductLineItems();

    _xmlStreamWriter.writeStartElement('Interaction');

    writeElement('EmailAddress', emailAddress);
    if (bvLocale !== null) {
        writeElement('Locale', bvLocale);
    }
    if (userName) {
        writeElement('UserName', userName);
    }
    if (userID) {
        writeElement('UserID', userID);
    }
    if (txnDate) {
        writeElement('TransactionDate', txnDate.toISOString());
    }

    _xmlStreamWriter.writeStartElement('Products');
    for (let i = 0; i < lineItems.length; i++) {
        let lineItem = lineItems[i];
        let prod = lineItem.getProduct();
        if (!prod) {
            // Must be a bonus item or something... We wouldn't have included it in the product feed, so no need in soliciting reviews for it
            continue;
        }

        let externalID = BVHelper
            .replaceIllegalCharacters((prod.variant && !BV_Constants.UsevariantID) ? prod.letiationModel.master.ID
                : prod.ID);
        let name = prod.name;
        let price = lineItem.getPriceValue();
        let prodImage = BVHelper.getImageURL(prod, BV_Constants.PURCHASE);

        _xmlStreamWriter.writeStartElement('Product');
        writeElement('ExternalId', externalID);
        if (name) {
            writeElement('Name', name);
        }
        if (price) {
            writeElement('Price', price);
        }
        if (prodImage) {
            writeElement('ImageUrl', prodImage);
        }
        _xmlStreamWriter.writeEndElement(); // </Product>    
    }
    _xmlStreamWriter.writeEndElement(); // </Products>
    _xmlStreamWriter.writeEndElement(); // </Interaction>

    if (request.getLocale() !== defaultLocale) {
        request.setLocale(defaultLocale);
        Logger.debug('restoring locale: ' + defaultLocale);
    }
}


/**
 * Represents a transition function.
 * 
 * @param {string} elementName - product element.
 * @param {string} chars - characters.
 */
function writeElement(elementName, chars) {
    _xmlStreamWriter.writeStartElement(elementName);
    _xmlStreamWriter.writeCharacters(chars);
    _xmlStreamWriter.writeEndElement();
}


/**
 * Represents a writing localized  function.
 * 
 * @param {string} elementName - product element.
 * @param {string} locale - set product locale.
 * @param {string} chars - characters.
 */
function writeLocalizedElement(elementName, locale, chars) {
    _xmlStreamWriter.writeStartElement(elementName);
    _xmlStreamWriter.writeAttribute('locale', locale);
    _xmlStreamWriter.writeCharacters(chars);
    _xmlStreamWriter.writeEndElement();
}


/**
 * Represents a writeElementCDATA function.
 * 
 * @param {string} elementName - product element.
 * @param {string} chars - characters.
 */
function writeElementCDATA(elementName, chars) {
    _xmlStreamWriter.writeStartElement(elementName);
    _xmlStreamWriter.writeCData(chars != null ? chars : '');
    _xmlStreamWriter.writeEndElement();
}

/**
 * Represents a writeLocalizedElementCDATA function.
 * 
 * @param {string} elementName - product element.
 * @param {string} locale - set product locale.
 * @param {string} chars - characters.
 */
function writeLocalizedElementCDATA(elementName, locale, chars) {
    _xmlStreamWriter.writeStartElement(elementName);
    _xmlStreamWriter.writeAttribute('locale', locale);
    _xmlStreamWriter.writeCData(chars != null ? chars : '');
    _xmlStreamWriter.writeEndElement();
}

module.exports = {
    getStreamWriter : getStreamWriter,
    startProductFeed : startProductFeed,
    finishProductFeed : finishProductFeed,
    startPurchaseFeed : startPurchaseFeed,
    finishPurchaseFeed : finishPurchaseFeed,
    transition : transition,
    writeProductFeedItem : writeProductFeedItem,
    writePurchaseFeedItem : writePurchaseFeedItem
};