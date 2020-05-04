/*global fetch, Vue, VueRouter, Card, Util */

//----------------------------------------------------------------------
//  Logic for creating or joining a game
//----------------------------------------------------------------------
let app = new Vue({
  el: '#lobbyApp',

  //----------------------------------------
  // Game Model (drives the View, update these values only
  //----------------------------------------
  data: {
    playerName: "Alphonso Beetlegeuse",
    message: "Happy " + (new Date()).toLocaleString("en-US", {weekday: 'long'}),
    games: []
  },

  //----------------------------------------
  // derived attributes
  //----------------------------------------
  computed: {
  },

  mounted() {
    this.playerName = Util.getCookie("name") || this.playerName;
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
      alert("wooo!");
    },

    // Put name in cookie
    saveName: function( e ) {
      this.playerName = e.target.innerHTML.trim();
      Util.setCookie("name", this.playerName);
      console.log( this.playerName + " to cookie" );
    }
  }
});
