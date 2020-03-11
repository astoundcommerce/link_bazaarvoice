'use strict';

const File = require('dw/io/File');
const Site = require('dw/system/Site');
const Status = require('dw/system/Status');
const ServiceRegistry = require('dw/svc/LocalServiceRegistry');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice',
		'bvUploadFeed.js');

const BV_Constants = require(
		'bc_bazaarvoice/cartridge/scripts/lib/libConstants').getConstants();


/**
 * Returns a status of okay
 * @param {Object} parameters - object of site parameters
 * @returns {string} the status results
 */
function execute(parameters) {
    var enabled = parameters.Enabled;
    if (!enabled) {
        Logger.info('Upload step is not enabled, skipping....');
        return;
    }

    try {
        var type = parameters.FeedType;
        var pattern, remotePath, localPath;

        switch (type) {
            case 'Purchase':
                pattern = BV_Constants.PurchaseFeedPrefix + '_' + Site.current.ID;
                remotePath = BV_Constants.PurchaseFeedPath;
                localPath = BV_Constants.PurchaseFeedLocalPath;
                break;

            case 'Product':
            default:
                pattern = BV_Constants.ProductFeedPrefix + '_' + Site.current.ID;
                remotePath = BV_Constants.ProductFeedPath;
                localPath = BV_Constants.ProductFeedLocalPath;
                break;
        }

        var fileregex = new RegExp('^' + pattern + '_\\d{14}\\.xml$');
        var localPathFile = new File([ File.TEMP, localPath ]
				.join(File.SEPARATOR));
        var localFiles = localPathFile.listFiles(function(f) {
            return fileregex.test(f.name);
        });

        var service = ServiceRegistry.createService('bazaarvoice.sftp.export.'
				+ Site.current.ID, {
    createRequest : function(service, result) {
        return result;
    },

    parseResponse : function(svc, res) {
        return res;
    }
});

        var result = service.setOperation('cd', remotePath).call();
        if (!result.isOk()) {
            Logger.error('Problem testing sftp server. path: {0}, result: {1}',
					remotePath, result.msg);
            return new Status(Status.ERROR);
        }

        result = service.setOperation('list', remotePath).call();
        if (!result.isOk()) {
            Logger.error('Problem during sftp list operation: ' + result.msg);
            return new Status(Status.ERROR);
        }

        var allRemoteFiles = result.getObject();
        for (var i = 0; i < allRemoteFiles.length; i++) {
            var f = allRemoteFiles[i];
            if (fileregex.test(f.name) === true) {
                result = service.setOperation('del', remotePath + '/' + f.name)
						.call();
                if (!result.isOk()) {
                    Logger.error('Problem deleting existing file: '
							+ result.msg);
                }
            }
        }

        for (var i = 0; i < localFiles.length; i++) {
            var file = localFiles[i];

            result = service.setOperation('putBinary',
					remotePath + '/' + file.name, file).call();
            if (!result.isOk()) {
                Logger.error('Problem uploading file: ' + result.msg);
                return new Status(Status.ERROR);
            } else {
                file.remove();
            }
        }

    } catch (ex) {
        Logger.error('Exception caught during product feed upload: {0}',
				ex.message);
        return new Status(Status.ERROR);
    }

    return new Status(Status.OK);
}

module.exports.execute = execute;