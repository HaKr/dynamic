(function Convert(argv){
	"use strict";

	const optimist = require('optimist');
	const parse5 = require('parse5');
	const http = require('http');
	const fs = require('fs');

	var argv = optimist.usage('Usage: $0 --in dynamic_file --out html_file')
                     .demand(['in', 'out'])
                     .default('out', '')
                     .argv;

    const infile = argv.in;
	const outfile = argv.out; 

	const instream=fs.createReadStream( infile );
	const outstream=fs.createWriteStream( outfile );

	const parser = new parse5.SAXParser();

	
	function verbatim(str){
		outstream.write( str );
	}

	function AttributeList(attrs,name){
		this.attrs = attrs;
		this.name = name;
	}

	AttributeList.prototype.forEach = function( callback ){
		if (typeof this.attrs !== "undefined" && typeof this.attrs.forEach === "function"){
			this.attrs.forEach( callback, this );
		}
	};

	AttributeList.prototype.get_attribute_by_name = function( attr_name ){
		let result = null;

		let attr_index =this.attrs.findIndex(function(attr){ return attr.name === attr_name});
		if (attr_index >=0 ){
			result = this.attrs[attr_index];
		}

		return result;
	}

	AttributeList.prototype.concatenate = function( others ){
		let self=this;

		others.forEach(function(other_attr){
			let attr = self.get_attribute_by_name( other_attr.name );

			if (attr === null){
				self.attrs.push( other_attr );
			} else {
				if (other_attr.name === 'class'){
					self.add_class( other_attr.value );
				} else {
					console.error("Ignoring '"+other_attr.value+"' for "+other_attr.name );
				}
			}
		}, this );
	};

	AttributeList.prototype.remove_attr = function ( attr_name ){
		let result='';
		let attr = this.get_attribute_by_name( attr_name );
		if (attr !== null){
			result = attr.value;
			this.attrs = this.attrs.filter( function(a){ return a !== attr } );
		}

		return result;
	};

	AttributeList.prototype.rephrase = function(friendly_names){
		if (!Array.isArray(friendly_names)){
			friendly_names = Array.prototype.slice.call(arguments);
		}
		let self=this;
		this.attrs.forEach( function(attr){
			let ix = friendly_names.indexOf(attr.name);

			if (ix >= 0){
				attr.name= 'data-' + self.name + '-' + attr.name;
			}

		});

		return this;
	};

	AttributeList.prototype.optionize = function(friendly_names){
		if (!Array.isArray(friendly_names)){
			friendly_names = Array.prototype.slice.call(arguments);
		}

		let self = this;
		let attr_value=this.attrs.filter( function(attr){
			return friendly_names.indexOf(attr.name) >= 0;
		}).map(function(attr){
			return attr.name+'='+self.remove_attr(attr.name);
		}).join(';');
		if (attr_value.length>0){
			this.attrs.push({name: 'options', value: attr_value});
		}

		return this;
	};

	AttributeList.prototype.add_class = function ( class_name ){
		let class_attr = null;

		this.attrs.forEach(function(attr){
			if (attr.name === "class"){
				class_attr = attr; 
			}
		})

		if (class_attr === null){
			class_attr = {name: 'class', value: ''};
			// I find it more appropriate to have class as the first attribute
			this.attrs.unshift(class_attr);
		}

		class_attr.value += (class_attr.value.length >0 ? ' ' : '') + class_name;
	};

	function common(attrs,name){
		if (attrs){
			let class_name = attrs.remove_attr( 'name' );
			attrs.add_class( name );
			attrs.add_class( class_name );
		}
	}

	var pushed_attrs = null;


	const DynamicTags = {
		'dynamic-scope': function scope(attrs){

			return 'div';
		},
		'dynamic-value': function scope(attrs){

			if (attrs){
				let val_type = attrs.remove_attr( 'type');
				attrs.add_class( val_type.length > 0 ? val_type : 'string' );
				attrs.rephrase(['url','depends-on','collection']);
			}

			return 'dfn';
		},
		'dynamic-template': function scope(attrs){
			if (attrs) {
				pushed_attrs = attrs;

				attrs
					.optionize('on-empty', 'alternative')
					.rephrase('for','for-each','options')
				;
			}

			return '';
		}

	}


	function tag( start, name, attrs, self_closing ){
		if (typeof self_closing !== "boolean"){
			self_closing = false;
		}

		let worker = DynamicTags[name];
		let attribute_list = new AttributeList( attrs,name );
		if (start && pushed_attrs){
			attribute_list.concatenate( pushed_attrs );
			pushed_attrs = null;
		}

		if (typeof worker === "function"){
			if (start){
				common(attribute_list,name);
			}

			name = worker( start ? attribute_list : null, name );

		}

		if (name.length > 0){
			let result = '<' + (start ? '' : '/') + name;
	
			attribute_list.forEach(function(attr){
				let attr_quote = attr.value.indexOf('"')>=0 ? "'" : '"';
				result += ' ' + attr.name + '=' +attr_quote + attr.value + attr_quote;
			});
	
			result += (self_closing ? ' /' : '') + '>';
	
			verbatim( result );
		}	
	}

	parser.on('startTag', function( name, attrs,self_closing ){
		tag( true, name, attrs, self_closing );
	});

	parser.on('endTag', function( name ){
		tag( false, name );
	});

	parser.on('comment', function( comment ){
		verbatim( '<!-- ' + comment + ' -->' );
	});

	parser.on('text', function( text ){
		verbatim( text );
	});

	parser.on('doctype', function( name, public_id, system_id ){
		verbatim('<!DOCTYPE '+name+'>');
	});


	console.log("Convert" );

	instream.pipe(parser);

}).call(this,process.argv);
