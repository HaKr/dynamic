"use strict";

// sails.io and Promise are loaded
/* global io, Promise */


(function DynamicValuesModule(CMSGeneric){

	var exports = {
		info: {
			Name:       "Dynamic values",
			Description:  "Declare named values that can be monitored throughout a page.",
			Version:    "1.02.1"
		},
		vars: {
			Scopes:	[]
		},
		types: {
			DynamicValue: function( name, options ){
				if (typeof name === "undefined"){
					return this;
				} else {
					this.name = name;
					this.construct( options );
				}
			}
		}
	};

	if (typeof CMSGeneric === "undefined"){
		// eslint-disable-next-line
		console.error('cms-generic.js must be loaded first, before ',module.Name, 'can be loaded.' );

		return;
	}

	exports.define = function( name,options ){
		return new exports.types.DynamicValue( name, options );	
	};
	
	CMSGeneric.register( exports );
	
	var
		defaultSetValue = function(val){ this.value = val },
		infoNum = function(oldv,newv){ return " from "+oldv+" to "+ newv+ "."},
		infoStr = function(oldv,newv){ return " from \""+oldv+"\" to \""+ newv+ "\"."},
		infoLst = function(oldv,newv){ return " from ["+oldv.length+"] to ["+ newv.length+ "]."},
		addItemIgnore = function(){CMSGeneric.warning('Ignoring VAR item', this)},
		addListItem = function(key,value){ this.value.push( value ); },
		addHashItem = function(key,value){ this.value[key] = value; },
		defaultIsEmpty = function(){ return (""+ this.value).trim().length < 1 },
		listIsEmpty = function(){ return this.value.length < 1 },
		hashIsEmpty = function(){ return Object.keys(this.value).length < 1 },
		value_types = {
			number: {default: 0,       canBind: true,  setValue: function(val){this.value = (new Number(val)).valueOf() }, info: infoNum, addItem: addItemIgnore, is_empty: defaultIsEmpty },
			string: {default: "",      canBind: true,  setValue: function(val){ this.value = val.toString() }, info: infoStr, addItem: addItemIgnore, is_empty: defaultIsEmpty },
			hash:   {default: {},      canBind: false, setValue: defaultSetValue, info: function(){return ""}, addItem:addHashItem, is_empty: hashIsEmpty },
			list:   {default: [],      canBind: false, setValue: defaultSetValue, info: infoLst, addItem: addListItem, is_empty: listIsEmpty  },
			monitor:{default: false,   canBind: false, setValue: defaultSetValue, info: infoNum, addItem: addItemIgnore }
		};


	function DynamicValue(){};
	
	DynamicValue.prototype.construct = function( options ){
		this.options = options;
		this.initial = options.content;
		this.data_url = options.data_url;
		this.scope = null;
		this.dynamic_nodes = [];
		this.initialised = false;
		this.value = null;
		this.observers = [];

		var thistype = value_types[options.type];

		if (typeof thistype === "undefined"){
			throw "Unknown type '"+typename+"' for value ";
		} else {
			this.type = {name: options.type, default: thistype.default, setter: thistype.setValue, info: thistype.info, can_bind: thistype.canBind, add_item: thistype.addItem, is_empty: thistype.is_empty };
			this.type.setter.call( this, this.type.default );
		}
	};
	
	DynamicValue.prototype.initialise = function (){
		if ( typeof this.initial !== "undefined" && !this.initialised ){
			this.set_value( this.initial );
		} else {
			if (!this.bound){
				this.refresh();
			}
		}
		this.processor = CMSGeneric.getProcessor( this.name );
	};
	
	DynamicValue.prototype.observe = function ( observer ){
		this.observers.push( observer );
	};

	DynamicValue.prototype.is_empty = function (){
		return this.type.is_empty.call( this );
	};

	DynamicValue.prototype.set_value = function (newvalue){
		var oldvalue = this.value;

		this.type.setter.call( this,newvalue );

		if (this.value != oldvalue){ // use type coercion if necessary
			this.oldvalue = oldvalue;

			CMSGeneric.debug( this.name, "changed"+ this.type.info.call( this,oldvalue,newvalue ));
			if (this.processor !== null){
				// newvalue = this.processor.from_raw( newvalue );
			}

			this.value = newvalue;

			// if (typeof this.inform_control === "function"){
			// 	this.inform_control( this.value, oldvalue);
			// }

			// this.dynamic_nodes.forEach(function(dynamic_node){
			// 	if (typeof dynamic_node.construct === "function"){
			// 		CMSGeneric.debug( this.name, "construct ", dynamic_node.template.name );
			// 		setTimeout(function(){
			// 			dynamic_node.construct(exports.global.all);   
			// 		}, 10);
			// 	}
			// }, this);

			for (var li=0; li<this.observers.length; li++){
				var observer = this.observers[li];
				observer( this );
			}

		}
	};

	exports.types.DynamicValue.prototype = new DynamicValue();
	exports.types.DynamicValue.constructor = exports.types.DynamicValue;
	
	return exports;
	
})(window.cms$Generic);