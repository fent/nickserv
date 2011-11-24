var irc = require('irc')
  , vsprintf = require('sprintf').vsprintf
  , MemoryStore = require('./MemoryStore.js')
  , errors = require('./replies.js').error
  ;


// provides a "middleware" like API
// if `next` is called with a msg, it stops
// can be called multiple times
// if called with no arguments it calls the next middleware
var next = function(self, middleware, args) {
  var i = 0;

  var next = function() {
    // call next middleware if no error
    if (arguments.length === 0) {
      middleware[i++].apply(self, args);


    // if there is an error/success,
    // call reply with the response msg
    } else {
      var a = [args[1]].concat(Array.prototype.slice.apply(arguments));
      self.reply.apply(self, a);
    }
  };

  // invoke next() once to start
  args.unshift(next);
  next();
};


var extend = function(a, b) {
  for (var i in b) {
    if (!a[i]) {
      a[i] = b[i];
    }
  }
};

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
}

util.inherits(NickServ, irc.Client);

NickServ.prototype.userConnected = function() {
  this.store.userConnected.apply(this.store, arguments);
};

NickServ.prototype.userDisconnected = function() {
  this.store.userDisconnected.apply(this.store, arguments);
};

NickServ.prototype.reply = function() {
  var args = Array.prototype.slice.call(arguments)
    , nick = args.shift()
    , msg = args.shift()
    ;

  this.say(nick, vsprintf(msg, args || []));
};

NickServ.prototype.commands = require('./commands.js');
