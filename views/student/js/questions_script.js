class Questions{
	constructor(){
		this.questions=new Map();
		console.log("questions initialized");
    this.display=false;
    this.current=null;
    this.disclose=false;
    
	}

	updateResponses(qId,responseCounts)
	{
		console.log(responseCounts);
		if(this.questions.has(qId)){
			this.questions.get(qId).responseCounts=responseCounts;
			updateUIQuestion();
		}
	}

	mark(qId,index)
	{
		if(this.questions.has(qId)){
			let question = this.questions.get(qId);

			if(question.options.length > index)
			{
				question.mark=index;
				socket.emit("question",{action:"mark",data:{id:qId, response:index}});
			}
		}
	}

	unmark(qId)
	{
		if(this.questions.has(qId) && this.question.get(qId).mark !=-1){
			let question = this.questions.get(qId);
			question.mark=-1;
			socket.emit("question",{action:"unmark",data:{id:qId}});

		}
	}




  insertQuestion(question)
  {
  	// console.log(question);
    //{question_id,local_question_id,image,content,options[],correctAns,display,disclose=false}
    if(socket!=null && question)
    {
      this.questions.set(question.id,question);
      updateUIQuestion();
      return true;
    }
    else
    {
      return false;
    }
  }

	set(id){
		if(this.questions.has(id))
		{
      //change ui to show this question here!
      this.current=this.questions.get(id);
      this.display=true;
      return true;
		}
		else
		{
			console.log("show:q not found"+id);
      return false;
		}
	}


  show(){
    this.display=true;
    updateUIQuestion();
  }

  hide(){
    this.display=false;
    updateUIQuestion();
    //hide the modal for question!
  }

  disclose(id){
    if(this.questions.has(id))
    {
      let q = this.questions.get(id);
      q.disclose=true;
      socket.send("question",{action:"disclose",data:{id:id}});
      return true;
    }
    else
    {
      console.log("disclose:q not found"+id);
      return false;
    }
  }

 remove(id)
    {
      if(this.questions.has(id) && this.questions.get(id)!=current.id)
      {
        this.questions.delete(id);
        updateUIQuestion();
        return true;
      }
      else
      {
        console.log("remove: error");
        return false;
      }
    }
}

function requestStatus(id)
  {
    if(id===null)
    {
      socket.send("query",{action:"question",data:{type:"all",id:null}});
    }
    else
    {
      socket.send("query",{action:"question",data:{type:"id",id:id}});
    }

  }
    
    // this.chats=status.chats;
    // if(status.chat)
  

window.questions=new Questions();

function updateUIQuestion(){
	//update ui for when the questions list updates!
}