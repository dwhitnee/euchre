describe(
  "Euchre Trick",
  function() {

    beforeEach(
      function() {
      });

    var Suit = Euchre.Card.Suits;

    function winner( trump, cards) {
      var trick = new Euchre.Trick( trump );

      for (var i=0; i < cards.length; i++) {
        trick.addCard( cards[i], i );
      }
      return trick.winningPlayer;
    };

    it("should do trick following suit",
       function() {
         var cards = [
           new Euchre.Card( 9, Suit.Spades ),
           new Euchre.Card(11, Suit.Spades ),
           new Euchre.Card(12, Suit.Spades ),
           new Euchre.Card(13, Suit.Spades )];

         expect( winner( Suit.Hearts, cards ) ).toBe( 3 );    // off suit
         expect( winner( Suit.Diamonds, cards ) ).toBe( 3 );  // off suit
         expect( winner( Suit.Clubs, cards ) ).toBe( 1 );     // left bower
         expect( winner( Suit.Spades, cards ) ).toBe( 1 );    // trump suit
       });

    it("should do trick trumped low",
       function() {
         var cards = [
           new Euchre.Card( 9, Suit.Spades ),
           new Euchre.Card(11, Suit.Spades ),
           new Euchre.Card( 9, Suit.Hearts ),
           new Euchre.Card(13, Suit.Spades )];

         expect( winner( Suit.Hearts, cards ) ).toBe( 2 );  // low trump
         expect( winner( Suit.Clubs,  cards ) ).toBe( 1 );  // left bower
         expect( winner( Suit.Diamonds, cards ) ).toBe( 3 );  // garbage
         expect( winner( Suit.Spades, cards ) ).toBe( 1 );  // right bower
       });

    it("should do trick with aces",
       function() {
         var cards = [
           new Euchre.Card( 9, Suit.Spades ),
           new Euchre.Card(11, Suit.Spades ),
           new Euchre.Card( 1, Suit.Hearts ),
           new Euchre.Card(13, Suit.Hearts )];

         expect( winner( Suit.Hearts, cards ) ).toBe( 2 );  // trump ace
         expect( winner( Suit.Clubs,  cards ) ).toBe( 1 );  // left bower
         expect( winner( Suit.Diamonds, cards ) ).toBe( 1 );  // high jack
         expect( winner( Suit.Spades, cards ) ).toBe( 1 );  // right bower
       });

    it("should do trick with no bowers",
       function() {
         var cards = [
           new Euchre.Card( 9, Suit.Clubs ),
           new Euchre.Card(13, Suit.Spades ),
           new Euchre.Card(13, Suit.Hearts ),
           new Euchre.Card(12, Suit.Hearts )];

         expect( winner( Suit.Hearts, cards ) ).toBe( 2 );  // trump ace
         expect( winner( Suit.Clubs,  cards ) ).toBe( 0 );  // low trump
         expect( winner( Suit.Diamonds, cards ) ).toBe( 0 );  // others void
         expect( winner( Suit.Spades, cards ) ).toBe( 1 );  // trump ace
       });


  }
);
