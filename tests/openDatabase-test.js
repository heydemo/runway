import getDatabase from '../src/database';
var expect = require('chai').expect;
/* global describe beforeEach it */

// eslint-disable-next-line no-unused-vars
let skip = () => {};

describe('getDatabase', function() {
  it('Should pass canary test', () => {
    expect(true).to.equal(true);
  });
  it('Should return a promise', () => {
    let db_promise = getDatabase('test');
    expect(typeof db_promise.then).to.equal('function');
  });
  it('Should resolve to a SQLite database', (done) => {
    let db_promise = getDatabase('test');
    db_promise.then((db) => {
      expect(typeof db.executeSql).to.equal('function');
      done();
    });
  });
});

