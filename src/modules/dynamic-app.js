var dynamic_app = {
		info: {
			Name:       "Dynamic applications",
			Description:  "Modify web pages based on templates and live data.",
			Version:    "1.01.1"
		},
		vars: {
			templates: {},
			placeholders: [],
			values: [],
			TextObservers: []
		},
		types: {
			
		}
	};

var
	dynamic_dom = require('./dynamic-dom.js'),
	dynamic_utils = require('./dynamic-utils'),
	value_module = require('./dynamic-values.js'),
	template_module = require('./dynamic-templates.js'),
	logger = require('./browser_log').get_logger( dynamic_app.info.Name )
	;

var
	template_options = {
	  for: {},
	  'for-each': {},
	  'on-empty': {},
	  alternative: {},
	  'only-content': {}
	},
	template_tag = 'dynamic-template',
	parse_options = {},
	attributelist_pattern = '([^=]+)=(\\S+)\\s*',
	comment_pattern = '^<'+template_tag+'\\s+((('+attributelist_pattern+'))+)\\s*>$', 
	attributelist_re = new RegExp( attributelist_pattern, 'g' ),
	comment_re = new RegExp( comment_pattern )
;

parse_options[ template_tag ] = template_options;

dynamic_dom.events.on('DOM ready', function(){
	dynamic_app.define_values();
	dynamic_app.define_templates();
	dynamic_app.get_values_and_templates( document );

	logger.info(  dynamic_app );
	dynamic_dom.events.emit( 'App started' );

	dynamic_app.vars.placeholders = template_module.vars.Placeholders;

	window.$app = dynamic_app;
});

dynamic_app.started = function( css_selector, callback ){
	dynamic_dom.events.on( 'App started', function(){
		var container = dynamic_dom.get_element( css_selector );
		if ( container !== null){
			callback( container );
		}
	});
};

module.exports = dynamic_app;

dynamic_app.get_values_and_templates = function( node_list ){
	node_list = dynamic_utils.make_array( node_list );

	node_list.forEach( function( node ){
		dynamic_app.get_values( node );
		dynamic_app.bind_textnodes( node );
		dynamic_app.get_templates( node );
	});
}

dynamic_app.get_values = function( node ){
	var input_elements = dynamic_dom.get_elements( node, 'input' );

	 input_elements.forEach( function( input_element ) {
		var name = input_element.name ;
		var dynamic_value = dynamic_app.dynamic_value( name, true );
		var sema=0;

		dynamic_value.observe( function(){
			if (sema<1){
				sema++;
				logger.debug( 'update control from value', input_element, dynamic_value );
				input_element.value = dynamic_value.get_value();
				sema--;
			}
		});

		input_element.addEventListener( 'change', function(){
			if (sema<1){
				sema++;
				logger.debug( 'update value from control', input_element, dynamic_value );
				dynamic_value.set_value( this.value );
				sema--;
			}
		})

	 });
};

dynamic_app.get_templates = function( node ){
	var comment_nodes = dynamic_dom.get_nodes(node,{node_type: Node.COMMENT_NODE}, function is_dynamic_placeholder( candidate_node ){
	  return comment_re.test( candidate_node.textContent );
	});

	comment_nodes.forEach( function( comment_node ){
		var 
			attributes = {},
			match = comment_node.textContent.match( comment_re ),
			attribute_list = match[1]
		;

		dynamic_utils.collect( attributelist_re, attribute_list, function( attr_match, attr_index ){
			attributes[ attr_match[1].replace('-','_') ] = attr_match[2];
		} );

		var anchor_first = dynamic_dom.insert_text_before( comment_node, "\n" ); 
		var anchor = dynamic_dom.insert_text_before( comment_node, "\n" ); 
		var template_definition = dynamic_app.get_template_by_name( attributes.name );

		var template_placeholder = template_module.create_placeholder( template_definition,anchor );
		// template_placeholder.first = comment_node.insertCommentBefore( 'Start '+ attributes.name );
		template_placeholder.first = anchor_first;
		template_placeholder.on_instance = function( template_instance ){
			dynamic_app.get_values_and_templates( template_instance.child_nodes );
		}

		var dynamic_value = dynamic_app.dynamic_value( attributes.dynamic_value, true );
		dynamic_value.observe( function() {
			if ( dynamic_value.is_empty() ){
			  template_placeholder.clear();
			} else {
			  if (template_placeholder.is_empty()){
				 var instance = template_placeholder.add_instance();
			  }
			}
		});

		comment_node.remove();

	});

};


