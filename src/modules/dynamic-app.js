var dynamic_app = {
	info: {
		Name: "Dynamic applications",
		Description: "Modify web pages based on templates and live data.",
		Version: "1.01.1"
	},
	vars: {
		values: [],
		binding_observers: [],
		components: [],
		controls: [],
	},
	modules: {},
	types: {
		AppComponent: function(css_selector) {
			this.selector = css_selector;
			this.element = null;

			dynamic_app.vars.components.push(this);
		}
	}
};

var
	dynamic_dom = require('./dynamic-dom.js'),
	dynamic_utils = require('./dynamic-utils'),
	value_module = require('./dynamic-values.js'),
	template_module = require('./dynamic-templates.js'),
	observer_module = require('./dynamic-observers.js'),
	formula_module = require('./dynamic-formulas.js'),
	logger = require('./browser_log').get_logger(dynamic_app.info.Name),
	metalogger = require('./browser_log').get_logger('meta info')
;

var
	template_options = {
		'for': {},
		'for-each': {},
		'for-values': {},
		'on-empty': {},
		alternative: {},
		'only-content': {},
		'with-content': {},
		'sort': {},
		incomplete: {},
		range: {}
	},
	template_tag = 'dynamic-template',
	parse_options = {},
	attributelist_pattern = '([^=]+)=(\\S*)\\s*',
	comment_pattern = '^<' + template_tag + '\\s+(((' + attributelist_pattern + '))+)\\s*>$',
	attributelist_re = new RegExp(attributelist_pattern, 'g'),
	comment_re = new RegExp(comment_pattern)
;

parse_options[template_tag] = template_options;

dynamic_dom.events.on('DOM ready', function() {

	dynamic_app.run();

});

dynamic_app.register_component = function(css_selector) {

	var result = new dynamic_app.types.AppComponent(css_selector);

	return result;
};

var label_find_re = /([^:]*):\s*(.*)/;

dynamic_app.transform_labels = function(){
	var replace_count = 0;

	dynamic_dom.get_elements( 'label').forEach(function(label_element) {
		dynamic_dom.get_nodes(label_element, {
			node_type: Node.TEXT_NODE
		}, function(text_node) {
			if (label_find_re.test(text_node.textContent)) {
				var
					match = text_node.textContent.match(label_find_re),
					reallabel = match[1],
					remainder = match[2];

				var span = document.createElement('span');
				span.className = 'reallabel';
				span.textContent = reallabel;
				text_node.parentNode.insertBefore(span, text_node);
				text_node.textContent = remainder;
				replace_count++;
			}
		});
	});

	logger.debug('Replaced ' + replace_count + ' text labels.');
};

dynamic_app.run = function() {

	logger.info( dynamic_app.info );

	dynamic_app.transform_labels();

	dynamic_app.vars.components.forEach( function register_components(component) {
		component.locate();
		component.initialise();
	});

	metalogger.debug( function(){
		var
			old_instances_info = {}
		;
		dynamic_app.debug_templates 		= value_module.get_or_define( 'debug.template_count' );
		dynamic_app.debug_placeholders 	= value_module.get_or_define( 'debug.placeholder_count' );
		dynamic_app.debug_instances 		= value_module.get_or_define( 'debug.instance_count' );
		dynamic_app.debug_observers 		= value_module.get_or_define( 'debug.observer_count' );

		dynamic_app.update_meta_info = function(){
			var
				instances_info = {},
				instance_count = 0,
				tree_count = 1,
				observer_count = 0,
				placeholder_count = 0
			;

			dynamic_app.debug_templates.set_value( Object.keys( template_module.vars.Definitions ).length );
			dynamic_app.debug_placeholders.set_value( Object.keys( template_module.vars.Placeholders ).length );
			dynamic_app.debug_instances.set_value( Object.keys( template_module.vars.Instances ).length );
			dynamic_app.debug_observers.set_value( Object.keys( value_module.vars.observers ).length );

			Object.keys( template_module.vars.Instances ).forEach( function (ik){
				var 
					instance = template_module.vars.Instances[ik],
					instance_info = instance.debug_info();
					instances_info[ instance_info.id ] = instance_info;
					delete instance_info.id

					instance_count++;
					tree_count 			+= instance_info.child_instances;
					observer_count 	+= instance_info.observers;
					placeholder_count	+= instance_info.placeholders;

			});


			if (Object.keys(old_instances_info).length>0 ){

				metalogger.debug( '----- instances -----');
				var diff = dynamic_utils.object_difference( old_instances_info, instances_info );
				var removed_count = 0, added_count = 0;
				for (var removed_name in diff.removed){
					var removed = diff.removed[ removed_name ];
					metalogger.debug( '- '+removed_name, removed );
					removed_count++;
				}
				for (var added_name in diff.added){
					var added = diff.added[ added_name ];
					metalogger.debug( '+ '+added_name, added );
					added_count++;
				}
				metalogger.debug( '===== removed: ' + removed_count + ', added: '+added_count+', total: '+instance_count+ '; placeholders: '+placeholder_count + '; observers: '+ observer_count+' =====');
			}

			old_instances_info = instances_info;

		};

	});

	dynamic_app.define_templates();
	value_module.enhance( dynamic_value_class );

	dynamic_app.vars.main_instance = template_module.create_instance( document.body );
	dynamic_app.vars.main_instance.enhance( dynamic_instance_class );
	dynamic_app.vars.main_instance.get_values_and_templates();

	dynamic_app.vars.components.forEach( function notify_component_start( component ) {
		component.started();
	});
};

