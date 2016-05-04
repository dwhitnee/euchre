// Node server

var express = require('express');
var app = express();
var http = require('http').Server(app);
var socketListener = require('socketListener');

socketListener.init( http );

app.use("/", express.static(__dirname + '/public'));
// app.use( express.static('public'));

// route handlers
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/update', function(req, res) {
          socketListener.broadcastState();
          res.send();
});


// start server
http.listen(3000, function(){
  console.log('listening on *:3000');
});
