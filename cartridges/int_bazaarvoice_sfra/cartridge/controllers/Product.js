'use strict';

var server = require('server');
server.extend(module.superModule);

var bazaarvoiceMiddleware = require('*/cartridge/scripts/middleware/bazaarvoice');

server.append('Show', bazaarvoiceMiddleware.appendBVData);

server.append('ShowInCategory', bazaarvoiceMiddleware.appendBVData);

server.append('ShowQuickView', bazaarvoiceMiddleware.appendBVQuickViewData);

module.exports = server.exports();
