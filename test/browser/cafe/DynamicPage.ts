import { Selector } from 'testcafe';

const
	CSS_CWD = 'fieldset.input-with-help:nth-child(2) > label:nth-child(1) > select:nth-child(2)'
;


class SelectControl {
	public select_element: Selector;
	option_elements: Selector;

	constructor ( selector:string ){
		this.select_element = Selector( selector );
		this.option_elements = this.select_element.find( 'option' );
	}
}

export class DynamicPage {
	working_directory_control: SelectControl;

   constructor () {
   	this.working_directory_control = new SelectControl( CSS_CWD );
   }

	 set_working_directory( ref:string ) {

	 }

	 get_working_directory(){
		 return this.working_directory_control.select_element.value;
	 }
}
