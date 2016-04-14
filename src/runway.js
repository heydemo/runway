//@flow

import t from 'tcomb';
import { toObject } from 'tcomb-doc';
import objectValues from 'object-values';

import getDatabase from './database.js';

export default class RunWay {
  constructor(name) {
    this.name = name;
    this._db = getDatabase(name);
    this._RecordClasses = {};
  }
  executeSql(sql, args = []) {
    return this._db.transaction((tx) => tx.executeSql(sql, args));
  }
  getRecordClassName(RecordClass) {
    return RecordClass._name;
  }
  registerRecordClass(RecordClass) {
    let name = this.getRecordClassName(RecordClass);
    this._RecordClasses[name] = RecordClass;
    return this.createTable(RecordClass)
  }
  createTable(RecordClass) {
    let sql = this.getCreateTableSql(RecordClass);
    return this.executeSql(sql);
  }
  exists(index_value, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_key = this.getRecordClassIndex(RecordClass);
    return this.findRecords({ [index_key]: index_value }, RecordClassName)
    .then((records) => {
      return records.length > 0;
    });
  }
  saveRecord(Record, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_value = this.getRecordIndexValue(Record, RecordClassName);
    return this.exists(index_value, RecordClassName)
    .then((exists) => {
      return exists ? this.insertRecord(Record, RecordClassName) : this.updateRecord(Record, RecordClassName);
    })
  }
  insertRecord(Record, RecordClassName) {
    let sql = this.getInsertRecordSql(Record, RecordClassName);
    return this.executeSql(sql);
  }
  updateRecord(Record, RecordClassName) {
    let sql = this.getUpdateRecordSql(Record, RecordClassName);
    return this.executeSql(sql);
  }
  findRecords(fields, RecordClassName) {
    let sql = this.getFindRecordSql(fields, RecordClassName);
    return this.executeSql(sql)
    .then((result) => {
      return result[0].rows._array.map((row) => {
        return this.unpackRecord(row, RecordClassName);
      });
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
    return `${field_name} ${sql_type}`;
  }
  getSqlFieldType(field) {
    if (field.kind == 'list') {
      return 'TEXT';
    }
    else if (field.kind == 'irreducible') {
      switch (field.name) {
        case 'String':
          return 'TEXT';
          break;
        case 'Number':
          return 'Integer';
          break;
      }

    }
  }
  getJSFieldType(field) {
    if (field.kind == 'list' || field.name == 'Object') {
      return 'object';
    }
    else if (field.name == 'String') {
      return 'string';
    }
    else if (field.name == 'Number') {
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
    let index = RecordClass.sql.sql_key; 
    return index;
  }
  getCreateTableSql(RecordClass) {
    if (!RecordClass) {
      throw new Error('No RecordClass provided as first arg of getCreateTableSql');
    }
    console.log('RECORD CLASS');
    console.log(RecordClass.toString());
    let RecordClassName = this.getRecordClassName(RecordClass);
    let definition = toObject(RecordClass);
    let fields = definition.props;
    let parsed_fields = [];
    Object.keys(fields).forEach((field_name) => {
      let field = fields[field_name];
      parsed_fields.push(this.getFieldSql(field_name, field));
    });
    let fields_sql = parsed_fields.join(', ');
    return `CREATE TABLE IF NOT EXISTS ${RecordClassName.toLowerCase()} (${fields_sql})`;
  }
  getRecordExistsSql(Record, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_key   = this.getRecordClassIndex(RecordClass);
    return this.getFindRecordSql({ [index_key]: Record[index_key] }, RecordClassName);
  }
  getInsertRecordSql(Record, RecordClassName) {
    if (!RecordClassName) {
      throw new Error('RecordClassName not sent to getInsertRecordSql!');
    }
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let fields = this.getRecordClassJSFieldTypes(RecordClass);
    let columns_sql = Object.keys(fields).join(', ');
    let field_values = this.getRecordFieldValuesForSql(Record, RecordClass)
    let field_values_sql = objectValues(field_values).join(', ');
    let sql = `INSERT INTO ${RecordClassName} (${columns_sql}) VALUES (${field_values_sql})`;
    return sql;
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

    //We can't update the index as we use it for targeting
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
    let sql = `DELETE FROM ${RecordClassName} WHERE ${index_key} = ${index_value}`;
    return sql;
  }
  /**
   * Get SQL for retrieving a record
   * @param {Object} fields - columns to match on 
   * i.e. { id: 123, name: 'john' } => WHERE id = 123 AND name = 'john';
   *
   */
  getFindRecordSql(fields, RecordClassName) {
    let RecordClass = this.getRecordClassByName(RecordClassName);
    let index_key   = this.getRecordClassIndex(RecordClass);
    let field_values = this.getRecordFieldValuesForSql(fields, RecordClass);
    let where_sql_statements = [];
    Object.keys(field_values).forEach((field_name) => {
      let field_value = field_values[field_name];
      let where_sql_statement = `${field_name} = ${field_value}`;
      where_sql_statements.push(where_sql_statement);
    });
    let where_sql = where_sql_statements.join(' AND ');
    let sql = `SELECT * FROM ${RecordClassName} WHERE ${where_sql}`;
    return sql;
  }
  /**
   * Get Javascript type of each Record Class field
   * i.e. { age: 'number', name: 'string', pets: 'object' }
   */
  getRecordClassJSFieldTypes(RecordClass) {
    if (!RecordClass) {
      throw new Error('No RecordClass provided as first arg of getRecordClassJSFieldTypes');
    }
    let definition = toObject(RecordClass);
    let props = definition.props;
    let fields = {};
    Object.keys(props).forEach((field_name) => {
      let field = props[field_name];
      fields[field_name] = this.getJSFieldType(field);
    });
    return fields;
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
    Object.keys(Record).forEach((field_name) => {
      let type  = field_types[field_name];
      let value = this.formatFieldValueForSql(Record[field_name], type);
      field_values[field_name] = value;
    });

    return field_values;
  }
  formatFieldValueForSql(value, type) {
    switch (type) {
      case 'string':
        return "'" + value + "'";
        break;
      case 'number':
        return value;
        break;
      case 'object':
        return "'" + JSON.stringify(value) + "'";
        break;
      default:
        throw new Error(`Unknown type '${type}' sent to formatFieldValueForSql`);

    }
  }
}