dynamic_app.dynamic_value = function( value_name, may_define ){
	if (typeof may_define !== 'boolean'){
		may_define = false;
	}
	return may_define ? value_module.get_or_define( value_name ) : value_module.get_by_name( value_name );;
};

var 
	binding_re = /{{([^}]+)}}/g,
	bind_pattern = '{{([^}]+?)}}',
  	binding_finder = new RegExp(bind_pattern),
  	binding_replacer = new RegExp(bind_pattern, 'g');


dynamic_app.define_values = function( element ){
	var
		the_element = element || document.body
	;

	dynamic_utils.collect( binding_replacer, the_element.textContent, function( binding_match, attr_index ){
		var dv = value_module.get_or_define( binding_match[1], true );
		logger.debug( 'Dynamic variable', dv );
	} );

};


dynamic_app.bind_textnodes = function( element ) {
 // first approach was to cut all text nodes into pieces
 // So <p>A {{B}} C {{D}} E</p> would result into 5 ones,
 // with two observers for B and D.
 // But then the blanks between them would get lost.
 dynamic_dom.get_nodes( element, {
   node_type: Node.TEXT_NODE
 }, function(text_node) {
   var node_text = text_node.textContent;
   var parent_node = text_node.parentNode;
   if (binding_finder.test(node_text)) {

     var text_observer = new TextObserver(text_node);

     while (binding_finder.test(node_text)) {
       var match = node_text.match(binding_finder);
       var whole_part = match[0];
       var value_name = match[1];
       var part_start = node_text.indexOf(whole_part);
       if (part_start > 0) {
         var left_part = node_text.substring(0, part_start);
         text_observer.add_literal(left_part);
       }
       var dynamic_value = dynamic_app.dynamic_value( value_name );
       text_observer.add_dynamic(dynamic_value);

       var right_part = node_text.substring(part_start + whole_part.length);
       node_text = right_part;
     }

     text_observer.add_literal(node_text);
     text_observer.set_text_content();
   }
 });
};


dynamic_app.get_template_by_name = function( template_name ){
	var result = null;

	if (dynamic_app.vars.templates.hasOwnProperty( template_name )){
		result = dynamic_app.vars.templates[ template_name ];
	}

	return result;
};

dynamic_app.define_templates = function( template_element ){
	var 
		result,
		parser = null,
		existing = null,
		only_content = false,
		is_body = typeof template_element === "undefined"
		;

	if (!is_body){

		var parser = new AttributeParser( template_tag );
		parser.parse( template_element );
		var existing = dynamic_app.get_template_by_name( parser.name );

		if (existing !== null){
			result = existing;
			result.merge_options( parser.options );
		} else {
			result = template_module.define( parser.name, parser.options );


			dynamic_app.vars.templates[ parser.name ] = result ;
		}

		only_content = parser.options.hasOwnProperty('only_content') ? parser.options.only_content : false;
		delete parser.options.only_content;

		if (parser.options.for || parser.options.for_each){
			var dynamic_value_name = parser.options.for ? parser.options.for : parser.options.for_each;
			var multiple=(typeof parser.options.for_each !== "undefined");

			var comment_node = document.createComment("<" + template_tag + " name="+parser.name+" dynamic-value="+dynamic_value_name+" multiple="+multiple+">");
			template_element.parentNode.insertBefore( comment_node, template_element );
		}
	}

	var child_template_elements = dynamic_app.get_children( template_element, "." + template_tag );

	child_template_elements.forEach( function( child_template_element ){
	  var   child_template = dynamic_app.define_templates( child_template_element );
	  child_template.parent = result;
	} );

	if (!is_body){
		result.absorb( template_element, only_content );
	}

	return result;
}


