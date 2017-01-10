/*
	The template concept is a way to define HTML elements in such a way, that they can be instantiated
	in one call. This principle can then be combined with value binding, to have the instantiation
	process be automated by the appearance and disappearance of values.

	The concept has been modelled in three parts:
		1) Definition: a collection of HTML elements that are stored into a document fragment
		2) Placeholder: the position into the document where the elements of the Definition are cloned into
		3) Instance: the actual cloned nodes that where placed into the document 
*/

var templates_module = {
	info: {
		Name: "Dynamic templates",
		Description: "Replace <dynamic-template> tags with their content.",
		Version: "1.05.1"

	},
	vars: {
		Definitions: {},
		Placeholders: [],
		Instances: []

	},
	types: {
		DynamicTemplateDefinition: function(name, options) {
			this.name = name;
			this.placeholders = [];
			this.wait_for_complete = false;
			this.construct(options);

			templates_module.vars.Definitions[this.name] = this;
		},
		DynamicTemplatePlaceholder: function(template_definition, anchor, origin ) {
			this.definition = template_definition;
			this.instances = [];
			this.parent_instance = null;
			this.anchor = anchor;
			this.first = null;
			this.on_instance = null;
			this.on_empty = null;
			this.dynamic_values = [];
			this.empty_instance = null;
			var self=this;
			logger.debug( function() {
				self.reference = self.definition.name;
				self.origin = origin;				
			})
			this.set_up();

			templates_module.vars.Placeholders.push(this);
		},
		DynamicTemplateInstance: function( placeholder, anchor, child_nodes ) {
			this.placeholder = placeholder;
			this.anchor = anchor;
			this.child_nodes = dynamic_utils.make_array( child_nodes );
			this.parent_instance = null;
			this.child_instances = [];
			this.observers = {};
			this.placeholders = [];

			templates_module.vars.Instances.push( this );
		}
	}
};

var
	logger = require('./browser_log').get_logger(templates_module.info.Name),
	dynamic_dom = require('./dynamic-dom.js'),
	dynamic_utils = require('./dynamic-utils');

templates_module.define = function(name, options) {
	return new templates_module.types.DynamicTemplateDefinition( name, options );
};


templates_module.create_instance = function( element ) {
	return new templates_module.types.DynamicTemplateInstance( null, null, element );
};

templates_module.get_template_by_name = function( template_name ) {
	var result = null;

	if (templates_module.vars.Definitions.hasOwnProperty(template_name)) {
		result = templates_module.vars.Definitions[template_name];
	}

	return result;
};

function DynamicTemplateDefinition() {}

DynamicTemplateDefinition.prototype.construct = function(options) {
	this.content = document.createDocumentFragment();

	this.merge_options(options);
};

DynamicTemplateDefinition.prototype.add_placeholder = function( placeholder ) {
	this.placeholders.push( placeholder );
};

DynamicTemplateDefinition.prototype.merge_options = function( options ) {
	var self = this;

	Object.keys(options).forEach( function( option_name ) {
		var option_value = options[option_name];
		if (option_name === "incomplete"){
			self.wait_for_complete = option_value === "wait";
		} else {
			self[option_name] = option_value;
		}
	});
};

DynamicTemplateDefinition.prototype.absorb = function(element, only_content) {
	var
		self = this,
		parent = self.content
	;

	var node_list = only_content ? dynamic_dom.get_nodes(element) : [element];

	if (only_content && self.content.firstChild !== null){
		// logger.debug('content only absorb');
		parent = self.content.firstChild;
	}

	node_list.forEach(function(element_node) {
		parent.appendChild(element_node);
	});

	if (only_content) {
		element.parentNode.removeChild(element);
	}

	return this;
};

DynamicTemplateDefinition.prototype.get_clone = function() {
	var result = [];
	var child_nodes = dynamic_dom.get_nodes(this.content);

	child_nodes.forEach(function(child_node) {
		result.push(dynamic_dom.get_clone(child_node));
	});
	return result;
};

function DynamicTemplatePlaceholder() {}

