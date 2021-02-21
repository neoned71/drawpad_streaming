// socket.emit('message', "this is a test"); 
//sending to sender-client only

// socket.broadcast.emit('message', "this is a test"); 
//sending to all clients except sender

// socket.broadcast.to('game').emit('message', 'nice game'); 
//sending to all clients in 'game' room(channel) except sender

// socket.to('game').emit('message', 'enjoy the game'); 
//sending to sender client, only if they are in 'game' room(channel)

// socket.broadcast.to(socketid).emit('message', 'for your eyes only'); 
//sending to individual socketid

// io.emit('message', "this is a test"); 
//sending to all clients, include sender

// io.in('game').emit('message', 'cool game'); 
//sending to all clients in 'game' room(channel), include sender

// io.of('myNamespace').emit('message', 'gg'); 
//sending to all clients in namespace 'myNamespace', include sender

// socket.emit(); 
//send to all connected clients

// socket.broadcast.emit(); 
//send to all connected clients except the one that sent the message

// socket.on();
 //event listener, can be called on client to execute on server

// io.sockets.socket(); 
//for emiting to specific clients

// io.sockets.emit(); 
//send to all connected clients (same as socket.emit)

// io.sockets.on() ;
 //initial connection from a client.


var token="token";
var uId="uId";

var videoMap = new Map();

var queryString ="room_id="+(window.location.pathname.split("/")[2]);
console.log("query: "+queryString);
socket = io("", {path:"/socket.io",query:queryString});//working...data reaching onconnect function

var myPeer;
// socket.emit('join_room', roomId, userId);

console.log("user id:"+userId);
const peers = {}

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  window.stream=stream;
  initializePeer(stream);
}).catch(e=>{
  // console.log("creating fake stream");
  // var myVideo = document.createElement('video');
  var stream=createMediaStreamFake();
  initializePeer(stream);
  

});


function initializePeer(stream){
  myPeer = new Peer(userId, {
    host: '/',
    port: '11001',
    config: {'iceServers': [
      { url: 'stun:stun.l.google.com:19302' },
      { url: 'turn:drawpad.neoned71.com:3478', credential: 'neon',username:'neoned71' }
    ]}
  });
  console.log(myPeer);

  myPeer.on('open', id => {
    console.log("id recieved: "+id+" userId:"+userId);
    socket.emit('join_room', roomId, userId);
  });


  var myVideo = document.createElement('video');
  myVideo.muted=true;
  setStreamToVideoElement(myVideo, stream);

  myPeer.on('call', call => {
    // console.log("inside on call,answering with stream object... ");
    console.log("call received");
    // const video = document.createElement('video');
    var aVideo = document.createElement('video');
    call.video=aVideo;
    call.on('stream', userVideoStream => {
      console.log("stream received")
      setStreamToVideoElement(aVideo, userVideoStream);
    });

    call.on('close', () => {
      call.video.remove();
      console.log("call closed, video element removed")
    });
    call.answer(stream);
  });

  socket.on('user-connected', userId => {
    // alert("inside user connected 1");
    callNewUser(userId, stream);
  });

  socket.on('user-disconnected', userId => {
    console.log("inside user disconnected 1"+userId);
    // callNewUser(userId, stream);
  });


myPeer.on('connection',()=>{
  console.log("connection peer");
});
}






function callNewUser(userId, stream) {
  var call = myPeer.call(userId, stream);
  var mvideo = document.createElement('video');
  call.video=mvideo;
  console.log("creating a call");

  call.on('stream', userVideoStream => {
    console.log("stream recieved: "+userVideoStream);
    setStreamToVideoElement(call.video, userVideoStream);
  });
  call.on('close', () => {
    console.log("stream closed");
    call.video.remove();
  });

  peers[userId] = call;
}

function setStreamToVideoElement(video, stream) {
  console.log("adding video from stream");
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  var videoGrid = document.getElementById('video-grid');
  videoGrid.append(video);
}

const createMediaStreamFake = () => {
  console.log("createMediaStreamFake");
      // return new MediaStream([createEmptyAudioTrack(), createEmptyVideoTrack({ width:640, height:480 })]);
      return new MediaStream([createEmptyVideoTrack({ width:1000, height:480 })]);
}

const createEmptyAudioTrack = () => {
  console.log("createEmptyAudioTrack");
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    return Object.assign(track, { enabled: false });
}

const createEmptyVideoTrack = ({ width, height }) => {
  console.log("createEmptyVideoTrack");
    var canvas = Object.assign(document.createElement('canvas'), { width, height });
    var ctx=canvas.getContext('2d');
    window.ctx=ctx;
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(0, 0, width, height);
    // canvas.
    // canvas.getContext('2d').fillRect(0, 0, width, height);
    base_image = new Image();
    window.base_image=base_image;
    base_image.width="100%";
  
  base_image.src = '/img/logo.png';
  base_image.onload = function(){
    ctx.drawImage(base_image, 0, 0);
  }
  
  console.log(base_image);
  // var videoGrid = document.getElementById('video-grid');
  // videoGrid.append(canvas);

    const stream = canvas.captureStream(25);
    // console.log(stream);window.stream=stream;
    const track = stream.getVideoTracks()[0];
  
    return Object.assign(track, { enabled: false });
};




// console.log


// w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
// h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

console.log(w+":"+h);

// socket.on('connect', () => {
// console.log("connected");
// });

// socket.on("f-message",(data)=>{
//   console.log(data);
  
