/**
 * Create a client to talk to the server, and hook up the forms to create server events
 */

var client = new Client();

function onNewMessage( data ) {
  $('#messages').append( $('<li/>').text( data.user + ": " +  data.msg ));
  $("#messages").animate({ scrollTop: $('#messages')[0].scrollHeight}, 500);
};

function onStateChange( state ) {
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
                                }
                              });
};

client.listenForIMs( onNewMessage );
client.listenForStateChange( onStateChange );


// Send new chat message to server for rebroadcast
$('form[name="newMessage"]').submit(
  function(){
    var msg = $('#msg').val();
    client.sendIM( msg );
    // $("#messages").append( $("<li/>").text( msg ));
    $('#msg').val('');
    // keep scrolled to the bottom
    $("#messages").animate({ scrollTop: $('#messages')[0].scrollHeight}, 500);
    return false;
  });


// change our user name on the server
$('form[name="username"]').submit(
  function(){
    var name = $('#newUsername').val();
    client.setUserName( name );
    $("#name").text("Welcome, " + name );
    document.title = name;
    $('.page1').hide();
    $('.page2').show();
    return false;
  });


// Create a new table on the server
$('form[name="newGameName"]').submit(
  function(){
    var name = $('#gameName').val();
    client.createGame( name );
    return false;
  });
