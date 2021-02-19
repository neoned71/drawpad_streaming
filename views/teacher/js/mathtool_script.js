class Mathtool{
	constructor(){
    this.queries=new Map();
		// this.local_equations=[];
    // this.global_equations=[];
    this.currentEquation=null;
    this.display=false;
    // this.requestStatus();
	}

	calculate(equation)
	{
    //only for teachers
    let computation;
    try{
      computation=pmath.evaluate(equation);
      var query={equation:equation,computation:computation.toString()}
      addCalculation(query);
      if(!Number.isNaN(computation))
      {
        if(socket!=null)
        { 
          socket.emit("mathtool",{action:"calculation",data:{query:query}});
          console.log("math emit");
          //setting the equation to the mathtool
         return true;
        }
        else
        {
          return false;
        }  
      }
      else{
        return false;
      }
    }
    catch(e)
    {
      console.log(e.message);
      return false;
    }

    
	}

  newQuery(query)
  {
        addCalculation(query);
        this.queries.set(query.id,query);
        this.set(query.id);
        // this.currentEquatin=equation;
  }

	set(id)
  {
    if(this.queries.has(id))
    {
      this.currentEquation=id;
    }
    
  }

  getStatus(status)
  {
    this.currentEquatin=status.equation;
    this.set(status.equation);
    // if(status.chat)
  }


}

function addCalculation(query)
{
  document.getElementById("math_solution").innerText=query.computation;
  // document.getElementById("math_solution").value=query.computation;
  console.log(query.id+":"+query.equation+" "+query.computation);
}



window.mathtool=new Mathtool();