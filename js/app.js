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
    movingCard: undefined
  },

  //----------------------------------------
  // derived attributes
  //----------------------------------------
  computed: {
    //----------------------------------------
    // just this player's cards
    //----------------------------------------
    cards: function() {
      let outCards =
          this.game.players[this.playerId].cardIds.map( id => Card.fromId( id ));
      return outCards;
    },

    //----------------------------------------
    //----------------------------------------
    name: function() {
      return this.game.players[this.playerId].name;
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

    getCardStyle: function( id ) {
      let card = Card.fromId( id );
      return "background-position: " + this.getCardFaceStyle( card );
    },

    getCardFaceStyle: function( card ) {
      let height = 98;
      let width = 73;
      let suitRows = [Card.suits.Clubs, Card.suits.Spades,
                      Card.suits.Hearts,Card.suits.Diamonds];

      return -(width*(card.rank-1)+2) + "px " +
             -(height*suitRows[card.suit]+2) + "px";
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

    // re-order cards w/drag and drop
    dragStart: function( card, event ) {
      this.movingCard = card;
      event.dataTransfer.setData("card", JSON.stringify( card));

      // event.target.style.opacity = '0.2';
      console.log("Dragging the " + card);
    },
    moveCard: function( card, event ) {
      // console.log("You mmoved with data: " + JSON.stringify(data) );
      // console.log("You mmoved with event: " + JSON.stringify(event) );
      console.log("Moving " + this.cardMoving + " to the right of " + card );    },

    // drop a card on table
    playCard: function( event ) {
      console.log("You dropped with event: " + JSON.stringify(event) );

      let card = JSON.parse( event.dataTransfer.getData("card"));

      if (card) {
        this.playedCard = this.movingCard;
        this.movingCard = undefined;
        // FIXME: delete movingCard from Hand
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
      this.game.players[this.playerId].name = this.name;

    }
  }
});
