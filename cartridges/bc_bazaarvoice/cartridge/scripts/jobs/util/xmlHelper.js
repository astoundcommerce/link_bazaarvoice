'use strict';

var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var URLUtils = require('dw/web/URLUtils');
var XMLStreamWriter = require('dw/io/XMLIndentingStreamWriter');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'XMLHelper.js');

var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();
var PurchaseHelper = require('./purchaseHelper');
var LocaleHelper = require('./localeHelper');

var file;
var fileWriter;
var xmlStreamWriter;

var defaultLocale = request.getLocale();
/**
 *Function to write file
 * @param {string} filename file name
 * @param {string} localPath path to write file
 * @returns {boolean} flag
 */
function getStreamWriter(filename, localPath) {
    if (xmlStreamWriter) {
        Logger.debug('Retrieving xml stream writer.');
        return true;
    }

    if (!filename) {
        Logger.error('filename is empty!  Cannot create XMLStreamWriter.');
        return false;
    }

    var filepath = [File.TEMP, localPath].join(File.SEPARATOR);
    var filepathFile = new File(filepath);
    filepathFile.mkdirs();
    file = new File(filepathFile, filename);
    fileWriter = new FileWriter(file);
    xmlStreamWriter = new XMLStreamWriter(fileWriter);

    return true;
}
/** This function serves to set data for the start of the feed */
function startProductFeed() {
    var cal = new Calendar();
    var extract = StringUtils.formatCalendar(cal, 'yyyy-MM-dd') + 'T00:00:00.000000';

    xmlStreamWriter.writeStartDocument('UTF-8', '1.0');
    xmlStreamWriter.writeCharacters('\n');
    xmlStreamWriter.writeStartElement('Feed');
    xmlStreamWriter.writeAttribute('xmlns', bvConstants.XML_NAMESPACE_PRODUCT);
    xmlStreamWriter.writeAttribute('name', BVHelper.getCustomerName());
    xmlStreamWriter.writeAttribute('incremental', bvConstants.XML_INCREMENTAL);
    xmlStreamWriter.writeAttribute('extractDate', extract);
    xmlStreamWriter.writeAttribute('generator', bvConstants.XML_GENERATOR);
}
/** This function closes and flushes the feed */
function finishProductFeed() {
    xmlStreamWriter.writeEndElement(); // </Feed>
    xmlStreamWriter.writeEndDocument();

    xmlStreamWriter.flush();
    xmlStreamWriter.close();

    xmlStreamWriter = null;
}
/** This function start purschase feed */
function startPurchaseFeed() {
    xmlStreamWriter.writeStartDocument('UTF-8', '1.0');
    xmlStreamWriter.writeCharacters('\n');
    xmlStreamWriter.writeStartElement('Feed');
    xmlStreamWriter.writeAttribute('xmlns', bvConstants.XML_NAMESPACE_PURCHASE);
}
/** This function finish purschase feed */
function finishPurchaseFeed() {
    xmlStreamWriter.writeEndElement(); // </Feed>
    xmlStreamWriter.writeEndDocument();

    xmlStreamWriter.flush();
    xmlStreamWriter.close();

    xmlStreamWriter = null;
}
/**
 * Represents a transition function.
 *
 * @param {string} endNode - end node from one product.
 * @param {string} startNode - start node for another product.
 */
function transition(endNode, startNode) {
    if (endNode) {
        xmlStreamWriter.writeEndElement();
    }

    if (startNode) {
        xmlStreamWriter.writeStartElement(startNode);
    }
}
/**
 * Represents a transition function.
 *
 * @param {string} elementName - product element.
 * @param {string} chars - characters.
 */
function writeElement(elementName, chars) {
    xmlStreamWriter.writeStartElement(elementName);
    xmlStreamWriter.writeCharacters(chars);
    xmlStreamWriter.writeEndElement();
}
/**
 * Represents a writing localized  function.
 *
 * @param {string} elementName - product element.
 * @param {string} locale - set product locale.
 * @param {string} chars - characters.
 */
function writeLocalizedElement(elementName, locale, chars) {
    xmlStreamWriter.writeStartElement(elementName);
    xmlStreamWriter.writeAttribute('locale', locale);
    xmlStreamWriter.writeCharacters(chars);
    xmlStreamWriter.writeEndElement();
}
/**
 * Represents a writeElementCDATA function.
 *
 * @param {string} elementName - product element.
 * @param {string} chars - characters.
 */
