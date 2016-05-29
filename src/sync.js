import Q from 'q';

/**
 *  Runway interface
 *    getRecordClasses
 *
 */

export default class Syncer {
  constructor(runway, options) {
    this.runway = runway;
    // Parse API
    this.parse = options.parse;
    this.syncing_in_progress = false;
    // Used to track sync calls during sync - do we need to resync after sync completes
    this.resync = false;
    // On fail, how long to wait before re-trying sync in MS
    this.retry_interval = 60000;
    this.max_retry_attempts = 10;

    this.handleSyncUpSuccess = this.handleSyncUpSuccess.bind(this);
    this.handleSyncUpFail = this.handleSyncUpFail.bind(this);

    this.logError = options.logError || this.defaultLogError.bind(this);
  }
  setRetryInterval(interval) {
    this.retry_interval = interval;
    this.retry = true;
  }
  syncUp() {
    this.sync_deferred || (this.sync_deferred = Q.defer());
    if (this.syncing_in_progress) {
      this.resync = true;
      return this.sync_deferred.promise;
    }
    this.syncing_in_progress = true;
    this.syncUpClasses()
    .then(
      this.handleSyncUpSuccess,
      this.handleSyncUpFail
    );

    return this.sync_deferred.promise;
  }
  handleSyncUpSuccess() {
    this.syncing_in_progress = false;
    if (this.resync) {
      this.resync = false;
      return this.syncUp();
    }
    else {
      this.sync_deferred.resolve();
      this.sync_deferred = false;
    }
  }
  handleSyncUpFail(error) {
    try {
      if (this.errorIsUnexpected(error)) {
        this.logError(error);
      }
      setTimeout(() => {
        this.syncing_in_progress = false;
        this.syncUp();
      }, this.retry_interval);
    }
    catch (e) {
      console.log('sync up fail!');
      console.log(e);
    }
  }
  defaultLogError(error) {
    console.log(error);
  }
  errorIsUnexpected(error) {
    let expected_errors = {
      100: 'CONNECTION_FAILED',
    };
    if (error.code && expected_errors[error.code] !== -1) {
      return true;
    }
    return false;
  }
  syncUpClasses() {
    let record_classes = this.runway.getRecordClasses();
    let promises = [];
    Object.keys(record_classes).forEach((RecordClassName) => {
      let RecordClass = record_classes[RecordClassName];
      promises.push(this.syncUpClass(RecordClass, RecordClassName));
    });
    return Q.all(promises);
  }
  syncUpClass(RecordClass, RecordClassName) {
    let ParseClass = this.parse.Object.extend(RecordClassName);
    let parse_models = [];
    return this.runway.executeSql(`SELECT * FROM ${RecordClassName} WHERE deleted = 0 and synced = 0`)
    .then((rows) => {
      rows.forEach((row) => {
        delete row.synced;
        let user_id = row.user_id;
        row = this.runway.unpackRecord(row, RecordClassName);
        let parse_model = new ParseClass(row);
        this.setUserAndAclOnParseModel(parse_model, user_id);
        parse_models.push(parse_model);
      });
      return this.parse.Object.saveAll(parse_models)
      .then(
        (parse_models) => {
          if (!parse_models) {
            throw new Error('parse_models undefined from Parse.Object.saveAll');
          }
          let records = parse_models.map(parse_model => {
            return this.parseModelToRecord(parse_model, RecordClass);
          });
          return this.markAsSynced(records, RecordClassName);
        }
      );
    })
    .catch((error) => {
      console.log('ERROR in sync up');
      console.log(error);
      throw error;
    });
  }
  setUserAndAclOnParseModel(parse_model, user_id) {
    if (typeof user_id !== 'string') {
      throw new Error('No user id for parse model');
    }
    parse_model.set('user_id', user_id);
    var acl = new this.parse.ACL();
    acl.setPublicWriteAccess(false);
    acl.setPublicReadAccess(false);
    acl.setReadAccess(user_id, true);
    acl.setWriteAccess(user_id, true);

    parse_model.setACL(acl);
  }
  parseModelToRecord(parse_model, RecordClass) {
    let obj = parse_model.toJSON();
    delete obj.createdAt;
    delete obj.updatedAt;
    delete obj.objectId;
    return new RecordClass(obj);
  }
  markAsSynced(records, RecordClassName) {
    let version_ids = records.map(record => record.version_id);
    let version_id_string = "'" + version_ids.join("', '") + "'";
    return this.runway.executeSql(`UPDATE ${RecordClassName} SET synced = 1 WHERE version_id in (${version_id_string})`);
  }
  syncDown() {
    return this.syncDownClasses();
  }
  syncDownClasses() {
    let record_classes = this.runway.getRecordClasses();
    let promises = [];
    Object.keys(record_classes).forEach((RecordClassName) => {
      let RecordClass = record_classes[RecordClassName];
      promises.push(this.syncDownClass(RecordClass, RecordClassName));
    });
    return Q.all(promises);
  }
  getVersionIds(RecordClassName) {
    return this.runway.executeSql(`SELECT * from ${RecordClassName}`)
    .then((rows) => {
      return rows.map(row => row.version_id);
    })
    .catch((e) => {
      console.log(e);
    });
  }
  syncDownClass(RecordClass, RecordClassName) {
    let current_user = this.parse.User.current();
    let query = new this.parse.Query(RecordClassName);
    let parse_model_promise = query.equalTo('user', current_user).find();
    let version_id_promise = this.getVersionIds(RecordClassName);

    return Q.all([parse_model_promise, version_id_promise])
    .then((values) => {
      let parse_models = values[0];
      let existing_version_ids = values[1];
      let records = parse_models.map(parse_model => {
        return this.parseModelToRecord(parse_model, RecordClass);
      })
      .filter((record) => {
        let index = existing_version_ids.indexOf(record.version_id);
        return index === -1;
      });
      let update_version_ids = false;
      return this.runway.saveRecords(records, RecordClassName, update_version_ids);
    });
  }
}

