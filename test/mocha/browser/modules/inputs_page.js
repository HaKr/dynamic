(function(){
'use strict';

const
	BaseComponent = require( './base_component' ),
	BasePage      = require( './base_page' )
;

class ReportPane extends BaseComponent {
	constructor ( container_locator ){
		super();

		this.valueTextLocator 		= this.By.css('.value-value.text');
		this.valueCheckboxLocator 	= this.By.css('.value-value.checkbox');
		this.valueRadioLocator		= this.By.css('.value-value.radio');
		this.valueSelectLocator		= this.By.css('.value-value.dropdown');

		this.container					= this.browser.findElement( container_locator );
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

	get input_text(){
		return this.valueText.getText();
	}
	get checkbox_text(){
		return this.valueCheckbox.getText();
	}
	get radio_text(){
		return this.valueRadio.getText();
	}
	get dropdown_text(){
		return this.valueDropdown.getText();
	}
}

class InputPage extends BasePage {
	constructor( url ){
		super();

		this.url = url;

		this.inputTextLocator 			= this.By.name('value[text]');
		this.inputCheckboxLocator 		= this.By.name('value[checkbox]');
		this.inputRadioRedLocator		= this.By.css('input[name="value[radio]"][value=red]');
		this.inputRadioGreenLocator	= this.By.css('input[name="value[radio]"][value=green]');
		this.inputRadioBlueLocator		= this.By.css('input[name="value[radio]"][value=blue]');
		this.inputSelectLocator			= this.By.name('value[dropdown]');
		this.optionCyanLocator			= this.By.css('option:nth-child(1)');
		this.optionMagentaLocator		= this.By.css('option:nth-child(2)');
		this.optionYellowLocator		= this.By.css('option:nth-child(3)');

		this.reportByNameLocator		= this.By.css('.report-by-name');
		this.reportByReferenceLocator	= this.By.css('.report-by-reference');
	}

	load(){
		return this.get( this.url, this.inputTextLocator )
				.then( ()=> {
					this.inputText 			= this.browser.findElement( this.inputTextLocator );
					this.inputCheckbox 		= this.browser.findElement( this.inputCheckboxLocator );

					this.inputRadioRed		= this.browser.findElement( this.inputRadioRedLocator );
					this.inputRadioGreen		= this.browser.findElement( this.inputRadioGreenLocator );
					this.inputRadioBlue		= this.browser.findElement( this.inputRadioBlueLocator );
					this.radio_selects = {
						red: 		this.inputRadioRed,
						green: 	this.inputRadioGreen,
						blue: 	this.inputRadioBlue
					};

					this.inputDropdown 		= this.browser.findElement( this.inputSelectLocator )
						.then( dd => {
							this.optionCyan         = dd.findElement( this.optionCyanLocator );
							this.optionMagenta      = dd.findElement( this.optionMagentaLocator );
							this.optionYellow       = dd.findElement( this.optionYellowLocator );

							this.select_options = {
								'Cyan': this.optionCyan,
								'Magenta': this.optionMagenta,
								'Yellow': this.optionYellow
							};
						});

					this.reportByName 		= new ReportPane( this.reportByNameLocator );
					this.reportByReference 	= new ReportPane( this.reportByReferenceLocator );
				})
		;
	}

	set_text( val ){
		return this.setInputValue( this.inputText, val );
	}

	set_checkbox( true_or_false ){
		return this.setCheckable( this.inputCheckbox, true_or_false );
	}

	set_radio( val ){
		return this.setCheckable( this.radio_selects[val], true );
	}

	set_dropdown( val ){
		return this.select_options[val].click();
	}
}

module.exports = InputPage;

})( module );
