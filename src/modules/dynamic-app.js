var dynamic_app = {
    info: {
        Name: "Dynamic applications",
        Description: "Modify web pages based on templates and live data.",
        Version: "1.01.1"
    },
    vars: {
        values: [],
        binding_observers: [],
        components: [],
        controls: [],
		  requested_channel_name: '',
		  socket_channel: null
    },
    modules: {},
    types: {
        AppComponent: function (css_selector) {
            this.selector = css_selector;
            this.element = null;
				this.channel = null;
				this.room = null;

            dynamic_app.vars.components.push(this);
        }
    }
};

var
    api_keywords = require('./dynamic-api_keywords.js'),
    dynamic_dom = require('./dynamic-dom.js'),
    dynamic_utils = require('./dynamic-utils'),
    dynamic_values = require('./dynamic-values.js'),
	 dynamic_websocket = require('./dynamic-websocket'),
	 dynamic_rest = require('./dynamic-rest'),
    templates_module = require('./dynamic-templates.js'),
    observer_module = require('./dynamic-observers.js'),
    formula_module = require('./dynamic-formulas.js'),
    ClassNameParser = require('./dynamic_class_parser.js'),

    logger = require('./browser_log').get_logger(dynamic_app.info.Name),
    htmlcomment_logger = require('./browser_log').get_logger(templates_module.info.Name + '$' + 'HTML'),
    uuid_generator = require('uuid/v4'),
    metalogger = require('./browser_log').get_logger('meta info'),
    xhrlogger = require('./browser_log').get_logger('Data Communication');

var
    template_options = {
        'for': {},
        'for-each': {},
        'for-values': {},
        'on-empty': {},
        alternative: {},
        'only-content': {},
        'with-content': {},
        'sort': {},
        incomplete: {},
        range: {}
    },
    template_tag = api_keywords.template.tag,
    parse_options = {},
    attributelist_pattern = '([^=]+)=(\\S*)\\s*',
    comment_pattern = '^<' + template_tag + '\\s+(((' + attributelist_pattern + '))+)\\s*>$',
    attributelist_re = new RegExp(attributelist_pattern, 'g'),
    comment_re = new RegExp(comment_pattern);


parse_options[template_tag] = template_options;

dynamic_dom.events.on('DOM ready', function () {

    dynamic_app.run();

});

dynamic_app.register_components = function(){
	dynamic_dom.get_elements(document.body, '.component').forEach( function( element ){
		var selector = '.'+dynamic_dom.get_classes( element ).join('.');
		dynamic_app.get_or_define_component( selector );
	});
};

dynamic_app.get_or_define_component = function( css_selector ){
	if (css_selector.indexOf('.component')<0){
		css_selector = '.component'+css_selector;
	}
	var result = dynamic_app.vars.components.find( function( component ){
		return component.selector === css_selector;
	});
	if (typeof result === 'undefined'){
		result = new dynamic_app.types.AppComponent(css_selector);
	}

	return result;
};

dynamic_app.register_component = function (css_selector) {

	var result = dynamic_app.get_or_define_component( css_selector );

	return result;
};

dynamic_app.run = function () {
    if (typeof dynamic_app.before_run === "function") {
        dynamic_app.before_run();
    }

	 var p = document.createElement('p');
	 p.classList.add( 'app-start' );
	 var t = document.createTextNode('Dynamic app starting up');
	 p.appendChild( t );
	 document.body.appendChild( p );

	 dynamic_app.socket_connect_channel();

    dynamic_app.define_templates();
	 dynamic_app.register_components();
    dynamic_app.vars.components.forEach(function register_components(component) {
        component.locate();
        component.initialise();
    });

    dynamic_values.enhance(dynamic_value_class);

    dynamic_app.vars.main_instance = templates_module.create_instance(document.body);
    dynamic_app.vars.main_instance.enhance(dynamic_instance_class);
    dynamic_app.vars.main_instance.get_values_and_templates();

    dynamic_app.vars.components.forEach(function notify_component_start(component) {
        component.started();
    });

	 var p2 = document.createElement('p');
	 p2.classList.add( 'app-running' );
	 var t2 = document.createTextNode('Dynamic app is now running');
	 p2.appendChild( t2 );
	 document.body.appendChild( p2 );

};

dynamic_app.connect_channel = function( channel_name ){
	dynamic_app.vars.requested_channel_name = channel_name;
};

dynamic_app.socket_connect_channel = function(){
	if (dynamic_app.vars.requested_channel_name.length < 1){
		dynamic_app.vars.requested_channel_name = dynamic_dom.get_dataset_value_or_default( document.body, api_keywords.dom.data.socket_channel, '' );
	}
	if (dynamic_app.vars.requested_channel_name.length > 0){
		logger.info("Using web socket ", dynamic_app.vars.requested_channel_name );
		dynamic_app.vars.socket_channel = dynamic_websocket.open_channel( dynamic_app.vars.requested_channel_name );

		return dynamic_app.vars.socket_channel;
	}
};


dynamic_app.show_instance_info = function () {
    var
        instance_count = 0,
        tree_count = 1,
        observer_count = 0,
        placeholder_count = 0;

    Object.keys(templates_module.vars.Instances).reverse().forEach(function (ik) {
        var
            instance = templates_module.vars.Instances[ik],
            info = instance.debug_info();
        instance_count++;
        tree_count += info.child_instances;
        observer_count += info.observers;
        placeholder_count += info.placeholders;
    });
};

module.exports = dynamic_app;

var
    dynamic_instance_class = {};

/**
 *
 * This function registers all unknown templates.
 * After the registration (template_module.define()) is completed,
 * it is going to decide if the template should be shown or not
 *
 * @param template_element
 * @returns boolean
 *
 */



