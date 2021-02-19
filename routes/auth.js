const express = require("express");
const router = express.Router();
const passport = require("passport");

router.post("/register_login", (req, res, next) => {
    //console.log(req);
    // req.body
    passport.authenticate("local", function(err, user, info) {
        console.log("Entered authenticate");

        if (err) {
            console.log("err authenticate");
            return res.status(400).json({ status:"failed",message: err   });
        }

        if (!user) {
            console.log(info);
            return res.status(400).json({ status:"failed",message: info.message });
        }

        req.logIn(user, function(err) {
            if (err) {
                console.log("err login");
                return res.status(400).json({ status:"failed",message : err });
            }
            console.log("done authenticate");
            return res.status(200).json({ status:"success",message: `logged in ${user.id}` });
        });
    })(req, res, next);
});

module.exports = router;
