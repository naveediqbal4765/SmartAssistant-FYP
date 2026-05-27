import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChatBox from '../components/ChatBox';
import ConversationList from '../components/ConversationList';
import SearchUsers from '../components/SearchUsers';
import useChatSocket from '../hooks/useChatSocket';
import { getChatSocket } from '../services/socket';
import { createConversation, deleteConversation, deleteMessage, fetchConversation, fetchConversations, fetchMessages, reactToMessage as reactToTextMessage, reactToVoiceNote, resolveConversation, sendMessage, uploadAudio } from '../services/chatApi';
import { buildReplyTarget } from '../utils/replyPreview';
import CallScreen from '../../calls/CallScreen';
import useWebRTC from '../../calls/useWebRTC';
import { markNotificationAsConsumed } from '../../notifications/notificationConsumption';
import FeaturePage from '../../../../components/ui/FeaturePage';
import StatusAlert from '../../../../components/ui/StatusAlert';

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
  if (message?.messageType === 'text') return 'message';
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
      setMessages((current) => {
        if (current.some((item) => getMessageKey(item) === getMessageKey(message))) {
          return current;
        }
        return mergeMessages(current, [message]);
      });
    }

    upsertConversationPreview(message);

    if (!matchedConversation) {
      loadConversations();
    }
  }, [activeConversation, conversations, currentUserId, loadConversations, upsertConversationPreview]);

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

  useEffect(() => {
    const socket = getChatSocket();
    socket.on('conversation-deleted', handleConversationDeleted);
    return () => socket.off('conversation-deleted', handleConversationDeleted);
  }, [handleConversationDeleted]);

  useChatSocket({
    onNewMessage: handleNewMessage,
    onMessageDeleted: handleMessageDeleted,
    onChatNotification: handleChatNotification,
    onItemReactionUpdated: handleItemReactionUpdated
  });

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

  const handleCallEnded = useCallback(async ({ peerUserId, durationSeconds, callType = 'audio' }) => {
    if (!peerUserId || !durationSeconds) return;

    setPendingSends((count) => count + 1);
    setError('');

    try {
      const savedMessage = await sendMessage({
        receiverId: peerUserId,
        message: callType === 'video' ? 'Video call' : 'Audio call',
        messageType: 'call',
        duration: durationSeconds
      });

      setMessages((current) => mergeMessages(current, [savedMessage]));
      upsertConversationPreview(savedMessage);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to save call log');
    } finally {
      setPendingSends((count) => Math.max(0, count - 1));
    }
  }, [loadConversations, upsertConversationPreview]);

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
    if (!messageId || message.status || !itemType) return;

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
            onDeleteMessage={handleDeleteMessage}
            onReactToMessage={handleReactToMessage}
            onReplyToMessage={handleReplyToMessage}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            targetMessageId={targetMessageId}
            callDisabled={!activeParticipantId || callState !== 'idle'}
            onStartAudioCall={handleStartAudioCall}
            onStartVideoCall={handleStartVideoCall}
          />
        </div>
      </FeaturePage>

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
