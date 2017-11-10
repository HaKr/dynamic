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
        Name: "Dynamic templates",
        Description: "Replace <dynamic-template> tags with their content.",
        Version: "1.05.1"

    },
    vars: {
        Definitions: {},
        Placeholders: [],
        Instances: [],
        placeholder_sequence: 1000,
        instance_sequence: 20000000

    },
    types: {
        DynamicTemplateDefinition: function (name) {
            this.name = name;
            this.placeholders = [];
            this.wait_for_complete = false;
            this.construct();

            templates_module.vars.Definitions[this.name] = this;
        },
        DynamicTemplatePlaceholder: function (template_definition, anchor, origin) {
            this.definition = template_definition;
            this.instances = [];
				this.template_observer = null;
            this.parent_instance = null;
            this.anchor = anchor;
            this.first = null;
            this.on_instance = null;
            this.on_empty = null;
            this.dynamic_values = [];
            this.empty_instance = null;
            var self = this;
            logger.debug(function () {
                self.reference = self.definition.name;
                self.origin = origin;
            });
            this.set_up();

            this.sequence = ++templates_module.vars.placeholder_sequence;
            templates_module.vars.Placeholders.push(this);
        },
        DynamicTemplateInstance: function (placeholder, anchor, child_nodes) {
            this.placeholder = placeholder;
            this.anchor = anchor;
            this.child_nodes = dynamic_utils.make_array(child_nodes);
            this.parent_instance = null;
            this.child_instances = [];
            this.observers = {};
            this.placeholders = [];
            this.dynamic_value = null;

            this.sequence = ++templates_module.vars.instance_sequence;
            templates_module.vars.Instances.push(this);
        }
    }
};

var
    logger = require('./browser_log').get_logger(templates_module.info.Name),
    htmlcomment_logger = require('./browser_log').get_logger(templates_module.info.Name + '$' + 'HTML'),
    dynamic_dom = require('./dynamic-dom.js'),
    dynamic_utils = require('./dynamic-utils');

templates_module.define = function (name, options) {
    return new templates_module.types.DynamicTemplateDefinition(name, options);
};

templates_module.create_instance = function (element) {
    return new templates_module.types.DynamicTemplateInstance(null, null, element);
};

templates_module.get_template_by_name = function (template_name) {
    var result = null;

    if (templates_module.vars.Definitions.hasOwnProperty(template_name)) {
        result = templates_module.vars.Definitions[template_name];
    }

    return result;
};

templates_module.get_template_instance_by_name = function (template_name) {
    var result = null;

    // if (templates_module.vars.Instances.hasOwnProperty(template_name)) {
        result = templates_module.vars.Instances;
    // }

    return result;
};

function DynamicTemplateDefinition() {
}


DynamicTemplateDefinition.prototype.construct = function () {
    this.content = document.createDocumentFragment();
};

DynamicTemplateDefinition.prototype.add_placeholder = function (placeholder) {
    this.placeholders.push(placeholder);
};

// Must be deleted
DynamicTemplateDefinition.prototype.merge_options = function (options) {
    // var self = this;
    //
    // Object.keys(options).forEach(function (option_name) {
    //     var option_value = options[option_name];
    //     if (option_name === "incomplete") {
    //         self.wait_for_complete = option_value === "wait";
    //     } else {
    //         self[option_name] = option_value;
    //     }
    // });
};

DynamicTemplateDefinition.prototype.absorb = function (element, only_content) {
    var
        self = this,
        parent = self.content,
        node_list = only_content ? dynamic_dom.get_nodes(element) : [element];

    node_list.forEach(function (element_node) {

        if (typeof parent.children !== "undefined" && parent.children.length > 0) {
            parent.children[0].appendChild(element_node);
        } else {
            parent.appendChild(element_node);
        }
    });

    if (only_content) {
        dynamic_dom.move_attributes(element, parent.childNodes[0]);
        element.parentNode.removeChild(element);
    }

    return this;
};

DynamicTemplateDefinition.prototype.get_clone_from = function (other_definition) {
    other_definition.get_clone().forEach(function (cloned_node) {
        this.content.appendChild(cloned_node);
    }, this);
};

