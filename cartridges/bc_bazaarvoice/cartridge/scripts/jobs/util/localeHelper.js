'use strict';

var Site = require('dw/system/Site');
var HashMap = require('dw/util/HashMap');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'localeHelper.js');

var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
/**
 * Returns localeMap hashmap
 * @param {string} type returns which type of object the locale is associated with
 * @returns {string} locale
 */
function getLocaleMap(type) {
    var localeMap = new HashMap();
    var context = type || '';
    var allowedLocales = Site.getCurrent().allowedLocales;
    var defaultLocale = Site.getCurrent().getDefaultLocale();
    var prefMappings = Site.getCurrent().getCustomPreferenceValue('bvLocaleMapping_C2013');
    var dwLocale;
    var bvLocale;
    if (prefMappings.length > 1) {
        Logger.debug('More than 1 locale mapped in site preference....');

        var dupArray = [];
        for (var i = 0; i < prefMappings.length; i++) {
            var prefMapping = prefMappings[i];
            prefMapping = prefMapping.replace(/^[\s]+|["]|[\s]+$/g, '');

            // if this is a BV locale only item, then apply it to the default DW locale, but only once
            if (bvConstants.regFull.test(prefMapping) && dupArray.indexOf(defaultLocale) === -1) {
                localeMap.put(defaultLocale, prefMapping);
                dupArray.push(defaultLocale);
                Logger.debug('Locale Mapping found: ' + defaultLocale + '(SFCC) ==> ' + prefMapping + '(BV)');
            } else if (bvConstants.regPair.test(prefMapping)) {
                var ab = prefMapping.split(':');
                dwLocale = ab[0].replace(/^[\s]+|[\s]+$/g, '');
                bvLocale = ab[1].replace(/^[\s]+|[\s]+$/g, '');

                if (allowedLocales.indexOf(dwLocale) === -1) {
                    Logger.debug('Skipping invalid mapping: ' + prefMapping + '.  SFCC locale is not allowed for this Site.');
                } else if (dupArray.indexOf(dwLocale) !== -1) {
                    Logger.debug('Skipping invalid mapping: ' + prefMapping + '.  SFCC locale is already mapped for this Site.');
                } else if (localeMap.values().contains(bvLocale) && context === 'product') {
                    // for the product feed, we have to remove duplicate BV locales, but for purchase feed, we need to be able to map
                    // any dw locale to its BV locale
                    Logger.debug('Skipping invalid mapping: ' + prefMapping + '.  BV locale is already mapped for this Site.');
                } else {
                    localeMap.put(dwLocale, bvLocale);
                    dupArray.push(dwLocale);
                    Logger.debug('Locale Mapping found: ' + dwLocale + '(SFCC) ==> ' + bvLocale + '(BV)');
                }
            }
        }

        if (localeMap.size() === 1) {
            if (localeMap.keySet()[0] === defaultLocale) {
                localeMap.clear();
                Logger.debug('Only 1 valid mapping found and its for the default SFCC locale: ' + defaultLocale + '.  Assuming defaults for both systems.');
            } else {
                Logger.debug('Only 1 valid mapping defined, and it is not the default locale for this site. Assuming the default locale for BV and setting DW request locale to: ' + localeMap.keySet()[0]);
            }
        }
    } else if (prefMappings.length === 1) {
        Logger.debug('Exactly 1 locale mapped in site preference...');

        var item = prefMappings[0];
        item = item.replace(/^[\s]+|["]|[\s]+$/g, '');

        if (bvConstants.regFull.test(item)) {
            Logger.debug('Only 1 mapping for a BV locale only, so assuming defaults for both systems.');
        } else if (bvConstants.regPair.test(item)) {
            var a = item.split(':');
            a[0] = a[0].replace(/^[\s]+|[\s]+$/g, '');
            a[1] = a[1].replace(/^[\s]+|[\s]+$/g, '');

            // there is only one mapping, and it does not match the (radio button) default DW locale
            // In this case, the job needs to explicitly set the locale to the mapped DW locale
            if (allowedLocales.indexOf(a[0]) !== -1 && !(a[0].equals(defaultLocale))) {
                dwLocale = a[0];
                bvLocale = a[1];
                if (bvLocale.indexOf('/') !== -1) {
                    bvLocale = bvLocale.split('/')[1];
                }
                Logger.debug('Only 1 mapping defined, and it is not the default locale for this site. Assuming the default locale for BV and setting DW request locale to: ' + dwLocale);
                localeMap.put(dwLocale, bvLocale);
            }
        } else {
            Logger.debug('Site Preferences bvLocaleMapping does not have a valid mapping, going to assume the default locale for both systems.');
        }
    } else {
        Logger.debug('Site Preferences bvLocaleMapping has no mappings, going to assume the default locale for both systems.');
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
            var currdwLocales = bvMap.get(bvLocale).toArray();
            currdwLocales.push(dwLocale);
            bvMap.put(bvLocale, currdwLocales);
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
