'use strict';

const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const URLUtils = require('dw/web/URLUtils');
const XMLStreamWriter = require('dw/io/XMLIndentingStreamWriter');
const Logger = require('dw/system/Logger').getLogger('Bazaarvoice', 'XMLHelper.js');

const BV_Constants = require('*/cartridge/scripts/lib/libConstants').getConstants();
const BVHelper = require('*/cartridge/scripts/lib/libBazaarvoice').getBazaarVoiceHelper();

var _file,
	_fileWriter,
	_xmlStreamWriter;

var defaultLocale = request.getLocale();

function getStreamWriter(filename) {
	if(_xmlStreamWriter) {
		Logger.debug('Retrieving xml stream writer.');
		return true;
	}
	
	if(!filename) {
		Logger.error('filename is empty!  Cannot create XMLStreamWriter.');
		return false;
	}
	
	var filepath = [File.TEMP, 'bv', 'product'].join(File.SEPARATOR);
	var filepathFile = new File(filepath);
	filepathFile.mkdirs();
	_file = new File(filepathFile, filename);
	_fileWriter = new FileWriter(_file);
	_xmlStreamWriter = new XMLStreamWriter(_fileWriter);
	
	return true;
}

function startProductFeed() {
	var cal = new Calendar();
	var extract = StringUtils.formatCalendar(cal, 'yyyyMMdd') + 'T00:00:00.000000';
	
	_xmlStreamWriter.writeStartDocument('UTF-8', '1.0');
	_xmlStreamWriter.writeCharacters('\n');
	_xmlStreamWriter.writeStartElement('Feed');
	_xmlStreamWriter.writeAttribute('xmlns', BV_Constants.XML_NAMESPACE_PRODUCT);
	_xmlStreamWriter.writeAttribute('name', BVHelper.getCustomerName());
	_xmlStreamWriter.writeAttribute('incremental', BV_Constants.XML_INCREMENTAL);
	_xmlStreamWriter.writeAttribute('extractDate', extract);
	_xmlStreamWriter.writeAttribute('generator', BV_Constants.XML_GENERATOR);
}

function finishProductFeed(xsw) {
	_xmlStreamWriter.writeEndElement();  //</Feed>
	_xmlStreamWriter.writeEndDocument();
   
	_xmlStreamWriter.flush();
	_xmlStreamWriter.close();
	
	_xmlStreamWriter = null;
}

function transition(endNode, startNode) {
	if(endNode) {
		_xmlStreamWriter.writeEndElement();
	}
	
	if(startNode) {
		_xmlStreamWriter.writeStartElement(startNode);
	}
}

