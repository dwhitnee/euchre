/*global describe beforeEach it expect */

var Card = require("euchre/card");

describe(
  "Euchre Card",
  function() {

    beforeEach(
      function() {
      });

    it("should identify bowers",
       function() {
         var card = new Card(11, Card.Spades );

         expect( card.isRightBower( Card.Spades )).toBe( true );
         expect( card.isLeftBower( Card.Spades )).toBe( false );
         expect( card.isLeftBower( Card.Clubs )).toBe( true );
       });

    it("should compare same suit",
       function() {
         var card1 = new Card(11, Card.Spades );
         var card2 = new Card(10, Card.Spades );

         expect( card1.winsTrickOver( card2 )).toBe( true );
         expect( card2.winsTrickOver( card1 )).toBe( false );

         expect( card1.isHigherThan( card2 )).toBe( true );
         expect( card2.isHigherThan( card1 )).toBe( false );
       });

    it("should compare aces high",
       function() {
         var card1 = new Card(1, Card.Spades );
         var card2 = new Card(10, Card.Spades );

         expect( card1.winsTrickOver( card2 )).toBe( true );
         expect( card2.winsTrickOver( card1 )).toBe( false );

         expect( card1.isHigherThan( card2 )).toBe( true );
         expect( card2.isHigherThan( card1 )).toBe( false );
       });

    it("should compare trump wins",
       function() {
         var card1 = new Card(9, Card.Spades );
         var card2 = new Card(13, Card.Clubs );

         expect( card1.winsTrickOver( card2, Card.Spades )).toBe( true );
         expect( card2.winsTrickOver( card1, Card.Spades )).toBe( false );

         expect( card2.isHigherThan( card1 )).toBe( true );
       });

    it("should compare bowers win",
       function() {
         var right = new Card(11, Card.Spades );
         var left  = new Card(11, Card.Clubs );
         var card2 = new Card(13, Card.Spades );

         expect( right.winsTrickOver( card2, Card.Spades )).toBe( true );
         expect( left.winsTrickOver( card2, Card.Spades )).toBe( true );
         expect( card2.winsTrickOver( left, Card.Spades )).toBe( false );
       });

    it("should compare left bowers win",
       function() {
         var heart    = new Card(11, Card.Hearts );
         var diamond  = new Card(11, Card.Diamonds );
         var spade    = new Card(11, Card.Spades );
         var club     = new Card(11, Card.Clubs );

         var card2 = new Card(13, Card.Spades );

         expect( heart.winsTrickOver( card2, Card.Diamonds )).toBe( true );
         expect( diamond.winsTrickOver( card2, Card.Hearts )).toBe( true );
         expect( spade.winsTrickOver( card2, Card.Clubs )).toBe( true );
         expect( club.winsTrickOver( card2, Card.Spades )).toBe( true );

       });

    it("should compare non-trump suits",
       function() {
         var heart    = new Card(11, Card.Hearts );
         var diamond  = new Card(11, Card.Diamonds );

         expect( heart.isHigherThan( diamond )).toBe( true );
       });


  }
);
