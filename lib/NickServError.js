(function() {
  var NickServError, vsprintf;

  vsprintf = require('sprintf').vsprintf;

  module.exports = NickServError = (function() {

    function NickServError(cb, type, notice, args, match) {
      var err;
      if (args == null) args = [];
      err = new Error(vsprintf(notice.error[type].msg, args));
      err.type = type;
      err.name = 'NickServError';
      err.match = match;
      cb(err);
    }

    return NickServError;

  })();

}).call(this);
