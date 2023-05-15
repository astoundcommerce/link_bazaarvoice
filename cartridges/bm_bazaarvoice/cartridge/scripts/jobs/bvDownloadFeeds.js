'use strict';

var File = require('dw/io/File');
var Status = require('dw/system/Status');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'bvDownloadFeeds.js');

var bvConstants = require('bm_bazaarvoice/cartridge/scripts/lib/libConstants').getConstants();

/**
 * Connects to BAzaarvoice's ftp server and attempts to
 * download and unzip the product ratings feed
 * @returns {Status} Status of "OK if successful, or "Error"
 */
module.exports.execute = function () {
    try {
        var service = ServiceRegistry.createService('bazaarvoice.sftp.import', {
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
        var result;

        var fpath = bvConstants.RatingsFeedPath;
        if (empty(fpath)) {
            throw new Error('bvConstants.RatingsFeedPath is null or empty! Verify the configuration in libConstants.js');
        }
        var fname = bvConstants.RatingsFeedFilename;
        if (empty(fname)) {
            throw new Error('bvConstants.RatingsFeedFilename is null or empty! Verify the configuration in libConstants.js');
        }

        result = service.setOperation('cd', fpath).call();
        if (!result.isOk()) {
            throw new Error('Error while accessing folder on BV FTP Server.');
        }

        // make sure the directories have been made
        var tempPath = [File.TEMP, 'bv', 'ratings'].join(File.SEPARATOR);
        var tempFile = new File(tempPath);
        tempFile.mkdirs();

        // create the file for downloading
        tempPath = [File.TEMP, 'bv', 'ratings', 'ratings.xml.gz'].join(File.SEPARATOR);
        tempFile = new File(tempPath);

        result = service.setOperation('getBinary', fpath + File.SEPARATOR + fname, tempFile).call();
        if (result.isOk()) {
            // gunzip
            tempPath = [File.TEMP, 'bv', 'ratings'].join(File.SEPARATOR);
            tempFile.gunzip(new File(tempPath));

            // need to rename the file after gunzip to remove the .gz
            tempPath = [File.TEMP, 'bv', 'ratings', 'ratings.xml'].join(File.SEPARATOR);
            tempFile = new File(tempPath);

            if (!tempFile.exists()) {
                throw new Error('GUNZIP of ratings.xml.gz was unsuccessful.  ratings.xml does not exist.');
            }
        } else {
            Logger.info('Download failed: ' + result.msg);
            return new Status(Status.ERROR, 'ERROR', result.msg);
        }
    } catch (e) {
        Logger.error('Exception caught: ' + e.message);
        return new Status(Status.ERROR, 'ERROR', e.message);
    }

    return new Status(Status.OK);
};
