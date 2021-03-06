var values_module = {
	info: {
		Name: "Dynamic values",
		Description: "Declare named values that can be monitored throughout a page.",
		Version: "1.02.1"
	},
	vars: {
		values: {},
		aliases: {},
		alias_references: {},
		observers: {},
		observer_index: 0
	},
	types: {
		DynamicValue: function(name) {
			this.create(name);
		},
		DynamicMetavalue: function(name) {
			this.create(name);
		}
	}
};

var
	api_keywords = require('./dynamic-api_keywords.js'),
	dynamic_utils = require('./dynamic-utils'),
	deep_equal = require('deep-equal'),
	util = require('util'),

	logger = require('./browser_log').get_logger(values_module.info.Name),
	// selected_re=/(.+)\.@selected/g,
	meta_indicator = api_keywords.meta.indicator,
	meta_selected_name = meta_indicator + 'selected',
	meta_count_name = meta_indicator + api_keywords.meta.count,
	parent_meta_selector = api_keywords.symbols.from_here_selector + api_keywords.meta.indicator
;

values_module.reset_for_test = function(){
	values_module.vars = {
		values: {},
		aliases: {},
		observers: {},
		observer_index: 0
	};
};

values_module.reference_parser = function( ref ){
	return new ReferenceParser( ref );
};

values_module.enhance = function(methods) {
	Object.keys(methods).forEach(function enhance_instance(method_name) {
		DynamicValue.prototype[method_name] = methods[method_name];
	});
};

values_module.define = function(value_name) {
	var
		result = null,
		parts;

	if ( value_name.trim().length<1){
		logger.error("Value must have a name");
		return null;
	}
	parts = value_name.split(api_keywords.symbols.name_separator);
	if (parts.length > 1) {
		if (dynamic_utils.starts_with(parts.slice(-1)[0], api_keywords.meta.indicator )) {
			result = new values_module.types.DynamicMetavalue(value_name);
		}
	}

	if (result === null) {
		result = new values_module.types.DynamicValue(value_name);
	}

	values_module.vars.values[value_name] = result;

	result.set_up();

	return result;
};

values_module.set_by_name = function(value_name, dynamic_value) {
	values_module.vars.values[value_name] = dynamic_value;
};

values_module.get_by_name = function(value_name) {
	var result = null;

	if (values_module.vars.values.hasOwnProperty(value_name)) {
		result = values_module.vars.values[value_name];
	} else {
		if (values_module.vars.aliases.hasOwnProperty(value_name)) {
			result = values_module.vars.aliases[value_name];
		}
	}

	return result;
};

values_module.alias_or_name = function(value_name) {
	var result = value_name;

	if (values_module.vars.alias_references.hasOwnProperty(value_name)){
		result = values_module.vars.alias_references[value_name];
	}

	return result;
};

values_module.define_alias = function(value_name, dynamic_value_reference) {
	values_module.vars.alias_references[value_name] = dynamic_value_reference;
};

values_module.get_or_define = function(value_name) {
	var
		ref_parser = new ReferenceParser(value_name),
		result = values_module.get_by_name(value_name);

	if (result === null) {
		result = values_module.get_by_name(ref_parser.dot_notation);

		if (result === null) {
			result = values_module.define(ref_parser.dot_notation);
		}
		if (result.name !== value_name) {
			values_module.vars.aliases[value_name] = result;
		}
	}

	return result;
};

var
	set_one_value_by_name = function( val_name, val_value ){
		var v = values_module.get_or_define( val_name );
		if (v !== null){
			v.set_value( val_value );
		}
	},
	add_to_value_by_name = function( val_name, val_value ){
		var v = values_module.get_by_name( val_name );
		if (v !== null){
			logger.error( "DynamicValue::add_value Not yet implemented!");
		}
	},
	modify_multiple_values = function ( worker, complex ){
		if (arguments.length > 2){
			for (var argi= 1; argi< arguments.length-1; argi += 2){
				worker.call( null, arguments[argi], arguments[argi+1] );
			}
		} else {
			Object.keys(complex).forEach( function(val_name){
				worker.call( null, val_name, complex[val_name] );
			});
		}
	}
;

values_module.set_values_by_name = function(){
	modify_multiple_values.apply( null, Array.prototype.concat.apply( [set_one_value_by_name], arguments ) );
};

values_module.add_values_by_name = function(){
	modify_multiple_values.apply( null, Array.prototype.concat.apply( [set_one_value_by_name], arguments ) );
};

var
	value_types = {
		unassigned: 0,
		scalar: 1,
		list: 2
	};

