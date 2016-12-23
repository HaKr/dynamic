(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var d        = require('d')
  , callable = require('es5-ext/object/valid-callable')

  , apply = Function.prototype.apply, call = Function.prototype.call
  , create = Object.create, defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , descriptor = { configurable: true, enumerable: false, writable: true }

  , on, once, off, emit, methods, descriptors, base;

on = function (type, listener) {
	var data;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) {
		data = descriptor.value = create(null);
		defineProperty(this, '__ee__', descriptor);
		descriptor.value = null;
	} else {
		data = this.__ee__;
	}
	if (!data[type]) data[type] = listener;
	else if (typeof data[type] === 'object') data[type].push(listener);
	else data[type] = [data[type], listener];

	return this;
};

once = function (type, listener) {
	var once, self;

	callable(listener);
	self = this;
	on.call(this, type, once = function () {
		off.call(self, type, once);
		apply.call(listener, this, arguments);
	});

	once.__eeOnceListener__ = listener;
	return this;
};

off = function (type, listener) {
	var data, listeners, candidate, i;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) return this;
	data = this.__ee__;
	if (!data[type]) return this;
	listeners = data[type];

	if (typeof listeners === 'object') {
		for (i = 0; (candidate = listeners[i]); ++i) {
			if ((candidate === listener) ||
					(candidate.__eeOnceListener__ === listener)) {
				if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
				else listeners.splice(i, 1);
			}
		}
	} else {
		if ((listeners === listener) ||
				(listeners.__eeOnceListener__ === listener)) {
			delete data[type];
		}
	}

	return this;
};

emit = function (type) {
	var i, l, listener, listeners, args;

	if (!hasOwnProperty.call(this, '__ee__')) return;
	listeners = this.__ee__[type];
	if (!listeners) return;

	if (typeof listeners === 'object') {
		l = arguments.length;
		args = new Array(l - 1);
		for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

		listeners = listeners.slice();
		for (i = 0; (listener = listeners[i]); ++i) {
			apply.call(listener, this, args);
		}
	} else {
		switch (arguments.length) {
		case 1:
			call.call(listeners, this);
			break;
		case 2:
			call.call(listeners, this, arguments[1]);
			break;
		case 3:
			call.call(listeners, this, arguments[1], arguments[2]);
			break;
		default:
			l = arguments.length;
			args = new Array(l - 1);
			for (i = 1; i < l; ++i) {
				args[i - 1] = arguments[i];
			}
			apply.call(listeners, this, args);
		}
	}
};

methods = {
	on: on,
	once: once,
	off: off,
	emit: emit
};

descriptors = {
	on: d(on),
	once: d(once),
	off: d(off),
	emit: d(emit)
};

base = defineProperties({}, descriptors);

