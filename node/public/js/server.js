// Handles sending and receiving messages to remote
// Open a websocket and send and receive data over it synchronously

var Server = (function()
{
  function Server() {
    this.socket = io();
  };

  Server.prototype = {
    /**
     * Talkers
     */
    sendIM: function( msg ) {
      this.socket.emit('messageEvent', { user: this.username,
                                         msg: msg } );
    },
    setUserName: function( name ) {
      this.socket.emit('username', name );
      this.username = name;
    },

    /**
     * Listeners
     */
    listenForIMs: function( callback ) {
      this.socket.on('messageEvent',  callback );
    },
    listenForStateChange: function( callback ) {
      this.socket.on('stateUpdate',  callback );
    }
  };

  return Server;
})();
