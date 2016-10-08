/*global $ Card */

// import Card

const WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS";
const READY_TO_START = "READY_TO_START";
const CHOOSE_DEALER = "CHOOSE_DEALER";
const NEW_DEALER = "NEW_DEALER";

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
      var ourTurn = false;

      this.updateSeatDisplay();   // Update player context decorations
      this.showCards();

      // everyone pick a seat
      if (this.game.action === WAITING_FOR_PLAYERS) {
        // NOP, does this need a setup after game over?
      }

      // Wait for anyone to click Start once all seated, disable seat changing
      if (this.game.action === READY_TO_START) {
        $(".action button").text("Choose  the  Dealer").show();
        $(".action button").show();
        $(".action > button").on("click", function(e) { self.pickDealer(e); });
      }

      // Indicate who's turn it is
      if (this.game.activePlayerSeat !== undefined) {
        ourTurn = (this.client.user.id === this.game.seats[this.game.activePlayerSeat].id);

        var activePlayerId = this.game.seats[this.game.activePlayerSeat].id;
        if (!ourTurn) {
          $(".callToAction").text( this.game.players[activePlayerId].name + "'s turn");
        }
      }

      // everyone pick a card
      if (this.game.action === CHOOSE_DEALER) {
        this.disableSeatPicking();
        // TODO: re-orient display so we're at the bottom.  HOW?

        $(".action button").hide();
        var deck = new Card(0,0);
        $(".action .deck").empty().append( deck.el ).show();

        if (ourTurn) {
          $( deck.el ).one("click", function(e) { self.pickACard(e); });
          $(".callToAction").text("Pick for dealer (click the deck to draw a card)");
        }
      }

      // Display the state change and wait for anyone to click "Deal!" button
      if (this.game.action === NEW_DEALER) {

        $(".callToAction").text("The new dealer is " +
                                this.game.seats[this.game.dealerSeat].name );

        $(".action .deck").empty();

        $(".action button").text("OK, Deal!").show();
        $(".action > button").on("click", function(e) { self.startGame(e); });

      }

      if (this.game.action === PICK_UP_TRUMP) {
        if (ourTurn) {
          // $( pickItUp.el ).one("click", function(e) { self.pickItUp(e); });
          // $( pass.el ).one("click", function(e) { self.pass(e); });
          $(".callToAction").text("Pick it up?");
        }
      }

      if (this.game.action === DECLARE_TRUMP) {
        if (ourTurn) {
          // $( pickASuit.el ).one("click", function(e) { self.pickItUp(e); });
          // $( pass.el ).one("click", function(e) { self.pass(e); });
          $(".callToAction").text("Choose a trump suit or pass");
        }

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

    rotateSeatDisplay: function() {
      // this.game.seats;
      // this.client.user.id;
    },

    showCards: function() {
      if (!this.game.seats) return;

      var self = this;
      $(".seat").each( function( index, seat ) {
        var seatId = $(seat).data("id");
        var player = self.game.seats[seatId];
        var c, card;

        var $cards = $(seat).find(".cards");
        $cards.empty();

        for (var i=0; i < player.cards.length; i++) {
          c = player.cards[i];
          card = new Card( c.rank, c.suit );
          $cards.append( card.el );
        }
      });

    },

    /* display player names with context decorations */
    updateSeatDisplay: function() {
      if (!this.game.seats) return;

      var self = this;
      $(".seat").each( function( i, seat ) {
        var seatId = $(seat).data("id");
        var player = self.game.seats[seatId];

        if (seatId === self.game.activePlayerSeat) {
          $(seat).addClass("myTurn");
        } else {
          $(seat).removeClass("myTurn");
        }

        if (seatId === self.game.dealerSeat) {
          $(seat).addClass("dealer");
        } else {
          $(seat).removeClass("dealer");
        }

        if (player) {
          $(seat).find(".name").text( player.name );
          $(seat).removeClass("unchosen");
        } else {
          $(seat).find(".name").text("Empty Seat");
          $(seat).addClass("unchosen");
        }
      });
    },

    /**
     * Seat clicked on, take or leave seat depending
     */
    onChooseSeat: function( event ) {
      var seatId = $(event.currentTarget).data('id');
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
