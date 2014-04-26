var vows = require('vows');
var util = require('./util');
var l    = require('optimist').argv.logic;
var v    = require('optimist').argv.verify;
var t    = require('./setup.js');


// Keep track of registered user.
var nick = util.uniqueNick();
var user = {
  nick: nick,
  password: 'hunter2',
  password2: 'acceptable',
  email: nick + '@mailinator.com',
};
var nick2 = util.uniqueNick();


// Register a nick to be able to test the rest of the functions.
vows.describe('register')
  .addBatch({
    'Register': {
      'using a bad email':
        util.logic(t.register('Invalid Email', util.uniqueNick(),
          ['tricky34', 'bad@email'])),

      'using a password that is too short':
        util.logic(t.register('Invalid Password', util.uniqueNick(),
          ['no', 'hi@mail.com'])),

      /*
      // some irc servers don't return an error for this
      'using a password that is too long':
        t.register('Invalid Parameters', util.uniqueNick(),
          ['looooooooooooooooooooooooooooooooooooooooong', 'hi@mail.com']),
      */

      'a nick to use in the next few tests':
        util.logic(t.register.register('Already Identified', user.nick,
            [user.password, user.email],
            [user.password, user.email]),
          t.register.success(user.nick,
            [user.password, user.email]))
    }
  })
  .addBatch({
    'Register': {
      'after identifying':
        util.logic(t.identify.register('Already Identified', user.nick,
          [user.password],
          [user.password, user.email]))
    }
  })
  .addBatch({
    'Register': {
      'after checking if nick is registered':
        util.logic(t.isRegistered.register('Already Registered', user.nick,
          [user.nick, true],
          ['whateva', user.email]))
    }
  })
  .addBatch({
    'Register': {
      'the same nick again':
        t.register('Already Registered', user.nick,
          [user.password, user.email])
    }
  })
  .export(module);


// get some information
vows.describe('info')
  .addBatch({
    'Get info': {
      'from a bad nick':
        util.logic(t.info('Invalid Nick', util.uniqueNick(),
          ['no has'])),

      'from a nonregistered nick':
        t.info('Not Registered', util.uniqueNick(),
          [util.uniqueNick()]),
      
      'from NickServ':
        t.info('Network Services', util.uniqueNick(),
          ['NickServ']),

      'from the nick we registered':
        t.info.success(util.uniqueNick(),
          [user.nick]),

      'from the nick we registered but identify first':
        t.identify.info.success(user.nick,
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
        util.logic(t.isRegistered('Invalid Nick', util.uniqueNick(),
          ['bad nick'])),
      
      'a nick that does not exist yet':
        t.isRegistered.success(util.uniqueNick(),
          [util.uniqueNick(), false]),
      
      'the nick we registered':
        t.isRegistered.success(util.uniqueNick(),
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
        t.identify('Not Registered', util.uniqueNick(),
          ['hunter2']),

      'using a password that cannot be registered with':
        util.logic(t.identify('Invalid Password', util.uniqueNick(),
          ['no'])),

      'twice in a row':
        util.logic(t.identify.identify('Already Identified', user.nick,
          [user.password],
          [user.password]))
    }
  })
  .addBatch({
    'Identify': {
      'using the wrong password':
        t.identify('Wrong Password', user.nick,
          ['WRONG'])
    }
  })
  .addBatch({
    'Identify': {
      'the nick we registered with the correct password':
        t.identify.success(user.nick,
          [user.password])
    }
  })
  .export(module);


// try identifying and then logging out
vows.describe('logout')
  .addBatch({
    'Log out': {
      'without logging in':
        util.logic(t.logout('Not Identified', util.uniqueNick(),
          [])),

      'by first identifying':
        t.identify.logout.success(user.nick,
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
          util.logic(t.verify('Not Identified', util.uniqueNick(),
            [util.uniqueNick(), 'anything'])),

        'providing an empty key':
          util.logic(t.identify.verify('Invalid Key', user.nick,
            [user.password],
            ['somenick', '']))
      }
    })
    .addBatch({
      'Verify registration': {
        'providing a nick that cannot exist':
          util.logic(t.identify.verify('Invalid Nick', user.nick,
            [user.password],
            ['nick with spaces', 'code23332d']))
      }
    })
    .addBatch({
      'Verify registration': {
        'of a nick that is not registered':
          t.identify.verify('Not Registered', user.nick,
            [user.password],
            [util.uniqueNick(), 'key'])
      }
    })
    .addBatch({
      'Verify registration': {
        'with the wrong key':
          t.identify.verify('Wrong Key', user.nick,
            [user.password],
            [user.nick, 'thiskeyiswrong'])
      }
    })
    .addBatch({
      'Verify registration': {
        'of the nick we registered with the right key':
          t.identify.verify.success(user.nick,
            [user.password],
            [user.nick, user.key])
      }
    })
    .addBatch({
      'Verify registration': {
        'with a nick that is already verified':
          t.identify.verify('Not Awaiting', user.nick,
            [user.password],
            [user.nick, user.key])
      }
    })
    .export(module);
}


// change password after identifying
vows.describe('setPassword')
  .addBatch({
    'Set the password': {
      'without identifying first':
        util.logic(t.setPassword('Not Identified', util.uniqueNick(),
          ['doesntmatter'])),

      'to one that is too short':
        util.logic(t.identify.setPassword('Invalid Password', user.nick,
          [user.password],
          ['no']))
    }
  })
  /*
  .addBatch({
    'Set the password': {
      'to one that is too long':
        t.identify.setPassword('Invalid Parameters', user.nick,
          [user.password],
          ['looooooooooooooooooooooooooooooooooooooooooooong'])
    }
  })
  */
  .addBatch({
    'Set the password': {
      'to another acceptable password':
        t.identify.setPassword.success(user.nick,
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
          t.ready(util.uniqueNick(), {}, [], ['checkingregistered']),

        'with a correct password for a registered nick':
          t.ready(user.nick, { password: 'acceptable' },
            ['checkingregistered', 'isregistered', 'identifying',
             'identified'],
            ['registering']),

        'with a password for a non registered nick':
          t.ready(util.uniqueNick(), { password: user.password },
            ['checkingregistered', 'isregistered'],
            ['identifying', 'registering'],
            'Not Registered'),

        'with a password and email for a non registered nick':
          t.ready(util.uniqueNick(),
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
        util.logic(t.drop('Not Identified', util.uniqueNick(),
          [util.uniqueNick()])),
      
      'a badly made up nick':
        util.logic(t.identify.drop('Invalid Nick', user.nick,
          [user.password2],
          ['!welp'])),
    }
  })
  .addBatch({
    'Drop': {
      'a nick that is not registered':
        t.identify.drop('Not Registered', user.nick,
          [user.password2],
          [util.uniqueNick()])
    }
  })
  .addBatch({
    'Drop': {
      'a nick that does not belong to us or our group':
        t.register.drop('Access Denied', nick2,
          [user.password, user.email],
          [user.nick])
    }
  })
  .addBatch({
    'Drop': {
      'the one nick these tests registered':
        t.identify.drop.success(user.nick,
          [user.password2],
          [user.nick]),
      'the nick used to test dropping not in our group':
        t.identify.drop.success(nick2,
          [user.password],
          [nick2])
    }
  })
  .export(module);
