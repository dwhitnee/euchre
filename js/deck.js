// require("euchre.js");

//----------------------------------------------------------------------
// A Piece occupies a space on the board that no one else can occupy.
// args = {
//    size: in pixels of piece (should match css)
//   offset: offset in pixels to draw this piece
//----------------------------------------------------------------------
Euchre.Deck = (function()
{

  function Deck() {

    var ranks = [1,9,10,11,12,13];
    var suits = ["clubs","diamonds","hearts","spades"];

    this.cards = [];
    this.topCard = 0;

    for (var r = 0; r < ranks.length; r++) {
      for (var s = 0; s < suits.length; s++) {
        this.cards.push( new Euchre.Card( ranks[r], suits[s] ));
      }
    }
  }

  Deck.prototype = {
    shuffle: function() {
      var array = this.cards;
      var m = array.length, t, i;

      // While there remain elements to shuffle…
      while (m) {
        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
      }
    },

    /**
     *
     */
    deal: function( num ) {
      var cards = [];
      for (var i=0; i < num; i++) {
        cards.push( this.cards[this.topCard++] );
      }
      return cards;
    }

  };

  return Deck;
})();
