
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
		return this.get( this.url, this.inputLocator )
				.then( ()=> {
					this.addresseeElement = this.browser.findElement( this.inputLocator );
					return this.addresseeElement;
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

		return this.hasSalutation()
			.then( (has_salutation) => {
				return has_salutation ? this.salutationElement.getText() : Promise.resolve('');
			});
	}

	hasSalutation(){
		return this.PromiseManager.createPromise( (resolve,reject) => {
			this.browser.findElements( this.salutationLocator )
				.then( (element_list) => {
					let result = false;

					if (element_list.length>0){
						this.salutationElement = element_list[0];
						result = true;
					}

					resolve( result );

				});
		});
	}
}

module.exports = HelloWorldPage;

})( module );
