var dynamic_formulas = {
	info: {
		Name: "Dynamic formulas",
		Description: "calculate values based on live data.",
		Version: "1.01.1"
	},
	vars: {},
	types: {},
	api: {
		enhance_as_formula: function enhance_dynamic_value_as_formula(dynamic_value, formula) {
			return FormulaValue(dynamic_value, formula);
		}
	}
};

var
	dynamic_utils = require('./dynamic-utils'),
	value_module = require('./dynamic-values.js'),
	logger = require('./browser_log').get_logger(dynamic_formulas.info.Name);

module.exports = dynamic_formulas.api;

function FormulaValue(dv, formula) {

	if (typeof dv.formula === "undefined") {

		Object.keys(FormulaValue.prototype).forEach(function set_method(method_name) {
			dv[method_name] = FormulaValue.prototype[method_name];
		});

		dv.make_formula(formula);

	} else {
		if (dv.formula !== formula) {
			logger.warning(dv.name + ' already has formula "' + dv.formula + '"; ignoring "' + formula + '"');
		}
	}

	return dv;
}

FormulaValue.prototype.make_formula = function(formula) {
	this.operands = [];
	this.operators = [];
	this.formula = formula;
	this.parsed = false;
};

FormulaValue.prototype.calculate_simple_operation = function(operation) {
	var operands = [];

	for (oi = 0; oi < operation.operands; oi++) {
		operands.push(this.operands.pop());
	}

	this.push_literal(operation.operation.apply(this, operands.reverse()));

};

FormulaValue.prototype.calculate = function() {
	var
		result = "",
		operators = dynamic_utils.array_duplicate(this.operators),
		operands = dynamic_utils.array_duplicate(this.operands);

	logger.debug('calculate ' + this.formula + ' for ' + this.name + ' = ' + result);

	while (this.operands.length > 1) {
		var
			operator = operators.pop();

		this.calculate_simple_operation(operator);
	}

	var
		operand = this.operands.pop();

	result = operand.get_value();

	this.operands = operands;

	this.set_value(result);

};

function get_numerical_value(operand) {
	var result = 0;

	if (operand.include()) {
		result = Number(operand.get_value());
	}

	return result;
}

function set_numerical_value(param) {
	var result;

	if (isNaN(param) || !isFinite(param)) {
		result = '';
	} else {
		result = Number(param);
	}

	return result;
}

var
	naive_re = /\s*(([+\-*\/])\s*((?:[@$.]|\w)+))/g,
	first_re = /^(.*?)(?:(\s+[+\-*\/])|$)/,
	operations = {
		'+': {
			operands: 2,
			operation: function f_add(op1, op2) {
				return set_numerical_value(get_numerical_value(op1) + get_numerical_value(op2));
			}
		},
		'-': {
			operands: 2,
			operation: function f_sub(op1, op2) {
				return set_numerical_value(get_numerical_value(op1) - get_numerical_value(op2));
			}
		},
		'/': {
			operands: 2,
			operation: function f_div(op1, op2) {
				return set_numerical_value(get_numerical_value(op1) / get_numerical_value(op2));
			}
		},
		'*': {
			operands: 2,
			operation: function f_mul(op1, op2) {
				return set_numerical_value(get_numerical_value(op1) * get_numerical_value(op2));
			}
		}
	};

FormulaValue.prototype.push_operator = function(operator) {
	var worker = operations[operator];
	this.operators.push(worker);
};

FormulaValue.prototype.push_literal = function(operand) {
	this.operands.push({
		include: function() {
			return true;
		},
		get_value: function() {
			return operand;
		}
	});
};

FormulaValue.prototype.push_operand = function(operand) {
	if (/^^\d+(\.\d+)?$/.test(operand)) {
		this.push_literal(operand);
	} else {

		// get value through this, say may be relative to parent instance (starting with dot).
		var dv = this.get_dynamic_value(operand);
		this.operands.push({
			include: function() {
				return !dv.is_empty();
			},
			get_value: function() {
				return dv.get_value();
			}
		});
		var self = this;

		dv.observe(this.formula, function operand_value_changed(v) {
			self.calculate();
		}, this);
	}
};

function FunctionSum(formula_value, params) {
	this.formula_value = formula_value;
	this.reference = params[0];
	this.value_decimals = params.length > 1 ? params[1] : -1;
	this.value_refs = [];
	this.operand_count = 0;

	var star_pos = this.reference.indexOf('*');

	if (star_pos > 0) {
		var
			parent_ref = this.reference.substring(0, star_pos - 1),
			/* -1 to get rid of the dot */
			childs_ref = this.reference.substring(star_pos + 1);

		// get value through module, thus must be full reference, not starting with dot
		this.parent_value = value_module.get_by_name(parent_ref);

		if (this.parent_value === null) {
			logger.error('unknown reference "' + parent_ref + '"');
		} else {
			var
				child_values = this.parent_value.get_children(),
				child_count = 0;
			child_values.forEach(function(child_value) {
				var
					operand = child_value.name + childs_ref,
					operand_value_parent = value_module.get_by_name(operand.split('.').slice(0, -1).join('.'));
				// TODO: proper check if value can exist
				if (operand_value_parent !== null && !operand_value_parent.is_empty()) {
					child_count++;
					this.formula_value.push_operand(operand);
				}

			}, this);
			this.operand_count = child_count;
		}
	}
}

FunctionSum.prototype.calculate = function calculate_sum() {
	var result = 0;

	Array.prototype.slice.call(arguments[0]).forEach(function add_to_sum(operand) {
		var intermediate = get_numerical_value(operand);
		result += (typeof intermediate === "string" ? 0 : intermediate);
	});

	return set_numerical_value(result);
};

var
	known_functions = {
		sum: {
			params_re: /^([^\ ,]+)\s*(?:,\s*(\d+))?\s*(?:,\s*(\d+))?$/,
			params_explain: 'value_reference [, decimals]',
			class: FunctionSum
		}
	};

FormulaValue.prototype.parse_function = function(func) {
	var
		h1 = func.indexOf('('),
		h2 = func.indexOf(')'),
		func_name = func.substring(0, h1).trim().toLowerCase(),
		func_params = func.substring(h1 + 1, h2).trim();

	if (!known_functions.hasOwnProperty(func_name)) {
		logger.error('Unknown function "' + func_name + '" in ' + this.formula);
	} else {
		var
			func_parser = known_functions[func_name],
			func_params_match = func_params.match(func_parser.params_re);
		if (!func_params_match) {
			logger.error('invalid parameters "' + func_params + '"; ' + func_name + ': ' + func_parser.params_explain);
		} else {
			function_instance = new func_parser.class(this, func_params_match.slice(1));
			this.operators.push({
				operands: function_instance.operand_count,
				operation: function f_fn() {
					return function_instance.calculate(arguments);
				}
			});
		}
	}

};

FormulaValue.prototype.parse_formula = function() {

	if (!this.parsed) {

		var
			to_parse = this.formula,
			match = to_parse.match(first_re),
			operand = match[1],
			operator;

		if (operand.indexOf('(') > 0) {
			this.parse_function(operand);
		} else {
			this.push_operand(operand);
		}

		to_parse = to_parse.substring(operand.length);

		match = naive_re.exec(to_parse);

		while (match) {
			operator = match[2];
			operand = match[3];
			this.push_operator(operator);
			this.push_operand(operand);
			match = naive_re.exec(to_parse);
		}

		this.parsed = true;

		this.calculate();
	}
};
