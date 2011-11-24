var NickServ = require('./client/nickserv');

module.exports = Server = function(motd) {
  this.motd = motd;
  this.users = {};
  this.channels = {};
  this.NickServ = new NickServ();
  this.connect(this.NickServ);
};

Server.prototype.connect = function(client) {
  var self = this
    , oriNick = (client.nick || client.opt.nick)
    , nick = oriNick.toLowerCase()
    ;

  // tell NickServ someone connected
  this.NickServ.userConnected(nick, client);

  if (this.users[nick] !== undefined) {
    do {
      newnick = 'Guest' + Math.floor(Math.random() * 100000);
      newnickLower = newnick.toLowerCase();
    } while(this.users[newnickLower] !== undefined);

    client.nick = newnick;
    oriNick = newnick;
    client.emit('nick', oriNick, newnick);
    nick = newnickLower;
  }

  this.users[nick] = {
    client: client,
    channels: [],
    signedon: new Date()
  };

  client.disconnect = function(msg, cb) {
    if (typeof(msg) === 'function') {
      cb = msg;
      msg = 'bye';
    }
    delete self.users[nick];
    self.NickServ.userDisconnected(nick, msg);
    client.emit('end');
    cb();
  };

  var event = nick === 'nickserv' ? 'notice' : 'message';
  client.say = function(dest, msg) {
    dest = dest.toLowerCase();

    process.nextTick(function() {
      if (dest.charAt(0) === '#') {
        if (self.channels[dest]) {
          var chan = serlf.channels[dest];

          for (var i in chan.users) {
            chan.users[i].client.emit(event, oriNick, chan.name, msg);
            chan.users[i].client.emit('message' + chan.name, oriNick, msg);
          }
        }

      } else if (self.users[dest] !== undefined) {
        self.users[dest].client.emit(event, oriNick, dest, msg);
        if (self.users[dest]) {
          self.users[dest].client.emit('pm', oriNick, msg);
        }
      }
    });
  };

  client.emit('registered');
  client.emit('motd', this.motd);
};
