# homebridge-globalcache-gc100
**THIS PLUGIN DOESN'T WORK YET!**

The goal of this homebridge plugin is to make it possible to turn a TV and/or Stereo on or off with Siri.

**The hardware topology looks like this:**

    iOS Device -> homebridge server -|-> Global Cache 100 IR -> Stereo IR blaster
                                     |-> Global Cache 100 RS232 -> Television serial port


_"Siri turn on the Stereo"_ should then run this code:

```javascript
var net = require('net');

var HOST = '10.0.1.155';
var IR_PORT = 4998;
var RS232_PORT = 4999;
var client = new net.Socket();

// Marantz Stereo ON IR command:
var command = 'sendir,4:1,1,37000,4,1,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,32,32,64,32,2731,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,32,32,64,32,1200';

client.connect(IR_PORT, HOST, function(){
	console.log('CONNECTED TO: ' + HOST + ':' + IR_PORT);
		// Send the IR command to the GC100
		client.write(command+"\r");
}).on('data', function(data) {
	// log the response from the GC100
	console.log('DATA: ' + data);
	// Close the connection
	client.destroy();
});
```

In order to achieve this goal, I need to create a new platform for homebridge (https://github.com/nfarina/homebridge)



**HYPOTHETICAL config.json:**

_Add this to .homebridge/config.json:_

```javascript
"platforms": [
	{
		"platform": "globalcache-gc100",
		"name": "gc100",
		"host": "10.0.1.155",
		"ir_port": "4998",
		"rs232_port": "4999",

		"ir_devices": [
			{ "name": "Marantz Stereo",
				"commands": [
					{"on": "sendir,4:1,1,37000,4,1,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,32,32,64,32,2731,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,32,32,64,32,1200"},
					{"off": "sendir,4:1,2,37000,4,1,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,64,64,2731,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,64,64,1200"}
				]
			}
		],

		"rs232_devices": [
			{ "name": "Panasonic TV",
				"commands": [
					{"on" : "PON"},
					{"off" : "POF"}
				]
			}
		]
	}
]
```
