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
    // Bad GET = "Missing Authentication Token"
    // Bad POST = "Failed to fetch"
    //----------------------------------------
    async getGameList() {
      try {
        let response = await fetch( serverURL + "games");
        if (!response.ok) { throw response; }
        this.games = await response.json();  // response is a stream
      }
      catch( err ) {
        // FIXME: test bad fetch (404) and bad data (how?)
        err.text().then( errorMessage => {
          this.games = [{id:errorMessage}];
        });
      };
    },

    //----------------------------------------
    // ask server to create a new game and re-route us to the URL
    //----------------------------------------
    async newGame() {
      try {
        this.createInProgress = true;   // go into spinny mode

        let postData = {
          playerName: this.playerName
        };

        // response is an async stream
        let response = await fetch( serverURL + "newGame",
                                    Util.makeJsonPostParams( postData ));
        let data = await response.json();
        if (!response.ok) { throw data; }

        let gameId = data.gameId;
        let playerId = data.playerId;  // how to pass this to game?

        // v URL - hackable, unshareable
        // v Cookie - must include game/player pair. sharable
        // X uuencoded json blob of game/player - unshareable
        // X Need authentication - which is cookie based anyway

        // use both for now

        let playerGameData = {};
        playerGameData[gameId] = playerId;
        Util.setCookie("player", playerGameData );

        // remove playerId...eventually?  FIXME
        window.location.href = "game/?id=" + gameId + "&playerId=" + playerId;
      }
      catch( err) {
        console.error( err );
        alert("Create failed /sadface: " + err);
      };

      this.createInProgress = false;          // leave spinny mode
    },

    // Put name in cookie
    saveName: function( e ) {
      this.playerName = e.target.innerHTML.trim();
      Util.setCookie("name", this.playerName);
      console.log( this.playerName + " to cookie" );
    }
  }
});
