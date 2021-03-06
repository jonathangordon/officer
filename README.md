#Officer

Officer is a **powerful** schema-based JavaScript object validator and transformer. Keep your objects in line with Officer.

- Operates on arbitrary, multi-level JavaScript objects
- Supports collections and sub-objects
- Specify pre- and post-validation functions
- Supports a large variety of validation and transformation options
- Provides detailed reports about processing and failures

##Use

###tl;dr

```javascript
Officer = require('officer');
var officer = new Officer(schema);
officer.validate(data);
```

1. Specify an object schema
2. Create a new Officer object, passing in the schema and object to validate
3. Validate your object with your shiny new Officer
  * Optional: Enjoy access to a large report about what happened to your object as well as detailed error messages

###Longer version:

_First you need a schema_ to validate against. For this example, we'll be checking that some incoming cat JSON objects are the correct format, modifying and adding any information that can and should be, and then storing them.

**Sample POST data**
```json
[{
  "name": "Shadow",
  "fur": { "coverage": 1, "color": { "h": 0, "s": 0, "l":  2 } }
},{
  "name": "Mittens",
  "fur": [
    { "coverage": 0.96, "color": { "h": 0, "s": 0, "l": 100 } },
    { "coverage": 0.04, "color": { "h": 0, "s": 0, "l":  50 } }
  ]
},{
  "name": "Patches",
  "fur": [
    { "coverage": 0.45, "color": { "h":  0, "s":  0, "l": 100 } },
    { "coverage": 0.30, "color": { "h": 33, "s": 90, "l":  45 } },
    { "coverage": 0.25, "color": { "h":  0, "s":  0, "l":   0 } }
  ]
}]
```

First, the schema as a single file (_not as awesome_).

**The Full Schema) ./schema/full-cat.js**
```javascript
var rangedInteger = function(min, max) {
  return  {
    type: Number,
    min: min,
    max: max,
    // You can provide a function to perform on the value before it's validated with built-in validation an .after() function can also be provided
    before: function (n) {
      return Math.round(n);
    }
  };
};

module.exports = {
  name: {
    type: String,
    "default": "Kitty",
    regExp: {
      pattern: (/^[a-z\.\s]{1,32}$/i),
      error: "What kind of name is that?"
    }
  },
  fur: {
    type: {
      color: {
        type: {
          h: rangedInteger(0, 255),
          s: rangedInteger(0, 100),
          l: rangedInteger(0, 100),
          a: {
            type: Number,
            fallback: 1,
            min: 0,
            max: 1
          }
        },
      },
      coverage: {
        type: Number,
        min: 0,
        max: 1
      }
    },
    collection: true
  }
};
```

And then the schema broken up into sub-files to define sub-objects (_more awesome_).

**Schema Level 1) ./schema/cat.js**
```javascript
module.exports = {
  // each top-level key matches the object property to look for and validate
  name: {
    // the type can be a JavaScript constructor function
    type: String,
    // If the data is missing, we can specify a default value or function
    "default": "Kitty",
    // regular expressions can be specified with an option error message
    regExp: {
      pattern: (/^[a-z\.\s]{1,32}$/i),
      error: "What kind of name is that?"
    }
  },
  fur: {
    // the type can be an embedded object literal describing the structure (a schema)
    type: require('./fur'),
    // this tells Officer to also accept an array of matching values
    collection: true
  }
};
```

**Schema Level 2) ./schema/fur.js**
```javascript
module.exports = {
  color: {
    // nesting can go as deep as you'd like
    type: require('./color-hsla'),
  },
  coverage: {
    type: Number,
    // there are a few special built-in validation functions: Numbers->min, max being among them
    min: 0,
    max: 1
  }
};
```

**Schema Level 3) ./schema/color-hsla**
```javascript
var rangedInteger = function(min, max) {
  return  {
    type: Number,
    min: min,
    max: max,
    // You can provide a function to perform on the value before it's validated with built-in validation. An .after() function can also be provided
    before: function (n) {
      return Math.round(n);
    }
  };
};

module.exports = {
  h: rangedInteger(0, 255),
  s: rangedInteger(0, 100),
  l: rangedInteger(0, 100),
  a: {
    type: Number,
    fallback: 1,
    min: 0,
    max: 1
  }
};
```

Once you have your schema, you can _load it up and verify your object_.

**App) index.js**
```javascript
var Officer   = require('officer');
var catSchema = require('./schema/cat');
var catModel  = /* require our cat model */
var cats      = /* pull in our POST data */

cats.each(function (cat) {
  var catOfficer = new Officer(catSchema);

  if (catOfficer.validate(cat)) {
    catModel.save(cat); // The cat object has been modified directly
  }
  else {
    console.log(catOfficer.err.getMessages())
    // Also see what was done on an object with catOfficer.info.getMessages()
  }
});
```

##Why did I make this?


I was unhappy with the validation tools available online and wanted something that would work on complex objects with powerful schemas. I developed this tool as a way to work with JSON data going into my MongoDB collections without having to use a tool like Mongoose. It's in no way tied to MongoDB though.

##Version

0.2.0

##Requirements

Officer requires node.js and npm. It is dependent on the underscore package, but that will be removed in a later release.

##Installation

The easiest way to get it into your node project is through npm

```sh
npm install officer --save
```

##Contribution and Feedback

If you find an error in the tool, please fork the code, fix it and request a pull.

**Feedback and feature requests are welcome.**

##License

MIT

**Free Software, Hell Yeah!**
