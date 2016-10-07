//----------------------------------------------------------------------
// One guy, and the Factory that makes them.
//----------------------------------------------------------------------

class Player {
  constructor( name ) {
    this.id = Player.nextId++;
    this.name = name || "n/a";
    this.cards = [];
  };

  get name() {
    return this._name;
  }
  set name( name ) {
    this._name = name;
    console.log(`New player! ${this.name}`);
  }

  addCards( cards ) {
    this.cards = this.cards.concat( cards );
    console.log("cards: " + this.cards );
  }

  quit() {
    console.log(`${this.name} left.  Awww`);
    // disconnected, save state?  FIXME
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      cards: this.cards
    };
  }
};

// static class variables
Player.nextId = 100;


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
