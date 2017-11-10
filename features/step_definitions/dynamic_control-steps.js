var cucumber = require('cucumber');

cucumber.defineSupportCode(function({Given,Then, When}) {
	Given(/^The input controls page$/, function () {
	  // Write code here that turns the phrase above into concrete actions

	  console.log( this );
	    return 'pending';
	});
});
