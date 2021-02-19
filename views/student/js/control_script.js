class Control{
  constructor(){
    this.screen="video";
    this.status="running";
    
  }


  setScreen(screen)
  {
    window.display(screen);

  }
  

  setStatus(status)
  {
    console.log("setting status");

  }



}


  

window.control=new Control();



