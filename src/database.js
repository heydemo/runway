import webSqlPromise from 'websql-promisified';

export default function getDatabase(name) {
  console.log(`DATABASE NAME: ${name}`);
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
  return webSqlPromise(db);
}