dynamic_app.define_templates = function (template_element) {
    var
        result = null,
        parser = null,
        existing = null,
        only_content = false,
        with_content = '',
        template_name = '',
        range = api_keywords.template.range.all,
        is_body = typeof template_element === "undefined",
        template_children_with_arguments = dynamic_app.get_children(template_element, ".argument"),
        template_children = dynamic_app.get_children(template_element, "*"),
        template_children_without_arguments = dynamic_app.get_children(template_element, ":not(.argument)")
        ;

    if (!is_body) {
        parser = new ClassNameParser(template_element.className);
        // Parses the class name string to single arguments and values
        parser.parse();
        parser.remove_names.forEach(function (class_to_remove) {
            dynamic_dom.remove_class(template_element, class_to_remove);
        });
        template_name = parser.template_name;


        if (typeof template_name === "string" && template_name.length > 0) {
            // The if statement below checks if there is already a registered declaration / instance of the template.
            this.existing = templates_module.get_template_by_name(template_name);
            if (this.existing !== null) {
                result = this.existing;
                only_content = true;
            } else {
                if (parser.extend_template_name.length > 0) {
                    var existing_extending_template = templates_module.get_template_by_name(parser.extend_template_name);

                    if (existing_extending_template === null) {
                        // Registration of the declaration
                        logger.warning("Unknown extending template: " + parser.extend_template_name + ".");
                    }
                    template_name += "_" + parser.extend_template_name;
                    // Registration of the instance
                    result = templates_module.define(template_name);
                    result.get_clone_from(existing_extending_template);
                    only_content = true;

                } else {
                    result = templates_module.define(template_name);
                }
            }

            if ((typeof parser.dynamic_value_name !== "undefined" && parser.dynamic_value_name.length > 0)  ||// Has dynamic value
                template_children_with_arguments.length > 0 || // Has children with class '.argument'
                (typeof parser.extend_template_name !== "undefined" && parser.extend_template_name.length > 0 ) || // Has a extending template
                parser.place_template || // Has keyword 'place'
                (template_children.length === 0 && !parser.argument)) // Has no children and does not contain keyword 'argument'
            {

                range = parser.range;
                var
                    dynamic_value_name = parser.dynamic_value_name,
                    multiple = parser.multiple,
                    sort_order = parser.sort_order,
                    // Creates comment in the DOM.
                    comment_node = document.createComment("<" + template_tag + " name=" + template_name + " dynamic-value=" + dynamic_value_name + " range=" + range + " multiple=" + multiple + " sort=" + sort_order + ">")
                    ;
                if (parser.multiple === true && parser.dynamic_value_name.length < 1) {
                    logger.warning('For-each value is empty', template_element);
                }

                template_element.parentNode.insertBefore(comment_node, template_element);
            }
        } else {
            logger.error('Template must have a name', template_element);
        }
    }

    var child_template_elements = dynamic_app.get_children(template_element, "." + template_tag);

    child_template_elements.forEach(function (child_template_element) {
        var child_template = dynamic_app.define_templates(child_template_element);
        if (child_template !== null) {
            child_template.parent = result;
        }
    });

    if (!is_body && result !== null) {
        result.absorb(template_element, only_content);
    }

    return result;
}
;

dynamic_app.get_children = function (element, css_selector) {
    // only return top-level results

    var all_results = dynamic_dom.get_elements(element, css_selector);
    var excluded = [];

    for (var i = 0; i < all_results.length; i++) {
        excluded = excluded.concat(dynamic_app.get_children(all_results[i], css_selector));
    }

    return dynamic_utils.array_diff(all_results, excluded);
};

/*
 * Template placeholder enhancements
 */
var
    dynamic_placeholder = {};

dynamic_placeholder.set_value_reference = function ( dynamic_value_ref ) {
	var self = this;
	this.value_observer = null;
	this.template_observer = observer_module.create_dynamic_value_reference( dynamic_value_ref, this.parent_instance, this.attach_value, this.on_value_changed, this );
};


dynamic_placeholder.attach_value = function ( dynamic_value ) {
	this.dynamic_value = dynamic_value;
	this.on_value_changed.call( this );
};

dynamic_placeholder.single_instance = function () {

	 logger.debug('Placeholder::SingleInstance of ' + this.definition.name + ' for ' + this.dynamic_value.name );

    this.check_complete(this.dynamic_value);
};

dynamic_placeholder.multiple_instance = function () {
    var
        self = this,
		  dynamic_value = this.dynamic_value,
        child_keys = Object.keys(dynamic_value.children),
        items = this.sort_order;

		  logger.debug('Placeholder::MultipleInstance of ' + this.definition.name + ' for ' + this.dynamic_value.name );
    if (items.length > 0) {
        child_keys = child_keys.sort(function (key_a, key_b) {
            var
                child_a = dynamic_value.children[key_a],
                child_b = dynamic_value.children[key_b],
                result = 0;

            for (var ii = 0; result === 0 && ii < items.length; ii++) {
                var
                    item_ref = '.' + items[ii].trim(),
                    child_a_item = child_a.get_dynamic_value(item_ref, true),
                    child_b_item = child_b.get_dynamic_value(item_ref, true);
                if (child_a_item === null || child_b_item === null) {
                    if (child_a_item !== child_b_item) {
                        result = child_a_item === 0 ? -1 : 1;
                    }
                } else {
                    var
                        child_a_value = child_a_item.get_value(),
                        child_b_value = child_b_item.get_value();

                    result = child_a_value < child_b_value ? -1 : (child_a_value > child_b_value ? 1 : 0);
                }
            }

            return result;

        });
    }
	 logger.debug( '> Placeholder::Multiple '+ this.definition.name );
    this.empty();

    var
        index_value, new_instances = [];

    child_keys.forEach(function (child_key) {
        // dynamic_value.set_current( child_key );
        var child_value = dynamic_value.children[child_key];
        // logger.debug( 'add instance for '+this.definition.name+' - '+child_key );
        var new_instance = this.add_instance(child_value);
        new_instances.push(new_instance);

    }, this);

    dynamic_value.mark_selected(new_instances);
	 logger.debug( '< Placeholder::Multiple '+ this.definition.name );

};

dynamic_placeholder.multi_attribute_selector = {
    multiple: {
        multiple: true,
        on_value_changed: dynamic_placeholder.multiple_instance
    },
    yes: {
        multiple: true,
        on_value_changed: dynamic_placeholder.multiple_instance
    },
    'true': {
        multiple: true,
        on_value_changed: dynamic_placeholder.multiple_instance
    },
    no: {
        multiple: false,
        on_value_changed: dynamic_placeholder.single_instance
    },
    'false': {
        multiple: false,
        on_value_changed: dynamic_placeholder.single_instance
    },
    single: {
        multiple: false,
        on_value_changed: dynamic_placeholder.single_instance
    }
};

dynamic_placeholder.select_instancing = function (multiple) {
    var
        result;

    if (typeof multiple === "string" && multiple.length > 0) {
        result = dynamic_placeholder.multi_attribute_selector[multiple];
    } else {
        result = dynamic_placeholder.multi_attribute_selector.single;
    }

    if (typeof result !== "object") {
        logger.warning('Instancing selector "' + multiple + ' unknown');
    }

    return result;
};

/*
 *	Dynamic value enhancements
 */
var
    dynamic_value_class = {};

dynamic_value_class.on_change = function ( callback, this_arg ) {
	var result = this.observe( 'on_change', callback, this_arg );
};

dynamic_value_class.get_elements = function (selector) {
    var result = [];

    this.instances.forEach(function (instance) {
        result = result.concat(instance.get_elements(selector));
    }, this);

    return result;
};

dynamic_value_class.get_instances = function () {
    if (typeof this.instances === "undefined") {
        this.instances = [];
    }
    return this.instances;
};

dynamic_value_class.add_instance = function (instance) {
    if (typeof this.instances === "undefined") {
        this.instances = [];
    }
    var
        exists_ix = this.instances.findIndex(function (existing_instance) {
            return existing_instance.placeholder.definition.name == instance.placeholder.definition.name;
        }, this);
    if (exists_ix >= 0) {
        this.instances[exists_ix] = instance;
        logger.warning('Instance ' + instance.placeholder.definition.name + ' already referenced on value ' + this.name);
    } else {
        this.instances.push(instance);
    }

};

dynamic_value_class.remove_instance = function (instance) {
    var
        exists_ix = this.instances.indexOf(instance);
    if (exists_ix < 0) {
        logger.error('Instance not referenced on value ' + this.name, instance);
    } else {
        this.instances.splice(exists_ix, 1);
    }
};

