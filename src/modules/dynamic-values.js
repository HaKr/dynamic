var values_module = {
	info: {
		Name: "Dynamic values",
		Description: "Declare named values that can be monitored throughout a page.",
		Version: "1.02.1"
	},
	vars: {
		values: {},
		aliases: {},
		observers: {},
		observer_index: 0
	},
	types: {
		DynamicValue: function(name) {
			this.create(name);
		},
		DynamicMetavalue: function(name) {
			this.create(name);
		},
		DynamicByReferenceValue: function(name) {
			this.create(name);
		}
	}
};

var
	dynamic_utils = require('./dynamic-utils'),
	logger = require('./browser_log').get_logger(values_module.info.Name),
	// selected_re=/(.+)\.@selected/g,
	selected_index_name = '$selected',
	selected_reference_token = '@',
	selected_reference_re = new RegExp(selected_reference_token, 'g'),
	formula_token = '='
;

values_module.reference_parser = function(reference) {
	return new ReferenceParser(reference);
};

values_module.enhance = function( methods ) {
	Object.keys( methods ).forEach( function enhance_instance( method_name ){
		DynamicValue.prototype[ method_name ] = methods[ method_name ];
	} );
};

values_module.define = function(value_name) {
	var
		result = null,
		parts;

	if (value_name.indexOf(selected_reference_token) > 0) {
		result = new values_module.types.DynamicByReferenceValue(value_name);
	} else {

		parts = value_name.split('.');
		if (parts.length > 1) {
			if (dynamic_utils.starts_with( parts.slice(-1)[0], '$')) {
				result = new values_module.types.DynamicMetavalue(value_name);
			}
		}
	}
	if (result === null) {
		result = new values_module.types.DynamicValue(value_name);
	}

	values_module.vars.values[value_name] = result;

	result.set_up();


	return result;
};

