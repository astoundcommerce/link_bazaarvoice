'use strict';

/**
 * varants used through the running of BV jobs
 * @returns {array}  an array of predefined variables
 */
function getConstants() {
    return {
    /** ***************************************************************
		**  CONFIGURATION VARIABLES:
		**    Most of these settings were removed from Site Preferences.
		**    If customization is needed, change their values here.
		******************************************************************/
        FTPHostStaging: 'sftp-stg.bazaarvoice.com',
        FTPHostProduction: 'sftp.bazaarvoice.com',

        SEOFeedPath: 'feeds',
        SEOMaxStaleness: 5,
        SEOHostStaging: 'seo-stg.bazaarvoice.com',
        SEOHostProduction: 'seo.bazaarvoice.com',

        // If the SEODisplayCode is empty, then the Deployment Zone is used in the cloud SEO url.
        // This is to provide legacy display code support while the cloud SEO platform
        // transitions to use deployment zone.
        //
        // Only define a display code here if directed by a BazaarVoice representative
        SEODisplayCode: '',

        RatingsFeedPath: 'feeds',
        RatingsFeedFilename: 'ratings.xml.gz',
        RatingsFeedPrefix: 'bv',

        PurchaseFeedPath: '/ppe/inbox',
        PurchaseFeedFilename: 'bazaarvoice-order-data.xml',
        PurchaseFeedWaitDays: 0,
        PurchaseFeedNumDays: 14,
        PurchaseFeedPrefix: 'purchasefeed',
        PurchaseFeedPattern: /^purchasefeed_.*_\d{14}\.xml$/,
        PurchaseFeedLocalPath: 'bv/purchase',

        ProductFeedPath: 'import-inbox',
        ProductFeedFilename: 'productfeed.xml',
        ProductFeedPrefix: 'productfeed',
        ProductFeedPattern: /^productfeed_.*_\d{14}\.xml$/,
        ProductFeedLocalPath: 'bv/product',

        APIHostStaging: 'display-stg.ugc.bazaarvoice.com',
        APIHostProduction: 'display.ugc.bazaarvoice.com',

        BVLoaderHost: 'apps.bazaarvoice.com',

        // By default, Product Families are not used, and all variation product content is handled by
        // the master product.
        // If you show inline ratings for variations of the same master on a product grid (slicing for example),
        // then you need to enable the use of product families here.  This will add all variations to the product
        // feed, group them into families based on the master ID, and will use variation IDs for inline ratings.
        EnableProductFamilies: false,
        // If the above setting is set to true, then this will collect content at the variant level
        UseVariantID: false,
        /** ***************************************************************
		*    END CONFIGURATION VARIABLES
		******************************************************************/

        // regFull is just a BV locale
        // e.g. en_US, de_DE, etc
        regFull: /^[a-z]{2}_[a-zA-Z]{2}$/,

        // regPair is a full mapping from DW locale to BV display code with locale
        // e.g. "de":"de_DE", "de_DE":"de_DE", "default":"en_US", etc
        //
        // also supports overriding the Deployment Zone in the mapping
        // e.g. "de":"Second Zone/de_DE"
        regPair: /^(default|[a-z]{2}|[a-z]{2}_[a-zA-Z]{2})[\s]*:[\s]*([\w\s%]*\/)?[a-z]{2}_[a-zA-Z]{2}$/,

        MESSAGE_TEMPLATE: '[Job Details] [STATUS=  {0}] [Message= {1}] [Host = {2}] [User = {3}] [Password= ******] [Target FTP Folder= {5}] [File Name= {6}]',
        MESSAGE_TEMPLATE_LOCALE: '[Job Details] [STATUS=  {0}] [Message= {1}] [Host = {2}] [User = {3}] [Password= ******] [Target FTP Folder= {5}] [File Name= {6}] [Locale = {7}]',

        XML_GENERATOR: 'Salesforce Commerce Cloud (Demandware) Bazaarvoice LINK cartridge 18.2.0',
        CLOUD_SEO_VERSION: 'dw_cartridge, 18.2.0',
        XML_NAMESPACE_PRODUCT: 'http://www.bazaarvoice.com/xs/PRR/ProductFeed/14.7',
        XML_NAMESPACE_PURCHASE: 'http://www.bazaarvoice.com/xs/PRR/PostPurchaseFeed/4.9',
        XML_INCREMENTAL: 'true',

        CUSTOM_FLAG: 'bvSentInPPEFeed',
        CATEGORY_NONE: 'CATEGORY_NONE',

        PURCHASE: 'PURCHASE',
        PRODUCT: 'PRODUCT',

        BV_DEFAULTLOCALE: 'default',
        DEFAULT_ZONE: 'Main Site',
        BV_DISPLAY_PATH: 'bv/display/',
        BV_RR_PROJECT: 'rr',
        BV_QA_PROJECT: 'qa',
        BV_SY_PROJECT: 'sy',
        BV_DEFAULTIMAGETYPE: 'medium',

        SMART_SEO_DIR: 'smartSEO'
    };
}

exports.getConstants = getConstants;
