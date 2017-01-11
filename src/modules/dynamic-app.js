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
	logger = require('./browser_log').get_logger(dynamic_app.info.Name)
;

var
	template_options = {
		'for': {},
		'for-each': {},
		'for-values': {},
		'on-empty': {},
		alternative: {},
		'only-content': {},
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

dynamic_app.run = function() {

	logger.info( dynamic_app.info );

	dynamic_app.vars.components.forEach( function register_components(component) {
		component.locate();
		component.initialise();
	});

	logger.debug( function(){
		dynamic_app.debug_templates 		= value_module.get_or_define( 'debug.template_count' );
		dynamic_app.debug_placeholders 	= value_module.get_or_define( 'debug.placeholder_count' );
		dynamic_app.debug_instances 		= value_module.get_or_define( 'debug.instance_count' );
		dynamic_app.debug_observers 		= value_module.get_or_define( 'debug.observer_count' );

		dynamic_app.update_info = function(){
			dynamic_app.debug_templates.set_value( Object.keys( template_module.vars.Definitions ).length );
			dynamic_app.debug_placeholders.set_value( Object.keys( template_module.vars.Placeholders ).length );
			dynamic_app.debug_instances.set_value( Object.keys( template_module.vars.Instances ).length );
			dynamic_app.debug_observers.set_value( Object.keys( value_module.vars.observers ).length );
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
		range				= '<>',
		is_body 			= typeof template_element === "undefined";

	if (!is_body) {

		parser = new AttributeParser( template_tag );
		parser.parse( template_element );
		only_content = parser.options.hasOwnProperty( 'only_content' ) ? parser.options.only_content : false;
		delete parser.options.only_content;

		if (typeof parser.name === "string" && parser.name.length > 0) {
			existing = template_module.get_template_by_name( parser.name );

			if (existing !== null) {
				result = existing;
				result.merge_options( parser.options );
			} else {
				result = template_module.define( parser.name, parser.options );
			}

			if (parser.options.hasOwnProperty('for') || parser.options.hasOwnProperty('for_each')) {
				range = parser.options.hasOwnProperty('range') ? parser.options.range : '<>';
				var 
					dynamic_value_name 	= parser.options.hasOwnProperty('for') ? parser.options['for'] : parser.options.for_each,
					multiple 				= parser.options.hasOwnProperty('for_each'),
					comment_node 			= document.createComment( "<" + template_tag + " name=" + parser.name + " dynamic-value=" + dynamic_value_name + " range=" + range +" multiple=" + multiple + ">" )
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
		child_keys = Object.keys(dynamic_value.children);

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
	multiple: dynamic_placeholder.multiple_instance,
	yes: dynamic_placeholder.multiple_instance,
	'true': dynamic_placeholder.multiple_instance,
	no: dynamic_placeholder.single_instance,
	'false': dynamic_placeholder.single_instance,
	single: dynamic_placeholder.single_instance
};

dynamic_placeholder.select_instancing = function(multiple) {
	var
		result;

	if (typeof multiple === "string" && multiple.length > 0) {
		result = dynamic_placeholder.multi_attribute_selector[multiple];
	} else {
		result = dynamic_placeholder.multi_attribute_selector.single;
	}

	if (typeof result !== "function") {
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
		logger.warning( 'Instance '+instance.placeholder.definition.name+' already referenced on value '+instance.dynamic_value.name );
	} else {
		this.instances.push( instance );
	}
	
};

dynamic_value_class.remove = function( instance ){
	this.children.forEach( function remove_child( child_value ){
		child_value.remove();
	}, this );
	this.children = [];

	if ( typeof this.instances !=="undefined" ){
		this.instances.forEach( function remove_instance( instance ){
			instance.remove();
		}, this);
	}

	this.set_value( null );
	this.instances = [];
	delete this.parent.value[ this.reference ];
	delete this.parent.children[ this.reference ];

	counter = dynamic_app.dynamic_value(this.parent.name+'.$count');
	if (counter !== null) {
		counter.notify_observers( counter );
	}

};

dynamic_value_class.can_swap = function( offset ){
	var
		result = false;

	if (this.parent === null){
		result = false;
	} else {
		var 
			child_references = Object.keys( this.parent.children ),
			my_index = child_references.indexOf( this.reference ),
			other_index =
				typeof offset === "string" 
					? child_references.indexOf( offset )
					: my_index + offset >=0 && my_index + offset < child_references.length
						? my_index + offset
						: -1 
		;

		if (other_index < 0 ){
			result = false;
		} else {
			result = true;
		}
	}

	return result;
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
			other_index =
				typeof offset === "string" 
					? child_references.indexOf( offset )
					: my_index + offset >=0 && my_index + offset < child_references.length
						? my_index + offset
						: -1 
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

			// this.instances.forEach( function( an_instance ){
			// 	logger.info( '"'+an_instance.placeholder.definition.name+'"' );
			// }, this );

			upper_value.instances.forEach( function swap_instances( upper_instance, ix ){
				var other_instance = lower_value.instances.find( function( an_instance ){
					return an_instance.placeholder.definition.name === upper_instance.placeholder.definition.name; 
				}, this );
				if (typeof other_instance === "object"){
					upper_instance.swap( other_instance );
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

	logger.debug( function() {
			dynamic_app.update_info();
	});
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

dynamic_instance_class.add_placeholder = function( placeholder ){
	if (typeof this.placeholders === "undefined"){
		this.placeholders = [];
	}

	this.placeholders.push( placeholder );
};

var
	binding_re = /{{([^}]+)}}/g,
	bind_pattern = '{{([^}]+?)}}',
	binding_finder = new RegExp(bind_pattern),
	binding_replacer = new RegExp(bind_pattern, 'g');


dynamic_instance_class.bind_textnodes = function(element) {
	// first approach was to cut all text nodes into pieces
	// So <p>A {{B}} C {{D}} E</p> would result into 5 ones,
	// with two observers for B and D.
	// But then the blanks between them would get lost.
	var self = this;

	dynamic_dom.get_nodes(element, {
		node_type: Node.TEXT_NODE
	}, function(text_node) {
		var node_text = text_node.textContent;
		var parent_node = text_node.parentNode;
		if (binding_finder.test(node_text)) {
			self.add_text_observer( new TextObserver(text_node, self) );
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
				if (binding_finder.test(attribute_value)) {
					self.add_attribute_observer( new AttributeObserver(child_element, attribute.name, this) );
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

		var
			anchor_first 			= dynamic_dom.insert_text_before( comment_node, "\n" ),
			anchor 					= dynamic_dom.insert_text_before( comment_node, "\n" ),
			template_definition 	= this.get_template_by_name( attributes.name ),
			template_placeholder = this.create_placeholder( template_definition, anchor, match[0] )
		;

		self.add_placeholder( template_placeholder );

		template_placeholder.value_changed 	= dynamic_placeholder.select_instancing(attributes.multiple);
		template_placeholder.first 			= anchor_first;
		template_placeholder.range				= new ValueRange( attributes.range );

		template_placeholder.on_instance = function on_instance_created( template_instance ) {
			if (template_instance.dynamic_value !== null){
				template_instance.dynamic_value.add_instance( template_instance );
			}
			template_instance.set_parent( self );
			template_instance.get_values_and_templates();
		};

		var dynamic_value = attributes.dynamic_value.length>0 ? this.get_dynamic_value( attributes.dynamic_value ) : this.dynamic_value;
		this.add_observer(
			dynamic_value.observe( 'placeholder', function change_placeholder(trigger_value) {
				// if (template_placeholder.dynamic_value !== trigger_value ||  template_placeholder.dynamic_value.get_value() !== trigger_value.get_value() ){
					logger.debug( dynamic_value.name+'['+trigger_value.name+']'+'('+(typeof template_placeholder.dynamic_value === "undefined"?'NIL':template_placeholder.dynamic_value.name)+') ==> instance(s) of ' + template_placeholder.definition.name );
					template_placeholder.dynamic_value = trigger_value;
					template_placeholder.value_changed(trigger_value);
				// }
			}, template_placeholder )
		);

		if (!dynamic_value.is_empty() ){
			logger.debug( 'Instance(s) of ' + template_placeholder.definition.name + ' for ' + dynamic_value.name+'['+dynamic_value.get_final().name+']' );
			template_placeholder.dynamic_value = dynamic_value;
			template_placeholder.value_changed( dynamic_value );
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
					other_button = other_value.get_elements( 'button.move-up.dynamic-value' )[0] 
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
					other_button = other_value.get_elements( 'button.move-down.dynamic-value' )[0] 
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
			if (!tag_element.dataset.hasOwnProperty('dynamicValue')){
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
			
			Object.keys( button_commands ).forEach( function( command_name ){
				if (btn.className.indexOf( command_name ) >= 0){
					if (!button_commands[ command_name ].can_do( dv )){
						dynamic_dom.add_class( btn, 'hidden' );
					}

					btn.textContent = button_commands[ command_name ].label;
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
	if (tag_element.tagName === 'SELECT' && tag_element.className.indexOf('fte-select')>=0 && tag_element.className.indexOf('harry')>=0) {
			logger.info( 'add control on '+this.placeholder.definition.name, tag_element, this );
		}
		this.controls.push(new AppControl(tag_element, this));
};

dynamic_instance_class.get_dynamic_value = function(value_name) {
	var 
		result = null,
		formula = ""
	;

	if (value_name.indexOf('=') > 0) {
		var name_parts = value_name.split( '=' ); 
		value_name = name_parts[0].trim();
		formula = name_parts[1].trim();
	}


	if (dynamic_utils.starts_with(value_name, '.')) {
		var
			parent_value = this.dynamic_value.get_final();
		if (dynamic_utils.starts_with(value_name, '..')){
			parent_value = this.dynamic_value.get_final().parent;
			value_name = value_name.substring(1);
		}
		value_name = parent_value.name + value_name;
	}

	result = value_module.get_or_define( value_name );

	if (formula.length > 0){

		FormulaValue( result, formula, this );
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

function LiteralPart(text) {
	this.text = text;
}

LiteralPart.prototype.get_text = function() {
	return this.text;
};

function DynamicPart(value, binding_observer) {
	this.dynamic_value = value;
	this.delegate_value = null;
	this.binding_observer = binding_observer;
	this.text = value.get_final().get_text();

	var self = this;

	this.value_observer = this.dynamic_value.observe( 'binding', function update_binding(the_value) {
		self.text = the_value.get_text();
		self.binding_observer.set_text_content();

		if (the_value !== self.dynamic_value && self.delegate_value !== the_value) {
			logger.debug('Dynamic part updated by reference', self);
			self.delegate_value = the_value;
			if (typeof self.delegate_observer !== "undefined" && self.delegate_observer !== null ) {
				logger.debug('Dynamic part removing reference observer', self.delegate_observer);
				self.delegate_observer.remove();
			}
			self.delegate_observer = self.delegate_value.observe( 'delegated binding', function update_binding_by_delegate(dv) {
				logger.debug('Dynamic part updating binding by reference', self, dv);
				self.text = dv.get_text();
				self.binding_observer.set_text_content();
			}, self );

			if (typeof self.binding_observer.instance !== "undefined") {
				self.binding_observer.instance.add_observer(self.delegate_observer);
			} else {
				logger.error( 'binding observer instance undefined', self );
			}
		}
	}, this);

	if (typeof this.binding_observer.instance !== "undefined") {
		this.binding_observer.instance.add_observer(this.value_observer);
	}
}

DynamicPart.prototype.get_text = LiteralPart.prototype.get_text;

function BindingObserver() {}

BindingObserver.prototype.register = function(template_instance) {
	this.instance = template_instance;
	this.parts = [];
	dynamic_app.vars.binding_observers.push(this);
	this.add_parts();
};

BindingObserver.prototype.add_literal = function(text) {
	this.parts.push(new LiteralPart(text));
};

BindingObserver.prototype.add_dynamic = function(dynamic_value) {
	this.parts.push(new DynamicPart( dynamic_value, this ));
};

BindingObserver.prototype.add_parts = function() {
	var test_value = this.original;
	while (binding_finder.test(test_value)) {
		var match = test_value.match(binding_finder);
		var whole_part = match[0];
		var value_name = match[1];
		var part_start = test_value.indexOf(whole_part);
		if (part_start > 0) {
			var left_part = test_value.substring(0, part_start);
			this.add_literal(left_part);
		}
		var dynamic_value = this.instance.get_dynamic_value( value_name );
		this.instance.add_value(dynamic_value);
		this.add_dynamic(dynamic_value);

		var right_part = test_value.substring(part_start + whole_part.length);
		test_value = right_part;
	}

	if (test_value.length > 0) {
		this.add_literal(test_value);
	}

	this.set_text_content();
};

function TextObserver(text_node, template_instance) {
	this.text_node = text_node;
	this.original = text_node.textContent;

	this.register(template_instance);
}

TextObserver.prototype = new BindingObserver();
TextObserver.constructor = TextObserver;

TextObserver.prototype.set_text_content = function() {
	var result = '';
	this.parts.forEach(function(part) {
		result += part.get_text();
	});
	this.text_node.textContent = result.trim();
};

function AttributeObserver(element, attribute_name, template_instance) {
	this.element = element;
	this.attribute_name = attribute_name;
	this.original = this.element.getAttribute(attribute_name);
	this.element.removeAttribute(attribute_name);

	this.register(template_instance);
}

AttributeObserver.prototype = new BindingObserver();
AttributeObserver.constructor = AttributeObserver;

AttributeObserver.prototype.set_text_content = function() {
	var
		result = '',
		complete = true;
	this.parts.forEach(function(part) {
		var part_text = part.get_text();
		if (part_text.length > 0) {
			result += part.get_text();
		} else {
			complete = false;
		}
	});
	if (complete) {
		this.element.setAttribute( this.attribute_name, result.trim() );
	}
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


// Formulas
function FormulaValue( dv, formula, instance ) {

	if (typeof dv.formula === "undefined"){
		dv.formula = formula;

		Object.keys( FormulaValue.prototype ).forEach( function set_method( method_name ){
			dv[ method_name ] = FormulaValue.prototype[ method_name ];
		});

		dv.instance = instance;
		dv.parse_formula(); 
	} else {
		if (dv.formula !== formula){
			logger.warning( dv.name + ' already has formula "'+dv.formula+'"; ignoring "'+formula+'"' );
		}
	}

	return dv;
}

FormulaValue.prototype.calculate_simple_operation = function( operation ){
	var operands = [];

	for ( oi=0 ; oi<operation.operands ; oi++ ){
		operands.push( this.operands.pop() );
	}

	this.push_literal( operation.operation.apply( this, operands.reverse() ) );

};

FormulaValue.prototype.calculate = function() {
	var 
		result="",
		operators = dynamic_utils.array_duplicate( this.operators ),
		operands = dynamic_utils.array_duplicate( this.operands )
	;

	logger.debug( 'calculate '+this.formula+' for '+this.name+' = '+result );

	while ( this.operands.length > 1 ){
		var 
			operator = operators.pop()
		;

		this.calculate_simple_operation( operator );
	}

	var
		operand = this.operands.pop(),
		result = operand.get_value();
	;
	
	this.operands = operands;

	this.set_value( result );

};

function get_numerical_value( operand ){
	var result = 0;

	if (operand.include()){
		result = new Number( operand.get_value() );
	}

	return result;
}

function set_numerical_value( param ){
	var result;

	if (isNaN( param ) || !isFinite( param ) ){
		result = '';
	} else {
		result = new Number( param )
	};

	return result;
}

var
	naive_re = /\s*(([+\-*\/])\s*((?:[@$.]|\w)+))/g,
	first_re = /^(.*?)(?:(\s+[+\-*\/])|$)/,
	operations = {
		'+': {operands: 2, operation: function f_add(op1,op2){ return set_numerical_value( get_numerical_value( op1 ) + get_numerical_value( op2 ) ); }  },
		'-': {operands: 2, operation: function f_sub(op1,op2){ return set_numerical_value( get_numerical_value( op1 ) - get_numerical_value( op2 ) ); }  },
		'/': {operands: 2, operation: function f_div(op1,op2){ return set_numerical_value( get_numerical_value( op1 ) / get_numerical_value( op2 ) ); }  },
		'*': {operands: 2, operation: function f_mul(op1,op2){ return set_numerical_value( get_numerical_value( op1 ) * get_numerical_value( op2 ) ); }  }
	}
;

FormulaValue.prototype.push_operator = function( operator ) {
	var worker = operations[ operator ];
	this.operators.push( worker );
};

FormulaValue.prototype.push_literal = function( operand ) {
	this.operands.push( {include: function(){ return true; }, get_value: function(){ return operand; } } );
};

FormulaValue.prototype.push_operand = function( operand ) {
	if (/^^\d+(\.\d+)?$/.test( operand )){
		this.push_literal( operand );
	} else {
		var dv = this.instance.get_dynamic_value( operand );
		this.operands.push( {include: function(){ return !dv.is_empty(); }, get_value: function(){return dv.get_value(); } } );
		var self = this;

		dv.observe( this.formula, function operand_value_changed( v ){
			self.calculate();
		}, this )
	}
};

function FunctionSum( formula_value, params ){
	this.formula_value = formula_value;
	this.reference = params[0];
	this.value_decimals = params.length > 1? params[1] : -1;
	this.value_refs = [];
	this.operand_count = 0;

	var star_pos = this.reference.indexOf( '*' );

	if (star_pos>0){
		var
			parent_ref = this.reference.substring( 0, star_pos-1 ), /* -1 to get rid of the dot */
			childs_ref = this.reference.substring( star_pos+1 )
		;

		this.parent_value = dynamic_app.dynamic_value( parent_ref );

		if (this.parent_value === null){
			logger.error( 'unknown reference "'+parent_ref+'"');
		} else {
			var child_values = this.parent_value.get_children();
			child_values.forEach( function( child_value ){
				var operand = child_value.name + childs_ref;
				this.formula_value.push_operand( operand );
			}, this );
			this.operand_count = child_values.length;
		}
	}
}

FunctionSum.prototype.calculate = function calculate_sum(){
	var result = 0;

	Array.prototype.slice.call( arguments[0] ).forEach( function add_to_sum( operand ){
		var intermediate = get_numerical_value( operand );
		result += ( typeof intermediate === "string" ? 0 : intermediate );
	} );

	return set_numerical_value( result );
};

var
	known_functions = {
		sum: {
			params_re: /^([^\ ,]+)\s*(?:,\s*(\d+))?\s*(?:,\s*(\d+))?$/,
			params_explain: 'value_reference [, decimals]',
			class: FunctionSum
		}
	}
;

FormulaValue.prototype.parse_function = function( func ) {
	var 
		h1=func.indexOf('('),
		h2=func.indexOf(')'),
		func_name = func.substring( 0, h1 ).trim().toLowerCase(),
		func_params = func.substring( h1+1, h2 ).trim()
	;

	if (!known_functions.hasOwnProperty( func_name )){
		logger.error( 'Unknown function "'+func_name+'" in '+this.formula );
	} else {
		var 
			func_parser = known_functions[ func_name ], 
			func_params_match = func_params.match( func_parser.params_re )
		;
		if (!func_params_match){
			logger.error( 'invalid parameters "'+ func_params + '"; ' + func_name + ': ' + func_parser.params_explain  );
		} else {
			function_instance = new func_parser.class( this, func_params_match.slice(1) );
			this.operators.push(
				{operands: function_instance.operand_count, operation: function f_fn(){ return function_instance.calculate( arguments ); } }
			);
		}
	}

};

FormulaValue.prototype.parse_formula = function() {
	this.operands = [];
	this.operators = [];

	var 
		to_parse = this.formula,
		match = to_parse.match( first_re ),
		operand = match[1],
		operator 
		;

	if ( operand.indexOf( '(' )>0){
		this.parse_function( operand );
	} else {
		this.push_operand( operand );	
	}

	to_parse = to_parse.substring( operand.length );

	match = naive_re.exec( to_parse );


	while (match){
		operator = match[2];
		operand = match[3];
		this.push_operator( operator );
		this.push_operand( operand );
		match = naive_re.exec( to_parse );
	}

	this.calculate();
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

// logger.debug( function() {
dynamic_app.find_observer = function(text) {
	var obs = dynamic_app.vars.binding_observers.find(function(binding_observer) {
		return binding_observer.original === '{{' + text + '}}';
	});

	logger.debug('Observer', obs);
};
// });

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
