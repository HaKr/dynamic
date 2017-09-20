import {  } from 'testcafe';

// import * as nock  from 'nock';

import { DynamicPage } from './DynamicPage';


const
	// TOE_HOST = 'http://localhost:12345',
	// TOE_PAGE = '/dynamic.html',
	TOE_FILE = 'file://' + __dirname+ '/../static/dynamic.html'
	// mock_server = nock( 'http://dynamic.ms.ciber.nl' )
	// 					.intercept( '/resources/team/working_directories', 'OPTIONS' )
	// 					.reply( 200, [ 'HEAD', 'GET' ])
   //              	.get( '/resources/team/working_directories' )
   //              	.replyWithFile(200, __dirname+ '/../static/dynamic.html'  )
;


fixture( 'Various tests of the dynamic framework' )
	.page( TOE_FILE )
;

test( 'Open the page', step1 );

async function step1( page ){
	const dynamic = new DynamicPage();

	await page
		.takeScreenshot( 'screenshots/step1.png' )
		.wait( 5000 )
		.expect( dynamic.get_working_directory() ).eql( '', 'No initial working directory.' )
	;

}
