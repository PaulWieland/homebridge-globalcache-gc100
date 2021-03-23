# homebridge-globalcache-gc100
**Development abandoned**
I am not developing this plugin any longer.

NodeRED provides a much more robust platform for integrating the Global Cache with HomeKit.

Example: https://gist.github.com/PaulWieland/8fe4ab1ddf995c9a99494e19762b7ee8



**THIS HOMEBRIDGE PLUGIN IS VERY BETA**

I can sucesfully turn my Panasonic Plasma TV and Marantz Stereo on and off by saying _"Siri turn the Marantz On"_ or _"Siri turn the Panasonic TV On"_. This plugin assumes you already have the IR codes or serial commands for your devices that are downstream of your GC100. I would suggest only attempting to use this plugin if you can _already_ control your devices with your GC100!

### Installation ###

Requires `homebridge` and `net`

```
npm -g install homebridge-globalcache-gc100
```

### ~~To Do:~~ ###

  1. ~~Find a way to implement more than just On/Off service so that its possible to control volume, mute and input~~
  2. ~~Test more IR devices (e.g. Apple TV)~~
  3. ~~Support GC100's DC Triggers~~


### About ###

The goal of this homebridge plugin is to make it possible to turn a TV and/or Stereo on or off with Siri.

**The hardware topology looks like this:**

    iOS Device -> homebridge server -|-> Global Cache 100 IR -> Stereo IR blaster
                                     |-> Global Cache 100 RS232 -> Television serial port


_"Siri turn on the Stereo"_ should then run this code:

```javascript
var net = require('net');

var HOST = '10.0.1.155';
var IR_PORT = 4998;
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


### Configuration ###

**HYPOTHETICAL config.json:**

_Add this to .homebridge/config.json:_


```javascript
"platforms": [
	{
		"platform": "globalcache-gc100",
		"name": "gc100",
		"host": "10.0.1.155",
		"ir_port": "4998",

		"ir_devices": [
			{ "name": "Marantz Stereo",
				"commands": {
					{"on": "sendir,4:1,1,37000,4,1,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,32,32,64,32,2731,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,32,32,64,32,1200"},
					{"off": "sendir,4:1,2,37000,4,1,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,64,64,2731,32,32,32,32,32,32,64,32,32,32,32,32,32,161,32,32,32,64,32,32,64,32,32,32,32,32,32,32,32,32,32,64,64,1200"}
				},
				"success_messages" : {
					"on": "completeir,4:1,1",
					"off": "completeir,4:1,2"
				}
			}
		],

		"rs232_devices": [
			{"name": "Panasonic TV",
			"port": "4999",
			"base64_encoded": true,
				"commands": {
					"on" : "AlBPTgM=",
					"off" : "AlBPRgM="
				},
				"success_messages" : {
					"on" : "AlBPTgM=",
					"off" : "AlBPRgM="
				}
			}
		]
	}
]
```

**Config file Notes:**

  1. `success_message` is the data that the GC100 should send back to this plugin if the command is received and understood by the GC100. This is how Siri knows to respond "yes it worked" or "no, there was a problem"
  2. There is an issue specifying control characters such as `\x02` or `\x03` (STX or ETX) in the homebridge `config.json` file. I had to implement a workaround by base64 encoding the RS232 commands. See `base64_encoder.js` and https://github.com/nfarina/homebridge/issues/441
  3. There is a unique port for each RS232 device, but only one port for all IR devices - that's why the port # is specified separately.
  4. Siri responds to the "Name" you specify for each device.


### Support ###

**Contact me on slack!**

I'm a member of https://homebridgeteam.slack.com/messages/plugins/team/
