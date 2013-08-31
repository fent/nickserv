{EventEmitter} = require 'events'

test           = require './regex.js'
notices        = require './notices.js'
NickServError  = require './NickServError.js'
queue          = require './queue.js'
cmds           = require './cmds.js'


class Nick extends EventEmitter
  constructor: (irc, @options = {}) ->
    # Custom functions for communicating.
    listen = (notice) ->
      irc.on 'notice', (nick, to, text) ->
        if nick is 'NickServ'
          notice(text)

    @send = (cmd) =>
      args = Array.prototype.slice.call(arguments).join(' ')
      @emit 'send', args
      irc.say 'NickServ', args


    # Emit notices by NickServ.
    # Keep track of multi part notices.
    blob = ''
    listen (text) =>
      blob += text + '\n'
      @emit 'notice', text
      @emit 'blob', blob


    # Keep track if this nick is registered/identified.
    registered = identified = false
    orignick = irc.nick

    # Reset on reconnects and nick changes.
    irc.on 'registered', ->
      registered = identified = false

    # Reset on nick change.
    irc.on 'nick', (oldnick, newnick) ->
      if oldnick is orignick
        orignick = newnick
        registered = identified = false

    # Only set registered on `isRegistered()` check
    # if nick checked is the same as the current nick
    @on 'isregistered', (result, nick) ->
      if nick is irc.nick
        registered = result

    # A nick must be registered to be identifyable.
    @on 'identified', ->
      identified = registered = true

    @on 'loggedout', ->
      identified = false

    # When registered, the user is also identified.
    # Identify does not need to be called.
    @on 'registered', ->
      identified = registered = true

    @on 'dropped', (nick) ->
      if nick is irc.nick
        identified = registered = false


    # Add a few extras to the irc object
    # Checks if irc object is connected.
    irc.isConnected = ->
      irc.conn?.connected


    # Keep track of command aliases.
    cmdState = {}
    for cmd of cmds
      cmdState[cmd] = 0


    # Default callback function will emit error event.
    # Used only when callback isn't given.
    dcb = (err) =>
      @emit 'error', err


    checkError = (task, text, wait, cb) =>
      cmd = task.cmd
      for name, error of notices[cmd].error
        if error.match
          for m in error.match
            result = m.exec(text)
            if result
              @removeListener 'blob', wait
              blob = ''

              # Check for unknownCommand error
              if name is 'unknownCommand' and cmdState[cmd] isnt (cmds[cmd].length - 1)
                cmdState[cmd]++
                @nickserv cmd, task.args, task.cb, task.args2

              else
                new NickServError cb, name, notices[cmd], task.args2, result

              return true
      false


    checkSuccess = (cmd, text, wait, cb) =>
      for m in notices[cmd].success
        result = m.exec(text)
        if result
          @removeListener 'blob', wait
          blob = ''
          return cb(null, result)
      false


    # Waits for NickServ to send notice with the right message
    # if called several times with the same command, will queue up
    # commands listening to each's reply one by one.
    queues = {}
    nickserv = (cmd, args, cb, args2) =>
      queues[cmd] ?= queue((task, callback) =>
        newcb = ->
          task.cb.apply(null, arguments)
          callback()

        # Will be called when nickserv sends message.
        wait = (text) ->
          if not checkError task, text, wait, newcb
            checkSuccess task.cmd, text, wait, newcb

        # wait for reply
        @on 'blob', wait
      , 1)

      # Send nickserv command immediately but only listen to the reply
      # to one of the same command at a time.
      queues[cmd].push
        cmd   : cmd
        args  : args
        cb    : cb
        args2 : args2

      @send.apply @, [cmds[cmd][cmdState[cmd]]].concat args


    # Callback function is called when it's connected, identified/registered.
    @ready = (cb = dcb, options = @options) ->
      connected = =>
        # Only check if nick is registered if the password is provided
        # because with it we can identify/register.
        # Some servers allow you to stay logged in without identifying.
        if options.password
          @isRegistered irc.nick, (err, registered) =>
            # If it is registered, try to identify.
            if registered
              @identify options.password, cb

            # If it's not registered and email was provided too,
            # attempt to register.
            else
              if options.email
                @register options.password, options.email, cb

              # Return error if only one of them was given.
              else
                new NickServError cb, 'notRegistered',
                  notices.isRegistered, [irc.nick]

        # Without password we can skip all this.
        else
          cb()


      # Connect client if not connected.
      if irc.isConnected()
        connected()
      else
        irc.connect(connected)


    # Returns true if nick has beenn identified.
    @isIdentified = ->
      identified


    # Check if nick is registered with nickserv.
    @isRegistered = (nick, cb = dcb) ->
      @emit 'checkingregistered'

      # If nick is not provided, not async version.
      if not nick?
        return registered

      if test.nick(nick)
        return new NickServError cb, 'invalidNick',
          notices.isRegistered, [nick]

      @info nick, (err) =>
        registered = err?.type isnt 'notRegistered'
        @emit 'isregistered', registered, nick
        cb null, registered

    
    # Gets a bunch of info for a nick.
    @info = (nick = irc.nick, cb = dcb) ->
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

      nickserv 'info', [nick, 'all'], newcb, [nick]


    # Identifies a nick calls cb on success or failure with err arg.
    @identify = (password = @options.password, cb = dcb) ->
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

      nickserv 'identify', [password], newcb, [irc.nick]


    @logout = (cb = dcb) ->
      @emit 'loggingout'

      if not @isIdentified()
        return new NickServError cb, 'notIdentified', notices.logout

      newcb = =>
        @emit 'loggedout'
        cb()

      nickserv 'logout', [], newcb


    # Register current nick with NickServ.
    # Calls cb on success or failure with err arg.
    @register = (password = @options.password, email = @options.email, cb = dcb) ->
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

      nickserv 'register', [password, email], newcb, [email]


    # Drops a nick from your group and lets other register it.
    @drop = (nick = irc.nick, cb = dcb) ->
      @emit 'dropping'

      if not @isIdentified()
        return new NickServError cb, 'notIdentified', notices.drop
      if test.nick(nick)
        return new NickServError cb, 'invalidNick', notices.drop, [nick]

      newcb = (err) =>
        return cb err if err
        @emit 'dropped'
        cb()

      nickserv 'drop', [nick], newcb, [nick]


    # Verify nick with a code sent through email.
    @verify = (nick, key, cb = dcb) ->
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

      nickserv 'verify', [nick, key], newcb, [nick]


    # Changes current nick's password.
    @setPassword = (password, cb = dcb) ->
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

      nickserv 'setPassword', [password], newcb, [password]


# Export.
module.exports =
  NickServ: Nick
  create: (client, options) ->
    client.nickserv = new Nick client, options
