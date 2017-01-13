var dynamic = {
	info: {
		Name: "Dynamic Page1",
		Description: "First web page based on the new framework",
		Version: "1.01.1"
	},
	vars: {

	},
	types: {

	}
};

var
	dynamic_app = require('./dynamic-app.js'),
	dynamic_dom = require('./dynamic-dom.js'),
	logger = require('./browser_log').get_logger(dynamic.info.Name),
	person_list;

var log_config = {};
log_config[dynamic_dom.info.Name] = logger.module.Levels.WARNING;
log_config[dynamic_app.info.Name] = logger.module.Levels.WARNING;
log_config["Dynamic values"] = logger.module.Levels.WARNING;
log_config["Dynamic templates"] = logger.module.Levels.WARNING,
log_config[dynamic.info.Name] = logger.module.Levels.WARNING;
log_config["meta info"] = logger.module.Levels.DEBUG;

logger.module.configure(log_config);

dynamic_app.register_component('.dynamic-person')
	.on_initialise(function(component_element) {
		var replace_count = 0;

		logger.info(dynamic.info);

		dynamic_dom.get_elements(component_element, 'label').forEach(function(label_element) {
			dynamic_dom.get_nodes(label_element, {
				node_type: Node.TEXT_NODE
			}, function(text_node) {
				if (label_find_re.test(text_node.textContent)) {
					var
						match = text_node.textContent.match(label_find_re),
						reallabel = match[1],
						remainder = match[2];

					var span = document.createElement('span');
					span.className = 'reallabel';
					span.textContent = reallabel;
					text_node.parentNode.insertBefore(span, text_node);
					text_node.textContent = remainder;
					replace_count++;
				}
			});
		});

		logger.debug('Replaced ' + replace_count + ' text labels.');

	})
	.on_started(function(component_element) {

		var
			show_button = dynamic_dom.get_element(component_element, '#show-button'),
			set_button = dynamic_dom.get_element(component_element, '#set-button'),
			dv_persons = dynamic_app.dynamic_value('persons');

		set_button.addEventListener('click', function() {
			dv_persons.set_value(person_list);
			// set_button.remove();
		});

		show_button.addEventListener('click', function() {
			console.debug('Person list:', person_list, 'Dynamic variable:', dv_persons);
		});

	});

module.exports = dynamic;

person_list = {
	harry: {
		'last-name': "de Kroon",
		id: 15,
		description: 'person harry',
		address: {
			city: 'Rozendaal',
			number: 28,
			street: 'Delhoevelaan'
		},
		'first-name': "Harry",
		company: {
			name: 'Ciber',
			address: {
				number: 105,
				street: 'Vredeoord',
				city: 'Eindhoven'
			}
		},
		'birth-date': "15 sep 1967"
	},
	cindy: {
		description: 'person cindy',
		'last-name': "Brokking",
		id: 1,
		address: {
			city: 'Rozendaal',
			number: 28,
			street: 'Delhoevelaan'
		},
		'first-name': "Cindy",
		company: {
			name: 'Color BC',
			address:{
				street: 'Eusebiusbuitensingel',
				number: '7-9',
				city: 'Arnhem'
			}
		},
		'birth-date': "4 aug 1974"
	},
	bo: {
		'last-name': "Zwiers",
		id: 2002,
		address: {
			number: 0,
			city: 'Rozendaal'
		},
		description: 'person bo',
		'first-name': "Bo",
		company: {
			name: 'Oranjerie',
		},
		'birth-date': "26 mrt 2002"
	},
	bengt: {
		'last-name': "Zwiers",
		id: 2005,
		'first-name': "Bengt",
		'birth-date': "15 feb 2005"
	},
	fenna: {
		'last-name': "de Kroon",
		id: 2001,
		address: {
			city: 'Gorredijk',
			number: 40,
			street: 'Weverij'
		},
		'first-name': "Fenna",
		company: {
			name: 'Hema',
			address: {
				city: 'Gorredijk'
			}
		},
		'birth-date': "5 feb 2001"
	},
	mara: {
		'last-name': "de Kroon",
		id: 200204,
		address: {
			city: 'Gorredijk',
			number: 40,
			street: 'Weverij'
		},
		'first-name': "Mara",
		'birth-date': "23 apr 2002"
	}
};

var label_find_re = /([^:]*):\s*(.*)/;
