const { assertCanCommunicate } = require('../permissions/communicationPermission.service');

const assertCanCall = async (callerId, receiverId) => {
  const { sender, receiver } = await assertCanCommunicate(callerId, receiverId, 'call');
  return { caller: sender, receiver };
};

module.exports = {
  assertCanCall
};