DynamicTemplatePlaceholder.prototype.remove = function() {
	templates_module.vars.Placeholders.splice( templates_module.vars.Placeholders.indexOf( this ), 1 );
};

DynamicTemplatePlaceholder.prototype.set_up = function() {
	this.definition.add_placeholder( this );
	if (typeof this.definition.on_empty === "string"){
		this.on_empty = templates_module.get_template_by_name( this.definition.on_empty );
	}

	this.empty();
};

DynamicTemplatePlaceholder.prototype.add_value = function( dynamic_value ) {
	var
		self = this;

	this.dynamic_values.push( dynamic_value );
	if (this.definition.wait_for_complete){
		dynamic_value.observe( 'check_for_complete', function check_placeholder_complete( dv ){
			self.check_complete();
		}, self );
	}
};

DynamicTemplatePlaceholder.prototype.check_complete = function( dynamic_value ) {
	var
		result = false;

	// if (typeof dynamic_value !== "undefined"){
	// 	if (this.dynamic_value !== dynamic_value){
	// 		this.clear();
	// 	}
	// 	this.dynamic_value = dynamic_value;
	// }

	result = !this.dynamic_value.is_empty();

	if (result && this.definition.wait_for_complete){
		for (var i=0; result && i < this.dynamic_values.length; i++){
			var dynamic_sub_value = this.dynamic_values[i];

			result = !dynamic_sub_value.is_empty();
		}
	}

	if (result){
		this.set_instance( this.dynamic_value );
	} else {
		this.empty();
	}

};


DynamicTemplatePlaceholder.prototype.check_completed = function( dynamic_value ) {
	var
		result = false;

	if (typeof dynamic_value !== "undefined"){
		if (this.dynamic_value !== dynamic_value){
			this.clear();
			this.dynamic_value = dynamic_value;
		}

		result = !this.dynamic_value.is_empty();
	}


	if (result && this.definition.wait_for_complete){
		for (var i=0; result && i < this.dynamic_values.length; i++){
			var dynamic_sub_value = this.dynamic_values[i];

			result = !dynamic_sub_value.is_empty();
		}
	}

	if (result){
		this.set_instance( this.dynamic_value );
	} else {
		this.empty();
	}

};

DynamicTemplatePlaceholder.prototype.is_empty = function() {
	return this.instances.length < 1;
};

DynamicTemplatePlaceholder.prototype.clear = function() {
	var self = this;

	var todo = this.instances.reverse();
	this.instances = [];

	todo.forEach(function(instance) {
		instance.remove();
	});

	if (this.empty_instance !== null){
		this.empty_instance.remove();
		this.empty_instance = null;
	}

	return self;
};

DynamicTemplatePlaceholder.prototype.build_instance = function( definition, dynamic_value, before_instance) {
	var anchor = (typeof before_instance === "object") ? before_instance.first : this.anchor;

	var result = new templates_module.types.DynamicTemplateInstance( this, anchor, definition.get_clone() );
	result.dynamic_value = dynamic_value;
	result.build();

	if (typeof this.on_instance === "function") {
		this.on_instance(result);
	}

	return result;
};


DynamicTemplatePlaceholder.prototype.add_instance = function( dynamic_value, before_instance) {
	if (typeof dynamic_value === "undefined" || dynamic_value === null ){
		logger.error( 'placeholder add instance without dynamic_value', dynamic_value, this );
	}
	var result = this.build_instance( this.definition, dynamic_value, before_instance );
	this.instances.push(result);

	return result;
};

DynamicTemplatePlaceholder.prototype.set_instance = function( dynamic_value ) {

	this.clear();
	var result = this.build_instance( this.definition, dynamic_value );
	this.instances.push( result );

	return result;
};

DynamicTemplatePlaceholder.prototype.empty = function() {

	if (!this.is_empty() ){

		this.clear();
	}

	if ( this.on_empty !== null && this.empty_instance === null ){
		this.empty_instance = this.build_instance( this.on_empty, null );
	}

	return this;
};

