var expect = require('chai').expect;
import Runway from '../src/index.js';
import t from 'tcomb';

import getDatabase from '../src/database.js';
import { Model } from '../src/index.js';
console.log('MODEL IS ');
console.log(Model);

let skip = () => {};

describe('runway', function() {
  it('Should create a database table for a Record', function() {
    const Exercise = getTestRecordClass();    
    var runway = new Runway('tester');
    runway.registerRecordClass(Exercise, 'Exercise');
    console.log('SQL');
    console.log(Exercise.sql);

    //let sql = runway.getCreateTableSql(Exercise, 'Exercise');
    //let expected_sql = "CREATE TABLE IF NOT EXISTS exercise (bliss_id TEXT, responses TEXT, createTime Integer, updateTime Integer)";
    //expect(sql).to.equal(expected_sql);
    //runway.createTable(Exercise);
  });
  /*
  it('Should get field definitions for a record class', function() {
    var runway = new Runway('tester');
    const Exercise = getTestRecordClass();    

    let fields = runway.getRecordClassJSFieldTypes(Exercise);
    let expected_fields = {
      bliss_id: 'string',
      responses: 'object',
      createTime: 'number',
      updateTime: 'number'
    }

    expect(fields).to.deep.equal(expected_fields);

  });

  it('Should insert Records into correctly', function(done) {
    var runway = new Runway('tester');
    const Exercise = getTestRecordClass();    

    let test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ], createTime: 0, updateTime: 0 }); 
    runway.registerRecordClass(Exercise, { sql_key: 'bliss_id' })
    .then(() => {
      let stringified_responses = JSON.stringify(test_exercise.responses);
      let sql = runway.getInsertRecordSql(test_exercise, 'Exercise');
      let expected_sql = "INSERT INTO Exercise (bliss_id, responses, createTime, updateTime)"; 
      expected_sql    += ` VALUES ('abc', '${stringified_responses}', 0, 0)`; 
      expect(sql).to.equal(expected_sql);
      done();
    })
    .catch(logTestError('Insert Records'));  
  });
  it('Should update Records correctly', function(done) {
    var runway = new Runway('tester');
    const Exercise = getTestRecordClass();    
    runway.registerRecordClass(Exercise, { sql_key: 'bliss_id' })
    .then(() => {
      let test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ], createTime: 0, updateTime: 0 }); 
      let stringified_responses = JSON.stringify(test_exercise.responses);
      let expected_sql = `UPDATE Exercise SET responses = '${stringified_responses}', createTime = 0, updateTime = 0 WHERE bliss_id = 'abc'`;
      let sql = runway.getUpdateRecordSql(test_exercise, 'Exercise');
      expect(sql).to.equal(expected_sql);
      done();
    })
    .catch(logTestError('Update Records'));  

  });
  it('Should delete Records correctly', function(done) {
    var runway = new Runway('tester');
    const Exercise = getTestRecordClass();    
    runway.registerRecordClass(Exercise, { sql_key: 'bliss_id' })
    .then(() => {
      let test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ], createTime: 0, updateTime: 0 }); 
      let sql = runway.getDeleteRecordSql(test_exercise, 'Exercise');
      let expected_sql = `DELETE FROM Exercise WHERE bliss_id = 'abc'`;
      expect(sql).to.equal(expected_sql);
      done();
    })
    .catch(logTestError('Delete Records'));  

  });
  it('Should retrieve a record by selected criteria', function(done) {
    var runway = new Runway('tester');
    const Exercise = getTestRecordClass();    
    runway.registerRecordClass(Exercise, { sql_key: 'bliss_id' })
    .then(() => {
      let test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ], createTime: 0, updateTime: 0 }); 
      let sql = runway.getFindRecordSql({ bliss_id: 'abc', createTime: 0 }, 'Exercise');
      let expected_sql = `SELECT * FROM Exercise WHERE bliss_id = 'abc' AND createTime = 0`;
      expect(sql).to.equal(expected_sql);
      done();
    })
    .catch(logTestError('Retrieve Records'));  
  });
  it('Should save / retrieve records', function(done) {
    var runway = new Runway('tester');
    const Exercise = getTestRecordClass();    
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ], createTime: 0, updateTime: 0 }); 

    runway.registerRecordClass(Exercise, { sql_key: 'bliss_id' })
    .then(() => {
      return runway.saveRecord(test_exercise, 'Exercise');
    })
    .then(() => {
      return runway.findRecords({ bliss_id: 'abc' }, 'Exercise');
    })
    .then((records) => {
      expect(records[0].responses).to.deep.equal(test_exercise.responses); 
      done();
    })
    .catch(logTestError('Save / Retrieve'));  
  });
*/



});

function getTestRecordClass() {
  let m = new Model({
      bliss_id:  t.String,
      responses: t.list(t.Object),
      createTime: t.Number,
      updateTime: t.Number,
    }, { name: 'Exercise', index: 'bliss_id'});

    console.log(m);

    return m;
}

function logTestError(test_description) {
  return (error) => {
    console.log(`Error in ${test_description}`);
    console.log(error);
  }
}