DynamicTemplateDefinition.prototype.get_clone = function () {
    var result = [];
    var child_nodes = dynamic_dom.get_nodes(this.content);

    child_nodes.forEach(function (child_node) {
        result.push(dynamic_dom.get_clone(child_node));
    });
    return result;
};

function DynamicTemplatePlaceholder() {
}

DynamicTemplatePlaceholder.prototype.remove = function () {
	logger.debug("Placeholder::remove " + this.definition.name );
    templates_module.vars.Placeholders.splice(templates_module.vars.Placeholders.indexOf(this), 1);
	 if (typeof this.template_observer === "object" && this.template_observer !== null){
 		this.template_observer.remove();
		this.template_observer = null;
 	}
};

DynamicTemplatePlaceholder.prototype.set_up = function () {
    this.definition.add_placeholder(this);
    if (typeof this.definition.on_empty === "string") {
        this.on_empty = templates_module.get_template_by_name(this.definition.on_empty);
    }

    this.empty();
};

DynamicTemplatePlaceholder.prototype.add_value = function (dynamic_value) {
    var
        self = this;

    this.dynamic_values.push(dynamic_value);
    if (this.definition.wait_for_complete) {
        dynamic_value.observe('check_for_complete', this.check_complete, this );
    }
};

DynamicTemplatePlaceholder.prototype.check_complete = function (dynamic_value) {
    var
        result = false;

    result = this.range.includes(dynamic_value);

    if (result && this.definition.wait_for_complete) {
        for (var i = 0; result && i < this.dynamic_values.length; i++) {
            var dynamic_sub_value = this.dynamic_values[i];

            result = !dynamic_sub_value.is_empty();
        }
    }

    if (result) {
        this.set_instance(dynamic_value);
    } else {
        this.empty();
    }

};

DynamicTemplatePlaceholder.prototype.check_completed = function (dynamic_value) {
    var
        result = false;

    if (typeof dynamic_value !== "undefined") {
        if (this.instance_value !== dynamic_value) {
            this.clear();
            this.instance_value = dynamic_value;
        }

        result = !this.instance_value.is_empty();
    }

    if (result && this.definition.wait_for_complete) {
        for (var i = 0; result && i < this.dynamic_values.length; i++) {
            var dynamic_sub_value = this.dynamic_values[i];

            result = !dynamic_sub_value.is_empty();
        }
    }

    if (result) {
        this.set_instance(this.instance_value);
    } else {
        this.empty();
    }

};

DynamicTemplatePlaceholder.prototype.is_empty = function () {
    return this.instances.length < 1;
};

DynamicTemplatePlaceholder.prototype.clear = function () {
    var self = this;

    var todo = dynamic_utils.list_duplicate(this.instances).reverse();

    todo.forEach(function (instance) {
        instance.remove();
    });

    if (this.empty_instance !== null) {
        this.empty_instance.remove();
        this.empty_instance = null;
    }

    return self;
};

DynamicTemplatePlaceholder.prototype.build_instance = function (definition, dynamic_value, before_instance) {
    var anchor = (typeof before_instance === "object") ? before_instance.first : this.anchor;

    var result = new templates_module.types.DynamicTemplateInstance(this, anchor, definition.get_clone());
    result.dynamic_value = dynamic_value;
    result.build();

    if (typeof this.on_instance === "function") {
        this.on_instance(result);
    }

    return result;
};

DynamicTemplatePlaceholder.prototype.add_instance = function (dynamic_value, before_instance) {
    var result = this.build_instance(this.definition, dynamic_value, before_instance);
    this.instances.push(result);

    return result;
};

DynamicTemplatePlaceholder.prototype.set_instance = function (dynamic_value) {

    this.clear();
    var result = this.build_instance(this.definition, dynamic_value);
    this.instances.push(result);

    return result;
};

DynamicTemplatePlaceholder.prototype.empty = function () {

    if (!this.is_empty()) {

        this.clear();
    }

    if (this.on_empty !== null && this.empty_instance === null) {
        this.empty_instance = this.build_instance(this.on_empty, null);
    }

    return this;
};

