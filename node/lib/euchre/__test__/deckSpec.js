/*global describe beforeEach it expect */

var Deck = require("euchre/deck");

describe(
  "Euchre Deck",
  function() {

    var deck;

    beforeEach(
      function() {
        deck = new Deck();
      });

    it("should shuffle",
       function() {
         deck.shuffle();

         for (var i=0; i < deck.cards.length; i++) {
           var str = deck.cards[i].toString();
         }
       });

    it("should deal",
       function( done ) {
         deck.shuffle();

         var cards = deck.deal( 6 );
         expect( cards.length ).toBe( 6 );
         for (var i=0; i < cards.length; i++) {
           var str = cards[i].toString();
         }

         deck.deal( 18 );

         // expect( deck.deal( 1 )).toThrow();   // why no work?
         // expect( deck.deal( 1 )).toThrowError(/out of cards/);   // why no work?

         try { deck.deal( 1 ); }
         catch( e ) {
           // toThrow the hard way
           expect( e ).toMatch(/out of cards/);
           done();
         }
       });

  }
);
