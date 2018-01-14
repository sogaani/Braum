const CONFIG_FILE = __dirname + '/config.json';
const config = require(CONFIG_FILE);

/* Modules */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const request = require('request');
const urlparser = require('url');
const ngrok = require('ngrok');
const fs = require('fs');

/* Server */
let app = express();

app.use(helmet());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use((req, res, next) => {
    if (req.body.voiceCommand) req.body.voiceCommand = req.body.voiceCommand.replace(/\s+/g, "");
    if (req.body.target) req.body.target = req.body.target.replace(/\s+/g, "");
    console.log("request: " + req.url);
    next();
});

fs.readdir('plugins', function (err, files) {
    if (err) throw err;

    files.forEach(file => {
        const plugin = require("./plugins/" + file);
        const googlehome = plugin.googlehome();
        app.post(googlehome[0], googlehome[1]);
        const webapi = plugin.webapi();
        app.post(webapi[0], webapi[1]);
        console.log("read plugin: " + file);
    });
    app.listen(config.port);
    console.log('Server running, go to http://localhost:' + config.port);
});



/* ngrok */
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