var dom_utils = {

	info: {
		Name: "Dynamic DOM utils",
		Description: "Browser independent DOM querying and manipulation.",
		Version: "1.02.1"
	},
	vars: {},
	types: {},
	events: require('event-emitter')({})
};

var
	logger = require('./browser_log').get_logger(dom_utils.info.Name),
	dynamic_utils = require('./dynamic-utils');

waitForDOMContent();

var
	test_element = document.createElement("P");

(function(arr) {
	arr.forEach(function(item) {
		item.remove = item.remove || function() {
			this.parentNode.removeChild(this);
		};
	});
})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

if (typeof test_element.dataset === "object") {
	dom_utils.set_dataset_value = function( element, prop_name, prop_value ){
		if (typeof prop_value === "undefined" || prop_value === null){
			delete element.dataset[prop_name];
		} else {
			element.dataset[prop_name] = prop_value;
		}
	};

	dom_utils.get_dataset_value = function( element, prop_name ){
		return element.dataset[prop_name];
	};

	dom_utils.has_dataset_value = function( element, prop_name ){
		return element.dataset.hasOwnProperty( prop_name );
	};

} else {
	dom_utils.set_dataset_value = function( element, prop_name, prop_value ){
		var attr_name = 'data-'+dynamic_utils.CamelCase2HtmlID( prop_name );
		if (typeof prop_value === "undefined" || prop_value === null){
			element.removeAttribute( prop_name );
		} else {
			element.setAttribute(attr_name,  prop_value );
		}
	};

	dom_utils.get_dataset_value = function( element, prop_name ){

		var attr_name = 'data-'+dynamic_utils.CamelCase2HtmlID( prop_name );
		var result, attr_value = element.getAttribute( attr_name );

		if (attr_value !== null){
			result = attr_value;
		}

		return result;
	};

	dom_utils.has_dataset_value = function( element, prop_name ){
		var attr_name = 'data-'+dynamic_utils.CamelCase2HtmlID( prop_name );
		return element.attributes.hasOwnProperty( attr_name );
	};

}

dom_utils.get_dataset_value_or_default = function( element, prop_name, prop_default ){
	var result = prop_default;

	if (dom_utils.has_dataset_value( element, prop_name ) ){
		result = dom_utils.get_dataset_value( element, prop_name );
	}

	return result;
};

if (typeof test_element.classList === "object") {
	dom_utils.get_classes = function(element) {
		return dynamic_utils.make_array(element.classList);
	};

	dom_utils.remove_class = function(element, css_class) {
		if (typeof element === "object" && element !== null) {

			element.classList.remove(css_class);
			if (element.className.length < 1) {
				element.removeAttribute('class');
			}
		}

		return element;
	};

	dom_utils.add_class = function(element, class_name) {
		if (typeof element.classList !== "undefined") {
			element.classList.add(class_name.replace(/\s/g, '_'));
		}
	};
} else {
	dom_utils.get_classes = function(element) {
		return element.className.split(" ");
	};

	dom_utils.remove_class = function(element, css_class) {
		if (typeof element === "object" && element !== null) {
			if (element.className.indexOf(css_class) >= 0) {
				var classes = dom_utils.get_classes(element);

				var result = classes.filter(function(class_name) {
					return class_name !== css_class;
				});

				element.className = result.join(" ").trim();
				if (element.className.length < 1) {
					element.removeAttribute('class');
				}
			}
		}

		return element;
	};

	dom_utils.add_class = function(element, class_name) {
		if (typeof element.className !== "undefined") {
			var existing = element.className;

			if (existing.indexOf(class_name) < 0) {
				element.className = (existing.length > 0 ? existing + ' ' : '') + class_name.replace(/\s/g, '_');
			}
		}
	};
}

dom_utils.has_class = function(element, class_name) {
	var
		result = false;

	if (typeof element === "object" && element !== null) {
		var class_list = dom_utils.get_classes(element);
		result = class_list.indexOf(class_name) >= 0;
	}

	return result;
};

dom_utils.get_clone = function(node) {
	var result = node.cloneNode(true);

	if (typeof result.removeAttribute === "function") {
		result.removeAttribute("id"); // prevent duplicate IDs
	}

	return result;
};

dom_utils.insert_text_before = function(node, text) {
	var result = document.createTextNode(text);

	node.parentNode.insertBefore(result, node);

	return result;
};

dom_utils.insert_comment_before = function(node, comment_text) {
	var result = document.createComment(comment_text);

	node.parentNode.insertBefore(result, node);

	return result;
};

dom_utils.remove_node = function(node) {
	if (typeof node === "object" && node !== null) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}
};

dom_utils.move_element = function(src_element, dst_element, do_replace) {
	if (do_replace) {
		dst_element.parentNode.insertBefore(src_element, dst_element);
		dom_utils.move_attributes(dst_element, src_element);
		dom_utils.remove_node(dst_element);
	} else {
		dom_utils.move_attributes(src_element, dst_element);
		dom_utils.get_nodes(src_element).forEach(function move_child_node(child_node) {
			dst_element.appendChild(child_node);
		});
		src_element.remove();
	}
};

