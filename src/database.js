import WebSqlPromise from './webSqlPromise';
/* global sqlitePlugin */
/* global openDatabase */

export default function getDatabase(name) {
  var openDatabaseFunction;
  var db;
  if (typeof sqlitePlugin !== 'undefined') {
    db = sqlitePlugin.openDatabase({ name, location: 'default' });
  }
  // Built in Web SQL
  else if (typeof (openDatabase) !== 'undefined') {
    db = openDatabase(name, '1.0', 'Runway Database', 50000);
  }
  // Our node shim
  else {
    openDatabaseFunction = require('websql');
    db = openDatabaseFunction(name, '1.0', 'Runway Database', 50000);
  }
  return new WebSqlPromise(db);
}
