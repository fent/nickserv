var mw = require('./middleware.js');
var errors = require('./replies.js').errors;
var success = require('./replies.js').success;


exports.info = [
  mw.networkServices,
  mw.isRegistered,

  function(next, nick, target) {
    this.store.info(nick, target, function(info) {
      next(success.info.who, nick, info.whois);
      if (info.online) {
        next(success.info.online, nick);
        next(success.info.from, info.from);
      } else {
        next(success.info.offline, nick);
      }
      next(success.info.registered, info.registered);
      next(success.info.lastSeen, info.lastSeen);
      next(success.info.lastQuitMsg, info.lastQuitMsg);
      next(success.info.email, info.email);
      next(success.info.options, info.options.join(' '));
    });
  }
];


exports.identify = [
  mw.amRegistered,

  function(next, nick, password) {
    this.store.identify(nick, password, function(err) {
      var msg = err ? errors.wrongPassword : success.identify;
      next(msg, nick);
    });
  }
];


exports.logout = [
  function(next, nick) {
    this.store.logout(nick, function() {
      next(success.logout);
    });
  }
];


exports.register = [
  mw.notEnoughParameters(2, 'register'),
  mw.checkEmail,
  mw.tooManyAccounts,
  mw.alreadyRegistered,
  mw.tooSoon,

  function(next, nick, password, email) {
    this.store.register(nick, password, email, function() {
      next(success.register, nick);
    });
  }
];


exports.drop = [
  mw.isRegistered,
  mw.accessDenied,

  function(next, nick, target) {
    this.store.drop(nick, target, function() {
      next(success.drop, target || nick);
    });
  }
];


exports.verify = [
  mw.unknownCommand(['register']),
  mw.notEnoughParameters(2, 'verify'),
  mw.notAwaitingAuthorization,

  function(next, nick, op, target, key) {
    if (op === 'register') {
      this.store.verify(nick, target, key, function(err) {
        if (err) {
          next(errors.wrongKey, target);
        } else {
          next(success.verify);
        }
      });
    }
  }
];


exports.set = [
  mw.unknownCommand(['password'], 0, 'set'),

  function(next, nick, key, value) {
    if (key === 'password') {
      this.store.setPassword(nick, value, function() {
        next(success.set.password, nick, value);
      });
    }
  }
];
