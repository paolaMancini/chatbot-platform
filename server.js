var Botkit = require('botkit');
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var url = require('url');
var crypto = require('crypto');
var uuid = require('uuid/v1');

const db = require('./db');
var channel = require('./channel');
var botLoader = require('./bot_loader');

var port = process.env.PORT || 3000;
var hostname = 'localhost';

var createWebserver = function (hostname, port, cb) {

    if (!port) {
        throw new Error('Cannot start webserver without a port');
    }

    var static_dir = __dirname + '/public';

    //if (controller.config && controller.config.webserver && controller.config.webserver.static_dir)
    //    static_dir = controller.config.webserver.static_dir;

    var webserver = express();
    webserver.use(bodyParser.json());
    webserver.use(bodyParser.urlencoded({ extended: true }));
    webserver.use(express.static(static_dir));

    var server = webserver.listen(
        port,
        hostname,
        function () {
            console.log('** Starting webserver on port ' +
                port);
            if (cb) { cb(null, webserver); }
        });

    return webserver;

};

var webserver = createWebserver(hostname, 3000, function () { console.log('Server started'); });

const apiPath = '/api/v1';

// Create a new Bot
webserver.post(apiPath + '/bots', function (req, res) {
    console.log(req.body);
    var id = uuid();
    db.query('INSERT INTO BOTS(id, name, description, public_address, token, model_id, language_code) VALUES($1, $2, $3, $4, $5, $6, $7)', [id, req.body.name, req.body.description, req.body.publicAddress, req.body.token, req.body.modelId, req.body.languageCode])
        .catch((err) => {
            console.error('error running query', err);
            res.statusCode(400);
            res.send();
        });
    res.statusCode = 201;
    res.send(id);
});

// Create a new Model
webserver.post(apiPath + '/models', function (req, res) {
    console.log(req.body);
    var id = uuid();
    // Insert model
    db.query('INSERT INTO MODELS(id, name, description) VALUES($1, $2, $3)', [id, req.body.name, req.body.description])
        .catch((err) => {
            console.error('error running query', err);
            res.statusCode(400);
            res.send();
        });
    res.statusCode = 201;
    res.send(id);
});

botLoader.loadBots(webserver);