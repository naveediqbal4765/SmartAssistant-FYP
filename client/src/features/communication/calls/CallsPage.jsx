import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Phone, PhoneMissed, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeaturePage from '../../../components/ui/FeaturePage';
import Button from '../../../components/ui/Button';
import { useDialog } from '../../../components/ui/GlobalDialogProvider';
import { deleteMessage, fetchConversations, fetchMessages } from '../chat/services/chatApi';
import { deleteGroupMessage, fetchGroupMessages, fetchMyGroups } from '../groups/groupApi';

const getUserId = (value) => String(value?._id || value || '');

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return String(user._id || user.id || '');
  } catch (err) {
    return '';
  }
};

const formatCallTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDuration = (seconds = 0) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!totalSeconds) return '';
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes && remainingSeconds) return `${minutes}m ${remainingSeconds}s`;
  if (minutes) return `${minutes}m`;
  return `${remainingSeconds}s`;
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
};

const getCallType = (message = '') => (
  message.toLowerCase().includes('video') ? 'video' : 'audio'
);

const parseCleanCallLog = (message = '', fallbackDuration = 0) => {
  const text = String(message || '').trim();
  const lowerText = text.toLowerCase();
  const missed = lowerText.includes('missed');
  const durationMatch = text.match(/(\d{1,2}):(\d{2})\s*$/);
  const duration = durationMatch
    ? (Number(durationMatch[1]) * 60) + Number(durationMatch[2])
    : Number(fallbackDuration || 0);
  const subtitle = durationMatch
    ? text.replace(/\s*[—-]\s*\d{1,2}:\d{2}\s*$/, '')
    : text;

  return {
    subtitle: subtitle || (getCallType(text) === 'video' ? 'Video call' : 'Audio call'),
    duration: missed ? 0 : duration,
    missed
  };
};

const parseGroupCallLog = (message = '') => {
  const text = String(message || '');
  const lowerText = text.toLowerCase();
  if (lowerText.includes('joined') || lowerText === 'group call ended') return null;
  return parseCleanCallLog(text);
};

const SWIPE_THRESHOLD_PX = 48;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const deleteCallLogMessages = async (log) => {
  const uniqueRefs = Array.from(
    new Map((log.messageRefs || []).map((ref) => [`${ref.kind}:${ref.id}`, ref])).values()
  );

  await Promise.all(uniqueRefs.map((ref) => (
    ref.kind === 'group'
      ? deleteGroupMessage(ref.id, 'forMe')
      : deleteMessage(ref.id, 'forMe')
  )));
};

