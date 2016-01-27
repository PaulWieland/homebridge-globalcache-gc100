var net = require("net");
var Service, Characteristic;

/* Register the plugin with homebridge */
module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  
  homebridge.registerPlatform("homebridge-globalcache-gc100", "GC100Platform", GC100Platform);
}

function GC100Platform(log, config) {
	this.log = log;
	this.name = config["name"];
	this.ir_devices = config["ir_devices"];
	this.rs232_devices = config["rs232_devices"];

	// Device connection settings
	this.host = config["host"];
	this.ir_port = (config["ir_port"] ? config["ir_port"] : 4998);
	// RS232 ports are device specific so they are part of the device config
}

GC100Platform.prototype.accessories = function(callback){
	var results = [];
	
	if(Array.isArray(this.ir_devices)){
		/* IR Devices from the config file */
		for(var i = 0; i < this.ir_devices.length; i++){
			results.push(new GC100Accessory('ir', this.ir_devices[i], this, this.ir_port));
		}
	}

	if(Array.isArray(this.rs232_devices)){
		/* RS232 Devices from the config file */
		for(var i = 0; i < this.rs232_devices.length; i++){
			results.push(new GC100Accessory('rs232', this.rs232_devices[i], this, this.rs232_devices[i].port));
		}
	}

	if(results.length == 0){
		this.log("WARNING: No Accessories were loaded.");
	}

	callback(results);
}

/* Global Cache Accessories
   IR
   RS232
   DC Trigger (not implemented yet)
*/
function GC100Accessory(type, dconfig, platform, port){
	this.name = dconfig.name;
	this.platform = platform;
	this.port = port;
	
	if(type == 'ir'){
		this.executeCommand = this.executeIRCommand;
	}else if(type == 'rs232'){
		this.executeCommand = this.executeRS232Command;
	}
	
	this.services = []; // will hold the services this acessory supports

	this.commands = dconfig.commands || {};
	this.success_messages = dconfig.success_messages || {}; // When a command is sent to the GC100, it will respond with something. If that something matches what's in the corresponding success_messages object, then the command was sucessful
	
	// If the commands & success_messages are base64 encoded, decode them
	if(dconfig.base64_encoded) this.base64Decode();

	// If both commands for on & off are defined in the device config, implement the switch service
	if(this.commands.on && this.commands.off){
		// Make accessories act like a switch that supports On/Off
		var switchService = new Service.Switch(this.name);
		
		// Wire the get & set
		switchService
			.getCharacteristic(Characteristic.On)
			.on('get', this.getState.bind(this));
		
		switchService
			.getCharacteristic(Characteristic.On)
			.on('get', this.getState.bind(this))
			.on('set', this.setState.bind(this))

		this.services.push(switchService);
	}

	if(this.services.length == 0){
		this.platform.log("WARNING: no services determined for accessory `"+this.name+"`. Make sure valid commands are defined in ~/homebridge/config.json");
	}
}

GC100Accessory.prototype.getServices = function() {
  return this.services;
}

GC100Accessory.prototype.setState = function(state, callback) {
	if(state){
		this.platform.log("Set `"+this.name+"` state to `on`");
		this.executeCommand(this.commands.on, this.success_messages.on, callback);
	}else{
		this.platform.log("Set `"+this.name+"` state to `off`");
		this.executeCommand(this.commands.off, this.success_messages.off, callback);
	}
}

/* Not really possible to determine state with IR devices
 Returning null, Unknown causes siri to respond that it couldn't contact the device
 Removing the getState all together causes siri to respond with whatever the last
 command was (which could be out of sync if someone controls the IR device with a
 real IR remote)
*/
GC100Accessory.prototype.getState = function(callback){
	// callback(null, "Unknown");
	this.platform.log("IR Device state is `Unknown`");
}

GC100Accessory.prototype.executeIRCommand = function(command, success_message, callback){
	sock = new net.Socket(); // A socket to communicate to the GC100 with
	sock.log = this.platform.log; // Make it possible to use the platform log from the net.Socket instance

	sock.connect(this.port, this.platform.host, function(){
		this.log('CONNECTED TO: ' + this.localAddress + ':' + this.localPort);
		// Send the IR command to the GC100
		this.write(command+"\r");
	}).on('data', function(data) {
		// log the response from the GC100
		this.log('DATA: ' + data);
		if(data.toString().trim() == success_message){
			this.log("IR Command Accepted");
			callback(null);// success
		}else{
			this.log("IR Command Failed: "+data);
			callback(new Error("Error setting state."));
		}
		// Close the connection
		this.destroy();
	});
}

/* RS232 Command Execution */
GC100Accessory.prototype.executeRS232Command = function(command, success_message, callback){
	sock = new net.Socket(); // A socket to communicate to the GC100 with
	sock.log = this.platform.log; // Make it possible to use the platform log from the net.Socket instance

	command = new Buffer(command,'binary');

	sock.connect(this.port, this.platform.host, function(){
		this.log('CONNECTED TO: ' + this.localAddress + ':' + this.localPort);
		this.write(command);
	}).on('data', function(data) {
		// log the response from the GC100
		this.log('DATA: ' + data);
		if(data.toString().trim() == success_message){
			this.log("RS232 Command Accepted");
			callback(null);// success
		}else{
			this.log("RS232 Command Failed: "+data);
			callback(new Error("Error setting state."));
		}
		// Close the connection
		this.destroy();
	});
}


/*
 This method is a workaround for:
 https://github.com/nfarina/homebridge/issues/441
 Any devices specified in config.json that have base64_encoded = true
 will be decoded with this method.

 Use base64_encoder.js to create encoded commands
*/
GC100Accessory.prototype.base64Decode = function(){
	var decoded = {};
	for(var i in this.commands){
		decoded[i] = new Buffer(this.commands[i], 'base64').toString('ascii');
	}
	this.commands = decoded;
	
	var decoded = {};
	for(var i in this.success_messages){
		decoded[i] = new Buffer(this.success_messages[i], 'base64').toString('ascii');
	}
	this.success_messages = decoded;
}
