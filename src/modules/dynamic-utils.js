var
	dynamic_utils = {};

// from:https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/remove()/remove().md

if (typeof String.prototype.startsWith === "function"){
	dynamic_utils.starts_with = function(str,test){
		return str.startsWith( test );
	};
} else {
	dynamic_utils.starts_with = function(str,test){
		return str.substr(0,test.length) === test;
	};
}

dynamic_utils.htmlID2CamelCase = function(htmlid) {
	return htmlid.substring(0, 1).toUpperCase() + htmlid.substring(1).replace(HTMLIDMATCHER, htmlidreplacer);
};

dynamic_utils.htmlID2OptionCase = function(htmlid) {
	return htmlid.substring(0, 1).toLowerCase() + htmlid.substring(1).replace(HTMLIDMATCHER, htmlidreplacer);
};

dynamic_utils.CamelCase2HtmlID = function(camelcase, separator) {
	if (typeof separator !== "string") {
		separator = "-";
	}
	return camelcase.replace(CAPITALMATCHER, function(m, letter) {
		return separator + letter.toLowerCase();
	}).substring(1);
};

dynamic_utils.collect = function(regex, text, on_match) {
	var
		the_match = regex.exec(text),
		result = [],
		index = 0,
		do_callback = typeof on_match === "function";

	while (the_match) {
		result.push(do_callback ? on_match(the_match, index) : the_match);
		the_match = regex.exec(text);
		index++;
	}

	return result;
};

dynamic_utils.clear_array = function(arr, keep_size) {
	if (typeof keep_size === "undefined") {
		keep_size = 0;
	}
	while (arr.length > keep_size) {
		arr.pop();
	}
};

dynamic_utils.make_array = function() {
	var result = [];

	if (arguments.length > 0) {
		if (arguments.length > 1) {
			result = Array.prototype.slice.call(arguments);
		} else {
			var param = arguments[0];
			if (Array.isArray(param)) {
				result = param;
			} else {
				if (typeof param !== "undefined" && param !== null) {
					if (typeof param !== "string" && (
							typeof param.forEach === "function" || 
							(typeof param.item === "function" && typeof param.nodeType === "undefined")
						)
					) {
						result = Array.prototype.slice.call(param);
					} else {
						result.push(param);
					}
				}
			}
		}
	}

	return result;
};


dynamic_utils.array_is_subset = function(a, b) {
	var result = false;

	if (Array.isArray(a)) {
		var b_array = dynamic_utils.make_array(b);
		for (var b_i = 0, res = true; res && b_i < b_array.length; b_i++) {

			res = a.indexOf(b[b_i]) > -1;
		}

		result = res;
	}

	return result;
};

dynamic_utils.array_duplicate = function( ar ){
	var 
		result,
		source,
		is_array,
		actor
	;

	is_array = Array.isArray(ar);
	if (is_array){
		result = [];
		source = ar;
		actor = function( item, ix ){ result.push( item ); }
	} else {
		result = {};
		source = Object.keys( ar );
		actor = function( item, ix ){ result[ ix ] = ar[ ix ]; }
	}

	for (var ix, ari=0; ari<source.length; ari++){
		actor( ar[ ari ], source[ ari ] );
	}

	return result;
};
dynamic_utils.list_duplicate = dynamic_utils.array_duplicate;

dynamic_utils.array_diff = function(a, b) {
	return a.filter(function(i) {
		return b.indexOf(i) < 0;
	});
};

dynamic_utils.object_diff = function( a, b ) {
	return dynamic_utils.object_difference( a, b ).removed;
};

dynamic_utils.object_difference = function( a, b ) {
	var
		result = { added: {}, removed: {} },
		a_keys = Object.keys( a ),
		b_keys = Object.keys( b ),
		added_keys = dynamic_utils.array_diff( b_keys, a_keys ),
		removed_keys = dynamic_utils.array_diff( a_keys, b_keys )
	;

	added_keys.forEach( function( added_key ){
		result.added[ added_key ] = b[ added_key ];
	});
	removed_keys.forEach( function( removed_key ){
		result.removed[ removed_key ] = a[ removed_key ];
	});

	return result;
};

dynamic_utils.list_diff = function( a, b ) {
	var
		result = null;

	if (Array.isArray( a ) && Array.isArray( b ) ){
		result = dynamic_utils.array_diff( a, b );
	} else {
		result = dynamic_utils.object_diff( a, b );
	}

	return result;
};

var CAPITALMATCHER = /([A-Z])/g;
var HTMLIDMATCHER = /[\-._:\s](\w)/g;

function htmlidreplacer(match, firstLetter) {
	return firstLetter.toUpperCase();
}

module.exports = dynamic_utils;


// https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return k.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return k;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return -1.
      return -1;
    }
  });
}

// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    }
  });
}
