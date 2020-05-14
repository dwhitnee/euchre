//----------------------------------------------------------------------
//  AWS Lambda API -- Game logic stuff

// Race conditions galore:  we have to load an existing game, modify
// it, and stuff it back in.

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
//----------------------------------------
function assignPoints( game ) {
  let message;
  if (game.players[game.trumpCallerId].tricks < 3) {
    giveTeamPoints( game, game.trumpCallerId+1, 2);  // Euchred!
    game.message += ". Euchre!";
  } else {
    if (game.players[game.trumpCallerId].tricks == 5) {  // sweep!
      if (game.goingAlone) {
        giveTeamPoints( game, game.trumpCallerId, 4);
        game.message += " Solo sweep!";
      } else {
        giveTeamPoints( game, game.trumpCallerId, 2);
        game.message += " Sweep!";
      }
    } else {
      giveTeamPoints( game, game.trumpCallerId, 1);
      game.players[game.trumpCallerId].score += 1;    // simple win
    }
  }
};


// check if anyone has 10 points
function checkGameOver( game ) {
  for (let i=0; i<4; i++) {
    if (game.players[i].score >= 10) {
      game.winner = i;
    }
  }
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
        game.players[i].tricks = 0;
        hand.forEach( card => { game.players[i].cardIds.push( card.id ); });
      }
      // turn card face up for dealer
      game.playedCardIds[game.dealerId] = deck.pop().id;

      // what's left;
      game.deck = [];
      deck.forEach( card => { game.deck.push( card.id ); });

      game.cardsDealt = true;
      game.bidding = true;

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

    // FIXME, people can steal seats, prevent seat from being stolen
    // (as opposed to setPlayerName)  Or is this a feature if someone
    // change their mind? (would need to flush client side name/seat mapping)

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

      } else {      // play card
        // FIXME, ensure player followed suit - can be done client side
        let leadCard = game.playedCardIds[game.leadPlayerId];
        // checkForFollowingSuit( leadCard, cardId, cards )

        // put card on table
        game.playedCardIds[params.playerId] = params.cardId;

        // next player's turn
        game.playerTurn = (game.playerTurn + 1) % 4;

        let winner = determineTrickWinner( game.playedCardIds, game.trumpSuit );
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

      // update team's count
      let teammate = (game.trickWinner + 2) % 4;
      game.players[game.trickWinner].tricks =
        game.players[game.trickWinner].tricks + 1;
      game.players[teammate].tricks =
        game.players[teammate].tricks + 1;

      // if all the cards are played, see who won and start next round
      if (game.players[0].cardIds.length == 0) {
        assignPoints( game );   // FIXME - how to notify client of round result?

        // setup next deal
        game.dealerId = (game.dealerId + 1) %4;
        game.playerTurn = (game.dealerId + 1) % 4;
        game.cardsDealt = false;
        game.trumpCallerId = null;
        game.trumpSuit = null;

        checkGameOver( game );
        if (game.winner) {
          // I guess that's it, the rest is client side
          game.gameOver = "true";  // weird DB index hack
        }
      }

      if (!game.winner) {
        // clear table and start next hand,
        // lead and turn was assigned in playCard or above in next deal
        game.playedCardIds = [ null,null,null,null ];
        game.trickWinner = null;
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
