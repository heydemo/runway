import objectValues from 'object-values';
import Q from 'q';
Q.longStackSupport = true;
import generateId from './idGenerator';
import treatAsPromise from 'treat-as-promise';

if (typeof window !== 'undefined') {
  window.generateId = generateId;
}

import getDatabase from './database.js';

export default class RunWay {
  constructor(name, db = false, { user_id } = {}) {
    this.name = name;
    this._db_loaded = db ? treatAsPromise(db) : getDatabase(name);
    this._RecordClasses = {};
    this._subscribers = {};
    this._load_deferred = Q.defer();
    this._user_id = user_id || '';
    this.sql_error_count = 0;
    this.handleExecuteSqlError = this.handleExecuteSqlError.bind(this);
    this.saveRecord = this.saveRecords;
  }
  getUserId() {
    return this._user_id;
  }
  setUserId(user_id) {
    this._user_id = user_id;
  }
  onLoad() {
    return this._load_deferred.promise;
  }
  setLoaded() {
    this._load_deferred.resolve();
    return this._load_deferred;
  }
  log(mixed) {
    console.log(mixed);
  }
  executeSql(sql, args = [], retry_number = 0) {
    return this._db_loaded.then((db) => {
      return db.executeSql(sql, args);
    })
    .then((result) => {
      return this.getSqlResultRows(result);
    })
    .catch((error) => {
      this.log(error);
      this.log(`retry_number: ${retry_number}`);
      return this.handleExecuteSqlError({ sql, args, error, retry_number });
    });
  }
  handleExecuteSqlError({ sql, args, error, retry_number }) {
    this.sql_error_count++;
    if (this.sql_error_count > 5) {
      this.clear()
      .then(() => {
        document.location.reload();
      });
    }
    else if (retry_number === 0) {
      return this.recreateTables()
      .then(() => {
        retry_number++;
        return this.executeSql(sql, args, retry_number);
      });
    }
    else {
      console.log(`SQL ERROR ${error.message}`);
      console.log(sql);
      console.log(error);
      console.log(arguments);
      console.log('ERROR CODE');
      console.log(error.code);
    }
  }
  clear() {
    let table_names = Object.keys(this._RecordClasses);
    let promises = [];
    table_names.forEach((table_name) => {
      promises.push(this.executeSql(`DROP TABLE IF EXISTS ${table_name}`));
    });
    return Q.all(promises)
    .then(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      this.clearTablesCreated();
    });
  }
  getRecordClassName(RecordClass) {
    return RecordClass._name;
  }
  registerRecordClass(RecordClass) {
    let name = this.getRecordClassName(RecordClass);
    this._RecordClasses[name] = RecordClass;
    if (!this.tableAlreadyCreated(name)) {
      return this.createTable(RecordClass);
    }
    else {
      let deferred = Q.defer();
      deferred.resolve();
      return deferred.promise;
    }
  }
  getRecordClasses() {
    return this._RecordClasses;
  }
  createTable(RecordClass) {
    let create_table_sql = this.getCreateTableSql(RecordClass);
    let RecordClassName = this.getRecordClassName(RecordClass);
    let index_key = this.getRecordClassIndex(RecordClass);
    let promises = [];
    promises.push(this.executeSql(create_table_sql));
    promises.push(this.executeSql(`CREATE INDEX IF NOT EXISTS updateTime ON ${RecordClassName} (updateTime)`));
    promises.push(this.executeSql(`CREATE INDEX IF NOT EXISTS bliss_id ON ${RecordClassName} (${index_key})`));
    promises.push(this.executeSql(`CREATE INDEX IF NOT EXISTS deleted ON ${RecordClassName} (deleted)`));
    promises.push(this.executeSql(`CREATE INDEX IF NOT EXISTS synced ON ${RecordClassName} (synced)`));

    return Q.all(promises)
    .then(() => {
      this.setTableCreated(RecordClassName);
    });
  }
  // Create tables (if not exist)
  recreateTables() {
    let promises = [];
    Object.keys(this._RecordClasses).forEach((RecordClassName) => {
      let RecordClass = this._RecordClasses[RecordClassName];
      promises.push(this.createTable(RecordClass));
    });
    return Q.all(promises);
  }
  tableAlreadyCreated(table_name) {
    if (typeof localStorage !== 'undefined') {
      return !!localStorage.getItem(`runway_${this.name}_${table_name}_table_created`);
    }
    return false;
  }
  setTableCreated(table_name) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`runway_${this.name}_${table_name}_table_created`, true);
    }
  }
  clearTableCreated(table_name) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`runway_${this.name}_${table_name}_table_created`, true);
    }
  }
  clearTablesCreated() {
    Object.keys(this._RecordClasses).forEach((RecordClassName) => {
      this.clearTableCreated(RecordClassName);
    });
  }
  exists(index_value, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_key = this.getRecordClassIndex(RecordClass);
    // use _findRecords to find even deleted records here
    return this._findRecords({ [index_key]: index_value }, RecordClassName)
    .then((records) => {
      return records.length > 0;
    });
  }
  saveRecords(_Records, RecordClassName, { update_version_ids = true, update_subscribers = true, already_synced = false } = {}) {
    var Records;
    if (typeof _Records.length === 'undefined') {
      Records = [_Records];
    }
    else {
      Records = _Records;
    }
    if (Records.length > 0) {
      if (update_version_ids) {
        Records.forEach((Record, key) => {
          let version_id = generateId();
          Records[key] = Record.set('version_id', version_id);
        });
      }
      return this.insertRecord(Records, RecordClassName)
      .then(() => {
        if (already_synced) {
          return this.markAsSynced(Records, RecordClassName);
        }
      })
      .then(() => {
        if (update_subscribers) {
          return this.updateSubscribers(RecordClassName);
        }
      });
    }
    else {
      return treatAsPromise();
    }
  }
  markAsSynced(records, RecordClassName) {
    if (typeof records !== 'object' || typeof records.length === 'undefined') {
      throw new Error('Sent bad value to markAsSynced');
    }
    let version_ids = records.map(record => record.version_id);
    let version_id_string = "'" + version_ids.join("', '") + "'";
    let sql = `UPDATE ${RecordClassName} SET synced = 1 WHERE version_id in (${version_id_string})`;
    return this.executeSql(sql);
  }
  insertRecord(Record, RecordClassName) {
    let sql = this.getInsertRecordSql(Record, RecordClassName);
    return this.executeSql(sql);
  }
  updateRecord(Record, RecordClassName) {
    let sql = this.getUpdateRecordSql(Record, RecordClassName);
    return this.executeSql(sql);
  }
  deleteRecord(Record, RecordClassName) {
    RecordClassName || (RecordClassName = Record.class_name);
    let sql = this.getDeleteRecordSql(Record, RecordClassName);
    return this.executeSql(sql)
    .then(() => {
      return this.updateSubscribers(RecordClassName);
    });
  }
  findRecords(fields, RecordClassName) {
    // Screen out 'deleted' records
    // We don't actually delete because we need to sync the deletion
    let augmented_fields = Object.assign({ deleted: 0 }, fields);
    return this.onLoad()
    .then(() => {
      return this._findRecords(augmented_fields, RecordClassName);
    });
  }
  _findRecords(fields, RecordClassName) {
    let sql = this.getFindRecordSql(fields, RecordClassName);
    return this.executeSql(sql)
    .then((rows) => {
      return rows.map((row) => {
        return this.unpackRecord(row, RecordClassName);
      });
    });
  }
  getSqlResultRows(result) {
    return result;
    let sql_rows;
    let return_rows = [];
    if (result) {
      if (result.rows && result.rows._array) {
        sql_rows = result.rows._array;
      }
      else if (result.rows.length) {
        sql_rows = result.rows;
      }
    }
    if (sql_rows) {
      for (var count = 0; count < sql_rows.length; count++) {
        return_rows.push(sql_rows[String(count)]);
      }
    }
    return return_rows;
  }
  findRecord(fields, RecordClassName) {
    return this.findRecords(fields, RecordClassName)
    .then((records) => {
      return records[0];
    });
  }
  getRecordIndexValue(Record, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_key   = this.getRecordClassIndex(RecordClass);
    let index_value = Record[index_key];
    return index_value;
  }
  unpackRecord(record, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let field_types = this.getRecordClassJSFieldTypes(RecordClass);
    let unpacked_field_values = {};
    Object.keys(field_types).forEach((field_name) => {
      // Skip the internally used 'deleted' column
      if (field_name === 'deleted') {
        return;
      }
      let type = field_types[field_name];
      let value;
      switch (type) {
        case 'object':
          value = JSON.parse(record[field_name]);
          break;
        case 'string':
          value = record[field_name];
          break;
        case 'number':
          value = Number(record[field_name]);
          break;
        case 'boolean':
          value = Boolean(record[field_name]);
          break;
      }
      unpacked_field_values[field_name] = value;
    });
    return new RecordClass(unpacked_field_values);
  }
  getFieldSql(field_name, field) {
    let sql_type = this.getSqlFieldType(field);
    let def = sql_type === 'Integer' ? 0 : "''";
    return `${field_name} ${sql_type} NOT NULL DEFAULT ${def}`;
  }
  getSqlFieldType(field) {
    if (field.kind === 'list') {
      return 'TEXT';
    }
    else if (field.kind === 'irreducible') {
      switch (field.name) {
        case 'String':
          return 'TEXT';
        case 'Number':
          return 'Integer';
        case 'Object':
          return 'TEXT';
      }
    }
  }
  getJSFieldType(field) {
    if (field.kind === 'list' || field.name === 'Object') {
      return 'object';
    }
    else if (field.name === 'String') {
      return 'string';
    }
    else if (field.name === 'Number') {
      return 'number';
    }
  }
  getRecordClassByName(RecordClassName) {
    var RecordClass = this._RecordClasses[RecordClassName];
    if (!RecordClass) {
      throw new Error(`No record class of name '${RecordClassName}' has been registered!`);
    }
    return RecordClass;
  }
  getRecordClassIndex(RecordClass) {
    let index = RecordClass.sql.sql_index;
    return index;
  }
  getCreateTableSql(RecordClass) {
    if (!RecordClass) {
      throw new Error('No RecordClass provided as first arg of getCreateTableSql');
    }
    let index_key   = this.getRecordClassIndex(RecordClass);
    let RecordClassName = this.getRecordClassName(RecordClass);
    let fields = this.getFields(RecordClass);
    let field_keys = Object.keys(fields);
    let parsed_fields = [];
    field_keys.forEach((field_name) => {
      let field = fields[field_name];
      parsed_fields.push(this.getFieldSql(field_name, field));
    });
    parsed_fields.unshift('_id INTEGER PRIMARY KEY AUTOINCREMENT');
    parsed_fields.push('deleted INTEGER NOT NULL DEFAULT 0');
    parsed_fields.push('synced INTEGER NOT NULL DEFAULT 0');
    parsed_fields.push("user_id TEXT NOT NULL DEFAULT ''");
    let fields_sql = parsed_fields.join(', ');
    return `CREATE TABLE IF NOT EXISTS ${RecordClassName} (${fields_sql}, UNIQUE (${index_key}, version_id))`;
  }
  getFields(RecordClass) {
    let definition = RecordClass.getDefinition();
    let fields = definition.props;
    delete fields.class_name;
    delete fields.deleted;
    return fields;
  }
  getRecordExistsSql(Record, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_key   = this.getRecordClassIndex(RecordClass);
    return this.getFindRecordSql({ [index_key]: Record[index_key] }, RecordClassName);
  }
  getInsertRecordSql(Records, RecordClassName) {
    if (!RecordClassName) {
      throw new Error('RecordClassName not sent to getInsertRecordSql!');
    }
    if (typeof Records.length === 'undefined') {
      Records = [Records];
    }

    let columns_sql = this.getInsertRecordColumnValues(Records[0], RecordClassName).join(', ');
    let rows = [];
    Records.forEach((Record) => {
      let row = '(' + this.getInsertRecordRowValues(Record, RecordClassName).join(', ') + ')';
      rows.push(row);
    });
    let field_values_sql = rows.join(', ');

    let sql = `INSERT INTO ${RecordClassName} (${columns_sql}) VALUES ${field_values_sql}`;
    return sql;
  }
  getInsertRecordRowValues(Record, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let field_values = this.getRecordFieldValuesForSql(Record, RecordClass);
    field_values.user_id = `'${this.getUserId()}'`;
    let row_values = objectValues(field_values);
    return row_values;
  }
  getInsertRecordColumnValues(Record, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let field_values = this.getRecordFieldValuesForSql(Record, RecordClass);
    field_values.user_id = `'${this.getUserId()}'`;
    let column_values = Object.keys(field_values);
    return column_values;
  }
  getUpdateRecordSql(Record, RecordClassName) {
    if (!RecordClassName) {
      throw new Error('RecordClassName not sent to getUpdateRecordSql!');
    }
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let sql = `UPDATE ${RecordClassName} SET `;
    let set_sql_statements = [];

    let field_values = this.getRecordFieldValuesForSql(Record, RecordClass);
    let index_key   = this.getRecordClassIndex(RecordClass);
    let index_value = field_values[index_key];

    // We can't update the index as we use it for targeting
    delete field_values[index_key];
    Object.keys(field_values).forEach((field_name) => {
      let field_value = field_values[field_name];
      let set_sql_statement = `${field_name} = ${field_value}`;
      set_sql_statements.push(set_sql_statement);
    });
    sql += set_sql_statements.join(', ');
    sql += ` WHERE ${index_key} = ${index_value}`;
    return sql;
  }
  getDeleteRecordSql(Record, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_key   = this.getRecordClassIndex(RecordClass);
    let field_values = this.getRecordFieldValuesForSql(Record, RecordClass);
    let index_value = field_values[index_key];
    let sql = `UPDATE ${RecordClassName} SET deleted = 1 WHERE ${index_key} = ${index_value}`;
    return sql;
  }
  /**
   * Get SQL for retrieving a record
   * @param {Object} fields - columns to match on
   * i.e. { id: 123, name: 'john' } => WHERE id = 123 AND name = 'john';
   *
   */
  getFindRecordSql(fields, RecordClassName) {
    let order_by_sql = '';
    if (fields.orderBy) {
      order_by_sql = this.getOrderBySql(fields.orderBy);
      delete fields.orderBy;
    }
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_key   = this.getRecordClassIndex(RecordClass);
    let field_values = this.getRecordFieldValuesForSql(fields, RecordClass);
    let where_sql_statements = [];
    Object.keys(field_values).forEach((field_name) => {
      let field_value = field_values[field_name];
      let where_sql_statement = `${field_name} = ${field_value}`;
      where_sql_statements.push(where_sql_statement);
    });
    where_sql_statements.push(`user_id = '${this.getUserId()}'`);
    let where_sql = '';
    if (where_sql_statements.length > 0) {
      where_sql = 'WHERE ' + where_sql_statements.join(' AND ');
    }
    let select_sql  = this.getFieldsSelectSql(RecordClass);
    let sql = `SELECT ${select_sql} FROM ${RecordClassName} ${where_sql} GROUP BY ${index_key} ${order_by_sql}`;
    return sql;
  }
  getOrderBySql(order_by) {
    let field     = order_by[0];
    let direction = order_by[1];  // ASC of DESC
    return `ORDER BY ${field} ${direction}`;
  }
  getFieldsSelectSql(RecordClass) {
    let fields = this.getFields(RecordClass);
    delete fields.updateTime;
    let sql = Object.keys(fields).join(', ') + ', updateTime, max(_id) as _id';
    return sql;
  }
  escape(value) {
    if (typeof value === 'string') {
      // Replace single quote with two single quotes
      return value.replace(new RegExp("'", 'g'), "''");
    }
    else {
      return value;
    }
  }
  /**
   * Get Javascript type of each Record Class field
   * i.e. { age: 'number', name: 'string', pets: 'object' }
   */
  getRecordClassJSFieldTypes(RecordClass) {
    if (!RecordClass) {
      throw new Error('No RecordClass provided as first arg of getRecordClassJSFieldTypes');
    }
    let fields = this.getFields(RecordClass);
    let js_field_types = {};
    Object.keys(fields).forEach((field_name) => {
      let field = fields[field_name];
      js_field_types[field_name] = this.getJSFieldType(field);
    });
    return js_field_types;
  }
  /**
   * Get array of field values formatted for SQL
   * adding quotes to strings and JSON encoding objects
   *
   * i.e. { age: 42, name: "'Bobby'" }
   */
  getRecordFieldValuesForSql(Record, RecordClass) {
    let field_values = {};
    let field_types = this.getRecordClassJSFieldTypes(RecordClass);
    let field_keys = Object.keys(Record).filter(key => key !== 'class_name' && key !== 'deleted');
    field_keys.forEach((field_name) => {
      let type  = field_types[field_name];
      let value = this.formatFieldValueForSql(Record[field_name], type);
      field_values[field_name] = value;
    });
    if (typeof Record.deleted === 'number') {
      field_values.deleted = Record.deleted;
    }

    return field_values;
  }
  formatFieldValueForSql(value, type) {
    switch (type) {
      case 'string':
        return "'" + this.escape(value) + "'";
      case 'number':
        return value;
      case 'object':
        return "'" + this.escape(JSON.stringify(value)) + "'";
      default:
        throw new Error(`Unknown type '${type}' sent to formatFieldValueForSql`);
    }
  }
  subscribe(RecordClassName, callback) {
    if (!RecordClassName || !callback) {
      throw new Error('runway.subscribe requires a RecordClassName and callback as first and second args');
    }
    this._subscribers[RecordClassName] || (this._subscribers[RecordClassName] = []);
    this._subscribers[RecordClassName].push(callback);
    return this.getUnsubscribeFunction(callback, RecordClassName);
  }
  getUnsubscribeFunction(callback, RecordClassName) {
    let index = this._subscribers[RecordClassName].indexOf(callback);
    let unsubscribe = () => {
      this._subscribers[RecordClassName].splice(index, 1);
    };
    return unsubscribe.bind(this);
  }
  updateAllSubscribers() {
    Object.keys(this._subscribers).forEach(
      (RecordClassName) => {
        this.updateSubscribers(RecordClassName);
      }
    );
  }
  updateSubscribers(RecordClassName) {
    let deferred = Q.defer();
    let subscribers = this._subscribers[RecordClassName] || [];
    let global_subscribers = this._subscribers['all'] || [];
    setTimeout(() => {
      subscribers.concat(global_subscribers).forEach((subscriber) => {
        subscriber();
      });
      deferred.resolve();
    });
    return deferred.promise;
  }
}