dynamic_app.show_instance_info = function(){
	var
		instance_count = 0,
		tree_count = 1,
		observer_count = 0,
		placeholder_count = 0
	;

	Object.keys( template_module.vars.Instances ).reverse().forEach( function (ik){
		var 
			instance = template_module.vars.Instances[ik],
			info     = instance.debug_info()
		;
		instance_count++;
		tree_count += info.child_instances;
		observer_count += info.observers;
		placeholder_count += info.placeholders;
		
		console.log( 'Instance', info );
	});

	console.log( instance_count + ' instances, cross-reference count: '+ tree_count + '; placeholders: '+placeholder_count + '; observers: '+ observer_count );

};

module.exports = dynamic_app;
window.$app = dynamic_app;

dynamic_app.modules = {
	values: value_module,
	templates: template_module
};

var
	dynamic_instance_class = {};

dynamic_app.dynamic_value = function(value_name) {
	return value_module.get_by_name(value_name);
};

dynamic_app.define_templates = function(template_element) {
	var
		result 			= null,
		parser 			= null,
		existing 		= null,
		only_content 	= false,
		with_content   = '',
		template_name  = '',
		range				= '<>',
		is_body 			= typeof template_element === "undefined";

	if (!is_body) {

		parser 			= new AttributeParser( template_tag );
		parser.parse( template_element );

		template_name  = parser.name;
		only_content 	= parser.options.hasOwnProperty( 'only_content' ) ? parser.options.only_content : false;
		with_content	= parser.options.hasOwnProperty('with_content') ? parser.options.with_content : '',
		delete parser.options.only_content;

		if (typeof template_name === "string" && template_name.length > 0) {
			existing = template_module.get_template_by_name( template_name );

			if (existing !== null) {
				if (with_content.length>0){
					template_name += "_" + with_content;
					result = template_module.define( template_name, parser.options );	
					// existing = null;
					result.get_clone_from( existing );

				} else {
					result = existing;
					result.merge_options( parser.options );
				}
			} else {
				result = template_module.define( template_name, parser.options );
			}

			if (parser.options.hasOwnProperty('for') || parser.options.hasOwnProperty('for_each') || parser.options.hasOwnProperty('with_content')) {
				range = parser.options.hasOwnProperty('range') ? parser.options.range : '<>';
				var 
					dynamic_value_name 	= parser.options.hasOwnProperty('for') ? parser.options['for'] : parser.options.hasOwnProperty('for_each')? parser.options.for_each : '',
					multiple 				= parser.options.hasOwnProperty('for_each'),
					sort_order				= parser.options.hasOwnProperty('sort')? parser.options.sort : '',
					comment_node 			= document.createComment( "<" + template_tag + " name=" + template_name + " dynamic-value=" + dynamic_value_name + " range=" + range +" multiple=" + multiple + " with_content=" + with_content + " sort=" + sort_order + ">" )
				;

				if (parser.options.hasOwnProperty('for_each') && dynamic_value_name.length<1){
					logger.warning( 'For-each value is empty', template_element);
				}

				only_content = existing !== null;

				template_element.parentNode.insertBefore( comment_node, template_element );
			}
		} else {
			logger.error( 'Template must have a name', template_element );
		}
	}

	var child_template_elements = dynamic_app.get_children( template_element, "." + template_tag );

	child_template_elements.forEach( function( child_template_element ) {
		var child_template = dynamic_app.define_templates( child_template_element );
		if (child_template !== null) {
			child_template.parent = result;
		}
	});

	if (!is_body && result !== null) {
		result.absorb(template_element, only_content);
	}

	return result;
};