DynamicTemplatePlaceholder.prototype.remove_instance = function (instance) {
    if (instance !== this.empty_instance) {
        var instance_index = this.instances.indexOf(instance);

        if (instance_index >= 0) {
            this.instances.splice(instance_index, 1);
        } else {
            logger.error('remove instance from placeholder failed', instance, this);
        }
    }
};

function DynamicTemplateInstance() {
}

DynamicTemplateInstance.prototype.debug_info = function () {
    var result = {};

    result.id = this.sequence + '_' + (this.placeholder === null ? 'BODY' : this.placeholder.definition.name + (this.dynamic_value !== null ? '_' + this.dynamic_value.name : ''));
    result.child_instances = this.child_instances.length;
    var my_node = this.child_nodes[0];
    var node_info = my_node.tagName + '.' + dynamic_utils.make_array(my_node.classList).join('.');
    result.node = node_info;
    result.controls = this.controls ? this.controls.length : 0;
    result.placeholders = Array.isArray(this.placeholders) ? this.placeholders.length : 0;
    result.instance = this;
    this.debug = result.id;

    return result;
};

DynamicTemplateInstance.prototype.enhance = function (methods) {
    Object.keys(methods).forEach(function enhance_instance(method_name) {
        DynamicTemplateInstance.prototype['super_' + method_name] = DynamicTemplateInstance.prototype[method_name];
        DynamicTemplateInstance.prototype[method_name] = methods[method_name];
        this[method_name] = methods[method_name];
    });
};

DynamicTemplateInstance.prototype.get_template_by_name = templates_module.get_template_by_name;

DynamicTemplateInstance.prototype.set_parent = function (parent_instance) {
    if (typeof parent_instance === "undefined") {
        parent_instance = null;
    }
    this.parent_instance = parent_instance;

    if (this.parent_instance !== null) {
        this.parent_instance.add_child_instance(this);
    }
};

DynamicTemplateInstance.prototype.create_placeholder = function (definition, anchor, origin) {
    var result = new templates_module.types.DynamicTemplatePlaceholder(definition, anchor, origin);

    this.placeholders.push(result);
    result.parent_instance = this;

    return result;
};

DynamicTemplateInstance.prototype.add_child_instance = function (child_instance) {
    this.child_instances.push(child_instance);

    return this;
};

DynamicTemplateInstance.prototype.remove_child_instance = function (child_instance) {
    var ix = this.child_instances.indexOf(child_instance);

    if (ix < 0) {
        logger.error('Could not remove child instance', child_instance, this);
    } else {
        this.child_instances.splice(ix, 1);
    }

    return this;
};

DynamicTemplateInstance.prototype.add_observer = function (observer) {
    if (this.observers.hasOwnProperty(observer.reference)) {
        logger.error('Instance redefines observer ' + observer.reference, this);
    } else {
        this.observers[observer.reference] = observer;
    }
};

DynamicTemplateInstance.prototype.add_value = function (dynamic_value) {
    if (this.placeholder !== null) {
        this.placeholder.add_value(dynamic_value);
    }
};

DynamicTemplateInstance.prototype.node_inserted = function (node) {
    //
};

DynamicTemplateInstance.prototype.swap = function (other_instance) {
    var
        my_nodes = [],
        other_nodes = [];

    htmlcomment_logger.debug(function () {
        my_nodes.push(this.instance_first);
        other_nodes.push(other_instance.instance_first);
    }, this);

    my_nodes = my_nodes.concat(this.child_nodes);
    other_nodes = other_nodes.concat(other_instance.child_nodes);

    htmlcomment_logger.debug(function () {
        my_nodes.push(this.instance_last);
        other_nodes.push(other_instance.instance_last);
    }, this);

    my_nodes.forEach(function (child_node) {
        this.anchor.parentNode.insertBefore(child_node, other_instance.last);
    }, this);

    other_nodes.forEach(function (child_node) {
        other_instance.anchor.parentNode.insertBefore(child_node, this.last);
    }, this);

    var
        other_last = other_instance.last,
        other_first = other_instance.first;
    other_instance.last = this.last;
    other_instance.first = this.first;

    this.last = other_last;
    this.first = other_first;

};

