import { getChatSocket } from '../chat/services/socket';

export const getCallSocket = () => getChatSocket();

export const callUser = ({ toUserId, offer, callType = 'audio' }) => {
  getCallSocket().emit('call-user', { toUserId, offer, callType });
};

export const acceptCall = ({ toUserId, answer }) => {
  getCallSocket().emit('call-accepted', { toUserId, answer });
};

export const sendIceCandidate = ({ toUserId, candidate }) => {
  getCallSocket().emit('ice-candidate', { toUserId, candidate });
};

export const endCall = ({ toUserId }) => {
  getCallSocket().emit('end-call', { toUserId });
};
