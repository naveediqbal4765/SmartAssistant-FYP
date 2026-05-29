import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bell, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from './ui/GlobalDialogProvider';
import { getChatSocket } from '../features/communication/chat/services/socket';

const API_BASE_URL = 'http://localhost:5000/api/reminders';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`
});

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const toDateTimeLocalValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const isScheduledTimeInFuture = (value) => {
  if (!value) return false;
  const scheduledAt = new Date(value);
  return !Number.isNaN(scheduledAt.getTime()) && scheduledAt > new Date();
};

export default function CallReminderPanel({ preview = false }) {
  const navigate = useNavigate();
  const dialog = useDialog();
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [clearingAll, setClearingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduledTimeError, setScheduledTimeError] = useState('');
  const minScheduledTime = toDateTimeLocalValue(new Date());

  const upcomingReminders = useMemo(() => {
    return reminders
      .filter((reminder) => reminder.status === 'active')
      .sort((a, b) => new Date(a.scheduledAt || a.scheduledTime) - new Date(b.scheduledAt || b.scheduledTime));
  }, [reminders]);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_BASE_URL, { headers: authHeaders() });
      setReminders(response.data.reminders || []);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    const socket = getChatSocket();
    const handleCallReminderTriggered = (notification = {}) => {
      if (notification.entityType === 'call_reminder') {
        loadReminders();
      }
    };

    socket.on('newNotification', handleCallReminderTriggered);
    return () => socket.off('newNotification', handleCallReminderTriggered);
  }, [loadReminders]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setScheduledTimeError('');

    if (!isScheduledTimeInFuture(scheduledTime)) {
      setScheduledTimeError('Call reminder must be set in the future');
      return;
    }

    try {
      const response = await axios.post(
        API_BASE_URL,
        { title, reminderText: title, targetUserName, scheduledAt: scheduledTime, scheduledTime },
        { headers: authHeaders() }
      );
      setReminders((current) => [...current, response.data.reminder]);
      setTitle('');
      setTargetUserName('');
      setScheduledTime('');
      setScheduledTimeError('');
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to create reminder');
    }
  };

  const handleDelete = async (reminderId) => {
    setReminders((current) => current.filter((reminder) => reminder._id !== reminderId));
    try {
      await axios.delete(`${API_BASE_URL}/${reminderId}`, { headers: authHeaders() });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete reminder');
      loadReminders();
    }
  };

  const handleClearAll = async () => {
    if (!upcomingReminders.length) return;

    const confirmed = await dialog.showConfirm({
      title: 'Clear all call reminders?',
      message: 'This will clear all reminders for this section',
      confirmText: 'Clear All',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    const reminderIds = upcomingReminders.map((reminder) => reminder._id);
    const reminderIdSet = new Set(reminderIds.map(String));
    setClearingAll(true);
    setError('');
    setReminders((current) => current.filter((reminder) => !reminderIdSet.has(String(reminder._id))));

    try {
      await Promise.all(reminderIds.map((reminderId) => (
        axios.delete(`${API_BASE_URL}/${reminderId}`, { headers: authHeaders() })
      )));
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to clear call reminders');
      loadReminders();
    } finally {
      setClearingAll(false);
    }
  };

  if (preview) {
    const previewReminders = upcomingReminders.slice(0, 3);

    return (
      <button
        type="button"
        onClick={() => navigate('/reminders')}
        className="group motion-card mb-8 block w-full rounded-2xl border border-gray-200 bg-white/90 p-6 text-left backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Bell size={24} />
            </span>
            <div>
              <h3 className="text-2xl font-bold text-brand-primary">Upcoming Call Reminders</h3>
              <p className="mt-1 text-gray-700">Next reminders only. Open the full page to manage all call alerts.</p>
            </div>
          </div>
          <ChevronRight size={22} className="shrink-0 text-emerald-700 transition group-hover:translate-x-1" />
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="mt-4 space-y-2">
          {!previewReminders.length && (
            <p className="rounded-xl bg-gray-50 p-3 text-sm font-semibold text-gray-500">
              {loading ? 'Loading reminders...' : 'No upcoming call reminders'}
            </p>
          )}
          {previewReminders.map((reminder) => (
            <div key={reminder._id} className="rounded-xl bg-emerald-50 p-3">
              <p className="font-semibold text-gray-900">{reminder.title}</p>
              <p className="mt-1 text-sm text-emerald-700">
                Call {reminder.targetUserName} at {formatTime(reminder.scheduledAt || reminder.scheduledTime)}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm font-bold text-emerald-700">View all reminders</p>
      </button>
    );
  }

  return (
    <div className="motion-card mb-10 rounded-2xl border border-gray-200 bg-white/90 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Bell size={22} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Call Reminders</h3>
            <p className="text-sm text-gray-700">Simple alerts for future calls.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {upcomingReminders.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearingAll}
              className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {clearingAll ? 'Clearing...' : 'Clear All'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Close' : 'Add Reminder'}
          </button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reminder title"
            className="rounded-xl border px-4 py-3"
          />
          <input
            value={targetUserName}
            onChange={(e) => setTargetUserName(e.target.value)}
            placeholder="Person to call"
            className="rounded-xl border px-4 py-3"
          />
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => {
              setScheduledTime(e.target.value);
              setScheduledTimeError('');
            }}
            min={minScheduledTime}
            className="rounded-xl border px-4 py-3"
          />
          {scheduledTimeError && (
            <p className="text-sm font-semibold text-red-600 md:col-start-3">{scheduledTimeError}</p>
          )}
          <button
            type="submit"
            disabled={!title.trim() || !targetUserName.trim() || !scheduledTime}
            className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}

      <div className="mt-5 space-y-3">
        {!upcomingReminders.length && (
          <p className="text-gray-700">No upcoming call reminders.</p>
        )}
        {upcomingReminders.map((reminder) => (
          <div key={reminder._id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
            <div>
              <p className="font-semibold text-gray-900">{reminder.title}</p>
              <p className="text-sm text-gray-700">
                Call {reminder.targetUserName} at {formatTime(reminder.scheduledAt || reminder.scheduledTime)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(reminder._id)}
              className="rounded-full p-2 text-red-600 hover:bg-red-50"
              aria-label="Delete reminder"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
