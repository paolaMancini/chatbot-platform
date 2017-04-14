var helpers = require('../helpers');
const db = require('../db');
var Client = require('node-rest-client').Client;

exports.SparkInteraction = function (controller) {
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
    controller.on('direct_mention', function (bot, message) {
        const query = helpers.responseQuery;
        db.query(query, [element.id, message.text])
            .then((res) => {
                var actionId = res.rows[0].actionid;
                var actionName = res.rows[0].actionname;
                var actionUrl = res.rows[0].actionurl;
                var fallback = res.rows[0].text;
                console.log('actionId: ', actionId);
                console.log('actionName: ', actionName);
                console.log('actionUrl: ', actionUrl);
                console.log('text: ', fallback);
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
                        }
                    });
                } else {
                    bot.reply(message, fallback);
                }
            })
            .catch((err) => {
                console.error('error running query', err);
            });
    });
    controller.on('direct_message', function (bot, message) {
        const query = helpers.responseQuery;
        db.query(query, [element.id, message.text])
            .then((res) => {
                console.log('actionId:', res.rows[0].actionId);
                console.log('text:', res.rows[0].text);
                bot.reply(message, res.rows[0].text);
            })
            .catch((err) => {
                console.error('error running query', err);
            });
        /* if (message.original_message.files) {
             bot.retrieveFileInfo(message.original_message.files[0], function (err, file) {
                 bot.reply(message, 'I also got an attached file called ' + file.filename);
             });
         }*/
    });
}
