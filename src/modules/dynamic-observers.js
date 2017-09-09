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
		ValueObserver: ValueObserver,
		ValueReference: ValueReference
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
		create_value_observer: function create_value_observer( reference, template_instance, observer, ref_object ) {
			return new dynamic_observers.types.ValueObserver( reference, template_instance, observer, ref_object );
		},
		create_dynamic_value_reference: function create_dynamic_value_reference( reference, template_instance, observer, ref_object ) {
			var result = new dynamic_observers.types.ValueReference().init( template_instance );
			result.on_change( observer, ref_object );
			result.set_initial_text( reference );

			return result;
		},
		create_dynamic_value_dereference: function create_dynamic_value_dereference( reference, template_instance, observer, ref_object ) {
			var result = new dynamic_observers.types.ValueReference().init( template_instance );
			result.on_value_change( observer, ref_object );
			result.set_initial_text( reference );

			return result;
		}
	}
};

var
	dynamic_dom = require('./dynamic-dom.js'),
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

function LiteralPart(text) {
	this.text = text;
}

LiteralPart.prototype.get_text = function() {
	return this.text;
};

LiteralPart.prototype.remove = function() {
// nothing to cleanup
	return;
};

function DynamicPart(value, binding_observer) {
	this.dynamic_value = value;
	this.delegate_value = null;
	this.binding_observer = binding_observer;
	this.text = value.get_final().get_text();

	var self = this;

	this.value_observer = this.dynamic_value.observe('binding', function update_binding(the_value) {
		self.text = the_value.get_text();
		self.binding_observer.set_text_content();

		if (the_value !== self.dynamic_value && self.delegate_value !== the_value) {
			logger.debug('Dynamic part updated by reference', self);
			self.delegate_value = the_value;
			if (typeof self.delegate_observer !== "undefined" && self.delegate_observer !== null) {
				logger.debug('Dynamic part removing reference observer', self.delegate_observer);
				self.delegate_observer.remove();
			}
			self.delegate_observer = self.delegate_value.observe('delegated binding', function update_binding_by_delegate(dv) {
				logger.debug('Dynamic part updating binding by reference', self, dv);
				self.text = dv.get_text();
				self.binding_observer.set_text_content();
			}, self);

			if (typeof self.binding_observer.instance !== "undefined") {
				self.binding_observer.instance.add_observer(self.delegate_observer);
			} else {
				logger.error('binding observer instance undefined', self);
			}
		}
	}, this);

	if (typeof this.binding_observer.instance !== "undefined") {
		this.binding_observer.instance.add_observer(this.value_observer);
	}
}

DynamicPart.prototype.remove = function() {
	if (typeof this.delegate_observer !== "undefined" && this.delegate_observer !== null) {
		this.delegate_observer.remove();
		this.delegate_observer = null;
	}
	if (typeof this.value_observer !== "undefined" && this.value_observer !== null) {
		this.value_observer.remove();
		this.value_observer = null;
	}
};

DynamicPart.prototype.get_text = LiteralPart.prototype.get_text;

function DeferredPart( value_ref, binding_observer ) {
	if ( typeof value_ref === 'string'){
		this.text = '';
		this.binding_observer = binding_observer;
		this.deferred_observer = null;

		this.dynamic_value = null;
		var self = this;
																								//reference, template_instance, observer, ref_object
		this.deferred_observer = dynamic_observers.api.create_value_observer( value_ref, binding_observer.instance, function( trigger_value ){
			if ( self.dynamic_value !== trigger_value ){
				self.set_deferred_value( trigger_value );
			}
		}, this );
	}
}

DeferredPart.prototype.do_set_deferred_value = function(){
	this.text = this.dynamic_value.name;
	this.binding_observer.set_text_content();
};

DeferredPart.prototype.set_deferred_value = function( deferred_value ){
	var self = this;
	if (this.deferred_observer !== null){
		this.deferred_observer.remove();
	}
	this.dynamic_value = deferred_value;
	this.do_set_deferred_value();
};

DeferredPart.prototype.remove = function(){
	if (this.deferred_observer !== null){
		this.deferred_observer.remove();
	}
};