dynamic_value_class.remove = function (instance) {

    this.children.forEach(function remove_child(child_value) {
        child_value.remove();
    }, this);
    this.clear_children();

    if (typeof this.instances !== "undefined") {
        var instances = dynamic_utils.list_duplicate(this.instances);

        instances.reverse().forEach(function remove_instance(instance) {
            instance.remove();
        }, this);
    }

    this.set_value(null);
    this.instances = [];

};

dynamic_value_class.index_by_offset = function (offset) {

    var
        child_references = Object.keys(this.parent.children),
        my_index = child_references.indexOf(this.reference),
        result =
            typeof offset === "string" ?
                child_references.indexOf(offset) :
                my_index + offset >= 0 && my_index + offset < child_references.length ?
                    my_index + offset :
                    -1;

    return result;
};

dynamic_value_class.can_swap = function (offset) {
    var
        result = false;

    if (this.parent !== null) {
        result = (this.index_by_offset(offset) >= 0);
    }

    return result;
};

function select_dynamic_value() {
    var
        dynamic_value = dynamic_values.get_by_name(dynamic_dom.set_dataset_value( this, api_keywords.dom.dynamic_value_camel ));

    dynamic_value.parent.metavalues.selected.set_value(dynamic_value.reference);
}

dynamic_value_class.mark_selected = function (specific_instances) {
    if (this.parent !== null) {
        var
            selected_reference = this.metainfo.selected;

        this.get_children().forEach(function (child_value) {
            var
                is_selected = child_value.reference == selected_reference,
                instances = typeof specific_instances === "object" ? specific_instances : child_value.get_instances()
                ;

            instances.forEach(function (child_instance) {
                var
                    element_node = child_instance.child_nodes[0]
                    ;

                element_node.removeEventListener('click', select_dynamic_value);
					 dynamic_dom.set_dataset_value( element_node, api_keywords.dom.dynamic_value_camel, child_instance.dynamic_value.name );

                if (is_selected) {
                    dynamic_dom.add_class(element_node, 'is-selected');
                    dynamic_dom.remove_class(element_node, 'can-select');

                } else {
                    dynamic_dom.remove_class(element_node, 'is-selected');
                    if (dynamic_dom.has_class(element_node, 'select-on-click')) {
                        dynamic_dom.add_class(element_node, 'can-select');
                        element_node.addEventListener('click', select_dynamic_value);
                    }
                }
            }, this);

        }, this);
    }

};

dynamic_value_class.swap = function (offset) {
    var
        result = null;
    if (this.parent === null) {
        logger.warning("Cannot swap a top-level value");
    } else {
        var
            child_references = Object.keys(this.parent.children),
            my_index = child_references.indexOf(this.reference),
            other_index = this.index_by_offset(offset);

        if (other_index < 0) {
            logger.warning('Swap offset ' + offset + ' out of reach');
        } else {
            var
                upper = Math.max(my_index, other_index),
                lower = Math.min(my_index, other_index),
                upper_value_ref = child_references.splice(upper, 1)[0],
                lower_value_ref = child_references.splice(lower, 1, upper_value_ref)[0],
                dummy_value_ref = child_references.splice(upper, 0, lower_value_ref),
                upper_value = this.parent.children[upper_value_ref],
                lower_value = this.parent.children[lower_value_ref];

            var new_children = {};
            child_references.forEach(function rebuild_children(child_ref) {
                new_children[child_ref] = this.parent.children[child_ref];
            }, this);

            this.parent.children = new_children;

            upper_value.instances.forEach(function swap_instances(upper_instance, ix) {
                if (upper_instance.placeholder.sort_order.length < 1) {
                    var other_instance = lower_value.instances.find(function (an_instance) {
                        return an_instance.placeholder.definition.name === upper_instance.placeholder.definition.name;
                    }, this);
                    if (typeof other_instance === "object") {
                        upper_instance.swap(other_instance);
                    }
                }
            });

            result = upper_value === this ? lower_value : upper_value;
        }
    }

    return result;
};

/*
 * Template instance enhancements
 */
dynamic_instance_class.get_values_and_templates = function () {
    var
        has_value = this.dynamic_value !== null || this === dynamic_app.vars.main_instance;

    this.child_nodes.forEach(function (node) {
        this.get_templates(node);
		  if (has_value) {
 			  this.get_values(node);
 		 }
        if (has_value) {
            this.bind_textnodes(node);
            this.bind_attributes(node);
        }
        this.resolve_arguments(node);
        this.trigger_component(node);
    }, this);
};

dynamic_instance_class.get_elements = function (selector) {
    var result = [];

    this.child_nodes.forEach(function (node) {
        result = result.concat(dynamic_dom.get_elements(node, selector));
    }, this);

    return result;
};

dynamic_instance_class.add_text_observer = function (text_observer) {
    if (typeof this.text_observers === "undefined") {
        this.text_observers = [];
    }

    this.text_observers.push(text_observer);
};

dynamic_instance_class.add_attribute_observer = function (attribute_observer) {
    if (typeof this.attribute_observers === "undefined") {
        this.attribute_observers = [];
    }

    this.attribute_observers.push(attribute_observer);
};

dynamic_instance_class.bind_textnodes = function (element) {
    // first approach was to cut all text nodes into pieces
    // So <p>A {{B}} C {{D}} E</p> would result into 5 ones,
    // with two observers for B and D.
    // But then the blanks between them would get lost.
    var self = this;

    dynamic_dom.get_nodes(element, {
        node_type: Node.TEXT_NODE
    }, function (text_node) {

        if (observer_module.contains_binding(text_node.textContent)) {
            self.add_text_observer(observer_module.create_text_observer(text_node, self));
        }
    });
};

dynamic_instance_class.bind_attributes = function (element) {

    var
        elements = dynamic_dom.get_nodes(element, {
            node_type: Node.ELEMENT_NODE,
            recursive: true
        });
    elements.splice(0, 0, element);

    elements.forEach(function (child_element) {
        if (typeof child_element.attributes !== "undefined" && child_element.attributes !== null) {
            var element_attributes = dynamic_utils.make_array( child_element.attributes );

            element_attributes.forEach( function (attribute){
                var
                    attribute_value = attribute.value;
                if (observer_module.contains_binding(attribute_value)) {
                    this.add_attribute_observer(observer_module.create_attribute_observer(child_element, attribute.name, this));
                }
            }, this );
        }
    }, this);
};

