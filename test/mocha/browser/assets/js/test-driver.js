function get_started( class_name, originator ){
	console.log( 'STARTING: Adding P element '+class_name );

	var p = document.createElement('p');
	p.classList.add( class_name  );
	var t = document.createTextNode( originator+' got me get started!' );
	p.appendChild( t );
	document.body.appendChild( p );
}

document.addEventListener("DOMContentLoaded", function(){

	get_started( 'dom-loaded', 'DOMContentLoaded' );
}, false);