dynamic_app.get_children = function(element, css_selector) {
	// only return top-level results

	var all_results = dynamic_dom.get_elements(element, css_selector);
	var excluded = [];

	for (var i = 0; i < all_results.length; i++) {
		excluded = excluded.concat(dynamic_app.get_children(all_results[i], css_selector));
	}

	return dynamic_utils.array_diff(all_results, excluded);
};

/*
 * Template placeholder enhancements
 */
var
	dynamic_placeholder = {};

dynamic_placeholder.single_instance = function(dynamic_value) {

	// logger.debug('Single instance of ' + this.definition.name + ' for ' + dynamic_value.name, this);
	// this.dynamic_value = dynamic_value.get_final();

	this.check_complete( dynamic_value.get_final() );
};

dynamic_placeholder.multiple_instance = function(dynamic_value) {
	var
		self 			= this,
		child_keys 	= Object.keys(dynamic_value.children),
		items			= this.sort_order
	;

	if ( items.length > 0 ){
		child_keys = child_keys.sort( function( key_a, key_b ){
			var 
				child_a = dynamic_value.children[key_a],
				child_b = dynamic_value.children[key_b],
				result = 0
			;

			for (var ii=0; result == 0 && ii<items.length; ii++){
				var 
					item_ref = '.'+ items[ii].trim(),
					child_a_item = child_a.get_dynamic_value( item_ref, true ),
					child_b_item = child_b.get_dynamic_value( item_ref, true )
				;
				if (child_a_item === null || child_b_item === null){
					if (child_a_item !== child_b_item){
						result = child_a_item === 0 ? -1 : 1
					}
				} else {
					var
						child_a_value = child_a_item.get_value(),
						child_b_value = child_b_item.get_value()
					;

					result = child_a_value < child_b_value ? -1 : (child_a_value > child_b_value ? 1 : 0);
				}
			}

			return result;

		});
	}
	this.empty();

	var
		index_value;

	child_keys.forEach(function(child_key) {
		// dynamic_value.set_current( child_key );
		var child_value = dynamic_value.children[ child_key ];
		// logger.debug( 'add instance for '+this.definition.name+' - '+child_key );
		this.add_instance(  child_value );

	}, this);

};

dynamic_placeholder.multi_attribute_selector = {
	multiple: 	{multiple: true, on_value_changed: dynamic_placeholder.multiple_instance},
	yes: 			{multiple: true, on_value_changed: dynamic_placeholder.multiple_instance},
	'true': 		{multiple: true, on_value_changed: dynamic_placeholder.multiple_instance},
	no: 			{multiple: false, on_value_changed: dynamic_placeholder.single_instance},
	'false': 	{multiple: false, on_value_changed: dynamic_placeholder.single_instance},
	single: 		{multiple: false, on_value_changed: dynamic_placeholder.single_instance}
};

dynamic_placeholder.select_instancing = function(multiple) {
	var
		result;

	if (typeof multiple === "string" && multiple.length > 0) {
		result = dynamic_placeholder.multi_attribute_selector[multiple];
	} else {
		result = dynamic_placeholder.multi_attribute_selector.single;
	}

	if (typeof result !== "object") {
		logger.warning('Instancing selector "' + multiple + ' unknown');
	}

	return result;
};

/* 
*	Dynamic value enhancements
*/
var
	dynamic_value_class = {}
;

dynamic_value_class.get_elements = function( selector ) {
	var result = [];

	this.instances.forEach(function( instance ) {
		result = result.concat( instance.get_elements( selector ) );
	}, this );

	return result;
};


