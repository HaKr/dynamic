"use strict";

// sails.io and Promise are loaded


(function DynamicNodes(CMSGeneric){

  var exports = {
    info: {
      Name:       "Dynamic nodes",
      Description:  "Replace <dynamic-node> tags with their content from a corresponding <template>.",
      Version:    "2.01.1" /*
*
* Version 1 was template based, version 2 introduced the cms-template syntax 
*      
      */
    },
    definitions:  {}
    
  }, module = {
    Templates:  {},
    Instances:  {},
    Nesting:    [],
    Context:    {} 
  };

  if (typeof CMSGeneric === "undefined"){
    // eslint-disable-next-line
    console.error('cms-generic.js must be loaded first, before ',module.Name, 'can be loaded.' );

    return;
  }

  exports.setContext = function( context ){
    module.Context = context;
  };

  CMSGeneric.register(exports,function module_init() {

    CMSGeneric.setLogLevel( CMSGeneric.log_levels.INFO );

    module.loadTemplates();

    exports.construct = DynamicNodeInstance.prototype.construct;
    
    DynamicNodeInstance.prototype.loadDefinitions.call(exports);

    exports.templates = module.Templates;

  });

  var
    for_each_pattern = {pattern: /(for(-each)?)\s*=\s*(\S+)/i, left: "for",  right: "selector",              rightrhs: function(rhvalue) {return htmlID2CamelCase(rhvalue[3])} };

  module.addTemplate = function (template ){
    module.Templates[template.name] = template;
  };

  module.getTemplate = function( template_name ){
    return module.Templates[CMSGeneric.htmlID2CamelCase( template_name )];
  };

  module.transformCMSTemplates = function( node, parent_template ){
    if (typeof parent_template === "undefined"){
      parent_template = null;
    }

    var template_nodes = node.getNodes("*[data-dynamic-template]");
    var node_definition = node.getAttribute("data-dynamic-template");
    var node_template_name = "";

    if (node_definition !== null){
      node_template_name = CMSGeneric.htmlID2CamelCase( node_definition.split(";")[0] );
    }
        
    template_nodes.forEach( function( template_node ){

      var parent = template_node.getParent();

      if (typeof parent !== "undefined" && parent.domNode.nodeType !== document.DOCUMENT_FRAGMENT_NODE ){
  
        var template_definition = template_node.getAttribute("data-dynamic-template").split(";");
  
        module.transformCMSTemplates( template_node, node );

        template_node.removeAttribute("data-dynamic-template");
        var comment_text = "dynamic-node "+template_definition[0]+" "+template_definition.slice(1).join(" ");
        var definition_node = document.createComment( comment_text );

        var fromInner = template_node.domNode.nodeName === "DIVx" && parent.domNode.nodeName !== "BODY";

        var new_template = module.getTemplate( template_definition[0] );

        if (typeof new_template === "undefined"){
          new_template = new DynamicTemplate( template_node, template_definition[0] );
          new_template.parent_name = node_template_name;
          new_template.node_definition = comment_text;
          if (template_definition.length>1){
            var for_each = template_definition[1];

            if (for_each_pattern.pattern.test(for_each)){
              var match = for_each.match(for_each_pattern.pattern);
              if (for_each_pattern.right){
                new_template[for_each_pattern.right] = for_each_pattern.rightrhs(match);
              }
            }
          }

          this.addTemplate( new_template );

          parent.replaceChild( definition_node, template_node  );

          new_template.definition_node = definition_node;
        } else {
          // could it be possible that the template node remains visible instead of being removed by the setup() below?
          new_template.node = template_node;
        }

        new_template.setup(fromInner); 

      }
    }, this);

    node.getNodes("*[data-dynamic-template-ref]").forEach( function(ref_node){
      var template_definition = ref_node.getAttribute("data-dynamic-template-ref");
      var template_ref = {node: ref_node, parent_name: node_template_name, ref: template_definition };
      module.TemplateRefs.push( template_ref );
    });

  }; 

  module.loadTemplates = function dynamic_template_find_templates(){
    module.TemplateRefs = [];
    module.transformCMSTemplates( CMSGeneric.Body );

    module.TemplateRefs.forEach( function(template_ref){
      var ref_node = template_ref.node;
      var template = module.getTemplate( template_ref.ref );
      if (typeof template === "undefined"){
        CMSGeneric.error("Unknown template reference '"+template_ref.ref+"'", ref_node );
      } else {
        var parent = ref_node.getParent();
        var definition_node = document.createComment( template.node_definition );
        parent.replaceChild( definition_node, ref_node  );
        template.parent_name = template_ref.parent_name;
        // template.definition_node.remove();
        if (typeof template.definition_node.parentNode !== "undefined"){
          template.definition_node.parentNode.removeChild( template.definition_node );
        }
        delete template.parent_ref;
        delete template.definition_node;
      }
    });

    forEach( module.Templates, function(template){
      if (template.parent_name.length>0){
        var parent_template = module.getTemplate( template.parent_name );
        if (typeof parent_template !== "undefined"){
          parent_template.addChild( template );
        }
      }
      delete template.parent_name;
    });    
    
    CMSGeneric.getNodes("template").forEach(function(enhanced_node){
      var new_template = new DynamicTemplate(enhanced_node);
      this.addTemplate( new_template );
      new_template.setup();

    });
  };

  DynamicTemplate.prototype.setup = function dynamic_template_setup( fromInner ){

    if (typeof fromInner === "undefined"){
      fromInner = this.node.domNode.content && this.node.domNode.content.nodeType === document.DOCUMENT_FRAGMENT_NODE;
    }

    if (this.template === null){
      this.template = CMSGeneric.createDocumentFragment();
    }
    
    if (fromInner) {
      var rootNode = this.node.domNode.content && this.node.domNode.content.nodeType === document.DOCUMENT_FRAGMENT_NODE ? this.node.domNode.content : this.node.domNode;
      var children = Array.prototype.slice.call( rootNode.childNodes );

      for (var ci=0; ci<children.length; ci++ ){
        var childNode = children[ci];
        this.template.domNode.appendChild( childNode );
      }
    } else {
      this.template.addChild(this.node);
    }
  };

  DynamicTemplate.prototype.on_new_instance = function dynamic_template_on_new_instance( callback ){
    if (this.on_new_instance !== null){
      CMSGeneric.error( "New instance callback has already been assigned.", this );
    } else {
      if (typeof callback !== "function" ){
        CMSGeneric.error( "New instance callback must be a function" );
      } else {
        this.on_new_instance = callback;
      }
    }
  };

  DynamicTemplate.prototype.addChild = function( child_template ){
    child_template.parent = this;
    this.children.push( child_template );
  };

  DynamicTemplate.prototype.addChildren = function (  child_templates ){
    child_templates.forEach(function( child_template ){
      this.addChild( child_template );
    });
  };

  DynamicTemplate.prototype.getDescendants = function (){
    var result=[];
    this.children.forEach(function(child_template){
      result.push( child_template );
      result = result.concat( child_template.getDescendants() );
    });
    return result;
  };

  DynamicTemplate.prototype.getSelectors = function (){
    var result = [];
    if (this.selector !== null && this.selector.length>0){
      result.push( this.selector );
    }
    result = result.concat(this.getDescendants().map(function(child_template){
      return child_template.selector;
    })).filter(function(item, i, ar){ return item !==null && item.length>0 && ar.indexOf(item) === i; });

    return result;
  }

  DynamicNodeDefinition.prototype.setup = function dynamic_node_setup(){
    this.template.selector = this.selector;
    this.parent_node = this.placeholders.first.getParent();
    this.placeholders.last = this.placeholders.first.getClone();
    
    this.placeholders.first.setText("START "+ this.template.name );
    this.placeholders.last.setText( this.template.name + " END");
    // this.placeholders.last.insertAfter(this.placeholders.first);
    this.placeholders.first.getParent().domNode.insertBefore( this.placeholders.last.domNode, this.placeholders.first.domNode.nextSibling );
  };


  DynamicNodeDefinition.prototype.clear = function dynamic_node_clear(){

    for (var dn=this.placeholders.first.domNode.nextSibling; dn !== this.placeholders.last.domNode;  ){
      var orphan=dn;
      dn = dn.nextSibling;
      this.placeholders.first.getParent().domNode.removeChild(orphan);
    }

    clearArray(this.instances);
  };

  DynamicNodeDefinition.prototype.prepare_construct = function(){
    if (this.overlay === null){
      var container = this.getFirstNode();
      if (container !== null){
        this.overlay = container.createNode("div", {class: "modalbox"});
      }
    }
  };

  DynamicNodeDefinition.prototype.prepare_cleanup = function(){
    if (this.overlay !== null){
      this.overlay.remove();
      this.overlay = null;
    }
  };


  DynamicNodeDefinition.prototype.add = function dynamic_node_build( model, parent, anchor ){
    var new_instance = new DynamicNodeInstance(this);
    new_instance.setup( anchor );
    new_instance.index = this.instances.length; 
    this.instances.push(new_instance);

    if (typeof model !== "undefined" && model !== null) {
      new_instance.setModel( model );
      module.Context[ this.item_selector] = model;
      if (typeof parent !== "undefined"){
        parent.addChild( new_instance, true );
      }
      new_instance.construct();
      delete module.Context[ this.item_selector ];
    }

    return new_instance;
  };

  DynamicNodeDefinition.prototype.removeInstance = function ( instance ){
    var instance_index = this.instances.indexOf( instance );
    if (instance_index >= 0){
      this.instances.splice( instance_index,1 );
      forEach(this.instances, instance_index, function( dynamic_instance, ix ){
        dynamic_instance.index = ix;
        dynamic_instance.rebind();
      });
    } else {
      CMSGeneric.error( instance, "is no instance of ", this );
    }
  };

  DynamicNodeDefinition.prototype.getTemplate = function (){
    var result;

    if (this.nocontext){
      result = this.template_alternative;
    } else {
      if (this.empty){
        result = this.template_if_empty;
      } else {
        result = this.template;
      }
    }

    return result;
  }

  DynamicNodeDefinition.prototype.construct_always = function dynamic_node_list_construct_always(){
    return  this.add().construct();
  };

  DynamicNodeDefinition.prototype.construct_for = function dynamic_node_list_construct_for(){
    var 
      selected = select_from_data( this.selector ),
      do_construct = false ;

    if (selected.todo.length>0){
      selected = selected.list[selected.todo];
    } else {
      selected = selected.list;
    }
    this.nocontext = typeof selected === "undefined";
    this.empty =  this.nocontext || (typeof selected.length === "number" && selected.length < 1) || (typeof selected === "object" && Object.keys(selected).length < 1) || (typeof selected === "boolean" && !selected);

    do_construct = this.template_if_empty  || (this.nocontext && this.template_alternative) || (!this.nocontext && !this.empty);


    if (do_construct) {
      var dynamic_instance = this.add();
      dynamic_instance.setModel( selected );
      dynamic_instance.construct();    
    }
    
  };

  DynamicNodeDefinition.prototype.construct_for_each = function dynamic_node_list_construct_for_each(){
    var selected = select_from_data( this.selector );

    var selector  = selected.item_name;
    var item_name = selector.substring(0, selector.length-1);
    var the_list;
    var self = this;
    var nesting_index = module.Nesting.length;
    var nesting = {designation: "", index: -1, dynamic_instance: null, relate_to: null };
    var nesting_parent = nesting_index>0 ? module.Nesting[nesting_index-1] : null;
    module.Nesting.push(nesting);
    this.item_selector = item_name;

    if (selected.todo.length > 0){
      var old_selector = this.selector;
      this.selector = item_name + "." + selected.todo;
      while (selected.todo.length>0){
        the_list = selected.list;
        if (typeof the_list === "undefined"){
          CMSGeneric.error("Unknown node selector", this.selector, self, module.Context );
          break;
        } else {

          forEach( selected.list, function(item){
            var child_nesting_index = module.Nesting.length;
            var child_instance = item;
            var child_nesting = {designation: "", index: -1, dynamic_instance: child_instance.DynamicNode, relate_to: child_instance.DynamicNode };
            module.Nesting.push( child_nesting );

            module.Context[item_name] = child_instance;
            self.construct_for_each();
            clearArray( module.Nesting, child_nesting_index );

          });
          delete module.Context[item_name];
        }
        selected = select_from_data( selected.todo );
      }
      this.selector = old_selector;
    } else {
      if (typeof selected.list === "undefined"){
        CMSGeneric.error("Unknown node selector", this.selector, selected, self, module.Context );
      } else {

        forEach( selected.list, function(item){
          nesting.index++;

          module.Context[item_name] = item;
          var dynamic_instance = self.add();

          if (nesting_parent !== null ){
            if (typeof nesting_parent.relate_to !== "undefined" && nesting_parent.relate_to !== null){
              nesting_parent.relate_to.addChild( dynamic_instance );
            } else {
              if (typeof nesting_parent.dynamic_instance !== "undefined" && nesting_parent.dynamic_instance !== null){
                nesting_parent.dynamic_instance.addChild( dynamic_instance, true );
              }
            }
          }
          nesting.dynamic_instance = dynamic_instance;
          dynamic_instance.setModel( item );
          // reset the index for if we are nesting
          dynamic_instance.index = nesting.index;
          dynamic_instance.construct();
        });
      }
      delete module.Context[item_name];
    }
    clearArray( module.Nesting, nesting_index );
 
  };

  DynamicNodeDefinition.prototype.construct = function dynamic_node_list_construct(){
    var workers = {
      "":       this.construct_always,
      "for":      this.construct_for,
      "for-each":   this.construct_for_each
    };
    
    CMSGeneric.debug( "Construct", this );

    this.clear();
    
    var worker = workers[this.for];
    if (typeof worker === "function"){
      worker.call( this );
    } else {
      CMSGeneric.error('Unknown "for" value ',this.for, "for node ", this );
    }

    var container = this.getFirstNode();
    if (container !== null){
      container.addClass("dynamic");
    }

    if (typeof this.parent_node.on_constructed === "function"){
      this.parent_node.on_constructed.call();
    }

    return this;
  };
  
  DynamicNodeDefinition.prototype.getFirstNode = function(){
    var result=null;

    if (this.instances.length>0){
      if (this.instances[0].nodes.length > 0){
        result = this.instances[0].nodes[0];
      }
    }

    return result;
  };


  var pattern = /^\s*dynamic-node\s+(\S+)/i;

  var parameters = [
    for_each_pattern,
    {pattern: /(node-label)\s*=\s*(\S+)/i,                right: "node_label",            rightrhs: function(rhvalue) {return rhvalue[2] } },
    {pattern: /(empty)\s*=\s*(\S+)/i,                     right: "template_if_empty",     rightrhs: function(rhvalue) {return module.Templates[CMSGeneric.htmlID2CamelCase(rhvalue[2])] } },
    {pattern: /(alternative)\s*=\s*(\S+)/i,               right: "template_alternative",  rightrhs: function(rhvalue) {return module.Templates[CMSGeneric.htmlID2CamelCase(rhvalue[2])] } }
  ];

  DynamicNodeInstance.prototype.loadDefinitions = function dynamic_node_load_definitions(from_node) {

    var options = {nodeType: Node.COMMENT_NODE};

    if (typeof from_node === "undefined"){
      from_node = CMSGeneric.Body;
      // options.recursive = false;
    }

    var comment_nodes = from_node.filterNodes(options, function is_dynamicnode(enhanced_node){
      return pattern.test(enhanced_node.getText());
    });

    DynamicNodeInstance.prototype.loadDefinitionsFromComments.call(this, comment_nodes);
  };

  module.DynamicNodeName = function( name, instance ){
    var definition = instance.definitions[name];
    
    Object.defineProperty( instance, name, {
      get: function() {
          return definition.for === "for-each" || definition.instances.length<1 ? definition.instances : definition.instances[0]
      }
    });
  };

  DynamicNodeInstance.prototype.loadDefinitionsFromComments = function (comment_nodes) {
    var result = {};

        for (var cni=0; cni<comment_nodes.length; cni++){
          var comment_node = comment_nodes[cni];
          var node_text = comment_node.getText();
          var match = node_text.match(pattern);

          var node_name = CMSGeneric.htmlID2CamelCase(match[1]);

          if (!module.Templates[node_name]){
            CMSGeneric.error('Template "'+node_name+'" not found for',this);
          } else {

            var dynamic_node_definition = new DynamicNodeDefinition(node_name, comment_node, this );

            node_text = node_text.replace(pattern, "").trim();

            for (var pi=0; pi<parameters.length;pi++){
              var parameter = parameters[pi];
              if (parameter.pattern.test(node_text)){
                match = node_text.match(parameter.pattern);
                if (parameter.left){
                  dynamic_node_definition[parameter.left] = match[1];
                }
                if (parameter.right){
                  dynamic_node_definition[parameter.right] = parameter.rightrhs(match);
                }

                node_text = node_text.replace(parameter.pattern, "").trim();
              } else {
                if (parameter.left){
                  dynamic_node_definition[parameter.left] = "";
                }
                if (parameter.right){
                  dynamic_node_definition[parameter.right] = null;
                }

              }
            }

            if (node_text.length >0){
              CMSGeneric.warning('Unknown parameter(s) "'+node_text+'" for '+node_name);
            }
            
            result[node_name] = dynamic_node_definition;
            this.definitions[node_name] = dynamic_node_definition;
            new module.DynamicNodeName( node_name, this );

            dynamic_node_definition.setup();       
          }
        }
        return result;
    };


  DynamicNodeInstance.prototype.getFullName = function() {
    var result = this.getLocalName();
    if (this.parent !== null ){
      result = this.parent.getFullName()+"["+this.definition.node_label.toLowerCase()+"]"+"["+this.index+"]" ;
    }
    return result;
  };

  DynamicNodeInstance.prototype.getLocalName = function() {
    var name = this.definition.node_label.toLowerCase();

    var result = name+"["+this.index+"]"
    return result;
  };

  var bind_pattern    = /{{[^}]+?}}/;
  var binding_finder  = /{{([^}]+?)}}/g;

  DynamicNodeInstance.prototype.setProperties = function dynamic_node_instance_set_properties(){
    Object.defineProperty( this, "name", {
      get: this.getFullName
    });
  };

  DynamicNodeInstance.prototype.setup = function dynamic_node_instance_setup( anchor ){
    if (typeof anchor == "undefined"){
      anchor = null;
    }
    if (anchor === null){
      anchor = this.definition.placeholders.last.domNode;
    } else {
      if (typeof anchor.domNode === "object"){
        anchor = anchor.domNode.nextSibling;
      } else {
        anchor = anchor.nextSibling
      }
    }
    var self = this;
    var comment_nodes = [];
    this.setProperties();

    var template = this.definition.getTemplate();

    forEach( template.related, function addRelatedDefinition( related_definition ){
      self.addRelatedDefinition( related_definition );
    });

    if( typeof template !== "undefined"){
      this.boundNodes = {AttributeNodes:[], TextNodes: []};


      for (var ti=0; ti<template.template.domNode.childNodes.length; ti++){
        var child_node = CMSGeneric.DOMEnhancedNode( template.template.domNode.childNodes[ti] );
        var new_node = child_node.getClone();
        new_node.DynamicNodeInstance = self;
        // new_node.insertBefore( self.definition.placeholders.last );
          self.definition.placeholders.last.getParent().domNode.insertBefore( new_node.domNode, anchor );

        self.nodes.push(new_node);
          
        if (new_node.domNode.nodeType === Node.COMMENT_NODE){
          if (pattern.test(new_node.getText())) {
            comment_nodes.push(new_node);
          } 

        } else {
          var textNodes = self.boundNodes.TextNodes;
          new_node.filterNodes({nodeType: Node.TEXT_NODE}, function(enhanced_node){
            var node_text = enhanced_node.getText();
            if (bind_pattern.test( node_text )){
              textNodes.push({node: enhanced_node, template: node_text });
              var replaced = node_text.replace( binding_finder, "" );
              enhanced_node.setText( replaced, {html: false} );
              
              return false; 
            }
          });

          var attributeNodes = self.boundNodes.AttributeNodes;
          var attrfn = function(enhanced_node) {
            var attributes = enhanced_node.domNode.attributes;
            var bound_attributes = [];

            if (typeof attributes === "undefined" || attributes === null){
              return
            }

            for (var ai=attributes.length-1; ai >= 0; ai--){
              var attribute = attributes[ai];
              if (bind_pattern.test(attribute.value)){
                bound_attributes.push({name:attribute.name, template:attribute.value});
              }
            }

            if (bound_attributes.length>0){
              attributeNodes.push({node: enhanced_node, attributes: bound_attributes});
            }
          }

          attrfn( new_node );
          new_node.filterNodes({nodeType: Node.ELEMENT_NODE}, function(enhanced_node){
            attrfn( enhanced_node);

            return false;

          });

          self.loadDefinitions( new_node );
        }
      }

      DynamicNodeInstance.prototype.loadDefinitionsFromComments.call(this, comment_nodes);
    }
  };

  DynamicNodeInstance.prototype.constructRelated = function( model, target_index ) {
    if (typeof target_index !== undefined ){
      target_index = -1;
    }
    var self = this;

    module.Context[this.definition.item_selector] = this.model;

    forEach(this.related, function( related_item ){
      if (target_index<0){
        target_index = related_item.instances.length;
      }
      var anchor = target_index>0 ? related_item.instances[target_index-1].nodes[related_item.instances[target_index-1].nodes.length-1]  : null;
      var new_instance = related_item.definition.add( model,self,anchor );
      related_item.instances.splice( target_index, 0, new_instance );
    });

    delete module.Context[this.definition.item_selector];
  };

  DynamicNodeInstance.prototype.reconstruct = function() {
    var saved_last = this.definition.placeholders.last;
    var placeholder = CMSGeneric.DOMEnhancedNode( document.createComment( "reconstruct" ) );
    this.nodes[0].replace( placeholder );
    this.definition.placeholders.last = placeholder;

    this.remove( true );
    module.Context[this.definition.item_selector] = this.model;
    this.setup();
    this.construct();
    this.definition.placeholders.last = saved_last;
    this.definition.instances.splice( this.index, 0, this );
    placeholder.remove();

    delete module.Context[this.definition.item_selector];
  };

  DynamicNodeInstance.prototype.removeRelated = function dynamic_node_instance_remove_related( index ){

    module.Context[this.definition.item_selector] = this.model;

    forEach(this.related, function( related_item ){
      if (typeof index === "undefined"){

        forEach( related_item.instances, function( related_instance ){
          related_instance.removeNodes();
        });
        clearArray( related_item.instances );
      } else {
        if ( index < related_item.instances.length ){
            related_item.instances[index].removeNodes();
        }
        related_item.instances.splice(index,1);
      }
    });

    delete module.Context[this.definition.item_selector];
  };

  DynamicNodeInstance.prototype.removeNodes = function dynamic_node_instance_remove(saveRelated){
    if (typeof saveRelated === "undefined"){
      saveRelated = false;
    }

    if (!saveRelated){
      this.removeRelated();
    }
    forEach(this.nodes, function(node){
      node.remove();
    });
    clearArray(this.nodes);

    this.definition.removeInstance( this );

  };

  DynamicNodeInstance.prototype.remove = function dynamic_node_instance_remove(saveRelated){

    var definition_name = this.definition.template.name;
    var index = this.parent !== null && this.parent.related.hasOwnProperty(definition_name) ? this.parent.related[definition_name].instances.indexOf( this ) : -1;

    if (index >= 0){
      this.parent.removeRelated( index );
      this.parent.reconstruct();
    } else {
      this.removeNodes(saveRelated);
    }
    
  };

  DynamicNodeInstance.prototype.getNodes = function dynamic_node_instance_get_nodes( selector ){
    var result = [];

    forEach( this.nodes, function(node){
      result = result.concat( node.getNodes(selector) );  
    });

    forEach( this.related, function( related ){
      forEach( related.instances, function( related_instance){
        result = result.concat( related_instance.getNodes( selector ) );
      });
    });
    return result;
  };

  DynamicNodeInstance.prototype.getNode = function dynamic_node_instance_get_first_node( selector ){
    var result = this.getNodes( selector );

    return result.length > 0 ? result[0] : null;
  };


  DynamicNodeInstance.prototype.construct = function dynamic_node_list_construct(){

    if (this.setBindings){
      CMSGeneric.debug("Set bindings", this);

      this.setBindings();
    }

    for (var template_name in this.definitions){
      this.definitions[template_name].construct();
    }

    if (typeof this.definition.template.on_new_instance === "function"){
      this.definition.template.on_new_instance( this );
    }

    return this;
  };

  DynamicNodeInstance.prototype.setBindings = function dynamic_template_set_bindings(){
    var converter = function (matched_part,variable){
        var vn = variable.split(".");
        var varname = CMSGeneric.htmlID2CamelCase( vn[0] );
        var propname = vn.length > 1 ? vn[1] : null;
        var result = matched_part;
        var context = module.Context;

        if (context[varname]){
          if (propname === null || typeof context[varname][propname] !== "undefined"){
            result = propname === null ? context[varname] : (context[varname][propname] === null ? "" : context[varname][propname]);
          } else {
            result = varname + ".!"+propname+"!"
          }
        } else {
          result = "!!"+variable+"!!";
        }

        // CMSGeneric.debug(variable,'-->', result);

        return result;

      };

    for (var tni=this.boundNodes.TextNodes.length-1; tni>=0; tni--){
      var text_node = this.boundNodes.TextNodes[tni];
      var replaced = text_node.template.replace(binding_finder, converter);
      text_node.node.setText( replaced, {html: false} );
    }

    for (var ani=this.boundNodes.AttributeNodes.length-1; ani>=0; ani--){
      var attribute_node = this.boundNodes.AttributeNodes[ani];

      for (var ai=attribute_node.attributes.length-1; ai>=0; ai--){
        var bound_attribute = attribute_node.attributes[ai];
        var myreplaced = bound_attribute.template.replace(binding_finder, converter);
        attribute_node.node.setAttribute( bound_attribute.name, myreplaced );
      }
    }

  }

  DynamicNodeInstance.prototype.examine = function(indent_level){
    if (typeof indent_level === "undefined"){
      indent_level = 0;
    }
    var indent = ""; for (var c=0; c<indent_level; indent += "  ",c++);

    CMSGeneric.debug( indent+"DynamicNodeInstance", this );
    for (var sd in this.definitions){
      this.definitions[sd].examine(indent_level+1);
    }
    CMSGeneric.debug(indent+"===========");
  }

  DynamicNodeInstance.prototype.addRelatedDefinition = function( definition ){
    var identifier = CMSGeneric.htmlID2CamelCase( definition.template.name );
    var result;

    if (!this.related.hasOwnProperty( identifier )) {
      this.related[identifier] = {definition: null, instances: []};
    } 
    this.definition.template.related[identifier] = definition;

    result = this.related[identifier];
    result.definition = definition;

    return result;
  };

  DynamicNodeInstance.prototype.addRelate = function( dynamic_instance ){
    dynamic_instance.parent = this;
    this.addRelatedDefinition( dynamic_instance.definition ).instances.push( dynamic_instance );
  };

  DynamicNodeInstance.prototype.setParent = function dynamic_node_instance_set_parent( parent_instance ){
    if (typeof parent_instance !== "undefined" && parent_instance !== null){
      parent_instance.addChild( this );
    } else {
      this.parent = null;
    }
  };

  DynamicNodeInstance.prototype.addChild = function dynamic_node_instance_add_child( child_instance, auto_constructed ){
    if (typeof auto_constructed === "undefined"){
      auto_constructed = false;
    }
    child_instance.parent = this;
    if (!auto_constructed){
      this.addRelate( child_instance );
    }
  };

  DynamicNodeInstance.prototype.addAs = function( template, model ){
    var result = this;
    var definition_name = template.name;

    if (!this.related.hasOwnProperty( definition_name) && !this.definitions.hasOwnProperty( definition_name)){
      CMSGeneric.error( "Definition '"+definition_name+"' is not known to", this );
    } else {
      if (this.related.hasOwnProperty( definition_name) ){
        this.reconstruct();
        this.constructRelated(model);  
        result = this.related[definition_name].instances[this.related[definition_name].instances.length-1];
      } else {
        result = this.definitions[definition_name].add( model, this );
      }
    }

    return result;
  };

  DynamicNodeInstance.prototype.setModel = function dynamic_node_list_set_model( instance_model ){
    this.model = instance_model;
    if (typeof this.model === "object"){
      this.model.DynamicNode = this;
      if (!this.model.hasOwnProperty( "dynamic_node_name" ) ){
        Object.defineProperty( this.model, "dynamic_node_name", {
          get: function(){
            return this.DynamicNode.name;
          }
        });
      }
    }
  };

  DynamicNodeInstance.prototype.rebind = function (){
    module.Context[this.definition.item_selector] = this.model;
    this.setBindings();
    forEach( this.definitions, function( dynamic_definition){
      forEach( dynamic_definition.instances, function( dynamic_instance ){
        dynamic_instance.rebind();
      });
    });
    forEach( this.related, function( dynamic_definition ){
      forEach( dynamic_definition.instances, function( dynamic_instance ){
        dynamic_instance.rebind();
      });
    });
    delete module.Context[this.definition.item_selector];
  };



  DynamicNodeDefinition.prototype.examine = function(indent_level){
    if (typeof indent_level === "undefined"){
      indent_level = 0;
    }
    var indent = ""; for (var c=0; c<indent_level; indent += "  ",c++);

    CMSGeneric.debug( indent+"DynamicNodeDefinition", this );
    for (var i=0; i<this.instances.length; i++){
      this.instances[i].examine(indent_level+1);
    }
    CMSGeneric.debug(indent+"-----------");
  }

  function DynamicTemplate( enhanced_node, name ) {
    if (typeof name === "undefined"){
      name = enhanced_node.getInternalId(); 
    } else {
      name = CMSGeneric.htmlID2CamelCase( name );
    }

    this.boundNodes       = {AttributeNodes:[], TextNodes: []};
    this.template         = null;
    this.node             = enhanced_node;
    this.on_new_instance  = null;
    this.name             = name;
    this.related          = {};
    this.parent           = null;
    this.children         = [];
    this.selector         = "";
  }

  function DynamicNodeDefinition( name, placeholder, parent_instance ){
    this.template           = module.Templates[name];
    this.parent_instance    = parent_instance;

    this.placeholders       = {first: placeholder, last: null};
    this.for                = "";
    this.selector           = null;
    this.template_if_empty  = null;
    this.instances          = [];
    this.node_name          = null;
    this.overlay            = null;

    Object.defineProperty( this, "node_label", {
      get: function() {
        var result;

        if (this.node_name === null){
          result = this.template.name;
        } else {
          result = this.node_name;
        }

        return result;
      },
      set: function (label) {
        this.node_name = label;
      }
    })
  }

  function DynamicNodeInstance(defined_by){
    this.definition       = defined_by;
    this.nodes            = [];
    this.definitions      = {};
    this.related           = {};
    this.parent           = null;
    this.index            = -1;
  }

  function htmlID2CamelCase( selector ){
    var result=[];

    var parts = selector.split(".");

    for (var pi = 0; pi<parts.length; pi++){
      var part = parts[pi];
      result.push( CMSGeneric.htmlID2CamelCase(part) );
    }
    return result.join(".");
  }


  function select_from_data( selector ){
    var result = {selected: "", list: module.Context, todo: selector };
    var selected=[];

    var selectors = selector.split(".");
    for (var si=0; si<selectors.length; si++){
      var nm = selectors[si];
      result.todo = selectors.slice(si+1).join(".");
      result.item_name = nm;

      if (result.list.hasOwnProperty(nm)){
        result.list = result.list[nm];
      } else {
        nm = CMSGeneric.CamelCase2HtmlID(nm);
        result.list = result.list[nm];
      }

      if (typeof result.list === "undefined"){
        module.Context.Error = 'Unknown selector "'+nm+'" for "'+selected.join(".")+'"';
        return result;
      } else {
        selected.push(nm);
        if ((typeof result.list.length === "number" && typeof result.list !== "string") || (result.todo.length<1 && typeof result.list === "object")){
          break;
        }
      }
    }

    result.selected=selected.join(".");

    return result;
  }

  function clearArray(arr, keep_size){
    if (typeof keep_size === "undefined"){
      keep_size = 0;
    }
    while (arr.length>keep_size){
      arr.pop();
    }
  }

  function forEach( the_list, start_index, action ){
    if (typeof start_index !== "number"){
      action = start_index;
      start_index = 0;
    }
    if (typeof the_list.length === "number"){
      for (var i=start_index; i<the_list.length; i++){
        action.call(this, the_list[i], i);
      }
    } else {
      for (var key in the_list){
        action.call(this,the_list[key], key);
      }
    }
  }

  return module;
})(window.cms$Generic);