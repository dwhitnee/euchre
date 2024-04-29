//----------------------------------------------------------------------
// Internal DB functions, not the API
// No HTTP here, just Dynamo. Therefore most callbacks jsut return data
// and no HTTP response stuff.
//----------------------------------------------------------------------
// Migrate to AWS SDK v3
// https://aws.amazon.com/blogs/developer/service-error-handling-modular-aws-sdk-js/
// https://thomasstep.com/blog/how-to-use-the-dynamodb-document-client
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating.html

let tableName = "EuchreGames";

// sdk v2
// let AWS = require('aws-sdk');
// let dynamoDB = new AWS.DynamoDB.DocumentClient();

// after: npx aws-sdk-js-codemod -t v2-to-v3 file.js

// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
// sdk v3
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const dynamoDB = DynamoDBDocument.from(new DynamoDBClient());


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

    dynamoDB.get( dbRequest, function( err, data ) {
      if (err) {
        console.log("DynamoDB error: " + err );
        callback( err );
      } else if (!data.Item) {  // no data returns undefined, not an object
        callback( null, {} );   // return empty object instead
      } else {
        callback( null, data.Item );
      }
    });

  /*
    // async v3 way
    try {
      const response = await dynamoDB.send( new GetCommand( dbRequest ));
      console.log(response);
      if (!response.Item) {  // no data returns undefined, not an object
        callback( null, {} );   // return empty object instead
      }
      callback( null, response.Item );  // baby steps
    }
    catch (err) {
      console.log("DynamoDB error: " + err );
      callback( err );
    }
  */

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

    dynamoDB.query( dbRequest, function( err, data ) {
      if (err) {
        console.log("DynamoDB error:" + err );
        callback( err );
      } else {
        callback( null, data.Items );  // no data is an empty list
      }
    });
  },


  //----------------------------------------
  // Some action occured, let's store the effect in DynamoDB
  // Optimistically lock on a versionId.  Fail if conflict
  //
  // Params: gameData blob
  // Params: callback( err, data )  success IFF err==null
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
    dbParams.Item.id = game.id;   // PK
    dbParams.Item.updatedDate = now.toISOString();

    // optimistic locking  TEST ME
    // Make sure version # has not been incremented since last read
    if (game.version) {
      dbParams.ConditionExpression = "version = :oldVersion";
      dbParams.ExpressionAttributeValues = {
        ":oldVersion" : game.version
      };
      game.version++;   // write new version of data
    } else {
      game.version = 1;   // first write
    }

    if (!dbParams.Item.createdDate) {
      dbParams.Item.createdDate = now.toISOString();  // can't update keys
    }

    console.log("PUT request: " +  JSON.stringify( dbParams ));

    // Put and not Update, we want to clobber old entry
    dynamoDB.put( dbParams, function( err, data ) {
      if (err) {
        console.log("DynamoDB error:" + err );
        callback( err );
      } else {
        callback( null );  // success! Nothing to report
      }
    });

  /*
    //  v3 new way
    try {
      const response = await dynamoDB.send( new PutCommand( dbParams ));
      console.log(response);
      callback( null );  // success! Nothing to report
    }
    catch (err) {
      callback( err );
    }
  */
  },

  //----------------------------------------
  // Wipe game out
  // Params: gameId
  //----------------------------------------
  deleteGame: function( gameId, callback ) {
    console.log("Permanently Deleting " + gameId );

    let dbRequest = {
      TableName : tableName,
      Key: {"id": gameId }};

    dynamoDB.delete( dbRequest, function( err, data ) {
      if (err) {
        console.log("DynamoDB error:" + err );
        callback( err );
      } else {
        callback( null );
      }
    });
  },

  // can I update IFF version = V
/*
  updateGameData: function() {
    response = dynamodb.update_item(
      TableName="euchreGames",
      Key={
        'gameId':{'S': "abdefg"}
      },
      UpdateExpression='SET version = version + :inc',
      ExpressionAttributeValues = {
        ':inc': {'N': '1'}
      },
      ReturnValues="UPDATED_NEW"
  }
*/

};
