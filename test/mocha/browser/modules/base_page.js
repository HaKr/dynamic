(function base_page_module(){
	'use strict';

	const
		BaseComponent   = require( './base_component' )
	;

	class BasePage extends BaseComponent {
		constructor() {
			super();
			this.image_data = null;
		}

		get ( url, locator ) {
			this.url = url;

			return this.browser
						.get( url )
						.then( () => {
							return this.browser.findElement( locator );
						});
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
