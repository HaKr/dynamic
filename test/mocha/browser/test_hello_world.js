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

    this.timeout( 2500 );
    this.slow( 750 );

	before(function(done) {
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


describe('Hello world with template', function(){
	const
		toe = new HelloWorldPage( 'file://'+__dirname+'/assets/html/hello_world_template.html' ),
		dieWelt = 'die Welt',
		laMonde = 'la Monde',
		blank   = ''
	;

    this.timeout( 2500 );
    this.slow( 750 );

	before(function(done) {
	    toe.load()
		    .then( () => done() );
	});


	afterEach(function () {
        if (this.currentTest.state == 'failed') {
        	toe.capture( this.currentTest.title );
        }
    });

	it('should initialy have no salutation', function(){
		return expect( toe.hasSalutation() ).eventually.to.be.equal( false );
	});

	it('should have salutation after  change to "'+dieWelt+'"', function(){
		toe.addressee = dieWelt;
		expect( toe.hasSalutation() ).eventually.to.be.equal( true );
		return expect( toe.salutation ).eventually.to.be.equal( hello( dieWelt ) );
	});

	it('should remove salutation when  blank again', function(){
		toe.addressee = blank;
		expect( toe.hasSalutation() ).eventually.to.be.equal( false );
		return expect( toe.salutation ).eventually.to.be.equal(  blank  );
	});

	it('should reappear after change to "'+laMonde+'"', function(){
		toe.addressee = laMonde;
		expect( toe.hasSalutation() ).eventually.to.be.equal( true );
		return expect( toe.salutation ).eventually.to.be.equal( hello( laMonde ) );
	});

});
