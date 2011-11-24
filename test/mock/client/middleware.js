var errors = require('./replies.js').errors
  , success = require('./replies.js').success
  ;


exports.unknownCommand = function(commands, n, inc) {
  if (!n) {
    n = 0;
  }

  return function(next) {
    var cmd = arguments[n + 2];
    if (commands.indexOf(cmd) === -1) {
      next(errors.unknownCommand, inc ? inc + ' ' + cmd : cmd);
    } else {
      next();
    }
  };
};


// nicks that are part of this network's services
var networkServices = [
  'nickserv',
  'chanserv'
];

exports.networkServices = function(next, nick, target) {
  if (networkServices.indexOf(target) !== -1) {
    next(errors.networkServices, target);
  } else {
    next();
  }
};


exports.isRegistered = function(next, nick, target) {
  this.store.isRegistered(target, function(registered, verified) {
    if (!registered) {
      next(errors.notRegistered, target);
    /*
    } else if (!verified) {
      next(errors.awaitingVerification);
    */
    } else {
      next();
    }
  });
};


exports.amRegistered = function(next, nick) {
  exports.isRegistered.call(this, next, null, nick);
};


exports.notEnoughParameters = function(n, cmd) {
  return function(next) {
    if (arguments.length < n + 2) {
      next(errors.notEnoughParameters);
    } else {
      next();
    }
  };
};


// TODO: actually regex check the email
exports.checkEmail = function(next, nick, password, email) {
  next();
};


exports.tooManyAccounts = function(next, nick, password, email) {
  var max = this.options.maxAccounts;
  if (max === 0) {
    return next();
  }

  this.store.getNumOfAccounts(email, function(n) {
    if (n > max) {
      next(errors.tooManyAccounts, email);
    } else {
      next();
    }
  });
};


exports.alreadyRegistered = function(next, nick, password, email) {
  this.store.isRegistered(nick, function(registered) {
    if (registered) {
      next(errors.alreadyRegistered, nick);
    } else {
      next();
    }
  });
};


exports.tooSoon = function(next, nick, password, email) {
  var min = this.options.minBeforeRegister;
  if (min === 0) {
    return next();
  }

  this.store.getConnectedTime(nick, function(time) {
    var diff = Date.now() - time;
    if (diff / 1000 < min) {
      next(errors.tooSoon, min, 'minute' + (min === 1 ? '' : 's'));
    } else {
      next();
    }
  });
};


exports.accessDenied = function(next, nick, target) {
  if (nick !== target && this.options.ops.indexOf(nick) === -1) {
    next(errors.accessDenied);
  } else {
    next();
  }
};


exports.notAwaitingAuthorization = function(next, nick, op, target, key) {
  this.store.isRegistered(nick, function(registered, verified) {
    if (!registered) {
      next(errors.notRegistered, nick);

    } else if (verified) {
      next(errors.notAwaiting, target);

    } else {
      next();
    }
  })
};


exports.isIdentified = function(next, nick) {
  this.store.isIdentified(nick, function(identified) {
    if (identified) {
      next();
    } else {
      next(errors.notIdentified);
    }
  });;
};
