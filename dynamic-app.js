/* global console */

(function DynamicAppModule(CMSGeneric) {
  "use strict";

  var dynamic_app = {
    info: {
      Name: "Data driven app",
      Description: "Expose dynamic values and nodes",
      Version: "1.01.1"
    },
    vars: {
      Controls: [],
      Values: [],
      Templates: [],
      TextObservers: []
    }
  };

  if (typeof CMSGeneric === "undefined") {
    /*eslint no-console: 0*/
    console.error("cms-generic.js must be loaded before ", dynamic_app.Name, "can be loaded.");

    return;
  }

  var
    CMSDynamicScopes = CMSGeneric.require("DynamicScopes"),
    CMSDynamicValues = CMSGeneric.require("DynamicValues"),
    CMSDynamicTemplates = CMSGeneric.require("DynamicTemplates"),
    app = {};

  CMSGeneric.register(dynamic_app, function document_ready() {

    dynamic_app.global_scope = CMSDynamicScopes.Global;
    app.parse_scopes();
    app.set_bindings();
    app.initialise_values();

    // console.debug("App",dynamic_app,app);
    // console.debug("Test", CMSDynamicScopes.Global.Nav.Navnav.Nav11 );
    //  console.debug("Level before", CMSDynamicScopes.Global.Nav.Navnav.Level );
    CMSDynamicScopes.Global.Nav.Navnav.Level = 666;
    //  console.debug("Level after", CMSDynamicScopes.Global.Nav.Navnav.Level );
    //   console.debug("Level ref = var?", CMSDynamicScopes.get_by_reference("nav.navnav.level") === CMSDynamicScopes.Global.Nav.Navnav.get_value_by_name("Level") );
    //   console.debug("Level ref = sub?", CMSDynamicScopes.get_by_reference("nav.navnav.level") === CMSDynamicScopes.Global.Nav.get_by_reference("navnav.level") );
    //   console.debug("Level ref = glob?", CMSDynamicScopes.get_by_reference("nav.navnav.level") === CMSDynamicScopes.Global.Navi.get_by_reference("nav.navnav.level") );
    //   console.debug("Nav error?", CMSDynamicScopes.get_by_reference("nav-nav-nav.navnav.level") );
    //   console.debug("Nav error sub?", CMSDynamicScopes.get_by_reference("nav.navnav.nav-nav-nav") );
  });

  var
    value_options = {
      type: {},
      initial: {},
      url: {
        option_name: "data_url"
      },
      "depends-on": {},
      collection: {},
      observe: {
        option_name: "observing",
        get: function(p) {
          return p.split(",").map(function(name) {
            return CMSDynamicValues.get_declaration(CMSGeneric.htmlID2CamelCase(name.trim()));
          });
        }
      }
    },
    template_options = {
      for: {},
      'for-each': {},
      'on-empty': {},
      alternative: {},
      'only-content': {}
    }
    ;
  var
    attributelist_pattern = '([^=]+)=(\\S+)\\s*',
    comment_pattern = '^<dynamic-template\\s+((('+attributelist_pattern+'))+)\\s*>$', 
    attributelist_re = new RegExp( attributelist_pattern, 'g' ),
    comment_re = new RegExp( comment_pattern )
  ;

  function AttributeParser( data_name, validator ) {
    this.data_name = data_name;
    this.name = '';
    this.options = {};
    this.pattern = new RegExp('data-' + this.data_name + '-?(.*)?');
    this.validator = validator;

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
          varname = CMSGeneric.htmlID2CamelCase(attr.value);
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
              CMSGeneric.warning("Unknown attribute ", opt_name, "on", self.element);
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

  AttributeParser.prototype.parse = function(element) {
    this.options = {};
    this.element = element;

    var class_names = element.getClasses();
    var ix = class_names.indexOf(this.data_name);

    if (ix + 1 < class_names.length) {
      this.name = CMSGeneric.htmlID2CamelCase(class_names[ix + 1]);
    }
    if (ix + 2 < class_names.length) {
      this.options.type = class_names[ix + 2];
    }
    this.parse_attributes(element.getAttributes()).forEach( function( attr_name ){
      element.removeAttribute( attr_name );
    });

    this.options.content = element.getText().trim();
    element.removeClass( this.data_name );
    return this;
  };

  app.initialise_values = function() {
    dynamic_app.vars.Values.forEach(function(dynamic_value) {
      dynamic_value.initialise();
    });
  };

  app.recursive_types = [Node.ELEMENT_NODE, Node.DOCUMENT_NODE, Node.DOCUMENT_FRAGMENT_NODE];

  app.scan_nodes = function process_node(from_node, options, filter) {
    if (typeof options === "function") {
      filter = options;
      options = {};
    }

    if (!options.hasOwnProperty("node_type")) {
      options.node_type = false;
    }

    if (!options.hasOwnProperty("recursive")) {
      options.recursive = true;
    }

    var childrenList = from_node.content ? from_node.content.childNodes : from_node.childNodes;
    var children = Array.prototype.slice.call(childrenList);

    for (var nodes = children, i = 0; i < nodes.length; i++) {
      var node = nodes[i],
        node_type = node.nodeType;

      if (!options.node_type || node_type === options.node_type) {
        filter(node);
      }

      if (options.recursive && (app.recursive_types.indexOf(node_type) >= 0)) {
        app.scan_nodes(node, options, filter);
      }
    }
  };

  var bind_pattern = '{{([^}]+?)}}';
  var binding_finder = new RegExp(bind_pattern);
  var binding_replacer = new RegExp(bind_pattern, 'g');

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

  app.bind_textnodes = function(scope, domnode) {
    // first approach was to cut all text nodes into pieces
    // So <p>A {{B}} C {{D}} E</p> would result into 5 ones,
    // with two observers for B and D.
    // But then the blanks between them would get lost.
    app.scan_nodes(domnode, {
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
          var dynamic_value = scope.get_by_reference(value_name);
          if (dynamic_value !== null) {
            text_observer.add_dynamic(dynamic_value);
          } else {
            CMSGeneric.warning("Could not find value '" + value_name + '"', scope);
            text_observer.add_literal('!' + value_name + '!');
          }

          var right_part = node_text.substring(part_start + whole_part.length);
          node_text = right_part;
        }

        text_observer.add_literal(node_text);
        text_observer.set_text_content();
      }
    });
  };

  app.bind_inputs = function(scope, domnode) {
    if (typeof domnode.querySelectorAll === "function"){
      var node_list = domnode.querySelectorAll('input[data-bind');
      node_list = Array.prototype.slice.call(node_list);

      node_list.forEach(function(input_node) {
        var value_name = input_node.getAttribute('data-bind');
        var dynamic_value = scope.get_by_reference(value_name);
        input_node.dynamic_value = dynamic_value;
        input_node.value = dynamic_value.value;
        input_node.onchange = function() {
          this.dynamic_value.set_value(this.value);
        };
        dynamic_value.observe(function() {
          input_node.value = dynamic_value.value;
        });
      });
    }
  };


  app.set_bindings = function( scope, outer_element ){
    var options = {nodeType: Node.COMMENT_NODE};

    if (typeof outer_element === "undefined"){
      outer_element = CMSGeneric.Body;
    }

    if (typeof scope === "undefined"){
      scope = dynamic_app.global_scope;;
    }

    var element_list = [];
    if (Array.isArray(outer_element)){
      element_list = outer_element;
    } else {
      element_list.push( outer_element )
    }

    element_list.forEach( function( element ){


      var comment_nodes = element.filterNodes(options, function is_dynamic_placeholder( enhanced_node ){
        return comment_re.test( enhanced_node.getText() );
      });

      comment_nodes.forEach( function( comment_node ){
        var match = comment_node.getText().match( comment_re );
        var attribute_list = match[1];
        var attributes={}, do_test=true;
        
        while (do_test){
          var attr_match=attributelist_re.exec(attribute_list);
          if (attr_match){
            attributes[ attr_match[1].replace('-','_') ] = attr_match[2];
          } else {
            do_test = false;
          }
        }

        if (attributes.scope){
          scope = dynamic_app.global_scope.get_by_reference( attributes.scope );
        }

        var anchor_first = comment_node.insertTextBefore( "\n" ); 
        var anchor = comment_node.insertTextBefore( "\n" ); 
        var template_definition = scope.get_by_reference( attributes.name );
        var template_placeholder = CMSDynamicTemplates.create_placeholder( template_definition,anchor );
        // template_placeholder.first = comment_node.insertCommentBefore( 'Start '+ attributes.name );
        template_placeholder.first = anchor_first;

        var dynamic_value = scope.get_by_reference( attributes.dynamic_value );
        if (dynamic_value === null){
          CMSGeneric.warning( 'Can not find binding for '+comment_node.getText() );
        } else {
          dynamic_value.observe( function() {
            if ( dynamic_value.is_empty() ){
              template_placeholder.clear();
            } else {
              if (template_placeholder.is_empty()){
                var instance = template_placeholder.add_instance();
                app.set_bindings( scope, instance.get_nodes() );
              }
            }
          });
        }
        // comment_node.setText( attributes.name + ' end.' );
        comment_node.remove();

      });

      app.bind_textnodes( scope, element.domNode );
      app.bind_inputs( scope, element.domNode );
    });
  };

  app.define_template = function( scope, template_element ){
    var result;

    var parser = new AttributeParser('dynamic-template', template_options);
    parser.parse( template_element );
    var existing = scope.get_template_by_name( parser.name );

    var only_content = parser.options.hasOwnProperty('only_content') ? parser.options.only_content : false;
    delete parser.options.only_content;

    if (parser.options.for || parser.options.for_each){
      var dynamic_value_name = parser.options.for ? parser.options.for : parser.options.for_each;
      var multiple=(typeof parser.options.for_each !== "undefined");
      var scope_reference = scope.full_name;
      scope_reference = (scope_reference.length > 0 ? 'scope='+scope_reference+' ' :'');
      template_element.insertCommentBefore("<dynamic-template "+scope_reference+"name="+parser.name+" dynamic-value="+dynamic_value_name+" multiple="+multiple+">");
    }

    if (existing !== null){
      result = existing;
      result.merge_options( parser.options );
    } else {

      var new_template = CMSDynamicTemplates.define( parser.name, parser.options );
      dynamic_app.vars.Templates.push( new_template );

      var child_template_elements = app.get_childs(".dynamic-template", template_element );
      new_template.scope = scope;

      child_template_elements.forEach( function( child_template_element ){
        var   child_template = app.define_template( scope, child_template_element );
        child_template.parent = new_template;
      } );

      scope.register_template( new_template );

      result = new_template;

    }

    result.absorb( template_element, only_content );
    return result;
  }

  app.parse_scopes = function(scope, node) {
    var scope_index = 0;
    scope = scope || dynamic_app.global_scope;
    node = node || CMSGeneric.Body;

    var
      parser,
      child_scope_nodes = app.get_childs("div.dynamic-scope", node),
      child_template_elements = app.get_childs(".dynamic-template", node, child_scope_nodes ),
      child_value_nodes = app.get_childs(".dynamic-value", node, child_scope_nodes);


    child_template_elements.forEach(function(template_element) {
       app.define_template( scope, template_element );
    });

    parser = new AttributeParser('dynamic-value',value_options );

    child_value_nodes.forEach(function(value_node) {
      parser.parse( value_node );
      var new_value = CMSDynamicValues.define(parser.name, parser.options);
      // console.debug("Dynamic value", value_node, new_value, parser );
      dynamic_app.vars.Values.push(new_value);
      scope.register_value(new_value);
      new_value.scope = scope;
      value_node.remove();
    });

    child_scope_nodes.forEach(function(scope_node) {
      var class_names = scope_node.classNames();
      var other_classes = app.array_diff(class_names, ["dynamic-scope"]);
      var scope_name;
      if (other_classes.length > 0) {
        scope_name = other_classes[0];
      } else {
        scope_name = "scope_" + (++scope_index);
      }
      var child_scope = scope.find_or_create(CMSGeneric.htmlID2CamelCase(scope_name), scope_node);
      app.parse_scopes(child_scope, scope_node);
    });
  };

  app.array_diff = function(a, b) {
    return a.filter(function(i) {
      return b.indexOf(i) < 0;
    });
  };

  app.get_childs = function(selector, context, scopes) {
    var comb;
    if (typeof scopes === "undefined") {
      comb = function(node) {
        return node.getNodes(selector);
      };
    } else {
      comb = function(node) {
        var result = [];
        scopes.forEach(function(scope) {
          result = result.concat( scope.getNodes( selector ) );
        });
        return result.concat( node.getNodes( selector ) );
      };
    }
    // only return top-level results
    var all_results = context.getNodes(selector);
    var excluded = [];

    for (var i = 0; i < all_results.length; i++) {
      var included = all_results[i];
      var exclude = comb(included);
      excluded = excluded.concat( exclude );
    }

    return app.array_diff(all_results, excluded);
  };

})(window.cms$Generic);