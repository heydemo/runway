import t from 'tcomb';
import { toObject } from 'tcomb-doc';

function now() {
  return Math.round(new Date() / 1000)
}

export default function Model(attributes, options) {
  let defaults = { updateTime: t.Number, createTime: t.Number, class_name: t.String };
  attributes = Object.assign({}, defaults, attributes);
  var model = t.struct(attributes, options.name);

  let prohibited_update_keys = options.prohibited_update_keys || [];
  if (options.index) {
    prohibited_update_keys.push(options.index);
    prohibited_update_keys.push('class_name');
  }

  model.prototype.set = function(key, value) {
    let commands = getUpdateCommands(key, value);
    validateUpdates(commands, prohibited_update_keys);
    return model.update(this, commands);
  }
  let RecordClass = function(attrs) {
    var attrs_with_defaults = Object.assign({}, { class_name: options.name, createTime: now(), updateTime: now() }, attrs);
    return model(attrs_with_defaults);
  }
  RecordClass.sql = { sql_index: options.index };
  RecordClass._name = options.name;

  return RecordClass;

}

function getUpdateCommands(key, value) {
  let updateObj = key;
  if (typeof(updateObj) != 'object') {
    updateObj = { [key]: value };
  }
  let commands = {};
  Object.keys(updateObj).forEach((key) => {
    let value = updateObj[key];
    commands[key] = { $set: value };
  });
  commands.updateTime = { $set: now() };
  return commands;
}

function validateUpdates(commands, prohibited_update_keys) {
  Object.keys(commands).forEach((key) => {
    if (prohibited_update_keys.indexOf(key) != -1) {
      throw new Error(`'${key}' is prohibited from being updated`);
    }
  });
}

function modelSet(key, value) {

}

var Exercise = Model({
  bliss_id:  t.String,
  responses: t.list(t.Object),
}, { name: 'Exercise', index: 'bliss_id' });
