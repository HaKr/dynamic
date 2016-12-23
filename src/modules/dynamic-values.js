var values_module = {
		info: {
			Name:       "Dynamic values",
			Description:  "Declare named values that can be monitored throughout a page.",
			Version:    "1.02.1"
		},
		vars: {
			values:	{}
		},
		types: {
			DynamicValue: function( name, options ){
				this.name = name;
				this.initialised = false;
				this.value = "";
				this.oldvalue = "";
				this.default = "";
				this.observers = [];
				this.parent = null;
				this.children = {};

				this.set_up();
			}
		}
	};

var
 	logger = require('./browser_log').get_logger(values_module.info.Name)
 	;


	values_module.define = function( value_name  ){
		var result =  new values_module.types.DynamicValue( value_name );	
		values_module.vars.values[ value_name ] = result;

		return result;
	};

	values_module.get_by_name = function( value_name ){
		var result = null;

		if (values_module.vars.values.hasOwnProperty( value_name ) ){
			result = values_module.vars.values[ value_name ];
		}
		return result;
	};

	values_module.get_or_define = function( value_name ){
		var result = values_module.get_by_name( value_name );

		if (result === null){
			result = values_module.define( value_name );
		}

		return result;
	};
		
	var
		defaultSetValue = function(val){ this.value = val },
		infoNum = function(oldv,newv){ return " from "+oldv+" to "+ newv+ "."},
		infoStr = function(oldv,newv){ return " from \""+oldv+"\" to \""+ newv+ "\"."},
		infoLst = function(oldv,newv){ return " from ["+oldv.length+"] to ["+ newv.length+ "]."},
		addItemIgnore = function(){logger.warn('Ignoring VAR item', this)},
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

	var
		empty_tests = {
			"undefined": function(){ return true; },
			"string": function( v ){ return v.trim().length < 1 },
			"number": function( v ){ return v != 0 },
			"boolean": function( v ){ return v === false },
			"object": function( v ){ 
				var result = true;

				if ( v !== null){
					var a = Array.isArray( v ) ? v : Object.keys( v );
					result = a.length < 1;
				}

				return result;
			}
		};
	
	DynamicValue.prototype.set_up = function (){
		var
			parts = this.name.split('.');

		this.reference =parts.slice(-1)[0];

		parent_ref = parts.slice( 0, -1 ).join('.');
		if (parent_ref.length > 0){
			this.parent = values_module.get_or_define( parent_ref );
			this.value = this.parent.add_child( this );
		}
	};

	DynamicValue.prototype.add_child = function ( child_value ){
		this.children[ child_value.reference ] = child_value;

		if (typeof this.value !== "object" || this.value === null){
			this.value = {};
		}
		this.value[ child_value.reference ] = child_value.default;

		return this.value[ child_value.reference ];
	};

	DynamicValue.prototype.observe = function ( observer ){
		this.observers.push( observer );
	};

	DynamicValue.prototype.is_empty = function (){
		var 
			result = true,
			worker = empty_tests[ typeof this.value ];

		if (typeof worker === "function"){
			result = worker( this.value );
		}

		return result;
	};

	DynamicValue.prototype.get_value = function (){
		return this.value;
	}

	DynamicValue.prototype.do_set_value = function (newvalue){
		this.oldvalue = this.value;
		this.value = newvalue;
		if (this.parent !== null){
			var parent_value = this.parent.get_value();
			if (typeof parent_value === "object"){
				parent_value[ this.reference ] = this.value;
			}
		}
		if (typeof newvalue === "object"){
			if (newvalue === null){
				newvalue = {};
			}
		}
		var self = this;
		Object.keys( this.children ).forEach( function( child_value_key ) {
			var child_value = self.children[ child_value_key ];
			if (newvalue.hasOwnProperty( child_value.reference ) ){
				child_value.set_value( newvalue[ child_value.reference ] );
			} else {
				child_value.set_value( "" );				
			}
		});
	};

	DynamicValue.prototype.notify_observers = function (){
		for (var li=0; li<this.observers.length; li++){
			var observer = this.observers[li];
			observer( this );
		}

		return this;
	};

	DynamicValue.prototype.set_value = function (newvalue){
		if (newvalue != this.value){ // use type coercion if necessary
			this.do_set_value( newvalue );
			this.notify_observers();
		}

		return this;
	};

	DynamicValue.prototype.set_value_old = function (newvalue){
		var oldvalue = this.value;

		this.type.setter.call( this,newvalue );

		if (this.value != oldvalue){ // use type coercion if necessary
			this.oldvalue = oldvalue;

			logger.debug( this.name, "changed"+ this.type.info.call( this,oldvalue,newvalue ));
			if (this.processor !== null){
				// newvalue = this.processor.from_raw( newvalue );
			}

			this.value = newvalue;

			// if (typeof this.inform_control === "function"){
			// 	this.inform_control( this.value, oldvalue);
			// }

			// this.dynamic_nodes.forEach(function(dynamic_node){
			// 	if (typeof dynamic_node.construct === "function"){
			// 		DDOM.debug( this.name, "construct ", dynamic_node.template.name );
			// 		setTimeout(function(){
			// 			dynamic_node.construct(exports.global.all);   
			// 		}, 10);
			// 	}
			// }, this);


		}
	};

	values_module.types.DynamicValue.prototype = new DynamicValue();
	values_module.types.DynamicValue.constructor = values_module.types.DynamicValue;

	module.exports = values_module;
