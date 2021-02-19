class Questions{
	constructor(){
		this.questions=new Map();
		console.log("questions initialized");
    this.display=false;
    this.current=null;
    this.disclose=false;
    
	}

	attemptInsertQuestion(question)
	{
    //{question_id,local_question_id,image,content,options[],correctAns,display,disclose=false}
    // console.log(question);
    if(socket!=null && question)
    {
    	console.log(question);
      socket.emit("question",{action:"attempt_insert",data:{question:question}});
      return true;
    }
    else
    {
      return false;
    }
 
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
			socket.send("question",{action:"set",data:{id:id}});
      return true;
		}
		else
		{
			console.log("show:q not found"+id);
      return false;
		}
	}

  show(){
    socket.send("question",{action:"show"});
    updateUIQuestion();
  }

  hide(){
    //hide the modal for question!
    socket.send("question",{action:"hide"});
    updateUIQuestion();
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

    toggleDisplay(){
    if(!this.display)
    {
      this.display=true;
      document.getElementById("question_container").style.display="block";
    }
    else
    {
      this.display=false;
      document.getElementById("question_container").style.display="none";
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
    
    // this.chats=status.chats;
    // if(status.chat)
  }


window.questions=new Questions();

function prepareAttemptQuestion()
{
	// what we need out of this function
	// {question.id,question.options;question.text;question.corrrectAnswer;question.timestamp;}
	var question = new Object();
	question.options = [{type:"text",value:"Some value"},{type:"text",value:"Some B value"},{type:"text",value:"Some C value"},{type:"text",value:"Some D value"}];
	question.text="this is a question with random id:"+Math.floor(Math.random()*1000);

	question.corrrectAnswer=2;
	question.timestamp=new Date();

	window.questions.attemptInsertQuestion(question);

	// socket.send("question",{action:"question",data:{question:question}});




}


function updateUIQuestion(){
	//update ui for when the questions list updates!
}