//   if(data === null){
//     console.log("data is null");
//     return;
//   }
//   else{
//     if(data.app=="paper")
//     {
//       console.log("paper app+");
//       if(data.method.includes("."))
//       {
//         // console.log("contains dot");
//         console.log(data.data);
//         console.log(typeof (JSON.parse(data.data)).point[1]);
//         var a=data.method.split(".")[0];
//         var b=data.method.split(".")[1];
        
//         let d=JSON.parse(data.data);
//         d.point=new Point(d.point[1],d.point[2]);
//         d.downPoint=new Point(d.downPoint[1],d.downPoint[2]);
//         window[a][b](d);
//         // console.log(window[a][b]);
        
//       }
//       else
//       {
//         window[data.method](data.data);
//       }
//     }
    
//     else if(data.app=="grapher")
//     {
//       console.log("grapher app+");
//       if(data.event=="plot"){
        
//         plot(data.data);
//       }
//       else
//       {
//         emit(data.event,data.data);
//       }
      
     
//     }
//     else if(data.app=="video")
//     {
//       var diff = Math.abs(new Date() - new Date(data.time));
//       console.log("delay: "+diff);
//       playMedia(data.data);
//     }
//   }
  

// });



// socket.on("video",data=>{
//   if(data.action === null){
//     return false
//   }
//   else if(data.action=="feed")
//   {
//       var diff = Math.abs(new Date() - new Date(data.time)); 
//       playMedia(data.data);
//       return true;
//   }
// });


// socket.on("question",(data)=>{
//   console.log(data);
  
//   if(data.action === null){
//     console.log("no Action present question");
//     return;
//   }
//   if(data.action=="insert")
//   {
//     window.questions.insertQuestion(data.data.question);
//   }
//   else if(data.action=="show")
//   {
//     window.questions.show(data.data.id);
//   }
//   else if(data.action=="disclose")
//   {
//     window.questions.disclose(data.data.id);
//   }

//   else if(data.action=="remove")
//   {
//     window.questions.remove(data.data.id);
//   }
//    else if(data.action=="update_responses")
//   {
//     window.questions.updateResponses(data.data.id,data.data.responses);
//   }
//   // question.mark && question.unmark to send socket emit
// });


// socket.on("chat",(data)=>{
//   console.log(data);
  
//   if(data.action === null){
//     console.log("no Action present chat");
//     return;
//   }
//   else if(data.action=="new")
//   {
//     return window.chat.insertChat(data.data.chat);
//   }
// });


// view doubt_script.js
// socket.on("doubt",(data)=>{
//   console.log(data);
  
//   if(data.action === null){
//     console.log("no Action present doubt");
//     return;
//   }
//   if(data.action=="enable")
//   {
//     doubts.enable(true);
//   }
//   else if(data.action=="disable")
//   {
//     doubts.enable(false);
//   }

//   // doubts raised and lowered to send socket emit

// });


// view paper_script.js
socket.on("canvas",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present canvas");
    return;
  }
  else{
    window.canvas.executeAction(data);
  }

});


// view plot_script.js
// socket.on("grapher",(data)=>{
//   console.log(data);
  
//   if(data.action === null){
//     console.log("no Action present grapher");
//     return;
//   }
//   if(data.action=="plot")
//   {
//     window.grapher.plot(data.data.equation);
//   }
//   else if(data.action=="event")
//   {
//     window.grapher.emit(data.type,data.data);
//   }

//   // doubts raised and lowered to send socket emit

// });


// socket.on("mathtool",(data)=>{
//   console.log(data);
  
//   if(data.action === null){
//     console.log("no Action present calculator");
//     return;
//   }

//   if(data.action=="set")
//   {
//     window.mathtool.set(data.data.id);
//   }

//   else if(data.action=="new")
//   {
//      window.mathtool.newQuery(data.data.query);
//   }

// });

// socket.on("pdf",(data)=>{
//   console.log(data);
//   if(data.action === null){
//     console.log("no Action present pdf");
//     return;
//   }
//   if(data.action=="set_file")
//   {
//     if(window.files.has(data.data.file_id))
//     window.pdf.loadPdf(window.files.get(data.data.file_id).href);
//   }
//   else if(data.action=="set_page")
//   {
//     window.pdf.setPage(data.data.page_number);
//   }

// });

// socket.on("files",(data)=>{
//   console.log(data);
//   if(data.action === null){
//     console.log("no Action present pdf");
//     return;
//   }
//   if(data.action=="new")
//   {
//     window.files.insertFile(data.file);
//   }

  
//   // else if(data.action=="set_page")
//   // {
//   //   window.pdf.setPage(data.data.page_number);
//   // }

// });


// socket.on("control",(data)=>{
//   console.log(data);
//   if(data.action === null){
//     console.log("no Action present control");
//     return;
//   }
//   if(data.action=="screen")
//   {
//     window.control.setScreen(data.data.screen);
//   }
//   else if(data.action=="status")
//   {
//     window.control.setStatus(data.data.status);
//   }

  
// });

function emit(d){
  socket.emit("soel",d);
}

function parseURL(url) {
    var parser = document.createElement('a'),
        searchObject = {},
        queries, split, i;
    // Let the browser do the work
    parser.href = url;
    // Convert query string to object
    queries = parser.search.replace(/^\?/, '').split('&');
    for( i = 0; i < queries.length; i++ ) {
        split = queries[i].split('=');
        searchObject[split[0]] = split[1];
    }
    return {
        protocol: parser.protocol,
        host: parser.host,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        search: parser.search,
        searchObject: searchObject,
        hash: parser.hash
    };
}
