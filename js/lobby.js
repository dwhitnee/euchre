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
    createInProgress: false,
    loadInProgress: false
  },

  //----------------------------------------
  // derived attributes
  //----------------------------------------
  computed: {
    isAdmin: function() {
      return this.playerName == "Admin";
    }
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
    // Bad GET = "Missing Authentication Token"
    // Bad POST = "Failed to fetch"
    //----------------------------------------
    async getGameList() {
      this.loadInProgress = true;
      try {
        let response = await fetch( serverURL + "games");
        if (!response.ok) { throw await response.json; }
        this.games = await response.json();  // response is a stream
      }
      catch( err ) {
        // FIXME: test bad fetch (404) and bad data (how?)
        this.games = [{ id: err.message }];
      };

      this.loadInProgress = false;
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
        if (!response.ok) { throw await response.json(); }
        let data = await response.json();

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

        // remove playerId...eventually?  FIXME TESTING
        window.location.href = "game/?id=" + gameId; // + "&playerId=" + playerId;
      }
      catch( err) {
        console.error( err );
        alert("Create failed " + Util.sadface + err);
      };

      this.createInProgress = false;          // leave spinny mode
    },

    //----------------------------------------
    // Put name in cookie
    //----------------------------------------
    saveName: function( e ) {
      this.playerName = e.target.innerHTML.trim();
      Util.setCookie("name", this.playerName);
      console.log( this.playerName + " to cookie" );
    },


    //----------------------------------------------------------------------
    // Admin functions
    //----------------------------------------------------------------------
    //----------------------------------------
    // Buh-bye data
    //----------------------------------------
    async deleteGame( gameId ) {
      console.log("Nuking " + gameId );

      if (!confirm("Nuke " + gameId + "?")) {
        return;
      }
      // Pre-emptive remove game from list (doesn't hurt and better feedback)
      this.games.splice( this.games.findIndex( game =>
                                               (game.id === gameId)), 1);
      try {
        let postData = {
          gameId: gameId
        };
        let response = await fetch( serverURL + "deleteGame",
                                    Util.makeJsonPostParams( postData ));
        if (!response.ok) { throw await response.json(); }

      }
      catch( err) {
        console.error( err );
        alert("Delete failed " + Util.sadface + err.message);
      };
    },

  }
});
