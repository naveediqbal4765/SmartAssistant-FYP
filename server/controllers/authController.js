const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail, sendResetOTPEmail } = require('../utils/sendEmail');
const {
  findSeniorByLinkCode,
  refreshSeniorCaregiverLinkCode
} = require('../utils/seniorCaregiverLink');

// ========== REGISTER (with OTP & Profile Fields) ==========
const register = async (req, res) => {
  try {
    let { name, email, password, role, phone, address, dateOfBirth, seniorLinkCode } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        msg: "All fields are required"
      });
    }

    // Normalize role and email
    role = role.toLowerCase().trim();
    email = email.toLowerCase().trim();

    const validRoles = ["elder", "volunteer", "caregiver"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid role. Use elder, volunteer or caregiver"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        msg: "User already exists"
      });
    }

    let linkedSenior = null;
    if (role === 'caregiver') {
      if (!seniorLinkCode) {
        return res.status(400).json({
          success: false,
          msg: "Senior link code is required. Ask your senior to log in and share the 6-digit code from their email."
        });
      }
      linkedSenior = await findSeniorByLinkCode(seniorLinkCode);
      if (!linkedSenior) {
        return res.status(400).json({
          success: false,
          msg: "Invalid or expired senior link code. Ask your senior to log in again for a new code."
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Display OTP in terminal for testing
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║     📧 OTP VERIFICATION CODE 📧        ║");
    console.log("╠════════════════════════════════════════╣");
    console.log(`║     Email: ${email}`);
    console.log(`║     OTP:   ${otpCode}`);
    console.log("║     Expires in 10 minutes              ║");
    console.log("╚════════════════════════════════════════╝\n");
    
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Create user with ALL fields
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

    // Send OTP email
    try {
      await sendOTPEmail(email, otpCode, name);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr.message);
    }

    const registerMsg = role === 'caregiver' && linkedSenior
      ? `Registration successful! You are linked to ${linkedSenior.name}. OTP sent to your email.`
      : "Registration successful! OTP sent to your email.";

    return res.status(201).json({
      success: true,
      msg: registerMsg,
      email: email,
      requiresVerification: true,
      linkedSenior: linkedSenior
        ? { id: linkedSenior._id, name: linkedSenior.name, email: linkedSenior.email }
        : undefined
    });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Server error"
    });
  }
};

// ========== VERIFY OTP ==========
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        msg: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        msg: "Account already verified"
      });
    }

    if (!user.otp || user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        msg: "Invalid OTP code"
      });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        msg: "OTP has expired. Please register again."
      });
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.otp = { code: null, expiresAt: null };
    if (!user.linkedCaregivers) user.linkedCaregivers = [];
    await user.save();

    if (user.role === 'elder') {
      await refreshSeniorCaregiverLinkCode(user);
    }

    // Include BOTH 'id' and 'userId' for compatibility
    const token = jwt.sign(
      { userId: user._id, id: user._id, role: user.role },
      process.env.JWT_SECRET || "smart-senior-secret-2026",
      { expiresIn: '7d' }
    );

    const verifyMsg = user.role === 'elder'
      ? 'Account verified! A caregiver link code was sent to your email.'
      : 'Account verified successfully!';

    return res.json({
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
    });

  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Server error"
    });
  }
};

// ========== LOGIN ==========
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        msg: "Please provide email and password" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        msg: "Invalid credentials" 
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({ 
        success: false,
        msg: "Please verify your email first.",
        requiresVerification: true,
        email: user.email
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        msg: "Invalid credentials" 
      });
    }

    // Include BOTH 'id' and 'userId' for compatibility
    const token = jwt.sign(
      { userId: user._id, id: user._id, role: user.role },
      process.env.JWT_SECRET || "smart-senior-secret-2026",
      { expiresIn: '7d' }
    );

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

    res.json({
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
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      msg: "Something went wrong during login."
    });
  }
};

// ========== RESEND OTP ==========
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        msg: "Email is required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        msg: "Account already verified"
      });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = {
      code: newOtp,
      expiresAt: newExpiry
    };
    await user.save();

    console.log("\n╔════════════════════════════════════════╗");
    console.log("║     📧 RESENT OTP CODE 📧              ║");
    console.log("╠════════════════════════════════════════╣");
    console.log(`║     Email: ${email}`);
    console.log(`║     OTP:   ${newOtp}`);
    console.log("╚════════════════════════════════════════╝\n");

    try {
      await sendOTPEmail(email, newOtp, user.name);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr.message);
    }

    return res.json({
      success: true,
      msg: "New OTP sent to your email"
    });

  } catch (err) {
    console.error("Resend OTP Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Server error"
    });
  }
};

// ========== FORGOT PASSWORD - Send Reset OTP ==========
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        msg: "Email is required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "No account found with this email"
      });
    }

    // Generate 6-digit OTP for password reset
    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user
    user.resetOtp = {
      code: resetOtp,
      expiresAt: resetOtpExpires
    };
    user.resetVerified = false;
    await user.save();

    // Display in terminal
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║     🔐 PASSWORD RESET OTP 🔐           ║");
    console.log("╠════════════════════════════════════════╣");
    console.log(`║     Email: ${email}`);
    console.log(`║     OTP:   ${resetOtp}`);
    console.log("║     Expires in 10 minutes              ║");
    console.log("╚════════════════════════════════════════╝\n");

    // Send OTP email
    try {
      await sendResetOTPEmail(email, resetOtp, user.name);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr.message);
    }

    return res.json({
      success: true,
      msg: "Password reset OTP sent to your email"
    });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Server error"
    });
  }
};

// ========== VERIFY RESET OTP ==========
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        msg: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    if (!user.resetOtp || user.resetOtp.code !== otp) {
      return res.status(400).json({
        success: false,
        msg: "Invalid OTP code"
      });
    }

    if (new Date() > user.resetOtp.expiresAt) {
      return res.status(400).json({
        success: false,
        msg: "OTP has expired. Please request a new one."
      });
    }

    // Mark as verified for password reset
    user.resetVerified = true;
    await user.save();

    // Generate temporary token for password reset
    const resetToken = jwt.sign(
      { email: user.email, purpose: 'password-reset' },
      process.env.JWT_SECRET || "smart-senior-secret-2026",
      { expiresIn: '10m' }
    );

    return res.json({
      success: true,
      msg: "OTP verified. You can now reset your password.",
      resetToken
    });

  } catch (err) {
    console.error("Verify Reset OTP Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Server error"
    });
  }
};

// ========== RESET PASSWORD ==========
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        msg: "Reset token and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 6 characters"
      });
    }

    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET || "smart-senior-secret-2026");
    
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({
        success: false,
        msg: "Invalid reset token"
      });
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found"
      });
    }

    if (!user.resetVerified) {
      return res.status(400).json({
        success: false,
        msg: "Please verify OTP first"
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    // Clear reset data
    user.resetOtp = { code: null, expiresAt: null };
    user.resetVerified = false;
    
    await user.save();

    console.log("✅ Password reset successful for:", user.email);

    return res.json({
      success: true,
      msg: "Password reset successful! You can now login with your new password."
    });

  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({
      success: false,
      msg: "Server error"
    });
  }
};

// Export all functions
module.exports = { 
  register, 
  login, 
  verifyOTP, 
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword
};