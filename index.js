"use strict";
/* Shared data and methods go here
 */
var DocumentReport,
    Officer, PropertyValidator,
    makeArray, isNo, getType,
    isSchema, hasValueFor,
    flattenPath, getCurrentPath,
    getDateString, _;

_ = require('underscore');

makeArray = function (item) {
  if (item === undefined) item = [];
  else if ( ! Array.isArray(item)) item = [item];

  return item;
};

isSchema = function (item) {
  return ( ! Array.isArray(item) && typeof item === 'object');
};

isNo = function (val) {
  return val === undefined ||
         val === false     ||
         val === null;
};

getType = function (obj) {
  var bracketed, type;

  bracketed = Object.prototype.toString.call(obj);
  type = bracketed.slice(bracketed.indexOf(' ')+1, -1);
  type = type[0].toLowerCase()+type.slice(1);
  return type;
};

getDateString = function (date) {
  var dateString, months, month, hours, minutes, seconds, amPm;

  months = [
    'Jan', 'Feb', 'Mar',
    'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec'
  ];

  month = months[date.getMonth()];

  hours = date.getHours();
  amPm = (hours < 12)? 'AM': 'PM';
  hours %= 12;
  if ( ! hours) hours = 12;

  minutes = date.getMinutes();
  if (minutes < 10) minutes = '0'+minutes;

  seconds = date.getSeconds();
  if (seconds < 10) seconds = '0'+seconds;

  dateString = (
    month+' '+
    date.getDate()+', '+
    date.getFullYear()+' '+
    hours+':'+
    minutes+':'+
    seconds+' '+amPm
  );

  return dateString;
};

hasValueFor = function (obj, key) {
  var hasValue;

  hasValue = (obj.hasOwnProperty(key) && obj[key] !== undefined);

  if (_.isObject(obj[key]))
    hasValue = (_.keys(obj[key]).length > 0);

  return hasValue;
};

flattenPath = function (path) {
  var dotAndBracketify = function (segment) {
    return isNaN(segment * 1) ? '.'+segment : '['+segment+']';
  };
  path = path.map(dotAndBracketify);
  return path.join('').slice(1);
};

getCurrentPath = function (path, key) {
  var currentPath = path.slice(0);
  currentPath.push(key);
  return currentPath;
};

DocumentReport = function (name) {
  this.name              = name;
  this.messages          = [];
  this.childDocuments    = {};
  this.numChildDocuments = 0;
  this.console           = true; // for debugging
};

DocumentReport.prototype.addMessage = function (msg) {
  if (arguments.length > 1) msg = Array.prototype.slice.call(arguments);
  if (_.isArray(msg)) msg = msg.join(' ');
  this.messages.push(msg);
  if (this.console) console.log(this.name, msg);
  return this;
};

DocumentReport.prototype.addChildDocument = function (childDocument) {
  if (this.childDocuments.hasOwnProperty(childDocument.name)) {
    var targetDocument = this.childDocuments[childDocument.name];
    _.each(
      childDocument.messages,
      function (message) {
        targetDocument.addMessage(message);
      }
    );
    _.each(
      childDocument.childDocuments,
      function (grandchildDocument) {
        targetDocument.addChildDocument(grandchildDocument);
      }
    );
  }
  else {
    ++this.numChildDocuments;
    this.childDocuments[childDocument.name] = childDocument;
  }
  return this;
};

DocumentReport.prototype.getMessages = function () {
  var messages = [];
  if (this.messages.length) messages = messages.concat(this.messages);
  if (this.numChildDocuments)
    _.each(this.childDocuments, function (childDocument, name) {
      var subMessages = childDocument.getMessages();
      var block = {};
      block[name] = subMessages;
      if (subMessages.length) messages.push(block);
    });
  return messages;
};

Officer = function (schema, path) {
  this.doc        = undefined;
  this.docKeys    = _.keys(this.doc);
  this.schema     = schema;
  this.schemaKeys = _.keys(this.schema);
  this.path       = makeArray(path ? path : 'root');
  this.err        = new DocumentReport(_.last(this.path));
  this.info       = new DocumentReport(_.last(this.path));
  this.hasRun     = false;
};

Officer.prototype.isValid = function () {
  return (this.hasRun && this.err.getMessages().length === 0);
};

Officer.prototype.validate = function (doc) {
  this.doc = doc;
  _.each(this.doc, this.filterProperty, this);
  _.each(this.schema, this.examineProperty, this);
  this.hasRun = true;
  return this.isValid()
};