function DynamicValue() {}
DynamicValue.prototype.create = function(name) {
	this.name = name;
	this.content = "";
	this.oldvalue = "";
	this.default = "";
	this.observers = [];
	this.parent = null;
	this.children = {};
	this.type = value_types.unassigned;
	this.metavalues = {};
	this.metainfo = {};
	this.suppress_parent_notifications = false;
	this.state = values_module.STATE.DEFINED;
	this.deferred_observers = [];
	this.pending_request = null;

	var self = this;

	Object.defineProperties(this, {
		'bracket_notation': {
			enumerable: false,
			get: function() {
				return this.get_bracket_notation();
			}
		},
		'value': {
			get: function() {
				return this.get_value();
			},
			set: function(v) {
				return this.set_value(v);
			}
		}
	});
	Object.defineProperties(this.metainfo, {
		'value': {
			get: function() {
				return self.content;
			}
		},
		'reference': {
			get: function() {
				return self.reference;
			}
		},
		'count': {
			get: function() {
				return Object.keys(self.children).length;
			}
		}
	});
	if (typeof this.children.forEach !== "function") {
		Object.defineProperty(this.children, 'forEach', {
			enumerable: false,
			get: function() {
				return function(callback, this_arg) {
					var childs = self.get_children();
					for (var ci = 0; ci < childs.length; ci++) {
						child_value = childs[ci];
						callback.call(this_arg, child_value);
					}
				};
			}
		});
	}
};

DynamicValue.prototype.clear_children = function() {
	for (var child_name in this.children) {
		delete this.children[child_name];
	}
};

DynamicValue.prototype.get_dynamic_value = function get_dynamic_value_for_value(value_name, must_exist) {
	var result = null;

	if (typeof must_exist === "undefined") {
		must_exist = false;
	}

	if (dynamic_utils.starts_with(value_name, api_keywords.symbols.from_here_selector)) {
		var
			parent_value = this;
		if (dynamic_utils.starts_with(value_name, api_keywords.symbols.parent_selector)) {
			parent_value = this.parent;
			value_name = value_name.substring(1);
		} else {
			if ( value_name === api_keywords.symbols.from_here_selector){
				result = this;
			} else {
				if (Object.keys(this.children).length < 1 && !dynamic_utils.starts_with( value_name, parent_meta_selector )) {
					parent_value = this.parent;
				}
			}
		}
		value_name = parent_value.name + value_name;
	}

	if ( result === null ){
		result = must_exist ? values_module.get_by_name(value_name) : values_module.get_or_define(value_name);
	}

	return result;
};

var
	empty_tests = {
		"undefined": function() {
			return true;
		},
		"string": function(v) {
			return v.trim().length < 1;
		},
		"number": function(v) {
			return isNaN(v) || !isFinite(v);
		},
		"boolean": function(v) {
			return v === false;
		},
		"object": function(v) {
			var result = true;

			if (v !== null) {
				var a = Array.isArray(v) ? v : Object.keys(v);
				result = a.length < 1;
			}

			return result;
		}
	};

function value_type_from_value(val) {
	var
		result;

	if (typeof val === "undefined" || val === null) {
		result = value_types.unassigned;
	} else {
		if (dynamic_utils.is_scalar(val)) {
			result = value_types.scalar;
		} else {
			result = value_types.list;
		}
	}

	return result;
}

DynamicValue.prototype.get_bracket_notation = function() {
	return this.name.split(api_keywords.symbols.name_separator).map(function(name_part, ix) {
		name_part = name_part.toLowerCase().replace(/ -]/g, '_');
		return (ix < 1 ? name_part : '[' + name_part + ']');
	}).join('');
};


DynamicValue.prototype.make_selectable = function() {
	this.make_list();

	if (!this.metavalues.hasOwnProperty( 'selected' )){
		this.metavalues.selected = values_module.get_or_define(this.name + api_keywords.symbols.name_separator + meta_selected_name);
		this.metavalues.selected.type = value_types.scalar;
	}

	return this.metavalues.selected;
};

DynamicValue.prototype.make_list = function() {
	this.type = value_types.list;

	if (!this.metavalues.hasOwnProperty( api_keywords.meta.count )){
		this.metavalues.count = values_module.get_or_define(this.name + api_keywords.symbols.name_separator + meta_count_name);
		this.metavalues.count.type = value_types.scalar;
	}

	return this.metavalues.count;
};

var
	type_enforcers = [];

	type_enforcers[ value_types.list ] = DynamicValue.prototype.make_list;

DynamicValue.prototype.enforce_type = function() {
	var
		enforcer = type_enforcers[ this.type ];

	if (typeof enforcer === "function"){
		enforcer.call( this );
	}
};

