/**
 * A collection of cards, one of which is the best given the trump suit.
 * Once all cards are added to a trick call trick.winningPlayer
 */

class Trick {
  /**
   * @param trumpSuit ex: Card.Spades
   */
  constructor( trumpSuit ) {
    this.trump = trumpSuit;
    this.winningPlayer = null;
    this.highCard = null;
  }

  /**
   * Figure out current winning card in this trick
   * @param card
   */
  addCard( card, player ) {
    if (typeof card.winsTrickOver !== "function") {
      throw new Error("That's no card! " + card);
    }

    if (card.winsTrickOver( this.highCard, this.trump )) {
      this.winningPlayer = player;
      this.highCard = card;
    }
  }
}

module.exports = Trick;
