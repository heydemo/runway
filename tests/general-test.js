var expect = require('chai').expect;
import getTestRecordClass, { getTestRecords, logTestError } from './getTestRecordClass';
import getTestDatabase from './getTestDatabase';
import { Runway } from '../src/index';
/* global describe beforeEach it */

// eslint-disable-next-line no-unused-vars
let skip = () => {};

describe('runway', function() {
  var Exercise, runway;
  var db_count = 0;

  beforeEach(() => {
    Exercise = getTestRecordClass();
    let name = 'tester_database' + db_count++;
    let db = getTestDatabase(':memory:');
    runway = new Runway(name, db);
    return runway.registerRecordClass(Exercise, 'Exercise')
    .then(() => {
      return runway.setLoaded();
    });
  });

  it('Should re-create tables if they are accidentally deleted somehow', function(done) {
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: "blah blah blah, ain't no thang" } ], createTime: 0, updateTime: 0 });

    // We are purposefully creating an error, so ignore
    runway.log = () => { };
    runway.executeSql('DROP TABLE Exercise')
    .then(() => {
      return runway.saveRecord(test_exercise, 'Exercise');
    })
    .then(() => {
      return runway.findRecord({ bliss_id: 'abc' }, 'Exercise');
    })
    .then((record) => {
      expect(record.responses).to.deep.equal(test_exercise.responses);
      done();
    })
    .catch(logTestError('Re-Create Tables on accidental deletion test'));
  });

  it('Should actually delete', function(done) {
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: "blah blah blah, ain't no thang" } ], createTime: 0, updateTime: 0 });

    runway.saveRecord(test_exercise, 'Exercise')
    .then(() => {
      return runway.deleteRecord(test_exercise);
    })
    .then(() => {
      return runway.findRecord({ bliss_id: 'abc' }, 'Exercise');
    })
    .then((record) => {
      expect(record).to.equal(undefined);
      done();
    })
    .catch(logTestError('Delete Record'));
  });

  it('Should save / retrieve records', function(done) {
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: "blah blah blah, ain't no thang" } ], createTime: 0, updateTime: 0 });

    runway.saveRecord(test_exercise, 'Exercise')
    .then(() => {
      return runway.findRecords({ bliss_id: 'abc' }, 'Exercise');
    })
    .then((records) => {
      expect(typeof (records[0])).to.equal('object');
      expect(records[0].responses).to.deep.equal(test_exercise.responses);
      expect(records[0].version_id).to.not.equal('undefined');
      expect(records[0].version_id).to.be.ok;
      done();
    })
    .catch(logTestError('Save / Retrieve'));
  });

  it('Should save multiple records', function(done) {
    let records = getTestRecords();
    runway.saveRecords(records, 'Exercise')
    .then(() => {
      return runway.findRecords({}, 'Exercise');
    })
    .then((records) => {
      expect(records.length).to.equal(3);
      expect(records[0].version_id).to.not.equal(undefined);
      expect(records[0].version_id).to.not.equal('undefined');
      done();
    })
    .catch(logTestError('Save multiple records'));
  });

  it('Should delete the database', function(done) {
    runway.clear()
    .then(() => {
      return runway.executeSql('SELECT tbl_name from sqlite_master');
    })
    .then((rows) => {
      expect(rows.length).to.equal(1);
      done();
    })
    .catch(logTestError('Delete database'));
  });

  it('Should update an existing record correctly', function(done) {
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: "blah blah doesn't matter blah" } ], createTime: 0, updateTime: 0 });
    var updated_exercise;
    updated_exercise = test_exercise.set('responses', [{ updated: 'it is true' }]);
    runway.saveRecord(test_exercise, 'Exercise')
    .then(() => {
      return runway.saveRecord(updated_exercise, 'Exercise');
    })
    .then(() => {
      return runway.findRecords({ bliss_id: 'abc' }, 'Exercise');
    })
    .then((records) => {
      expect(typeof (records[0])).to.equal('object');
      expect(records[0].responses).to.deep.equal(updated_exercise.responses);
      done();
    })
    .catch(logTestError('Update existing'));
  });

  it('Should allow subscribing to Record Class updated', function(done) {
    let times_called = 0;
    runway.subscribe('Exercise', () => {
      times_called++;
    });
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ], createTime: 0, updateTime: 0 });
    runway.saveRecord(test_exercise, 'Exercise')
    .then(() => {
      expect(times_called).to.equal(1);
      done();
    })
    .catch(logTestError('Subscribe to RecordClass'));
  });

  it('Should allow un-subscribing to Record Class updates', function(done) {
    let times_called = 0;
    let times_called_2 = 0;
    runway.subscribe('Exercise', () => {
      times_called_2++;
    });
    let unsubscribe = runway.subscribe('Exercise', () => {
      times_called++;
    });
    runway.subscribe('Exercise', () => { });
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ], createTime: 0, updateTime: 0 });
    var test_exercise_2 = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blow blah' } ], createTime: 0, updateTime: 0 });
    runway.saveRecord(test_exercise, 'Exercise')
    .then(() => {
      expect(times_called).to.equal(1);
      unsubscribe();
      return runway.saveRecord(test_exercise_2, 'Exercise');
    })
    .then(() => {
      expect(times_called).to.equal(1);
      expect(times_called_2).to.equal(2);
      done();
    })
    .catch(logTestError('Un-subscribe to RecordClass'));
  });

  it('Should update subscribers when a record is deleted', function(done) {
    let times_called = 0;
    runway.subscribe('Exercise', () => {
      times_called++;
    });
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ], createTime: 0, updateTime: 0 });
    runway.saveRecord(test_exercise, 'Exercise')
    .then(() => {
      expect(times_called).to.equal(1);
      return runway.deleteRecord(test_exercise);
    })
    .then(() => {
      expect(times_called).to.equal(2);
      done();
    })
    .catch(logTestError('Subscribe to RecordClass'));
  });

  it('Should only return records for the current user id', function(done) {
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { a: 'first_user' } ], createTime: 0, updateTime: 0 });
    var test_exercise_2 = new Exercise({ bliss_id: 'abc', responses: [ { a: 'second_user' } ], createTime: 0, updateTime: 0 });
    runway.saveRecord(test_exercise, 'Exercise')
    .then(() => {
      runway.setUserId('demo');
      return runway.saveRecord(test_exercise_2, 'Exercise');
    })
    .then(() => {
      return runway.findRecords({}, 'Exercise');
    })
    .then((records) => {
      expect(records.length).to.equal(1);
      expect(records[0].responses).to.deep.equal([ { a: 'second_user' } ]);
      runway.setUserId('');
      return runway.findRecords({}, 'Exercise');
    })
    .then((records) => {
      expect(records.length).to.equal(1);
      expect(records[0].responses).to.deep.equal([ { a: 'first_user' } ]);
      done();
    })
    .catch(logTestError('User_id'));
  });
});

describe('Record', function() {
  it('Should create an immutable object', () => {
    let Exercise = getTestRecordClass();
    let exercise = new Exercise({ responses: [] });
    expect(exercise.responses).to.deep.equal([]);
  });

  it('Should allow fields to be changed', () => {
    let Exercise = getTestRecordClass();
    let exercise = new Exercise({ responses: [] });
    let modified_exercise = exercise.set('responses', [ { cool: 'beans' } ]);
    expect(modified_exercise.responses).to.deep.equal([ { cool: 'beans' } ]);
  });

  it('Should throw an error if we attempt to change the index key of a record', () => {
    let Exercise = getTestRecordClass();
    let exercise = new Exercise({ responses: [] });

    expect(() => {
      exercise.set('bliss_id', 'funstuff');
    }).to.throw(Error);
  });
});
