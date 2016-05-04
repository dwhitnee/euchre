//----------------------------------------------------------------------
// websocket server endpoint
//----------------------------------------------------------------------

function onConnect(socket) {
  console.log('a user connected');

  socket.on('messageEvent', function(msg) {
              console.log('message: ' + msg);
              socket.broadcast.emit('messageEvent', "User X said " + msg);
            });

  socket.on('disconnect', function(){
              console.log('user disconnected');
            });
};

var socketServer = {
  init: function( http ) {
    var io = require('socket.io')(http);

    io.on('connection', onConnect );
  }
};


module.exports = socketServer;
