const CONFIG_FILE = __dirname + '/config.json';
const config = require(CONFIG_FILE);
const request = require('request');
const urlparser = require('url');
const ngrok = require('ngrok');

function sendHostname(hostname) {
    const option = {
        url: config.url_store + hostname
    }
    request(option, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            console.log(`success update hostname ${hostname}`);
        } else {
            console.log("fail update hostname  ${hostname}");
        }
    });
}

function connect() {
    ngrok.connect({ addr: config.port, region: 'ap' }, (err, url) => {
        const hostname = urlparser.parse(url).hostname;
        sendHostname(hostname);
    });
}

ngrok.on('disconnect', () => { connect(); });
ngrok.on('error', () => { connect(); });

connect();