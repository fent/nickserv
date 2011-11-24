var   fs = require('fs'),
    path = require('path'),
  assert = require('assert'),
    http = require('http'),

     irc = require('irc'),
nickserv = require('../lib/nickserv.js'),

  server = require('optimist').argv.server || null,
       l = require('optimist').argv.logic;


// mock the irc module if logic is set
var irc = require(server === null ? './mock/irc' : 'irc');

// if logic is set, more tests will run that will test the functionality
// of the program where it doesn't need to send anything to NickServ
// this helps avoid excesive connections to an irc server when testing
global.logic = l ? function(o) {
  return o;
}
: function(o, a) {
  return a || {};
};


// converst str to cammel case
// thank you: tjholowaychuk
function camelcase(str) {
  var parts = str.toLowerCase().split(/\s+/);
  var buf = parts.shift();
  return buf + parts.map(function(part){
    return part[0].toUpperCase() + part.slice(1);
  }).join('');
}


// add NickServError type checking to assert
assert.type = function(errtype, nick) {
  errtype = camelcase(errtype);
  return function(n, err, bot) {
    assert.equal(nick, bot.nick);
    assert.ok(err);
    assert.include(err, 'type');
    assert.equal(err.type, errtype);
  };
};


var table = {};
// returns a unique nick that probably isnt being used
global.uniqueNick = function() {
  var nick;
  do {
    nick = 'nickbot' + Math.floor(Math.random() * 100000);
  } while(table[nick] !== undefined);

  table[nick] = true;
  return nick;
};

// macros
var createBot = function(type, nick, fn, log, options) {
    // make server folder if it doesn't exist
    var dir = __dirname + '/logs/'
    if (!path.existsSync(dir)) {
      fs.mkdirSync(dir, 0744);
    }

    dir += server;
    if (!path.existsSync(dir)) {
      fs.mkdirSync(dir, 0744);
    }

    // make fn folder
    dir += '/' + fn;

    // append txt to file
    var fd, append = function(txt) {
      if (!fd) {
        if (!path.existsSync(dir)) {
          fs.mkdirSync(dir, 0744);
        }

        // create log file only if append is called at least once
        fd = fs.openSync(dir + '/' + type + '.log', 'w', 0744);
      }
      var buffer = new Buffer(txt + '\n');
      fs.writeSync(fd, buffer, 0, buffer.length);
    };

    // create irc client instance
    var bot = new irc.Client(server, nick, {
      autoConnect: false,
      debug: false
    });
    bot.log = log !== undefined ? log : true;
    //bot.log = true

    // attach nickserv object to client
    nickserv.create(bot, options);

    // log all notices
    bot.nickserv.on('notice', function(msg) {
      if (bot.log) {
        append('NickServ: ' + msg);
      }
    });

    // log what the bot tells nickserv
    bot.nickserv.on('send', function(msg) {
      if (bot.log) {
        append(bot.nick + ': ' + msg);
      }
    });

    // when this bot disconnect, close log file
    bot.kill = function(cb) {
      var args = Array.prototype.slice.call(arguments).slice(1);
      bot.disconnect(function() {
        setTimeout(function() {
          cb.apply(null, args);
        }, 100);
      });
      if (fd) {
        fs.close(fd);
      }
    };

    return bot;
  },

  error = function(type, nick, fn, args) {
    var obj = {
      topic: function(bot) {
        var cb = this.callback;

        args.push(function(err) {
          bot.kill(cb, null, err, bot);
        });

        if (!bot) {
          bot = createBot(type, nick, fn);
          bot.connect(function() {
            bot.nickserv[fn].apply(bot.nickserv, args);
          });
        } else {
          bot.nickserv[fn].apply(bot.nickserv, args);
        }
      }
    };
    obj[type] = assert.type(type, nick);
    return obj;
  },

  success = function(nick, fn, args, realType, realFn) {
    return {
      topic: function(bot) {
        var cb = this.callback;

        args.push(function(err) {
          bot.log = true;
          if (!realType) {
            bot.kill(cb, err, bot);
          } else {
            cb(err, bot);
          }
        });

        if (!bot) {
          bot = createBot(realType || 'Success', nick, realFn || fn,
              realType ? false : true);
          bot.connect(function() {
            bot.nickserv[fn].apply(bot.nickserv, args);
          });
        } else {
          bot.nickserv[fn].apply(bot.nickserv, args);
        }
      },
      'Success': function(err, bot) {
        assert.equal(nick, bot.nick);
        assert.isTrue(!err, err ? err.message : undefined);
      }
    };
  },
  functions = ['register', 'verify', 'isRegistered', 'info',
               'identify', 'logout', 'setPassword', 'drop'],
  first = {
    'identify': ['register', 'verify', 'identify', 'setPassword', 'info',
                 'logout', 'drop'],
    'register': ['register', 'drop'],
    'isRegistered': ['register']
  };

