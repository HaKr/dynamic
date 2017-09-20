var
	dynamic_utils = require('./dynamic-utils'),

	keywords = {
		symbols: {
			name_separator: 		'.',
			from_here_selector: 	'.',
			parent_selector:		'..',
			reference_start:		'{{',
			reference_end:			'}}'
		},
		meta: {
			indicator:			'$',
			count:				'count',
			current:				'current'
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
				unset:	'unset',
				alias:   'alias',
				put_value: 'putValue',
				unchecked_value: 'uncheckedValue',
				socket_channel: 'socketChannel',
				socket_room: 'socketSubscribe'
			}
		},
		rest: {
			api:			'/resources',
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
				one_of:  '()',
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
