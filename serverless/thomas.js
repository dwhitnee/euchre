//----------------------------------------------------------------------
// Weird global layer between HTTP calls, game logic, and DB
// Really just thin layer over DB (private GET/PUT for game data)
// This could be async/await, but we'll stick to the stupid node convention of
// callback( err, data );
//----------------------------------------------------------------------

// All the Dynamo stuff
let euchreDB = require('euchreDB');

module.exports = {
  //----------------------------------------------------------------------
  // Async, retrieve a single game record from DB and invoke callback
  // This is intended to be called internally
  //----------------------------------------------------------------------
  getGameData: function( gameId, callback ) {
    euchreDB.getGameData( gameId, function( err, game ) {
      console.log("Retrieved game: " + JSON.stringify( game ));
      callback( err, game );  // forkin node, why not async here?
    });
  },

  //----------------------------------------------------------------------
  // Update game state in DB.
  // @param game
  // @return nothing
  //----------------------------------------------------------------------
  updateGame: function( game, callback ) {
    console.log("Updating game to : " + JSON.stringify( game ));

    euchreDB.saveGameData( game, function( err, response ) {
      callback( err, response );  // forkin node, why not async here?
    });
  },

};
