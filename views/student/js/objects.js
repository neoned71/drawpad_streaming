class Grapher{
	constructor(eqtn){
		this.equation=eqtn;
	}

	set(equation)
	{
		this.equation=equation;
		return true;
	}
	
	get(){
		return {data:this.equation};
	}

	getState(){
		return get();
	}

}

class Canvas{
	constructor(){
		// this.paper=paper;
		this.initialized=false;
	}
	
	setCanvas(canvas)
	{
		if(this.initialized)
		{
			this.setTool(canvas.tool);
			this.setColor(canvas.color);
			this.setRadius(canvas.radius);
			this.events=canvas.events;
			for(var i of this.events)
			{
				executeEvent(i);
			}
		}
		
		// this.initialized=true;
	}

	setPaper(paper)
	{
		if(!paper)
		{
			return false;
		}
		else
		{
			this.paper=paper;
			this.initialized=true;
		}
	}

	setTool(tool)
	{
		this.tool=tool;
	}

	setRadius(radius)
	{
		this.radius=radius;
	}

	setColor(color)
	{
		this.color=color;
	}

	executeEvent(event)
	{
		// this.paper
	}
	
	// get(){
	// 	return {data:this.equation};
	// }

	// getState(){
	// 	return get();
	// }

}
