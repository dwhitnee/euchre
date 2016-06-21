/*global $ */

const WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS";
const READY_TO_START = "READY_TO_START";
const CHOOSE_DEALER = "CHOOSE_DEALER";

const PICK_UP_TRUMP = "PICK_UP_TRUMP";  // first round of bidding
const DECLARE_TRUMP = "DECLARE_TRUMP";  // second round of bidding

const DISCARD = "DISCARD";
const PLAY = "PLAY";


var GameDisplay = (function()
{
  function GameDisplay( client, state ) {
    this.client = client;
    this.game = {};
  };

  GameDisplay.prototype = {

    //----------------------------------------
    // GAME STATE ENGINE
    //----------------------------------------
    updateState: function( newState ) {
      this.game = newState;
      var self = this;

      // everyone must pick a seat
      if (this.game.action === WAITING_FOR_PLAYERS) {
        this.updateSeatDisplay();
      }

      // Wait for anyone to click Start, disable seat changing
      if (this.game.action === READY_TO_START) {
        this.updateSeatDisplay();

        $(".action .message").hide();
        $(".action button").show();

        $(".action > button").on("click", function(e) { self.pickDealer(e); });
      }

      // everyone must pick a card
      if (this.game.action === CHOOSE_DEALER) {
        this.disableSeatPicking();
        console.log("Deck displayed, everyone pick a card");

        $(".action button").hide();
        var deck = new Card(0,0);
        $(".action .deck").empty().append( deck.el ).show();

        // Draw Game board with us at the bottom
        $( deck.el ).on("click", function(e) { self.pickACard(e); });
        $(".callToAction").text("Pick a card");
      }
    },

    startGame: function() {
      this.client.startGame();
    },
    pickDealer: function() {
      this.client.pickDealer();
    },
    pickACard: function() {
      this.client.pickACard();
    },

    // first display of new game page and let players choose seats
    showNewGame: function() {
      $('.page2').hide();   // lame
      $('.page3').show();

      this.enableSeatChoosing();
    },

    updateSeatDisplay: function() {
      if (!this.game.seats) return;

      var self = this;
      $(".seat").each( function( i, seat ) {
        var seatId = $(seat).data("id");
        var player = self.game.seats[seatId];
        if (player) {
          $(seat).text( player.name );
          $(seat).removeClass("unchosen");
        } else {
          $(seat).text("Empty");
          $(seat).addClass("unchosen");
        }
      });
    },

    /**
     * Seat clicked on, take or leave seat depending
     */
    onChooseSeat: function( event ) {
      var seatId = $(event.target).data('id');
      this.client.pickSeat( seatId );
    },

    enableSeatChoosing: function() {
      var self = this;
      $("#gameBoard >> .seat").on("click", function(e) { self.onChooseSeat(e); });
      $("#gameBoard >> .seat").addClass("bulge-on-hover");
    },

    disableSeatPicking: function() {
      $("#gameBoard >> .seat").off("click");
      $("#gameBoard >> .seat").removeClass("bulge-on-hover");
    }

  };
  return GameDisplay;
})();
