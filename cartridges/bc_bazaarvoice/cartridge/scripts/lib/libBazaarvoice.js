'use strict';
/**
 *
 * A library file for BazaarVoice communication.
 *
 */
var Site = require('dw/system/Site');
var MessageDigest = require('dw/crypto/MessageDigest');
var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
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
            if (Site.getCurrent().getCustomPreferenceValue('bvOrderImageType_C2013') !== null) {
                IMAGE_SIZE = Site.getCurrent().getCustomPreferenceValue('bvOrderImageType_C2013').toString();
            }
        } else if (Site.getCurrent().getCustomPreferenceValue('bvProductImageType_C2013') !== null) {
            IMAGE_SIZE = Site.getCurrent().getCustomPreferenceValue('bvProductImageType_C2013').toString();
        }

        if (IMAGE_SIZE && product.getImage(IMAGE_SIZE)) {
            imgURL = product.getImage(IMAGE_SIZE).getHttpsURL();
        } else if (product.getImage(bvConstants.BV_DEFAULTIMAGETYPE)) {
            imgURL = product.getImage(bvConstants.BV_DEFAULTIMAGETYPE).getHttpsURL();
        }

        return encodeURI(imgURL);
    };
    /**
     * This function used tp get environment
     * @returns {string} env Enviorment Value
     */
    var getEnvironment = function () {
        var env = Site.getCurrent().getCustomPreferenceValue('bvEnvironment_C2013');
        if (!env || !env.value) {
            Logger.error('bvEnvironment is null or empty!');
            return '';
        }
        return env.value;
    };
    var getCustomerName = function () {
        var name = '';
        if (Site.getCurrent().getCustomPreferenceValue('bvCustomerName_C2013') !== null) {
            name = Site.getCurrent().getCustomPreferenceValue('bvCustomerName_C2013').toString();
        }
        return name;
    };
    var getRatingsFeedName = function () {
        var fname = bvConstants.RatingsFeedFilename;
        if (Site.getCurrent().getCustomPreferenceValue('bvCustomerName_C2013') !== null) {
            fname = bvConstants.RatingsFeedPrefix + '_' + Site.getCurrent().getCustomPreferenceValue('bvCustomerName_C2013').toString().toLowerCase() + '_' + bvConstants.RatingsFeedFilename;
        }
        return fname;
    };

    var replaceIllegalCharacters = function (rawId) {
        return rawId.replace('&', '_and_', 'g').replace('/', '_fslash_', 'g');
    };

    var decodeId = function (id) {
        return id.replace('_and_', '&', 'g').replace('_fslash_', '/', 'g');
    };

    var md5 = function (data) {
        var digest = new MessageDigest(MessageDigest.DIGEST_MD5);
        return digest.digest(data);
    };

    var encodeHex = function (data) {
    /**
         * Used building output as Hex
         */
        var DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

        var l = data.length;
        var out = '';
        // two characters form the hex value.
        for (var i = 0; i < l; i++) {
            out += DIGITS[(0xF0 & data.charCodeAt(i)) >>> 4];
            out += DIGITS[0x0F & data.charCodeAt(i)];
        }
        return out;
    };

    var encryptReviewerId = function (reviewerId, reviewerNickname) {
        var USER_STRING_TEMPLATE = 'date={0}&userid={1}&username={2}';

        if (reviewerId && reviewerNickname) {
            var dateAndreviewerId = StringUtils.format(USER_STRING_TEMPLATE, StringUtils.formatCalendar(new Calendar(), 'yyyyMMdd'), reviewerId, reviewerNickname);

            var sharedKey = Site.getCurrent().getCustomPreferenceValue('bvEncodingKey_C2013');
            var md5String = md5(sharedKey + dateAndreviewerId);
            var hexUserID = encodeHex(dateAndreviewerId);

            return md5String + hexUserID;
        }
        return null;
    };


    var getDisplayData = function () {
        var currentLocale = request.locale;
        var defaultLocale = Site.getCurrent().getDefaultLocale();
        var isCurrentDefault = currentLocale.equals(defaultLocale);
        var allowedLocales = Site.getCurrent().allowedLocales;

        var bvzone = '';
        var bvlocale = '';
        var item;
        var a;
        var map = Site.getCurrent().getCustomPreferenceValue('bvLocaleMapping_C2013');

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
            bvzone = Site.getCurrent().getCustomPreferenceValue('bvDeploymentZone_C2013');
            if (!bvzone) {
                Logger.warn('Site Preference bvDeploymentZone is null or empty!. Using "Main Site".');
                bvzone = bvConstants.DEFAULT_ZONE;
            }
        }

        return { zone: bvzone, locale: bvlocale };
    };

    var getBvLoaderUrl = function () {
        // "https://apps.bazaarvoice.com/deployments/<client_name>/<site_ID>/<environment>/<locale>/bv.js"
        var client = Site.getCurrent().getCustomPreferenceValue('bvCustomerName_C2013');
        if (!client) {
            Logger.error('Site Preference bvCustomerName is null or empty!');
        }
        var bvdisplay = getDisplayData();
        var zoneId = bvdisplay.zone.toLowerCase().replace(' ', '_', 'g');
        var env = getEnvironment().toLowerCase();
        var host = bvConstants.BVLoaderHost;

        return '//' + host + '/deployments/' + client + '/' + zoneId + '/' + env + '/' + bvdisplay.locale + '/bv.js';
    };

    var getBvApiHostUrl = function () {
        var client = Site.getCurrent().getCustomPreferenceValue('bvCustomerName_C2013');
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

    var setBvReveal = function () {
        session.privacy.bvreveal = request.httpParameterMap.bvreveal.submitted ? request.httpParameterMap.bvreveal.stringValue : '';
    };

    var setProductId = function (product) {
        var pid = '';
        if (product !== null) {
            pid = (product.variant && !bvConstants.UseVariantID) ? product.variationModel.master.ID : product.ID;
        }
        session.privacy.BVSEO_PID = pid;
        return pid;
    };

    var getProductId = function () {
        return session.privacy.BVSEO_PID || '';
    };

    var isRREnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableRR_C2013');
    };

    var isQAEnabled = function () {
        return !!Site.getCurrent().getCustomPreferenceValue('bvEnableAA_C2013');
    };

    return {
        getImageURL: getImageURL,
        getCustomerName: getCustomerName,
        getRatingsFeedName: getRatingsFeedName,
        replaceIllegalCharacters: replaceIllegalCharacters,
        decodeId: decodeId,
        encryptReviewerId: encryptReviewerId,
        getBvLoaderUrl: getBvLoaderUrl,
        getBvApiHostUrl: getBvApiHostUrl,
        getDisplayData: getDisplayData,
        getEnvironment: getEnvironment,
        setBvReveal: setBvReveal,
        setProductId: setProductId,
        getProductId: getProductId,
        isRREnabled: isRREnabled,
        isQAEnabled: isQAEnabled
    };
};
