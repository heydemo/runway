import storage from './storage';
import generateId from './idGenerator'

var { Record, Maybe } = require('typed-immutable');

const Exercise = Record({
  bliss_id:  String,
  //responses: t.Array,
  createTime: Number,
  updateTime: Number,
  class_name: 'Exercise',
  parse_id: Maybe(String)
}, 'Exercise');

const Classes = {
  Exercise
}

function saveModel(model) {
  var bliss_id = model.get('bliss_id');
  var updated_model = model.set('updateTime', new Date().getTime() / 1000);
  var json = updated_model.toJSON();
  return storage.set(bliss_id, json);
}

function loadModel(bliss_id) {
  return new Promise((resolve, reject) => {
    storage.get(bliss_id)
    .then((data) => {
      var Class = Classes[data.class_name];
      var model = new Class(data);
      resolve(model);
    });
  });
}

window.saveModel = saveModel;
window.loadModel = loadModel;


window.ex = new Exercise({ bliss_id: '123', createTime: 0, updateTime: 0, class_name: 'Exercise' });

window.Exercise = Exercise;

window.storage = storage;
