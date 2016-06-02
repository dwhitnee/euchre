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
  }
};

module.exports = socketInit;
