var
    logger_name = 'Dynamic Formulas test',
    logger = require('../src/modules/browser_log').get_logger(logger_name),
    test = require('tape'),
    utils_module = require('../src/modules/dynamic-utils.js'),
    values_module = require('../src/modules/dynamic-values.js'),
    formulas_module = require('../src/modules/dynamic-formulas.js'),
    values_logger = logger.module.get_logger(values_module.info.Name)
    ;


logger.module.set_default_level(logger.module.Levels.WARNING);
test('Basic Values API ', function (t) {

    values_module.reset_for_test();

    var testcases = [
        {f: "1 + 1", e: 1 + 1},
        {f: "1 + 1 + 1", e: 1 + 1 + 1},
        // {f: "2 + 3 * 4", 			e: 2 + 3*4 },
        // {f: "(2 * 3) + 4", 			e: (2*3) + 4 },
        // {f: "2 + 3 * 4", 			e: 2 + 3*4 },
        // {f: "(2 + 3) * 4", 			e: (2+3)*4 },
        {f: "3 / 4 / 5", e: 3 / 4 / 5},
        // {f: "3 / (4 / 5)", 			e: 3/(4/5) },
        // {f: "formulas.input.two + formulas.input.three * formulas.input.four", 			e: 2 + 3*4 },
        {f: "formulas.input.two * formulas.input.three + formulas.input.four", e: 2 * 3 + 4},
        {f: "Sum( formulas.input.* )", e: 2 + 3 + 4}
    ];

    values = [
        {n: 'two', v: 2},
        {n: 'three', v: 3},
        {n: 'four', v: 4}
    ];

    values.forEach(function (value_definition) {
        var dv = values_module.get_or_define('formulas.input.' + value_definition.n);
        dv.value = value_definition.v;
    });


    t.plan(testcases.length);

    testcases.forEach(function (testcase, index) {
        var
            dynamic_value = values_module.get_or_define('formulas.test.' + index),
            formula_value = formulas_module.enhance_as_formula(dynamic_value, testcase.f)
            ;

        formula_value.parse_formula();
        formula_value.calculate();

        t.equals(formula_value.value, testcase.e, testcase.f + ' = ' + formula_value.value + ' (' + testcase.e + ')');

    });

    t.end();

});
