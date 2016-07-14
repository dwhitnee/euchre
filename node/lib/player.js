//----------------------------------------------------------------------
// One guy, and the Factory that makes them.
//----------------------------------------------------------------------

var Player = (function()
{
  var nextId = 100;

  function Player( name ) {
    this.id = nextId++;
    this.name = name || "n/a";
    this.cards = [];
  };

  Player.prototype = {
    getName: function getName() {
      return this.name;
    },
    setName: function setName( name ) {
      this.name = name;
      console.log('New player! ' + this.name );
    },
    getGameId: function() {
      return this.gameId;
    },
    setGameId: function( gameId ) {
      this.gameId = gameId;
    },

    addCards: function( cards ) {
      this.cards = this.cards.concat( cards );
      console.log("Cards for " + this.name + ": " + this.cards );
    },

    quit: function quit() {
      console.log( this.name  + " left.  Awww");
      // disconnected, save state?  FIXME
    }
  };
  return Player;
})();


//----------------------------------------------------------------------
//    PlayerFactory
//----------------------------------------------------------------------
var _players = {};

/**
 * @return player oject by name
 */
Player.getByName = function( name ) {
  for (var id in _players) {    // $.each also works, but no good analog yet
    var player = _players[id];
    if (player.name === name) {
      return player;
    }
  }
  return undefined;
};

/**
 * @return player oject by name
 */
Player.getById = function( id ) {
  return _players[id];
};

/**
 * Create a new player and add to the pool
 */
Player.newPlayer = function( name ) {
  var player = Player.getByName( name );

  if (!player) {
    player = new Player( name );
    _players[player.id] = player;
  }

  return player;
};


module.exports = Player;
