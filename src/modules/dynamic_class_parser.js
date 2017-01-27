var 
	logger_name = 'Dynamic Class Parser',
 	logger = require('./browser_log').get_logger( logger_name )
;

var
	keywords = {
		range_all: '[]',
		range_empty: '<>'
	}
;


function ClassNameParser( class_name_string ){
	this.class_names = class_name_string.split(' ');
	this.remove_names = [];
	this.class_name_index = 0;
	this.class_name = '';
	this.skip = true;

	this.dynamic_value_name_raw = '';
	this.selected = '';
	this.sort_order = '';

	this.range = keywords.range_all;

	this.place_here = false;
	this.multiple 	= false;

	this.negated 	= false;

	this.class_keyword_methods = {
		when: 		ClassNameParser.prototype.set_instance_single,
		for: 		ClassNameParser.prototype.set_instance_single,
		each: 		ClassNameParser.prototype.set_instance_multiple,
		not: 		ClassNameParser.prototype.set_range_empty,
		no: 		ClassNameParser.prototype.set_range_empty,
		none: 		ClassNameParser.prototype.set_range_empty,
		empty: 		ClassNameParser.prototype.set_range_empty,
		available: 	ClassNameParser.prototype.set_range_all,
		selected: 	ClassNameParser.prototype.set_range_selected,
		index:      ClassNameParser.prototype.set_range_selected_index,
		in: 		ClassNameParser.prototype.set_range,
		is: 		ClassNameParser.prototype.set_range_from_literal
	};

	Object.defineProperty( this, 'dynamic_value_name', {get: function() {return this.dynamic_value_name_raw+this.selected; }  });
}

ClassNameParser.prototype.parse = 	function(){

	while (this.has_next()){
		this.advance();
		this.perform_keyword_method();
	}

	return this;
};

ClassNameParser.prototype.perform_keyword_method = 	function(){
	var
		method = ClassNameParser.prototype.skip,
		value_name
	;

	if (this.class_keyword_methods.hasOwnProperty( this.class_name )){
		this.skip = false;
		method = this.class_keyword_methods[ this.class_name ];
		this.remove_class();
	} else {
		if (!this.skip){
			method = ClassNameParser.prototype.set_dynamic_value;
			value_name = this.class_name;
		}
	}

	method.call( this, value_name );
};

ClassNameParser.prototype.set_dynamic_value = 	function( value_name ){
	if (typeof value_name === "string"){
		this.dynamic_value_name_raw = value_name;
	}
};


ClassNameParser.prototype.set_instance_single = function(){
	this.place_here = true;
	this.multiple 	= false;
};

ClassNameParser.prototype.set_instance_multiple = function(){
	this.place_here = true;
	this.multiple 	= true;
};

ClassNameParser.prototype.skip = 				function(){};

ClassNameParser.prototype.set_range_empty = 	function(){
	this.range = this.negated? keywords.range_all : keywords.range_empty;
	this.negated = true;
};

ClassNameParser.prototype.set_range_all = 	function(){
	this.range = this.negated? keywords.range_empty : keywords.range_all;
};

ClassNameParser.prototype.set_range_selected_index = function(){
	this.selected = '.$selected';
	this.set_range_all();
};

ClassNameParser.prototype.set_range_selected = function(){
	this.selected = this.negated? '.$selected': '.@';
	this.set_range_all();
};

ClassNameParser.prototype.remove_class = 			function(){
	this.remove_names.push( this.class_name );
};

ClassNameParser.prototype.set_range = 			function(){
	this.range = this.advance();
	this.remove_class();
};

ClassNameParser.prototype.set_range_from_literal = function(){
	var literal = this.advance()
	this.remove_class();
	this.range = keywords.range_all.slice(0,1) + literal +","+literal+ keywords.range_all.slice(-1);
};

ClassNameParser.prototype.advance = function(){
	this.class_name = this.class_names[ this.class_name_index++ ];

	return this.class_name;
};

ClassNameParser.prototype.has_next = function(){
	return result = this.class_name_index < this.class_names.length;
};

ClassNameParser.prototype.to_string = function(){
	var result = 
		"V="+this.dynamic_value_name + "; "+
		"R="+this.range +'; '+
		"remove "+ this.remove_names.join(", ") +
		this.sort_order.length>0? '; sort by '+this.sort_order
	;

	return result;
};

module.exports = ClassNameParser;
