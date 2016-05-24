/**
 * Handle all routes related to Game actions
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

    // So Game needs a multicast room
    var game = Game.findGameForPlayerId( player.id );
    game.sendChat( msg, player );

    // switchboard.multicast( room, messageType, msg );

    // find room player is in and broadcast message to it
    // gameServer.broadcast( chatMessageEvent, {
    //                         user: player.name,
    //                         msg: data
    //                       });


  },

  // post body is gameId
  join: function(request, response) {
    var gameId = request.body;
    var player = request.player;

    var game = Game.findGameById( gameId );

    if (game) {
      game.addPlayer( request.player );
    } else {
      response.json({ error: "No such game " + gameId });
    }

    response.end();
    game.sendState();
  },

  pickSeat: function( request, response ) {
    game.pickSeat(...);

    response.end();
    game.sendState();
  },

  /**
   * post body is game name
   */
  create: function(request, response) {
    var name = request.body;
    var player = request.player;

    var game = Game.newGame({ name: name, createdBy: player.id });

    // Global Update (Lobby) FIXME

    response.end();
  },

  start: function(request, response) {
    var gameId = request.body;
    var game = Game.findById( gameId );
    game.start();

    response.end();
    game.sendState();
  },

  // pass or choose a trump suit
  bid: function(request, response) {

    response.end();
    game.sendState();
  },

  // lead or follow
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
router.post('/join',   Handlers.join );
router.post('/bid',    Handler.bid );
router.post('/playcard', Handlers.playCard );



// define the home page route?
gameRouter.get('/', function(req, res) {
  res.send('Birds home page');
});

module.exports = gameRouter;
