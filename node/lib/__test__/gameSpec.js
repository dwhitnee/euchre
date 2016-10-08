/* global describe it beforeEach expect */


var Game = require("game");
var Player = require("player");
var SocketMock = require('socket-io-mock');

var Switchboard = require("switchboard");
var mockSocketIO = new SocketMock();
Switchboard.prototype.connectSocket = function() {
  return mockSocketIO;
};

describe(
  "Euchre Game",
  function() {
    var operator;

    beforeEach(
      function() {
        operator = new Switchboard();  // manages communications to/from players
        Game.setSwitchboard( operator );
      });

    it("should create a game",
       function() {
         let game  = Game.newGame({ name: "Game One", createdBy: 1002 });
         let game2 = Game.newGame({ name: "Game Two", createdBy: 1003 });

         expect( game.id ).toBe( 1001 );
         expect( game.name ).toBe("Game One");

         game = Game.getById( 1002 );
         expect( game.name ).toBe("Game Two");

         game = Game.getLobby();
         expect( game.id ).toBe( 1000 );
       });

    it("should add players",
       function() {
         let game = Game.newGame({ name: "Game On"});

         var player, i, ids = [];

         for (i=0; i < 7; i++) {
           player = Player.newPlayer("Player " + (i+1));

           // fake client connecting to us
           // how do we fake incoming messages from a client?

           // mockSocketIO.emit("connection");
           // mockSocketIO.emit( Switchboard.onNewUserEvent, player );
           mockSocketIO.id = 9000 +i;
           operator.associateUserData( mockSocketIO, player );

           game.addPlayer( player );
           ids.push( player.id );
         }

         expect( Object.keys( game.players ).length ).toBe( 7 );
         game.removePlayer( Player.getById( 105 ));

         var count = 0;
         Object.keys( game.players ).forEach(
           function( id ) {
             if (game.players[id]) count++;
           });
         expect( count ).toBe( 6 );

         for (i=0; i < 4; i++) {
           game.pickSeat( Player.getById( ids[i] ), 3-i);
         }

         game.dealerSeat = 2;
         game.setActivePlayerToLeftOfDealer();
         player = game.getActivePlayer();
         expect( player.name ).toBe("Player 1");

         // game.rotatePlayer();
         // expect( player.name ).toBe("Player 1");

         console.log( JSON.stringify( game, null, 2 ));
       });

    it("should deal cards to players",
       function() {
         var player, i, id;

         let game = Game.newGame({ name: "Game Off"});

         for (i=0; i < 4; i++) {
           player = Player.newPlayer("Player " + (i+1));

           mockSocketIO.id = 9000 +i;
           operator.associateUserData( mockSocketIO, player );

           game.addPlayer( player );
           game.pickSeat( player, 3-i);
           game.pickACard( player );
         }

         for ( id in game.players ) {
           expect( game.players[id].cards.length ).toBe( 1 );
         }

         // console.log( JSON.stringify( game.seats, null, 2 ));
         game.chooseDealer();

         game.dumpPlayerCards();
         for ( id in game.players ) {
           expect( game.players[id].cards.length ).toBe( 0 );
         }

         game.start();
         // console.log( JSON.stringify( game.players, null, 2 ));

         for ( id in game.players ) {
           expect( game.players[id].cards.length ).toBe( 5 );
         }

       });



});
