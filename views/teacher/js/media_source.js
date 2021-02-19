'use strict';

//alert(a);
// // stop both mic and camera
// function stopBothVideoAndAudio(stream) {
//     stream.getTracks().forEach(function(track) {
//         if (track.readyState == 'live') {
//             track.stop();
//         }
//     });
// }
// // stop only camera
// function stopVideoOnly(stream) {
//     stream.getTracks().forEach(function(track) {
//         if (track.readyState == 'live' && track.kind === 'video') {
//             track.stop();
//         }
//     });
// }
// // stop only mic
// function stopAudioOnly(stream) {
//     stream.getTracks().forEach(function(track) {
//         if (track.readyState == 'live' && track.kind === 'audio') {
//             track.stop();
//         }
//     });
// }
//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream;                      //stream from getUserMedia()
var recorder;                       //MediaRecorder object
var chunks = [];                    //Array of chunks of audio data from the browser
var extension;
var supportEnabled=false;

console.log("Extensions:"+extension);

var videoCodec='video/webm;codec="vp8"';

console.log("Vide: "+MediaRecorder.isTypeSupported(videoCodec));

 console.log("recordButton clicked");
    // var audioConstraints = {audio: true};
    // var videoConstraints = {video: true};
    var allConstraints = {
        video: true,
        audio: true
    };

    //changed added 1
    var mediaSource = new MediaSource();
    var sourceBuffer;
    var video=document.getElementById("v");

    console.log("All stream found");
    // video.src = window.URL.createObjectURL(mediaSource);
    mediaSource.addEventListener('sourceopen', function (e) {
        console.log("sourceopen");
        // sourceBuffer = mediaSource.addSourceBuffer(videoCodec);
        sourceBuffer = mediaSource.addSourceBuffer(videoCodec);
        window.sourceBuffer = sourceBuffer;
    }, false);
    mediaSource.addEventListener('error', function (e) {
        console.log("error", e)
    }, false);
    //$events.appendChild(newItem("asf"));
    // video.srcObject=stream;
    video.src = URL.createObjectURL(mediaSource);
    
    

function playMedia(dat) {
    var video=document.getElementById("v");
    console.log("play media");
    window.sourceBuffer.appendBuffer(Base64.toUint8Array(dat));
    if(video.paused)
    {
        video.play();
    }
    
}