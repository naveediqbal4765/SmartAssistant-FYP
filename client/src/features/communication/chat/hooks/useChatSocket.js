import { useEffect } from 'react';
import { getChatSocket } from '../services/socket';

export default function useChatSocket({ onNewMessage, onMessageDeleted, onChatNotification, onItemReactionUpdated }) {
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
    const handleItemReactionUpdated = (payload) => {
      onItemReactionUpdated?.(payload);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('new-message', handleNewMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('newNotification', handleNotification);
    socket.on('ITEM_REACTION_UPDATED', handleItemReactionUpdated);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('new-message', handleNewMessage);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('newNotification', handleNotification);
      socket.off('ITEM_REACTION_UPDATED', handleItemReactionUpdated);
    };
  }, [onNewMessage, onMessageDeleted, onChatNotification, onItemReactionUpdated]);
}
