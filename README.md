# Dynamic app framework


Dynamic app is a framework to offer dynamic, interactive web pages, that are exclusively build with HTML5 valid documents.

The framework is intended to manipulate data structures and thus is every input element and are all bindings related to the data element it references.

### Hello world example
```html welcome
<label>Please enter your name:
	<input name=addressee value=world>
</label>
		
<p class=salutation>Hello {{addressee}}!.
```
Here we define an input element with the default value "world" and the given name. In the paragraph below it, the same data element is refered to by using the double curly braces {{}}

### Hello world revised

```html welcome
<label>Please enter your name:
	<input name=addressee>
</label>

<p class="dynamic-template please-enter-value">Please enter your name in the input box above.

<p class="dynamic-template salutation" 
	data-dynamic-template-for=addressee
	data-dynamic-template-options="on-empty=please-enter-value"
>
		Hello {{addressee}}!
```

### Installation

For development, Dynamic requires [Node.js](https://nodejs.org/) v4+ with thje NPM package manager and browserify to generate the distributable javascript file.

Download and extract the [latest release](https://github.com/HaKr/dynamic).

Install the dependencies and devDependencies and start the file watcher.

```sh
$ cd dynamic
$ npm install -d
$ npm run watch
```


### Inspired by
 - Java Server Pages
 - Struts
 - Angular.js
 - Polymer
 - <template> tag

### Todos

 - Write more Tests
 - Real formula parser
 - Clean modules 

License
----
MIT
