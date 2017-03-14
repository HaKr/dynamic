let 
	chai = require('chai'),
	expect = chai.expect
;

chai.use(require('chai-as-promised'));


describe('Chai as promised', function(){
	it('handles as promise', function(){
		return expect(Promise.resolve(2 + 2)).eventually.equal(5);
	});
});