DynamicValue.prototype.add_child = function(child_value) {
	var notify = false;

	if (this.type === value_types.unassigned) {
		this.content = {};
		this.make_list();
	}

	notify = !this.content.hasOwnProperty( child_value.reference );
	this.children[child_value.reference] = child_value;
	this.content[child_value.reference] = child_value.get_value();

	if ( notify ){
		this.notify_structural_change();
	}

	return this.content[child_value.reference];
};

DynamicValue.prototype.register_to_parent = function() {
	this.content = this.parent.add_child(this);
};

DynamicValue.prototype.set_up = function() {
	var
		parts = this.name.split(api_keywords.symbols.name_separator);

	this.reference = parts.slice(-1)[0];
	this.content = this.default;

	parent_ref = parts.slice(0, -1).join(api_keywords.symbols.name_separator);
	if (parent_ref.length > 0) {
		this.parent = values_module.get_or_define(parent_ref);
		// why on earth was this vvv disabled
		this.register_to_parent();
	}
};

DynamicValue.prototype.get_children = function() {
	var result = [];

	Object.keys(this.children).forEach(function(child_key_name) {
		result.push(this.children[child_key_name]);
	}, this);
	return result;
};

DynamicValue.prototype.observe = function(name, observer, this_arg) {
	var self = this;
	if (typeof this_arg !== "undefined") {
		Object.keys(values_module.vars.observers).forEach(function(value_observer_ref) {
			var value_observer = values_module.vars.observers[value_observer_ref];

			if (value_observer.callback === observer && value_observer.this_arg === this_arg) {
				logger.error(this.name+': Redefinition of observer', value_observer);
			}
			// if (value_observer.callback.name === observer.name && value_observer.dynamic_value === self && value_observer.this_arg === this_arg) {
			// 	logger.error('Redefinition of observer', value_observer);
			// }
		});
	}

	var
		result = new DynamicValueObserver(this.name + '_' + name+'_'+observer.name, observer, this);
	result.this_arg = this_arg;

	this.observers.push(result);

	return result;
};

DynamicValue.prototype.unobserve = function(observer) {
	var
		ix = this.observers.indexOf(observer);

	if (ix >= 0) {
		this.observers.splice(ix, 1);
	}
};

DynamicValue.prototype.is_empty = function() {
	var
		result = this.type === value_types.unassigned;

	if (!result) {
		var
			test_value = this.get_value(),
			worker = empty_tests[typeof test_value];

		if (typeof worker === "function") {
			result = worker(test_value);
		} else {
			logger.warning('DynamicValue::IsEmpty not test for ' + (typeof worker));
		}
	}

	return result;
};

DynamicValue.prototype.get_full_reference = function() {
	return this.name;
};

DynamicValue.prototype.get_value = function() {
	return typeof this.content === "object" && this.content !== null ? this.content.valueOf() : this.content;
};

DynamicValue.prototype.get_text = function() {
	var result = '';

	if (!this.is_empty())
		result = this.get_value();

	if (typeof result === "undefined" || result === null) {
		logger.warn('get text returned nil' + this.name);
	} else {
		result = result.toString();
	}
	return result;
};

DynamicValue.prototype.set_current = function(current_ref) {
	this.current = current_ref;
};

DynamicValue.prototype.clear = function() {
	return this.set_value( null );
};

DynamicValue.prototype.notify_structural_change = function() {
	if (this.metavalues.count) {
		this.metavalues.count.notify_observers();
	}
	this.notify_observers();
};

function StructureAnalyser( dynamic_value ){
	this.dynamic_value = dynamic_value;
	this.had_keys = typeof this.dynamic_value.content === "object"? Object.keys(this.dynamic_value.content).length : 0;
}


StructureAnalyser.prototype.analyse = function( suppress_structural ){
if (typeof suppress_structural !== "boolean"){
	suppress_structural = false;
}

	this.has_keys = typeof this.dynamic_value.content === "object"? Object.keys(this.dynamic_value.content).length : 0;

	if (this.has_keys<1){
		this.dynamic_value.type = value_types.unassigned;
		this.dynamic_value.content = '';
	}

	if (this.had_keys !== this.has_keys  ) {

		logger.debug( 'Structural change for '+this.dynamic_value.name+' from '+this.had_keys+' to '+ this.has_keys);

		this.dynamic_value.metavalues.count.notify_observers();

		if ( !suppress_structural && (this.had_keys === 0 || this.has_keys ===0 ) ) {
			// notify observers that we've changed from null, "" or {} to some content
			this.dynamic_value.notify_observers();
		}
	}
};

