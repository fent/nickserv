# nickserv [![Build Status](https://secure.travis-ci.org/fent/nickserv.png)](http://travis-ci.org/fent/nickserv)

This is a node.js module that communicates with the Nick Service in irc servers.


# Usage

```javascript
var nickserv = require('nickserv'),
         irc = require('irc');

// initialize irc client
var client = new irc.Client('irc.freenode.net', 'mynick');

// this will create a new nickserv object on the irc client
// with the provided options
// that can be used to talk with the nickserv service
nickserv.create(client, {
  password: 'hunter2',
  email: 'my@mail.com'
});

// callback will get called when nick is identified/registered
// will connect the irc client if not already connected
client.nickserv.ready(function(err) {
  if (err)
    throw err;
  console.log('I am ready!');
  client.join('#channel');
});
```

The cool thing about the `ready` function is that if a password is provided, it will check if the nick is registered, if it is it will try to identify it with NickServ. If it's not registered and an email was provided as well, it will try to register the nick with the given password and email.


API

### nickserv.create( client, [options])
Creates a new NickServ instance and attaches it to the `client` under the ke `nickserv`. `options` can be a hash with `password` and `email` that can optionally be used later with `identify`, `register`, and the `ready` functions.

Nickserv has functions that help communicate with the IRC NickServ service. If a function is called several times in a row, the nickserv command will be sent as soon as it's called, but it will queue the responses to the corresponding commands.

### client.nickserv.isIdentified()
Returns wether or not the current nick has been identified.

### client.nickserv.isRegistered([nick], [callback (err, registered)])
Checks if the given nick is registered. If no arguments passed, it becomes synchronous and returns wether or not the current nick is registered. Note that synchronous version relies on knowing if `isRegistered`, `identify`, or `register` have already been called.

### client.nickserv.info([nick], [callback (err, info)])
Gets info from the given nick. If `nick` is not given, uses current client nick. `info` object looks like

    {
      nick: 'nickbot',
      realname: 'nodebot',
      online: true,
      host: 'nickbot@some.IP',
      registered: 'Sep 28 08:43:08 2011 CEST',
      lastquitmsg: 'Ping timeout: 121 seconds',
      email: 'nick@gmail.com',
      options: ['Security', 'Private', 'Auto-op']
    }
      

### client.nickserv.identify(password, [callback (err)])
Identifies current client nick with the given password.

### client.nickserv.logout([callback (err)])
Reverses the effect of `identify`.

### client.nickserv.register(password, email, [callback (err)])
Registers the current client nick with the given password and email. Some servers require you to be using your nick for some time before it can be registered. In that case, `register` will wait and call itself again.

### client.nickserv.drop([nick], [callback (err)])
Drops a nick, making it available to be registered again by anyone. If `nick` is not specified, will drop current client nick.

### client.nickserv.verify(nick, key, [callback (err)])
Verifies registraton for the given nick with the given key.

### client.nickserv.setPassword(password, callback (err))
Set the current client nick password with given password.

### client.cmd(command [, arg1 [, arg2 ..]])
Sends a command to NickServ. Use this if a command you want to use hasn't been covered by one of the other functions yet.

### client.nickserv.ready([callback (err)], [options])
If password is given, checks if current nickname is registered. If it's registered, tries to identify. If nick is not registered and email is given, tries to register. When it's all finished and ready, calls `callback`. Providing `options` will use that object to get password and email instead of the one from the constructor.


##Events

The nickserv object emits a handful events to help you track what it's currently doing or if you prefer to use emitters to callbacks.

###Event: 'checkingregistered'
`function () { }`

`isRegistered` is called

###Event: 'isregistered'
`function (registered, nick) { }`

`isRegistered` is finished

###Event: 'gettinginfo'
`function () { }`

`info` is called

###Event: 'info'
`function (info) { }`

`info` finished getting info successfully

###Event: 'identifying'
`function () { }`

`identify` is called

###Event: 'identified'
`function () { }`

`identify` successfully finished

###Event: 'loggingout'
`function () { }`

`logout` is called

###Event: 'loggedout'
`function () { }`

`logout` finished

###Event: 'registering'
`function () { }`

`register` is called

###Event: 'registered'
`function () { }`

`register` successfully finished

###Event: 'dropping'
`function() { }`

`drop` is called

###Event 'dropped'
`function() { }`

`drop` successfully finished

###Event: 'verifying'
`function () { }`

`verifyRegistration` is called

###Event: 'verified'
`function () { }`

`verifyRegistration` successfully finished

###Event: 'settingpassword'
`function () { }`

`setPassword` is called

###Event: 'passwordset'
`function () { }`

`setPassword` successfully finished

###Event: 'error'
`function (err) { }`

Emitted when any of the functions are called without a callback and there is an error.

###Event: 'notice'
`function (text) { }`

Emitted when NickServ sends a notice.

###Event: 'send'
`function (msg) { }`

Emitted when client sends a message to NickServ through this module.


# Install

    npm install nickserv


# Tests

This module is hard to test because there are various NickServ software that every IRC server uses. Each one of them has slightly different responses to the functions they provide, and some provide more/less functionality. Running the tests helps to know if this module will work with a server. If it doesn't, it helps make it work.

All tests are written with [vows](http://vowsjs.org/) and can be run with [npm](http://npmjs.org/)

```bash
npm test
```

or directly through vows for more control

```bash
vows test/test.js --spec --server='irc.freenode.net'
```

During testing, log files will be created under `/test/logs`. Logs are useful to figure out exactly what is being sent to and received from NickServ.

If you don't want to test this against a server, use the `--logic` flag with vows and a mock irc server will be created. This will be much faster and is meant to test only the logic behind nickserv. As oppose to testing what is being sent and received.


# License

MIT
