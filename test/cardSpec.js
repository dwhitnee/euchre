describe(
  "Euchre Card",
  function() {

    beforeEach(
      function() {
        // player = new Player();
        // song = new Song();
      });

    var Suit = Euchre.Card.Suits;

    it("should identify bowers",
       function() {
         var card = new Euchre.Card(11, Suit.Spades );

         expect( card.isRightBower( Suit.Spades )).toBe( true );
         expect( card.isLeftBower( Suit.Spades )).toBe( false );
         expect( card.isLeftBower( Suit.Clubs )).toBe( true );
       });

    it("should compare same suit",
       function() {
         var card1 = new Euchre.Card(11, Suit.Spades );
         var card2 = new Euchre.Card(10, Suit.Spades );

         expect( card1.isBetterThan( card2 )).toBe( true );
         expect( card2.isBetterThan( card1 )).toBe( false );
       });

    it("should compare aces high",
       function() {
         var card1 = new Euchre.Card(1, Suit.Spades );
         var card2 = new Euchre.Card(10, Suit.Spades );

         expect( card1.isBetterThan( card2 )).toBe( true );
         expect( card2.isBetterThan( card1 )).toBe( false );
       });

    it("should compare trump wins",
       function() {
         var card1 = new Euchre.Card(9, Suit.Spades );
         var card2 = new Euchre.Card(13, Suit.Clubs );

         expect( card1.isBetterThan( card2, Suit.Spades )).toBe( true );
         expect( card2.isBetterThan( card1, Suit.Spades )).toBe( false );
       });

    it("should compare bowers win",
       function() {
         var right = new Euchre.Card(11, Suit.Spades );
         var left  = new Euchre.Card(11, Suit.Clubs );
         var card2 = new Euchre.Card(13, Suit.Spades );

         expect( right.isBetterThan( card2, Suit.Spades )).toBe( true );
         expect( left.isBetterThan( card2, Suit.Spades )).toBe( true );
         expect( card2.isBetterThan( left, Suit.Spades )).toBe( false );
       });

    it("should compare left bowers win",
       function() {
         var heart    = new Euchre.Card(11, Suit.Hearts );
         var diamond  = new Euchre.Card(11, Suit.Diamonds );
         var spade    = new Euchre.Card(11, Suit.Spades );
         var club     = new Euchre.Card(11, Suit.Clubs );

         var card2 = new Euchre.Card(13, Suit.Spades );

         expect( heart.isBetterThan( card2, Suit.Diamonds )).toBe( true );
         expect( diamond.isBetterThan( card2, Suit.Hearts )).toBe( true );
         expect( spade.isBetterThan( card2, Suit.Clubs )).toBe( true );
         expect( club.isBetterThan( card2, Suit.Spades )).toBe( true );

       });



  }
);
