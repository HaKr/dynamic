
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
		api_keywords = require('./dynamic-api_keywords.js'),
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

		if (!dynamic_utils.starts_with( url, api_keywords.rest.api) ){
			url = api_keywords.rest.api + url;
		}

		url = 'http://dynamic.ms.ciber.nl' + url;
		logger.info( 'create_rest_resource', url );

		if (dynamic_rest.vars.resources.hasOwnProperty( url ) ){
			result = dynamic_rest.vars.resources[ url ];
			if (dynamic_value !== null){
				dynamic_value.content = '';
			}
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
		}
	}

	RestResource.prototype.may_request = function( method_name ){
		var pending_request = this.get_pending_request();
		if (pending_request === this.request ){
			logger.info( 'Aborting '+this.request.method );
			pending_request.abort();
			pending_request = null;
		}
		return pending_request === null && (http_options_method === method_name || this.allowed.indexOf(method_name)>=0);
	};

	RestResource.prototype.has_pending_request = function( ){
		return this.get_pending_request() !== null;
	};

	RestResource.prototype.get_pending_request = function( ){
		return this.dynamic_value === null ? null : this.dynamic_value.pending_request;
	};

	RestResource.prototype.set_pending_request = function( req ){
		if (this.dynamic_value !== null){
			this.dynamic_value.pending_request = req;
		}
	};

	RestResource.prototype.notify_deferred_observers = function(){
		if (this.dynamic_value !== null){
			this.dynamic_value.notify_observers( true );
			this.dynamic_value.pending_request = null;
		}
	};

	RestResource.prototype.get_request_handler = function( method_name ){
		var
			method_name_lower = method_name.toLowerCase(),
			handler_name = 'on_'+method_name_lower + '_loaded',
			result = this[ handler_name ]
		;

		return typeof result === 'function' ? result : null;
	};

	RestResource.prototype.send_request = function( method_name, data ){

		if ( this.may_request( method_name ) ){
			this.request = this.create_cors_request( method_name );
			if ( method_name !== http_options_method ){
				this.set_pending_request( this.request );
			}
			if (this.request !== null){
				var
					self = this,
					handler = this.get_request_handler( method_name )
				;
				if (handler !== null){
					this.request.addEventListener("load", function ( data ) {
						handler.apply( self, arguments );
					});
				}
				this.request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
				if (typeof data === 'undefined' || data === null){
					data = {};
				}
				this.request.send( JSON.stringify( data ) );
			}
		} else {
			if (!this.load_deferred){ // only complain when not in start-up
				logger.error( "Method "+method_name+" is not allowed for "+this.url+' pending: '+this.has_pending_request(  ) );
			}
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

		if (this.get_request_handler( this.request.method ) === null){
			this.notify_deferred_observers();
		}
	};

	RestResource.prototype.on_options_loaded = function( evt ){
		this.allowed = evt.target.responseText.split(',');
		if (this.load_deferred){
			this.get();
		}
	};

	RestResource.prototype.on_get_loaded = function( evt ){
		this.load_deferred = false;
		this.handle_data( evt );
	};

	RestResource.prototype.on_put_loaded = function( evt ){
		this.handle_data( evt );
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
			if (payload.hasOwnProperty( api_keywords.rest.messages )) {
				dynamic_values.set_values_by_name( api_keywords.system_values.app_messages, payload.messages );
			} else {
				dynamic_values.set_values_by_name( api_keywords.system_values.app_messages, {} );
			}
			if (this.dynamic_value !== null){
				var new_value = '';
				if (payload.hasOwnProperty( this.dynamic_value.name )) {
					new_value = payload[ this.dynamic_value.name ];
				}
				this.set_pending_request( null );
				this.dynamic_value.set_on_load = true;
				this.dynamic_value.set_value( new_value );
				this.dynamic_value.set_on_load = false;
			} else {
				if (payload.hasOwnProperty( 'multiple_values' )) {
					dynamic_values.set_values_by_name( payload.multiple_values );
				}
				this.notify_deferred_observers();
			}
		} catch (err) {
			logger.error("Data parse error", err, self.xhr);
		}
	};

})();
