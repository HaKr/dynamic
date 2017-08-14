var
	dynamic_utils = require('./dynamic-utils'),

	keywords = {
		symbols: {
			name_separator: 		'.',
			from_here_selector: 	'.',
			parent_selector:		'..'
		},
		meta: {
			indicator:			'$',
			count:				'count'
		},
		events: {
			change_by_value: 	'change_by_value'
		},
		dom: {
			dynamic_value: 'dynamic-value',
			data: {
				rest:		'rest',
				format:	'format',
				action:  'action',
				unset:	'unset'
			}
		},
		rest: {
			api:			'/api',
			payload:		'payload',
			messages:	'messages'
		},
		system_values: {
			app_messages: 	'app.messages'
		},
		template: {
			tag: 			'template',
			extends: 		'extends',
			for: 			'for',
			for_each: 		'each',
			include: 		'include',
			define: 		'define',
			argument: 		'argument',
			parameter: 		'parameter',
			when: 			'when',
			has: 			'has',
			no: 			'no',
			not: 			'not',
			none: 			'none',
			empty: 			'empty',
			available: 		'available',
			selected: 		'selected',
			index: 			'index',
			place: 			'place',

			sort: {
				tag: 		'sort',
				order: 		'order',
				by: 		'by'
				},

			range: {
				tag:		'range',
				in: 		'in',
				is: 		'is',
				all: 		'[]',
				empty: 		'<>'
			}
		}
	}
;

Object.keys( keywords.dom ).forEach( function( html_id_name ) {
	var html_id_value = keywords.dom[ html_id_name ];
	if (typeof html_id_value === 'string'){
		keywords.dom[ html_id_name + '_camel' ] = dynamic_utils.htmlID2OptionCase( html_id_value );
	}
});

module.exports = keywords;
