//----------------------------------------------------------------------
// Misc useful functions
//----------------------------------------------------------------------

Array.prototype.rotate = function(n) {
  return this.slice(n, this.length).concat(this.slice(0, n));
};

var Util = {

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
  // cookies are raw text mushed together
  //----------------------------------------
  getCookie: function( key ) {
    return ('; '+document.cookie).split('; ' + key + '=').pop().split(';').shift();
  },

  //----------------------------------------
  // if you don't set path to root,
  // you get different cookie spaces depending on URL
  //----------------------------------------
  setCookie: function( key, value ) {
    document.cookie = key+"="+value+"; path=/; max-age=99999999";
  }
};
