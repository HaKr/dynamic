var dynamic = {
	info: {
		Name: "Dynamic Page1",
		Description: "First web page based on the new framework",
		Version: "1.01.1"
	},
	vars: {

	},
	types: {

	}
};

var
	dynamic_app = require('./dynamic-app.js'),
	dynamic_dom = require('./dynamic-dom.js'),
	logger = require('./browser_log').get_logger(dynamic.info.Name),
	person_list;

logger.module.set_default_level( logger.module.Levels.ERROR );

dynamic_app.register_component('.dynamic-person')
	.on_initialise(function(component_element) {

		logger.info(dynamic.info);

		window.toggleHelpText = function( element ){

		};

	})
	.on_started(function(component_element) {

		var
			show_button = dynamic_dom.get_element(component_element, '#show-button'),
			set_button = dynamic_dom.get_element(component_element, '#set-button'),
			
			dv_persons = dynamic_app.dynamic_value('persons');

		set_button.addEventListener('click', function() {
			dv_persons.set_value(person_list);
		});

		show_button.addEventListener('click', function() {
			console.debug('Person list:', person_list, 'Dynamic variable:', dv_persons);
		});

	});

module.exports = dynamic;

person_list = {
	person_1: {
		'last-name': "Last 1",
		id: 1001,
		description: 'person one',
		address: {
			city: 'New York',
			number: 1,
			street: 'Street 1'
		},
		'first-name': "First 1",
		'not-used': 'this value is not used',
		company: {
			name: 'Company one',
			title: 'General manager',
			address: {
				number: 101,
				street: 'Street 101',
				city: 'City 101'
			}
		},
	},
	person_2: {
		description: 'person two',
		'last-name': "Last 2",
		id: 1002,
		address: {
			postal: 'postal 2',
			city: 'Amsterdam',
			number: 2,
		},
		fte: .5,
		'first-name': "First 2",
		company: {
			name: 'Company twee',
			title: 'CEO',
			address:{
				number: 202,
				city: 'City 202',
				street: 'Street-202'
			}
		},
	},
	person_3: {
		'last-name': "Last 3",
		id: 1003,
		address: {
			number: 0,
			city: 'Amsterdam'
		},
		description: 'person three',
		'first-name': "First 3",
		company: {
			name: 'Company Drei',
			title: 'Account manager',
		},
	},
	person_4: {
		'last-name': "Last 4",
		id: 1004,
		'first-name': "First 4",
	},
	person_5: {
		'last-name': "Last 5",
		id: 1005,
		address: {
			city: 'Berlin',
			street: '5th Street'
		},
		'first-name': "First 5",
		company: {
			name: 'Company Cinq',
			address: {
				city: 'City 505'
			}
		},
	},
	person_6: {
		'last-name': "Last 6",
		address: {
			city: 'London',
			number: 6,
			street: '6nd Street'
		},
		'first-name': "First 6",
		id: 1006
	}
};
