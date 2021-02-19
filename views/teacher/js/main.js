function display(id)
{
	if(socket!=null)
	{
		socket.emit("control",{action:"screen",screen:id});
	}
	
	console.log(id);
	var t=document.getElementById("content");
	var count=t.children['length'];
	for(var i = 0; i<count ; i++)
	{
		t.children[i].classList.toggle("invisible", true);
		t.children[i].classList.toggle("visible", false);
	}
	document.getElementById(id).classList.toggle("visible", true);
	document.getElementById(id).classList.toggle("invisible", false);
}


function sendFile(){
	var path=document.getElementById("file_upload_form").action;

	var files=document.getElementById("file_upload_input");
	var method="post";

	var formData = new FormData(); // Currently empty

	formData.append('data', files.files[0], files.files[0].fileName);

	makeAjax(path,method,formData);




	// fetch(path,{
	// 	method:method,
	// 	body: formData
	// }).then(function(data){
	// 	console.log(data.blob().then(d=> console.log(d.text())));
	// });

	// console.log(result.json());

	// result.then(()=> {})

	// alert('The file has been uploaded successfully.');

	
}


function makeAjax(url,method,data){
var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            //alert("something"+this.status);
            if (this.readyState == 4 && this.status == 200) {
                // alert(this.responseText);
                var obj = JSON.parse(this.responseText);
                // // var obj = this.responseText;
                alert(obj.message);
                
    //             if(obj.status == "success")
				// {
				// 	alert(obj.message);
				// }
				// else
				// {
				// 	fFunction(obj.message);
				// }

            }
        };
        xmlhttp.open(method, url, true);
        xmlhttp.send(data);
                                        
} 


