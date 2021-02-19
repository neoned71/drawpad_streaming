class Canvas{
	constructor(){
		// this.current=null;
		// this.canvasList=new Map();
		// let c = new Canvas(canvasId);
		// this.canvasList.set(canvasId,c);
		// this.current=c;
		this.tool="path";
		this.radius=1;
		this.color="white";
		this.events=[];
		this.tools=["path","line","circle"];
		this.actions=[];

		//keeps the track of all the activities!
		this.currentCount=0;

	}

	addAction(action)
	{
		action.count=this.actions.length;
		this.currentCount=action.count;
		// this.count++;
		action.timestamp=new Date();
		action.color=this.color;
		action.tool=this.tool;
		action.radius=this.radius;
		this.actions.push(action);
	}

	setRadius(radius)
	{
		this.radius=radius;
		return true;
	}

	// insertCanvas(canvasId){
	// 	let c = new Canvas(canvasId);
	// 	this.canvasList.set(canvasId,c);
	// 	this.current=c;
	// 	return true;
	// }

	setTool(tool){
		if(this.tools.includes(tool)){
			this.tool=tool;
			return true;
		}
		else
		{
			return false
		}
		
	}

	getTool()
	{
		return this.tool;
	}



	setColor(color){
		this.color=color;
		return true;
	}

	getColor()
	{
		return this.color;
	}


	get(){
		return {data:this};
	}

	getState(){
		return get();
		// return {color:this.getColor(),current:this.current,tool:this.getTool(),radius:this.radius};
	}

	// setCurrent(canvasId){
	// 	this.current=canvasList.get(canvasId);
	// 	return true;
	// 	// this.current=this.canvasList[canIndex];
	// }


	onEvent(event)
	{
		event.color=this.color;
		event.tool=this.tool;
		event.radius=this.radius;
		this.events.push(event);
	}
}


// class Canvas{
// 	constructor(id){
// 		this.id=id;
// 		this.actions=[];
// 	}

// 	insertAction(action){
// 		this.actions.push(action);
// 	}
// }

module.exports = Canvas