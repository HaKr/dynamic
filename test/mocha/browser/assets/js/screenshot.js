
var
	dynamic_app = window.$dynamic
;

expect = (chai && chai.expect) || require('chai').expect;

afterEach(function () {
    if (this.currentTest.state == 'failed') {
      takeScreenshot()
    }
  });

function takeScreenshot() {
  if (window.callPhantom) {
    var date = new Date()
    var filename = "screenshots/" + date.getTime()
    console.log("Taking screenshot " + filename)
    callPhantom({'screenshot': filename})
  }
}

function fireEvent( element, event ){
	if ("createEvent" in document) {
	    var evt = document.createEvent("HTMLEvents");
	    evt.initEvent(event, false, true);
	    element.dispatchEvent(evt);
	}
	else
	    element.fireEvent("on"+event);
}

function setInput( element, text ){
	element.value = text;
	fireEvent( element,"change" );	
}
// dynamic_app.register_component('.TOE')
// 	.on_started( function(component_element) {


		describe( 'Hello world template', function(){
			var 
				p = document.querySelector( '.TOE p.salutation' ),
				addressee = document.querySelector( '.TOE input')
			;

			it( 'should display "Hello world!"', function(){

				expect(p.textContent.trim()).equal( 'Hello world!' );
			});

			it( 'should respond to changes', function(){
				setInput( addressee, 'die Welt' );

				expect(p.textContent.trim()).equal( 'Hello die Welt!', 'German' );

			});

			it( 'should respond to subsequent changes', function(){
				var world = 'la Monde';

				setInput( addressee, world );

				expect(p.textContent.trim()).equal( 'Hello '+world+'!', 'also in French' );

			});

			it( 'can also be cleared', function(){
				var world = '';

				setInput( addressee, world );

				expect(p.textContent.trim()).equal( 'Hello '+world+'!', 'Cleared' );

			});
		} );

	// 	mocha.run();
	// } );
