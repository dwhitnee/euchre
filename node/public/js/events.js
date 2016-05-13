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

  $('#playerList').empty();
  $.each( state.members, function( i, player ) {
            $('#playerList').append( $("<li/>").text( player.name ));
          });
  $('#gameList').empty();

  $.each( state.members, function( i, player ) {
            $('#gameList').append(
              $('<div class="row"/>')
                .append( $('<div class="col-xs-7 col-sm-7 col-lg-9"/>').text( player.name))

            );
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
