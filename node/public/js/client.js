// open a websocket and send data over it onSubmit

var socket = io();

$('form').submit(
  function(){
    var msg = $('#m').val();
    socket.emit('messageEvent', msg );
    $("#messages").append( $("<li/>").text( msg ));
    $('#m').val('');
    return false;
  });

socket.on('messageEvent', function(msg) {
            $('#messages').append( $('<li/>').text( msg ));
          });
