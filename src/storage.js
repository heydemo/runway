import StorageAPI from '@heydemo/storage';

var storage = new StorageAPI('bliss');
storage.addStorageMethod(require('@heydemo/storage/dist/methods/localStorage'));

export default storage;
