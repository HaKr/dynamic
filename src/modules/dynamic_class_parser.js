var
    api_keywords = require('./dynamic-api_keywords.js'),

    logger_name = 'Dynamic Class Parser',
    logger = require('./browser_log').get_logger(logger_name)
    ;

/**
 *
 * @class ClassNameParser
 * @param class_name_string
 * @constructor ClassNameParser.prototype.parse
 * @author Harry de Kroon
 * @return Unknown No return values. ( you can access all the values of this class,
 * after you've parsed a class name string )
 *
 * This class has the ability to parse class name strings with a certain structure,
 * existing out of simple and logical text only. The parser will search for known keywords,
 * depending on the key it'll perform some actions and set the value that belongs to it.
 *
 */

function ClassNameParser(class_name_string) {
    this.template_name = '';
    this.extend_template_name = '';
    this.class_names = class_name_string.split(' ');
    this.remove_names = [];
    this.class_name_index = 0;
    this.class_name = '';
    this.options = [];
    this.place_template = false;

    this.dynamic_value_name_raw = '';
    this.dynamic_value_child_reference = '';
    this.selected = '';
    this.sort_order = '';

    this.range = api_keywords.template.range.all;

    this.place_here = false;
    this.multiple = false;

    this.negated = false;

    this.parameter = false;
    this.argument = false;

    this.unknown_keyword_methods = {
        default: ClassNameParser.prototype.skip,
        set_dynamic_value: ClassNameParser.prototype.set_dynamic_value,
        set_dynamic_child_value: ClassNameParser.prototype.set_dynamic_value_child,
        set_sort_order: ClassNameParser.prototype.set_sort_order,
        set_range: ClassNameParser.prototype.set_range_value
    };

    this.unknown_keyword_method = this.unknown_keyword_methods.default;


    this.class_keyword_methods = {};

    this.class_keyword_methods[api_keywords.template.tag] = ClassNameParser.prototype.set_template_name;
    this.class_keyword_methods[api_keywords.template.extends] = ClassNameParser.prototype.set_extend_template_name;
    this.class_keyword_methods[api_keywords.template.when] = ClassNameParser.prototype.set_instance_single;
    this.class_keyword_methods[api_keywords.template.has] = ClassNameParser.prototype.set_child_reference;
    this.class_keyword_methods[api_keywords.template.for] = ClassNameParser.prototype.set_instance_single;
    this.class_keyword_methods[api_keywords.template.for_each] = ClassNameParser.prototype.set_instance_multiple;
    this.class_keyword_methods[api_keywords.template.not] = ClassNameParser.prototype.set_range_empty;
    this.class_keyword_methods[api_keywords.template.no] = ClassNameParser.prototype.set_range_empty;
    this.class_keyword_methods[api_keywords.template.none] = ClassNameParser.prototype.set_range_empty;
    this.class_keyword_methods[api_keywords.template.empty] = ClassNameParser.prototype.set_range_empty;
    this.class_keyword_methods[api_keywords.template.available] = ClassNameParser.prototype.set_range_all;
    this.class_keyword_methods[api_keywords.template.selected] = ClassNameParser.prototype.set_range_selected;
    this.class_keyword_methods[api_keywords.template.index] = ClassNameParser.prototype.set_range_selected_index;
    this.class_keyword_methods[api_keywords.template.place] = ClassNameParser.prototype.set_place_template;
    this.class_keyword_methods[api_keywords.template.argument] = ClassNameParser.prototype.set_argument;
    this.class_keyword_methods[api_keywords.template.parameter] = ClassNameParser.prototype.set_parameter;
    this.class_keyword_methods[api_keywords.template.range.tag] = ClassNameParser.prototype.set_range;
    this.class_keyword_methods[api_keywords.template.range.in] = ClassNameParser.prototype.set_range;
    this.class_keyword_methods[api_keywords.template.range.is] = ClassNameParser.prototype.set_range_from_literal;
    this.class_keyword_methods[api_keywords.template.sort.by] = ClassNameParser.prototype.set_sort;
    this.class_keyword_methods[api_keywords.template.sort.order] = ClassNameParser.prototype.set_sort;
    this.class_keyword_methods[api_keywords.template.sort.tag] = ClassNameParser.prototype.set_sort;

    Object.defineProperty(this, 'dynamic_value_name', {
        get: function () {
            return this.dynamic_value_name_raw + this.selected + this.dynamic_value_child_reference;
        }
    });
}

ClassNameParser.prototype.parse = function () {

    while (this.has_next()) {
        this.advance();
        this.perform_keyword_method();
    }
    this.options = this.array_diff(this.class_names, this.remove_names);
    return this;
};

ClassNameParser.prototype.perform_keyword_method = function () {
    var
        method = ClassNameParser.prototype.skip,
        method_from_keyword
        ;

    method_from_keyword = this.method_from_keyword();

    if (method_from_keyword !== null) {
        method = method_from_keyword;
    } else {
        method = this.unknown_keyword_method;
        this.unknown_keyword_method = this.unknown_keyword_methods.default;
    }

    if (typeof method !== "function") {
        logger.debug('Unknown method', this.class_name, this);
    }

    method.call(this);
};

ClassNameParser.prototype.set_template_name = function () {
    this.remove_class();
    this.advance();
    if (this.class_name == api_keywords.template.place) {
        this.set_place_template();
    } else {
        this.template_name = this.class_name;
        this.unknown_keyword_method = this.unknown_keyword_methods.set_dynamic_value;
    }
};

