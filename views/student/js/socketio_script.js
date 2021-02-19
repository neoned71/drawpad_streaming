var token="token";
var uId="uId";
const myPeer = new Peer(userId, {
  host: '/',
  port: '3001',
  config: {'iceServers': [
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'turn:thrustacademy.com:3478', credential: 'neon',username:'neoned71' }
  ]}
});

console.log("user id: "+userId);
const peers = {}

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  window.stream=stream;
  console.log("inside getmedia");
  // var myVideo = document.createElement('video');
  // addVideoStream(myVideo, stream);

  myPeer.on('call', call => {
    console.log("call aquired");
    
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      console.log("stream aquired");
      // debugger;
      addVideoStream(video, userVideoStream);
    });
    call.answer(stream);
  });

  socket.on('user-connected', userId => {
    console.log("inside user connected");
    // connectToNewUser(userId, stream);
  });
  socket.on('master-connected', userId => {
    console.log("inside master connected");
    connectToNewUser(userId, stream);
  });
}).catch(e=>{
  console.log("inside error");
  var stream=createMediaStreamFake();
  myPeer.on('call', call => {
    console.log("inside on call, with exception");
    
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
    call.answer(stream);
  });

  socket.on('user-connected', userId => {
    console.log("inside user connected");
    // connectToNewUser(userId, stream);
  });
  socket.on('master-connected', userId => {
    console.log("inside master connected: "+userId);
    connectToNewUser(userId, stream);
  });
});

myPeer.on("connection",conn=>{
  console.log("conection peer");
})

myPeer.on('open', id => {
  console.log("id recieved: "+id+" userId:"+userId);
myPeer.on('data', function(data) {
            console.log('Data: '+data);
        });
  socket.emit('join_room', roomId, userId);
})

function connectToNewUser(userId, stream) {
  console.log("new user connected");
  const video = document.createElement('video');
  const call = myPeer.call(userId, stream);
  call.on('stream', userVideoStream => {
    console.log("stream recieved");
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    console.log("stream closed");
    video.remove();
  });


  peers[userId] = call
}

function addVideoStream(video, stream) {
  console.log("adding video stream");
  video.srcObject = stream;
  video.control=true;
  video.addEventListener('loadedmetadata', () => {
    
    video.play();
  });
  var videoGrid = document.getElementById('video-grid');
  videoGrid.append(video)
}


const createMediaStreamFake = () => {
  console.log("createMediaStreamFake");
      // return new MediaStream([createEmptyAudioTrack(), createEmptyVideoTrack({ width:640, height:480 })]);
      return new MediaStream([createEmptyVideoTrack({ width:1000, height:480 })]);
}

// const createEmptyAudioTrack = () => {
//   console.log("createEmptyAudioTrack");
//     const ctx = new AudioContext();
//     const oscillator = ctx.createOscillator();
//     const dst = oscillator.connect(ctx.createMediaStreamDestination());
//     oscillator.start();
//     const track = dst.stream.getAudioTracks()[0];
//     return Object.assign(track, { enabled: false });
// }

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
var queryString ="room_id="+(window.location.pathname.split("/")[2]);
console.log("query: "+queryString);
socket = io("", {path:"/socket.io",query:queryString});//working...data reaching onconnect function

w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

console.log(w+":"+h);

liveCount=0;

socket.on('connect', () => {
console.log("connected");
});

socket.on("f-message",(data)=>{
  console.log(data);
  
  if(data === null){
    console.log("data is null");
    return;
  }
  else{
    if(data.app=="paper")
    {
      console.log("paper app+");
      if(data.method.includes("."))
      {
        // console.log("contains dot");
        console.log(data.data);
        console.log(typeof (JSON.parse(data.data)).point[1]);
        var a=data.method.split(".")[0];
        var b=data.method.split(".")[1];
        
        let d=JSON.parse(data.data);
        d.point=new Point(d.point[1],d.point[2]);
        d.downPoint=new Point(d.downPoint[1],d.downPoint[2]);
        window[a][b](d);
        // console.log(window[a][b]);
        
      }
      else
      {
        window[data.method](data.data);
      }
    }
    
    else if(data.app=="grapher")
    {
      console.log("grapher app+");
      if(data.event=="plot"){
        
        plot(data.data);
      }
      else
      {
        emit(data.event,data.data);
      }
      
     
    }
    else if(data.app=="video")
    {
      var diff = Math.abs(new Date() - new Date(data.time));
      console.log("delay: "+diff);
      playMedia(data.data);
    }
  }
  

});


