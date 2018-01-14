const wol = require('wake_on_lan');
const config = require('../config.json').pc;
const child_process = require('child_process');

exports.googlehome = function () {
    return ['/command', function (req, res, next) {
        const command = request.body ? request.body.voiceCommand : null;
        const target = request.body ? request.body.target : null;
        if (target == 'PC' || target == 'パソコン') {
            switch (command) {
                case '消して':
                case '落として':
                case 'シャットダウン':
                case '切って':
                    shutdownPC();
                    break;
                case 'つけて':
                case '起動して':
                case '起動':
                    bootPC();
                    break;
                case '再起動して':
                case '再起動':
                case 'リブート':
                    rebootPC();
                    break;
                default:
                    return res.sendStatus(400);
            }
            return res.sendStatus(200);
        }
        next();
    }];
}

exports.webapi = function () {
    return ['/pc/:command', function (req, res) {
        switch (req.params.name) {
            case 'boot':
                bootPC();
                break;
            case 'shutdown':
                shutdownPC();
                break;
            case 'reboot':
                rebootPC();
                break;
            default:
                return res.sendStatus(501);
        }
        res.sendStatus(200);
    }];
}

function bootPC() {
    wol.wake(config.mac);
}

function winexe(command, callback) {
    const args = ['-U', `${config.user}%${config.password}`, config.address, command];
    const proc = child_process.spawn('winexe', args, { stdio: ['ignore', process.stdout, process.stderr] });
    proc.on('close', code => {
        if (callback) {
            if (code !== 0) {
                callback(false);
            } else {
                callback(true);
            }
        }
    });
}

function shutdownPC() {
    winexe('shutdown -s -t 0');
}

function rebootPC() {
    winexe('shutdown -r');
}