dynamic_instance_class.get_templates = function (node) {
    var
        comment_nodes = dynamic_dom.get_nodes(node, {
            node_type: Node.COMMENT_NODE
        }, function is_dynamic_placeholder(candidate_node) {
            return comment_re.test(candidate_node.textContent);
        });

    comment_nodes.forEach(function (comment_node) {
        var
            self = this,
            attributes = {},
            match = comment_node.textContent.match(comment_re),
            attribute_list = match[1];

        dynamic_utils.collect(attributelist_re, attribute_list, function (attr_match, attr_index) {
            attributes[attr_match[1].replace('-', '_')] = attr_match[2];
        });

        htmlcomment_logger.info(function () {
            this.placeholder_start = dynamic_dom.insert_comment_before(comment_node, comment_node.textContent);
        }, this);

        var
            anchor_first = dynamic_dom.insert_text_before(comment_node, "\n"),
            anchor = dynamic_dom.insert_text_before(comment_node, "\n"),
            template_definition = this.get_template_by_name(attributes.name),
            template_placeholder = this.create_placeholder(template_definition, anchor, match[0]),
            instancing_schema = dynamic_placeholder.select_instancing(attributes.multiple);

        htmlcomment_logger.info(function () {
            this.placeholder_last = dynamic_dom.insert_comment_before(comment_node, "End " + attributes.name);
        }, this);

        template_placeholder.on_value_changed = instancing_schema.on_value_changed;
        template_placeholder.is_multiple = instancing_schema.multiple;
        template_placeholder.first = anchor_first;
        template_placeholder.range = new ValueRange(attributes.range);
        template_placeholder.with_content = attributes.with_content;
        template_placeholder.sort_order = attributes.sort.length > 0 ? attributes.sort.split(',') : [];
		  // placeholder enhancements
		  template_placeholder.set_value_reference = dynamic_placeholder.set_value_reference;
		  template_placeholder.attach_value = dynamic_placeholder.attach_value;

        template_placeholder.on_instance = function on_instance_created(template_instance) {
            if (template_instance.dynamic_value !== null) {
                template_instance.dynamic_value.add_instance(template_instance);
            }
            template_instance.set_parent(self);
            template_instance.get_values_and_templates();
        };
		  template_placeholder.dynamic_value = null;

        if ( attributes.dynamic_value.length > 0 ) {
			  template_placeholder.set_value_reference( attributes.dynamic_value );
        } else {
            template_placeholder.set_instance( null );
        }

        comment_node.remove();

    }, this);

};

var
	input_types = {
		hidden: InputHiddenControl,
		text: AppControl,
		checkbox: InputCheckableControl,
		radio: InputCheckableControl
	},
    control_tags = {
        form: function(e){ return FormControl; },
        input: function(e){ return input_types[ e.type ]; },
        select: function(e){ return AppControl; }
    },
    button_commands = {
        remove: {
            event_handler: function remove_dynamic_value() {
                this.dynamic_value.remove();
            },
            label: '-',
            can_do: function (dynamic_value) {
                return true;
            }
        },
        'move-up': {
            event_handler: function move_up_dynamic_value() {
                this.dynamic_value.swap(-1);
            },
            label: '^',
            can_do: function (dynamic_value) {
                return dynamic_value.can_swap(-1);
            }

        },
        'move-down': {
            event_handler: function move_down_dynamic_value() {
                this.dynamic_value.swap(1);
            },
            label: 'v',
            can_do: function (dynamic_value) {
                return dynamic_value.can_swap(1);
            }

        }
    };

dynamic_instance_class.get_values = function (node) {

    Object.keys(control_tags).forEach(function (control_tag) {
        var tag_elements = dynamic_dom.get_elements(node, control_tag);
        if (typeof node.tagName === "string" && node.tagName.toLowerCase() === control_tag) {
            tag_elements.splice(0, 0, node);
        }

        tag_elements.forEach(function (tag_element) {
			  // only use controls with a name attribute, so we can assign a dynamic value
			  if (tag_element.hasAttribute('name') || dynamic_dom.has_dataset_value( tag_element, api_keywords.dom.data.rest )){
					if (dynamic_dom.has_dataset_value( tag_element, api_keywords.dom.dynamic_value_camel ) ){
						logger.error('element already has a value', dynamic_dom.get_dataset_value( tag_element, api_keywords.dom.dynamic_value_camel ), tag_element);
					} else {
						this.define_control(tag_element, control_tags[control_tag].call( null, tag_element ));
					}
				}
        }, this);
    }, this);

    var buttons = dynamic_dom.get_elements(node, 'button.dynamic-value');
    buttons.forEach(function link_button(btn) {
        if (! dynamic_dom.has_dataset_value( btn, api_keywords.dom.dynamic_value_camel )) {
            var dv = this.dynamic_value;
				dynamic_dom.set_dataset_value( btn, api_keywords.dom.dynamic_value_camel, dv.name );

            Object.keys(button_commands).forEach(function (command_name) {
                if (btn.className.indexOf(command_name) >= 0) {
                    if (!button_commands[command_name].can_do(dv)) {
                        // dynamic_dom.add_class( btn, 'hidden' );
                    }

                    // btn.textContent = button_commands[ command_name ].label;
                    btn.dynamic_value = dv;
                    btn.addEventListener('click', button_commands[command_name].event_handler);
                }
            }, this);

        }
    }, this);

};

dynamic_instance_class.define_control = function (tag_element, control_constructor) {
    if (typeof this.controls === "undefined") {
        this.controls = [];
    }

    this.controls.push(new control_constructor(tag_element, this));
};

dynamic_instance_class.remove = function () {
    this.super_remove();

	 if (typeof this.controls === "object"){
		 dynamic_utils.make_array(this.controls).forEach(function remove_control(the_control) {
	        the_control.remove();
	    }, this);
	    this.controls.splice(0,this.controls.length);
	 }

	 if (typeof this.text_observers === "object"){
		 this.text_observers.forEach( function remove_text_observer(observer){
			 observer.remove();
		 });
		 this.text_observers.splice(0,this.text_observers.length);
	 }

	 if (typeof this.attribute_observers === "object"){
		 this.attribute_observers.forEach( function remove_attr_observer(observer){
			 observer.remove();
		 });
		 this.attribute_observers.splice(0,this.attribute_observers.length);
	 }
};

dynamic_instance_class.get_dynamic_value = function get_dynamic_value_for_instance(value_name) {
    var
        result = null,
        formula = "";

    if (value_name.indexOf('=') > 0) {
        var name_parts = value_name.split('=');
        value_name = name_parts[0].trim();
        formula = name_parts[1].trim();
    }

    if (typeof this.dynamic_value === "object" && this.dynamic_value !== null) {
        result = this.dynamic_value.get_dynamic_value(value_name);
    } else {
        var parent_instance = this.parent_instance;

        for (parent_instance = this.parent_instance; result === null && parent_instance !== null; parent_instance = parent_instance.parent_instance) {
            if (parent_instance.dynamic_value !== null) {
                result = parent_instance.dynamic_value.get_dynamic_value(value_name);
            }
        }
        if (result === null) {
            result = dynamic_values.get_or_define(value_name);
        }
    }

    if (formula.length > 0) {

        var formula_value = formula_module.enhance_as_formula(result, formula);
        formula_value.parent_instance = this;
        formula_value.parse_formula();

        result = formula_value;
    }

    return result;
};

/**
 *
 * This function loops trough all the argument elements that are inside of 'element' ( see parameter ).
 * While looping trough all the elements it'll loop trough all parameter elements that are in the same element.
 * If a parameter and argument have the same name then 'move_element()' will be executed. So the parameter argument element 'll be deleted
 * and the parameter element'll have the right value and position.
 *
 * @param element
 * @throws [log error] No actual parameter found for argument
 */

