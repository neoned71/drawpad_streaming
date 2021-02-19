'use strict';

//alert(a);
// stop both mic and camera
function stopBothVideoAndAudio(stream) {
    stream.getTracks().forEach(function(track) {
        if (track.readyState == 'live') {
            track.stop();
        }
    });
}
// stop only camera
function stopVideoOnly(stream) {
    stream.getTracks().forEach(function(track) {
        if (track.readyState == 'live' && track.kind === 'video') {
            track.stop();
        }
    });
}
// stop only mic
function stopAudioOnly(stream) {
    stream.getTracks().forEach(function(track) {
        if (track.readyState == 'live' && track.kind === 'audio') {
            track.stop();
        }
    });
}
//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream;                      //stream from getUserMedia()
var recorder;                       //MediaRecorder object
var chunks = [];                    //Array of chunks of audio data from the browser
var extension;
var supportEnabled=false;
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");

//add events to those 2 buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);


// console.log("audio/webm:"+MediaRecorder.isTypeSupported('audio/webm;codecs=opus'));


// if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') && MediaRecorder.isTypeSupported('video/webm;codecs="vp8"'))
// {
//     extension="webm";
//     supportEnabled=true;
// }
// else 
// {
//     console.log("type not supported");
// }


console.log("Extensions:"+extension);

var videoCodec=
// 'video/mp4;codec="avc1.4d0028"';
// 'video/mp4; codecs="avc1.64001F,mp4a.40.2"';
'video/webm';

console.log("Vide: "+MediaRecorder.isTypeSupported(videoCodec));

function d(s){
    MediaRecorder.isTypeSupported(d);
}

function startRecording() {
   
    console.log("recordButton clicked");
    var audioConstraints = {audio: true};
    //var videoConstraints = {video: true};
    var allConstraints = {
        video: true,
        audio: true
    };

    recordButton.disabled = true;
    stopButton.disabled = false;
    pauseButton.disabled = false;

    //changed added 1
    var mediaSource = new MediaSource();
    var video=document.getElementById("v");
    video.src = window.URL.createObjectURL(mediaSource);
    var sourceBuffer;
    mediaSource.addEventListener('sourceopen', function () {
        
        sourceBuffer = mediaSource.addSourceBuffer(videoCodec);
        // sourceBuffer = mediaSource.addSourceBuffer('video/webm; codec=vp9');
        console.log(sourceBuffer);
        video.play();
    });
    console.log("media source initialized"+ mediaSource);
    $events.appendChild(newItem("media source initialized"));

    //change closed



    //console.log(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia(allConstraints).then(function(stream) {
        if(stream!==null){
            console.log("All stream found");
            $events.appendChild(newItem("asf"));
        }
        else
        {
            console.log("All stream null");
        }
        
        console.log("getUserMedia() success, stream created, initializing MediaRecorder");
        gumStream = stream;

        var options = {
         bitsPerSecond:10000,
          mimeType : videoCodec
        }

        recorder = new MediaRecorder(stream,options);

        //when data becomes available add it to our attay of audio data
        recorder.ondataavailable = function(e){
            // $events.appendChild(newItem());

            

        	//sourceBuffer.appendBuffer(new Uint8Array(e.data.result));
        	e.data.arrayBuffer().then(dat=>{
                console.log(dat);

                //$events.appendChild(newItem("r"));

                sourceBuffer.appendBuffer(dat);
                //$events.appendChild(newItem("e"));
            });
           
            
            // console.log ("recorder.audioBitsPerSecond:"+recorder.audioBitsPerSecond)
            // console.log ("recorder.videoBitsPerSecond:"+recorder.videoBitsPerSecond)
            // console.log ("recorder.bitsPerSecond:"+recorder.bitsPerSecond)
            // // add stream data to chunks
            // console.log(e.data.arrayBuffer());
            // h264p.play(e.data.arrayBuffer());
            // var reader = new FileReader(); 
            //     reader.readAsDataURL(e.data); 
            //     reader.onloadend = function () { 
            //     var base64String = reader.result; 
            //     console.log('Base64 String - ', base64String); 
            //     // var t=document.getElementById("data");
            //     // t.innerHTML=base64String;
            // }
        };

        recorder.onerror = function(e){
            console.log(e.error);
        }
        recorder.start(1);
    }).catch(function(err) {
        //enable the record button if getUserMedia() fails
        //recordButton.disabled = false;
        console.log(err);
        attemptAudioStreaming();
        $events.appendChild(newItem("stream not found, attempting only audio"));
        //stopButton.disabled = true;
        //pauseButton.disabled = true
    });
}


function attemptAudioStreaming() {
    console.log("recordButton clicked");
    var audioConstraints = {audio: true};
    

    recordButton.disabled = true;
    stopButton.disabled = false;
    pauseButton.disabled = false;

    console.log(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia(audioConstraints).then(function(stream) {
        if(stream!==null){
            console.log("audio stream found");
        }
        else
        {
            console.log("audio stream null");
        }
        
        console.log("getUserMedia() success, stream created, initializing MediaRecorder");
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
                var t=document.getElementById("data");
                t.innerHTML=base64String;
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
        recordButton.disabled = false;
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

    stopButton.disabled = true;
    recordButton.disabled = false;
    pauseButton.disabled = true;

    pauseButton.innerHTML="Pause";
    recorder.stop();
    gumStream.getAudioTracks()[0].stop();
}

// function createDownloadLink(blob) {
    
//     var url = URL.createObjectURL(blob);
//     var au = document.createElement('audio');
//     var li = document.createElement('li');
//     var link = document.createElement('a');

//     au.controls = true;
//     au.src = url;

//     link.href = url;
//     link.download = new Date().toISOString() + '.'+extension;
//     link.innerHTML = link.download;

//     li.appendChild(au);
//     li.appendChild(link);
// }