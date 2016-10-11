import WebSqlPromise from './webSqlPromise';
import Q from 'q';
import device_ready_promise from './deviceReadyPromise';
/* global sqlitePlugin */
/* global openDatabase */

/**
 * Return an instance of the SQL database relevant to our environment
 * i.e. Android native, WebSQL, etc
 */
export default function getDatabase(name) {
  var deferred = Q.defer();
  var db;
  device_ready_promise.then(() => {
    if (typeof sqlitePlugin !== 'undefined') {
      db = sqlitePlugin.openDatabase({ name, location: 'default' },
        () => {
          db = new WebSqlPromise(db);
          deferred.resolve(db);
        },
        (error) => {
          console.log(error);
          deferred.reject(error);
        }
      );
    }
    // Built in Web SQL
    else if (typeof openDatabase !== 'undefined') {
      console.log('Database: Using browser webSql');
      db = openDatabase(name, '1.0', 'Runway Database', 50000,
        () => {
        },
        (error) => {
          console.log(error);
          deferred.reject(error);
        }
      );
      db = new WebSqlPromise(db);
      deferred.resolve(db);
    }
    // Our node shim
    else {
      console.log('Database: Using node shim');
      var openDatabaseFunction = require('websql');
      db = openDatabaseFunction(name, '1.0', 'Runway Database', 50000,
        () => {
          db = new WebSqlPromise(db);
          deferred.resolve(db);
        },
        (error) => {
          console.log(error);
          deferred.reject(error);
        }
      );
    }
  });

  return deferred.promise;
}