function writeElementCDATA(elementName, chars) {
    xmlStreamWriter.writeStartElement(elementName);
    xmlStreamWriter.writeCData(chars != null ? chars : '');
    xmlStreamWriter.writeEndElement();
}
/**
 * Represents a writeLocalizedElementCDATA function.
 *
 * @param {string} elementName - product element.
 * @param {string} locale - set product locale.
 * @param {string} chars - characters.
 */
function writeLocalizedElementCDATA(elementName, locale, chars) {
    xmlStreamWriter.writeStartElement(elementName);
    xmlStreamWriter.writeAttribute('locale', locale);
    xmlStreamWriter.writeCData(chars != null ? chars : '');
    xmlStreamWriter.writeEndElement();
}
/**
 * Represents a transition function.
 *
 * @param {string} item - product item.
 * @param {string} localeMap - set product locale.
 */
function writeProductFeedItem(item, localeMap) {
    var multiLocale = LocaleHelper.isMultiLocale(localeMap);
    var dwLocales;
    var dwLocale;
    var bvLocale;
    var prodImage;

    switch (item.type) {
        case 'Brands':
            var brand = item.obj;
            xmlStreamWriter.writeStartElement('Brand');
            writeElementCDATA('Name', brand.value);
            writeElementCDATA('ExternalId', BVHelper.replaceIllegalCharacters(brand.value));
            xmlStreamWriter.writeEndElement();
            break;


        case 'Categories':
            var category = item.obj;
            xmlStreamWriter.writeStartElement('Category');
            writeElement('ExternalId', BVHelper.replaceIllegalCharacters(category.ID));

            var parent = category.getParent();
            if (parent != null) {
                // We don't want to set our ParentExternalId to 'root', so make sure the parent of this parent is non-null
                var parentOfParent = parent.getParent();
                if (parentOfParent != null) {
                    writeElement('ParentExternalId', BVHelper.replaceIllegalCharacters(parent.ID));
                }
            }

            writeElementCDATA('Name', category.displayName);
            writeElement('CategoryPageUrl', URLUtils.https('Search-Show', 'cgid', category.ID));

            if (multiLocale) {
                dwLocales = localeMap.keySet();

                xmlStreamWriter.writeStartElement('CategoryPageUrls');
                for (var count = 0; count < dwLocales.length; count++) {
                    dwLocale = dwLocales[count];
                    bvLocale = localeMap.get(dwLocale);
                    request.setLocale(dwLocale);

                    writeLocalizedElement('CategoryPageUrl', bvLocale, URLUtils.https('Search-Show', 'cgid', category.ID));
                }
                xmlStreamWriter.writeEndElement();

                xmlStreamWriter.writeStartElement('Names');
                for (var j = 0; j < dwLocales.length; j++) {
                    dwLocale = dwLocales[j];
                    bvLocale = localeMap.get(dwLocale);
                    request.setLocale(dwLocale);

                    writeLocalizedElementCDATA('Name', bvLocale, category.displayName);
                }
                xmlStreamWriter.writeEndElement();
            }

            request.setLocale(defaultLocale);

            xmlStreamWriter.writeEndElement();
            break;


        case 'Products':
            var product = item.obj;
            if (product.online && product.searchable && (bvConstants.EnableProductFamilies || !product.variant)) {
                xmlStreamWriter.writeStartElement('Product');

                writeElement('ExternalId', BVHelper.replaceIllegalCharacters(product.ID));
                var pname = !empty(product.name) ? product.name : '';
                writeElementCDATA('Name', pname);
                writeElementCDATA('Description', (product.shortDescription == null ? pname : product.shortDescription));

                if (product.getBrand() != null && !empty(product.brand)) {
                    writeElementCDATA('BrandExternalId', BVHelper.replaceIllegalCharacters(product.brand));
                }

                var categoryExternalId = bvConstants.CATEGORY_NONE;
                if (product.primaryCategory != null) {
                    categoryExternalId = product.primaryCategory.ID;
                } else {
                    var allCategories = product.allCategories;
                    if (allCategories.size() > 0) {
                        categoryExternalId = allCategories.iterator().next().ID;
                    }
                }
                writeElement('CategoryExternalId', BVHelper.replaceIllegalCharacters(categoryExternalId));

                writeElement('ProductPageUrl', URLUtils.https('Product-Show', 'pid', product.ID));

                prodImage = BVHelper.getImageURL(product, bvConstants.PRODUCT);
                var includeImages = false;
                if (!empty(prodImage)) {
                    writeElement('ImageUrl', prodImage);
                    includeImages = true;
                }

                // Manufacturer Part Number
                if (product.manufacturerSKU != null) {
                    xmlStreamWriter.writeStartElement('ManufacturerPartNumbers');
                    writeElement('ManufacturerPartNumber', product.manufacturerSKU);
                    xmlStreamWriter.writeEndElement();
                }

                // European Article Number
                if (product.EAN != null && !empty(product.EAN)) {
                    xmlStreamWriter.writeStartElement('EANs');
                    writeElement('EAN', product.EAN);
                    xmlStreamWriter.writeEndElement();
                } else if (product.master) {
                    var showEans = false;
                    for (var a = 0; a < product.variants.length; a++) {
                        if (!empty(product.variants[a].EAN)) {
                            showEans = true;
                            break;
                        }
                    }

                    if (showEans) {
                        xmlStreamWriter.writeStartElement('EANs');
                        for (var b = 0; b < product.variants.length; b++) {
                            if (!empty(product.variants[b].EAN)) {
                                writeElement('EAN', product.variants[b].EAN);
                            }
                        }
                        xmlStreamWriter.writeEndElement();
                    }
                }

                // Universal Product Code
                if (product.UPC != null && !empty(product.UPC)) {
                    xmlStreamWriter.writeStartElement('UPCs');
                    writeElement('UPC', product.UPC);
                    xmlStreamWriter.writeEndElement();
                } else if (product.master) {
                    var showUpcs = false;
                    for (var k = 0; k < product.variants.length; k++) {
                        if (!empty(product.variants[k].UPC)) {
                            showUpcs = true;
                            break;
                        }
                    }

                    if (showUpcs) {
                        xmlStreamWriter.writeStartElement('UPCs');
                        for (var c = 0; c < product.variants.length; c++) {
                            if (!empty(product.variants[c].UPC)) {
                                writeElement('UPC', product.variants[c].UPC);
                            }
                        }
                        xmlStreamWriter.writeEndElement();
                    }
                }

                // add product family attributes here for variants and masters,
                // only if Product Families are enabled in libConstants.ds
                if (bvConstants.EnableProductFamilies && (product.master || product.variant)) {
                    xmlStreamWriter.writeStartElement('Attributes');

                    // use the master ID plus '-family' as the family ID
                    var familyId = product.master ? product.ID : product.variationModel.master.ID;
                    familyId = BVHelper.replaceIllegalCharacters(familyId + '-family');

                    // write family attribute
                    xmlStreamWriter.writeStartElement('Attribute');
                    xmlStreamWriter.writeAttribute('id', 'BV_FE_FAMILY');
                    writeElement('Value', familyId);
                    xmlStreamWriter.writeEndElement();

                    // write expand attribute
                    xmlStreamWriter.writeStartElement('Attribute');
                    xmlStreamWriter.writeAttribute('id', 'BV_FE_EXPAND');
                    writeElement('Value', 'BV_FE_FAMILY:' + familyId);
                    xmlStreamWriter.writeEndElement();

                    xmlStreamWriter.writeEndElement();
                }


                if (multiLocale) {
                    dwLocales = localeMap.keySet();

                    // Localized Names
                    xmlStreamWriter.writeStartElement('Names');
                    for (var f = 0; f < dwLocales.length; f++) {
                        dwLocale = dwLocales[f];
                        bvLocale = localeMap.get(dwLocale);
                        request.setLocale(dwLocale);

                        var prdName = !empty(product.name) ? product.name : '';
                        writeLocalizedElementCDATA('Name', bvLocale, prdName);
                    }
                    xmlStreamWriter.writeEndElement();

                    // Localized Descriptions
                    xmlStreamWriter.writeStartElement('Descriptions');
                    for (var d = 0; d < dwLocales.length; d++) {
                        dwLocale = dwLocales[d];
                        bvLocale = localeMap.get(dwLocale);
                        request.setLocale(dwLocale);

                        var lpname = !empty(product.name) ? product.name : '';
                        writeLocalizedElementCDATA('Description', bvLocale, product.shortDescription ? product.shortDescription : lpname);
                    }
                    xmlStreamWriter.writeEndElement();

                    // Localized PDP Urls
                    xmlStreamWriter.writeStartElement('ProductPageUrls');
                    for (var e = 0; e < dwLocales.length; e++) {
                        dwLocale = dwLocales[e];
                        bvLocale = localeMap.get(dwLocale);
                        request.setLocale(dwLocale);

                        writeLocalizedElement('ProductPageUrl', bvLocale, URLUtils.https('Product-Show', 'pid', product.ID));
                    }
                    xmlStreamWriter.writeEndElement();

                    // Localized Image Urls
                    // only attempt this if the default image url was found above.
                    if (includeImages) {
                        xmlStreamWriter.writeStartElement('ImageUrls');
                        for (var i = 0; i < dwLocales.length; i++) {
                            dwLocale = dwLocales[i];
                            bvLocale = localeMap.get(dwLocale);
                            request.setLocale(dwLocale);

                            prodImage = BVHelper.getImageURL(product, bvConstants.PRODUCT);
                            if (!empty(prodImage)) {
                                writeLocalizedElement('ImageUrl', bvLocale, prodImage);
                            }
                        }
                        xmlStreamWriter.writeEndElement();
                    }
                }

                request.setLocale(defaultLocale);

                xmlStreamWriter.writeEndElement();
            }
            break;
        default:
            break;
    }
}
/**
 * Represents a transition function.
 *
 * @param {string} order - order object.
 * @param {string} localeMap - set product locale.
 */
