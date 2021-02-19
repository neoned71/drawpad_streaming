class Files{
  constructor(){
    this.files=new Map();
    console.log("files initialized");
    this.display=false;
    //have to think of a place to place users!
    // this.users=new Map();
  }


  insertFile(file)
  {
    this.files.set(file.id,file);
    updateUIFiles();

  }

  removeFile(id){
    if(this.files.has(id)){
      this.files.delete(id);
      updateUIFiles();
      return true;
    }
    else
    {
      return false;
    }
  }

  show(){
    this.display=true;
  }

  hide(){
    this.display=false;
  }

  toggleDisplay(){
    if(!this.display)
    {
      this.display=true;
      document.getElementById("files_container").style.display="block";
    }
    else
    {
      this.display=false;
      document.getElementById("files_container").style.display="none";
    }
  }
}
  

window.files=new Files();

function updateUIFiles(){
  //update ui for when the questions list updates!
}


