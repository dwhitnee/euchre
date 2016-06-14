/*global $ */

/**
 * Display of a Playing Card
 *
 * sprite: http://www.milefoot.com/math/discrete/counting/images/cards.png

 black_joker
 red_joker
 back
 {king,queen,jack}_{club,diamond,heart,spade}
 {1,2,3,4,5,6,7,8,9,10}_{club,diamond,heart,spade}
*/

/*
      <svg viewBox="331 772 175 175">
        <use xlink:href="svg/svg-cards.svg#back"></use>
      </svg>

      <svg viewbox="-2 -200 175 175" style="width:14em; height:20em">
        <use xlink:href="svg/svg-cards.svg#1_club"></use>
      </svg>

      <svg viewbox="-2 286 175 175" style="width:14em; height:20em">
        <use xlink:href="svg/svg-cards.svg#1_heart"> </use>
      </svg>

      <svg viewbox="164 43 175 175" style="width:14em; height:20em">
        <use xlink:href="svg/svg-cards.svg#2_diamond"> </use>
      </svg>

      <svg viewbox="331 286 175 175" style="width:14em; height:20em">
        <use xlink:href="svg/svg-cards.svg#3_heart"> </use>
      </svg>

      <svg viewbox="498 529 175 175" style="width:14em; height:20em">
        <use xlink:href="svg/svg-cards.svg#4_spade"> </use>
      </svg>

      <svg viewbox="1843 529 175 175" style="width:14em; height:20em">
        <use xlink:href="svg/svg-cards.svg#queen_spade"> </use>
      </svg>
*/

var Card = (function()
{
  // sprite dimensions
  var height = 98, width = 73;

  var url = "svg/svg-cards.svg";

  var suits = { Clubs: 0, Diamonds: 1, Hearts: 2, Spades: 3};
  var suitNames = ["club", "diamond", "heart", "spade"];

  var faceCards = { 11: "jack", 12: "queen", 13: "king" };
  var rankNames = ["zero",
    "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Jack", "Queen", "King"];

  var suitOffset = [-200, 43, 286, 529, 772];

  // aces are high
  var rankValues = [0,14,2,3,4,5,6,7,8,9,10,11,12,13];

  function Card( rank, suit ) {
    if ((suit < 0) || (suit > 3)) console.err();

    this._rank = rank;
    this._suit = suit;

    // this.$el = $('<div class="card draggable ui-widget-content"/>');
    this.$el = $('<div class="card"/>');

    var x0 = Math.floor( -2 + 167.67*(rank-1) ); // rank  -2, 164, 331, 498, 1843(Q) 167.67x
    var y0 = suitOffset[suit];        // suit  -200, 43, 286, 529

    if (rank > 10) {
      rank = faceCards[rank];
    }
    var cardId = rank + '_' + suitNames[suit];
    if (rank === 0) {
      cardId = "back";
      x0 = 331;
      y0 = suitOffset[4];  // "suit 4": jokers and card backing
    }
    console.log( cardId +": " + x0 + " " + y0 );

    var svg = '<svg viewbox="' + x0 + ' ' + y0 + ' 175 175" >';
    var use = '<use xlink:href="' + url + '#' + cardId + '" ></use>';

    this.$el.append( svg + use + "</svg>");

    // jquery-ui
    // this.$el.draggable(
    //   {
    //     containment: "parent",
    //     revert: "invalid"
    //   });

    // this.$el.css("background-position",
    //              -(width  * (rank-1)) + "px " +
    //              -(height * suits[suit]) + "px ");
  }

  Card.Suits = suits;

  Card.prototype = {
    get el () {
      return this.$el;
    },
    get suit () {
      return this._suit;
    },
    get value () {
      return rankValues[this._rank];
    },
    get rankName () {
      return rankNames[this._rank];
    },

    slideToATilt: function() {
      // some easing thing that adds a slight rotation to the css.
    },

    animate: function() { }  // ???
  };

  return Card;
})();


/*
var t = $("#test");
for (var i = 0; i < 14; i++) {
  var card1 = new Card( i, Card.Suits.Clubs );
  var card2 = new Card( i, Card.Suits.Hearts );
  var card3 = new Card( i, Card.Suits.Spades );
  var card4 = new Card( i, Card.Suits.Diamonds );
  t.append( card1.el );
  t.append( card2.el );
  t.append( card3.el );
  t.append( card4.el );
}
*/
