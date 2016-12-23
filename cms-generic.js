
"use strict";

/*
 * Generic module for enhanced DOM node processing and notification
 * February 2015
 * Harry de Kroon
 *
 *  1.04 - Fix for the debug(...) method, there's no console.debug on IE8; use console.info instead.
 *      getNextSibling needs to return an Element
 *      setWidthPercentage added
 *  1.03 - Fix on excludeNodes option
 *  1.02 - Some IE8 fixes
 *  1.01 - First deployment of new framework
 **/
 /*eslint no-console: 0*/
window.cms$Generic = ( function ( module ) {

  if ( typeof module === "undefined" || module === null ) {

    var VERSION = "2.01.1";

    var log_level = 5;
    var node_index = 0;
    var hasConsole = ( typeof console === "object" && typeof console.log !== "undefined" );
    var DOMHead = document.head || document.getElementsByTagName( "head" )[0];
    var IsIE8 = ( !isNaN( document.documentMode ) && document.documentMode < 9 );
    var silencer;
    var PRINTFRE = /%./;
    var HIDDENCLASS = "hidden";
    var ANCESTORRE = /:ancestor\(([^\)]*)\)/;
    var LogLevels = {
      OFF: 10,
      ERROR: 7,
      WARNING: 5,
      VISUAL: 3,
      INFO: 1,
      DEBUG: -1
    };


    CMSModule.prototype.setLogLevel = function ( level ) {
      if ( hasConsole ) {
        log_level = level;

        if ( log_level == this.log_levels.DEBUG ) {
          this.error("CMS = %o.", this );
        }
      } else {
        //          alert('Cannot set level');
      }
    };


    CMSModule.prototype.examine = function ( callback ) {
      var log_level_saved = log_level;

      try{
        this.setLogLevel( this.log_levels.DEBUG );

        if ( typeof callback === "function" ) {

          callback.call( this );
        } else {
          if ( typeof callback.examine === "function" ) {
            callback.examine();
          }
        }
      } catch( e ) {

        this.error( "Examination failed: %s.", e, this );

      }

      log_level = log_level_saved;

    };

    CMSModule.prototype.debug = function () {
      if ( this.log_levels.DEBUG >= log_level ) {
        if ( typeof console.debug === "object" && typeof console.debug !== "undefined" ) {
          _to_console( console.debug, arguments );
        } else {
          // if there's no console.debug object (i.e. IE8), let's use the console.info,
          // as that's the next log level.
          _to_console( console.info, arguments );
        }
      }
    };

    CMSModule.prototype.error = function () {
      this.notifyDeveloper( "ERROR", arguments );

      if ( this.log_levels.ERROR >= log_level ) {
        _to_console( console.error, arguments );
      }
    };


    CMSModule.prototype.info = function () {
      if ( this.log_levels.INFO >= log_level ) {
        _to_console( console.info, arguments );
      }
    };

    CMSModule.prototype.visual_feedback = function () {
      if ( this.log_levels.VISUAL >= log_level ) {
        _to_console( console.info, arguments );
      }
    };

    CMSModule.prototype.warning = function () {
      this.notifyDeveloper( "WARNING", arguments );
      if ( this.log_levels.WARNING >= log_level ) {
        _to_console( console.warn, arguments );
      }
    };

    CMSModule.prototype.notifyDeveloper = function ( level, argumentsObject ) {
      if ( this.isDevelopment ) {
        var args = Array.prototype.slice.call( argumentsObject );

        var message = args.shift().toString();

        for ( ; args.length > 0 && PRINTFRE.test( message ); ) {
          var arg = args.shift();
          if ( typeof arg !== "undefined" ) {
            var argstr = arg.toString();
            message = message.replace( PRINTFRE, argstr );
          } else {
            message = message.replace( PRINTFRE, "<i>undefined</i>" );
          }
        }

        this.notificationBox.createNode( "p", {"class": level.toLowerCase() }, true ).setText( message + ". " + args.toString() );

        if ( level.toLowerCase() !== "info" ) {
          this.notificationBox.show();
        }
      }
    };

    CMSModule.prototype.info_notify = function () {
      //this.notifyDeveloper("INFO", arguments);

      this.info( arguments );
    };


    CMSModule.prototype.addJS = function ( src, callback ) {
      var scripDOMEnhancedNode = document.createElement( "script" );
      scripDOMEnhancedNode.setAttribute("type", "text/javascript" );
      scripDOMEnhancedNode.setAttribute("src", src );
      scripDOMEnhancedNode.onload = callback;

      DOMHead.appendChild( scripDOMEnhancedNode );
    };

    CMSModule.prototype.DOMEnhancedNode = DOMEnhancedNode;

    CMSModule.prototype.setupEnvironment = function ( isDevelop ) {
      this.isDevelopment = isDevelop;

      if ( this.isDevelopment ) {
        this.notificationBox = this.Body.createNode("div",  {"id":"developerNotifications", "class": "hidden"} );

        this.notificationBox.createNode("link", {rel:"stylesheet", "type":"text/css",  href:"Ressources/frameworks/eeg-debug."+VERSION+".css"} );

        var closeBtn = this.notificationBox.createNode("div", { "id":"btnDevClose", "class":"dialog-button"} );
        closeBtn.dialog = this.notificationBox;

        closeBtn.setClickHandler( function () {
          this.dialog.hide();  //.fadeOut();
        } );
        this.setLogLevel( this.log_levels.DEBUG );
      }

      return this.notificationBox;
    };

    CMSModule.prototype.getNode = function ( cssSelector, options ) {
      if ( typeof options !== "object" ) {
        options = {};
      }
      var silence = options.silence || false;
      var contextNode = options.contextNode || null;
      var ancestorNode = this.Document;

      if ( ANCESTORRE.test( cssSelector ) ) {
        var m = cssSelector.match( ANCESTORRE );
        var ancestorSelector = m[1].trim();
        cssSelector = cssSelector.substring( m[0].length ).trim();

        ancestorNode = contextNode !== null ? contextNode.getParent( ancestorSelector ) : this.getNode( ancestorSelector, {silence: true} );
      }
      return ancestorNode === null ? null : ancestorNode.getNode( cssSelector, silence );
    };

    CMSModule.prototype.getNodes = function ( cssSelector, options ) {
      if ( typeof options !== "object" ) {
        options = {};
      }
      var contextNode = options.contextNode || null;
      var exclude = options.excludeNodes || [];

      var ancestorNode = this.Document;

      if ( ANCESTORRE.test( cssSelector ) ) {
        var m = cssSelector.match( ANCESTORRE );
        var ancestorSelector = m[1].trim();
        cssSelector = cssSelector.substring( m[0].length ).trim();

        ancestorNode = contextNode !== null ? contextNode.getParent( ancestorSelector ) : this.getNode( ancestorSelector, {silence: true} );
      }
      return ancestorNode === null ? [] : ancestorNode.getNodes( cssSelector, exclude );
    };

    CMSModule.prototype.createNode = function ( tagName, options ) {
      return createDOMEnhancedNode( tagName, options );
    };

    CMSModule.prototype.enhanceNode = function ( domNode ) {
      return DOMEnhancedNode( domNode );
    };

    CMSModule.prototype.createDocumentFragment = function () {
      var result = document.createDocumentFragment();

      return DOMEnhancedNode( result );
    };


    CMSModule.prototype.register = function ( some_module, document_ready_fn ) {
      var m_name;

      if ( typeof some_module.info && typeof some_module.info.Name === "undefined" ) {
        m_name = "CMSModule" + ( this.modules.length+1 );
      } else {
        m_name = htmlID2CamelCase( some_module.info.Name );
      }

      if ( typeof document_ready_fn === "function" ) {
        some_module.document_ready = document_ready_fn;
      }

      this.modules[m_name] = some_module;
      this.module_list.push( some_module );

      var _this = this;
      Object.defineProperty( this, m_name, {
        enumerable: true,

        get: function () {
          return _this.modules[m_name];
        }
      } );

    };

    CMSModule.prototype.require = function ( module_name ) {
      var result = this.modules[module_name];

      if ( typeof result === "undefined" ) {
        this.error( 'Module "'+module_name+'" must be loaded first.' );

        return null;
      } else {
        return result;
      }

    };

    CMSModule.prototype.registerModel = function ( some_model ) {
      var m_name = some_model.info.Name;


      this.models[m_name] = some_model;

    };

    CMSModule.prototype.registerProcessor = function ( some_processor ) {
      var m_name = some_processor.info.Name;

      this.processors[m_name] = some_processor;

    };

    CMSModule.prototype.requireModel = function ( model_name ) {
      var result = this.models[model_name];

      if ( typeof result === "undefined" ) {
        this.error( 'Model "'+model_name+'" must be loaded first.' );

        return null;
      } else {
        return result;
      }

    };

    CMSModule.prototype.getProcessor = function ( processor_name ) {
      var result = this.processors[processor_name];

      if ( typeof result === "undefined" ) {
        return null;
      } else {
        return result;
      }

    };



    CMSModule.prototype.htmlID2CamelCase = htmlID2CamelCase;
    CMSModule.prototype.htmlID2OptionCase = htmlID2OptionCase;
    CMSModule.prototype.CamelCase2HtmlID = CamelCase2HtmlID;

    CMSModule.prototype.document_ready = function () {
      this.EnhancedNodes = {};

      this.setLogLevel( this.log_levels.INFO );

      this.Document = DOMEnhancedNode( document );
      this.Body = this.Document.getNode( "body" ); // document.body not supported in IE8

      this.module_list.forEach( function( a_module ) {
				module.info( a_module.info );
				
        if ( typeof a_module.document_ready === "function" ) {
          a_module.document_ready( this );
        }
      }, this );

      this.info( "CMS module %s ready, %o.", this.version, this );

      if ( typeof gotoScrollPosition === "function" ) {
        // already checked that it is a function
        // eslint-disable-next-line 
        gotoScrollPosition();
      }
    };


    if  ( IsIE8 ) {
      if ( typeof String.prototype.trim === "undefined" ) {
        String.prototype.trim = function () {
          return this.replace( /^\s+|\s+$/g, "" );
        };
      }

      if ( typeof Array.prototype.indexOf === "undefined" ) {
        Array.prototype.indexOf = function ( elem ) {
          var result = -1;

          for ( var i=0; result<0 && i<this.length; i++ ) {
            if ( this[i] === elem ) {
              result = i;
            }
          }

          return result;
        };
      }
    }

    if ( hasConsole && typeof console.clear !== "undefined" ) {
      console.clear();
    }

    var test_label = "inner text";
    var test_dom = document.createElement( "P" );
    var test_text = document.createTextNode( test_label );
    test_dom.appendChild( test_text );
    var dom_has_classList = ( typeof test_dom.classList === "object" );

    DOMEnhancedNode.prototype = {
      getId: function () {
        return this.domNode.id;
      },

      getInternalId: function () {
        var result = this.domNode.id;

        if ( this.domNode !== document && result !== "silencer" ) {
          if ( typeof result === "undefined" || result.length < 1 ) {
            result = "enhanced_node_" + ( ++node_index );
          }
        }

        return htmlID2CamelCase( result );
      },

      getBooleanAttribute: function ( attrname ) {
        var attrvalue = this.domNode.getAttribute( attrname );

        return typeof attrvalue !== "undefined" && attrvalue !== null && ( attrvalue === true || attrvalue === attrname );
      },

      setBooleanAttribute: function ( attrname, onoff ) {

        if ( onoff === true ) {
          this.domNode.setAttribute( attrname, attrname );
        } else {
          this.domNode.removeAttribute( attrname );
        }
      },

      getDisabled: function () {
        return this.getBooleanAttribute( "disabled" );
      },

      setDisabled: function ( onoff ) {
        this.setBooleanAttribute("disabled", onoff );
      },

      getReadonly: function () {
        return this.getBooleanAttribute( "readonly" );
      },

      setReadonly: function ( onoff ) {
        this.setBooleanAttribute("readonly", onoff );
      },

      isInteractive: function () {
        return this.domNode.nodeName === "INPUT" || this.domNode.nodeName === "SELECT" || this.domNode.nodeName === "TEXTAREA";
      },

      getClasses: function () {
        return this.domNode.className.split( " " );
      },

      getAttribute: function ( attrName ) {
        return this.domNode.getAttribute( attrName );
      },

      setAttribute: function ( attrName, attrValue ) {
        this.domNode.setAttribute( attrName, attrValue );
        return this;
      },

      removeAttribute: function ( attrName ) {
        this.domNode.removeAttribute( attrName );

        return this;
      },

      getWidth: function () {
        var r = this.domNode.getBoundingClientRect();

        var result = r.width;

        if ( typeof result !== "number" ) {
          result = r.right - r.left;
        }

        return result;
      },

      show: function (toggle) {
        if (typeof toggle === "undefined"){
          toggle = true;
        }
        if (toggle){
          this.removeClass( HIDDENCLASS );
        } else {
          this.hide();
        }
      },

      hide: function () {
        this.addClass( HIDDENCLASS );
      },

      setWidthStyle: function ( newW ) {
        this.domNode.style.width = newW;
      },

      setWidth: function ( newW ) {
        this.setWidthStyle( newW + "px" );
      },

      setWidthPercentage: function ( newW ) {
        this.setWidthStyle( newW + "%" );
      },

      setTabIndex: function ( tabIndex ) {
        this.setAttribute("tabindex", tabIndex );
      },

      insertAfter: function ( sibling ) {
        if ( typeof sibling === "undefined" || sibling === null ) {
          this.error( "insertAfter requires an existing sibling" );

          return this;
        }

        var parent = sibling.getParent();
        var $nextSibling = sibling.getNextSibling();
        var nextSibling = $nextSibling === null ? null : $nextSibling.domNode;
        parent.domNode.insertBefore( this.domNode, nextSibling );

        return this;
      },

      insertBefore: function ( sibling ) {
        if ( typeof sibling === "undefined" || sibling === null ) {
          this.error( "insertBefore requires an existing sibling" );

          return this;
        }

        var parent = sibling.getParent();
        parent.domNode.insertBefore( this.domNode, sibling.domNode );

        return this;
      },

      remove: function () {
        if ( this.domNode.parentNode ) {
          // module.EnhancedNodes[htmlID2CamelCase(this.domNode.id)] = null;
          this.domNode.parentNode.removeChild( this.domNode );
        }
      },

      getParent: function ( simpleSelector ) {

        var selector = new SimpleSelector( simpleSelector );
        var result;

        for ( result = DOMEnhancedNode( this.domNode.parentNode );
          typeof result !== "undefined" && result.domNode !== document && !selector.tester( result );
          result = DOMEnhancedNode( result.domNode.parentNode ) ) {
          // nothing more to do
        }

        return result;
      },

      toggleClass: function ( className ) {
        if ( this.hasClass( className ) ) {
          this.removeClass( className );
        } else {
          this.addClass( className );
        }
      },

      getNode: function ( cssSelector, silence ) {
        if ( typeof silence !== "boolean" ) {
          silence = false;
        }

        var domNode = null;

        try {
          domNode = this.domNode.querySelector( cssSelector );
        } catch( e ) {
          module.error( "Enhanced node :: getNode() - error: %s.", e, this );
        }

        return domNode === null ? ( silence ? silencer : null ) : DOMEnhancedNode( domNode );
      },

      getNodes: function ( cssSelector, exclude ) {
        var excludes = [];

        if ( typeof exclude !== "undefined" ) {
          if ( typeof exclude.length === "undefined" ) {
            excludes.push( exclude );
          } else {
            excludes = exclude;
          }
        }

        var domNodes = [];
        try{
          if (typeof this.domNode.querySelectorAll === "function"){
            domNodes=this.domNode.querySelectorAll( cssSelector );
          }
        } catch ( exc ) {
          module.error( 'Selector "%s" failed. (Did you use CSS3 in IE8?) Error message: %s, node: %O.', cssSelector, exc, this );
        }

        var result = [];

        for ( var i=0; i<domNodes.length; i++ ) {
          var childNode = DOMEnhancedNode( domNodes[i] );
          if ( excludes.indexOf( childNode )<0 ) {
            result.push( childNode );
          }
        }

        return result;
      },

      createNode: function ( tagName, options, asFirst ) {
        if ( typeof asFirst !== "boolean" ) {
          asFirst = false;
        }

        var result = createDOMEnhancedNode( tagName, options );

        if ( asFirst ) {
          this.domNode.insertBefore( result.domNode, this.domNode.firstChild );
        } else {
          this.domNode.appendChild( result.domNode );
        }

        return result;
      },

      setClickHandler: function ( clickHandler, handler ) {
        if ( typeof handler==="undefined" ) {
          handler = this;
        }
        this.clickHandler = clickHandler;
        this.domNode.onclick = function ( event ) {
          // var enhanced = this.cms$data.enhanced;
          clickHandler.call( handler, event );

          return false;
        };
      }

    };

    if ( typeof test_dom.textContent === "string" ) {
      DOMEnhancedNode.prototype.getText = function () {
        return ( this.isInteractive() ? this.domNode.value : this.domNode.textContent ).trim();
      };

      DOMEnhancedNode.prototype.setText = function ( newText, options ) {
        if( this.isInteractive() ) {
          this.domNode.value = newText;
        } else {
          if ( typeof options === "undefined" ) {
            options = {};
          }
          if ( typeof options.html === "undefined" ) {
            options.html = false;
          }

          if ( options.html ) {
            this.domNode.innerHTML = newText;
          } else {
            this.domNode.textContent = newText;
          }
        }
        return this;
      };
    } else {
      if ( typeof test_dom.innerText === "string" ) {
        DOMEnhancedNode.prototype.getText = function () {
          return ( this.isInteractive() ? this.domNode.value : this.domNode.innerText ).trim();
        };

        DOMEnhancedNode.prototype.setText = function ( newText ) {
          if( this.isInteractive() ) {
            this.domNode.value = newText;
          } else {
            this.domNode.innerHTML = newText;
          }

          return this;
        };
      } else {
        DOMEnhancedNode.prototype.getText = function () {
          module.error( "Sorry, I have no idea how to get the content of a DOM node" );
          return "";
        };

        DOMEnhancedNode.prototype.setText = function () {
          module.error( "Sorry, I have no idea how to change the content of a DOM node" );

          return this;
        };

      }
    }

    if ( !dom_has_classList ) {

      DOMEnhancedNode.prototype.classNames = function (){
        return this.domNode.className.split( " " );
      };



      DOMEnhancedNode.prototype.hasClass = function ( cssClass ) {
        var classes = this.domNode.className.split( " " );
        var result = false;

        for ( var i = 0; !result && i < classes.length; i++ ) {
          if ( classes[i] === cssClass ) {
            result = true;
          }
        }

        return result;
      };

      DOMEnhancedNode.prototype.removeClass = function ( cssClass ) {
        var classes = this.domNode.className.split( " " );

        var result = [];
        var removed = false;

        for ( var i = 0; i < classes.length; i++ ) {
          if ( classes[i] === cssClass ) {
            removed = true;
          } else {

            result.push( classes[i] );
          }
        }
        if ( removed ) {
          this.domNode.className = result.join( " " ).trim();
        }

        return this;
      };

      DOMEnhancedNode.prototype.addClass = function ( cssClass ) {
        var cssNames = cssClass.split( " " );

        for ( var i=0; i<cssNames.length; i++ ) {

          var cssName = cssNames[i];

          if ( !this.hasClass( cssName ) ) {
            var classes = this.domNode.className.split( " " );
            classes.push( cssName );

            this.domNode.className = classes.join( " " ).trim();
          }
        }

        return this;
      };
    } else {

      DOMEnhancedNode.prototype.classNames = function (){
        return Array.prototype.slice.call( this.domNode.classList );
      };

      DOMEnhancedNode.prototype.hasClass = function ( cssClass ) {
        return this.domNode.classList.contains( cssClass );
      };

      DOMEnhancedNode.prototype.removeClass = function ( cssClass ) {
        this.domNode.classList.remove( cssClass );

        return this;
      };

      DOMEnhancedNode.prototype.removeClass = function ( cssClass ) {
        this.domNode.classList.remove( cssClass );

        return this;
      };

      DOMEnhancedNode.prototype.getAttributes = function () {
        var result = []

        if (this.domNode.hasAttributes()){
          for (var attr,ai=0; ai < this.domNode.attributes.length; ai++ ){
            attr = this.domNode.attributes[ ai ];
            result.push( {name: attr.name, value: attr.value});
          }
        }

        return result;
      };

      DOMEnhancedNode.prototype.addClass = function ( cssClass ) {
        var cssNames = cssClass.split( " " );

        for ( var i=0; i<cssNames.length; i++ ) {
          this.domNode.classList.add( cssNames[i] );
        }

        return this;
      };
    }


    if ( IsIE8 ) {
      DOMEnhancedNode.prototype.setOpacity =function ( opacity ) {
        this.domNode.style.filter = "alpha(opacity=" + Math.round( opacity * 100 ) + ")";
      };

      // https://msdn.microsoft.com/en-us/library/ms533897(VS.85).aspx
      //    The property is read/write for all objects except the following, for which it is read-only: COL, COLGROUP, FRAMESET, HEAD, HTML, STYLE, TABLE, TBODY, TFOOT, THEAD, TITLE, TR.
      DOMEnhancedNode.prototype.getClone = function () {
        var READONLYS = ["COL", "COLGROUP", "FRAMESET", "HEAD", "HTML", "STYLE", "TABLE", "TBODY", "TFOOT", "THEAD", "TITLE", "TR"];

        var result = document.createElement( this.domNode.tagName );

        if ( READONLYS.indexOf( result.tagName ) >= 0 ) {
          if ( result.tagName === "TR" ) {
            var srcCells = this.domNode.cells;
            for ( var ci=0; ci<srcCells.length; ci++ ) {
              var srcCell = srcCells[ci];
              var newTD = result.insertCell();
              var srcAttrs = srcCell.attributes;

              for ( var ai=0; ai<srcAttrs.length; ai++ ) {
                var srcAttribute = srcAttrs[ai];
                newTD.setAttribute( srcAttribute.nodeName, srcAttribute.nodeValue );
              }
              newTD.className = srcCells[ci].className;
              newTD.innerHTML = srcCells[ci].innerHTML;
            }
          } else {
            module.error( 'Unfortunately, in IE8 a "%s" cannot be cloned.', result.tagName );
          }
        } else {
          result.innerHTML = this.domNode.innerHTML;
        }

        return new DOMEnhancedNode( result );
      };

    } else {
      DOMEnhancedNode.prototype.setOpacity = function ( opacity ) {
        this.domNode.style.opacity = opacity + "";
      };

      DOMEnhancedNode.prototype.getClone = function () {
        var result = this.domNode.cloneNode( true );

        if ( typeof result.removeAttribute === "function" ) {
          result.removeAttribute( "id" ); // prevent duplicate IDs
        }

        return new DOMEnhancedNode( result );
      };
    }


    if ( typeof test_dom.nextElementSibling === "undefined" ) {
      DOMEnhancedNode.prototype.getNextSibling = function () {
        var result = this.domNode.nextSibling;

        for ( ;typeof result !== "undefined" && result !== null && result.nodeType !== 1; result = result.nextSibling ) {
          //
        }

        return ( typeof result === "undefined" ||result === null ) ? null : DOMEnhancedNode( result );
      };
    } else {
      DOMEnhancedNode.prototype.getNextSibling = function () {
        var result = this.domNode.nextElementSibling;

        return ( typeof result === "undefined" ||result === null ) ? null : DOMEnhancedNode( result );
      };
    }

    DOMEnhancedNode.prototype.addChild = function add_enhanced_child( childNode ) {
      this.domNode.appendChild( childNode.domNode );
    };

    DOMEnhancedNode.prototype.replaceChild = function replace_enhanced_child( newChildNode, oldChildNode ) {
      this.domNode.replaceChild( typeof newChildNode.domNode === "object" ? newChildNode.domNode : newChildNode, oldChildNode.domNode );
    };

    DOMEnhancedNode.prototype.replace = function replace_enhanced_node( newChildNode ) {
      var parent = this.getParent();
      parent.replaceChild( newChildNode, this );
    };

    DOMEnhancedNode.prototype.insertCommentBefore = function insert_comment_before_enhanced_node( comment_text ) {
      var parent = this.getParent();

      var comment_node = DOMEnhancedNode( document.createComment( comment_text ) );
      comment_node.insertBefore( this );

      return comment_node;
    };

    DOMEnhancedNode.prototype.insertTextBefore = function insert_comment_before_enhanced_node( text ) {
      var parent = this.getParent();

      var text_node = DOMEnhancedNode( document.createTextNode( text ) );
      text_node.insertBefore( this );

      return text_node;
    };

    DOMEnhancedNode.prototype.getChildNodes = function get_children_enhanced_node() {
      var result = [];
      var child_list = this.domNode.childNodes;

      for (var i = 0, child_node; i < child_list.length; i++) {
        child_node = child_list[ i ];
        result.push( DOMEnhancedNode( child_node ) );
      } 

      return result;
    };

    DOMEnhancedNode.prototype.scrollIntoView = function() {
      this.domNode.scrollIntoView();
    };


    DOMEnhancedNode.prototype.filterNodes = function filterNodes( options, filter ) {
      if ( typeof options === "function" ) {
        filter = options;
        options = {};
      }

      if ( !options.hasOwnProperty( "nodeType" ) ) {
        options.nodeType = false;
      }

      if ( !options.hasOwnProperty( "fromNode" ) ) {
        options.fromNode = this;
      }

      if ( !options.hasOwnProperty( "recursive" ) ) {
        options.recursive = true;
      }



      var result = [];

      var childrenList = options.fromNode.domNode.content ? options.fromNode.domNode.content.childNodes : options.fromNode.domNode.childNodes;
      var children = Array.prototype.slice.call( childrenList );

      for ( var nodes = children, i=0; i < nodes.length; i++ ) {
          var node = nodes[i], nodeType = node.nodeType;
          var enhanced = DOMEnhancedNode( node );

          if ( !options.nodeType || nodeType === options.nodeType ) {
            if ( !filter || filter( enhanced ) ) {
              result.push( enhanced );
            }
          }

          if ( options.recursive && ( nodeType == 1 || nodeType == 9 || nodeType == 11 ) ) {
            options.fromNode = enhanced;
            result = result.concat( this.filterNodes( options, filter ) );
          }
        }


      return result;
    };


    silencer = createDOMEnhancedNode("div", {style: "display: none;", id: "silencer"} );

    module = new CMSModule();


    waitForDOMContent();
  } // endif module == null

  function CMSModule() {
    this.version = VERSION;
    this.log_levels = LogLevels;

    this.modules = {};
    this.module_list = [];
    this.processors = {}
    this.models = {};
  }

  function htmlidreplacer( match, firstLetter ) {
    return firstLetter.toUpperCase();
  }

  var HTMLIDMATCHER = /[\-._:\s](\w)/g;

  function htmlID2CamelCase( htmlid ) {
    return htmlid.substring( 0, 1 ).toUpperCase() + htmlid.substring( 1 ).replace( HTMLIDMATCHER, htmlidreplacer );
  }

  function htmlID2OptionCase( htmlid ) {
    return htmlid.substring( 0, 1 ).toLowerCase() + htmlid.substring( 1 ).replace( HTMLIDMATCHER, htmlidreplacer );
  }

  var CAPITALMATCHER = /([A-Z])/g;
  function CamelCase2HtmlID( camelcase, separator ) {
    if ( typeof separator !== "string" ) {
      separator = "-";
    }
    return camelcase.replace( CAPITALMATCHER, function ( m, letter ) {
      return separator + letter.toLowerCase();
    } ).substring( 1 );
  }

  function createDOMEnhancedNode( tagName, options ) {
    var result = document.createElement( tagName );

    if ( typeof options === "object" ) {
      for ( var attrName in options ) {
        result.setAttribute( attrName, options[attrName] );
      }
    }

    return DOMEnhancedNode( result );
  }


  function DOMEnhancedNode( domNode ) {

    var result = this;

    if ( typeof domNode !== "undefined" && domNode !== null ) {

      if ( typeof domNode.cms$data === "undefined" && domNode.cms$data !== null ) {
        domNode.cms$data = {};
      }

      if ( typeof domNode.cms$data.enhanced === "undefined" ) {
        result = new DOMEnhancedNode();
        domNode.cms$data.enhanced = result;
        result.domNode = domNode;

        // if (domNode !== document && domNode.id !== "silencer"){
        //  if (typeof result.domNode.id === "undefined" || result.domNode.id.length < 1) {
        //    result.domNode.id = 'enhanced_node_' + (++node_index);
        //  }
        //  module.EnhancedNodes[result.getInternalId()] = result;
        // }
      } else {
        result = domNode.cms$data.enhanced;
      }
    }

    return result;
  }

	function waitForDOMContent() {

    var called = false;

    function ready() {
      if ( called ) return;
      called = true;
      module.document_ready();
    }

    function tryScroll() {
      if ( called ) return;
      try {
        document.documentElement.doScroll( "left" );
        ready();
      } catch( e ) {
        setTimeout( tryScroll, 10 );
      }
    }

    if ( document.addEventListener ) { // native event
      document.addEventListener( "DOMContentLoaded", ready, false );
    } else if ( document.attachEvent ) {  // IE

      try {
        var isFrame = window.frameElement != null;
      } catch( e ) {
        // ignore any error
      }

      // IE, the document is not inside a frame
      if ( document.documentElement.doScroll && !isFrame ) {
        tryScroll();
      }

      // IE, the document is inside a frame
      document.attachEvent( "onreadystatechange", function () {
        if ( document.readyState === "complete" ) {
          ready();
        }
      } );
    }

    // Old browsers
    if ( window.addEventListener )
        window.addEventListener("load", ready, false );
      else if ( window.attachEvent )
        window.attachEvent("onload", ready );
      else {
        var fn = window.onload; // very old browser, copy old onload
        window.onload = function () { // replace by new onload and call the old one
        fn && fn();
        ready();
      };
      }
  }

  var SimpleSelect = {
    ".": function ( enhancedNode ) { return enhancedNode.hasClass( this.simple ); },
    "#": function ( enhancedNode ) { return enhancedNode.domNode.id === this.simple; }
  };

  function SimpleSelector( simpleSelector ) {
    this.simple = simpleSelector;
    this.tester = null;

    if ( typeof simpleSelector === "string" && simpleSelector.trim().length>0 ) {
      var selector = simpleSelector.charAt( 0 );
      var tester = SimpleSelect[selector];
      if ( typeof tester === "function" ) {
        this.tester = tester;
        this.simple = simpleSelector.substring( 1 );
      } else {
        this.tester = function ( enhancedNode ) { return enhancedNode.domNode.tagName === this.simple; };
        this.simple = simpleSelector.toUpperCase();
      }

    } else {
      this.tester = function () { return true; };
    }
  }

  function _to_console( console_target, params ) {
    var args = Array.prototype.slice.call( params );
    if ( typeof args[0] === "function" ) {
      args[0]();
    } else {
      if ( typeof console_target.apply === "function" ) {
        console_target.apply( console, args );
      } else {
        var msg = args[0];
        var parm1 = args.length>1 ? args[1] : "", parm2 = args.length>2 ? args[2] : "", parm3  = args.length>3 ? args[3] : "";

        console_target( msg, parm1, parm2, parm3 );
      }
    }
  }


  return module;

} )( window.cms$Generic );
