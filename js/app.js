/*global fetch, Vue, VueRouter, Card, Util */

let serverURL = "https://f7c3878i78.execute-api.us-west-2.amazonaws.com/dev/";

var router = new VueRouter({
  mode: 'history',
  routes: [ ]
});

// Need either a compiler or inline template -- time for webpack?
// Vue.component("modal", {
//   template: "#modal-template"
// });


let app = new Vue({
  router,
  el: '#euchreApp',

  //----------------------------------------
  // Game Model (drives the View, update these values only
  //----------------------------------------
  data: {
    gameDataReady: false,          // wait to load the page
    saveInProgress: false,

    playedCard: undefined,
    movingCard: undefined,

    isSpectator: true,
    spectatorName: "",
    spectatorNameTmp: "",
    playerId: undefined, // Loaded from game cookie, who user is

    // game data from server, players are in NESW/0123 order
    // player 0 is at the bottom
    game: undefined,
/*    {
      id: "BasicBud-463046",
      dealerId: 0,
      trumpCallerId: 1,
      trumpSuit: 3,
      goingAlone: false,
      leadPlayerId: 1,   // left of dealer or taker of last trick

      deck: [],
      playedCardIds: ["9:0","10:0","11:0","12:0"],
      players: [
        {
          name: "Nancy",
          score: 0,
          tricks: 0,
          pickItUp: false,
          cardIds: ["12:0","9:0","10:0","12:1", "9:1"]
        },
        {
          name: "Ernie",
          score: 0,
          tricks: 0,
          pickItUp: false,
          cardIds: ["9:0","10:1","11:2","13:3", "1:3"]
        },
        {
          name: "Sam",
          score: 0,
          tricks: 0,
          pickItUp: false,
          cardIds: ["12:2","9:2","10:2","12:3","9:3"]
        },
        {
          name: "Wendy",
          score: 0,
          tricks: 0,
          pickItUp: false,
          cardIds: ["12:3","9:3","10:3","1:0", "1:1"]
        }
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

    dealerName: function() {
      return this.game.players[this.game.dealerId].name;
    },

    //----------------------------------------
    // lots of state
    //----------------------------------------
    bidding: function() { return this.game.cardsDealt && this.game.bidding; },
    ourTurn: function() { return this.playerId == this.game.playerTurn; },
    canPickUp: function() { return this.game.bidding && this.upCard(); },
    weAreDealer: function() { return this.playerId == this.game.dealerId; },
    timeToDeal: function() {
      return (this.numPlayers == 4) && !this.game.cardsDealt;
    },

    //----------------------------------------
    // just this player's cards, create Card objects from the list of
    // game state list of ids.
    // Can't cahce otherwise Vue doesn't notice the update after drag and drop
    //----------------------------------------
    cards: {
      cache: false,
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
    }
  },

  //----------------------------------------
  // We spin until game loaded so this can be anywhere in lifecycle
  //----------------------------------------
  mounted() {
    this.gameId = this.$route.query.id;

    // Spectator can view different hands this way
    this.playerId = parseInt( this.$route.query.playerId );
    if (isNaN( this.playerId)) { this.playerId = undefined; }
    console.log("Viewing from the perspective of player " + this.playerId );

    // we may not need this, but it is used in page logic.  Oof
    this.spectatorName = Util.getCookie("name");

    // remove this in PROD, used for inhabiting different players
    if (this.playerId !== undefined) {
      console.log("CHEATING! I am player " + this.playerId);
      this.isSpectator = false;   // TESTING
      this.updateFromServer();    // TESTING
      return;                     // TESTING
    }

    // See who this is and where they sit at the table, cookie
    let playerData = Util.getCookie("player");
    this.playerId = playerData[this.gameId];

    this.updateFromServer().then( () => {
      let playerName = Util.getCookie("name");
      if (this.isGameLoaded()) {

        // test, remove me
        if (!this.isSpectator) {
          console.log( playerName + " should be " +
                       this.game.players[this.playerId].name);
        }

        // this player is not part of this game yet -- according to their cookie
        if ((this.playerId === undefined) || !this.player) {
          this.isSpectator = true;
          this.playerId = 2;        // this should come from query FIXME TESTING
        } else {
          this.isSpectator = false;
        }
      }
    });
  },

  // synchronous app setup before event handling starts
  beforeCreate: function() {
  },

  //----------------------------------------------------------------------
  // event handlers and other fns accessible from the web page
  //----------------------------------------------------------------------
  methods: {

    //----------------------------------------
    //----------------------------------------
    // methods to determine how much to show
    isGameLoaded()   { return this.game; },
    isPlayerInGame() { return this.playerId !== undefined; },

    // Potential trump
    upCard: function()  { return this.game.playedCardIds[this.game.dealerId]; },

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


    //----------------------------------------
    // point at who's up, account for seat locations
    //----------------------------------------
    arrowRotation: function() {
      let angle = -135 + (90* this.getSeatForPlayer( this.game.playerTurn ));
      return "transform: rotate(" + angle + "deg";
    },

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

      // event.target.style.opacity = '0.2';
      console.log("Dragging the " + card);
    },

    //----------------------------------------
    // remove card from old place, swpa with target card
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

      this.$forceUpdate();   // need this so computed values update
    },


    //----------------------------------------------------------------------
    // SERVER CALLS
    //----------------------------------------------------------------------
    //----------------------------------------
    // See what's changed in the wide world
    //----------------------------------------
    async updateFromServer() {

      try {
        // response is an async stream
        let response = await fetch(serverURL +
                                   "game?gameId=" + this.gameId +
                                   "&playerId=" + this.playerId);
        if (!response.ok) { throw await response.json(); }
        this.game = await response.json();

        // If game got deleted or messed up, we get an empty object
        if (!Object.keys( this.game ).length) {
          this.game = undefined;
          alert("No game found named " + this.gameId );
        }
        console.log("Loaded game for " + this.playerName );
        this.gameDataReady = true;
      }
      catch( err ) {
        alert("Problem reading game from server " + Util.sadface +
              (err.message || err));

        debugger;    // FIXME
      };
    },

    //----------------------------------------
    // enter existing game, we are Player n+1
    //----------------------------------------
    async join( seatId ) {
      try {
        this.saveInProgress = true;

        let playerId = this.getPlayerInSeat( seatId );
        console.log("Joining as " + this.spectatorName + " at spot #"+playerId);

        let postData = {
          gameId: this.gameId,
          playerId: playerId,
          name: this.spectatorName
        };
        let response = await fetch( serverURL + "deal",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }

        let playerData = Util.getCookie("player");
        playerData[this.gameId] = playerId;
        Util.setCookie("player", playerData );

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
      try {
        this.saveInProgress = true;

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
    // drop a card on table
    //----------------------------------------
    playCard: function( event ) {
      // if dealer has 6 then only they must play and discard
      // play a card IFF playerTurn (and not discarding), and only one card
      // FIXME, call server


      let card = JSON.parse( event.dataTransfer.getData("card"));

      if (card) {
        this.game.playedCardIds[this.playerId] = this.movingCard.id;
        let cards = this.game.players[this.playerId].cardIds;
        cards.splice( cards.indexOf(this.movingCard.id), 1);
        this.movingCard = undefined;
        this.$forceUpdate();   // need this so computed values update
      }
    },

    //----------------------------------------
    // pass
    //----------------------------------------
    async pass() {
      // if this is the dealer, turn down the card

      if (this.playerId == this.game.dealerId) {
        // animate turning down card?  FIXME
        alert("Turning down card");
      }

      this.game.playerTurn = (this.game.playerTurn+1)%4;

      try {
        this.saveInProgress = true;

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
        console.error("Join failed: " + JSON.stringify( err ));
        alert("Try again. Join failed " + Util.sadface + (err.message || err));
      };

      this.saveInProgress = false;
    },

    //----------------------------------------
    // put up card in dealer's hand.  Bidding is over, start playing
    //----------------------------------------
    async pickUpCard() {
      try {
        this.saveInProgress = true;

        let postData = {
          gameId: this.gameId,
          playerId: this.playerId,
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


    turnDownCard: function() {
    },
    takeTrick: function() {
    },

    setSpectatorName: function() {
      // use tmp or else page updates as soon as first key is pressed
      this.spectatorName = this.spectatorNameTmp;
      Util.setCookie("name", this.spectatorNameTmp.trim());
    },

    //----------------------------------------
    // Update local name, save to cookie, update name in server-side Game also
    //----------------------------------------
    async setPlayerName(event) {
      event.target.blur();  // done editing

      let playerName = event.target.innerHTML.trim();

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
        Util.setCookie("name", playerName );
        await this.updateFromServer();
      }
      catch( err ) {
        console.error("Change name: " + JSON.stringify( err ));
        alert("Try again. Change name failed " +
              Util.sadface + (err.message || err));

        // D'oh. revert
        event.target.innerHTML = this.playerName;
      };

      this.saveInProgress = false;
    },

  }
});
