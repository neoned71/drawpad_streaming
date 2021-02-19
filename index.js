const session = require("express-session");
const fs= require("fs");
const MongoStore = require("connect-mongo")(session);
const mongoose = require("mongoose");
const multer = require("multer");
var upload = multer();

var passportSocketio=require("passport.socketio");

var express = require('express');
var room= require('./roomClass');
var cookieParser=require("cookie-parser");
//const server = http.createServer();
const uuid = require('uuid');
const url = require('url');

var app = express();
const http = require('http');
//var expressWs = require('express-ws')(app);
var bodyParser = require("body-parser");
var base64js = require('base64-js');

const passport = require("./passport/setup");
const auth = require("./routes/auth");
const Room = require("./node_models/rooms");

// const fileUpload = require("./file_upload");

const RoomClass = require("./roomClass");
//const PORT = 5000;
const MONGO_URI = "mongodb://127.0.0.1:27017/n71_video_conf";

mongoose
    .connect(MONGO_URI, { useUnifiedTopology: true,useNewUrlParser: true })
    .then(console.log(`MongoDB connected ${MONGO_URI}`))
    .catch(err => console.log(err));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// app.use(upload.array());

var port=3002;
var sessionStore=new MongoStore({ mongooseConnection: mongoose.connection });

var sessionMiddleWare=session({
		key:'express.sid',
        secret: "neoned71",
        resave: false,
        saveUninitialized: true,
        store: sessionStore
    });
// Express Session
app.use(sessionMiddleWare);
// app.use(cookieParser);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

function isAuthenticated(req, res, next) {
// console.log(req.headers.cookie);
  if (req.user) 
  {
    //console.log(req.user);
    next();
  } 
  else 
  {
     // console.log("redirecting to login");
        res.redirect('/login');
  }
  //res.redirect('/login');
}

app.use("/api/auth", upload.array(),auth);
app.get("/login",(req, res) => {res.render('pages/login_complete');});
app.set("view engine","ejs");

app.use('/img', express.static(__dirname + '/views/img/'));
app.use('/pdfs', express.static(__dirname + '/views/pdfs/'));
app.use('/fonts', express.static(__dirname + '/views/fonts'));

app.use('/classroom', express.static(__dirname + '/views/home/'));



app.use('/js', express.static(__dirname + '/views/js/'));
app.use('/css', express.static(__dirname + '/views/css/'));
// app.use('/teacher', express.static(__dirname + '/views/teacher/'));

// app.use('/student/js', express.static(__dirname + '/views/student/js/'));
// app.use('/student/css', express.static(__dirname + '/views/student/css/'));


// app.use('/files/:roomId', (req, res, next) => {

//   express.static(__dirname + '/uploads/'+req.params.roomId+'/')(req, res, next);
// });         

let count=1;

//middleware....use it for authentication!!
// app.use('/',isAuthenticated, function (req, res, next) {
// 	console.log("first:"+req.url);
//   next();

// });

var rooms = new Map();// to store room data!!

app.get('/'/*,cors(corsOptions)*/, isAuthenticated,function (req, res) {
//   console.log(req.user);
	//res.redirect('/classroom');
	res.render("pages/",{imageUrl:req.user.image_url,name:req.user.name});
});

// app.get('/value'/*,cors(corsOptions)*/, function (req, res) {
//   count++;
//   res.end(JSON.stringify(count)) ;
// });

// app.get('/user/token',isAuthenticated, function (req, res) {
//   let d={status:"success",token:req.user.token};
//   res.end(JSON.stringify(d));
// });


app.get('/room/:roomId',isAuthenticated, function (req, res) {
	let roomId = req.params['roomId'];
	if(rooms.has(roomId))
	{
		let room = rooms.get(roomId);
		if(room.started) //room.started = true defined in Room.js file Room class
		{
			goToRoom(res,roomId,req.user.id);
		}
		else{
			//
			goToWaitingRoom(res,roomId,req.user.id);
		}
	}	
});


function goToRoom(res,roomId,userId)
{
	// console.log(rooms.get(roomId));
	// console.log("roomId:"+roomId);
 	Room.findById(roomId).lean().exec(function (err, results)
 	{
 		console.log(results._id == roomId);
        try {
            console.log(typeof results);
            if(userId==results.owner)
            {
            	console.log("yes");
            	res.render("pages/room.ejs",{room:roomId,user:userId});
            }
            else
            {
            	console.log("no");
            	res.render("pages/room.ejs",{room:roomId,user:userId});
            }
        } catch (err) {
            console.log("errror getting results");
            // console.log(error);
            res.render("pages/error.ejs",{room:roomId,user:userId});
        }
        finally{
        	return false;
        }
 	
 	});

}



