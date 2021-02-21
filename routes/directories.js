const express = require("express");
const Directories = require("../node_models/directories.js");
const Files = require("../node_models/files.js");
const router = express.Router();
// const passport = require("passport");

router.get("/", (req, res, next) => {
    var result=[];
    console.log("yes:"+req.user._id);
    Directories.find({owner:req.user._id},function(err,dir){
        if (err)
        {
          console.log("some error occured:"+err);  
        }
        else{
            result=dir;
            res.status(200).render("pages/directories",{directories:result,user:req.user});
        } 
    });
});

router.post("/create", (req, res, next) => {
    let ownerId=req.user._id;
    let name=req.body.name;
    let ret={message:"",status:"failed"};
    console.log("name: "+name);

    let d=new Directories({name:name,owner:ownerId});
    d.save((err)=>{
        if (err) ret.message="Name already exists!!";
        else {

            console.log("no error occured");
            ret.message="Successfully created";
            ret.status="success";
            // res.redirect("/directories");
        }
        res.json(ret);

    });

});

router.get("/files/:directory", (req, res, next) => {
    var result=[];
    console.log("yes:");
    Files.find({owner:req.user._id,directory:req.params.directory},function(err,files){
        if (err)
        {
          console.log("some error occured:"+err);  
        }
        else{
            result=files;
            res.status(200).render("pages/files",{files:result,user:req.user,directory:req.params.directory});
        } 
    });
});

router.post("/files/create/:directory", (req, res, next) => {
    let ownerId=req.user._id;
    let name=req.body.name;
    let ret={message:"",status:"failed"};

    let f=new Files({name:name,owner:ownerId,directory:req.params.directory,type:"draw"});
    f.save((err)=>{
        if (err) {
            ret.message="error: "+err;
            
    }
        else {
            console.log("no error occured");
            ret.message="Successfully created";
            ret.status="success";
            // res.redirect("/directories/"+req.params.directory);
        }
        res.json(ret);
    });
});


router.get("/files/access/:directory/:file",(req, res, next) => {
    let ownerId=req.user._id;
    // let name=req.body.name;

    Files.findOne({owner:ownerId,directory:req.params.directory,_id:req.params.file},function(err,file){
        if (err) {
            console.log("some error occured"+err);
            res.end();
        }
        else{
            res.status(200).render("pages/drawpad",{directory:req.params.directory,file:file});
        }
    });

});

router.post("/files/save/:directory/:file",(req, res, next) => {
    let ownerId=req.user._id;
    let d=JSON.parse(req.body.data);
    let ret={message:"",status:"failed"};
    Files.findOneAndUpdate({owner:ownerId,directory:req.params.directory,_id:req.params.file},{ $push: { data:d}},function(err){
        if(!err)
        {
            ret.status="success";
            ret.message="saved successfully";
        }
        else
        {
            ret.message="error:"+err;
        }
        
        res.json(ret);
    });

});

router.get("/files/clear/:directory/:file",(req, res, next) => {
    let ownerId=req.user._id;
    // let d=JSON.parse(req.body.data);
    let ret={message:"",status:"failed"};
    Files.findOneAndUpdate({owner:ownerId,directory:req.params.directory,_id:req.params.file},{  data:[] },function(err){
        if(!err)
        {
            ret.status="success";
            ret.message="cleared successfully";
        }
        else
        {
            ret.message="error:"+err;
        }
        
        res.json(ret);
    });

});

// router.post("/files/save/:directory/:file",(req, res, next) => {
//     let ownerId=req.user._id;
//     let data=req.body.data;
//     let ret={message:"",status:"failed"};
//     Files.findOneAndUpdate({owner:ownerId,directory:req.params.directory,_id:req.params.file},{data:data},function(err){
//         if(!err)
//         {
//             ret.status="success";
//             ret.message="saved successfully";
//         }      
//         res.json(ret);
//     });
// });



router.get("/files/retrieve/:directory/:file",(req, res, next) => {
    // let ownerId=req.user._id;
    let ret={message:"",status:"failed"};
    Files.findOne({directory:req.params.directory,_id:req.params.file},function(err,file){
        if(!err)
        {
            ret.status="success";
            ret.data=file;
            ret.message="saved successfully";
        }
        
        res.json(ret);
    });

});

module.exports = router;
