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
gameServer.createRoom( GAME+"01");


var games = {};
var gameNames = {};

// import these shared with client?  NOPE, see euchreRouter
const chatMessageEvent = "chatMessage";
const newGameNameEvent = "newGameName";
const joinGameEvent = "joinGame";

const lobbyStateUpdateEvent = "lobbyStateUpdate";
const gameStateUpdateEvent  = "gameStateUpdate";




// FIXME: we need the notion of a Game (set of players) to broadcast to
function newChatMessage( player, data ) {
  console.log('message from ' + player.getName() +  ': ' + data);

  // lobby.broadcast( ...
  gameServer.broadcast( chatMessageEvent, {
                         user: player.name,
                         msg: data
                       });
};


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

function joinGame( player, gameId ) {
  var game = games[gameId];
  var msg = "Joined " + game.name;
  console.log( player.name + msg );

  if (player.isInAGame()) {
    games[player.gameId].removePlayer( player );
  }

  // player.joinGame( game );  // both needed?
  game.addPlayer( player );

  gameServer.broadcastState();

  newChatMessage( player, msg );
};



/**
 * UserConnects (added to Lobby)
 * ChatMessage (sent to current room)
 * CreateGame
 * DisbandGame
 * JoinGame
 *
 * Fundamental problem is associating sockets and Players, ioRooms and Games
 */

// handlers take a user and braodcast state afterwards
// These are ridiculous, they should be POSTs

gameServer.addMessageHandler( chatMessageEvent, newChatMessage );
gameServer.addMessageHandler( newGameNameEvent, createGame );
gameServer.addMessageHandler( joinGameEvent, joinGame );
gameServer.addMessageHandler( newPlayerEvent, newPlayer );

// gameServer.addMessageHandler( setUserNameEvent, Player.prototype.setPlayer, {
//                                 useUserContext: true
//                               } );


// gameServer.onUserJoin( function() {
//                          var player =  new Player();
//                          players[player.id] = player;
//                          return player;  // so Switchboard can hand this back to us on events
//                        });
gameServer.onUserLeave( function( player ) {
                          players[player.id] = undefined;
                          console.log( player.name + " disconnected");
                        });


//
function updateState( broadcastFn ) {
  console.log("Updating room");
  broadcasFn( lobbyStateUpdate, {
                players: players,
                games: games,
                gameNames: gameNames
              });
};

// WTF?  We need several types of these  FIXME
gameServer.setBroadcastStateFn(
  function( player ) {
    gameServer.broadcast( lobbyStateUpdateEvent, {
                            players: players,
                            games: games,
                            gameNames: gameNames
                          });
  }
);




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
