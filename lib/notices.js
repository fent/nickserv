(function() {
  var alreadyidentified, invalidpassword, notidentified;
  module.exports = {
    isRegistered: {
      error: {
        invalidnick: {
          msg: 'Nickname is invalid.'
        },
        notregistered: {
          msg: 'This nickname is not registered. Please provide both a password and email address or none at all.',
          match: [/^.+ is not registered\.$/]
        },
        registered: {
          msg: 'This nickname is registered. Please provide a password.',
          match: ['Please log in before attempting to verify your registration.', 'This nickname is registered. Please choose a different nickname, or identify via /msg NickServ identify <password>.', 'This nickname is registered and protected.  If it is your']
        }
      }
    },
    identify: {
      error: {
        invalidpassword: invalidpassword = {
          msg: '%s is not a valid password.'
        },
        notregistered: {
          msg: '%s is not a registered nickname.',
          match: [/^.+ is not a registered nickname\.$/]
        },
        wrongpassword: {
          msg: 'Wrong password.',
          match: [/^Invalid password for .+\.$/]
        },
        alreadyidentified: alreadyidentified = {
          msg: 'You are already identified.'
        }
      },
      success: ['Password accepted - you are now recognized.', /^You are now identified for .+\.$/]
    },
    register: {
      error: {
        invalidpassword: invalidpassword,
        invalidemail: {
          msg: '%s is not a valid email address.',
          match: [/^.+ is not a valid email address\.$/]
        },
        invalidparameters: {
          msg: 'Invalid parameters for register',
          match: ['Your password is too long. Please try again with a shorter password.', /^Invalid parameters for REGISTER\.$/]
        },
        toomanyaccounts: {
          msg: '%s has too many accounts registered.',
          match: [/^.+ has too many accounts registered\.$/]
        },
        notenoughparameters: {
          msg: 'Insufficient parameters for register.',
          match: [/^Insufficient parameters for REGISTER\.$/]
        },
        alreadyregistered: {
          msg: 'You are already registered.',
          match: [/.+ is already registered\./]
        },
        alreadyidentified: alreadyidentified
      },
      success: [new RegExp('^Nickname .+ registered under your account'), new RegExp('^.+ is now registered to .+, with the password .+\.$')]
    },
    setPassword: {
      error: {
        invalidpassword: invalidpassword,
        invalidparameters: {
          msg: 'Invalid parameters for password.',
          match: [/^Invalid parameters for PASSWORD\.$/]
        },
        notidentified: notidentified = {
          msg: 'You must first be identified.'
        }
      },
      success: [/^The password for .+ has been changed to .+\.$/]
    },
    verifyRegistration: {
      error: {
        invalidnick: {
          msg: 'Nickname is invalid.'
        },
        invalidkey: {
          msg: 'Key is invalid.'
        },
        invalidparameters: {
          msg: 'Insufficient parameters for verify.',
          match: [/^Insufficient parameters for VERIFY\.$/]
        },
        notawaiting: {
          msg: '%s is not awaiting authorization.',
          match: [/^.+ is not awaiting authorization\.$/]
        },
        wrongkey: {
          msg: 'Wrong key.',
          match: [/^Verification failed\. Invalid key for .+\.$/]
        },
        notregistered: {
          msg: '%s is not registered.',
          match: [/^.+ is not registered\.$/]
        },
        notidentified: notidentified
      },
      success: [/^.+ has now been verified\.$/]
    }
  };
}).call(this);
