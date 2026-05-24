import { useEffect } from 'react';
import { getChatSocket } from '../services/socket';

export default function useChatSocket({ onNewMessage }) {
  useEffect(() => {
    const socket = getChatSocket();

    const handleNewMessage = (message) => {
      onNewMessage?.(message);
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [onNewMessage]);
}
