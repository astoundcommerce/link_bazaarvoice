/**
* libCloudSEO.ds
*
*	Library code to render the Cloud SEO content.
*	Based on the PHP SDK found at
*	https://github.com/bazaarvoice/seo_sdk_php
*
*/
var Calendar = require('dw/util/Calendar');
var HashMap = require('dw/util/HashMap');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var StringUtils = require('dw/util/StringUtils');
var URLUtils = require('dw/web/URLUtils');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'libCloudSEO');

var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
var BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

var createService = function (serviceId) {
    return ServiceRegistry.createService(serviceId, {
        createRequest: function (svc) {
            svc.setRequestMethod('GET');
            return svc;
        },
        parseResponse: function (svc, client) {
            return client.getText();
        },
        mockCall: function (svc) {
            return {
                statusCode: 200,
                statusMessage: 'Success',
                text: 'MOCK RESPONSE (' + svc.URL + ')'
            };
        },
        getResponseLogMessage: function (response) {
            return !empty(response.getText()) ? response.getText().substr(0, 100) + '\n\n...[no need to log all the content]\n\n' : 'Response is empty.';
        }
    });
};

/**
* BVSEO class
*
*	Usage:
*		var bvSeo = getBVSEO({
*			"product_id" : "123456789",
*		});
*		bvSeo.reviews().getContent();
*		bvSeo.questions().getContent();
*
*   Required fields:
*      product_id (string)
*
*	Optional fields
*      	current_page_url (string) (defaults to detecting the current_page automtically)
*      	staging (boolean) (defaults to true, need to put false when go to production)
*      	subject_type (string) (defaults to product, for questions you can pass in categories here if needed)
*      	latency_timeout (int) (in millseconds) (defaults to 1000ms)
*		content_type (string) (defaults to reviews which is the only supported product right now)
*   	bot_list (string) (defualts to msnbot|googlebot|teoma|bingbot|yandexbot|yahoo)
*		bot_detection (boolean) (defaults to true, only rendering content if a bot is detected, or bvreveal is a uri parameter)
*/
var supportedContentTypes = {
    r: 'reviews',
    q: 'questions',
    s: 'stories',
    u: 'universal',
    sp: 'spotlights'
};
var supportedSubjectTypes = {
    p: 'product',
    c: 'category',
    e: 'entry',
    d: 'detail',
    s: 'seller'
};

