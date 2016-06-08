/**
 * A Euchre Card from a standard deck.
 * Aces are high.
 * We know the suit of the left bower given the trump suit
 *
 * we've overloaded this to include card graphics as well.  So be it.
 *
 * sprite: http://www.milefoot.com/math/discrete/counting/images/cards.png
 */

var Card = (function()
{
  // strings
  var suitNames = ["clubs", "diamonds", "hearts", "spades"];
  var rankNames = ["zero",
    "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Jack", "Queen", "King"];

  // aces are high
  var rankValues = [0,14,2,3,4,5,6,7,8,9,10,11,12,13];


  /**
   * An instance of a single Card in a deck of cards
   * fourOfSpades = new Card(4, Card.Spades)
   * aceOfClubs  = new Card(1, Card.Clubs)
   *
   * @param rank 1-13 (Ace through King)
   * @param suit enum for suit (ex: Card.Spades)
   */
  function Card( rank, suit ) {
    if ((suit < Card.Clubs) || (suit > Card.Spades)) {
      throw new Error("Invalid card suit: " + suit);
    }

    if ((rank < 1) || (rank > 13)) {
      throw new Error("Invalid card rank: " + rank);
    }

    this._rank = rank;
    this._suit = suit;
  }

  Card.Clubs = 0;
  Card.Diamonds = 1;
  Card.Hearts = 2;
  Card.Spades = 3;

  // the suit of the left bower
  var leftSuits = {};
  leftSuits[Card.Clubs]    = Card.Spades;
  leftSuits[Card.Spades]   = Card.Clubs;
  leftSuits[Card.Hearts]   = Card.Diamonds;
  leftSuits[Card.Diamonds] = Card.Hearts;

  Card.prototype = {
    // this.suit and this._suit are the same in this case because of "get"
    get suit () {
      return this._suit;
    },
    get value () {
      return rankValues[this._rank];
    },
    get rankName () {
      return rankNames[this._rank];
    },
    get suitName () {
      return suitNames[this._suit];
    },

    toString: function() {
      return this.rankName + " of " + this.suitName;
    },

    isRightBower: function( trump ) {
      return (this.suit === trump) && (this.rankName === "Jack");
    },

    isLeftBower: function( trump ) {
      return (this.suit === leftSuits[trump]) && (this.rankName === "Jack");
    },

    /**
     * precondition: the other card is not the highest card, the right bower
     * Otherwise, a card is better than another if it is...
     * 1. The right or left bower
     * 2. the same suit and greater value
     * 3. any trump card
     * Off suits are garbage.
     */
    isBetterThan: function( card, trump ) {
      if (!card) {
        return true;  // any card is better than nothing
      }

      if (card.isRightBower( trump )) {       // can't beat the highest card
        return false;

      } else if (this.isRightBower( trump ) || this.isLeftBower( trump )) {
        return true;                          // either of the highest two cards

      } else if (card.isLeftBower( trump )) {
        return false;          // can't beat the second highest card if we're not a bower

      } else if (this.suit === card.suit) {   // straight comparison
        return this.value > card.value;

      } else {
        return this.suit === trump;           // trump always beats non trump
      }
    }
  };

  return Card;
})();



module.exports = Card;
