/*global Euchre */

// require("euchre.js");

/**
 * A collection of cards, one of which is the best given the trump suit.
 */

Euchre.Trick = (function()
{
  function Trick( trumpSuit ) {
    this.trump = trumpSuit;
    this.winningPlayer = null;
    this.highCard = null;
  }

  Trick.prototype = {

    /**
     * Figure out current winning card in this trick
     */
    addCard: function( card, player ) {
      if (card.isBetterThan( this.highCard, this.trump )) {
        this.winningPlayer = player;
        this.highCard = card;
      }
    }
  };

  return Trick;
})();
