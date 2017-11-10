(function( module ){
'use strict';

	const selenium = require('selenium-webdriver');
	const chrome = require('selenium-webdriver/chrome');

	const HeadlessChromeDriver = function () {

		const
			options =new chrome.Options()
		;

		// options.addArguments('headless');
		// // Use --disable-gpu to avoid an error from a missing Mesa
		// // library, as per
		// // https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
		// options.addArguments('disable-gpu');

		const
			driver = new selenium.Builder()
								 .forBrowser('chrome')
								 .setChromeOptions(options)
								 .build()
		;

		driver.manage().window().maximize()
	};

	function createSession(){
		return new HeadlessChromeDriver();
	}
	
	module.exports = createSession;


})( module );
