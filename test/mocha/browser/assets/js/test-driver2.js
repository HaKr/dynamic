function get_going( class_name, originator ){
	console.log( 'GOING: Adding P element '+class_name );
	var p = document.createElement('p');
	p.classList.add( class_name  );
	var t = document.createTextNode( originator+' got me get going!' );
	p.appendChild( t );
	document.body.appendChild( p );
}

document.addEventListener("DOMContentLoaded", function(){

	get_started( 'dom-ready', 'test_driver2' );
}, false);
