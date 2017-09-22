(function base_page_module(){
	'use strict';

	const
		driver_config   = require( './config/driver_config' )
	;


	class BasePage {
		constructor() {
			this.delegate( driver_config );
			this.image_data = null;
		}

		delegate( obj ){
			Object.keys( obj ).forEach( prop_name => {
				Object.defineProperty( this, prop_name, {
					get: function(){ return obj[ prop_name ]; }
				});
			});
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
			input_element.sendKeys( this.Key.TAB );
		}

		snapshot( ){
			this.taking_pictures( true );

			return this.browser.takeScreenshot()
				.then( image_data => { this.image_data = image_data; this.taking_pictures( false ); } )
			;
		}
	}

	module.exports = BasePage;

})();
