import { getChatSocket } from '../chat/services/socket';

export const getCallSocket = () => getChatSocket();

export const callUser = ({ toUserId, offer, callType = 'audio' }) => {
  getCallSocket().emit('call-user', { toUserId, offer, callType });
};

export const acceptCall = ({ toUserId, answer, callType = 'audio' }) => {
  getCallSocket().emit('call-accepted', { toUserId, answer, callType });
};

export const sendIceCandidate = ({ toUserId, candidate }) => {
  getCallSocket().emit('ice-candidate', { toUserId, candidate });
};

export const endCall = ({ toUserId, callType = 'audio', durationSeconds = 0 }) => {
  getCallSocket().emit('end-call', { toUserId, callType, durationSeconds });
};
