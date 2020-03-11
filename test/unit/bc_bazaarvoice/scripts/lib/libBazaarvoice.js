const assert = require('chai').assert;
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();
const sinon = require('sinon');

describe('libBazaarvoice', function () {
    const libBazaarvoice = proxyquire('../../../../../cartridges/bc_bazaarvoice/cartridge/scripts/lib/libBazaarvoice', {
        'dw/system/Site': {
            getCurrent: function () {
                return {
                    getCustomPreferenceValue: function (param) {
                        return param;
                    }
                };
            }
        },
        'dw/crypto/MessageDigest': {},
        'dw/util/StringUtils': {},
        'dw/util/Calendar': {},
        'dw/svc/LocalServiceRegistry': {},
        'dw/system/Logger': {
            getLogger: function (){}
        },
        'bc_bazaarvoice/cartridge/scripts/lib/libConstants':
            require('../../../../../cartridges/bc_bazaarvoice/cartridge/scripts/lib/libConstants')
    });
    it('replaceIllegalCharacters function testing', function() {
        let result = libBazaarvoice.getBazaarVoiceHelper().replaceIllegalCharacters('testing&cartridge/');
        assert.equal(result, 'testing_and_cartridge_fslash_');
    });
    it('decodeId function testing', function() {
        let result = libBazaarvoice.getBazaarVoiceHelper().decodeId('testing_and_cartridge_fslash_');
        assert.equal(result, 'testing&cartridge/');
    });
    it('BVConstants function testing', function() {
        let result = libBazaarvoice.getBazaarVoiceHelper().bvConstants();
        assert.equal(result, 'sftp-stg.bazaarvoice.com');
    });
});