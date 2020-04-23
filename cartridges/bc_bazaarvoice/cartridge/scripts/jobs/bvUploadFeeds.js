/* eslint-disable consistent-return */
'use strict';

var File = require('dw/io/File');
var Site = require('dw/system/Site');
var Status = require('dw/system/Status');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'bvUploadFeed.js');

var bvConstants = require('*/cartridge/scripts/lib/libConstants').getConstants();
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
        var pattern; var remotePath; var
            localPath;

        switch (type) {
            case 'Purchase':
                pattern = bvConstants.PurchaseFeedPrefix + '_' + Site.current.ID;
                remotePath = bvConstants.PurchaseFeedPath;
                localPath = bvConstants.PurchaseFeedLocalPath;
                break;

            case 'Product':
            default:
                pattern = bvConstants.ProductFeedPrefix + '_' + Site.current.ID;
                remotePath = bvConstants.ProductFeedPath;
                localPath = bvConstants.ProductFeedLocalPath;
                break;
        }

        var fileregex = new RegExp('^' + pattern + '_\\d{14}\\.xml$');
        var localPathFile = new File([File.TEMP, localPath].join(File.SEPARATOR));
        var localFiles = localPathFile.listFiles(function (f) {
            return fileregex.test(f.name);
        });

        var service = ServiceRegistry.createService('bazaarvoice.sftp.export.' +
        Site.current.ID, {
            createRequest: function () {
                return service;
            },

            parseResponse: function (svc, res) {
                return res;
            },
            filterLogMessage: function (msg) {
                return msg;
            }
        });
        var result = service.setOperation('cd', remotePath).call();
        if (!result.isOk()) {
            Logger.error('Problem testing sftp server. path: {0}, result: {1}', remotePath, result.msg);
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
                result = service.setOperation('del', remotePath + '/' + f.name).call();
                if (!result.isOk()) {
                    Logger.error('Problem deleting existing file: ' + result.msg);
                }
            }
        }

        for (var j = 0; j < localFiles.length; j++) {
            var file = localFiles[j];

            result = service.setOperation('putBinary', remotePath + '/' + file.name, file).call();
            if (!result.isOk()) {
                Logger.error('Problem uploading file: ' + result.msg);
                return new Status(Status.ERROR);
            }
            file.remove();
        }
    } catch (ex) {
        Logger.error('Exception caught during product feed upload: {0}', ex.message);
        return new Status(Status.ERROR);
    }

    return new Status(Status.OK);
}

module.exports.execute = execute;
