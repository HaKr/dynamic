
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
		observer_module = require('./dynamic-observers.js'),

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
		this.rooms = [];
		this.open = false;
		this.dynamic_value = dynamic_values.get_or_define( 'channel.'+this.name+'.status' );
		this.dynamic_value.set_value('inactive');
	}

	WebSocketChannel.prototype.start = function(){
		logger.info( 'Setting up Web socket channel' );
		var self=this;
		if (socket_io === null){
			logger.error( 'Socket.io not loaded' );
		} else {
			if (this.socket === null){
				try {
					this.socket = socket_io('/'+this.name, {transports: ['websocket']});
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
		}
	};

	WebSocketChannel.prototype.subscribe = function( room_name ){
		this.rooms.push( new WebsocketRoom().init( this, room_name ));
	};


	function WebsocketRoom(){

	}

	WebsocketRoom.prototype.init = function( channel, name ){
		this.name = name;
		this.channel = channel;
		this.room_name = '';

		this.start();

		return this;
	};

	WebsocketRoom.prototype.start = function(){
		this.observer = observer_module.create_dynamic_text_reference( this.name, null, this.switch_room, this, true );
	};

	WebsocketRoom.prototype.switch_room = function ( room_name ) {
		logger.info( 'Joining room %s.', room_name );
		this.leave();
		this.room_name = room_name;
		this.join();
	};


	WebsocketRoom.prototype.join = function(){
		if (this.room_name.length > 0){
			this.channel.socket.emit('join', this.room_name );
		}
	};

	WebsocketRoom.prototype.leave = function(){
		if (this.room_name.length > 0){
			this.channel.socket.emit('leave', this.room_name );
			this.room_name = '';
		}
	};

	responder.on_connect= function( ){
		logger.info("Channel %s awakens", this.$channel.dynamic_value.name );
		this.$channel.dynamic_value.set_value('active');
		this.$channel.rooms.forEach( function resubscribe( room ){
			room.join();
		});
	};

	responder.on_disconnect= function( reason ){
		logger.info("Channel %s hibernates.", this.$channel.dynamic_value.name );
		this.$channel.dynamic_value.set_value('inactive');
	};

	responder.on_set_values = function( data ){
		logger.info("Channel "+this.$channel.name+" received data:",  JSON.stringify(data) );
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
})( typeof io === "object" ? io : null );
