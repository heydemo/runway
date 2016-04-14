import PouchDB from 'pouchdb';
PouchDB.plugin(require('pouchdb-authentication'))

var db = new PouchDB('bliss');

var remote = new PouchDB('http://localhost.com:5984/bliss', { skipSetup: true });


db.sync(remote, {
  live: true,
  retry: true
})
.on('error', console.log.bind(console));

db.changes().on('change', function() {
  console.log('changes!');
  db.get('poo').then(function(c) { console.log(c); });
});

remote.signup('mojo', 'nixon', function(error, response) {
  if (error) {
    console.log(error);
  }
});

export default db;
