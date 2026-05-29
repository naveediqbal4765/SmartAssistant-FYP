import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getChatSocket } from '../chat/services/socket';
import AddMemberModal from './AddMemberModal';
import AdminLeaveGroupModal from './AdminLeaveGroupModal';
import CreateGroupModal from './CreateGroupModal';
import ForwardMessageModal from '../chat/components/ForwardMessageModal';
import GroupCallScreen from './GroupCallScreen';
import GroupChat from './GroupChat';
import GroupList from './GroupList';
import GroupSettingsModal from './GroupSettingsModal';
import useGroupCall from './useGroupCall';
import Button from '../../../components/ui/Button';
import FeaturePage from '../../../components/ui/FeaturePage';
import { useDialog } from '../../../components/ui/GlobalDialogProvider';
import { SkeletonBlock, SkeletonLine } from '../../../components/ui/Skeleton';
import StatusAlert from '../../../components/ui/StatusAlert';
import { fetchConversations, searchUsers as searchForwardUsers, sendMessage as sendDirectMessage } from '../chat/services/chatApi';
import {
  addMemberToGroup,
  approveGroupRequest,
  cancelJoinRequest,
  createGroup,
  deleteGroup as deleteGroupById,
  deleteGroupMessage,
  discoverGroups,
  exitGroup,
  fetchGroupMessages,
  fetchGroupRequests,
  fetchMyGroups,
  getGroupApiErrorMessage,
  muteGroup,
  reactToGroupMessage,
  rejectGroupRequest,
  removeGroupMember,
  requestToJoinGroup,
  transferAdminAndExitGroup,
  updateGroup,
  uploadGroupAudio,
  uploadGroupMedia
} from './groupApi';

const mergeById = (items, nextItem) => {
  const map = new Map(items.map((item) => [String(item._id), item]));
  map.set(String(nextItem._id), nextItem);
  return Array.from(map.values());
};

const isDeletedForCurrentUser = (message, currentUserId) => {
  return (message.deletedFor || []).some((id) => String(id?._id || id) === String(currentUserId));
};

const getUserId = (value) => String(value?._id || value || '');
const isGroupAdminForUser = (group, userId) => (
  group?.members?.some((member) => getUserId(member.userId) === String(userId) && member.role === 'admin')
);

const reactionEmojiByType = {
  like: '👍',
  heart: '❤️',
  haha: '😂',
  sad: '😢'
};

const getNextReactions = (reactions = [], currentUserId, reactionType) => {
  const existing = reactions.find((reaction) => getUserId(reaction.userId) === String(currentUserId));

  if (existing?.type === reactionType) {
    return reactions.filter((reaction) => getUserId(reaction.userId) !== String(currentUserId));
  }

  const nextReaction = {
    userId: currentUserId,
    type: reactionType,
    emoji: reactionEmojiByType[reactionType],
    createdAt: new Date().toISOString()
  };

  if (existing) {
    return reactions.map((reaction) => (
      getUserId(reaction.userId) === String(currentUserId) ? nextReaction : reaction
    ));
  }

  return [...reactions, nextReaction];
};

