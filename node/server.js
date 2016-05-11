// Node server

var express = require('express');
var app = express();
var http = require('http').Server(app);




var Switchboard = require("switchboard"),
    Player = require("player");

var gameServer = new Switchboard( http );

var players = {};

const chatMessageEvent = "chatMessage";
const setUserNameEvent = "username";
const stateUpdateEvent = "stateUpdate";



function newChatMessage( player, data ) {
  console.log('message from ' + player.getName() +  ': ' + data);

  gameServer.broadcast( chatMessageEvent, {
                         user: player.name,
                         msg: data
                       });
};

function setName( player, data ) {
  player.setName( data );
  gameServer.broadcast( chatMessageEvent,
                       { user: "admin", msg: player.getName() + " joined"});
};



// handlers take a user and braodcast state afterwards
gameServer.addMessageHandler( chatMessageEvent, newChatMessage );
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
    gameServer.broadcast( stateUpdateEvent, { players: players });
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
