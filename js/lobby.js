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
    games: [],
    createInProgress: false
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
    // would be cool to async the fetches - FIXME
    //----------------------------------------
    async getGameList() {

      // async/await way, is it better?
      try {
        let response = await fetch( serverURL + "games");
        this.games = await response.json();  // response is a stream
      }
      catch( err ) {
        this.games = [{id:err}];
      };

      // let self = this;
      // fetch( serverURL + "games")
      //   .then( function( resp ) { if (resp.ok) { return resp.json(); }})
      //   .then( function( data ) {
      //     self.games = data;
      //   })
      //   .catch( err => self.games = [{id:err}] );

    },

    //----------------------------------------
    // ask server to create a new game and re-route us to the URL
    //----------------------------------------
    newGame() {
      this.createInProgress = true;   // go into spinny mode

      let postData = {
        playerName: this.playerName
      };

      let self = this;
      fetch( serverURL + "newGame", Util.makeJsonPostParams( postData ))
        .then( function( resp ) { if (resp.ok) { return resp.json(); }})
        .then( function( gameId ) {
          // leave spinny mode
          self.createInProgress = false;          // leave spinny mode
          self.getGameList();
          window.location.href = "game/?id=" + gameId;
        })
        .catch(function ( err ) {
          console.error( err );
          alert("Create failed /sadface: " + err);
          self.createInProgress = false;          // leave spinny mode
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
