

const
	webpage = require('webpage'),
	test_page	= webpage.create(),
	welcome_page= webpage.create(),

	test_page_name	= 'file:///home/harry/work/dynamic/test/mocha/browser/assets/html/test_driver.html',
	welcome_page_name= 'file:///home/harry/work/dynamic/test/mocha/browser/assets/html/hello_world_basic.html'
;

var
	finished = 0
;

function finalize(){
	finished++;

	if (finished>1){
		phantom.exit();
	}
}

function create_logger( page ){
	return function( msg ){
		console.log(page + ': ' + msg );
	};
}

function create_error_handler( page ){
	return function(msg, trace) {

		var msgStack = ['ERROR: ' + msg];

		if (trace && trace.length) {
		 msgStack.push('TRACE:');
		 trace.forEach(function(t) {
		   msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
		 });
		}

		console.error(msgStack.join('\n'));
	};
}

test_page.onConsoleMessage = create_logger( 'TEST' );
test_page.onError = create_error_handler( 'TEST:' );

test_page.open( test_page_name, function(status) {
  console.log("Status: ", test_page_name, status);
  if(status === "success") {
    test_page.render('./screenshots/test_driver.png');
  }
  finalize();
});

welcome_page.onConsoleMessage = create_logger( 'WELCOME' );
welcome_page.onError = create_error_handler( 'WELCOME:' );

welcome_page.onResourceRequested = function(requestData, networkRequest) {
	var match = requestData.url.match(/dynamic-app.js/g);
 	if (match != null) {
  		console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
	}
};

welcome_page.onResourceError = function(resourceError) {
  console.log('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
  console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
};

welcome_page.onResourceReceived = function(response) {
	var match = response.url.match(/dynamic-app.js/g);
 	if (match != null) {
  		console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(response));
	}
};


welcome_page.open( welcome_page_name, function(status) {
	console.log("Status: ", welcome_page_name, status);
  if(status === "success") {
    welcome_page.render('./screenshots/hello_world.png');
  }
  finalize();
});
