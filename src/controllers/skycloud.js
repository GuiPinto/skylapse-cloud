var exec = require('child_process').exec,
	fs = require('fs'),
	async = require('async'),
	path = require('path'),
	aws = require('aws-sdk'),
	Video = require('../models/video').model;

var videoTranscodingQueue = async.queue(transcodeVideo, 1);

// Config AWS
aws.config.update({ 
	accessKeyId: process.env.accessKeyId || '', 
	secretAccessKey: process.env.secretAccessKey || ''
});
aws.config.update({region: 'us-east-1'});

module.exports.index = function(req, res) {
	return res.send({"hi":"there"});
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
		inputVideo = req.files.video;

	console.log("Skycloud Upload from UID:", uid);


	/** Action! **/
	async.waterfall([

		// Step 1. Create our video object
	    function(cb) {

			var video = new Video({
				uid: uid,
				date: date,
				hour: hour,
				status: 'queue'
			});
			video.save(function(err, savedVideo) {
				console.log('savedVideo => ', savedVideo);
				cb(null, savedVideo);
			});

	    },
	    

		// Step 2. Add Video to Processing Queue + Proccess Video
	    function(video, cb) {

	    	console.log('video => ', video);
	    	console.log('typeof video => ', typeof video);

	    	console.log('cb => ', cb);
	    	console.log('typeof cb => ', typeof cb);

			var videoQueueToken = {
				date: date,
				hour: hour,
				uid: uid,
				video: inputVideo,
				cbd: cb
			};
			videoTranscodingQueue.push(videoQueueToken, function (transcodeResults) { // after transcoding..

				// Update video status in db
				video.set('status', 'rendered');
				video.save();

				console.log('cb => ', cb);
				console.log('typeof cb => ', typeof cb);
				console.log('transcodeResults.cbd => ', transcodeResults.cbd);
				console.log('typeof transcodeResults.cbd => ', typeof transcodeResults.cbd);

				return cb(null, video, transcodeResults);

			});

		},


		// Step 3. Ship rendered videos to Amazon S3
	    function(video, transcodeResults, cb) {

	    	// First, lets upload our mp4 version.
	    	var mp4LocalPath = transcodeResults.mp4;
	    	var mp4RemotePath = ['videos', '/', uid, '/', savedVideo.id, '.mp4'].join('');	    	
			shipFileToS3(mp4LocalPath, mp4RemotePath, function() {

				// After, lets upload our ogg version.
		    	var oggLocalPath = transcodeResults.ogg;
		    	var oggRemotePath = ['videos', '/', uid, '/', savedVideo.id, '.ogg'].join('');
		    	shipFileToS3(oggLocalPath, oggRemotePath, function() {

					// Update video status in db
					video.set('status', 'ready');
					video.save();

		    		cb(null, video, transcodeResults);

				});
			});
	   	},


		// Step 4. Delete local copies of the video (source and renders)
	    function(video, transcodeResults, cb) {

			async.series([
				// First, our source video
				function(cb){
					deleteVideo(transcodeResults.source, function() {
						cb(null);
					});
				},
				// Then, our MP4 render
				function(cb){
					deleteVideo(transcodeResults.mp4, function() {
						cb(null);
					});
				},
				// Followed by our OGG render
				function(cb){
					deleteVideo(transcodeResults.ogg, function() {
						cb(null);
					});
				}
			],
			function(err, results){
				cb(err, video, transcodeResults);	
			});
	    	
	   	}

	], function (err, video, transcodeResults) {
	    if (err) return res.send(err, 500);

		return res.send({
			err: err,
			video: video,
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

function deleteVideo(videoPath, callback) {
	console.log('> Deleting source video:', videoPath);
	return fs.unlink(videoPath, callback);
}

function shipFileToS3(localPath, remotePath, callback) {
	var fileName = path.basename(localPath);

	var s3 = new aws.S3();

	if (fs.lstatSync(localPath).isFile()) {

		fs.readFile(localPath, function (err, data) {
			if (err) throw err;

			var s3Bucket = "skylapse";
			var s3Key = remotePath;

			s3.putObject({
				Bucket: s3Bucket,
				Key: s3Key,
				Body: data,
				ACL:'public-read'
			}, function(err, data) {
				if (err) {
					console.log(" > Error uploading data: ", err);
				} else {
					console.log(" > Successfully Uploaded to S3!");
					console.log(" > s3Key => ", s3Key);
				}
				callback();
			});

		});

	} else {
		console.log(" > Failed. Is not file!");
	}

}