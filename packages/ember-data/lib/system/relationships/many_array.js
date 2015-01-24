/**
  @module ember-data
*/

var set = Ember.set;

/**
  A `ManyArray` is a `MutableArray` that represents the contents of a has-many
  relationship.

  The `ManyArray` is instantiated lazily the first time the relationship is
  requested.

  ### Inverses

  Often, the relationships in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

  ```javascript
  App.Post = DS.Model.extend({
    comments: DS.hasMany('comment')
  });

  App.Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  If you created a new instance of `App.Post` and added
  a `App.Comment` record to its `comments` has-many
  relationship, you would expect the comment's `post`
  property to be set to the post that contained
  the has-many.

  @class ManyArray
  @namespace DS
  @extends Ember.Object
  @uses Ember.MutableArray
*/
export default Ember.Object.extend(Ember.MutableArray, {

  /**
    The loading state of this array

    @property {Boolean} isLoaded
  */
  isLoaded: false,

   /**
     The relationship which manages this array.

     @property {ManyRelationship} relationship
     @private
   */
  relationship: null,

  /**
    Used for async `hasMany` arrays
    to keep track of when they will resolve.

    @property {Ember.RSVP.Promise} promise
    @private
  */
  promise: null,

  length: Ember.computed(function() {
    return this.relationship.members.size;
  }).volatile(),
  
  objectAt: function (index) {
    return this.relationship.members.get(index);
  },
  
  replace: function (idx, amt, objects){
    var relationship = this.relationship, records;
    
    if (amt > 0){
      records = relationship.members.slice(idx, idx+amt);
      relationship.removeRecords(records);
    }
    
    if (objects){
      relationship.addRecords(objects, idx);
    }
  },

  /**
    @method loadingRecordsCount
    @param {Number} count
    @private
  */
  loadingRecordsCount: function (count) {
    this.loadingRecordsCount = count;
  },

  /**
    @method loadedRecord
    @private
  */
  loadedRecord: function () {
    this.loadingRecordsCount--;
    if (this.loadingRecordsCount === 0) {
      set(this, 'isLoaded', true);
      this.trigger('didLoad');
    }
  },

  /**
    @method reload
    @public
  */
  reload: function() {
    return this.relationship.reload();
  },

  /**
    Create a child record within the owner

    @method createRecord
    @private
    @param {Object} hash
    @return {DS.Model} record
  */
  createRecord: function(hash) {
    var store = this.relationship.record.store;
    var type = this.relationship.meta.type;
    var isPolymorphic = this.relationship.meta.options.polymorphic;
    var record;

    Ember.assert("You cannot add '" + type.typeKey + "' records to this polymorphic relationship.", !isPolymorphic);

    record = store.createRecord(type, hash);
    this.pushObject(record);

    return record;
  }
});
