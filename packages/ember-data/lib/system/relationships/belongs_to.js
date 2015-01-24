import Model from "ember-data/system/model/model";
import { PromiseObject } from "ember-data/system/promise_proxies";
import Relationship from "ember-data/system/relationships/relationship";

function BelongsToRelationship(record, meta) {
  Relationship.prototype.constructor.call(this, record, meta);
  this.record = record;
  this.inverseRecord = null;
}

BelongsToRelationship.prototype = Object.create(Relationship.prototype);

BelongsToRelationship.prototype.constructor = BelongsToRelationship;

BelongsToRelationship.prototype.addRecord = function (record) {
  if (this.members.has(record)) { return; }

  Ember.assert("You can only add a '" + this.meta.type.typeKey + "' record to this relationship", record instanceof this.meta.type);

  if (this.inverseRecord) {
    this.removeRecord(this.inverseRecord);
  }
  
  this.inverseRecord = record;
  Relationship.prototype.addRecord.call(this, record);
};

BelongsToRelationship.prototype.removeRecordFromOwn = function (record) {
  if (!this.members.has(record)) { return; }
  Relationship.prototype.removeRecordFromOwn.call(this, record);
  this.inverseRecord = null;
};

BelongsToRelationship.prototype.findRecord = function () {
  if (this.inverseRecord) {
    return this.record.store._findByRecord(this.inverseRecord);
  } else {
    return Ember.RSVP.Promise.resolve(null);
  }
};

BelongsToRelationship.prototype.fetchLink = function () {
  var self = this;
  return this.record.store.findBelongsTo(this.record, this.link, this.meta).then(function (record) {
    self.addRecord(record);
    return record;
  });
};

BelongsToRelationship.prototype.getRecord = function () {
  if (this.meta.options.async) {
    var promise;
    if (this.link) {
      var self = this;
      promise = this.findLink().then(function () {
        return self.findRecord();
      });
    } else {
      promise = this.findRecord();
    }

    return PromiseObject.create({
      promise: promise,
      content: this.inverseRecord
    });
  } else {
    Ember.assert("You looked up the '" + this.meta.key + "' relationship on a '" + this.record.constructor.typeKey + "' with id " + this.record.get('id') + " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)", this.inverseRecord === null || !this.inverseRecord.get('isEmpty'));
    return this.inverseRecord;
  }
};

BelongsToRelationship.prototype.sync = function (record) {
  if (record && record.then) {
    record = record.get && record.get('content');
    Ember.assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", record !== undefined);
  }
  if (record) {
    this.addRecord(record);
  } else if (this.inverseRecord) {
    this.removeRecord(this.inverseRecord);
  }
};

BelongsToRelationship.prototype.notifyRecordRelationshipChanged = function (record) {
  var key = this.meta.key;
  this.record.notifyPropertyChange(key);
  this.record.send('propertyDidChange', {
    meta: this.meta,
    originalValue: this.record._data[key],
    value: record
  });
};

/**
  `DS.belongsTo` is used to define One-To-One and One-To-Many
  relationships on a [DS.Model](/api/data/classes/DS.Model.html).


  `DS.belongsTo` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship.
  - `inverse`: A string used to identify the inverse property on a
    related model in a One-To-Many relationship. See [Explicit Inverses](#toc_explicit-inverses)

  #### One-To-One
  To declare a one-to-one relationship between two models, use
  `DS.belongsTo`:

  ```javascript
  App.User = DS.Model.extend({
    profile: DS.belongsTo('profile')
  });

  App.Profile = DS.Model.extend({
    user: DS.belongsTo('user')
  });
  ```

  #### One-To-Many
  To declare a one-to-many relationship between two models, use
  `DS.belongsTo` in combination with `DS.hasMany`, like this:

  ```javascript
  App.Post = DS.Model.extend({
    comments: DS.hasMany('comment')
  });

  App.Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  @namespace
  @method belongsTo
  @for DS
  @param {String|DS.Model} type the model type of the relationship
  @param {Object} options a hash of options
  @return {Ember.computed} relationship
*/
function belongsTo(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  } else {
    Ember.assert("The first argument to DS.belongsTo must be a string representing a model type key, e.g. use DS.belongsTo('person') to define a relation to the App.Person model", !!type && (typeof type === 'string' || Model.detect(type)));
  }

  options = options || {};

  var meta = {
    key: null,
    type: type,
    isRelationship: true,
    kind: 'belongsTo',
    options: options
  };

  return Ember.computed(function(key, value) {
    if (arguments.length>1) {
      if ( value === undefined ) { value = null; }
      this._relationships[key].sync(value);
    }

    return this._relationships[key].getRecord();
  }).meta(meta);
}

export {
  BelongsToRelationship,
  belongsTo
};
