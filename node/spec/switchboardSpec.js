
// var mockSocketIO = require('socket-io-mock');

var Switchboard = require("switchboard");

// FIXME - mock socket.io
var operator = new Switchboard();  // manages communications to/from players

describe(
  "Switchboard",
  function() {

    var switchboard;

    beforeEach(
      function() {
        switchboard = new switchboard();
      });

    it("should foo",
       function() {
         //var game = Game.newGame("Game One");

//         expect( game.id ).toBe( 1 );
       });
    }
);
