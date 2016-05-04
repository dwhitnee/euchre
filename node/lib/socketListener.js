//----------------------------------------------------------------------
// websocket server endpoint
//----------------------------------------------------------------------

var users = [];
var id = 1;
function onConnect(socket) {
  console.log('a user connected');

  socket.on('messageEvent', function( data ) {
              console.log('message: ' + data.msg);
              socket.broadcast.emit(
                'messageEvent',
                {
                  user: data.user,
                  msg: data.msg
                });
            });

  socket.on('username', function( username ) {
              console.log('New user! ' + username );
              users.push( { id: id++, name: username });
              socket.broadcast.emit('messageEvent',
                                    "User " + username + " joined");
            });

  socket.on('disconnect', function(){
              console.log('user disconnected');
            });
};

var io;

var server = {
  init: function( http ) {
    io = require('socket.io')(http);

    io.on('connection', onConnect );
  },
  broadcastState: function() {
    // sends to all sockets
    io.emit('stateUpdate',
            {
              fun: true,
              gimme: "chocolate",
              dogs: 4
            });

  }
};


module.exports = server;
