import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getChatSocket } from '../chat/services/socket';
import AddMemberModal from './AddMemberModal';
import CreateGroupModal from './CreateGroupModal';
import GroupChat from './GroupChat';
import GroupList from './GroupList';
import {
  addMemberToGroup,
  approveGroupRequest,
  createGroup,
  deleteGroupMessage,
  deleteGroupConversation,
  discoverGroups,
  fetchGroupMessages,
  fetchGroupRequests,
  fetchMyGroups,
  getGroupApiErrorMessage,
  rejectGroupRequest,
  requestToJoinGroup,
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

export default function GroupPage() {
  const navigate = useNavigate();
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
    const handleConversationDeleted = (payload) => {
      if (payload.chatType !== 'group') return;
      setGroups((current) => current.filter((group) => String(group._id) !== String(payload.conversationId)));
      setActiveGroup((current) => (
        String(current?._id || '') === String(payload.conversationId) ? null : current
      ));
    };

    socket.on('group-message', handleGroupMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('conversation-deleted', handleConversationDeleted);
    return () => {
      socket.off('group-message', handleGroupMessage);
      socket.off('message-deleted', handleMessageDeleted);
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

  const handleSendMessage = (text) => {
    const socket = getChatSocket();
    socket.emit('group-message', {
      groupId: activeGroup._id,
      message: text,
      messageType: 'text'
    }, (response) => {
      if (!response?.success) {
        setError(response?.msg || 'Failed to send group message');
      }
    });
  };

  const handleSendVoice = async (audioBlob) => {
    if (!activeGroup?._id || !audioBlob) return;

    try {
      const audio = await uploadGroupAudio(audioBlob);
      const socket = getChatSocket();
      socket.emit('group-message', {
        groupId: activeGroup._id,
        message: 'Voice note',
        messageType: 'voice',
        mediaUrl: audio.mediaUrl
      }, (response) => {
        if (!response?.success) {
          setError(response?.msg || 'Failed to send group voice note');
        }
      });
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to send group voice note'));
    }
  };

  const handleDeleteMessage = async (message) => {
    const messageId = message?._id;
    if (!messageId) return;

    setMessages((current) => current.filter((item) => String(item._id) !== String(messageId)));

    try {
      await deleteGroupMessage(messageId);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to delete group message'));
      loadActiveGroupData(activeGroup);
    }
  };

  const handleRequestJoin = async (groupId) => {
    try {
      await requestToJoinGroup(groupId);
      setDiscoverableGroups((current) => current.filter((group) => group._id !== groupId));
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to request group access'));
    }
  };

  const handleDeleteGroupConversation = async (group) => {
    const groupId = group?._id;
    if (!groupId) return;

    setGroups((current) => current.filter((item) => String(item._id) !== String(groupId)));
    setActiveGroup((current) => (
      String(current?._id || '') === String(groupId) ? null : current
    ));

    try {
      await deleteGroupConversation(groupId);
    } catch (err) {
      setError(getGroupApiErrorMessage(err, 'Failed to delete group conversation'));
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="text-sm font-semibold text-green-700">Back to dashboard</Link>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Group Chat</h1>
            <p className="text-gray-600">Secure group conversations for seniors, volunteers, and caregivers.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/chat" className="rounded-xl bg-gray-200 px-5 py-3 font-semibold text-gray-800">
              Private Chat
            </Link>
            {['elder', 'volunteer'].includes(user.role) && (
              <button onClick={() => setCreateOpen(true)} className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white">
                Create Group
              </button>
            )}
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
        {loadingGroups && <div className="mb-4 rounded-xl bg-white p-4 text-gray-600 shadow">Loading groups...</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <GroupList
            groups={groups}
            discoverableGroups={discoverableGroups}
            activeGroupId={activeGroup?._id}
            currentUserId={currentUserId}
            onSelectGroup={handleSelectGroup}
            onRequestJoin={handleRequestJoin}
            onDeleteGroup={handleDeleteGroupConversation}
          />
          <GroupChat
            group={activeGroup}
            currentUserId={currentUserId}
            messages={messages}
            requests={requests}
            onSendMessage={handleSendMessage}
            onSendVoice={handleSendVoice}
            onDeleteMessage={handleDeleteMessage}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onOpenAddMember={() => setAddOpen(true)}
          />
        </div>
      </div>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreateGroup} />
      <AddMemberModal open={addOpen} group={activeGroup} onClose={() => setAddOpen(false)} onAddMember={handleAddMember} />
    </div>
  );
}
