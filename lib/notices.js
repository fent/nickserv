(function() {
  var alreadyidentified, awaitingverification, invalidnick, invalidpassword, notidentified;
  module.exports = {
    identify: {
      error: {
        invalidpassword: invalidpassword = {
          msg: '%s is not a valid password.'
        },
        notregistered: {
          msg: '%s is not a registered nickname.',
          match: [/^(.+) is not a registered nickname\.$/m, /^Your nick isn't registered\.$/m]
        },
        wrongpassword: {
          msg: 'Wrong password.',
          match: [/^Invalid password for .+\.$/m]
        },
        alreadyidentified: alreadyidentified = {
          msg: 'You are already identified.'
        },
        awaitingverification: awaitingverification = {
          msg: 'This nick is awaiting email verification.',
          match: [/^This nick is awaiting an e-mail verification code before completing registration\.$/m]
        }
      },
      success: [/^Password accepted - you are now recognized\.$/m, /^You are now identified for (.+)\.$/m]
    },
    logout: {
      error: {
        notidentified: notidentified = {
          msg: 'You must first be identified.'
        }
      },
      success: [/^Your nick has been logged out\.$/m]
    },
    register: {
      error: {
        invalidpassword: invalidpassword,
        invalidemail: {
          msg: '%s is not a valid email address.',
          match: [/^(.+) is not a valid email address\.$/m]
        },
        invalidparameters: {
          msg: 'Invalid parameters for register',
          match: [/^Your password is too long\. Please try again with a shorter password\.$/m, /^Invalid parameters for REGISTER\.$/m]
        },
        toomanyaccounts: {
          msg: '%s has too many accounts registered.',
          match: [/^(.+) has too many accounts registered\.$/m]
        },
        notenoughparameters: {
          msg: 'Insufficient parameters for register.',
          match: [/^Insufficient parameters for REGISTER\.$/m]
        },
        alreadyregistered: {
          msg: 'You are already registered.',
          match: [/^(.+) is already registered\.$/m, /^This nickname is registered and protected\.  If it is your/m, /^This nick is awaiting an e-mail verification code before completing registration\.$/m, /^This nick has already been requested, please check your e-mail address for the pass code$/m]
        },
        alreadyidentified: alreadyidentified,
        toosoon: {
          msg: 'You must be using this nick for a bit before registering.',
          match: [/^You must have been using this nick for at least (\d+) (\w+) to register\.$/m]
        }
      },
      success: [/^Nickname (.+) registered under your account/m, /^(.+) is now registered to .+, with the password (.+)\.$/m, /^A passcode has been sent to (.+), please type \/msg NickServ confirm <passcode> to complete registration$/m]
    },
    drop: {
      error: {
        invalidnick: invalidnick,
        notidentified: notidentified,
        notregistered: {
          msg: '%s is not registered',
          match: [/^Nick (.+) isn't registered\.$/m]
        },
        accessdenied: {
          msg: 'Access denied',
          match: [/^Access denied\.$/m]
        }
      },
      success: [/^Nickname (.+) has been dropped\.$/m]
    },
    setPassword: {
      error: {
        invalidpassword: invalidpassword,
        invalidparameters: {
          msg: 'Invalid parameters for password.',
          match: [/^Invalid parameters for PASSWORD\.$/m]
        },
        notidentified: notidentified
      },
      success: [/^The password for (.+) has been changed to (.+)\.$/m]
    },
    verifyRegistration: {
      error: {
        invalidnick: invalidnick = {
          msg: 'Nickname is invalid.'
        },
        invalidkey: {
          msg: 'Key is invalid.'
        },
        invalidparameters: {
          msg: 'Insufficient parameters for verify.',
          match: [/^Insufficient parameters for VERIFY\.$/m]
        },
        notawaiting: {
          msg: '%s is not awaiting authorization.',
          match: [/^(.+) is not awaiting authorization\.$/m]
        },
        wrongkey: {
          msg: 'Wrong key.',
          match: [/^Verification failed\. Invalid key for (.+)\.$/m]
        },
        notregistered: {
          msg: '%s is not registered.',
          match: [/^(.+) is not registered\.$/m]
        },
        notidentified: notidentified,
        unknowncommand: {
          msg: 'Unknown Command',
          match: [/^Unknown command verify\.  "\/msg NickServ HELP" for help\./m]
        }
      },
      success: [/^(.+) has now been verified\.$/m]
    },
    info: {
      error: {
        invalidnick: invalidnick,
        notregistered: {
          msg: '%s is not registered.',
          match: [/^Nick (.+) isn't registered\.$/m]
        },
        networkservices: {
          msg: '%s is part of network services.',
          match: [/^Nick (.+) is part of this Network's Services\.$/m]
        },
        awaitingverification: awaitingverification
      },
      success: [/^([\w\d]+) is ([\w\d\s]+)$(\n^[\w\d]+ is currently (online|offline)\.)?(\n^   Is online from: (.+)$)?\n^  Time registered: (.+)$(\n^   Last seen time: (.+)$)?(\n^Last quit message: (.+)$)?(\n^   E-mail address: (.+)$\n^          Options: (.+)$)?/m]
    }
  };
}).call(this);
