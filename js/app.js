/*global fetch, Vue, VueRouter, Card, Util */

let serverURL = "https://f7c3878i78.execute-api.us-west-2.amazonaws.com/dev/";

var router = new VueRouter({
  mode: 'history',
  routes: [ ]
});


let app = new Vue({
  router,
  el: '#euchreApp',

  //----------------------------------------
  // Game Model (drives the View, update these values only
  //----------------------------------------
  data: {
    version: 1,
    saveInProgress: false,

    canDeal: false,  // functions, computed?
    canPickUp: false,
    canTurnDown: false,
    playedCard: undefined,
    movingCard: undefined,
    gameOver: false,

    isSpectator: true,
    spectatorName: "",

    playerId: undefined, // Loaded from game cookie
    // game data from server, players are in NESW/0123 order
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
    // just this player's cards, create Card objects from the list of
    // game state list of ids.
    // Can't cahce otherwise Vue doesn't notice the update after drag and drop
    //----------------------------------------
    cards: {
      cache: false,
      get () {
        if (!this.isGameLoaded() || !this.game.players[this.playerId].cardIds) {
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
    // player's name
    //----------------------------------------
    playerName: {
      cache: false,
      get () {
        // game might not be loaded, user might not have joined game yet
        if (!this.isGameLoaded()) { return "..."; }

        return this.game.players[this.playerId].name;
      }
    },

    //----------------------------------------
    // All players, as seen from player's view
    //----------------------------------------
    names: function() {
      if (!this.game) { return []; }  // wait for game load

      let names = [];
      this.game.players.forEach(
        function( player ) {
          names.push( player.name );
        });

      return names.rotate( this.playerId );   // rotate from NESW
    }

  },

  //----------------------------------------
  //----------------------------------------
  mounted() {
    this.gameId = this.$route.query.id;

    // should read playerId from cookie player[gameId]
    // this.playerId = this.$route.query.playerId;

    // See who this is and where they sit at the table
    let playerData = Util.getCookie("player");
    this.playerId = playerData[this.gameId];

    // this player is not part of this game yet -- according to their cookie
    if (this.playerId === undefined) {
      this.isSpectator = true;
      this.spectatorName = Util.getCookie("name");
      this.playerId = 2;      // how to spectate different players?

      if (this.isSpectator && !this.spectatorName) {
        this.spectatorName = "Incontinentia";
        Util.setCookie("name", this.spectatorName);
      }


    } else {
      this.isSpectator = false;
    }

    this.updateFromServer().then( () => {
      // should we fail if this is not true?  FIXME
      let playerName = Util.getCookie("name");
      if (this.isGameLoaded()) {
        console.log( playerName + " should be " + this.game.players[this.playerId].name);
      }
    });
  },

  // synchronous app setup before event handling starts
  beforeCreate: function() {
  },

  watch: {
    // playedCard: {
    // },
  },

  // event handlers accessible from the web page
  methods: {

    //----------------------------------------
    //----------------------------------------
    // methods to determine how much to show
    isGameLoaded() {   return this.game; },
    isPlayerInGame() { return this.playerId !== undefined; },

    //----------------------------------------
    // See what's changed in the wide world
    //----------------------------------------
    async updateFromServer() {

      try {
        // response is an async stream
        let response = await fetch( serverURL + "game?gameId=" + this.gameId );
        if (!response.ok) { throw await response.json(); }
        this.game = await response.json();

        // If game got deleted or messed up, we get an empty object
        if (!Object.keys( this.game ).length) {
          this.game = undefined;
          alert("No game found named " + this.gameId );
        }
      }
      catch( err ) {
        alert("Problem updating game from server " + Util.sadface +
              (err.message || err));

        debugger;    // FIXME
      };
    },

    //----------------------------------------
    // See what's changed in the wide world
    //----------------------------------------
    async saveToServer() {
      this.saveInProgress = true;          // spinny mode

      try {
        let response = await fetch( serverURL + "updateGame",
                                    Util.makeJsonPostParams({
                                      game: this.game
                                    }));
        if (!response.ok) { throw await response.json(); }
      }
      catch( err ) {
        console.error("Game update failed: " + JSON.stringify( err ));
        alert("Game update failed " + Util.sadface + (err.message || err));
      };

      this.saveInProgress = false;          // leave spinny mode
    },


    showCards: function() {
      this.cards;//???
    },

    // [0, n)
    random: function( max ) {
      return Math.floor( Math.random() * Math.floor(max) );
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


    // ask server to generate game id, we are Player One
    // If no gameId, come here?
    startGame: function() {

    },

    // enter existing game, we are Player n+1
    // get this from URL
    join: function( seatId ) {
      let playerId = (seatId + this.playerId) % 4;
      console.log("Joining as " + this.spectatorName + " at spot #" + playerId);
      this.game.players[playerId].name = this.spectatorName;
      this.playerId = playerId;
      // instantiate rest of Player object?


      // FIXME, update cookie with our playerId
      let playerData = Util.getCookie("player");
      playerData[this.gameId] = playerId;
      Util.setCookie("player", playerData );

      this.isSpectator = false;
      this.saveToServer();
    },

    dealCards: function() {
      debugger;
      this.updateFromServer();  // FIXME!
      return;

      console.log("Dealing: asking server to issue new cards");
      // animate?

      let self = this;
      fetch( serverURL + "deal")
        .then( function( resp ) { if (resp.ok) { return resp.json(); }})
        .then( function( data ) {
          console.log( data );
          self.state = data;
        });
    },

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

    //----------------------------------------
    // drop a card on table
    // tell server
    //----------------------------------------
    playCard: function( event ) {
      let card = JSON.parse( event.dataTransfer.getData("card"));

      if (card) {
        this.game.playedCardIds[this.playerId] = this.movingCard.id;
        let cards = this.game.players[this.playerId].cardIds;
        cards.splice( cards.indexOf(this.movingCard.id), 1);
        this.movingCard = undefined;
        this.$forceUpdate();   // need this so computed values update
      }
    },

    pickUpCard: function() {
    },
    turnDownCard: function() {
    },
    takeTrick: function() {
    },

    // Update local name, save to cookie, update name in Game as well?
    setPlayerName: function(event) {
      event.target.blur();  // done editing, this forces a second update FIXME

      if (this.isSpectator) {
        console.log("Nice try");
        event.target.innerHTML = this.playerName;
        return;
      }

      let playerName = event.target.innerHTML.trim();

      // onl udpate if changed
      if (this.game.players[this.playerId].name != playerName) {
        Util.setCookie("name", playerName );
        this.game.players[this.playerId].name = playerName;
        console.log( playerName + " saved to cookie" );

        this.saveToServer();
      }
    }
  }
});
