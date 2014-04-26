var irc = require('slate-irc');
var net = require('net');

var stream = net.connect({
  port: 6667,
  host: 'irc.freenode.org',
});

var client = irc(stream);
client.nick('somenick402');
client.on('data', function(data) {
  console.log('data', data);
});