module.exports = exports = function (o) {
	return (o == null) ? create(base) : defineProperties(Object(o), descriptors);
};
exports.methods = methods;

},{"d":2,"es5-ext/object/valid-callable":11}],2:[function(require,module,exports){
'use strict';

var assign        = require('es5-ext/object/assign')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , isCallable    = require('es5-ext/object/is-callable')
  , contains      = require('es5-ext/string/#/contains')

  , d;

d = module.exports = function (dscr, value/*, options*/) {
	var c, e, w, options, desc;
	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
		options = value;
		value = dscr;
		dscr = null;
	} else {
		options = arguments[2];
	}
	if (dscr == null) {
		c = w = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
		w = contains.call(dscr, 'w');
	}

	desc = { value: value, configurable: c, enumerable: e, writable: w };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

d.gs = function (dscr, get, set/*, options*/) {
	var c, e, options, desc;
	if (typeof dscr !== 'string') {
		options = set;
		set = get;
		get = dscr;
		dscr = null;
	} else {
		options = arguments[3];
	}
	if (get == null) {
		get = undefined;
	} else if (!isCallable(get)) {
		options = get;
		get = set = undefined;
	} else if (set == null) {
		set = undefined;
	} else if (!isCallable(set)) {
		options = set;
		set = undefined;
	}
	if (dscr == null) {
		c = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
	}

	desc = { get: get, set: set, configurable: c, enumerable: e };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

},{"es5-ext/object/assign":3,"es5-ext/object/is-callable":6,"es5-ext/object/normalize-options":10,"es5-ext/string/#/contains":13}],3:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.assign
	: require('./shim');

},{"./is-implemented":4,"./shim":5}],4:[function(require,module,exports){
'use strict';

module.exports = function () {
	var assign = Object.assign, obj;
	if (typeof assign !== 'function') return false;
	obj = { foo: 'raz' };
	assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
	return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
};

},{}],5:[function(require,module,exports){
'use strict';

var keys  = require('../keys')
  , value = require('../valid-value')

  , max = Math.max;

module.exports = function (dest, src/*, …srcn*/) {
	var error, i, l = max(arguments.length, 2), assign;
	dest = Object(value(dest));
	assign = function (key) {
		try { dest[key] = src[key]; } catch (e) {
			if (!error) error = e;
		}
	};
	for (i = 1; i < l; ++i) {
		src = arguments[i];
		keys(src).forEach(assign);
	}
	if (error !== undefined) throw error;
	return dest;
};

},{"../keys":7,"../valid-value":12}],6:[function(require,module,exports){
// Deprecated

'use strict';

module.exports = function (obj) { return typeof obj === 'function'; };

},{}],7:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.keys
	: require('./shim');

},{"./is-implemented":8,"./shim":9}],8:[function(require,module,exports){
'use strict';

module.exports = function () {
	try {
		Object.keys('primitive');
		return true;
	} catch (e) { return false; }
};

},{}],9:[function(require,module,exports){
'use strict';

var keys = Object.keys;

module.exports = function (object) {
	return keys(object == null ? object : Object(object));
};

},{}],10:[function(require,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

var process = function (src, obj) {
	var key;
	for (key in src) obj[key] = src[key];
};

module.exports = function (options/*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (options == null) return;
		process(Object(options), result);
	});
	return result;
};

},{}],11:[function(require,module,exports){
'use strict';

module.exports = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
	return fn;
};

},{}],12:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	if (value == null) throw new TypeError("Cannot use null or undefined");
	return value;
};

},{}],13:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? String.prototype.contains
	: require('./shim');

},{"./is-implemented":14,"./shim":15}],14:[function(require,module,exports){
'use strict';

var str = 'razdwatrzy';

module.exports = function () {
	if (typeof str.contains !== 'function') return false;
	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
};

},{}],15:[function(require,module,exports){
'use strict';

var indexOf = String.prototype.indexOf;

module.exports = function (searchString/*, position*/) {
	return indexOf.call(this, searchString, arguments[1]) > -1;
};

},{}],16:[function(require,module,exports){
var
	dynamic_utils = require( './dynamic-utils' );

function Log(){
	this.hasConsole = ( typeof console === "object" && typeof console.log !== "undefined" );
    this.muted = false;
    this.instances = {};
    this.Levels = {
      ERROR: 7,
      WARNING: 5,
      // VISUAL: 3,
      INFO: 1,
      DEBUG: -1
    };

    this.Targets = this.hasConsole ? {
    	ERROR: {
    		treshold: this.Levels.ERROR,
    		target:  console.error
    	},
    	WARNING: {
    		treshold: this.Levels.WARNING,
    		target:  console.warn
    	},
    	INFO: {
    		treshold: this.Levels.INFO,
    		target:  console.info
    	},
    	DEBUG: {
    		treshold: this.Levels.DEBUG,
    		// if there's no console.debug object (i.e. IE8), let's use the console.info,
    		// as that's the next log level.
    		target:  ( typeof console === "object" && typeof console.debug === "function" ) ? console.debug : console.info
    	}
    } : {};
	
}

function LogInstance( name ){
	this.name = name;
	this.log_level = LogModule.Levels.ERROR;

	Object.defineProperty( this, 'module', {
		get: function(){ return this.get_module() }
	});
}

Log.prototype.mute = function( onoff ){
	if (typeof onoff !== "boolean"){
		onoff = false;
	}
	var result = this.muted;

	this.muted = onoff;

	return result;
}

Log.prototype.get_logger = function( name ){
	var result = null;

	if (this.instances.hasOwnProperty( name )){
		result = this.instances[ name ];
	} else {
		result = new LogInstance( name );
		this.instances[ name ] = result;
	}

	return result;
};

Log.prototype.configure = function( levels ){
	var self = this;

	Object.keys( levels ).forEach( function( level ){
		var logger = self.get_logger( level );
		logger.log_level = levels[ level ];
	}, this );
};

Log.prototype.to_console = function( target, log_instance, params ) {
	if (!this.muted){
	  	if ( typeof target === "object" && target.treshold >= log_instance.log_level ) {
		  var args = dynamic_utils.make_array( params );
		  if ( typeof args[0] === "function" ) {
		    args[0]();
		  } else {
		  	var console_target = target.target;
		    if ( typeof console_target.apply === "function" ) {
		    	args = ['['+log_instance.name+']'].concat( args );
		      console_target.apply( console, args );
		    } else {
		      var msg = args[0];
		      var parm1 = args.length>1 ? args[1] : "", parm2 = args.length>2 ? args[2] : "", parm3  = args.length>3 ? args[3] : "";

		      console_target( msg, '['+log_instance.name+']', parm1, parm2, parm3 );
		    }
		  }
		}
	}
}

LogInstance.prototype.get_module = function(){
	return LogModule;
};

LogInstance.prototype.debug = function () {
	LogModule.to_console( LogModule.Targets.DEBUG, this, arguments );
};

LogInstance.prototype.error = function () {
	LogModule.to_console( LogModule.Targets.ERROR, this, arguments );
};


LogInstance.prototype.info = function () {
	LogModule.to_console( LogModule.Targets.INFO, this, arguments );
};

LogInstance.prototype.warning = function () {
	LogModule.to_console( LogModule.Targets.WARNING, this, arguments );
};
LogInstance.prototype.warn = LogInstance.prototype.warning;


var LogModule = new Log();

module.exports = LogModule;

},{"./dynamic-utils":21}],17:[function(require,module,exports){
var dynamic_app = {
		info: {
			Name:       "Dynamic applications",
			Description:  "Modify web pages based on templates and live data.",
			Version:    "1.01.1"
		},
		vars: {
			templates: {},
			placeholders: [],
			values: [],
			TextObservers: []
		},
		types: {
			
		}
	};

var
	dynamic_dom = require('./dynamic-dom.js'),
	dynamic_utils = require('./dynamic-utils'),
	value_module = require('./dynamic-values.js'),
	template_module = require('./dynamic-templates.js'),
	logger = require('./browser_log').get_logger( dynamic_app.info.Name )
	;

var
	template_options = {
	  for: {},
	  'for-each': {},
	  'on-empty': {},
	  alternative: {},
	  'only-content': {}
	},
	template_tag = 'dynamic-template',
	parse_options = {},
	attributelist_pattern = '([^=]+)=(\\S+)\\s*',
	comment_pattern = '^<'+template_tag+'\\s+((('+attributelist_pattern+'))+)\\s*>$', 
	attributelist_re = new RegExp( attributelist_pattern, 'g' ),
	comment_re = new RegExp( comment_pattern )
;

parse_options[ template_tag ] = template_options;

dynamic_dom.events.on('DOM ready', function(){
	dynamic_app.define_values();
	dynamic_app.define_templates();
	dynamic_app.get_values_and_templates( document );

	logger.info(  dynamic_app );
	dynamic_dom.events.emit( 'App started' );

	dynamic_app.vars.placeholders = template_module.vars.Placeholders;

	window.$app = dynamic_app;
});

dynamic_app.started = function( css_selector, callback ){
	dynamic_dom.events.on( 'App started', function(){
		var container = dynamic_dom.get_element( css_selector );
		if ( container !== null){
			callback( container );
		}
	});
};

module.exports = dynamic_app;

dynamic_app.get_values_and_templates = function( node_list ){
	node_list = dynamic_utils.make_array( node_list );

	node_list.forEach( function( node ){
		dynamic_app.get_values( node );
		dynamic_app.bind_textnodes( node );
		dynamic_app.get_templates( node );
	});
}

dynamic_app.get_values = function( node ){
	var input_elements = dynamic_dom.get_elements( node, 'input' );

	 input_elements.forEach( function( input_element ) {
		var name = input_element.name ;
		var dynamic_value = dynamic_app.dynamic_value( name, true );
		var sema=0;

		dynamic_value.observe( function(){
			if (sema<1){
				sema++;
				logger.debug( 'update control from value', input_element, dynamic_value );
				input_element.value = dynamic_value.get_value();
				sema--;
			}
		});

		input_element.addEventListener( 'change', function(){
			if (sema<1){
				sema++;
				logger.debug( 'update value from control', input_element, dynamic_value );
				dynamic_value.set_value( this.value );
				sema--;
			}
		})

	 });
};

dynamic_app.get_templates = function( node ){
	var comment_nodes = dynamic_dom.get_nodes(node,{node_type: Node.COMMENT_NODE}, function is_dynamic_placeholder( candidate_node ){
	  return comment_re.test( candidate_node.textContent );
	});

	comment_nodes.forEach( function( comment_node ){
		var 
			attributes = {},
			match = comment_node.textContent.match( comment_re ),
			attribute_list = match[1]
		;

		dynamic_utils.collect( attributelist_re, attribute_list, function( attr_match, attr_index ){
			attributes[ attr_match[1].replace('-','_') ] = attr_match[2];
		} );

		var anchor_first = dynamic_dom.insert_text_before( comment_node, "\n" ); 
		var anchor = dynamic_dom.insert_text_before( comment_node, "\n" ); 
		var template_definition = dynamic_app.get_template_by_name( attributes.name );

		var template_placeholder = template_module.create_placeholder( template_definition,anchor );
		// template_placeholder.first = comment_node.insertCommentBefore( 'Start '+ attributes.name );
		template_placeholder.first = anchor_first;
		template_placeholder.on_instance = function( template_instance ){
			dynamic_app.get_values_and_templates( template_instance.child_nodes );
		}

		var dynamic_value = dynamic_app.dynamic_value( attributes.dynamic_value, true );
		dynamic_value.observe( function() {
			if ( dynamic_value.is_empty() ){
			  template_placeholder.clear();
			} else {
			  if (template_placeholder.is_empty()){
				 var instance = template_placeholder.add_instance();
			  }
			}
		});

		comment_node.remove();

	});

};


dynamic_app.dynamic_value = function( value_name, may_define ){
	if (typeof may_define !== 'boolean'){
		may_define = false;
	}
	return may_define ? value_module.get_or_define( value_name ) : value_module.get_by_name( value_name );;
};

var 
	binding_re = /{{([^}]+)}}/g,
	bind_pattern = '{{([^}]+?)}}',
  	binding_finder = new RegExp(bind_pattern),
  	binding_replacer = new RegExp(bind_pattern, 'g');


dynamic_app.define_values = function( element ){
	var
		the_element = element || document.body
	;

	dynamic_utils.collect( binding_replacer, the_element.textContent, function( binding_match, attr_index ){
		var dv = value_module.get_or_define( binding_match[1], true );
		logger.debug( 'Dynamic variable', dv );
	} );

};


dynamic_app.bind_textnodes = function( element ) {
 // first approach was to cut all text nodes into pieces
 // So <p>A {{B}} C {{D}} E</p> would result into 5 ones,
 // with two observers for B and D.
 // But then the blanks between them would get lost.
 dynamic_dom.get_nodes( element, {
   node_type: Node.TEXT_NODE
 }, function(text_node) {
   var node_text = text_node.textContent;
   var parent_node = text_node.parentNode;
   if (binding_finder.test(node_text)) {

     var text_observer = new TextObserver(text_node);

     while (binding_finder.test(node_text)) {
       var match = node_text.match(binding_finder);
       var whole_part = match[0];
       var value_name = match[1];
       var part_start = node_text.indexOf(whole_part);
       if (part_start > 0) {
         var left_part = node_text.substring(0, part_start);
         text_observer.add_literal(left_part);
       }
       var dynamic_value = dynamic_app.dynamic_value( value_name );
       text_observer.add_dynamic(dynamic_value);

       var right_part = node_text.substring(part_start + whole_part.length);
       node_text = right_part;
     }

     text_observer.add_literal(node_text);
     text_observer.set_text_content();
   }
 });
};


dynamic_app.get_template_by_name = function( template_name ){
	var result = null;

	if (dynamic_app.vars.templates.hasOwnProperty( template_name )){
		result = dynamic_app.vars.templates[ template_name ];
	}

	return result;
};

dynamic_app.define_templates = function( template_element ){
	var 
		result,
		parser = null,
		existing = null,
		only_content = false,
		is_body = typeof template_element === "undefined"
		;

	if (!is_body){

		var parser = new AttributeParser( template_tag );
		parser.parse( template_element );
		var existing = dynamic_app.get_template_by_name( parser.name );

		if (existing !== null){
			result = existing;
			result.merge_options( parser.options );
		} else {
			result = template_module.define( parser.name, parser.options );


			dynamic_app.vars.templates[ parser.name ] = result ;
		}

		only_content = parser.options.hasOwnProperty('only_content') ? parser.options.only_content : false;
		delete parser.options.only_content;

		if (parser.options.for || parser.options.for_each){
			var dynamic_value_name = parser.options.for ? parser.options.for : parser.options.for_each;
			var multiple=(typeof parser.options.for_each !== "undefined");

			var comment_node = document.createComment("<" + template_tag + " name="+parser.name+" dynamic-value="+dynamic_value_name+" multiple="+multiple+">");
			template_element.parentNode.insertBefore( comment_node, template_element );
		}
	}

	var child_template_elements = dynamic_app.get_children( template_element, "." + template_tag );

	child_template_elements.forEach( function( child_template_element ){
	  var   child_template = dynamic_app.define_templates( child_template_element );
	  child_template.parent = result;
	} );

	if (!is_body){
		result.absorb( template_element, only_content );
	}

	return result;
}


function AttributeParser( data_name ) {
  this.data_name = data_name;
  this.name = '';
  this.options = {};
  this.pattern = new RegExp('data-' + this.data_name + '-?(.*)?');
  this.validator = parse_options[ data_name ];

  return this;
}

AttributeParser.prototype.parse_attributes = function(attrs) {
  var self = this;
  var result = [];

  Object.keys(attrs).forEach(function(attr_id) {
	 var attr = attrs[attr_id];
	 var param;

	 if (self.pattern.test(attr.name)) {
		result.push( attr.name );
		var m = attr.name.match(self.pattern);
		param = m[1];
		if (typeof param === "undefined") {
		  varname = dynamic_utils.htmlID2CamelCase(attr.value);
		} else {
		  var option_list;
		  if (param === 'options'){
			 option_list = attr.value.split( ';' ).map( function( opt_part ){
				var opt_nv = opt_part.split( '=' );
				return( {name: opt_nv[0], value: opt_nv.length>1 ? opt_nv[1] : true } );
			 } );
		  } else {
			 option_list = [ {name: param, value: attr.value} ];
		  }
		  option_list.forEach( function( opt ){
			 var opt_name = opt.name;
			 var validator = self.validator[opt_name];
			 if (typeof validator === "undefined") {
				logger.warning("Unknown attribute ", opt_name, "on", self.element);
			 } else {
				var option_name = typeof validator.option_name !== "undefined" ? validator.option_name : opt_name.replace( '-','_' );
				var attrval = typeof validator.get === "function" ? validator.get( opt.value ) : opt.value;
				self.options[option_name] = attrval;
			 }
		  } );
		}
	 }
  });

  return result;
};

AttributeParser.prototype.parse = function( element ) {
  this.options = {};
  this.element = element;

  var class_names = dynamic_dom.get_classes( element );
  var ix = class_names.indexOf(this.data_name);

  if (ix + 1 < class_names.length) {
	 this.name = dynamic_utils.htmlID2CamelCase(class_names[ix + 1]);
  }
  if (ix + 2 < class_names.length) {
	 this.options.type = class_names[ix + 2];
  }
  this.parse_attributes(dynamic_dom.get_attributes(element)).forEach( function( attr_name ){
	 element.removeAttribute( attr_name );
  });

  // this.options.content = element.textContent.trim();
  dynamic_dom.remove_class( element, this.data_name );
  return this;
};


dynamic_app.get_children = function( element, css_selector ) {
	// only return top-level results

	var all_results = dynamic_dom.get_elements( element, css_selector );
	var excluded = [];

	for (var i = 0; i < all_results.length; i++) {
		excluded = excluded.concat( dynamic_app.get_children( all_results[i], css_selector ) );
	}

	return dynamic_utils.array_diff( all_results, excluded );
};


  function LiteralPart(text) {
    this.text = text;
  }

  LiteralPart.prototype.get_text = function() {
    return this.text;
  };

  function DynamicPart(value) {
    this.dynamic_value = value;
  }

  DynamicPart.prototype.get_text = function() {
    return this.dynamic_value.value;
  };

  function TextObserver(text_node) {
    this.text_node = text_node;
    this.original = text_node.textContent;
    this.parts = [];

    dynamic_app.vars.TextObservers.push(this);
  }

  TextObserver.prototype.set_text_content = function() {
    var result = '';
    this.parts.forEach(function(part) {
      result += part.get_text();
    });
    this.text_node.textContent = result;
  };

  TextObserver.prototype.add_literal = function(text) {
    this.parts.push(new LiteralPart(text));
  };

  TextObserver.prototype.add_dynamic = function(dynamic_value) {
    var self = this;

    this.parts.push(new DynamicPart(dynamic_value));

    dynamic_value.observe(function() {
      self.set_text_content();
    });

  };


},{"./browser_log":16,"./dynamic-dom.js":18,"./dynamic-templates.js":20,"./dynamic-utils":21,"./dynamic-values.js":22}],18:[function(require,module,exports){
var dom_utils = {

	info: {
		Name:       "Dynamic DOM utils",
		Description:  "Browser independent DOM querying and manipulation.",
		Version:    "1.02.1"
	},
	vars: {
	},
	types: {
	},
	events: require('event-emitter')( {} )
};
 
var 
	logger = require('./browser_log').get_logger( dom_utils.info.Name ),
	dynamic_utils = require('./dynamic-utils')
	;

waitForDOMContent();


var
	test_element = document.createElement( "P" );

if (typeof test_element.classList === "object"){
	dom_utils.get_classes = function( element ){
		return  dynamic_utils.make_array( element.classList );
	};

	dom_utils.remove_class = function ( element, css_class ) {
	   element.classList.remove( css_class );

	   return element;
	};
} else {
	dom_utils.get_classes = function( element ){
		return  element.className.split( " " );
	};

	dom_utils.remove_class = function ( element, css_class ) {
		if (element.className.indexOf( css_class )>=0){
		   var classes = dom_utils.get_classes( element );

		   var result = classes.filter( function( class_name ){
		   	return class_name !== css_class;
		   });

		   element.className = result.join( " " ).trim();
		}

	   return element;
	};
}

dom_utils.get_clone = function ( node ) {
	var result = node.cloneNode( true );

	if ( typeof result.removeAttribute === "function" ) {
		result.removeAttribute( "id" ); // prevent duplicate IDs
	}

	return result;
};

dom_utils.insert_text_before = function( node, text ){
	var result = document.createTextNode( text );

	node.parentNode.insertBefore( result, node );

	return result;
};


dom_utils.get_attributes = function( element ){
	var result = []

	if (element.hasAttributes()){
		for (var attr,ai=0; ai < element.attributes.length; ai++ ){
			attr = element.attributes[ ai ];
			result.push( {name: attr.name, value: attr.value});
		}
	}

	return result;
};


function document_ready() {

  logger.info( "DOM ready", dom_utils );
  dom_utils.events.emit( 'DOM ready' );
};

dom_utils.array_diff = function(a, b) {
  return a.filter(function(i) {
	 return b.indexOf(i) < 0;
  });
};


var 
	id_re = /#(\S+)\s+(.*)$/
	tag_name_re = /^\w+$/
	;
dom_utils.get_elements = function( outer_element, css_selector ){
	var 
		result = [],
		element_list = [],
		match;

	if (typeof outer_element === "string"){
		css_selector=outer_element;
		outer_element = document;
	} else {
		if (typeof outer_element === "undefined" || outer_element === null){
			outer_element = document;
		}
	}

	if (id_re.test(css_selector)){
		match = css_selector.match( id_re );
		outer_element = document.getElementById(match[1]);
		result = dom_utils.get_elements( outer_element, match[2] );
	} else {
		if (tag_name_re.test(css_selector)){
			match = css_selector.match( tag_name_re );
			element_list = outer_element.getElementsByTagName( match[0] );
		} else {
			element_list = outer_element.querySelectorAll( css_selector );
		}

		for (var i=0; i<element_list.length; i++){
			result.push( element_list[ i ] );
		}
	}

	return result;
};

dom_utils.get_element = function( outer_element, css_selector ){
	var result = dom_utils.get_elements( outer_element, css_selector );

	return result.length > 0 ? result[0] : null;
};

// ELEMENT_NODE 	1
// //ATTRIBUTE_NODE 	2
// TEXT_NODE 	3
// //CDATA_SECTION_NODE 	4
// //ENTITY_REFERENCE_NODE 	5
// //ENTITY_NODE 	6
// PROCESSING_INSTRUCTION_NODE 	7
// COMMENT_NODE 	8
// DOCUMENT_NODE 	9
// DOCUMENT_TYPE_NODE 	10
// DOCUMENT_FRAGMENT_NODE 	11
// //NOTATION_NODE 	12
var 
	recursive_types = [Node.ELEMENT_NODE, Node.DOCUMENT_NODE, Node.DOCUMENT_FRAGMENT_NODE],
	recurse_for_types = [Node.TEXT_NODE, Node.COMMENT_NODE];
	;

dom_utils.get_nodes = function get_nodes( from_nodes, options, filter ) {
  var
	result = [];

  if (typeof options === "function") {
	 filter = options;
	 options = {};
  } else {
	if (typeof options === "undefined" || options === null ){
		options = {};
	}
  }

  if (typeof filter !== "function"){
	filter = function( node ){ return true; };
  }

  if (options.hasOwnProperty("node_type")) {
	options.node_type = dynamic_utils.make_array( options.node_type );
  } else {
	 options.node_type = false;
  }

  if (!options.hasOwnProperty("recursive")) {
	 options.recursive = dynamic_utils.array_is_subset( recurse_for_types, options.node_type );
  }

  if (typeof from_nodes === "undefined"){
	from_nodes = document.body || dom_utils.get_element( 'body' );
  }
  from_nodes = dynamic_utils.make_array( from_nodes );

  for (var fni=0, from_node; fni<from_nodes.length; fni++){
  	from_node = from_nodes[ fni ];
	var childrenList = from_node.content ? from_node.content.childNodes : from_node.childNodes;
	var children = dynamic_utils.make_array( childrenList );

	for (var nodes = children, i = 0; i < nodes.length; i++) {
		var node = nodes[i],
		node_type = node.nodeType;

		if (!options.node_type || options.node_type.indexOf( node_type ) >= 0 ) {
			if (filter(node)){
				result.push( node );
			}
		}

		if (options.recursive && ( recursive_types.indexOf(node_type) >= 0)) {
			result = result.concat( dom_utils.get_nodes( node, options, filter ) );
		}
	}
  }
  return result;
};


function waitForDOMContent() {

	 var called = false;

	 function ready() {
		if ( called ) return;
		called = true;
		document_ready();
	 }

	 function tryScroll() {
		if ( called ) return;
		try {
		  document.documentElement.doScroll( "left" );
		  ready();
		} catch( e ) {
		  setTimeout( tryScroll, 10 );
		}
	 }

	 if ( document.addEventListener ) { // native event
		document.addEventListener( "DOMContentLoaded", ready, false );
	 } else if ( document.attachEvent ) {  // IE

		try {
		  var isFrame = window.frameElement != null;
		} catch( e ) {
		  // ignore any error
		}

		// IE, the document is not inside a frame
		if ( document.documentElement.doScroll && !isFrame ) {
		  tryScroll();
		}

		// IE, the document is inside a frame
		document.attachEvent( "onreadystatechange", function () {
		  if ( document.readyState === "complete" ) {
			 ready();
		  }
		} );
	 }

	 // Old browsers
	 if ( window.addEventListener )
		  window.addEventListener("load", ready, false );
		else if ( window.attachEvent )
		  window.attachEvent("onload", ready );
		else {
		  var fn = window.onload; // very old browser, copy old onload
		  window.onload = function () { // replace by new onload and call the old one
		  fn && fn();
		  ready();
		};
	 }
  }

module.exports = dom_utils;

},{"./browser_log":16,"./dynamic-utils":21,"event-emitter":1}],19:[function(require,module,exports){
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

var
 	logger = require('./browser_log').get_logger( dynamic_scopes.info.Name )
 	;


dynamic_scopes.get_by_reference = function( ref, deep ){
	return dynamic_scopes.Global.get_by_reference( ref,deep );
};

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

module.exports = dynamic_scopes;
},{"./browser_log":16}],20:[function(require,module,exports){
/*
	The template concept is a way to define HTML elements in such a way, that they can be instantiated
	in one call. This principle can then be combined with value binding, to have the instantiation
	process be automated by the appearance and disappearance of values.

	The concept has been modelled in three parts:
		1) Definition: a collection of HTML elements that are stored into a document fragment
		2) Placeholder: the position into the document where the elements of the Definition are cloned into
		3) Instance: the actual cloned nodes that where placed into the document 
*/

var templates_module = {
	info: {
		Name:       "Dynamic templates",
		Description:  "Replace <dynamic-template> tags with their content.",
		Version:    "1.05.1" 

	},
	vars: {
		Definitions:	[],
		Placeholders: 	[],
		Instances: 		[]

	},
	types: {
		DynamicTemplateDefinition: function( name, options ){
			this.name = name;
			this.construct( options );

			templates_module.vars.Definitions.push( this );
		},
		DynamicTemplatePlaceholder: function( template_definition,anchor ){
			this.definition = template_definition;
			this.instances = [];
			this.anchor = anchor;
			this.first = null;
			this.on_instance = null;

			templates_module.vars.Placeholders.push( this );
		},
		DynamicTemplateInstance: function( placeholder, anchor, child_nodes ){
			this.placeholder = placeholder;
			this.anchor = anchor;
			this.child_nodes = child_nodes;

			this.build();

			templates_module.vars.Instances.push( this );
		}
	}
};

var
	logger = require('./browser_log').get_logger( templates_module.info.Name ),
	dynamic_dom = require('./dynamic-dom.js'),
	dynamic_utils = require('./dynamic-utils')
	;

templates_module.define = function( name,options ){
	return new templates_module.types.DynamicTemplateDefinition( name, options );	
};

templates_module.create_placeholder = function( definition, anchor ){
	return new templates_module.types.DynamicTemplatePlaceholder( definition,anchor );	
};


function DynamicTemplateDefinition(){};

DynamicTemplateDefinition.prototype.construct = function( options ){
	this.scope = null;
	this.elements = [];
	this.parent= null;
	this.content = document.createDocumentFragment();

	this.merge_options( options );
};

DynamicTemplateDefinition.prototype.merge_options = function( options ){
	var self = this;

	Object.keys( options ).forEach( function( option_name ){
		var option_value = options[ option_name ];
		self[ option_name ] = option_value;
	} );
}

DynamicTemplateDefinition.prototype.absorb = function( element, only_content ){
	var
		self = this;

   var node_list = only_content ? dynamic_dom.get_nodes( element ) : [ element ];

	node_list.forEach( function( element_node ){
		self.content.appendChild( element_node );
	});

	if (only_content){
		element.parentNode.removeChild( element );
	}

	return this;
}

DynamicTemplateDefinition.prototype.get_clone = function(){
	var result = [];
	var child_nodes = dynamic_dom.get_nodes( this.content );

	child_nodes.forEach( function( child_node ){
		result.push( dynamic_dom.get_clone( child_node ) );
	});
	return result;
};


function DynamicTemplatePlaceholder(){};

DynamicTemplatePlaceholder.prototype.is_empty = function(){
	return this.instances.length < 1;
};

DynamicTemplatePlaceholder.prototype.clear = function(){
	var self = this;

	var todo = this.instances.reverse();
	this.instances = [];

	todo.forEach( function( instance ){
		instance.remove();
	});

	return self;
};

DynamicTemplatePlaceholder.prototype.add_instance = function( before_instance ){
	var anchor = (typeof before_instance === "object") ? before_instance.first : this.anchor;

	var result = new templates_module.types.DynamicTemplateInstance( this, anchor, this.definition.get_clone() );

	this.instances.push( result );

	if (typeof this.on_instance === "function"){
		this.on_instance( result );
	}

	return result;
};

DynamicTemplatePlaceholder.prototype.remove_instance = function( instance ){
	var instance_index = this.instances.indexOf( instance );

	if (instance_index >= 0){
		this.instances.splice( instance_index, 1 );
	}
};

function DynamicTemplateInstance(){};

DynamicTemplateInstance.prototype.build = function(  ){
	var self = this;

	this.first = dynamic_dom.insert_text_before( this.anchor, '\n' );

	this.child_nodes.forEach( function( child_node ){
		self.anchor.parentNode.insertBefore( child_node, self.anchor );
	} );

	this.last = dynamic_dom.insert_text_before( this.anchor, '\n' );
};

DynamicTemplateInstance.prototype.remove = function(){
	this.last.remove();

	this.child_nodes.reverse().forEach( function( child_node ){
		child_node.remove()
	} );
	this.first.remove();

	this.placeholder.remove_instance( this );
};

DynamicTemplateInstance.prototype.get_nodes = function(){
	return this.child_nodes;
}

templates_module.types.DynamicTemplateDefinition.prototype = new DynamicTemplateDefinition();
templates_module.types.DynamicTemplateDefinition.constructor = templates_module.types.DynamicTemplateDefinition;
templates_module.types.DynamicTemplatePlaceholder.prototype = new DynamicTemplatePlaceholder();
templates_module.types.DynamicTemplatePlaceholder.constructor = templates_module.types.DynamicTemplatePlaceholder;
templates_module.types.DynamicTemplateInstance.prototype = new DynamicTemplateInstance();
templates_module.types.DynamicTemplateInstance.constructor = templates_module.types.DynamicTemplateInstance;



module.exports = templates_module;

},{"./browser_log":16,"./dynamic-dom.js":18,"./dynamic-utils":21}],21:[function(require,module,exports){
var
	dynamic_utils = {};

dynamic_utils.htmlID2CamelCase = function( htmlid ) {
  return htmlid.substring( 0, 1 ).toUpperCase() + htmlid.substring( 1 ).replace( HTMLIDMATCHER, htmlidreplacer );
}

dynamic_utils.htmlID2OptionCase = function( htmlid ) {
  return htmlid.substring( 0, 1 ).toLowerCase() + htmlid.substring( 1 ).replace( HTMLIDMATCHER, htmlidreplacer );
}

dynamic_utils.CamelCase2HtmlID = function( camelcase, separator ) {
  if ( typeof separator !== "string" ) {
	separator = "-";
  }
  return camelcase.replace( CAPITALMATCHER, function ( m, letter ) {
	return separator + letter.toLowerCase();
  } ).substring( 1 );
}

dynamic_utils.collect = function( regex, text, on_match ){
	var
		the_match = regex.exec( text ),
		result = [],
		index = 0,
		do_callback = typeof on_match === "function"
	;

	while (the_match){
		result.push( do_callback ? on_match( the_match, index ) : the_match );
		the_match = regex.exec( text );
		index++;
	}

	return result;
};

dynamic_utils.clear_array = function( arr, keep_size ){
	if (typeof keep_size === "undefined"){
		keep_size = 0;
	}
	while (arr.length>keep_size){
		arr.pop();
	}
};

dynamic_utils.make_array = function(){
	var result = [];

	if (arguments.length>0){
		if (arguments.length > 1){
			result = Array.prototype.slice.call( arguments );
		} else {
			var param = arguments[0];
			if (Array.isArray( param )){
				result = param;
			} else {
				if (typeof param !== "undefined" && param !== null){
					if (typeof param !== "string" && typeof param.length === "number"){
						result = Array.prototype.slice.call( param );
					} else {
						result.push( param );
					}
				}
			}
		}
	}

	return result;
};

dynamic_utils.array_is_subset = function( a,b ){
	var result = false;

	if (Array.isArray( a )){
		var b_array = dynamic_utils.make_array( b );
		for (var b_i = 0, res = true; res && b_i < b_array.length; b_i++) {
			res = a.indexOf( b[ b_i ] ) > -1;
		};

		result = res;
	}


	return result;
};

dynamic_utils.array_diff = function(a, b) {
	return a.filter(function(i) {
		return b.indexOf(i) < 0;
	});
};

var CAPITALMATCHER = /([A-Z])/g;
var HTMLIDMATCHER = /[\-._:\s](\w)/g;

function htmlidreplacer( match, firstLetter ) {
  return firstLetter.toUpperCase();
}

module.exports = dynamic_utils;

},{}],22:[function(require,module,exports){
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

},{"./browser_log":16}],23:[function(require,module,exports){

var dynamic = {
		info: {
			Name:       "Dynamic Page1",
			Description:  "First web page based on the new framework",
			Version:    "1.01.1"
		},
		vars: {
			
		},
		types: {
			
		}
	};

var
	dynamic_app = require('./dynamic-app.js'),
 	dynamic_dom = require('./dynamic-dom.js'),
	logger = require('./browser_log').get_logger(dynamic.info.Name)
 	;

var log_config = {};
log_config[dynamic_dom.info.Name] = logger.module.Levels.WARNING;
log_config[dynamic_app.info.Name] = logger.module.Levels.DEBUG;
log_config[dynamic.info.Name] = logger.module.Levels.DEBUG;

logger.module.configure(log_config);


dynamic_app.started( 'body.dynamic',function( container ){
	logger.info( 'Dynamic started', dynamic, dynamic_app );
	var person_select = dynamic_dom.get_element( container, 'select[name="person"]' );

	var dv = dynamic_app.dynamic_value('person');
	person_select.addEventListener( 'change', function(){
		dv.set_value( dynamic_app.vars.person_list[ person_select.value ] );
	});

});

module.exports = dynamic;

dynamic_app.vars.person_list = {
		harry : {
		'last-name': "de Kroon", id: 15, 
		address:{
			city: 'Rozendaal', 
			number: 28,
			street: 'Delhoevelaan'
		}, 
		'first-name': "Harry",
		company: {
			name: 'Ciber',
			address:{
				number: 105,
				street: 'Vredeoord',
				city: 'Eindhoven'
			}
		},
		'birth-date': "15 sep 1967"
	},
	cindy: {
		'last-name': "Brokking", id: 1, 
		address:{
			city: 'Rozendaal', 
			number: 28,
			street: 'Delhoevelaan'
		}, 
		'first-name': "Cindy",
		company: {
			name: 'Color BC',
		},
		'birth-date': "4 aug 1974"
	},
	bo: {
		'last-name': "Zwiers", id: 2002, 
		'first-name': "Bo",
		company: {
			name: 'Oranjerie',
		},
		'birth-date': "26 mrt 2002"
	},
	bengt: {
		'last-name': "Zwiers", id: 2002, 
		'first-name': "Bengt",
		'birth-date': "15 feb 2005"
	},
	fenna: {
		'last-name': "de Kroon", id: 2001, 
		address:{
			city: 'Gorredijk', 
			number: 40,
			street: 'Weverij'
		}, 
		'first-name': "Fenna",
		company: {
			name: 'Hema',
			address:{
				city: 'Gorredijk'
			}
		},
		'birth-date': "5 feb 2001"
	}
}; 


},{"./browser_log":16,"./dynamic-app.js":17,"./dynamic-dom.js":18}]},{},[16,17,18,23,19,20,21,22]);
