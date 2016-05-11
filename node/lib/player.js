//----------------------------------------------------------------------
// One guy
//----------------------------------------------------------------------
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
    quit: function quit() {
      console.log( this.name  + " left.  Awww");
      // disconnected, save state?
    }
  };
  return Player;
})();

module.exports = Player;
