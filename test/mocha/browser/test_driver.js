const
	fs             = require( 'fs' ),

	selenium = require('selenium-webdriver'),
	webdriver_test = require('selenium-webdriver/testing'),
	until= require('selenium-webdriver/lib/until'),
	chai = require( 'chai' ),
	chai_as_promised = require( 'chai-as-promised' ),
	expect = chai.expect,
	Capabilities = require('selenium-webdriver/lib/capabilities').Capabilities,
	phantomjs = Capabilities.phantomjs(),
	// firefox = Capabilities.firefox(),
	chrome = Capabilities.chrome(),

	test_file = 'file://'+__dirname+'/assets/html/test_driver.html',
	hello_world_file = 'file://'+__dirname+'/assets/html/hello_world_basic.html',

	timeOut	= 1500,
	css_p_dom_loaded		= 'p.dom-loaded',
	p_dom_loaded			= 'DOMContentLoaded',
	css_p_scripted			= 'p.scripted',
	p_scripted 				= 'Inline script',
	css_p_salutation		= 'p.salutation',
	p_salutation 			= 'Hello world!',
	css_p_app_start		= 'p.app-start',
	p_app_start				= 'Dynamic app starting up',
	css_p_app_running		= 'p.app-running',
	p_app_running			= 'Dynamic app is now running',
	got_me_started			= ' got me get started!'
;

chai.use( chai_as_promised );

// firefox.set('marionette', true);

function save_snapshot( image_data, name ){

	const
		d = new Date(),
		datestring = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) +
			" " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)+ ":" + ("0" + d.getSeconds()).slice(-2),
		filename = "./screenshots/" + datestring + '_' + name + '.png'
	;
	fs.writeFile(filename, image_data, 'base64' );
}


describe('Start Chrome and load the page in one go', function() {
	this.timeout(timeOut*10);
  	this.slow( timeOut*2 /3 );

  	it('Opens test_driver.html and checks that all scripts have run', function( done ) {
		const
			browser = new selenium.Builder()
				.withCapabilities( chrome )
				. build();

			browser.get( test_file )
	 			.then( loaded => {
		 			browser.takeScreenshot()
		 				.then( image_data => {
				 			save_snapshot( image_data, 'test_driver.html loaded' );
		 			});

		 			browser.wait( until.elementLocated(selenium.By.css( css_p_dom_loaded ), timeOut-100 ))
		 				.then( p => {
			 				p.getText()
			 					.then(salutation => {
				 					expect( salutation ).to.equal( p_dom_loaded + got_me_started );

				 					browser.quit();

				 					done();
			 				});
		 			});
	 		});
  	});

	it( 'Opens test_driver.html and checks that all scripts have run with promises', function( done ) {
		const
			browser = new selenium.Builder()
				.withCapabilities( chrome )
				. build();

		browser.get( test_file )
			.then( loaded => {
				browser.takeScreenshot()
					.then( image_data => {
						save_snapshot( image_data, 'test_driver.html loaded with promises' );
					});

				browser.wait( until.elementLocated(selenium.By.css( css_p_scripted ), timeOut-100 ))
					.then( p => {
						// use expect( p.getText() ).to.eventually.equal( p_scripted +'x'+ got_me_started );
						// and the done below will mark this test as passed first and then fails on the before all hook
						p.getText()
							.then( p_text => {
								expect( p_text ).to.equal( p_scripted + got_me_started );

								browser.quit();

								done();
							});
					});
			});
	});
});


describe('Approach with before and after hooks', function() {
	const
		browser = new selenium.Builder()
			.withCapabilities( chrome )
			. build();

	this.timeout(timeOut);
  	this.slow( timeOut*2 /3 );
	this.p = null;

	before( function(){
		return browser.get( test_file )
			.then( loaded => {
				this.p = browser.wait( until.elementLocated(selenium.By.css( css_p_dom_loaded ), timeOut-100 ));
			});
	});

	after( function(){
		browser.quit();
	});

	it( 'checks the value of the P element', function(){
		// forget the return, and the test will always succeed!?!
		return expect( this.p.getText() ).to.eventually.equal( p_dom_loaded + got_me_started );
	});
});


webdriver_test.describe('Approach with before and after hooks from webdriver', function() {
	const
		browser = new selenium.Builder()
			.withCapabilities( chrome )
			. build();

	this.timeout(timeOut);
  	this.slow( timeOut*2 /3 );
	this.p = null;

	webdriver_test.before( function(){
		browser.get( test_file );
		this.p = browser.wait( until.elementLocated(selenium.By.css( css_p_dom_loaded ), timeOut-100 ));
	});

	webdriver_test.after( function(){
		browser.quit();
	});

	webdriver_test.it( 'checks the value of the P element', function(){
		// forget the return, and the test will always succeed!?!
		expect( this.p.getText() ).to.eventually.equal( p_dom_loaded + got_me_started );
		browser.sleep();
	});
});


webdriver_test.describe('Approach with before and after hooks from webdriver and hello_world_basic', function() {
	const
		logging = selenium.logging
	;
	var prefs = new logging.Preferences();
 	prefs.setLevel(logging.Type.BROWSER, logging.Level.DEBUG);
	phantomjs.setLoggingPrefs( prefs );
	const
		browser = new selenium.Builder()
			.withCapabilities( chrome )
			. build();

	this.timeout(timeOut);
  	this.slow( timeOut*2 /3 );
	this.p = null;

	webdriver_test.before( function(){
		browser.get( hello_world_file );

		browser.manage().logs().get(logging.Type.BROWSER)
     .then(function(entries) {
        entries.forEach(function(entry) {
          console.log('[%s] %s', entry.level.name, entry.message);
        });
     });
	  logging.installConsoleHandler();
		});

	webdriver_test.after( function(){
		browser.quit();
	});

	webdriver_test.it( 'Checks the contents of P.dom-loaded', function(){
		// forget the return, and the test will always succeed!?!
		this.p = browser.wait( until.elementLocated(selenium.By.css( css_p_app_running ) ), 666, css_p_app_running + ' is not (yet) on the page.' );
		browser.takeScreenshot()
			.then( image_data => {
				save_snapshot( image_data, 'hello_world_basic.html loaded and P available' );
			});

		expect( this.p.getText() ).to.eventually.equal( p_app_running );
	});

	webdriver_test.it( 'Checks the contents of P.app-start', function(){
		// forget the return, and the test will always succeed!?!
		this.p = browser.wait( until.elementLocated(selenium.By.css( css_p_app_start ) ), 666 );
		expect( this.p.getText() ).to.eventually.equal( p_app_start );
	});

	webdriver_test.it( 'Checks the content of P.salutation', function(){
		// forget the return, and the test will always succeed!?!
		this.p = browser.wait( until.elementLocated(selenium.By.css( css_p_salutation ) ), 666 );
		expect( this.p.getText() ).to.eventually.equal( p_salutation );
		browser.sleep();
	});
});
