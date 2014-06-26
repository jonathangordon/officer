var assert = require("assert");
var Officer = require("../lib/officer");


describe('Attendance', function(){
  var absent = {
    a: 'a'
  };
  var present = {
    a: 'a',
    b: 'b'
  };

  it('should reject documents missing properties present in the schema', function () {
    var schema = {
      a: {},
      b: {}
    };

    var officer = new Officer(schema);
    
    assert.equal(false, officer.run(absent).result);
  });

  it('should accept documents containing all properties present in the schema', function () {
    var schema = {
      a: {},
      b: {}
    };

    var officer = new Officer(schema);
    
    assert.equal(true, officer.run(present).result);
  });
});

describe('Bounce', function(){
  var control = {
    a: 'a',
    b: 'b'
  };
  var test = {
    a: 'a',
    b: 'b',
    c: 'c'
  };

  it('should remove all properties not present in the schema', function () {
    var schema = {
      a: {},
      b: {}
    };

    var officer = new Officer(schema);
    
    officer.run(test);
    assert.deepEqual(control, test);
  });
});

describe('Siblings', function(){
  var obj = {
    a: 'a',
    b: 'b'
  };

  describe('XOR', function(){
    it('should reject an object with more than one "xor" sibling', function(){
      var schema = {
        a: {
          siblings: { xor: 'b' }
        },
        b: {
          siblings: { xor: 'a' }
        }
      };

      var officer = new Officer(schema);

      assert.equal(false, officer.run(obj).result);
    });

    it('should accept an object with only one "xor" sibling', function(){
      var schema = {
        a: {
          siblings: { xor: 'x' }
        },
        b: {
          siblings: { xor: 'y' }
        }
      };

      var officer = new Officer(schema);

      assert.equal(true, officer.run(obj).result);
    });
  });

  describe('AND', function(){
    it('should reject an object without a matching "and" sibling', function(){
      var schema = {
        a: {
          siblings: { and: 'x' }
        },
        b: {
          siblings: { and: 'y' }
        }
      };

      var officer = new Officer(schema);

      assert.equal(false, officer.run(obj).result);
    });

    it('should accept an object with a matching "and" sibling', function(){
      var schema = {
        a: {
          siblings: { and: 'b' }
        },
        b: {
          siblings: { and: 'a' }
        }
      };

      var officer = new Officer(schema);

      assert.equal(true, officer.run(obj).result);
    });
  });
});
