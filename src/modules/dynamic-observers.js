var dynamic_observers = {
	info: {
		Name: "Dynamic observers",
		Description: "Watch for value changes and update text and attributes.",
		Version: "1.01.1"
	},
	vars: {
	},
	types: {
		TextObserver: TextObserver,
		AttributeObserver: AttributeObserver
	},
	api: {
		contains_binding: function contains_binding( text ){
			return binding_finder.test( text )
		},
		create_text_observer: function create_text_observer( node, instance ){
			return new dynamic_observers.types.TextObserver( node, instance );
		},
		create_attribute_observer: function create_attribute_observer( node, attribute_name, instance ){
			return new dynamic_observers.types.AttributeObserver( node, attribute_name, instance );
		},

	}
};

var
	dynamic_dom = require('./dynamic-dom.js'),
	dynamic_utils = require('./dynamic-utils'),
	value_module = require('./dynamic-values.js'),
	logger = require('./browser_log').get_logger(dynamic_observers.info.Name)
;

module.exports = dynamic_observers.api;

// logger.debug( function() {
dynamic_observers.api.find_observer = function(text) {
	var obs = dynamic_app.vars.binding_observers.find(function(binding_observer) {
		return binding_observer.original === '{{' + text + '}}';
	});

	logger.debug('Observer', obs);
};
// });

var
	binding_re = /{{([^}]+)}}/g,
	bind_pattern = '{{([^}]+?)}}',
	binding_finder = new RegExp(bind_pattern),
	binding_replacer = new RegExp(bind_pattern, 'g');


function LiteralPart(text) {
	this.text = text;
}

LiteralPart.prototype.get_text = function() {
	return this.text;
};

function DynamicPart( value, binding_observer ) {
	this.dynamic_value = value;
	this.delegate_value = null;
	this.binding_observer = binding_observer;
	this.text = value.get_final().get_text();

	var self = this;

	this.value_observer = this.dynamic_value.observe( 'binding', function update_binding(the_value) {
		self.text = the_value.get_text();
		self.binding_observer.set_text_content();

		if (the_value !== self.dynamic_value && self.delegate_value !== the_value) {
			logger.debug('Dynamic part updated by reference', self);
			self.delegate_value = the_value;
			if (typeof self.delegate_observer !== "undefined" && self.delegate_observer !== null ) {
				logger.debug('Dynamic part removing reference observer', self.delegate_observer);
				self.delegate_observer.remove();
			}
			self.delegate_observer = self.delegate_value.observe( 'delegated binding', function update_binding_by_delegate(dv) {
				logger.debug('Dynamic part updating binding by reference', self, dv);
				self.text = dv.get_text();
				self.binding_observer.set_text_content();
			}, self );

			if (typeof self.binding_observer.instance !== "undefined") {
				self.binding_observer.instance.add_observer(self.delegate_observer);
			} else {
				logger.error( 'binding observer instance undefined', self );
			}
		}
	}, this);

	if (typeof this.binding_observer.instance !== "undefined") {
		this.binding_observer.instance.add_observer(this.value_observer);
	}
}

DynamicPart.prototype.get_text = LiteralPart.prototype.get_text;

function BindingObserver() {}

BindingObserver.prototype.register = function(template_instance) {
	this.instance = template_instance;
	this.parts = [];

	this.add_parts();
};

BindingObserver.prototype.add_literal = function(text) {
	this.parts.push(new LiteralPart(text));
};

BindingObserver.prototype.add_dynamic = function(dynamic_value) {
	this.parts.push(new DynamicPart( dynamic_value, this ));
};

BindingObserver.prototype.add_parts = function() {
	var test_value = this.original;
	while (binding_finder.test(test_value)) {
		var match = test_value.match(binding_finder);
		var whole_part = match[0];
		var value_name = match[1];
		var part_start = test_value.indexOf(whole_part);
		if (part_start > 0) {
			var left_part = test_value.substring(0, part_start);
			this.add_literal(left_part);
		}
		var dynamic_value = this.instance.get_dynamic_value( value_name );
		this.instance.add_value(dynamic_value);
		this.add_dynamic(dynamic_value);

		var right_part = test_value.substring(part_start + whole_part.length);
		test_value = right_part;
	}

	if (test_value.length > 0) {
		this.add_literal(test_value);
	}

	this.set_text_content();
};

function TextObserver(text_node, template_instance) {
	this.text_node = text_node;
	this.original = text_node.textContent;

	this.register(template_instance);
}

TextObserver.prototype = new BindingObserver();
TextObserver.constructor = TextObserver;

TextObserver.prototype.set_text_content = function() {
	var result = '';
	this.parts.forEach(function(part) {
		result += part.get_text();
	});
	this.text_node.textContent = result.trim();
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

AttributeObserver.prototype.set_text_content = function() {
	var
		result = '',
		complete = true;
	this.parts.forEach(function(part) {
		var part_text = part.get_text();
		if (part_text.length > 0) {
			result += part.get_text();
		} else {
			complete = false;
		}
	});
	if (complete) {
		this.element.setAttribute( this.attribute_name, result.trim() );
	}
};

