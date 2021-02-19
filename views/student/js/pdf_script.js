

class Pdf{
	constructor(){
		this.currentPdf=null;
		this.pdfSet=false;
		this.file=null;
		window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/student/js/pdf.worker.js';
		// this.loadPdf('/pdfs/x64.pdf');
	}

	 loadPdf(pdfName)
	{
		console.log("loading");
		 //const pdfjsWorker = await import('/js/pdf_worker.js');	
		var loadingTask = window.pdfjsLib.getDocument(pdfName);
		loadingTask.promise.then(this.loaded);
	}

 	loaded(pdf) {
			console.log("loaded");
			window.pdf.currentPdf=pdf;
			window.pdf.pdfSet=true;
			window.pdf.pageNum=1;
			window.pdf.numPages=window.pdf.currentPdf.numPages;
			window.pdf.setPage(window.pdf.pageNum);
			}

	setPage(pageNum) {
		if(pageNum<=0 || pageNum > window.pdf.numPages){
			return false;
		}
		this.pageNum=pageNum;
		if(window.pdf.currentPdf){
			window.pdf.currentPdf.getPage(pageNum).then((page)=>{
			console.log(page);
			var scale = 1;
			var viewport = page.getViewport({ scale: scale });

			var canvas = document.getElementById('pdfcanvas');
			var context = canvas.getContext('2d');
			canvas.height = viewport.height;
			canvas.width = viewport.width;

			var renderContext = {
			  canvasContext: context,
			  viewport: viewport
			};
			page.render(renderContext);
			console.log("rendered");
			// return true;
			}).catch(e=>{
				return false;
			});
			
		}
		return true;
		
			
	}

	nextPage()
	{
		return this.setPage(this.pageNum+1);
	}
	prevPage()
	{
		return this.setPage(this.pageNum-1);
	}


}

// function loadPdf(pdfName,page=1)
// {
// 	console.log("loading");
// 	 //const pdfjsWorker = await import('/js/pdf_worker.js');	
// 	pdfjsLib.GlobalWorkerOptions.workerSrc = '/student/js/pdf.worker.js';
// 	var loadingTask = pdfjsLib.getDocument(pdfName);
// 	loadingTask.promise.then(function(pdf) {
// 		console.log("loaded");
// 		currentPdf=pdf;
// 		pdfSet=true;
// 		pdf.getPage(page).then(setPage);
// 		});
// }

// function setPage(page) {
// 			console.log(page);
// 			var scale = 1;
// 			var viewport = page.getViewport({ scale: scale });

// 			var canvas = document.getElementById('pdfcanvas');
// 			var context = canvas.getContext('2d');
// 			canvas.height = viewport.height;
// 			canvas.width = viewport.width;

// 			var renderContext = {
// 			  canvasContext: context,
// 			  viewport: viewport
// 			};
// 			page.render(renderContext);
// 			console.log("rendered");
// 			}

// function nextPage(){
// 	if(pdfSet)
// 	{
// 		console.log("nexting");
// 		currentPdf.nextPage();
// 	}
// }


window.pdf=new Pdf();
window.pdf.loadPdf('/pdfs/x64.pdf');

