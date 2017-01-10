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
	var result = [];

	for (var ari=0; ari<ar.length; ari++){
		result.push( ar[ari] );
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

function htmlidreplacer(match, firstLetter) {
	return firstLetter.toUpperCase();
}

module.exports = dynamic_utils;
