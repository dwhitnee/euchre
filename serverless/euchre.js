//----------------------------------------
//  AWS Lambda Functions to be uploaded.  These are the public API.
//  All code related to HTTP requests here.
//----------------------------------------

'use strict';

let euchreDB = require('euchreDB');  // All the Dynamo stuff
let thomas = require('thomas');   // Thomas is our private middleware
let message = require('responseHandler');  // HTTP message handling

//----------------------------------------
//----------------------------------------
// API server functions go here
// function names must be placed in serverless.yml to get wired up
//----------------------------------------
//----------------------------------------

module.exports = {
  //----------------------------------------
  // @param request -  info about the call (URL params, caller, etc)
  // @param context -  info about AWS (generally uninteresting)
  // @param callback - function to invoke when we are done
  //----------------------------------------

  //----------------------------------------------------------------------
  // Async, retrieve a single game record from DB and invoke callback
  // This is intended to be called internally
  //----------------------------------------------------------------------
  getGameList: function( request, context, callback ) {
    euchreDB.getGameList( function( err, games ) {
      message.respond( err, games, callback );
    });
  },


  //----------------------------------------------------------------------
  // sanitize data for a particular player's view (ie, don't show other cards)
  //----------------------------------------------------------------------
  getGameDataForPlayer: function( request, context, callback )
  // gameId, playerId, callback )
  {
    let query = request.queryStringParameters;

    if (!message.verifyParam( request, callback, "gameId") ||
        !message.verifyParam( request, callback, "playerId")) {
      return;
    }

    euchreDB.getGameData( query.gameId, function( err, game ) {
      if (!err) {
        // post process gameData to remove face down cards
        game.deck = [];  // card up is considered "played", blind is invisible
        for (var i=0; i < 4; i++) {
          if (i != query.playerId) {
            game.players[i].cardIds= [];
          }
        }
        message.respond( err, game, callback );
      }
    });
  },

  //----------------------------------------------------------------------
  // Create new game state with given playerName as Player One
  // @param playerName
  // @return newly created gameId and playerId
  //----------------------------------------------------------------------
  createNewGame: function( request, context, callback ) {

    if (!message.verifyParam( request, callback, "playerName")) {
      return;
    }

    let postData = JSON.parse( request.body );

    let timeSinceEpoch = Math.round(
      ((new Date()).getTime() - new Date("2020-05-01").getTime()) / 1000);

    // gameId is first player name (w/o spaces/specials) plus 2020 epoch seconds
    let newGameId = postData.playerName.replace(/\W/g,'').slice(0,12) +
        "-" + timeSinceEpoch;

    let newGame = {

      // fixed data
      id: newGameId,                            // PK
      createdDate: (new Date()).toISOString(),  // Range Key
      dealerId: 0,                // randomize this  FIXME
      trumpCallerId: undefined,   // who needs to take all the tricks
      trumpSuit: undefined,
      goingAlone: false,

      // dynamic data
      gameOver: "false",   // Dynamo hack: indexes can't be BOOL
      bidding: true,   // we're either bidding or playing tricks
      leadPlayerId: undefined,
      cardsDealt: false,
      deck: [],
      playedCardIds: [],
      players: []
    };

    // always start to the left of the dealer
    newGame.playerTurn = (newGame.dealerId + 1) % 4;

    for (var i=0; i < 4; i++) {
      newGame.players[i] = {
//         name: undefined,    FIXME, just for testing
        name: "Player " + i,
        score: 0,
        tricks: 0,
        pickItUp: false,
        cardIds: [],
      };
    }

    newGame.players[0].name = postData.playerName;

    // Tell DB to put the data, respond to AWS call here.
    thomas.updateGame( newGame, function( err, data ) {
      let response = {
        gameId: newGameId,
        playerId: 0    // game creator is always first player
      };
      message.respond( err, response , callback );
    });
  },


  //----------------------------------------------------------------------
  // Update game state in DB
  // @param game
  // @return nothing
  //----------------------------------------------------------------------
  updateGame: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "game")) {
      return;
    }
    let data = JSON.parse( request.body );
    thomas.updateGame( data.game, function( err, response ) {
      message.respond( err, response , callback );
    });
  },

  //----------------------------------------------------------------------
  // Wipe game out
  // @param gameId
  // @return nothing
  //----------------------------------------------------------------------
  deleteGame: function( request, context, callback ) {
    if (!message.verifyParam( request, callback, "gameId")) {
      return;
    }
    let params = JSON.parse( request.body );

    // Tell DB to put the data, respond to AWS call here.
    euchreDB.deleteGame( params.gameId, function( err, response ) {
      message.respond( err, response , callback );
    });
  }
};
