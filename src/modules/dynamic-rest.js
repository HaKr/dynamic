
(function define_rest(){
	"use strict";

	var
		dynamic_rest = {
		info: {
			Name: "Dynamic REST",
			Description: "Set up a REST based communication channel with the server.",
			Version: "1.01.1"
		},
		vars: {
			channel: null,
			resources: {}
		},
		types: {
			RestResource: RestResource
		},
		api: {
			create_rest_resource: create_rest_resource
		}
	};

	var
		dynamic_utils = require('./dynamic-utils'),
		dynamic_values = require('./dynamic-values'),
		logger = require('./browser_log').get_logger(dynamic_rest.info.Name)
;

	module.exports = dynamic_rest.api;

	var
		http_options_method = 'OPTIONS',
		http_options_methods = [ http_options_method ],
		http_safe_methods = http_options_methods.concat(['GET','HEAD']),
		http_unsafe_methods = ['POST', 'PUT', 'DELETE'],
		http_all_methods = http_safe_methods.concat( http_unsafe_methods )
	;

	function create_rest_resource( args ){
		var
			url,
			dynamic_value,
			result
		;
		if (arguments[0] instanceof dynamic_values.types.DynamicValue ){
			dynamic_value = arguments[0];
			url = '/'+dynamic_value.name.replace(/\./g, '/');
		} else {
			dynamic_value = null;
			url = arguments[0];
		}

		if (!dynamic_utils.starts_with( url, '/api') ){
			url = '/api' + url;
		}

		if (dynamic_rest.vars.resources.hasOwnProperty( url ) ){
			result = dynamic_rest.vars.resources[ url ];
			result.get();
		} else {
			result = new RestResource( url, dynamic_value );
			dynamic_rest.vars.resources[ url ] = result;
		}

		return result;
	}

	function RestResource( url, dynamic_value ){
		this.dynamic_value = dynamic_value;
		this.url = url;
		this.allowed = [];
		this.send_request( http_options_method );
		this.load_deferred = (this.dynamic_value !== null);
		this.rest_observer = null;

		if (this.dynamic_value !== null){
			var self = this;
			this.dynamic_value.set_on_load = false;

			this.rest_observer = this.dynamic_value.observe( 'rest_observer', function( v ){
				if (!self.dynamic_value.set_on_load){
					var data={};
					data[self.dynamic_value.name] = self.dynamic_value.value;
					self.put( data );
				}
			}, this );
		}

	}

	RestResource.prototype.may_request = function( method_name ){
		return http_options_method === method_name || this.allowed.indexOf(method_name)>=0;
	};

	RestResource.prototype.send_request = function( method_name, data ){
		var method_name_lower = method_name.toLowerCase();

		if ( this.may_request( method_name ) ){
			this.request = this.create_cors_request( method_name );
			if (this.request !== null){
				var
					self = this,
					handler_name = 'on_'+method_name_lower + '_loaded',
					handler = this[ handler_name ]
				;
				if (typeof handler === 'function'){
					this.request.addEventListener("load", function ( data ) {
						handler.apply( self, arguments );
					});
				}
				this.request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
				this.request.send( JSON.stringify( data ) );
			}
		} else {
			logger.error( "Method "+method_name+" is not allowed for "+this.url );
		}
	};

	http_all_methods.forEach( function create_method( method_name ){
		var method_name_lower = method_name.toLowerCase();
		RestResource.prototype[ method_name_lower ] = function( data ){
			this.send_request.call( this, method_name, data );
		};
	});

	http_unsafe_methods.forEach( function create_method( method_name ){
		var method_name_lower = method_name.toLowerCase();
		RestResource.prototype[ 'may_'+method_name_lower ] = function( data ){
			return this.may_request.call( this, method_name );
		};
	});


	RestResource.prototype.on_loaded = function(){
		var
			evt = arguments[0],
			rest = Array.prototype.slice.call( arguments, 1 )
		;

		logger.debug( this.request.method+" "+this.url+' -> '+evt.target.status+" - " +evt.target.statusText+', responseType='+evt.target.responseType+', event=', evt, 'rest=',rest  );
	};

	RestResource.prototype.on_options_loaded = function( evt ){
		this.allowed = evt.target.responseText.split(',');
		if (this.load_deferred){
			this.get();
		}
	};

	RestResource.prototype.on_get_loaded = function( evt ){
		if (this.dynamic_value !== null){
			this.handle_data( evt );
		}
	};

	RestResource.prototype.on_put_loaded = function( evt ){
		if (this.dynamic_value !== null){
			this.handle_data( evt, {value_optional: true } );
		}
	};


	RestResource.prototype.create_cors_request = function( method ) {
	  	var
	  		xhr = new XMLHttpRequest(),
			self = this
		;

	  if ("withCredentials" in xhr) {
	    // XHR for Chrome/Firefox/Opera/Safari.
	    xhr.open(method, this.url, true);
	  } else if (typeof XDomainRequest != "undefined") {
	    // XDomainRequest for IE.
	    xhr = new XDomainRequest();
	    xhr.open(method, this.url);
	  } else {
	    // CORS not supported.
	    xhr = null;
	  }
	  if (xhr !== null){
		  xhr.resource = this;
		  xhr.method = method;
		  xhr.addEventListener("load", function (event) {
    			 self.on_loaded.apply( self, arguments );
    		});
			xhr.addEventListener("error", function (event) {
	  			 logger.error( "Data connection error ", event );
	  		});

	  }
	  return xhr;
  };

	RestResource.prototype.handle_data = function( event, options ) {
		if (typeof options !== "object"){
			options = {value_optional: false};
		}
		try {

			var payload = JSON.parse( event.target.responseText );
			if (payload.hasOwnProperty( 'messages' )) {
				dynamic_values.set_values_by_name( 'app.messages', payload.messages );
			}
			if (this.dynamic_value !== null){
				if (payload.hasOwnProperty( this.dynamic_value.name )) {
					payload = payload[ this.dynamic_value.name ];
					this.dynamic_value.set_on_load = true;
					this.dynamic_value.set_value( payload );
					this.dynamic_value.set_on_load = false;
				} else {
					if (!options.value_optional){
						logger.warning( "Cannot set "+this.dynamic_value.name + ' from payload', payload );
					}
				}
			} else {
				if (payload.hasOwnProperty( 'multiple_values' )) {
					dynamic_values.set_values_by_name( payload.multiple_values );
				}
			}
		} catch (err) {
			logger.error("Data parse error", err, self.xhr);
		}
	};

})();
