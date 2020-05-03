/*global */

/**
 * A Euchre Card from a standard deck.
 * Aces are high.
 * We know the suit of the left bower given the trump suit
 *
 * Card.allCards contains the canonical instance of every card.
 * Decks will contain ids (pointers) into allCards
 */

class Card {
  constructor( rank, suit ) {
    this._rank = rank;
    this._suit = suit;
  }

  toString() {
    return this.rankName + " of " + this.suitName;
  }
  get suit () {
    return this._suit;
  }
  get rank () {
    return this._rank;
  }
  get value () {
    return Card.rankValues[this.rank];
  }
  get suitName () {
    return Card.suitNames[this.suit];
  }
  get rankName () {
    return Card.rankNames[this.rank];
  }

  get id() {
    return Card.generateId( this._rank,this._suit);
  }

  isRightBower( trumpSuit ) {
    return (this.suit === trumpSuit) && (this.rankName === "Jack");
  }

  isLeftBower( trumpSuit ) {
    return (this.suit === Card.leftSuits[trumpSuit]) &&
      (this.rankName === "Jack");
  }

  /**
   * precondition: the other card is not the highest card, the right bower
   * Otherwise, a card is better than another if it is...
   * 1. The right or left bower
   * 2. the same suit and greater value
   * 3. any trump card
   * Off suits are garbage.
   */
  isBetterThan( card, trumpSuit ) {
    if (!card) {
      return true;  // any card is better than nothing
    }

    if (card.isRightBower( trumpSuit )) {       // can't beat the highest card
      return false;

    } else if (this.isRightBower( trumpSuit ) || this.isLeftBower( trumpSuit )){
      return true;                          // either of the highest two cards

    } else if (card.isLeftBower( trumpSuit )) {
      return false;          // can't beat the second highest card if we're not a bower

    } else if (this.suit === card.suit) {   // straight comparison
      return this.value > card.value;

    } else {
      return this.suit === trumpSuit;  // trumpsuit always beats other suits
    }
  }
}

//----------------------------------------------------------------------
// Card Factory functions
//----------------------------------------------------------------------
Card.generateId = function( rank, suit ) {
  return rank+":"+suit;
};

// factory
Card.fromId = function( id ) {
  return Card.allCards[id];
};

Card.getByRankAndSuit = function( rank, suit ) {
  return Card.allCards[ Card.generateId(rank,suit) ];
};

//----------------------------------------
// Card constants
//----------------------------------------
Card.suits = { Clubs: 0, Diamonds: 1, Hearts: 2, Spades: 3 };
Card.suitNames = ["Clubs", "Diamonds", "Hearts", "Spades" ];
Card.rankNames = ["zero",
  "Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
Card.rankValues = [0,14,2,3,4,5,6,7,8,9,10,11,12,13]; // aces are high

// the suit of the left bower
Card.leftSuits = {};
Card.leftSuits[Card.suits.Clubs]  = Card.suits.Spades;
Card.leftSuits[Card.suits.Spades] = Card.suits.Clubs;
Card.leftSuits[Card.suits.Hearts]   = Card.suits.Diamonds;
Card.leftSuits[Card.suits.Diamonds] = Card.suits.Hearts;


//----------------------------------------------------------------------
// Factory.  52 card static deck, keyed by id. Ex: deck["9:2"]
//----------------------------------------------------------------------
Card.allCards = (function() {
  let deck = [];

  for (let suit = Card.suits.Clubs; suit <= Card.suits.Spades; suit++ ) {
    for (let rank = 1; rank <= 13; rank++ ) {
      let card =  new Card( rank, suit );
      deck[card.id] = card;
    }
  }
  return deck;
})();

//----------------------------------------------------------------------
// Euchre deck as array of Cards
//----------------------------------------------------------------------
Card.getEuchreDeck = function() {
  let deck = [];
  let ranks = [9,10,11,12,13,1];  // 9, 10, J, Q, K ,A

  for (let suit = Card.suits.Clubs; suit <= Card.suits.Spades; suit++ ) {
    ranks.forEach( function( rank ) {
      deck.push( Card.getByRankSuit( rank, suit ) );
    });
  }

  return deck;
};
