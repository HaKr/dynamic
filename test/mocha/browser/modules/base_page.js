(function base_page_module(){
'use strict';

const
    app_config      = require( './config/app_config' ),
    driver_config   = require( './config/driver_config' ),
    fs              = require( 'fs' )
;


class BasePage {
    constructor() {
        this.app_config = app_config;
        this.browser = driver_config.browser;
        this.By = driver_config.By;
        this.until = driver_config.until;
        this.Key = driver_config.Key;
        this.PromiseManager = driver_config.PromiseManager;
    }

    get ( url, locator ) {
        const self = this;

        this.url = url;

        return self.browser.get( url )
            .then( () => {return self.browser.findElement( locator ); });

    }


    setInputValue( input_element, value ){
        input_element.clear();
        input_element.sendKeys( value );
        // this.fireEvent( input_element, 'change' );
        input_element.sendKeys( this.Key.TAB );
    }

    capture( name ){
        const self = this;

        console.log('Capture '+name);

        const p = self.browser.takeScreenshot();

        p.then( function( image_data, err ){
            const
                d = new Date(),
                datestring = d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) +
                     " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)+ ":" + ("0" + d.getSeconds()).slice(-2),
                filename = "./screenshots/" + datestring + '_' + name + '.png'
            ;

            fs.writeFile(filename, image_data, 'base64', function(err) {
                if (err){
                    throw new Error('Error while saving screenshot.'+err );
                }
            });
        });

        // self.browser.takeScreenshot()
        //     .then( (png_base64) => {
        //         const
        //             d = new Date(),
        //             datestring = (d.getFullYear() + + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + "0" + d.getDate()).slice(-2) +
        //                  " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

        //             filename = "./screenshots/" + datestring + '_' + name + '.png'
        //         ;
        //         const  png_data = new Buffer( png_base64, 'base64');
        //         fs.mkdir( './screenshots', ()=>{
        //             fs.writeFile( filename, png_data, ()=>{} );
        //         });
        //     })
    }

}

module.exports = BasePage;

})();
