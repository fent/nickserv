var util = require('util');
var irc = require('irc');
var vsprintf = require('sprintf').vsprintf;
var MemoryStore = require('./MemoryStore.js');
var errors = require('./replies.js').error;


/**
 * Provides a "middleware" like API
 * if `next` is called with a msg, it stops.
 * It can be called multiple times.
 * If called with no arguments it calls the next middleware.
 *
 * @param {Object} self
 * @param {Array.<Function>} middleware
 * @param {Array.<Object>} args
 */
function next(self, middleware, args) {
  var i = 0;

  var done = function() {
    // Call next middleware if no error.
    if (arguments.length === 0) {
      middleware[i++].apply(self, args);


    // If there is an error/success,
    // call reply with the response msg.
    } else {
      var a = [args[1]].concat(Array.prototype.slice.apply(arguments));
      self.reply.apply(self, a);
    }
  };

  // Invoke done() once to start.
  args.unshift(done);
  done();
}


/**
 * Adds properties from `b` to `a` that are not already in `a`.
 *
 * @param {Object} a
 * @param {Object} b
 */
function extend(a, b) {
  for (var i in b) {
    if (!a[i]) {
      a[i] = b[i];
    }
  }
}


/**
 * @constructor
 * @extends {irc.Client}
 * @param {IRC} server
 * @param {MemoryStore} store
 * @param {Object} options
 */
var NickServ = module.exports = function(server, store, options) {
  this.server = server;
  this.store = store || new MemoryStore();
  this.options = options || {};
  extend(this.options, {
    nick: 'NickServ',
    ops: [],
    maxAccounts: 0,
    minBeforeRegister: 0
  });

  var self = this;
  this.on('pm', function(nick, msg) {
    var args = msg.toLowerCase().split(' ');
    var cmd = args.shift();

    process.nextTick(function() {
      if (self.commands[cmd]) {
        args.unshift(nick);
        next(self, self.commands[cmd], args);

      } else {
        self.reply(nick, errors.unknowncommand, cmd);
      }
    });
  });

  irc.Client.call(this, server, this.options.nick, { autoConnect: false });
};

util.inherits(NickServ, irc.Client);

NickServ.prototype.userConnected = function() {
  this.store.userConnected.apply(this.store, arguments);
};

NickServ.prototype.userDisconnected = function() {
  this.store.userDisconnected.apply(this.store, arguments);
};

NickServ.prototype.reply = function() {
  var args = Array.prototype.slice.call(arguments);
  var nick = args.shift();
  var msg = args.shift();

  this.say(nick, vsprintf(msg, args || []));
};

NickServ.prototype.commands = require('./commands.js');
