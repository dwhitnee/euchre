/**
 *  Set up the Express Application to handle incoming requests
 */

var Express = require('express');
var app = Express();

var euchreRouter = require('requestHandlers/gameResponses');
var AuthHandlers = require("requestHandlers/auth");

// request processing
var bodyParser = require('body-parser');
app.use( bodyParser.json() );  // parse application/json into response.body  LAME!

// assets and route handlers
app.use('/', Express.static(__dirname + '/public'));
app.use('/game', euchreRouter);
app.post('/login', AuthHandlers.login );

// Single page app
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

module.export = app;
