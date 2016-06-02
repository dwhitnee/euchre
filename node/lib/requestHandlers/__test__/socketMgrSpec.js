/* global describe it beforeEach expect */

describe(
  "Euchre Web App",
  function() {
    var socketMgr = require("socketMgr");

    beforeEach(function() { });

    it("should exist",
       function() {
         expect( socketMgr.attach ).toBeDefined();
         expect( socketMgr.attach( {} )).not.toBe( null );
       });

});
