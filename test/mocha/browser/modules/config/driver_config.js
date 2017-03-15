
/*jslint node: true */
(function(){

'use strict';


const
    webdriver = require('selenium-webdriver'),
    phantomjs = require('phantomjs'),
    browser = new webdriver.Builder()
                    .withCapabilities({'phantomjs.binary.path': phantomjs.path})
                    .forBrowser('phantomjs')
                    .build(),
    result = { browser: null, By: null, Until: null, Key: null, PromiseManager: null }
;

['click', 'get', 'getTitle', 'quit', 'wait', 'takseScreenshot'].forEach(name => {
  var savedFn = browser[name];

  /**
   * Don't try turning this into an arrow function until node supports rest
   * parameters (arrow functions don't get an `arguments` value):
   */

  browser[name] = function() {
    return Promise.resolve(savedFn.apply(driver, arguments));
  }
});

/**
 * Mocha gives us 'global' that we can add our stuff to:
 */
if (typeof global === 'object'){
    global.driver = browser;
    global.By = webdriver.By;
    global.until = webdriver.until;
}

/**
 * Since we created the driver, we should remove it:
 */

after(function(done) {
    browser.quit();
    if (typeof done == 'function'){
        done();
    }
});

result.browser = browser;
result.By = webdriver.By,
result.Until = webdriver.until;
result.Key = webdriver.Key;
result.PromiseManager = webdriver.promise;

module.exports = result;

})();