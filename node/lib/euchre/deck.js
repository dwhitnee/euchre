//----------------------------------------------------------------------
// Deck of Cards for Euchre.  9,10,J,Q,K,A
//----------------------------------------------------------------------

var Card = require("euchre/card");

module.exports = (function()
{
  function Deck() {

    var ranks = [1,9,10,11,12,13];
    var suits = [Card.Clubs, Card.Diamonds, Card.Hearts, Card.Spades];

    this.cards = [];

    for (var r = 0; r < ranks.length; r++) {
      for (var s = 0; s < suits.length; s++) {
        this.cards.push( new Card( ranks[r], suits[s] ));
      }
    }
    this.shuffle();
  }

  Deck.prototype = {
    /**
     * swap every card with some other not-yet-shuffled card
     */
    shuffle: function() {
      var i,j,t;

      this.topCard = this.cards.length - 1;

      for (i = this.cards.length-1; i > 0; i--) {
        j = Math.floor(Math.random() * i);     // Pick a card later in the deck

        // And swap it with the current element.
        t = this.cards[i];
        this.cards[i] = this.cards[j];
        this.cards[j] = t;
      }
    },

    /**
     * @param num of cards to return in
     * @return array of cards from the top of the deck
     */
    deal: function( num ) {
      var cards = [];

      if (this.topCard < 0) {
        throw new Error("Deck is out of cards!");
      }

      for (var i=0; i < num; i++) {
        cards.push( this.cards[this.topCard--] );
      }
      console.log("Dealing " + cards );
      return cards;
    }

  };

  return Deck;
})();
