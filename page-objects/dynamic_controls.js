

class ReportPane {
	constructor ( container_locator ){
		this.valueTextLocator 		= by.css('.value-value.text');
		this.valueCheckboxLocator 	= by.css('.value-value.checkbox');
		this.valueRadioLocator		= by.css('.value-value.radio');
		this.valueSelectLocator		= by.css('.value-value.dropdown');

		this.container					= driver.findElement( container_locator );
		this.loadElements();
	}

	loadElements() {
		this.valueText 			= this.container.findElement( this.valueTextLocator );
		this.valueCheckbox 		= this.container.findElement( this.valueCheckboxLocator );
		this.valueRadio 			= this.container.findElement( this.valueRadioLocator );
		this.valueDropdown 		= this.container.findElement( this.valueSelectLocator );
	}

	reportValues(){
		let result ={};

		return new Promise( resolve => {
			Promise.all([
				this.valueText.getText().then( t => { result.text = t; } ),
				this.valueCheckbox.getText().then( t => { result.checkbox = t; } ),
				this.valueRadio.getText().then( t => { result.radio = t; } ),
				this.valueDropdown.getText().then( t => { result.dropdown = t; } )
			])
			.then( _ => {
				resolve( result );
			});
		});
	}
}


module.exports = {
	url: 'file://'+__dirname+'/../test/assets/html/inputs.html',


	locators: {
		inputTextLocator 				: by.name('value[text]'),
		inputCheckboxLocator 		: by.name('value[checkbox]'),
		inputRadioRedLocator			: by.css('input[name="value[radio]"][value=red]'),
		inputRadioGreenLocator		: by.css('input[name="value[radio]"][value=green]'),
		inputRadioBlueLocator		: by.css('input[name="value[radio]"][value=blue]'),
		inputSelectLocator			: by.name('value[dropdown]'),
		optionCyanLocator				: by.css('option:nth-child(1)'),
		optionMagentaLocator			: by.css('option:nth-child(2)'),
		optionYellowLocator			: by.css('option:nth-child(3)'),

		reportByNameLocator			: by.css('.report-by-name'),
		reportByReferenceLocator	: by.css('.report-by-reference'),
	},


    elements: {
    },

	 getElements: function(){
		 this.elements.inputText 			= driver.findElement( this.locators.inputTextLocator );
		 this.elements.inputCheckbox 		= driver.findElement( this.locators.inputCheckboxLocator );

		 this.elements.inputRadioRed		= driver.findElement( this.locators.inputRadioRedLocator );
		 this.elements.inputRadioGreen	= driver.findElement( this.locators.inputRadioGreenLocator );
		 this.elements.inputRadioBlue		= driver.findElement( this.locators.inputRadioBlueLocator );
		 this.elements.radio_selects = {
			 red: 		this.elements.inputRadioRed,
			 green: 	this.elements.inputRadioGreen,
			 groen: 	this.elements.inputRadioGreen,
			 blue: 	this.elements.inputRadioBlue
		 };

		 this.elements.inputDropdown 		= driver.findElement( this.locators.inputSelectLocator )
			 .then( dd => {
				 this.elements.optionCyan         = dd.findElement( this.locators.optionCyanLocator );
				 this.elements.optionMagenta      = dd.findElement( this.locators.optionMagentaLocator );
				 this.elements.optionYellow       = dd.findElement( this.locators.optionYellowLocator );

				 this.elements.select_options = {
					 'Cyan': this.elements.optionCyan,
					 'Magenta': this.elements.optionMagenta,
					 'Yellow': this.elements.optionYellow,
					 'Geel': this.elements.optionYellow
				 };
			 });

		 this.elements.reportByName 		= new ReportPane( this.locators.reportByNameLocator );
		 this.elements.reportByReference = new ReportPane( this.locators.reportByReferenceLocator );

	 },

	 get_page_info: function(){
	 	return new Promise( resolve => {
	 		let result = {};
	 		Promise.all([
	 			this.elements.reportByName.reportValues().then( rv => { result.reportByName = rv; } ),
	 			this.elements.reportByReference.reportValues().then( rv => { result.reportByReference = rv; } )
	 		])
	 		.then( _=>{ resolve( result ); } )
	 		;
	 	});
	},

	set_text( val ){
		return shared.helpers.setInputValue( this.elements.inputText, val );
	},

	set_checkbox( true_or_false ){
		return shared.helpers.setCheckable( this.elements.inputCheckbox, true_or_false );
	},

	set_radio( val ){
		return shared.helpers.setCheckable( this.elements.radio_selects[val], true );
	},

	set_dropdown( val ){
		return this.elements.select_options[val].click();
	}


    /**
     * enters a search term into Google's search box and presses enter
     * @param {string} searchQuery
     * @returns {Promise} a promise to enter the search values
     */
};
