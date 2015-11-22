
$(document).ready( function()
{
  var deck = new Euchre.Deck();
  deck.shuffle();

  var cards = deck.deal( 5 );

  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    $(".cardTable").append( card.el );

    console.log( card.rank + " of " + card.suit );
  }

  // var game = new Daleks.GameController( $(".arena") );
  // game.startNextLevel();
});
