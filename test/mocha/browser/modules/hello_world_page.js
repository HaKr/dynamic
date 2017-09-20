
(function(){
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
				.then( ()=> {
					self.addresseeElement = self.browser.findElement( this.inputLocator );
					return self.addresseeElement;
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
		const self = this;

		return this.hasSalutation()
			.then( (has_salutation) => {
				return has_salutation ? self.salutationElement.getText() : Promise.resolve('');
			});
	}

	hasSalutation(){
		const self = this;
		return this.PromiseManager.createPromise( (resolve,reject) => {
			self.browser.findElements( self.salutationLocator )
				.then( (element_list) => {
					let result = false;

					if (element_list.length>0){
						self.salutationElement = element_list[0];
						result = true;
					}

					resolve( result );

				});
		});
	}
}

module.exports = HelloWorldPage;

})( module );
