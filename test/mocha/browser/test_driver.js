
let 
	chai = require('chai')
;

chai.use(require('chai-as-promised'));
chai.should();

require('./modules/webdriver-mocha');

before( function(){
  this.timeout( 5000 );
} );

// after(function(done) {
//   driver.quit();
//   done();
// });


function ignore(){
describe('Selenium webdriver and PhantomJS', function() {
	it( 'should open google and look for "webdriver"', function(done){

		driver.get('http://www.google.com/ncr')
			.then( () => {
				driver.findElement(By.name('q')).sendKeys('webdriver');
				driver.findElement(By.name('btnG')).click();

			})
			.then( () => 
				chai.expect('.g:first-of-type h3').dom.to.have.text( 'Selenium Web_driver' )				
			)
			.then( () => driver.quit() ) 
			.then( () => done() )

			.catch( error => done(error) )
		;

	} );

});
}

// function ignore2(){

describe('my blog', () => {
  it('should navigate to post', function() {
    this.timeout( 5000 );
      
    return driver.get('http://markbirbeck.com/')
    .then(
      driver.getTitle()
      .should.eventually.equal('Mark Birbeck\'s Blog')
    )
    .then(() =>
      driver.findElement(
        By.linkText('A Mixin Approach to Material Design Lite Using Sass')
      ).click()
    )
    .then(
      driver.getTitle()
      .should.eventually.equal('A Mixin Approach to Material Design Lite Using Sass')
    )
    ;
  });
});
// }

function ignore3(){
describe('Test mark Birbeck\'s Blog', function(){
    beforeEach(function(done) {
        this.timeout( 5000 );
        driver.get('http://markbirbeck.com')
        .then( () => done() );
    });

    describe('Check homepage', function(){
        it('should see the correct title', function(done) {
          driver.getTitle()
          .should.eventually.equal('Mark Birbeck\'s Blog');
          done();
        });
    });

    describe('Title changes after link', function(){
        it('should see the correct title', function(done) {
          this.timeout( 15000 );

          return driver.findElement( By.linkText('A Mixin Approach to Material Design Lite Using Sass' ) )
            .click()
            .then( 
                driver.getTitle().should.eventually.equal('A Mixin Approach to Material Design Lite Using Sass')
            )
            
          ;
        });
    });

});
}
