/*global console, $, Client, window, document */

/**
 * Create a client to talk to the server, and hook up the forms to create server events
 *
 * receive server events
 * send client events
 */

var client = new Client();

var Lobby = {};   // global state as defined by the server
var game =  {};   // State of our one game
var joinedGame;
var joinedGameId;  // the game we plan to join
var player;  // us

/**
 * What to do when the server sends a update
 */
var EventHandler = {
  /**
   * New Chat message received
   */
  onNewChatMessage: function chat( data ) {
    $('#messages').prepend( $('<li/>').text( data.user + ": " +  data.msg ));
    $("#messages").animate({ scrollTop: 0 }, 100);
  },

  /**
   * One game action occured, not sent to the Lobby or other games
   */
  onGameStateChange: function updateGame( state ) {
    game = state;
    $("#playerList").empty();
    $(".gameName").text( game.name );
    for (var playerId in game.players) {
      $(".gameName").append( $("<div/>").text( game.players[playerId].name ));
    }
  },

  /**
   * Global metadata update (other players, other game metadata)
   */
  onLobbyStateChange: function updateLobby( state ) {
    Lobby = state || Lobby.state;

    // player = players[name]

    if (joinedGameId) {
      $("#gameBoard").show();
      joinedGame = Lobby.games[joinedGameId];
      $(".gameName").empty();
      $(".gameName").text( joinedGame.name );

      for (var playerId in joinedGame.players) {
        $(".gameName").append( $("<div/>").text( Lobby.players[playerId].name ));
      }
    }

    $('#state').text( JSON.stringify( state ));
    console.log( JSON.stringify( state ));

    $('#playerList').empty();
    $.each( state.players, function( i, player ) {
              $('#playerList').append(
                $('<tr/>').append( $('<td/>').text( player.name ))
              );
            });

    $('#gameList').empty();
    $("#gameList > tr").off("click");
    // clear events
    $.each( state.games, function( i, game ) {
              $('#gameList').append(
                $('<tr/>').append( $('<td/>').text( game.name ).attr("game-id", game.id )
                                 ));
            });

    $("#gameList > tr > td").on("click", function( event ) {
                                  var gameId = $(event.target).attr("game-id");
                                  var gameName = $(event.target).text();
                                  if (window.confirm("Join " + gameName + "?")) {
                                    client.joinGame( gameId );
                                    console.log("You've joined " + gameName +"("+ gameId +")");
                                    joinedGameId = gameId;
                                  }
                                });
  }
};

/**
 * Hook up events to server messages after login
 */
function initServerEvents() {
  client.listenForIMs( EventHandler.onNewChatMessage );
  client.listenForLobbyStateChange( EventHandler.onLobbyStateChange );
  client.listenForGameStateChange( EventHandler.onGameStateChange );
}


//----------------------------------------------------------------------
/**
 * Send events to the server
 */
//----------------------------------------------------------------------

// Send new chat message to server for rebroadcast
$('form[name="newMessage"]').submit(
  function(){
    var msg = $('#msg').val();
    client.sendIM( msg );
    // $("#messages").append( $("<li/>").text( msg ));
    // keep scrolled to the bottom
    // $("#messages").animate({ scrollTop: 0}, 200);
    $('#msg').val('');
    return false;
  });


// change our user name on the server
$('form[name="login"]').submit(
  function(){
    var name = $('#newUsername').val();
    $(".spinner").show();

    client.login( name )
      .then(
        function( data ) {
          player = data;

          client.connectToServer( player );
          initServerEvents();

          $(".spinner").hide();
          $("#name").text("Welcome, " + player.name + " (" + player.id + ")");
          document.title = player.name;
          $('.page1').hide();
          $('.page2').show();
        })
      .catch(
        function( reason ) {
          console.error("Rejected promise ("+reason+").");
        });


    return false;
  });


// Create a new card table on the server
$('form[name="newGameName"]').submit(
  function(){
    var name = $('#gameName').val();
    if (Lobby.gameNames[name]) {
      window.alert("A game called " + name +  " already exists");
    } else {
      client.createGame( name );
    }
    return false;
  });

//----------------------------------------------------------------------
