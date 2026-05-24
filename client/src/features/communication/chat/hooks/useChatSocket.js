import { useEffect } from 'react';
import { getChatSocket } from '../services/socket';

export default function useChatSocket({ onNewMessage, onMessageDeleted }) {
  useEffect(() => {
    const socket = getChatSocket();

    const handleNewMessage = (message) => {
      onNewMessage?.(message);
    };
    const handleMessageDeleted = (payload) => {
      onMessageDeleted?.(payload);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('message-deleted', handleMessageDeleted);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('message-deleted', handleMessageDeleted);
    };
  }, [onNewMessage, onMessageDeleted]);
}
