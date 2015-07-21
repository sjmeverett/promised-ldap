
promised-ldap
=============

This library is a quick-n-dirty shim over [ldapjs](https://github.com/mcavage/node-ldapjs) to add
promises and easier authentication.  It currently only supports the client interface.

Usage
-----

To create a new client:

```js
var LdapClient = require('promised-ldap');
var client = new LdapClient({url: 'ldap://127.0.0.1:389'});
```

The options argument to the constructor is identical to the options argument used in `ldapjs` for
`ldap.createClient`.  Please see the docs [here](http://ldapjs.org/client.html).

It supports the other methods documented there as well, except that instead of taking a callback, the methods
return a promise.  E.g.:

```js
client.bind('username', 'password').then(function () { ... });
```

The `search` method in `ldapjs` is now accessible (in promisified form) by `client._search`.  I
have provided a method `client.search` with similar behaviour as the original but an arguably
easier API.  E.g.:

```js
client.search(base, options).then(function (result) {
  /* result is:
  {
    entries: [...],
    references: [...]
  }
  no messing about with EventEmitters!
  */
});
```

Let's face it, the reason why you're messing about with LDAP is probably to add LDAP authentication
to your app, so I've added a couple of helper method for this:

```js
client.authenticate(base, cn, password).then(function (result) {
  // if the authentication succeeded, then result is the LDAP user object
  // otherwise, it is null
});
```

This basically does a `bind` using the supplied credentials, and if successful, does a `search` for
the specified user and returns that.

If all you really wanted was the user's name, email address, and list of unqualified groups, we
can do that too:

```js
client.authenticateUser(base, cn, password).then(function (result) {
  /*
  if the authentication succeeded, then result is:
  {
    name: <the user's DisplayName>,
    email: <the user's PrincipalName>,
    groups: <an array of the CNs of groups which are in the base CN>
  }
  otherwise, result is null
  */
});
```

Pull requests and suggestions are welcome!
