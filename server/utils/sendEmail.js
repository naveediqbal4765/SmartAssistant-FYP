const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendOTPEmail = async (email, otp, name) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Smart Assistant for Seniors" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Account - Smart Assistant for Senior Citizens',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2563eb;">Welcome ${name}! 👋</h2>
        <p>Thank you for registering with <strong>Smart Assistant for Senior Citizens</strong>.</p>
        <p>Please use the verification code below to complete your registration:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Smart Assistant for Senior Citizens - Keeping your loved ones safe.</p>
      </div>
    `
  });
};

const sendResetOTPEmail = async (email, otp, name) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Smart Assistant for Seniors" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request - Smart Assistant',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2563eb;">Password Reset Request 🔐</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your <strong>Smart Assistant for Senior Citizens</strong> account.</p>
        <p>Please use the verification code below to reset your password:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <hr style="margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Smart Assistant for Senior Citizens - Keeping your loved ones safe.</p>
      </div>
    `
  });
};

const sendSeniorWelcomeLinkEmail = async (email, name, linkCode) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Smart Assistant for Seniors" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome back — Your caregiver link code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #1C382A;">Welcome back, ${name}! 👋</h2>
        <p>Thank you for using <strong>Smart Assistant for Senior Citizens</strong>. We are glad you are here.</p>
        <p>If a family member or caregiver is creating their account, share this <strong>6-digit link code</strong> with them. It connects their caregiver account to yours.</p>
        <div style="background-color: #BAE4C7; padding: 20px; text-align: center; font-size: 36px; letter-spacing: 8px; font-weight: bold; border-radius: 8px; margin: 24px 0; color: #1C382A;">
          ${linkCode}
        </div>
        <p>This code is valid until your next login or for <strong>7 days</strong>, whichever comes first.</p>
        <p style="color: #6b7280; font-size: 14px;">For your security, do not share this code publicly. Only give it to caregivers you trust.</p>
        <hr style="margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Smart Assistant for Senior Citizens — Care for Seniors, By Community.</p>
      </div>
    `
  });
};

const sendAccountDeletionEmail = async (email, name) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Smart Assistant for Seniors" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Account Deleted - Smart Assistant',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #dc2626;">Account Deleted ❌</h2>
        <p>Hello ${name},</p>
        <p>Your <strong>Smart Assistant for Senior Citizens</strong> account has been successfully deleted.</p>
        <p>We're sorry to see you go. If you change your mind, you can always register again.</p>
        <p>Thank you for using our service.</p>
        <hr style="margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Smart Assistant for Senior Citizens - Keeping your loved ones safe.</p>
      </div>
    `
  });
};

module.exports = {
  sendOTPEmail,
  sendResetOTPEmail,
  sendSeniorWelcomeLinkEmail,
  sendAccountDeletionEmail
};
