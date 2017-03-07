
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
	t.plan(20);

	[ 
		{s: "template please-select when no persons available", 				e: 'T=please-select; V=persons; R=<>; remaining: please-select persons'},
		{s: "template explain when no persons available", 						e: 'T=explain; V=persons; R=<>; remaining: explain persons'},
		{s: "template explain abc for search.person-list not selected", 		e: 'T=explain; V=search.person-list.$selected; R=<>; remaining: explain abc search.person-list' },
		{s: "template explain abc for search.person-list.$selected empty", 		e: 'T=explain; V=search.person-list.$selected; R=<>; remaining: explain abc search.person-list.$selected' },
		{s: "template explain abc when no search.person-list selected", 		e: 'T=explain; V=search.person-list.$selected; R=<>; remaining: explain abc search.person-list' },
		{s: "template explain abc for persons", 								e: 'T=explain; V=persons; R=[]; remaining: explain abc persons' },
		{s: "template explain abc when persons empty", 							e: 'T=explain; V=persons; R=<>; remaining: explain abc persons' },
		{s: "template explain abc when persons not empty", 						e: 'T=explain; V=persons; R=[]; remaining: explain abc persons' },
		{s: "template explain abc when search.person-list index in <3,5]", 		e: 'T=explain; V=search.person-list.$selected; R=<3,5]; remaining: explain abc search.person-list' },
        {s: "template explain abc when selected search.person-list index is 3", e: 'T=explain; V=search.person-list.$selected; R=[3,3]; remaining: explain abc search.person-list'},
		{s: "template explain abc for selected persons", 						e: 'T=explain; V=persons.@; R=[]; remaining: explain abc persons' },
		{s: "template explain abc when persons.@.company",                      e: 'T=explain; V=persons.@.company; R=[]; remaining: explain abc persons.@.company' },
		{s: "template explain abc when selected persons has company",           e: 'T=explain; V=persons.@.company; R=[]; remaining: explain abc' },
		{s: "template explain abc for each persons", 							e: 'T=explain; V=persons; R=[]; remaining: explain abc persons' },
		{s: "template explain abc for each persons sort city,description", 		e: 'T=explain; V=persons; R=[]; remaining: explain abc persons; sort-by: city,description' },
		{s: "template explain abc for each persons sort by city,description", 	e: 'T=explain; V=persons; R=[]; remaining: explain abc persons; sort-by: city,description' },
		{s: "template explain abc for each persons order by city,description", 	e: 'T=explain; V=persons; R=[]; remaining: explain abc persons; sort-by: city,description' },
		{s: "template explain extends default-explain",							e: 'T=explain; E=default-explain; R=[]; remaining: explain default-explain' },
		{s: "template explain extends default-explain abc for each persons " +
		"sort order city,description",											e: 'T=explain; E=default-explain; V=persons; R=[]; remaining: explain default-explain abc persons; sort-by: city,description' },
        {s: "template place default-explain",									e: 'T=default-explain; R=[]; remaining: default-explain' },
	].forEach( function( se ){
		t.equals( test_parser( se.s ),se.e, se.s + ' ==> ' + se.e );
	});


	t.end();
} );
