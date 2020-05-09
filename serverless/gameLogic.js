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
      game.deck = ["1:0","1:1","1:2","1:3"];  // blind

      for (var i=0; i < 4; i++) {
        game.players[i].cardIds = ["12:"+i,"9:"+i,"10:"+i,"11:"+i, "13:"+i];
      }

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
