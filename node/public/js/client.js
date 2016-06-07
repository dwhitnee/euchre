/*global $, io */

// Handles sending and receiving messages to remote
// Open a websocket and send and receive data over it synchronously

// FIXME - who handles game state?  GameEngine?

// import these? browserify?
const chatMessageEvent = "chatMessage";
const lobbyStateUpdateEvent = "lobbyStateUpdate";
const gameStateUpdateEvent  = "gameStateUpdate";

const newUserEvent  = "newUser";


var Client = (function()
{
  function Client() {
    // how do we re-eastablish a previous session with the server if
    // this was just a page reload?

    this.gameId = undefined;
    this.player = undefined;
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
     * Chatty kathy
     */
    sendIM: function( msg ) {
      $.ajax("/game/chat", {
        data : msg,
        contentType : 'text/plain',
        type : 'POST'
      });
    },

    /**
     * Connect with server, get player id and open socket
     * @return Promise with player object
     */
    login: function( name ) {
      // this.username = name;
      var self = this;

      return new Promise(
        function(resolve, reject) {
          $.ajax("/login", {
            data : JSON.stringify({ name: name}),
            contentType : 'application/json',
            type : 'POST'
          })
            .done( function( data ) {
              self.user = data;      // the id/name of this player
              self.setAuthInfo( self.user.id );
              resolve( self.user );
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
      $.ajax("/game/create", {
        data : name,
        contentType : 'text/plain',
        type : 'POST'
      });
    },

    joinGame: function( gameId ) {
      $.ajax("/game/join", {
        data : gameId,
        contentType : 'text/plain',
        type : 'POST'
      });
      this.gameId = gameId;  // FIXME, could also get this from updateState
    },

    pickSeat: function( seatId ) {
      var data = {
        gameId: this.gameId,
        seatId: seatId
      };
      $.ajax("/game/pickSeat", {
        data : JSON.stringify( data ),
        processData: false,
        contentType : 'application/json',
        type : 'POST'
      });
    },

    startGame: function() {
      $.ajax("/game/start", {
        data : "",
        contentType : 'text/plain',
        type : 'POST'
      });
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
