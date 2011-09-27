(function() {
  var NickServError, vsprintf;
  vsprintf = require('sprintf').vsprintf;
  module.exports = NickServError = (function() {
    function NickServError(cb, type, notice, args) {
      var err;
      if (args == null) {
        args = [];
      }
      err = new Error(vsprintf(notice.error[type].msg, args));
      err.type = type;
      err.name = 'IRCError';
      cb(err);
    }
    return NickServError;
  })();
}).call(this);