Officer.prototype.filterProperty = function (prop, docKey) {
  if (this.schemaKeys.indexOf(docKey) === -1) {
    var path = getCurrentPath(this.path, docKey);
    delete this.doc[docKey];
    this.info.addMessage('Filtered out property:', docKey);
  }
};

Officer.prototype.examineProperty = function (prop, schemaKey) {
  var info, err, path;

  path = getCurrentPath(this.path, schemaKey);
  info = new DocumentReport(schemaKey);
  err  = new DocumentReport(schemaKey);

  info.addMessage('Examining document property:', schemaKey);
  //console.log('Examining document property:', schemaKey, this.doc[schemaKey]);

  if ( ! hasValueFor(this.doc, schemaKey) &&
      isSchema(this.schema[schemaKey].type)) {
    //console.log('No value for:', schemaKey, this.doc[schemaKey]);

    if (this.schema[schemaKey].optional) {
      info.addMessage('Optional document not present');
      //console.log('Optional document not present:', schemaKey, this.doc[schemaKey]);
    }
    else {
      err.addMessage('Required document missing');
      //console.log('Required document missing:', schemaKey, this.doc[schemaKey]);
    }
  }
  else if (isSchema(this.schema[schemaKey].type)) {
    if (this.schema[schemaKey].collection) {
      this.validateCollection(schemaKey);
    }
    else
      this.validateChildDocument(schemaKey);
  }
  else
    this.validateProperty(schemaKey);

  this.info.addChildDocument(info);
  this.err.addChildDocument(err);
};

Officer.prototype.validateChildDocument = function (schemaKey, doc) {
  var path = getCurrentPath(this.path, schemaKey);
  this.info.addMessage('Validating child document',schemaKey);

  var schema = this.schema[schemaKey].type;
  if (doc === undefined)
    doc = this.doc[schemaKey];

  var validator = new Officer(schema, path);
  validator.validate(doc);

  this.err.addChildDocument(validator.err);
  this.info.addChildDocument(validator.info);
};

Officer.prototype.validateCollection = function (schemaKey) {
  var path, collectionInfo, collectionErr;

  path = getCurrentPath(this.path, schemaKey);

  collectionErr  = new DocumentReport(schemaKey);
  collectionInfo = new DocumentReport(schemaKey);

  collectionInfo.addMessage('Validating document collection',schemaKey);

  if ( ! _.isArray(this.doc[schemaKey])) {
    collectionInfo.addMessage('Document is not a collection: wrapping value.');
    this.doc[schemaKey] = [this.doc[schemaKey]];
  }

  this.doc[schemaKey].forEach((function (doc, index) {
    var docPath = getCurrentPath(path, index);
    var schema  = this.schema[schemaKey].type;

    var validator = new Officer(schema, docPath);
    validator.validate(doc);

    collectionErr.addChildDocument(validator.err);
    collectionInfo.addChildDocument(validator.info);
  }).bind(this));

  this.err.addChildDocument(collectionErr);
  this.info.addChildDocument(collectionInfo);
};

Officer.prototype.validateProperty = function (schemaKey) {
  var path = getCurrentPath(this.path, schemaKey);
  this.info.addMessage('Validating document property:',schemaKey);

  var validator = new PropertyValidator(
                        schemaKey,
                        this.schema[schemaKey],
                        this.doc,
                        this.doc[schemaKey],
                        path
                      );
  validator.validate();

  this.err.addChildDocument(validator.err);
  this.info.addChildDocument(validator.info);
};

PropertyValidator = function (key, schema, doc, value, path) {
  this.key        = key;
  this.schema     = schema;
  this.schemaType = getType(new schema.type());
  this.value      = value;
  this.valueType  = getType(value);
  this.doc        = doc;
  this.path       = path;
  this.err        = new DocumentReport(key);
  this.info       = new DocumentReport(key);
};

PropertyValidator.prototype.updateValue = function (value) {
  this.value     = this.doc[this.key] = value;
  this.valueType = getType(value);
};

PropertyValidator.prototype.validate = function () {
  if (this.schema.collection) this.validateCollection();
  else this.validateProperty();
};

PropertyValidator.prototype.validateProperty = function () {
  this.info.addMessage('Validating property');

  if (this.valueExists() && this.schema.type === String && this.typeMatches())
    this.prepareString();

  if (this.valueExists() && this.schema.before)
    this.updateValue(this.schema.before(this.value));

  this.determineValue();

  if (this.valueExists()) {
    this.typeMatches();

    if (this.schema.regExp)
      this.regExp();

    if (this.schema.range)
      this.checkRange();

    if (this.schema.after)
      this.updateValue(this.schema.after(this.value));
  }
};

