import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Activity, Calendar, ChevronRight, Clipboard, FileText, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CallReminderPanel from '../../components/CallReminderPanel';
import { getChatSocket } from '../../features/communication/chat/services/socket';
import { fetchAppointments } from '../../features/health/appointments/appointmentApi';
import useVitalsSource from '../../features/health/iot/hooks/useVitalsSource';
import { fetchMedications } from '../../features/health/medications/medicationApi';
import LocationStatusCard from '../../features/location/LocationStatusCard';
import NearbyVolunteers from '../../features/location/NearbyVolunteers';
import { fetchTaskRequests } from '../../features/tasks/taskApi';
import WellnessIntelligenceCard from '../../features/wellness-rehab/components/WellnessIntelligenceCard';
import RoleStabilityPanel from './RoleStabilityPanel';

const SENIOR_REMINDER_CHANGED_EVENT = 'SENIOR_REMINDER_CHANGED';
const TASK_REALTIME_EVENTS = ['task_created', 'task_updated', 'task_accepted', 'task_completed', 'task_verified', 'task_deleted'];

const hasUsableLocation = (location) => {
  const [lng, lat] = location?.coordinates || [];
  return Number.isFinite(Number(lat))
    && Number.isFinite(Number(lng))
    && (Number(lat) !== 0 || Number(lng) !== 0);
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Waiting for live update';
  return new Date(timestamp).toLocaleString();
};

