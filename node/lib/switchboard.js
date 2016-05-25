/**
 * The Switchboard maps user definitions to socket connections on this server port.
 * Sockets/users are grouped into socket.io Rooms for multicasting messages.
 *
 * Can broadcast events and manages join/leave events.
 *
 * First a "connect" event happens, then the client must tell us what User object is
 * talking on that socket. Then the server can
 *
 * Must call onUserJoin() that returns a user object if you want that passed
 * back in event handlers

 var server = new Switchboard( http );
 server.addMessageHandler("gravityWave", gravityWaveHandler );
 server.onUserJoin( function() {
                         server.setUser( socket, somethingFromClient );
                         // return new Planet();
                       });
 function gravityWaveHandler( planet ) { ... // server passes us the planet created above

 *
 * FIXME:  This needs to support multicast to groups of users
 *
 * There are events that trigger GLOBAL notifications
 * There are events that trigger GROUP notifications
 * There are events that trigger INDIVIDUAL responses (are there?)
 */


var Server = require('socket.io');
var io = new Server();

// FIXME, this should probably be configurable from outside
// names of socket.io Rooms.  Rooms are only visible on server side
// Namespaces can be used by the client.  Should server do the room management or client?
// I think server.  Client is just connected to the server and gets the messages the server
// thinks it should receive.  Lobby messages at login, and game messages when playing.


