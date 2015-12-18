/*global Euchre */

// require("euchre.js");

/**
 * A Euchre Card from a standard deck.
 * Aces are high.
 * We know the suit of the left bower given the trump suit
 *
 * we've overloaded this to include card graphics as well.  So be it.
 *
 * sprite: http://www.milefoot.com/math/discrete/counting/images/cards.png
 */

Euchre.Card = (function()
{
  // sprite dimensions
  var height = 98, width = 73;

  var suits = { Clubs: 0, Spades: 1, Hearts: 2, Diamonds: 3 };

  // the suit of the left bower
  var leftSuits = {};
  leftSuits[suits.Clubs]  = suits.Spades;
  leftSuits[suits.Spades] = suits.Clubs;
  leftSuits[suits.Hearts]   = suits.Diamonds;
  leftSuits[suits.Diamonds] = suits.Hearts;

  var rankNames = ["zero",
    "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Jack", "Queen", "King"];

  // aces are high
  var rankValues = [0,14,2,3,4,5,6,7,8,9,10,11,12,13];

  function Card( rank, suit ) {
    this._rank = rank;
    this._suit = suit;

    this.$el = $('<div class="card draggable ui-widget-content"/>');

    // jquery-ui
    this.$el.draggable(
      {
        containment: "parent",
        revert: "invalid"
      });

    this.$el.css("background-position",
                 -(width  * (rank-1)) + "px " +
                 -(height * suits[suit]) + "px ");
  }

  Card.Suits = suits;

  Card.prototype = {
    get suit () {
      return this._suit;
    },
    get value () {
      return rankValues[this._rank];
    },
    get rankName () {
      return rankNames[this._rank];
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
    },

    slideToATilt: function() {
      // some easing thing that adds a slight rotation to the css.
    },

    animate: function() { }  // ???
  };

  return Card;
})();
