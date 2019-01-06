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
  it('Should actually delete', function(done) {
    var test_exercise = new Exercise({ bliss_id: 'abc', responses: [ { bbb: 'DELETE THIS GUY' } ], createTime: 0, updateTime: 0 });

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