var Switchboard = (function()
{
  /**
   * Open a multicast connection on this http port
   */
  function Switchboard( http ) {

    this.switchboard = io.attach( http );  // attach to server port for WebSocket connections

    this.eventHandlers = [];
    this.users = {};  // keyed by socket.id
    this.rooms = {};  // collections of users

    var self = this;  // crappy bind (use arrow notation?)

    // a client has opened up a socket to us.
    // we don't know anything about the client yet
    this.switchboard.on(
      'connection',
      function( socket ) {
        console.log( socket.id );

        // FIXME: how to manage rooms of users?  Do we need a list, or
        // can socket.io do it for us?

        // at this point we only have a socket in a list, we don't have a user object yet
        this.addConnection( socket );

        // listen for all events on this new socket
        self.enableMessageHandlers( socket );

        socket.on('disconnect', function() {
                    var user = self.getUserData( socket );
                    self.onUserLeave( user );
                    self.removeUser( socket );
                  });

      });

    // Auth Filter
    // this.switchboard.use(
    //   function( socket, next ) {
    //     if (socket.request.headers.cookie) {
    //       return next();
    //     } else {
    //       next(new Error('Authentication error'));
    //     }
    //   });
  };

  Switchboard.onNewUserEvent = "newUser";

  Switchboard.prototype = {
    /**
     * Create multicast group, id is name since we own it and wont change it
     * @param name internal id of room
     */
    createRoom: function( name ) {
      this.rooms[name] = {};
    },
    // joinRoom: function( socket, name ) {
    //   this.rooms[name][socket.id] = 1;
    //   socket.join( name );
    // },
    /**
     * Join a new multicast group (and leave old one if any)
     */
    joinRoom: function( socket, room ) {
      var oldRoom = this.getRoomForSocket( socket.id );

      if (oldRoom) {
        socket.leave( oldRoom );
        this.rooms[oldRoom][socket.id] = undefined;
      }

      socket.join( room );
      this.rooms[room][socket.id] = 1;
    },

    getRoomForSocket: function( socketId ) {
      for (var name in this.rooms) {
        if (this.rooms[name][socketId]) {
          return name;
        }
      }

      console.error("Could not find a room membership for socket " + socketId );
      return undefined;  // oops!  This socket is not mapped to any room.
    },

    // disconnect: function( socket ) {
    //   // socket.io automatically removes sockets from Rooms
    // },

    /**
     * Tell a group of clients what's going on
     * @param room multicast group of clients to send to
     * @param messageType
     * @param data to send
     *
     * state: NEWGAME, NEWHAND, BIDDING, PLAYING ?
     */
    multicast: function( room, messageType, data ) {
      this.switchboard.to( room ).emit( messageType, data );
    },
    /**
     * Something about this socket changed, tell others in the same channel
     */
    broadcastUpdateToRoom: function( socket ) {
      var room = this.getRoomNameFromSocket( socket.id );

      var updateCallback = this.getUpdateFnForRoom( room );

      // callback to create message? eventName and data
      var self = this;
      updateCallback( function( updateEvent, data ) {
                        self.multicast( room, updateEvent, data );
                      } );

      // where does eventType and data come from?  FIXME?

      this.multicast( room, updateEvent, data );
    },

    getUpdateFnForRoom: function updateRoom( room ) {
      return this.updateFns[room];
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

      // special handler to associate a userData object with this
      // socket to be passed with any event handler
      var self = this;
      socket.on( Switchboard.onNewUserEvent, function( user ) {
                   self.associateUserData( socket, user );
                   self.broadcastUpdateToRoom( socket );  // introduce new guy to the group
                 });

      var eventNames = Object.keys( this.eventHandlers );

      // closure for eventHandler
      function createEventHandler( self, eventHandler, socket ) {
        return function( data ) {
          if (eventHandler.config.useUserContext) {     // method on User
            eventHandler.callback.call( self.getUserData( socket ), data );
          } else {                                      // static call
            eventHandler.callback( self.getUserData( socket ), data );
          }

          // update the user's world every time an event happens
          if (eventHandler.config.broadcastOnUpdate !== false) {
            self.broadcastUpdateToRoom( socket );
          }
        };
      };

      for (var i=0; i < eventNames.length; i++) {
        var eventName = eventNames[i];
        var eventHandler = this.eventHandlers[eventName];

        // should this call a method on User?  FIXME
        socket.on( eventName, createEventHandler( this, eventHandler, socket ));
     }
    },

    setBroadcastStateFn: function( callback ) {
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
    // onUserJoin: function( callback ) {
    //   if (callback instanceof Function) {
    //     this.userJoinCB = callback;
    //   } else {
    //     console.error("onUserJoin callback is not a function");
    //   }
    // },

    // onConnect. We only have a socketId at this point, no user data
    addConnection: function( socket ) {
      this.users[socket.id] = {};      // To be filled with user data by associateUser

      // socket.join( d );   // later we will join a game room
    },

    /**
     *  associate user data with this socket to be passed to event handlers
     *  Check to see if this user exists and/or is already connected.
     */
    associateUserData: function( socket, userdata ) {
      console.log("User " + user.name + "(" + user.id+ ") -> " + socket.id );

      // check all sockets for identical user data?  Handled outside switchboard?

      this.users[socket.id] = userdata;
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
     * accessors for users by socketId, a user is defined by setUser() by the consumer
     */
    getUserData: function( socket ) {
      return this.users[socket.id];
    },

    // we can have socket "rooms" for each game
    createRoom: function( name ) {
      var room = new Room( name );
      this.rooms[room.id] = room;
    },
    getRoom: function( roomId ) {
      return this.rooms[roomId];
    },
    changeRoom: function( room, socket ) {
      var user = this.getUserData( socket );
      room.bootUser( user );
      room.addUser( user );
      // if (user.room) {
      //   socket.leave( user.room );
      // }
      // socket.join( room );
      // user.room = room;
    },

    removeFromGroup: function( group, socket ) {
      // ???
    },
    multicast: function( group, msg ) {
      io.to( group.name ).emit( msg );
    },

    // addUser: function( socket ) {
    //   if (this.userJoinCB instanceof Function) {
    //     this.users[socket.id] = this.userJoinCB(); // pass socket? // new Player() ?
    //   } else {
    //     console.error( scocket.id + " does not have a valid userJoin handler");
    //   }
    // },
    removeUser: function( socket )  {
      if (this.userLeaveCB instanceof Function) {
        this.userLeaveCB( this.getUserData( socket ));
      } else {
        console.error( scocket.id + " does not have a valid userLeave handler");
      }

      this.users[socket.id] = undefined;
    }
  };
  return Switchboard;
})();


module.exports = Switchboard;
