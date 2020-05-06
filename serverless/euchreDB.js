//----------------------------------------------------------------------
// Internal DB functions, not the API
// No HTTP here, just Dynamo. Therefore most callbacks jsut return data
// and no HTTP response stuff.
//----------------------------------------------------------------------

let tableName = "EuchreGames";

module.exports = {

  //----------------------------------------------------------------------
  // Async, retrieve a single game record from DB and invoke callback
  // This is intended to be called internally
  // Params: gameId and callback( error, gameData )
  //----------------------------------------------------------------------
  getGameData: function( gameId, callback ) {

    console.log("Getting game data for " + gameId );

    let dbRequest = {
      TableName : tableName,
      Key: {"id": gameId }};

    // KeyConditions

    console.log( dbRequest );

    let AWS = require('aws-sdk');
    let dynamoDB = new AWS.DynamoDB.DocumentClient();

    dynamoDB.get( dbRequest, function( err, data ) {
      if (err) {
        console.log("DynamoDB error:" + err );
        callback( err );
      } else {
        callback( null, data.Item );
      }
    });
  },

  //----------------------------------------------------------------------
  // return all gameIds for the last 24 hours
  //  (optional: &day="Thu Jan 18 2018")
  // Params: callback( err, gameList )
  //----------------------------------------------------------------------
  getGameList: function( callback ) {

    let someTime = new Date();
    someTime.setDate( someTime.getDate()-1);
    let yesterday = someTime.toISOString();   // "2020-05-05T09:46:26.500Z"

    // SQL equivalent: "SELECT * from Games WHERE createdDate> "Thu Jan 18 2018"

    // The Index allows us to do this "where" clause.
    // Since this is "NoSQL" this query is impossible without this
    // Index configured on the table ahead of time.

    // The alternative is to scan() all Games and only show the days we want.
    // Or put a secondary/sort index on "day".

    // :values represent variables, without colon is key name (unless reserved)

    let dbRequest = {
      TableName : tableName,
      IndexName: "createdDate-index",
      KeyConditionExpression: "gameOver = :f and createdDate > :yesterday",
      ExpressionAttributeValues: {
        ":yesterday": yesterday,       // "2020-05-04T09:46:26.500Z"
        ":f": "false"
      }
    };

    console.log( dbRequest );

    let AWS = require('aws-sdk');
    let dynamoDB = new AWS.DynamoDB.DocumentClient();

    dynamoDB.query( dbRequest, function( err, data ) {
      if (err) {
        console.log("DynamoDB error:" + err );
        callback( err );
      } else {
        callback( null, data.Items );
      }
    });
  },


  //----------------------------------------
  // Some action occured, let's store the effect in DynamoDB
  // Params: gameData blob
  // Params: request and callback from original user action
  //----------------------------------------
  saveGameData: function( game, callback ) {
    let now = new Date();

    //----------------------------------------
    // Create storage record, add timestamp (add sourceIp?)
    //----------------------------------------
    let dbParams = {
      TableName : tableName,
      Item: game
    };
    dbParams.Item.id = game.id;   // PK, createdDate is Range Key
    dbParams.Item.createdDate = now.toISOString(),

    console.log( JSON.stringify( dbParams ));

    let AWS = require('aws-sdk');
    let dynamoDB = new AWS.DynamoDB.DocumentClient();

    dynamoDB.put( dbParams, function( err, data ) {
      if (err) {
        console.log("DynamoDB error:" + err );
        callback( err );
      } else {
        callback( null );  // success! Nothing to report
      }
    });
  }
};
