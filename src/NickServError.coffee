{vsprintf} = require 'sprintf'

# makes an irc error object and calls callback
module.exports = class NickServError
  constructor: (cb, type, notice, args = [], match) ->
    err = new Error vsprintf notice.error[type].msg, args
    err.type = type
    err.name = 'NickServError'
    err.match = match
    cb err
