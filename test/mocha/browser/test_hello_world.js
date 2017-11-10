const
	chai 				= require( 'chai' ),
	expect 			= chai.expect,

	suite_utils		= require( './modules/mocha_utils' ),
	HelloWorldPage = require( './modules/hello_world_page')
;

chai.use(require('chai-as-promised'));
chai.should();

function hello( who ){
	return 'Hello '+who+'!';
}


const
	hello_world_basic 	= new HelloWorldPage( 'file://'+__dirname+'/assets/html/hello_world_basic.html' ),
	hello_world_template = new HelloWorldPage( 'file://'+__dirname+'/assets/html/hello_world_template.html' ),
	addressees = {
		deutsch:   {input: 'die Welt'},
		blank:     {input: ''},
		english:   {input: 'world'},
		francois:  {input: 'la Monde'}
	},
	settings = {
		timeout: 15000
	}
;

Object.keys( addressees ).forEach( addressee_name => {
	let addressee = addressees[ addressee_name ];
	addressee.basic 		= {salutation: hello( addressee.input )};
	let is_not_blank = addressee.input.length>0;
	addressee.template 	= {salutation: is_not_blank ? addressee.basic.salutation : '', has_p: is_not_blank };
});

hello_world_basic.Test.describe('Basic Hello World example; Text in P element follows value of INPUT.', function(){
	[
		{label: 'basic', 		toe: hello_world_basic },
		{label: 'template',	toe: hello_world_template }
	].forEach( function( target ){

		hello_world_basic.Test.describe( `For ${target.label} file`, function(){
			settings.suite = this;
			settings.toe = target.toe;
			suite_utils.prepare( settings );

			hello_world_basic.Test.it('should initialy greet with "Hello World"', function(){
				target.toe.salutation.should.eventually.be.equal( addressees.english[ target.label ].salutation );
			});

			Object.keys( addressees ).forEach( addressee_name => {
				let addressee = addressees[ addressee_name ];
				hello_world_basic.Test.it( `should respond to change to "${addressee.input}"`, function(){
					target.toe.addressee = addressee.input;
					return target.toe.salutation.should.eventually.be.equal( addressee[ target.label ].salutation );
				});
			});
		});
	});
});

hello_world_template.Test.describe('Templated "Hello World"; P element follows INPUT, but is only visible when INPUT is not blank', function() {
	const
		toe = hello_world_template
	;

	settings.suite = this;
	settings.toe = toe;
	suite_utils.prepare( settings );

	Object.keys( addressees ).forEach( addressee_name => {
		let addressee = addressees[ addressee_name ];
		let salutation_requirement = addressee.template.has_p ? '' : 'not';

		hello_world_template.Test.it(`should ${salutation_requirement} have a salutation to "${addressee.input}"`, function(){
			toe.addressee = addressee.input;
			// return Promise.all([
				expect( toe.hasSalutation(), `P.salutation should ${salutation_requirement} be there` ).eventually.to.be.equal( addressee.template.has_p ),
				expect( toe.salutation, 'P.salutation should read World' ).eventually.to.be.equal( addressee.template.salutation )
			// ]);
		});
	});
});

hello_world_basic.Test.describe('Issue 20170920.01: Inital VALUE of INPUT changes to blank does not update value reference', function() {
	const toe = hello_world_basic;

	settings.suite = this;
	settings.toe = toe;
	suite_utils.prepare( settings );

	hello_world_basic.Test.it('Initialy greets with "Hello World"', function(){
		toe.salutation.should.eventually.be.equal( addressees.english.basic.salutation );
	});

	hello_world_basic.Test.it('Should see the change to blank', function(){
		toe.addressee = addressees.blank.input;
		expect(toe.salutation,'Clearing input after inital value seems not to work').eventually.be.equal( addressees.blank.basic.salutation );
	});
});
