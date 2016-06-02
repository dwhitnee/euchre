/**
 * Handle /login from new user.  Find the in the UserPool (in this case PlayerFactory)
 *
 */

var Player = require("player");
var Game = require("game" );  // just for the Lobby


var AuthRequestHandler = {

  /**
   * Take a username (no password) and return a user object with ID to
   * be passed to later requests
   *
   * req = { name: "Johnny Guitar" }
   * resp = { player: { name: "Johnny Guitar", id: 123 }
   */
  login: function(request, response) {

    console.log( JSON.stringify( request.body ));

    var name =  request.body.name;

    if (name) {
      // Create new, or re-attach to existing player
      var player = Player.getByName( name ) || Player.newPlayer( name );

      // TF? Who's calling write() before here? "Error: Can't set headers after they are sent."
      // response.writeHead(200, {"Content-Type": "application/json"});

      response.setHeader("Content-Type", "application/json");
      response.status( 200 );

      response.json({ player: player });

      // tell the world about new player
      Game.getLobby().addPlayer( player );
      Game.getLobby().sendState();

    } else {
      response.writeHead( 400, {"Content-Type": "application/json"});
      response.json({ error: "Missing name" });
    }
    response.end();
  }
};

module.exports =  AuthRequestHandler;