function writePurchaseFeedItem(order, localeMap) {
    var multiLocale = LocaleHelper.isMultiLocale(localeMap);
    var bvLocale = null;

    if (multiLocale) {
        bvLocale = localeMap.get(defaultLocale);
        var orderLocale = order.getCustomerLocaleID();

        // if the order is not the default locale, and we have a mapped bv locale for it,
        // then set the locale so we pass the correct product data
        if (!orderLocale.equals(defaultLocale) && bvLocale) {
            request.setLocale(orderLocale);
            Logger.debug('Order has locale: {0}, and is mapped to BV locale: {1}', orderLocale, bvLocale);
        }
    }

    var emailAddress = order.getCustomerEmail();
    var userName = order.getCustomerName();
    var userID = order.getCustomerNo();
    var txnDate = PurchaseHelper.getTransactionDate(order);
    var lineItems = order.getAllProductLineItems();

    xmlStreamWriter.writeStartElement('Interaction');

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

    xmlStreamWriter.writeStartElement('Products');
    for (var i = 0; i < lineItems.length; i++) {
        var lineItem = lineItems[i];
        var prod = lineItem.getProduct();
        if (!prod) {
            // Must be a bonus item or something... We wouldn't have included it in the product feed, so no need in soliciting reviews for it
            // eslint-disable-next-line no-continue
            continue;
        }

        var externalID = BVHelper.replaceIllegalCharacters((prod.variant && !bvConstants.UseVariantID) ? prod.variationModel.master.ID : prod.ID);
        var name = prod.name;
        var price = lineItem.getPriceValue();
        var prodImage = BVHelper.getImageURL(prod, bvConstants.PURCHASE);

        xmlStreamWriter.writeStartElement('Product');
        writeElement('ExternalId', externalID);
        if (name) {
            writeElement('Name', name);
        }
        if (price) {
            writeElement('Price', price);
        }
        if (!empty(prodImage)) {
            writeElement('ImageUrl', prodImage);
        }
        xmlStreamWriter.writeEndElement(); // </Product>
    }
    xmlStreamWriter.writeEndElement(); // </Products>
    xmlStreamWriter.writeEndElement(); // </Interaction>

    if (request.getLocale() !== defaultLocale) {
        request.setLocale(defaultLocale);
        Logger.debug('restoring locale: ' + defaultLocale);
    }
}


module.exports = {
    getStreamWriter: getStreamWriter,
    startProductFeed: startProductFeed,
    finishProductFeed: finishProductFeed,
    startPurchaseFeed: startPurchaseFeed,
    finishPurchaseFeed: finishPurchaseFeed,
    transition: transition,
    writeProductFeedItem: writeProductFeedItem,
    writePurchaseFeedItem: writePurchaseFeedItem
};
