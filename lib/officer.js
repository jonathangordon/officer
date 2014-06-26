var Officer = function (schema) {
  this.schema = schema;
  this.result = true;
};

OP = Officer.prototype;

OP.run = function (obj, cb) {
  this.attendance(obj);
  this.bounce(obj);

  for (var key in this.schema) {
    this.result = this.result && this.siblings(obj, key);
  }

  if (cb) cb(this.result, obj);

  return this;
};

OP.attendance = function (obj) {
  for (var key in this.schema) {
    if (this.schema.hasOwnProperty(key)) {
      if ( ! obj.hasOwnProperty(key)) {
        this.result = false;
      }
    }
  }
};

OP.bounce = function (obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      if ( !  this.schema.hasOwnProperty(key)) {
        delete obj[key];
      }
    }
  }
};

OP.siblings = function (obj, key) {
  if (this.schema[key].siblings) {
    return this.and(obj, key) && this.xor(obj, key);
  }
  return true;
};

OP.xor = function (obj, key) {
  if (this.schema[key].siblings.hasOwnProperty('xor')) {
    xorKey = this.schema[key].siblings.xor;
    return !obj.hasOwnProperty(xorKey);
  }
  return true;
};

OP.and = function (obj, key) {
  if (this.schema[key].siblings.hasOwnProperty('and')) {
    andKey = this.schema[key].siblings.and;
    return obj.hasOwnProperty(andKey);
  }
  return true;
};

module.exports = Officer;
