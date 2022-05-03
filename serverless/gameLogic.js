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
// advance to next valid player. ie, skip the dummy if there is one.
//----------------------------------------
function moveToNextPlayer( game ) {
  game.playerTurn = (game.playerTurn + 1) % 4;

  if (game.playerTurn === game.dummyPlayerId) {
    moveToNextPlayer( game );
  }
}

//----------------------------------------
// If 4 cards where played, which card is highest of lead suit, unless trumped
// @return winning playerId or undefined if any card is null
//----------------------------------------
function determineTrickWinner( cardIds, leadCardId, trumpSuit, dummyPlayerId ) {
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
    if (i == dummyPlayerId) {  // no one likes the dummy
      continue;
    }

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
// If hand is over, dole out points to each team member
// Update the game stats for this hand.
// return a cute message to display.
//----------------------------------------
function assignPoints( game ) {

  // stats for this hand to put in DB and send to client
  let hand = {
    callerId: game.trumpCallerId,
    tricksTaken: game.players[game.trumpCallerId].tricks,
    isAlone: (game.dummyPlayerId != null),
    isEuchre: (game.players[game.trumpCallerId].tricks < 3),
    points: 0
  };

  if (hand.isEuchre) {
    giveTeamPoints( game, hand.callerId+1, 2);  // Euchred!
    game.message += ". Euchre!";
    hand.isEuchre = true;
  } else {
    if (hand.tricksTaken == 5) {  // sweep!
      if (hand.isAlone) {
        hand.points = 4;
        game.message += ". Solo sweep!";
      } else {
        hand.points = 2;
        game.message += ". Sweep!";
      }
    } else {
      hand.points = 1;   // simple win
    }
    giveTeamPoints( game, hand.callerId, hand.points);
  }

  if (!game.handStats) {
    game.handStats = [];   // should never get called, but old games might
  }
  game.handStats.push( hand );
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
  game.dummyPlayerId = null;
  game.playerTurn = game.dealerId;
  moveToNextPlayer( game );
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
  // same logic as joining, on the back end, just putting a name in a slot
  // But allow overriding seat
  //----------------------------------------------------------------------
  setPlayerName: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) { return; }
    if (!message.verifyParam( request, callback, "playerId")) { return; }
    if (!message.verifyParam( request, callback, "playerName")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log("Changing player name '" + params.playerName +
                  "' at spot #" + params.playerId);
      game.players[params.playerId].name = params.playerName;
        thomas.updateGame( game, function( err, response ) {
          message.respond( err, response , callback );
        });
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
      moveToNextPlayer( game );

      if (params.playerId == game.dealerId) {

        if (game.playedCardIds[game.dealerId]) {  // turn down the up card
          game.message = "Turning down the " +
            Card.fromId( game.playedCardIds[game.dealerId] ).toString();
          game.deck.push( game.playedCardIds[game.dealerId] ); //return to blind
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
    if (!message.verifyParam( request, callback, "isAlone")) { return; }

    let params = JSON.parse( request.body );

    thomas.getGameData( params.gameId, function( err, game ) {
      console.log( params.playerId + " orders it up");

      // take up-card
      let upCardId = game.playedCardIds[game.dealerId];
      game.playedCardIds[game.dealerId] = null;

      // declare trump suit
      game.trumpCallerId = parseInt( params.playerId );
      game.trumpSuit = Card.fromId( upCardId ).suit;   // id

      game.message = game.players[game.trumpCallerId].name +
        " calls " + Card.suitNames[game.trumpSuit];

      if (params.isAlone) {
        game.dummyPlayerId = (game.trumpCallerId + 2) % 4;  // caller's partner
        game.message += " ALONE";
      }

      // put card in dealer's hand
      game.players[game.dealerId].cardIds.push( upCardId );
	  game.dealerMustDiscard = true;

      // don't make dummy discard
      if (game.dummyPlayerId == game.dealerId) {
        game.dealerMustDiscard = false;
      }

      // play will start at dealer's left
      game.playerTurn = game.dealerId;
      moveToNextPlayer( game );
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
    if (!message.verifyParam( request, callback, "isAlone")) { return; }

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

      if (params.isAlone) {
        game.dummyPlayerId = (game.trumpCallerId + 2) % 4;  // caller's partner
        game.message += " ALONE";
      }

      // play will start at dealer's left
      game.playerTurn = game.dealerId;
      moveToNextPlayer( game );
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

      let cards = game.players[params.playerId].cardIds;

      if (!discarding) {
        if ((game.playedCardIds[params.playerId]) ||    // already played
            (params.playerId !== game.playerTurn) ||    // not her turn
            game.bidding)                        // not playing yet
        {
          if (cards.length != 1) {  // let players toss last card
            callback("Can't play a card now"); // doh! fail
          }
        }
      }

      // remove card from player's hand
      cards.splice( cards.indexOf(params.cardId), 1);

      if (discarding) {
        game.dealerMustDiscard = false;
        game.message = game.players[game.leadPlayerId].name + " leads";
        game.deck.push( params.cardId ); // return to blind

      } else {      // play card
        // FIXME, ensure player followed suit - can be done client side
        let leadCard = game.playedCardIds[game.leadPlayerId];
        // checkForFollowingSuit( leadCard, cardId, cards )

        // put card on table
        game.playedCardIds[params.playerId] = params.cardId;

        moveToNextPlayer( game );

        let winner = determineTrickWinner(
          game.playedCardIds, game.leadPlayerId, game.trumpSuit,
          game.dummyPlayerId);

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
      // check callers hand because others might be the dummy hand
      if (game.players[game.trumpCallerId].cardIds.length == 0) {

        assignPoints( game );      // update stats, too
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

};