dynamic_instance_class.resolve_arguments = function (element) {
    // Find all argument and parameter elements inside element.
    var argument_elements = dynamic_dom.get_elements(element, '.argument');
    var parameter_elements = dynamic_dom.get_elements(element, '.parameter');

    var argument_name;
    var parameter_name;

    var argument_element;
    var parameter_element;

    var do_replace;

    // For each argument there'll be checked if there is a parameter with the same name in element.
    for (var i = 0; i < argument_elements.length; i++) {
        argument_element = argument_elements[i];
        // Parse the element so we can get the template name ( argument_name ).
        var parser_argument = new ClassNameParser(argument_element.className);
        parser_argument.parse();
        argument_name = parser_argument.argument;
        if (argument_name) {
            for (var x = 0; x < parameter_elements.length; x++) {
                parameter_element = parameter_elements[x];
                // Parse the element so we can get the template name ( parameter_element ).
                var parser_parameter = new ClassNameParser(parameter_element.className);
                parser_parameter.parse();
                parameter_name = parser_parameter.parameter;

                // Check if a parameter name was found.
                if (parameter_name) {
                    // Check if we have a match
                    if (argument_name == parameter_name) {
                        // Match, the argument and parameter will now be passed to 'move_element()'.
                        do_replace = dynamic_dom.has_class(parameter_element, 'replace');
                        break;
                    }
                }
            }

            // Log a error if there was no parameter found for the current argument.
            if (!parameter_element) {
                logger.error("No actual parameter found with the name: " + argument_name + " for template instance: " + parser_argument.class_name);
            } else {
                dynamic_dom.remove_class(argument_element, 'argument');
                dynamic_dom.remove_class(parameter_element, 'parameter');
                dynamic_dom.remove_class(parameter_element, 'replace');
                dynamic_dom.move_element(argument_element, parameter_element, do_replace);
                // actual.push( param_element );
            }
        }
    }
};


dynamic_instance_class.trigger_component = function (element) {
    dynamic_app.vars.components.forEach(function trigger_components(component) {
        component.notify_when_visible(element);
    });
};

dynamic_instance_class.node_inserted = function (node) {
    if (this.dynamic_value !== null) {
        dynamic_dom.add_class(node, this.dynamic_value.name);
    }
};

dynamic_instance_class.get_control_attribute_observer = function (element, attribute_name) {
    var result = null;

    Object.keys(this.observers).forEach(function examine_observer_for_attribute(observer_name) {
        var observer = this.observers[observer_name];

        if (observer.ref_object.hasOwnProperty('binding_observer') && observer.ref_object.binding_observer.element === element && observer.ref_object.binding_observer.attribute_name === attribute_name) {

            result = observer.ref_object.binding_observer;
        }
    }, this);

    return result;
};

dynamic_instance_class.get_control_observer_values = function (element) {
    var result = {};

    Object.keys(this.observers).forEach(function examine_observer_for_element(observer_name) {
        var observer = this.observers[observer_name];

        if (observer.ref_object.hasOwnProperty('binding_observer') && observer.ref_object.binding_observer.element === element) {
            var dynamic_value = observer.dynamic_value;

            result[dynamic_value.name] = dynamic_value;
        }
    }, this);

    return result;
};

/*
 * local support classes
 */
function AttributeParser(data_name) {
    this.data_name = data_name;
    this.name = '';
    this.options = {};
    this.pattern = new RegExp('data-' + this.data_name + '-?(.*)?');
    this.validator = parse_options[data_name];

    return this;
}

AttributeParser.prototype.parse_attributes = function (attrs) {
    var self = this;
    var result = [];

    Object.keys(attrs).forEach(function (attr_id) {
        var attr = attrs[attr_id];
        var param;

        if (self.pattern.test(attr.name)) {
            result.push(attr.name);
            var m = attr.name.match(self.pattern);
            param = m[1];
            if (typeof param === "undefined") {
                varname = dynamic_utils.htmlID2CamelCase(attr.value);
            } else {
                var option_list;
                if (param === 'options') {
                    option_list = attr.value.split(';').map(function (opt_part) {
                        var opt_nv = opt_part.split('=');
                        return ({
                            name: opt_nv[0],
                            value: opt_nv.length > 1 ? opt_nv[1] : true
                        });
                    });
                } else {
                    option_list = [{
                        name: param,
                        value: attr.value
                    }];
                }
                option_list.forEach(function (opt) {
                    var opt_name = opt.name;
                    var validator = self.validator[opt_name];
                    if (typeof validator === "undefined") {
                        logger.warning("Unknown attribute ", opt_name, "on", self.element);
                    } else {
                        var option_name = typeof validator.option_name !== "undefined" ? validator.option_name : opt_name.replace('-', '_');
                        var attrval = typeof validator.get === "function" ? validator.get(opt.value) : opt.value;
                        self.options[option_name] = attrval;
                    }
                });
            }
        }
    });

    return result;
};

AttributeParser.prototype.parse = function (element) {
    this.options = {};
    this.element = element;

    var class_names = dynamic_dom.get_classes(element);
    var ix = class_names.indexOf(this.data_name);

    if (ix + 1 < class_names.length) {
        this.name = class_names[ix + 1]; //dynamic_utils.htmlID2CamelCase(class_names[ix + 1]);
    }
    if (ix + 2 < class_names.length) {
        this.options.type = class_names[ix + 2];
    }

    var class_parser = new ClassNameParser(class_names.join(' '));
    class_parser.parse();
    var remove_classes = class_parser.remove_names;
    if (remove_classes.length > 0) {
        remove_classes.forEach(function remove_one_class(class_name) {
            dynamic_dom.remove_class(element, class_name);
        });

        this.options.from_class = true;
        this.options.dynamic_value_name = class_parser.dynamic_value_name;
        this.options.place_here = class_parser.place_here;
        this.options.multiple = class_parser.multiple;
        this.options.range = class_parser.range;
        this.options.sort_order = class_parser.sort_order;

        if (this.options.place_here) {
            if (this.options.multiple) {
                this.options.for_each = this.options.dynamic_value_name;
            } else {
                this.options.for = this.options.dynamic_value_name;
            }
        }
    } else {
        this.options.from_class = false;
    }

    this.parse_attributes(dynamic_dom.get_attributes(element)).forEach(function (attr_name) {
        element.removeAttribute(attr_name);
    });


    // this.options.content = element.textContent.trim();
    dynamic_dom.remove_class(element, this.data_name);
    return this;
};

function ValueAlias(){
}

function create_alias_when_needed( alias_name, reference, instance ){
	var result = null;

	if (alias_name.length > 0){
		result = new ValueAlias()
			.init( instance )
			.set_name_and_reference( alias_name, reference )
		;
	}

	return result;
}

ValueAlias.prototype.init = function( instance ){
	this.instance = instance;
	this.dynamic_value = null;
	this.observer = null;

	return this;
};

ValueAlias.prototype.set_value = function( alias_value ){
	this.dynamic_value.value = alias_value;
};

