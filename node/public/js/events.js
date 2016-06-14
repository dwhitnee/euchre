/*global console, $, Client, window, document, GameDisplay */

/**
 * Create a client to talk to the server, and hook up the forms to create server events
 *
 * receive server events
 * send client events
 */

var client = new Client();
var gameDisplay = new GameDisplay( client );

var Lobby = {};   // global state as defined by the server

// var game =  {};   // State of our one game
// var player;  // us

/**
 * What to do when the server sends a update
 */
var EventHandler = {
  /**
   * New Chat message received
   */
  onNewChatMessage: function chat( data ) {
    $('.messages').prepend( $('<li/>').text( data.user + ": " +  data.msg ));
    $(".messages").animate({ scrollTop: 0 }, 100);
  },

  /**
   * One game action occured, not sent to the Lobby or other games
   */
  onGameStateChange: function updateGame( state ) {
    var game = state;
    gameDisplay.updateState( game );


    $(".playerList").empty();
    $(".gameName").text( game.name );
    for (var playerId in game.players) {
      $(".playerList").append( $("<div/>").text( game.players[playerId].name ));
    }
  },

  /**
   * Global metadata update (other players, other game metadata)
   */
  onLobbyStateChange: function updateLobby( lobbyState ) {
    Lobby = lobbyState || Lobby;

    // update player list
    $('#playerList').empty();
    $.each( Lobby.players, function( i, player ) {
              $('#playerList').append(
                $('<tr/>').append( $('<td/>').text( player.name ))
              );
            });

    // update game list
    $('#gameList').empty();
    $("#gameList > tr").off("click");
    // clear events
    $.each( Lobby.games, function( i, game ) {
      if (game.name !== "Lobby") {
        $('#gameList').append(
          $('<tr/>').append( $('<td/>').text( game.name ).attr("game-id", game.id )));
      }
    });

    $("#gameList > tr > td").on("click", EventHandler.onJoinGame );
  },

  /**
   * Game clicked on, let's join
   */
  onJoinGame: function( event ) {
    var gameId = $(event.target).attr("game-id");
    var gameName = $(event.target).text();
    if (window.confirm("Join " + gameName + "?")) {
      $(".messages").empty();  // clear chat

      gameDisplay.showNewGame();

      client.joinGame( gameId );
      console.log("You've joined " + gameName +"("+ gameId +")");
    }
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
  function( event ) {
    var msg = event.target.msg.value;
    client.sendIM( msg );
    event.target.msg.value = "";
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
          var player = data;  // store this where?  FIXME  GameEngine?

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
