var
	logger_name = 'Dynamic Values test',
 	logger = require('../src/modules/browser_log').get_logger( logger_name ),
	test = require('tape'),
	utils_module = require('../src/modules/dynamic-utils.js'),
	values_module = require('../src/modules/dynamic-values.js'),
	values_logger = logger.module.get_logger( values_module.info.Name ),
	test_persons
	;

var
	template_value = {A:{B:{C:{D:{E:5}}}}},
	references = ['A','B','C','D','E']
;


logger.module.set_default_level( logger.module.Levels.DEBUG );
test('Basic Values API ', function (t) {

	values_module.reset_for_test();

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

test('Dynamic values in depth', function ( testcase ) {
	var
		expected_notification_sequence = utils_module.list_duplicate(references).reverse()
	;

	testcase.plan( 2 * references.length * (references.length+1) + references.length );

	var utils_logger = require('../src/modules/browser_log').get_logger('Dynamic utilities');

	logger.set_level( logger.module.Levels.DEBUG );

	var
		schroedingers_experiment = function( value_name, value_value ){
			var
				alive_cat = function(){
					return values_module.get_or_define( value_name );
				},
				quantum_state = function( test_value, examination_state ){
					var
						check_contents = test_value.get_value()
					;

					testcase.deepEquals( check_contents, value_value, examination_state+': Set value '+value_name+ " 1:1 = "+pp( check_contents ) );

					templates_forEach( function( dynamic_value, expected ){
						check_contents = dynamic_value.get_value();

						testcase.deepEquals( check_contents, expected, examination_state+': Set value '+value_name+ " check through "+dynamic_value.name+' = '+ pp( check_contents ) );

					});

				},
				geiger_triggered_hydrocyanic_acid = function(){
					var
						test_value = values_module.get_or_define( value_name ),
						set_value = utils_module.list_duplicate( value_value,true )
					;

					test_value.set_value( set_value );
				},
				closed = function( cat, evil_device ){

					cat = cat.call();
					evil_device.call();
					quantum_state.call( null, cat, 'CLOSED' );

				},
				opened = function( cat, evil_device ){
					var
						monitor = new NotificationMonitor()
					;

					cat = cat.call();
					evil_device.call();
					quantum_state.call( null, cat, 'OPEN' );

					testcase.deepEquals( monitor.notification_sequence, expected_notification_sequence, 'All notifications in correct order '+pp( expected_notification_sequence )+' vs '+pp( monitor.notification_sequence ) );
				},
				steel_chamber = function( state, cat, evil_device ){
					values_module.reset_for_test();

					state.call( null, cat, evil_device );
				}
			;

			steel_chamber( closed, alive_cat, geiger_triggered_hydrocyanic_acid );
			steel_chamber( opened, alive_cat, geiger_triggered_hydrocyanic_acid );
		}
	;

	// schroedingers_experiment( 'A', 				template_value.A );
	// schroedingers_experiment( 'A.B', 			template_value.A.B );
	schroedingers_experiment( 'A.B.C', 			template_value.A.B.C );
	// schroedingers_experiment( 'A.B.C.D', 		template_value.A.B.C.D );
	// schroedingers_experiment( 'A.B.C.D.E', 		template_value.A.B.C.D.E );

	testcase.end();
});

test('Dynamic values in action', function (t) {
	var log_config = {};

	values_module.reset_for_test();


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
	});

	dv_persons_selected.set_value( 'person_5' );
	t.equals( dv_person_current.get_final().get_value().company.address.city, person_list.person_5.company.address.city, "Fifth person selected (2-3)." );
	t.equals( dv_person_current.get_final().get_value().company.address.city, dv_person_five_company_city.get_value(), "Fifth person selected (3-3)." );

	t.end();
});


test('Dynamic values: manipulate one value over and over again', function ( testcase ) {
	values_module.reset_for_test();

	var
		expected_notification_sequence = utils_module.list_duplicate(references).reverse(),
		rescued_template = utils_module.list_duplicate( template_value,true ),
		base_value = values_module.define('A').set_value( template_value.A ),
		values = values_for_template(),
		monitor = new NotificationMonitor()
	;

	monitor.include( values.D.metavalues.count );

	monitor.clear();
	values.E.value = 6;
	testcase.deepEquals( monitor.notification_sequence, ['E'], 'only E=6');

	monitor.clear();
	values.E.value = 5;
	testcase.deepEquals( monitor.notification_sequence, ['E'], 'only E=5');

	monitor.clear();
	values.F = values_module.define('A.B.C.D.F');
	monitor.include( values.F );
	values.F.value = 6;
	testcase.deepEquals( monitor.notification_sequence, ['F','D.$count'], 'F=6 and D count' );

	monitor.clear();
	values.G = values_module.define('A.B.C.D.G');
	monitor.include( values.G );
	monitor.include( values_module.define('A.B.C.D.G.$count') );
	values.G.value = {H:7};
	testcase.deepEquals( monitor.notification_sequence, ['G.$count','G','D.$count'], 'G count and G structure and D count' );

	monitor.clear();
	values.E.value = null;
	testcase.deepEquals( monitor.notification_sequence, ['E','D.$count'], 'E gone, D count' );

	monitor.clear();
	values.G.value = null;
	testcase.deepEquals( monitor.notification_sequence, ['G','D.$count'], 'G gone, D count' );

	monitor.clear();
	values.F.value = null;
	testcase.deepEquals( monitor.notification_sequence, ['F','D.$count','D','C','B','A'], 'all gone' );

	testcase.deepEquals( template_value, {A:{}}, 'original value has been cleared too');
	testcase.end();

	template_value = utils_module.list_duplicate( rescued_template,true );

});

function pp( complex ){
	return JSON.stringify( complex ).replace(/"([^"]+)"/g,'$1');
}

function templates_forEach( per_template_action, this_arg ){
	var expectations = utils_module.list_duplicate( template_value, true );

	for (
			var val_index=0, val_name=references[val_index], expected=expectations[references[val_index]];
			val_index<references.length;
			val_index++, val_name += '.'+references[val_index], expected=expected[references[val_index]]   ){

		per_template_action.call( this_arg, values_module.get_or_define( val_name ), expected, val_index );
	}

}

function values_for_template(){
	var result = {};

	templates_forEach( function( dynamic_value ){
		result[ dynamic_value.reference ] = dynamic_value;
	});

	return result;
}

function NotificationMonitor(){
	this.start();
}

NotificationMonitor.prototype.clear = function(){
	this.notification_sequence = [];
};

NotificationMonitor.prototype.include = function( dynamic_value ){
	var
		self = this
	;

	dynamic_value.observe( 'test', function( dv ){
		self.notification_sequence.push( (dv.reference.startsWith('$')? dv.parent.reference+'.':'') + dv.reference );
	});
};

NotificationMonitor.prototype.start = function(){
	this.clear();

	templates_forEach( function( dynamic_value ){
		this.include( dynamic_value );
	}, this );
};


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
