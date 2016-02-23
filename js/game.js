/**
 * Euchre game controller
 */
$(document).ready( function()
{

  $(".droppable").droppable({
      activeClass: "ui-state-default",
      hoverClass: "ui-state-hover",
      drop: function( event, ui ) {
        $( this )
          .addClass( "ui-state-highlight" )
          .find( "p" )
            .html( "Played!" );
      }});


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
