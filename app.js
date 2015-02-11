/*globals process, __dirname */

var express = require('express');
var mongoose = require('mongoose');
var multer  = require('multer');
var enrouten = require('express-enrouten');

var app = express();
var port = process.env.PORT || 5000;

// Connect to mongodb
var connect = function () {
	var options = {
		server: {
			socketOptions: { keepAlive: 1 }
		},
		database : 'skylapse-cloud'
	};
	mongoose.connect(process.env.MONGO || 'mongodb://localhost/skylapse-cloud', options);
};
connect();
mongoose.connection.on('error', console.log);
mongoose.connection.on('disconnected', connect);

// Setup App
app.use(multer({ dest: './workspace/'}))
app.use(express.static(__dirname + '/static'));
app.use(enrouten({ directory: 'src/routes' }));

// 404
app.use(function (req, res, next) {
    res.status(404).send('404 error');
});

// Go Go Go!
app.listen(port);
console.log('listening on port', port);
