const VALID_ROLES = ['elder', 'volunteer', 'caregiver'];

const normalizeEmail = (email) => email.toLowerCase().trim();
const normalizeRole = (role) => role.toLowerCase().trim();

const validateRegisterInput = ({ name, email, password, role }) => {
  if (!name || !email || !password || !role) {
    return 'All fields are required';
  }

  if (!VALID_ROLES.includes(role)) {
    return 'Invalid role. Use elder, volunteer or caregiver';
  }

  return null;
};

const validateVerifyOtpInput = ({ email, otp }) => {
  if (!email || !otp) {
    return 'Email and OTP are required';
  }

  return null;
};

const validateLoginInput = ({ email, password }) => {
  if (!email || !password) {
    return 'Please provide email and password';
  }

  return null;
};

const validateEmailInput = ({ email }) => {
  if (!email) {
    return 'Email is required';
  }

  return null;
};

const validateResetPasswordInput = ({ resetToken, newPassword }) => {
  if (!resetToken || !newPassword) {
    return 'Reset token and new password are required';
  }

  if (newPassword.length < 6) {
    return 'Password must be at least 6 characters';
  }

  return null;
};

module.exports = {
  normalizeEmail,
  normalizeRole,
  validateRegisterInput,
  validateVerifyOtpInput,
  validateLoginInput,
  validateEmailInput,
  validateResetPasswordInput
};
