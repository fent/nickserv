var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var IRCServer    = require('./server');


var servers = {};


var Client = exports.Client = function(server, nick) {
  this.server = server;
  this.nick = nick;
};

util.inherits(Client, EventEmitter);


Client.prototype.connect = function(cb) {
  if (servers[this.server] === undefined) {
    servers[this.server] = new IRCServer();
  }

  servers[this.server].connect(this);
  if (typeof(cb) === 'function') {
    cb();
  }
};
