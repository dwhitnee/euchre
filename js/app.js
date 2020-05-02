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
    poops: ["a", "b", "c", "d"],
    game: {
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
    canDeal: true,  // functions
    canPickUp: true,
    canTurnDown: true,
    playedCard: "",
    cardMoving: ""
  },
  computed: {

    // cardStyle: function(card) {
    //   let height = 98;
    //   let width = 73;
    //   let suitRows = [Card.suits.Clubs, Card.suits.Spades,
    //                   Card.suits.Hearts,Card.suits.Diamonds];
    //   return {
    //     backgroundPosition:
    //       -(width  * (0)) + "px " +
    //       -(height * suitRows[Card.suits.Spades]) + "px "
    //   };
    // },

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

    setCardStyle: function(card, event) {
      let height = 98;
      let width = 73;
      let suitRows = [Card.suits.Clubs, Card.suits.Spades,
                      Card.suits.Hearts,Card.suits.Diamonds];
      event.target.style.backgroundPosition =
        -(width  * (card.rank-1)) + "px " +
        -(height * suitRows[card.suit]) + "px ";
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
      this.cardMoving = card;
      event.target.style.opacity = '0.2';
    },
    moveCard: function( card, event ) {
      // console.log("You mmoved with data: " + JSON.stringify(data) );
      // console.log("You mmoved with event: " + JSON.stringify(event) );
      console.log("Moving " + this.cardMoving + " to the right of " + card );
    },

    // drop a card on table
    playCard: function( data, event ) {
      console.log("You dropped with data: " + JSON.stringify(data) );
      console.log("You dropped with event: " + JSON.stringify(event) );
      if (data && data.card) {
        this.playedCard = data.card;
        // remove card from had
        // iterate over players cards and remove it
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