ClassNameParser.prototype.set_extend_template_name = function () {
    this.remove_class();
    this.advance();
    this.extend_template_name = this.class_name;
    this.unknown_keyword_method = this.unknown_keyword_methods.set_dynamic_value;
};

ClassNameParser.prototype.set_dynamic_value = function () {
    this.dynamic_value_name_raw = this.class_name;
};

ClassNameParser.prototype.set_dynamic_value_child = function () {
    this.dynamic_value_child_reference = '.' + this.class_name;
    this.remove_class();
};


ClassNameParser.prototype.skip = function () {
};

ClassNameParser.prototype.set_instance_single = function () {
    this.place_here = true;
    this.multiple = false;
    this.unknown_keyword_method = this.unknown_keyword_methods.set_dynamic_value;
};

ClassNameParser.prototype.set_instance_multiple = function () {
    this.place_here = true;
    this.multiple = true;
    this.unknown_keyword_method = this.unknown_keyword_methods.set_dynamic_value;
};

ClassNameParser.prototype.set_child_reference = function () {
    this.unknown_keyword_method = this.unknown_keyword_methods.set_dynamic_child_value;
    this.remove_class(this.dynamic_value_name_raw);
};


ClassNameParser.prototype.method_from_keyword = function () {
    var
        result = null
        ;
    if (this.class_keyword_methods.hasOwnProperty(this.class_name)) {
        result = this.class_keyword_methods[this.class_name];
        this.remove_class();
    }

    return result;
};

ClassNameParser.prototype.set_range_value = function () {
    this.range = this.class_name;
    this.remove_class();
    this.unknown_keyword_method = this.unknown_keyword_methods.default;
};

ClassNameParser.prototype.set_range = function () {
    this.unknown_keyword_method = this.unknown_keyword_methods.set_range;
};

ClassNameParser.prototype.set_range_empty = function () {
    this.unknown_keyword_method = this.unknown_keyword_methods.default;
    this.range = this.negated ? api_keywords.template.range.all : api_keywords.template.range.empty;
    this.negated = true;
    this.unknown_keyword_method = this.unknown_keyword_methods.set_dynamic_value;
};

ClassNameParser.prototype.set_range_all = function () {
    this.range = this.negated ? api_keywords.template.range.empty : api_keywords.template.range.all;
    this.unknown_keyword_method = this.unknown_keyword_methods.default;
};

ClassNameParser.prototype.set_range_selected_index = function () {
    this.selected = '.$selected';
    this.set_range_all();
};

ClassNameParser.prototype.set_place_template = function () {
    this.remove_class();
    this.place_template = true;
    this.template_name = this.advance();
};

ClassNameParser.prototype.set_argument = function () {
    this.advance();
    this.argument = this.class_name;
};

ClassNameParser.prototype.set_parameter = function () {
    this.advance();
    this.parameter = this.class_name;
};

ClassNameParser.prototype.set_range_selected = function () {
    this.selected = this.negated ? '.$selected' : '.@';
    this.set_range_all();
    this.unknown_keyword_method = this.unknown_keyword_methods.set_dynamic_value;
};

ClassNameParser.prototype.remove_class = function (class_name) {
    var class_name_to_remove = typeof class_name === "string" ? class_name : this.class_name;
    if (class_name_to_remove != undefined) {
        this.remove_names.push(class_name_to_remove)
    }
};

ClassNameParser.prototype.set_sort = function () {
    this.unknown_keyword_method = this.unknown_keyword_methods.set_sort_order;
};

ClassNameParser.prototype.set_sort_order = function () {
    this.sort_order = this.class_name;
    this.remove_class();
    this.unknown_keyword_method = this.unknown_keyword_methods.default;
};

ClassNameParser.prototype.set_range_from_literal = function () {
    var literal = this.advance();
    this.remove_class();
    this.range = api_keywords.template.range.all.slice(0, 1) + literal + "," + literal + api_keywords.template.range.all.slice(-1);
};

ClassNameParser.prototype.advance = function () {
    this.class_name = this.class_names[this.class_name_index++];

    return this.class_name;
};

ClassNameParser.prototype.has_next = function () {
    return this.class_name_index < this.class_names.length;
};

ClassNameParser.prototype.to_string = function () {
    var result = "";
    result += (this.template_name !== '' ? "T=" + this.template_name + "; " : "");
    result += (this.extend_template_name !== '' ? "E=" + this.extend_template_name + "; " : "");
    result += (this.dynamic_value_name !== '' ? "V=" + this.dynamic_value_name + "; " : "");
    result += "R=" + this.range + '; ';

    result += "remaining: " + this.array_diff(this.class_names, this.remove_names).join(" ") +
        (this.sort_order.length > 0 ? '; sort-by: ' + this.sort_order : '')
    ;

    return result;
};

ClassNameParser.prototype.array_diff = function (a, b) {
    return a.filter(function (i) {
        return b.indexOf(i) < 0;
    });
};
// ClassNameParser.prototype.to_string = function () {
//     var result =
//             "V=" + this.dynamic_value_name + "; " +
//             "R=" + this.range + '; ' +
//             "remove " + this.remove_names.join(", ") +
//             (this.sort_order.length > 0 ? '; sort by ' + this.sort_order : '')
//         ;
//
//     return result;
// };

module.exports = ClassNameParser;
