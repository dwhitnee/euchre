var server = new Server();

function onNewMessage( data ) {
  $('#messages').append( $('<li/>').text( data.user + ": " +  data.msg ));
};

function onStateChange( state ) {
  $('#state').text( JSON.stringify( state ));
};

server.listenForIMs( onNewMessage );
server.listenForStateChange( onStateChange );


// Send new chat message to server
$('form[name="newMessage"]').submit(
  function(){
    var msg = $('#msg').val();
    server.sendIM( msg );
    $("#messages").append( $("<li/>").text( msg ));
    $('#msg').val('');
    return false;
  });


// Send new user name
$('form[name="username"]').submit(
  function(){
    var name = $('#newUsername').val();
    server.setUserName( name );
    $("#name").text("Welcome, " + name );
    $('form[name="username"').hide();
    return false;
  });
