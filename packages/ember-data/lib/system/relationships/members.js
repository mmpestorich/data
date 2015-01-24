/**
  @module ember-data
*/

var a_slice = [].slice,
    a_splice = [].splice,
    guidFor = Ember.guidFor,
    forEach = Ember.EnumerableUtils.forEach,
    filter = Ember.EnumerableUtils.filter,
    map = Ember.EnumerableUtils.map,
    fmt = Ember.String.fmt;

function Members() {
  var arg = arguments[0];

  this.clear();
  
  if (arg == null) { return; }
  
  forEach([].concat(arg), function _add(obj) { this.add(obj); }, this);
}

Members.prototype = Object.create(Object.prototype);

Members.prototype.constructor = Members;

Members.prototype.clear = function () {
  this.list = [];                   // [ { uid: 'e2' }, { uid: 'e1' }, { uid: 'e3' } ]
  this.hash = Object.create(null);  // { e1: 1, e2: 0, e3: 2 }
  this.size = 0;
};

Members.prototype.add = function (obj, idx) {
  var list = this.list,
      hash = this.hash,
      uid = guidFor(obj),
      isNum = 'number' === typeof idx;

  if (this.has(obj)) {
    if (isNum) { this.move(obj, idx); }
    return this;
  }

  idx = isNum ? idx : this.size;
  a_splice.call(list, idx, 0, obj);
  hash[uid] = idx;
  for (var i = idx+1, l = list.length; i < l; i++) {
    hash[guidFor(list[i])] = i;
  }
  this.size++;
  return this;
};

Members.prototype.delete = function (oi) {
  var list = this.list,
      hash = this.hash,
      obj, idx, uid, deleted;
  
  if ('number' === typeof oi) {
    uid = guidFor(obj = list[idx = oi]);
  } else {
    idx = hash[uid = guidFor(obj = oi)];
  }

  if (!this.has(obj)) { return null; }

  deleted = a_splice.call(list, idx, 1)[0];
  delete hash[uid];
  for (var i = idx, l = list.length; i < l; i++) {
    hash[guidFor(list[i])] = i;
  }
  this.size--;
  return deleted;
};

Members.prototype.move = function (obj, toIdx) {
  var fromIdx;

  if (toIdx === undefined || (fromIdx = this.indexOf(obj)) === toIdx) {
    return this;
  }
  if (fromIdx === -1) {
    throw new Error(fmt("Failed to move %@. Members must contain the object in order to move it.", obj));
  }
  if (toIdx > this.size) {
    throw new Error(fmt("Failed to move %@ to index of %@. Out of range.", obj, toIdx));
  }
  
  this.delete(obj);
  this.add(obj, toIdx);
  return this;
};

Members.prototype.get = function (oi) {
  return 'number' === typeof oi ? this.list[oi] : this.hash[guidFor(oi)];
};

Members.prototype.has = function (obj) {
  if (this.size === 0) { return false; }
  return Object.prototype.hasOwnProperty.call(this.hash, guidFor(obj));
};

Members.prototype.isEmpty = function () {
  return this.size === 0;
};

Members.prototype.toArray = function () {
  return a_slice.call(this.list);
};

Members.prototype.indexOf = function (obj) {
  var idx;
  if (this.size === 0) { return -1; }
  return (idx = this.hash[guidFor(obj)]) >= 0 ? idx : -1;
};

Members.prototype.slice = function (fromIdx, toIdx) {
  return a_slice.call(this.list, fromIdx, toIdx);
};

Members.prototype.forEach = function (fn, thisArg) {
  forEach(this.list, fn, thisArg);
};

Members.prototype.filter = function (fn, thisArg) {
  return filter(this.list, fn, thisArg);
};

Members.prototype.map = function (fn, thisArg) {
  return map(this.list, fn, thisArg);
};

Members.prototype.copy = function () {
  var copy = new Members();
  copy.list = this.toArray();
  for (var p in this.hash) {
    copy.hash[p] = this.hash[p];
  }
  copy.size = this.size;
  return copy;
};

export default Members;
