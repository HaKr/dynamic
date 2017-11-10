module.exports = function () {

	this.Given(/^The input controls page$/, function () {

		return helpers.loadPage(page.dynamicControls.url)
			.then( () => { page.dynamicControls.getElements(); } )
		;
	});

	this.Given(/^initially both report panes display:$/, function ( table ) {
		this.initial = table.rowsHash();

		return page.dynamicControls.get_page_info()
			.then( pi => {
				expect( pi.reportByName )
					.to.deep.equal( pi.reportByReference, 'report by name doesn\'t match report by reference' )
					.and.to.deep.equal( this.initial, 'Values are not as expected' );
					this.initial_check_ok = true;
			});
	});

	this.When(/^I modify the inputs:$/, function ( data ) {
		this.inputs = data.hashes();
		return Promise.resolve('passed');
	});

	this.Before( function( s ){
		this.scenario = s;
	} );


	this.Then(/^subsequently both report panes only change the appropriate label$/, function(){
		let
			in_out_mapping = {
				checkbox: {true: 'on', false: 'off'}
			}
		;
		let scenario = this.scenario;

		return new Promise( (resolve,reject) => {
			let previous_field = '';
			let changer;
			let mapping;
			let checks = [];
			let errors={};

			for ( let input_definition of this.inputs ){
				let input_field = input_definition.input;
				let input_value = input_definition.contents;

				if ( previous_field !== input_field ){
					previous_field = input_field;
					changer = page.dynamicControls[ 'set_' + input_field ];
					mapping = in_out_mapping[ input_field ];
				}

				let expectations = {};
				let output_value = typeof mapping === "object" ? mapping[ input_value ] : input_value;

				for ( let initial_name of Object.keys( this.initial ) ){
					expectations[ initial_name ] = this.initial[ initial_name ];
				}
				expectations[ input_field ] = output_value;

				checks.push(
					changer.call( page.dynamicControls, input_value )
						.then( _ => {
							return page.dynamicControls.get_page_info()
								.then( pi => {
									return expect( pi.reportByName )
										.to.deep.equal( pi.reportByReference, 'report by name doesn\'t match report by reference' )
										.and.to.deep.equal( expectations, 'Values are not as expected' );
								})
								.catch( e=>{
									errors[ input_field+'='+input_value ]= JSON.stringify(e.expected) + JSON.stringify( e.actual );
									// add a screenshot to the error report
									driver.takeScreenshot().then(function (screenShot) {
										//  this.attach( 'text'/*input_field+'='+input_value, 'text/plain'*/ );
										 scenario.attach(input_field+' set to '+input_value, 'text/plain');
										 scenario.attach(new Buffer(screenShot, 'base64'), 'image/png');
									});

								});
						})
				);
			}

			return Promise.all( checks )
				.then( _=>{
					return expect( errors ).to.deep.equal( {} );
				}).then( _=>{ resolve(); } ).catch( e => { reject( e ); } );
		});
	});
};
