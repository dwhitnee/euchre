// Node server

var express = require('express');
var app = express();
var http = require('http').Server(app);

var bodyParser = require('body-parser');
app.use(bodyParser.json());  // parse application/json  LAME!

var euchreRouter = require('requestHandlers/gameResponses');


const LOBBY_NAME = "Lobby";
const GAME_PREFIX = "Game";


var Switchboard = require("switchboard"),
    Player = require("player"),
    Game = require("game");

var AuthRequestHandlers = require("requestHandlers/auth");
require("requestHandlers/game");


var gameServer = new Switchboard( http );  // manages communications to/from players

gameServer.createRoom( LOBBY, { default: true });



/**
 * Create data structure, add Creator to game, tell Lobby about new Game
 */
function createGame( player, data ) {
  var msg = "Created a new game called " + data;
  console.log( player.name + msg );

  // check name uniqueness?  TBD, on client currently which is stupid(?)
  var game = new Game( data );
  games[game.id] = game;
  gameNames[data] = game.id;

  game.addPlayer( player );

  gameServer.broadcastUpdateToRoom( );
  newChatMessage( player, msg );
};


// THE BIG PROBLEM, associating a PLayer object with it's socket group
function newPlayer() {
  switchboard.associateUserData( socket, user );
}


/**
 * UserConnects (added to Lobby)
 * ChatMessage (sent to current room)
 * CreateGame
 * DisbandGame
 * JoinGame
 *
 * Fundamental problem is associating sockets and Players, ioRooms and Games
 */

gameServer.addMessageHandler( newPlayerEvent, newPlayer );

// gameServer.onUserJoin( function() {
//                          var player =  new Player();
//                          players[player.id] = player;
//                          return player;  // so Switchboard can hand this back to us on events
//                        });
gameServer.onUserLeave( function( player ) {
                          players[player.id] = undefined;
                          console.log( player.name + " disconnected");
                        });



// assets and route handlers
app.use("/", express.static(__dirname + '/public'));
app.use('/game', euchreRouter);

app.post('/login', AuthHandler.login );

// Single page app
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});


// start server
http.listen(3000, function(){
  console.log('listening on *:3000');
});
