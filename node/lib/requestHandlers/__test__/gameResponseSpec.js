/* global describe it beforeEach expect */

describe(
  "Game Request Handler",
  function() {
    var handler = require("requestHandlers/gameResponses");

    beforeEach(function() { });

    it("should exist",
       function() {
         expect( handler ).toBeDefined();
         // this is a router, how to test?

         var response = {};
         // authHandler.login( { body: {name: "George"} }, response );
         // FIXME: need mock response
         // expect( response....

       });

});