socket.on("video",data=>{
  if(data.action === null){
    return false
  }
  else if(data.action=="feed")
  {
      var diff = Math.abs(new Date() - new Date(data.time));
      console.log(data.time+" delay: "+diff+" "+new Date());
      playMedia(data.data);
      return true;
  }
});

socket.on("question",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present question");
    return;
  }
  if(data.action=="insert")
  {
    window.questions.insertQuestion(data.data.question);

  }
  else if(data.action=="set")
  {
    window.questions.set(data.data.id);
  }
  else if(data.action=="show")
  {
    window.questions.show();
  }
  else if(data.action=="disclose")
  {
    window.questions.disclose(data.data.id);
  }

  else if(data.action=="remove")
  {
    window.questions.remove(data.data.id);
  }
   else if(data.action=="update_responses")
  {
    window.questions.updateResponses(data.data.id,data.data.responses);
  }


  // question.mark && question.unmark to send socket emit

});


socket.on("chat",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present chat");
    return;
  }
  else if(data.action=="new")
  {
    return window.chat.insertChat(data.data.chat);
  }
});

// view doubt_script.js
socket.on("doubt",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present doubt");
    return;
  }
  if(data.action=="enable")
  {
    doubts.enable(true);
  }
  else if(data.action=="disable")
  {
    doubts.enable(false);
  }

  // doubts raised and lowered to send socket emit

});


// view paper_script.js
socket.on("canvas",(data)=>{
  //console.log(data);
  
  if(data.action === null){
    console.log("no Action present canvas");
    return;
  }
  // if(data.count-1 != canvas.count)
  // {
  //   console.log("counts dont match");
  //   window.canvas.requestState();
  // }
  else{
    window.canvas.executeAction(data);
  }

});


// view plot_script.js
socket.on("grapher",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present grapher");
    return;
  }
  if(data.action=="plot")
  {
    window.grapher.plot(data.data.equation);
  }
  else if(data.action=="event")
  {
    window.grapher.emit(data.type,data.data);
  }

  // doubts raised and lowered to send socket emit

});


socket.on("calculator",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present calculator");
    return;
  }

  if(data.action=="insert")
  {
    calculator.insert(data.data.query);
  }


  else if(data.action=="set")
  {
    calculator.setEquation(data.data.id);
  }
  
  // doubts raised and lowered to send socket emit

});


socket.on("pdf",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present pdf");
    return;
  }

  if(data.action=="set")
  {
    window.pdf.setLink(data.id);
  }

  else if(data.action=="page")
  {
    window.pdf.setPage(data.page_number);
  }

});

socket.on("files",(data)=>{
  console.log(data);
  if(data.action === null){
    console.log("no Action present pdf");
    return;
  }
  else if(data.action=="new")
  {
    window.files.insertFile(data.file);
  }
  else if(data.action=="remove")
  {
    window.files.insertFile(data.id);
  }

  
  // else if(data.action=="set_page")
  // {
  //   window.pdf.setPage(data.data.page_number);
  // }

});



socket.on("control",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present control");
    return;
  }

  if(data.action=="screen")
  {
    window.control.setScreen(data.screen);
  }
  else if(data.action=="status")
  {
    window.control.setStatus(data.status);
  }

  
});

socket.on("live_count",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present live count");
    return;
  }

  liveCount=data.data.live_count;
  updateLiveCount();
  
});

socket.on("mathtool",(data)=>{
  console.log(data);
  
  if(data.action === null){
    console.log("no Action present control");
    return;
  }

  if(data.action=="calculation")
  {
    console.log("yes");
    window.addCalculation(data.data.query);
  }
});

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


function updateLiveCount(){
  console.log("liveCount:"+liveCount);
}
