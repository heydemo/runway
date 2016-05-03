var expect = require('chai').expect;
import t from 'tcomb';

import getDatabase from '../src/database.js';
import getTestRecordClass, { getTestRecords, logTestError } from './getTestRecordClass';
import { Runway, Model } from '../src/index.js';
import sh from 'shelljs';

let skip = () => {};

describe('runway', function() {
  var Exercise, runway;
  var db_count = 0;
  beforeEach(() => {
    Exercise = getTestRecordClass();
    runway   = new Runway('tester_database' + db_count++);
    return runway.registerRecordClass(Exercise, 'Exercise');
  });
  afterEach(() => {
    //return runway.clear();
  });
  after(() => {
    sh.exec('rm tester_database*');
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
      expect(typeof(records[0])).to.equal('object');
      expect(records[0].responses).to.deep.equal(test_exercise.responses); 
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
      done();
    });

  });
  it('Should delete the database', function(done) {
    runway.clear()
    .then(() => {
      return runway.executeSql('SELECT tbl_name from sqlite_master')
    })
    .then((rows) => {
      expect(rows.length).to.equal(0);
      done();
    })
    .catch(logTestError('Delete database'));  

  });
  it('Should update an existing record correctly', function(done) {
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: "blah blah doesn't matter blah" } ], createTime: 0, updateTime: 0 }); 
    var updated_exercise;
    runway.saveRecord(test_exercise, 'Exercise')
    .then(() => {
      updated_exercise = test_exercise.set('responses', [{ updated: 'it is true' }]); 
      return runway.saveRecord(updated_exercise, 'Exercise');
    })
    .then(() => {
      return runway.findRecords({ bliss_id: 'abc' }, 'Exercise');
    })
    .then((records) => {
      expect(typeof(records[0])).to.equal('object');
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