ValueAlias.prototype.set_name_and_reference = function( name, reference ){
	// team.current.working_directory
	// team.working_directory.$[team.current.working_directory]]
	var
		ref_parts = reference.split( api_keywords.symbols.name_separator ),
		ref_ref = api_keywords.symbols.reference_start + reference + api_keywords.symbols.reference_end
	;

	ref_parts.splice( ref_parts.length-2, 1 );
	ref_parts.push( ref_ref );

	var dynamic_text_contents = ref_parts.join( api_keywords.symbols.name_separator );

	this.dynamic_value = this.instance.get_dynamic_value( name );
	this.observer = observer_module.create_dynamic_text_reference( dynamic_text_contents, this.instance, this.set_value, this, true );

	return this;
};

ValueAlias.prototype.remove = function(){
	this.observer.remove();
};

function AppControl$base(element, template_instance) {

}

AppControl$base.prototype.remove_observer = function( observer_name ){
	var
		observer_name_full = observer_name +'_observer',
		observer = this[ observer_name_full ]
	;

	if ( observer !== null){
		observer.remove();
		this[ observer_name_full ] = null;
	}

	return this;
};

AppControl$base.prototype.attach_value = function ( dynamic_value ) {
	if (typeof dynamic_value === 'undefined' ){
		dynamic_value = null;
	}
	this.remove_observer( 'control' );

	this.dynamic_value = dynamic_value;
	if (this.dynamic_value !== null){
		this.element.name = this.dynamic_value.bracket_notation;
		dynamic_dom.set_dataset_value( this.element, api_keywords.dom.dynamic_value_camel, this.dynamic_value.name );
		this.define_rest();
		var self = this;
		this.control_observer = this.dynamic_value.observe('control-' + this.element.tagName, this.update_by_value, this );
	}
};


AppControl$base.prototype.define_from_dataset = function ( name, default_value ) {
	var result = default_value;

	if ( dynamic_dom.has_dataset_value( this.element, name ) ){
	  result = dynamic_dom.get_dataset_value( this.element, name );
	}

	return result;
};

AppControl$base.prototype.create = function (element, template_instance) {
    this.element = element;
    this.instance = template_instance;
	 this.xhr = null;
	 var self = this;
	 this.rest = null;
	 this.pending = null;
	 this.control_observer = null;
	 this.dynamic_value = null;
	 this.value_reference_observer = null;
	 this.alias = null;

	 if (element.hasAttribute('name')){
		 this.value_name = this.element.name;
		 this.value_reference_observer = observer_module.create_dynamic_value_reference( this.value_name, template_instance, this.attach_value, null, this );
		 var alias_name = this.define_from_dataset( api_keywords.dom.data.alias, '' );
		 this.alias = create_alias_when_needed( alias_name, this.value_name, template_instance );

	 } else {
		 this.value_name = '';
	 }
    this.unset_value = null;

	 this.unchecked_value = this.define_from_dataset( api_keywords.dom.data.unchecked_value, '' );
	 this.intermediate_value = this.define_from_dataset( api_keywords.dom.data.put_value, '' );

    this.set_up();
};

AppControl$base.prototype.remove = function () {
    this.element = null;
    this.instance = null;
    this.dynamic_value = null;

	 this.remove_observer( 'control' );
	 this.remove_observer( 'value_reference' );

	 if (this.alias !== null){
		 this.alias.remove();
	 }

    if (this.element !== null) {
		 dynamic_dom.set_dataset_value( this.element, api_keywords.dom.dynamic_value_camel, null );
    }
};

AppControl$base.prototype.define_rest = function () {
	if ( dynamic_dom.has_dataset_value( this.element, api_keywords.dom.data.rest ) ) {
		var url = dynamic_dom.get_dataset_value( this.element, api_keywords.dom.data.rest );

		// do not remove data-rest attribute, since a control can get attached to more than one value, over time
		// dynamic_dom.set_dataset_value( this.element, api_keywords.dom.data.rest, null );

		this.rest = this.dynamic_value === null? dynamic_rest.create_rest_resource( '/api'+url  ) : dynamic_rest.create_rest_resource( this.dynamic_value  );

	}
};
AppControl$base.prototype.set_up = function () {
};

function FormControl(form_element, template_instance) {
    AppControl$base.prototype.create.call(this, form_element, template_instance);
}

FormControl.prototype = new AppControl$base();
FormControl.constructor = FormControl;

FormControl.prototype.submit = function () {
    this.xhr.open(this.element.method || "GET", this.element.action);
    this.form_data = new FormData(this.element);
    this.form_data.append('authorization_token', 'jjdk');

    xhrlogger.info('Data retrieval:', this.form_data, this.xhr);
    var self = this;

    this.visual_feedback_id = window.setTimeout(function () {
        self.visual_feedback_id = 0;
		  if (typeof self.dynamic_value.instances === "object" && typeof self.dynamic_value.instances.forEach === "function" ){
	        self.dynamic_value.instances.forEach(function (dv_instance) {
	            dv_instance.child_nodes.forEach(function (node) {
	                dynamic_dom.add_class(node, 'to-be-replaced');
	            }, self);
	        }, self);
		  }
    }, 521);

    this.xhr.send(this.form_data);
};

FormControl.prototype.remove = function () {
    this.xhr = null;
    this.form_data = null;
    this.dynamic_value.set_value(null);

    AppControl$base.prototype.remove.call(this);
};

FormControl.prototype.check_complete = function () {
    var
        result = true,
        value_names = Object.keys(this.dynamic_values);

    for (var vni = 0; result && vni < value_names.length; vni++) {
        var dynamic_value = this.dynamic_values[value_names[vni]];
        result = !dynamic_value.is_empty();
    }

    if (result && value_names.length > 0) {
        this.submit();
    } else {
        this.dynamic_value.set_value(null);
    }

};

function check_form_complete(form_control) {
    return function is_form_complete(dv) {
        form_control.check_complete(dv);
    };
}

