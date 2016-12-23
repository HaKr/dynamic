
var dynamic = {
		info: {
			Name:       "Dynamic Page1",
			Description:  "First web page based on the new framework",
			Version:    "1.01.1"
		},
		vars: {
			
		},
		types: {
			
		}
	};

var
	dynamic_app = require('./dynamic-app.js'),
 	dynamic_dom = require('./dynamic-dom.js'),
	logger = require('./browser_log').get_logger(dynamic.info.Name)
 	;

var log_config = {};
log_config[dynamic_dom.info.Name] = logger.module.Levels.WARNING;
log_config[dynamic_app.info.Name] = logger.module.Levels.DEBUG;
log_config[dynamic.info.Name] = logger.module.Levels.DEBUG;

logger.module.configure(log_config);


dynamic_app.started( 'body.dynamic',function( container ){
	logger.info( 'Dynamic started', dynamic, dynamic_app );
	var person_select = dynamic_dom.get_element( container, 'select[name="person"]' );

	var dv = dynamic_app.dynamic_value('person');
	person_select.addEventListener( 'change', function(){
		dv.set_value( dynamic_app.vars.person_list[ person_select.value ] );
	});

});

module.exports = dynamic;

dynamic_app.vars.person_list = {
		harry : {
		'last-name': "de Kroon", id: 15, 
		address:{
			city: 'Rozendaal', 
			number: 28,
			street: 'Delhoevelaan'
		}, 
		'first-name': "Harry",
		company: {
			name: 'Ciber',
			address:{
				number: 105,
				street: 'Vredeoord',
				city: 'Eindhoven'
			}
		},
		'birth-date': "15 sep 1967"
	},
	cindy: {
		'last-name': "Brokking", id: 1, 
		address:{
			city: 'Rozendaal', 
			number: 28,
			street: 'Delhoevelaan'
		}, 
		'first-name': "Cindy",
		company: {
			name: 'Color BC',
		},
		'birth-date': "4 aug 1974"
	},
	bo: {
		'last-name': "Zwiers", id: 2002, 
		'first-name': "Bo",
		company: {
			name: 'Oranjerie',
		},
		'birth-date': "26 mrt 2002"
	},
	bengt: {
		'last-name': "Zwiers", id: 2002, 
		'first-name': "Bengt",
		'birth-date': "15 feb 2005"
	},
	fenna: {
		'last-name': "de Kroon", id: 2001, 
		address:{
			city: 'Gorredijk', 
			number: 40,
			street: 'Weverij'
		}, 
		'first-name': "Fenna",
		company: {
			name: 'Hema',
			address:{
				city: 'Gorredijk'
			}
		},
		'birth-date': "5 feb 2001"
	}
}; 

