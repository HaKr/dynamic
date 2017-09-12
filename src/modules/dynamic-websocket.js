
(function connect_websocket( socket_io ){
	"use strict";

	var
		dynamic_websocket = {
		info: {
			Name: "Dynamic WebSocket",
			Description: "Set up a bi-directional communication channel with the server.",
			Version: "1.01.1"
		},
		vars: {
			channel: null
		},
		types: {
			WebSocketChannel: WebSocketChannel
		},
		api: {
			open_channel: open_channel
		}
	};

	var
		dynamic_utils = require('./dynamic-utils'),
		dynamic_values = require('./dynamic-values'),
		logger = require('./browser_log').get_logger(dynamic_websocket.info.Name),
		responder = {},
		channels = {}
;

	module.exports = dynamic_websocket.api;

	function open_channel( name ){
		var result=null;

		if (!channels.hasOwnProperty(name)){
			result = new WebSocketChannel( name );
			channels[name] = result;
			result.start();
		} else {
			result = channels[name];
		}

		return result;
	}

	function WebSocketChannel( name ){
		this.name = name;
		this.socket = null;
		this.open = false;
		this.dynamic_value = dynamic_values.get_or_define( 'channel.'+this.name+'.status' );
		this.dynamic_value.set_value('inactive');
	}

	WebSocketChannel.prototype.start = function(){
		logger.info( 'Setting up Web socket channel' );
		var self=this;

		if (this.socket === null){
			try {
				this.socket = socket_io({transports: ['websocket']});
				this.socket.$channel = this;
				Object.keys(responder).forEach( function (method_id){
					var method_name = method_id.slice(3);
					this.socket.on( method_name, responder[method_id] );
				}, this);
			}
			catch (e){
				// dynamic_values.add_values_by_name( self.name+'.exceptions', 'could not open websocket: '+e );
				logger.error( self.name+'.exceptions', 'could not open websocket channel: '+e );
			}
		}
	};

	function WebsocketRoom(){

	}

	WebsocketRoom.prototype.init = function( channel, name ){
		this.name = name;
		this.channel = channel;

		return this;
	};

	WebsocketRoom.prototype.leave = function(){
		// this.channel.$channel.x.leave( this.name );
	};

	WebSocketChannel.prototype.join = function( room_name ){
		// this.$channel.x.join( room_name, function(){
		// 	logger.info("Room %s has news.", room_name );
		// } );
		return new WebsocketRoom().init( this, room_name );
	};


	responder.on_connect= function( x ){
		logger.info("Channel %s awakens", this.$channel.dynamic_value.name );
		this.$channel.dynamic_value.set_value('active');
		this.$channel.x = x;
	};

	responder.on_disconnect= function( reason ){
		logger.info("Channel %s hibernates.", this.$channel.dynamic_value.name );
		this.$channel.dynamic_value.set_value('inactive');
	};

	responder.on_set_values = function( data ){
		logger.info("Channel %s reveived data (%x)", this.$channel.name, data );
		if ( data.hasOwnProperty( this.$channel.name) ){
			var my_values= data[ this.$channel.name ];
			setTimeout(function(){
				dynamic_values.set_values_by_name( my_values );
			},1);
		} else {
			logger.warn( this.$channel.name,"Ignoring data:", data );
		}
	};

	responder.on_advise_reload = function( data ){
		logger.warn("Reload advise received, so there we go.", data );
			setTimeout(function(){
				location.reload();
			},100);
	};

// IO will be defined globally
})( io );
