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
    },
    modules: {},
    types: {
        AppComponent: function (css_selector) {
            this.selector = css_selector;
            this.element = null;

            dynamic_app.vars.components.push(this);
        }
    }
};

var
    api_keywords = require('./dynamic-api_keywords.js'),
    dynamic_dom = require('./dynamic-dom.js'),
    dynamic_utils = require('./dynamic-utils'),
    values_module = require('./dynamic-values.js'),
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
    template_tag = 'template',
    parse_options = {},
    attributelist_pattern = '([^=]+)=(\\S*)\\s*',
    comment_pattern = '^<' + template_tag + '\\s+(((' + attributelist_pattern + '))+)\\s*>$',
    attributelist_re = new RegExp(attributelist_pattern, 'g'),
    comment_re = new RegExp(comment_pattern);


parse_options[template_tag] = template_options;

dynamic_dom.events.on('DOM ready', function () {

    dynamic_app.run();

});

dynamic_app.register_component = function (css_selector) {

    var result = new dynamic_app.types.AppComponent(css_selector);

    return result;
};

dynamic_app.run = function () {
    if (typeof dynamic_app.before_run === "function") {
        dynamic_app.before_run();
    }

    logger.info(dynamic_app.info);

    dynamic_app.vars.components.forEach(function register_components(component) {
        component.locate();
        component.initialise();
    });

    metalogger.debug(function () {
        var
            old_instances_info = {};
        dynamic_app.debug_templates = values_module.get_or_define('debug.template_count');
        dynamic_app.debug_placeholders = values_module.get_or_define('debug.placeholder_count');
        dynamic_app.debug_instances = values_module.get_or_define('debug.instance_count');
        dynamic_app.debug_observers = values_module.get_or_define('debug.observer_count');

        dynamic_app.update_meta_info = function () {
            var
                instances_info = {},
                instance_count = 0,
                tree_count = 1,
                observer_count = 0,
                placeholder_count = 0;

            dynamic_app.debug_templates.set_value(Object.keys(templates_module.vars.Definitions).length);
            dynamic_app.debug_placeholders.set_value(Object.keys(templates_module.vars.Placeholders).length);
            dynamic_app.debug_instances.set_value(Object.keys(templates_module.vars.Instances).length);
            dynamic_app.debug_observers.set_value(Object.keys(values_module.vars.observers).length);

            Object.keys(templates_module.vars.Instances).forEach(function (ik) {
                var
                    instance = templates_module.vars.Instances[ik],
                    instance_info = instance.debug_info();
                instances_info[instance_info.id] = instance_info;
                delete instance_info.id;

                instance_count++;
                tree_count += instance_info.child_instances;
                observer_count += instance_info.observers;
                placeholder_count += instance_info.placeholders;

            });

            if (Object.keys(old_instances_info).length > 0) {

                metalogger.debug('----- instances -----');
                var diff = dynamic_utils.object_difference(old_instances_info, instances_info);
                var removed_count = 0,
                    added_count = 0;
                for (var removed_name in diff.removed) {
                    var removed = diff.removed[removed_name];
                    metalogger.debug('- ' + removed_name, removed);
                    removed_count++;
                }
                for (var added_name in diff.added) {
                    var added = diff.added[added_name];
                    metalogger.debug('+ ' + added_name, added);
                    added_count++;
                }
                metalogger.debug('===== removed: ' + removed_count + ', added: ' + added_count + ', total: ' + instance_count + '; placeholders: ' + placeholder_count + '; observers: ' + observer_count + ' =====');
            }

            old_instances_info = instances_info;

        };

    });

    dynamic_app.define_templates();
    values_module.enhance(dynamic_value_class);

    dynamic_app.vars.main_instance = templates_module.create_instance(document.body);
    dynamic_app.vars.main_instance.enhance(dynamic_instance_class);
    dynamic_app.vars.main_instance.get_values_and_templates();

    dynamic_app.vars.components.forEach(function notify_component_start(component) {
        component.started();
    });
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

        console.log('Instance', info);
    });

    console.log(instance_count + ' instances, cross-reference count: ' + tree_count + '; placeholders: ' + placeholder_count + '; observers: ' + observer_count);

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
        template_children = dynamic_app.get_children(template_element),
        template_children_without_arguments = dynamic_app.get_children(template_element, ":not(.argument)")
        ;

    if (!is_body) {
        parser = new ClassNameParser(template_element.className);
        // Parses the class name string to single arguments and values
        parser.parse();
        template_name = parser.template_name;

        if (typeof template_name === "string" && template_name.length > 0) {
            // The if statement below checks if there is already a registered declaration / instance of the template.
            existing = templates_module.get_template_by_name(template_name);
            console.log("Existing: " + existing + "template name: " + template_name);
            if (existing !== null) {
                result = existing;
                only_content = true;
            } else {
                console.log("Registratie: " + template_name);
                if (parser.extend_template_name.length > 0) {
                    console.log("Template with extention");

                    existing_extending_template = templates_module.get_template_by_name(parser.extend_template_name);
                    if (existing_extending_template !== null) {
                        // Registration of the declaration
                        logger.warning("Unknown extending template: " + parser.extend_template_name + ".");
                    }

                    template_name += "_" + parser.extend_template_name;
                    // Registration of the instance
                    result = templates_module.define(template_name);
                    result.get_clone_from(existing_extending_template);
                    only_content = true;
                } else {
                    console.log("Non extending template");
                    result = templates_module.define(template_name);
                }
            }

            if ((typeof parser.dynamic_value_name !== "undefined" && parser.dynamic_value_name.length > 0) || template_children_with_arguments.length > 0
                || (typeof parser.extend_template_name !== "undefined" && parser.extend_template_name.length > 0 )
                || parser.place_template || (template_children.length <= 0 && parser.argument) && parser.parameter === false) {
                range = parser.range;
                var
                    dynamic_value_name = parser.dynamic_value_name,
                    multiple = parser.multiple,
                    sort_order = parser.sort_order,
                    // Creates comment in the DOM.
                    comment_node = document.createComment("<" + template_tag + " name=" + template_name + " dynamic-value=" + dynamic_value_name + " range=" + range + " multiple=" + multiple + " sort=" + sort_order + ">")
                    ;
                if (parser.multiple == true && parser.dynamic_value_name.length < 1) {
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

dynamic_placeholder.single_instance = function (dynamic_value) {

    // logger.debug('Single instance of ' + this.definition.name + ' for ' + dynamic_value.name, this);
    // this.dynamic_value = dynamic_value.get_final();

    this.check_complete(dynamic_value);
};

dynamic_placeholder.multiple_instance = function (dynamic_value) {
    var
        self = this,
        child_keys = Object.keys(dynamic_value.children),
        items = this.sort_order;

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

    dynamic_value.mark_selected(new_instances)

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
        dynamic_value = values_module.get_by_name(this.dataset.dynamicValue);

    dynamic_value.parent.metavalues.selected.set_value(dynamic_value.reference);
}

dynamic_value_class.mark_selected = function (specific_instances) {
    if (this.parent !== null) {
        var
            selected_reference = this.parent.metainfo.selected;

        this.parent.get_children().forEach(function (child_value) {
            var
                is_selected = child_value.reference === selected_reference,
                instances = typeof specific_instances === "object" ? specific_instances : child_value.get_instances()
                ;

            instances.forEach(function (child_instance) {
                var
                    element_node = child_instance.child_nodes[0]
                    ;

                element_node.removeEventListener('click', select_dynamic_value);
                element_node.dataset.dynamicValue = child_value.name;

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
            this.bind_textnodes(node);
            this.bind_attributes(node);
            this.get_values(node);
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
            var element_attributes = child_element.attributes;

            for (var eai = 0; eai < element_attributes.length; eai++) {
                var
                    attribute = element_attributes[eai],
                    attribute_value = attribute.value;
                if (observer_module.contains_binding(attribute_value)) {
                    self.add_attribute_observer(observer_module.create_attribute_observer(child_element, attribute.name, this));
                }
            }
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

        logger.warning(this.get_template_by_name(attributes.name));
        logger.warning(attributes.name);

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

        template_placeholder.on_instance = function on_instance_created(template_instance) {
            if (template_instance.dynamic_value !== null) {
                template_instance.dynamic_value.add_instance(template_instance);
            }
            template_instance.set_parent(self);
            template_instance.get_values_and_templates();
        };

        template_placeholder.dynamic_value = attributes.dynamic_value.length > 0 ? this.get_dynamic_value(attributes.dynamic_value) : null;

        if (template_placeholder.dynamic_value !== null) {
            this.add_observer(
                template_placeholder.dynamic_value.observe('placeholder_' + template_placeholder.definition.name, function change_placeholder(trigger_value) {
                    // if (template_placeholder.dynamic_value !== trigger_value ||  template_placeholder.dynamic_value.get_value() !== trigger_value.get_value() ){
                    // logger.debug( template_placeholder.dynamic_value.name+'['+trigger_value.name+']'+'('+(typeof template_placeholder.dynamic_value === "undefined"?'NIL':template_placeholder.dynamic_value.name)+') ==> instance(s) of ' + template_placeholder.definition.name );
                    // template_placeholder.dynamic_value = trigger_value;
                    template_placeholder.on_value_changed(trigger_value);
                    // }
                }, template_placeholder)
            );

            var delegated_value = template_placeholder.dynamic_value.get_final();

            if (template_placeholder.range.includes(delegated_value)) {
                logger.debug('Instance(s) of ' + template_placeholder.definition.name + ' for ' + template_placeholder.dynamic_value.name + '[' + template_placeholder.dynamic_value.get_final().name + ']');
                template_placeholder.on_value_changed(template_placeholder.dynamic_value);
            }

            if (delegated_value !== template_placeholder.dynamic_value) {
                this.add_observer(
                    delegated_value.observe('placeholder_delegated' + template_placeholder.definition.name, function change_placeholder(trigger_value) {
                        // if (template_placeholder.dynamic_value !== trigger_value ||  template_placeholder.dynamic_value.get_value() !== trigger_value.get_value() ){
                        // logger.debug( trigger_value.name+'('+(typeof template_placeholder.dynamic_value === "undefined"?'NIL':template_placeholder.dynamic_value.name)+') ==> instance(s) of ' + template_placeholder.definition.name );
                        template_placeholder.dynamic_value = trigger_value;
                        template_placeholder.on_value_changed(trigger_value);
                        // }
                    }, template_placeholder)
                );

            }
        } else {
            template_placeholder.set_instance(null);
        }

        comment_node.remove();

    }, this);

};

var
    control_tags = {
        form: FormControl,
        input: AppControl,
        select: AppControl
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
            if (typeof tag_element.dataset !== "object") {
                tag_element.dataset = {};
            }
            if (tag_element.name.length > 0) {
                if (tag_element.dataset.hasOwnProperty('dynamicValue')) {
                    logger.warning('element already has a value', tag_element.dataset.dynamicValue, tag_element);
                } else {
                    this.define_control(tag_element, control_tags[control_tag]);
                }
            }
        }, this);
    }, this);

    var buttons = dynamic_dom.get_elements(node, 'button.dynamic-value');
    buttons.forEach(function link_button(btn) {
        if (typeof btn.dataset !== "object") {
            btn.dataset = {};
        }

        if (!btn.dataset.hasOwnProperty('dynamicValue')) {
            var dv = this.dynamic_value;
            btn.dataset.dynamicValue = dv.name;

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

    dynamic_utils.make_array(this.controls).forEach(function remove_control(the_control) {
        the_control.remove();
    }, this);
    this.controls = [];
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
            result = values_module.get_or_define(value_name);
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

dynamic_instance_class.resolve_arguments = function (element) {
    agument_elements = dynamic_dom.get_elements(element, '.parameter');

    agument_elements.forEach(function argument_to_parameter(parameter_element) {
        var
            class_list = dynamic_dom.get_classes(parameter_element),
            parameter_index = class_list.indexOf('parameter');

        if (parameter_index + 1 < class_list.length) {

            var
                parameter_name = class_list[parameter_index + 1],
                arg_element = dynamic_dom.get_element(element, '.argument.' + parameter_name),
                do_replace = dynamic_dom.has_class(parameter_element, 'replace');

            if (arg_element === null) {
                logger.warning('No actual argument found for parameter ' + parameter_name + ' on instance ' + this.placeholder.definition.name);
            } else {
                dynamic_dom.remove_class(arg_element, 'argument');
                dynamic_dom.remove_class(parameter_element, 'argument');
                dynamic_dom.remove_class(parameter_element, 'replace');
                dynamic_dom.move_element(arg_element, parameter_element, do_replace);
                // actual.push( param_element );
            }
        }

    }, this);
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


function AppControl$base(element, template_instance) {

}

AppControl$base.prototype.create = function (element, template_instance) {
    this.element = element;
    this.instance = template_instance;
    this.value_name = this.element.name;

    this.dynamic_value = this.instance.get_dynamic_value(this.value_name);
    this.unset_value = null;
    this.element.name = this.dynamic_value.bracket_notation;
    this.element.dataset.dynamicValue = this.dynamic_value.name;

    this.set_up();
};

AppControl$base.prototype.remove = function () {
    this.element = null;
    this.instance = null;
    this.dynamic_value = null;

    if (this.element !== null) {
        delete this.element.dataset.dynamicValue;
    }
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
        self.dynamic_value.instances.forEach(function (dv_instance) {
            dv_instance.child_nodes.forEach(function (node) {
                dynamic_dom.add_class(node, 'to-be-replaced');
            }, self)
        }, self)
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

    this.xhr = new XMLHttpRequest();

    this.dynamic_values = this.instance.get_control_observer_values(this.element);

    this.format = 'json';

    var attr_observer = this.instance.get_control_attribute_observer(this.element, 'data-action');
    if (attr_observer !== null) {
        attr_observer.attribute_name = 'action';
    }

    if (this.element.dataset.hasOwnProperty('action')) {

        delete this.element.dataset.action;
    }

    if (this.element.dataset.hasOwnProperty('format')) {
        this.format = this.element.dataset.format;

        delete this.element.dataset.format;
    }

    var
        value_names = Object.keys(this.dynamic_values);

    for (var vni = 0; vni < value_names.length; vni++) {
        var dynamic_value = this.dynamic_values[value_names[vni]];

        this.instance.add_observer(
            dynamic_value.observe('form-is-complete_' + this.element.name, check_form_complete(this), this)
        );
    }

    this.xhr.addEventListener("load", function (event) {
        try {


            var payload = JSON.parse(event.target.responseText);
            xhrlogger.info('Data retrieved', payload);

            if (payload.hasOwnProperty('payload')) {
                payload = payload.payload;

                if (payload.hasOwnProperty(self.dynamic_value.reference)) {
                    payload = payload[self.dynamic_value.reference]
                }
            }

            self.dynamic_value.set_value(payload);

            if (self.visual_feedback_id > 0) {
                window.clearTimeout(self.visual_feedback_id);
                self.visual_feedback_id = 0;
            }

            self.dynamic_value.instances.forEach(function (dv_instance) {
                dv_instance.child_nodes.forEach(function (node) {
                    dynamic_dom.remove_class(node, 'to-be-replaced');
                }, self)
            }, self);
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
    AppControl$base.prototype.create.call(this, element, template_instance);
}

AppControl.prototype = new AppControl$base();
AppControl.constructor = AppControl;

var
// change_by_value = new Event( 'change_by_value' )
    change_by_value = document.createEvent('Event');

// Define that the event name is 'build'.
change_by_value.initEvent('change_by_value', true, true);

AppControl.prototype.update_by_value = function (dynamic_value) {
    if (this.element !== null) {
        var
            dv_text = dynamic_value.get_text();

        if (this.element.value !== dv_text) {
            // logger.debug('update control value from dynamic value', this);
            this.element.value = dynamic_value.get_value();
            this.element.dispatchEvent(change_by_value);
        }
    }
};

AppControl.prototype.remove = function () {
    // clear the selection of references to other objects.
    // those start always with the dollar sign
    // this way, when an instance gets removed, any previous selection gets cleared
    // to prevent confusion upon subsequent instances
    if (dynamic_utils.starts_with(this.dynamic_value.reference, '$') &&
        this.element.type !== 'hidden' && !this.element.readOnly && !this.element.disabled && typeof this.element.options === "object") {
        this.dynamic_value.set_value("");
    }

    AppControl$base.prototype.remove.call(this);
};

AppControl.prototype.update_value = function () {
    var
        control_value = this.element.value;

    if (typeof this.element.options === "object") {
        if (this.element.options[this.element.selectedIndex].disabled) {
            control_value = "";
        }
    }
    logger.debug('>>>>> update value "' + this.dynamic_value.name + '" from control "' + control_value + '"', this);

    this.dynamic_value.set_value(control_value);
    metalogger.debug(function () {
        dynamic_app.update_meta_info();
    });

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
    this.element.addEventListener('change_by_value', function () {
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

AppControl.prototype.set_up = function () {

    var
        name = this.element.name,
        unsetter = dynamic_dom.option_from_class(this.element, 'unset', {
            default: '',
            get_value: true,
            remove_value: true,
            remove: true
        }),
        self = this;

    if (this.element.value !== "" && this.dynamic_value.is_empty()) {
        self.update_value();
    } else {
        self.update_by_value(this.dynamic_value);
    }

    if (unsetter.length > 0) {
        this.unset_value = this.instance.get_dynamic_value(unsetter);
    }

    this.instance.add_observer(
        this.dynamic_value.observe('control-' + this.element.tagName + '-' + this.value_name, function update_control(dv) {
            self.update_by_value(dv);
        }, this)
    );

    this.element.addEventListener('change_by_value', function () {
        if (self.unset_value !== null) {
            self.unset_value.set_value(null);
        }
    });

    this.element.addEventListener('change', function () {
        if (self.unset_value !== null) {
            self.unset_value.set_value(null);
        }

        self.update_value();
    });

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
};

function ValueRange(range) {
    this.range = range;
    this.lower_bound_check = this.range === api_keywords.template.range.all;
    this.upper_bound_check = this.range === api_keywords.template.range.all;

    if (range !== api_keywords.template.range.all && range !== api_keywords.template.range.empty) {
        var parts = range.split(',');

        this.lower_bound = parts[0].substring(1);
        if (this.lower_bound.length > 0) {
            this.lower_bound_check = range_testers[parts[0].substr(0, 1)];
        }
        this.upper_bound = parts[1].slice(0, -1);
        if (this.upper_bound.length > 0) {
            this.upper_bound_check = range_testers[parts[1].substr(-1, 1)];
        }
    }
}

ValueRange.prototype.includes = function (dynamic_value) {
    var
        result;

    if (dynamic_value === null || dynamic_value.is_empty()) {
        result = this.range === api_keywords.template.range.empty;
    } else {
        var
            val = dynamic_value.get_value(),
            lower_bound_check = typeof this.lower_bound_check === "function" ? this.lower_bound_check(val, this.lower_bound) : this.lower_bound_check,
            upper_bound_check = typeof this.upper_bound_check === "function" ? this.upper_bound_check(val, this.upper_bound) : this.upper_bound_check;

        result = lower_bound_check && upper_bound_check;
    }

    return result;
};

dynamic_app.types.AppComponent.prototype.on_initialise = function (callback) {
    this.on_initialise = callback;

    return this;
};

dynamic_app.types.AppComponent.prototype.get_element = function (css_selector) {
    return dynamic_dom.get_element(this.element, css_selector);
};

dynamic_app.types.AppComponent.prototype.get_elements = function (css_selector) {
    return dynamic_dom.get_element(this.elements, css_selector);
};

dynamic_app.types.AppComponent.prototype.safe_element_listener = function (css_selector, event_name, callback) {
    var
        element = this.get_element(css_selector);

    if (element !== null) {
        element.addEventListener(event_name, callback);
    }

    return element;
};

dynamic_app.types.AppComponent.prototype.on_started = function (callback) {
    this.on_started = callback;

    return this;
};

dynamic_app.types.AppComponent.prototype.on_visible = function (callback) {
    this.on_visible = callback;

    return this;
};

dynamic_app.types.AppComponent.prototype.locate = function () {
    this.element = dynamic_dom.get_element(this.selector);

    return this;
};

dynamic_app.types.AppComponent.prototype.notify_when_visible = function (element) {

    if (typeof this.on_visible === "function") {
        if (dynamic_utils.starts_with(this.selector, '.')) {
            if (dynamic_dom.has_class(element, this.selector.substring(1))) {
                this.element = element;
            } else {
                this.element = null;
            }
        } else {
            this.element = dynamic_dom.get_element(element, this.selector);
        }
        if (this.element !== null) {
            this.on_visible(this.element);
        }

    }

    return this;
};

dynamic_app.types.AppComponent.prototype.initialise = function (callback) {
    if (this.element !== null && typeof this.on_initialise == "function") {
        this.on_initialise(this.element);
    }
};

dynamic_app.types.AppComponent.prototype.started = function (callback) {
    if (this.element !== null && typeof this.on_started == "function") {
        this.on_started(this.element);
    }
};
