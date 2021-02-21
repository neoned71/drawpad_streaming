canvasElements = [];
currentCanvasElement=null;
currentObj=null;
canvasRadius=4;
networkStatus=true;
controllerForUploads=false;
his=[];
shapesArr=[];
shapesMap= new Map();
id=500*(Math.floor(Math.random()*10)*Math.floor(Math.random()*100));
console.log(id);

uploadPosition=0;
fId=fileId;
dId=roomId;
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
			// appendHistory({a:"tool",d:{tool:tool}});
			// his.push();
			//socket.emit("canvas",{action:"tool",data:{tool:tool}});
		}
	}

	

	setRadius(radius)
	{
		canvasRadius=radius;
		// appendHistory({a:"radius",d:{radius:radius}});
		// his.push();
	}

	setColor(color)
	{
		canvasColor=color;
		// appendHistory({a:"color",d:{color:color}});
		// his.push();
	}

	drawPath(obj,phase,realtime=false)
	{
		console.log(phase);
		// console.log(obj);
		switch(phase){
			case 0:
				var temp=new PathC(obj.id,obj.thickness,obj.color,obj.data,true);
				shapesArr.push(temp);	
				var shape = new Path();
				shape.strokeColor = obj.color;
				shape.strokeWidth=obj.thickness;
				shape.strokeCap = 'round';
				shape.moveTo(new Point(obj.data[0]));
				shapesMap.set(obj.id,{paper:shape,obj:temp});
				break;
			case 1:
				if(shapesMap.has(obj.id))
				{
					var shape = shapesMap.get(obj.id).paper;
					if(realtime)
					{
						var tmp=new Point(obj.data[obj.data.length-1]);
						shape.lineTo(tmp);
						// shape.moveTo(tmp);
					}
					else{
						for(var i =0 ; i< obj.data.length; i++){
							shape.lineTo(obj.data[i]);
						}
					}
				}
				break;
			case 2:
				if(shapesMap.has(obj.id))
				{
					var shape = shapesMap.get(obj.id).paper;
					var temp = shapesMap.get(obj.id).obj;
					shape.simplify();
					canvasElements.push(shape);
					shapesArr.push(obj);
				}
				break;
			}
	}


	drawLine(obj,phase)
	{
		console.log(phase);
		console.log(obj);
		switch(phase){
			case 0:
				var temp=new LineC(obj.id,obj.thickness,obj.color,obj.data,true);
				shapesArr.push(temp);
				var from=new Point(obj.data[0]);
				var to = new Point(obj.data[0]);
				var shape = new Path.Line(from,to);
				shape.strokeColor = obj.color;
				shape.strokeWidth=obj.thickness;
				shape.strokeCap = 'round';
				// shape.moveTo(new Point(obj.data[0]));
				shapesMap.set(obj.id,{paper:shape,obj:temp});
				break;
			case 1:
				if(shapesMap.has(obj.id))
				{
					var shape = shapesMap.get(obj.id).paper;
					var tmp=new Point(obj.data[obj.data.length-1]);
					shape.segments[1].point=tmp;
				}
				break;
			case 2:
				if(shapesMap.has(obj.id))
				{
					var shape = shapesMap.get(obj.id).paper;
					var temp = shapesMap.get(obj.id).obj;
					// shape.simplify();
					var tmp=new Point(obj.data[obj.data.length-1]);
					shape.segments[1].point=tmp;
					canvasElements.push(shape);
					shapesArr.push(obj);
				}
				break;
			}
		}


	drawCircle(obj,phase)
	{
		
		
		switch(phase){
			case 0:
				console.log("c:"+phase);
				currentObj=new CircleC(id,canvasRadius, canvasColor,obj.data[0],false);
				shapesArr.push(currentObj);

				var shape= new Shape.Circle(obj.data[0],1);
				// currentCanvasElement=shape;
				shape.strokeCap = 'round';
				shape.strokeColor = canvasColor;
				shape.strokeWidth=canvasRadius;
				shapesMap.set(obj.id,{paper:shape,obj:currentObj});
				break;
			case 1:
				if(shapesMap.has(obj.id))
				{
					
					var shape = shapesMap.get(obj.id).paper;
					// console.log(shape);
					shape.radius=obj.radius;
				}
				break;
			case 2:
				if(shapesMap.has(obj.id))
				{
					var shape = shapesMap.get(obj.id).paper;
					shape.radius=obj.radius;
					console.log("c r "+obj.radius);
					canvasElements.push(shape);
					shapesArr.push(obj);
					// currentCanvasElement=null;
				}
				// else{
				// 	console.log("sdas");
				// }
				break;
			}
		}


		drawUndo()
		{
			this.undo(false);
		}
	

	drawObj(obj)
	{
		if(obj.type=="p")
		{
			this.drawPath(obj,0);
			this.drawPath(obj,1);
			this.drawPath(obj,2);
			
		}
		else if(obj.type=="c")
		{
			// console.log(obj);
			this.drawCircle(obj,0);
			this.drawCircle(obj,2);
			// console.log("drawing circle");
			// var temp=new CircleC(obj.id,obj.thickness,obj.color,obj.data,true);
			// shapesArr.push(temp);
			// console.log(obj.data);
			// var from=new Point(obj.data[0]);//center
			// // var to = new Point(obj.data[1]);
			// var radius=obj.radius;
			// var shape = new Shape.Circle(from,radius);
			// shape.strokeColor = obj.color;
			// shape.strokeWidth=obj.thickness;
			// shape.strokeCap = 'round';




			// shapesMap.set(obj.id,{paper:shape,obj:temp});
			// canvasElements.push(shape);
			// shapesArr.push(temp);
		}
		else if(obj.type=="l")
		{

			this.drawLine(obj,0);
			this.drawLine(obj,2);
			// var temp=new LineC(obj.id,obj.thickness,obj.color,obj.data,true);
			// shapesArr.push(temp);
			// var from=new Point(obj.data[0]);
			// var to = new Point(obj.data[1]);
			// var shape = new Path.Line(from, to);
			// shape.strokeColor = obj.color;
			// shape.strokeWidth=obj.thickness;
			// shape.strokeCap = 'round';
			// shapesMap.set(obj.id,{paper:shape,obj:temp});
			// canvasElements.push(shape);
			// shapesArr.push(temp);
		}

		else if(obj.type=="u")
		{
			this.drawUndo();
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
			// emitEventCanvas("mouseDown",j);
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
			emitEventCanvas(currentObj,0);

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
				currentObj.radius=radius;
				emitEventCanvas(currentObj,1);
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
			// emitEventCanvas("mouseUp",j);
			var dp = new Point(j.downPoint);
			var p=new Point(j.point);
			var radius=dp.subtract(p).length;
			currentObj.radius=radius;
			// console.log(radius);
			var shape=currentCanvasElement;		
			// var j=({j:event.point,downPoint:j.downPoint});
			// emitEventCanvas("mouseMove",j);
			shape.radius=radius;

			// var shape=currentCanvasElement;
			console.log("radius:"+shape.radius);
			canvasElements.push(shape);
			currentCanvasElement = null;

			// currentObj.append(j.point);
			currentObj.setFinished(true);
			console.log(currentObj);
			uploadObj(currentObj);
			emitEventCanvas(currentObj,2);
		
		}


		var lineT = new Tool();
		this.tools.set("line",lineT);
		
		lineT.onMouseDown = function(event){
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};			// console.log(j);
				// socket.send({app:"paper",method:"circleT.onMouseDown",data:j});
			// socket.emit("canvas",{action:"event",type:"mouseDown",data:j});
			// emitEventCanvas("mouseDown",j);
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
			emitEventCanvas(currentObj,0);
		}

		lineT.onMouseMove = function(event){

			if(currentCanvasElement!=null){
				// var j=(event);
			// console.log(j);
				// socket.send({app:"paper",method:"circleT.onMouseDown",data:j});
			// socket.emit("canvas",{action:"event",type:"mouseMove",data:j});
			// emitEventCanvas("mouseMove",j);

			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};
			
				var p=new Point(event.point);
				//var radius=dp.subtract(p).length;
				var shape=currentCanvasElement;
				//console.log(shape);
				currentObj.data[1]=j.point;
				shape.segments[1].point=p;
				emitEventCanvas(currentObj,1);
			}
			
		}

		lineT.onMouseUp = function(event){
			var shape=currentCanvasElement;
			// var j={ point : event.point, downPoint : event.downPoint };
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};			// console.log(j);

			// // socket.emit("canvas",{action:"event",type:"mouseUp",data:j});
			var p=new Point(j.point);
			currentObj.data[1]=(j.point);
			shape.segments[1].point=p;
			// emitEventCanvas("mouseUp",j);
			canvasElements.push(shape);
			// currentObj.append(j.point);
			currentObj.setFinished(true);
			uploadObj(currentObj);
			currentCanvasElement = null;
			emitEventCanvas(currentObj,2);
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
			emitEventCanvas(currentObj,0);
		}

		

		pathT.onMouseMove = function(event){

			if(currentCanvasElement!=null){
				var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};
				emitEventCanvas(currentObj,1);
				currentObj.append(j.point);
				currentCanvasElement.lineTo(new Point(j.point));
			}
		}

		
		pathT.onMouseUp = function(event){
			var j={point:{x:event.point.x,y:event.point.y},downPoint:{x:event.downPoint.x,y:event.downPoint.y}};
			emitEventCanvas(currentObj,2);

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
			emitEventCanvas(temp);
		}
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

	executeAction(data){
		var obj=data.obj;
		var phase = data.phase;
		if(obj.type=="p")
		{
			this.drawPath(obj,phase,true);
			console.log("creating path element");
		}
		if(obj.type=="c")
		{
			this.drawCircle(obj,phase);
			console.log("creating circle element");
		}

		if(obj.type=="l")
		{
			this.drawLine(obj,phase);
			console.log("creating line element");
		}

		if(obj.type=="u")
		{
			this.drawUndo();
			console.log("creating undo element");
		}

		if(obj.type=="clr")
		{
			window.canvas.clearState(false);
			console.log("clearing all");
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
		window.a();
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
			
		}
		
	}
	function emitEventCanvas(obj,phase=0)
	{
		// if(data==null)
		// {
			// console.log("problem");
		// }
		socket.emit("canvas",{obj:obj,phase:phase});
		// socket.emit("canvas",{obj:})
		
	}

	function saveStateToServer(directoryId,fileId,data=his)
	{
		console.log(directoryId+"::::"+fileId);
		webRequestFetchData('/room_api/files/save/'+directoryId+"/"+fileId,"POST",{data:data}).then(data => console.log(data.message));
	}


	function getStateFromServer(directoryId,fileId)
	{
		dId=roomId;
		fId=fileId;
		console.log("getting state!!");
		webRequestFetchData('/room_api/files/retrieve/'+directoryId+"/"+fileId,"GET").then(data =>{
			console.log(data);
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

	}

	function clearState(emit=true){
		let t=confirm("Sure about deleting all..?");
		
		if(t)
		{
			while(canvasElements.length>0)
			{
				window.canvas.undo();
			}
			his=[];

			dId=roomId;
			fId=fileId;

			shapesArr=[];
			shapesMap=new Map();

			currentObj=null;
			currentCanvasElement=null;
			window.canvas.setColor("white");
			window.canvas.setRadius(3);
			window.canvas.setTool("path");

			webRequestFetchData('/room_api/files/clear/'+directoryId+"/"+fileId,"GET").then(data =>{
				console.log(data);
			});
			if(emit)
			{
				emitEventCanvas({type:"clr"});
			}
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
	  });


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


	

