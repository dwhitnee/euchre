/**
 * Hook up the httpServer and the web socket manager
 */

var Game = require("game"),
    Player = require("player"),
    Switchboard = require("switchboard");

var socketInit = {
  attach: function initSockets( httpServer ) {

    var socketManager = new Switchboard( httpServer ); // manages communications to/from players

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
    socketManager.onUserLeave(
      function( user ) {

        if (!user || !user.id) {
          console.log("socket disconnect from unknown user");
          return;
        }

        var player = Player.getById( user.id );
        if (!player) {
          console.log("socket disconnect from user " + user.id + " but not in Player DB");
        }

        var game = Game.getById( player.getGameId() );
        if (!game) {
          Game.getLobby().sendChat("[Lost connection]", player );
          Game.getLobby().sendLobbyState();
        } else {
          game.sendChat("[Lost connection]", player );
          game.removePlayer( player );
          game.sendState();
        }
      }
    );
  }
};

module.exports = socketInit;
