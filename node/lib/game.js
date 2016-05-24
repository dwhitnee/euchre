//----------------------------------------------------------------------
// One game
//----------------------------------------------------------------------

const WAITING_TO_START = "WAITING";
const BID = "BID";
const DISCARD = "DISCARD";
const PLAY = "PLAY";

var Game = (function()
{
  var nextId = 1000;

  function Game( name ) {
    this.id = nextId++;
    this.name = name;
    this.players = {};
    this.seats = [];  // 0,1,2,3 NESW
    this.reset();
  };

  Game.prototype = {
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
    addPlayer: function( player ) {
      this.players[player.id] = player.id;
    },
    removePlayer: function( player ) {
      this.players[player.id] = undefined;
    },
    getRoomName: function() {
      return "Game" + this.id;
    },
    start: function() {
      this.shuffle();
      this.deal();
      this.setAction( BID, this.getPlayerToLeftOfDealer() );
    },
    pass: function() {
      this.rotateActivePlayer();
      if (this.activePlayer === this.dealer) {
        // either open bidding or end game
        if (this.action === OPEN_BID) {
          this.endGame();
        }
      }
    },

    pickSeat: function( seat, player ) {
      this.seats[seat] = player;
    },
    /**
     * @param seat is seat 0,1,2,or 3
     */
    setDealer: function( seat ) {
      this.dealer = seat;
    },
    rotateDealer: function() {
      this.dealer += 1;
      this.dealer %= 4;
    },
    rotatePlayer: function() {
      this.activePlayer += 1;
      this.activePlayer %= 4;
    },
    getPlayerToLeftOfDealer: function() {
      return (this.dealer + 1) % 4;
    },

    setAction: function( action, player ) {
      this.action = action;
      this.activePlayer = player.id;
    },

    /**
     * Tell all memebers of group this message (and who from)
     */
    sendChat: function( msg, from ) {
      var data = {
        user: from.name,
        msg: msg
      };
      switchboard.multicast( this.getRoomName(), chatMessageEvent, data );
    },

    // Tell all members of game our current state
    sendState: function() {
      var state = {
        game: this  // TMI?
      };
      switchboard.multicast( this.getRoomName(), chatMessageEvent, state );
    }
  };

  return Game;
})();


module.exports = Game;
