const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user.model');
const ActivityLog = require('../../shared/models/ActivityLog');
const { sendOTPEmail, sendResetOTPEmail } = require('../../shared/utils/sendEmail');
const {
  findSeniorByLinkCode,
  refreshSeniorCaregiverLinkCode
} = require('../../shared/utils/seniorCaregiverLink');
const {
  normalizeEmail,
  normalizeRole,
  validateRegisterInput,
  validateVerifyOtpInput,
  validateLoginInput,
  validateEmailInput,
  validateResetPasswordInput
} = require('./auth.validation');

const JWT_SECRET = () => process.env.JWT_SECRET || 'smart-senior-secret-2026';

const signUserToken = (user) =>
  jwt.sign(
    { userId: user._id, id: user._id, role: user.role },
    JWT_SECRET(),
    { expiresIn: '7d' }
  );

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const register = async (payload) => {
  let { name, email, password, role, phone, address, dateOfBirth, seniorLinkCode } = payload;

  if (!name || !email || !password || !role) {
    return { status: 400, body: { success: false, msg: 'All fields are required' } };
  }

  role = normalizeRole(role);
  email = normalizeEmail(email);

  const roleError = validateRegisterInput({ name, email, password, role });
  if (roleError) {
    return { status: 400, body: { success: false, msg: roleError } };
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return { status: 400, body: { success: false, msg: 'User already exists' } };
  }

  let linkedSenior = null;
  if (role === 'caregiver') {
    if (!seniorLinkCode) {
      return {
        status: 400,
        body: {
          success: false,
          msg: 'Senior link code is required. Ask your senior to log in and share the 6-digit code from their email.'
        }
      };
    }

    linkedSenior = await findSeniorByLinkCode(seniorLinkCode);
    if (!linkedSenior) {
      return {
        status: 400,
        body: {
          success: false,
          msg: 'Invalid or expired senior link code. Ask your senior to log in again for a new code.'
        }
      };
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const otpCode = generateOtp();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     📧 OTP VERIFICATION CODE 📧        ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║     Email: ${email}`);
  console.log(`║     OTP:   ${otpCode}`);
  console.log('║     Expires in 10 minutes              ║');
  console.log('╚════════════════════════════════════════╝\n');

  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  const user = new User({
    name,
    email,
    password: hashedPassword,
    role,
    phone: phone || '',
    address: address || '',
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    emergencyContacts: [],
    linkedSeniorId: linkedSenior ? linkedSenior._id : null,
    isVerified: false,
    location: {
      type: 'Point',
      coordinates: [0, 0]
    },
    otp: {
      code: otpCode,
      expiresAt: otpExpires
    }
  });

  await user.save();

  if (role === 'caregiver' && linkedSenior) {
    linkedSenior.linkedCaregivers = linkedSenior.linkedCaregivers || [];
    const alreadyLinked = linkedSenior.linkedCaregivers.some(
      (id) => id.toString() === user._id.toString()
    );
    if (!alreadyLinked) {
      linkedSenior.linkedCaregivers.push(user._id);
      await linkedSenior.save();
    }
  }

  try {
    await sendOTPEmail(email, otpCode, name);
  } catch (emailErr) {
    console.error('Email sending failed:', emailErr.message);
  }

  const registerMsg = role === 'caregiver' && linkedSenior
    ? `Registration successful! You are linked to ${linkedSenior.name}. OTP sent to your email.`
    : 'Registration successful! OTP sent to your email.';

  return {
    status: 201,
    body: {
      success: true,
      msg: registerMsg,
      email: email,
      requiresVerification: true,
      linkedSenior: linkedSenior
        ? { id: linkedSenior._id, name: linkedSenior.name, email: linkedSenior.email }
        : undefined
    }
  };
};

const verifyOTP = async ({ email, otp }) => {
  const validationError = validateVerifyOtpInput({ email, otp });
  if (validationError) {
    return { status: 400, body: { success: false, msg: validationError } };
  }

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    return { status: 400, body: { success: false, msg: 'User not found' } };
  }

  if (user.isVerified) {
    return { status: 400, body: { success: false, msg: 'Account already verified' } };
  }

  if (!user.otp || user.otp.code !== otp) {
    return { status: 400, body: { success: false, msg: 'Invalid OTP code' } };
  }

  if (new Date() > user.otp.expiresAt) {
    return { status: 400, body: { success: false, msg: 'OTP has expired. Please register again.' } };
  }

  user.isVerified = true;
  user.otp = { code: null, expiresAt: null };
  if (!user.linkedCaregivers) user.linkedCaregivers = [];
  await user.save();

  if (user.role === 'elder') {
    await refreshSeniorCaregiverLinkCode(user);
  }

  const token = signUserToken(user);
  const verifyMsg = user.role === 'elder'
    ? 'Account verified! A caregiver link code was sent to your email.'
    : 'Account verified successfully!';

  return {
    status: 200,
    body: {
      success: true,
      msg: verifyMsg,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth || null,
        linkedSeniorId: user.linkedSeniorId || null
      }
    }
  };
};

const login = async ({ email, password }) => {
  const validationError = validateLoginInput({ email, password });
  if (validationError) {
    return { status: 400, body: { success: false, msg: validationError } };
  }

  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) {
    return { status: 400, body: { success: false, msg: 'Invalid credentials' } };
  }

  if (!user.isVerified) {
    return {
      status: 401,
      body: {
        success: false,
        msg: 'Please verify your email first.',
        requiresVerification: true,
        email: user.email
      }
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { status: 400, body: { success: false, msg: 'Invalid credentials' } };
  }

  const token = signUserToken(user);
  let loginMsg = 'Login successful';
  if (user.role === 'elder') {
    await refreshSeniorCaregiverLinkCode(user);
    loginMsg = 'Welcome back! A caregiver link code was sent to your email.';
  }

  try {
    await ActivityLog.create({
      userId: user._id,
      action: 'login',
      details: 'User logged in'
    });
  } catch (logErr) {
    console.error('Login activity log failed:', logErr.message);
  }

  let linkedSenior = null;
  if (user.role === 'caregiver' && user.linkedSeniorId) {
    linkedSenior = await User.findById(user.linkedSeniorId).select('name email');
  }

  return {
    status: 200,
    body: {
      success: true,
      msg: loginMsg,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth || null,
        linkedSeniorId: user.linkedSeniorId || null,
        linkedSenior: linkedSenior
          ? { id: linkedSenior._id, name: linkedSenior.name, email: linkedSenior.email }
          : null
      }
    }
  };
};

const resendOTP = async ({ email }) => {
  const validationError = validateEmailInput({ email });
  if (validationError) {
    return { status: 400, body: { success: false, msg: validationError } };
  }

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    return { status: 400, body: { success: false, msg: 'User not found' } };
  }

  if (user.isVerified) {
    return { status: 400, body: { success: false, msg: 'Account already verified' } };
  }

  const newOtp = generateOtp();
  const newExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.otp = {
    code: newOtp,
    expiresAt: newExpiry
  };
  await user.save();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     📧 RESENT OTP CODE 📧              ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║     Email: ${email}`);
  console.log(`║     OTP:   ${newOtp}`);
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await sendOTPEmail(email, newOtp, user.name);
  } catch (emailErr) {
    console.error('Email sending failed:', emailErr.message);
  }

  return { status: 200, body: { success: true, msg: 'New OTP sent to your email' } };
};

