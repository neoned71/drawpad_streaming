function display(id)
{
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