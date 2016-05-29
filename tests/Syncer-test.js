var expect = require('chai').expect;
import Q from 'q';
import { Runway, Model, Syncer } from '../src/index.js';
import sh from 'shelljs';
import getTestRecordClass, { getTestRecords, logTestError } from './getTestRecordClass';
import { getMockParseInterface } from './MockParse';
import getTestDatabase from './getTestDatabase';
import Parse from 'parse/node';
import now from 'performance-now';


let skip = () => {};


describe('Syncer', function(done) {
  var runway, RecordClass, MockParseInterface, syncer, test_records, test_count = 0;

  beforeEach(() => {
    test_count++;
    let name = 'sync_test_'+ test_count;
    let db = getTestDatabase(name);
    runway = new Runway(name, db);
    runway.setUserId('test_user');
    RecordClass = getTestRecordClass();
    MockParseInterface = getMockParseInterface();
    syncer = new Syncer(runway, { parse: MockParseInterface });
    test_records = getTestRecords();
    MockParseInterface.Object.saveAll = (parse_models) => {
      let deferred = Q.defer();
      deferred.resolve(parse_models);
      return deferred.promise;
    }
    return runway.registerRecordClass(RecordClass)
    .then(() => {
      return runway.setLoaded();
    });
  });

  it('Should pass canary test', () => {
    expect(true).to.equal(true);
  });
  it('Should sync up records', function(done) {
    var results_length;
    let deferred = Q.defer();
    MockParseInterface.Object.saveAll = (parse_models) => {
      let deferred = Q.defer();
      results_length = parse_models.length;
      try {
        expect(results_length).to.equal(3);
        expect(parse_models.map(model => model.className)).to.deep.equal(['Exercise', 'Exercise', 'Exercise']);
        expect(parse_models.map(model => model.synced)).to.deep.equal([undefined, undefined, undefined]);
        expect(parse_models.map(model => model.get('user_id'))).to.deep.equal(['test_user', 'test_user', 'test_user']);
        done();
      }
      catch (e) {
        console.log(e);
        throw e;
        done();
      }
      deferred.resolve(parse_models);
      return deferred.promise;
    }

    runway.saveRecords(test_records, 'Exercise')
    .then(() => {
      syncer.syncUp();
    })
    .catch(logTestError('Syncer - syncUp'));
  });
  it('IMPL: Should convert parse model to Record', function() {
    let test_record = test_records[0];
    delete test_record.synced;
    let ParseClass = Parse.Object.extend('tester');
    let parse_model = new ParseClass(test_record);
    let converted_record = syncer.parseModelToRecord(parse_model, RecordClass);
    expect(JSON.stringify(converted_record)).to.equal(JSON.stringify(test_record));
  });
  it('Should not synced already synced records', (done) => {
    runway.saveRecords(test_records, 'Exercise')
    .then(() => {
      return syncer.syncUp();
    })
    .then(() => {
      MockParseInterface.Object.saveAll = (parse_models) => {
        let deferred = Q.defer();
        try  {
          expect(parse_models).to.deep.equal([]);
          done();
          deferred.resolve(parse_models);
          return deferred.promise;
        }
        catch(e) {
          console.log(e);
        }
      }
      return syncer.syncUp();
    });
  });
  it('Should not attempt to sync if syncing is already in progress', function(done) {
    var deferred = Q.defer(), models;
    MockParseInterface.call_count = 0;
    MockParseInterface.Object.saveAll = (parse_models) => { 
      models = parse_models;
      MockParseInterface.call_count++;
      return deferred.promise;
    }
    let promise = syncer.syncUp();
    syncer.syncUp();
    setTimeout(function() {
      expect(MockParseInterface.call_count).to.equal(1);
      deferred.resolve(models);
      done();
    }, 200);
  });
  it('Should handle re-sync calls after current sync completes', (done) => {
    let additional_record = test_records[0].set('responses', [{ anotherguy: 'anothervalue' }]);
    runway.saveRecords(test_records, 'Exercise')
    .then(() => {
      syncer.syncUp();
      syncer.syncUp();
      return runway.saveRecord(additional_record, 'Exercise');
    })
    .then(() => {
      MockParseInterface.Object.saveAll = (parse_models) => {
        let deferred = Q.defer();
        try  {
          let type = typeof(parse_models[0].get('responses'));
          expect(parse_models[0].get('responses')).to.deep.equal(additional_record.responses);
          done();
          deferred.resolve(parse_models);
          return deferred.promise;
        }
        catch(e) {
          console.log(e);
        }
      }
      return syncer.syncUp();
    });
  });
  it('Should resolve all promises returned from syncUp', function(done) {
    runway.saveRecords(test_records, 'Exercise')
    .then(() => {
      let p1 = syncer.syncUp();
      let p2 = syncer.syncUp();
      let p3 = syncer.syncUp();
      return Q.all([p1, p2, p3]);
    })
    .then(() => {
      done();
    });
  });
  it('Should schedule a resync if temporary problem', function(done) {
    var times_called = 0;
    syncer.setRetryInterval(10);
    MockParseInterface.Object.saveAll = function(parse_models) {
      let deferred = Q.defer();
      times_called++;
      if (times_called == 1) {
        deferred.reject({ code: Parse.Error.CONNECTION_FAILED, message: 'Cannot connect to server' });
        return deferred.promise;
      }
      else if (times_called == 2) {
        expect(parse_models[0].get('bliss_id')).to.equal('abc');
        deferred.resolve(parse_models);
        done();
        return deferred.promise;
      }
    };

    runway.saveRecords(test_records, 'Exercise')
    .then(() => {
      return syncer.syncUp();
    })
  });
  describe('syncDown', function() {
    it('Should save new models from Parse', function(done) {
      runway.saveRecords = (records) => {
        done();
      };
      syncer.syncDown()
      .catch((error) => {
        console.log(error);
      });
    });
  });
  it('Should not sync already synced records', function(done) {
    syncer.syncDown()
    .then(() => {
      runway.saveRecords = (records) => {
        expect(records).to.deep.equal([]);
        done();
      };
      return syncer.syncDown();
    })
    .catch((error) => {
      console.log(error);
    });


  });
});






