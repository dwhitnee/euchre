/**
 * A Euchre Card from a standard deck.
 * Aces are high.
 * We know the suit of the left bower only if given the trump suit
 *
 * fourOfSpades = new Card( 4, Card.Spades)
 * aceOfClubs   = new Card( 1, Card.Clubs)
 * jackOfClubs  = new Card(11, Card.Clubs)
 */
class Card {
  /**
   * @param rank 1-13 (Ace through King)
   * @param suit enum for suit (ex: Card.Spades)
   */
  constructor( rank, suit ) {
    if ((suit < Card.Clubs) || (suit > Card.Spades)) {
      throw new Error("Invalid card suit: " + suit);
    }

    if ((rank < 1) || (rank > 13)) {
      throw new Error("Invalid card rank: " + rank);
    }

    this.rank = rank;
    this.suit = suit;
  }

  /**
   *  ace is rank 1, but value 14
   */
  get value () {
    return Card.rankValues[this.rank];
  }

  toString() {
    return this.rankName + " of " + this.suitName;
  }

  get rankName () {
    return Card.rankNames[this.rank];
  }

  get suitName () {
    return Card.suitNames[this.suit];
  }

  /** best card in deck */
  isRightBower( trump ) {
    return (this.suit === trump) && (this.rankName === "Jack");
  }

  /** second best card in deck */
  isLeftBower( trump ) {
    return (this.suit === Card.leftSuits[trump]) && (this.rankName === "Jack");
  }

  /**
   * How well does this card help my case? A seven point hand is worth bidding.
   * bower: 3, high trump: 2, off-suit ace/low trump: 1

   */
  strategicValue( trump ) {
    if (this.isRightBower( trump ) || this.isLeftBower( trump )) {
      return 3;
    } else if ((this.suit === trump) && (this.rank > 11)) {
      return 2;
    } else if (((this.suit === trump) && (this.rank < 11)) || (this.rank === 1)) {
      return 1;
    } else {
      return 0;
    }
  }

  /**
   * Which card will win a Euchre TRICK.  Not necessarily which card is higher in general
   * precondition: the other card is not the highest card, the right bower
   * Otherwise, a card is better than another if it is...
   * 1. The right or left bower
   * 2. the same suit and greater value
   * 3. any trump card
   * Off suits are garbage.
   */
  winsTrickOver( card, trump ) {
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

  /**
   * Compare two cards when trump is not a consideration (ex: choosing dealer)
   */
  isHigherThan( card ) {
    if (!card) {
      return true;  // any card is better than nothing
    }

    if (this.value !== card.value) {
      return this.value > card.value;
    } else {
      return this.suit > card.suit;
    }
  }
}

// strings
Card.suitNames = ["clubs", "diamonds", "hearts", "spades"];
Card.Clubs = 0;
Card.Diamonds = 1;
Card.Hearts = 2;
Card.Spades = 3;
Card.rankNames = ["zero",
                  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
                  "Nine", "Ten", "Jack", "Queen", "King"];

// the suit of the left bower
Card.leftSuits = {};
Card.leftSuits[Card.Clubs]    = Card.Spades;
Card.leftSuits[Card.Spades]   = Card.Clubs;
Card.leftSuits[Card.Hearts]   = Card.Diamonds;
Card.leftSuits[Card.Diamonds] = Card.Hearts;

// aces are high
Card.rankValues = [0,14,2,3,4,5,6,7,8,9,10,11,12,13];


module.exports = Card;
