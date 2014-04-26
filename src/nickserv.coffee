{EventEmitter} = require 'events'

test           = require './regex.js'
notices        = require './notices.js'
NickServError  = require './NickServError.js'
queue          = require './queue.js'
cmds           = require './cmds.js'


module.exports = class Nick extends EventEmitter
  constructor: (@nick, @options = {}) ->
    # Keep track if this nick is registered/identified.
    @registered = @identified = false

    # Keep track of multi part notices.
    @blob = ''

    # Only set registered on `isRegistered()` check
    # if nick checked is the same as the current nick
    @on 'isregistered', (result, nick) ->
      if nick is @nick
        registered = result

    # A nick must be registered to be identifyable.
    @on 'identified', ->
      @identified = @registered = true

    @on 'loggedout', ->
      @identified = false

    # When registered, the user is also identified.
    # Identify does not need to be called.
    @on 'registered', ->
      @identified = @registered = true

    @on 'dropped', (nick) ->
      if nick is @nick
        @identified = @registered = false

    # Keep track of command aliases.
    @cmdState = {}
    for cmd of cmds
      @cmdState[cmd] = 0

    # Waits for NickServ to send notice with the right message
    # if called several times with the same command, will queue up
    # commands listening to each's reply one by one.
    @_queues = {}

  send: (cmd) ->
    throw new Error('Must implement NickServ#send()')

  # Receive notices by NickServ.
  message: (text) ->
    @blob += text + '\n'
    @emit 'notice', text
    @emit 'blob', @blob

  attach: (module, client) ->
    switch module
      when 'irc'
        client.on 'notice', (nick, to, text) =>
          if nick is 'NickServ'
            @message text
        @send = (text) ->
          client.say 'NickServ', text

  # Reset on reconnects and nick changes.
  reset: ->
    @registered = @identified = false

  _nickserv: (cmd, args, cb, args2) ->
    @_queues[cmd] ?= queue((task, callback) =>
      newcb = ->
        task.cb.apply(null, arguments)
        callback()

      # Will be called when nickserv sends message.
      wait = (text) ->
        if not @_checkError task, text, wait, newcb
          @_checkSuccess task.cmd, text, wait, newcb

      # wait for reply
      @on 'blob', wait
    , 1)

    # Send nickserv command immediately but only listen to the reply
    # to one of the same command at a time.
    @_queues[cmd].push
      cmd   : cmd
      args  : args
      cb    : cb
      args2 : args2

    msg = [cmds[cmd][@cmdState[cmd]]].concat(args).join(' ')
    @emit 'send', msg
    @send msg

  _checkError: (task, text, wait, cb) ->
    cmd = task.cmd
    for name, error of notices[cmd].error
      if error.match
        for m in error.match
          result = m.exec(text)
          if result
            @removeListener 'blob', wait
            @blob = ''

            # Check for unknownCommand error
            if name is 'unknownCommand' and @cmdState[cmd] isnt (cmds[cmd].length - 1)
              @cmdState[cmd]++
              @_nickserv cmd, task.args, task.cb, task.args2

            else
              new NickServError cb, name, notices[cmd], task.args2, result

            return true
    false

  _checkSuccess: (cmd, text, wait, cb) ->
    for m in notices[cmd].success
      result = m.exec(text)
      if result
        @removeListener 'blob', wait
        @blob = ''
        return cb(null, result)
    false

  # Callback function is called when it's identified/registered.
  ready: (options = @options, cb) ->
    if typeof options is 'function'
      cb = options
      options = @options

    # Only check if nick is registered if the password is provided
    # because with it we can identify/register.
    # Some servers allow you to stay logged in without identifying.
    if options.password
      @isRegistered @nick, (err, registered) =>
        # If it is registered, try to identify.
        if registered
          @identify options.password, cb

        # If it's not registered and email was provided too,
        # attempt to register.
        else if options.email
          @register options.password, options.email, cb

        # Return error if only one of them was given.
        else
          new NickServError cb, 'notRegistered',
            notices.isRegistered, [@nick]

    # Without password we can skip all this.
    else
      cb()

  # Returns true if nick has been identified.
  isIdentified: ->
    @identified

  # Check if nick is registered with nickserv.
  isRegistered: (nick, cb) ->
    @emit 'checkingregistered'

    # If nick is not provided, not async version.
    if not nick?
      return @registered

    if test.nick(nick)
      return new NickServError cb, 'invalidNick',
        notices.isRegistered, [nick]

    @info nick, (err) =>
      @registered = err?.type isnt 'notRegistered'
      @emit 'isregistered', @registered, nick
      cb null, @registered
  
  # Gets a bunch of info for a nick.
  info: (nick, cb) ->
    @emit 'gettinginfo'

    if test.nick(nick)
      return new NickServError cb, 'invalidNick',
        notices.info, [nick]

    newcb = (err, result) =>
      return cb err if err

      # Make info object.
      info =
        nick: result[1]
        realname: result[2]
      if result[4]
        info.online = if result[4] is 'online' then true else false
      else if result[6]
        info.online = true
        info.host = result[6]
      info.registered = result[7]
      if result[9]
        info.lastseen = result[9]
      if result[11]
        info.lastquitmsg = result[11]
      if result[13]
        info.email = result[13]
      if result[14]
        info.options = result[14].split(', ')

      @emit 'info', info
      cb(null, info)

    @_nickserv 'info', [nick, 'all'], newcb, [nick]

  # Identifies a nick calls cb on success or failure with err arg.
  identify: (password = @options.password, cb) ->
    @emit 'identifying'

    if @isIdentified()
      return new NickServError cb, 'alreadyIdentified', notices.identify

    # Check password is correct length, doesnt contain white space.
    if test.password(password)
      return new NickServError cb, 'invalidPassword', notices.identify,
        [password]

    newcb = (err) =>
      return cb err if err
      @emit 'identified'
      cb()

    @_nickserv 'identify', [password], newcb, [@nick]

  logout: (cb) ->
    @emit 'loggingout'

    if not @isIdentified()
      return new NickServError cb, 'notIdentified', notices.logout

    newcb = =>
      @emit 'loggedout'
      cb()

    @_nickserv 'logout', [], newcb

  # Register current nick with NickServ.
  # Calls cb on success or failure with err arg.
  register: (password = @options.password, email = @options.email, cb) ->
    @emit 'registering'

    if @isIdentified()
      return new NickServError cb, 'alreadyIdentified', notices.register
    if @isRegistered()
      return new NickServError cb, 'alreadyRegistered', notices.register

    # First check password and email.
    if test.password(password)
      return new NickServError cb, 'invalidPassword', notices.register,
        [password]
    if test.email(email)
      return new NickServError cb, 'invalidEmail', notices.register,
        [email]

    newcb = (err) =>
      if err
        if err.type is 'tooSoon'
          time = parseInt err.match[1]
          setTimeout =>
            @register password, email, cb
          , time * 1000
        else
          cb err if err
        return
      @emit 'registered'
      cb()

    @_nickserv 'register', [password, email], newcb, [email]

  # Drops a nick from your group and lets other register it.
  drop: (nick = @options.nick, cb) ->
    @emit 'dropping'

    if not @isIdentified()
      return new NickServError cb, 'notIdentified', notices.drop
    if test.nick(nick)
      return new NickServError cb, 'invalidNick', notices.drop, [nick]

    newcb = (err) =>
      return cb err if err
      @emit 'dropped'
      cb()

    @_nickserv 'drop', [nick], newcb, [nick]

  # Verify nick with a code sent through email.
  verify: (nick, key, cb) ->
    @emit 'verifying'

    if not @isIdentified()
      return new NickServError cb, 'notIdentified',
        notices.verifyRegistration
    if test.nick(nick)
      return new NickServError cb, 'invalidNick',
        notices.verifyRegistration, [nick]
    if test.key(key)
      return new NickServError cb, 'invalidKey',
        notices.verifyRegistration, [key]

    newcb = (err) =>
      return cb err if err
      @emit 'verified'
      cb()

    @_nickserv 'verify', [nick, key], newcb, [nick]

  # Changes current nick's password.
  setPassword: (password, cb) ->
    @emit 'settingpassword'

    if not @isIdentified()
      return new NickServError cb, 'notIdentified', notices.setPassword
    if test.password(password)
      return new NickServError cb, 'invalidPassword',
        notices.setPassword, [password]

    newcb = (err) =>
      return cb err if err
      @emit 'passwordset'
      cb()

    @_nickserv 'setPassword', [password], newcb, [password]
