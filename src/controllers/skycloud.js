var exec = require('child_process').exec,
	fs = require('fs'),
	async = require('async'),
	Video = require('../models/video').model;

var videoTranscodingQueue = async.queue(transcodeVideo, 1);


module.exports.index = function(req, res) {





}


module.exports.upload = function(req, res) {

	if (!req.body || !req.files ||
		!req.files.video ||
		!req.body.date || !req.body.hour || !req.body.uid
	) {
		return res.send({error: 'Malformed Request'});
	}

	// Remove our request timeout
	res.connection.setTimeout(0);

	var date = req.body.date,
		hour = req.body.hour,
		uid	 = req.body.uid,
		video = req.files.video,
		videoPath = video.path;

	var videoData = {
		date: date,
		hour: hour,
		uid: uid,
		video: video
	};

	console.log("Skycloud Upload from UID:", uid);
	console.log("videoData:", videoData);

	// Create our video object
	var video = new Video({
		uid: uid,
		date: date,
		hour: hour,
		status: 'queue'
	});

	// Save bideo obj to db
	video.save(function(err, savedVideo) {
		console.log('video.id => ', video.id);

		// Add Video Data to Video Processing Queue
		videoTranscodingQueue.push(videoData, function (transcodeResults) {
			// after transcoding..

		    deleteSourceVideo(transcodeResults.source, function() {

				return res.send({
					videoData: videoData,
					transcodeResults: transcodeResults,
					savedVideo: savedVideo
				});

		    });

		});

	});



}


function transcodeVideo(videoData, callback) {

	var sourcePath = videoData.video.path;

	var outputPathWithoutExt = 'workspace/' +
		videoData.uid + '_' + videoData.date + '_' + videoData.hour;

	/**** MP4 Transcoding ****/
    var ffmpegArgs = [
    	'/opt/ffmpeg/bin/ffmpeg', //TODO: Make Configurable
    	'-y',
    	'-i "' + sourcePath + '"',
    	'-vcodec libx264',
    	'-movflags faststart',
    	'-an',
    	'"' + outputPathWithoutExt + '.mp4"'
    ];
    var ffmpegExec = ffmpegArgs.join(' ');
    console.log('> Executing FFmpeg Child Process:', ffmpegExec);
    var ffmpegChild = exec(ffmpegExec, function(err, stdout, stderr) {
    	if (err) throw err;


		/**** OGG Transcoding ****/
	   var ffmpeg2theoraArgs = [
	   		'/usr/bin/ffmpeg2theora', // TODO: Make Configurable
	   		'--noaudio',
	   		'-o "' + outputPathWithoutExt + '.ogg"',
	   		'"' + outputPathWithoutExt + '.mp4"'
	    ];
	    var ffmpeg2theoraExec = ffmpeg2theoraArgs.join(' ');
	    console.log('> Executing FFmpeg2theora Child Process:', ffmpeg2theoraExec);
	    var ffmpeg2theoraChild = exec(ffmpeg2theoraExec, function(err, stdout, stderr) {
	    	if (err) throw err;

			return callback({
				'source': sourcePath,
				'mp4': outputPathWithoutExt + '.mp4',
				'ogg': outputPathWithoutExt + '.ogg'
			});

 	   	});

    });
}

function deleteSourceVideo(videoPath, callback) {
	console.log('> Deleting source video:', videoPath);
	return fs.unlink(videoPath, callback);
}
