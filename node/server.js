// Create the app and web socket manager and hook them up to the http server

var app = require("app")( __dirname );
var httpServer = require('http').Server( app );

var socketMgr = require("socketMgr");
socketMgr.attach( httpServer );

// start server
httpServer.listen(3000, function(){
  console.log('listening on *:3000');
});
