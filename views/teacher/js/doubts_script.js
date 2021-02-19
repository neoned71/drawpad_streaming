class Doubts{
	constructor(){
		this.doubts=new Map();
	}

	raise(data)
	{
    //{question_id,local_question_id,image,content,options[],correctAns,display,disclose=false}
    if(socket!=null && data)
    {
      // socket.send("doubt",{action:"insert",data:{chat:chat}});
      if(data.raised)
      {
        //show the raised doubt
        this.doubts.set(data.student.id,data.raised);
      }
      else
      {
        if(this.doubts.has(data.student_id))
        {
          //show message that the student has lowerd its doubt...
          this.doubts.delete(data.student_id);
        }
      }
      
      return true;
    }
    else
    {
      return false;
    }
  
	}


requestStatus(id)
  {
    if(id===null)
    {
      socket.send("query",{action:"doubt",data:{type:"all",id:null}});
    }
    else
    {
      socket.send("query",{action:"doubt",data:{type:"id",id:id}});
    }
    
    // this.chats=status.chats;
    // if(status.chat)
  }

  getStatus(status)
  {
    this.doubts=status.doubts;
    // if(status.chat)
  }

window.doubts=new Doubts();