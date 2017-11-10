Feature: Bind to inputs
  As an internet user
  I want the framework to handle all input interaction
  and bind them to the appropriate dynamic variables

  Scenario: Bind to controls and report the value changes

    Given The input controls page

	   And initially both report panes display:
		 	| text     | text    |
		 	| checkbox | off     |
		 	| radio    | green   |
		 	| dropdown | Magenta |

	 When I modify the inputs:
	 	 | input    | contents                                     |
	 	 | text     | Just a sample                                |
	 	 | text     |                                              |
	 	 | text     | An example of an input with some more length |
	 	 | text     | text                                         |
	 	 | checkbox | true                                         |
	 	 | checkbox | false                                        |
	 	 | checkbox | true                                         |
	 	 | checkbox | false                                        |
	 	 | radio    | red                                          |
		 | radio    | green                                        |
		 | radio    | groen                                        |
	 	 | radio    | blue                                         |
	 	 | radio    | red                                          |
	 	 | radio    | green                                        |
	 	 | dropdown | Cyan                                         |
	 	 | dropdown | Magenta                                      |
		 | dropdown | Yellow                                       |
		 | dropdown | Geel                                         |
	 	 | dropdown | Cyan                                         |
	 	 | dropdown | Yellow                                       |
	 	 | dropdown | Magenta                                      |

	Then subsequently both report panes only change the appropriate label