// make shortcuts for macros
for (var i in functions) {
  (function(fn) {
    global[fn] = function(type, nick, args) {
      return error(type, nick, fn, args);
    };

    global[fn].success = function(nick, args, realType, realFn) {
      return success(nick, fn, args, realType, realFn);
    };
  })(functions[i]);
}

// special case for isRegistered since it doesn't return an error
isRegistered.success = function(nick, args, realType, realFn) {
  var bot,
      checknick = args[0],
      registered = args[1];
      type = registered ? 'Registered' : 'Not Registered';
  var obj = {
    topic: function() {
      var cb = this.callback;
      bot = createBot(realType || type, nick, realFn || 'isRegistered',
          realType ? false : true);

      bot.connect(function() {
        bot.nickserv.isRegistered(checknick, function(err, result) {
          bot.log = true;
          if (!realType) {
            bot.kill(cb, err, bot, result);
          } else {
            cb(err, bot, result);
          }
        });
      });
    }
  };

  obj[type] = function(err, bot, result) {
    assert.isTrue(!err, err ? err.message : undefined);
    assert.equal(result, registered);
  };

  return obj;
};


// special case for functions where they need
// to be identified first before they can be used
for (var k in first) {
  (function(fn1) {
    for (var j in first[fn1]) {
      (function(fn2) {
        global[fn1][fn2] = function(type, nick, args1, args2) {
          var obj = global[fn1].success(nick, args1, type, fn2);
          if (fn1 === 'identify') {
            obj.Identified = obj.Success;
            delete obj.Success;
          } else if (fn1 === 'register') {
            obj.Registered = obj.Success;
            delete obj.Success;
          }

          obj[''] = global[fn2](type, nick, args2);
          return obj;
        };

        global[fn1][fn2].success = function(nick, args1, args2) {
          var obj = global[fn1].success(nick, args1, fn1 + '-Success', fn2);
          if (fn1 === 'identify') {
            obj.Identified = obj.Success;
            delete obj.Success;
          } else if (fn1 === 'register') {
            obj.Registered = obj.Success;
            delete obj.Success;
          }

          obj[''] = global[fn2].success(nick, args2);
          return obj;
        };
      })(first[fn1][j]);
    }
  })(k);
}


// custom macro function for testing control flow in ready() function
global.ready = function(nick, options, emit, dontemit, type) {
  // setup flow object to keep track of what gets emitted
  var emitters = emit.concat(dontemit),
        events = {};
  for (var e in emitters) {
    events[emitters[e]] = false;
  }

  var obj = {
    topic: function() {
      var cb = this.callback,
         bot = createBot(type || emitters[emitters.length - 1],
                 nick, 'ready', true, options);

      for (var e in emitters) {
        (function(event) {
          bot.nickserv.once(event, function() {
            events[event] = true;
          });
        })(emitters[e]);
      }
      bot.nickserv.ready(function(err) {
        bot.kill(cb, null, err, bot);
      });
    }
  };

  if (type) {
    obj[type] = assert.type(type, nick);
  } else {
    obj.Ready = function(n, err, bot) {
      assert.equal(nick, bot.nick);
      assert.isTrue(!err, err ? err.message : undefined);
    };
  }

  for (var e in emit) {
    (function(event) {
      obj['Emitted: ' + event] = function() {
        assert.isTrue(events[event]);
      };
    })(emit[e]);
  }

  for (var e in dontemit) {
    (function(event) {
      obj['Did Not Emit: ' + event] = function() {
        assert.isFalse(events[event]);
      };
    })(dontemit[e]);
  }

  return obj;
};
