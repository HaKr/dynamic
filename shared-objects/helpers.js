module.exports = {

	setInputValue( input_element, value ){
		input_element.clear();
		input_element.sendKeys( value );
		return input_element.sendKeys( selenium.Key.TAB );
	},

	setCheckable( input_element, true_or_false ){
		if ( input_element.isSelected() !== true_or_false ){
			return input_element.click();
		}

	}

};
