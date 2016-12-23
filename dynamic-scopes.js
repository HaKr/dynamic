/* global  document */

(function(CMSGeneric) {
	"use strict";

	var dynamic_scopes = {
		info: {
			Name: "Dynamic scopes",
			Description: "Declare named scopes that contain scopes, values and templates.",
			Version: "1.01.1"
		},
		internal: {
			Scopes: {}
		}
	};
	var internal = dynamic_scopes.internal;

	dynamic_scopes.get_by_reference = function( ref, deep ){
		return dynamic_scopes.Global.get_by_reference( ref,deep );
	};

	CMSGeneric.register(dynamic_scopes, function() {});

	internal.Scope = function(name, node, parent) {
		this.name = name;
		this.nodes = node ? [node] : [document.body];
		this.parent = null;
		this.templates = {};
		this.values = {};
		this.scopes = {};
		var self = this;

		Object.defineProperty( this, 'full_name', {
			get: function(){
				return self.get_full_name();
			}
		});

		this.setParent(parent);
	};

	internal.Scope.prototype.setParent = function(parent) {
		parent = parent || null;
		if (this.parent !== parent) {
			this.parent = parent;

			if (this.parent !== null) {
				this.parent.add_child(this);
			}
		}
	};

	internal.Scope.prototype.get_full_name=function(){
		var result = '';

		if (this.parent !== null){
			if (this.parent !== dynamic_scopes.Global){
				result = this.parent.get_full_name();
			}
			result += (result.length > 0 ? '.' : '') + this.name;
		}

		return result;
	};

	dynamic_scopes.internal.Scope.prototype.add_node = function(node) {
		this.nodes.push(node);
	};

	dynamic_scopes.internal.Scope.prototype.add_child = function(scope) {
		scope.parent = this;
		this.scopes[scope.name] = scope;
		this.add_property(scope.name, dynamic_scopes.internal.Scope.prototype.get_scope);
	};

	dynamic_scopes.internal.Scope.prototype.add_property = function(name, getter, setter) {
		var prop_name = name;
		if (this.hasOwnProperty(prop_name)) {
			CMSGeneric.error(name + " was already defined", this );
		} else {
			var properties={};
			
			if (typeof getter === "function"){
				properties.get = function(){
					return getter.call( this, prop_name );
				};
			}
			if (typeof setter === "function"){
				properties.set = function(new_value){
					setter.call( this, prop_name, new_value );
				};
			}
			Object.defineProperty(this, prop_name, properties );
		}
	};

	dynamic_scopes.internal.Scope.prototype.create_scope = function(name, node) {
		var result = new dynamic_scopes.internal.Scope(name, node, this);
		return result;
	};

	dynamic_scopes.internal.Scope.prototype.get_scope = function(name) {
		var result = null;
		if (this.scopes.hasOwnProperty(name)) {
			result = this.scopes[name];
		} else {
			result = this === dynamic_scopes.Global ? null : dynamic_scopes.Global.get_scope(name);
		}

		return result;
	};

	dynamic_scopes.internal.Scope.prototype.get_values_value = function(name) {
		var result = null;
		if (this.values.hasOwnProperty(name)) {
			result = this.values[name].value;
		}

		return result;
	};

	dynamic_scopes.internal.Scope.prototype.set_values_value = function(name,value) {
		if (this.values.hasOwnProperty(name)) {
			this.values[name].set_value( value );
		}
	
		return this;
	};

	dynamic_scopes.internal.Scope.prototype.get_template = function(name) {
		var result = null;
		if (this.templates.hasOwnProperty(name)) {
			result = this.templates[name];
		}

		return result;
	};
	dynamic_scopes.internal.Scope.prototype.find_or_create = function(name, node) {
		var result = this.get_scope(name);
		if (result === null) {
			result = this.create_scope(name, node);
		} else {
			result.add_node(node);
		}

		return result;
	};

	dynamic_scopes.internal.Scope.prototype.register_template = function( dynamic_template ) {
		this.templates[dynamic_template.name] = dynamic_template;

		return this;
	};

	dynamic_scopes.internal.Scope.prototype.register_value = function(dynamic_value) {
		this.values[dynamic_value.name] = dynamic_value;
		this.add_property( dynamic_value.name, dynamic_scopes.internal.Scope.prototype.get_values_value, dynamic_scopes.internal.Scope.prototype.set_values_value );

		return this;
	};

	dynamic_scopes.internal.Scope.prototype.get_scope_by_name = function( name ){
		var result = null;

		if (this.scopes.hasOwnProperty(name)){
			result = this.scopes[name];
		}

		return result;
	};

	dynamic_scopes.internal.Scope.prototype.get_value_by_name = function( name ){
		var result = null;

		if (this.values.hasOwnProperty(name)){
			result = this.values[name];
		}

		return result;
	};

	dynamic_scopes.internal.Scope.prototype.get_template_by_name = function( name ){
		var result = null;

		if (this.templates.hasOwnProperty(name)){
			result = this.templates[name];
		}

		return result;
	};

	dynamic_scopes.internal.Scope.prototype.get_by_reference = function( ref,deep ) {
		var result = null;

		if (typeof ref === "string") {
			ref = new internal.Reference( ref, deep );
		}
		if (ref.has_next()) {
			var ref_name = ref.next();
			var ref_property_name = CMSGeneric.htmlID2CamelCase( ref_name );
			var subscope = this.get_scope_by_name( ref_property_name );
			if (subscope !== null){
				result = ref.has_next() ? subscope.get_by_reference( ref ) : subscope ;
			} else {
				var value_def = this.get_value_by_name( ref_property_name );
				if (value_def !== null){
					result = value_def;
					var there_is_more = ref.has_next();
					if (there_is_more){
						if (ref.deep){
							while (ref.has_next()){
								ref_property_name = ref.next();
								result = result[ref_property_name];
							}
						} else {
							CMSGeneric.warning("Value ref: ignoring " + ref.todo, there_is_more, ref );
						}
					}
				} else {
					var template_def = this.get_template_by_name( ref_property_name );
					if (template_def !== null){
						result = template_def;
						if (ref.has_next()){
							CMSGeneric.warning("template ref: ignoring " + ref.todo, ref );
						}
					} else {
						if (ref.is_first() && this !== dynamic_scopes.Global){
							result = dynamic_scopes.Global.get_by_reference( ref.reset(),deep );
						} else {
							CMSGeneric.error("Scope ref " + ref.todo + " not found.", ref );	
						}
					}
				}
			}
		} 

		return result;
	};


	internal.Reference = function(ref) {
		this.reference = ref;
		this.parts = ref.split('.');
		this.index = 0;
		this.parsed='';
		this.last='';
		Object.defineProperty( this, 'todo', {
			enumerable: false,
			get: function(){
				return this.parts.splice( this.index - (this.index>0 ? 1 : 0) ).join('.');
			}
		})
	};

	internal.Reference.prototype.has_next = function(){
		return this.index < this.parts.length;
	};

	internal.Reference.prototype.is_first = function(){
		return this.index < 2;
	};

	internal.Reference.prototype.reset = function(){
		this.index = 0;

		return this;
	};

	internal.Reference.prototype.next = function() {
		var result = "";

		if (this.index < this.parts.length) {
			this.parsed += this.parsed.length>0 ? '.' : '';
			this.parsed += this.last;
			result = this.parts[this.index];
			this.last=result;
			this.index++;
		}

		return result;
	};

	dynamic_scopes.create = function create_new_scope(name, node, parent){
		return new dynamic_scopes.internal.Scope( name,node,parent );
	};
	
	dynamic_scopes.Global = dynamic_scopes.create("Global");

})(window.cms$Generic);