DynamicTemplateInstance.prototype.build = function () {
    var self = this;

    if (this.placeholder !== null) {

        var
		  	value_name = (typeof this.dynamic_value === "object" && this.dynamic_value !== null) ? this.dynamic_value.name.replace(/\./g, '-') : '',
			value_for = value_name.length <1 ? '' : (' for ' + value_name);


		  logger.debug('> DynamicTemplateInstance::build '+  this.placeholder.definition.name + value_for + ' - '+this.child_nodes[0].tagName );

        this.first = dynamic_dom.insert_text_before(this.anchor, '\n');

        htmlcomment_logger.debug(function () {
            this.instance_first = dynamic_dom.insert_comment_before(this.anchor, 'Start instance ' + this.placeholder.definition.name + value_for);
        }, this);

        this.child_nodes.forEach(function (child_node) {
            if (typeof this.dynamic_value === "object" && this.dynamic_value !== null) {
                dynamic_dom.add_class(child_node, value_name);
            }
            this.anchor.parentNode.insertBefore(child_node, this.anchor);
        }, this);

        htmlcomment_logger.debug(function () {
            this.instance_last = dynamic_dom.insert_comment_before(this.anchor, this.placeholder.definition.name + ' instance' + value_name + ' end');
        }, this);

        this.last = dynamic_dom.insert_text_before(this.anchor, '\n');

		  logger.debug('< DynamicTemplateInstance::build '+  this.placeholder.definition.name + value_for );
    }
};

DynamicTemplateInstance.prototype.remove = function () {

	logger.debug('> DynamicTemplateInstance::remove '+  this.placeholder.definition.name + ' - '+this.child_nodes[0].tagName  );

    var children = dynamic_utils.list_duplicate(this.child_instances.reverse());

    children.forEach(function remove_child(child_instance) {
        child_instance.remove();
    }, this);
    // this.child_instances = [];

    Object.keys(this.observers).forEach(function unobserve(observer_ref) {
        var observer = this.observers[observer_ref];
        observer.remove();
    }, this);
    this.observers = {};

    this.placeholders.forEach(function remove_placeholder(placeholder) {
        placeholder.remove();
    });
    this.placeholders = [];

    if (this.dynamic_value !== null) {
        this.dynamic_value.remove_instance(this);
    }

    if (this.placeholder !== null) {

        this.placeholder.remove_instance(this);
        templates_module.vars.Instances.splice(templates_module.vars.Instances.indexOf(this), 1);

        dynamic_dom.remove_node(this.last);

        this.child_nodes.reverse().forEach(function (child_node) {
            dynamic_dom.remove_node(child_node);
        });
        dynamic_dom.remove_node(this.first);

        htmlcomment_logger.debug(function () {
            dynamic_dom.remove_node(this.instance_last);
            dynamic_dom.remove_node(this.instance_first);
        }, this);

    }

    if (this.parent_instance !== null) {
        this.parent_instance.remove_child_instance(this);
    }

	 logger.debug('< DynamicTemplateInstance::remove '+  this.placeholder.definition.name  );
};

DynamicTemplateInstance.prototype.get_nodes = function () {
    return this.child_nodes;
};

templates_module.types.DynamicTemplateDefinition.prototype = new DynamicTemplateDefinition();
templates_module.types.DynamicTemplateDefinition.constructor = templates_module.types.DynamicTemplateDefinition;
templates_module.types.DynamicTemplatePlaceholder.prototype = new DynamicTemplatePlaceholder();
templates_module.types.DynamicTemplatePlaceholder.constructor = templates_module.types.DynamicTemplatePlaceholder;
templates_module.types.DynamicTemplateInstance.prototype = new DynamicTemplateInstance();
templates_module.types.DynamicTemplateInstance.constructor = templates_module.types.DynamicTemplateInstance;

module.exports = templates_module;
