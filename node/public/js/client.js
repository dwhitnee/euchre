// Handles sending and receiving messages to remote
// Open a websocket and send and receive data over it synchronously

// import these? browserify?
const chatMessageEvent = "chatMessage";
const newGameNameEvent = "newGameName";
const joinGameEvent    = "joinGame";

const lobbyStateUpdateEvent = "lobbyStateUpdate";
const gameStateUpdateEvent  = "gameStateUpdate";

const newUserEvent  = "newUser";


var Client = (function()
{
  function Client() {
    // how do we re-eastablish a previous session with the server if
    // this was just a page reload?
  };

  Client.prototype = {
    /**
     * Open socket and "authenticate" (associate player object with socket)
     * This should connect us to the server's "lobby" braodcast channel at first,
     * and later a "game" multicast channel.
     * That logic is on the server side.
     */
    connectToServer: function() {
      if (!this.socket) {
        this.socket = io();  // Socket.io websocket
      }
      this.socket.emit( newUserEvent, this.user );
    },

    /**
     * Talkers
     */
    sendIM: function( msg ) {
      this.socket.emit( chatMessageEvent, msg );  // server can figure out who sent this
    },


    /**
     * Connect with server, get player id and open socket
     * @return Promise with player object
     */
    login: function( name ) {
      // this.username = name;

      return new Promise(
        function(resolve, reject) {
          $.ajax("/login", {
                   data : JSON.stringify({ name: name}),
                   contentType : 'application/json',
                   type : 'POST'
                 })
            .done( function( data ) {
                     this.user = data;      // the id/name of this player
                     this.setAuthInfo( user.id );
                     resolve( user );
                   })
            .fail( reject );
        });
    },
    /**
     * Add authentication info to each request.  Crappy right now, just playerId
     * @param authTOekn add auth header to all further requests
     */
    setAuthInfo: function( authToken ) {
      $.ajaxSetup({
                    beforeSend: function(xhr) {
                      xhr.setRequestHeader('x-userid', authToken );
                    }
                  });
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
    listenForLobbyStateChange: function( callback ) {
      this.socket.on( lobbyStateUpdateEvent, callback );
    },
    listenForGameStateChange: function( callback ) {
      this.socket.on( gameStateUpdateEvent, callback );
    }

  };

  return Client;
})();
