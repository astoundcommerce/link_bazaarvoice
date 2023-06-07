'use strict';
/**
 *
 * A library file for BazaarVoice communication.
 *
 */
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'libBazaarvoice');

var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();

exports.getBazaarVoiceHelper = function () {
    /** *****************************************************************************************************************
    *  getImageURL()
    * @param {Object} product  product object
    * @param {string} feed type of feed
    * @returns {string} imgUrl
    *    Returns a product image url for use in the product and purchase feeds.  By default,
    *    the custom site preferences for image type is used to get the url: e.g. large, medium, small.
    *    If no image is found, the medium image is used.  If no medium image is found, an empty string is returned.
    *
    *    feed parameter is either "PRODUCT" or "PURCHASE", defaults to PRODUCT.
    *
    *    If you do not use the standard DW product images (scene7, SITS, etc.), you must customize this function!
    *******************************************************************************************************************/
    var getImageURL = function (product, feed) {
        var IMAGE_SIZE = '';
        var imgURL = '';

        if (feed.equals(bvConstants.PURCHASE)) {
            if (Site.getCurrent().getCustomPreferenceValue('bvOrderImageType') !== null) {
                IMAGE_SIZE = Site.getCurrent().getCustomPreferenceValue('bvOrderImageType').toString();
            }
        } else if (Site.getCurrent().getCustomPreferenceValue('bvProductImageType') !== null) {
            IMAGE_SIZE = Site.getCurrent().getCustomPreferenceValue('bvProductImageType').toString();
        }

        if (IMAGE_SIZE && product.getImage(IMAGE_SIZE)) {
            imgURL = product.getImage(IMAGE_SIZE).getHttpsURL();
        } else if (product.getImage(bvConstants.BV_DEFAULTIMAGETYPE)) {
            imgURL = product.getImage(bvConstants.BV_DEFAULTIMAGETYPE).getHttpsURL();
        }

        return encodeURI(imgURL);
    };
    /**
     * This function used to get environment
     * @returns {string} env Enviorment Value
     */
    var getEnvironment = function () {
        var env = Site.getCurrent().getCustomPreferenceValue('bvEnvironment');
        if (!env || !env.value) {
            Logger.error('bvEnvironment is null or empty!');
            return '';
        }
        return env.value;
    };

    /**
     * Gets the value of custom preference 'bvCustomerName'
     * @returns {string} The value of 'bvCustomerName' or '' if empty
     */
    var getCustomerName = function () {
        var name = '';
        if (Site.getCurrent().getCustomPreferenceValue('bvCustomerName') !== null) {
            name = Site.getCurrent().getCustomPreferenceValue('bvCustomerName').toString();
        }
        return name;
    };

    var getDeploymentZone = function () {
        var zone = '';
        if (Site.getCurrent().getCustomPreferenceValue('bvDeploymentZone') !== null) {
            zone = Site.getCurrent().getCustomPreferenceValue('bvDeploymentZone').toString();
        }
        return zone;
    };

    /**
     * Constructs the feed name based on 'bvCustomerName' preference
     * @returns {string} The ratings feed name
     */
    var getRatingsFeedName = function () {
        var fname = bvConstants.RatingsFeedFilename;
        if (Site.getCurrent().getCustomPreferenceValue('bvCustomerName') !== null) {
            fname = bvConstants.RatingsFeedPrefix + '_' + Site.getCurrent().getCustomPreferenceValue('bvCustomerName').toString().toLowerCase() + '_' + bvConstants.RatingsFeedFilename;
        }
        return fname;
    };

    /*
     * Globally replaces '&' with '_and_' in the given string
     */
    var replaceIllegalCharacters = function (rawId) {
        return rawId.replace('&', '_and_', 'g').replace('/', '_fslash_', 'g').replace(' ', '-', 'g');
    };

    /*
     * Globally replaces '_and_' with '&' in the given string
     */
    var decodeId = function (id) {
        return id.replace('_and_', '&', 'g').replace('_fslash_', '/', 'g');
    };

    /*
     * Gets the local and deployment zone from custom preference 'bvLocaleMapping'
     */
    var getDisplayData = function () {
        var currentLocale = request.locale;
        var defaultLocale = Site.getCurrent().getDefaultLocale();
        var isCurrentDefault = currentLocale.equals(defaultLocale);
        var allowedLocales = Site.getCurrent().allowedLocales;

        var bvzone = '';
        var bvlocale = '';
        var item;
        var a;
        var map = Site.getCurrent().getCustomPreferenceValue('bvLocaleMapping');

        if (map.length > 1) {
            var index = 0;
            for (var i = 0; i < map.length; i++) {
                item = map[i];
                item = item.replace(/^[\s]+|["]|[\s]+$/g, '');

                if (bvConstants.regFull.test(item) && isCurrentDefault) {
                    bvlocale = item;
                    break;
                } else if (bvConstants.regPair.test(item)) {
                    a = item.split(':');
                    a[0] = a[0].replace(/^[\s]+|[\s]+$/g, '');
                    a[1] = a[1].replace(/^[\s]+|[\s]+$/g, '');

                    if (allowedLocales.indexOf(a[0]) !== -1) {
                        if (a[0] === currentLocale) {
                            bvlocale = a[1];
                            if (bvlocale.indexOf('/') !== -1) {
                                var b = bvlocale.split('/');
                                bvzone = decodeURI(b[0]);
                                bvlocale = b[1];
                            }
                            break;
                        }
                    } else {
                        Logger.warn('Site Preference bvLocaleMapping has inactive locale ' + a[0]);
                    }
                }

                if (index === map.length - 1) {
                    Logger.warn('Site Preference bvLocaleMapping has no match setting for ' + currentLocale);
                }
                index++;
            }
        } else if (map.length === 1) {
            item = map[0];
            item = item.replace(/^[\s]+|["]|[\s]+$/g, '');

            if (bvConstants.regFull.test(item)) {
                // there is only one display code, so it doesnt matter what dw locale we are on
                bvlocale = item;
            } else if (bvConstants.regPair.test(item)) {
                a = item.split(':');
                a[0] = a[0].replace(/^[\s]+|[\s]+$/g, '');
                a[1] = a[1].replace(/^[\s]+|[\s]+$/g, '');

                if (allowedLocales.indexOf(a[0]) !== -1) {
                    if (a[0] === currentLocale) {
                        bvlocale = a[1];
                    } else {
                        Logger.warn('Site Preference bvLocaleMapping has no input for' + currentLocale);
                    }
                } else {
                    Logger.warn('Site Preference bvLocaleMapping has inactive locale ' + currentLocale);
                }
            } else {
                Logger.warn('Site Preference bvLocaleMapping has invalid format for' + currentLocale);
            }
        } else {
            Logger.error('Site Preference bvLocaleMapping requires at least one setting');
        }

        // Deployment Zone was not overridden in the locale mapping, so grab it from the preference
        // If no DZ is defined, default to 'Main Site'
        if (!bvzone) {
            bvzone = Site.getCurrent().getCustomPreferenceValue('bvDeploymentZone');
            if (!bvzone) {
                Logger.warn('Site Preference bvDeploymentZone is null or empty!. Using "Main Site".');
                bvzone = bvConstants.DEFAULT_ZONE;
            }
        }

        return { zone: bvzone, locale: bvlocale };
    };

    /*
     * Gets the URL of the bv,js script based on the following format:
     * "https://apps.bazaarvoice.com/deployments/<client_name>/<site_ID>/<environment>/<locale>/bv.js"
     */
    var getBvLoaderUrl = function () {
        var client = Site.getCurrent().getCustomPreferenceValue('bvCustomerName');
        if (!client) {
            Logger.error('Site Preference bvCustomerName is null or empty!');
        }
        var bvdisplay = getDisplayData();
        var zoneId = bvdisplay.zone.toLowerCase().replace(' ', '_', 'g');
        var env = getEnvironment().toLowerCase();
        var host = bvConstants.BVLoaderHost;

        return '//' + host + '/deployments/' + client + '/' + zoneId + '/' + env + '/' + bvdisplay.locale + '/bv.js';
    };

    /*
     * Gets the URL of the bvapi.js script based on the following format:
     * "https://apps.bazaarvoice.com/static/<client_name>/<site_ID>/<environment>/<locale>/bv.js"
     */
    var getBvApiHostUrl = function () {
        var client = Site.getCurrent().getCustomPreferenceValue('bvCustomerName');
        if (!client) {
            Logger.error('Site Preference bvCustomerName is null or empty!');
            client = 'CLIENTNAME';
        }

        var bvdisplay = getDisplayData();

        var env = getEnvironment();
        var host = bvConstants.APIHostStaging;
        if (env && env.toLowerCase() === 'production') {
            host = bvConstants.APIHostProduction;
        }

        return '//' + host + '/static/' + client + '/' + encodeURI(bvdisplay.zone) + '/' + bvdisplay.locale + '/bvapi.js';
    };

    /*
     * Sets the value of the session.privacy.bvreveal session variable
     */
    var setBvReveal = function () {
        session.privacy.bvreveal = request.httpParameterMap.bvreveal.submitted ? request.httpParameterMap.bvreveal.stringValue : '';
    };

    /*
     * Gets the value of the 'bvEnableProductPrefix' custom preference
     */
    var isProductPrefixEnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableProductPrefix');
    };

    /*
     * Gets the value of the 'bvEnableFamilyPrefix' custom preference
     */
    var isFamilyPrefixEnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableFamilyPrefix');
    };

    /*
     * Gets a prefix in the form of <site-id>-<product-id>
     */
    var addPrefixPid = function (pid) {
        if (isProductPrefixEnabled()) {
            return Site.current.ID + '-' + pid;
        }
        return pid;
    };

    /*
     * Gets a family prefix in the form of <site-id>-<product-id>
     */
    var addFamilyPrefix = function (pid) {
        if (isFamilyPrefixEnabled()) {
            return Site.current.ID + '-' + pid;
        }
        return pid;
    };

    // Entity ID to collect reviews. Master (in case of non-product families) /variant ID (in the case of product families),
    var getEntityId = function () {
        return Site.getCurrent().getCustomPreferenceValue('bvEntityId');
    };

    /*
     * Sets the value of the session.privacy.BVSEO_PID variable
     */
    var setProductId = function (product) {
        var pid = '';
        if (product !== null) {
            pid = (product.variant && !bvConstants.UseVariantID) ? product.variationModel.master.ID : product.ID;
            var entityId = getEntityId();
            if (entityId === 'master' && product.variant) {
                pid = product.variationModel.master.ID;
            }
        }

        pid = addPrefixPid(pid);
        session.privacy.BVSEO_PID = pid;
        return pid;
    };

    /*
     * Sets the value of the session.privacy.BVSEO_PID session variable
     */
    var getProductId = function () {
        return session.privacy.BVSEO_PID || '';
    };

    // BV Product Types to exclude from transactions. (pixel / post purchase feeds / catalog)
    var isProductTypeExcluded = function (product) {
        var isProductExcluded = false;
        var bvProductTypes = Site.getCurrent().getCustomPreferenceValue('bvProductTypes');
        if ('bvProductType' in product.custom && !empty(product.custom.bvProductType)
                && bvProductTypes && bvProductTypes.length > 0) {
            for (var i = 0; i <= bvProductTypes.length; i++) {
                if (product.custom.bvProductType === bvProductTypes[i]) {
                    isProductExcluded = true;
                    break;
                }
            }
        }
        return isProductExcluded;
    };

    /*
     * Gets the value of the 'bvEnableRR' custom preference
     */
    var isRREnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableRR');
    };

    /*
     * Gets the value of the 'bvEnableAA' custom preference
     */
    var isQAEnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableAA');
    };

    /*
     * Gets the value of the 'bvEnableCategoryPrefix' custom preference
     */
    var isCategoryPrefixEnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableCategoryPrefix');
    };

    // Aggregate Attributes for Syndication
    var isAggregateAttrEnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvAggregateAttributes');
    };

    /*
     * Gets the value of the 'bvEnableProductFamilies' custom preference
     */
    var isProductFamiliesEnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableProductFamilies');
    };

    /*
     * Gets the value of the 'bvEnableFormattingFamilies' custom preference
     */
    var isFormattingFamiliesEnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableFormattingFamilies');
    };

    /*
     * Gets the description for a product by first checking if the long description
     * is available and falling back to the short description of necessary
     */
    var getDescription = function (product) {
        var description = product.getLongDescription();

        if (empty(description)) {
            description = (product.isVariant() ? product.getMasterProduct().getLongDescription() : '');
        }

        // if still empty then fall back to short
        if (empty(description)) {
            description = product.getShortDescription();

            if (empty(description)) {
                description = (product.isVariant() ? product.getMasterProduct().getShortDescription() : '');
            }
        }

        return description.toString().replace(/<\/?.+?>/ig, '');
    };

    /*
     * Gets a prefix in the form of <site-id>-<category-id>
     */
    var addPrefixCgid = function (cgid) {
        if (isCategoryPrefixEnabled()) {
            return Site.current.ID + '-' + cgid;
        }
        return cgid;
    };

    /*
     * Gets a prefix in the form of <site-name>-<name>
     */
    var addPrefixCategoryName = function (name) {
        if (isCategoryPrefixEnabled()) {
            return Site.current.name + ' - ' + name;
        }
        return name;
    };

    /*
     *
     */
    var getCategoryPath = function (cgid, product, path) {
        var category;
        if (product) {
            category = product.variant
                ? product.masterProduct.primaryCategory
                : product.primaryCategory;
        } else if (cgid) {
            var CatalogMgr = require('dw/catalog/CatalogMgr');
            category = CatalogMgr.getCategory(cgid);
        }
        if (category) {
            path.push({
                id: addPrefixCgid(category.ID),
                Name: addPrefixCategoryName(category.displayName)
            });

            if (category.parent && category.parent.ID !== 'root') {
                return getCategoryPath(category.parent.ID, null, path);
            }
        }
        return path;
    };

    /*
     * Gets the name of the product's category.  If the product is a variant
     * this returns its master product's category, or else the product's promary category
     */
    var getProductCategoryName = function (product) {
        var category = product.variant
                ? product.masterProduct.primaryCategory
                : product.primaryCategory;
        return addPrefixCategoryName(category ? category.displayName : '');
    };

    /*
     * Gets the relevant product data that is needed for the BV catalog feed
     */
    var getProductData = function (product) {
        var productData = {};
        var masterProduct;

        productData.productId = addPrefixPid(product.ID);
        productData.productName = product.name;
        productData.productDescription = getDescription(product);
        var productImage = product.getImage(bvConstants.BV_DEFAULTIMAGETYPE);
        productData.productImageURL = productImage ? productImage.getHttpsURL().toString() : '';
        productData.productPageURL = dw.web.URLUtils.http('Product-Show', 'pid', product.ID).toString();
        if (product.brand) {
            productData.brandName = product.brand;
        }

        if (product.manufacturerSKU) {
            productData.manufacturerPartNumbers = [product.manufacturerSKU];
        }

        productData.categoryPath = getCategoryPath(null, product, []);

        if (isCategoryPrefixEnabled()) {
            productData.categoryPath.push({
                id: Site.current.ID,
                Name: Site.current.name
            });
        }
        productData.categoryPath.reverse();

        if (isProductFamiliesEnabled()) {
            if (!isFormattingFamiliesEnabled()) {
                productData.family = product.isVariant() ? addFamilyPrefix(product.getMasterProduct().ID) : addFamilyPrefix(product.ID);
            } else {
                if (product.master || product.variationGroup) {
                    productData.families = {
                        id: addPrefixPid(product.ID),
                        expand: true,
                        members: []
                    };
                    for (var i = 0; i < product.variants.length; i++) {
                        productData.families.members.push(addPrefixPid(product.variants[i].ID));
                    }
                } else if (product.isVariant()) {
                    productData.families = {
                        id: addPrefixPid(product.masterProduct.ID),
                        expand: true,
                        members: []
                    };
                    for (var j = 0; j < product.masterProduct.variants.length; j++) {
                        productData.families.members.push(addPrefixPid(product.masterProduct.variants[j].ID));
                    }
                }
            }
        }

        var eans = [];
        var showEans = false;
        if (!isAggregateAttrEnabled()) {
            if (product.EAN != null && !empty(product.EAN)) {
                eans.push(product.EAN);
            }
        } else if (isAggregateAttrEnabled() && !isProductFamiliesEnabled()) {
            if (product.master) {
                showEans = false;
                for (var a = 0; a < product.variants.length; a++) {
                    if (!empty(product.variants[a].EAN)) {
                        showEans = true;
                        break;
                    }
                }

                if (showEans) {
                    for (var b = 0; b < product.variants.length; b++) {
                        if (!empty(product.variants[b].EAN)) {
                            eans.push(product.variants[b].EAN);
                        }
                    }
                }
            }
        } else if (isAggregateAttrEnabled() && isProductFamiliesEnabled()) {
            if (product.productSet) {
                showEans = false;
                for (a = 0; a < product.productSetProducts.length; a++) {
                    if (!empty(product.productSetProducts[a].EAN)) {
                        showEans = true;
                        break;
                    }
                }

                if (showEans) {
                    for (b = 0; b < product.productSetProducts.length; b++) {
                        if (!empty(product.productSetProducts[b].EAN)) {
                            eans.push(product.productSetProducts[b].EAN);
                        }
                    }
                }
            } else {
                masterProduct = !product.master && product.variant ? product.masterProduct : product;
                showEans = false;
                for (a = 0; a < masterProduct.variants.length; a++) {
                    if (!empty(masterProduct.variants[a].EAN)) {
                        showEans = true;
                        break;
                    }
                }

                if (showEans) {
                    for (b = 0; b < masterProduct.variants.length; b++) {
                        if (!empty(masterProduct.variants[b].EAN)) {
                            eans.push(masterProduct.variants[b].EAN);
                        }
                    }
                }
            }
        }
        if (eans.length > 0) {
            productData.eans = eans;
        }

        var upcs = [];
        var showUpcs = false;
        if (!isAggregateAttrEnabled()) {
            if (product.UPC != null && !empty(product.UPC)) {
                upcs.push(product.UPC);
            }
        } else if (isAggregateAttrEnabled() && !isProductFamiliesEnabled()) {
            if (product.master) {
                showUpcs = false;
                for (var k = 0; k < product.variants.length; k++) {
                    if (!empty(product.variants[k].UPC)) {
                        showUpcs = true;
                        break;
                    }
                }

                if (showUpcs) {
                    for (var c = 0; c < product.variants.length; c++) {
                        if (!empty(product.variants[c].UPC)) {
                            upcs.push(product.variants[c].UPC);
                        }
                    }
                }
            }
        } else if (isAggregateAttrEnabled() && isProductFamiliesEnabled()) {
            if (product.productSet) {
                showUpcs = false;
                for (k = 0; k < product.productSetProducts.length; k++) {
                    if (!empty(product.productSetProducts[k].UPC)) {
                        showUpcs = true;
                        break;
                    }
                }

                if (showUpcs) {
                    for (c = 0; c < product.productSetProducts.length; c++) {
                        if (!empty(product.productSetProducts[c].UPC)) {
                            upcs.push(product.productSetProducts[c].UPC);
                        }
                    }
                }
            } else {
                masterProduct = !product.master && product.variant ? product.masterProduct : product;
                showUpcs = false;
                for (k = 0; k < masterProduct.variants.length; k++) {
                    if (!empty(masterProduct.variants[k].UPC)) {
                        showUpcs = true;
                        break;
                    }
                }

                if (showUpcs) {
                    for (c = 0; c < masterProduct.variants.length; c++) {
                        if (!empty(masterProduct.variants[c].UPC)) {
                            upcs.push(masterProduct.variants[c].UPC);
                        }
                    }
                }
            }
        }
        if (upcs.length > 0) {
            productData.upcs = upcs;
        }

        productData.inactive = false;

        return productData;
    };

    /*
     * Gets the productData for a product.
     * If 'bvEntityId' is set to 'variantID' and the product is a master or variationGroup, this function
     * will add entries for each of the products variants.
     */
    var getProductsData = function (product) {
        var productsData = [];
        var productData = null;

        var entityId = getEntityId();
        // eslint-disable-next-line no-cond-assign
        if (entityId = 'variantID' && (product.master || product.variationGroup)) {
            productData = getProductData(product);
            productsData.push(productData);

            for (var i = 0; i < product.variants.length; i++) {
                productData = getProductData(product.variants[i]);
                productsData.push(productData);
            }
        } else if (entityId === 'master' && product.variant) {
            productData = getProductData(product.masterProduct);
            productsData.push(productData);
        } else {
            productData = getProductData(product);
            productsData.push(productData);
        }

        return productsData;
    };

    /**
     * Gets the value for the custom preference "bvAdditionalProductFamily".
     * Note that this value is a comma separated list, so an array will be returned.
     * @returns {array} list of values for bvAdditionalProductFamily custom preference.
     */
    var getAdditionalProductFamily = function () {
        var additonalProductFamily = Site.getCurrent().getCustomPreferenceValue('bvAdditionalProductFamily');

        if (!empty(additonalProductFamily)) {
            var productFamilyValues = additonalProductFamily.split(',');
            return productFamilyValues;
        }

        return '';
    };

    // Use case insensitive product ID for Inline Ratings Import,
    var useCaseInsensitivePid = function () {
        return Site.getCurrent().getCustomPreferenceValue('bvEnableCaseInsensitivePID');
    };

    return {
        getImageURL: getImageURL,
        getCustomerName: getCustomerName,
        getRatingsFeedName: getRatingsFeedName,
        replaceIllegalCharacters: replaceIllegalCharacters,
        decodeId: decodeId,
        getBvLoaderUrl: getBvLoaderUrl,
        getBvApiHostUrl: getBvApiHostUrl,
        getDisplayData: getDisplayData,
        getEnvironment: getEnvironment,
        setBvReveal: setBvReveal,
        setProductId: setProductId,
        getProductId: getProductId,
        isRREnabled: isRREnabled,
        isQAEnabled: isQAEnabled,
        getProductsData: getProductsData,
        getProductData: getProductData,
        isProductPrefixEnabled: isProductPrefixEnabled,
        isCategoryPrefixEnabled: isCategoryPrefixEnabled,
        addPrefixPid: addPrefixPid,
        addFamilyPrefix: addFamilyPrefix,
        isAggregateAttrEnabled: isAggregateAttrEnabled,
        getProductCategoryName: getProductCategoryName,
        isProductTypeExcluded: isProductTypeExcluded,
        isProductFamiliesEnabled: isProductFamiliesEnabled,
        addPrefixCgid: addPrefixCgid,
        getEntityId: getEntityId,
        getAdditionalProductFamily: getAdditionalProductFamily,
        getDeploymentZone: getDeploymentZone,
        useCaseInsensitivePid: useCaseInsensitivePid
    };
};
