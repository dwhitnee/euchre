/*global fetch, Vue, Card, CardElement */

Array.prototype.rotate = function(n) {
  return this.slice(n, this.length).concat(this.slice(0, n));
};

let app = new Vue({
  el: '#euchreApp',

  //----------------------------------------
  // Game Model (drives the View, update these values only
  //----------------------------------------
  data: {
    message: "Hello, it's " + (new Date()).toDateString(),
    playerId: 1,
    playerName: "pick a name",
    poops: ["a", "b", "c", "d"],
    game: {
      players: [
        {
          name: "Nancy",
          cardIds: ["12:0","9:0","10:0","12:1", "9:1"]
        },
        {
          name: "Ernie",
          // cardIds: ["9:0"]
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
    movingCard: undefined,
    nameEditable: false
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

    //----------------------------------------
    //----------------------------------------
    name: function() {
      this.playerName = this.game.players[this.playerId].name;
      return this.playerName;
    },
    //----------------------------------------
    // All players
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

      this.$forceUpdate();
    },

    // drop a card on table
    playCard: function( event ) {
      console.log("You dropped with event: " + JSON.stringify(event) );

      let card = JSON.parse( event.dataTransfer.getData("card"));

      if (card) {
        this.playedCard = this.movingCard;
        this.movingCard = undefined;
        let cards = this.game.players[this.playerId].cardIds;
        cards.splice( cards.indexOf(this.playedCard.id), 1);
      }
    },

    pickUpCard: function() {
    },
    turnDownCard: function() {
    },
    takeTrick: function() {
    },
    saveName: function() {
      this.game.players[this.playerId].name = this.playerName;
      this.nameEditable = false;
    }
  }
});