FormControl.prototype.set_up = function () {
    var self = this;

    this.dynamic_values = this.instance.get_control_observer_values(this.element);

    var attr_observer = this.instance.get_control_attribute_observer(this.element, 'data-action');
    if (attr_observer !== null) {
        attr_observer.attribute_name = api_keywords.dom.data.action;
    }

    if (dynamic_dom.has_dataset_value( this.element, api_keywords.dom.data.action ) ) {

		 dynamic_dom.set_dataset_value( this.element, api_keywords.dom.data.action, null );
    }

    if ( dynamic_dom.has_dataset_value( this.element, api_keywords.dom.data.format ) ) {
        this.format = dynamic_dom.get_dataset_value( this.element, api_keywords.dom.data.format );

        dynamic_dom.set_dataset_value( this.element, api_keywords.dom.data.format, null );
    }

    var
        value_names = Object.keys(this.dynamic_values);

    for (var vni = 0; vni < value_names.length; vni++) {
        var dynamic_value = this.dynamic_values[value_names[vni]];

        this.instance.add_observer(
            dynamic_value.observe('form-is-complete_' + this.element.name, this.check_complete, this)
        );
    }

    this.xhr.addEventListener("load", function (event) {
        try {


            var payload = JSON.parse(event.target.responseText);
            xhrlogger.info('Data retrieved', payload);

            if (payload.hasOwnProperty(api_keywords.rest.payload)) {
                payload = payload.payload;

                if (payload.hasOwnProperty(self.dynamic_value.reference)) {
                    payload = payload[self.dynamic_value.reference];
                }
            }

            self.dynamic_value.set_value(payload);

            if (self.visual_feedback_id > 0) {
                window.clearTimeout(self.visual_feedback_id);
                self.visual_feedback_id = 0;
            }
				if (typeof self.dynamic_value.instances === "object" && typeof self.dynamic_value.instances.forEach === "function" ){

	            self.dynamic_value.instances.forEach(function (dv_instance) {
	                dv_instance.child_nodes.forEach(function (node) {
	                    dynamic_dom.remove_class(node, 'to-be-replaced');
	                }, self);
	            }, self);
				}
        } catch (err) {
            xhrlogger.error("Data parse error", err, self.xhr);
        }
    });

    // We define what will happen in case of error
    this.xhr.addEventListener("error", function (event) {
        xhrlogger.error("Data connection failed", event, self.xhr);
    });

    this.element.addEventListener('submit', function form_submit(event) {
        event.preventDefault();

        self.submit();
    });

    this.check_complete();

};

function AppControl(element, template_instance) {
	if ( typeof element === 'object' ){
   	AppControl$base.prototype.create.call(this, element, template_instance);
 	}
}

AppControl.prototype = new AppControl$base();
AppControl.constructor = AppControl;

var
// change_by_value = new Event( api_keywords.events.change_by_value )
    change_by_value = document.createEvent('Event');

// Define that the event name is 'build'.
change_by_value.initEvent(api_keywords.events.change_by_value, true, true);

AppControl.prototype.set_control_value = function (dynamic_value, text_value) {
	this.element.value = dynamic_value.get_value();
};

AppControl.prototype.update_by_value = function (dynamic_value) {
	if (!this.on_change_active){
    if (this.element !== null && typeof dynamic_value !== 'undefined' && dynamic_value !== null) {
        var
            dv_text = dynamic_value.get_text();

        if (this.get_control_value() !== dv_text) {
			  this.set_control_value( dynamic_value, dv_text );
           this.element.dispatchEvent(change_by_value);
        }
    }
 }
};

AppControl.prototype.remove = function () {
    // clear the selection of references to other objects.
    // those start always with the dollar sign
    // this way, when an instance gets removed, any previous selection gets cleared
    // to prevent confusion upon subsequent instances

    if (this.dynamic_value !== null && dynamic_utils.starts_with( this.dynamic_value.reference, api_keywords.meta.indicator ) &&
        this.element.type !== 'hidden' && !this.element.readOnly && !this.element.disabled && typeof this.element.options === "object") {
        this.dynamic_value.set_value("");
    }

    AppControl$base.prototype.remove.call(this);
};

AppControl.prototype.get_control_value = function(){
	return this.element.value;
};

AppControl.prototype.update_initial_value = function () {
	this.update_value();
};

AppControl.prototype.update_value = function () {
    var
        control_value = this.get_control_value();


    if (typeof this.element.options === "object") {
        if (this.element.options[this.element.selectedIndex].disabled) {
            control_value = "";
        }
    }
    logger.debug('>>>>> update value "' + this.dynamic_value.name + '" from control "' + control_value + '"', this);
// TODO:
// 	dynamic_value::set_value split into separate will_update() and set_value() parts
// 	have a data-intermediate attribute to change the value here to that before PUT is done
// 	e.g. the changing value now used on the services button.
	 if (this.rest !== null && this.rest.may_put()){
		 var data={};
		 data[this.dynamic_value.name] = control_value;
		 if ( this.intermediate_value.length > 0){
			this.dynamic_value.set_value( this.intermediate_value );
		 }

		 this.rest.put( data );
	 } else {
		this.dynamic_value.set_value(control_value);
	 }

   //  metalogger.debug(function () {
   //      dynamic_app.update_meta_info();
   //  });

    if (typeof this.element.options === "object") {
        this.dynamic_value.mark_selected();
    }

    logger.debug('<<<<< update value "' + this.dynamic_value.name + '" from control "' + control_value + '"', this);
};

var
    nf_locales, formatters;

if (typeof Intl === "object") {
    nf_locales = Intl.NumberFormat.supportedLocalesOf();
    formatters = {
        'currency-int': new Intl.NumberFormat(nf_locales, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }),
        'one-decimal': new Intl.NumberFormat(nf_locales, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }),
        currency: new Intl.NumberFormat(nf_locales, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }),
        quantity: new Intl.NumberFormat(nf_locales, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        })
    };

} else {

    formatters = {
        'currency-int': new IE9NumberFormatter(0),
        'one-decimal': new IE9NumberFormatter(0),
        currency: new IE9NumberFormatter(2),
        quantity: new IE9NumberFormatter(3)
    };
}

formatters.percentage = new PercentageFormatter();

function IE9NumberFormatter(dec) {
    this.decimals = dec;

}

IE9NumberFormatter.prototype.format = function (the_value) {
    return Number(the_value).toFixed(this.decimals);
};

function PercentageFormatter() {
    this.formatter = formatters['one-decimal'];
}

PercentageFormatter.prototype.format = function (perc_value) {
    return this.formatter.format(Number(perc_value) * 100) + '%';
};

function ValueFormatter(app_control, formatter_name) {
    var self = this;
    this.app_control = app_control;
    this.element = app_control.element;
    this.formatter = formatters[formatter_name];

    this.format_element = document.createElement('span');

    dynamic_dom.add_class(this.format_element, 'formatted');
    dynamic_dom.add_class(this.format_element, formatter_name);

    this.element.parentNode.insertBefore(this.format_element, this.element);
    this.element.addEventListener(api_keywords.events.change_by_value, function () {
        self.format_value();
    });
    this.element.remove();

    this.format_value();
}

ValueFormatter.prototype.format_value = function () {
    if (typeof this.element.value === "string" && this.element.value.length < 1) {
        this.format_element.textContent = '';
    } else {
        this.format_element.textContent = this.formatter.format(this.element.value);
    }
};

var supportsPassive = false;
try {
  var opts = Object.defineProperty({}, 'passive', {
	 get: function() {
		supportsPassive = true;
	 }
  });
  window.addEventListener("test", null, opts);
} catch (e) {}