dynamic_value_class.add_instance = function( instance ){
	if ( typeof this.instances ==="undefined" ){
		this.instances = [];
	}
	var 
		exists_ix = this.instances.findIndex( function(existing_instance){ return existing_instance.placeholder.definition.name == instance.placeholder.definition.name }, this );
	if ( exists_ix >= 0 ){
		this.instances[ exists_ix ] = instance;
		logger.warning( 'Instance '+instance.placeholder.definition.name+' already referenced on value '+this.name );
	} else {
		this.instances.push( instance );
	}
	
};

dynamic_value_class.remove_instance = function( instance ){
	var 
		exists_ix = this.instances.indexOf( instance );
	if ( exists_ix < 0 ){
		logger.error( 'Instance '+sequence+' already referenced on value '+this.name );
	} else {
		this.instances.splice( exists_ix, 1 );
	}
};


dynamic_value_class.remove = function( instance ){

	this.children.forEach( function remove_child( child_value ){
		child_value.remove();
	}, this );
	this.clear_children();

	if ( typeof this.instances !=="undefined" ){
		var instances = dynamic_utils.list_duplicate( this.instances );

		instances.reverse().forEach( function remove_instance( instance ){
			instance.remove();
		}, this);
	}

	this.set_value( null );
	this.instances = [];

};

dynamic_value_class.index_by_offset=function( offset ){

	var 
		child_references = Object.keys( this.parent.children ),
		my_index = child_references.indexOf( this.reference ),
		result =
			typeof offset === "string" 
				? child_references.indexOf( offset )
				: my_index + offset >=0 && my_index + offset < child_references.length
					? my_index + offset
					: -1 
	;

	return result;
};

dynamic_value_class.can_swap = function( offset ){
	var
		result = false;

	if (this.parent !== null){
		result = (this.index_by_offset( offset ) >= 0 );
	}

	return result;
};

dynamic_value_class.mark_selected = function(){
	if (this.parent !== null && this.parent.metainfo.selected){
		var
			selected_reference = this.parent.metainfo.selected
		;

		this.parent.get_children().forEach( function( child_value ){
			var
				is_selected = child_value.reference === selected_reference;

			child_value.instances.forEach( function ( child_instance ){
				var
					element_node = child_instance.child_nodes[0];
				if (is_selected){
					dynamic_dom.add_class( element_node, 'selected' );
				} else {
					dynamic_dom.remove_class( element_node, 'selected' );
				}
			}, this );

		}, this );
	}
	

};

dynamic_value_class.swap = function( offset ){
	var
		result = null;
	if (this.parent === null){
		logger.warning( "Cannot swap a top-level value" );
	} else {
		var 
			child_references = Object.keys( this.parent.children ),
			my_index = child_references.indexOf( this.reference ),
			other_index = this.index_by_offset( offset )
		;

		if (other_index < 0 ){
			logger.warning( 'Swap offset '+offset+' out of reach' );
		} else {
			var
				upper 				= Math.max( my_index, other_index ),
				lower 				= Math.min( my_index, other_index ), 
				upper_value_ref 	= child_references.splice( upper, 1 )[0],
				lower_value_ref 	= child_references.splice( lower, 1, upper_value_ref )[0],
				dummy_value_ref   = child_references.splice( upper, 0, lower_value_ref ),
				upper_value 		= this.parent.children[ upper_value_ref ],
				lower_value 		= this.parent.children[ lower_value_ref ]
			;
			
			var new_children = {};
			child_references.forEach( function rebuild_children( child_ref ){
				new_children[ child_ref ] = this.parent.children[ child_ref ];
			}, this );

			this.parent.children = new_children;

			upper_value.instances.forEach( function swap_instances( upper_instance, ix ){
				if (upper_instance.placeholder.sort_order.length < 1){
					var other_instance = lower_value.instances.find( function( an_instance ){
						return an_instance.placeholder.definition.name === upper_instance.placeholder.definition.name; 
					}, this );
					if (typeof other_instance === "object"){
						upper_instance.swap( other_instance );
					}
				}
			} );

			result = upper_value === this? lower_value : upper_value;
		}
	}

	return result;
};

/* 
 * Template instance enhancements
 */
