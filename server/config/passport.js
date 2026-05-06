const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ========== GOOGLE STRATEGY ==========
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:5000/api/auth/google/callback',
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('📧 Google Profile:', profile.emails[0].value);
        
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }
        
        const randomPassword = Math.random().toString(36).slice(-16);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        user = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          role: 'elder',
          isVerified: true,
          password: hashedPassword
        });
        
        await user.save();
        console.log('✅ Created new user from Google login');
        
        return done(null, user);
      } catch (err) {
        console.error('Google Strategy Error:', err);
        return done(err, null);
      }
    }
  )
);

// ========== FACEBOOK STRATEGY ==========
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: 'http://localhost:5000/api/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails'],
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('📘 Facebook Profile:', profile.displayName);
        
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@facebook.user`;
        
        let user = await User.findOne({ email: email });
        
        if (user) {
          if (!user.facebookId) {
            user.facebookId = profile.id;
            await user.save();
          }
          return done(null, user);
        }
        
        const randomPassword = Math.random().toString(36).slice(-16);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        user = new User({
          name: profile.displayName,
          email: email,
          facebookId: profile.id,
          role: 'elder',
          isVerified: true,
          password: hashedPassword
        });
        
        await user.save();
        console.log('✅ Created new user from Facebook login');
        
        return done(null, user);
      } catch (err) {
        console.error('Facebook Strategy Error:', err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport;