/**
 * Euchre game controller
 */


Euchre.Game = (function()
{

  function Game( players ) {
  };

  Game.prototype = {
    /**
     * @param players array of players in the game
     */
    init: function( players ) {

      this.players = players;
      this.deck = new Euchre.Deck();
      this.deck.shuffle();

      this.dealer = 2;  // rand( 4 )
    },

    deal: function() {
      var cards, p, numCards = 2;

      p = this.dealer + 1;
      for (; ; p++) {
        if (p >= players.length) {
          p = 0;
        }
        if (this.players[p].cards.length === 5) {
          break;
        }
        numCards = 5 - numCards;   // alternate 3/2
        cards = deck.deal( numCards );
        this.players[p].addCards( cards );
        // TBD do some animation here
      }

    },

    /**
     *
     */
    startHand: function() {
      // deal
      // declare
      // 1..5 playTrick
      //
    },

    bid: function() {

    },

    declareTrump: function() {

    }

  };
  return Game;
})();
