// Node server

var express = require('express');
var app = express();
var http = require('http').Server(app);
var socketListener = require('socketListener');

socketListener.init( http );

app.use("/", express.static(__dirname + '/public/js'));
// app.use( express.static('public'));
// app.use('', express.static('public/js'));

// route handlers
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


// start server
http.listen(3000, function(){
  console.log('listening on *:3000');
});
