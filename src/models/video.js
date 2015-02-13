var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var VideoModel;
var VideoSchema = new Schema({
	uid: { type: String, required: true },
	date: { type: String, required: true },
	hour: { type: Number, required: true },
	path: { type: String, default: null },
	status: { type: String },
	created: { type: Date, default: Date },
	weather: {}
});

VideoModel = mongoose.model('Video', VideoSchema);
module.exports.schema = VideoSchema;
module.exports.model = VideoModel;
