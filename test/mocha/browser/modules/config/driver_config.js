// Sep 2017
// The way to specify which browser to use and how to modify it's configuration
// is not at all clear.
// The way below seems to work on Linux with Chrome....
const
   webdriver = require('selenium-webdriver'),
	webdriver_test = require('selenium-webdriver/testing'),
	until= require('selenium-webdriver/lib/until'),

	chrome = require('selenium-webdriver/chrome'),
	//  Capabilities = require('selenium-webdriver/lib/capabilities').Capabilities,
	//  chrome = Capabilities.chrome(),
	options =new chrome.Options(),
   result = { browser: null, By: null, Until: null, Key: null, PromiseManager: null }
;

options.addArguments('headless');

const
	browser = new webdriver.Builder()
						 .forBrowser('chrome')
						 .setChromeOptions(options)
						 .build()
;

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
result.Test = webdriver_test;

result.taking_pictures = function( flag ){
	is_taking_pictures = flag;
	if ( !is_taking_pictures && wants_to_close ){
		// using a Promise here, to get it scheduled after possibly outstanding file writes
		Promise.resolve( true ).then( () => { clean_up(); } );
	}
};

module.exports = result;
