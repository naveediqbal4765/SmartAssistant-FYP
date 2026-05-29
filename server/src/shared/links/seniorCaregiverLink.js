const User = require('../models/User');
const { sendSeniorWelcomeLinkEmail } = require('../email/sendEmail');

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
    'caregiverLinkCode.code': normalized
  });
};

const refreshSeniorCaregiverLinkCode = async (user) => {
  if (!user || user.role !== 'elder') {
    return null;
  }

  const code = generateLinkCode();

  user.caregiverLinkCode = { code };
  await user.save();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   🔗 CAREGIVER LINK CODE (SENIOR) 🔗   ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Senior: ${user.email}`);
  console.log(`║  Code:   ${code}`);
  console.log('║  Permanent until manually regenerated  ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await sendSeniorWelcomeLinkEmail(user.email, user.name, code);
  } catch (emailErr) {
    console.error('Senior welcome link email failed:', emailErr.message);
  }

  return code;
};

const ensureSeniorCaregiverLinkCode = async (user) => {
  if (!user || user.role !== 'elder') {
    return null;
  }

  if (user.caregiverLinkCode?.code) {
    return user.caregiverLinkCode.code;
  }

  return refreshSeniorCaregiverLinkCode(user);
};

const linkCaregiverToSenior = async (caregiver, seniorLinkCode) => {
  const senior = await findSeniorByLinkCode(seniorLinkCode);

  if (!senior) {
    return {
      ok: false,
      msg: 'Invalid senior link code. Ask your senior to confirm their caregiver invitation code.'
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
  ensureSeniorCaregiverLinkCode,
  refreshSeniorCaregiverLinkCode,
  linkCaregiverToSenior
};
