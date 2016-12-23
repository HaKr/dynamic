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
		Name:       "Dynamic templates",
		Description:  "Replace <dynamic-template> tags with their content.",
		Version:    "1.05.1" 

	},
	vars: {
		Definitions:	[],
		Placeholders: 	[],
		Instances: 		[]

	},
	types: {
		DynamicTemplateDefinition: function( name, options ){
			this.name = name;
			this.construct( options );

			templates_module.vars.Definitions.push( this );
		},
		DynamicTemplatePlaceholder: function( template_definition,anchor ){
			this.definition = template_definition;
			this.instances = [];
			this.anchor = anchor;
			this.first = null;
			this.on_instance = null;

			templates_module.vars.Placeholders.push( this );
		},
		DynamicTemplateInstance: function( placeholder, anchor, child_nodes ){
			this.placeholder = placeholder;
			this.anchor = anchor;
			this.child_nodes = child_nodes;

			this.build();

			templates_module.vars.Instances.push( this );
		}
	}
};

var
	logger = require('./browser_log').get_logger( templates_module.info.Name ),
	dynamic_dom = require('./dynamic-dom.js'),
	dynamic_utils = require('./dynamic-utils')
	;

templates_module.define = function( name,options ){
	return new templates_module.types.DynamicTemplateDefinition( name, options );	
};

templates_module.create_placeholder = function( definition, anchor ){
	return new templates_module.types.DynamicTemplatePlaceholder( definition,anchor );	
};


function DynamicTemplateDefinition(){};

DynamicTemplateDefinition.prototype.construct = function( options ){
	this.scope = null;
	this.elements = [];
	this.parent= null;
	this.content = document.createDocumentFragment();

	this.merge_options( options );
};

DynamicTemplateDefinition.prototype.merge_options = function( options ){
	var self = this;

	Object.keys( options ).forEach( function( option_name ){
		var option_value = options[ option_name ];
		self[ option_name ] = option_value;
	} );
}

DynamicTemplateDefinition.prototype.absorb = function( element, only_content ){
	var
		self = this;

   var node_list = only_content ? dynamic_dom.get_nodes( element ) : [ element ];

	node_list.forEach( function( element_node ){
		self.content.appendChild( element_node );
	});

	if (only_content){
		element.parentNode.removeChild( element );
	}

	return this;
}

DynamicTemplateDefinition.prototype.get_clone = function(){
	var result = [];
	var child_nodes = dynamic_dom.get_nodes( this.content );

	child_nodes.forEach( function( child_node ){
		result.push( dynamic_dom.get_clone( child_node ) );
	});
	return result;
};


function DynamicTemplatePlaceholder(){};

DynamicTemplatePlaceholder.prototype.is_empty = function(){
	return this.instances.length < 1;
};

DynamicTemplatePlaceholder.prototype.clear = function(){
	var self = this;

	var todo = this.instances.reverse();
	this.instances = [];

	todo.forEach( function( instance ){
		instance.remove();
	});

	return self;
};

DynamicTemplatePlaceholder.prototype.add_instance = function( before_instance ){
	var anchor = (typeof before_instance === "object") ? before_instance.first : this.anchor;

	var result = new templates_module.types.DynamicTemplateInstance( this, anchor, this.definition.get_clone() );

	this.instances.push( result );

	if (typeof this.on_instance === "function"){
		this.on_instance( result );
	}

	return result;
};

DynamicTemplatePlaceholder.prototype.remove_instance = function( instance ){
	var instance_index = this.instances.indexOf( instance );

	if (instance_index >= 0){
		this.instances.splice( instance_index, 1 );
	}
};

function DynamicTemplateInstance(){};

DynamicTemplateInstance.prototype.build = function(  ){
	var self = this;

	this.first = dynamic_dom.insert_text_before( this.anchor, '\n' );

	this.child_nodes.forEach( function( child_node ){
		self.anchor.parentNode.insertBefore( child_node, self.anchor );
	} );

	this.last = dynamic_dom.insert_text_before( this.anchor, '\n' );
};

DynamicTemplateInstance.prototype.remove = function(){
	this.last.remove();

	this.child_nodes.reverse().forEach( function( child_node ){
		child_node.remove()
	} );
	this.first.remove();

	this.placeholder.remove_instance( this );
};

DynamicTemplateInstance.prototype.get_nodes = function(){
	return this.child_nodes;
}

templates_module.types.DynamicTemplateDefinition.prototype = new DynamicTemplateDefinition();
templates_module.types.DynamicTemplateDefinition.constructor = templates_module.types.DynamicTemplateDefinition;
templates_module.types.DynamicTemplatePlaceholder.prototype = new DynamicTemplatePlaceholder();
templates_module.types.DynamicTemplatePlaceholder.constructor = templates_module.types.DynamicTemplatePlaceholder;
templates_module.types.DynamicTemplateInstance.prototype = new DynamicTemplateInstance();
templates_module.types.DynamicTemplateInstance.constructor = templates_module.types.DynamicTemplateInstance;



module.exports = templates_module;
