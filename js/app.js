/*global fetch, Vue, VueRouter, Card, Util */

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
    playerId: 3,   // FIXME - how to determine this? server?
    playerName: "",
    game: {
      playedCardIds: ["9:0","10:0","11:0","12:0",],  // NESW
      players: [
        {
          name: "Nancy",
          cardIds: ["12:0","9:0","10:0","12:1", "9:1"]
        },
        {
          name: "Ernie",
          cardIds: ["9:0","10:1","11:2","13:3", "1:3"]
        },
        {
          name: "Sam",
          cardIds: ["12:2","9:2","10:2","12:3","9:3"]

        },
        {
          name: "Wendy",
          cardIds: ["12:3","9:3","10:3","1:0", "1:1"]
        }
      ]
    },
    canDeal: false,  // functions
    canPickUp: false,
    canTurnDown: false,
    playedCard: undefined,
    movingCard: undefined
  },

  //----------------------------------------
  // derived attributes
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
        return this.game.players[this.playerId].cardIds.map(
          id => Card.fromId( id ));
      }
    },
    // cards as seen from the player's view
    playedCards: {
      cache: false,
      get () {
        let ids = this.game.playedCardIds;  // in NESW order
        let cards = [];
        for (var i=0; i < 4; i++) {
          if (ids[i]) {
            cards.push( Card.fromId( ids[i] ));
          } else {
            cards.push("");
          }
        }
        return cards.rotate( this.playerId );
      }
    },


    //----------------------------------------
    //----------------------------------------
    name: function() {
      this.playerName = this.game.players[this.playerId].name;
      return this.playerName;
    },
    //----------------------------------------
    // All players, as seen from player's view
    //----------------------------------------
    names: function() {
      let names = [];
      this.game.players.forEach(
        function( player ) {
          names.push( player.name );
        });

      return names.rotate( this.playerId );
    }

  },

  mounted() {
    console.log( this.$route.query );
    console.log( this.$route.hash );
    // grab gameId from #
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
    joinGame: function( gameId ) {

    },

    dealCards: function() {
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
    saveName: function(event) {
      this.playerName = event.target.innerHTML.trim();
      Util.setCookie("name", this.playerName );
      console.log( this.playerName + " to cookie" );

      this.game.players[this.playerId].name = this.playerName;
    }
  }
});
