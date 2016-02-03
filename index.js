
var ldap = require('ldapjs');
var Promise = require('any-promise');


function Client(options) {
  this.client = ldap.createClient(options);
}


function promisify(fn) {
  return function () {
    var client = this.client;
    var args = Array.prototype.slice.call(arguments);

    return new Promise(function (resolve, reject) {
      args.push(function (err, result) {
        if (err) reject(err);
        else resolve(result);
      });

      client[fn].apply(client, args);
    });
  };
}


['bind', 'add', 'compare', 'del', 'exop', 'modify', 'modifyDN', 'unbind'].forEach(function (fn) {
  Client.prototype[fn] = promisify(fn);
});


Client.prototype.destroy = function () { this.client.destroy(); };
Client.prototype._search = promisify('search');


Client.prototype.search = function (base, options, controls) {
  var client = this.client;

  return new Promise(function (resolve, reject) {
    var searchCallback = function (err, result) {
      var r = {
        entries: [],
        references: []
      };

      result.on('searchEntry', function (entry) {
        r.entries.push(entry);
      });

      result.on('searchReference', function (reference) {
        r.references.push(reference);
      });

      result.on('error', function (err) {
        reject(err);
      });

      result.on('end', function (result) {
        if (result.status === 0) {
          resolve(r);
        } else {
          reject(new Error('non-zero status code: ' + result.status));
        }
      });
    };

    var args = ([base, options, controls, searchCallback])
      .filter(function (x) { return typeof x !== 'undefined'; });

    client.search.apply(client, args);
  });
};


Client.prototype.authenticate = function (base, cn, password) {
  var _this = this;

  return _this.bind('CN=' + cn + ',' + base, password).then(
    function () {
      return _this.search(base, {scope: 'sub', filter: '(cn=' + cn + ')'}).then(function (result) {
        return result.entries[0].object;
      });
    },
    function (err) {
      if (err.name === 'InvalidCredentialsError') {
        return null;
      } else {
        throw err;
      }
    }
  );
};


Client.prototype.authenticateUser = function (base, cn, password) {
  var dnRegex = new RegExp('^CN=([^,]+),' + base + '$');

  return this.authenticate(base, cn, password).then(function (result) {
    if (result) {
      var groups = [];

      if (result.memberOf) {
        groups = result.memberOf
          .map(function (x) { return (x.match(dnRegex) || [])[1]; })
          .filter(function (x) { return typeof x !== 'undefined'; });
      }

      return {
        email: result.userPrincipalName,
        name: result.displayName,
        groups: groups
      };

    } else {
      return null;
    }
  });
};

module.exports = Client;
