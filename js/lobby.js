/*global fetch, Vue, VueRouter, Card */

//----------------------------------------------------------------------
//  Logic for creating or joining a game
//----------------------------------------------------------------------

let app = new Vue({
  el: '#lobbyApp',

  //----------------------------------------
  // Game Model (drives the View, update these values only
  //----------------------------------------
  data: {
    newName: "Alphonso Beetlegeuse",
    playerName: "",
    games: []
  },

  //----------------------------------------
  // derived attributes
  //----------------------------------------
  computed: {
  },

  mounted() {
    // console.log( this.$route.hash );
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
    // ask server to create a new game and re-route us to the URL
    newGame: function() {

    },

    // NOP?
    saveName: function() {
      this.playerName = this.newName;
    }
  }
});
