const passport      = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User          = require('../models/user.js');

// Local Login Strategy
passport.use(new LocalStrategy({
    usernameField : 'regno',
    passwordField : 'password',
    passReqToCallback : true
  },
  function(req, regno, password, done) {
    User.findOne({ id: regno }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!user.verifyPassword(password, user.password)) { return done(null, false); }
      return done(null, user);
    });
  }
));

// Serialize & Deserialize user for passport
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findOne({id: id}, (err, user) => {
    done(err, user);
  });
});

// middleware to verify if the user is authenticated
module.exports.ensureAuthenticated = (req, res, next) => {
  if(req.isAuthenticated()) {
    next();
  }
  else {
    res.redirect('/');
  }
}

// middleware to redirect user if authenticated
module.exports.AuthenticatedRedirect = (req, res, next) => {
  if(req.isAuthenticated()) {
    res.redirect('/chat');
  }
  else {
    next();
  }
}