dynamic_instance_class.get_values_and_templates = function() {

	this.child_nodes.forEach(function(node) {
		this.bind_textnodes(node);
		this.bind_attributes(node);
		this.get_templates(node);
		this.get_values(node);
	}, this);
};

dynamic_instance_class.get_elements = function( selector ) {
	var result = [];

	this.child_nodes.forEach(function(node) {
		result = result.concat( dynamic_dom.get_elements( node, selector ) );
	}, this );

	return result;
};

dynamic_instance_class.add_text_observer = function( text_observer ){
	if (typeof this.text_observers === "undefined"){
		this.text_observers = [];
	}

	this.text_observers.push( text_observer );
};

dynamic_instance_class.add_attribute_observer = function( attribute_observer ){
	if (typeof this.attribute_observers === "undefined"){
		this.attribute_observers = [];
	}

	this.attribute_observers.push( attribute_observer );
};


dynamic_instance_class.bind_textnodes = function(element) {
	// first approach was to cut all text nodes into pieces
	// So <p>A {{B}} C {{D}} E</p> would result into 5 ones,
	// with two observers for B and D.
	// But then the blanks between them would get lost.
	var self = this;

	dynamic_dom.get_nodes(element, {
		node_type: Node.TEXT_NODE
	}, function(text_node) {
		
		if ( observer_module.contains_binding( text_node.textContent ) ) {
			self.add_text_observer( observer_module.create_text_observer( text_node, self ) );
		}
	});
};

dynamic_instance_class.bind_attributes = function(element) {

	var
		elements = dynamic_dom.get_nodes(element, {
			node_type: Node.ELEMENT_NODE,
			recursive: true
		});
	elements.splice(0, 0, element);

	elements.forEach(function(child_element) {
		if (typeof child_element.attributes !== "undefined" && child_element.attributes !== null) {
			var element_attributes = child_element.attributes;

			for (var eai = 0; eai < element_attributes.length; eai++) {
				var
					attribute = element_attributes[eai],
					attribute_value = attribute.value;
				if ( observer_module.contains_binding( attribute_value ) ) {
					self.add_attribute_observer( observer_module.create_attribute_observer( child_element, attribute.name, this ) );
				}
			}
		}
	}, this);
};

dynamic_instance_class.get_templates = function(node) {
	var
		comment_nodes = dynamic_dom.get_nodes(node, {
			node_type: Node.COMMENT_NODE
		}, function is_dynamic_placeholder(candidate_node) {
			return comment_re.test(candidate_node.textContent);
		});

	comment_nodes.forEach(function(comment_node) {
		var
			self = this,
			attributes = {},
			match = comment_node.textContent.match(comment_re),
			attribute_list = match[1];

		dynamic_utils.collect(attributelist_re, attribute_list, function(attr_match, attr_index) {
			attributes[attr_match[1].replace('-', '_')] = attr_match[2];
		});

		logger.debug( function() {
			dynamic_dom.insert_comment_before( comment_node, comment_node.textContent  );
		});


		var
			anchor_first 			= dynamic_dom.insert_text_before( comment_node, "\n" ),
			anchor 					= dynamic_dom.insert_text_before( comment_node, "\n" ),
			template_definition 	= this.get_template_by_name( attributes.name ),
			template_placeholder = this.create_placeholder( template_definition, anchor, match[0] ),
			instancing_schema		= dynamic_placeholder.select_instancing(attributes.multiple)
		;

		logger.debug( function() {
			dynamic_dom.insert_comment_before( comment_node, "End "+attributes.name  );
		});

		template_placeholder.on_value_changed 	= instancing_schema.on_value_changed;
		template_placeholder.is_multiple			= instancing_schema.multiple;
		template_placeholder.first 				= anchor_first;
		template_placeholder.range					= new ValueRange( attributes.range );
		template_placeholder.with_content		= attributes.with_content;
		template_placeholder.sort_order 			= attributes.sort.length>0 ? attributes.sort.split(',') : [];

		template_placeholder.on_instance = function on_instance_created( template_instance ) {
			if (template_instance.dynamic_value !== null){
				template_instance.dynamic_value.add_instance( template_instance );
			}
			template_instance.set_parent( self );
			template_instance.get_values_and_templates();
		};

		var dynamic_value = attributes.dynamic_value.length>0 ? this.get_dynamic_value( attributes.dynamic_value ) : this.dynamic_value;
		this.add_observer(
			dynamic_value.observe( 'placeholder_'+template_placeholder.definition.name, function change_placeholder(trigger_value) {
				// if (template_placeholder.dynamic_value !== trigger_value ||  template_placeholder.dynamic_value.get_value() !== trigger_value.get_value() ){
					logger.debug( dynamic_value.name+'['+trigger_value.name+']'+'('+(typeof template_placeholder.dynamic_value === "undefined"?'NIL':template_placeholder.dynamic_value.name)+') ==> instance(s) of ' + template_placeholder.definition.name );
					template_placeholder.dynamic_value = trigger_value;
					template_placeholder.on_value_changed(trigger_value);
				// }
			}, template_placeholder )
		);

		if (!template_placeholder.is_multiple && !dynamic_value.is_empty() ){
			logger.debug( 'Instance(s) of ' + template_placeholder.definition.name + ' for ' + dynamic_value.name+'['+dynamic_value.get_final().name+']' );
			template_placeholder.dynamic_value = dynamic_value;
			template_placeholder.on_value_changed( dynamic_value );
		} 
		var delegated_value = dynamic_value.get_final();
		if (delegated_value !== dynamic_value){
			this.add_observer(
				delegated_value.observe( 'placeholder_delegated'+template_placeholder.definition.name, function change_placeholder(trigger_value) {
					// if (template_placeholder.dynamic_value !== trigger_value ||  template_placeholder.dynamic_value.get_value() !== trigger_value.get_value() ){
						logger.debug( trigger_value.name+'('+(typeof template_placeholder.dynamic_value === "undefined"?'NIL':template_placeholder.dynamic_value.name)+') ==> instance(s) of ' + template_placeholder.definition.name );
						template_placeholder.dynamic_value = trigger_value;
						template_placeholder.on_value_changed(trigger_value);
					// }
				}, template_placeholder )
			);

		}
	

		comment_node.remove();

	}, this);

};

