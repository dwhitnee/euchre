/*global fetch, Vue, Card, CardElement */

Array.prototype.rotate = function(n) {
  return this.slice(n, this.length).concat(this.slice(0, n));
};

let app = new Vue({
  el: '#euchreApp',

  // update these values, rather than update the DOM directly
  data: {
    message: "Hello, it's " + (new Date()).toDateString(),
    playerId: 1,
    draggable: "Eighteen of Cones",
    game: {
      players: [
        {
          name: "Nancy",
          cardIds: ["12:0","9:0","10:0","12:1", "9:1"]
        },
        {
          name: "Ernie",
          cardIds: ["12:1","9:1","10:1","12:2", "9:2"]
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
    canDeal: true,  // functions
    canPickUp: true,
    canTurnDown: true
  },
  computed: {
    cards: function() {  // just this player's cards
      let outCards =
          this.game.players[this.playerId].cardIds.map( id => Card.fromId( id ));
      return outCards;
    },

    cardElements: function() {
      let hand = [];
      this.cards.forEach( card => hand.push( CardElement.allCards[card.id] ));
      return hand;
    },

    name: function() {
      return this.game.players[this.playerId].name;
    },
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

    // event handlers accessible from the web page
  methods: {
    showCards: function() {
      this.cards

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

    playCard: function( data, event ) {
      console.log("You dropped with data: " + JSON.stringify(data) );
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
