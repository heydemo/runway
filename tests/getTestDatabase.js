import openDatabase from 'websql'; 
import webSqlPromise from '../src/webSqlPromise';

export default function getTestDatabase(name) {
  let db = openDatabase(':memory:', '1.0', name, 10000);
  return new webSqlPromise(db);
}