var
	control_tags = ['input', 'select'],
	button_commands = {
		remove: { event_handler: function remove_dynamic_variable(){
				this.dynamic_value.remove();
			}, label: '-',
			can_do: function( dynamic_value ){ return true; }
		},
		'move-up': { event_handler: function move_up_dynamic_variable(){
				var 
					other_value = this.dynamic_value.swap(-1),
					other_button = other_value.get_elements( '.move-up.dynamic-value' )[0] 
				;
				dynamic_dom.remove_class( other_button, 'hidden' );

				if (!this.dynamic_value.can_swap(-1)){
					dynamic_dom.add_class( this, 'hidden' );
				}
			}, label: '^',
			can_do: function( dynamic_value ){ return dynamic_value.can_swap(-1); }

		},
		'move-down': { event_handler: function move_down_dynamic_variable(){
				var 
					other_value = this.dynamic_value.swap(1),
					other_button = other_value.get_elements( '.move-down.dynamic-value' )[0] 
				;
				dynamic_dom.remove_class( other_button, 'hidden' );

				if (!this.dynamic_value.can_swap(1)){
					dynamic_dom.add_class( this, 'hidden' );
				}
			}, label: 'v',
			can_do: function( dynamic_value ){ return dynamic_value.can_swap(1); }

		}
	}
;

