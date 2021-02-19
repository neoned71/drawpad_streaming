class Chat{
	constructor(){
		this.chats=[];
		console.log("chat initialized");
    this.display=false;
    //have to think of a place to place users!
    this.users=new Map();
	}


  insertChat(chatObj)
  {
    // let chat = chatObj.chat;
    // let chatCount=chatObj.chatCount;
    // let authorId = chatObj.userId;
    // let timestamp= chatObj.timestamp;
    if(socket!=null && chatObj)
    {
      // this.questions.set(question.id,question);
      this.chats.push(chatObj);
      updateUIChat();
      return true;
    }
    else
    {
      return false;
    }
  }

   createChat(text)
  {
    let chat ={};
    chat.text=text;
    if(socket!=null)
    {
      socket.emit("chat",{action:"insert",data:{chat:chat}});
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
    //hide the modal for question!
  }

   toggleDisplay(){
    if(!this.display)
    {
      this.display=true;
      document.getElementById("chat_container").style.display="block";
    }
    else
    {
      this.display=false;
      document.getElementById("chat_container").style.display="none";
    }
  }


}
  

window.chat=new Chat();

function updateUIChat(){
	//update ui for when the questions list updates!
}