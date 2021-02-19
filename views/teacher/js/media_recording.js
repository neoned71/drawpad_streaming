
'use strict';
URL = window.URL || window.webkitURL;
var started=false;

var gumStream;                      //stream from getUserMedia()
var recorder;                       //MediaRecorder object
var chunks = [];                    //Array of chunks of audio data from the browser
var extension;
var supportEnabled=false;
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");

//add events to those 2 buttons
// recordButton.addEventListener("click", startRecording);
// stopButton.addEventListener("click", stopRecording);
// pauseButton.addEventListener("click", pauseRecording);


function startRecording() {

if(started)
{
    return;
}


var videoCodec='video/webm; codecs="vp8 , opus"';
console.log("Vide: "+MediaRecorder.isTypeSupported(videoCodec));
console.log("recordButton clicked");
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
        console.log(mediaSource);
        sourceBuffer = mediaSource.addSourceBuffer(videoCodec);
        window.sourceBuffer = sourceBuffer;
    }, false);
    mediaSource.addEventListener('error', function (e) {
        console.log("error", e)
    }, false);
    //$events.appendChild(newItem("asf"));
    // video.srcObject=stream;
    video.src = URL.createObjectURL(mediaSource);
    video.play();

   
    console.log("recordButton clicked");
    // var audioConstraints = {audio: true};
    //console.log(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia(allConstraints).then(function(stream) {
        console.log("getUserMedia() success, stream created, initializing MediaRecorder");
        gumStream = stream;

        var options = {
         bitsPerSecond:250000,
          mimeType : videoCodec
        }

        recorder = new MediaRecorder(stream,options);
        recorder.ondataavailable = function(e){
        	e.data.arrayBuffer().then(dat=>{
                dat=new Uint8Array(dat);
                console.log(btoa(dat));
                socket.emit("video",{action:"feed",data:Base64.fromUint8Array(dat,true),time:new Date()});
                console.log();
                sourceBuffer.appendBuffer(dat);
            });
        };
        recorder.start(1100);
        started=true;
    }).catch(function(err) {

        console.log(err);
        console.log("going for just audio")
        attemptAudioStreaming();

    });

}


function attemptAudioStreaming() {
    console.log("recordButton clicked");
    var audioConstraints = {audio: true};
    

    // recordButton.disabled = true;
    // stopButton.disabled = false;
    // pauseButton.disabled = false;

    console.log(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia(audioConstraints).then(function(stream) {
        if(stream!==null){
            console.log("audio stream found");
        }
        else
        {
            console.log("audio stream null");
        }
        
        // console.log("getUserMedia() success, stream created, initializing MediaRecorder");
        gumStream = stream;

        var options = {
          
          mimeType : "audio/webm;codecs=opus"
        }

        recorder = new MediaRecorder(stream, options);

        
        

        //when data becomes available add it to our attay of audio data
        recorder.ondataavailable = function(e){
            console.log("recorder.ondataavailable:" + e.data);
            
            console.log ("recorder.audioBitsPerSecond:"+recorder.audioBitsPerSecond)
            console.log ("recorder.videoBitsPerSecond:"+recorder.videoBitsPerSecond)
            console.log ("recorder.bitsPerSecond:"+recorder.bitsPerSecond)
            // add stream data to chunks
            console.log(e.data.arrayBuffer());
            var reader = new FileReader(); 
                reader.readAsDataURL(e.data); 
                reader.onloadend = function () { 
                var base64String = reader.result; 
                console.log('Base64 String - ', base64String);
                // var t=document.getElementById("data");
                // t.innerHTML=base64String;
            }

            chunks.push(e.data);
            // if recorder is 'inactive' then recording has finished
            if (recorder.state == 'inactive') {
              // convert stream data chunks to a 'webm' audio format as a blob
              const blob = new Blob(chunks, { type: 'audio/'+extension, bitsPerSecond:128000});
              // createDownloadLink(blob)
            }
        };

        recorder.onerror = function(e){
            console.log(e.error);
        }
        recorder.start(200);
    }).catch(function(err) {
        //enable the record button if getUserMedia() fails
        // recordButton.disabled = false;
        console.log("stream not found");
        //stopButton.disabled = true;
        //pauseButton.disabled = true
    });
}

function pauseRecording(){
    console.log("pauseButton clicked recorder.state=",recorder.state );
    if (recorder.state=="recording"){
        //pause
        recorder.pause();
        pauseButton.innerHTML="Resume";
    }else if (recorder.state=="paused"){
        //resume
        recorder.resume();
        pauseButton.innerHTML="Pause";

    }
}

function stopRecording() {
    console.log("stopButton clicked");

    // stopButton.disabled = true;
    // recordButton.disabled = false;
    // pauseButton.disabled = true;

    // pauseButton.innerHTML="Pause";
    recorder.stop();
    gumStream.getAudioTracks()[0].stop();
}


function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

