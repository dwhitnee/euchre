var Game = require("game");
var Player = require("player");

describe(
  "Euchre Game",
  function() {

    beforeEach(
      function() {
        // player = new Player();
      });

    it("should create a game",
       function() {
         var game = Game.newGame({ name: "Game One", createdBy: 1002 });
         var game2 = Game.newGame({ name: "Game Two", createdBy: 1003 });

         expect( game.id ).toBe( 1001 );
         expect( game.name ).toBe("Game One");

         game = Game.getById( 1002 );
         expect( game.name ).toBe("Game Two");

         game = Game.getLobby();
         expect( game.id ).toBe( 1000 );
       });

    it("should add players",
       function() {
         var game = Game.newGame("Game One");
         var player, i, ids = [];

         for (i=0; i < 7; i++) {
           player = Player.newPlayer("Player " + (i+1));
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

         game.setDealer( 2 );
         player = game.getPlayerToLeftOfDealer();
         expect( player.name ).toBe("Player 1");

         // game.rotatePlayer();
         // expect( player.name ).toBe("Player 1");

         console.log( JSON.stringify( game ));
       });

});