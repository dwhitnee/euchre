/*global fetch, Vue, VueRouter, Card, Util */

let serverURL = "https://f7c3878i78.execute-api.us-west-2.amazonaws.com/dev/";

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
    // handle broken promises.
    window.addEventListener('unhandledrejection', function(event) {
      debugger;
      // alert( event.promise );
      // alert( event.reason );
    });

    this.playerName = Util.getCookie("name") || this.playerName;
    this.getGameList();
  },

  // synchronous app setup before event handling starts
  beforeCreate: function() {
  },

  watch: {
    // playedCard: {
    // },
  },

  //----------------------------------------------------------------------
  //----------------------------------------------------------------------
  methods: {

    //----------------------------------------
    getGameList() {
      let self = this;
      fetch( serverURL + "games")
        .then( function( resp ) { if (resp.ok) { return resp.json(); }})
        .then( function( data ) {
          console.log( data );
          self.games = data;
        })
        .catch( err => self.games = [{id:err}] );
    },

    //----------------------------------------
    // ask server to create a new game and re-route us to the URL
    //----------------------------------------
    newGame() {
      let postData = {
        playerName: this.playerName
      };

      let self = this;
      fetch( serverURL + "newGame", Util.makeJsonPostParams( postData ))
        .then( function( resp ) { if (resp.ok) { return resp.json(); }})
        .then( function( resp ) {
          console.log( resp );
          // FIXME, how to get gameId from POST?
          // window.location.href = "game/?id=" + gameId;
        })
        .catch(function ( err ) {
          console.error( err );
          alert("something's broken :(");
        });
    },

    // Put name in cookie
    saveName: function( e ) {
      this.playerName = e.target.innerHTML.trim();
      Util.setCookie("name", this.playerName);
      console.log( this.playerName + " to cookie" );
    }
  }
});
