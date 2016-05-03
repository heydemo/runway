import Q from 'q';
import Parse from 'parse';


import Actions from './actions';

export default class SyncToParse {
  /**
   * @param {object} Store - the full Redux store object
   * @param {string[]} parse_classes - an array of names corresponding to the Parse class / Redux store to sync
   */
  constructor(store, parse_classes, ParseInterface = Parse, config = {}) {
    ParseInterface.initialize('XnOJzJXMDKbgWTjDFdmb4SZnCmLhQJhvzsgrf7Ev', 'M7b6XAWi2qK3ymiusPVhl5mkkh3dqLc9mCeGH0ik');

    this.store = store;
    this.parse_classes = parse_classes;
    this.ParseInterface = ParseInterface;


    this._syncing_objs = {}
    this.syncScheduledId = {};
    this.reschedule_interval = config.reschedule_interval || 3000;
    this.sync_error_count = {}; 
  }

  syncToParse() {
    this.parse_classes.forEach((parse_class) => {
      this.syncStore(parse_class);
    });
  }

  getParseStore(parse_class) {
    return this.store.getState()[parse_class] || false; 
  }

  syncStore(parse_class) {
    var parse_store = this.getParseStore(parse_class);
    if (!this._syncing_objs[parse_class] && parse_store) {

      this._syncing_objs[parse_class] = true;

      var unsynced_objs = this.getUnsyncedModels(parse_store);

      this.saveObjsToParse(unsynced_objs, parse_class)
      .then(null, (error) => { this.syncErrorHandler(parse_class, error) })
      .finally(() => { this._syncing_objs[parse_class] = false; })
    }
    else {
      this.rescheduleSync(parse_class, parse_store);
    }
  }

  syncErrorHandler(parse_class, error) {
    this.sync_error_count[parse_class] || (this.sync_error_count[parse_class] = 0);
    this.sync_error_count[parse_class]
    this.rescheduleSync(parse_class);
  }

  rescheduleSync(parse_class) {
    var parse_store = this.getParseStore(parse_class);
    if (!this.syncScheduledId[parse_class]) {
      this.syncScheduledId[parse_class] = setTimeout(() => {
        this.syncStore(parse_class, parse_store);
      }, this.reschedule_interval);
    }
  }

  getUnsyncedModels(parse_store) {
    var unsynced_models = parse_store.filter((obj) => {
      return !obj.has('parse_id') && obj.sync !== false;
    });
    return unsynced_models;
  }

  /**
   *  @param {ImmutableMap[]} objs - An array of immutable map objects to be used as the attributes of parse models
   *  @param {string} parse_class - The name of the Parse class to save to
   */
  saveObjsToParse(objs, parse_class) {
    var deferred = Q.defer();

    var parse_models = this.convertModelsToParseModels(objs, parse_class);

    if (parse_models.length) {
      this.ParseInterface.Object.saveAll(parse_models, {
        success: (parse_models) => {
          this.setModelParseIds(parse_models, parse_class);
          deferred.resolve(parse_models);
        },
        error: (error) => {
          deferred.reject(error);
        }
      });
    }
    else {
      deferred.resolve();
    }

    return deferred.promise;
  }

  convertModelsToParseModels(models, parse_class) {
    var ParseClass = this.ParseInterface.Object.extend(parse_class);
    var parse_models = [];
    models.map(model => {
      let model_data = model.toJS();
      let parse_model = new ParseClass(model_data);
      parse_models.push(parse_model);
    });
    return parse_models;
  }

  setModelParseIds(parse_models, parse_class) {
    parse_models.map(parse_model => {
      let bliss_id = parse_model.get('bliss_id');
      let parse_id = parse_model.id;
      this.store.dispatch(Actions.updateObj(bliss_id, { parse_id }, parse_class));
    });
  }
}
