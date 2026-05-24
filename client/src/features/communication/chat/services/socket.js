import { io } from 'socket.io-client';

let socket;

export const getChatSocket = () => {
  const token = localStorage.getItem('token');

  if (!socket || socket.disconnected) {
    socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket']
    });
  }

  return socket;
};

export const disconnectChatSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
