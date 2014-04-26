var wsp      = require('writestreamp');
var path     = require('path');
var NickServ = require('..');
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

  // Append txt to log file for this server and command.
  var ws = wsp(path.join(dir, type + '.log'));

  // Create irc client instance.
  var bot = new irc.Client(server, nick, {
    autoConnect: false,
    debug: false
  });
  bot.log = log !== undefined ? log : true;
  //bot.log = true

  // Attach nickserv object to client.
  var nickserv = new NickServ(nick, options);
  nickserv.attach('irc', bot);
  bot.nickserv = nickserv;

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
    if (bot.disconnect) {
      bot.disconnect(onDisconnect);
    } else {
      onDisconnect();
    }

    function onDisconnect() {
      ws.once('finish', function() {
        cb.apply(null, args);
      });
      ws.end();
    }
  };

  return bot;
};
