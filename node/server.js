// Node server

var express = require('express');
var app = express();
var http = require('http').Server(app);




var Switchboard = require("switchboard"),
    Player = require("player"),
    Game = require("game");

var gameServer = new Switchboard( http );

var players = {};
var games = {};


const chatMessageEvent = "chatMessage";
const setUserNameEvent = "username";
const stateUpdateEvent = "stateUpdate";
const newGameNameEvent = "newGameName";
const joinGameEvent = "joinGame";


// FIXME: do we need the notion of a Game (set of players) to broadcast to?
function newChatMessage( player, data ) {
  console.log('message from ' + player.getName() +  ': ' + data);

  gameServer.broadcast( chatMessageEvent, {
                         user: player.name,
                         msg: data
                       });
};

function createGame( player, data ) {
  var msg = "Created a new game called " + data;
  console.log( player.name + msg );

  var game = new Game( data );
  games[game.id] = game;

  gameServer.broadcastState();
  newChatMessage( player, msg );
};

function joinGame( player, gameId ) {
  var game = games[gameId];
  var msg = "Joined " + game.name;
  console.log( player.name + msg );

  game.addPlayer( player );

  gameServer.broadcastState();
  newChatMessage( player, msg );
};

// handlers take a user and braodcast state afterwards
gameServer.addMessageHandler( chatMessageEvent, newChatMessage );
gameServer.addMessageHandler( newGameNameEvent, createGame );
gameServer.addMessageHandler( joinGameEvent, joinGame );

// gameServer.addMessageHandler( setUserNameEvent, setName );
gameServer.addMessageHandler( setUserNameEvent, Player.prototype.setName, {
                                useUserContext: true
                              } );

gameServer.onUserJoin( function() {
                         var player =  new Player();
                         players[player.id] = player;
                         return player;  // so Switchboard can hand this back to us on events
                       });
gameServer.onUserLeave( function( player ) {
                          players[player.id] = undefined;
                          console.log( player.name + " disconnected");
                        });

// WTF?
gameServer.broadcastStateFn(
  function( player ) {
    gameServer.broadcast( stateUpdateEvent, {
                            players: players,
                            games: games
                          });
  }
);




// routes for assets
app.use("/", express.static(__dirname + '/public'));

// Actions
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/update', function(req, res) {
          gameServer.broadcastState();
          res.send();
});


// start server
http.listen(3000, function(){
  console.log('listening on *:3000');
});
