/*global Euchre */

// require("euchre.js");

/**
 * A Card from a standard deck
 * we've overloaded this to include card graphics as well.  So be it.
 *
 * sprite: http://www.milefoot.com/math/discrete/counting/images/cards.png
 */

Euchre.Card = (function()
{
  // sprite dimensions
  var height = 98, width = 73;

  var suits = {
    clubs: 0,
    spades: 1,
    hearts: 2,
    diamonds: 3
  };

  var ranks = ["zero",
               "ace", "two", "three", "four", "five", "six", "seven", "eight",
               "nine", "ten", "jack", "queen", "king"
              ];

  function Card( rank, suit ) {
    this._rank = rank;
    this._suit = suit;

    this.el = $('<div class="card"/>');
    this.el.css("background-position",
                -(width  * (rank-1)) + "px " +
                -(height * suits[suit]) + "px ");
  }

  Card.prototype = {
    get suit () {
      return this._suit;
    },
    get rank () {
      return ranks[this._rank];
    },

    animate: function() { }  // ???
  };

  return Card;
})();
