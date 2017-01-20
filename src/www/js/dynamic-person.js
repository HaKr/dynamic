var
	dynamic_app = window.$dynamic,
	logger 		= dynamic_app.get_logger("Dynamic person component"),

	person_list
;

logger.module.set_default_level( logger.module.Levels.ERROR );

dynamic_app.register_component('.dynamic-person')
	.on_initialise(function(component_element) {

		logger.info("Initialise, set toggleHelpText to do nothing");

		window.toggleHelpText = function( element ){

		};

	})
	.on_started( function(component_element) {

		this.get_element( '#set-button' ).addEventListener('click', function() {
			dynamic_app.get_dynamic_value('persons').set_value( person_list );
		});

		this.get_element( '#show-button' ).addEventListener('click', function() {
			console.debug('Person list:', person_list );
		});

	});


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
		}
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
		description: 'person four',
		address: {
			city: 'Mountain View'
		}
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
		description: 'person five'

	},
	person_6: {
		'last-name': "Last 6",
		address: {
			city: 'London',
			number: 6,
			street: '6nd Street'
		},
		'first-name': "First 6",
		description: 'person six',
		id: 1006
	}
};
