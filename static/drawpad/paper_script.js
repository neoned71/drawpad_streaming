canvasElements = [];
currentCanvasElement=null;
currentObj=null;
canvasRadius=4;
networkStatus=true;
controllerForUploads=false;
his=[];
shapesArr=[];
shapesMap= new Map();
id=0;

uploadPosition=0;
fId=0;
dId=0;
requestLimit=100;

canvasColor="white";

class ShapeC{
	constructor(id,type,thickness,color,data,onCloud){
		this.id=id;
		this.type=type;
		this.onCloud=onCloud;
		this.thickness=thickness;
		this.color=color;
		this.data=data;
		this.finished=false;
		// data is always an array
		// this.end=end;
	}

	setFinished(finished)
	{
		this.finished=finished;
	}

	append(point){
		this.data.push(point);
	}
	//functions: drawShape, uploadShape
}


class LineC extends ShapeC{
	constructor(id,thickness,color,start,onCloud){
		super(id,"l",thickness,color,[start],onCloud);
		
	}

	
}

class CircleC extends ShapeC{
	constructor(id,thickness,color,center,onCloud){
		super(id,"c",thickness,color,[center],onCloud);
		
	}

	
}

class PathC extends ShapeC{
	constructor(id,thickness,color,data,onCloud){
		super(id,"p",thickness,color,[data],onCloud);
	}

	

	


}

class UndoC extends ShapeC{
	constructor(id){
		super(id,"u",null,null,null,null);
	}
}


class Canvas{
	constructor(){
		// this.paper=paper;
		this.initialized=false;
		this.tools=new Map();
		// this.
		this.tool=null;
		// this.elements=[];
		currentCanvasElement=null;
		
	}

	setStatus(status)
	{
		//code this up
	}

	setTool(tool)
	{
		
		if(this.tools.has(tool)){
			console.log("tool selected:"+tool);
			this.toolSelected=true;
			this.tool=tool;
			this.tools.get(tool).activate();
			appendHistory({a:"tool",d:{tool:tool}});
			// his.push();
			//socket.emit("canvas",{action:"tool",data:{tool:tool}});
		}
	}

	

	setRadius(radius)
	{
		canvasRadius=radius;
		appendHistory({a:"radius",d:{radius:radius}});
		// his.push();
	}

	setColor(color)
	{
		canvasColor=color;
		appendHistory({a:"color",d:{color:color}});
		// his.push();
	}

	drawObj(obj)
	{
		if(obj.type=="p")
		{
			var temp=new PathC(obj.id,obj.thickness,obj.color,obj.data,true);
			shapesArr.push(temp);	
			var shape = new Path();
			shape.strokeColor = obj.color;
			shape.strokeWidth=obj.thickness;
			shape.strokeCap = 'round';
			shape.smooth();
			shape.moveTo(new Point(obj.data[0]));
			shapesMap.set(obj.id,{paper:shape,obj:temp});
			for(var i=0;i<obj.data.length;i++)
			{
				shape.lineTo(new Point(obj.data[i]));
			}
			shape.simplify();
			canvasElements.push(shape);
			shapesArr.push(temp);
		}
		else if(obj.type=="c")
		{
			console.log("drawing circle");
			var temp=new CircleC(obj.id,obj.thickness,obj.color,obj.data,true);
			shapesArr.push(temp);
			console.log(obj.data);
			var from=new Point(obj.data[0]);
			var to = new Point(obj.data[1]);

			// var dp = new Point(j.downPoint);
			// 	var p=new Point(j.point);
			var radius=from.subtract(to).length;
			var shape = new Shape.Circle(from,radius);
			shape.strokeColor = obj.color;
			shape.strokeWidth=obj.thickness;
			shape.strokeCap = 'round';
			shapesMap.set(obj.id,{paper:shape,obj:temp});
			canvasElements.push(shape);
			shapesArr.push(temp);
		}
		else if(obj.type=="l")
		{
			var temp=new LineC(obj.id,obj.thickness,obj.color,obj.data,true);
			shapesArr.push(temp);
			var from=new Point(obj.data[0]);
			var to = new Point(obj.data[1]);
			var shape = new Path.Line(from, to);
			shape.strokeColor = obj.color;
			shape.strokeWidth=obj.thickness;
			shape.strokeCap = 'round';
			shapesMap.set(obj.id,{paper:shape,obj:temp});
			canvasElements.push(shape);
			shapesArr.push(temp);
		}

		else if(obj.type=="u")
		{
			this.undo(false);
		}
		
	}

	

