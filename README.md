Officer
=========

Officer is a schema-based JavaScript object validator and transformer.

  - Operates on arbitrary JavaScript objects
  - Specify pre- and post-validation functions
  - Supports a large variety of validation and transformation options

Use
---

___First you need a schema___ to validate against. For this example, we'll be checking that a particular string

**objectid-schema.js**

```javascript
    var objectIDSchema, ObjectID;
    
    ObjectID = require('mongodb').ObjectID;
    
    objectIDSchema = {
      _id: {
        // Specify the expected type of the data
        type: ObjectID,
        // If the data isn't initially of the right type, attempt to coerce by
        // way of type-casting before type-validation is done.
        coerce: true,
        // Redundant: Collections (an array of these values) are false by default
        collection: false,
        // Redundant: entries in schema are required by default
        optional: false,
        // If the data is missing (and required), you can provide a default value
        // as a static value or a function that returns a value
        "default": function () {
          var id, idString;
        
          id = new ObjectID();
          return id;
        },
        // Validation can include a test against a regular expression
        regExp: {
          rule: (/^[0-9a-f]{24}$/i),
          error: 'Must be a valid ID format'
        },
        // If the data should be modified after initial validation, this step
        // can be added in the 'after' method
        after: function (id) {
          if (id instanceof ObjectID)
          return id;
        
          return new ObjectID(id);
        }
      }
    };
    
    module.exports = objectIDSchema;

```

Once you have your schema, you can ___load it up and verify your object___.

```javascript
  var Officer = require('officer');
  var schema = require('./objectid-schema');
    
  var data = {
    _id: "507f191e810c19729de860ea"
  };
    
  var officer = new Officer(schema, data);
    
  if (officer.validate()) 
    console.log('Looks good!');
  else
    console.log(officer.err.getMessages())
```

Are you wondering why I made this?
----

I was unhappy with the validation tools available online and wanted something that would work on complex objects with powerful schemas. I developed this tool as a way to work with JSON data going into my MongoDB collections without having to use a tool like Mongoose.

Version
----

0.0.1

Requirements
-----------

To use Officer, just isntall it with NPM.

Installation
--------------

The easiest way to get it into your node project is with npm

```sh
npm install officer --save
```

Contribution and Feedback
-------------------------

If you find an error in the tool, please fork the code, fix it and request a pull.

Feedback and requests for new features are welcome.

License
----

MIT

**Free Software, Hell Yeah!**
