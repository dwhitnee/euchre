//----------------------------------------
//  Functions to be uploaded to the cloud (AWS Lambda and API Gateway)
//  All code related to HTTP requests here.
//----------------------------------------

'use strict';

// All Dynamo stuff
let euchreDB = require('euchreDB');

// HTTP response for a successful call
let successResponse = {
  body: "RESPONSE GOES HERE - REPLACE ME",
  statusCode: 200,
  headers: {  // Allow any web page to call us (CORS support)
    "Access-Control-Allow-Origin": "*"
    // Access-Control-Allow-Credentials': true // only for auth/cookies
  }
};

// There is a bug/"feauture" in API Gateway that swallows these errors
let errorResponse = {
  error: { messageString: "huh? ATTACH REAL ERROR HERE" },
  messageString: "Doh! There was an error in the request OR MAYBE HERE"
};


//----------------------------------------
// check for required params, abort if not r=there
//----------------------------------------
function verifyQuery( request, callback, param ) {
  let query = request.queryStringParameters;   // GET

  if (!query) {    // POST
    try {
      query = JSON.parse( request.body );
    } catch (e) {
      console.error( e.message + ":'" + request.body +"'" );
    }
  }

  if (!query || (param && !query[param])) {
    let errorMsg = "bad request/missing param: " + param;
    console.error( errorMsg );
    console.error( JSON.stringify( request ));

    // attach error message to response? I think it's just a 400 error
    callback( null, errorResponse );
    return false;
  }
  return true;
}

//----------------------------------------------------------------------
// Take this data and shove it, back to the AWS user who requested it.
//----------------------------------------------------------------------
function respondWithSuccess( data, callback ) {
  let response = successResponse;
  response.body = JSON.stringify( data );  // prettify for transit

  // This can be inspected in firebug, but we really don't need it otherwise
  // response.body = JSON.stringify({
  //   gameId: postData.gameId,
  //   playerId: postData.playerId,
  //   gameData: game,
  //   debug: request
  // });

  console.log( response.body );
  callback( null, response );
}

//----------------------------------------------------------------------
// AWS response boilerplate - 200, CORS, etc...
//----------------------------------------------------------------------
function respond( err, data, callback ) {
  if (err) {
    callback( err );
  } else {
    respondWithSuccess( data, callback );
  }
}

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
  getGameData: function( request, context, callback ) {
    let query = request.queryStringParameters;

    if (!verifyQuery( request, callback, "gameId")) {
      return;
    }

    euchreDB.getGameData( query.gameId, function( err, game ) {
      respond( err, game, callback );
    });
  },

  //----------------------------------------------------------------------
  // Async, retrieve a single game record from DB and invoke callback
  // This is intended to be called internally
  //----------------------------------------------------------------------
  getGameList: function( request, context, callback ) {
    euchreDB.getGameList( function( err, games ) {
      respond( err, games, callback );
    });
  },


  //----------------------------------------------------------------------
  // sanitize data for a particular player's view (ie, don't show other cards)
  //----------------------------------------------------------------------
  getGameDataForPlayer: function( request, context, callback )
  // gameId, playerId, callback )
  {
    let query = request.queryStringParameters;

    if (!verifyQuery( request, callback, "gameId") ||
        !verifyQuery( request, callback, "playerId")) {
      return;
    }

    euchreDB.getGameData( query.gameId, function( err, game ) {
      if (!err) {
        // post process gameData to remove face down cards
        game.deck = [];
        for (var i=0; i < 4; i++) {
          if (i != query.playerId) {
            game.players[i].cardIds= [];
          }
        }
        respond( err, game, callback );
      }
    });
  },

  //----------------------------------------------------------------------
  // Create new game state with given playerName as Player One
  // @param playerName
  // @return newly created gameId and playerId
  //----------------------------------------------------------------------
  createNewGame: function( request, context, callback ) {

    if (!verifyQuery( request, callback, "playerName")) {
      return;
    }

    let postData = JSON.parse( request.body );

    let timeSinceEpoch = Math.round(
      ((new Date()).getTime() - new Date("2020-05-01").getTime()) / 1000);

    // gameId is first player name (w/o spaces/specials) plus 2020 epoch seconds
    let newGameId = postData.playerName.replace(/\W/g,'').slice(0,8) +
        "-" + timeSinceEpoch;

    let newGame = {
      id: newGameId,                            // PK
      createdDate: (new Date()).toISOString(),  // Range Key
      gameOver: "false",   // Dynamo hack: indexes can't be BOOL
      dealerId: 0,
      trumpCallerId: undefined,
      trumpSuit: undefined,
      goingAlone: false,
      leadPlayerId: undefined,
      deck: [],
      playedCardIds: [],
      players: [
        {
          name: postData.playerName,
          score: 0,
          tricks: 0,
          pickItUp: false,
          cardIds: [],
        },
        {},   // empty player slots
        {},
        {}
      ]
    };

    // Tell DB to put the data, respond to AWS call here.
    euchreDB.saveGameData( newGame, function( err, data ) {
      let response = {
        gameId: newGameId,
        playerId: 0    // game creator is always first player
      };
      respond( err, response , callback );
    });
  },


  //----------------------------------------------------------------------
  // return gameId, can we do that with a POST?
  // @param game
  // @return nothing
  //----------------------------------------------------------------------
  updateGame: function( request, context, callback ) {
    if (!verifyQuery( request, callback, "game")) {
      return;
    }
    let data = JSON.parse( request.body );

    // Tell DB to put the data, respond to AWS call here.
    euchreDB.saveGameData( data.game, function( err, response ) {
      respond( err, response , callback );
    });
  },

};
