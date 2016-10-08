//----------------------------------------------------------------------
// One game, complete with players and a way to update everyone involved when state changes.
//
// This should be refactored out, but it is here for now:
// Global network manager for all game updates and chat messages.
//----------------------------------------------------------------------

const WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS";
const READY_TO_START = "READY_TO_START";
const CHOOSE_DEALER = "CHOOSE_DEALER";
const NEW_DEALER = "NEW_DEALER";

const PICK_UP_TRUMP = "PICK_UP_TRUMP";  // first round of bidding
const DECLARE_TRUMP = "DECLARE_TRUMP";  // second round of bidding

const DISCARD = "DISCARD";
const PLAY = "PLAY";

// WebSocket events for updates to clients.  This really doesn't belong here.
const chatMessageEvent = "chatMessage";
const lobbyStateUpdateEvent = "lobbyStateUpdate";
const gameStateUpdateEvent  = "gameStateUpdate";

var Deck = require("euchre/deck");

var _games = {};
var _gameNames = {}; // hash of game names so client can display and check for uniqueness
var _switchboard;   // network (socket) communications manager

var _lobby;    // special room everyone joins first

//----------------------------------------
class Game {
  constructor( options ) {
    this.id = Game.nextId++;
    this.name = options.name || "Unknown";
    this.createdBy = options.createdBy || "Unknown";  // what is this used for? deletion? FIXME
    this.players = {};
    this.seats = [];  // 0,1,2,3 -- NESW
    this.deck = new Deck();
    this.init();
  };

  delete() {
    _games[this.id] = undefined;
    _gameNames[this.name] = undefined;
    _switchboard.deleteRoom( this.getChatRoomName() );
  }

  init() {
    this.scores = [0,0];
    this.action = WAITING_FOR_PLAYERS;  // FIXME?
  }

  get name() {
    return this._name;
  }
  set name( name ) {
    this._name = name;
    console.log(`New game name: ${this.name}`);
  }

  /**
   * Add player to room, but don't take a seat at the table yet.
   */
  addPlayer( player ) {
    // remove player from previous game
    if (player.gameId) {
      var oldGame = Game.getById( player.gameId );
      oldGame.removePlayer( player );
    }

    this.players[player.id] = player;
    _switchboard.joinRoom( player.id, this.getChatRoomName() );
    player.gameId = this.id;
  }

  /**
   * Not necessary to call externally, addPlayer handles cleanup.
   * Remove player from game room and chair (if occupied)
   * switchboard handles its own cleanup, too
   */
  removePlayer( player ) {
    // delete this.players[player.id];    // bad performance?
    this.players[player.id] = undefined;

    for (var i=0; i < 4; i++) {
      if (this.seats[i] && (this.seats[i].id === player.id)) {
        this.seats[i] = undefined;
        this.action = WAITING_FOR_PLAYERS;
        // FIXME - if game started, need to abandon/pause?
      }
    }

  }

  // move to dealer-picking state, ask first player to pick a card
  enterPickDealerState() {
    this.deck.shuffle();
    this.dumpPlayerCards();
    this.action = CHOOSE_DEALER;
    this.activePlayerSeat = 0;

    // once all players have picked a card a dealer will be chosen
  }

  // waiting for someone to click to start the game
  enterNewDealerState() {
    this.action = NEW_DEALER;

  }

  // have each player pick a card to see who is dealer, move to next seat, or start the deal.
  pickACard( player ) {
    var cards = this.deck.deal( 1 );
    console.log("Dealt cards: " + cards );
    player.addCards( cards );

    // everyone's picked a card now
    if (this.activePlayerSeat === 3) {
      this.chooseDealer();
      this.enterNewDealerState();
      // this.start();      // deal cards, start game

    } else {
      this.activePlayerSeat++;
    }
  }

  /**
   * Pick player with best card to deal
   */
  chooseDealer() {
    var bestSeat;
    var bestCard;

    for (var i=0; i < this.seats.length; i++) {
      var seat = this.seats[i];
      var card = seat.cards[0];

      if (!bestCard || card.isHigherThan( bestCard )) {
        bestCard = card;
        bestSeat = i;
      }
    }
    console.log("High card is " + bestCard.toString());
    this.dealerSeat = bestSeat;
    this.activePlayerSeat = this.dealerSeat;
  }

  /**
   * throw in cards, shuffle, deal, and start a new hand
   */
  start() {
    this.dumpPlayerCards();
    this.deck.shuffle();
    this.setActivePlayerToLeftOfDealer();
    this.deal();
    this.action = PICK_UP_TRUMP; // ?
  }

  dumpPlayerCards() {
    for (var id in this.players) {
      this.players[id].cards = [];
    }
  }

  /**
   * deal 5 cards to each seated player
   */
  deal() {
    var numCardsToDeal = 5;
    var cards;

    this.setActivePlayerToLeftOfDealer();

    console.log( JSON.stringify( this, null, 2 ));

    for (var i = 0; i < Object.keys( this.seats ).length; i++) {
      console.log("Active player: " + this.activePlayerSeat );
      console.log("Dealing to " + this.getActivePlayer().name );

      cards = this.deck.deal( numCardsToDeal );
      this.getActivePlayer().addCards( cards );
      this.rotatePlayer();
    }
  }

