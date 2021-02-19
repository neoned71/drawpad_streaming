canvasElements = [];
currentCanvasElement=null;
canvasRadius=1;
canvasColor="white";
class Canvas{
	constructor(){
		// this.paper=paper;
		this.initialized=false;
		this.tools=new Map();
		this.tool=null;
		// this.elements=[];
		currentCanvasElement=null;
		
	}
	

	// getPercentagePoint(event)
	// {
	// 	// console.log(JSON.stringify(event));
	// 	let p=event.point;
	// 	// p.x=(p.x)/w;
	// 	// p.y=(p.y)/h;

	// 	let dp=event.downPoint
	// 	// dp.x=(dp.x)/w;
	// 	// dp.y=(dp.y)/h;
	// 	let pobj={point:p,downPoint:dp}
	// 	//console.log(pobj.point.x);
	// 	return pobj;
	// }
	setCanvas(canvas)
	{
		console.log(this.initialized);
		if(this.initialized)
		{
			this.setTool(canvas.tool);
			this.setColor(canvas.color);
			this.setRadius(canvas.radius);
			this.actions=canvas.actions;
			for(var i of this.actions)
			{
				executeAction(i);
			}
		}
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
			socket.emit("canvas",{action:"tool",data:{tool:tool}});
		}
	}

	

	setRadius(radius)
	{
		canvasRadius=radius;
	}

	setColor(color)
	{
		canvasColor=color;
	}

	executeEvent(event)
	{
		// this.paper
		if(this.toolSelected)
		{
			if(event.type=="mouseDown")
			{
				this.tools.get(this.tool).onMouseDown(event.data);
			}
			else if(event.type=="mouseMove")
			{
				this.tools.get(this.tool).onMouseMove(event.data);
			}
			else if(event.type=="mouseUp")
			{
				this.tools.get(this.tool).onMouseUp(event.data);
			}
		}
	}

	executeAction(action)
	{
		if(action.action=="tool")
		{
			this.setTool(action.data.tool);
		}
		else if(action.action=="event")
		{
			this.executeEvent(action);
		}
		else if(action.action=="radius")
		{
			this.setRadius(action.data.radius);
		}
		else if(action.action=="color")
		{
			this.executeEvent(action.data.color);
		}
		else if(action.action=="undo")
		{
			this.undo();
		}
	}

	
	initialize(paper,canvasId="myCanvas")
	{
		this.paper=paper;
		// Get a reference to the canvas object
		var canvas = document.getElementById(canvasId);
		// console.log(canvas);
		// Create an empty project and a view for the canvas:
		this.paper.setup(canvas);

		

		var circleT = new Tool();
		this.tools.set("circle",circleT);

		circleT.onMouseDown = function(event){
			console.log("c");
			var j=getPercentagePoint(event);
			console.log(j);
			// socket.emit("canvas",{action:"event",type:"mouseDown",data:j});
			emitEventCanvas("mouseDown",j);
			console.log("g");
			var center = new Point(event.point);
			var shape= new Shape.Circle(event.downPoint,0);
			currentCanvasElement=shape;
			shape.strokeColor = canvasColor;
			shape.strokeWidth=canvasRadius;
			}

		

		circleT.onMouseMove = function(event){
			// i++;
			if(currentCanvasElement!=null){
				var dp = new Point(event.downPoint);
				var p=new Point(event.point);
				var radius=dp.subtract(p).length;
				console.log(radius);
				var shape=currentCanvasElement;
				
				var j=getPercentagePoint(event);
				emitEventCanvas("mouseMove",j);
				shape.radius=radius;
				// console.log(j);
				

				// console.log(shape);
				// shape.strokeColor = canvasColor;
				// shape.strokeWidth=canvasRadius;
			}
		}

		



		circleT.onMouseUp = function(event){
			var j=getPercentagePoint(event);
			console.log(j);
				// socket.send({app:"paper",method:"circleT.onMouseDown",data:j});
			// socket.emit("canvas",{action:"event",type:"mouseUp",data:j});
			emitEventCanvas("mouseUp",j);

			var shape=currentCanvasElement;
			console.log(shape);
			canvasElements.push(shape);
			currentCanvasElement = null;
		
		}


		var lineT = new Tool();
		this.tools.set("line",lineT);
		
		lineT.onMouseDown = function(event){
			var j=getPercentagePoint(event);
			console.log(j);
				// socket.send({app:"paper",method:"circleT.onMouseDown",data:j});
			// socket.emit("canvas",{action:"event",type:"mouseDown",data:j});
			emitEventCanvas("mouseDown",j);
			//var path = new Path();
			
			var from=new Point(event.downPoint);
			var to = new Point(event.downPoint);
			var shape = new Path.Line(from, to);
			// path.strokeColor = penColor;
			// console.log(path);
			currentCanvasElement=shape;
			console.log(currentCanvasElement==null);
			shape.strokeColor = canvasColor;
			shape.strokeWidth=canvasRadius;
			shape.smooth();
			//shape.strokeColor = 'black';
		}

		lineT.onMouseMove = function(event){

			if(currentCanvasElement!=null){
				var j=getPercentagePoint(event);
			console.log(j);
				// socket.send({app:"paper",method:"circleT.onMouseDown",data:j});
			// socket.emit("canvas",{action:"event",type:"mouseMove",data:j});
			emitEventCanvas("mouseMove",j);
			
				var p=new Point(event.point);
				//var radius=dp.subtract(p).length;
				var shape=currentCanvasElement;
				//console.log(shape);
				shape.segments[1].point=p;
			}
			
		}

		lineT.onMouseUp = function(event){
			var shape=currentCanvasElement;
			var j={ point : event.point, downPoint : event.downPoint };
			console.log(j);

			// socket.emit("canvas",{action:"event",type:"mouseUp",data:j});
			
			emitEventCanvas("mouseUp",j);
			
			//console.log(shape);
			
			canvasElements.push(shape);
			currentCanvasElement = null;
		}

		


		var pathT = new Tool();
		this.tools.set("path",pathT);
		
		pathT.onMouseDown = function(event){
			var j=(getPercentagePoint(event));
			console.log(j);
			// socket.emit("canvas",{action:"event",type:"mouseDown",data:j});
			emitEventCanvas("mouseDown",j);
			var shape = new Path();
			shape.strokeColor = canvasColor;
			shape.strokeWidth=canvasRadius;
			// path.strokeColor = penColor;
			shape.smooth();
			shape.moveTo(new Point(event.downPoint));
			// console.log(path);
			currentCanvasElement=shape;
			// path.strokeWidth=penRadius;
			//shape.strokeColor = 'black';
		}

		

		pathT.onMouseMove = function(event){

			if(currentCanvasElement!=null){
				var j=(getPercentagePoint(event));
			console.log(j);
			// socket.emit("canvas",{action:"event",type:"mouseMove",data:j});
			emitEventCanvas("mouseMove",j);
			currentCanvasElement.lineTo(new Point(event.point));
			}
		}

		
		pathT.onMouseUp = function(event){
			var j=(getPercentagePoint(event));
			console.log(j);
			// socket.emit("canvas",{action:"event",type:"mouseUp",data:j});
			emitEventCanvas("mouseUp",j);
			currentCanvasElement.simplify();
			canvasElements.push(currentCanvasElement);
			currentCanvasElement = null;
		}
		// pathTool();

		this.setTool('path');
		this.initialized=true;


	}

	undo()
	{
		socket.emit("canvas",{action:"undo"});
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
		window.canvas.initialize(window.paper);
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
			socket.emit("canvas",{action:"radius",data:{radius:radius}});
		}
		
	}

	//to be linked to a button
	function setColor(color){
		console.log("color: "+color);
		if(window.canvas){
			window.canvas.setColor(color);
			socket.emit("canvas",{action:"color",data:{color:color}});
		}
		
	}

	//to be linked to a button
	function undo(){
		console.log("undo");
		if(window.canvas){
			window.canvas.undo();
			socket.emit("canvas",{action:"undo"});
		}
		
	}


	function emitEventCanvas(event,data)
	{
		//console.log("emmiting "+data);
		socket.emit("canvas",{action:"event",type:event,data:data});
	}