values_module.set_by_name = function( value_name, dynamic_value ) {
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

function DynamicValue() {}
DynamicValue.prototype.create = function(name) {
	this.name = name;
	this.initialised = false;
	this.value = "";
	this.oldvalue = "";
	this.default = "";
	this.observers = [];
	this.parent = null;
	this.children = {};
	Object.defineProperties( this, {
		'bracket_notation': {
			enumerable: false,
			get: function() { return this.get_bracket_notation(); }
		},
		'count': {
			get: function() { return Object.keys( this.children ).length; }
		}
	});

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

DynamicValue.prototype.get_bracket_notation = function() {
	return this.name.split('.').map( function (name_part, ix){
		name_part = name_part.toLowerCase().replace(/ -]/g,'_');
		return (ix<1? name_part : '['+name_part+']')
	}).join('');
};

DynamicValue.prototype.register_to_parent = function() {
	this.value = this.parent.add_child(this);
};

DynamicValue.prototype.set_up = function() {
	var
		parts = this.name.split('.');

	this.reference = parts.slice(-1)[0];
	this.value = this.default;

	parent_ref = parts.slice(0, -1).join('.');
	if (parent_ref.length > 0) {
		this.parent = values_module.get_or_define(parent_ref);
		this.register_to_parent();
	}
};


DynamicValue.prototype.update_from_child = function( child_value ) {
	var
		had_keys, has_keys;

	if (this.is_empty()) {
		this.value = {};
		this.oldvalue = {};
	}

	var self = this;

	had_keys = Object.keys( this.value ).length > 0;

	if (!child_value.is_empty()) {
		this.value[child_value.reference] = child_value.value;

	} else {
		delete this.value[child_value.reference];
	}
	
	has_keys = Object.keys( this.value ).length > 0;

	if (had_keys !== has_keys){
		// notify observers that we've changed from null or {} to some content
		this.notify_observers();
	}

	return this;
};

DynamicValue.prototype.get_children = function() {
	var result = [];

	Object.keys( this.children ).forEach( function( child_key_name ){
		result.push( this.children[ child_key_name ] );
	}, this );
	return result;
}

DynamicValue.prototype.add_child = function( child_value ) {

	this.children[child_value.reference] = child_value;
	this.update_from_child( child_value );

	return this.value[child_value.reference];
};

DynamicValue.prototype.observe = function( name, observer, ref_object ) {
	var self = this;
	if (typeof ref_object !== "undefined"){
		Object.keys(values_module.vars.observers).forEach( function (value_observer_ref){
			var value_observer = values_module.vars.observers[value_observer_ref];

			if (value_observer.callback.name === observer.name && value_observer.dynamic_value === self && value_observer.ref_object === ref_object){
				logger.error('Redefinition of observer', value_observer );
			}
		})	;
	}

	var
		result = new DynamicValueObserver(this.name + '_'+name, observer, this);
	result.ref_object = ref_object;

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
		result = true,
		test_value = this.get_value(),
		worker = empty_tests[typeof test_value];

	if (typeof worker === "function") {
		result = worker(test_value);
	} else {
		logger.warning('DynamicValue::IsEmpty not test for '+(typeof worker));
	}

	return result;
};

DynamicValue.prototype.get_full_reference = function() {
	return this.name;
};

DynamicValue.prototype.get_value = function() {
	return typeof this.value === "object" ? this.value.valueOf() : this.value;
};

DynamicValue.prototype.get_text = function() {
	var result = '';

	if ( !this.is_empty() )
		result = this.get_value();

		if ( typeof result === "undefined" || result === null){
			logger.warn( 'get text returned nil'+ this.name );
		} else {
			result = result.toString();
		}
	return result;
};

DynamicValue.prototype.set_current = function(current_ref) {
	this.current = current_ref;
};

DynamicValue.prototype.clear = function() {
	return this.set_value(null);
};

DynamicValue.prototype.get_final = function() {
	return this;
};

DynamicValue.prototype.is_deferred = function() {
	return false;
};


DynamicValue.prototype.update_attributes = function() {
	var
		self = this,
		value_keys = Object.keys(this.value);

	value_keys.forEach(function(value_key) {
		var
			attribute_value = this.value[value_key],
			child_value = values_module.get_or_define(this.name + '.' + value_key);

		child_value.set_value(attribute_value);
	}, this);

	dynamic_utils.array_diff(Object.keys(this.children), value_keys).forEach(function(child_name) {
		this.children[child_name].clear();
	}, this);
};

DynamicValue.prototype.do_set_value = function(newvalue) {
	this.oldvalue = this.value;
	this.value = newvalue;

	var self = this;
			logger.debug( 'set value for  ref '+this.reference, this );

	if (this.parent !== null) {
		this.parent.update_from_child( this );
	}

	if (typeof this.value === "object") {
		if (this.value !== null) {
			this.update_attributes();
		} else {
			if (Object.keys(this.children).length < 1) {
				this.value = "";
			}
		}
	}

};

DynamicValue.prototype.notify_observers = function(dynamic_value) {
	if (typeof dynamic_value === "undefined") {
		dynamic_value = this;
	}

	for (var li = 0; li < this.observers.length; li++) {
		var observer = this.observers[li];
		observer.callback(dynamic_value);
	}

	return this;
};

DynamicValue.prototype.set_value = function(newvalue) {
	var
		oldvalue = this.get_value();
	// logger.debug('DV::SetValue', newvalue, oldvalue, (newvalue != oldvalue) );
	if (newvalue != oldvalue) { // use type coercion if necessary
		this.oldvalue = oldvalue;

		this.do_set_value(newvalue);
		this.notify_observers();
	}

	return this;
};

function DynamicValueObserver(name, callback, dynamic_value) {

	this.callback = callback;
	this.dynamic_value = dynamic_value;

	this.reference = (100000000 + ++values_module.vars.observer_index) +'_' + name;

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
	this.parts = this.reference.replace(square_hooks_re, '.$1').replace('..', '.').split('.');
	this.count = this.parts.length;
	this.dot_notation = this.parts.join('.');
};

function DynamicMetavalue() {}
DynamicMetavalue.prototype = new DynamicValue();

DynamicMetavalue.prototype.get_value = function() {
	return this.parent[this.reference.substring(1)];
};

DynamicMetavalue.prototype.do_set_value = function(newvalue) {
	this.value = newvalue;

	this.parent[this.reference.substring(1)] = newvalue;
};

DynamicMetavalue.prototype.register_to_parent = function() {
	// this.value = this.parent.add_child( this );
};

DynamicMetavalue.prototype.set_up = function() {
	DynamicValue.prototype.set_up.call(this);

	// if (this.reference === selected_index_name){
	// 	var x = values_module.get_or_define( this.parent.name + '.$selected');
	// 	var self = this;
	// 	this.observe( function() {
	// 		var dv = values_module.get_or_define( self.parent.name + '.' + self.value );
	// 		x.set_value( dv.get_value() );
	// 	});

	// }
};

function DynamicByReferenceValue() {}
DynamicByReferenceValue.prototype = new DynamicMetavalue();

DynamicByReferenceValue.prototype.get_full_reference = function() {
	return this.name;
};

DynamicByReferenceValue.prototype.get_final = function() {
	return this.delegate_value === null? this : this.delegate_value;
};

DynamicByReferenceValue.prototype.is_deferred = function() {
	return true;
};


DynamicByReferenceValue.prototype.set_up = function() {
	selected_reference_re.exec('dummy'); // reset de RE
	var
		m = selected_reference_re.exec(this.name),
		self = this;

	this.delegate_value = null;

	if (m) {
		var
			left = this.name.substring(0, m.index),
			index_value = values_module.get_or_define( left + selected_index_name ),
			right = this.name.substring(m.index + 1)
		;

		self.by_reference_observer = index_value.observe( 'index by ref',
			function by_reference_update( dynamic_value ) {
				if (!dynamic_value.is_empty() || dynamic_value == 0){
					self.delegate_value = values_module.get_or_define(left + dynamic_value.get_value() + right);
					logger.debug('By ref index changed', dynamic_value, self );
					self.notify_observers(self.delegate_value);
				}
		}, self );
	}
};

DynamicByReferenceValue.prototype.get_value = function() {
	var result = '';

	if (this.delegate_value !== null) {
		result = this.delegate_value.get_value();
	}
	return result;
};

DynamicByReferenceValue.prototype.set_value = function(newvalue) {
	if (this.delegate_value !== null) {
		result = this.delegate_value.set_value(newvalue);
	}
};

DynamicByReferenceValue.prototype.is_empty = function() {
	var
		result = this.delegate_value === null;

	return result;
};




values_module.types.DynamicValue.prototype = new DynamicValue();
values_module.types.DynamicValue.constructor = values_module.types.DynamicValue;

values_module.types.DynamicMetavalue.prototype = new DynamicMetavalue();
values_module.types.DynamicMetavalue.constructor = values_module.types.DynamicMetavalue;

values_module.types.DynamicByReferenceValue.prototype = new DynamicByReferenceValue();
values_module.types.DynamicByReferenceValue.constructor = values_module.types.DynamicByReferenceValue;

module.exports = values_module;
