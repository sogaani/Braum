/* discover broadlink */
const BroadlinkJS = require('broadlinkjs-rm');
const broadlink = new BroadlinkJS();
const config = require('../broadlink.json');

const discoveredDevices = {};

const limit = 5;

let discovering = false;

const discoverDevices = (count = 0) => {
    discovering = true;

    if (count >= 5) {
        discovering = false;

        return;
    }

    broadlink.discover(config.lport1, config.lport1, config.destaddr);
    count++;

    setTimeout(() => {
        discoverDevices(count);
    }, 5 * 1000)
}

discoverDevices();

broadlink.on('deviceReady', (device) => {
    const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || []
    const macAddress = macAddressParts.join(':')
    device.host.macAddress = macAddress

    if (discoveredDevices[device.host.address] || discoveredDevices[device.host.macAddress]) return;

    console.log(`Discovered Broadlink RM device at ${device.host.address} (${device.host.macAddress})`)

    discoveredDevices[device.host.address] = device;
    discoveredDevices[device.host.macAddress] = device;
})

function getDevice({ host, log, learnOnly }) {
    let device;

    if (host) {
        device = discoveredDevices[host];
    } else { // use the first one of no host is provided
        const hosts = Object.keys(discoveredDevices);
        if (hosts.length === 0) {
            log(`Send data (no devices found)`);
            if (!discovering) {
                log(`Attempting to discover RM devices for 5s`);

                discoverDevices()
            }

            return
        }

        // Only return device that can Learn Code codes
        if (learnOnly) {
            for (let i = 0; i < hosts.length; i++) {
                let currentDevice = discoveredDevices[hosts[i]];

                if (currentDevice.enterLearning) {
                    device = currentDevice

                    break;
                }
            }

            if (!device) log(`Learn Code (no device found at ${host})`)
            if (!device && !discovering) {
                log(`Attempting to discover RM devices for 5s`);

                discoverDevices()
            }
        } else {
            device = discoveredDevices[hosts[0]];

            if (!device) log(`Send data (no device found at ${host})`);
            if (!device && !discovering) {
                log(`Attempting to discover RM devices for 5s`);

                discoverDevices()
            }
        }
    }

    return device;
}

/* express plug */
function execCommand(command, req, res) {
    if (command && req.body.secret == config.secret) {
        let host = command.mac || command.ip;
        let device = getDevice({ host });

        if (!device) {
            console.log(`sendData(no device found at ${host})`);
        } else if (!device.sendData) {
            console.log(`[ERROR] The device at ${device.host.address} (${device.host.macAddress}) doesn't support the sending of IR or RF codes.`);
        } else if (command.data && command.data.includes('5aa5aa555')) {
            console.log('[ERROR] This type of hex code (5aa5aa555...) is no longer valid. Use the included "Learn Code" accessory to find new (decrypted) codes.');
        } else {
            if ('sequence' in command) {
                console.log('Sending sequence..');
                for (var i in command.sequence) {
                    let find = command.sequence[i];
                    let send = config.commands.find((e) => { return e.command == find; });
                    if (send) {
                        setTimeout(() => {
                            console.log(`Sending command ${send.command}`)
                            sendData(device, send.data);
                        }, 1000 * i);
                    } else {
                        console.log(`Sequence command ${find} not found`);
                    }
                }
            } else {
                sendData(device, command.data);
            }

            return res.sendStatus(200);
        }

        res.sendStatus(501);
    } else {
        console.log(`Command not found`);
        res.sendStatus(400);
    }
}

exports.googlehome = function () {
    return ['/command', function (req, res) {
        const target = req.body ? req.body.target : null;
        const voiceCommand = req.body ? req.body.voiceCommand : null;
        console.log(req.body);
        const command = config.commands.find((e) => { return e.targets && (e.targets.indexOf(target) >= 0) && e.voiceCommands && (e.voiceCommands.indexOf(voiceCommand) >= 0); });
        console.log(config.commands[8]);
        console.log(config.commands[8].targets.indexOf(target) );
        console.log(config.commands[8].voiceCommands.indexOf(voiceCommand) );

        execCommand(command, req, res);
    }];
}

exports.webapi = function () {
    return ['/command/:name', function (req, res) {
        const command = config.commands.find((e) => { return e.command == req.params.name; });

        execCommand(command, req, res);
    }];
}