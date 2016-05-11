/**
 * Manages all users connected to this server.
 * Can broadcast events and manages join/leave events.
 * Must call onUserJoin() that returns a user object if you want that passed
 * back in event handlers

 var server = new SwitchBoard( http );
 server.addMessageHandler("gravityWave", gravityWaveHandler );
 server.onUserJoin( function() {
                         return new Planet();
                       });
 function gravityWaveHandler( planet ) { ... // server passes us the planet created above

 *
 */

// UserManager?
var SwitchBoard = (function()
{
  /**
   * Open a multicast connection on this http port
   */
  function SwitchBoard( http ) {
    this.switchboard = require('socket.io')(http);
    this.eventHandlers = [];
    this.users = {};

    // this.switchboard.on('connection', onConnect );

    var self = this;  // crappy bind (use arrow notation?)

    this.switchboard.on(
      'connection',
      function( socket ) {
        self.addUser( socket );

        // listen for all events on this new socket
        self.enableMessageHandlers( socket );

        socket.on('disconnect', function() {
                    var user = self.getUser( socket );
                    self.onUserLeave( user );
                    self.removeUser( socket );
                  });

      });
  };

  SwitchBoard.prototype = {
    /**
     * Tell everyone what's going on
     * TBD: should there be multiple substate broadcasts?
     * state: NEWGAME, NEWHAND, BIDDING, PLAYING
     */
    broadcast: function( messageType, data ) {
      // sends to all sockets
      // this.switchboard.emit('stateUpdate', { players: this.users });
      this.switchboard.emit( messageType, data );
    },

    /**
     * call this function( data, user ) when this event (message) occurs
     * passes the data from the event payload, and the User who sent the message.
     */
    addMessageHandler: function( eventName, callback, config ) {
      if (callback instanceof Function) {
        this.eventHandlers[eventName] = {
          callback: callback,
          config: config || {}
        };
      } else {
        console.error( eventName + " callback is not a function");
      }
    },

    /**
     * listen for these events on this socket
     * callbacks take the message data as only param  (user?)
     */
    enableMessageHandlers: function( socket ) {
      var eventNames = Object.keys( this.eventHandlers );

      // closure for eventHandler
      function createEventHandler( self, eventHandler, socket ) {
        return function( data ) {
          if (eventHandler.config.useUserContext) {
            eventHandler.callback.call( self.getUser( socket ), data ); // method on User
          } else {
            eventHandler.callback( self.getUser( socket ), data );      // static call
          }
          self.broadcastState();      // update the world every time an event happens?
        };
      };

      for (var i=0; i < eventNames.length; i++) {
        var eventName = eventNames[i];
        var eventHandler = this.eventHandlers[eventName];

        // should this call a method on User?  FIXME
        socket.on( eventName, createEventHandler( this, eventHandler, socket ));
     }
    },

    broadcastStateFn: function( callback ) {
      if (callback instanceof Function) {
        this.broadcastState = callback;
      } else {
        console.error("broadcastState callback is not a function");
      }
    },

    /**
     * callback( socket ) when we get a new connection.
     * We don't know anything about the user at this point, just a socket.
     * FIXME (can we reconnect an old session?)
     */
    onUserJoin: function( callback ) {
      if (callback instanceof Function) {
        this.userJoinCB = callback;
      } else {
        console.error("onUserJoin callback is not a function");
      }
    },
    /**
     * callback( user ) to call when we lose a connection,
     */
    onUserLeave: function( callback ) {
      if (callback instanceof Function) {
        this.userLeaveCB = callback;
      } else {
        console.error("onUserLeave callback is not a function");
      }
    },

    /**
     * accessors for users by socketId, a user is defined by onUserJoin
     */
    getUser: function( socket ) {
      return this.users[socket.id];
    },
    addUser: function( socket ) {
      if (this.userJoinCB instanceof Function) {
        this.users[socket.id] = this.userJoinCB(); // pass socket? // new Player() ?
      } else {
        console.error( scocket.id + " does not have a valid userJoin handler");
      }
    },
    removeUser: function( socket )  {
      if (this.userLeaveCB instanceof Function) {
        this.userLeaveCB( this.getUser( socket ));
      } else {
        console.error( scocket.id + " does not have a valid userLeave handler");
      }

      this.users[socket.id] = undefined;
    }
  };
  return SwitchBoard;
})();


module.exports = SwitchBoard;
