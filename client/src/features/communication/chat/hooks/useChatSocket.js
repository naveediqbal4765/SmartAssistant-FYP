import { useEffect } from 'react';
import { getChatSocket } from '../services/socket';

export default function useChatSocket({
  onNewMessage,
  onMessageDeleted,
  onChatNotification,
  onItemReactionUpdated,
  onTypingStart,
  onTypingStop,
  onMessageDelivered,
  onMessageSeen,
  onUserOnline,
  onUserOffline
}) {
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
    const handleTypingStart = (payload) => {
      onTypingStart?.(payload);
    };
    const handleTypingStop = (payload) => {
      onTypingStop?.(payload);
    };
    const handleMessageDelivered = (payload) => {
      onMessageDelivered?.(payload);
    };
    const handleMessageSeen = (payload) => {
      onMessageSeen?.(payload);
    };
    const handleUserOnline = (payload) => {
      onUserOnline?.(payload);
    };
    const handleUserOffline = (payload) => {
      onUserOffline?.(payload);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('new-message', handleNewMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('newNotification', handleNotification);
    socket.on('ITEM_REACTION_UPDATED', handleItemReactionUpdated);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:seen', handleMessageSeen);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('new-message', handleNewMessage);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('newNotification', handleNotification);
      socket.off('ITEM_REACTION_UPDATED', handleItemReactionUpdated);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:seen', handleMessageSeen);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [
    onNewMessage,
    onMessageDeleted,
    onChatNotification,
    onItemReactionUpdated,
    onTypingStart,
    onTypingStop,
    onMessageDelivered,
    onMessageSeen,
    onUserOnline,
    onUserOffline
  ]);
}
