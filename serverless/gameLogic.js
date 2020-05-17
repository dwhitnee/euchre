//----------------------------------------------------------------------
//  AWS Lambda API -- Game logic stuff

// Race conditions galore:  we have to load an existing game, modify
// it, and stuff it back in.  Optimistic locking in DB layer should cause 400's
// if an overlap happens.
//----------------------------------------------------------------------

'use strict';

let euchreDB = require('euchreDB');  // All the Dynamo stuff
let thomas = require('thomas');   // Thomas is our private middleware
let message = require('responseHandler');  // HTTP message handling

const Card = require('card');

//----------------------------------------
// Pass Amazon SDE phone screen
//----------------------------------------
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
// If 4 cards where played, which card is highest of lead suit, unless trumped
// @return winning playerId or undefined if any card is null
//----------------------------------------
function determineTrickWinner( cardIds, leadCardId, trumpSuit ) {
  console.log("Trick " + JSON.stringify(cardIds));
  console.log("lead player: " + leadCardId + ", trump: " + trumpSuit );

  let highestId = 0;
  let highestCard = undefined;

  if (!cardIds[leadCardId]) {
    return undefined;
  } else {
    // player to beat is always the leader
    highestCard = Card.fromId( cardIds[leadCardId] );
    highestId = leadCardId;
  }

  for (let i=0; i < 4; i++) {
    if (!cardIds[i]) {
      return undefined;    // hand not done
    }
    let card = Card.fromId( cardIds[i] );
    if (card.isBetterThan( highestCard, trumpSuit )) {
      highestCard = card;
      highestId = i;
    }
  }
  console.log("Winner is " + highestId );
  return highestId;
}


//----------------------------------------
// both players on a team get the same points.
//----------------------------------------
function giveTeamPoints( game, playerId, points ) {
  playerId = playerId % 4;
  let teammateId = (playerId+2) %4;

  game.players[playerId].score += points;
  game.players[teammateId].score += points;

  game.message = game.players[playerId].name + " wins " +
    points + " point" + ((points>1) ? "s":"");
}

//----------------------------------------
// if hand is over, dole out points to each team member
// return a cute message to display.
//----------------------------------------
function assignPoints( game ) {
  if (game.players[game.trumpCallerId].tricks < 3) {
    giveTeamPoints( game, game.trumpCallerId+1, 2);  // Euchred!
    game.message += ". Euchre!";

  } else {
    if (game.players[game.trumpCallerId].tricks == 5) {  // sweep!
      if (game.goingAlone) {
        giveTeamPoints( game, game.trumpCallerId, 4);
        game.message += ". Solo sweep!";
      } else {
        giveTeamPoints( game, game.trumpCallerId, 2);
        game.message += ". Sweep!";
      }
    } else {
      giveTeamPoints( game, game.trumpCallerId, 1);     // simple win
    }
  }
};


//----------------------------------------------------------------------
// @return true if anyone has 10 points
//----------------------------------------------------------------------
function checkGameOver( game ) {
  for (let i=0; i<4; i++) {
    if (game.players[i].score >= 10) {
      game.winner = i;
    }
  }
}

//----------------------------------------------------------------------
// Clear the table and setup state for next deal
//----------------------------------------------------------------------
function prepareForNextDeal( game ) {
  game.dealerId = (game.dealerId + 1) %4;
  game.playerTurn = (game.dealerId + 1) % 4;
  game.cardsDealt = false;
  game.trumpCallerId = null;
  game.trumpSuit = null;

  game.trickWinner = null;
  game.playedCardIds = [ null,null,null,null ];

  for (var i=0; i < 4; i++) {
    game.players[i].cardIds = [];
    game.players[i].tricks = 0;
  }
}


