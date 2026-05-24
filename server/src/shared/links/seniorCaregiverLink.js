const User = require('../models/User');
const { sendSeniorWelcomeLinkEmail } = require('../email/sendEmail');

const LINK_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const generateLinkCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const findSeniorByLinkCode = async (code) => {
  const normalized = String(code || '').trim();
  if (!/^\d{6}$/.test(normalized)) {
    return null;
  }

  return User.findOne({
    role: 'elder',
    isVerified: true,
    'caregiverLinkCode.code': normalized,
    'caregiverLinkCode.expiresAt': { $gt: new Date() }
  });
};

const refreshSeniorCaregiverLinkCode = async (user) => {
  if (!user || user.role !== 'elder') {
    return null;
  }

  const code = generateLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);

  user.caregiverLinkCode = { code, expiresAt };
  await user.save();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   🔗 CAREGIVER LINK CODE (SENIOR) 🔗   ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Senior: ${user.email}`);
  console.log(`║  Code:   ${code}`);
  console.log('║  Expires in 7 days (refreshed on login) ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await sendSeniorWelcomeLinkEmail(user.email, user.name, code);
  } catch (emailErr) {
    console.error('Senior welcome link email failed:', emailErr.message);
  }

  return code;
};

const linkCaregiverToSenior = async (caregiver, seniorLinkCode) => {
  const senior = await findSeniorByLinkCode(seniorLinkCode);

  if (!senior) {
    return {
      ok: false,
      msg: 'Invalid or expired senior link code. Ask your senior to log in again to receive a new code by email.'
    };
  }

  caregiver.linkedSeniorId = senior._id;

  const alreadyLinked = (senior.linkedCaregivers || []).some(
    (id) => id.toString() === caregiver._id.toString()
  );

  if (!alreadyLinked) {
    senior.linkedCaregivers = senior.linkedCaregivers || [];
    senior.linkedCaregivers.push(caregiver._id);
    await senior.save();
  }

  return { ok: true, senior };
};

module.exports = {
  findSeniorByLinkCode,
  refreshSeniorCaregiverLinkCode,
  linkCaregiverToSenior
};
