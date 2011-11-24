var crypto = require('crypto');


var encrypt = function(pass) {
  var sha = crypto.createHash('sha256');
  sha.update('saltysaltsaltyum' + pass);
  return sha.digest('hex');
}

var genKey = function() {
  return encrypt(Math.random()).substr(0, 10);
};


// User Schema
//   nick                  String
//   password              String (encrypted)
//   email                 String
//   online                Boolean
//   identified            Boolean
//   from                  String
//   registered            Date
//   lastSeen              Date
//   connectedTime         Date
//   lastQuitMsg           String
//   verified              Boolean
//   key                   String
//   options               Array of Strings


var MemoryStore = module.exports = function() {
  this.users = {};
};


MemoryStore.prototype.userConnected = function(nick, ip) {
  var user = this.users[nick];

  if (!user) {
    this.users[nick] = user = {};
  }

  user.online = true;
  user.whois = 'localhost';
  user.from = '127.0.0.1';
  user.options = [];
  user.lastSeen = user.connectedTime = Date.now();
};


MemoryStore.prototype.userDisconnected = function(nick, msg) {
  var user = this.users[nick];
  user.online = false;
  user.lastQuitMsg = msg;
};


// checks if a user is registered
// callback(registered, verified)
MemoryStore.prototype.isRegistered = function(nick, callback) {
  var user = this.users[nick];

  if (user && user.registered) {
    callback(true, user.verified);
  } else {
    callback(false, false);
  }
};


// returns user info
// callback(info)
// info - should contain everything from the User schema
MemoryStore.prototype.info = function(nick, target, callback) {
  callback(this.users[target]);
};


// identifies (logs in) a user
// callback(err)
// err - true or false
MemoryStore.prototype.identify = function(nick, password, callback) {
  var user = this.users[nick]
    , identified = encrypt(password) === this.users[nick].password
    ;

  user.identified = identified;
  callback(!identified);
};


// opposite of identify
// callback()
MemoryStore.prototype.logout = function(nick, callback) {
  this.users[nick].identified = false;
  callback();
};


// registers a user
// callback()
MemoryStore.prototype.register = function(nick, password, email, callback) {
  var user = this.users[nick];

  user.password = encrypt(password);
  user.email = email;
  user.registered = Date.now();
  user.identified = true;
  user.verified = false;
  user.key = genKey();
  callback();
};


// opposite of register
// if target is given drop that user
// otherwise drop nick`
// callback()
MemoryStore.prototype.drop = function(nick, target, callback) {
  var user = this.users[target || nick];

  delete user.password;
  delete user.email;
  delete user.registered;
  delete user.identified;
  delete user.verified;
  delete user.key;
  callback();
};


// verifies a user's registration
// callback(err)
// err - true or false depending if key is correct
MemoryStore.prototype.verify = function(nick, target, key, callback) {
  var user = this.users[nick];

  if (user.key === key) {
    user.verified = true;
    delete user.key;
    callback(false);
  } else {
    callback(false);
  }
};


// change a user's password
// callback()
MemoryStore.prototype.setPassword = function(nick, newPass, callback) {
  this.users[nick].password = encrypt(newPass);
  callback();
};


// get total number of accounts registered under a given email
// callback(n)
// n - number of accounts
MemoryStore.prototype.getNumOfAccounts = function(email, callback) {
  var n = 0;

  for (var i in users) {
    if (users[i].email === email) {
      n++;
    }
  }

  callback(n);
};


// gets the time the user connected to the server
// callback(time)
MemoryStore.prototype.getConnectedTime = function(nick, callback) {
  callback(this.users[nick].connectedTime);
};