dom_utils.move_attributes = function(src_element, dst_element) {
	dom_utils.get_attributes(src_element).forEach(function(attr) {
		if (attr.name !== "class") {
			dst_element.setAttribute(attr.name, attr.value);
		}
	}, this);
	dom_utils.get_classes(src_element).forEach(function(class_name) {
		dom_utils.add_class(dst_element, class_name);
	}, this);

};

dom_utils.get_attributes = function(element) {
	var result = [];

	if (element.hasAttributes()) {
		for (var attr, ai = 0; ai < element.attributes.length; ai++) {
			attr = element.attributes[ai];
			result.push({
				name: attr.name,
				value: attr.value
			});
		}
	}

	return result;
};

function document_ready() {
	// var p = document.createElement('p');
	// p.classList.add( 'dynamic_dom'  );
	// var t = document.createTextNode( 'document ready' );
	// p.appendChild( t );
	// document.body.appendChild( p );

	logger.info("DOM ready", dom_utils);
	dom_utils.events.emit('DOM ready');
}

dom_utils.array_diff = function(a, b) {
	return a.filter(function(i) {
		return b.indexOf(i) < 0;
	});
};

var
	id_re = /#(\S+)\s*(.*)$/,
	tag_name_re = /^\w+$/

;
dom_utils.get_elements = function(outer_element, css_selector) {
	var
		result = [],
		element_list = [],
		match;

	if (typeof outer_element === "string") {
		css_selector = outer_element;
		outer_element = document;
	} else {
		if (typeof outer_element === "undefined" || outer_element === null) {
			outer_element = document;
		}
	}

	if (typeof outer_element.querySelector === "function") {

		if (id_re.test(css_selector)) {
			match = css_selector.match(id_re);
			var element = document.getElementById(match[1]);
			if (match[2].trim().length > 0) {
				result = dom_utils.get_elements(element, match[2]);
			} else {
				result.push(element);
			}
		} else {
			if (typeof css_selector !== "undefined" &&tag_name_re.test(css_selector)) {
				match = css_selector.match(tag_name_re);
				element_list = outer_element.getElementsByTagName(match[0]);
			} else {
				element_list = outer_element.querySelectorAll(css_selector);
			}

			for (var i = 0; i < element_list.length; i++) {
				result.push(element_list[i]);
			}
		}
	}

	return result;
};

dom_utils.get_element = function(outer_element, css_selector) {
	var result = dom_utils.get_elements(outer_element, css_selector);

	return result.length > 0 ? result[0] : null;
};

dom_utils.option_from_class = function(element, option_name, options_argument) {
	var
		options = dynamic_utils.object_merge({
			default: false,
			remove: true,
			get_value: false,
			remove_value: false
		}, options_argument),
		result = options.default;

	if (dom_utils.has_class(element, option_name)) {
		result = true;

		if (options.get_value) {
			var
				class_list = dom_utils.get_classes(element);
			value_index = class_list.indexOf(option_name);

			if (value_index + 1 < class_list.length) {
				result = class_list[value_index + 1];
				if (options.remove_value) {
					dom_utils.remove_class(element, result);
				}
			} else {
				result = options.default;
			}
		}

		if (options.remove) {
			dom_utils.remove_class(element, option_name);
		}
	}

	return result;
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

dom_utils.get_nodes = function get_nodes(from_nodes, options, filter) {
	var
		result = [];

	if (typeof options === "function") {
		filter = options;
		options = {};
	} else {
		if (typeof options === "undefined" || options === null) {
			options = {};
		}
	}

	if (typeof filter !== "function") {
		filter = function(node) {
			return true;
		};
	}

	if (options.hasOwnProperty("node_type")) {
		options.node_type = dynamic_utils.make_array(options.node_type);
	} else {
		options.node_type = false;
	}

	if (!options.hasOwnProperty("recursive")) {
		options.recursive = dynamic_utils.array_is_subset(recurse_for_types, options.node_type);
	}

	if (typeof from_nodes === "undefined") {
		from_nodes = document.body || dom_utils.get_element('body');
	}
	from_nodes = dynamic_utils.make_array(from_nodes);

	for (var fni = 0, from_node; fni < from_nodes.length; fni++) {
		from_node = from_nodes[fni];
		var childrenList = from_node.content ? from_node.content.childNodes : from_node.childNodes;
		var children = dynamic_utils.make_array(childrenList);

		for (var nodes = children, i = 0; i < nodes.length; i++) {
			var node = nodes[i],
				node_type = node.nodeType;

			if (!options.node_type || options.node_type.indexOf(node_type) >= 0) {
				if (filter(node)) {
					result.push(node);
				}
			}

			if (options.recursive && (recursive_types.indexOf(node_type) >= 0)) {
				result = result.concat(dom_utils.get_nodes(node, options, filter));
			}
		}
	}
	return result;
};

function waitForDOMContent() {

	var called = false;

	function ready() {
		if (called) return;
		called = true;
		document_ready();
	}

	function tryScroll() {
		if (called) return;
		try {
			document.documentElement.doScroll("left");
			ready();
		} catch (e) {
			setTimeout(tryScroll, 10);
		}
	}

	document.addEventListener("DOMContentLoaded", ready, false);
}

module.exports = dom_utils;