DynamicValue.prototype.update_from_child = function(child_value) {
	var
		structure_analyser = new StructureAnalyser( this );

	logger.info( '+++UFC '+this.name+' from '+ child_value.reference+' from '+pp(this.content), this.is_empty(), child_value.is_empty(), pp(child_value.content) );

	if (this.type !== value_types.list) {
		this.oldvalue = {};
		this.content = {};

		this.make_list();
	}


	if (!child_value.is_empty()) {
		this.content[child_value.reference] = child_value.content;
		this.children[child_value.reference] = child_value;
	} else {
		delete this.content[child_value.reference];
		delete this.children[child_value.reference];
	}

	structure_analyser.analyse();

	if (this.parent !== null ){
		this.parent.update_from_child( this );
	}

	logger.debug( '---UFC '+this.name+' from '+ child_value.reference+' to '+ pp(this.content) );

	return this;
};

function pp( complex ){
	var result;

	if ( dynamic_utils.is_null( complex ) ){
		result = '«NIL»';
	} else {
		if (dynamic_utils.is_scalar( complex ) ){
			result = complex.toString();
		} else {
			result = '[ ' + Object.keys( complex ).join(', ') +' ]';
		}
	}
			// return JSON.stringify( complex ).replace(/"([^"]+)"/g,'$1');
	return result;
}

DynamicValue.prototype.update_from_attributes = function() {
	var
		value_keys = Object.keys(this.content),
		previous_children = dynamic_utils.list_duplicate( Object.keys( this.children ) )
	;

	value_keys.forEach(function(value_key) {
		var
			attribute_value = this.content[value_key],
			child_value = values_module.get_or_define(this.name + api_keywords.symbols.name_separator + value_key);
			child_value.set_value( attribute_value, true );
			this.content[value_key] = attribute_value; // got perhaps cleared by a DEFINE::add_child
			this.children[child_value.reference] = child_value;
	}, this);

	dynamic_utils.array_diff(  previous_children, value_keys ).forEach( function( child_name ) {
		// logger.debug( 'clear name '+child_name);
		// TODO: clear childs that are no longer there
		// logger.warning('TODO: clear childs that are no longer there, '+ child_name );
		console.log( 'DynamicValue::update_from_attributes '+child_name, this.children[ child_name ].constructor.name, 'Inspect:', util.inspect(this.children[ child_name ]) );
		this.children[ child_name ].remove();
	}, this);

};

DynamicValue.prototype.set_metainfo = function(child_value, newvalue) {
	var
		child_reference = child_value.meta_reference;

	if (!this.metavalues.hasOwnProperty( child_reference )) {
		this.metavalues[child_reference] = child_value;
	}

	this.metainfo[child_reference] = newvalue;
	if (child_reference === "selected" && typeof this.mark_selected === "function" ){
		this.mark_selected();
	}
};

DynamicValue.prototype.do_set_unassigned = function(){
	this.content = '';
};

DynamicValue.prototype.do_set_scalar = function( newvalue ){
	this.content = newvalue;
};

DynamicValue.prototype.do_set_list = function( newvalue ){
	var
		structure_analyser = new StructureAnalyser( this );

	this.content = newvalue;
	this.update_from_attributes();

	structure_analyser.analyse( true );

};


var
	type_setters = {};

	type_setters[ value_types.unassigned ] = DynamicValue.prototype.do_set_unassigned;
	type_setters[ value_types.scalar ] 		= DynamicValue.prototype.do_set_scalar;
	type_setters[ value_types.list ] 		= DynamicValue.prototype.do_set_list;

DynamicValue.prototype.do_set_value = function( newvalue ) {

	this.oldvalue = this.content;
	this.type = value_type_from_value( newvalue );
	this.enforce_type();

	var type_setter = type_setters[ this.type ];

	if (typeof type_setter !== "function"){
		logger.error( 'panic', this.type, pp( newvalue), type_setter, type_setters);
	}

	type_setter.call( this, newvalue );
};