function AttributeParser( data_name ) {
  this.data_name = data_name;
  this.name = '';
  this.options = {};
  this.pattern = new RegExp('data-' + this.data_name + '-?(.*)?');
  this.validator = parse_options[ data_name ];

  return this;
}

AttributeParser.prototype.parse_attributes = function(attrs) {
  var self = this;
  var result = [];

  Object.keys(attrs).forEach(function(attr_id) {
	 var attr = attrs[attr_id];
	 var param;

	 if (self.pattern.test(attr.name)) {
		result.push( attr.name );
		var m = attr.name.match(self.pattern);
		param = m[1];
		if (typeof param === "undefined") {
		  varname = dynamic_utils.htmlID2CamelCase(attr.value);
		} else {
		  var option_list;
		  if (param === 'options'){
			 option_list = attr.value.split( ';' ).map( function( opt_part ){
				var opt_nv = opt_part.split( '=' );
				return( {name: opt_nv[0], value: opt_nv.length>1 ? opt_nv[1] : true } );
			 } );
		  } else {
			 option_list = [ {name: param, value: attr.value} ];
		  }
		  option_list.forEach( function( opt ){
			 var opt_name = opt.name;
			 var validator = self.validator[opt_name];
			 if (typeof validator === "undefined") {
				logger.warning("Unknown attribute ", opt_name, "on", self.element);
			 } else {
				var option_name = typeof validator.option_name !== "undefined" ? validator.option_name : opt_name.replace( '-','_' );
				var attrval = typeof validator.get === "function" ? validator.get( opt.value ) : opt.value;
				self.options[option_name] = attrval;
			 }
		  } );
		}
	 }
  });

  return result;
};

AttributeParser.prototype.parse = function( element ) {
  this.options = {};
  this.element = element;

  var class_names = dynamic_dom.get_classes( element );
  var ix = class_names.indexOf(this.data_name);

  if (ix + 1 < class_names.length) {
	 this.name = dynamic_utils.htmlID2CamelCase(class_names[ix + 1]);
  }
  if (ix + 2 < class_names.length) {
	 this.options.type = class_names[ix + 2];
  }
  this.parse_attributes(dynamic_dom.get_attributes(element)).forEach( function( attr_name ){
	 element.removeAttribute( attr_name );
  });

  // this.options.content = element.textContent.trim();
  dynamic_dom.remove_class( element, this.data_name );
  return this;
};


dynamic_app.get_children = function( element, css_selector ) {
	// only return top-level results

	var all_results = dynamic_dom.get_elements( element, css_selector );
	var excluded = [];

	for (var i = 0; i < all_results.length; i++) {
		excluded = excluded.concat( dynamic_app.get_children( all_results[i], css_selector ) );
	}

	return dynamic_utils.array_diff( all_results, excluded );
};


  function LiteralPart(text) {
    this.text = text;
  }

  LiteralPart.prototype.get_text = function() {
    return this.text;
  };

  function DynamicPart(value) {
    this.dynamic_value = value;
  }

  DynamicPart.prototype.get_text = function() {
    return this.dynamic_value.value;
  };

  function TextObserver(text_node) {
    this.text_node = text_node;
    this.original = text_node.textContent;
    this.parts = [];

    dynamic_app.vars.TextObservers.push(this);
  }

  TextObserver.prototype.set_text_content = function() {
    var result = '';
    this.parts.forEach(function(part) {
      result += part.get_text();
    });
    this.text_node.textContent = result;
  };

  TextObserver.prototype.add_literal = function(text) {
    this.parts.push(new LiteralPart(text));
  };

  TextObserver.prototype.add_dynamic = function(dynamic_value) {
    var self = this;

    this.parts.push(new DynamicPart(dynamic_value));

    dynamic_value.observe(function() {
      self.set_text_content();
    });

  };

