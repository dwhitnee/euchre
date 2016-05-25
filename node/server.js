// Node server

var express = require('express');
var app = express();
var http = require('http').Server(app);

var bodyParser = require('body-parser');
app.use(bodyParser.json());  // parse application/json  LAME!

var euchreRouter = require('requestHandlers/gameResponses');

var Switchboard = require("switchboard"),
    Player = require("player"),
    Game = require("game");

var AuthRequestHandlers = require("requestHandlers/auth");
require("requestHandlers/game");


var socketManager = new Switchboard( http );  // manages communications to/from players

Game.setSwitchboard( socketManager );

// Add new player to Lobby and tell everyone
socketManager.onUserJoin( function( user ) {
                            var player = Player.getById( user.id );
                            Game.getLobby().addPlayer( player );
                            Game.getLobby().sendLobbyState();
                            Game.getLobby().sendChat("[Joined]", player );
                          }
                        );

// player lost connection, remove from game and update state
socketManager.onUserLeave( function( user ) {
                             var player = Player.getById( user.id );
                             var game = Game.getById( player.getGameId() );
                             if (game) {
                               game.sendChat("[Lost connection]", player );
                               game.removePlayer( player );
                               game.sendState();
                             } else {
                               Game.getLobby().sendChat("[Lost connection]", player );
                               Game.getLobby().sendLobbyState();
                             }
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
