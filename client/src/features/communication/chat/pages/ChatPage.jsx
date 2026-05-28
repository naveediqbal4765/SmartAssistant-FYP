import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChatBox from '../components/ChatBox';
import ConversationList from '../components/ConversationList';
import ForwardMessageModal from '../components/ForwardMessageModal';
import SearchUsers from '../components/SearchUsers';
import useChatSocket from '../hooks/useChatSocket';
import { getChatSocket } from '../services/socket';
import { createConversation, deleteConversation, deleteMessage, fetchConversation, fetchConversations, fetchMessages, reactToMessage as reactToTextMessage, reactToVoiceNote, resolveConversation, searchUsers as searchForwardUsers, sendMessage, uploadAudio, uploadMedia } from '../services/chatApi';
import { buildReplyTarget } from '../utils/replyPreview';
import CallScreen from '../../calls/CallScreen';
import useWebRTC from '../../calls/useWebRTC';
import { markNotificationAsConsumed } from '../../notifications/notificationConsumption';
import FeaturePage from '../../../../components/ui/FeaturePage';
import StatusAlert from '../../../../components/ui/StatusAlert';
import { fetchMyGroups } from '../../groups/groupApi';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

const getConversationId = (conversation) => String(conversation?.id || conversation?._id || '');
const getParticipantId = (conversation) => String(conversation?.participant?._id || '');
const getUserId = (value) => String(value?._id || value || '');
const getMessageKey = (message) => String(message?._id || message?.clientId || '');
const getConversationTime = (conversation) => new Date(conversation?.lastMessageAt || conversation?.updatedAt || 0).getTime();
const getReactionUserId = (reaction) => String(reaction?.userId?._id || reaction?.userId || '');
const reactionEmojiByType = {
  like: '👍',
  heart: '❤️',
  haha: '😂',
  sad: '😢'
};

const sortConversations = (items) => {
  return [...items].sort((a, b) => getConversationTime(b) - getConversationTime(a));
};

const mergeConversations = (items) => {
  const byParticipant = new Map();

  items.forEach((conversation) => {
    const participantId = getParticipantId(conversation);
    if (!participantId) return;

    const existing = byParticipant.get(participantId);
    if (!existing) {
      byParticipant.set(participantId, conversation);
      return;
    }

    byParticipant.set(participantId, {
      ...existing,
      ...conversation,
      id: String(conversation.id || '').startsWith('search-') ? existing.id : conversation.id,
      lastMessage: conversation.lastMessage || existing.lastMessage,
      lastMessageAt: conversation.lastMessageAt || existing.lastMessageAt,
      updatedAt: conversation.updatedAt || existing.updatedAt
    });
  });

  return sortConversations(Array.from(byParticipant.values()));
};

