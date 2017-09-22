(function(){

'use strict';


const
    webdriver = require('selenium-webdriver'),
   //  phantomjs = require('phantomjs'),
	//  phantomjs = require('selenium-webdriver/phantomjs'),
	 Capabilities = require('selenium-webdriver/lib/capabilities').Capabilities,
	 phantomjs = Capabilities.phantomjs(),
	 // firefox = Capabilities.firefox(),
	 chrome = Capabilities.chrome(),

    result = { browser: null, By: null, Until: null, Key: null, PromiseManager: null }
;
// chrome.set('window-size','1200x600');
// chrome.set('headless',true);
// chrome.set('marionette', true);

const
	browser = new webdriver.Builder()
						 .withCapabilities(chrome)
						 .build()
;
// these 3 lines are required with firefox 47+
// var Capabilities = require('selenium-webdriver/lib/capabilities').Capabilities;
// var capabilities = Capabilities.phantomjs();
// capabilities.set('marionette', true);

// var browser = new webdriver.Builder().withCapabilities(capabilities).build();



/**
 * Since we created the driver, we should remove it:
 */
var
	when_done = null,
	wants_to_close = false,
	is_taking_pictures = false
;

function clean_up(){
	// console.log( 'Closing the browser' );
   browser.quit();
	result.browser = null;
   if (typeof when_done === 'function'){
   	when_done();
   }
}

after(function(done) {
	when_done = done;

	if ( is_taking_pictures ){
		wants_to_close = true;
	} else {
		clean_up();
	}
});

result.browser = browser;
result.By = webdriver.By;
result.Until = webdriver.until;
result.Key = webdriver.Key;
result.PromiseManager = webdriver.promise;

result.taking_pictures = function( flag ){
	is_taking_pictures = flag;
	if ( !is_taking_pictures && wants_to_close ){
		// using a Promise here, to get it scheduled after possibly outstanding file writes
		Promise.resolve( true ).then( () => { clean_up(); } );
	}
};

module.exports = result;

})();