function writeProductFeedItem(item, localeMap) {
	var multiLocale = localeMap && localeMap.keySet() && localeMap.keySet().length > 1;
	
	switch(item.type) {
		case 'Brands':
			var brand = item.obj;
			_xmlStreamWriter.writeStartElement('Brand');
			writeElementCDATA('Name', brand.value);
	        writeElementCDATA('ExternalId', BVHelper.replaceIllegalCharacters(brand.value));
			_xmlStreamWriter.writeEndElement();
			break;
			
			
		case 'Categories':
			var category = item.obj;
			_xmlStreamWriter.writeStartElement('Category');
		    writeElement('ExternalId', BVHelper.replaceIllegalCharacters(category.ID));
		    
		    var parent = category.getParent();
		    if(parent != null) {
		        //We don't want to set our ParentExternalId to 'root', so make sure the parent of this parent is non-null
		        var parentOfParent = parent.getParent();    
		        if(parentOfParent != null) {
		            writeElement('ParentExternalId', BVHelper.replaceIllegalCharacters(parent.ID));
		        }
		    }
		    
		    writeElementCDATA('Name', category.displayName);
		    writeElement('CategoryPageUrl', URLUtils.https('Search-Show','cgid',category.ID));
		    
		    if(multiLocale) {
		    	var dwLocales = localeMap.keySet();
		    	
		    	_xmlStreamWriter.writeStartElement('CategoryPageUrls');
		    	for(var i = 0; i < dwLocales.length; i++) {
		    		var dwLocale = dwLocales[i];
		    		var bvLocale = localeMap.get(dwLocale);
		    		request.setLocale(dwLocale);
		    		
		    		writeLocalizedElement('CategoryPageUrl', bvLocale, URLUtils.https('Search-Show','cgid',category.ID));
		    	}
		    	_xmlStreamWriter.writeEndElement();
		    	
		    	_xmlStreamWriter.writeStartElement('Names');
		    	for(var i = 0; i < dwLocales.length; i++) {
		    		var dwLocale = dwLocales[i];
		    		var bvLocale = localeMap.get(dwLocale);
		    		request.setLocale(dwLocale);
		    		
		    		writeLocalizedElementCDATA('Name', bvLocale, category.displayName);
		    	}
		    	_xmlStreamWriter.writeEndElement();
		    }
		    
		    request.setLocale(defaultLocale);
		    
		    _xmlStreamWriter.writeEndElement();
			break;
			
			
		case 'Products':
			var product = item.obj;
			if(product.online && product.searchable && (BV_Constants.EnableProductFamilies || !product.variant)) {
				_xmlStreamWriter.writeStartElement('Product');
			    
			    writeElement('ExternalId', BVHelper.replaceIllegalCharacters(product.ID));
			    var pname = !empty(product.name) ? product.name : '';
			    writeElementCDATA('Name', pname);
			    writeElementCDATA('Description', (product.shortDescription == null ? pname : product.shortDescription));
			    
			    if (product.getBrand() != null && !empty(product.brand) ) {
			    	writeElementCDATA('BrandExternalId', BVHelper.replaceIllegalCharacters(product.brand));
			    }
			    
			    var categoryExternalId = BV_Constants.CATEGORY_NONE;
			    if(product.primaryCategory != null) {
			        categoryExternalId = product.primaryCategory.ID;
			    } else {
			        var allCategories = product.allCategories;
			        if(allCategories.size() > 0) { 
			            categoryExternalId = allCategories.iterator().next().ID;
			        } 
			    }
			    writeElement('CategoryExternalId', BVHelper.replaceIllegalCharacters(categoryExternalId));
			    
			    writeElement('ProductPageUrl', URLUtils.https('Product-Show','pid',product.ID));
			    
			    var prodImage = BVHelper.getImageURL(product, BV_Constants.PRODUCT);
			    if (!empty(prodImage)) {
			    	writeElement('ImageUrl', prodImage); 
			    }
			    
			    //Manufacturer Part Number
			    if(product.manufacturerSKU != null){
			    	_xmlStreamWriter.writeStartElement('ManufacturerPartNumbers');
			        writeElement('ManufacturerPartNumber', product.manufacturerSKU);
			        _xmlStreamWriter.writeEndElement();
			    }
			    
			    //European Article Number
			    if(product.EAN != null && !empty(product.EAN)){
			    	_xmlStreamWriter.writeStartElement('EANs');
			        writeElement('EAN', product.EAN);
			        _xmlStreamWriter.writeEndElement();
			    } else if(product.master) {
			    	var showEans = false;
			    	for(var i = 0; i < product.variants.length; i++) {
			            if(!empty(product.variants[i].EAN)) {
			                showEans = true;
			                break;
			            }
			        }
			        
			        if(showEans) {
			        	_xmlStreamWriter.writeStartElement('EANs');
			        	for(var i = 0; i < product.variants.length; i++) {
				            if(!empty(product.variants[i].EAN)) {
				                writeElement('EAN', product.variants[i].EAN);
				            }
				        }
				        _xmlStreamWriter.writeEndElement();
			        }
			    }
			        
			    //Universal Product Code
			    if(product.UPC != null && !empty(product.UPC)){
			    	_xmlStreamWriter.writeStartElement('UPCs');
			        writeElement('UPC', product.UPC);
			        _xmlStreamWriter.writeEndElement();
			    } else if(product.master) {
			    	var showUpcs = false;
			    	for(var i = 0; i < product.variants.length; i++) {
			            if(!empty(product.variants[i].UPC)) {
			            	showUpcs = true;
			                break;
			            }
			        }
			        
			        if(showUpcs) {
			        	_xmlStreamWriter.writeStartElement('UPCs');
			        	for(var i = 0; i < product.variants.length; i++) {
				            if(!empty(product.variants[i].UPC)) {
				                writeElement('UPC', product.variants[i].UPC);
				            }
				        }
				        _xmlStreamWriter.writeEndElement();
			        }
			    }
			    
			    //add product family attributes here for variants and masters,
			    //only if Product Families are enabled in libConstants.ds
			    if(BV_Constants.EnableProductFamilies && (product.master || product.variant)) {
			    	_xmlStreamWriter.writeStartElement('Attributes');
			    	
			    	//use the master ID plus '-family' as the family ID
			    	var familyId = product.master ? product.ID : product.variationModel.master.ID;
			    	familyId = BVHelper.replaceIllegalCharacters(familyId + '-family');
			    	
			    	//write family attribute
			    	_xmlStreamWriter.writeStartElement('Attribute');
			    	_xmlStreamWriter.writeAttribute('id', 'BV_FE_FAMILY');
			    	writeElement('Value', familyId);
			    	_xmlStreamWriter.writeEndElement();
			    	
			    	//write expand attribute
			    	_xmlStreamWriter.writeStartElement('Attribute');
			    	_xmlStreamWriter.writeAttribute('id', 'BV_FE_EXPAND');
			    	writeElement('Value', 'BV_FE_FAMILY:' + familyId);
			    	_xmlStreamWriter.writeEndElement();
			    	
			    	_xmlStreamWriter.writeEndElement();
			    }
			    
			    
			    if(multiLocale) {
			    	var dwLocales = localeMap.keySet();
			    	
			    	//Localized Names
			    	_xmlStreamWriter.writeStartElement('Names');
			    	for(var i = 0; i < dwLocales.length; i++) {
			    		var dwLocale = dwLocales[i];
			    		var bvLocale = localeMap.get(dwLocale);
			    		request.setLocale(dwLocale);
			    		
			    		var lpname = !empty(product.name) ? product.name : '';
			    		writeLocalizedElementCDATA('Name', bvLocale, lpname);
			    	}
			    	_xmlStreamWriter.writeEndElement();
			    	
			    	//Localized Descriptions
			    	_xmlStreamWriter.writeStartElement('Descriptions');
			    	for(var i = 0; i < dwLocales.length; i++) {
			    		var dwLocale = dwLocales[i];
			    		var bvLocale = localeMap.get(dwLocale);
			    		request.setLocale(dwLocale);
			    		
			    		var lpname = !empty(product.name) ? product.name : '';
			    		writeLocalizedElementCDATA('Description', bvLocale,  product.shortDescription? product.shortDescription : lpname);
			    	}
			    	_xmlStreamWriter.writeEndElement();
			    	
			    	//Localized PDP Urls
			    	_xmlStreamWriter.writeStartElement('ProductPageUrls');
			    	for(var i = 0; i < dwLocales.length; i++) {
			    		var dwLocale = dwLocales[i];
			    		var bvLocale = localeMap.get(dwLocale);
			    		request.setLocale(dwLocale);
			    		
			    		writeLocalizedElement('ProductPageUrl', bvLocale, URLUtils.https('Product-Show', 'pid', product.ID));
			    	}
			    	_xmlStreamWriter.writeEndElement();
			    	
			    	//Localized Image Urls
			    	_xmlStreamWriter.writeStartElement('ImageUrls');
			    	for(var i = 0; i < dwLocales.length; i++) {
			    		var dwLocale = dwLocales[i];
			    		var bvLocale = localeMap.get(dwLocale);
			    		request.setLocale(dwLocale);
			    		
			    		var prodImage = BVHelper.getImageURL(product, BV_Constants.PRODUCT);
					    if (!empty(prodImage)) {
					    	writeLocalizedElement('ImageUrl', bvLocale, prodImage); 
					    }
			    	}
			    	_xmlStreamWriter.writeEndElement();
			    }
			    
			    request.setLocale(defaultLocale);
			    
			    _xmlStreamWriter.writeEndElement();
	        }
			break;
	}
}

