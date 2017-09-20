var dynamic_observers = {
	info: {
		Name: "Dynamic observers",
		Description: "Watch for value changes and update text and attributes.",
		Version: "1.01.1"
	},
	vars: {},
	types: {
		TextObserver: TextObserver,
		AttributeObserver: AttributeObserver,
		ValueReference: ValueReference,
		DynamicText: DynamicText
	},
	api: {
		contains_binding: function contains_binding(text) {
			return text.indexOf( api_keywords.symbols.reference_start ) > -1;
		},
		create_text_observer: function create_text_observer(node, instance) {
			return new dynamic_observers.types.TextObserver(node, instance);
		},
		create_attribute_observer: function create_attribute_observer(node, attribute_name, instance) {
			return new dynamic_observers.types.AttributeObserver(node, attribute_name, instance);
		},
		create_dynamic_text_reference: function create_dynamic_text_reference( reference, template_instance, observer, ref_object, only_notify_when_complete ) {
			if (typeof only_notify_when_complete !== 'boolean' ){
				only_notify_when_complete = false;
			}
			return new dynamic_observers.types.DynamicText()
				.init( template_instance, only_notify_when_complete )
				.on_change( observer, ref_object )
				.set_initial_text( reference )
			;
		},
		create_dynamic_value_reference: function create_dynamic_value_reference( reference, template_instance, value_observer, observer, ref_object ) {
			return new dynamic_observers.types.ValueReference()
				.init( template_instance )
				.on_change( observer, ref_object )
				.on_value_change( value_observer, ref_object )
				.set_initial_text( reference )
			;
		}
	}
};

var
	dynamic_utils = require('./dynamic-utils'),
	dynamic_values = require('./dynamic-values.js'),
	api_keywords = require('./dynamic-api_keywords.js'),
	logger = require('./browser_log').get_logger(dynamic_observers.info.Name);

module.exports = dynamic_observers.api;

// logger.debug( function() {
dynamic_observers.api.find_observer = function(text) {
	var obs = dynamic_app.vars.binding_observers.find(function(binding_observer) {
		return binding_observer.original === api_keywords.symbols.reference_start + text + api_keywords.symbols.reference_start;
	});

	logger.debug('Observer', obs);
};
// });

function VarRefParser( text_value ){
	this.text_value = text_value;
	this.parts = [];
	this.parse();
}

VarRefParser.prototype.find_brackets = function( text_value, bracket ){
	var result = [];

	var bracket_index = text_value.indexOf( bracket );

	while (bracket_index > -1){
		result.push( bracket_index );
		bracket_index = text_value.indexOf( bracket, bracket_index + api_keywords.symbols.reference_start.length );
	}

	return result;
};

// z{{ByCx{{Dw{{E}}v{{F}}}}u{{G}}}}t{{H}}s
// 000000000011111111112222222222333333333
// 012345678901234567890123456789012345678

// open = 01, 07, 11, 17, 25, 33
// close= 14, 20, 22, 28, 30, 36

// match:  11, 14; 17, 20; 07, 22; 25, 28; 01, 30; 33, 36
// sorted: 33, 36; 01, 30; 25, 28; 07, 22; 17, 20; 11, 14
// sorted: 01, 30; 07, 22; 11, 14; 17, 20; 25, 28; 33, 36

VarRefParser.prototype.match_pairs = function( open_indices, close_indices ){
	var open_index, close_index;
	var result = [];

	while ( close_indices.length > 0 ){
		close_index = close_indices.shift();
		open_index = -1;
		var oi;
		for (oi=0; oi<open_indices.length && open_indices[ oi ] < close_index; oi++){
			// open_index = open_indices[ oi ];
		}
		oi--;
		result.push( { open: open_indices[ oi ], close: close_index } );
		open_indices.splice( oi, 1 );
	}

	var compare = null;
	return result.sort( function compareCloseIndices( a, b ){
		return a.open - b.open;
	} ).filter( function( ix ){
		var result = true;

		if ( compare === null){
			compare = ix;
		} else {
			result = ix.close > compare.close;
			if (result){
				compare = ix;
			}
		}

		return result;
	});
};

VarRefParser.prototype.parse = function(){
	var remaining = this.text_value;
	var open_indices = this.find_brackets( remaining, api_keywords.symbols.reference_start );
	if ( open_indices.length > 0 ){
		var close_indices = this.find_brackets( remaining, api_keywords.symbols.reference_end );
		this.parts = this.match_pairs( open_indices, close_indices );
	}

	return this;
};

function TextObserver(text_node, template_instance) {
	this.text_node = text_node;
	this.dynamic_text = dynamic_observers.api.create_dynamic_text_reference( text_node.textContent, template_instance, this.notify_content, this, false );
}

TextObserver.prototype.notify_content = function( content ) {
	this.text_node.textContent = content;
};

TextObserver.prototype.remove = function() {
	this.dynamic_text.remove();
};

function AttributeObserver(element, attribute_name, template_instance) {
	this.element = element;
	this.attribute_name = attribute_name;
	// this.element.removeAttribute(attribute_name);

	this.dynamic_text = dynamic_observers.api.create_dynamic_text_reference( this.element.getAttribute(attribute_name), template_instance, this.notify_content, this, false );
}

AttributeObserver.prototype.notify_content = function( content ) {
	if (content.length>0) {
		this.element.setAttribute(this.attribute_name, content);
	} else {
		this.element.removeAttribute( this.attribute_name );
	}
};

AttributeObserver.prototype.remove = function() {
	this.dynamic_text.remove();
};

function DynamicText$base(){
}