PropertyValidator.prototype.validateCollection = function () {
  this.info.addMessage('Validating property collection:'+this.value);
  if ( ! _.isArray(this.value)) {
    this.err.addMessage('Expecting collection but got single property');
    return false;
  }
  this.value.forEach((function (property, index) {
    var path   = getCurrentPath(this.path, index);
    var schema = {};

    (Object.getOwnPropertyNames(this.schema))
      .forEach((function (key) {
        schema[key] = this.schema[key];
      }).bind(this));

    delete schema.collection;

    var validator = new PropertyValidator(index, schema, this.doc[this.key], property, path);
    validator.validate();

    this.err.addChildDocument(validator.err);
    this.info.addChildDocument(validator.info);
  }).bind(this));
};

PropertyValidator.prototype.prepareString = function () {
  var value;
  value = this.value.trim();
  if (value === '') {
    this.info.addMessage('Empty string converted to undefined');
    value = undefined;
  }
  this.updateValue(value);
};

PropertyValidator.prototype.valueExists = function () {
  return (this.value !== undefined);
};

PropertyValidator.prototype.determineValue = function () {
  var def;
  this.info.addMessage('Checking if value is present');

  if ( ! this.valueExists()) {
    if (this.schema['default']) {
      def = _.result(this.schema, 'default');
      this.updateValue(def);
      this.info.addMessage('Autofilled with', def);
    }
    else if (this.schema.optional)
      this.info.addMessage('Optional property not present');
    else {
      var name;
      name = this.schema.name? this.schema.name: 'information';
      this.err.addMessage('A', name, 'is required.');
    }
  }
  return this.value;
};

PropertyValidator.prototype.typeMatches = function () {
  var expected, actual;
  this.info.addMessage('Checking if type matches');

  actual   = this.valueType;
  expected = this.schemaType;

  if (actual !== expected) {
    this.info.addMessage('Type did not match.');
    if (this.schema.coerce) {
      if (this.coerce()) return;
    }
    else this.info.addMessage('Avoiding type coercion.');

    this.err.addMessage('Expecting a', expected, 'but got a', actual);
  }
};

PropertyValidator.prototype.coerce = function () {
  var actual, expected, coerced, isSuccessful;

  actual       = this.valueType;
  expected     = this.schemaType;
  coerced      = new this.schema.type(this.value);
  isSuccessful = (getType(coerced) === expected);

  this.info.addMessage('Coercing this', actual, 'into a', expected);

  if (isSuccessful) {
    this.info.addMessage('Successfully coerced to a', expected);
    this.updateValue(coerced);
  }
  else this.info.addMessage('Could not coerce to a', expected);

  return isSuccessful;
};

PropertyValidator.prototype.regExp = function () {
  this.info.addMessage('Testing regExp');
  var isMatch = this.schema.regExp.rule.test(this.value);
  if ( ! isMatch)
    this.err.addMessage(this.schema.regExp.error);
    /*this.err.addMessage(
      'Property '+
      ' ('+this.value+') did not match regular expression: '+
      this.schema.regExp
    );*/
};

// Checks ranges of numbers including date objects
PropertyValidator.prototype.checkRange = function () {
  var number, min, max, under, over, outOfRange, isDate;

  number = this.value;
  if (_.isNaN(number * 1)) {
    this.err.addMessage('Value is not a number');
    return;
  }

  min = this.schema.range[0];
  if (isNo(min)) {
    min = Number.NEGATIVE_INFINITY;
    this.info.addMessage('No minimum provided, using', min);
  }

  max = this.schema.range[1];
  if (isNo(max)) {
    max = Number.POSITIVE_INFINITY;
    this.info.addMessage('No maximum provided, using', max);
  }

  // useful for listing dates (like age) in a sane manner
  if (min > max) {
    this.info.addMessage('Swapping minimum and maximum values.');
    var swap = max;
    max = min;
    min = swap;
  }

  under =      (number < min);
  over =       (number > max);
  outOfRange = (under || over);

  isDate =     (number instanceof Date);

  if (outOfRange) {
    var msg = [];

    if (isDate) msg.push('Date');
    else msg.push('Number');

    msg.push('outside of accepted range:');

    if (isDate) {
      var earliestDate, latestDate;

      if (over) {
        latestDate = getDateString(max);
        msg.push('Cannot be after', latestDate);
      }
      else {
        earliestDate = getDateString(min);
        msg.push('Cannot be before', earliestDate);
      }
    }
    else {
      if (over) msg.push(number, 'cannot be greater than', max);
      else msg.push(number, 'cannot be less than', min);
    }

    this.err.addMessage(msg);
  }
};

module.exports = Officer;