/**
* class SEOContent
* @param {string} config content_type
* @param {obj} seoProduct object
* @returns {string} payload data from BV
*/
function SEOContent(config, seoProduct) {
    var configMap;
    if (config === null || config.empty) {
        Logger.error('Cannot create SEOContent object.  Config parameter is null or empty.');
        return null;
    }
    configMap = config.clone();

    if (!empty(seoProduct)) {
        configMap.content_type = seoProduct;
    }

    var msg = '';
    var seoUrl = '';
    var responseTime = 0;

    /** ****************
	* PRIVATE METHODS *
	******************/

    /**
	* setBuildMessage
	* @param {string} str BV message
	*
	*/
    var setBuildMessage = function (str) {
        msg += ' ' + StringUtils.rtrim(str) + ';';
    };

    /**
	* getBVReveal()
	* @returns {bool} verification of debugging info for BV
	*/
    var getBVReveal = function () {
        var bvreveal = false;
        if (!empty(configMap.bvreveal) && configMap.bvreveal === 'debug') {
            bvreveal = true;
        } else if (!empty(configMap.page_params.bvreveal) && configMap.page_params.bvreveal === 'debug') {
            bvreveal = true;
        }
        return bvreveal;
    };

    /**
	* isBot()
	* @returns {bool} return bool for reveal
	*
	* Helper method to determine if current request is a bot or not. Will
    * use the configured regex string which can be overriden with params.
    */
    var isBot = function () {
    // we need to check the user agent string to see if this is a bot,
    // unless the bvreveal parameter is there or we have disabled bot
    // detection through the bot_detection flag
        if (getBVReveal()) {
            return true;
        }

        // search the user agent string for an indictation if this is a search bot or not
        if (request.httpParameterMap.httpUserAgent.submitted) {
            var regex = new RegExp(configMap.bot_list);
            Logger.debug('isBot() result: ' + regex.test(request.httpUserAgent.toLowerCase()));
            return regex.test(request.httpUserAgent.toLowerCase());
        }
        return false;
    };

    // set the timeout based on the service profiles, so thjey can be set without code changes.
    try {
        configMap.execution_timeout_bot = createService('bazaarvoice.http.bot').getConfiguration().getProfile().getTimeoutMillis();
        configMap.execution_timeout = createService('bazaarvoice.http').getConfiguration().getProfile().getTimeoutMillis();
    } catch (te) {
        Logger.error('isBot() Unable to pull the timeout values from the service profiles, using defaults instead.');
    }
    configMap.latency_timeout = isBot() ? configMap.execution_timeout_bot : configMap.execution_timeout;

    /**
	* getPageNumber()
	*@returns {number} Helper method to pull from the URL the page of SEO we need to view.
	*
	* Helper method to pull from the URL the page of SEO we need to view.
	*/
    var getPageNumber = function () {
    // default to page 1 if a page is not specified in the URL
        var pageNumber = '1';
        var regex;
        var param;

        // bvstate page number should take precedent if the content type matches
        if (configMap.page_params.base_url_bvstate) {
            if (configMap.content_type === configMap.page_params.content_type) {
                pageNumber = configMap.page_params.page;
            }
            param = request.httpParameters.bvstate[0].replace('/', /\//, 'g');
            param = encodeURIComponent(param);
            regex = new RegExp('bvstate=' + param + '[&]?');
            configMap.current_page_url = configMap.current_page_url.replace(regex, '');
        } else if (configMap.containsKey('page') && configMap.page !== pageNumber) {
            pageNumber = configMap.page;
        } else if (request.httpParameters.containsKey('bvpage')) {
            // some implementations wil use bvpage query parameter like ?bvpage=2
            pageNumber = request.httpParameters.bvpage[0];

            // remove the bvpage parameter from the current URL so we don't keep appending it
            param = request.httpParameters.bvpage[0].replace('/', /\//, 'g');
            param = encodeURIComponent(param);
            regex = new RegExp('bvpage=' + param + '[&]?');
            configMap.current_page_url = configMap.current_page_url.replace(regex, '');
        } else if (request.httpParameters.containsKey('bvrrp') || request.httpParameters.containsKey('bvqap') || request.httpParameters.containsKey('bvsyp')) {
            // other implementations use the bvrrp, bvqap, or bvsyp parameter ?bvrrp=1234-en_us/reviews/product/2/ASF234.htm
            if (request.httpParameters.containsKey('bvrrp')) {
                param = request.httpParameters.bvrrp[0].replace('/', /\//, 'g');
                param = encodeURIComponent(param);
                regex = new RegExp('bvrrp=' + param + '[&]?');
                configMap.current_page_url = configMap.current_page_url.replace(regex, '');
            } else if (request.httpParameters.containsKey('bvqap')) {
                param = request.httpParameters.bvqap[0].replace('/', /\//, 'g');
                param = encodeURIComponent(param);
                regex = new RegExp('bvqap=' + param + '[&]?');
                configMap.current_page_url = configMap.current_page_url.replace(regex, '');
            } else {
                param = request.httpParameters.bvsyp[0].replace('/', /\//, 'g');
                param = encodeURIComponent(param);
                regex = new RegExp('bvsyp=' + param + '[&]?');
                configMap.current_page_url = configMap.current_page_url.replace(regex, '');
            }

            try {
                regex = /\/(\d+?)\/[^\\/]+$/;
                var matches = request.httpQueryString.match(regex);
                pageNumber = matches[1];
            } catch (e) {
                Logger.error('getPageNumber() Exception caught: ' + e.message);
            }

            Logger.debug('getPageNumber() URL after param check: ' + configMap.current_page_url);
            Logger.debug('getPageNumber() Page Number: ' + pageNumber);
        }

        return pageNumber;
    };

    /**
	* buildSeoUrl()
	*@param {number} page page number used to seo
	* @returns {string} page  The seo url
	*
	* Helper method to that builds the URL to the SEO payload
	*/
    var buildSeoUrl = function (page) {
    // staging or production?
        var host = bvConstants.SEOHostStaging;
        if (configMap.staging === false) {
            host = bvConstants.SEOHostProduction;
        }
        var scheme = configMap.ssl_enabled ? 'https://' : 'http://';

        var url = scheme + host;
        url += '/' + configMap.cloud_key;
        url += '/' + encodeURI(configMap.deployment_zone_id.replace(' ', '_', 'g'));
        url += '/' + configMap.content_type;
        url += '/' + configMap.subject_type;
        url += '/' + page;
        url += '/' + encodeURI(configMap.product_id) + '.htm';

        Logger.debug('buildSeoUrl() seoUrl: ' + url);
        return url;
    };

    /**
	* fetchSeoContent()
	*@param {string} url use to fetch SEO
	*@returns {Object} returns object
	* Helper method that will take in a URL and return it's payload
	*/
    var fetchSeoContent = function (url) {
        try {
            var serviceId = isBot() ? 'bazaarvoice.http.bot' : 'bazaarvoice.http';
            var service = createService(serviceId);

            service.URL = url;
            var timer = new Calendar();
            var result = service.call();
            var timer2 = new Calendar();
            var timespan = timer2.getTime().getTime() - timer.getTime().getTime();
            responseTime = timespan;

            if (!result.isOk()) {
                throw new Error('Unsuccessful GET.  status = \'' + result.getStatus() + '\', msg = \'' + result.errorMessage + '\'');
            }

            return result.object;
        } catch (ex) {
            Logger.error('fetchSeoContent() Exception while retrieving cloud content from ' + url + ': ' + ex.message);
            setBuildMessage(ex.message);
            return '';
        }
    };

    /**
	* replaceTokens()
	*@param {string} content url string
	*@returns {string} content  return replaced string
	* After we have an SEO payload we need to replace the {INSERT_PAGE_URI}
	* tokens with the current page url so pagination works.
	*/
    var replaceTokens = function (content) {
    // determine if query string exists in current page url
        var prefix = '?';
        if (configMap.current_page_url.indexOf('?') !== -1) {
            if (configMap.current_page_url.lastIndexOf('&') === configMap.current_page_url.length - 1) {
                prefix = '';
            } else {
                prefix = '&';
            }
        }

        return content.replace('{INSERT_PAGE_URI}', configMap.current_page_url + prefix, 'g');
    };

    /**
	* buildComment()
	*@param {string} method content type
	*@returns {string} footer html string
	* Helper method to add a comment to the seo content
	*/
    var buildComment = function (method) {
        var footer = '\n<ul id="BVSEOSDK_meta" style="display: none !important;">';
        footer += '\n	<li data-bvseo="sdk">bvseo_sdk, ' + bvConstants.CLOUD_SEO_VERSION + ', p_sdk_3.2.0</li>';
        footer += '\n	<li data-bvseo="sp_mt">CLOUD, ' + method + ', ' + responseTime + 'ms</li>';
        footer += '\n	<li data-bvseo="ct_st">' + configMap.content_type + ', ' + configMap.subject_type + '</li>';
        if (!empty(msg)) {
            footer += '\n	<li data-bvseo="ms">bvseo-msg: ' + StringUtils.stringToHtml(msg) + '</li>';
        }
        footer += '\n</ul>';

        if (getBVReveal()) {
            footer += '\n<ul id="BVSEOSDK_DEBUG" style="display:none;">';
            footer += '\n	<li data-bvseo="staging">' + configMap.staging + '</li>';
            footer += '\n	<li data-bvseo="seo.sdk.enabled">' + configMap.seo_sdk_enabled + '</li>';
            footer += '\n	<li data-bvseo="seo.sdk.execution.timeout.bot">' + configMap.execution_timeout_bot + '</li>';
            footer += '\n	<li data-bvseo="seo.sdk.execution.timeout">' + configMap.execution_timeout + '</li>';
            footer += '\n	<li data-bvseo="cloudKey">' + configMap.cloud_key + '</li>';
            footer += '\n	<li data-bvseo="bv.root.folder">' + encodeURI(configMap.deployment_zone_id.replace(' ', '_', 'g')) + '</li>';
            footer += '\n	<li data-bvseo="seo.sdk.charset">' + configMap.charset + '</li>';
            footer += '\n	<li data-bvseo="seo.sdk.ssl.enabled">' + configMap.ssl_enabled + '</li>';
            footer += '\n	<li data-bvseo="crawlerAgentPattern">' + configMap.bot_list + '</li>';
            footer += '\n	<li data-bvseo="subjectID">' + encodeURI(configMap.product_id) + '</li>';

            footer += '\n	<li data-bvseo="en">' + configMap.sdk_enabled + '</li>';
            footer += '\n	<li data-bvseo="pn">' + configMap.page + '</li>';
            footer += '\n	<li data-bvseo="userAgent">' + (request.httpUserAgent ? request.httpUserAgent.toLowerCase() : '') + '</li>';
            footer += '\n	<li data-bvseo="pageURI">' + configMap.current_page_url + '</li>';
            footer += '\n	<li data-bvseo="contentType">' + configMap.content_type + '</li>';
            footer += '\n	<li data-bvseo="subjectType">' + configMap.subject_type + '</li>';

            if (!empty(seoUrl)) {
                footer += '\n	<li data-bvseo="contentURL">' + seoUrl + '</li>';
            }
            footer += '\n</ul>';
        }

        return footer;
    };

    /**
	* isSdkEnabled
	*@returns {bool} is the SDK enabled
	*/
    var isSdkEnabled = function () {
        return configMap.seo_sdk_enabled || getBVReveal();
    };

    /**
	* getFullSeoContents
	*@returns {string} return HTML content
	*/
    var getFullSeoContents = function () {
        var seoContent = '';
        var pageNumber = getPageNumber();

        seoUrl = buildSeoUrl(pageNumber);

        if (isSdkEnabled()) {
            seoContent = fetchSeoContent(seoUrl);

            seoContent = replaceTokens(seoContent);
        } else {
            setBuildMessage('SEO SDK is disabled. Enable by setting seo.sdk.enabled to true.');
        }

        return seoContent;
    };

    /**
	* replaceSection()
	*@param {string} str html content from BV
	*@param {string} begin comment section for aggregate rating
	*@param {string} end comment section ending for aggregate rating
	*@returns {string} return HTML content from BV
	*/
    var replaceSection = function (str, begin, end) {
        var result = str;
        var startIndex = str.indexOf(begin);
        if (startIndex !== -1) {
            var endIndex = str.indexOf(end);
            if (endIndex !== -1) {
                endIndex += end.length;
                var strBegin = str.substring(0, startIndex);
                var strEnd = str.substring(endIndex);
                result = strBegin + strEnd;
            }
        }

        return result;
    };

    /**
	* renderSEO
	*@param {string} method passing method type
	*@returns {string} payload passing html from BV
	*/
    var renderSEO = function (method) {
        var payload = '';

        if (!isBot() && configMap.latency_timeout === 0) {
            setBuildMessage('EXECUTION_TIMEOUT is set to 0 ms; JavaScript-only Display.');
        } else {
            if (isBot() && configMap.latency_timeout < 100) {
                configMap.latency_timeout = 100;
                setBuildMessage('EXECUTION_TIMEOUT_BOT is less than the minimum value allowed. Minimum value of 100ms used.');
            }

            try {
                payload = getFullSeoContents();
            } catch (ex) {
                setBuildMessage(ex.message);
            }
        }

        payload += buildComment(method);
        return payload;
    };

    /**
	* renderAggregateRating()
	*@returns {string} returns html comment
	*/
    var renderAggregateRating = function () {
        var payload = renderSEO('getAggregateRating');

        payload = replaceSection(payload, '<!--begin-reviews-->', '<!--end-reviews-->');

        payload = replaceSection(payload, '<!--begin-pagination-->', '<!--end-pagination-->');

        return payload;
    };

    /**
	* renderReviews()
	*@returns {string} returns html comment
	*/
    var renderReviews = function () {
        var payload = renderSEO('getReviews');

        payload = replaceSection(payload, '<!--begin-aggregate-rating-->', '<!--end-aggregate-rating-->');

        var schemaOrgText = 'itemscope itemtype="http://schema.org/Product"';
        payload = payload.replace(schemaOrgText, '', 'g');

        return payload;
    };


    /** ****************
	* PUBLIC METHODS  *
	******************/
    return {
        getContent: function () {
            var payload = renderSEO('getContent');
            return payload;
        },

        getReviews: function () {
            var payload = '';

            if (configMap.content_type === 'questions') {
                setBuildMessage('Content Type \'' + configMap.content_type + '\' is not supported by getReviews().');
                payload = buildComment('getReviews');
            } else if (configMap.content_type === 'reviews') {
                payload = renderReviews();
            }

            return payload;
        },

        getAggregateRating: function () {
            var payload = '';

            if (configMap.content_type === 'questions') {
                setBuildMessage('Content Type \'' + configMap.content_type + '\' is not supported by getAggregateRating().');
                payload = buildComment('getAggregateRating');
            } else if (configMap.content_type === 'reviews') {
                payload = renderAggregateRating();
            }

            return payload;
        }
    };
}
/**
 * SEO content this get display on page
 * @returns {string} various output based on method call
 */
function BVSEO() {
    // put this first so it can initialize the current_page_url paramter
    /** ****************
	* @returns {string} url string value
	* PRIVATE METHODS *
	******************/
    var getCurrentUrl = function () {
        var url;
        if (request.isHttpSecure()) {
            url = URLUtils.https('Product-Show');
        } else {
            url = URLUtils.http('Product-Show');
        }
        if (!empty(request.httpQueryString)) {
            for (var i = 0; i < request.httpParameterMap.parameterNames.length; i++) {
                var pname = request.httpParameterMap.parameterNames[i];
                var pval = request.httpParameterMap.get(pname);
                url.append(pname, pval);
            }
        }
        Logger.debug('getCurrentUrl() CurrentUrl:\n ' + url);
        return url.toString();
    };

    var getBVStateParams = function (bvstate) {
    // break out bvstate into map
        var bvsMap = new HashMap();
        var bvsArr = bvstate.split('/');
        for (var i = 0; i < bvsArr.length; i++) {
            var param = bvsArr[i];
            var paramArr = param.split(':');
            if (!empty(paramArr[0])) {
                var key = paramArr[0];
                var val = '';
                if (!empty(paramArr[1])) {
                    val = paramArr[1];
                }
                bvsMap[key] = val;
            }
        }

        // sanitize the data
        var params = new HashMap();
        if (bvsMap.size() > 0 && !empty(bvsMap.ct)) {
            if (!empty(bvsMap.id)) {
                params.put('subject_id', bvsMap.id);
            }
            if (!empty(bvsMap.pg)) {
                params.put('page', bvsMap.pg);
            }
            if (!empty(bvsMap.ct)) {
                if (empty(supportedContentTypes[bvsMap.ct])) {
                    Logger.error('[libCloudSEO.ds][getBVStateParams()] Unsupported Content Type: ' + bvsMap.ct);
                } else {
                    params.put('content_type', supportedContentTypes[bvsMap.ct]);
                }
            }
            if (!empty(bvsMap.st)) {
                if (empty(supportedSubjectTypes[bvsMap.st])) {
                    Logger.error('[libCloudSEO.ds][getBVStateParams()] Unsupported Subject Type: ' + bvsMap.st);
                } else {
                    params.put('subject_type', supportedSubjectTypes[bvsMap.st]);
                }
            }
            if (!empty(bvsMap.reveal)) {
                params.put('bvreveal', bvsMap.reveal);
            }
        }

        var bvsUsed = false;
        if (params.size() > 0) {
            bvsUsed = true;
        }
        params.put('base_url_bvstate', bvsUsed);

        if (empty(params.page)) {
            params.put('page', '1');
        }

        return params;
    };

    /** ****************
	* PRIVATE MEMBERS *
	******************/
    var reviews; var
        questions;
    var configMap = new HashMap();

    // required configurations, no defaults
    configMap.product_id = '';
    configMap.deployment_zone_id = '';
    configMap.cloud_key = '';

    // optional configurations
    configMap.staging = true;
    configMap.current_page_url = getCurrentUrl();
    configMap.subject_type = 'product';

    // timeout values are pulled from service profiles below, but we are setting defaults here
    configMap.execution_timeout = 500;
    configMap.execution_timeout_bot = 2000;

    configMap.charset = 'UTF-8';
    configMap.content_type = 'reviews';
    configMap.bot_list = '(msnbot|google|teoma|bingbot|yandexbot|yahoo)';
    configMap.bot_detection = true;
    configMap.seo_sdk_enabled = true;
    configMap.page = '1';
    configMap.page_params = request.httpParameters.containsKey('bvstate') ? getBVStateParams(request.httpParameters.bvstate[0]) : new HashMap();
    configMap.bvreveal = request.httpParameters.containsKey('bvreveal') ? request.httpParameters.bvreveal[0] : '';
    configMap.ssl_enabled = true;

    /** ****************
	* PUBLIC METHODS  *
	******************/
    return {
        init: function (config) {
            Object.keys(config).forEach(
                function (param) {
                    if (configMap.containsKey(param)) {
                        configMap[param] = config[param];
                    } else {
                        Logger.debug('init() Incorrect parameter passed to BVSEO: ' + param);
                    }
                });
            // we may need to pull the bvreveal parameter from the session
            if (empty(configMap.bvreveal) && !empty(session.privacy.bvreveal)) {
                configMap.bvreveal = session.privacy.bvreveal;
            }

            reviews = new SEOContent(configMap, 'reviews');
            questions = new SEOContent(configMap, 'questions');
        },

        reviews: function () {
            return reviews;
        },

        questions: function () {
            return questions;
        }

    };
}
exports.getBVSEO = function (config) {
    var configuration = config;
    // test for required parameters before we begin
    if (empty(config.product_id)) {
        Logger.error('Error initializing cloud SEO object.  Missing product_id.');
        return null;
    }

    /*
	* The BV cloud SEO SDKs all pass in the key and deployment zone id as config parameters.
	* For this cartridge, it makes more sense to pull the values from the Site Preferences here.
	* The only dynamic parameter is the product id, so why complicate the integration?
	*/
    configuration.cloud_key = dw.system.Site.getCurrent().getCustomPreferenceValue('bvCloudSEOKey_C2013');
    if (empty(config.cloud_key)) {
        Logger.error('Error initializing cloud SEO object.  Missing cloud_key.');
        return null;
    }

    var bvdisplay = BVHelper.getDisplayData();

    /*
	* If the SEODisplayCode varant is empty, then try to use the Deployment Zone.
	*/
    configuration.deployment_zone_id = bvConstants.SEODisplayCode;
    if (empty(config.deployment_zone_id)) {
        configuration.deployment_zone_id = bvdisplay.zone;
        if (empty(config.deployment_zone_id)) {
            Logger.error('Error initializing cloud SEO object.  Missing deployment_zone_id.  You must supply either bvCloudSEODisplayCode_C2013 or bvDeploymentZone_C2013');
            return null;
        }
    }

    var locale = bvdisplay.locale;
    if (!empty(locale)) {
        configuration.deployment_zone_id += '-' + locale;
    }

    /*
	* Check the site preference to decide if this is the staging or production environment.
	*/
    var env = BVHelper.getEnvironment();
    if (!empty(env) && env.toLowerCase() === 'production') {
        configuration.staging = false;
    }

    var bvseo = new BVSEO();
    bvseo.init(configuration);
    return bvseo;
};
