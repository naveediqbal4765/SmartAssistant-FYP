import { useEffect } from 'react';
import { getChatSocket } from '../services/socket';

export default function useChatSocket({ onNewMessage, onMessageDeleted, onChatNotification }) {
  useEffect(() => {
    const socket = getChatSocket();

    const handleNewMessage = (message) => {
      onNewMessage?.(message);
    };
    const handleMessageDeleted = (payload) => {
      onMessageDeleted?.(payload);
    };
    const handleNotification = (notification) => {
      if (notification?.type === 'chat_message') {
        onChatNotification?.(notification);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('new-message', handleNewMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('newNotification', handleNotification);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('new-message', handleNewMessage);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('newNotification', handleNotification);
    };
  }, [onNewMessage, onMessageDeleted, onChatNotification]);
}
