var NickServ = require('..');
var irc      = require('irc');

// Initialize irc client.
var nick = 'somenick4022';
var client = new irc.Client('irc.freenode.net', nick, {
  channels: ['#fent'],
});

client.on('notice', function(a, b, msg) {
  console.log('notice:', msg);
});

client.on('message', function(from, to, msg) {
  console.log(from + ' => ' + to + ': ' + msg);
});

client.on('error', function(err) {
  console.error(err);
});

// This will create a new nickserv object on the irc client
// with the provided options
// that can be used to talk with the nickserv service.
var nickserv = new NickServ(nick, {
  password: 'hunter2',
  email: 'myemail@mail.com'
});

nickserv.attach('irc', client);

// callback will get called when nick is identified/registered.
// Will connect the irc client if not already connected.
nickserv.ready(function(err) {
  if (err) throw err;
  console.log('I am ready!');
  client.join('#fent');
});
