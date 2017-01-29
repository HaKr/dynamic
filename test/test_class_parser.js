
var 
	logger_name = 'Dynamic Class Parser',
 	logger = require('../src/modules/browser_log').get_logger( logger_name ),
	test = require('tape'),
	ClassNameParser = require('../src/modules/dynamic_class_parser.js')
;

logger.set_level( logger.module.Levels.DEBUG ); 

function test_parser( s ){
	var
		result = new ClassNameParser( s );

	return result.parse().to_string();
}

test('Class Parser API ', function (t) {

	[ 
		{s: "template explain when no persons available", 						e: 'V=persons; R=<>; remove when, no, available'},
		{s: "template explain abc for search.person-list not selected", 		e: 'V=search.person-list.$selected; R=<>; remove for, not, selected' },
		{s: "template explain abc for search.person-list.$selected empty", 		e: 'V=search.person-list.$selected; R=<>; remove for, empty' },
		{s: "template explain abc when no search.person-list selected", 		e: 'V=search.person-list.$selected; R=<>; remove when, no, selected' },
		{s: "template explain abc for persons", 								e: 'V=persons; R=[]; remove for' },
		{s: "template explain abc when persons empty", 							e: 'V=persons; R=<>; remove when, empty' },
		{s: "template explain abc when persons not empty", 						e: 'V=persons; R=[]; remove when, not, empty' },
		{s: "template explain abc when selected search.person-list index is 3", e: 'V=search.person-list.$selected; R=[3,3]; remove when, selected, index, is, 3' },
		{s: "template explain abc when search.person-list index in <3,5]", 		e: 'V=search.person-list.$selected; R=<3,5]; remove when, index, in, <3,5]' },
		{s: "template explain abc for selected persons", 						e: 'V=persons.@; R=[]; remove for, selected' },
		{s: "template explain abc when persons.@.company",                      e: 'V=persons.@.company; R=[]; remove when' },
		{s: "template explain abc when selected persons has company",           e: 'V=persons.@.company; R=[]; remove when, selected, has, persons, company' },
		{s: "template explain abc for each persons", 							e: 'V=persons; R=[]; remove for, each' },
		{s: "template explain abc for each persons sort city,description", 		e: 'V=persons; R=[]; remove for, each, sort, city,description; sort by city,description' },
		{s: "template explain abc for each persons sort by city,description", 	e: 'V=persons; R=[]; remove for, each, sort, by, city,description; sort by city,description' },
		{s: "template explain abc for each persons order by city,description", 	e: 'V=persons; R=[]; remove for, each, order, by, city,description; sort by city,description' },
		{s: "template explain abc for each persons sort order city,description",e: 'V=persons; R=[]; remove for, each, sort, order, city,description; sort by city,description' }

	].forEach( function( se ){
		t.equals( test_parser( se.s ),se.e, se.s + ' ==> ' + se.e );
	});


	t.end();
} );
