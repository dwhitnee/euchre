//----------------------------------------------------------------------
// One guy, and the Factory that makes them.
//----------------------------------------------------------------------

var players = {};

var Player = (function()
{
  var nextId = 100;

  function Player( name ) {
    this.id = nextId++;
    this.name = name || "n/a";
  };

  Player.prototype = {
    getName: function getName() {
      return this.name;
    },
    setName: function setName( name ) {
      this.name = name;
      console.log('New player! ' + this.name );
    },
    joinGame: function( game ) {
      this.gameId = game.id;
      console.log( this.name + ' joined ' + game.name );
    },
    isInAGame: function() {
      return !!this.gameId;
    },
    quit: function quit() {
      console.log( this.name  + " left.  Awww");
      // disconnected, save state?
    }
  };
  return Player;
})();


//----------------------------------------------------------------------
//    PlayerFactory
//----------------------------------------------------------------------

/**
 * @return player oject by name
 */
Player.getPlayerByName = function( name ) {
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
Player.getPlayerById = function( id ) {
  return _players[id];
};

/**
 * Create a new player and add to the pool
 */
Player.newPlayer = function( name ) {
  var player = Player.getPlayerByName( name );

  if (!player) {
    player = new Player( name );
    _players[player.id] = player;
  }

  return player;
};


module.exports = Player;
