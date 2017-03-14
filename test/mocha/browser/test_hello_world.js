
let 
	chai = require('chai'),
	expect = chai.expect,
	HelloWorldPage = require('./modules/hello_world_page')
;

chai.use(require('chai-as-promised'));
chai.should();

function hello( who ){
	return 'Hello '+who+'!';
}


describe('Hello world basic', function(){
	const 
		toe = new HelloWorldPage( 'file://'+__dirname+'/assets/html/hello_world_basic.html' ),
		theWorld = 'world',
		dieWelt = 'die Welt',
		laMonde = 'la Monde',
		blank   = ''
	;

	before(function(done) {
	    this.timeout( 2500 );
	    toe.load()
		    .then( () => done() );
	});


	afterEach(function () {
        if (this.currentTest.state == 'failed') {
        	toe.capture( this.currentTest.title );
        }
    });

	it('should initialy greet with "'+theWorld+'"', function(){
		return expect( toe.salutation ).eventually.to.be.equal( hello( theWorld ) );
	});

	it('should respond to change to "'+dieWelt+'"', function(){
		toe.addressee = dieWelt;
		return expect( toe.salutation ).eventually.to.be.equal( hello( dieWelt ) );
	});

	it('should respond to change to "'+laMonde+'"', function(){
		toe.addressee = laMonde;
		return expect( toe.salutation ).eventually.to.be.equal( hello( laMonde ) );
	});

	it('should have a blank ', function(){
		toe.addressee = blank;
		return expect( toe.salutation ).eventually.to.be.equal( hello( blank ) );
	});
});


describe('Hello world wwith template', function(){
	const 
		toe = new HelloWorldPage( 'file://'+__dirname+'/assets/html/hello_world_template.html' ),
		theWorld = 'world',
		dieWelt = 'die Welt',
		laMonde = 'la Monde',
		blank   = ''
	;

	before(function(done) {
	    this.timeout( 2500 );
	    toe.load()
		    .then( () => done() );
	});


	afterEach(function () {
        if (this.currentTest.state == 'failed') {
        	toe.capture( this.currentTest.title );
        }
    });

	it('should initialy greet with "'+theWorld+'"', function(){
		return expect( toe.salutation ).eventually.to.be.equal( hello( theWorld ) );
	});

	it('should respond to change to "'+dieWelt+'"', function(){
		toe.addressee = dieWelt;
		return expect( toe.salutation ).eventually.to.be.equal( hello( dieWelt ) );
	});

	it('should respond to change to "'+laMonde+'"', function(){
		toe.addressee = laMonde;
		return expect( toe.salutation ).eventually.to.be.equal( hello( laMonde ) );
	});

	it('should have a blank ', function(){
		toe.addressee = blank;
		return expect( toe.salutation ).eventually.to.be.equal( hello( blank ) );
	});
});

