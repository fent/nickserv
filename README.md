Install
------------

    npm install nickserv


Usage
------------------

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
---------
### nickserv.create( client, [options])

Creates a new NickServ instance and attaches it to the `client` under the ke `nickserv`. `options` can be a hash with `password` and `email` that can optionally be used later with `identify`, `register`, and the `ready` functions.

Nickserv has functions that help communicate with the IRC NickServ service. If a function is called several times in a row, the nickserv command will be sent as soon as it's called, but it will queue the responses to the corresponding commands.

### client.nickserv.isIdentified()
Returns wether or not the current nick has been identified.

### client.nickserv.isRegistered([nick], [callback (err, registered)])
Checks if the given nick is registered. If no arguments passed, it becomes synchronous and returns wether or not the current nick is registered. Note that synchronous version relies on knowing if `isRegistered`, `identify`, or `register` have already been called.

### client.nickserv.identify(password, [callback (err)])
Identifies current client nick with the given password.

### client.nickserv.register(password, email, [callback (err)])
Registers the current client nick with the given password and email.

### client.nickserv.verify(nick, key, [callback (err)])
Verifies registraton for the given nick with the given key.

### client.nickserv.setPassword(password, callback (err))
Set the current client nick password with given password.

### client.nickserv.ready([callback (err)], [options])
If password is given, checks if current nickname is registered. If it's registered, tries to identify. If nick is not registered and email is given, tries to register. When it's all finished and ready, calls `callback`. Providing `options` will use that object to get password and email instead of the one from the constructor.


The nickserv object emits a handful events to help you track what it's currently doing or if you prefer to use emitters to callbacks.

###Event: 'checkingregistered'
`isRegistered` is called
`function () { }`

###Event: 'isregistered'
`function (registered, nick) { }`
`isRegistered` is finished

###Event: 'identifying'
`function () { }`
`identify` is called

###Event: 'identified'
`function () { }`
`identify` successfully finished

###Event: 'registering'
`function () { }`
`register` is called

###Event: 'registered'
`function () { }`
`register` successfully finished

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