	initialize(paper,canvasId="myCanvas")
	{
		this.paper=paper;
		this.setColor("white");
		this.setRadius(2);
		// Get a reference to the canvas object
		var canvas = document.getElementById(canvasId);
		// console.log(canvas);
		// Create an empty project and a view for the canvas:
		this.paper.setup(canvas);

		

		var circleT = new Tool();
		this.tools.set("circle",circleT);

		circleT.onMouseDown = function(event){
			// console.log(event);
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};
			console.log("J: "+j);
			// socket.emit("canvas",{action:"event",type:"mouseDown",data:j});
			emitEventCanvas("mouseDown",j);
			// console.log("g");
			id++;
			currentObj=new CircleC(id,canvasRadius, canvasColor,j.downPoint,false);
			shapesArr.push(currentObj);

			var shape= new Shape.Circle(j.downPoint,0);
			currentCanvasElement=shape;
			shape.strokeCap = 'round';
			shape.strokeColor = canvasColor;
			shape.strokeWidth=canvasRadius;

			shapesMap.set(id,{paper:shape,obj:currentObj});

		}

		

		circleT.onMouseMove = function(event){
			// i++;
			// console.log(event);
			
			if(currentCanvasElement!=null){
				var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};
				var dp = new Point(j.downPoint);
				var p=new Point(j.point);
				var radius=dp.subtract(p).length;
				console.log(radius);
				var shape=currentCanvasElement;		
				// var j=({j:event.point,downPoint:j.downPoint});
				// emitEventCanvas("mouseMove",j);
				shape.radius=radius;
				// console.log(j);
				// console.log(shape);
				// shape.strokeColor = canvasColor;
				// shape.strokeWidth=canvasRadius;
			}
		}

		



		circleT.onMouseUp = function(event){
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};			// console.log(j);
				// socket.send({app:"paper",method:"circleT.onMouseDown",data:j});
			// socket.emit("canvas",{action:"event",type:"mouseUp",data:j});
			emitEventCanvas("mouseUp",j);
			var dp = new Point(j.downPoint);
				var p=new Point(j.point);
				var radius=dp.subtract(p).length;
				console.log(radius);
				var shape=currentCanvasElement;		
				// var j=({j:event.point,downPoint:j.downPoint});
				// emitEventCanvas("mouseMove",j);
				shape.radius=radius;

			var shape=currentCanvasElement;
			// console.log(shape);
			canvasElements.push(shape);
			currentCanvasElement = null;

			currentObj.append(j.point);
			currentObj.setFinished(true);

			uploadObj(currentObj);
		
		}


		var lineT = new Tool();
		this.tools.set("line",lineT);
		
		lineT.onMouseDown = function(event){
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};			// console.log(j);
				// socket.send({app:"paper",method:"circleT.onMouseDown",data:j});
			// socket.emit("canvas",{action:"event",type:"mouseDown",data:j});
			emitEventCanvas("mouseDown",j);
			//var path = new Path();

			id++;
			currentObj=new LineC(id,canvasRadius, canvasColor,j.downPoint,false);
			shapesArr.push(currentObj);
			
			var from=new Point(j.downPoint);
			var to = new Point(j.downPoint);
			var shape = new Path.Line(from, to);
			// path.strokeColor = penColor;
			// console.log(path);
			currentCanvasElement=shape;
			// console.log(currentCanvasElement==null);
			shape.strokeColor = canvasColor;
			shape.strokeWidth=canvasRadius;
			shape.strokeCap = 'round';
			shape.smooth();

			shapesMap.set(id,{paper:shape,obj:currentObj});
		}

		lineT.onMouseMove = function(event){

			if(currentCanvasElement!=null){
				// var j=(event);
			// console.log(j);
				// socket.send({app:"paper",method:"circleT.onMouseDown",data:j});
			// socket.emit("canvas",{action:"event",type:"mouseMove",data:j});
			// emitEventCanvas("mouseMove",j);
			
				var p=new Point(event.point);
				//var radius=dp.subtract(p).length;
				var shape=currentCanvasElement;
				//console.log(shape);
				shape.segments[1].point=p;
			}
			
		}

		lineT.onMouseUp = function(event){
			var shape=currentCanvasElement;
			// var j={ point : event.point, downPoint : event.downPoint };
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};			// console.log(j);

			// // socket.emit("canvas",{action:"event",type:"mouseUp",data:j});
			var p=new Point(j.point);
			currentObj.data.push(j.point);
			shape.segments[1].point=p;
			emitEventCanvas("mouseUp",j);
			
			//console.log(shape);

			canvasElements.push(shape);
			currentObj.append(j.point);
			currentObj.setFinished(true);

			uploadObj(currentObj);


			currentCanvasElement = null;
		}

		


		var pathT = new Tool();
		this.tools.set("path",pathT);
		
		pathT.onMouseDown = function(event){
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};
			id++;
			currentObj=new PathC(id,canvasRadius, canvasColor,j.downPoint,false);
			shapesArr.push(currentObj);
			
			var shape = new Path();
			shape.strokeColor = canvasColor;
			shape.strokeWidth=canvasRadius;
			shape.strokeCap = 'round';
			shape.smooth();
			shape.moveTo(new Point(j.downPoint));
			currentCanvasElement=shape;
			

			shapesMap.set(id,{paper:shape,obj:currentObj});
			emitEventCanvas("mouseDown",j);

		}

		

		pathT.onMouseMove = function(event){

			if(currentCanvasElement!=null){
				var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};			// console.log(j);
			// // socket.emit("canvas",{action:"event",type:"mouseMove",data:j});
			emitEventCanvas("mouseMove",j);
			currentObj.append(j.point);
			currentCanvasElement.lineTo(new Point(j.point));
			}
		}

		
		pathT.onMouseUp = function(event){
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};			// console.log(j);
			// // socket.emit("canvas",{action:"event",type:"mouseUp",data:j});
			emitEventCanvas("mouseUp",j);

			currentCanvasElement.simplify();
			canvasElements.push(currentCanvasElement);
			currentCanvasElement = null;


			currentObj.append(j.point);
			currentObj.setFinished(true);

			uploadObj(currentObj);
		}
		// pathTool();

		this.setTool('path');
		this.initialized=true;


	}

	undo(sendToServer=true)
	{
		if(sendToServer)
		{
			id++;
			let temp=new UndoC(id);
			uploadObj(temp);
		}
		

		// socket.emit("canvas",{action:"undo"});
		appendHistory({a:"undo"});
		// his.push();
		// socket.send({app:"paper",method:"rem",data:null});
		if(canvasElements.length>0)
		{
			var p =canvasElements.pop();
			p.remove();
			
		}
		else
		{
			console.log("recent is empty");
		}
		
	}
}

	window.onload = function() 
	{
		console.log("onload called");
		window.canvas=new Canvas();
		paper.install(window);
		var scope = new paper.PaperScope();
		window.scope=scope;
		window.canvas.initialize(scope);
	}

	//to be linked to a button
	function selectTool(tool){
		
		if(window.canvas){
			// console.log("tool selected: "+tool);
			window.canvas.setTool(tool);
			return true;
		}
		else
		{
			return false;
		}
		
	}

	//to be linked to a button
	function setRadius(radius){
		console.log("radius: "+radius);
		if(window.canvas){
			window.canvas.setRadius();
			//socket.emit("canvas",{action:"radius",data:{radius:radius}});
		}
		
	}

	//to be linked to a button
	function setColor(color){
		console.log("color: "+color);
		if(window.canvas){
			window.canvas.setColor(color);
			//socket.emit("canvas",{action:"color",data:{color:color}});
		}
		
	}

	//to be linked to a button
	function undo(){
		console.log("undo");
		if(window.canvas){
			window.canvas.undo();
			//socket.emit("canvas",{action:"undo"});
		}
		
	}
	function emitEventCanvas(event,data)
	{
		if(data==null)
		{
			console.log("problem");
		}
		//console.log("emmiting "+data);

		appendHistory({a:"event",t:event,d:data});
		// his.push();
		// socket.emit("canvas",{a:"event",t:event,d:data});
	}

	function saveStateToServer(directoryId,fileID,data=his)
	{
		webRequestFetchData('/directories/files/save/'+directoryId+"/"+fileID,"POST",{data:data}).then(data => console.log(data.message));
	}


	//called once in the beginning so it should enable the controllerForUploads
	function getStateFromServer(directoryId,fileID)
	{
		dId=directoryId;
		fId=fileID;
		webRequestFetchData('/directories/files/retrieve/'+directoryId+"/"+fileID,"GET").then(data =>{
			// console.log("executing: "+JSON.stringify(data.data.data));
			var d=data.data.data;
			his=[];
			for(var i =0 ; i< d.length; i++)
			{
				//console.log("executing:"+i);
				window.canvas.drawObj(d[i]);
				//his=data;
			}
		});
		currentCanvasElement=null;
		// controllerForUploads=true;
		// uploadPosition=his.length;
	}

	function clearState(directoryId,fileID){
		let t=confirm("Sure about deleting all..?");
		if(t)
		{
			while(canvasElements.length>0)
		{
			window.canvas.undo();
		}
		his=[];

		dId=directoryId;
		fId=fileID;

		shapesArr=[];
		shapesMap=new Map();

		currentObj=null;
		
		
		uploadPosition=0;
		console.log("cleared");
		window.canvas.setColor("white");
		window.canvas.setRadius(3);
		window.canvas.setTool("path");

		webRequestFetchData('/directories/files/clear/'+directoryId+"/"+fileID,"GET").then(data =>{
			// console.log("executing: "+JSON.stringify(data.data.data));
			console.log(data);
			// var d=data.data.data;
			// his=[];
			// for(var i =0 ; i< d.length; i++)
			// {
			// 	//console.log("executing:"+i);
			// 	window.canvas.drawObj(d[i]);
			// 	//his=data;
			// }
		});
		}
		else{
			console.log("cancelled");
		}
		

	}

	async function webRequestFetchData(url = '',method="POST", data = {}) {
		// Default options are marked with *
		if(method=="POST" || method=="post")
		{
			const response = await fetch(url, {
				method: method, // *GET, POST, PUT, DELETE, etc.
				mode: 'cors', // no-cors, *cors, same-origin
				cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
				credentials: 'same-origin', // include, *same-origin, omit
				headers: {
				  'Content-Type': 'application/json'
				  // 'Content-Type': 'application/x-www-form-urlencoded',
				},
				redirect: 'follow', // manual, *follow, error
				referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
				body:JSON.stringify(data) // body data type must match "Content-Type" header
			  });
			  return response.json(); // parses JSON response into native JavaScript objects

		}
		
	  
	  else{
		const response = await fetch(url, {
			method: method, // *GET, POST, PUT, DELETE, etc.
			mode: 'cors', // no-cors, *cors, same-origin
			cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
			credentials: 'same-origin', // include, *same-origin, omit
			headers: {
			  'Content-Type': 'application/json'
			  // 'Content-Type': 'application/x-www-form-urlencoded',
			},
			redirect: 'follow', // manual, *follow, error
			referrerPolicy: 'no-referrer' // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
			 // body data type must match "Content-Type" header
		  });
		  return response.json(); // parses JSON response into native JavaScript objects
	  }

	}

	window.addEventListener("offline", (event) => {
		networkStatus=false;
		console.log("network offline");
	  });
	  
	window.addEventListener("online", (event) => {
		networkStatus=true;
		console.log("network online");
		// checkForUploads();
	  });

	// function checkForUploads(){
	// 	console.log("checking for uploads");
	// 	if(controllerForUploads && (his.length - uploadPosition > requestLimit))
	// 	{
	// 		uploadContent();
	// 		return true;
	// 	}
	// 	else{
	// 		return false;
	// 	}
	// }


	function uploadContent(){
		console.log("uploading content");
		//loop through the his(history) array and make chunks of 100 length data and push them to the server
	//   var i = uploadPosition;
		while(his.length - uploadPosition > requestLimit)
		{
			data=his.splice(uploadPosition,requestLimit);
			console.log("saving: "+uploadPosition);
			// console.log(data);
			saveStateToServer(dId,fId,data);
			uploadPosition+=requestLimit;
		}
	}

	function uploadObj(shapeObj){
		console.log("uploading obj");
		//loop through the his(history) array and make chunks of 100 length data and push them to the server
	//   var i = uploadPosition;
		var data=JSON.stringify(shapeObj);
		saveStateToServer(dId,fId,data);
	}



	function appendHistory(data)
	{
		console.log("appending history");
		his.push(data);
		if(networkStatus)
		{
			// checkForUploads();
		}
	}



	  
	//   postData('https://example.com/answer', { answer: 42 })
	// 	.then(data => {
	// 	  console.log(data); // JSON data parsed by `data.json()` call
	// 	});
//start here till end
// getPercentagePoint(event)
// 	{
// 		// console.log(JSON.stringify(event));
// 		let p=event.point;
// 		// p.x=(p.x)/w;
// 		// p.y=(p.y)/h;

// 		let dp=event.downPoint
// 		// dp.x=(dp.x)/w;
// 		// dp.y=(dp.y)/h;
// 		let pobj={point:p,downPoint:dp}
// 		//console.log(pobj.point.x);
// 		return pobj;
// 	}


//end

