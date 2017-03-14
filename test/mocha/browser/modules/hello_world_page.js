/*jslint node: true */
/*global driver: false */
/*global by: false */


'use strict';

const
    BasePage      = require( './base_page' )
;


class HelloWorldPage extends BasePage {
	constructor( url ){
		super();

		this.url = url;
		this.inputLocator = this.By.name('addressee');
		this.salutationLocator = this.By.css('p.salutation');
	}

	load(){
		const self = this;

		return this.get( this.url, this.inputLocator )
				.then( () => {
					return Promise.all([
						self.addresseeElement = self.browser.findElement( this.inputLocator ),
						self.salutationElement = self.browser.findElement( this.salutationLocator )
					]);
				})
		;
	}

	set addressee( val ){
		this.setInputValue( this.addresseeElement, val );
	}

	get addressee() {
		return this.addresseeElement.getText();
	}

	get salutation(){
		return this.salutationElement.getText();
	}
}

module.exports = HelloWorldPage;
	