//----------------------------------------------------------------------
//----------------------------------------------------------------------
//----------------------------------------------------------------------
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
        game.players[i].tricks = 0;
        hand.forEach( card => { game.players[i].cardIds.push( card.id ); });
      }
      // turn card face up for dealer
      let upCard = deck.pop();
      game.playedCardIds[game.dealerId] = upCard.id;
      game.upCardSuit = upCard.suit;   // for bidding restrictions

      // what's left;
      game.deck = [];
      deck.forEach( card => { game.deck.push( card.id ); });

      game.cardsDealt = true;
      game.bidding = true;
      game.message = "Play " +
        Card.fromId( game.playedCardIds[game.dealerId] ).suitName + "?";

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

      // someone's already sitting here
      if (game.players[params.playerId].name) {
        message.respond( game.players[params.playerId].name +
                         " is already sitting in seat " + params.playerId,
                         "" , callback );
      } else {
        game.message = params.playerName + " has joined.";
        game.players[params.playerId].name = params.playerName;
        thomas.updateGame( game, function( err, response ) {
          message.respond( err, response , callback );
        });
      }
    });
  },


  //----------------------------------------------------------------------
  // Pass to next player.
  // If dealer either turn down the up card, or throw in the cards
  //----------------------------------------------------------------------
  pass: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log( params.playerId + "Passes ");
      game.playerTurn = (game.playerTurn + 1 ) % 4;

      if (params.playerId == game.dealerId) {

        if (game.playedCardIds[game.dealerId]) {  // turn down the up card
          game.message = "Turning down the " +
            Card.fromId( game.playedCardIds[game.dealerId] ).toString();
          game.playedCardIds[game.dealerId] = null;
        } else {
          // everyone passed, end the hand and restart the deal
          prepareForNextDeal( game );
          game.message = "Everyone passed, time for a new deal";
        }
      }

      thomas.updateGame( game, function( err, response ) {
        message.respond( err, response , callback );
      });
    });
  },

  //----------------------------------------------------------------------
  // Tell dealer to pick up card, playerId has called trump, set leader
  // Discarding is handled as a special case in playCard
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

      thomas.updateGame( game, function( err, response ) {
        message.respond( err, response , callback );
      });
    });
  },

  //----------------------------------------------------------------------
  // PlayerId has called trump, set leader.
  // This is much like pickItUp but simpler
  //----------------------------------------------------------------------
  callSuit: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }
    if (!message.verifyParam( request, callback, "suitName")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log( params.playerId + " calls " + params.suitName);

      // declare trump suit
      game.trumpCallerId = parseInt( params.playerId );
      // get suit id from name
      game.trumpSuit = Card.suitNames.findIndex( suitName =>
                                                 (suitName == params.suitName));
      game.message = game.players[params.playerId].name +
        " calls " + params.suitName;

      // play will start at dealer's left
      game.playerTurn = (game.dealerId + 1) % 4;
      game.leadPlayerId = game.playerTurn;     // need this to check trick

      // bidding isn't technically over because dealer still needs to discard
      game.bidding = false;

      thomas.updateGame( game, function( err, response ) {
        message.respond( err, response , callback );
      });
    });
  },



  //----------------------------------------------------------------------
  // Move card from player's hand to table. Check for legality and trick ending
  // Special case for discarding 6th card from dealer's hand at beginning.
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
        game.message = game.players[game.leadPlayerId].name + " leads";

      } else {      // play card
        // FIXME, ensure player followed suit - can be done client side
        let leadCard = game.playedCardIds[game.leadPlayerId];
        // checkForFollowingSuit( leadCard, cardId, cards )

        // put card on table
        game.playedCardIds[params.playerId] = params.cardId;

        // next player's turn
        game.playerTurn = (game.playerTurn + 1) % 4;

        let winner = determineTrickWinner( game.playedCardIds,
                                           game.leadPlayerId, game.trumpSuit );
        if (winner !== undefined) {
          game.trickWinner = winner;   // takeTrick resets this
          game.playerTurn = winner;
          game.leadPlayerId = winner;
        }
      }

      thomas.updateGame( game, function( err, response ) {
        message.respond( err, response , callback );
      });
    });
  },


  //----------------------------------------------------------------------
  // Take trick, update score, start next round.
  //----------------------------------------------------------------------
  takeTrick: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log( params.playerId + " takes trick");

      if (game.trickWinner == null) {     // this is not my bueatiful house!
        message.respond("No trick winner - double call?", null, callback );
        return;
      }

      // update team's count
      let teammate = (game.trickWinner + 2) % 4;
      game.players[game.trickWinner].tricks =
        game.players[game.trickWinner].tricks + 1;
      game.players[teammate].tricks =
        game.players[teammate].tricks + 1;

      // clear table for next trick
      game.trickWinner = null;
      game.playedCardIds = [ null,null,null,null ];

      // if all the cards are played, see who won and start next round
      if (game.players[0].cardIds.length == 0) {

        assignPoints( game );
        checkGameOver( game );

        if (game.winner) {         // Game over, don't proceed
          game.gameOver = "true";  // weird DB index hack
          game.trickWinner = null;
        } else {
          prepareForNextDeal( game );
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