DeferredPart.prototype.get_text = LiteralPart.prototype.get_text;

function DeferredTextPart( value_ref, binding_observer ){
	DeferredPart.call( this, value_ref, binding_observer );
}

DeferredTextPart.prototype = new DeferredPart();
DeferredTextPart.constructor = DeferredTextPart;

DeferredTextPart.prototype.do_set_deferred_value = function(){
	this.text = this.dynamic_value.value;
	this.binding_observer.set_text_content();
};

function BindingObserver() {}

BindingObserver.prototype.register = function(template_instance) {
	this.instance = template_instance;
	this.parts = [];

	this.add_parts();
};

BindingObserver.prototype.remove = function() {
	this.remove_parts();
};

BindingObserver.prototype.remove_parts = function() {
	this.parts.forEach( function remove_part( part ){
		part.remove();
	} );
	this.parts = [];
};

BindingObserver.prototype.add_literal = function(text) {
	this.parts.push(new LiteralPart(text));
};

BindingObserver.prototype.add_dynamic = function(dynamic_value) {
	this.parts.push(new DynamicPart(dynamic_value, this));
};

BindingObserver.prototype.add_deferred = function(dynamic_value_ref) {
	this.parts.push(new DeferredPart(dynamic_value_ref, this));
};

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

BindingObserver.prototype.add_parts = function() {
	var test_value = this.original;
	var parser = new VarRefParser( this.original );
	var index = 0;

	parser.parts.forEach( function( part ){
		var left_part = this.original.substring( index, part.open );
		if (left_part.length > 0 ){
			this.add_literal(left_part);
		}
		var value_name = this.original.substring( part.open + api_keywords.symbols.reference_start.length, part.close );
		if ( dynamic_observers.api.contains_binding( value_name ) ){
			this.add_deferred( value_name );
		} else {
			var dynamic_value = this.instance.get_dynamic_value(value_name);
			this.instance.add_value(dynamic_value);
			this.add_dynamic(dynamic_value);
		}
		index = part.close + api_keywords.symbols.reference_end.length;
	}, this );

	var right_part = test_value.slice( index );

	if (right_part.length > 0) {
		this.add_literal(right_part);
	}

	this.set_text_content();
};

BindingObserver.prototype.set_text_content = function(){
	var result = '';
	this.complete = true;

	this.parts.forEach(function(part) {
		var part_text = part.get_text();
		if (part_text.length > 0) {
			result += part.get_text();
		} else {
			this.complete = false;
		}
	}, this);

	if (this.complete){
		result = result.trim();
	}

	if (this.content !== result){
		this.content = result;
		this.notify_content();
	}
};

function TextObserver(text_node, template_instance) {
	this.text_node = text_node;
	this.dynamic_text = new DynamicText().init( template_instance );
	this.dynamic_text.on_change( this.notify_content, this );
	this.dynamic_text.initial_text = text_node.textContent;

	// this.register(template_instance);
}

// TextObserver.prototype = new BindingObserver();
// TextObserver.constructor = TextObserver;
//
TextObserver.prototype.notify_content = function() {
	this.text_node.textContent = this.dynamic_text.get_text();
};

TextObserver.prototype.remove = function() {
	this.dynamic_text.destroy();
};

//
// TextObserver.prototype.add_deferred = function(dynamic_value_ref) {
// 	this.parts.push(new DeferredTextPart(dynamic_value_ref, this));
// };
//


function ValueObserver(reference, template_instance, observer, ref_object) {
	this.reference = reference;
	this.original = reference;
	this.value_observer = observer;
	this.ref_object = ref_object;
	this.instance = template_instance;
	this.parts = [];
	this._dynamic_value = null;
	this.observer = null;

	Object.defineProperty( this, 'dynamic_value', {
		get: function(){ return this._dynamic_value; }
	});
	this.defer_or_hook( reference );
}

ValueObserver.prototype = new BindingObserver();
ValueObserver.constructor = ValueObserver;

ValueObserver.prototype.notify_content = function() {
	this.unhook();
	if (this.complete){
		if (this.content.length>0) {
			this.defer_or_hook( this.content );
		}
	}
};

