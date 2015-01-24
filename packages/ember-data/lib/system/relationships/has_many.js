import { PromiseManyArray } from "ember-data/system/promise_proxies";
import Relationship from "ember-data/system/relationships/relationship";
import ManyArray from "ember-data/system/relationships/many_array";
import Members from "ember-data/system/relationships/members";

var get = Ember.get;

function ManyRelationship(record, meta) {
  Relationship.prototype.constructor.call(this, record, meta);
  this.manyArray = ManyArray.create({ relationship: this });
}

ManyRelationship.prototype = Object.create(Relationship.prototype);

ManyRelationship.prototype.constructor = ManyRelationship;

ManyRelationship.prototype.destroy = function () {
  this.manyArray.destroy();
};

ManyRelationship.prototype.reload = function () {
  var self = this;
  if (this.link) {
    return this.fetchLink();
  } else {
    return this.record.store.scheduleFetchMany(this.manyArray.toArray()).then(function () {
      //Goes away after the manyArray refactor
      self.manyArray.set('isLoaded', true);
      return self.manyArray;
    });
  }
};

ManyRelationship.prototype.addRecord = function (record, idx) {
  Ember.assert("You cannot add '" + record.constructor.typeKey + "' records to this relationship (only '" + this.meta.type.typeKey + "' allowed)", !this.meta.type || record instanceof this.meta.type);
  Relationship.prototype.addRecord.call(this, record, idx);
};

ManyRelationship.prototype.fetchLink = function () {
  var self = this;
  return this.record.store.findHasMany(this.record, this.link, this.meta).then(function (records) {
    self.sync(records);
    return self.manyArray;
  });
};

ManyRelationship.prototype.findRecords = function () {
  var manyArray = this.manyArray;
  return this.record.store.findMany(manyArray.toArray()).then(function (records) {
    //Goes away after the manyArray refactor
    manyArray.set('isLoaded', true);
    return manyArray;
  });
};

ManyRelationship.prototype.getRecords = function () {
  if (this.meta.options.async) {
    var self = this;
    var promise;
    if (this.link) {
      promise = this.findLink().then(function () {
        return self.findRecords();
      });
    } else {
      promise = this.findRecords();
    }
    return PromiseManyArray.create({
      content: this.manyArray,
      promise: promise
    });
  } else {
    Ember.assert("You looked up the '" + this.meta.key + "' relationship on a '" + this.record.constructor.typeKey + "' with id " + this.record.get('id') + " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.hasMany({ async: true })`)", this.manyArray.isEvery('isEmpty', false));

    this.manyArray.set('isLoaded', true);
    return this.manyArray;
  }
};

ManyRelationship.prototype.sync = function (records) {
  var members = this.members;

  records = new Members(records);

  members.toArray().forEach(function (obj) {
    if (!records.has(obj)) { this.removeRecord(obj); }
  }, this);

  records.forEach(function (obj, idx) {
    this.addRecord(obj, idx);
  }, this);
};

ManyRelationship.prototype.notifyRecordRelationshipChanged = function (record, idx) {
  var key = this.meta.key;

  // We need to notifyPropertyChange in the adding case to make sure that we 
  // fetch the newly added record if it is unloaded
  if (idx !== undefined && get(record, 'isEmpty')) {
    this.record.notifyPropertyChange(key);
  }
  
  this.record.send('propertyDidChange', {
    meta: this.meta,
    originalValue: this.record._data[key],
    value: record
  });
};

/**
  `DS.hasMany` is used to define One-To-Many and Many-To-Many
  relationships on a [DS.Model](/api/data/classes/DS.Model.html).

  `DS.hasMany` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship.
  - `inverse`: A string used to identify the inverse property on a related model.

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

  #### Many-To-Many
  To declare a many-to-many relationship between two models, use
  `DS.hasMany`:

  ```javascript
  App.Post = DS.Model.extend({
    tags: DS.hasMany('tag')
  });

  App.Tag = DS.Model.extend({
    posts: DS.hasMany('post')
  });
  ```

  #### Explicit Inverses

  Ember Data will do its best to discover which relationships map to
  one another. In the one-to-many code above, for example, Ember Data
  can figure out that changing the `comments` relationship should update
  the `post` relationship on the inverse because post is the only
  relationship to that model.

  However, sometimes you may have multiple `belongsTo`/`hasManys` for the
  same type. You can specify which property on the related model is
  the inverse using `DS.hasMany`'s `inverse` option:

  ```javascript
  var belongsTo = DS.belongsTo,
      hasMany = DS.hasMany;

  App.Comment = DS.Model.extend({
    onePost: belongsTo('post'),
    twoPost: belongsTo('post'),
    redPost: belongsTo('post'),
    bluePost: belongsTo('post')
  });

  App.Post = DS.Model.extend({
    comments: hasMany('comment', {
      inverse: 'redPost'
    })
  });
  ```

  You can also specify an inverse on a `belongsTo`, which works how
  you'd expect.

  @namespace
  @method hasMany
  @for DS
  @param {String|DS.Model} type the model type of the relationship
  @param {Object} options a hash of options
  @return {Ember.computed} relationship
*/
function hasMany(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  }

  options = options || {};

  // Metadata about relationships is stored on the meta of
  // the relationship. This is used for introspection and
  // serialization. Note that `key` is populated lazily
  // the first time the CP is called.
  var meta = {
    key: null,
    type: type,
    isRelationship: true,
    kind: 'hasMany',
    options: options
  };

  return Ember.computed(function(key) {
    var relationship = this._relationships[key];
    return relationship.getRecords();
  }).meta(meta).readOnly();
}

export {
  ManyRelationship,
  hasMany
};
