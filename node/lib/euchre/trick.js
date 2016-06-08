/**
 * A collection of cards, one of which is the best given the trump suit.
 * Once all cards are added to a trick call trick.winningPlayer
 */

module.exports = (function()
{
  /**
   * @param trumpSuit ex: Card.Spades
   */
  function Trick( trumpSuit ) {
    this.trump = trumpSuit;
    this.winningPlayer = null;
    this.highCard = null;
  }

  Trick.prototype = {
    /**
     * Figure out current winning card in this trick
     * @param card
     */
    addCard: function( card, player ) {
      if (typeof card.isBetterThan !== "function") {
        throw new Error("That's no card! " + card);
      }

      if (card.isBetterThan( this.highCard, this.trump )) {
        this.winningPlayer = player;
        this.highCard = card;
      }
    }
  };

  return Trick;
})();
