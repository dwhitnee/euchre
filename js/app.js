/*global fetch, Vue, VueRouter, Card, Util */
//-----------------------------------------------------------------------
//  Copyright 2015-2021, David Whitney
// This file is part of Quarantine Euchre

// Quaratine Euchre is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//-----------------------------------------------------------------------

//----------------------------------------------------------------------
// The Vue application UI.
// This is the browser code that the local player interacts with.
// Interactions results in server calls. Server is polled every ~3 seconds
// to update state and display.
// ---------------------------------------------------------------------

Vue.config.devtools = true;

// AWS Lambda serverless API deployment endpoint
let serverURL = "https://f7c3878i78.execute-api.us-west-2.amazonaws.com/dev/";

// Vue-router 3
var router = new VueRouter({
  mode: 'history',
  routes: [ ]
});

// Vue-router 4
// const router = VueRouter.createRouter({
//   history: VueRouter.createWebHistory(),
//   routes: []
// });


let app = new Vue({
  router,
  el: '#euchreApp',

  //----------------------------------------
  // Game Model (drives the View, update these values only
  //----------------------------------------
  data: {
    gameDataReady: false,       // wait to load the page
    saveInProgress: false,      // prevent other actions while this is going on
    message: "",                // display in the middle
    movingCard: undefined,      // dragging

    isSpectator: true,
    spectatorName: "",
    spectatorNameTmp: "",
    cheating: false,
    playerId: undefined,   // Loaded from game cookie, who user is
    messageCountdown: 0,
    isAloneCall: false,

    stats: {
      wins: 0,
      losses: 0,
      streak: 0,
      points: 0,
      names: ["Joe","schmo","crazy warts"]
    },
    showCredits: false,
    version: "1.0",

    // game data from server, players are in NESW/0123 order
    // player 0 is at the bottom
    game: undefined,

/*    {
      id: "BasicBud-463046",
      dealerId: 0,
      trumpCallerId: 1,
      trumpSuit: 3,
      dummyPlayerId: null,
      leadPlayerId: 1,   // left of dealer or taker of last trick

      deck: [],
      playedCardIds: ["9:0","10:0","11:0","12:0"],
      players: [
        {
          name: "Nancy",
          score: 0,
          tricks: 0,
          cardIds: ["12:0","9:0","10:0","12:1", "9:1"]
        },...
      ]
    }
*/
  },

  //----------------------------------------
  // derived attributes, mostly conveniences to pull out of server
  // state for easier rendering
  //----------------------------------------
  computed: {
    //----------------------------------------
    // dig player info out of the bowels of game data
    //----------------------------------------
    player: function() {
      if (this.isGameLoaded()) {
        return this.game.players[this.playerId];
      } else {
        return undefined;
      }
    },

    //----------------------------------------
    playerName: {
      cache: false,
      get () {
        if (this.player) {
          return this.player.name;
        } else {
          // game might not be loaded, user might not have joined game yet
          return "...";
        }
      }
    },
    trumpCallerName: function() {
      return this.game.players[this.game.trumpCallerId].name;
    },
    dealerName: function() {
      return this.game.players[this.game.dealerId].name;
    },
    pastPlayerNames: {
      cache: false,
      get () {
        let cacheBuster = this.playerName;  // cache key trigger
        let names = Util.loadData("pastPlayerNames") || [];
        return names.join(", ");
      }
    },

    //----------------------------------------
    // lots of state
    //----------------------------------------
    bidding: function() { return this.game.cardsDealt && this.game.bidding; },
    ourTurn: function() { return this.playerId == this.game.playerTurn; },
    canPickUp: function() { return this.game.bidding && this.upCard; },
    upCard: function()  { return this.game.playedCardIds[this.game.dealerId]; },
    trumpSuit: function() {
      let suit = Card.suitNames[this.game.trumpSuit];
      let emojis = ["♣","♦","♥","♠"];
      if (this.game.trumpSuit != null) {
        suit += " " + emojis[this.game.trumpSuit];
      }
      return suit;
    },
    // The potential trump
    validSuits: function() {
      let suits = [];
      for (let i=0; i <4; i++) {
        if (i != this.game.upCardSuit) {
          suits.push( Card.suitNames[i] );
        }
      }
      return suits;
    },

    weAreDealer: {
      cache: false,    // uncached so Deal button shows up when 4th joins
      get() {
        return this.playerId == this.game.dealerId;
      }
    },
    // assumes server will only return what's left in the deck if round is over
    blind: function() {
      return this.game.deck.map( id => Card.fromId( id ));
    },

    timeToDeal: {
      cache: false,    // uncached so Deal button shows up when 4th joins
      get() {
        return (this.numPlayers == 4) &&
          !this.game.cardsDealt &&
          !this.game.winner;
      }
    },
    trickWinnerName: function() {
      if ((this.game.trickWinner != null) && !this.game.winner) {
        return this.game.players[this.game.trickWinner].name;
      } else {
        return null;
      }
    },
    // first card in trick
    leadCard: function() {
      let leadCard = this.game.playedCardIds[this.game.leadPlayerId];
      if (leadCard) {
        return Card.fromId( leadCard );
      }
      return null;
    },

    // logic to trigger trick winner and reset to next hand
    trickOver: function() {
      let cardsPlayed = 0;
      this.game.playedCardIds.forEach(
        card => { if (card != null) { cardsPlayed++; }});

      return cardsPlayed == 4;
    },

    //----------------------------------------
    // just this player's cards, create Card objects from the list of
    // game state list of ids.
    // Can't cache otherwise Vue doesn't notice the update after drag and drop
    //----------------------------------------
    cards: {
      cache: false, // this does not trigger on updateFromServer, which is OK actually
      get () {
        if (!this.isGameLoaded() || !this.player || !this.player.cardIds) {
          return [];
        }
        return this.game.players[this.playerId].cardIds.map(
          id => Card.fromId( id ));
      }
    },

    //----------------------------------------
    // cards on the table as seen from the player's view
    //----------------------------------------
    playedCards: {
      cache: false,
      get () {
        if (!this.isGameLoaded()) { return []; }

        let ids = this.game.playedCardIds;  // in NESW order
        let cards = [];
        for (var i=0; i < 4; i++) {
          if (ids[i]) {
            cards.push( Card.fromId( ids[i] ));
          } else {
            cards.push("");
          }
        }
        return cards.rotate( this.playerId );  // rotate from NESW
      }
    },

    //----------------------------------------
    // All players, as seen from main player's view
    //----------------------------------------
    players: function() {
      if (!this.game) { return []; }  // wait for game load

      this.numPlayers = 0;
      let players = [];
      this.game.players.forEach( player => {
        players.push( player );
        if (player.name) {
          this.numPlayers++;
        }
      });

      return players.rotate( this.playerId );   // rotate from NESW
    },

    //----------------------------------------
    // All players, as seen from player's view
    //----------------------------------------
    names: function() {
      let names = [];
      this.players.forEach( player => {
        names.push( player.name );
      });
      return names;   // assumes players are already rotated to face user
    },

    // for feedback, this gets cached in DOM when <a> tag built
    deviceData() {
	  let CRLF = "%0D%0A";
	  return CRLF + "----" + CRLF +
	    "build: " + this.version + CRLF +
 	    "Resolution: " + window.screen.availWidth + "x" +
	    window.screen.availHeight + CRLF +
 	    "Viewport: " + window.innerWidth + "x" + window.innerHeight + CRLF +
 	    "UserAgent: " + navigator.userAgent + CRLF +
	    "";
    },
  },

  //----------------------------------------
  // We spin until game loaded so this can be anywhere in lifecycle
  //----------------------------------------
  mounted() {
    // handle broken promises.
    window.addEventListener('unhandledrejection', function(event) {
      debugger;
      alert("Rat farts " + JSON.stringify( event ));
    });

    this.gameId = this.$route.query.id;

    if (!this.gameId) {
      window.location.href =
        window.location.href.split("game").shift();  // redirect to lobby
    }

    // Spectator can view different hands this way
    this.playerId = parseInt( this.$route.query.playerId );
    if (isNaN( this.playerId)) { this.playerId = null; }
    console.log("Viewing from the perspective of player " + this.playerId );

    // we may not need this, but it is used in page logic.  Oof
    this.spectatorName = Util.loadData("name");

    // remove this in PROD, used for inhabiting different players
    if (this.playerId != null) {
      console.log("CHEATING! I am player " + this.playerId);
      this.cheating = true;
      this.isSpectator = true;
      // this.isSpectator = false;   // TESTING
      // this.updateFromServer();    // TESTING
      // return;                     // TESTING
    } else {
      // See who this is and where they sit at the table, cookie
      let playerData = Util.loadData("player") || {};
      this.playerId = playerData[this.gameId];
    }

    this.stats = Util.loadData("stats") || this.stats;

    this.updateFromServer().then( () => {
      let playerName = Util.loadData("name");
      if (this.isGameLoaded()) {

        // keep it coming! Every 2.5 seconds. 3 seems slow, 2 seems fast
        this.autoLoad = setInterval(() => { this.updateFromServer(); }, 2500);

        let gameTime = 1000 * 60 * 90;  // 90 min
        // stop reloading after game should be over
        setTimeout(() => {
          clearInterval( this.autoLoad );
          this.setMessage("Game timed out, refresh the page to continue.");
        }, gameTime);

        // test, remove me
        if (!this.isSpectator) {
          console.log( playerName + " should be " +
                       this.game.players[this.playerId].name);
        }

        // this player is not part of this game yet -- according to their cookie
        if ((this.playerId === undefined) || !this.player) {
          this.isSpectator = true;
          this.playerId = 2;        // this should come from query FIXME TESTING
          if (this.numPlayers == 4) {
            this.cheating = true;  // allow spectators after game start
          }
        } else {
          this.isSpectator = false || this.cheating;  // let cheaters spectate
        }
      }
    });
  },

  // synchronous app setup before event handling starts
  beforeCreate: function() {
  },

  //----------------------------------------------------------------------
  // event handlers and other things that should not be computed
  //fns accessible from the web page
  //----------------------------------------------------------------------
  methods: {

    // cheater!!!
    seeNextPlayer: function() {
      // debugger
      window.location = this.$route.path +
        "?id=" + this.game.id +
        "&playerId=" + (this.playerId+1)%4;
    },

    // set the message to display lcoally, keep it for 2-3 cycles (6 seconds)
    // (otherwise local messages disappear too fast)
    setMessage: function( message, pause ) {
      this.message = message;
      pause = pause || 0;
      this.messageCountdown = pause + 1;
    },
    addToMessage: function( message ) {
      this.message += message;
    },


    //----------------------------------------
    //----------------------------------------
    // methods to determine how much to show
    isGameLoaded()   { return this.game; },
    isPlayerInGame() { return this.playerId !== undefined; },

    // Is card the same suit as what was lead or is it the first card.
    followsSuit: function( card ) {
      if (this.leadCard) {
        return card.isSameSuitAs( this.leadCard, this.game.trumpSuit );
      } else {
        return true;   // no cards played yet
      }
    },
    // see if we have any cards of the lead suit, including the left bower
    playerIsVoid( leadCard, trumpSuit ) {
      let haveSuit = false;
      this.cards.forEach( card => {
        if (card.isSameSuitAs( leadCard, trumpSuit )) {
          haveSuit = true;
        }});

      if (!haveSuit) {
        console.log("Player is void in " + Card.suitNames[leadCard.suit]);
      }
      return !haveSuit;
    },

    // [0, n)
    random: function( max ) { return Math.floor(max * Math.random());  },

    //----------------------------------------
    // get actual playerId from seatId
    //----------------------------------------
    dealerIs: function( seatId ) {
      // need to unrotate back to playerIds
      let playerId = this.getPlayerInSeat( seatId );
      return playerId == this.game.dealerId;
    },

    // @return true if player in this seat recently passed their bid
    playerPassed: function( seatId ) {
      let playerId = this.getPlayerInSeat( seatId );
      return playerId == this.passer;
    },

    //----------------------------------------
    // scores
    //----------------------------------------
    teamTricks: function( seat ) {
      let playerId = this.getPlayerInSeat( seat );
      return this.game.players[playerId].tricks;
    },
    teamScore: function( seat ) {
      let playerId = this.getPlayerInSeat( seat );
      return this.game.players[playerId].score;
    },

    //----------------------------------------
    // advance the arrow pointer
    //----------------------------------------
    nextPlayer: function() {
      this.game.playerTurn = (this.game.playerTurn+1)%4;
      if (this.game.playerTurn === this.game.dummyPlayerId) {
        this.nextPlayer();
      }
    },

    //----------------------------------------
    // point at who's up, account for seat locations
    //----------------------------------------
    arrowRotation: function() {
      let angle = -135 + (90* this.getSeatForPlayer( this.game.playerTurn ));
      return "transform: rotate(" + angle + "deg";
    },

    isDummy: function( seatId ) {
      return (this.getPlayerInSeat( seatId) == this.game.dummyPlayerId);
    },

    //----------------------------------------
    // CSS from deck sprite
    //----------------------------------------
    getCardStyle: function( id ) {
      let face = "";

      if (id) {
        let card = Card.fromId( id );
        face = "background-position: " + this.getCardFaceStyle( card );
      }

      let entropy =  "transform: rotate(" + (this.random(10)-5) + "deg";
      return entropy + ";" + face;
    },

    //----------------------------------------
    // sprite: http://www.milefoot.com/math/discrete/counting/images/cards.png
    //----------------------------------------
    getCardFaceStyle: function( card ) {
      let height = 98;
      let width = 73;
      let suitRows = [Card.suits.Clubs, Card.suits.Spades,
                      Card.suits.Hearts,Card.suits.Diamonds];

      let border=2;  // css border 1px
      return -(width*(card.rank-1) + border) + "px " +
             -(height*suitRows[card.suit] + border) + "px";
    },

    //----------------------------------------
    // View is from current player's perspective,
    // but playerId's are absolute NESW (0,1,2,3)
    // p = s+p0, s = p-p0
    // i.e., if playerId is 0, then seatId's match playerId
    //----------------------------------------
    getPlayerInSeat: function( seatId ) {
      return (seatId + this.playerId) % 4;},
    getSeatForPlayer: function( playerId ) {
      return (4 + (playerId - this.playerId)) % 4;
    },


    //----------------------------------------------------------------------
    // DRAGGING
    //----------------------------------------------------------------------
    //----------------------------------------
    // attach card to drag event
    //----------------------------------------
    dragCardStart: function( card, event ) {
      this.movingCard = card;
      event.dataTransfer.setData("card", JSON.stringify( card ));
      event.target.style.marginTop = "";

      // event.target.style.opacity = '0.2';
      console.log("Dragging the " + card);
    },

    //----------------------------------------
    // on mouse over, make card jump only if it's playable
    //----------------------------------------
    mouseOverCard: function( card, event ) {
      if (!this.leadCard) {
        event.target.style.marginTop = "-.5em";
        return;
      }
      // check if card is playable
      if (this.followsSuit( card ) ||
          this.playerIsVoid( this.leadCard, this.game.trumpSuit ))
      {
        event.target.style.marginTop = "-.5em";
      }
    },
    mouseLeaveCard: function( event ) {
      event.target.style.marginTop = "";
    },

    //----------------------------------------
    // remove card from old place, swap with target card
    //----------------------------------------
    moveCard: function( overCard, event ) {
      if (this.movingCard === overCard) {
        return;   // draggin over ourselves
      }
      console.log("Swapping " + this.movingCard + " with " + overCard );

      let cards = this.game.players[this.playerId].cardIds;
      let a = cards.indexOf( this.movingCard.id );
      let b = cards.indexOf( overCard.id );
      // ES6 magic swapping
      [cards[a], cards[b]] = [cards[b], cards[a]];

      this.$forceUpdate();   // need this so getCardStyle updates, why? FIXME
      // need to make getCardStyle a computed method?  Component?
    },


    //----------------------------------------------------------------------
    // SERVER CALLS
    //----------------------------------------------------------------------
    //----------------------------------------
    // See what's changed in the wide world
    //----------------------------------------
    async updateFromServer() {
      this.passer = null;   // start fresh

      if (this.timeToDeal) {
        this.isAloneCall = false;  // reset for new hand
      }

      // preserve hand sort order if we can, dont trigger this.cards cache flush
      let cards = null;
      if (this.game) {
        cards = this.game.players[this.playerId].cardIds;
      }

      try {
        // response is an async stream
        let response = await fetch(serverURL +
                                   "game?gameId=" + this.gameId +
                                   "&playerId=" + this.playerId);
        if (!response.ok) { throw await response.json(); }
        let updatedGame = await response.json();

        // see if someone passed
        if (this.game && (updatedGame.playerTurn != this.game.playerTurn)) {
          if (updatedGame.bidding) {
            this.passer = this.game.playerTurn; // last guy must have passed
          }
        }
        // this seems to trigger only on deal and pickItUp, not on playCard
        // if we don't do this, this.cards updates every 3 seconds
        if (cards &&
            (cards.length == updatedGame.players[this.playerId].cardIds.length))
        {
          updatedGame.players[this.playerId].cardIds = cards;
        } else {
          console.log("new cards!");
        }
        this.game = updatedGame;

        // If game got deleted or messed up, we get an empty object
        if (!Object.keys( this.game ).length) {
          this.game = undefined;
          alert("No game found named " + this.gameId );
        }

        // if the server has a message, override ours immediately
        // if not, keep our local message for 2 cycles (6 seconds)
        // (otherwise local messages disappear too fast)
        if (this.game.message) {
          this.setMessage( this.game.message );
        } else {
          if (--this.messageCountdown <= 0) {
            this.message = "";
          }
        }

        if (this.game.dealerMustDiscard) {
          this.setMessage( this.trumpCallerName + " calls " + this.trumpSuit + "");
          if (this.game.dummyPlayerId != null) {
            this.addToMessage(" ALONE");
          }
          if (this.weAreDealer) {
            this.addToMessage(". You must discard any card.");
          } else {
            this.addToMessage(". Waiting for dealer to discard.");
          }
        }

        if (this.game.winner) {
          this.setMessage( this.game.players[this.game.winner].name +
                           "'s team wins!!");
          this.updateGameStats();

          if (this.game.handStats) {
            for (let i=0; i < this.game.handStats.length; i++) {
              this.updateHandStats( this.game.handStats[i] );
            }
          }

          clearInterval( this.autoLoad );   // kill updates
        }

        this.gameDataReady = true;
        this.updateRetries = 0;
      }
      catch( err ) {
        if (++this.updateRetries < 2) { return; }   // ignore first 2 fails

        alert("Problem reading game from server " + Util.sadface +
              (err.message || err));

        // redirect to home page if we can't load data?
        debugger;    // FIXME
      };
    },


    //----------------------------------------------------------------------
    // store player stats locally. Keeping data on server a hassle
    // called when every game (10 pts) is done
    //----------------------------------------------------------------------
    updateGameStats: function() {
      let stats = Util.loadData("stats") || {};
      let score = this.teamScore( 0 );

      // combined team game stats
      stats.wins = stats.wins || 0;
      stats.losses = stats.losses || 0;
      stats.streak = stats.streak || 0;
      stats.points = stats.points || 0;

      if (score >= 10) {
        stats.wins++;
        stats.streak++;
      } else {
        stats.losses++;
        stats.streak = 0;
      }
      stats.points += score;

      Util.saveData("stats", stats );
    },

    //----------------------------------------------------------------------
    // update stats for person who picked trump suit, and defending team
    // called after every hand is done? Or just at end of game...FIXME
    //----------------------------------------------------------------------
    updateHandStats: function( hand ) {
      let stats = Util.loadData("stats") || {};

      // callerId: 0
      // isAlone: false
      // isEuchre: false   // optional (tricks <3)
      // points: 1
      // tricksTaken: 4

      // initialize individual round stats
      stats.calledWins = stats.calledWins || 0;
      stats.calledLosses = stats.calledLosses || 0;  // got euchred
      stats.calledSweeps = stats.calledSweeps || 0;  // 2 pts
      stats.aloneCallWins = stats.aloneCallWins || 0;
      stats.aloneCallLosses = stats.aloneCallLosses || 0;  // got euchred
      stats.aloneCallSweeps = stats.aloneCallSweeps || 0;  // 4 pts
      stats.euchreWins = stats.euchreWins || 0;  // 2 pts defending

      if (this.playerId == hand.callerId) {  // caller points only

        if (hand.tricksTaken >= 3) {
          stats.calledWins++;
          if (hand.tricksTaken == 5) {
            stats.calledSweeps++; // 2 pts
            if (hand.isAlone) { stats.aloneCallSweeps++; } // 4 pts
          }
          if (hand.isAlone) { stats.aloneCallWins++; }

        } else {  // euchred
          stats.calledLosses++;
          if (hand.isAlone) { stats.aloneCallLosses++; }
        }

      } else {   // defending team points
        let callerPartnerId = (hand.callerId + 2) % 4;
        if ((this.playerId != callerPartnerId) && hand.isEuchre) {
          stats.euchreWins++;
        }
      }

      Util.saveData("stats", stats );
    },


    //----------------------------------------
    // enter existing game, we are Player n+1
    //----------------------------------------
    async join( seatId ) {
      if (this.saveInProgress) {
        return;   // debounce
      } else {
        this.saveInProgress = true;
      }

      try {
        let playerId = this.getPlayerInSeat( seatId );
        console.log("Joining as " + this.spectatorName + " at spot #"+playerId);

        let postData = {
          gameId: this.gameId,
          playerId: playerId,
          playerName: this.spectatorName
        };
        let response = await fetch( serverURL + "joinGame",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }

        this.playerId = playerId;
        let playerData = Util.loadData("player") || {};
        playerData[this.gameId] = playerId;

        Util.saveData("player", playerData );

        this.isSpectator = false;

        await this.updateFromServer();
      }
      catch( err ) {
        console.error("Join failed: " + JSON.stringify( err ));
        alert("Try again. Join failed " + Util.sadface + (err.message || err));
      };

      this.saveInProgress = false;
    },

    //----------------------------------------
    // deal
    //----------------------------------------
    async dealCards() {
      if (this.isSpectator) { return ; }
      if (this.saveInProgress) {
        return;   // debounce
      } else {
        this.saveInProgress = true;
      }

      try {
        console.log("Dealing: asking server to issue new cards");

        // animate?  FIXME  - make cards fly around until game load?
        // start an async aimation but dont await it

        let response = await fetch( serverURL + "deal",
                                    Util.makeJsonPostParams({
                                      gameId: this.gameId
                                    }));
        if (!response.ok) { throw await response.json(); }

        await this.updateFromServer();
        // stop animating  FIXME
      }
      catch( err ) {
        console.error("Deal failed: " + JSON.stringify( err ));
        alert("Dealing cards failed " + Util.sadface + (err.message || err));
      };
      this.saveInProgress = false;
    },

    //----------------------------------------
    // drop a card on table.
    // o Can only play on your turn IFF you have not already played
    // o if dealer has 6 then only they can play and it's discarded.
    // o Card must follow lead suit unless void
    // o bidding must be over
    // If trick is done, determine winner (let server figure it out?)
    //----------------------------------------
    async playCard( event ) {
      if (this.isSpectator) { return ; }
      if (this.saveInProgress) {
        return;   // debounce
      }

      let card = JSON.parse( event.dataTransfer.getData("card"));

      if (!card) {
        console.error("No card played: "+ JSON.stringify( event.dataTransfer));
        return;
      }
      let playedCard = this.movingCard;
      this.movingCard = undefined;

      let discarding = this.weAreDealer && this.game.dealerMustDiscard;

      // Is a play allowed now?
      if (!discarding) {
        if ((this.game.playedCardIds[this.playerId]) ||  // play one card
            this.game.dealerMustDiscard ||               // waiting for dealer
            this.game.bidding ||                         // while hand is going
            ((this.playerId !== this.game.playerTurn) &&
             (this.cards.length != 1)))  // on your turn, unless last turn
        {
          // A misplay here should be self evident to user
          console.log("Can't play a card right now");
          this.setMessage("It's not your turn yet.");
          return;
        }
      }

      // the rest is visual-only, real state is on server

      if (discarding) {
        this.game.playedCardIds[this.playerId] = null;
      } else {
        // check for proper following card (follow suit if possible)
        if (this.followsSuit( playedCard ) ||
            this.playerIsVoid( this.leadCard, this.game.trumpSuit ))
        {
          // finally play card
          this.game.playedCardIds[this.playerId] = playedCard.id;
          if (!this.trickOver) {
            this.nextPlayer();
          }
          this.setMessage("");

        } else {
          // bad card played
          this.setMessage("The " + this.leadCard.toString() +
                          " was lead. You must follow suit if you can.", 2);

          // put card back and exit
          this.game.playedCardIds[this.playerId] = null;
          return;
        }
      }

      // take card out of hand
      let cards = this.game.players[this.playerId].cardIds;
      cards.splice( cards.indexOf( playedCard.id), 1);

      try {
        this.saveInProgress = true;

        let postData = {
          gameId: this.gameId,
          playerId: this.playerId,
          cardId: playedCard.id
        };
        let response = await fetch( serverURL + "playCard",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }
        await this.updateFromServer();
      }
      catch( err ) {
        console.error("playCard failed: " + JSON.stringify( err ));
        alert("Try again. Card play failed " + Util.sadface + (err.message || err));
        await this.updateFromServer();
      };
      this.saveInProgress = false;
    },

    //----------------------------------------
    // pass on the bid. If this is the dealer, turn down the card
    //----------------------------------------
    async pass() {
      if (this.isSpectator) { return ; }
      if (this.saveInProgress) {
        return;   // debounce
      } else {
        this.saveInProgress = true;
      }

      if (this.playerId == this.game.dealerId) {
        // animate turning down card?  FIXME
        this.game.playedCardIds[this.game.dealerId] = null;  // poof
      }

      this.nextPlayer();   // this is visual only, real state is on server

      try {
        let postData = {
          gameId: this.gameId,
          playerId: this.playerId,
        };
        let response = await fetch( serverURL + "pass",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }
        await this.updateFromServer();
      }
      catch( err ) {
        console.error("Pass failed: " + JSON.stringify( err ));
        alert("Try again. Pass failed " + Util.sadface + (err.message || err));
      };

      this.saveInProgress = false;
    },

    //----------------------------------------
    // put up card in dealer's hand.  Bidding is over, start playing
    //----------------------------------------
    async pickUpCard() {
      if (this.isSpectator) { return ; }
      if (this.saveInProgress) {
        return;   // debounce
      } else {
        this.saveInProgress = true;
      }

      try {
        let postData = {
          gameId: this.gameId,
          playerId: this.playerId,
          isAlone: this.isAloneCall
        };
        let response = await fetch( serverURL + "pickItUp",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }
        await this.updateFromServer();
      }
      catch( err ) {
        console.error("Pickup failed: " + JSON.stringify( err ));
        alert("Try again. Pickup failed " + Util.sadface + (err.message || err));
      };

      this.saveInProgress = false;
    },

    //----------------------------------------
    // Pick a suit. Bidding is over, start playing
    //----------------------------------------
    async callSuit( suit ) {
      if (this.isSpectator) { return; }
      if (this.saveInProgress) {
        return;   // debounce
      } else {
        this.saveInProgress = true;
      }

      try {
        let postData = {
          gameId: this.gameId,
          playerId: this.playerId,
          suitName: suit,
          isAlone: this.isAloneCall
        };
        let response = await fetch( serverURL + "callSuit",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }
        await this.updateFromServer();
      }
      catch( err ) {
        console.error("Call suit failed: " + JSON.stringify( err ));
        alert("Try again. Call suit failed " + Util.sadface + (err.message || err));
      };

      this.saveInProgress = false;
    },


    //----------------------------------------
    // hand is over, update scores and start next hand
    // This is really a pause for people to look at the cards first
    // TODO: Delay a bit here so everyone can see trick?
    // Nice animation before calling server.
    //----------------------------------------
    async takeTrick() {
      if (this.isSpectator) { return ; }
      if (this.saveInProgress) {
        return;   // debounce
      } else {
        this.saveInProgress = true;
      }

      try {
        let postData = {
          gameId: this.gameId,
          playerId: this.playerId,
        };
        let response = await fetch( serverURL + "takeTrick",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }
        await this.updateFromServer();
      }
      catch( err ) {
        console.error("Take trick failed: " + JSON.stringify( err ));
        alert("Try again. Failed to take trick " + Util.sadface + (err.message || err));
      };
      this.saveInProgress = false;
    },

    setSpectatorName: function() {
      // use tmp or else page updates as soon as first key is pressed
      this.spectatorName = this.spectatorNameTmp.trim();
      Util.saveData("name", this.spectatorName );
    },

    savePlayerName( name ) {
      Util.saveData("name", name );

      let names = Util.loadData("pastPlayerNames") || [];
      names.push( name );
      Util.saveData("pastPlayerNames", names);
    },
    //----------------------------------------
    // Update local name, save to cookie, update name in server-side Game also
    //----------------------------------------
    async setPlayerName(event) {
      event.target.blur();  // done editing

      let playerName = event.target.innerText.trim();
      playerName = playerName || " ";

      // don't make spurrious or duplicate requests
      if (this.saveInProgress || this.isSpectator ||
          (this.playerName === playerName)) {
        console.log("Name NOP");
        return;
      }
      console.log("changing player name from " + this.playerName +
                  " to " + playerName );

      try {
        this.saveInProgress = true;

        let postData = {
          gameId: this.gameId,
          playerId: this.playerId,
          playerName: playerName
        };
        let response = await fetch( serverURL + "setPlayerName",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }
        this.savePlayerName( playerName );
        await this.updateFromServer();
      }
      catch( err ) {
        console.error("Change name: " + JSON.stringify( err ));
        alert("Try again. Change name failed " +
              Util.sadface + (err.message || err));

        // D'oh. revert
        event.target.innerText = this.playerName;
      };

      this.saveInProgress = false;
    },




    //----------------------------------------
    // Dialog handlers
    //----------------------------------------
    openDialog( name, openCallback ) {
	  this.openDialogElement( document.getElementById( name ));
	  if (openCallback)
		openCallback();
	},
	// @input button click that caused the close (ie, button),
	//    assumes it's the immediate child of the dialog
 	closeDialog( event ) {
	  this.closeDialogElement( event.target.parentElement );
	},
	// @input dialog element itself
	openDialogElement( dialog ) {
	  if (this.dialogIsOpen) {  // can't open two dialogs at once
		return;
	  }
	  // grey out game
 	  document.getElementById("dialogBackdrop").classList.add("backdropObscured");
	  this.dialogIsOpen = true;  // flag to disable other dialogs. Vue doesn't respect this on change(in v-if)?

	  dialog.open = true;           // Chrome
	  dialog.style.display="flex";  // Firefox/Safari

	  this.addDialogDismissHandlers( dialog );  // outside click and ESC
	},

    //----------------------------------------------------------------------
	// close dialog, restore background, remove event handlers.
	// @input dialog element itself
	//----------------------------------------------------------------------
 	closeDialogElement( dialog ) {
  	  document.getElementById("dialogBackdrop").classList.remove("backdropObscured");

	  this.dialogIsOpen = false;   // FIXME: Vue is not seeing this; Do we just need to add it to the data() section?
	  dialog.open = false;
 	  dialog.style.display="none";

	  // dialog gone, stop listening for dismiss events
	  let backdrop = document.getElementById("dialogBackdrop");
	  backdrop.removeEventListener('click', this.closeDialogOnOutsideClick );
	  document.body.removeEventListener("keydown", this.closeDialogOnESC );
	},

    //----------------------------------------------------------------------
	// Close on click outside dialog or ESC key.
	// Save functions for removal after close()
	//----------------------------------------------------------------------
	addDialogDismissHandlers( dialog ) {
	  // FIXME, these event handlers happen after Vue event
	  // handlers so you can play the game while a dialog is
	  // open.  How to disable all of game wile dialog is open?

  	  this.closeDialogOnOutsideClick = (event) => {
		const clickWithinDialog = event.composedPath().includes( dialog );
		if (!clickWithinDialog) {
		  this.closeDialogElement( dialog );
		}
	  };
  	  this.closeDialogOnESC = (event) => {
		if (event.keyCode === 27) {
		  this.closeDialogElement( dialog );
		}
	  };

	  // Could also use dialog::backdrop, but it is not fully supported
	  // Fake our own backdrop element to swallow clicks and grey out screen
	  // by not using "body" we don't need to worry about click bubbling
	  let backdrop = document.getElementById("dialogBackdrop");
 	  backdrop.addEventListener('click', this.closeDialogOnOutsideClick );
	  document.body.addEventListener("keydown", this.closeDialogOnESC );
	},
  }
});