ValueObserver.prototype.remove = function() {
	this.unhook();
};

ValueObserver.prototype.unhook = function() {
	if (this.observer !== null){
		logger.debug( "ValueObserver::Unobserve " + this._dynamic_value.name+ " for "+this.original );
		this.observer.remove();
		this.observer = null;
		this._dynamic_value = null;
	}
};

ValueObserver.prototype.hook = function() {
	var dynamic_value = this.instance.get_dynamic_value(this.reference);
	if ( this._dynamic_value !== dynamic_value ){
		this._dynamic_value = dynamic_value;
		this.value_observer.call( null, this._dynamic_value );
	}
};

ValueObserver.prototype.defer_or_hook = function( ref ) {
	this.reference = ref;
	if ( dynamic_observers.api.contains_binding( this.reference )){
		logger.debug( "ValueObserver::Defer for "+this.reference );
		this.add_parts();
	} else {
		this.hook();
	}
};

function AttributeObserver(element, attribute_name, template_instance) {
	this.element = element;
	this.attribute_name = attribute_name;
	this.original = this.element.getAttribute(attribute_name);
	this.element.removeAttribute(attribute_name);

	this.register(template_instance);
}

AttributeObserver.prototype = new BindingObserver();
AttributeObserver.constructor = AttributeObserver;

AttributeObserver.prototype.notify_content = function() {
	if (this.content.length>0) {
		this.element.setAttribute(this.attribute_name, this.content);
	} else {
		this.element.removeAttribute( this.attribute_name);
	}
};

function DynamicText$base(){
}

// cwd: $[cwd]]
DynamicText$base.prototype.init = function( parent_instance ){
	this.original = '';
	this.on_change_callback = null;
	this.value = '';
	this.parts = [];
	this.only_notify_when_complete = false;
	this.instance = parent_instance;

	var self = this;

	Object.defineProperty( this, 'initial_text', {
		get: function() { return self.original; },
		set: function(t) { self.set_initial_text( t ); }
	});

	return this;
};

DynamicText$base.prototype.destroy = function(){
	this.value = null;
	this.on_change = null;
	this.parts.forEach( function( part ){
		part.destroy();
	});
};

DynamicText$base.prototype.set_initial_text = function( t ){
	this.original = t;
	this.add_parts();
};

DynamicText$base.prototype.on_change = function( callback, this_arg ){
	this.on_change_callback = callback;
	this.this_arg = this_arg;
};

DynamicText$base.prototype.on_value_change = function( callback, this_arg ){
};

DynamicText$base.prototype.notify = function(){
	if ( !this.only_notify_when_complete || this.complete ){
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
};


ValueReference.prototype.update_reference = function( v ){
	this.value_name = v;
	this.dynamic_value = this.instance.get_dynamic_value( this.value_name );
	if (typeof this.on_value_change_callback === 'function' ){
		this.on_value_change_callback.call( this.this_arg, this.dynamic_value );
	} else {
		this.attach();
	}
};

ValueReference.prototype.add_parts = function(){
	this.dynamic_text = new DynamicText().init( this.instance );

	this.dynamic_text.only_notify_when_complete = true;
	this.dynamic_text.on_change( this.update_reference, this );
	this.dynamic_text.initial_text = this.original;
};

ValueReference.prototype.update_value = function( ){
	this.set_value( this.dynamic_value.get_text() );
};

ValueReference.prototype.attach = function( ){
	this.detach();
	var self = this;

	this.observer = this.dynamic_value.observe( 'value_reference', function update_through_reference( dv ){
		self.update_value( );
	}, this );
	if (this.dynamic_value.state === dynamic_values.STATE.DEFINED || this.dynamic_value.state === dynamic_values.STATE.ASSIGNED ){
  		logger.debug('ValueReference::CallObserver for ' + this.dynamic_value.name + ' (state=' + this.dynamic_value.state + ')');
		this.update_value();
	}
};

ValueReference.prototype.detach = function(){
	if ( this.observer !== null ){
		this.observer.remove();
		this.observer = null;
	}
};

ValueReference.prototype.destroy = function(){
	this.detach();

	DynamicText$base.prototype.destroy.call( this );
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
