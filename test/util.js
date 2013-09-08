var assert = require('assert');


// If logic is set, more tests will run that will test the functionality
// of the program where it doesn't need to send anything to NickServ
// this helps avoid excesive connections to an irc server when testing.
exports.logic = require('optimist').argv.logic
  ? function(o) { return o; }
  : function(o, a) { return a || {}; };


// Converts str to cammel case.
// Thank you: tjholowaychuk
function camelCase(str) {
  var parts = str.toLowerCase().split(/\s+/);
  var buf = parts.shift();
  return buf + parts.map(function(part){
    return part[0].toUpperCase() + part.slice(1);
  }).join('');
}


/**
 * Add NickServError type checking to assert.
 *
 * @param {assert} assert
 * @param {String} errtype
 * @param {String} nick
 */
exports.type = function(errtype, nick) {
  errtype = camelCase(errtype);
  return function(n, err, bot) {
    assert.equal(nick, bot.nick);
    assert.ok(err);
    assert.equal(err.type, errtype);
  };
};


// Used to keep track of nicknames that have been used in tests.
var table = {};

/**
 * Returns a unique nick that probably isnt being used.
 */
exports.uniqueNick = function() {
  var nick;
  do {
    nick = 'nickbot' + Math.floor(Math.random() * 1e9);
  } while(table[nick] !== undefined);

  table[nick] = true;
  return nick;
};
