/**
  @module ember-data
*/

import ManyArray from "ember-data/system/relationships/many_array";
import Relationship from "ember-data/system/relationships/relationship";
import {
  BelongsToRelationship,
  belongsTo
} from "ember-data/system/relationships/belongs_to";
import {
  ManyRelationship,
  hasMany
} from "ember-data/system/relationships/has_many";

import "ember-data/system/relationships/create";
import "ember-data/system/relationships/ext";

export {
  ManyArray,
  Relationship,
  BelongsToRelationship,
  belongsTo,
  ManyRelationship,
  hasMany
};
