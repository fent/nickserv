var nickserv = require('..');
var irc      = require('irc');

// Initialize irc client.
var client = new irc.Client('irc.freenode.net', 'somenick402', {
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
/*
nickserv.create(client, {
  password: 'hunter2',
  email: 'roly426@mail.com'
});

// callback will get called when nick is identified/registered.
// Will connect the irc client if not already connected.
client.nickserv.ready(function(err) {
  if (err) throw err;
  console.log('I am ready!');
  client.join('#fent');
});
*/
