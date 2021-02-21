const Canvas=require("./canvasClass");
// const Chat=require("./chatClass");
// const Pdf=require("./pdfClass");
// const Grapher=require("./grapherClass");
// const Questions=require("./questionsClass");
// const Mathtool=require("./mathtoolClass");
// const Files=require("./filesClass");
// import { v4 as uuidv4 } from 'uuid';
const mongoose = require("mongoose");
const ObjectId= mongoose.Types.ObjectId;

const root="https://thrustacademy.com";


class RoomClass{
	constructor(roomId,userId,io){
    this.io=io;
		this.roomId=roomId;
		this.userId=userId;
		this.startTime=new Date();
		this.elapsedTime=0;
		this.sockets=new Map();
		this.started=true;
		// this.chat = new Chat();
		// this.pdf = new Pdf();
		this.canvas = new Canvas();
		// this.grapher = new Grapher();
		// this.questions= new Questions();
  //   this.mathtool= new Mathtool();
  //   this.files= new Files();
		this.doubts=new Set();
		this.doubtsEnabled=true;
		this.screen="video";
		this.microphone=true;
		this.video=true;
		this.firstvideoFrame=false;
		this.firstvideoFrameData=null;
		this.liveCount=0;
	}

	broadcastLiveCount(socket)
	{
		this.liveCount=this.sockets.size;
		socket.to(this.roomId).emit('live_count', {data:{live_count:this.liveCount}});
	}


  // broadcastFileUpload(file)
  // {
  //   // file: {id,name,timestamp,size,href}
  //   let id=ObjectId();
  //   file.id=id.toString();
  //   file.url=root+"/files/"+this.roomId+"/"+file.id;

  //   var fileBroadcast={id:file.id,name:file.filename,path:file.url};
  //   file.broadcast=fileBroadcast;
  //   console.log(fileBroadcast);

  //   this.files.insertFile(file);
  //   // this.liveCount=this.sockets.size;
  //   // console.log("broadcasting new file");
  //   // console.log(file);
  //   let data={action:"new",file:fileBroadcast};
  //   this.io.in(this.roomId).emit('files',data);
  // }



