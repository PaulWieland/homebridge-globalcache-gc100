/* README:
 This utility converts a string into a base64 string.

 This might be needed because homebridge 0.2.11 crashes when certain Control
 Characters (which are often required in RS232 commands) are entered in config.json
 See https://github.com/nfarina/homebridge/issues/441

 To use this, put your string in the "command" var.
 Then run `node base64_converter.js`
 the base64 encoded version of your command will be outputted to your shell window
 Copy this encoded string and put it in your config.json file
 Make sure to set `base64 = true` for the command in config.json
*/

var command = 'PASTE YOUR COMMAND HERE'; // e.g. '\x02PON\x03' -> STXPONETX



// No need to edit below this line

var net = require('net');
var Entities = require('html-entities').AllHtmlEntities;
entities = new Entities();

console.log("\n\n");

console.log(
	new Buffer(command).toString('base64')
);
console.log("\n\n");