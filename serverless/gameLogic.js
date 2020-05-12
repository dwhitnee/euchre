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

//----------------------------------------
// If 4 cards where played, which card is highest
// @return winning playerId or undefined if any card is null
//----------------------------------------
function determineTrickWinner( cardIds, trumpSuit ) {
  let highestId = 0;
  let highestCard = undefined;

  if (!cardIds[0]) {
    return undefined;
  } else {
    highestCard = Card.fromId( cardIds[0] );
    highestId = 0;
  }

  for (let i=1; i < 4; i++) {
    if (!cardIds[i]) {
      return undefined;
    }
    let card = Card.fromId( cardIds[i] );
    if (card.isBetterThan( highestCard, trumpSuit )) {
      highestCard = card;
      highestId = i;
    }
  }
  return highestId;
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

  //----------------------------------------------------------------------
  // Tell dealer to pick up card, playerId has called trump, set leader
  // FIXME: can this double for callTrumpSuit?
  //----------------------------------------------------------------------
  pickItUp: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log( params.playerId + " orders it up");

      // take up-card
      let upCardId = game.playedCardIds[game.dealerId];
      game.playedCardIds[game.dealerId] = null;

      // declare trump suit
      game.trumpCallerId = parseInt( params.playerId );
      game.trumpSuit = Card.fromId( upCardId ).suit;   // id

      // put card in dealer's hand
      game.players[game.dealerId].cardIds.push( upCardId );
      game.dealerMustDiscard = true;

      // play will start at dealer's left
      game.playerTurn = (game.dealerId + 1) % 4;
      game.leadPlayerId = game.playerTurn;     // need this to check trick

      // bidding isn't technically over because dealer still needs to discard
      game.bidding = false;

      // FIXME: how to proceed with dealer an their extra card:
      //   new fn discard(), or special case of playCard?

      thomas.updateGame( game, function( err, response ) {
        message.respond( err, response , callback );
      });
    });
  },

  //----------------------------------------------------------------------
  // Move card from player's hand to table. Check for legality and trick ending
  // special case for discarding 6th card from dealer's hand at beginning.
  //----------------------------------------------------------------------
  playCard: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }
    if (!message.verifyParam( request, callback, "cardId")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log( params.playerId + " played card " + params.cardId );

      // special case for dealer discard after pickItUp
      let discarding =
          (game.players[game.dealerId].cardIds.length == 6) &&
          (params.playerId == game.dealerId);

      if (!discarding) {
        if ((game.playedCardIds[params.playerId]) ||    // already played
            (params.playerId !== game.playerTurn) ||    // not her turn
            game.bidding)                        // not playing yet
        {
          callback("Can't play a card now"); // doh! fail
        }
      }

      // remove card from player's hand
      let cards = game.players[params.playerId].cardIds;
      cards.splice( cards.indexOf(params.cardId), 1);

      if (discarding) {
        game.dealerMustDiscard = false;

      } else {      // play card
        // FIXME, ensure player followed suit - can be done client side
        let leadCard = game.playedCardIds[game.leadPlayerId];
        // checkForFollowingSuit( leadCard, cardId, cards )

        // put card on table
        game.playedCardIds[params.playerId] = params.cardId;

        // next player's turn
        game.playerTurn = (game.playerTurn + 1) % 4;

        // FIXME, check for end of trick
        let winner = determineTrickWinner( game.playedCardIds, game.trumpSuit );
        if (winner !== undefined) {
          game.trickWinner = winner;   // does takeTrick reset this?
          game.playerTurn = winner;
        }
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
