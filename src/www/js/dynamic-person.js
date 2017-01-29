var
	dynamic_app = window.$dynamic,
	logger 		= dynamic_app.get_logger("Dynamic person component"),
	htmlcomment_logger = dynamic_app.get_logger('Dynamic templates$HTML'),	

	person_list
;

logger.module.set_default_level( logger.module.Levels.INFO );
htmlcomment_logger.set_level( logger.module.Levels.DEBUG );

dynamic_app.register_component('.simulator-buttons')
	.on_initialise(function(component_element) {

	})
	.on_visible( function(component_element) {

		this.safe_element_listener( '#set-button', 'click', function() {
			dynamic_app.get_dynamic_value('persons').set_value( person_list );
		});

		this.safe_element_listener( '#reset-button', 'click', function() {
			dynamic_app.get_dynamic_value('persons').set_value( null );
		});

		this.safe_element_listener( '#show-button', 'click', function() {
			console.debug('Person list:', person_list );
		});

	});


person_list = [
	 {
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
	{
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
	{
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
	{
		'last-name': "Last 4",
		id: 1004,
		'first-name': "First 4",
		description: 'person four',
		address: {
			city: 'Mountain View'
		}
	},
	{
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
	{
		'last-name': "Last 6",
		address: {
			city: 'London',
			number: 6,
			street: '6nd Street'
		},
		'first-name': "First 6",
		description: 'person six',
		id: 1006
	},
	{
		'last-name': "Last 7",
		address: {
			city: 'Paris',
			number: 7,
			street: 'Avenu sept'
		},
		'first-name': "First 7",
		description: 'person seven',
		id: 1007
	}
];