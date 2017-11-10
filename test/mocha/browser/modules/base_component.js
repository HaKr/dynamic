(function base_page_module(){
	'use strict';

	const
		driver_config   = require( './config/driver_config' )
	;

	class BaseComponent {
		constructor() {
			this.delegate( driver_config );
		}

		delegate( obj ){
			Object.keys( obj ).forEach( prop_name => {
				Object.defineProperty( this, prop_name, {
					get: function(){ return obj[ prop_name ]; }
				});
			});
		}

		setInputValue( input_element, value ){
			input_element.clear();
			input_element.sendKeys( value );
			input_element.sendKeys( this.Key.TAB );
		}

		setCheckable( input_element, true_or_false ){
			if ( input_element.isSelected() !== true_or_false ){
				return input_element.click();
			}

		}
	}

	module.exports = BaseComponent;

})();
