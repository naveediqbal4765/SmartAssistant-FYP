const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { 
  register, 
  login, 
  verifyOTP, 
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword
} = require('../controllers/authController');

// ========== AUTHENTICATION ROUTES ==========

// Register new user (sends OTP)
router.post('/register', register);

// Verify OTP
router.post('/verify-otp', verifyOTP);

// Login user
router.post('/login', login);

// Resend OTP
router.post('/resend-otp', resendOTP);

// ========== PASSWORD RESET ROUTES ==========

// Forgot Password - Send reset OTP to email
router.post('/forgot-password', forgotPassword);

// Verify Reset OTP - Confirm the OTP code
router.post('/verify-reset-otp', verifyResetOTP);

// Reset Password - Set new password
router.post('/reset-password', resetPassword);

// ========== GOOGLE OAUTH ROUTES (ADDED) ==========

// Google OAuth - Initiate
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth - Callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login' }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { userId: req.user._id, id: req.user._id, role: req.user.role },
        process.env.JWT_SECRET || "smart-senior-secret-2026",
        { expiresIn: '7d' }
      );
      
      const userData = encodeURIComponent(JSON.stringify({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone || '',
        address: req.user.address || '',
        dateOfBirth: req.user.dateOfBirth || null
      }));
      
      res.redirect(`http://localhost:5173/social-login?token=${token}&user=${userData}`);
    } catch (err) {
      res.redirect('http://localhost:5173/login');
    }
  }
);

// ========== FACEBOOK OAUTH ROUTES (ADDED) ==========

// Facebook OAuth - Initiate
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email', 'public_profile'] })
);

// Facebook OAuth - Callback
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: 'http://localhost:5173/login' }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { userId: req.user._id, id: req.user._id, role: req.user.role },
        process.env.JWT_SECRET || "smart-senior-secret-2026",
        { expiresIn: '7d' }
      );
      
      const userData = encodeURIComponent(JSON.stringify({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone || '',
        address: req.user.address || '',
        dateOfBirth: req.user.dateOfBirth || null
      }));
      
      res.redirect(`http://localhost:5173/social-login?token=${token}&user=${userData}`);
    } catch (err) {
      res.redirect('http://localhost:5173/login');
    }
  }
);

// ========== TEST ROUTE (UPDATED with new routes) ==========
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth routes are working!',
    availableRoutes: [
      'POST /register',
      'POST /verify-otp',
      'POST /login',
      'POST /resend-otp',
      'POST /forgot-password',
      'POST /verify-reset-otp',
      'POST /reset-password',
      'GET /google',
      'GET /google/callback',
      'GET /facebook',
      'GET /facebook/callback'
    ]
  });
});

module.exports = router;