var
	dynamic_dom = require('./dynamic-dom.js'),
	dynamic_utils = require('./dynamic-utils'),
	values_module = require('./dynamic-values.js'),
	templates_module = require('./dynamic-templates.js'),
	observer_module = require('./dynamic-observers.js'),
	formula_module = require('./dynamic-formulas.js'),
	dynamic_app_module = require('./dynamic-app.js'),
	dynamic_rest_module = require('./dynamic-rest.js'),
	logger = require('./browser_log').get_logger(dynamic_app_module.info.Name),
	event_emmitter_module = require('event-emitter');

function DynamicApp() {
	this.modules = {
		values: values_module,
		templates: templates_module,
		dom: dynamic_dom,
		rest: dynamic_rest_module
	};

	var self = this;
	dynamic_app_module.before_run = function() {
		self.before_run();
	};
	Object.defineProperty( this, 'observer_count', {
		enumerable: true,
		get: function(){ return Object.keys(this.modules.values.vars.observers).length; }
	});
}

DynamicApp.prototype.before_run = function() {
	var self = this;

	logger.debug(function() {
		self.components = dynamic_app_module.vars.components;

		self.definitions = templates_module.vars.definitions;
		self.placeholders = templates_module.vars.placeholders;
		self.instances = templates_module.vars.instances;

		self.observers = values_module.vars.observers;
		self.values = values_module.vars.values;
		self.aliases = values_module.vars.aliases;

		self.controls = dynamic_app_module.vars.controls;
	});

};

// event_emmitter_module( DynamicApp.prototype );

DynamicApp.prototype.$ = function(value_name) {
	return this.get_dynamic_value(value_name);
};

DynamicApp.prototype.$$ = function(value_name) {
	return this.get_dynamic_value(value_name).value;
};

DynamicApp.prototype.register_component = dynamic_app_module.register_component;
DynamicApp.prototype.connect_channel = dynamic_app_module.connect_channel;

DynamicApp.prototype.get_template = templates_module.get_template_by_name;

DynamicApp.prototype.get_logger = function(log_name) {
	return logger.module.get_logger(log_name);
};

DynamicApp.prototype.get_dynamic_value = function(value_name) {
	var
		result = values_module.get_by_name(value_name);

	logger.debug(function may_create() {
		result = values_module.get_or_define(value_name);
	});

	return result;
};

window.$dynamic = new DynamicApp();

module.exports = window.$dynamic;
