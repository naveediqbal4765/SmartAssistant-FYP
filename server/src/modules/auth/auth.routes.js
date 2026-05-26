const express = require('express');
const passport = require('passport');
const auth = require('../../shared/jwt/authMiddleware');
const {
  register,
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  getCaregiverLinkCode,
  regenerateCaregiverLinkCode,
  handleOAuthCallback
} = require('./auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/resend-otp', resendOTP);

router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

router.get('/senior/caregiver-link-code', auth, getCaregiverLinkCode);
router.post('/senior/caregiver-link-code/regenerate', auth, regenerateCaregiverLinkCode);

// Passport route behavior is preserved while callbacks delegate redirect assembly to auth.service.
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login' }),
  handleOAuthCallback
);

router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email', 'public_profile'] })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: 'http://localhost:5173/login' }),
  handleOAuthCallback
);

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
      'GET /senior/caregiver-link-code',
      'POST /senior/caregiver-link-code/regenerate',
      'GET /google',
      'GET /google/callback',
      'GET /facebook',
      'GET /facebook/callback'
    ]
  });
});

module.exports = router;
