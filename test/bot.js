var fs       = require('fs');
var path     = require('path');
var mkdirp   = require('mkdirp');
var nickserv = require('..');
var server   = require('optimist').argv.server || null;

// Mock the irc module if no server given.
var irc = require(!server ? './mock/irc' : 'irc');



/**
 * Creates a bot that logs notices and messages sent.
 *
 * @param {String} type
 * @param {String} nick
 * @param {String} fn
 * @param {Boolean} log
 * @param {Object} options
 */
module.exports = function createBot(type, nick, fn, log, options) {
  // Make server folder if it doesn't exist.
  var dir = path.join(__dirname, 'logs', server || 'none', fn);
  mkdirp.sync(dir);

  // Append txt to log file for this server and command.
  var ws = fs.createWriteStream(path.join(dir, type + '.log'));

  // Create irc client instance.
  var bot = new irc.Client(server, nick, {
    autoConnect: false,
    debug: false
  });
  bot.log = log !== undefined ? log : true;
  //bot.log = true

  // Attach nickserv object to client.
  nickserv.create(bot, options);

  // Log all notices.
  bot.on('notice', function(nick, to, text, msg) {
    if (bot.log) {
      ws.write(['notice: ', nick, to, text, msg].join(', '));
    }
  });

  // Log what the bot tells nickserv.
  bot.on('message', function(msg) {
    if (bot.log) {
      ws.write(bot.nick + ': ' + msg);
    }
  });

  // When this bot disconnect, close log file.
  bot.kill = function(cb) {
    var args = Array.prototype.slice.call(arguments).slice(1);
    bot.disconnect(function() {
      ws.once('finish', function() {
        cb.apply(null, args);
      });
      ws.end();
    });
  };

  return bot;
};
