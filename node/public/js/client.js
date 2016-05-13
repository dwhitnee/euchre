// Handles sending and receiving messages to remote
// Open a websocket and send and receive data over it synchronously

// import these? browserify?
const chatMessageEvent = "chatMessage";
const setUserNameEvent = "username";
const stateUpdateEvent = "stateUpdate";
const newGameNameEvent = "newGameName";
const joinGameEvent = "joinGame";

var Client = (function()
{
  function Client() {
    this.socket = io();  // Socket.io websocket
  };

  Client.prototype = {
    /**
     * Talkers
     */
    sendIM: function( msg ) {
      this.socket.emit( chatMessageEvent, msg );  // server can figure out who sent this
      // this.socket.emit('messageEvent', { user: this.username,
      //                                    msg: msg } );
    },
    setUserName: function( name ) {
      this.socket.emit( setUserNameEvent, name );
      this.username = name;
    },
    createGame: function( name ) {
      this.socket.emit( newGameNameEvent, name );
    },
    joinGame: function( name ) {
      this.socket.emit( joinGameEvent, name );
    },

    /**
     * Listeners
     */
    listenForIMs: function( callback ) {
      this.socket.on( chatMessageEvent, callback );
    },
    listenForStateChange: function( callback ) {
      this.socket.on( stateUpdateEvent, callback );
    }
  };

  return Client;
})();
