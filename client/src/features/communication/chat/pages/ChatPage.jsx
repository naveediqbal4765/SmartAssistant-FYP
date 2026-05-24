import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatBox from '../components/ChatBox';
import ConversationList from '../components/ConversationList';
import SearchUsers from '../components/SearchUsers';
import useChatSocket from '../hooks/useChatSocket';
import { fetchConversations, fetchMessages, sendMessage, uploadAudio } from '../services/chatApi';

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
  }, []);

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
        setMessages((current) => mergeMessages(current, data));
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
  }, [activeConversation, conversations, loadConversations, upsertConversationPreview]);

  useChatSocket({ onNewMessage: handleNewMessage });

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleSelectUser = (user) => {
    const existingConversation = conversations.find(
      (conversation) => getParticipantId(conversation) === String(user._id)
    );

    if (existingConversation) {
      setActiveConversation(existingConversation);
      return;
    }

    const newConversation = {
      id: `search-${user._id}`,
      participant: user,
      lastMessage: null,
      lastMessageAt: null,
      updatedAt: null
    };

    setConversations((current) => [newConversation, ...current]);
    setActiveConversation(newConversation);
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

  const activeParticipantId = getParticipantId(activeConversation);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
            <p className="text-gray-600">Secure conversations with your connected contacts.</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="rounded-xl bg-gray-200 px-4 py-2 font-medium">
            Back to Dashboard
          </button>
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
          />
        </div>
      </div>
    </div>
  );
}
