import Q from 'q';
/* global document */

var deferred = Q.defer();
var device_ready_promise = deferred.promise;

function onDeviceReady() {
  console.log('that ole device is ready boss!');
  deferred.resolve();
}

if (typeof document !== 'undefined') {
  document.addEventListener('deviceready', onDeviceReady, false);
}
else {
  setTimeout(onDeviceReady, 200);
}

export default device_ready_promise;
