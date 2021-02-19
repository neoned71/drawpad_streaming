const bcrypt = require("bcrypt");
const User = require("../node_models/users");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { v4: uuidv4 } = require('uuid');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
    	// console.log("setup.js:desialize:"+err);
        done(err, user);
    });
});


passport.use(
    new LocalStrategy({ usernameField: "email",passwordField:"access_token",passReqToCallback : true }, (req,email, access_token, done) => {
        // Match User
        console.log("setup.js: inside localstrategy");
                User.findOne({ email: email }).then(user => {
                if (!user) {
                	console.log("setup.js:user not found,creating");
                    const newUser = new User({ email:email,token:uuidv4(), access_token:access_token, name:req.body.name, image_url:req.body.image_url});
                    // Hash password before saving in database
                    newUser
	                    .save()
	                    .then(user => {
	                        return done(null, user);
	                    })
	                    .catch(err => {
	                    	console.log("setup.js:");
	                        return done(null, false, { message: err });
	                    });
                    
                } else {
                    console.log("setup.js:user found");
                    user.token=uuidv4();
                    return done(null, user);
                }
            })
            .catch(err => {
            	console.log("setup.js:"+err);
                return done(null, false, { message: err });
            });
    })
);

module.exports = passport;