DynamicValue.prototype.notify_observers = function(use_deferred) {
	var dynamic_value = this;
	if (typeof use_deferred !== "boolean") {
		use_deferred = false;
	} else {
		if ( typeof use_deferred === 'object' ){
			dynamic_value = use_deferred;
		}
	}

	this.state = values_module.STATE.NOTIFY;
	var current_observers;
	if ( use_deferred ){
		current_observers = this.deferred_observers;
	} else {
		current_observers = this.observers; //dynamic_utils.list_duplicate( this.observers );
		this.deferred_observers = [];
	}
	logger.info( '+ + + '+ this.name+' notification '+current_observers.length + ', '+this.observers.length+' ('+use_deferred+')'  );
	for (var li = 0; li < current_observers.length; li++) {
		var observer = current_observers[li];
		if (this.pending_request === null){
			logger.debug( '+ + + + '+ this.name+' notification '+li+', '+current_observers.length + ', '+this.observers.length+', '+observer.reference );
			observer.callback.call( observer.this_arg, dynamic_value );
			logger.debug( '- - - - '+ this.name+' notification '+li+', '+current_observers.length + ', '+this.observers.length  );
		} else {
			logger.debug( '. . . . '+ this.name+' deferring    '+li+', '+current_observers.length + ', '+this.observers.length+', '+observer.reference  );
			if (this.deferred_observers.length < 1000){
				this.deferred_observers.push( observer );
			} else {
				logger.error("Maximum number of deferred observers reached.");
			}
		}
	}
	logger.debug( ' - - -'+this.name+' notification' );

	return this;
};

DynamicValue.prototype.set_value = function( newvalue, skip_update_parent ) {

	if (typeof skip_update_parent !== "boolean"){
		skip_update_parent = this.parent === null;
	}


	var
		oldvalue = this.get_value(),
		must_assign = false
	;
	if (this.type !== value_type_from_value( newvalue )){
		must_assign = true;
	} else {
		if (this.type === value_types.list ){
			must_assign = !deep_equal( oldvalue, newvalue );
		} else {
			must_assign = oldvalue != newvalue;
		}
	}
	// || only_by_attributes
	if ( must_assign ) { // use type coercion if necessary
		this.oldvalue = oldvalue;
		var v=JSON.stringify(newvalue).replace( /"([^"]+)"/g,'$1' ).substring(0,25);
		logger.debug('> DynamicValue::SetValue( '+this.name + ', ' + v +" )" );

		this.state = values_module.STATE.MODIFY;
		this.do_set_value( newvalue, skip_update_parent );

		this.notify_observers();

		if ( !skip_update_parent && !this.suppress_parent_notifications ){
			this.parent.update_from_child( this );
		} else {
			logger.debug( 'DynamicValue::UpdateFromChild skipped: '+skip_update_parent +', '+ this.suppress_parent_notifications);
		}

		logger.debug('< DynamicValue::SetValue( '+this.name + ', ' + v +" )" );
	} else {
		this.notify_observers( true );
	}

	this.state = values_module.STATE.ASSIGNED;
	return this;
};

function DynamicValueObserver(name, callback, dynamic_value) {

	this.callback = callback;
	this.dynamic_value = dynamic_value;

	this.reference = (100000000 + (++values_module.vars.observer_index)) + '_' + name;

	values_module.vars.observers[this.reference] = this;
}

DynamicValueObserver.prototype.remove = function() {
	delete values_module.vars.observers[this.reference];
	this.dynamic_value.unobserve(this);
};

function ReferenceParser(ref) {
	this.reference = ref;
	this.parse();
}

var
	square_hooks_re = /\[([^\]]+)\]/g;

ReferenceParser.prototype.parse = function() {
	// console.log('Parse:',this.reference);
	this.parts = this.reference.replace(square_hooks_re, '.$1').replace('..', api_keywords.symbols.name_separator).split(api_keywords.symbols.name_separator);
	this.count = this.parts.length;
	this.dot_notation = this.parts.join(api_keywords.symbols.name_separator);
};

function DynamicMetavalue() {}
DynamicMetavalue.prototype = new DynamicValue();

DynamicMetavalue.prototype.get_value = function() {
	return this.parent.metainfo[ this.meta_reference ];
};

DynamicMetavalue.prototype.do_set_value = function(newvalue) {
	this.content = newvalue;
	this.type = value_type_from_value( newvalue );

	this.parent.set_metainfo( this, newvalue );
};

DynamicMetavalue.prototype.register_to_parent = function() {
	this.metavalues[this.reference] = this;
};

DynamicMetavalue.prototype.set_up = function() {

	DynamicValue.prototype.set_up.call(this);

	this.meta_reference = this.reference.substring(1);
	this.suppress_parent_notifications = true;
	this.type = value_types.scalar;
};

values_module.types.DynamicValue.prototype = new DynamicValue();
values_module.types.DynamicValue.constructor = values_module.types.DynamicValue;

values_module.types.DynamicMetavalue.prototype = new DynamicMetavalue();
values_module.types.DynamicMetavalue.constructor = values_module.types.DynamicMetavalue;

values_module.STATE = {
	DEFINED: 'defined',
	MODIFY:	'set_value',
	NOTIFY: 'notifying',
	ASSIGNED: 'stable'
};

module.exports = values_module;
