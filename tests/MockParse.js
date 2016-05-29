import Q from 'q';
import MockQueryResults from './MockQueryResults';
var Parse = require('parse/node');

class MockParseQuery extends Parse.Query {
  find() {
    let deferred = Q.defer();
    deferred.resolve(MockQueryResults);
    return deferred.promise;
  }
}

export function getMockParseInterface() {
  return Object.assign({}, {
    initialize: function(...args) {
      return Parse.initialize.apply(Parse, args);
    },
    'Object': {
      extend: function(...args) {
        return Parse.Object.extend.apply(Parse, args);
      },
      saveAll: (parse_models) => {
        console.log('calling mock saveAll!');
        var deferred = Q.defer();
        deferred.resolve(parse_models);
        return deferred.promise;
      },
    },
    Query: MockParseQuery,
    User: {
      logIn: () => {},
      logOut: () => {},
      signUp: () => {},
      current: () => {
        return {
          id: 'test_id',
        };
      },
    },
    ACL: Parse.ACL,

  });
}