const formatTime = (time) => {
  if (!time) return 'Not set';
  const [hour, minute] = String(time).split(':');
  if (!hour || !minute) return time;

  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getAppointmentDateTime = (appointment) => {
  const date = appointment?.date;
  if (!date) return null;

  const time = appointment.time || '00:00';
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const formatAppointmentDateTime = (appointment) => {
  const value = getAppointmentDateTime(appointment);
  if (!value) return 'Date not set';

  return value.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getMedicationTimes = (medication) => {
  const times = medication?.reminderTimes?.length
    ? medication.reminderTimes
    : medication?.time
      ? [medication.time]
      : [];

  return times.filter(Boolean);
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseMedicationDateTime = (dateKey, timeKey = '00:00') => {
  const value = new Date(`${dateKey}T${timeKey}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const isMedicationDateInRange = (medication, dateKey) => {
  if (medication.startDate && dateKey < medication.startDate) return false;
  if (medication.endDate && dateKey > medication.endDate) return false;
  return true;
};

const getNextIntervalReminder = (medication, now) => {
  const intervalHours = Number(medication?.intervalHours || 0);
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const anchorTime = getMedicationTimes(medication)[0] || '08:00';
  const anchor = parseMedicationDateTime(medication.startDate || toDateKey(now), anchorTime);
  const end = medication.endDate ? parseMedicationDateTime(medication.endDate, '23:59') : null;

  if (!anchor || intervalMs <= 0) return null;

  let nextReminder = anchor;
  if (nextReminder <= now) {
    const elapsed = now.getTime() - anchor.getTime();
    const nextOccurrenceIndex = Math.floor(elapsed / intervalMs) + 1;
    nextReminder = new Date(anchor.getTime() + nextOccurrenceIndex * intervalMs);
  }

  if (end && nextReminder > end) return null;
  return nextReminder > now ? nextReminder : null;
};

const getNextScheduledReminder = (medication, now) => {
  const reminderTimes = getMedicationTimes(medication);
  if (!reminderTimes.length || medication?.scheduleType === 'as_needed') return null;

  if (medication.scheduleType === 'interval_hours') {
    return getNextIntervalReminder(medication, now);
  }

  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  if (medication.startDate && medication.startDate > toDateKey(cursor)) {
    const startDate = new Date(`${medication.startDate}T00:00:00`);
    if (!Number.isNaN(startDate.getTime())) {
      cursor.setTime(startDate.getTime());
    }
  }

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const dateKey = toDateKey(cursor);
    const dayOfWeek = cursor.getDay();

    if (isMedicationDateInRange(medication, dateKey)) {
      const canUseDate = medication.scheduleType !== 'weekly'
        || (medication.daysOfWeek || []).includes(dayOfWeek);

      if (canUseDate) {
        const nextForDate = reminderTimes
          .map((time) => parseMedicationDateTime(dateKey, time))
          .filter((scheduledFor) => scheduledFor && scheduledFor > now)
          .sort((a, b) => a - b)[0];

        if (nextForDate) return nextForDate;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
};

const formatMedicationReminderDateTime = (value) => (
  value.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
);

const getUpcomingAppointments = (appointments = []) => {
  const now = new Date();

  return appointments
    .filter((appointment) => {
      const dateTime = getAppointmentDateTime(appointment);
      return dateTime && dateTime > now;
    })
    .sort((a, b) => getAppointmentDateTime(a) - getAppointmentDateTime(b))
    .slice(0, 4);
};

const getUpcomingMedications = (medications = []) => (
  medications
    .map((medication) => ({
      medication,
      nextReminderAt: getNextScheduledReminder(medication, new Date())
    }))
    .filter((item) => item.nextReminderAt)
    .sort((a, b) => a.nextReminderAt - b.nextReminderAt)
    .slice(0, 4)
);

const getReadinessStatus = ({ vitals, hasLocation }) => {
  if (!vitals) {
    return {
      label: 'Warning',
      tone: 'warning',
      detail: 'Waiting for latest telemetry snapshot.'
    };
  }

  if (
    vitals.heartRate >= 100
    || vitals.heartRate <= 55
    || vitals.oxygenLevel < 95
    || vitals.temperature >= 37.5
  ) {
    return {
      label: 'Critical',
      tone: 'critical',
      detail: 'Vitals need attention. Review the latest health signal.'
    };
  }

  if (hasLocation === false) {
    return {
      label: 'Warning',
      tone: 'warning',
      detail: 'Vitals are stable, but location readiness needs an update.'
    };
  }

  return {
    label: 'Safe',
    tone: 'safe',
    detail: 'Latest vitals are in the expected range.'
  };
};

const readinessToneClasses = {
  safe: 'border-green-200 bg-green-50 text-green-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  critical: 'border-red-200 bg-red-50 text-red-800'
};

const taskStatusConfig = {
  pending: { label: 'Pending', className: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted', className: 'bg-orange-100 text-orange-700' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
  completed_pending_verification: { label: 'To Be Verified', className: 'bg-green-100 text-green-700' },
  completed: { label: 'To Be Verified', className: 'bg-green-100 text-green-700' }
};

const activeTaskStatuses = new Set(['pending', 'in_progress', 'completed_pending_verification', 'completed']);

const fetchVaultDocuments = async (seniorId) => {
  if (!seniorId) return [];

  const response = await axios.get(`http://localhost:5000/api/user/documents/${seniorId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });

  return response.data.documents || [];
};

const getRecentTasks = (tasks = []) => (
  [...tasks]
    .filter((task) => activeTaskStatuses.has(task.status))
    .sort((a, b) => (
      new Date(b.updatedAt || b.createdAt || b.scheduledTime || 0)
      - new Date(a.updatedAt || a.createdAt || a.scheduledTime || 0)
    ))
    .slice(0, 4)
);

function TelemetryReadinessCard({
  title = 'Live Health Telemetry',
  description = 'Latest available senior vitals and emergency readiness status.',
  targetSeniorId = '',
  location = undefined
}) {
  const navigate = useNavigate();
  const { vitalsSnapshot, connected, statusLabel } = useVitalsSource(targetSeniorId);
  const vitals = vitalsSnapshot?.vitals;
  const hasLocation = location === undefined ? undefined : hasUsableLocation(location);
  const readiness = getReadinessStatus({ vitals, hasLocation });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate('/health/telemetry')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate('/health/telemetry');
        }
      }}
      className="motion-card cursor-pointer rounded-2xl border border-gray-200 bg-white/90 p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-brand-primary">{title}</h3>
          <p className="mt-1 text-sm text-gray-700">{description}</p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1 text-sm font-bold ${readinessToneClasses[readiness.tone]}`}>
          {readiness.label}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-gray-700">{readiness.detail}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-rose-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Heart Rate</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{vitals?.heartRate ?? '--'} <span className="text-sm font-semibold text-gray-500">bpm</span></p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Blood Pressure</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {vitals ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}` : '--'}
          </p>
        </div>
        <div className="rounded-xl bg-green-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Oxygen</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{vitals?.oxygenLevel ?? '--'} <span className="text-sm font-semibold text-gray-500">%</span></p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Activity</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{vitals?.activityStatus || 'Waiting'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <span className={`font-semibold ${connected ? 'text-green-700' : 'text-yellow-700'}`}>
          {statusLabel}
        </span>
        <span>Last health update: {formatTimestamp(vitalsSnapshot?.timestamp)}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand-primary">
          View Details
          <ChevronRight size={16} />
        </span>
      </div>
    </div>
  );
}

