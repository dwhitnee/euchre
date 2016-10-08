/*global describe beforeEach it expect */

var Game = require("game");

var Switchboard = require("switchboard");
Switchboard.prototype.connectSocket = function() {
  var SocketMock = require('socket-io-mock');
  return new SocketMock();
};

describe(
  "Switchboard",
  function() {

    beforeEach(
      function() {
        var operator = new Switchboard();  // manages communications to/from players
        Game.setSwitchboard( operator );
      });

    it("should foo",
       function() {
         // var game = Game.newGame("Game One");

//         expect( game.id ).toBe( 1 );
       });
    }
);
