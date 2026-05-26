const authService = require('./auth.service');

// Controllers stay thin: they translate HTTP req/res and delegate auth rules to the service.
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Register Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error'
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const result = await authService.verifyOTP(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Verify OTP Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error'
    });
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Something went wrong during login.'
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    const result = await authService.resendOTP(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Resend OTP Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error'
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Forgot Password Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error'
    });
  }
};

const verifyResetOTP = async (req, res) => {
  try {
    const result = await authService.verifyResetOTP(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Verify Reset OTP Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error'
    });
  }
};

const getCaregiverLinkCode = async (req, res) => {
  try {
    const result = await authService.getCaregiverLinkCode(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Get Caregiver Link Code Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error'
    });
  }
};

const regenerateCaregiverLinkCode = async (req, res) => {
  try {
    const result = await authService.regenerateCaregiverLinkCode(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Regenerate Caregiver Link Code Error:', err);
    return res.status(500).json({
      success: false,
      msg: 'Server error'
    });
  }
};

const handleOAuthCallback = async (req, res) => {
  try {
    const redirectUrl = await authService.buildOAuthRedirectUrl(req.user);
    return res.redirect(redirectUrl);
  } catch (err) {
    return res.redirect('http://localhost:5173/login');
  }
};

module.exports = {
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
};
