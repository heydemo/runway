// #sourceURL=/var/www/my_node_modules/runway/src/sync.js
import Q from 'q';
Q.longStackSupport = true;
import findAll from 'parse-find-all';
import treatAsPromise from 'treat-as-promise';

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
    console.log('default error');
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
    return this.runway.executeSql(`SELECT * FROM ${RecordClassName} WHERE synced = 0`)
    .then((rows) => {
      let parse_models = this.convertRowsToParseModels(rows, RecordClassName);
      return this.saveParseModels(parse_models);
    })
    .then((parse_models) => {
      let records = parse_models.map(parse_model => {
        return this.parseModelToRecord(parse_model, RecordClass);
      });
      return this.markAsSynced(records, RecordClassName);
    })
    .catch((error) => {
      this.logError(error);
      throw error;
    });
  }
  convertRowsToParseModels(rows, RecordClassName) {
    let ParseClass = this.parse.Object.extend(RecordClassName);
    let parse_models = [];
    rows.forEach((row) => {
      let is_deleted = row.deleted;
      delete row.synced;
      let user_id = row.user_id;
      row = this.runway.unpackRecord(row, RecordClassName);
      let parse_model = new ParseClass(row);
      parse_model.set('deleted', is_deleted);
      this.setUserAndAclOnParseModel(parse_model, user_id);
      parse_models.push(parse_model);
    });
    return parse_models;
  }
  saveParseModels(parse_models) {
    if (parse_models.length > 0) {
      return this.parse.Object.saveAll(parse_models);
    }
    else {
      return treatAsPromise([]);
    }
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
  markAsSynced(Records, RecordClassName) {
    this.runway.markAsSynced(Records, RecordClassName);
  }
  syncDown() {
    var server_time;
    return this.getTimeFromServer()
    .then((time) => {
      server_time = time;
      return this.syncDownClasses();
    })
    .then(() => {
      return this.saveLastSyncDownTime(server_time);
    });
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
  saveLastSyncDownTime(time) {
    if (typeof localStorage !== 'undefined') {
      let key = this.getSyncDownTimeKey();
      localStorage.setItem(key, JSON.stringify(time));
    }
  }
  getLastSyncDownTime() {
    let time;
    if (typeof localStorage !== 'undefined') {
      let key = this.getSyncDownTimeKey();
      time = JSON.parse(localStorage.getItem(key));
    }
    return (typeof time === 'number') ? time : 0;
  }
  getSyncDownTimeKey() {
    let current_user_id = this.getUserId();
    return `runway_${this.runway.name}_${current_user_id}_last_sync_down_time`;
  }
  getTimeFromServer() {
    return this.parse.Cloud.run('getServerTime');
  }
  getVersionIds(RecordClassName) {
    return this.runway.executeSql(`SELECT * from ${RecordClassName}`)
    .then((rows) => {
      return rows.map(row => row.version_id);
    })
    .catch((e) => {
      console.log('getVersionIds error');
      console.log(e);
    });
  }
  syncDownClass(RecordClass, RecordClassName) {
    let version_id_promise  = this.getVersionIds(RecordClassName);
    let parse_model_promise = this.getSyncDownClassParseQuery(RecordClassName);

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
      return this.runway.saveRecords(records, RecordClassName, { update_version_ids: false, already_synced: true })
    });
  }
  getUserId() {
    return this.parse.User.current() ? this.parse.User.current().id : '';
  }
  getSyncDownClassParseQuery(RecordClassName) {
    let current_user_id = this.getUserId();
    let last_sync_down_time = this.getLastSyncDownTime();
    let query = new this.parse.Query(RecordClassName)
                              .equalTo('user_id', current_user_id)
                              .greaterThan('savedToParseTime', last_sync_down_time)
                              .addAscending('updateTime'); 

    return findAll(query);
  }
}

function removeProperties(obj, props) {
  let new_obj = {};
  Object.keys(obj).forEach((key) => {
    if (props.indexOf(key) === -1) {
      new_obj[key] = obj[key];
    }
  });
  return new_obj;
}

