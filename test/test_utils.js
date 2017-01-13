var 
	logger_name = 'test_utilities',
 	logger = require('../src/modules/browser_log').get_logger( logger_name ),
	test = require('tape'),
	utils = require('../src/modules/dynamic-utils.js')
	;
 
test('Utils API ', function (t) {

	var log_config = {};

	log_config[logger_name] = logger.module.Levels.WARNING;

	logger.module.configure(log_config);


	var 
		obj_a = { a:1, b:2, c:3 },
		obj_b = { e:5, d:4, b:2 },
		ar_a  = [ 'a', 'b', 'c' ],
		ar_b  = [ 'e', 'd', 'b' ],
		ar_a_diff_b = [ 'a', 'c' ],
		ar_b_diff_a = [ 'e', 'd' ],
		// obj_a_diff_b = { added: { d: 4, e: 5 }, removed: { a: 1, c: 3 } },
		// obj_b_diff_a = { added: { a: 1, c: 3 }, removed: { d: 4, e: 5 } },
		obj_a_diff_b = { a: 1, c: 3 } ,
		obj_b_diff_a = { e: 5, d: 4  },

		obj_a_dup = utils.list_duplicate( obj_a ),
		ar_a_dup  = utils.list_duplicate( ar_a ),

		obj_diff_a_b = utils.list_diff( obj_a, obj_b ),
		obj_diff_b_a = utils.list_diff( obj_b, obj_a ),

		ar_diff_a_b  = utils.list_diff( ar_a, ar_b ),
		ar_diff_b_a  = utils.list_diff( ar_b, ar_a ),

		ar_empty = utils.list_diff( ar_diff_a_b, ar_diff_a_b ),
		obj_empty= utils.list_diff( obj_diff_a_b, obj_diff_a_b )
	;

	logger.debug( 'Dup array A', ar_a_dup );
	logger.debug( 'Dup object A', obj_a_dup );

	logger.debug( 'Array B', ar_b );
	logger.debug( 'Object B', obj_b );

	logger.debug( 'Difference between arrays A and B', ar_diff_a_b );
	logger.debug( 'Difference between arrays B and A', ar_diff_b_a );

	logger.debug( 'Difference between objects A and B', obj_diff_a_b );
	logger.debug( 'Difference between objects B and A', obj_diff_b_a );

	t.deepEqual( ar_a_dup, ar_a, "array duplicate equal to it's origin" );
	t.deepEqual( obj_a_dup, obj_a, "object duplicate equal to it's origin" );

	t.deepEqual( ar_diff_a_b, ar_a_diff_b, "Difference between array A and B = ["+ar_a_diff_b+']' );
	t.deepEqual( ar_diff_b_a, ar_b_diff_a, "Difference between array B and A = ["+ar_b_diff_a+']' );

	t.deepEqual( obj_diff_a_b, obj_a_diff_b, "Difference between objects A and B = { a: 1, c: 3 }"  );
	t.deepEqual( obj_diff_b_a, obj_b_diff_a, "Difference between objects B and A = { e: 5, d: 4 }" );

	t.deepEqual( ar_empty, [], "Difference between array itself = []");
	t.deepEqual( obj_empty, {}, "Difference between object itself = {}");


	t.end();
});