const forgotPassword = async ({ email }) => {
  const validationError = validateEmailInput({ email });
  if (validationError) {
    return { status: 400, body: { success: false, msg: validationError } };
  }

  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) {
    return { status: 404, body: { success: false, msg: 'No account found with this email' } };
  }

  const resetOtp = generateOtp();
  const resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

  user.resetOtp = {
    code: resetOtp,
    expiresAt: resetOtpExpires
  };
  user.resetVerified = false;
  await user.save();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     🔐 PASSWORD RESET OTP 🔐           ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║     Email: ${email}`);
  console.log(`║     OTP:   ${resetOtp}`);
  console.log('║     Expires in 10 minutes              ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await sendResetOTPEmail(email, resetOtp, user.name);
  } catch (emailErr) {
    console.error('Email sending failed:', emailErr.message);
  }

  return { status: 200, body: { success: true, msg: 'Password reset OTP sent to your email' } };
};

const verifyResetOTP = async ({ email, otp }) => {
  const validationError = validateVerifyOtpInput({ email, otp });
  if (validationError) {
    return { status: 400, body: { success: false, msg: validationError } };
  }

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    return { status: 404, body: { success: false, msg: 'User not found' } };
  }

  if (!user.resetOtp || user.resetOtp.code !== otp) {
    return { status: 400, body: { success: false, msg: 'Invalid OTP code' } };
  }

  if (new Date() > user.resetOtp.expiresAt) {
    return { status: 400, body: { success: false, msg: 'OTP has expired. Please request a new one.' } };
  }

  user.resetVerified = true;
  await user.save();

  const resetToken = jwt.sign(
    { email: user.email, purpose: 'password-reset' },
    JWT_SECRET(),
    { expiresIn: '10m' }
  );

  return {
    status: 200,
    body: {
      success: true,
      msg: 'OTP verified. You can now reset your password.',
      resetToken
    }
  };
};

const resetPassword = async ({ resetToken, newPassword }) => {
  const validationError = validateResetPasswordInput({ resetToken, newPassword });
  if (validationError) {
    return { status: 400, body: { success: false, msg: validationError } };
  }

  const decoded = jwt.verify(resetToken, JWT_SECRET());

  if (decoded.purpose !== 'password-reset') {
    return { status: 400, body: { success: false, msg: 'Invalid reset token' } };
  }

  const user = await User.findOne({ email: decoded.email });
  if (!user) {
    return { status: 404, body: { success: false, msg: 'User not found' } };
  }

  if (!user.resetVerified) {
    return { status: 400, body: { success: false, msg: 'Please verify OTP first' } };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.resetOtp = { code: null, expiresAt: null };
  user.resetVerified = false;

  await user.save();

  console.log('✅ Password reset successful for:', user.email);

  return {
    status: 200,
    body: {
      success: true,
      msg: 'Password reset successful! You can now login with your new password.'
    }
  };
};

const buildOAuthRedirectUrl = async (user) => {
  if (user.role === 'elder') {
    await refreshSeniorCaregiverLinkCode(user);
  }

  const token = signUserToken(user);

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

  return `http://localhost:5173/social-login?token=${token}&user=${userData}`;
};

module.exports = {
  register,
  verifyOTP,
  login,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  buildOAuthRedirectUrl
};