	handleSocket(socket)
	{
    let io=this.io;
	socket.join(this.roomId);
	let email=socket.request.user.email;
	let userId=socket.request.user.id;
	socket.email=email;
	socket.userId=userId;
	if(this.sockets.has(email))
	{
		this.sockets.get(email).add(socket);
	}
	else
	{
		let s= new Set();
		s.add(socket);
		this.sockets.set(email,s);
	}

	if(userId==this.userId)
	{
		socket.role="master";
	}
	else
	{
		socket.role="slave";
		this.broadcastLiveCount(socket);
	}

	socket.on("disconnect",()=>{
		let s=this.sockets.get(socket.email);
		if(s.size==1)
		{
			this.sockets.delete(socket.email);
			this.broadcastLiveCount(socket);

		}
		else
		{
			s.delete(socket);
		}
	});

this.state={screen:"video",microphone:true,video:true,timeline:"-1"};

socket.to(this.roomId).emit("state",this.state);
  // 0th:
  // socket.on("video",data=>{
  //   console.log("video");
  //   if(socket.role=="master"){
  //     if(data.action=="feed")
  //     {
  //       console.log(data);
  //       console.log("inside feed section");
  //       socket.to(this.roomId).emit('video', data);
  //     }
  //   }
  // });


  // 0th:
  socket.on('join_room', (roomId, userId) => {
  	console.log("joining room:"+roomId)
	// console.log("join_room");
    if(socket.role=="master")
    {
    	socket.to(roomId).broadcast.emit('user-connected', userId);
    }
    else{
    	socket.to(roomId).broadcast.emit('user-connected', userId);
    }

    socket.on('disconnect', () => {
    	console.log("disconnect")
    	socket.to(roomId).broadcast.emit('user-disconnected', userId)
    });
  });
	//1st:
	// socket.on("question",data=>{
 //    console.log("question");
 //    let userId=socket.request.user.id;
 //    if(socket.role=="master"){
 //      if(data.action=="attempt_insert")
 //      {
 //        // let id= uuidv4();
 //        console.log(data);
 //        if(data.data.question)
 //        {
 //          console.log(data.data.question);
 //          let id=ObjectId();
 //          data.data.question.id=id;  
 //          if(this.questions.insert(data.data.question)){
 //            data.action="insert";
 //            io.in(this.roomId).emit('question',data);
 //          }
          
 //        }
        
 //      }
 //    	// if(data.action=="insert")
 //    	// {
 //    	// 	this.questions.insert(data.data.question);
 //    	// }
 //    	else if(data.action=="show")
 //    	{
 //    		this.questions.show();
 //    	}
 //    	else if(data.action=="hide")
 //    	{
 //    		this.questions.hide();
 //    	}
 //    	else if(data.action=="set")
 //    	{
 //    		this.questions.set(data.data.id);
 //    	}
 //    	else if(data.action=="disclose")
 //    	{
 //    		this.questions.disclose(data.data.id);
 //    	}
 //    	else if(data.action=="remove")
 //    	{
 //    		this.questions.remove(data.data.id);
 //    	}
 //    	else
 //    	{
 //    		return;
 //    	}
    	
 //      socket.to(this.roomId).emit('question', data);
 //    }
 //    else if(socket.role=="slave"){
 //    	if(data.action=="mark" && data.data.id)
 //    	{
 //    		this.questions.mark(data.data.id,userId,data.data.response);
 //    	}
 //    	else if(data.action=="unmark" && data.data.id)
 //    	{
 //    		this.questions.unmark(data.data.id,userId);
 //    	}
 //    	else
 //    	{
 //    		return;
 //    	}

 //    	data.action="update_responses";
 //    	data.data={id:data.data.id,responses:this.questions.getCountResponses(data.data.id)};
    	
 //      // socket.to(this.roomId).emit('question', data);
 //      io.in(this.roomId).emit('question',data);
 //    }
 //  });




	// //2nd
	// socket.on("chat",data=>{
 //    console.log(data);
 //    let userId=socket.request.user.id;
 //  	if(data.action=="insert")
 //  	{
 //  		// console.log(data);
 //  		data.data.chat.userId=userId;
 //  		data.data.chat.timestamp=new Date();
 //  		this.chat.insert(data.data.chat);
 //  		data.action="new";
 //  		io.in(this.roomId).emit('chat',data);
 //  	}
 //  	else
 //  	{
 //  		return;
 //  	}

  	
      
 //    });


	// //3rd
	// socket.on("doubt",data=>{
 //    console.log("doubt");
 //    let userId=socket.request.user.id;

 //    if(socket.role="master" && data.action=="enable")
	// {
	// 	this.doubtsEnabled=true;
	// }
	// else if(socket.role="master" && data.action=="disable")
	// {
	// 	this.doubtsEnabled=false;
	// }
	// else if(socket.role="slave")
	// {
	// 	if(data.action=="raised")
	// 	{
	// 		this.doubts.add(userId);
	// 	}
	// 	else if(data.action=="lowered")
	// 	{
	// 		this.doubts.delete(userId);
	// 	}

	// 	else
	// 	{
	// 		return;
	// 	}
		
	//   socket.to(this.roomId).emit('doubt', data);
	// }



	
    
 //  });


	// //4th
	// socket.on("control",data=>{
 //     if(socket.role=="master"){
 //    	if(data.action=="screen")
 //    	{
 //    		this.screen=data.screen;
 //    	}
 //    	// else if(data.action=="")
 //    	// {
    		
 //    	// }
 //    	else
 //    	{
 //    		return;
 //    	}
    	
 //      socket.to(this.roomId).emit('control', data);
 //    }
    
 //  });

	//5th
	socket.on("canvas",data=>{
    // console.log(data);
    if(socket.role=="master"){
    	if(data.action=="radius")
    	{
    		if(this.canvas.setRadius(data.data.radius))
    		{
          		this.canvas.addAction(data);
    			socket.to(this.roomId).emit('canvas', data);
    		}
    	}
    	else if(data.action=="tool")
    	{
    		if(this.canvas.setTool(data.data.tool))
    		{
         		this.canvas.addAction(data);
    			socket.to(this.roomId).emit('canvas', data);
    		}
    	}

    	else if(data.action=="color")
    	{

    		if(this.canvas.setColor(data.data.tool))
    		{
          this.canvas.addAction(data);
    			socket.to(this.roomId).emit('canvas', data);
    		}
    	}
    	else if(data.action=="event")
    	{
        	this.canvas.addAction(data);
    		this.canvas.onEvent(data.data);

    		socket.to(this.roomId).emit('canvas', data);
    	}

      else if(data.action=="undo")
      {

        this.canvas.addAction(data);
        socket.to(this.roomId).emit('canvas', data);
      }

      // else if(data.action=="control")
      // {
      //   if(data.type="switch")
      //   {
      //     if(this.canvas.setCurrent(data.data.id)){
      //       socket.to(this.roomId).emit('canvas', data);
      //     }
      //   }
        
        
      // }
    	
    	
    	else
    	{
    		return;
    	}
    	
      
    }
    
  });


	// //6th
	// socket.on("grapher",data=>{
 //    // console.log(data);
 //     if(socket.role=="master"){
 //      // console.log(data);
 //    	if(data.action=="plot")
 //    	{
 //    		if(this.grapher.plot(data.data.equation))
 //    		{
 //    			socket.to(this.roomId).emit('grapher', data);
 //    		}
 //    	}
 //    	else if(data.action=="event")
 //    	{
 //    		socket.to(this.roomId).emit('grapher', data);
 //    	}
 //    	else
 //    	{
 //    		return;
 //    	}
    	
      
 //    }
    
 //  });



	// //7th
	// socket.on("pdf",data=>{
 //     if(socket.role=="master"){
 //    	if(data.action=="set")
 //    	{
 //    		if(this.files.has(data.id) && this.pdf.setFile(data.id,this.files.get(data.data.id)))
 //    		{
 //    			socket.to(this.roomId).emit('pdf', data);
 //    		}
 //    	}
 //    	else if(data.action=="page")
 //    	{
 //    		if(this.pdf.setPage(data.page_number))
 //    		{
 //    			socket.to(this.roomId).emit('pdf', data);
 //    		}
 //    	}
 //    	else
 //    	{
 //    		return;
 //    	}
    	
 //      // socket.to(this.roomId).emit('question', data);
 //    }
    
 //  });


 //  //8th
 //  socket.on("mathtool",data=>{
 //  	console.log(data);
 //     if(socket.role=="master"){
 //      if(data.action=="set")
 //      {
 //        if(this.mathtool.set(data.data.id))
 //        {
 //          socket.to(this.roomId).emit('mathtool', data);
 //        }
 //      }
 //      else if(data.action=="calculation")
 //      {
 //        var id=this.mathtool.calculate(data.data.query);
 //        console.log("q:"+data.data.query);
 //        if(id)
 //        {
 //          data.data.query.id=id;
 //          // data.action="new";
 //          socket.to(this.roomId).emit('mathtool',data);
 //        }
 //      }
 //      else
 //      {
 //        return;
 //      }
      
 //      // socket.to(this.roomId).emit('question', data);
 //    }
    
 //  });

 //   //9th
 //  socket.on("query",data=>{
 //      if(data.action=="user")
 //      {
        
 //      }
 //      else if(data.action=="control")
 //      {
        
 //      }
 //      else if(data.action=="chat")
 //      {
        
 //      }
 //      else if(data.action=="grapher")
 //      {
        
 //      }
 //      else if(data.action=="canvas")
 //      {
        
 //      }
 //      else if(data.action=="doubt")
 //      {
        
 //      }
 //      else if(data.action=="question")
 //      {
        
 //      }
 //      else if(data.action=="pdf")
 //      {
        
 //      }
 //      else if(data.action=="mathtool")
 //      {
        
 //      }
 //      else
 //      {
 //        return;
 //      }
      
 //      // socket.to(this.roomId).emit('question', data);
    
    
 //  });


 //   socket.on("files",data=>{
 //      if(data.action=="attempt_remove")
 //      {
 //        if(this.files.removeFile(data.data.id)){
 //          data.action="remove";
 //          io.in(this.roomId).emit('files',data);
 //        }
 //      }
 //      else if(data.action=="state")
 //      {
 //        data.data.state=this.files.getState();
 //        socket.emit('files',data);  
 //      }

 //      else
 //      {
 //        return;
 //      }
 //    });

	}




	getState(){
		return {stream:{enabled:true},drawpad:{enabled:true}};
		// this.state={screen:this.screen,microphone:this.microphone,video:this.video,firstFrameShown:this.firstvideoFrame,timeline:"-1"};
		// return {"state":this.state,"grapher": {state:this.grapher.getState(),data:getGrapher()}, "canvas": {state:this.canvas.getState(),data:getCanvas()},"document":{state:this.document.getState(),data:getDocuments()},"chat":{state:this.chat.getState(),data:getChat()}};
	}

	// getChat(){
	// 	return this.chat.get();
	// }

	// getDocuments(){
	// 	return this.documents.get();
	// }

	// getGrapher(){
	// 	return this.grapher.get();
	// }

	getCanvas(){
		return this.canvas.get();
	}


	// newChat(chat){
	// 	this.chat.insert(chat);
	// }


	// addQuestion(question)
	// {
	// 	this.question.insert(question);
	// }

	// removeQuestion(index)
	// {
	// 	this.question.remove(question);
	// }	
}
module.exports = RoomClass;