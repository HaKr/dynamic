const
	chai 				= require( 'chai' ),
	expect 			= chai.expect,

	suite_utils		= require( './modules/mocha_utils' ),
	InputPage 		= require( './modules/inputs_page')
;

chai.use(require('chai-as-promised'));
chai.should();

const
	inputs_page 	= new InputPage( 'file://'+__dirname+'/assets/html/inputs.html' ),
	settings = {
		timeout: 3000
	}
;


const
	initial = {text: 'text', checkbox: 'off', radio: 'green', dropdown: 'Magenta'},

	inputs = {
		text: ['Just a sample', '', 'An example of an input with some more length','alfa', 'alfa', 'text'],
		checkbox: [ true, false, true, false, true, false ],
		radio: [ 'red', 'green', 'blue', 'blue', 'red', 'green' ],
		dropdown: [ 'Cyan', 'Magenta', 'Yellow', 'Cyan', 'Yellow', 'Magenta' ]
	},
	in_out_mapping = {
		checkbox: {true: 'on', false: 'off'}
	}
;

function get_page_info(){
	return new Promise( resolve => {
		let result = {};
		Promise.all([
			inputs_page.reportByName.reportValues().then( rv => { result.rbn = rv; } ),
			inputs_page.reportByReference.reportValues().then( rv => { result.rbr = rv; } )
		])
		.then( _=>{ resolve( result ); } )
		;
	});
}


describe('Page with various inputs', function() {
	settings.suite = this;
	settings.toe = inputs_page;
	suite_utils.prepare( settings );

	let initial_check_ok = false;

	it('Shows the initial values', function(){

		return get_page_info()
			.then( pi => {
				expect( pi.rbn )
					.to.deep.equal( pi.rbr, 'report by name doesn\'t match report by reference' )
					.and.to.deep.equal( initial, 'Values are not as expected' );
					initial_check_ok = true;
			});
	});

	for ( let input_field of Object.keys(inputs) ){
		let input_values = inputs[ input_field ];
		let changer = inputs_page[ 'set_' + input_field ];
		let mapping = in_out_mapping[ input_field ];

		for (let input_value of input_values ){
			let expectations = {};
			let output_value = typeof mapping === "object" ? mapping[ input_value ] : input_value;

			for ( let initial_name of Object.keys( initial ) ){
				expectations[ initial_name ] = initial[ initial_name ];
			}
			expectations[ input_field ] = output_value;

			it(`Should see the change of ${input_value} to ${input_field} input`, function(){
				if ( !initial_check_ok ){
					this.skip();
				} else {
					changer.call( inputs_page, input_value);
					return get_page_info()
						.then( pi => {
							expect( pi.rbn )
								.to.deep.equal( pi.rbr, 'report by name doesn\'t match report by reference' )
								.and.to.deep.equal( expectations, 'Values are not as expected' );
						});
				}
			});
		}
	}
});
