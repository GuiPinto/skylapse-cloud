var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SnippetModel;
var SnippetSchema = new Schema({
	uid: { type: String, required: true },
	date: { type: String, required: true },
	hour: { type: Number, required: true },
	path: { type: String, required: true },
	created: { type: Date, default: Date },
	weather: {}
});

SnippetModel = mongoose.model('Snippet', SnippetSchema);
module.exports.schema = SnippetSchema;
module.exports.model = SnippetModel;
