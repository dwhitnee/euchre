/* global describe it beforeEach expect */

describe(
  "Auth Rewuest Handler",
  function() {
    var authHandler = require("requestHandlers/auth");

    beforeEach(function() { });

    it("should exist",
       function() {
         expect( authHandler.login ).toBeDefined();
         var response = {};
         // authHandler.login( { body: {name: "George"} }, response );
         // FIXME: need mock response
         // expect( response....

       });

});
