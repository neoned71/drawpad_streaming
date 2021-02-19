w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;


class Grapher{
  constructor(){
    this.plot("x^2+sin(x)");
  }

  plot(equation)
  {
    this.equation=equation;

    // if(socket!=null)
    //     {
    //       socket.emit("grapher",{action:"plot",data:{equation:equation}});
    //     }
        
        var canvs =document.getElementById("canv");
        canv.innerHTML="";
        let d=[];
        let derivative = null;
        for (var x of equation.split(",")){
          derivative = null;
          if(x.includes(":d"))
          {
            // console.log("coming inside derivative:"+x);
            x=x.replace(":d","");
            // console.log("coming inside derivative:"+x);

            derivative={fn: pmath.derivative(x,'x').toString(),updateOnMouseMove: true};
            // x=x.substr(0,x.length-2);

            console.log("plotting: "+x);
          }
          
          
            let t={
                    fn: x,
                     derivative: derivative
                        };
            d.push(t);

        }
        console.log(d);

        this.fpInstance = functionPlot({
        target: '#canv',
        title:equation,
        grid:true,
        width:(w*0.9),
        height:(h*0.9),
      data:d
      });


      this.fpInstance.on("mousemove",this.mouseMove);


    return true;
  }

  mouseMove(data){
    // if(socket!=null)
    // {
    //   socket.emit("grapher",{action:"event",type:"mousemove",data:data});
    // }
    // else
    // {
    //   console.log("socket is null");
    // }
    
  }

   emit(event,data)
      {
        //locally simulate the event
        if(this.fpInstance!==null)
        {
          console.log("emitting: "+event);
          this.fpInstance.emit(event,data);
        }
      }



}
      
  window.grapher=new Grapher();  