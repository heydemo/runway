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
          deferred.resolve(result);
        },
        (tx, error) => {
          deferred.reject(error);
        });
    });
    return deferred.promise;
  }
}
