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
const { refreshSeniorCaregiverLinkCode } = require('../utils/seniorCaregiverLink');

const buildOAuthRedirect = async (user, res) => {
  if (user.role === 'elder') {
    await refreshSeniorCaregiverLinkCode(user);
  }

  const token = jwt.sign(
    { userId: user._id, id: user._id, role: user.role },
    process.env.JWT_SECRET || 'smart-senior-secret-2026',
    { expiresIn: '7d' }
  );

  const userData = encodeURIComponent(JSON.stringify({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    address: user.address || '',
    dateOfBirth: user.dateOfBirth || null,
    linkedSeniorId: user.linkedSeniorId || null
  }));

  res.redirect(`http://localhost:5173/social-login?token=${token}&user=${userData}`);
};

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
  async (req, res) => {
    try {
      await buildOAuthRedirect(req.user, res);
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
  async (req, res) => {
    try {
      await buildOAuthRedirect(req.user, res);
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