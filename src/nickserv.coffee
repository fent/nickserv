# dependencies
async          = require 'async'
{EventEmitter} = require 'events'

test           = require './regex.js'
notices        = require './notices.js'
NickServError  = require './NickServError.js'


class Nick extends EventEmitter
  constructor: (irc, @options = {}) ->
    # custom functions for communicating
    listen = (notice) ->
      irc.on 'notice', (nick, to, text) ->
        if nick is 'NickServ'
          notice(text)

    send = (text) ->
      irc.say 'NickServ', text

    # emit notices by NickServ
    listen (text) =>
      @emit 'notice', text


    # keep track if this nick is registered/identified
    registered = identified = false

    # reset on reconnects
    irc.on 'registered', ->
      registered = identified = false

    # only set registered on isRegistered check
    # if nick checked is the same as the current nick
    @on 'isregistered', (result, nick) ->
      if nick is irc.nick
        registered = result

    # when registered, the user is also identified
    # identify does not need to be called
    @on 'registered', ->
      identified = true
      registered = true

    # a nick must be registered to be identifyable
    @on 'identified', ->
      identified = true
      registered = true


    # add a few extras to the irc object
    # checks if irc object is connected
    irc.isConnected = ->
      irc.conn?.connected

    # calls callback when connected
    irc.connect = ((connect) ->
      (retry, callback) ->
        if typeof retry is 'function'
          callback = retry
          retry = undefined
        irc.once 'registered', callback
        connect.call(irc, retry)
    )(irc.connect)

    # calls callback when disconnected
    irc.disconnect = ((disconnect) ->
      (msg, callback) ->
        if typeof msg is 'function'
          callback = msg
          msg = undefined
        irc.conn.once 'end', callback
        disconnect.call(irc, msg)
    )(irc.disconnect)


    # default callback function will emit error event
    # used only when callback isn't given
    dcb = (err) =>
      @emit 'error', err


    checkError = (notices, text, wait, cb, args) =>
      for name, error of notices.error
        if error.match
          for m in error.match
            if (m.test? and m.test(text)) or m is text
              @removeListener 'notice', wait
              new NickServError cb, name, notices, args
              return true
      false

    checkSuccess = (notices, text, wait, cb) =>
      for m in notices.success
        if (m.test? and m.test(text)) or m is text
          @removeListener 'notice', wait
          return cb()
      false


    # waits for NickServ to send notice with the right message
    # if called several times with the same command, will queue up
    # commands listening to each's reply one by one
    queues = {}
    nickserv = (cmd, msg, cb, notices, args) =>
      queues[cmd] ?= async.queue((task, callback) =>
        newcb = (err) ->
          task.cb(err)
          callback()

        # will be called when nickserv sends message
        wait = (text) ->
          if not checkError task.notices, text, wait, newcb, task.args
            checkSuccess task.notices, text, wait, newcb

        # wait for reply
        @on 'notice', wait
      , 1)

      # send nickserv command immediately but only listen to the reply
      # to one of the same command at a time
      queues[cmd].push
        cb      : cb
        notices : notices
        args    : args

      msg = cmd + ' ' + msg
      send msg
      @emit 'send', msg


    # callback function is called when it's connected, identified,
    @ready = (cb = dcb, options = @options) ->
      connected = =>
        # only check if nick is registered if the password is provided
        # because with it we can identify/register
        # some servers allow you to stay logged in without identifying
        if options.password
          @isRegistered irc.nick, (err, registered) =>
            # if it is registered and a password was provided,
            # try to identify
            if registered
              @identify options.password, cb

            # if it's not registered and password and email were provided,
            # attempt to register
            else
              if options.email
                @register options.password, options.email, cb

              # return error if only one of them was given
              else
                new NickServError cb, 'notregistered',
                  notices.isRegistered, [irc.nick]

        # without password we can skip all this
        else
          cb()


      # connect client if not connected
      if irc.isConnected()
        connected()
      else
        irc.connect(connected)


    # returns true if nick has beenn identified
    @isIdentified = ->
      identified


    # check if nick is registered with nickserv
    @isRegistered = (nick, cb = dcb) ->
      @emit 'checkingregistered'

      # if nick is not privided, not async version
      if not nick?
        return registered

      if test.nick(nick)
        return new NickServError cb, 'invalidnick',
          notices.isRegistered, [nick]

      nickserv 'verify register', "#{nick} key", ((err) =>
        registered = err.type is 'registered'
        @emit 'isregistered', registered, nick
        cb null, registered

        ), notices.isRegistered, [nick]


    # identifies a nick calls cb on success or failure with err arg
    @identify = (password = @options.password, cb = dcb) ->
      @emit 'identifying'

      if @isIdentified()
        return new NickServError cb, 'alreadyidentified', notices.identify

      # check password is correct length, doesnt contain white space
      if test.password(password)
        return new NickServError cb, 'invalidpassword', notices.identify,
          [password]

      newcb = (err) =>
        return cb err if err
        @emit 'identified'
        cb()

      nickserv 'identify', password, newcb, notices.identify, [irc.nick]


    # register current nick with NickServ
    # calls cb on success or failure with err arg
    @register = (password = @options.password, email = @options.email, cb = dcb) ->
      @emit 'registering'

      if @isIdentified()
        return new NickServError cb, 'alreadyidentified', notices.register
      if @isRegistered()
        return new NickServError cb, 'alreadyregistered', notices.register

      # first check password and email
      if test.password(password)
        return new NickServError cb, 'invalidpassword', notices.register,
          [password]
      if test.email(email)
        return new NickServError cb, 'invalidemail', notices.register,
          [email]

      newcb = (err) =>
        return cb err if err
        @emit 'registered'
        cb()

      nickserv 'register', "#{password} #{email}", newcb, notices.register,
        [email]


    # verify nick with a code sent through email
    @verify = (nick, key, cb = dcb) ->
      @emit 'verifying'

      if not @isIdentified()
        return new NickServError cb, 'notidentified',
          notices.verifyRegistration
      if test.nick(nick)
        return new NickServError cb, 'invalidnick',
          notices.verifyRegistration, [nick]
      if test.key(key)
        return new NickServError cb, 'invalidkey',
          notices.verifyRegistration, [key]

      newcb = (err) =>
        return cb err if err
        @emit 'verified'
        cb()

      nickserv 'verify register', "#{nick} #{key}", newcb,
        notices.verifyRegistration, [nick]


    # changes current nick's password
    @setPassword = (password, cb = dcb) ->
      @emit 'settingpassword'

      if not @isIdentified()
        return new NickServError cb, 'notidentified', notices.setPassword
      if test.password(password)
        return new NickServError cb, 'invalidpassword',
          notices.setPassword, [password]

      newcb = (err) =>
        return cb err if err
        @emit 'passwordset'
        cb()

      nickserv 'set password', password, newcb, notices.setPassword,
        [password]


# export
module.exports =
  NickServ: Nick
  create: (client, options) ->
    client.nickserv = new Nick client, options
