//----------------------------------------------------------------------
// Misc useful functions
//----------------------------------------------------------------------

Array.prototype.rotate = function(n) {
  return this.slice(n, this.length).concat(this.slice(0, n));
};

var Util = {

  sadface: "(╯°□°)╯︵ ┻━┻  ",

  //----------------------------------------
  // Do HTTP whizbangery to post a JSON blob
  //----------------------------------------
  makeJsonPostParams: function( data ) {
    return {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify( data )
    };
  },

  //----------------------------------------
  // cookies are raw key/value text mushed together with ;'s
  //----------------------------------------
  getCookie: function( key ) {
    let value = ('; '+document.cookie). // homogenize string
        split('; ' + key + '=').        // array of all pairs
        pop().                          // lose leading empty element
        split(';').                     // remove everything after the ";"
        shift();                        // get first element out of array

    if (!value) {
      return ""; }
    else {
      return JSON.parse( value );
    }
  },

  //----------------------------------------
  // if you don't set path to root,
  // you get different cookie spaces depending on URL
  //----------------------------------------
  setCookie: function( key, value ) {
    value = JSON.stringify( value );
    document.cookie = key+"="+value+"; path=/; max-age=99999999";
  }
};
