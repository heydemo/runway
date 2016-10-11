import Q from 'q';
/* global document */

var deferred = Q.defer();
var device_ready_promise = deferred.promise;

function onDeviceReady() {
  deferred.resolve();
}

if (typeof document !== 'undefined') {
  document.addEventListener('deviceready', onDeviceReady, false);
  window.onload = onDeviceReady;
  setTimeout(onDeviceReady, 4000);
}
else {
  setTimeout(onDeviceReady, 200);
}

export default device_ready_promise;
