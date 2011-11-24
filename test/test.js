var vows = require('vows')
  ,    l = require('optimist').argv.logic
  ,    v = require('optimist').argv.verify
  ;

require('./setup.js');


// keep track of registered user
var user = {
  nick: uniqueNick(),
  password: 'hunter2',
  password2: 'acceptable'
};
user.email = user.nick + '@mailinator.com';
var user2 = uniqueNick();


// register a nick to be able to test the rest of the functions
vows.describe('register')
  .addBatch({
    'Register': {
      'using a bad email':
        logic(register('Invalid Email', uniqueNick(),
          ['tricky34', 'bad@email'])),

      'using a password that is too short':
        logic(register('Invalid Password', uniqueNick(),
          ['no', 'hi@mail.com'])),

      /*
      // some irc servers don't return an error for this
      'using a password that is too long':
        register('Invalid Parameters', uniqueNick(),
          ['looooooooooooooooooooooooooooooooooooooooong', 'hi@mail.com']),
      */

      'a nick to use in the next few tests':
        logic(register.register('Already Identified', user.nick,
            [user.password, user.email],
            [user.password, user.email]),
          register.success(user.nick,
            [user.password, user.email]))
    }
  })
  .addBatch({
    'Register': {
      'after identifying':
        logic(identify.register('Already Identified', user.nick,
          [user.password],
          [user.password, user.email]))
    }
  })
  .addBatch({
    'Register': {
      'after checking if nick is registered':
        logic(isRegistered.register('Already Registered', user.nick,
          [user.nick, true],
          ['whateva', user.email]))
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


// get some information
vows.describe('info')
  .addBatch({
    'Get info': {
      'from a bad nick':
        logic(info('Invalid Nick', uniqueNick(),
          ['no has'])),

      'from a nonregistered nick':
        info('Not Registered', uniqueNick(),
          [uniqueNick()]),
      
      'from NickServ':
        info('Network Services', uniqueNick(),
          ['NickServ']),

      'from the nick we registered':
        info.success(uniqueNick(),
          [user.nick]),

      'from the nick we registered but identify first':
        identify.info.success(user.nick,
          [user.password],
          [user.nick])
    }
  })
  .export(module);


// check that the nick registered appears registered
vows.describe('isRegistered')
  .addBatch({
    'Check': {
      'a nick that cant exist':
        logic(isRegistered('Invalid Nick', uniqueNick(),
          ['bad nick'])),
      
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
        logic(identify('Invalid Password', uniqueNick(),
          ['no'])),

      'twice in a row':
        logic(identify.identify('Already Identified', user.nick,
          [user.password],
          [user.password]))
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


// try identifying and then logging out
vows.describe('logout')
  .addBatch({
    'Log out': {
      'without logging in':
        logic(logout('Not Identified', uniqueNick(),
          [])),

      'by first identifying':
        identify.logout.success(user.nick,
          [user.password],
          [])
    }
  })
  .export(module);


if (v) {
  vows.describe('verify')
    // verify the registered nick with the code we got from the email
    .addBatch({
      'Verify registration': {
        'without identifying first':
          logic(verify('Not Identified', uniqueNick(),
            [uniqueNick(), 'anything'])),

        'providing an empty key':
          logic(identify.verify('Invalid Key', user.nick,
            [user.password],
            ['somenick', '']))
      }
    })
    .addBatch({
      'Verify registration': {
        'providing a nick that cannot exist':
          logic(identify.verify('Invalid Nick', user.nick,
            [user.password],
            ['nick with spaces', 'code23332d']))
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
}


// change password after identifying
vows.describe('setPassword')
  .addBatch({
    'Set the password': {
      'without identifying first':
        logic(setPassword('Not Identified', uniqueNick(),
          ['doesntmatter'])),

      'to one that is too short':
        logic(identify.setPassword('Invalid Password', user.nick,
          [user.password],
          ['no']))
    }
  })
  /*
  .addBatch({
    'Set the password': {
      'to one that is too long':
        identify.setPassword('Invalid Parameters', user.nick,
          [user.password],
          ['looooooooooooooooooooooooooooooooooooooooooooong'])
    }
  })
  */
  .addBatch({
    'Set the password': {
      'to another acceptable password':
        identify.setPassword.success(user.nick,
          [user.password],
          [user.password2])
    }
  })
  .export(module);


// test control flow of ready
// and test emitters
if (l) {
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
          ready(uniqueNick(),
            { password: user.password, email: user.email },
            ['checkingregistered', 'isregistered', 'registering',
             'registered'],
            ['identifying'])
      }
    })
    .export(module);
}


// clean up the mess all these tests made
vows.describe('drop')
  .addBatch({
    'Drop': {
      'without identifying first':
        logic(drop('Not Identified', uniqueNick(),
          [uniqueNick()])),
      
      'a badly made up nick':
        logic(identify.drop('Invalid Nick', user.nick,
          [user.password2],
          ['!welp'])),
    }
  })
  .addBatch({
    'Drop': {
      'a nick that is not registered':
        identify.drop('Not Registered', user.nick,
          [user.password2],
          [uniqueNick()])
    }
  })
  .addBatch({
    'Drop': {
      'a nick that does not belong to us or our group':
        register.drop('Access Denied', user2,
          [user.password, user.email],
          [user.nick])
    }
  })
  .addBatch({
    'Drop': {
      'the one nick these tests registered':
        identify.drop.success(user.nick,
          [user.password2],
          [user.nick]),
      'the nick used to test dropping not in our group':
        identify.drop.success(user2,
          [user.password],
          [user2])
    }
  })
  .export(module);
