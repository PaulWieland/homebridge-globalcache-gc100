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
		this.log("WARNING: No GC100 Acessories were loaded.");
	}

	callback(results);
}

// GC100Platform.prototype.executeIRCommand = function(command,callback){
// 	var client = new net.Socket();
// 	client.platform = this;
// 
// 	client.connect(this.ir_port, this.host, function(){
// 		this.platform.log('CONNECTED TO: ' + this.platform.host + ':' + this.platform.ir_port);
// 			// Send the IR command to the GC100
// 			client.write(command+"\r");
// 	}).on('data', function(data) {
// 		// log the response from the GC100
// 		this.platform.log('DATA: ' + data);
// 		if(data.toString() == 'completeir'){
// 			this.platform.log("GC100 IR Command Accepted");
// 			callback(null);// success
// 		}else{
// 			this.platform.log("GC100 IR Command Failed: "+data);
// 			callback(new Error("Error setting state."));
// 		}
// 		// Close the connection
// 		client.destroy();
// 	});
// }
// 
// GC100Platform.prototype.executeRS232Command = function(port, command, success_message, callback){
// 	var client = new net.Socket();
// 	client.platform = this;
// 
// 	/* With my setup GC100->Panasonic Plasma TV I have to send the command in binary. 
// 	Unfortunatly I don't have another RS232 device handy to test */
// 	command = new Buffer(command, 'binary');
// 
// 	client.connect(port,this.host, function() {
// 		this.platform.log('CONNECTED TO: ' + this.platform.host + ':' + this.platform.ir_port);
// 	  // Replace `PON_MSG` with `POF_MSG` to do POF instead
// 	  client.write(command);
// 	}).on('data', function(data) {
// 		// log the response from the GC100
// 		this.platform.log('DATA: ' + data);
// 
// 		if(data.toString() == success_message){
// 			this.platform.log("GC100 RS232 Command Accepted");
// 			callback(null);// success
// 		}else{
// 			this.platform.log("GC100 RS232 Command Failed: "+data);
// 			callback(new Error("Error setting state."));
// 		}
// 		// Close the connection
// 		client.destroy();
// 	});
// }

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

	this.commands = dconfig.commands;
	this.success_messages = dconfig.success_messages; // When a command is sent to the GC100, it will respond with something. If that something matches what's in the corresponding success_messages object, then the command was sucessful

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
	callback(null, "Unknown");
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
			this.log("GC100 IR Command Accepted");
			callback(null);// success
		}else{
			this.log("GC100 IR Command Failed: "+data+(data.toString().trim() == success_message));
			callback(new Error("Error setting state."));
		}
		// Close the connection
		this.destroy();
	});
}

/* RS232 Command Execution */
GC100Accessory.prototype.executeRS232Command = function(command, success_message, callback){
	// this.platform.log(command +'::'+ success_message +'::'+ callback);
	// callback();
	// return;
	sock = new net.Socket(); // A socket to communicate to the GC100 with
	sock.log = this.platform.log; // Make it possible to use the platform log from the net.Socket instance

	// This replace nonesense is needed because of
	// https://github.com/nfarina/homebridge/issues/441
	success_message = success_message.replace("::x02","\x02").replace("::x03","\x03");
	command = command.replace("::x02","\x02").replace("::x03","\x03");
	command = new Buffer(command,'binary');

	sock.connect(this.port, this.platform.host, function(){
		this.log('CONNECTED TO: ' + this.localAddress + ':' + this.localPort);
		this.write(command);
	}).on('data', function(data) {
		// log the response from the GC100
		this.log('DATA: ' + data);
		if(data.toString().trim() == success_message){
			this.log("GC100 RS232 Command Accepted");
			callback(null);// success
		}else{
			this.log("GC100 RS232 Command Failed: "+data+(data.toString().trim() == success_message));
			console.log(command == data.toString());
			// console.log()
			// callback(new Error("Error setting state."));
		}
		// Close the connection
		this.destroy();
	});
}


// var net = require('net');
// var PON_MSG = new Buffer('\x02PON\x03', 'binary');
// var POF_MSG = new Buffer('\x02POF\x03', 'binary');
// 
// var client = new net.Socket();
// client.connect('4999','10.0.1.155', function() {
//   console.log('CONNECTED');
//   // Replace `PON_MSG` with `POF_MSG` to do POF instead
//   client.write(PON_MSG);
// }).on('data', function(data) {
//   console.log('DATA: %j', data);
// 	// Close the connection
// 	client.destroy();
// });


