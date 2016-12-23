(function DynamicTemplateModule(CMSGeneric){
	/*
		The template concept is a way to define HTML elements in such a way, that they can be instantiated
		in one call. This principle can then be combined with value binding, to have the instantiation
		process be automated by the appearance and disappearance of values.

		The concept has been modelled in three parts:
			1) Definition: a collection of HTML elements that are stored into a document fragment
			2) Placeholder: the position into the document where the elements of the Definition are cloned into
			3) Instance: the actual cloned nodes that where placed into the document 
	*/

	var exports = {
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

				exports.vars.Definitions.push( this );
			},
			DynamicTemplatePlaceholder: function( template_definition,anchor ){
				this.definition = template_definition;
				this.instances = [];
				this.anchor = anchor;
				this.first = null;

				exports.vars.Placeholders.push( this );
			},
			DynamicTemplateInstance: function( placeholder, anchor, child_nodes ){
				this.placeholder = placeholder;
				this.anchor = anchor;
				this.child_nodes = child_nodes;

				this.build();

				exports.vars.Instances.push( this );
			}
		}
	};

	if (typeof CMSGeneric === "undefined"){
		// eslint-disable-next-line
		console.error('cms-generic.js must be loaded first, before ',exports.info.Name, 'can be loaded.' );

		return;
	}

	exports.define = function( name,options ){
		return new exports.types.DynamicTemplateDefinition( name, options );	
	};
	
	exports.create_placeholder = function( definition, anchor ){
		return new exports.types.DynamicTemplatePlaceholder( definition,anchor );	
	};
	
	CMSGeneric.register( exports );

	function DynamicTemplateDefinition(){};

	DynamicTemplateDefinition.prototype.construct = function( options ){
		this.scope = null;
		this.elements = [];
		this.parent= null;
		this.cliche = CMSGeneric.createDocumentFragment();

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

	   var node_list = only_content ? element.getChildNodes() : [ element ];

		node_list.forEach( function( element_node ){
			self.cliche.addChild( element_node );
		});

		if (only_content){
			element.remove();
		}

		return this;
	}

	DynamicTemplateDefinition.prototype.get_clone = function(){
		var result = [];
		var child_nodes = this.cliche.getChildNodes();

		child_nodes.forEach( function( child_node ){
			result.push( child_node.getClone() );
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

		var result = new exports.types.DynamicTemplateInstance( this, anchor, this.definition.get_clone() );

		this.instances.push( result );

		return result;
	};

	DynamicTemplatePlaceholder.prototype.remove_instance = function( instance ){
		var instance_index = this.instances.indexOf( instance );

		if (instance_index >= 0){
			this.instances = this.instances.splice( instance_index, 1 );
		}
	};

	function DynamicTemplateInstance(){};

	DynamicTemplateInstance.prototype.build = function(  ){
		// this.first = this.anchor.insertCommentBefore( 'start instance' );
		this.first = this.anchor.insertTextBefore( '\n' );
		var self = this;

		this.child_nodes.forEach( function( child_node ){
			child_node.insertBefore( self.anchor );
		} );
		this.last = this.anchor.insertTextBefore( '\n' );
		// this.last = this.anchor.insertCommentBefore( 'instance end.' );
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

	exports.types.DynamicTemplateDefinition.prototype = new DynamicTemplateDefinition();
	exports.types.DynamicTemplateDefinition.constructor = exports.types.DynamicTemplateDefinition;
	exports.types.DynamicTemplatePlaceholder.prototype = new DynamicTemplatePlaceholder();
	exports.types.DynamicTemplatePlaceholder.constructor = exports.types.DynamicTemplatePlaceholder;
	exports.types.DynamicTemplateInstance.prototype = new DynamicTemplateInstance();
	exports.types.DynamicTemplateInstance.constructor = exports.types.DynamicTemplateInstance;

	return exports;

})(window.cms$Generic);