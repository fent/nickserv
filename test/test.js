var vows = require('vows');
           require('./setup.js');


// keep track of registered user
var user = {
  nick: uniqueNick(),
  password: 'hunter2',
};

user.email = user.nick + '@mailinator.com';


// register a nick to be able to test the rest of the functions
vows.describe('register')
  .addBatch({
    'Register': {
      'using a bad email':
        register('Invalid Email', uniqueNick(),
          ['tricky34', 'bad@email']),

      'using a password that is too short':
        register('Invalid Password', uniqueNick(),
          ['no', 'hi@mail.com']),

      'using a password that is too long':
        register('Invalid Parameters', uniqueNick(),
          ['looooooooooooooooooooooooooooooooooooooooong', 'hi@mail.com']),

      'a nick to use in the next few tests, twice':
        register.register('Already Identified', user.nick,
          [user.password, user.email],
          [user.password, user.email])
    }
  })
  .addBatch({
    'Register': {
      'after identifying':
        identify.register('Already Identified', user.nick,
          [user.password],
          [user.password, user.email])
    }
  })
  .addBatch({
    'Register': {
      'after checking if nick is registered':
        isRegistered.register('Already Registered', user.nick,
          [user.nick, true],
          ['whateva', user.email])
    }
  })
  .addBatch({
    'Register': {
      'the same nick again':
        register('Already Registered', user.nick,
          [user.password, user.email])
    }
  })
  .export(module);


/*
// get registration key from email
// I could not get nickserv to send me an email to a disposable email
// service such as mailinator.com
// Other option would be to prompt the user for email
// and password/key during the test
vows.describe('get verification key')
  .addBatch({
    'Get code': {
      'topic': function() {
        var callback = this.callback;
        http.get({
          host: 'mailinator.com',
          path: '/atom.jsp?email=' + user.nick
        }, function(res) {
          if (res.statusCode !== 200) {
            callback(new Error('404 Could not access mailbox'));
          }
          xml = ''
          res.on('data', function(data) {
            xml += data
          });

          res.on('end', function() {
            console.log(xml);
          });
        });
      }
    }
  })
  .export(module);
*/


vows.describe('verify')
  // verify the registered nick with the code we got from the email
  .addBatch({
    'Verify registration': {
      'without identifying first':
        verify('Not Identified', uniqueNick(),
          [uniqueNick(), 'anything']),

      'providing an empty key':
        identify.verify('Invalid Key', user.nick,
          [user.password],
          ['somenick', ''])
    }
  })
  .addBatch({
    'Verify registration': {
      'providing a nick that cannot exist':
        identify.verify('Invalid Nick', user.nick,
          [user.password],
          ['nick with spaces', 'code23332d'])
    }
  })
  .addBatch({
    'Verify registration': {
      'of a nick that is not registered':
        identify.verify('Not Registered', user.nick,
          [user.password],
          [uniqueNick(), 'key'])
    }
  })
  .addBatch({
    'Verify registration': {
      'with the wrong key':
        identify.verify('Wrong Key', user.nick,
          [user.password],
          [user.nick, 'thiskeyiswrong'])
    }
  })
  /*
  .addBatch({
    'Verify registration': {
      'of the nick we registered with the right key':
        identify.verify.success(user.nick,
          [user.password],
          [user.nick, user.key])
    }
  })
  .addBatch({
    'Verify registration': {
      'with a nick that is already verified':
        identify.verify('Not Awaiting', user.nick,
          [user.password],
          [user.nick, user.key])
    }
  })
  */
  .export(module);


// check that the nick registered appears registered
vows.describe('isRegistered')
  .addBatch({
    'Check': {
      'a nick that cant exist':
        isRegistered('Invalid Nick', uniqueNick(),
          ['bad nick']),
      
      'a nick that does not exist yet':
        isRegistered.success(uniqueNick(),
          [uniqueNick(), false]),
      
      'the nick we registered':
        isRegistered.success(uniqueNick(),
          [user.nick, true])
    }
  })
  .export(module);


// identify the nick that we registered and verified
// you don't need to identify after you register
// but if you disconnect, you do
// and the nick can be deleted if not verified in time
vows.describe('identify')
  .addBatch({
    'Identify': {
      'a nick that is not registered':
        identify('Not Registered', uniqueNick(),
          ['hunter2']),

      'using a password that cannot be registered with':
        identify('Invalid Password', uniqueNick(),
          ['no']),

      'twice in a row':
        identify.identify('Already Identified', user.nick,
          [user.password],
          [user.password])
    }
  })
  .addBatch({
    'Identify': {
      'using the wrong password':
        identify('Wrong Password', user.nick,
          ['WRONG'])
    }
  })
  .addBatch({
    'Identify': {
      'the nick we registered with the correct password':
        identify.success(user.nick,
          [user.password])
    }
  })
  .export(module);


// change password after identifying
vows.describe('setPassword')
  .addBatch({
    'Set the password': {
      'without identifying first':
        setPassword('Not Identified', uniqueNick(),
          ['doesntmatter']),

      'to one that is too short':
        identify.setPassword('Invalid Password', user.nick,
          [user.password],
          ['no'])
    }
  })
  .addBatch({
    'Set the password': {
      'to one that is too long':
        identify.setPassword('Invalid Parameters', user.nick,
          [user.password],
          ['looooooooooooooooooooooooooooooooooooooooooooong'])
    }
  })
  .addBatch({
    'Set the password': {
      'to another acceptable password':
        identify.setPassword.success(user.nick,
          [user.password],
          ['acceptable'])
    }
  })
  .export(module);


// test control flow of ready
// and test emitters
vows.describe('ready')
  .addBatch({
    'Call ready': {
      'without any options':
        ready(uniqueNick(), {}, [], ['checkingregistered']),

      'with a correct password for a registered nick':
        ready(user.nick, { password: 'acceptable' },
          ['checkingregistered', 'isregistered', 'identifying',
           'identified'],
          ['registering']),

      'with a password for a non registered nick':
        ready(uniqueNick(), { password: user.password },
          ['checkingregistered', 'isregistered'],
          ['identifying', 'registering'],
          'Not Registered'),

      'with a password and email for a non registered nick':
        ready(uniqueNick(), { password: user.password, email: user.email },
          ['checkingregistered', 'isregistered', 'registering',
           'registered'],
          ['identifying'])
    }
  })
  .export(module);