  pass() {
    this.rotatePlayer();
    if (this.activePlayerSeat === this.dealerSeat) {
      // either open bidding or end game
      if (this.action === DECLARE_TRUMP) {
        this.endGame();
      }
    }
  }

  /**
   * @param player obj
   * @param seat id from 0 to 3
   */
  pickSeat( player, seat ) {
    // leave any other seat
    for (var i=0; i < 4; i++) {
      if (this.seats[i] === player) {
        this.seats[i] = undefined;
      }
    }
    this.seats[seat] = player;  // steal seat if we must

    var readyToStart = true;
    for (i=0; i < 4; i++) {
      if (this.seats[i] === undefined) {
        readyToStart = false;
      }
    }
    if (readyToStart) {
      this.action = READY_TO_START;
    } else {
      this.action = WAITING_FOR_PLAYERS;
    }
  }

  get action() {
    return this._action;
  }
  set action( action ) {
    this._action = action;
    console.log(`Game action is now ${this.action}`);
  }

  get dealerSeat() {
    return this._dealerSeat;
  }
  /**
   * @param seat is seat 0,1,2,or 3  (N, E, S, W)
   */
  set dealerSeat( seatId ) {
    this._dealerSeat = seatId;
    console.log(`Dealer is #${this.dealerSeat} (${this.seats[this.dealerSeat].name})`);
  }
  setActivePlayerToLeftOfDealer() {
    if (this.dealerSeat === undefined) {
      console.err("Dealer not picked yet");
    }
    this.activePlayerSeat = (this.dealerSeat + 1) % 4;
  }
  /**
   * Rotat functions move around the table clockwise.
   */
  rotateDealer() {
    this.dealerSeat += 1;
    this.dealerSeat %= 4;
  }
  rotatePlayer() {
    this.activePlayerSeat += 1;
    this.activePlayerSeat %= 4;
  }
  getActivePlayer() {
    return this.seats[ this.activePlayerSeat ];
  }

  // name for webSocket multicast room
  getChatRoomName() {
    return this.id;
  }

  /**
   * Tell all memebers of group this message (and who from)
   */
  sendChat( msg, from ) {
    var data = {
      user: from.name,
      msg: msg
    };
    _switchboard.multicast( this.getChatRoomName(), chatMessageEvent, data );
    console.log( from.name + ": " + msg);
  }

  // Tell all members of game our current state
  sendState() {
    console.log( JSON.stringify( this, null, 2 ));
    _switchboard.multicast( this.getChatRoomName(), gameStateUpdateEvent, this );
  }
  sendLobbyState() {
    var data = {
      players: this.players,
      games: _games,
      gameNames: _gameNames
    };
    _switchboard.multicast( this.getChatRoomName(), lobbyStateUpdateEvent, data );
  }

  /**
   * THis is needed so underscore properties are not serialized
   */
  toJSON() {
    return {
      // deck: this.deck,
      id: this.id,
      name: this.name,
      createdBy: this.createdBy,
      players: this.players,
      seats: this.seats,
      scores: this.scores,
      action: this.action,
      dealerSeat: this.dealerSeat,
      activePlayerSeat: this.activePlayerSeat
    };
  }
}

// static class variables
Game.nextId = 1000;


//----------------------------------------------------------------------
// Game Factory
//----------------------------------------------------------------------

/**
 * Special "game" that holds all players not in a game.
 */
Game.getLobby = function() {
  return _lobby;
};

// really should instantiate GameFactory with switcboard  FIXME?
Game.setSwitchboard = function( switchboard ) {
  _switchboard = switchboard;

  _lobby = _lobby || Game.newGame({ name: "Lobby" });
};

/**
 * @return player oject by name
 */
Game.getById = function( id ) {
  return _games[id];
};

/**
 * @return game oject by name
 */
Game.getByName = function( name ) {
  for (var id in _games) {    // $.each also works, but no good analog yet
    var game = _games[id];
    if (game.name === name) {
      return game;
    }
  }
  return undefined;
};


/*
Game.getByPlayerId = function( playerId ) {
  // for (var id in _games) {    // $.each also works, but no good analog yet
  //   var game = _games[id];
  //   if (game.id === gameId) {
  //     return game;
  //   }
  // }
  return undefined;

//  return _games[id];
};
 */

/**
 * Create a new game and add to the pool. Also create websocket multicast room
 * { name: "My neat game", createdBy: 1002 }
 */
Game.newGame = function( options ) {
  var game = Game.getByName( options.name );

  if (!options || !options.name) {
    console.error("No options.name provided for new game");
    return undefined;
  }

  if (!game) {
    game = new Game( options );
    _games[game.id] = game;
    _gameNames[game.name] = game.id;  // reverse lookup for uniqueness constraint

    _switchboard.createRoom( game.getChatRoomName() );
  }

  return game;
};


module.exports = Game;