const mergeMessages = (currentMessages, nextMessages) => {
  const byKey = new Map();

  [...currentMessages, ...nextMessages].forEach((message) => {
    const key = getMessageKey(message);
    if (!key) return;
    byKey.set(key, { ...byKey.get(key), ...message });
  });

  return Array.from(byKey.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

const isDeletedForCurrentUser = (message, currentUserId) => {
  return (message.deletedFor || []).some((id) => String(id?._id || id) === String(currentUserId));
};

const getNextReactions = (reactions = [], userId, reactionType) => {
  const existingReaction = reactions.find((reaction) => getReactionUserId(reaction) === String(userId));

  if (existingReaction?.type === reactionType) {
    return reactions.filter((reaction) => getReactionUserId(reaction) !== String(userId));
  }

  const nextReaction = {
    userId,
    type: reactionType,
    emoji: reactionEmojiByType[reactionType],
    createdAt: new Date().toISOString()
  };

  if (existingReaction) {
    return reactions.map((reaction) => (
      getReactionUserId(reaction) === String(userId) ? nextReaction : reaction
    ));
  }

  return [...reactions, nextReaction];
};

const getItemTypeForMessage = (message) => {
  if (['text', 'image', 'video', 'file', 'document'].includes(message?.messageType)) return 'message';
  if (message?.messageType === 'voice') return 'voiceNote';
  return '';
};

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId: routeConversationId } = useParams();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentUserId = String(currentUser.id || currentUser._id || '');
  const targetMessageId = location.state?.messageId || '';
  const lastConversationKey = `chat:lastConversation:${currentUserId}`;
  const messageRequestRef = useRef(0);
  const loadedConversationIdRef = useRef('');
  const typingActiveRef = useRef(false);
  const typingExpiryRef = useRef(null);
  const seenDebounceRef = useRef(null);
  const deliveredMessageIdsRef = useRef(new Set());
  const seenMessageIdsRef = useRef(new Set());
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(() => (
    routeConversationId || localStorage.getItem(lastConversationKey) || ''
  ));
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pendingSends, setPendingSends] = useState(0);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [forwardGroups, setForwardGroups] = useState([]);

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    setError('');

    try {
      const data = await fetchConversations();
      const visibleConversations = data.filter((conversation) => conversation.participant);
      setConversations((current) => mergeConversations([...current, ...visibleConversations]));
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUserId]);

  const loadMessages = useCallback(async (conversation) => {
    const participantId = conversation?.participant?._id;
    if (!participantId) return;

    const requestId = messageRequestRef.current + 1;
    messageRequestRef.current = requestId;
    setLoadingMessages(true);
    setError('');
    setMessages([]);

    try {
      const data = await fetchMessages(participantId);
      if (messageRequestRef.current === requestId) {
        setMessages((current) => mergeMessages(current, data).filter((message) => !isDeletedForCurrentUser(message, currentUserId)));
      }
    } catch (err) {
      if (messageRequestRef.current === requestId) {
        setError(err.response?.data?.msg || 'Failed to load messages');
        setMessages([]);
      }
    } finally {
      if (messageRequestRef.current === requestId) {
        setLoadingMessages(false);
      }
    }
  }, [currentUserId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!routeConversationId) return;

    let cancelled = false;

    const loadRouteConversation = async () => {
      setLoadingMessages(true);
      setError('');

      try {
        const conversation = await fetchConversation(routeConversationId);
        if (cancelled) return;

        const normalizedConversation = normalizeConversation(conversation, conversation.participant);
        setConversations((current) => mergeConversations([normalizedConversation, ...current]));
        setSelectedConversationId(getConversationId(normalizedConversation));
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.msg || 'Failed to open conversation');
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    };

    loadRouteConversation();

    return () => {
      cancelled = true;
    };
  }, [routeConversationId]);

  useEffect(() => {
    if (routeConversationId) return;
    if (loadingConversations || !conversations.length || selectedConversationId) return;

    const firstConversation = conversations[0];
    const firstConversationId = getConversationId(firstConversation);
    if (firstConversationId) {
      setSelectedConversationId(firstConversationId);
    }
  }, [conversations, loadingConversations, routeConversationId, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      loadedConversationIdRef.current = '';
      setActiveConversation(null);
      setMessages([]);
      localStorage.removeItem(lastConversationKey);
      return;
    }

    const selectedConversation = conversations.find(
      (conversation) => getConversationId(conversation) === selectedConversationId
    );

    if (!selectedConversation) {
      if (!routeConversationId && !loadingConversations && conversations.length) {
        const fallbackConversationId = getConversationId(conversations[0]);
        if (fallbackConversationId && fallbackConversationId !== selectedConversationId) {
          setSelectedConversationId(fallbackConversationId);
        }
      }
      return;
    }

    setActiveConversation(selectedConversation);
    localStorage.setItem(lastConversationKey, selectedConversationId);
    markNotificationAsConsumed({ conversationId: selectedConversationId }).catch(() => {});

    if (loadedConversationIdRef.current !== selectedConversationId) {
      loadedConversationIdRef.current = selectedConversationId;
      loadMessages(selectedConversation);
    }
  }, [
    conversations,
    lastConversationKey,
    loadMessages,
    loadingConversations,
    routeConversationId,
    selectedConversationId
  ]);

  useEffect(() => {
    setReplyTo(null);
  }, [selectedConversationId]);

  const upsertConversationPreview = useCallback((message) => {
    const senderId = getUserId(message.senderId);
    const receiverId = getUserId(message.receiverId);
    const participantId = senderId === currentUserId ? receiverId : senderId;
    if (!participantId) return;

    setConversations((current) => {
      const hasConversation = current.some(
        (conversation) => getParticipantId(conversation) === participantId
      );

      if (!hasConversation) {
        loadConversations();
        return current;
      }

      return mergeConversations(current.map((conversation) => {
        if (getParticipantId(conversation) !== participantId) {
          return conversation;
        }

        return {
          ...conversation,
          lastMessage: message,
          lastMessageAt: message.createdAt,
          updatedAt: message.createdAt
        };
      }));
    });
  }, [currentUserId, loadConversations]);

  const handleNewMessage = useCallback((message) => {
    if (isDeletedForCurrentUser(message, currentUserId)) return;
    const senderId = getUserId(message.senderId);
    const receiverId = getUserId(message.receiverId);
    const activeParticipantId = getParticipantId(activeConversation);
    const matchedConversation = conversations.some((conversation) => {
      const participantId = getParticipantId(conversation);
      return participantId && (participantId === senderId || participantId === receiverId);
    });

    if (activeParticipantId && (activeParticipantId === senderId || activeParticipantId === receiverId)) {
      if (activeParticipantId === senderId) setTypingUser(null);
      setMessages((current) => {
        if (current.some((item) => getMessageKey(item) === getMessageKey(message))) {
          return current;
        }
        return mergeMessages(current, [message]);
      });
      if (receiverId === currentUserId && senderId === activeParticipantId) {
        const socket = getChatSocket();
        socket.emit('message:delivered', { messageIds: [message._id] });
        window.clearTimeout(seenDebounceRef.current);
        seenDebounceRef.current = window.setTimeout(() => {
          socket.emit('message:seen', { otherUserId: senderId, messageIds: [message._id] });
        }, 450);
      }
    } else if (receiverId === currentUserId) {
      getChatSocket().emit('message:delivered', { messageIds: [message._id] });
    }

    upsertConversationPreview(message);

    if (!matchedConversation) {
      loadConversations();
    }
  }, [activeConversation, conversations, currentUserId, loadConversations, upsertConversationPreview]);

  const applyMessageStatus = useCallback((payload = {}) => {
    const messageId = String(payload.messageId || payload._id || '');
    if (!messageId) return;

    setMessages((current) => current.map((message) => {
      if (getMessageKey(message) !== messageId) return message;
      const nextStatus = payload.status || (payload.seenAt ? 'seen' : 'delivered');
      return {
        ...message,
        status: nextStatus,
        deliveredAt: payload.deliveredAt || message.deliveredAt,
        seenAt: payload.seenAt || message.seenAt
      };
    }));
  }, []);

  const handleUserOnline = useCallback((payload = {}) => {
    const userId = String(payload.userId || '');
    if (!userId) return;
    setConversations((current) => current.map((conversation) => (
      getParticipantId(conversation) === userId
        ? { ...conversation, participant: { ...conversation.participant, isOnline: true } }
        : conversation
    )));
    setActiveConversation((current) => (
      getParticipantId(current) === userId
        ? { ...current, participant: { ...current.participant, isOnline: true } }
        : current
    ));
  }, []);

  const handleUserOffline = useCallback((payload = {}) => {
    const userId = String(payload.userId || '');
    if (!userId) return;
    setConversations((current) => current.map((conversation) => (
      getParticipantId(conversation) === userId
        ? { ...conversation, participant: { ...conversation.participant, isOnline: false, lastSeenAt: payload.lastSeenAt } }
        : conversation
    )));
    setActiveConversation((current) => (
      getParticipantId(current) === userId
        ? { ...current, participant: { ...current.participant, isOnline: false, lastSeenAt: payload.lastSeenAt } }
        : current
    ));
  }, []);

  const handleChatNotification = useCallback(async (notification) => {
    const senderId = getUserId(notification.fromUserId);
    const receiverId = getUserId(notification.toUserId);
    const activeParticipantId = getParticipantId(activeConversation);

    loadConversations();

    if (activeConversation && activeParticipantId && (activeParticipantId === senderId || activeParticipantId === receiverId)) {
      loadedConversationIdRef.current = '';
      loadMessages(activeConversation);
      return;
    }

    const currentUserIsRecipient = receiverId === currentUserId;
    if (!currentUserIsRecipient) return;

    try {
      const conversation = await resolveConversation({
        conversationId: notification.conversationId,
        fromUserId: notification.fromUserId,
        toUserId: notification.toUserId
      });
      const normalizedConversation = normalizeConversation(conversation, conversation.participant);
      const normalizedConversationId = getConversationId(normalizedConversation);

      setConversations((current) => mergeConversations([normalizedConversation, ...current]));

      if (!activeConversation && normalizedConversationId) {
        setSelectedConversationId(normalizedConversationId);
      }
    } catch (err) {
      loadConversations();
    }
  }, [activeConversation, currentUserId, loadConversations, loadMessages]);

  const handleMessageDeleted = useCallback((payload) => {
    if (payload.chatType !== 'private') return;
    setMessages((current) => current.filter((message) => getMessageKey(message) !== String(payload.messageId)));
  }, []);

  const handleConversationDeleted = useCallback((payload) => {
    if (payload.chatType !== 'private') return;
    setConversations((current) => current.filter((conversation) => String(conversation.id) !== String(payload.conversationId)));
    setSelectedConversationId((current) => (
      String(current || '') === String(payload.conversationId) ? '' : current
    ));
    setActiveConversation((current) => (
      String(current?.id || '') === String(payload.conversationId) ? null : current
    ));
  }, []);

  const handleItemReactionUpdated = useCallback((payload) => {
    if (!['message', 'voiceNote'].includes(payload?.itemType)) return;

    setMessages((current) => current.map((message) => {
      const itemType = getItemTypeForMessage(message);
      if (itemType !== payload.itemType || getMessageKey(message) !== String(payload.itemId)) {
        return message;
      }

      return {
        ...message,
        reactions: payload.reactions || []
      };
    }));
  }, []);

  const handleTypingStart = useCallback((payload = {}) => {
    const activeParticipantId = getParticipantId(activeConversation);
    if (!activeParticipantId || String(payload.fromUserId) !== String(activeParticipantId)) return;

    setTypingUser({
      userId: String(payload.fromUserId),
      name: payload.fromName || activeConversation?.participant?.name || 'Someone'
    });

    if (typingExpiryRef.current) window.clearTimeout(typingExpiryRef.current);
    typingExpiryRef.current = window.setTimeout(() => setTypingUser(null), 3500);
  }, [activeConversation]);

  const handleTypingStop = useCallback((payload = {}) => {
    const activeParticipantId = getParticipantId(activeConversation);
    if (!activeParticipantId || String(payload.fromUserId) !== String(activeParticipantId)) return;
    setTypingUser(null);
  }, [activeConversation]);

  useEffect(() => {
    const socket = getChatSocket();
    socket.on('conversation-deleted', handleConversationDeleted);
    return () => socket.off('conversation-deleted', handleConversationDeleted);
  }, [handleConversationDeleted]);

  useChatSocket({
    onNewMessage: handleNewMessage,
    onMessageDeleted: handleMessageDeleted,
    onChatNotification: handleChatNotification,
    onItemReactionUpdated: handleItemReactionUpdated,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
    onMessageDelivered: applyMessageStatus,
    onMessageSeen: applyMessageStatus,
    onUserOnline: handleUserOnline,
    onUserOffline: handleUserOffline
  });

  useEffect(() => () => {
    if (typingExpiryRef.current) window.clearTimeout(typingExpiryRef.current);
    if (seenDebounceRef.current) window.clearTimeout(seenDebounceRef.current);
  }, []);

  useEffect(() => {
    const participantId = getParticipantId(activeConversation);
    if (!participantId || loadingMessages) return;

    const incoming = messages.filter((message) => (
      getUserId(message.senderId) === participantId
      && getUserId(message.receiverId) === currentUserId
      && message._id
      && !String(message._id).startsWith('temp-')
    ));
    const deliveredIds = incoming
      .filter((message) => message.status !== 'delivered' && message.status !== 'seen')
      .map((message) => String(message._id))
      .filter((messageId) => {
        if (deliveredMessageIdsRef.current.has(messageId)) return false;
        deliveredMessageIdsRef.current.add(messageId);
        return true;
      });
    const seenIds = incoming
      .filter((message) => message.status !== 'seen')
      .map((message) => String(message._id))
      .filter((messageId) => {
        if (seenMessageIdsRef.current.has(messageId)) return false;
        seenMessageIdsRef.current.add(messageId);
        return true;
      });

    const socket = getChatSocket();
    if (deliveredIds.length) {
      socket.emit('message:delivered', { messageIds: deliveredIds });
    }
    if (seenIds.length && document.visibilityState === 'visible') {
      window.clearTimeout(seenDebounceRef.current);
      seenDebounceRef.current = window.setTimeout(() => {
        socket.emit('message:seen', { otherUserId: participantId, messageIds: seenIds });
      }, 450);
    }
  }, [activeConversation, currentUserId, loadingMessages, messages]);

  const handleSelectConversation = async (conversation) => {
    const conversationId = String(conversation?.id || '');
    const participantId = conversation?.participant?._id;

    if ((conversationId.startsWith('new-') || conversationId.startsWith('search-')) && participantId) {
      try {
        const createdConversation = await createConversation(participantId);
        const normalizedConversation = normalizeConversation(createdConversation, conversation.participant);
        setConversations((current) => mergeConversations([normalizedConversation, ...current]));
        const normalizedConversationId = getConversationId(normalizedConversation);
        setSelectedConversationId(normalizedConversationId);
        navigate(`/chat/${normalizedConversationId}`);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to open conversation');
      }
      return;
    }

    if (conversationId) {
      setSelectedConversationId(conversationId);
      navigate(`/chat/${conversationId}`);
    }
  };

  const normalizeConversation = (conversation, participant) => ({
    id: conversation._id || conversation.id,
    participant,
    lastMessage: conversation.lastMessage || null,
    lastMessageAt: conversation.lastMessageAt || null,
    updatedAt: conversation.updatedAt || null
  });

  const handleSelectUser = async (user) => {
    const existingConversation = conversations.find(
      (conversation) => getParticipantId(conversation) === String(user._id)
    );

    if (existingConversation) {
      const existingConversationId = getConversationId(existingConversation);
      setSelectedConversationId(existingConversationId);
      navigate(`/chat/${existingConversationId}`);
      return;
    }

    try {
      const createdConversation = await createConversation(user._id);
      const normalizedConversation = normalizeConversation(createdConversation, user);
      setConversations((current) => mergeConversations([normalizedConversation, ...current]));
      const normalizedConversationId = getConversationId(normalizedConversation);
      setSelectedConversationId(normalizedConversationId);
      navigate(`/chat/${normalizedConversationId}`);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to open conversation');
    }
  };

  const handleSendMessage = async (text) => {
    const receiverId = activeConversation?.participant?._id;
    if (!receiverId) return;

    const replySnapshot = replyTo;
    const clientId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage = {
      _id: clientId,
      clientId,
      senderId: currentUserId,
      receiverId,
      message: text,
      messageType: 'text',
      mediaUrl: '',
      createdAt: new Date().toISOString(),
      status: 'sending',
      repliedToMessageId: replySnapshot?.messageId,
      repliedToPreview: replySnapshot?.preview,
      repliedToSender: replySnapshot?.senderName
    };

    setMessages((current) => mergeMessages(current, [optimisticMessage]));
    setReplyTo(null);
    upsertConversationPreview(optimisticMessage);
    setPendingSends((count) => count + 1);
    setError('');
    emitTypingStop();

    try {
      const savedMessage = await sendMessage({
        receiverId,
        message: text,
        repliedToMessageId: replySnapshot?.messageId || ''
      });
      setMessages((current) => mergeMessages(
        current.filter((message) => message.clientId !== clientId),
        [savedMessage]
      ));
      upsertConversationPreview(savedMessage);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to send message');
      setMessages((current) => current.map((message) => (
        message.clientId === clientId ? { ...message, status: 'failed' } : message
      )));
    } finally {
      setPendingSends((count) => Math.max(0, count - 1));
    }
  };

  const handleSendVoice = async (audioBlob, duration) => {
    const receiverId = activeConversation?.participant?._id;
    if (!receiverId || !audioBlob) return;

    setPendingSends((count) => count + 1);
    setError('');
    const replySnapshot = replyTo;
    setReplyTo(null);

    try {
      const audio = await uploadAudio(audioBlob);
      const savedMessage = await sendMessage({
        receiverId,
        message: 'Voice note',
        messageType: 'voice',
        mediaUrl: audio.mediaUrl,
        duration,
        repliedToMessageId: replySnapshot?.messageId || ''
      });

      setMessages((current) => mergeMessages(current, [savedMessage]));
      upsertConversationPreview(savedMessage);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to send voice note');
    } finally {
      setPendingSends((count) => Math.max(0, count - 1));
    }
  };

  const handleSendMedia = async (file) => {
    const receiverId = activeConversation?.participant?._id;
    if (!receiverId || !file) return;

    setPendingSends((count) => count + 1);
    setError('');
    const replySnapshot = replyTo;
    setReplyTo(null);

    try {
      const media = await uploadMedia(file);
      const savedMessage = await sendMessage({
        receiverId,
        message: media.fileName || file.name || 'Attachment',
        messageType: media.messageType || 'file',
        mediaUrl: media.mediaUrl,
        fileName: media.fileName || file.name || '',
        mimeType: media.mimeType || file.type || '',
        size: media.size || file.size || null,
        repliedToMessageId: replySnapshot?.messageId || ''
      });

      setMessages((current) => mergeMessages(current, [savedMessage]));
      upsertConversationPreview(savedMessage);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to send attachment');
    } finally {
      setPendingSends((count) => Math.max(0, count - 1));
    }
  };

  const handleCallEnded = useCallback(() => {
    // Call logs are persisted by the call socket lifecycle so global calls are covered too.
  }, []);

  const handleDeleteMessage = async (message, deleteType = 'forEveryone') => {
    const messageId = message?._id;
    if (!messageId) return;

    setMessages((current) => current.filter((item) => getMessageKey(item) !== String(messageId)));

    try {
      await deleteMessage(messageId, deleteType);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete message');
      loadMessages(activeConversation);
    }
  };

  const handleReactToMessage = async (message, reactionType) => {
    const messageId = getMessageKey(message);
    const itemType = getItemTypeForMessage(message);
    if (!messageId || ['sending', 'failed'].includes(message.status) || !itemType) return;

    const previousReactions = message.reactions || [];
    const optimisticReactions = getNextReactions(previousReactions, currentUserId, reactionType);

    setMessages((current) => current.map((item) => (
      getMessageKey(item) === messageId ? { ...item, reactions: optimisticReactions } : item
    )));
    setError('');

    try {
      const result = itemType === 'voiceNote'
        ? await reactToVoiceNote(messageId, reactionType)
        : await reactToTextMessage(messageId, reactionType);

      setMessages((current) => current.map((item) => (
        getMessageKey(item) === messageId ? { ...item, reactions: result.reactions || optimisticReactions } : item
      )));
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update reaction');
      setMessages((current) => current.map((item) => (
        getMessageKey(item) === messageId ? { ...item, reactions: previousReactions } : item
      )));
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyTo(buildReplyTarget(message, currentUserId, activeConversation?.participant?.name));
  };

  const emitTypingStart = useCallback(() => {
    const participantId = getParticipantId(activeConversation);
    if (!participantId || typingActiveRef.current) return;

    typingActiveRef.current = true;
    getChatSocket().emit('typing:start', {
      toUserId: participantId,
      conversationId: getConversationId(activeConversation)
    });
  }, [activeConversation]);

  const emitTypingStop = useCallback(() => {
    const participantId = getParticipantId(activeConversation);
    if (!participantId || !typingActiveRef.current) return;

    typingActiveRef.current = false;
    getChatSocket().emit('typing:stop', {
      toUserId: participantId,
      conversationId: getConversationId(activeConversation)
    });
  }, [activeConversation]);

  useEffect(() => {
    typingActiveRef.current = false;
    setTypingUser(null);
  }, [activeConversation?.id]);

  const handleOpenForward = async (message) => {
    setForwardMessage(message);
    try {
      const groups = await fetchMyGroups();
      setForwardGroups(groups);
    } catch (err) {
      setForwardGroups([]);
    }
  };

  const handleForwardMessage = async ({ type, target }) => {
    if (!forwardMessage) return;

    const forwardedFrom = {
      messageId: forwardMessage._id,
      senderId: forwardMessage.senderId?._id || forwardMessage.senderId || currentUserId
    };
    const payload = {
      message: forwardMessage.message || '',
      messageType: forwardMessage.messageType || 'text',
      mediaUrl: forwardMessage.mediaUrl || '',
      fileName: forwardMessage.fileName || '',
      mimeType: forwardMessage.mimeType || '',
      size: forwardMessage.size || null,
      duration: forwardMessage.duration || null,
      forwardedFrom
    };

    try {
      if (type === 'chat' || type === 'user') {
        const receiverId = type === 'user' ? target._id : target.participant?._id;
        const savedMessage = await sendMessage({ receiverId, ...payload });
        if (String(receiverId) === getParticipantId(activeConversation)) {
          setMessages((current) => mergeMessages(current, [savedMessage]));
        }
        upsertConversationPreview(savedMessage);
        loadConversations();
      } else if (type === 'group') {
        getChatSocket().emit('group-message', {
          groupId: target._id,
          ...payload
        }, (response) => {
          if (!response?.success) {
            setError(response?.msg || 'Failed to forward message');
          }
        });
      }
      setForwardMessage(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to forward message');
    }
  };

  const handleDeleteConversation = async (conversation) => {
    const conversationId = conversation?.id;
    if (!conversationId || String(conversationId).startsWith('new-') || String(conversationId).startsWith('search-')) return;
    const wasActiveConversation = String(activeConversation?.id || '') === String(conversationId);

    setConversations((current) => current.filter((item) => String(item.id) !== String(conversationId)));
    setSelectedConversationId((current) => (
      String(current || '') === String(conversationId) ? '' : current
    ));
    setActiveConversation((current) => (
      String(current?.id || '') === String(conversationId) ? null : current
    ));
    if (wasActiveConversation) {
      navigate('/chat');
    }

    try {
      await deleteConversation(conversationId);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete conversation');
      loadConversations();
    }
  };

  const {
    localStream,
    remoteStream,
    callState,
    callType,
    durationSeconds,
    muted,
    cameraOn,
    error: callError,
    startCall,
    endCurrentCall,
    toggleMute,
    toggleCamera
  } = useWebRTC({ onCallEnded: handleCallEnded });

  const activeParticipantId = getParticipantId(activeConversation);
  const handleStartAudioCall = () => {
    if (activeParticipantId) {
      startCall(activeParticipantId, 'audio');
    }
  };

  const handleStartVideoCall = () => {
    if (activeParticipantId) {
      startCall(activeParticipantId, 'video');
    }
  };

  return (
    <>
      <FeaturePage
        title="Chat"
        description="Secure conversations with your connected contacts."
        backLabel="Back to Dashboard"
        onBack={() => navigate('/dashboard')}
      >
        <StatusAlert variant="error">{error}</StatusAlert>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div>
            <SearchUsers onSelectUser={handleSelectUser} />
            <ConversationList
              conversations={conversations}
              activeParticipantId={activeParticipantId}
              loading={loadingConversations}
              error={error}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
            />
          </div>

          <ChatBox
            conversation={activeConversation}
            messages={messages}
            currentUserId={currentUserId}
            loadingMessages={loadingMessages}
            sending={pendingSends > 0}
            onSendMessage={handleSendMessage}
            onSendVoice={handleSendVoice}
            onSendMedia={handleSendMedia}
            onTypingStart={emitTypingStart}
            onTypingStop={emitTypingStop}
            onDeleteMessage={handleDeleteMessage}
            onReactToMessage={handleReactToMessage}
            onReplyToMessage={handleReplyToMessage}
            onForwardMessage={handleOpenForward}
            typingLabel={typingUser ? `${typingUser.name} is typing...` : ''}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            targetMessageId={targetMessageId}
            callDisabled={!activeParticipantId || callState !== 'idle'}
            onStartAudioCall={handleStartAudioCall}
            onStartVideoCall={handleStartVideoCall}
          />
        </div>
      </FeaturePage>

      <ForwardMessageModal
        open={Boolean(forwardMessage)}
        conversations={conversations}
        groups={forwardGroups}
        onSearchUsers={searchForwardUsers}
        onClose={() => setForwardMessage(null)}
        onForward={handleForwardMessage}
      />

      <CallScreen
        callState={callState}
        callType={callType}
        localStream={localStream}
        remoteStream={remoteStream}
        durationSeconds={durationSeconds}
        muted={muted}
        cameraOn={cameraOn}
        error={callError}
        onMute={toggleMute}
        onToggleCamera={toggleCamera}
        onEnd={endCurrentCall}
      />
    </>
  );
}
