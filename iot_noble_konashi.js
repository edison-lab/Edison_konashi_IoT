var noble = require('noble');
var net = require('net');

var HOST = 'localhost';
var PORT = 7070;
var cmptName = ' Illuminance';
var sendLoop;

var client = new net.Socket();

client.connect(PORT, HOST, function() {
	console.log('connected iotkit_agent: ' + HOST + ':' + PORT);
});

function sendObs(name, value, on){
	var msg = JSON.stringify({
		n: name,
		v: value,
		on: on
	});
	var sentMsg = msg.length + "#" + msg;
	console.log("Sending observation: " + sentMsg);
	client.write(sentMsg);
}

noble.on('stateChange', function(state) {
	if (state === 'poweredOn') noble.startScanning();
	else noble.stopScanning();
});

noble.on('scanStart', function() {
	console.log('on -> scanStart');
});

noble.on('scanStop', function() {
	console.log('on -> scanStop');
});

noble.on('discover', function(peripheral) {
	noble.stopScanning();
	console.log('peripheral with UUID ' + peripheral.uuid + ' found');
	var advertisement = peripheral.advertisement;
	var localName = advertisement.localName;
	if (localName) console.log('Local Name = ' + localName);

	peripheral.on('disconnect', function() {
		console.log('on -> disconnect');
		clearInterval(sendLoop);
		noble.startScanning();
	});

	peripheral.connect(function(error){
		if(error) console.log('connect error: ' + error);
		console.log('connected to ' + peripheral.uuid);

		peripheral.discoverServices(['229bff0003fb40da98a7b0def65c2d4b'], function (error, services){
			if(error) console.log('discoverServices error: ' + error);
			console.log('services.length: ' + services.length);

			var konashiService = services[0];
			konashiService.discoverCharacteristics(['229b300003fb40da98a7b0def65c2d4b',
				'229b300803fb40da98a7b0def65c2d4b'],
				function(error, characteristics){
					if(error) console.log('discoverCharacteristics error: ' + error);
					console.log('characteristics.length: ' + characteristics.length);
					characteristics[0].write(new Buffer([1]), true);

					sendLoop = setInterval(function(){
						var date = new Date();
						characteristics[1].read(function(error, data) {
							if (data) {
								var sensor_value = (data[1] + data[0]*256);
								sendObs(cmptName, sensor_value, date.getTime());
							}
						});
					}, 1000);
				});
		});
	});
});