import Q from 'q';

export default class webSqlPromise {
  constructor(db) {
    this._db = db;
  }
  executeSql(sql, args) {
    let deferred = Q.defer();
    this._db.transaction((tx) => {
      tx.executeSql(sql, args,
        (tx, result) => {
          var items;
          if (result.rows && result.rows._array) {
            items = result.rows._array;
          }
          if (isDroidResult(result)) {
            items = [];
            for (let x = 0; x < result.rows.length; x++) {
              items.push(result.rows.item(x));
            }
          }
          else {
            throw new Error('could not unpack result');
          }
          deferred.resolve(items);
        },
        (tx, error) => {
          deferred.reject(error);
        });
    });
    return deferred.promise;
  }
}

if (typeof window !== 'undefined') {
  window.webSqlPromise = webSqlPromise;
}

function isDroidResult(result) {
  return typeof result.rows !== 'undefined' && typeof result.rows.length !== 'undefined' && typeof result.rows.item === 'function';
}
