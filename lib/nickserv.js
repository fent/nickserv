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
      var blob, checkError, checkSuccess, dcb, identified, listen, nickserv, orignick, queues, registered, verifyCmd;
      this.options = options != null ? options : {};
      listen = function(notice) {
        return irc.on('notice', function(nick, to, text) {
          if (nick === 'NickServ') {
            return notice(text);
          }
        });
      };
      this.send = __bind(function(cmd) {
        var args, msg;
        args = Array.prototype.slice.call(arguments).slice(1);
        msg = cmd + ' ' + args.join(' ');
        irc.say('NickServ', msg);
        return this.emit('send', msg);
      }, this);
      blob = '';
      listen(__bind(function(text) {
        blob += text + '\n';
        this.emit('notice', text);
        return this.emit('blob', blob);
      }, this));
      registered = identified = false;
      orignick = irc.nick;
      irc.on('registered', function() {
        return registered = identified = false;
      });
      irc.on('nick', function(oldnick, newnick) {
        if (oldnick === orignick) {
          orignick = newnick;
          return registered = identified = false;
        }
      });
      this.on('isregistered', function(result, nick) {
        if (nick === irc.nick) {
          return registered = result;
        }
      });
      this.on('identified', function() {
        return identified = registered = true;
      });
      this.on('loggedout', function() {
        return identified = false;
      });
      this.on('registered', function() {
        return identified = registered = true;
      });
      this.on('dropped', function(nick) {
        if (nick === irc.nick) {
          return identified = registered = false;
        }
      });
      irc.isConnected = function() {
        var _ref;
        return (_ref = irc.conn) != null ? _ref.connected : void 0;
      };
      irc.connect = (function(connect) {
        return function(retry, callback) {
          if (typeof retry === 'function') {
            callback = retry;
            retry = void 0;
          }
          irc.once('registered', callback);
          return connect.call(irc, retry);
        };
      })(irc.connect);
      irc.disconnect = (function(disconnect) {
        return function(msg, callback) {
          if (typeof msg === 'function') {
            callback = msg;
            msg = void 0;
          }
          irc.conn.once('end', callback);
          return disconnect.call(irc, msg);
        };
      })(irc.disconnect);
      dcb = __bind(function(err) {
        return this.emit('error', err);
      }, this);
      checkError = __bind(function(notices, text, wait, cb, args) {
        var error, m, name, result, _i, _len, _ref, _ref2;
        _ref = notices.error;
        for (name in _ref) {
          error = _ref[name];
          if (error.match) {
            _ref2 = error.match;
            for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
              m = _ref2[_i];
              result = m.exec(text);
              if (result !== null) {
                this.removeListener('blob', wait);
                new NickServError(cb, name, notices, args, result);
                blob = '';
                return true;
              }
            }
          }
        }
        return false;
      }, this);
      checkSuccess = __bind(function(notices, text, wait, cb) {
        var m, result, _i, _len, _ref;
        _ref = notices.success;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          result = m.exec(text);
          if (result) {
            this.removeListener('blob', wait);
            blob = '';
            return cb(null, result);
          }
        }
        return false;
      }, this);
      queues = {};
      nickserv = __bind(function(cmd, args, cb, notices, args2) {
        var _ref;
        if ((_ref = queues[cmd]) == null) {
          queues[cmd] = async.queue(__bind(function(task, callback) {
            var newcb, wait;
            newcb = function() {
              task.cb.apply(null, arguments);
              return callback();
            };
            wait = function(text) {
              if (!checkError(task.notices, text, wait, newcb, task.args)) {
                return checkSuccess(task.notices, text, wait, newcb);
              }
            };
            return this.on('blob', wait);
          }, this), 1);
        }
        queues[cmd].push({
          cb: cb,
          notices: notices,
          args: args2
        });
        return this.send.apply(this, [cmd].concat(args));
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
        return this.info(nick, __bind(function(err) {
          registered = (err != null ? err.type : void 0) !== 'notregistered';
          this.emit('isregistered', registered, nick);
          return cb(null, registered);
        }, this));
      };
      this.info = function(nick, cb) {
        var newcb;
        if (nick == null) {
          nick = irc.nick;
        }
        if (cb == null) {
          cb = dcb;
        }
        this.emit('gettinginfo');
        if (test.nick(nick)) {
          return new NickServError(cb, 'invalidnick', notices.info, [nick]);
        }
        newcb = __bind(function(err, result) {
          var info;
          if (err) {
            return cb(err);
          }
          console.log(result);
          info = {
            nick: result[1],
            realname: result[2]
          };
          if (result[4]) {
            info.online = result[4] === 'online' ? true : false;
          } else if (result[6]) {
            info.online = true;
            info.host = result[6];
          }
          info.registered = result[7];
          if (result[9]) {
            info.lastseen = result[9];
          }
          if (result[11]) {
            info.lastquitmsg = result[11];
          }
          if (result[13]) {
            info.email = result[13];
          }
          if (result[14]) {
            info.options = result[14].split(', ');
          }
          console.log(info);
          this.emit('info', info);
          return cb(null, info);
        }, this);
        return nickserv('info', [nick, 'all'], newcb, notices.info, [nick]);
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
        return nickserv('identify', [password], newcb, notices.identify, [irc.nick]);
      };
      this.logout = function(cb) {
        var newcb;
        if (cb == null) {
          cb = dcb;
        }
        this.emit('loggingout');
        if (!this.isIdentified()) {
          return new NickServError(cb, 'notidentified', notices.logout);
        }
        newcb = __bind(function() {
          this.emit('loggedout');
          return cb();
        }, this);
        return nickserv('logout', [], newcb, notices.logout);
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
          var time;
          if (err) {
            if (err.type === 'toosoon') {
              time = parseInt(err.match[1]);
              setTimeout(__bind(function() {
                return this.register(password, email, cb);
              }, this), time * 1000);
            } else {
              if (err) {
                cb(err);
              }
            }
            return;
          }
          this.emit('registered');
          return cb();
        }, this);
        return nickserv('register', [password, email], newcb, notices.register, [email]);
      };
      this.drop = function(nick, cb) {
        var newcb;
        if (nick == null) {
          nick = irc.nick;
        }
        if (cb == null) {
          cb = dcb;
        }
        this.emit('dropping');
        if (!this.isIdentified()) {
          return new NickServError(cb, 'notidentified', notices.drop);
        }
        if (test.nick(nick)) {
          return new NickServError(cb, 'invalidnick', notices.drop, [nick]);
        }
        newcb = __bind(function(err) {
          if (err) {
            return cb(err);
          }
          this.emit('dropped');
          return cb();
        }, this);
        return nickserv('drop', [nick], newcb, notices.drop, [nick]);
      };
      verifyCmd = 'verify';
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
            if (err.type === 'unknowncommand' && (verifyCmd = 'verify')) {
              verifyCmd = 'confirm';
              this.verify(nick, key, cb);
              return;
            } else {
              if (err) {
                return cb(err);
              }
            }
          }
          this.emit('verified');
          return cb();
        }, this);
        return nickserv('verify register', [nick, key], newcb, notices.verifyRegistration, [nick]);
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
        return nickserv('set password', [password], newcb, notices.setPassword, [password]);
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
