var 
	logger_name = 'test_values',
 	logger = require('../src/modules/browser_log').get_logger( logger_name ),
	test = require('tape'),
	values_module = require('../src/modules/dynamic-values.js'),
	test_persons 
	;
 
test('Basic Values API ', function (t) {

	var log_config = {};

	log_config[logger_name] = logger.module.Levels.WARNING;
	log_config[values_module.info.Name] = logger.module.Levels.WARNING;

	logger.module.configure(log_config);

	var 
		reference_alt1 = 'displaygroups.@.grouplabel.@.setlabel.@.css_class',
		reference_alt2 = 'displaygroups[@][grouplabel][@][setlabel][@][css_class]',
		reference_alt3 = 'displaygroups.@.grouplabel.[@][setlabel][@][css_class]',
		by_ref = 'a.@.b.@.c.@',
		modifier = 'modifier',
		modify_count = 0
		;
			

	var 
		rp1 = values_module.reference_parser( reference_alt1 ),
		rp2 = values_module.reference_parser( reference_alt2 ),
		rp3 = values_module.reference_parser( reference_alt3 )
		;

	t.equals( rp1.count, 7, "Reference comprises 7 parts");
	t.equals( reference_alt1, rp1.dot_notation, "Dotted notation 1" );
	t.equals( reference_alt1, rp3.dot_notation, "Dotted notation 3" );

	var
		dv3 = values_module.get_or_define( reference_alt3 ),
		dv3a = values_module.get_or_define( reference_alt3 ),
		dv1 = values_module.get_or_define( reference_alt2 ),
		dv2 = values_module.get_or_define( reference_alt3 ),
		brv = values_module.get_or_define( by_ref ),
		modify_value = values_module.get_or_define( modifier )
	;

	t.equals( dv3, dv3a, "Same reference twice points to the same value." );
	t.equals( dv1, dv2, "Reference alias points to the same value." );
	t.equals( dv1, dv3, "Reference alias points to the same original value." );
	t.equals( brv.name, by_ref, "By reference name remains");

	modify_value.set_value( 42 );
	t.equals( modify_value.get_value(), 42, "The answer to the Universe...");

	var observer = modify_value.observe( 'modify_value', function( dv ){
		modify_count++;
	});

	modify_value.set_value( 666 );
	t.equals( modify_count, 1, "Updated once");

	modify_value.set_value( 1001 );
	t.equals( modify_count, 2, "Updated twice");

	modify_value.set_value( 1001 );
	t.equals( modify_count, 2, "Still updated twice");

	modify_value.set_value( 1002 );
	t.equals( modify_count, 3, "Updated three times");

	observer.remove();
	modify_value.set_value( 5 );
	t.equals( modify_count, 3, "Still updated three times, since observer removed.");
	t.equals( modify_value.get_value(), 5, "The final value is five");

	t.end();
});


test('Dynamic values in action', function (t) {
	var log_config = {};

	t.plan(7);

	test_persons = person_list;

	log_config[logger_name] = logger.module.Levels.WARNING;
	log_config[values_module.info.Name] = logger.module.Levels.WARNING;

	logger.module.configure(log_config);


	var
		dv_persons_selected = values_module.get_or_define( 'persons.$selected' ),
		dv_persons = values_module.get_or_define( 'persons' ),
		dv_person_current = values_module.get_or_define( 'persons[@]' ),
		dv_person_one = values_module.get_or_define( 'persons.person_1' ),
		dv_person_one_first = values_module.get_or_define( 'persons.person_1.first-name' ),
		dv_person_three_reference = values_module.get_or_define( 'persons.person_3.$reference' ),
		dv_person_five_company_city = values_module.get_or_define( 'persons[person_5][company][address][city]' )
	;

	t.equals( dv_person_three_reference.get_value(), 'person_3', 'Reference to person 3');

	dv_persons.set_value( test_persons );
	t.equals( dv_person_one_first.get_value(), person_list.person_1['first-name'], "First name as expected." );

	dv_persons_selected.set_value( 'person_1' );
	t.equals( dv_person_current.get_final().get_value(), dv_person_one.get_value(), "First person selected." );

	dv_persons_selected.set_value( 'person_3' );
	t.equals( dv_person_current.get_final().get_value(), person_list[dv_person_three_reference.get_value()], "Third person unmodified." );

	dv_person_current.observe( 'person_current', function( dv ){
		t.equals( dv.get_value(), person_list.person_5, 'Fifth person selected (1-3).' );
	})

	dv_persons_selected.set_value( 'person_5' );
	t.equals( dv_person_current.get_final().get_value()['company']['address']['city'], person_list.person_5.company.address.city, "Fifth person selected (2-3)." );
	t.equals( dv_person_current.get_final().get_value()['company']['address']['city'], dv_person_five_company_city.get_value(), "Fifth person selected (3-3)." );

	t.end();
});


var
	person_list = {
		person_1: {
			'first-name': 'Person 1'
		},
		person_2: {
			'first-name': 'Person 2',
			address: {
				street: 'Street 2',
				city: 'City 2'
			}
		},
		person_3: {
			'first-name': 'Person 3',
			company: {
				name: 'Company 3'
			}
		},
		person_4: {
			'first-name': 'Person 4',
			address: {
				street: 'Street 4',
				city: 'City 4'
			},
			company: {
				name: 'Company 4'
			}
		},
		person_5: {
			'first-name': 'Person 5',
			address: {
				street: 'Street 5',
				city: 'City 5'
			},
			company: {
				name: 'Company 5',
				address: {
					street: 'Street 5.2',
					city: 'City 5.2'
				}
			}
		},
	};