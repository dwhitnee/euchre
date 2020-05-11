//----------------------------------------------------------------------
//  AWS Lambda API -- Game logic stuff

// Race conditions galore:  we have to load an existing game, modify
// it, and stuff it back in.  What happens if someone changes their
// name while we're shuffling?  FIXME  versioning? Optimistic locking?

//----------------------------------------------------------------------
'use strict';

let euchreDB = require('euchreDB');  // All the Dynamo stuff
let thomas = require('thomas');   // Thomas is our private middleware
let message = require('responseHandler');  // HTTP message handling

const Card = require('card');

function getShuffledDeck() {
  let card = new Card();
  let cards = Card.getEuchreDeck();

  // shuffle
  // Go through deck from back to front (a)
  let b,a = cards.length;
  while (a) {
    b = Math.floor(Math.random() * a--);         // Pick a card b…
    [cards[a], cards[b]] = [cards[b], cards[a]]; // and swap
  }

  return cards;
}


module.exports = {

  //----------------------------------------------------------------------
  // Shuffle and deal the cards
  // @param gameId
  // @return nothing
  //----------------------------------------------------------------------
  deal: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {

      // convert Cards to ids
      let deck = getShuffledDeck();
      for (var i=0; i < 4; i++) {
        let hand = deck.splice(0, 5);
        game.players[i].cardIds = [];
        hand.forEach( card => { game.players[i].cardIds.push( card.id ); });
      }
      // turn card face up for dealer
      game.playedCardIds[game.dealerId] = deck.pop().id;

      // what's left;
      game.deck = [];
      deck.forEach( card => { game.deck.push( card.id ); });

      game.cardsDealt = true;

      // // hard coded unshuffled deck
      // game.deck = ["1:1","1:2","1:3"];  // blind
      // game.playedCardIds = ["","","",""];
      // for (var i=0; i < 4; i++) {
      //   game.players[i].cardIds = ["12:"+i,"9:"+i,"10:"+i,"11:"+i, "13:"+i];
      // }
      // // turn card face up for dealer
      // game.playedCardIds[game.dealerId] = ["1:0"];

      thomas.updateGame( game, function( err, response ) {
        message.respond( err, response , callback );
      });
    });

  },


  //----------------------------------------------------------------------
  // Put a name in a seat.  Assume other player data is already populated
  //----------------------------------------------------------------------
  joinGame: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }
    if (!message.verifyParam( request, callback, "playerName")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log("Joining as " + params.playerName +
                  " at spot #" + params.playerId);
      game.players[params.playerId].name = params.playerName;

      thomas.updateGame( game, function( err, response ) {
        message.respond( err, response , callback );
      });
    });
  },


  //----------------------------------------------------------------------
  // Pass to next player
  //----------------------------------------------------------------------
  pass: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log( params.playerId + "Passes ");
      game.playerTurn = (game.playerTurn + 1 ) % 4;

      if (params.playerId == game.dealerId) {
        game.playedCardIds[game.dealerId] = null;
      }

      thomas.updateGame( game, function( err, response ) {
        message.respond( err, response , callback );
      });
    });
  },







  /*
  //----------------------------------------------------------------------
  // same logic as joining, on the back end, just putting a name in a slot
  //----------------------------------------------------------------------
  setPlayerName: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }
    if (!message.verifyParam( request, callback, "playerName")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log("Joining as " + params.playerName + " at spot #" + params);
      game.players[params.playerId].name = params.playerName;
      thomas.updateGame( game, callback );
    });
  },
*/
};
