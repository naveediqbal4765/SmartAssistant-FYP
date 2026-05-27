import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getChatSocket } from '../chat/services/socket';
import AddMemberModal from './AddMemberModal';
import CreateGroupModal from './CreateGroupModal';
import GroupChat from './GroupChat';
import GroupList from './GroupList';
import GroupSettingsModal from './GroupSettingsModal';
import Button from '../../../components/ui/Button';
import FeaturePage from '../../../components/ui/FeaturePage';
import { SkeletonBlock, SkeletonLine } from '../../../components/ui/Skeleton';
import StatusAlert from '../../../components/ui/StatusAlert';
import {
  addMemberToGroup,
  approveGroupRequest,
  createGroup,
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
  updateGroup,
  uploadGroupAudio
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

const getNextReactions = (reactions = [], currentUserId, reactionType) => {
  const existing = reactions.find((reaction) => getUserId(reaction.userId) === String(currentUserId));

  if (existing?.type === reactionType) {
    return reactions.filter((reaction) => getUserId(reaction.userId) !== String(currentUserId));
  }

  const nextReaction = {
    userId: currentUserId,
    type: reactionType,
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
  const { groupId } = useParams();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const currentUserId = user._id || user.id;
  const groupRequestRef = useRef(0);
  const [groups, setGroups] = useState([]);
  const [discoverableGroups, setDiscoverableGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const targetMessageId = location.state?.messageId || '';
  const activeGroupIsAdmin = activeGroup?.members?.some((member) => {
    const memberId = String(member.userId?._id || member.userId);
    return memberId === String(currentUserId) && member.role === 'admin';
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
    socket.emit('join-group-room', { groupId: group._id });
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
  }, [currentUserId]);

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
    const socket = getChatSocket();
    const handleGroupMessage = (message) => {
      if (String(message.groupId) !== String(activeGroup?._id)) return;
      if (isDeletedForCurrentUser(message, currentUserId)) return;
      setMessages((current) => mergeById(current, message));
    };
    const handleMessageDeleted = (payload) => {
      if (payload.chatType !== 'group') return;
      setMessages((current) => current.filter((message) => String(message._id) !== String(payload.messageId)));
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

      if (payload.status === 'rejected') {
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

    socket.on('group-message', handleGroupMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('group-updated', handleGroupUpdated);
    socket.on('group-request-updated', handleGroupRequestUpdated);
    socket.on('ITEM_REACTION_UPDATED', handleItemReactionUpdated);
    socket.on('conversation-deleted', handleConversationDeleted);
    return () => {
      socket.off('group-message', handleGroupMessage);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('group-updated', handleGroupUpdated);
      socket.off('group-request-updated', handleGroupRequestUpdated);
      socket.off('ITEM_REACTION_UPDATED', handleItemReactionUpdated);
      socket.off('conversation-deleted', handleConversationDeleted);
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

  const handleSendMessage = (text, replyTo) => {
    const socket = getChatSocket();
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

  const handleExitGroup = async (group) => {
    const groupId = group?._id;
    if (!groupId) return;

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

  return (
    <>
      <FeaturePage
        title="Group Chat"
        description="Secure group conversations for seniors, volunteers, and caregivers."
        backLabel="Back to Dashboard"
        onBack={() => navigate('/dashboard')}
        actions={['elder', 'volunteer'].includes(user.role) && (
          <Button onClick={() => setCreateOpen(true)}>Create Group</Button>
        )}
      >
        <StatusAlert variant="error">{error}</StatusAlert>
        {loadingGroups && (
          <div className="mb-4 rounded-xl bg-white p-4 shadow-md shadow-gray-900/10">
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
            onExitGroup={handleExitGroup}
            onMuteGroup={handleMuteGroup}
          />
          <GroupChat
            group={activeGroup}
            currentUserId={currentUserId}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendVoice={handleSendVoice}
            onDeleteMessage={handleDeleteMessage}
            onReactToMessage={handleReactToMessage}
            targetMessageId={targetMessageId}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </FeaturePage>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreateGroup} />
      <AddMemberModal open={addOpen} group={activeGroup} onClose={() => setAddOpen(false)} onAddMember={handleAddMember} />
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
