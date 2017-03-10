var 
	chai = require('chai')
;

should = require('chai').should() //actually call the function
  , foo = 'bar'
  , beverages = { tea: [ 'chai', 'matcha', 'oolong' ] };

foo.should.be.a('string');
foo.should.equal('bar');
foo.should.have.lengthOf(3);
beverages.should.have.property('tea').with.lengthOf(3);


describe('A test suite', function() {
	describe('An inner test suite', function() {
		it( 'should succeed also when nested', function() {
			foo.should.be.a('string').and.equal('baz');

		});
		
	});	
});

it( 'should succeed', function() {

});
