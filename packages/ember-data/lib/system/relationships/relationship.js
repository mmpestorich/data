/**
  @module ember-data
*/

import Members from "ember-data/system/relationships/members";

function Relationship(record, meta) {
  this.record = record;
  this.meta = meta;

  if (!meta.inverseKey) {
    var inverse = record.constructor.inverseFor(meta.key);
    if (inverse) {
      meta.inverseKey = inverse.name;  
    } else {
      //This probably breaks polymorphic relationships in complex scenarios, due to multiple possible typeKeys
      meta.inverseKey = '__implicit__' + /*this.meta.type.typeKey + '.' + */this.meta.parentType.typeKey;
    }
  }

  this.isDirty = false;
  this.link = null;
  this.linkPromise = null;
  this.members = new Members();
  this.serverMembers = new Members();
}

Relationship.prototype = Object.create(Object.prototype);

Relationship.prototype.constructor = Relationship;

Relationship.prototype.destroy = Ember.K;

Relationship.prototype.clear = function () {
  this.members.forEach(function(member) {
    this.removeRecord(member);
  }, this);
};

Relationship.prototype.disconnect = function () {
  this.members.forEach(function(member) {
    this.removeRecordFromInverse(member);
  }, this);
};

Relationship.prototype.reconnect = function () {
  this.members.forEach(function(member) {
    this.addRecordToInverse(member);
  }, this);
};

Relationship.prototype.addRecords = function (records, idx) {
  var that = this;
  records.forEach(function (record) {
    that.addRecord(record, idx);
    if (idx !== undefined) { idx++; }
  });
};

Relationship.prototype.addRecord = function (record, idx) {
  var members = this.members;
  
  if (members.has(record)) {
    members.move(record, idx);
  } else {
    members.add(record, idx);
    this.notifyRecordRelationshipChanged(record, idx);
    this.addRecordToInverse(record);
    this.record.updateRecordArrays();
  }
  
  /*
  var serverMembers = relationship.members;
      if (serverMembers.size > 0) {
        // If the server did not provide data for a given relationship but
        // there are other related records in the store that are in the 
        // 'root.loaded.saved' state than we can safely infer the server side
        // relationship
        var members = serverMembers.filter(function (member) {
          return 'root.loaded.saved' === member.get('currentState.stateName');
        }, this);
        
        if ('belongsTo' === kind) {
          data[key] = serverMembers.get(0);
        } else if ('hasMany' === kind) {
          data[key] = members;
        }
      }
  */
  
};

Relationship.prototype.addRecordToInverse = function (record) {
  if (!record._relationships[this.meta.inverseKey]) {
    record._relationships[this.meta.inverseKey] = new Relationship(record, {
      key: this.meta.inverseKey,
      inverseKey: this.meta.key, //TODO Is this right?
      type: this.meta.parentType,
      parentType: this.meta.type,
      isRelationship: true,
      kind: 'implicit', //TODO Does this matter?
      options: {
        async: this.meta.options.async
      }
    });
  }
  record._relationships[this.meta.inverseKey].addRecord(this.record);
};

Relationship.prototype.removeRecords = function (records) {
  var that = this;
  records.forEach(function (record) {
    that.removeRecord(record);
  });
};

Relationship.prototype.removeRecord = function (record) {
  if (this.members.has(record)) {
    this.removeRecordFromOwn(record);
    this.removeRecordFromInverse(record);
  }
};

Relationship.prototype.removeRecordFromInverse = function (record) {
  var inverseRelationship = record._relationships[this.meta.inverseKey];
  //Need to check for existence, as the record might unloading at the moment //TODO Why?
  if (inverseRelationship) {
    inverseRelationship.removeRecordFromOwn(this.record);
  }
};

Relationship.prototype.removeRecordFromOwn = function (record) {
  this.members.delete(record);
  this.notifyRecordRelationshipChanged(record);
  this.record.updateRecordArrays();
};

Relationship.prototype.findLink = function () {
  if (this.linkPromise) {
    return this.linkPromise;
  } else {
    var promise = this.fetchLink();
    this.linkPromise = promise;
    return promise.then(function(result) {
      return result;
    });
  }
};

Relationship.prototype.updateLink = function (link) {
  Ember.assert("You have pushed a record of type '" + this.record.constructor.typeKey + "' with '" + this.meta.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);
  if (link !== this.link) {
    this.link = link;
    this.linkPromise = null;
    this.record.notifyPropertyChange(this.meta.key);
  }
};

Relationship.prototype.rollback = function() {
  var serverMembers = this.record._data[this.meta.key];
  if (serverMembers !== undefined) {
    this.sync(serverMembers); // noop for implicit relationships  
  }
  this.reconnect();
  this.record.updateRecordArrays();
};

Relationship.prototype.sync = Ember.K;

Relationship.prototype.notifyRecordRelationshipChanged = Ember.K;

export default Relationship;