AppControl.prototype.set_up = function () {

    var
        name = this.element.name,
        unsetter = dynamic_dom.option_from_class(this.element, api_keywords.dom.data.unset, {
            default: '',
            get_value: true,
            remove_value: true,
            remove: true
        }),
        self = this;
// 	 dynamic_dom.set_dataset_value( this.element, api_keywords.dom.dynamic_value_camel, this.dynamic_value.name );
	this.on_change_active = false;

	 if (this.element.value !== "" && this.dynamic_value.is_empty()) {
	     self.update_initial_value();
	 } else {
	     self.update_by_value(this.dynamic_value);
	 }

    if (unsetter.length > 0) {
        this.unset_value = this.instance.get_dynamic_value(unsetter);
    }

    this.element.addEventListener(api_keywords.events.change_by_value, function () {
        if (self.unset_value !== null) {
            self.unset_value.set_value(null);
        }
    });

    this.element.addEventListener('change', function () {
        if (self.unset_value !== null) {
            self.unset_value.set_value(null);
        }

		  self.on_change_active = true;
        self.update_value();
		  self.on_change_active = false;
    }, supportsPassive? {passive: true} : false);

    if (this.element.readOnly) {
        var
            classes = dynamic_dom.get_classes(this.element),
            formatter = null,
            class_name;

        for (var i = 0; formatter === null && i < classes.length; i++) {
            class_name = classes[i];
            formatter = formatters[class_name];
        }
        if (typeof formatter === "object" && formatter !== null) {
            this.formatter = new ValueFormatter(this, class_name);
        }

    }

};

function InputHiddenControl(element, template_instance) {
	this.deferred_observer = null;
   AppControl.prototype.create.call(this, element, template_instance);
	// this.referenced_value = null;
}

InputHiddenControl.prototype = new AppControl();
InputHiddenControl.constructor = InputHiddenControl;

InputHiddenControl.prototype.remove = function(){
	this.remove_observer( 'deferred' );

	AppControl.prototype.remove.call( this );
};

InputHiddenControl.prototype.set_value_by_value = function( new_value ){
	this.dynamic_value.value = new_value;
};

InputHiddenControl.prototype.update_initial_value = function(){

	this.remove_observer( 'deferred' );
	this.deferred_observer = observer_module.create_dynamic_text_reference( this.element.value, this.instance, this.set_value_by_value, this, true );
};

function InputCheckableControl(element, template_instance) {
    AppControl.prototype.create.call( this, element, template_instance );
}

InputCheckableControl.prototype = new AppControl();
InputCheckableControl.constructor = InputCheckableControl;

InputCheckableControl.prototype.get_control_value = function(){
	var result = this.element.value;

	if (!this.element.checked){
		result=this.unchecked_value;
	}

	return result;
};

InputCheckableControl.prototype.set_control_value = function (dynamic_value, text_value) {
	if (this.element.value === text_value ){
		this.element.checked = true;
	} else {
		if ( text_value === this.unchecked_value ){
			this.element.checked = false;
		}
	}
};

var
	range_testers = {
	    '<': function bound_lt(val, bound) {
	        return bound < val;
	    },
	    '[': function bound_le(val, bound) {
	        return bound <= val;
	    },
	    '>': function bound_gt(val, bound) {
	        return bound > val;
	    },
	    ']': function bound_ge(val, bound) {
	        return bound >= val;
	    }
	},
	range_dispatcher = null
;

function ValueRange(range) {
    this.range = range;
	 this.left_hook = range.substr( 0, 1 );
	 this.right_hook = range.substr( -1, 1 );

    this.lower_bound_check = this.range === api_keywords.template.range.all;
    this.upper_bound_check = this.range === api_keywords.template.range.all;

    if (range !== api_keywords.template.range.all && range !== api_keywords.template.range.empty) {
		 range = range.substring(1,range.length - 1 );
        this.allowed = range.split(',');
		  this.lower_bound = this.allowed[0];
        if (this.lower_bound.length > 0) {
            this.lower_bound_check = range_testers[ this.left_hook ];
        }
        this.upper_bound = this.allowed[1];
        if (this.upper_bound.length > 0) {
            this.upper_bound_check = range_testers[ this.right_hook ];
        }
    }
	 this.set_up();
}

ValueRange.prototype.set_up = function () {
	if ( range_dispatcher === null){
		range_dispatcher = {
			'<': ValueRange.prototype.lies_between,
			'[': ValueRange.prototype.lies_between,
			'(': ValueRange.prototype.is_one_of
		};
	}

	this.tester = range_dispatcher[ this.left_hook ];
};

ValueRange.prototype.is_one_of = function ( value ) {
	return this.allowed.indexOf( value ) >= 0;
};

ValueRange.prototype.lies_between = function ( value ) {
	var
		lower_bound_check = typeof this.lower_bound_check === "function" ? this.lower_bound_check(value, this.lower_bound) : this.lower_bound_check,
		upper_bound_check = typeof this.upper_bound_check === "function" ? this.upper_bound_check(value, this.upper_bound) : this.upper_bound_check
	;

	return lower_bound_check && upper_bound_check;
};

ValueRange.prototype.includes = function ( dynamic_value ) {
    var
        result = false;

    if (dynamic_value === null || dynamic_value.is_empty()) {
        result = this.range === api_keywords.template.range.empty;
    } else {
        var
            val = dynamic_value.get_value();
			result = this.tester.call( this, val );
    }

    return result;
};

dynamic_app.types.AppComponent.prototype.get_element = function (css_selector) {
    return dynamic_dom.get_element(this.element, css_selector);
};

dynamic_app.types.AppComponent.prototype.get_elements = function (css_selector) {
    return dynamic_dom.get_element(this.element, css_selector);
};

dynamic_app.types.AppComponent.prototype.safe_element_listener = function (css_selector, event_name, callback) {
    var
        element = this.get_element(css_selector);

    if (element !== null) {
        element.addEventListener(event_name, callback);
    }

    return element;
};

// TODO Fix Callbacks

dynamic_app.types.AppComponent.prototype.on_initialise = function (callback) {
    this.on_initialise_callback = callback;

    return this;
};

dynamic_app.types.AppComponent.prototype.on_started = function (callback) {
    this.on_start_callback = callback;

    return this;
};

dynamic_app.types.AppComponent.prototype.on_visible = function (callback) {
    this.on_visible_callback = callback;

    return this;
};

dynamic_app.types.AppComponent.prototype.locate = function () {
    this.element = dynamic_dom.get_element(this.selector);

    return this;
};

dynamic_app.types.AppComponent.prototype.notify_when_visible = function (element) {
    if (typeof this.on_visible === "function" && this.element === null) {
        if (dynamic_utils.starts_with(this.selector, '.')) {
            if (dynamic_dom.has_class(element, this.selector.substring(1))) {
                this.element = element;
            }
        } else {
            this.element = dynamic_dom.get_element(element, this.selector);
        }
        if (this.element !== null) {
            this.on_visible_callback(this.element);
        }

    }
    return this;
};

dynamic_app.types.AppComponent.prototype.initialise = function (callback) {
    if (this.element !== null && typeof this.on_initialise_callback == "function") {
        this.on_initialise_callback(this.element);
    }
};

dynamic_app.types.AppComponent.prototype.started = function (callback) {
	if (dynamic_app.vars.socket_channel !== null){
		var room_name = dynamic_dom.get_dataset_value_or_default( this.element, api_keywords.dom.data.socket_room, '' );
	   if ( room_name.length >0 ) {
			dynamic_app.vars.socket_channel.subscribe( room_name );
	   }
	}
	if (this.element !== null && typeof this.on_start_callback == "function") {
	  this.on_start_callback(this.element);
	}
};
