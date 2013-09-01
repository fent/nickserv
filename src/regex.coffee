# Regular expressions for validating various IRC fields.
regex =
  NICK: /^[A-Z_\-\[\]\\^{}|`][A-Z0-9_\-\[\]\\^{}|`]*$/i # rfc2812
  PASSWORD: /^[^\s]{5,}$/ # Checks for white space.
  EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i
  KEY: /^[A-Z0-9]+$/i

for name, r of regex
  do (r) ->
    exports[name.toLowerCase()] = (s) ->
      not r.test s
