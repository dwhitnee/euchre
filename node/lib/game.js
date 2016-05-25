//----------------------------------------------------------------------
// One game, complete with players and a way to update everyone involved when state changes.
//----------------------------------------------------------------------

const WAITING_TO_START = "WAITING";
const BID = "BID";
const DISCARD = "DISCARD";
const PLAY = "PLAY";

// WebSocket events for updates to clients.  This really doesn't belong here.
const gameStateUpdateEvent = "gameStateUpdate";
const chatMessageEvent     = "chatMessage";



var Game = (function()
{
  var nextId = 1000;

  function Game( options ) {

    this.id = nextId++;
    this.name = options.name || "Unknown";
    this.createdBy = options.createdBy || "Unknown";  // what is this used for? deletion? FIXME
    this.players = {};
    this.seats = [];  // 0,1,2,3 NESW
    this.reset();
  };

  Game.prototype = {
    delete: function() {
      _games[this.id] = undefined;
      _gameNames[this.name] = undefined;
      switchboard.deleteRoom( this.getChatRoomName() );
    },

    reset: function() {
      this.scores = [0,0];
      this.action = WAITING_TO_START;
    },

    getName: function() {
      return this.name;
    },
    setName: function( name ) {
      this.name = name;
      console.log('New game name: ' + this.name );
    },

    /**
     * Add player to room, but don't take a seat at the table yet.
     */
    addPlayer: function( player ) {
      // remove player from previous game
      if (player.getGameId()) {
        var oldGame = Game.getById( player.getGameId() );
        oldGame.removePlayer( player );
      }

      this.players[player.id] = player;
      switchboard.joinRoom( player.id, game.getChatRoomName() );
      player.setGameId( game.id );

    },

    /**
     * Remove player from room and chair (if occupied)
     */
    removePlayer: function( player ) {
      // delete this.players[player.id];    // bad performance?
      this.players[player.id] = undefined;

      for (var i=0; i < 4; i++) {
        if (this.seats[i].id === player.id) {
          this.seats[i] = undefined;
          // FIXME - if game started, need to abandon/pause?
        }
      }

    },

    start: function() {
      this.shuffle();
      this.deal();
      this.setAction( BID, this.getPlayerToLeftOfDealer() );
    },
    pass: function() {
      this.rotatePlayer();
      if (this.activePlayerSeat === this.dealerSeat) {
        // either open bidding or end game
        if (this.action === OPEN_BID) {
          this.endGame();
        }
      }
    },

    /**
     * @param player
     * @param seat id from 0 to 3
     */
    pickSeat: function( player, seat ) {
      this.seats[seat] = player;
    },
    /**
     * @param seat is seat 0,1,2,or 3
     */
    setDealer: function( seat ) {
      this.dealerSeat = seat;
    },
    rotateDealer: function() {
      this.dealerSeat += 1;
      this.dealerSeat %= 4;
    },
    rotatePlayer: function() {
      this.activePlayerSeat += 1;
      this.activePlayerSeat %= 4;
    },
    getPlayerToLeftOfDealer: function() {
      return this.seats[(this.dealerSeat + 1) % 4];
    },

    setAction: function( action, seat ) {
      this.action = action;
      this.activePlayerSeat = seat;
    },


    getChatRoomName: function() {
      return this.id;
    },

    /**
     * Tell all memebers of group this message (and who from)
     */
    sendChat: function( msg, from ) {
      var data = {
        user: from.name,
        msg: msg
      };
      switchboard.multicast( this.getChatRoomName(), chatMessageEvent, data );
      console.log( from.name + ": " + msg);
    },

    // Tell all members of game our current state
    sendState: function() {
      switchboard.multicast( this.getChatRoomName(), gameStateUpdateEvent, this );
    },
    sendLobbyState: function() {
      var data = {
        players: this.players,
        games: _games,
        gameNames: _gameNames
      };
      switchboard.multicast( this.name, gameStateUpdateEvent, data );
    }
  };

  return Game;
})();

//----------------------------------------------------------------------
// Game Factory
//----------------------------------------------------------------------
var _games = {};
var _gameNames = {}; // hash of game names so client can display and check for uniqueness

/**
 * Special "game" that holds all players not in a game.
 */
Game.getLobby = function() {
  return _lobby;
};

/**
 * @return player oject by name
 */
Game.getById = function( id ) {
  return _games[id];
};

/**
 * @return game oject by name
 */
Game.getByName = function( name ) {
  for (var id in _games) {    // $.each also works, but no good analog yet
    var game = _games[id];
    if (game.name === name) {
      return game;
    }
  }
  return undefined;
};


Game.getByPlayerId = function( playerId ) {

  return _games[id];
};

/**
 * Create a new game and add to the pool. Also create websocket multicast room
 * { name: "My neat game", createdBy: 1002 }
 */
Game.newGame = function( options ) {
  var game = Game.getByName( options.name );

  if (!options || !options.name) {
    console.error("No options.name provided for new game");
    return undefined;
  }

  if (!game) {
    game = new Game( options );
    _games[game.id] = game;
    _gameNames[game.name] = game.id;  // reverse lookup for uniqueness constraint

    switchboard.createRoom( game.id );
  }

  return game;
};


var _lobby = new Game("Lobby");

module.exports = Game;
