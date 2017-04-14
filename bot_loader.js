const db = require('./db');
var channel = require('./channel');

module.exports.loadBots = function (webserver) {
    db.query('SELECT * FROM BOTS')
        .then((res) => {
            console.log('bots:', res.rows);
            res.rows.forEach(function (element) {
                channel.createSparkBot(webserver, element.public_address, element.id, element.token);
            }, this);
        })
        .catch((err) => {
            console.error('error running query', err);
        });
}