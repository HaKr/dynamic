(function(){
	'use strict';

const
	fs             = require( 'fs' ),

	defaults = {
		timeout: 2000,
		consider_slow: 500
	}
;

function set_defaults( cfg ){
	Object.keys( defaults ).forEach( prop_name => {
		if ( !cfg.hasOwnProperty( prop_name ) ){
			cfg[ prop_name ] = defaults[ prop_name ];
		}
	});
}

function be_not_too_impatient( settings ){
	settings.suite.timeout( settings.timeout );
	settings.suite.slow( settings.consider_slow );
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
			let name = this.currentTest.title;
			// toe.capture( this.currentTest.title );
			toe.snapshot()
					.then( () => {

						const
							image_data = toe.image_data,
							d = new Date(),
							datestring = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) +
								" " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)+ ":" + ("0" + d.getSeconds()).slice(-2),
							filename = "./screenshots/" + datestring + '_' + name + '.png'
						;
						fs.writeFile(filename, image_data, 'base64', function(err) {
							if (err){
								console.error('Error while saving screenshot.',err );
							} else {
								console.log( `\tWritten to ${filename}` );
							}
						});
					})
					.catch( err => { console.error('Error while taking screenshot.',err ); })
					;
		}
	};
};

function prepare( settings ){
	set_defaults( settings );

	be_not_too_impatient( settings );

	before( loader( settings.toe ) );

	afterEach( take_pictures_when_failed( settings.toe ) );
}

module.exports = { prepare: prepare };

})( module );