dynamic_instance_class.get_values = function(node) {

	control_tags.forEach( function( control_tag ) {
		var tag_elements = dynamic_dom.get_elements(node, control_tag);
		if (typeof node.tagName === "string" && node.tagName.toLowerCase() === control_tag) {
			tag_elements.splice(0, 0, node);
		}

		tag_elements.forEach(function(tag_element) {
			if (typeof tag_element.dataset !== "object"){
				tag_element.dataset = {};
			}
			if (tag_element.dataset.hasOwnProperty('dynamicValue')){
				logger.warning( 'element already has a value', tag_element.dataset.dynamicValue, tag_element);
			} else {
				this.define_control(tag_element);
			}
		}, this );
	}, this );

	var buttons = dynamic_dom.get_elements(node, 'button.dynamic-value');
	buttons.forEach( function link_button( btn ){
		if (typeof btn.dataset !== "object"){
			btn.dataset = {};
		}

		if (!btn.dataset.hasOwnProperty('dynamicValue')){
			var dv = this.dynamic_value;
			btn.dataset.dynamicValue = dv.name;

			var 
				i = document.createElement( 'i' );
				i.className = btn.className;
				button_title = btn.getAttribute( 'title')
			;

			if (button_title !== null){
				i.setAttribute( 'title', button_title  );
			}	

			btn.parentNode.insertBefore( i, btn );
			btn.remove();
			btn = i;
			
			Object.keys( button_commands ).forEach( function( command_name ){
				if (btn.className.indexOf( command_name ) >= 0){
					if (!button_commands[ command_name ].can_do( dv )){
						dynamic_dom.add_class( btn, 'hidden' );
					}

					// btn.textContent = button_commands[ command_name ].label;
					btn.dynamic_value = dv;
					btn.addEventListener( 'click', button_commands[ command_name ].event_handler );		
				}
			}, this );
			
		}
	}, this );

};

dynamic_instance_class.define_control = function(tag_element) {
	if (typeof this.controls === "undefined"){
		this.controls = [];
	}
	
	this.controls.push(new AppControl(tag_element, this));
};

dynamic_instance_class.get_dynamic_value = function get_dynamic_value_for_instance( value_name ) {
	var 
		result = null,
		formula = ""
	;

	if (value_name.indexOf('=') > 0) {
		var name_parts = value_name.split( '=' ); 
		value_name = name_parts[0].trim();
		formula = name_parts[1].trim();
	}

	if (typeof this.dynamic_value === "object" && this.dynamic_value !== null){
		result = this.dynamic_value.get_dynamic_value( value_name );
	} else {
		result = value_module.get_or_define( value_name );
	}

	if (formula.length > 0){

		var formula_value =  formula_module.enhance_as_formula( result, formula );
		formula_value.parent_instance = this;
		formula_value.parse_formula();

		result = formula_value;
	}


	return result;
};

dynamic_instance_class.node_inserted = function( node ){
	if (this.dynamic_value !== null){
		dynamic_dom.add_class( node, this.dynamic_value.name );
	}
};


/* 
 * local support classes
 */
function AttributeParser(data_name) {
	this.data_name = data_name;
	this.name = '';
	this.options = {};
	this.pattern = new RegExp('data-' + this.data_name + '-?(.*)?');
	this.validator = parse_options[data_name];

	return this;
}

AttributeParser.prototype.parse_attributes = function(attrs) {
	var self = this;
	var result = [];

	Object.keys(attrs).forEach(function(attr_id) {
		var attr = attrs[attr_id];
		var param;

		if (self.pattern.test(attr.name)) {
			result.push(attr.name);
			var m = attr.name.match(self.pattern);
			param = m[1];
			if (typeof param === "undefined") {
				varname = dynamic_utils.htmlID2CamelCase(attr.value);
			} else {
				var option_list;
				if (param === 'options') {
					option_list = attr.value.split(';').map(function(opt_part) {
						var opt_nv = opt_part.split('=');
						return ({
							name: opt_nv[0],
							value: opt_nv.length > 1 ? opt_nv[1] : true
						});
					});
				} else {
					option_list = [{
						name: param,
						value: attr.value
					}];
				}
				option_list.forEach(function(opt) {
					var opt_name = opt.name;
					var validator = self.validator[opt_name];
					if (typeof validator === "undefined") {
						logger.warning("Unknown attribute ", opt_name, "on", self.element);
					} else {
						var option_name = typeof validator.option_name !== "undefined" ? validator.option_name : opt_name.replace('-', '_');
						var attrval = typeof validator.get === "function" ? validator.get(opt.value) : opt.value;
						self.options[option_name] = attrval;
					}
				});
			}
		}
	});

	return result;
};

AttributeParser.prototype.parse = function(element) {
	this.options = {};
	this.element = element;

	var class_names = dynamic_dom.get_classes(element);
	var ix = class_names.indexOf(this.data_name);

	if (ix + 1 < class_names.length) {
		this.name = class_names[ix + 1]; //dynamic_utils.htmlID2CamelCase(class_names[ix + 1]);
	}
	if (ix + 2 < class_names.length) {
		this.options.type = class_names[ix + 2];
	}
	this.parse_attributes(dynamic_dom.get_attributes(element)).forEach(function(attr_name) {
		element.removeAttribute(attr_name);
	});

	// this.options.content = element.textContent.trim();
	dynamic_dom.remove_class(element, this.data_name);
	return this;
};


