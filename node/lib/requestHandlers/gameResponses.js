/**
 * Handle all routes related to Game actions
 * When state changes send updates (via websocket) to all interested parties.
 *
 */

var express = require('express');
var gameRouter = express.Router();


var Filters = {
  timeLogFilter: function(request, response, next) {
    console.log('Filter Time: ', Date.now());
    next();
  },

  // pull user info out of Header
  auth: function(request, response, next) {
    var playerId =  request.headers['x-userid'];     // this should be more auth-y FIXME
    request.player = Players.getPlayerById( playerId );

    next();
  }
};

var Handlers = {
  /**
   * Receive message to broadcast to Player's room
   * Null response
   */
  chat: function(request, response) {
    var msg = request.body;
    var player = request.player;

    response.end();  // acknowledge request

    console.log('message from ' + player.getName() +  ': ' + msg);

    var game = Game.getByPlayerId( player.id );

    if (game) {
      game.sendChat( msg, player );
    } else {
      Game.getLobby().sendChat( msg, player );
    }
  },

  /**
   * Player (left Lobby and) joined a game but hasn't sat down, tell Lobby and new room.
   *  post body is gameId
   */
  join: function(request, response) {
    var gameId = request.body;
    var player = request.player;

    var game = Game.getById( gameId );

    if (game) {
      game.addPlayer( request.player );
    } else {
      response.json({ error: "No such game " + gameId });
    }

    response.end();

    // notify player joined game
    game.sendState();
    game.sendChat("[Joined as spectator]", player );

    // notify player left lobby
    Game.getLobby().sendLobbyState();
    Game.getLobby().sendChat("Joined " + game.name, player );
  },

  /**
   * Player left his game and rejoined Lobby, tell both rooms about it
   */
  leave: function(request, response) {
    var player = request.player;
    var oldGame;

    if (player.getGameId()) {
      oldGame = Game.getById( player.getGameId() );
    }

    Game.getLobby().addPlayer( player );
    response.end();

    // notify player left game
    if (oldGame) {
      oldGame.sendState();
      oldGame.sendChat("[Left game]", player );
    }

    // notify player joined lobby
    Game.getLobby().sendLobbyState();
    Game.getLobby().sendChat("Returned", player );
  },


  /**
   * Have a player sit down, tell players about it
   * seatId is 0-3 (NESW)
   * body: { gameId: 103, seatId: 2 }
   */
  pickSeat: function( request, response ) {
    var player = request.player;
    var data = request.body;

    var game = Game.getById( data.gameId );

    game.pickSeat( player, data.seatId );

    response.end();
    game.sendState();
  },

  /**
   * Create a new game, tell Lobby about it
   * @param  post body is game name
   */
  create: function(request, response) {
    var name = request.body;
    var player = request.player;

    var game = Game.newGame({ name: name, createdBy: player.id });
    response.json( game );
    response.end();

    Game.getLobby().sendLobbyState();
    Game.getLobby().sendChat("Created new game: " + name, player );
  },

  /**
   * Delete a game, tell Lobby about it
   * @param  post body is game id
   */
  delete: function(request, response) {
    var gameId = request.body;
    var player = request.player;
    var game = Game.getById( gameId );
    game.delete();
    response.end();

    Game.getLobby().sendLobbyState();
    Game.getLobby().sendChat("Deleted game: " + game.name, player );
  },

  /**
   * Start a game, ask first player to bid and tell Players about it
   * @param  post body is game id
   */
  start: function(request, response) {
    var gameId = request.body;
    var game = Game.findById( gameId );
    game.start();

    response.end();
    game.sendState();
  },

  /**
   * pass or choose a trump suit, move to next action and tell players about it.
   * @param  TBD
   */
  bid: function(request, response) {

    response.end();
    game.sendState();
  },


  /**
   * lead or follow, move to next action and tell players about it.
   * @param  TBD
   */
  playCard: function(request, response) {

    response.end();
    game.sendState();
  }

};

// Run on all requests to this path
gameRouter.use( Filters.timeLog );
gameRouter.use( Filters.auth );

// routes
router.post('/chat',   Handlers.chat );
router.post('/create', Handlers.create );
router.post('/delete', Handlers.delete );
router.post('/join',   Handlers.join );
router.post('/leave',   Handlers.leave );
router.post('/pickSeat', Handlers.pickSeat );
router.post('/bid',    Handler.bid );
router.post('/playcard', Handlers.playCard );



// define the home page route?
gameRouter.get('/', function(req, res) {
  res.send('Birds home page');
});

module.exports = gameRouter;