DynamicTemplatePlaceholder.prototype.remove_instance = function( instance ) {
	var instance_index = this.instances.indexOf(instance);

	if ( instance_index >= 0 ) {
		this.instances.splice( instance_index, 1 );
	}
};

function DynamicTemplateInstance() {}

DynamicTemplateInstance.prototype.enhance = function( methods ) {
	Object.keys( methods ).forEach( function enhance_instance( method_name ){
		DynamicTemplateInstance.prototype[ method_name ] = methods[ method_name ];
		this[ method_name ] = methods[ method_name ];
	} );
}

DynamicTemplateInstance.prototype.get_template_by_name = templates_module.get_template_by_name;

DynamicTemplateInstance.prototype.set_parent = function( parent_instance ) {
	if (typeof parent_instance === "undefined"){
		parent_instance = null;
	}
	this.parent_instance = parent_instance;

	if (this.parent_instance !== null){
		this.parent_instance.add_child_instance( this );
	}
};

DynamicTemplateInstance.prototype.create_placeholder = function( definition, anchor, origin ) {
	var result = new templates_module.types.DynamicTemplatePlaceholder( definition, anchor, origin );

	this.placeholders.push( result );
	result.parent_instance = this;

	return result;
};


DynamicTemplateInstance.prototype.add_child_instance = function( child_instance ) {
	this.child_instances.push( child_instance );
};

DynamicTemplateInstance.prototype.add_observer = function( observer ) {
	if (this.observers.hasOwnProperty( observer.reference )){
		logger.error( 'Instance redefines observer '+observer.reference, this );
	} else {
		this.observers[ observer.reference ] = observer;
	}
};

DynamicTemplateInstance.prototype.add_value = function( dynamic_value ){
	if (this.placeholder !== null){
		this.placeholder.add_value( dynamic_value );
	}
};

DynamicTemplateInstance.prototype.node_inserted = function( node ){
	//
};

DynamicTemplateInstance.prototype.build = function() {
	var self = this;

	if (this.placeholder !== null){

		this.first = dynamic_dom.insert_text_before(this.anchor, '\n');

		this.child_nodes.forEach(function(child_node) {
			self.anchor.parentNode.insertBefore(child_node, self.anchor);
			self.node_inserted( child_node );
		});

		this.last = dynamic_dom.insert_text_before(this.anchor, '\n');
	}
};

DynamicTemplateInstance.prototype.remove = function() {

	this.child_instances.reverse().forEach( function remove_child( child_instance ){
		child_instance.remove();
	}, this );
	this.child_instances = [];

	Object.keys( this.observers ).forEach( function unobserve( observer_ref ){
		var observer = this.observers[ observer_ref ];
		observer.remove();
	}, this );
	this.observers = {};

	this.placeholders.forEach( function remove_placeholder( placeholder ){
		placeholder.remove();	
	});
	this.placeholders = [];

	if (this.placeholder !== null){
		dynamic_dom.remove_node(this.last);

		this.child_nodes.reverse().forEach(function(child_node) {
			dynamic_dom.remove_node(child_node);
		});
		dynamic_dom.remove_node(this.first);

		this.placeholder.remove_instance(this);
		templates_module.vars.Instances.splice( templates_module.vars.Instances.indexOf( this ), 1 );

	}
};

DynamicTemplateInstance.prototype.get_nodes = function() {
	return this.child_nodes;
};

templates_module.types.DynamicTemplateDefinition.prototype = new DynamicTemplateDefinition();
templates_module.types.DynamicTemplateDefinition.constructor = templates_module.types.DynamicTemplateDefinition;
templates_module.types.DynamicTemplatePlaceholder.prototype = new DynamicTemplatePlaceholder();
templates_module.types.DynamicTemplatePlaceholder.constructor = templates_module.types.DynamicTemplatePlaceholder;
templates_module.types.DynamicTemplateInstance.prototype = new DynamicTemplateInstance();
templates_module.types.DynamicTemplateInstance.constructor = templates_module.types.DynamicTemplateInstance;

module.exports = templates_module;