function goToWaitingRoom(res,roomId,userId)
{
	// console.log(rooms.get(roomId));
	// console.log("roomId:"+roomId);
 	Room.findById(roomId).lean().exec(function (err, results)
 	{
 		console.log(results._id == roomId);

        try {
            console.log(typeof results);
            if(userId==results.owner)
            {
            	console.log("yes");
            	res.render("pages/waiting_room_teacher.ejs",{room:roomId});
            }
            else
            {
            	console.log("no");
            	res.render("pages/waiting_room_student.ejs",{room:roomId});
            }
        } catch (err) {
            console.log("errror getting results");
            // console.log(error);
            res.render("pages/error.ejs",{room:roomId});
        }
        finally{
        	return false;
        }
 	
 	});

}



// app.get('/room_student',isAuthenticated, function (req, res) {
//   res.render("pages/room_student.ejs");
// });


app.get('/create_room',isAuthenticated, function (req, res) {
	let ownerId=req.user.id;
	let cancelled = false;
	
	let d=new Room({owner:ownerId});
  	console.log("room created: "+d._id+","+d.id);
  	d.save(err=>{console.log(err);});
  	
	let ret={status:"success",room_id:d.id};
  	rooms.set(d.id.toString(),new RoomClass(d.id,ownerId,io));
  	res.end(JSON.stringify(ret));
});

const server = http.createServer(app);
const options = { path:'/socket.io'/*,transports: ['websocket', 'polling']*/ };
const io = require('socket.io')(server, options);

io.use(passportSocketio.authorize({
  cookieParser: cookieParser,       // the same middleware you registrer in express
  key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
  secret:       'neoned71',    // the session_secret to parse the cookie
  store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
  success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
  fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));


function onAuthorizeSuccess(data, accept){
	console.log("success");
	accept();
}

function onAuthorizeFail(data, message, error, accept){
	if(error)
	{
		accept(new Error(message));
	}
	console.log("failed");
}

// io.use((socket, next) => {
//   let token = socket.handshake.query.token;
//   console.log(socket.handshake.query.token);
//   console.log(socket.handshake.query.uid);
//   next();
//   // if (isValid(token)) {
//   //   return next();
//   // }
//   // return next(new Error('authentication error'));
// });



io.on('connection', socket => {
	let roomId=socket.handshake.query.room_id;
	// console.log("roomId: " +roomId);
	// console.log("roomID: "+roomId);

	if(roomId && mongoose.Types.ObjectId.isValid(roomId) )
	{
    	rooms.get(roomId).handleSocket(socket,io);
	}
	else
	{
		console.log("room_id not present");

		return;
	}
});

app.get('/logout', function(req, res){
	if(req.user)
	{
		req.user.token="";
		req.user.save();
	}
	
  	req.logout();
  	res.redirect('/login');
});


// app.post("/files/:roomId",function(req,res)
// 	{
// 		console.log("inside files");
// 		req.roomId=req.params['roomId'];
// 		  fileUpload(req,res,function(err) { 
		  
// 		        if(err) {

// 		            res.send({status:"failed",message:"failed to upload a file"}) 
// 		        } 
// 		        else { 
// 		        	console.log(req.file);
// 		            // SUCCESS, image successfully uploaded 
// 		            rooms.get(req.roomId).broadcastFileUpload(req.file);
// 		            res.send({status:"success",message:"successfully uploaded file"});
// 		        } 
//    		 }) 
// 	});


// app.get("/files/:roomId/:fileId",function(req,response)
// 	{
// 		console.log("inside files");
// 		let roomId=req.params['roomId'];
// 		let fileId=req.params['fileId'];
// 		if(rooms.has(roomId)){
// 			// console.log(1);
// 			let room = rooms.get(roomId);
// 			if(room.files.files.has(fileId))
// 			{
// 				// console.log(2);
// 				let file=room.files.files.get(fileId);
// 				let filePath =  file.path; // confused about this one!! turned out its okay

// 				  // Check if file specified by the filePath exists 
// 			  fs.access(filePath,fs.constants.F_OK, function(exists){
// 			      if (exists) { 
// 			      console.log(file.filename);    
// 			        // Content-type is very interesting part that guarantee that
// 			        // Web browser will handle response in an appropriate manner.
// 			        response.writeHead(200, {
// 			          "Content-Type": "application/octet-stream",
// 			          "Content-Disposition": 'attachment; filename="'+file.filename+'"'
// 			        });
// 			        fs.createReadStream(filePath).pipe(response);
// 			      } else {
// 			        response.writeHead(400, {"Content-Type": "text/plain"});
// 			        response.end("ERROR File does not exist");
// 			      }
// 			    });
// 			}
// 			else{
// 				response.writeHead(400, {"Content-Type": "text/plain"});
// 			    response.end("ERROR File Id not valid");
// 			}
// 		}

// 		else
// 		{
// 			response.writeHead(400, {"Content-Type": "text/plain"});
// 			response.end("ERROR room id not valid");
// 		}

		 
// });


server.listen(port);
console.log("server started at port:"+port);
