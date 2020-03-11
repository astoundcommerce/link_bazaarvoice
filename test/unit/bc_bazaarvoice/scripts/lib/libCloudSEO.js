var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');

/*describe('libCloudSEO', function () {
    const libCloudSEO = proxyquire('../../../../../cartridges/bc_bazaarvoice/cartridge/scripts/lib/libCloudSEO', {
        'dw/web/URLUtils': {},
        'dw/util/StringUtils': {},
        'dw/util/Calendar': {},
        'dw/util/HashMap': {},
        'dw/svc/LocalServiceRegistry': {},
        'dw/system/Logger': {
            getLogger: function () {}
        },
        'bc_bazaarvoice/cartridge/scripts/lib/libConstants':
            require('../../../../../cartridges/bc_bazaarvoice/cartridge/scripts/lib/libConstants'),
        'bc_bazaarvoice/cartridge/scripts/lib/libBazaarvoice':{
            getBazaarVoiceHelper: function () {}
        }
    });
});*/