const uniqueBy = (items, getKey) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const dedupeCallLogs = (logs) => {
  const seen = new Set();
  return logs.filter((log) => {
    const refs = (log.messageRefs || [])
      .map((ref) => `${ref.kind}:${ref.id}`)
      .sort()
      .join('|');
    const key = refs || `${log.kind}:${log.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildPrivateCallLogs = ({ conversations, messagesByParticipant, currentUserId }) => {
  const logs = [];

  conversations.forEach((conversation) => {
    const participant = conversation.participant;
    const participantId = getUserId(participant);
    const callMessages = (messagesByParticipant[participantId] || [])
      .filter((message) => message.messageType === 'call')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let activeSession = null;

    const pushActiveSession = () => {
      if (!activeSession) return;
      const missed = !activeSession.accepted && activeSession.direction === 'incoming';
      logs.push({
        id: activeSession.id,
        kind: 'private',
        name: participant?.name || 'Unknown user',
        subtitle: missed ? 'Missed call' : `${activeSession.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} ${activeSession.callType} call`,
        callType: activeSession.callType,
        direction: missed ? 'missed' : activeSession.direction,
        duration: activeSession.duration,
        timestamp: activeSession.endedAt || activeSession.startedAt,
        route: `/chat/${conversation.id}`,
        messageRefs: activeSession.messageRefs
      });
      activeSession = null;
    };

    callMessages.forEach((message) => {
      const text = message.message || '';
      const lowerText = text.toLowerCase();
      const senderIsCurrentUser = getUserId(message.senderId) === currentUserId;

      if (!lowerText.includes('started') && !lowerText.includes('accepted') && !lowerText.includes('ended')) {
        const parsedLog = parseCleanCallLog(text, message.duration);
        const callType = getCallType(text);
        const callLabel = `${callType === 'video' ? 'Video' : 'Audio'} Call`;
        logs.push({
          id: String(message._id),
          kind: 'private',
          name: participant?.name || 'Unknown user',
          subtitle: parsedLog.missed
            ? `Missed ${callLabel}`
            : senderIsCurrentUser && !parsedLog.duration
              ? `Outgoing ${callLabel}`
              : parsedLog.subtitle,
          callType,
          direction: parsedLog.missed ? 'missed' : senderIsCurrentUser ? 'outgoing' : 'incoming',
          duration: parsedLog.duration,
          timestamp: message.createdAt,
          route: `/chat/${conversation.id}`,
          messageRefs: [{ kind: 'private', id: String(message._id) }]
        });
        return;
      }

      if (lowerText.includes('started')) {
        pushActiveSession();
        activeSession = {
          id: String(message._id),
          callType: getCallType(text),
          direction: senderIsCurrentUser ? 'outgoing' : 'incoming',
          accepted: false,
          duration: 0,
          startedAt: message.createdAt,
          endedAt: '',
          messageRefs: [{ kind: 'private', id: String(message._id) }]
        };
        return;
      }

      if (lowerText.includes('accepted')) {
        if (activeSession) {
          activeSession.accepted = true;
          activeSession.messageRefs.push({ kind: 'private', id: String(message._id) });
        }
        return;
      }

      if (lowerText.includes('ended')) {
        if (!activeSession) {
          logs.push({
            id: String(message._id),
            kind: 'private',
            name: participant?.name || 'Unknown user',
            subtitle: `${senderIsCurrentUser ? 'Outgoing' : 'Incoming'} ${getCallType(text)} call`,
            callType: getCallType(text),
            direction: senderIsCurrentUser ? 'outgoing' : 'incoming',
            duration: message.duration || 0,
            timestamp: message.createdAt,
            route: `/chat/${conversation.id}`,
            messageRefs: [{ kind: 'private', id: String(message._id) }]
          });
          return;
        }

        activeSession.duration = message.duration || activeSession.duration || 0;
        activeSession.endedAt = message.createdAt;
        activeSession.messageRefs.push({ kind: 'private', id: String(message._id) });
        pushActiveSession();
      }
    });

    pushActiveSession();
  });

  return logs;
};

const buildGroupCallLogs = ({ groups, groupMessagesById, currentUserId }) => (
  groups.flatMap((group) => (
    (groupMessagesById[group._id] || [])
      .filter((message) => message.messageType === 'call')
      .map((message) => {
        const parsedLog = parseGroupCallLog(message.message);
        if (!parsedLog) return null;
        const callType = getCallType(message.message || '');
        const senderIsCurrentUser = getUserId(message.senderId) === currentUserId;
        const callLabel = `Group ${callType === 'video' ? 'Video' : 'Audio'} Call`;

        return {
          id: String(message._id),
          kind: 'group',
          name: group.name || 'Group',
          subtitle: parsedLog.missed
            ? `Missed ${callLabel}`
            : senderIsCurrentUser && !parsedLog.duration
              ? `Outgoing ${callLabel}`
              : parsedLog.subtitle,
          callType,
          direction: parsedLog.missed ? 'missed' : senderIsCurrentUser && !parsedLog.duration ? 'outgoing' : 'group',
          duration: parsedLog.duration || message.duration || 0,
          timestamp: message.createdAt,
          route: `/groups/${group._id}`,
          messageRefs: [{ kind: 'group', id: String(message._id) }]
        };
      })
      .filter(Boolean)
  ))
);

function CallHistoryItem({ log, onOpen, onDelete, deleting }) {
  const missed = log.direction === 'missed';
  const outgoing = log.direction === 'outgoing';
  const incoming = log.direction === 'incoming';
  const Icon = missed ? PhoneMissed : log.callType === 'video' ? Video : Phone;
  const [actionOpen, setActionOpen] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const swipedRef = useRef(false);

  const handlePointerDown = (event) => {
    setSwipeStartX(event.clientX);
    setActionOpen((current) => (current ? current : false));
  };

  const handlePointerUp = (event) => {
    if (swipeStartX === null) return;
    const deltaX = event.clientX - swipeStartX;
    if (deltaX <= -SWIPE_THRESHOLD_PX) {
      setActionOpen(true);
      swipedRef.current = true;
    } else if (deltaX >= SWIPE_THRESHOLD_PX / 2) {
      setActionOpen(false);
      swipedRef.current = false;
    }
    setSwipeStartX(null);
  };

  const handleSelect = () => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }

    if (actionOpen) {
      setActionOpen(false);
      return;
    }

    onOpen(log.route);
  };

  return (
    <div className={`motion-interactive group relative overflow-hidden rounded-2xl transition-all duration-200 ease-in-out ${
      deleting ? '-translate-x-8 opacity-0' : 'translate-x-0 opacity-100'
    }`}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(log);
        }}
        className="absolute inset-y-1 right-0 flex w-24 items-center justify-center rounded-2xl bg-red-600 text-sm font-semibold text-white"
      >
        Delete
      </button>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setSwipeStartX(null)}
        onClick={handleSelect}
        className={`relative z-10 flex w-full touch-pan-y items-center gap-3 rounded-2xl bg-white px-3 py-3 pr-14 text-left transition duration-150 ease-in-out hover:bg-gray-50 ${
          actionOpen ? '-translate-x-24' : 'translate-x-0'
        }`}
      >
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
          missed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {getInitials(log.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate font-semibold ${missed ? 'text-red-700' : 'text-gray-900'}`}>{log.name}</p>
            {outgoing && <ArrowUpRight size={15} className="shrink-0 text-gray-500" />}
            {incoming && <ArrowDownLeft size={15} className="shrink-0 text-gray-500" />}
            {missed && <PhoneMissed size={15} className="shrink-0 text-red-600" />}
          </div>
          <p className={`mt-0.5 truncate text-sm ${missed ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
            {log.subtitle}{log.duration ? ` · ${formatDuration(log.duration)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Icon size={18} className={missed ? 'text-red-600' : 'text-gray-500'} />
          <span className="text-xs text-gray-400">{formatCallTime(log.timestamp)}</span>
        </div>
      </button>
    </div>
  );
}
export default function CallsPage() {
  const navigate = useNavigate();
  const dialog = useDialog();
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const [callLogs, setCallLogs] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [callError, setCallError] = useState('');
  const [deletingLogIds, setDeletingLogIds] = useState(new Set());
  const [clearing, setClearing] = useState(false);

  const loadCallHistory = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingCalls(true);
    setCallError('');

    try {
      const [conversations, groups] = await Promise.all([
        fetchConversations(),
        fetchMyGroups()
      ]);
      const uniqueConversations = uniqueBy(
        conversations.filter((conversation) => conversation.participant?._id),
        (conversation) => getUserId(conversation.participant)
      );
      const uniqueGroups = uniqueBy(groups, (group) => String(group._id || group.id || ''));
      const privateMessages = await Promise.all(
        uniqueConversations.map(async (conversation) => {
          const participantId = getUserId(conversation.participant);
          return [participantId, await fetchMessages(participantId)];
        })
      );
      const groupMessages = await Promise.all(
        uniqueGroups.map(async (group) => [group._id, await fetchGroupMessages(group._id)])
      );

      const messagesByParticipant = Object.fromEntries(privateMessages);
      const groupMessagesById = Object.fromEntries(groupMessages);
      const logs = dedupeCallLogs([
        ...buildPrivateCallLogs({ conversations: uniqueConversations, messagesByParticipant, currentUserId }),
        ...buildGroupCallLogs({ groups: uniqueGroups, groupMessagesById, currentUserId })
      ]).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setCallLogs(logs);
    } catch (err) {
      setCallError('Could not load call history.');
      setCallLogs([]);
    } finally {
      if (!silent) setLoadingCalls(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;

    loadCallHistory().finally(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [loadCallHistory]);

  const removeLogFromUi = (logId) => {
    setCallLogs((current) => current.filter((log) => log.id !== logId));
  };

  const handleDeleteLog = async (log) => {
    if (!log?.id || deletingLogIds.has(log.id)) return;
    const previousLogs = callLogs;

    setDeletingLogIds((current) => new Set(current).add(log.id));
    await wait(220);
    removeLogFromUi(log.id);

    try {
      await deleteCallLogMessages(log);
    } catch (err) {
      setCallLogs(previousLogs);
      setCallError('Could not delete call log.');
    } finally {
      setDeletingLogIds((current) => {
        const next = new Set(current);
        next.delete(log.id);
        return next;
      });
    }
  };

  const handleClearHistory = async () => {
    if (!callLogs.length || clearing) return;

    const confirmed = await dialog.showConfirm({
      title: 'Clear entire call history?',
      message: 'This removes call log entries from your Calls page only. Chats, groups, and conversations will remain intact.',
      confirmText: 'Clear History',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    const previousLogs = callLogs;
    setClearing(true);
    setDeletingLogIds(new Set(callLogs.map((log) => log.id)));
    await wait(220);
    setCallLogs([]);

    try {
      await Promise.all(previousLogs.map(deleteCallLogMessages));
    } catch (err) {
      setCallLogs(previousLogs);
      setCallError('Could not clear call history.');
    } finally {
      setDeletingLogIds(new Set());
      setClearing(false);
    }
  };

  return (
    <FeaturePage
      title="Calls"
      description="Review incoming, outgoing, missed, private, and group call events."
      backLabel="Back to Care Connect"
      onBack={() => navigate('/communication')}
      maxWidth="max-w-4xl"
      actions={(
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          disabled={loadingCalls || clearing || !callLogs.length}
          className="bg-transparent text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:text-red-600 disabled:opacity-50"
        >
          Clear Call History
        </Button>
      )}
    >
      <div className="motion-card rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {callError && (
          <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{callError}</div>
        )}
        {!callError && loadingCalls && (
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Loading call history...</div>
        )}
        {!callError && !loadingCalls && !callLogs.length && (
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            No calls yet. Start calls from a private chat or group conversation.
          </div>
        )}
        {!callError && !loadingCalls && callLogs.length > 0 && (
          <div className="divide-y divide-gray-100">
            {callLogs.map((log) => (
              <CallHistoryItem
                key={`${log.kind}-${log.id}`}
                log={log}
                onOpen={navigate}
                onDelete={handleDeleteLog}
                deleting={deletingLogIds.has(log.id)}
              />
            ))}
          </div>
        )}
      </div>
    </FeaturePage>
  );
}