function writeElement(elementName, chars) {
	_xmlStreamWriter.writeStartElement(elementName);
	_xmlStreamWriter.writeCharacters(chars);
	_xmlStreamWriter.writeEndElement();
}

function writeLocalizedElement(elementName, locale, chars) {
	_xmlStreamWriter.writeStartElement(elementName);
	_xmlStreamWriter.writeAttribute('locale', locale);
	_xmlStreamWriter.writeCharacters(chars);
	_xmlStreamWriter.writeEndElement();
}

function writeElementCDATA(elementName, chars) {
	_xmlStreamWriter.writeStartElement(elementName);
	_xmlStreamWriter.writeCData(chars != null ? chars : '');
	_xmlStreamWriter.writeEndElement();
}

function writeLocalizedElementCDATA(elementName, locale, chars) {
	_xmlStreamWriter.writeStartElement(elementName);
	_xmlStreamWriter.writeAttribute('locale', locale);
	_xmlStreamWriter.writeCData(chars != null ? chars : '');
	_xmlStreamWriter.writeEndElement();
}

module.exports = {
	getStreamWriter : getStreamWriter,
	startProductFeed : startProductFeed,
	finishProductFeed : finishProductFeed,
	transition: transition,
	writeProductFeedItem: writeProductFeedItem
};