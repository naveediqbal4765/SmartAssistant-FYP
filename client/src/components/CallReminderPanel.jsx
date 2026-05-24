import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bell, Plus, Trash2, X } from 'lucide-react';

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

export default function CallReminderPanel() {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [error, setError] = useState('');
  const [shownReminderIds, setShownReminderIds] = useState(() => new Set());

  const upcomingReminders = useMemo(() => {
    return reminders
      .filter((reminder) => new Date(reminder.scheduledTime).getTime() >= Date.now() - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  }, [reminders]);

  const loadReminders = async () => {
    try {
      const response = await axios.get(API_BASE_URL, { headers: authHeaders() });
      setReminders(response.data.reminders || []);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load reminders');
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      reminders.forEach((reminder) => {
        const reminderId = String(reminder._id);
        if (shownReminderIds.has(reminderId)) return;
        if (new Date(reminder.scheduledTime).getTime() > now) return;

        alert(`Call reminder: ${reminder.title}\nCall: ${reminder.targetUserName}`);
        setShownReminderIds((current) => new Set([...current, reminderId]));
      });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [reminders, shownReminderIds]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(
        API_BASE_URL,
        { title, targetUserName, scheduledTime },
        { headers: authHeaders() }
      );
      setReminders((current) => [...current, response.data.reminder]);
      setTitle('');
      setTargetUserName('');
      setScheduledTime('');
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

  return (
    <div className="mb-10 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Bell size={22} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Call Reminders</h3>
            <p className="text-sm text-gray-600">Simple alerts for future calls.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Close' : 'Add Reminder'}
        </button>
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
            onChange={(e) => setScheduledTime(e.target.value)}
            className="rounded-xl border px-4 py-3"
          />
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
          <p className="text-gray-600">No upcoming call reminders.</p>
        )}
        {upcomingReminders.map((reminder) => (
          <div key={reminder._id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">
            <div>
              <p className="font-semibold text-gray-800">{reminder.title}</p>
              <p className="text-sm text-gray-600">
                Call {reminder.targetUserName} at {formatTime(reminder.scheduledTime)}
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
