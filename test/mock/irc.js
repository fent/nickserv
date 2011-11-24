var EventEmitter = require('events').EventEmitter
            util = require('util'),
       IRCServer = require('./server');


var servers = {};


exports.Client = Client = function(server, nick, options) {
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
