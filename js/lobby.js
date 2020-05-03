/*global fetch, Vue, VueRouter, Card */

//----------------------------------------------------------------------
//  Logic for creating or joining a game
//----------------------------------------------------------------------

function getCookie( key ) {
  return ('; '+document.cookie).split('; ' + key + '=').pop().split(';').shift();

}

let app = new Vue({
  el: '#lobbyApp',

  //----------------------------------------
  // Game Model (drives the View, update these values only
  //----------------------------------------
  data: {
    playerName: "Alphonso Beetlegeuse",
    games: []
  },

  //----------------------------------------
  // derived attributes
  //----------------------------------------
  computed: {
  },

  mounted() {
    this.playerName = getCookie("name") || this.playerName;
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

    // Put name in cookie
    saveName: function( e ) {
      this.playerName = e.target.innerHTML.trim();
      document.cookie = "name=" + this.playerName;
      console.log( this.playerName + " to cookie" );
    }
  }
});
