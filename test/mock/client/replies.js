exports.errors = {
  unknownCommand: 'Unknown command %s. "/msg NickServ HELP" for help.',
  notRegistered: '%s is not a registered nickname.',
  wrongPassword: 'Invalid password for %s.',
  networkServices: 'Nick %s is part of this Network\'s Services.',
  awaitingVerification: 'This nick is awaiting an e-mail verification code before completing registration.',
  invalidPassword: '%s is not a valid password.',
  invalidEmail: '%s is not a valid email address.',
  invalidParameters: 'Invalid parameters for %s.',
  tooManyAccounts: '%s has too many accounts registered.',
  notEnoughParameters: 'Insufficient parameters for %s.',
  alreadyRegistered: '%s is already registered.',
  tooSoon: 'You must have been using this nick for at least %d %s to register',
  accessDenied: 'Access denied.',
  notAwaiting: '%s is not awaiting authorization.',
  wrongKey: 'Verification failed. Invalid key for %s.',
};

exports.success = {
  identify: 'Password accepted - you are now recognized.',
  logout: 'Your nick has been logged out.',
  register: 'Nickname %s registered under your account.',
  drop: 'Nickname %s has been dropped.',
  set: {
    password: 'The password for %s has been changed to %s.'
  },
  verify: '%s has now been verified.',
  info: {
    who:        '%s is %s',
    online:     '%s is currently online.',
    offline:    '%s is currently offline.',
    from:       '   Is online from: %s',
    registered: '  Time registered: %s',
    lastSeen:   '   Last seen time: %s',
    lastQuitMsg:   'Last quit message: %s',
    email:      '   E-mail address: %s',
    options:    '          Options: %s'
  }
}
