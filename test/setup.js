var assert    = require('assert');
var util      = require('./util');
var createBot = require('./bot');


function error(type, nick, fn, args) {
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
  obj[type] = util.type(type, nick);
  return obj;
}

function success(nick, fn, args, realType, realFn) {
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
}

var functions = ['register', 'verify', 'isRegistered', 'info',
               'identify', 'logout', 'setPassword', 'drop'];
var first = {
  'identify': ['register', 'verify', 'identify', 'setPassword', 'info',
               'logout', 'drop'],
  'register': ['register', 'drop'],
  'isRegistered': ['register']
};

// Make shortcuts for macros.
functions.forEach(function(fn) {
  exports[fn] = function(type, nick, args) {
    return error(type, nick, fn, args);
  };

  exports[fn].success = function(nick, args, realType, realFn) {
    return success(nick, fn, args, realType, realFn);
  };
});

// Special case for isRegistered since it doesn't return an error.
exports.isRegistered.success = function(nick, args, realType, realFn) {
  var bot;
  var checknick = args[0];
  var registered = args[1];
  var type = registered ? 'Registered' : 'Not Registered';
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


// Special case for functions where they need
// to be identified first before they can be used.
Object.keys(first).forEach(function(fn1) {
  first[fn1].forEach(function(fn2) {
    exports[fn1][fn2] = function(type, nick, args1, args2) {
      var obj = exports[fn1].success(nick, args1, type, fn2);
      if (fn1 === 'identify') {
        obj.Identified = obj.Success;
        delete obj.Success;
      } else if (fn1 === 'register') {
        obj.Registered = obj.Success;
        delete obj.Success;
      }

      obj[''] = exports[fn2](type, nick, args2);
      return obj;
    };

    exports[fn1][fn2].success = function(nick, args1, args2) {
      var obj = exports[fn1].success(nick, args1, fn1 + '-Success', fn2);
      if (fn1 === 'identify') {
        obj.Identified = obj.Success;
        delete obj.Success;
      } else if (fn1 === 'register') {
        obj.Registered = obj.Success;
        delete obj.Success;
      }

      obj[''] = exports[fn2].success(nick, args2);
      return obj;
    };
  });
});


// Custom macro function for testing control flow in ready() function.
exports.ready = function(nick, options, emit, dontemit, type) {
  // Setup flow object to keep track of what gets emitted.
  var emitters = emit.concat(dontemit);
  var events = {};
  emitters.forEach(function(event) {
    events[event] = false;
  });

  var obj = {
    topic: function() {
      var cb = this.callback;
      var bot = createBot(type || emitters[emitters.length - 1],
        nick, 'ready', true, options);

      emitters.forEach(function(event) {
        bot.nickserv.once(event, function() {
          events[event] = true;
        });
      });
      bot.nickserv.ready(function(err) {
        bot.kill(cb, null, err, bot);
      });
    }
  };

  if (type) {
    obj[type] = util.type(type, nick);
  } else {
    obj.Ready = function(n, err, bot) {
      assert.equal(nick, bot.nick);
      assert.isTrue(!err, err ? err.message : undefined);
    };
  }

  emit.forEach(function(event) {
    obj['Emitted: ' + event] = function() {
      assert.isTrue(events[event]);
    };
  });

  dontemit.forEach(function(event) {
    obj['Did Not Emit: ' + event] = function() {
      assert.isFalse(events[event]);
    };
  });

  return obj;
};