export default function GroupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dialog = useDialog();
  const { groupId } = useParams();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const currentUserId = user._id || user.id;
  const groupRequestRef = useRef(0);
  const groupTypingActiveRef = useRef(false);
  const groupTypingExpiryRef = useRef({});
  const seenDebounceRef = useRef(null);
  const deliveredGroupMessageIdsRef = useRef(new Set());
  const seenGroupMessageIdsRef = useRef(new Set());
  const [groups, setGroups] = useState([]);
  const [discoverableGroups, setDiscoverableGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [forwardMessage, setForwardMessage] = useState(null);
  const [forwardConversations, setForwardConversations] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminLeaveGroup, setAdminLeaveGroup] = useState(null);
  const [adminLeaveSubmitting, setAdminLeaveSubmitting] = useState(false);
  const targetMessageId = location.state?.messageId || '';
  const activeGroupIsAdmin = isGroupAdminForUser(activeGroup, currentUserId);
  const {
    activeCall: activeGroupCall,
    callState: groupCallState,
    callType: groupCallType,
    localParticipant: groupCallLocalParticipant,
    remoteStreams: groupCallRemoteStreams,
    muted: groupCallMuted,
    cameraOn: groupCallCameraOn,
    durationSeconds: groupCallDurationSeconds,
    error: groupCallError,
    startGroupCall,
    joinGroupCall,
    syncActiveCall,
    leaveGroupCall,
    toggleMute: toggleGroupCallMute,
    toggleCamera: toggleGroupCallCamera
  } = useGroupCall({
    group: activeGroup,
    currentUserId,
    currentUserName: user.name || 'You'
  });

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError('');

    try {
      const [myGroups, availableGroups] = await Promise.all([fetchMyGroups(), discoverGroups()]);
      setGroups(myGroups);
      setDiscoverableGroups(availableGroups);
      setActiveGroup((current) => {
        const routedGroup = myGroups.find((group) => String(group._id) === String(groupId));
        if (routedGroup) return routedGroup;
        if (current && myGroups.some((group) => String(group._id) === String(current._id))) return current;
        return myGroups[0] || null;
      });
    } catch (err) {
      console.error('Failed to load groups:', err);
      setError(getGroupApiErrorMessage(err, 'Failed to load groups'));
    } finally {
      setLoadingGroups(false);
    }
  }, [groupId]);

  const loadActiveGroupData = useCallback(async (group) => {
    const requestId = groupRequestRef.current + 1;
    groupRequestRef.current = requestId;

    if (!group) {
      setMessages([]);
      setRequests([]);
      return;
    }

    const socket = getChatSocket();
    socket.emit('join-group-room', { groupId: group._id }, (response) => {
      syncActiveCall(response?.activeCall || null);
    });
    const groupMessages = await fetchGroupMessages(group._id);
    if (groupRequestRef.current !== requestId) return;
    setMessages(groupMessages.filter((message) => !isDeletedForCurrentUser(message, currentUserId)));

    const isAdmin = group.members?.some((member) => {
      const memberId = String(member.userId?._id || member.userId);
      return memberId === String(currentUserId) && member.role === 'admin';
    });

    if (isAdmin) {
      const pendingRequests = await fetchGroupRequests(group._id);
      if (groupRequestRef.current !== requestId) return;
      setRequests(pendingRequests);
    } else {
      setRequests([]);
    }
  }, [currentUserId, syncActiveCall]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!groupId || !groups.length) return;
    const routedGroup = groups.find((group) => String(group._id) === String(groupId));
    if (routedGroup) setActiveGroup(routedGroup);
  }, [groupId, groups]);

  useEffect(() => {
    loadActiveGroupData(activeGroup).catch((err) => {
      console.error('Failed to load group:', err);
      setError(getGroupApiErrorMessage(err, 'Failed to load group'));
    });
  }, [activeGroup, loadActiveGroupData]);

  useEffect(() => {
    if (!location.state?.acceptGroupCall) return;
    if (!activeGroupCall?.groupId || String(activeGroupCall.groupId) !== String(activeGroup?._id)) return;
    if (location.state.callId && String(activeGroupCall.callId || '') !== String(location.state.callId)) return;
    if (groupCallState !== 'idle') return;

    joinGroupCall();
    navigate(location.pathname, { replace: true, state: {} });
  }, [
    activeGroup?._id,
    activeGroupCall,
    groupCallState,
    joinGroupCall,
    location.pathname,
    location.state,
    navigate
  ]);

  useEffect(() => {
    const socket = getChatSocket();
    const handleGroupMessage = (message) => {
      if (String(message.groupId) !== String(activeGroup?._id)) return;
      if (isDeletedForCurrentUser(message, currentUserId)) return;
      setTypingUsers((current) => {
        const next = { ...current };
        delete next[String(message.senderId?._id || message.senderId)];
        return next;
      });
      setMessages((current) => mergeById(current, message));
      if (String(message.senderId?._id || message.senderId) !== String(currentUserId)) {
        socket.emit('group-message:delivered', { groupId: activeGroup._id, messageIds: [message._id] });
        window.clearTimeout(seenDebounceRef.current);
        seenDebounceRef.current = window.setTimeout(() => {
          socket.emit('group-message:seen', { groupId: activeGroup._id, messageIds: [message._id] });
        }, 600);
      }
    };
    const handleMessageDeleted = (payload) => {
      if (payload.chatType !== 'group') return;
      setMessages((current) => current.filter((message) => String(message._id) !== String(payload.messageId)));
    };
    const handleGroupTypingStart = (payload = {}) => {
      if (String(payload.groupId) !== String(activeGroup?._id)) return;
      if (String(payload.fromUserId) === String(currentUserId)) return;

      const userId = String(payload.fromUserId);
      setTypingUsers((current) => ({
        ...current,
        [userId]: payload.fromName || 'Someone'
      }));

      if (groupTypingExpiryRef.current[userId]) {
        window.clearTimeout(groupTypingExpiryRef.current[userId]);
      }
      groupTypingExpiryRef.current[userId] = window.setTimeout(() => {
        setTypingUsers((current) => {
          const next = { ...current };
          delete next[userId];
          return next;
        });
      }, 3500);
    };
    const handleGroupTypingStop = (payload = {}) => {
      if (String(payload.groupId) !== String(activeGroup?._id)) return;
      const userId = String(payload.fromUserId);
      setTypingUsers((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
    };
    const handleGroupUpdated = (payload) => {
      const updatedGroup = payload?.group;
      if (!updatedGroup?._id) return;

      setGroups((current) => mergeById(current, updatedGroup));
      setDiscoverableGroups((current) => current.filter((group) => String(group._id) !== String(updatedGroup._id)));
      setActiveGroup((current) => (
        String(current?._id || '') === String(updatedGroup._id) ? updatedGroup : current
      ));
    };
    const handleGroupRequestUpdated = (payload) => {
      if (!payload?.groupId) return;

      if (payload.status === 'pending' && payload.request) {
        if (String(payload.request.userId?._id || payload.request.userId) === String(currentUserId)) {
          setDiscoverableGroups((current) => current.map((group) => (
            String(group._id) === String(payload.groupId)
              ? { ...group, joinRequestStatus: 'pending', joinRequestId: payload.request._id }
              : group
          )));
        }

        if (String(payload.groupId) === String(activeGroup?._id)) {
          setRequests((current) => mergeById(current, payload.request));
        }
        return;
      }

      if (payload.status === 'approved') {
        if (payload.group) {
          setGroups((current) => mergeById(current, payload.group));
          setDiscoverableGroups((current) => current.filter((group) => String(group._id) !== String(payload.groupId)));
        }
        setRequests((current) => current.filter((request) => String(request._id) !== String(payload.requestId)));
        return;
      }

      if (payload.status === 'rejected' || payload.status === 'cancelled') {
        setDiscoverableGroups((current) => current.map((group) => (
          String(group._id) === String(payload.groupId)
            ? { ...group, joinRequestStatus: undefined, joinRequestId: undefined }
            : group
        )));
        setRequests((current) => current.filter((request) => String(request._id) !== String(payload.requestId)));
      }
    };
    const handleItemReactionUpdated = (payload) => {
      if (payload?.itemType !== 'groupMessage') return;
      if (String(payload.groupId) !== String(activeGroup?._id)) return;

      setMessages((current) => current.map((message) => (
        String(message._id) === String(payload.itemId)
          ? { ...message, reactions: payload.reactions || [] }
          : message
      )));
    };
    const handleConversationDeleted = (payload) => {
      if (payload.chatType !== 'group') return;
      setGroups((current) => current.filter((group) => String(group._id) !== String(payload.conversationId)));
      setActiveGroup((current) => (
        String(current?._id || '') === String(payload.conversationId) ? null : current
      ));
    };
    const applyGroupLifecycleUpdate = (payload = {}, type) => {
      if (String(payload.groupId) !== String(activeGroup?._id)) return;
      setMessages((current) => current.map((message) => {
        if (String(message._id) !== String(payload.messageId)) return message;
        const userId = String(payload.userId || '');
        const deliveredTo = message.deliveredTo || [];
        const seenBy = message.seenBy || [];

        if (type === 'delivered' && userId && !deliveredTo.some((item) => getUserId(item.userId) === userId)) {
          return {
            ...message,
            deliveredTo: [...deliveredTo, { userId, deliveredAt: payload.deliveredAt }]
          };
        }

        if (type === 'seen' && userId && !seenBy.some((item) => getUserId(item.userId) === userId)) {
          return {
            ...message,
            seenBy: [...seenBy, { userId, seenAt: payload.seenAt }]
          };
        }

        return message;
      }));
    };
    const handleGroupDelivered = (payload) => applyGroupLifecycleUpdate(payload, 'delivered');
    const handleGroupSeen = (payload) => applyGroupLifecycleUpdate(payload, 'seen');

    socket.on('group-message', handleGroupMessage);
    socket.on('group:typing:start', handleGroupTypingStart);
    socket.on('group:typing:stop', handleGroupTypingStop);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('group-updated', handleGroupUpdated);
    socket.on('group-request-updated', handleGroupRequestUpdated);
    socket.on('ITEM_REACTION_UPDATED', handleItemReactionUpdated);
    socket.on('conversation-deleted', handleConversationDeleted);
    socket.on('group-message:delivered', handleGroupDelivered);
    socket.on('group-message:seen', handleGroupSeen);
    return () => {
      socket.off('group-message', handleGroupMessage);
      socket.off('group:typing:start', handleGroupTypingStart);
      socket.off('group:typing:stop', handleGroupTypingStop);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('group-updated', handleGroupUpdated);
      socket.off('group-request-updated', handleGroupRequestUpdated);
      socket.off('ITEM_REACTION_UPDATED', handleItemReactionUpdated);
      socket.off('conversation-deleted', handleConversationDeleted);
      socket.off('group-message:delivered', handleGroupDelivered);
      socket.off('group-message:seen', handleGroupSeen);
    };
  }, [activeGroup?._id, currentUserId]);

  const handleCreateGroup = async (payload) => {
    try {
      const group = await createGroup(payload);
      setGroups((current) => mergeById(current, group));
      setActiveGroup(group);
      navigate(`/groups/${group._id}`);
      setCreateOpen(false);
    } catch (err) {
      const message = getGroupApiErrorMessage(err, 'Failed to create group');
      console.error('Create group failed:', {
        status: err?.response?.status,
        data: err?.response?.data,
        message
      });
      setError(message);
      return false;
    }

    return true;
  };

  const handleSelectGroup = (group) => {
    setActiveGroup(group);
    navigate(`/groups/${group._id}`);
  };

  const emitGroupTypingStart = useCallback(() => {
    if (!activeGroup?._id || groupTypingActiveRef.current) return;
    groupTypingActiveRef.current = true;
    getChatSocket().emit('group:typing:start', {
      groupId: activeGroup._id,
      conversationId: activeGroup._id
    });
  }, [activeGroup?._id]);

  const emitGroupTypingStop = useCallback(() => {
    if (!activeGroup?._id || !groupTypingActiveRef.current) return;
    groupTypingActiveRef.current = false;
    getChatSocket().emit('group:typing:stop', {
      groupId: activeGroup._id,
      conversationId: activeGroup._id
    });
  }, [activeGroup?._id]);

  useEffect(() => {
    groupTypingActiveRef.current = false;
    setTypingUsers({});
  }, [activeGroup?._id]);

  useEffect(() => () => {
    Object.values(groupTypingExpiryRef.current).forEach((timerId) => window.clearTimeout(timerId));
    if (seenDebounceRef.current) window.clearTimeout(seenDebounceRef.current);
  }, []);

  useEffect(() => {
    if (!activeGroup?._id) return;
    const incoming = messages.filter((message) => (
      String(message.groupId) === String(activeGroup._id)
      && getUserId(message.senderId) !== String(currentUserId)
      && message._id
    ));
    const deliveredIds = incoming
      .filter((message) => !(message.deliveredTo || []).some((item) => getUserId(item.userId) === String(currentUserId)))
      .map((message) => String(message._id))
      .filter((messageId) => {
        if (deliveredGroupMessageIdsRef.current.has(messageId)) return false;
        deliveredGroupMessageIdsRef.current.add(messageId);
        return true;
      });
    const seenIds = incoming
      .filter((message) => !(message.seenBy || []).some((item) => getUserId(item.userId) === String(currentUserId)))
      .map((message) => String(message._id))
      .filter((messageId) => {
        if (seenGroupMessageIdsRef.current.has(messageId)) return false;
        seenGroupMessageIdsRef.current.add(messageId);
        return true;
      });

    const socket = getChatSocket();
    if (deliveredIds.length) {
      socket.emit('group-message:delivered', { groupId: activeGroup._id, messageIds: deliveredIds });
    }
    if (seenIds.length && document.visibilityState === 'visible') {
      window.clearTimeout(seenDebounceRef.current);
      seenDebounceRef.current = window.setTimeout(() => {
        socket.emit('group-message:seen', { groupId: activeGroup._id, messageIds: seenIds });
      }, 600);
    }
  }, [activeGroup?._id, currentUserId, messages]);

  const handleSendMessage = (text, replyTo) => {
    const socket = getChatSocket();
    emitGroupTypingStop();
    socket.emit('group-message', {
      groupId: activeGroup._id,
      message: text,
      messageType: 'text',
      repliedToMessageId: replyTo?.messageId || ''
    }, (response) => {
      if (!response?.success) {
        setError(response?.msg || 'Failed to send group message');
      }
    });
  };

  const handleSendVoice = async (audioBlob, duration, replyTo) => {
    if (!activeGroup?._id || !audioBlob) return;

    try {
      const audio = await uploadGroupAudio(audioBlob);
      const socket = getChatSocket();
      socket.emit('group-message', {
        groupId: activeGroup._id,
        message: 'Voice note',
        messageType: 'voice',
        mediaUrl: audio.mediaUrl,
        repliedToMessageId: replyTo?.messageId || ''
      }, (response) => {
        if (!response?.success) {
          setError(response?.msg || 'Failed to send group voice note');
        }
      });
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to send group voice note'));
    }
  };

  const handleSendMedia = async (file, replyTo) => {
    if (!activeGroup?._id || !file) return;

    try {
      const media = await uploadGroupMedia(file);
      const socket = getChatSocket();
      socket.emit('group-message', {
        groupId: activeGroup._id,
        message: media.fileName || file.name || 'Attachment',
        messageType: media.messageType || 'file',
        mediaUrl: media.mediaUrl,
        fileName: media.fileName || file.name || '',
        mimeType: media.mimeType || file.type || '',
        size: media.size || file.size || null,
        repliedToMessageId: replyTo?.messageId || ''
      }, (response) => {
        if (!response?.success) {
          setError(response?.msg || 'Failed to send group attachment');
        }
      });
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to send group attachment'));
    }
  };

  const handleDeleteMessage = async (message, deleteType = 'forEveryone') => {
    const messageId = message?._id;
    if (!messageId) return;

    setMessages((current) => current.filter((item) => String(item._id) !== String(messageId)));

    try {
      await deleteGroupMessage(messageId, deleteType);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to delete group message'));
      loadActiveGroupData(activeGroup);
    }
  };

  const handleReactToMessage = async (message, reactionType) => {
    const messageId = message?._id;
    if (!messageId) return;

    const previousMessages = messages;
    setMessages((current) => current.map((item) => (
      String(item._id) === String(messageId)
        ? { ...item, reactions: getNextReactions(item.reactions || [], currentUserId, reactionType) }
        : item
    )));

    try {
      const updatedMessage = await reactToGroupMessage(messageId, reactionType);
      setMessages((current) => current.map((item) => (
        String(item._id) === String(messageId) ? { ...item, reactions: updatedMessage.reactions || [] } : item
      )));
    } catch (err) {
      setMessages(previousMessages);
      setError(getGroupApiErrorMessage(err, 'Failed to update reaction'));
    }
  };

  const handleRequestJoin = async (groupId) => {
    try {
      const request = await requestToJoinGroup(groupId);
      setDiscoverableGroups((current) => current.map((group) => (
        String(group._id) === String(groupId)
          ? { ...group, joinRequestStatus: 'pending', joinRequestId: request._id }
          : group
      )));
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to request group access'));
    }
  };

  const handleOpenForward = async (message) => {
    setForwardMessage(message);
    try {
      const conversations = await fetchConversations();
      setForwardConversations(conversations.filter((conversation) => conversation.participant));
    } catch (err) {
      setForwardConversations([]);
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
      forwardedFrom
    };

    try {
      if (type === 'chat' || type === 'user') {
        await sendDirectMessage({
          receiverId: type === 'user' ? target._id : target.participant?._id,
          ...payload
        });
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

  const handleCancelJoinRequest = async (groupId) => {
    const previousGroups = discoverableGroups;
    setDiscoverableGroups((current) => current.map((group) => (
      String(group._id) === String(groupId)
        ? { ...group, joinRequestStatus: undefined, joinRequestId: undefined }
        : group
    )));

    try {
      await cancelJoinRequest(groupId);
    } catch (err) {
      setDiscoverableGroups(previousGroups);
      setError(getGroupApiErrorMessage(err, 'Failed to cancel group join request'));
    }
  };

  const handleExitGroup = async (group) => {
    const groupId = group?._id;
    if (!groupId) return;

    if (isGroupAdminForUser(group, currentUserId)) {
      setAdminLeaveGroup(group);
      return;
    }

    setGroups((current) => current.filter((item) => String(item._id) !== String(groupId)));
    setActiveGroup((current) => (
      String(current?._id || '') === String(groupId) ? null : current
    ));

    try {
      await exitGroup(groupId);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to exit group'));
      loadGroups();
    }
  };

  const handleTransferAdminAndLeave = async (newAdminUserId) => {
    const groupId = adminLeaveGroup?._id;
    if (!groupId || !newAdminUserId) return;

    setAdminLeaveSubmitting(true);
    try {
      await transferAdminAndExitGroup(groupId, newAdminUserId);
      setGroups((current) => current.filter((item) => String(item._id) !== String(groupId)));
      setActiveGroup((current) => (
        String(current?._id || '') === String(groupId) ? null : current
      ));
      setAdminLeaveGroup(null);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to transfer admin and leave group'));
    } finally {
      setAdminLeaveSubmitting(false);
    }
  };

  const handleDeleteAdminGroup = async () => {
    const groupId = adminLeaveGroup?._id;
    if (!groupId) return;

    const confirmed = await dialog.showConfirm({
      title: 'Delete group?',
      message: 'Are you sure? This cannot be undone.',
      confirmText: 'Delete Group',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    setAdminLeaveSubmitting(true);
    try {
      await deleteGroupById(groupId);
      setGroups((current) => current.filter((item) => String(item._id) !== String(groupId)));
      setActiveGroup((current) => (
        String(current?._id || '') === String(groupId) ? null : current
      ));
      setAdminLeaveGroup(null);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to delete group'));
    } finally {
      setAdminLeaveSubmitting(false);
    }
  };

  const handleMuteGroup = async (group) => {
    const groupId = group?._id;
    if (!groupId) return;

    const isMuted = (group.mutedFor || []).some((id) => String(id?._id || id) === String(currentUserId));
    const nextMuted = !isMuted;

    setGroups((current) => current.map((item) => (
      String(item._id) === String(groupId)
        ? {
          ...item,
          mutedFor: nextMuted
            ? [...(item.mutedFor || []), currentUserId]
            : (item.mutedFor || []).filter((id) => String(id?._id || id) !== String(currentUserId))
        }
        : item
    )));

    try {
      const updatedGroup = await muteGroup(groupId, nextMuted);
      setGroups((current) => mergeById(current, updatedGroup));
      setActiveGroup((current) => (
        String(current?._id || '') === String(groupId) ? updatedGroup : current
      ));
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to update group mute setting'));
      loadGroups();
    }
  };

  const handleApproveRequest = async (requestId) => {
    await approveGroupRequest(requestId);
    setRequests((current) => current.filter((request) => request._id !== requestId));
    await loadGroups();
  };

  const handleRejectRequest = async (requestId) => {
    await rejectGroupRequest(requestId);
    setRequests((current) => current.filter((request) => request._id !== requestId));
  };

  const handleAddMember = async (userId) => {
    try {
      const group = await addMemberToGroup({ groupId: activeGroup._id, userId });
      setGroups((current) => mergeById(current, group));
      setActiveGroup(group);
      navigate(`/groups/${group._id}`);
      setAddOpen(false);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to add member'));
    }
  };

  const handleUpdateGroupDetails = async (payload) => {
    if (!activeGroup?._id) return;

    try {
      const group = await updateGroup(activeGroup._id, payload);
      setGroups((current) => mergeById(current, group));
      setActiveGroup(group);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to update group settings'));
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!activeGroup?._id || !userId) return;

    try {
      const group = await removeGroupMember(activeGroup._id, userId);
      setGroups((current) => mergeById(current, group));
      setActiveGroup(group);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to remove group member'));
    }
  };

  const typingNames = Object.values(typingUsers);
  const typingLabel = typingNames.length === 1
    ? `${typingNames[0]} is typing...`
    : typingNames.length > 1
      ? `${typingNames.length} people are typing...`
      : '';

  return (
    <>
      <FeaturePage
        title="Group Chat"
        description="Secure group conversations for seniors, volunteers, and caregivers."
        backLabel="Back to Care Connect"
        onBack={() => navigate('/communication')}
        actions={['elder', 'volunteer'].includes(user.role) && (
          <Button onClick={() => setCreateOpen(true)}>Create Group</Button>
        )}
      >
        <StatusAlert variant="error">{error}</StatusAlert>
        {loadingGroups && (
          <div className="motion-card mb-4 rounded-xl bg-white p-4">
            <SkeletonLine width="lg" />
            <SkeletonBlock className="mt-4 h-16 rounded-xl" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <GroupList
            groups={groups}
            discoverableGroups={discoverableGroups}
            activeGroupId={activeGroup?._id}
            currentUserId={currentUserId}
            onSelectGroup={handleSelectGroup}
            onRequestJoin={handleRequestJoin}
            onCancelJoinRequest={handleCancelJoinRequest}
            onExitGroup={handleExitGroup}
            onMuteGroup={handleMuteGroup}
          />
          {groupCallState !== 'idle' ? (
            <div className="motion-panel-in motion-card h-[70vh] overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-gray-200/70 ring-1 ring-gray-200/70">
              <GroupCallScreen
                group={activeGroup}
                callState={groupCallState}
                callType={groupCallType}
                localParticipant={groupCallLocalParticipant}
                remoteStreams={groupCallRemoteStreams}
                muted={groupCallMuted}
                cameraOn={groupCallCameraOn}
                durationSeconds={groupCallDurationSeconds}
                error={groupCallError}
                displayName={activeGroup?.name || 'Group'}
                onMute={toggleGroupCallMute}
                onToggleCamera={toggleGroupCallCamera}
                onLeave={leaveGroupCall}
                embedded
              />
            </div>
          ) : (
            <GroupChat
              group={activeGroup}
              currentUserId={currentUserId}
              messages={messages}
              activeCall={activeGroupCall}
              callState={groupCallState}
              onStartGroupAudioCall={() => startGroupCall('audio')}
              onStartGroupVideoCall={() => startGroupCall('video')}
              onJoinGroupCall={joinGroupCall}
              onSendMessage={handleSendMessage}
              onSendVoice={handleSendVoice}
              onSendMedia={handleSendMedia}
              onDeleteMessage={handleDeleteMessage}
              onReactToMessage={handleReactToMessage}
              onForwardMessage={handleOpenForward}
              onTypingStart={emitGroupTypingStart}
              onTypingStop={emitGroupTypingStop}
              typingLabel={typingLabel}
              targetMessageId={targetMessageId}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>
      </FeaturePage>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreateGroup} />
      <ForwardMessageModal
        open={Boolean(forwardMessage)}
        conversations={forwardConversations}
        groups={groups}
        onSearchUsers={searchForwardUsers}
        onClose={() => setForwardMessage(null)}
        onForward={handleForwardMessage}
      />
      <AddMemberModal open={addOpen} group={activeGroup} onClose={() => setAddOpen(false)} onAddMember={handleAddMember} />
      <AdminLeaveGroupModal
        open={Boolean(adminLeaveGroup)}
        group={adminLeaveGroup}
        currentUserId={currentUserId}
        submitting={adminLeaveSubmitting}
        onClose={() => setAdminLeaveGroup(null)}
        onTransferAndLeave={handleTransferAdminAndLeave}
        onDeleteGroup={handleDeleteAdminGroup}
      />
      <GroupSettingsModal
        open={settingsOpen}
        group={activeGroup}
        currentUserId={currentUserId}
        isAdmin={activeGroupIsAdmin}
        requests={requests}
        onClose={() => setSettingsOpen(false)}
        onSaveDetails={handleUpdateGroupDetails}
        onOpenAddMember={() => setAddOpen(true)}
        onRemoveMember={handleRemoveMember}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
      />
    </>
  );
}