function AppControl( element, template_instance ) {
	this.element 	= element;
	this.instance 	= template_instance;

	this.set_up();
}

AppControl.prototype.update_by_value = function(dynamic_value) {
	var
		dv_text = dynamic_value.get_text();

	if (this.element.value !== dv_text) {
		// logger.debug('update control value from dynamic value', this);
		this.element.value = dynamic_value.get_value();
	}
};


AppControl.prototype.update_value = function() {
	var
		control_value = this.element.value;

	if (typeof this.element.options === "object"){
		if (this.element.options[ this.element.selectedIndex ].disabled) {
			control_value = "";
		}
	}
	logger.debug('>>>>> update value "'+this.dynamic_value.name+'" from control "'+control_value+'"', this);

	this.dynamic_value.set_value(control_value);
	metalogger.debug( function() {
		dynamic_app.update_meta_info();
	});

	if (typeof this.element.options === "object"){
		this.dynamic_value.mark_selected();
	}

	logger.debug('<<<<< update value "'+this.dynamic_value.name+'" from control "'+control_value+'"', this);
};

AppControl.prototype.set_up = function() {

	var
		name = this.element.name,
		self = this;

	this.dynamic_value 						= this.instance.get_dynamic_value( name );
	this.element.name 						= this.dynamic_value.bracket_notation
	this.element.dataset.dynamicValue 	= this.dynamic_value.name;

	if (this.element.value !== "") {
		self.update_value();
	} else {
		self.update_by_value(this.dynamic_value);
	}

	this.instance.add_observer(
		this.dynamic_value.observe( 'control-'+this.element.tagName+'-'+name, function update_control(dv) {
			self.update_by_value(dv);
		}, this )
	);
	
	this.element.addEventListener('change', function() {
		self.update_value();
	});

};



range_testers = {
	'<': function bound_lt( val, bound ){ return bound < val; },
	'[': function bound_le( val, bound ){ return bound <= val; },
	'>': function bound_gt( val, bound ){ return bound > val; },
	']': function bound_ge( val, bound ){ return bound >= val; }
};

function ValueRange( range ){
	this.range = range;
	this.lower_bound_check = true;
	this.upper_bound_check = true;

	if (range !== '<>'){
		var parts = range.split(',');

		this.lower_bound = parts[0].substring(1);
		if (this.lower_bound.length>0){
			this.lower_bound_check = range_testers[ parts[0].substr(0,1) ]
		}
		this.upper_bound = parts[1].slice(0,-1);
		if (this.upper_bound.length>0){
			this.upper_bound_check = range_testers[ parts[1].substr(-1,1) ]
		}
	}
}

ValueRange.prototype.includes =function( dynamic_value ){
	var
		result;

	if (dynamic_value.is_empty()){
		result = false;
	} else {
		var
			val = dynamic_value.get_value(),
			lower_bound_check = typeof this.lower_bound_check === "function"? this.lower_bound_check( val, this.lower_bound ) : this.lower_bound_check,
			upper_bound_check = typeof this.upper_bound_check === "function"? this.upper_bound_check( val, this.upper_bound ) : this.upper_bound_check
		;

		result = lower_bound_check && upper_bound_check;
	}

	return result;
};

dynamic_app.types.AppComponent.prototype.on_initialise = function(callback) {
	this.on_initialise = callback;

	return this;
};

dynamic_app.types.AppComponent.prototype.on_started = function(callback) {
	this.on_started = callback;

	return this;
};

dynamic_app.types.AppComponent.prototype.locate = function() {
	this.element = dynamic_dom.get_element(this.selector);

	return this;
};

dynamic_app.types.AppComponent.prototype.initialise = function(callback) {
	if (this.element !== null && typeof this.on_initialise == "function") {
		this.on_initialise( this.element );
	}
};

dynamic_app.types.AppComponent.prototype.started = function(callback) {
	if (this.element !== null && typeof this.on_started == "function") {
		this.on_started( this.element );
	}
};

