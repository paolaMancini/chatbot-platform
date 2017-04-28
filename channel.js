var Botkit = require('botkit');
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var url = require('url');
var crypto = require('crypto');
var helpers = require('./helpers');
const db = require('./db');
var Client = require('node-rest-client').Client;

var sessions = new Map();

module.exports = {

    createSparkBot: function createSparkBot(webserver, publicAddress, id, botToken) {

        var controller = Botkit.sparkbot({
            debug: false,
            log: false,
            public_address: publicAddress,
            ciscospark_access_token: botToken,
            studio_token: process.env.studio_token, // get one from studio.botkit.ai to enable content management, stats, message console and more
            secret: process.env.secret, // this is an RECOMMENDED but optional setting that enables validation of incoming webhooks
            webhook_name: 'Cisco Spark bot created with Botkit, override me before going to production'
            //    limit_to_domain: ['mycompany.com'],
            //    limit_to_org: 'my_cisco_org_id',
        });

        var bot = controller.spawn({});

        //controller.webserver = webserver;
        //controller.config.hostname = publicAddress;
        //controller.config.port = port;

        var webhook_name = controller.config.webhook_name || 'Botkit Firehose';

        controller.log(
            '** Serving webhook endpoints for Cisco Spark Platform at: ' +
            'http://' + controller.config.hostname + ':' + controller.config.port + '/' + id + '/ciscospark/receive');
        webserver.post('/' + id + '/ciscospark/receive', function (req, res) {
            controller.handleWebhookPayload(req, res, bot);

        });


        var list = controller.api.webhooks.list().then(function (list) {
            var hook_id = null;

            for (var i = 0; i < list.items.length; i++) {
                if (list.items[i].name == webhook_name) {
                    hook_id = list.items[i].id;
                }
            }

            var hook_url = 'https://' + controller.config.public_address + '/' + id + '/ciscospark/receive';

            console.log('Cisco Spark: incoming webhook url is ', hook_url);

            if (hook_id) {
                controller.api.webhooks.update({
                    id: hook_id,
                    resource: 'all',
                    targetUrl: hook_url,
                    event: 'all',
                    secret: controller.config.secret,
                    name: webhook_name,
                }).then(function (res) {
                    console.log('Cisco Spark: SUCCESSFULLY UPDATED CISCO SPARK WEBHOOKS');
                    //if (cb) cb();
                }).catch(function (err) {
                    console.log('FAILED TO REGISTER WEBHOOK', err);
                    throw new Error(err);
                });

            } else {
                controller.api.webhooks.create({
                    resource: 'all',
                    targetUrl: hook_url,
                    event: 'all',
                    secret: controller.config.secret,
                    name: webhook_name,
                }).then(function (res) {

                    console.log('Cisco Spark: SUCCESSFULLY REGISTERED CISCO SPARK WEBHOOKS');
                    if (cb) cb();
                }).catch(function (err) {
                    console.log('FAILED TO REGISTER WEBHOOK', err);
                    throw new Error(err);
                });

            }
        });

        controller.middleware.receive.use(function (bot, message, next) {

            console.log(message);
            next();
        });

        controller.hears(['^markdown'], 'direct_message,direct_mention', function (bot, message) {
            bot.reply(message, { text: '*this is cool*', markdown: '*this is super cool*' });
        });
        controller.on('user_space_join', function (bot, message) {
            bot.reply(message, 'Welcome, ' + message.original_message.data.personDisplayName);
        });
        controller.on('user_space_leave', function (bot, message) {
            bot.reply(message, 'Bye, ' + message.original_message.data.personDisplayName);
        });
        controller.on('bot_space_join', function (bot, message) {
            bot.reply(message, 'This trusty bot is here to help.');
        });
        controller.on('direct_mention,direct_message', function (bot, message) {
            function doAction() {
                var actionReady = true;
                for (var i = 0; i < sessions.get(personId).params.length; i++) {
                    var param = sessions.get(personId).params[i];
                    if (param.provided == false) {
                        bot.reply(message, param.paramMissingMsg);
                        actionReady = false; // Action can not be called because a parameter is missing
                        break;
                    }
                }
                if (actionReady === true) {
                    var actionId = sessions.get(personId).actionId;
                    var actionName = sessions.get(personId).actionName;
                    var actionUrl = sessions.get(personId).actionUrl;
                    var fallback = sessions.get(personId).fallback ? sessions.get(personId).fallback : "";
                    if (actionName && actionUrl) {
                        var client = new Client();
                        // set content-type header and data as json in args parameter 
                        var args = {
                            data: { action: actionName },
                            headers: { "Content-Type": "application/json" },
                            requestConfig: {
                                timeout: 30000 //request timeout in milliseconds 
                            },
                            responseConfig: {
                                timeout: 30000 //response timeout 
                            }
                        };

                        client.post(actionUrl, args, function (data, response) {
                            try {
                                // parsed response body as js object 
                                console.log(data);
                                // raw response 
                                //console.log(response);
                                bot.reply(message, data.text);
                            } catch (err) {
                                console.log(err);
                                bot.reply(message, fallback);
                            } finally {
                                 sessions.delete(personId);
                            }
                        });
                    } else {
                        bot.reply(message, fallback);
                    }
                }
            }
            var personId = message.original_message.personId;
            if (sessions.has(personId)) {
                for (var i = 0; i < sessions.get(personId).params.length; i++) {
                    var param = sessions.get(personId).params[i];
                    if (param.provided == false) {
                        param.value = message.text;
                        param.provided = true;
                        break;
                    }
                }
                doAction();
            } else {
                const query = helpers.responseQuery;
                db.query(query, [id, message.text])
                    .then((res) => {
                        var actionId = res.rows[0].actionid;
                        var actionName = res.rows[0].actionname;
                        var actionUrl = res.rows[0].actionurl;
                        var fallback = res.rows[0].text;

                        console.log('actionId: ', actionId);
                        console.log('actionName: ', actionName);
                        console.log('actionUrl: ', actionUrl);
                        console.log('text: ', fallback);

                        console.log('original_message.data', message);
                        // Create a new session if it does not exist
                        var context = new Object();
                        context.actionId = actionId;
                        context.actionName = actionName;
                        context.actionUrl = actionUrl;
                        context.fallback = fallback;
                        context.params = [];
                        for (var i = 0; i < res.rows.length; i++) {
                            if (res.rows[i].paramid) {
                                var param = { id: res.rows[i].paramid, paramMissingMsg: res.rows[i].parammissingmsg, provided: false };
                                context.params.push(param);
                            }
                        }
                        sessions.set(personId, context);
                        doAction();
                    }).catch((err) => {
                        console.error('error running query', err);
                    });
            }
        });
        return controller;
    }

};