function SeniorReadinessPanel() {
  return (
    <RoleStabilityPanel
      title="Emergency Readiness"
      description="Keep your location current and monitor nearby volunteer coverage for emergency routing."
    >
      <div className="space-y-5">
        <TelemetryReadinessCard
          title="Live Health Telemetry"
          description="Your latest vitals and emergency readiness status."
        />
        <NearbyVolunteers mapView syncOwnLocation />
      </div>
    </RoleStabilityPanel>
  );
}

function VolunteerReadinessPanel() {
  return (
    <RoleStabilityPanel
      title="Volunteer Alert Readiness"
      description="Keep your own location current so relevant emergency and task alerts can reach you."
    >
      <LocationStatusCard
        title="Volunteer Location Status"
        description="Your location powers proximity matching for emergency and task notifications."
        showEmbeddedMap
      />
    </RoleStabilityPanel>
  );
}

function CaregiverRemindersCard({ linkedSenior }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReminders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const [appointmentData, medicationData] = await Promise.all([
        fetchAppointments(),
        fetchMedications()
      ]);

      setAppointments(appointmentData);
      setMedications(medicationData);
    } catch (err) {
      console.error('Failed to load caregiver dashboard reminders:', err);
      setAppointments([]);
      setMedications([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    const socket = getChatSocket();
    const handleReminderChanged = () => loadReminders({ silent: true });

    socket.on(SENIOR_REMINDER_CHANGED_EVENT, handleReminderChanged);
    return () => socket.off(SENIOR_REMINDER_CHANGED_EVENT, handleReminderChanged);
  }, [loadReminders]);

  const upcomingAppointments = useMemo(() => getUpcomingAppointments(appointments), [appointments]);
  const upcomingMedications = useMemo(() => getUpcomingMedications(medications), [medications]);
  const seniorName = linkedSenior?.name?.trim() || 'Senior';

  const renderSubsectionHeader = (Icon, title) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
          <Icon size={20} />
        </span>
        <h4 className="text-base font-bold text-gray-900">{title}</h4>
      </div>
      <ChevronRight size={20} className="text-green-700 transition group-hover:translate-x-1" />
    </div>
  );

  return (
    <div className="motion-card rounded-2xl border border-gray-200 bg-white/90 p-5 lg:col-span-2">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-brand-primary">{seniorName}'s Reminders</h3>
        <p className="mt-1 text-sm text-gray-700">
          Upcoming appointments and medication reminders for the linked senior.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-green-100 bg-green-50/40 p-3">
        <button
          type="button"
          onClick={() => navigate('/health/appointments')}
          className="group motion-card motion-interactive block w-full cursor-pointer rounded-2xl border border-green-100 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-green-200 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
        >
          {renderSubsectionHeader(Calendar, 'Upcoming Appointments')}

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="rounded-xl bg-white/80 p-3 text-sm font-semibold text-gray-500">Loading appointments...</p>
            ) : upcomingAppointments.length ? (
              upcomingAppointments.map((appointment) => (
                <div key={appointment._id} className="rounded-xl bg-white/85 p-3">
                  <p className="font-semibold text-gray-900">{appointment.title}</p>
                  <p className="mt-1 text-sm text-green-700">{formatAppointmentDateTime(appointment)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-white/80 p-3 text-sm font-semibold text-gray-500">No upcoming appointments</p>
            )}
          </div>
        </button>

        <div className="border-t border-green-200" />

        <button
          type="button"
          onClick={() => navigate('/health/medications')}
          className="group motion-card motion-interactive block w-full cursor-pointer rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
        >
          {renderSubsectionHeader(Pill, 'Medication Schedule')}

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="rounded-xl bg-white/80 p-3 text-sm font-semibold text-gray-500">Loading medications...</p>
            ) : upcomingMedications.length ? (
              upcomingMedications.map(({ medication, nextReminderAt }) => (
                <div key={medication._id} className="rounded-xl bg-white/85 p-3">
                  <p className="font-semibold text-gray-900">{medication.name}</p>
                  <p className="mt-1 text-sm text-green-700">{formatMedicationReminderDateTime(nextReminderAt)}</p>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-white/80 p-3 text-sm font-semibold text-gray-500">No upcoming medications</p>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

function CaregiverTaskRequestsCard({ linkedSenior }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const seniorName = linkedSenior?.name?.trim() || 'Senior';

  const loadTasks = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const taskData = await fetchTaskRequests();
      setTasks(getRecentTasks(taskData));
    } catch (err) {
      console.error('Failed to load caregiver dashboard tasks:', err);
      setTasks([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const socket = getChatSocket();
    const handleTaskEvent = () => loadTasks({ silent: true });

    TASK_REALTIME_EVENTS.forEach((eventName) => {
      socket.on(eventName, handleTaskEvent);
    });

    return () => {
      TASK_REALTIME_EVENTS.forEach((eventName) => {
        socket.off(eventName, handleTaskEvent);
      });
    };
  }, [loadTasks]);

  return (
    <button
      type="button"
      onClick={() => navigate('/task-requests')}
      className="group motion-card motion-interactive flex flex-col rounded-2xl border border-gray-200 bg-white/90 p-5 text-left transition hover:border-orange-200 hover:bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-orange-400 lg:col-span-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Clipboard size={22} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-brand-primary">{seniorName}'s Task Requests</h3>
            <p className="mt-1 text-sm text-gray-700">Recent senior task requests and current status.</p>
          </div>
        </div>
        <ChevronRight size={22} className="shrink-0 text-orange-700 transition group-hover:translate-x-1" />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="rounded-xl bg-gray-50 p-3 text-sm font-semibold text-gray-500">Loading task requests...</p>
        ) : tasks.length ? (
          tasks.map((task) => {
            const status = taskStatusConfig[task.status] || taskStatusConfig.pending;

            return (
              <div key={task._id} className="flex flex-col gap-2 rounded-xl bg-white/85 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-gray-900">{task.title}</p>
                <span className={`self-start rounded-full px-3 py-1 text-xs font-bold sm:self-auto ${status.className}`}>
                  {status.label}
                </span>
              </div>
            );
          })
        ) : (
          <p className="rounded-xl bg-gray-50 p-3 text-sm font-semibold text-gray-500">No active task requests</p>
        )}
      </div>
    </button>
  );
}

function CaregiverWellnessCard({ linkedSenior }) {
  const seniorId = linkedSenior?._id || linkedSenior?.id;
  const seniorName = linkedSenior?.name?.trim() || 'Senior';
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [exercisedToday, setExercisedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    if (!seniorId) {
      setLoading(false);
      return;
    }

    if (summary === null) setLoading(true);

    try {
      const todayDate = new Date().toISOString().slice(0, 10);
      const todayKey = toDateKey(new Date());
      const headers = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` };
      const [sessionsResponse, nutritionResponse, streakResponse] = await Promise.all([
        axios.get(`http://localhost:5000/api/wellness/sessions/${seniorId}`, { headers }),
        axios.get(`http://localhost:5000/api/wellness/nutrition/${seniorId}?date=${todayDate}`, { headers }),
        axios.get(`http://localhost:5000/api/wellness/streak/${seniorId}`, { headers })
      ]);
      const sessions = Array.isArray(sessionsResponse.data)
        ? sessionsResponse.data
        : Array.isArray(sessionsResponse.data?.sessions)
          ? sessionsResponse.data.sessions
          : [];
      setSessions(sessions);
      const todaySessions = sessions.filter((session) => (
        session.status === 'completed'
        && toDateKey(new Date(session.ended_at || session.created_at)) === todayKey
      ));
      const exerciseMinutes = Math.round(
        todaySessions.reduce((sum, session) => sum + Number(session.duration || 0), 0)
      );
      const caloriesBurned = Math.round(
        todaySessions.reduce((sum, session) => sum + Number(session.calories_burned || 0), 0)
      );
      const totals = nutritionResponse.data?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      const meals = nutritionResponse.data;
      setStreak(Number(streakResponse.data?.streak || 0));
      setExercisedToday(Boolean(streakResponse.data?.exercisedToday));

      setSummary({
        sessionsToday: todaySessions.length,
        exerciseMinutes,
        caloriesBurned,
        totalExerciseMinutes: exerciseMinutes,
        totalSessionsCompleted: todaySessions.length,
        totalCaloriesBurned: caloriesBurned,
        totalCaloriesConsumed: totals.calories || 0,
        totalProtein: totals.protein || 0,
        caloriesConsumed: Math.round(totals.calories || 0),
        protein: Math.round(totals.protein || 0),
        carbs: Math.round(totals.carbs || 0),
        fat: Math.round(totals.fat || 0),
        breakfast: meals?.breakfast || [],
        lunch: meals?.lunch || [],
        dinner: meals?.dinner || [],
        snack: meals?.snack || []
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load caregiver wellness summary:', err);
      setSummary(null);
      setSessions([]);
      setStreak(0);
      setExercisedToday(false);
    } finally {
      setLoading(false);
    }
  }, [seniorId]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  const mealRows = [
    { label: 'Breakfast', icon: '☀️', key: 'breakfast' },
    { label: 'Lunch', icon: '🌤️', key: 'lunch' },
    { label: 'Dinner', icon: '🌙', key: 'dinner' },
    { label: 'Snack', icon: '🥜', key: 'snack' }
  ];

  return (
    <div className="motion-card rounded-2xl border border-gray-200 bg-white/90 p-5 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Activity size={22} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-brand-primary">{seniorName}&apos;s Wellness Today</h3>
            <p className="mt-1 text-sm text-gray-700">Live exercise and nutrition summary.</p>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {loading && summary === null ? (
        <p className="rounded-xl bg-gray-50 p-3 text-sm font-semibold text-gray-500">Loading wellness data...</p>
      ) : !loading && summary === null ? (
        <p className="rounded-xl bg-gray-50 p-3 text-sm font-semibold text-gray-500">No wellness data available for today.</p>
      ) : (
        <div className="space-y-4">
          <WellnessIntelligenceCard
            summary={summary}
            streak={streak}
            exercisedToday={exercisedToday}
            sessions={sessions}
          />

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Today&apos;s Meal Logs</p>
            {(() => {
              const mealsToShow = mealRows.filter((meal) => summary[meal.key]?.length > 0);

              if (mealsToShow.length === 0) {
                return (
                  <p className="py-2 text-center text-xs text-gray-400">
                    No meals logged yet today.
                  </p>
                );
              }

              return mealsToShow.map((meal) => {
                const logs = summary[meal.key] || [];

                return (
                  <div key={meal.key} className="mb-2 rounded-xl bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true">{meal.icon}</span>
                        <p className="text-sm font-semibold text-gray-800">{meal.label}</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        {logs.length} item{logs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {logs.slice(0, 3).map((log) => (
                      <div key={log._id} className="mt-1 flex items-center justify-between pl-6">
                        <p className="text-xs text-gray-600">{log.food_name}</p>
                        <p className="text-xs font-semibold text-brand-primary">{Math.round(log.calories || 0)} kcal</p>
                      </div>
                    ))}
                    {logs.length > 3 && (
                      <p className="mt-1 pl-6 text-xs text-gray-400">+{logs.length - 3} more items</p>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function CaregiverHealthVaultCard({ linkedSenior }) {
  const navigate = useNavigate();
  const seniorId = linkedSenior?._id || linkedSenior?.id;
  const seniorName = linkedSenior?.name?.trim() || 'Senior';
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setLoading(true);

    try {
      const documents = await fetchVaultDocuments(seniorId);
      setDocumentCount(documents.length);
    } catch (err) {
      console.error('Failed to load caregiver dashboard health vault summary:', err);
      setDocumentCount(0);
    } finally {
      setLoading(false);
    }
  }, [seniorId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <button
      type="button"
      onClick={() => navigate(seniorId ? `/health/vault/${seniorId}` : '/health/vault')}
      className="group motion-card motion-interactive flex flex-col rounded-2xl border border-gray-200 bg-white/90 p-5 text-left transition hover:border-teal-200 hover:bg-teal-50/40 focus:outline-none focus:ring-2 focus:ring-teal-400 lg:col-span-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <FileText size={22} />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-brand-primary">{seniorName}'s Health Vault</h3>
            <p className="mt-1 text-sm text-gray-700">View and manage senior's health documents</p>
          </div>
        </div>
        <ChevronRight size={22} className="shrink-0 text-teal-700 transition group-hover:translate-x-1" />
      </div>

      <div className="mt-4 rounded-xl bg-teal-50 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Documents Stored</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{loading ? '--' : documentCount}</p>
      </div>
    </button>
  );
}

function CaregiverAlertCenter({ linkedSenior }) {
  return (
    <RoleStabilityPanel
      title="Caregiver Alert Center"
      description="You receive senior emergency and task alerts through the global alert banner. Location controls stay with the senior."
    >
      {linkedSenior ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TelemetryReadinessCard
            title={`${linkedSenior.name || 'Senior'} Health Telemetry`}
            description="Latest senior vitals, health status, and emergency readiness."
            targetSeniorId={linkedSenior._id || linkedSenior.id}
            location={linkedSenior.location || null}
          />
          <LocationStatusCard
            readOnly
            title="Senior Live Location"
            description="View-only access to the senior's latest saved location. Location controls stay with the senior."
            location={linkedSenior.location || null}
            showEmbeddedMap
          />
          <CaregiverRemindersCard linkedSenior={linkedSenior} />
          <CaregiverTaskRequestsCard linkedSenior={linkedSenior} />
          <CaregiverWellnessCard linkedSenior={linkedSenior} />
          <CaregiverHealthVaultCard linkedSenior={linkedSenior} />
        </div>
      ) : (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-800">
          No senior is linked to this caregiver account yet.
        </div>
      )}
    </RoleStabilityPanel>
  );
}

const panelComponents = {
  callReminders: (props) => <CallReminderPanel {...props} preview />,
  seniorReadiness: SeniorReadinessPanel,
  volunteerReadiness: VolunteerReadinessPanel,
  caregiverAlertCenter: CaregiverAlertCenter
};

export default function DashboardPanels({ panels, context }) {
  return (
    <>
      {panels.map((panelKey) => {
        const Panel = panelComponents[panelKey];
        if (!Panel) return null;
        return <Panel key={panelKey} {...context} />;
      })}
    </>
  );
}
