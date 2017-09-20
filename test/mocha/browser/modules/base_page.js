(function base_page_module(){
	'use strict';

	const
		app_config      = require( './config/app_config' ),
		driver_config   = require( './config/driver_config' ),
		fs              = require( 'fs' )
	;


	class BasePage {
		constructor() {
			this.app_config = app_config;
			this.browser = driver_config.browser;
			this.By = driver_config.By;
			this.until = driver_config.until;
			this.Key = driver_config.Key;
			this.PromiseManager = driver_config.PromiseManager;
		}

		get ( url, locator ) {
			this.url = url;

			return this.browser
						.get( url )
						.then( () => {
							return this.browser.findElement( locator );
						});
		}


		setInputValue( input_element, value ){
			input_element.clear();
			input_element.sendKeys( value );
			// this.fireEvent( input_element, 'change' );
			input_element.sendKeys( this.Key.TAB );
		}

		capture( name ){

			const p = this.browser.takeScreenshot();

			console.log( `Capturing as ${name}` );

			p
				.then( ( image_data, err ) => {
					const
						d = new Date(),
						datestring = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) +
							" " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)+ ":" + ("0" + d.getSeconds()).slice(-2),
						filename = "./screenshots/" + datestring + '_' + name + '.png'
					;
					console.log( `Write "${name}" to ${filename}` );
					fs.writeFile(filename, image_data, 'base64', function(err) {
						if (err){
							throw new Error('Error while saving screenshot.'+err );
						}
					});
				})
				.catch( err => {
					console.log( `Kaboooom!!!!`, err );
				})
			;

		}
	}

	module.exports = BasePage;

})();
