import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatBox from '../components/ChatBox';
import ConversationList from '../components/ConversationList';
import SearchUsers from '../components/SearchUsers';
import useChatSocket from '../hooks/useChatSocket';
import { getChatSocket } from '../services/socket';
import { createConversation, deleteConversation, deleteMessage, fetchConversations, fetchMessages, sendMessage, uploadAudio } from '../services/chatApi';
import CallScreen from '../../calls/CallScreen';
import IncomingCallModal from '../../calls/IncomingCallModal';
import useWebRTC from '../../calls/useWebRTC';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

const getParticipantId = (conversation) => String(conversation?.participant?._id || '');
const getUserId = (value) => String(value?._id || value || '');
const getMessageKey = (message) => String(message?._id || message?.clientId || '');
const getConversationTime = (conversation) => new Date(conversation?.lastMessageAt || conversation?.updatedAt || 0).getTime();

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

export default function ChatPage() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentUserId = String(currentUser.id || currentUser._id || '');
  const messageRequestRef = useRef(0);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pendingSends, setPendingSends] = useState(0);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    setError('');

    try {
      const data = await fetchConversations();
      const visibleConversations = data.filter((conversation) => conversation.participant);
      setConversations((current) => mergeConversations([...current, ...visibleConversations]));
      setActiveConversation((current) => {
        if (!current) return current;
        return visibleConversations.find(
          (conversation) => getParticipantId(conversation) === getParticipantId(current)
        ) || current;
      });
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
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation, loadMessages]);

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

  const handleMessageDeleted = useCallback((payload) => {
    if (payload.chatType !== 'private') return;
    setMessages((current) => current.filter((message) => getMessageKey(message) !== String(payload.messageId)));
  }, []);

  const handleConversationDeleted = useCallback((payload) => {
    if (payload.chatType !== 'private') return;
    setConversations((current) => current.filter((conversation) => String(conversation.id) !== String(payload.conversationId)));
    setActiveConversation((current) => (
      String(current?.id || '') === String(payload.conversationId) ? null : current
    ));
  }, []);

  useEffect(() => {
    const socket = getChatSocket();
    socket.on('conversation-deleted', handleConversationDeleted);
    return () => socket.off('conversation-deleted', handleConversationDeleted);
  }, [handleConversationDeleted]);

  useChatSocket({ onNewMessage: handleNewMessage, onMessageDeleted: handleMessageDeleted });

  const handleSelectConversation = async (conversation) => {
    const conversationId = String(conversation?.id || '');
    const participantId = conversation?.participant?._id;

    if ((conversationId.startsWith('new-') || conversationId.startsWith('search-')) && participantId) {
      try {
        const createdConversation = await createConversation(participantId);
        const normalizedConversation = normalizeConversation(createdConversation, conversation.participant);
        setConversations((current) => mergeConversations([normalizedConversation, ...current]));
        setActiveConversation(normalizedConversation);
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to open conversation');
      }
      return;
    }

    setActiveConversation(conversation);
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
      setActiveConversation(existingConversation);
      return;
    }

    try {
      const createdConversation = await createConversation(user._id);
      const normalizedConversation = normalizeConversation(createdConversation, user);
      setConversations((current) => mergeConversations([normalizedConversation, ...current]));
      setActiveConversation(normalizedConversation);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to open conversation');
    }
  };

  const handleSendMessage = async (text) => {
    const receiverId = activeConversation?.participant?._id;
    if (!receiverId) return;

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
      status: 'sending'
    };

    setMessages((current) => mergeMessages(current, [optimisticMessage]));
    upsertConversationPreview(optimisticMessage);
    setPendingSends((count) => count + 1);
    setError('');

    try {
      const savedMessage = await sendMessage({ receiverId, message: text });
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

    try {
      const audio = await uploadAudio(audioBlob);
      const savedMessage = await sendMessage({
        receiverId,
        message: 'Voice note',
        messageType: 'voice',
        mediaUrl: audio.mediaUrl,
        duration
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

  const handleDeleteMessage = async (message) => {
    const messageId = message?._id;
    if (!messageId) return;

    setMessages((current) => current.filter((item) => getMessageKey(item) !== String(messageId)));

    try {
      await deleteMessage(messageId);
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete message');
      loadMessages(activeConversation);
    }
  };

  const handleDeleteConversation = async (conversation) => {
    const conversationId = conversation?.id;
    if (!conversationId || String(conversationId).startsWith('new-') || String(conversationId).startsWith('search-')) return;

    setConversations((current) => current.filter((item) => String(item.id) !== String(conversationId)));
    setActiveConversation((current) => (
      String(current?.id || '') === String(conversationId) ? null : current
    ));

    try {
      await deleteConversation(conversationId);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete conversation');
      loadConversations();
    }
  };

  const {
    incomingCall,
    localStream,
    remoteStream,
    callState,
    callType,
    durationSeconds,
    muted,
    cameraOn,
    error: callError,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
            <p className="text-gray-600">Secure conversations with your connected contacts.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/groups')} className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white">
              Groups
            </button>
            <button onClick={() => navigate('/dashboard')} className="rounded-xl bg-gray-200 px-4 py-2 font-medium">
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">{error}</div>}

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
            callDisabled={!activeParticipantId || callState !== 'idle'}
            onStartAudioCall={handleStartAudioCall}
            onStartVideoCall={handleStartVideoCall}
          />
        </div>
      </div>

      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
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
    </div>
  );
}
