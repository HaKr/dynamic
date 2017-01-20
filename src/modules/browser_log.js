var
	dynamic_utils = require('./dynamic-utils');


function Log() {
	this.hasConsole = (typeof console === "object" && typeof console.log !== "undefined");
	this.muted = false;
	this.instances = {};
	this.Levels = {
		OFF: 99,
		ERROR: 7,
		WARNING: 5,
		// VISUAL: 3,
		INFO: 1,
		DEBUG: -1
	};
	this.default_level = this.Levels.OFF;

	this.Targets = this.hasConsole ? {
		ERROR: {
			treshold: this.Levels.ERROR,
			target: console.error
		},
		WARNING: {
			treshold: this.Levels.WARNING,
			target: console.warn
		},
		INFO: {
			treshold: this.Levels.INFO,
			target: console.info
		},
		DEBUG: {
			treshold: this.Levels.DEBUG,
			// if there's no console.debug object (i.e. IE8), let's use the console.info,
			// as that's the next log level.
			target: (typeof console === "object" && typeof console.debug === "function") ? console.debug : console.info
		}
	} : {};

}

function LogInstance(name) {
	this.name = name;
	this.log_level = LogModule.Levels.default_level;

	Object.defineProperty(this, 'module', {
		get: function() {
			return this.get_module();
		}
	});
}


Log.prototype.mute = function(onoff) {
	if (typeof onoff !== "boolean") {
		onoff = false;
	}
	var result = this.muted;

	this.muted = onoff;

	return result;
};

Log.prototype.get_logger = function(name) {
	var result = null;

	name = dynamic_utils.htmlID2OptionCase( name );

	if (this.instances.hasOwnProperty(name)) {
		result = this.instances[name];
	} else {
		result = new LogInstance(name);
		this.instances[name] = result;
	}

	return result;
};

Log.prototype.configure = function(levels) {
	var self = this;

	Object.keys(levels).forEach(function(level) {
		var logger = self.get_logger(level);
		logger.log_level = levels[level];
	}, this);
};

Log.prototype.to_console = function(target, log_instance, params) {
	if (!this.muted) {
		if (typeof target === "object" && target.treshold >= log_instance.log_level) {
			var args = Array.prototype.slice.call(params); //dynamic_utils.make_array( params );
			if (typeof args[0] === "function") {
				var 
					callback = args[0],
					thisArg  = args.length>1 ? args[1] : null
				;

				if (thisArg === null){
					callback();
				} else {
					callback.call( thisArg );
				}
			} else {
				var console_target = target.target;
				if (typeof console_target.apply === "function") {
					args = ['[' + log_instance.name + ']'].concat(args);
					console_target.apply(console, args);
				} else {
					var msg = args[0];
					var parm1 = args.length > 1 ? args[1] : "",
						parm2 = args.length > 2 ? args[2] : "",
						parm3 = args.length > 3 ? args[3] : "";

					console_target(msg, '[' + log_instance.name + ']', parm1, parm2, parm3);
				}
			}
		}
	}
};

Log.prototype.set_default_level = function( default_level ) {
	var self = this;

	Object.keys(this.instances).forEach(function( logger_name ) {
		this.instances[logger_name].log_level = default_level;
	}, this);

	this.default_level = default_level;
};


LogInstance.prototype.get_module = function() {
	return LogModule;
};

LogInstance.prototype.debug = function() {
	LogModule.to_console(LogModule.Targets.DEBUG, this, arguments);
};

LogInstance.prototype.error = function() {
	LogModule.to_console(LogModule.Targets.ERROR, this, arguments);
};

LogInstance.prototype.info = function() {
	LogModule.to_console(LogModule.Targets.INFO, this, arguments);
};

LogInstance.prototype.warning = function() {
	LogModule.to_console(LogModule.Targets.WARNING, this, arguments);
};
LogInstance.prototype.warn = LogInstance.prototype.warning;

var LogModule = new Log();

module.exports = LogModule;
