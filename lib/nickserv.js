(function() {
  var EventEmitter, Nick, NickServError, async, notices, test;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  async = require('async');
  EventEmitter = require('events').EventEmitter;
  test = require('./regex.js');
  notices = require('./notices.js');
  NickServError = require('./NickServError.js');
  Nick = (function() {
    __extends(Nick, EventEmitter);
    function Nick(irc, options) {
      var checkError, checkSuccess, dcb, identified, listen, nickserv, queues, registered, send;
      this.options = options != null ? options : {};
      listen = function(notice) {
        return irc.on('notice', function(nick, to, text) {
          if (nick === 'NickServ') {
            return notice(text);
          }
        });
      };
      send = function(text) {
        return irc.say('NickServ', text);
      };
      listen(__bind(function(text) {
        return this.emit('notice', text);
      }, this));
      registered = identified = false;
      irc.on('registered', function() {
        return registered = identified = false;
      });
      this.on('isregistered', function(result, nick) {
        if (nick === irc.nick) {
          return registered = result;
        }
      });
      this.on('registered', function() {
        identified = true;
        return registered = true;
      });
      this.on('identified', function() {
        identified = true;
        return registered = true;
      });
      irc.isConnected = function() {
        var _ref;
        return (_ref = irc.conn) != null ? _ref.connected : void 0;
      };
      /*
          irc.connect = ((connect) ->
            (retry, callback) =>
              if typeof retry is 'function'
                callback = retry
                delete retry
              irc.once 'registered', callback
              connect.call(irc, retry)
          )(irc.connect)
      
          # calls callback when disconnected
          irc.disconnect = ((disconnect) ->
            (msg, callback) =>
              if typeof msg is 'function'
                callback = msg
                delete msg
              irc.conn.once 'end', callback
              disconnect.call(irc, msg)
          )(irc.disconnect)
          */
      dcb = __bind(function(err) {
        console.log(err);
        return this.emit('error', err);
      }, this);
      checkError = __bind(function(notices, text, wait, cb, args) {
        var error, m, name, _i, _len, _ref, _ref2;
        _ref = notices.error;
        for (name in _ref) {
          error = _ref[name];
          if (error.match) {
            _ref2 = error.match;
            for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
              m = _ref2[_i];
              if (((m.test != null) && m.test(text)) || m === text) {
                this.removeListener('notice', wait);
                new NickServError(cb, name, notices, args);
                return true;
              }
            }
          }
        }
        return false;
      }, this);
      checkSuccess = __bind(function(notices, text, wait, cb) {
        var m, _i, _len, _ref;
        _ref = notices.success;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          if (((m.test != null) && m.test(text)) || m === text) {
            this.removeListener('notice', wait);
            return cb();
          }
        }
        return false;
      }, this);
      queues = {};
      nickserv = __bind(function(cmd, msg, cb, notices, args) {
        var _ref;
        if ((_ref = queues[cmd]) == null) {
          queues[cmd] = async.queue(__bind(function(task, callback) {
            var newcb, wait;
            newcb = function(err) {
              task.cb(err);
              return callback();
            };
            wait = function(text) {
              if (!checkError(task.notices, text, wait, newcb, task.args)) {
                return checkSuccess(task.notices, text, wait, newcb);
              }
            };
            return this.on('notice', wait);
          }, this), 1);
        }
        queues[cmd].push({
          cb: cb,
          notices: notices,
          args: args
        });
        msg = cmd + ' ' + msg;
        send(msg);
        return this.emit('send', msg);
      }, this);
      this.ready = function(cb, options) {
        var connected;
        if (cb == null) {
          cb = dcb;
        }
        if (options == null) {
          options = this.options;
        }
        connected = __bind(function() {
          if (options.password) {
            return this.isRegistered(irc.nick, __bind(function(err, registered) {
              if (registered) {
                return this.identify(options.password, cb);
              } else {
                if (options.email) {
                  return this.register(options.password, options.email, cb);
                } else {
                  return new NickServError(cb, 'notregistered', notices.isRegistered, [irc.nick]);
                }
              }
            }, this));
          } else {
            return cb();
          }
        }, this);
        if (irc.isConnected()) {
          return connected();
        } else {
          return irc.connect(connected);
        }
      };
      this.isIdentified = function() {
        return identified;
      };
      this.isRegistered = function(nick, cb) {
        if (cb == null) {
          cb = dcb;
        }
        this.emit('checkingregistered');
        if (!(nick != null)) {
          return registered;
        }
        if (test.nick(nick)) {
          return new NickServError(cb, 'invalidnick', notices.isRegistered, [nick]);
        }
        return nickserv('verify register', "" + nick + " key", (__bind(function(err) {
          registered = err.type === 'registered';
          this.emit('isregistered', registered, nick);
          return cb(null, registered);
        }, this)), notices.isRegistered, [nick]);
      };
      this.identify = function(password, cb) {
        var newcb;
        if (password == null) {
          password = this.options.password;
        }
        if (cb == null) {
          cb = dcb;
        }
        this.emit('identifying');
        if (this.isIdentified()) {
          return new NickServError(cb, 'alreadyidentified', notices.identify);
        }
        if (test.password(password)) {
          return new NickServError(cb, 'invalidpassword', notices.identify, [password]);
        }
        newcb = __bind(function(err) {
          if (err) {
            return cb(err);
          }
          this.emit('identified');
          return cb();
        }, this);
        return nickserv('identify', password, newcb, notices.identify, [irc.nick]);
      };
      this.register = function(password, email, cb) {
        var newcb;
        if (password == null) {
          password = this.options.password;
        }
        if (email == null) {
          email = this.options.email;
        }
        if (cb == null) {
          cb = dcb;
        }
        this.emit('registering');
        if (this.isIdentified()) {
          return new NickServError(cb, 'alreadyidentified', notices.register);
        }
        if (this.isRegistered()) {
          return new NickServError(cb, 'alreadyregistered', notices.register);
        }
        if (test.password(password)) {
          return new NickServError(cb, 'invalidpassword', notices.register, [password]);
        }
        if (test.email(email)) {
          return new NickServError(cb, 'invalidemail', notices.register, [email]);
        }
        newcb = __bind(function(err) {
          if (err) {
            return cb(err);
          }
          this.emit('registered');
          return cb();
        }, this);
        return nickserv('register', "" + password + " " + email, newcb, notices.register, [email]);
      };
      this.verify = function(nick, key, cb) {
        var newcb;
        if (cb == null) {
          cb = dcb;
        }
        this.emit('verifying');
        if (!this.isIdentified()) {
          return new NickServError(cb, 'notidentified', notices.verifyRegistration);
        }
        if (test.nick(nick)) {
          return new NickServError(cb, 'invalidnick', notices.verifyRegistration, [nick]);
        }
        if (test.key(key)) {
          return new NickServError(cb, 'invalidkey', notices.verifyRegistration, [key]);
        }
        newcb = __bind(function(err) {
          if (err) {
            return cb(err);
          }
          this.emit('verified');
          return cb();
        }, this);
        return nickserv('verify register', "" + nick + " " + key, newcb, notices.verifyRegistration, [nick]);
      };
      this.setPassword = function(password, cb) {
        var newcb;
        if (cb == null) {
          cb = dcb;
        }
        this.emit('settingpassword');
        if (!this.isIdentified()) {
          return new NickServError(cb, 'notidentified', notices.setPassword);
        }
        if (test.password(password)) {
          return new NickServError(cb, 'invalidpassword', notices.setPassword, [password]);
        }
        newcb = __bind(function(err) {
          if (err) {
            return cb(err);
          }
          this.emit('passwordset');
          return cb();
        }, this);
        return nickserv('set password', password, newcb, notices.setPassword, [password]);
      };
    }
    return Nick;
  })();
  module.exports = {
    NickServ: Nick,
    create: function(client, options) {
      return client.nickserv = new Nick(client, options);
    }
  };
}).call(this);
