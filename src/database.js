import webSqlPromise from 'websql-promise';

export default function getDatabase(name) {
  var openDatabaseFunction;
  //Built in Web SQL
  if (typeof(openDatabase) != 'undefined') {
    openDatabaseFunction = openDatabase;
  }
  //Our node shim
  else {
    openDatabaseFunction = require('websql');
  }
  var db = openDatabaseFunction(name, "1.0", "Runway Database", 50000);
  return new webSqlPromise(db);
}
