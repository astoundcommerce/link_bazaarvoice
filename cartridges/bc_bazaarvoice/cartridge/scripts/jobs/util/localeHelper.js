'use strict';

var Site = require('dw/system/Site');
var HashMap = require('dw/util/HashMap');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'LocaleHelper.js');
var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();

/**
 * Returns localeMap hashmap
 * @param {string} type returns which type of object the locale is associated with
 * @returns {string} locale
 */
function getLocaleMap(type) {
    var localeMap = new HashMap();
    var context = type || '';
    var arr;
    var allowedLocales = Site.getCurrent().allowedLocales;
    var defaultLocale = Site.getCurrent().getDefaultLocale();
    var prefMappings = Site.getCurrent().getCustomPreferenceValue(
        'bvLocaleMapping_C2013');
    var item;
    var dwlocale;
    var bvlocale;
    if (prefMappings.length > 1) {
        Logger.debug('More than 1 locale mapped in site preference....');
        var dupArray = [];
        for (var index = 0; index < prefMappings.length; index++) {
            item = prefMappings[index];
            item = item.replace(/^[\s]+|["]|[\s]+$/g, '');

            // if this is a BV locale only item, then apply it to the default DW
            // locale, but only once
            if (bvConstants.regFull.test(item) &&
					dupArray.indexOf(defaultLocale) === -1) {
                localeMap.put(defaultLocale, item);
                dupArray.push(defaultLocale);
                Logger.debug('Locale Mapping found: ' + defaultLocale +
						'(SFCC) ==> ' + item + '(BV)');
            } else if (bvConstants.regPair.test(item)) {
                var a = item.split(':');
                dwlocale = a[0].replace(/^[\s]+|[\s]+$/g, '');
                bvlocale = a[1].replace(/^[\s]+|[\s]+$/g, '');

                if (allowedLocales.indexOf(dwlocale) === -1) {
                    Logger.debug('Skipping invalid mapping: ' + item +
							'.  SFCC locale is not allowed for this Site.');
                } else if (dupArray.indexOf(dwlocale) !== -1) {
                    Logger
                        .debug('Skipping invalid mapping: ' +
									item +
									'.  SFCC locale is already mapped for this Site.');
                } else if (localeMap.values().contains(bvlocale) &&
						context === 'product') {
                    // for the product feed, we have to remove duplicate BV
                    // locales, but for purchase feed, we need to be able to map
                    // any dw locale to its BV locale
                    Logger.debug('Skipping invalid mapping: ' + item +
							'.  BV locale is already mapped for this Site.');
                } else {
                    localeMap.put(dwlocale, bvlocale);
                    dupArray.push(dwlocale);
                    Logger.debug('Locale Mapping found: ' + dwlocale +
							'(SFCC) ==> ' + bvlocale + '(BV)');
                }
            }
        }

        if (localeMap.size() === 1) {
            if (localeMap.keySet()[0] === defaultLocale) {
                localeMap.clear();
                Logger
                    .debug('Only 1 valid mapping found and its for the default SFCC locale: ' +
								defaultLocale +
								'.  Assuming defaults for both systems.');
            } else {
                Logger
                    .debug('Only 1 valid mapping defined, and it is not the default locale for this site. Assuming the default locale for BV and setting DW request locale to: ' +
								localeMap.keySet()[0]);
            }
        }
    } else if (prefMappings.length === 1) {
        Logger.debug('Exactly 1 locale mapped in site preference...');

        item = prefMappings[0];
        item = item.replace(/^[\s]+|["]|[\s]+$/g, '');

        if (bvConstants.regFull.test(item)) {
            Logger
                .debug('Only 1 mapping for a BV locale only, so assuming defaults for both systems.');
        } else if (bvConstants.regPair.test(item)) {
            arr = item.split(':');
            arr[0] = arr[0].replace(/^[\s]+|[\s]+$/g, '');
            arr[1] = arr[1].replace(/^[\s]+|[\s]+$/g, '');

            // there is only one mapping, and it does not match the (radio
            // button) default DW locale
            // In this case, the job needs to explicitly set the locale to the
            // mapped DW locale
            if (allowedLocales.indexOf(arr[0]) !== -1 &&
					!(arr[0].equals(defaultLocale))) {
                dwlocale = arr[0];
                bvlocale = arr[1];
                if (bvlocale.indexOf('/') !== -1) {
                    bvlocale = bvlocale.split('/')[1];
                }
                Logger
                    .debug('Only 1 mapping defined, and it is not the default locale for this site. Assuming the default locale for BV and setting DW request locale to: ' +
								dwlocale);
                localeMap.put(dwlocale, bvlocale);
            }
        } else {
            Logger
                .debug('Site Preferences bvLocaleMapping does not have a valid mapping, going to assume the default locale for both systems.');
        }
    } else {
        Logger
            .debug('Site Preferences bvLocaleMapping has no mappings, going to assume the default locale for both systems.');
    }

    return localeMap;
}

/**
 * Returns localeMap keyset
 * @param {array} localeMap returns which type of object the locale is associated with
 * @returns {array} localeMap
 */
function isMultiLocale(localeMap) {
    return localeMap && localeMap.keySet() && localeMap.keySet().length > 1;
}

/**
 * Returns bv locale map
 * @param {array} localeMap returns which type of object the locale is associated with
 * @returns {array} return matching locale from the bv sitepref
 */
function getBVLocaleMap(localeMap) {
    var bvMap = new HashMap();
    var dwLocales = localeMap.keySet();

    for (var i = 0; i < dwLocales.length; i++) {
        var dwLocale = dwLocales[i];
        var bvLocale = localeMap.get(dwLocale);
        if (bvMap.containsKey(bvLocale)) {
            var currDWLocales = bvMap.get(bvLocale).toArray();
            currDWLocales.push(dwLocale);
            bvMap.put(bvLocale, currDWLocales);
        } else {
            var arr = [];
            arr.push(dwLocale);
            bvMap.put(bvLocale, arr);
        }
    }

    return bvMap;
}

module.exports = {
    getLocaleMap: getLocaleMap,
    isMultiLocale: isMultiLocale,
    getBVLocaleMap: getBVLocaleMap
};
