const
	chai = require( 'chai' ),
	expect = chai.expect,
	HelloWorldPage = require('./modules/hello_world_page')
;

chai.use(require('chai-as-promised'));
chai.should();

function hello( who ){
	return 'Hello '+who+'!';
}

function be_not_too_impatient( suite ){
	suite.timeout( 2500 );
	suite.slow( 750 );
}

function loader( toe ){
	return done => {
	    toe.load()
		    .then( () => done() );
	};
}

let take_pictures_when_failed = ( toe ) => {
	return  function() {
		if (this.currentTest.state == 'failed') {
			console.log( 'Capture', this.currentTest.title );
			toe.capture( this.currentTest.title );
		}
	};
};

function prepare( suite, toe ){
	be_not_too_impatient( suite );

	before( loader( toe ) );

	afterEach( take_pictures_when_failed( toe ) );
}

const
	hello_world_basic = new HelloWorldPage( 'file://'+__dirname+'/assets/html/hello_world_basic.html' ),
	hello_world_template = new HelloWorldPage( 'file://'+__dirname+'/assets/html/hello_world_template.html' ),
	addressees = {
		deutsch:   {input: 'die Welt'},
		blank:     {input: ''},
		english:   {input: 'world'},
		francois:  {input: 'la Monde'}
	}
;

Object.keys( addressees ).forEach( addressee_name => {
	let addressee = addressees[ addressee_name ];
	addressee.basic 		= {salutation: hello( addressee.input )};
	let is_not_blank = addressee.input.length>0;
	addressee.template 	= {salutation: is_not_blank ? addressee.basic.salutation : '', has_p: is_not_blank };
});

describe('Basic Hello World example; Text in P element follows value of INPUT.', function(){
	[
		{label: 'basic', 		toe: hello_world_basic },
		{label: 'template',	toe: hello_world_template }
	].forEach( function( target ){

		describe( `For ${target.label} file`, function(){

			prepare( this, target.toe );

			it('should initialy greet with "Hello World"', function(){
				return target.toe.salutation.should.eventually.be.equal( addressees.english[ target.label ].salutation );
			});

			Object.keys( addressees ).forEach( addressee_name => {
				let addressee = addressees[ addressee_name ];
				it( `should respond to change to "${addressee.input}"`, function(){
					target.toe.addressee = addressee.input;
					return target.toe.salutation.should.eventually.be.equal( addressee[ target.label ].salutation );
				});
			});
		});
	});
});

describe('Templated "Hello World"; P element follows INPUT, but is only visible when INPUT is not blank', function() {
	const
		toe = hello_world_template
	;

	prepare( this, toe );

	Object.keys( addressees ).forEach( addressee_name => {
		let addressee = addressees[ addressee_name ];
		let salutation_requirement = addressee.template.has_p ? '' : 'not';

		it(`should ${salutation_requirement} have a salutation to "${addressee.input}"`, function(){
			toe.addressee = addressee.input;
			return Promise.all([
				expect( toe.hasSalutation(), `P.salutation should ${salutation_requirement} be there` ).eventually.to.be.equal( addressee.template.has_p ),
				expect( toe.salutation, 'P.salutation should read World' ).eventually.to.be.equal( addressee.template.salutation )
			]);
		});
	});

});

describe('Issue 20170920.01: Inital VALUE of INPUT changes to blank does not update value reference', function() {
	const toe = hello_world_basic;

	prepare( this, toe );

	it('Initialy greets with "Hello World"', function(){
		return toe.salutation.should.eventually.be.equal( addressees.english.basic.salutation );
	});

	it('Initialy greets with "Hello World"', function(){
		toe.addressee = addressees.blank.input;
		return expect(toe.salutation,'Clearing input after inital value seems not to work').eventually.be.equal( addressees.blank.basic.salutation );
	});
});

describe('Keep the driver busy', function() {
	const toe = hello_world_template;

	prepare( this, toe );

	it('Initialy greets with "Hello World!"', function(){
		return toe.salutation.should.eventually.be.equal( addressees.english.basic.salutation );
	});

});
