/*global describe beforeEach it expect */

var Trick = require("euchre/trick");
var Card = require("euchre/card");

describe(
  "Euchre Trick",
  function() {

    beforeEach(
      function() {
      });

    function winner( trump, cards) {
      var trick = new Trick( trump );

      for (var i=0; i < cards.length; i++) {
        trick.addCard( cards[i], i );
      }
      return trick.winningPlayer;
    };

    it("should do trick following suit",
       function() {
         var cards = [
           new Card( 9, Card.Spades ),
           new Card(11, Card.Spades ),
           new Card(12, Card.Spades ),
           new Card(13, Card.Spades )];

         expect( winner( Card.Hearts, cards ) ).toBe( 3 );    // off suit
         expect( winner( Card.Diamonds, cards ) ).toBe( 3 );  // off suit
         expect( winner( Card.Clubs, cards ) ).toBe( 1 );     // left bower
         expect( winner( Card.Spades, cards ) ).toBe( 1 );    // trump suit
       });

    it("should do trick trumped low",
       function() {
         var cards = [
           new Card( 9, Card.Spades ),
           new Card(11, Card.Spades ),
           new Card( 9, Card.Hearts ),
           new Card(13, Card.Spades )];

         expect( winner( Card.Hearts, cards ) ).toBe( 2 );  // low trump
         expect( winner( Card.Clubs,  cards ) ).toBe( 1 );  // left bower
         expect( winner( Card.Diamonds, cards ) ).toBe( 3 );  // garbage
         expect( winner( Card.Spades, cards ) ).toBe( 1 );  // right bower
       });

    it("should do trick with aces",
       function() {
         var cards = [
           new Card( 9, Card.Spades ),
           new Card(11, Card.Spades ),
           new Card( 1, Card.Hearts ),
           new Card(13, Card.Hearts )];

         expect( winner( Card.Hearts, cards ) ).toBe( 2 );  // trump ace
         expect( winner( Card.Clubs,  cards ) ).toBe( 1 );  // left bower
         expect( winner( Card.Diamonds, cards ) ).toBe( 1 );  // high jack
         expect( winner( Card.Spades, cards ) ).toBe( 1 );  // right bower
       });

    it("should do trick with no bowers",
       function() {
         var cards = [
           new Card( 9, Card.Clubs ),
           new Card(13, Card.Spades ),
           new Card(13, Card.Hearts ),
           new Card(12, Card.Hearts )];

         expect( winner( Card.Hearts, cards ) ).toBe( 2 );  // trump ace
         expect( winner( Card.Clubs,  cards ) ).toBe( 0 );  // low trump
         expect( winner( Card.Diamonds, cards ) ).toBe( 0 );  // others void
         expect( winner( Card.Spades, cards ) ).toBe( 1 );  // trump ace
       });


  }
);
