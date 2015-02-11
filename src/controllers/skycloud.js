var exec = require('child_process').exec,
	fs = require('fs'),
	async = require('async'),
	Snippet = require('../models/snippet').model;

var videoQueue = async.queue(transcodeVideo, 1);


module.exports.index = function(req, res) {




	var snippet = new Snippet({
		uid: '00000000a5bf8fe5',
		date: '2015-02-05',
		hour: 22,
		path: "workspace/00000000a5bf8fe5_2015-02-05_22.mp4"
	});

	snippet.save(function(err, snipp) {

		return res.send({
			err: err,
			snipp:snipp
		});
//	return res.send("Hi There");
	});

}


module.exports.upload = function(req, res) {

	if (!req.body || !req.files ||
		!req.files.video ||
		!req.body.date || !req.body.hour || !req.body.uid
	) {
		return res.send({error: 'Malformed Request'});
	}

	// Remove our timeout
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

	videoQueue.push(videoData, function (transcodeResults) {
	    // Returning from queue-processing

	    deleteSourceVideo(transcodeResults.source);

		return res.send({
			videoData: videoData,
			transcodeResults: transcodeResults
		});

	});

}


function transcodeVideo(videoData, callback) {

	var sourcePath = videoData.video.path;

	var outputPathWithoutExt = 'workspace/' +
		videoData.uid + '_' + videoData.date + '_' + videoData.hour;

	/**** MP4 Transcoding ****/
    var ffmpegArgs = [
    	'-y',
    	'-i "' + sourcePath + '"',
    	'-vcodec libx264',
    	'-movflags faststart',
    	'-an',
    	'"' + outputPathWithoutExt + '.mp4"'
    ];
    var ffmpegExec = "/opt/ffmpeg/bin/ffmpeg " + ffmpegArgs.join(' ');
    console.log('> Executing FFmpeg Child Process:', ffmpegExec);
    var ffmpegChild = exec(ffmpegExec, function(err, stdout, stderr) {
    	if (err) throw err;


		/**** OGG Transcoding ****/
	   var ffmpeg2theoraArgs = [
	   		'--noaudio',
	   		'-o "' + outputPathWithoutExt + '.ogg"',
	   		'"' + outputPathWithoutExt + '.mp4"'
	    ];
	    var ffmpeg2theoraExec = "/usr/bin/ffmpeg2theora " + ffmpeg2theoraArgs.join(' ');
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

function deleteSourceVideo(videoPath) {
	console.log('> Deleting source video:', videoPath);
	return fs.unlinkSync(videoPath);
}
