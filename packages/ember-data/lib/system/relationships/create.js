import Relationship from "ember-data/system/relationships/relationship";
import { BelongsToRelationship } from "ember-data/system/relationships/belongs_to";
import { ManyRelationship } from "ember-data/system/relationships/has_many";

Relationship.create = function (record, meta) {
  if (meta.kind === 'hasMany') {
    return new ManyRelationship(record, meta);
  } else {
    return new BelongsToRelationship(record, meta);
  }
};
