//----------------------------------------------------------------------
// One game
//----------------------------------------------------------------------
var Game = (function()
{
  var nextId = 1000;

  function Game( name ) {
    this.id = nextId++;
    this.name = name;
    this.players = [];
  };

  Game.prototype = {
    getName: function getName() {
      return this.name;
    },
    setName: function setName( name ) {
      this.name = name;
      console.log('New game name: ' + this.name );
    },
    addPlayer: function addPlayer( player ) {
      this.players.push( player.id );
    }
  };
  return Game;
})();

module.exports = Game;