// cwd: $[cwd]]
DynamicText$base.prototype.init = function( parent_instance, only_notify_when_complete ){
	this.original = '';
	this.on_change_callback = null;
	this.value = '';
	this.parts = [];
	this.only_notify_when_complete = only_notify_when_complete;
	this.instance = parent_instance;

	var self = this;

	Object.defineProperty( this, 'initial_text', {
		get: function() { return self.original; },
		set: function(t) { self.set_initial_text( t ); }
	});

	return this;
};

DynamicText$base.prototype.remove = function(){
	this.removed = { cb: this.on_change_callback, vcb: this.on_value_change_callback, v: this.value, ref: this.this_arg };

	this.value = null;
	this.on_change_callback = null;
	this.this_arg = null;

	this.parts.forEach( function( part ){
		part.remove();
	});
};

DynamicText$base.prototype.set_initial_text = function( t ){
	this.original = t;
	this.add_parts();

	return this;
};

DynamicText$base.prototype.on_change = function( callback, this_arg ){
	this.on_change_callback = callback;
	this.this_arg = this_arg;

	return this;
};

DynamicText$base.prototype.on_value_change = function( callback, this_arg ){
	return this;
};

DynamicText$base.prototype.notify = function(){
	if ( (!this.only_notify_when_complete || this.complete) && typeof this.on_change_callback === 'function' ){
		this.on_change_callback.call( this.this_arg, this.value );
	}
};

DynamicText$base.prototype.set_value = function( new_value ){
	if (this.value !== new_value){
		this.value = new_value;
		this.notify();
	}
};

DynamicText$base.prototype.add_literal = function( literal_text ){
	if ( literal_text.length > 0 ){
		var part = new LiteralText().init( this.instance );

		part.initial_text = literal_text;
		this.parts.push( part );
	}
};

DynamicText$base.prototype.add_value_reference = function( value_reference ){
	if ( value_reference.length > 0 ){
		var part = new ValueReference().init( this.instance );
		this.parts.push( part );
		part.on_change( this.construct, this );
		part.initial_text = value_reference;
	}
};

DynamicText$base.prototype.add_parts = function(){
};

DynamicText$base.prototype.construct = function(){
	var result = '';
	this.complete = true;

	this.parts.forEach(function(part) {
		var part_text = part.get_text();
		if (part_text.length > 0) {
			result += part_text;
		} else {
			this.complete = false;
		}
	}, this);

	if (this.complete){
		result = result.trim();
	}

	this.set_value( result );
};

function LiteralText(){
}

LiteralText.prototype = new DynamicText$base();
LiteralText.constructor = LiteralText;

LiteralText.prototype.get_text = function(){
	return this.original;
};

function ValueReference(){
}
ValueReference.prototype = new DynamicText$base();
ValueReference.constructor = ValueReference;

ValueReference.prototype.get_text = function(){
	var result = '';

	if (this.dynamic_value !== null){
		result = this.dynamic_value.get_text();
	}

	return result;
};

ValueReference.prototype.init = function( parent_instance ){
	DynamicText$base.prototype.init.call( this, parent_instance );

	this.value_name = '';
	this.dynamic_value = null;
	this.observer = null;
	this.on_value_change_callback = null;

	return this;
};

ValueReference.prototype.on_value_change = function( callback, this_arg ){
	this.on_value_change_callback = callback;
	this.this_arg = this_arg;

	return this;
};


ValueReference.prototype.update_reference = function( v ){
	this.value_name = v;
	if (this.instance !== null){
		this.dynamic_value = this.instance.get_dynamic_value( this.value_name );
	} else {
		this.dynamic_value = dynamic_values.get_or_define( this.value_name );
	}
	if (typeof this.on_value_change_callback === 'function' ){
		this.on_value_change_callback.call( this.this_arg, this.dynamic_value );
	}
	this.attach();
};

ValueReference.prototype.add_parts = function(){
	this.dynamic_text = dynamic_observers.api.create_dynamic_text_reference( this.original, this.instance, this.update_reference, this, true );
};

ValueReference.prototype.update_value = function( ){
	this.set_value( this.dynamic_value.value );
};

ValueReference.prototype.attach = function( ){
	this.detach();
	var self = this;

	this.observer = this.dynamic_value.observe( 'value_reference', this.update_value, this );
	if (typeof this.on_value_change_callback === 'function' ){
		if (this.dynamic_value.state === dynamic_values.STATE.DEFINED || this.dynamic_value.state === dynamic_values.STATE.ASSIGNED ){
	  		logger.debug('ValueReference::CallObserver for ' + this.dynamic_value.name + ' (state=' + this.dynamic_value.state + ')');
			this.update_value();
		}
	}
};

ValueReference.prototype.detach = function(){
	if ( this.observer !== null ){
		this.observer.remove();
		this.observer = null;
	}
};

ValueReference.prototype.remove = function(){
	this.detach();
	this.on_value_change_callback = null;
	this.dynamic_text.remove();

	DynamicText$base.prototype.remove.call( this );
};

function DynamicText(){
}

DynamicText.prototype = new DynamicText$base();
DynamicText.constructor = DynamicText;

DynamicText.prototype.add_parts = function() {
	var test_value = this.original;
	var parser = new VarRefParser( this.original );
	var index = 0;

	parser.parts.forEach( function( part ){
		this.add_literal( this.original.substring( index, part.open ) );

		// if ( dynamic_observers.api.contains_binding( value_name ) ){
		this.add_value_reference( this.original.substring( part.open + api_keywords.symbols.reference_start.length, part.close ) );

		index = part.close + api_keywords.symbols.reference_end.length;
	}, this );

	this.add_literal( test_value.slice( index ) );

	this.construct();
};

DynamicText.prototype.get_text = function(){
	return this.value;
};
