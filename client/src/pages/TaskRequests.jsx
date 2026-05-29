import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle, Clipboard, Clock, Eye, Loader, Mic, MicOff, Send, Star, Trash2, XCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FeatureCard from '../components/ui/FeatureCard';
import FeaturePage from '../components/ui/FeaturePage';
import LoadingState from '../components/ui/LoadingState';
import StatusAlert from '../components/ui/StatusAlert';
import { useDialog } from '../components/ui/GlobalDialogProvider';
import { markNotificationAsConsumed } from '../features/communication/notifications/notificationConsumption';
import { getChatSocket } from '../features/communication/chat/services/socket';
import { resolveConversation } from '../features/communication/chat/services/chatApi';
import {
  acceptTask,
  clearTaskHistory,
  completeTask,
  createTaskRequest,
  deleteTaskRequest,
  fetchAvailableTasks,
  fetchCurrentUserProfile,
  fetchTaskRequests,
  fetchVolunteerTaskHistory,
  getTaskErrorMessage,
  hideTaskHistoryItem,
  ignoreTask,
  normalizeTask,
  startTask,
  updateTaskRequest,
  verifyTask
} from '../features/tasks/taskApi';
import { formatTaskCategory, getTaskCategoryUi, getTaskPriorityUi } from '../features/tasks/taskUiConfig';

const emptyForm = {
  title: '',
  description: '',
  category: 'other',
  priority: 'medium',
  scheduledTime: '',
  pickupLocation: { address: '', lat: null, lng: null, googleMapsUrl: '', coordinates: null },
  dropLocation: { address: '', lat: null, lng: null, googleMapsUrl: '', coordinates: null }
};

const getGoogleMapsUrl = (lat, lng) => (
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    ? `https://www.google.com/maps?q=${Number(lat)},${Number(lng)}`
    : ''
);

const normalizeLocation = (location = {}) => {
  const lat = Number(location.lat ?? location.coordinates?.lat);
  const lng = Number(location.lng ?? location.coordinates?.lng);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  return {
    address: location.address || '',
    lat: hasCoordinates ? lat : null,
    lng: hasCoordinates ? lng : null,
    googleMapsUrl: location.googleMapsUrl || (hasCoordinates ? getGoogleMapsUrl(lat, lng) : ''),
    coordinates: hasCoordinates ? { lat, lng } : null
  };
};

const categories = [
  { value: 'medical', label: 'Medical' },
  { value: 'grocery', label: 'Grocery Shopping' },
  { value: 'transport', label: 'Transport' },
  { value: 'household', label: 'Household' },
  { value: 'companionship', label: 'Companionship' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other' }
];

const priorities = [
  { value: 'low', detail: 'Can wait' },
  { value: 'medium', detail: 'Today' },
  { value: 'high', detail: 'Within hours' },
  { value: 'emergency', detail: 'Immediate' }
];

const seniorHistoryStatuses = ['verified_completed'];

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700', icon: Eye },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: Loader },
  completed_pending_verification: { label: 'Awaiting Verification', color: 'bg-amber-100 text-amber-700', icon: Star },
  verified_completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  completed: { label: 'Awaiting Verification', color: 'bg-amber-100 text-amber-700', icon: Star },
  verified: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

const toForm = (task) => ({
  title: task.title || '',
  description: task.description || '',
  category: task.category || 'other',
  priority: task.priority || 'medium',
  scheduledTime: task.scheduledTime ? new Date(task.scheduledTime).toISOString().slice(0, 16) : '',
  pickupLocation: normalizeLocation(task.pickupLocation || task.location || {}),
  dropLocation: normalizeLocation(task.dropLocation || {})
});

const upsertById = (items, updated) => {
  if (!updated?._id) return items;
  const exists = items.some((item) => item._id === updated._id);
  return exists
    ? items.map((item) => (item._id === updated._id ? updated : item))
    : [updated, ...items];
};

const removeById = (items, taskId) => items.filter((item) => String(item._id) !== String(taskId));

const formatDate = (value) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const getTaskSeniorId = (task) => String(task.userId?._id || task.userId || '');

const getTaskSeniorName = (task) => (
  task.userId?.name || task.senior?.name || task.seniorName || 'Senior'
);

const getTaskAssignedVolunteerId = (task) => String(
  task.assignedVolunteerId?._id
    || task.assignedVolunteerId
    || task.volunteerId?._id
    || task.volunteerId
    || ''
);

const isTaskAvailableForVolunteer = (task, ignoredTaskIds = new Set()) => (
  task.status === 'pending' && !ignoredTaskIds.has(String(task._id))
);

const isTaskAssignedToVolunteer = (task, volunteerId) => (
  getTaskAssignedVolunteerId(task) === String(volunteerId)
);

const locationFromProfile = (profile = {}) => {
  const [lng, lat] = profile.location?.coordinates || [];
  if (Number(lat) && Number(lng)) {
    return normalizeLocation({
      address: profile.address || '',
      lat: Number(lat),
      lng: Number(lng)
    });
  }

  if (profile.address) {
    return normalizeLocation({ address: profile.address });
  }

  return null;
};

const reverseGeocode = async ({ lat, lng }) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
  );
  if (!response.ok) return '';

  const data = await response.json();
  return data.display_name || '';
};

const hasLocationValue = (location) => {
  const normalized = normalizeLocation(location || {});
  return Boolean(normalized.address || normalized.googleMapsUrl);
};

const getLocationLabel = (field) => (field === 'pickupLocation' ? 'Pickup' : 'Drop');
const getOppositeLocationField = (field) => (field === 'pickupLocation' ? 'dropLocation' : 'pickupLocation');

const defaultMapCenter = { lat: 31.5204, lng: 74.3587 };
const mapPinIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#dc2626;border:3px solid white;box-shadow:0 8px 18px rgba(0,0,0,.3);transform:rotate(-45deg);"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

function LocationText({ label, location }) {
  const normalized = normalizeLocation(location || {});

  return (
    <span>
      {label}: {normalized.address || 'Not specified'}
      {normalized.googleMapsUrl && (
        <>
          {' '}
          <a
            href={normalized.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-primary hover:underline"
          >
            View map
          </a>
        </>
      )}
    </span>
  );
}

function MapPickerModal({
  field,
  draftLocation,
  loading,
  error,
  onClose,
  onMapClick,
  onUseCurrentLocation,
  onAddressChange,
  onApply
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const normalizedDraft = normalizeLocation(draftLocation || {});
  const hasCoordinates = Number.isFinite(normalizedDraft.lat) && Number.isFinite(normalizedDraft.lng);
  const center = hasCoordinates ? normalizedDraft : defaultMapCenter;

  useEffect(() => {
    if (!field || !mapContainerRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: hasCoordinates ? 15 : 12,
      scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', (event) => {
      onMapClick({
        lat: event.latlng.lat,
        lng: event.latlng.lng
      });
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  useEffect(() => {
    if (!mapRef.current || !hasCoordinates) return;

    const position = [normalizedDraft.lat, normalizedDraft.lng];
    if (!markerRef.current) {
      const marker = L.marker(position, {
        draggable: true,
        icon: mapPinIcon
      }).addTo(mapRef.current);

      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        onMapClick({ lat: latLng.lat, lng: latLng.lng });
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(position);
    }

    mapRef.current.setView(position, 15);
  }, [hasCoordinates, normalizedDraft.lat, normalizedDraft.lng, onMapClick]);

  if (!field) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-brand-primary">Choose {getLocationLabel(field)} on Map</h3>
            <p className="text-sm text-gray-500">Click the map area to move the pin, then save the selected address.</p>
          </div>
          <button type="button" className="text-gray-500 hover:text-gray-800" onClick={onClose}>
            <XCircle size={22} />
          </button>
        </div>

        <div ref={mapContainerRef} className="h-72 w-full overflow-hidden rounded-xl border border-green-100" />

        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={loading}
          className="mt-3 text-sm font-semibold text-brand-primary hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
        >
          Use My Current Location
        </button>

        <label className="mt-4 block text-sm font-semibold text-gray-700">Selected address</label>
        <textarea
          rows={2}
          value={draftLocation.address}
          onChange={(event) => onAddressChange(event.target.value)}
          className="mt-2 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Click the map to resolve an address"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={loading || !draftLocation.address} onClick={onApply}>
            {loading ? 'Resolving...' : 'Use Selected Location'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${config.color}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function VerificationStarRating({ value, onChange }) {
  const [hoverRating, setHoverRating] = useState(0);
  const activeRating = hoverRating || Number(value) || 0;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-green-200 bg-white px-3 py-2">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          onMouseEnter={() => setHoverRating(rating)}
          onMouseLeave={() => setHoverRating(0)}
          aria-label={`Select ${rating} star${rating > 1 ? 's' : ''}`}
          className={`text-xl leading-none transition hover:scale-110 ${
            rating <= activeRating ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function TaskCard({
  task,
  mode,
  onEdit,
  onDelete,
  onAccept,
  onIgnore,
  onMessageSenior,
  onStart,
  onComplete,
  onVerify,
  onHideHistory,
  actionLoading,
  verificationDraft,
  onVerificationChange
}) {
  const volunteerName = task.assignedVolunteerName || task.assignedVolunteerId?.name || task.volunteerId?.name;
  const seniorName = getTaskSeniorName(task);
  const showSeniorRequester = ['available', 'volunteer', 'history'].includes(mode);
  const canSeniorEdit = mode === 'senior' && task.status === 'pending';
  const canVolunteerManage = mode === 'volunteer' && ['accepted', 'in_progress'].includes(task.status);
  const canVerify = mode === 'senior' && ['completed_pending_verification', 'completed'].includes(task.status);
  const priorityUi = getTaskPriorityUi(task.priority);
  const categoryLabel = ['senior', 'senior-history', 'available', 'volunteer', 'history'].includes(mode)
    ? formatTaskCategory(task.category)
    : getTaskCategoryUi(task.category).label;

  return (
    <FeatureCard className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-brand-primary">{task.title}</h3>
            <StatusBadge status={task.status} />
            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${priorityUi.badgeClass}`}>
              {priorityUi.label}
            </span>
          </div>
          <p className="text-sm text-gray-700">{task.description}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2">
            {showSeniorRequester && (
              <span className="inline-flex items-center gap-1 font-semibold text-gray-600">
                <span aria-hidden="true">👤</span>
                Requested by: {seniorName}
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                  Senior
                </span>
              </span>
            )}
            <span>Category: {categoryLabel}</span>
            <span>Scheduled: {formatDate(task.scheduledTime)}</span>
            <LocationText label="Pickup" location={task.pickupLocation || task.location} />
            <LocationText label="Drop" location={task.dropLocation} />
            {volunteerName && <span>Volunteer: {volunteerName}</span>}
          </div>
          {task.completionProof?.note && (
            <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              Completion note: {task.completionProof.note}
            </p>
          )}
          {task.verification?.rating && (
            <p className="mt-3 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
              Reward rating: {task.verification.rating}/5
              {task.verification.feedback ? ` - ${task.verification.feedback}` : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {canSeniorEdit && (
            <>
              <Button size="sm" variant="secondary" onClick={() => onEdit(task)}>Edit</Button>
              <Button size="sm" variant="danger" disabled={actionLoading === task._id} onClick={() => onDelete(task)}>
                Delete
              </Button>
            </>
          )}
          {mode === 'senior-history' && (
            <Button size="sm" variant="ghost" disabled={actionLoading === task._id} onClick={() => onHideHistory(task)}>
              <Trash2 size={16} />
              Hide
            </Button>
          )}
          {mode === 'available' && task.status === 'pending' && (
            <>
              <Button size="sm" disabled={actionLoading === task._id} onClick={() => onAccept(task)}>
                Accept Task
              </Button>
              <Button size="sm" variant="secondary" disabled={actionLoading === task._id} onClick={() => onIgnore(task)}>
                Ignore
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onMessageSenior(task)}>
                Message Senior
              </Button>
            </>
          )}
          {mode === 'volunteer' && (
            <Button size="sm" variant="ghost" onClick={() => onMessageSenior(task)}>
              Message Senior
            </Button>
          )}
          {canVolunteerManage && task.status === 'accepted' && (
            <Button size="sm" variant="secondary" disabled={actionLoading === task._id} onClick={() => onStart(task)}>
              Start
            </Button>
          )}
          {canVolunteerManage && (
            <Button size="sm" variant="success" disabled={actionLoading === task._id} onClick={() => onComplete(task)}>
              Mark Complete
            </Button>
          )}
        </div>
      </div>

      {canVerify && (
        <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_auto]">
            <VerificationStarRating
              value={verificationDraft?.rating || ''}
              onChange={(rating) => onVerificationChange(task._id, { rating })}
            />
            <input
              type="text"
              value={verificationDraft?.feedback || ''}
              onChange={(event) => onVerificationChange(task._id, { feedback: event.target.value })}
              placeholder="Feedback for volunteer (required)"
              className="rounded-xl border border-green-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Button size="sm" variant="success" disabled={actionLoading === task._id} onClick={() => onVerify(task)}>
              <Star size={16} />
              Verify
            </Button>
          </div>
        </div>
      )}
    </FeatureCard>
  );
}

export default function TaskRequests() {
  const navigate = useNavigate();
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentUserId = String(currentUser._id || currentUser.id || '');
  const role = currentUser.role;
  const isSenior = role === 'elder';
  const isCaregiver = role === 'caregiver';
  const isVolunteer = role === 'volunteer';
  const initialView = searchParams.get('view') || 'all';

  const [formData, setFormData] = useState(emptyForm);
  const [locationMode, setLocationMode] = useState({ pickupLocation: '', dropLocation: '' });
  const [mapPicker, setMapPicker] = useState({
    field: '',
    draftLocation: normalizeLocation({}),
    loading: false,
    error: ''
  });
  const [editingTask, setEditingTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [ignoredTaskIds, setIgnoredTaskIds] = useState(new Set());
  const [volunteerTasks, setVolunteerTasks] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [verificationDrafts, setVerificationDrafts] = useState({});
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef(null);
  const speechBaseDescriptionRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isMapModeButton = (field) => locationMode[field] === 'mapRequired' || hasLocationValue(formData[field]);
  const seniorActiveTasks = isSenior ? tasks.filter((task) => !seniorHistoryStatuses.includes(task.status)) : tasks;
  const seniorHistoryTasks = isSenior ? tasks.filter((task) => seniorHistoryStatuses.includes(task.status)) : [];

  const mergeRealtimeTask = (task) => {
    if (!task?._id) return;
    const normalizedTask = normalizeTask(task);

    if (isVolunteer) {
      setAvailableTasks((current) => (
        isTaskAvailableForVolunteer(normalizedTask, ignoredTaskIds)
          ? upsertById(current, normalizedTask)
          : removeById(current, normalizedTask._id)
      ));
      setVolunteerTasks((current) => (
        ['accepted', 'in_progress', 'completed_pending_verification'].includes(normalizedTask.status) && isTaskAssignedToVolunteer(normalizedTask, currentUserId)
          ? upsertById(current, normalizedTask)
          : removeById(current, normalizedTask._id)
      ));
      setHistoryTasks((current) => (
        normalizedTask.status === 'verified_completed' && isTaskAssignedToVolunteer(normalizedTask, currentUserId)
          ? upsertById(current, normalizedTask)
          : removeById(current, normalizedTask._id)
      ));
      return;
    }

    setTasks((current) => upsertById(current, normalizedTask));
  };

  const removeRealtimeTask = (task) => {
    const taskId = String(task?._id || task?.id || '');
    if (!taskId) return;

    if (isVolunteer) {
      setAvailableTasks((current) => removeById(current, taskId));
      setVolunteerTasks((current) => removeById(current, taskId));
      setHistoryTasks((current) => removeById(current, taskId));
      return;
    }

    setTasks((current) => removeById(current, taskId));
  };

  const loadTasks = async () => {
    setLoading(true);
    setError('');

    try {
      if (isVolunteer) {
        const [available, mine, history] = await Promise.all([
          fetchAvailableTasks(),
          fetchTaskRequests(),
          fetchVolunteerTaskHistory()
        ]);
        setAvailableTasks(available.filter((task) => isTaskAvailableForVolunteer(task, ignoredTaskIds)));
        setVolunteerTasks(mine.filter((task) => (
          ['accepted', 'in_progress', 'completed_pending_verification'].includes(task.status) && isTaskAssignedToVolunteer(task, currentUserId)
        )));
        setHistoryTasks(history.filter((task) => (
          task.status === 'verified_completed' && isTaskAssignedToVolunteer(task, currentUserId)
        )));
      } else {
        const data = await fetchTaskRequests();
        setTasks(data);
        data.forEach((task) => {
          if (task._id) {
            markNotificationAsConsumed({
              taskId: task._id,
              entityType: 'task',
              entityId: task._id
            }).catch(() => {});
          }
        });
      }
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to load task requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, ignoredTaskIds]);

  useEffect(() => {
    const socket = getChatSocket();
    const handleTaskEvent = (payload = {}) => {
      if (payload.task) {
        mergeRealtimeTask(payload.task);
      }
    };
    const handleTaskDeleted = (payload = {}) => {
      removeRealtimeTask(payload.task);
    };
    const handleTaskIgnored = (payload = {}) => {
      const taskId = String(payload.task?._id || payload.taskId || '');
      if (!taskId) return;

      setIgnoredTaskIds((current) => new Set([...current, taskId]));
      setAvailableTasks((current) => removeById(current, taskId));
    };

    socket.on('task_created', handleTaskEvent);
    socket.on('task_updated', handleTaskEvent);
    socket.on('task_accepted', handleTaskEvent);
    socket.on('task_completed', handleTaskEvent);
    socket.on('task_verified', handleTaskEvent);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('task_ignored', handleTaskIgnored);

    return () => {
      socket.off('task_created', handleTaskEvent);
      socket.off('task_updated', handleTaskEvent);
      socket.off('task_accepted', handleTaskEvent);
      socket.off('task_completed', handleTaskEvent);
      socket.off('task_verified', handleTaskEvent);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('task_ignored', handleTaskIgnored);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVolunteer, currentUserId]);

  useEffect(() => () => {
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
  }, []);

  const startVoiceInput = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    speechBaseDescriptionRef.current = formData.description.trim();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setError('');
      setIsListening(true);
    };
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalTranscript += `${result[0].transcript} `;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const spokenText = `${finalTranscript}${interimTranscript}`.trim();
      const description = speechBaseDescriptionRef.current
        ? `${speechBaseDescriptionRef.current} ${spokenText}`.trim()
        : spokenText;

      setFormData((current) => ({ ...current, description }));
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      speechRecognitionRef.current = null;
      setError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone permission was denied. Please allow microphone access and try again.'
          : 'Voice recognition failed. Please type your request.'
      );
    };
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };
    recognition.start();
  };

  const setLocationField = (field, location, mode = '') => {
    setFormData((current) => ({
      ...current,
      [field]: normalizeLocation(location)
    }));
    setLocationMode((current) => {
      const next = { ...current, [field]: mode };
      if (mode === 'current') {
        next[getOppositeLocationField(field)] = 'mapRequired';
      }
      return next;
    });
  };

  const clearLocationField = (field) => {
    setLocationField(field, {}, '');
  };

  const getProfileFallbackLocation = async () => {
    try {
      const profile = await fetchCurrentUserProfile();
      return locationFromProfile(profile);
    } catch (err) {
      return null;
    }
  };

  const getBrowserLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
  });

  const useCurrentAddress = async (field) => {
    setError('');

    try {
      const position = await getBrowserLocation();
      const coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      const address = await reverseGeocode(coordinates);

      if (!address && !currentUser.address) {
        setError(`Could not resolve a readable ${getLocationLabel(field).toLowerCase()} address. Please try again.`);
        return;
      }

      setLocationField(field, {
        ...coordinates,
        address: address || currentUser.address
      }, 'current');
    } catch (err) {
      const fallbackLocation = await getProfileFallbackLocation();
      if (fallbackLocation?.address) {
        setLocationField(field, fallbackLocation, 'current');
        return;
      }

      setError(
        err?.code === 1
          ? 'Location permission was denied. Please allow location access and try again.'
          : 'Current location is not available. Please enter the address manually.'
      );
    }
  };

  const handleLocationAction = (field) => {
    const shouldOpenMap = locationMode[field] === 'mapRequired' || hasLocationValue(formData[field]);

    if (shouldOpenMap) {
      setMapPicker({
        field,
        draftLocation: normalizeLocation(formData[field]),
        loading: false,
        error: ''
      });
      return;
    }

    useCurrentAddress(field);
  };

  const handleMapPointSelected = async ({ lat, lng }) => {
    setMapPicker((current) => ({ ...current, loading: true, error: '' }));
    const address = await reverseGeocode({ lat, lng });

    if (!address) {
      setMapPicker((current) => ({
        ...current,
        loading: false,
        error: 'Could not resolve this pin to a readable address. Please choose a nearby point.'
      }));
      return;
    }

    setMapPicker((current) => ({
      ...current,
      draftLocation: normalizeLocation({ address, lat, lng }),
      loading: false,
      error: ''
    }));
  };

  const useCurrentLocationInMap = async () => {
    setMapPicker((current) => ({ ...current, loading: true, error: '' }));

    try {
      const position = await getBrowserLocation();
      const coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      const address = await reverseGeocode(coordinates);

      if (!address && !currentUser.address) {
        setMapPicker((current) => ({
          ...current,
          loading: false,
          error: 'Could not resolve your current location to a readable address.'
        }));
        return;
      }

      setMapPicker((current) => ({
        ...current,
        draftLocation: normalizeLocation({
          ...coordinates,
          address: address || currentUser.address
        }),
        loading: false,
        error: ''
      }));
    } catch (err) {
      setMapPicker((current) => ({
        ...current,
        loading: false,
        error: err?.code === 1
          ? 'Location permission was denied. Please allow location access and try again.'
          : 'Current location is not available.'
      }));
    }
  };

  const applyMapSelection = () => {
    if (!mapPicker.field || !mapPicker.draftLocation.address) return;
    setLocationField(mapPicker.field, mapPicker.draftLocation, 'map');
    setMapPicker({
      field: '',
      draftLocation: normalizeLocation({}),
      loading: false,
      error: ''
    });
  };

  const closeMapPicker = () => {
    setMapPicker({
      field: '',
      draftLocation: normalizeLocation({}),
      loading: false,
      error: ''
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isSenior) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    const payload = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      scheduledTime: formData.scheduledTime || null,
      pickupLocation: formData.pickupLocation,
      dropLocation: formData.dropLocation,
      location: formData.pickupLocation
    };

    try {
      const saved = editingTask?._id
        ? await updateTaskRequest(editingTask._id, payload)
        : await createTaskRequest(payload);

      setTasks((current) => upsertById(current, saved));
      setSuccess(editingTask ? 'Task request updated.' : 'Task request created.');
      setEditingTask(null);
      setFormData(emptyForm);
      setLocationMode({ pickupLocation: '', dropLocation: '' });
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to save task request'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData(toForm(task));
    setLocationMode({
      pickupLocation: hasLocationValue(task.pickupLocation || task.location) ? 'saved' : '',
      dropLocation: hasLocationValue(task.dropLocation) ? 'saved' : ''
    });
    setSuccess('');
    setError('');
  };

  const handleDelete = async (task) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete task request?',
      message: `Delete "${task.title}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    setActionLoading(task._id);
    setError('');

    try {
      await deleteTaskRequest(task._id);
      setTasks((current) => current.filter((item) => item._id !== task._id));
      if (editingTask?._id === task._id) {
        setEditingTask(null);
        setFormData(emptyForm);
      }
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to delete task request'));
    } finally {
      setActionLoading('');
    }
  };

  const handleHideHistoryTask = async (task) => {
    if (!isSenior || !seniorHistoryStatuses.includes(task.status)) return;

    setActionLoading(task._id);
    setError('');
    setSuccess('');

    try {
      setTasks((current) => current.filter((item) => item._id !== task._id));
      await hideTaskHistoryItem(task._id);
      setSuccess('Task hidden from your history.');
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to hide task history item'));
      loadTasks();
    } finally {
      setActionLoading('');
    }
  };

  const handleClearTaskHistory = async () => {
    if (!isSenior || !seniorHistoryTasks.length) return;
    const confirmed = await dialog.showConfirm({
      title: 'Clear task history?',
      message: 'Clear all task history from your view? This will not delete the tasks.',
      confirmText: 'Clear History',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    const historyIds = new Set(seniorHistoryTasks.map((task) => task._id));
    setActionLoading('clear-history');
    setError('');
    setSuccess('');

    try {
      setTasks((current) => current.filter((task) => !historyIds.has(task._id)));
      await clearTaskHistory();
      setSuccess('Task history cleared from your view.');
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to clear task history'));
      loadTasks();
    } finally {
      setActionLoading('');
    }
  };

  const handleAccept = async (task) => {
    setActionLoading(task._id);
    setError('');
    try {
      const accepted = await acceptTask(task._id);
      setAvailableTasks((current) => current.filter((item) => item._id !== task._id));
      setVolunteerTasks((current) => upsertById(current, accepted));
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to accept task'));
    } finally {
      setActionLoading('');
    }
  };

  const handleIgnore = async (task) => {
    setActionLoading(task._id);
    setError('');
    try {
      await ignoreTask(task._id);
      const nextIgnoredTaskIds = new Set([...ignoredTaskIds, String(task._id)]);
      setIgnoredTaskIds(nextIgnoredTaskIds);
      const available = await fetchAvailableTasks();
      setAvailableTasks(available.filter((item) => isTaskAvailableForVolunteer(item, nextIgnoredTaskIds)));
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to ignore task'));
    } finally {
      setActionLoading('');
    }
  };

  const handleMessageSenior = async (task) => {
    const seniorId = getTaskSeniorId(task);
    if (!seniorId) return;

    setError('');
    try {
      const conversation = await resolveConversation({
        fromUserId: seniorId,
        toUserId: currentUserId
      });
      const conversationId = conversation?.id || conversation?._id;
      if (conversationId) {
        navigate(`/chat/${conversationId}`, {
          state: { taskId: task._id }
        });
      }
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to open chat with senior'));
    }
  };

  const handleStart = async (task) => {
    setActionLoading(task._id);
    setError('');
    try {
      const started = await startTask(task._id);
      setVolunteerTasks((current) => upsertById(current, started));
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to start task'));
    } finally {
      setActionLoading('');
    }
  };

  const handleComplete = async (task) => {
    const note = await dialog.showPrompt({
      title: 'Completion note',
      message: 'Add an optional completion note for the senior.',
      inputPlaceholder: 'Completion note',
      defaultValue: task.completionProof?.note || '',
      confirmText: 'Mark Complete',
      cancelText: 'Cancel'
    });
    if (note === null) return;
    setActionLoading(task._id);
    setError('');
    try {
      const completed = await completeTask(task._id, { note });
      setVolunteerTasks((current) => upsertById(current, completed));
      setHistoryTasks((current) => removeById(current, completed._id));
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to complete task'));
    } finally {
      setActionLoading('');
    }
  };

  const handleVerificationChange = (taskId, patch) => {
    setVerificationDrafts((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] || {}),
        ...patch
      }
    }));
  };

  const handleVerify = async (task) => {
    const draft = verificationDrafts[task._id] || {};
    if (!draft.rating || !String(draft.feedback || '').trim()) {
      setError('Rating and feedback are required before verifying completion.');
      return;
    }
    setActionLoading(task._id);
    setError('');

    try {
      const verified = await verifyTask(task._id, draft);
      setTasks((current) => upsertById(current, verified));
      setVerificationDrafts((current) => {
        const next = { ...current };
        delete next[task._id];
        return next;
      });
    } catch (err) {
      setError(getTaskErrorMessage(err, 'Failed to verify task'));
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return <LoadingState label="Loading task requests..." />;
  }

  return (
    <FeaturePage
      title="Task Requests"
      description={isVolunteer ? 'Accept and manage senior task requests.' : 'Create and track senior support requests.'}
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">
        <StatusAlert variant="error">{error}</StatusAlert>
        <StatusAlert variant="success">{success}</StatusAlert>
        <MapPickerModal
          field={mapPicker.field}
          draftLocation={mapPicker.draftLocation}
          loading={mapPicker.loading}
          error={mapPicker.error}
          onClose={closeMapPicker}
          onMapClick={handleMapPointSelected}
          onUseCurrentLocation={useCurrentLocationInMap}
          onAddressChange={(address) => setMapPicker((current) => ({
            ...current,
            draftLocation: normalizeLocation({ ...current.draftLocation, address })
          }))}
          onApply={applyMapSelection}
        />

        {isSenior && (
          <FeatureCard>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-brand-primary">
                    {editingTask ? 'Edit Task Request' : 'Create Task Request'}
                  </h2>
                  <p className="text-sm text-gray-500">Only pending requests can be edited or deleted.</p>
                </div>
                {editingTask && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingTask(null);
                      setFormData(emptyForm);
                      setLocationMode({ pickupLocation: '', dropLocation: '' });
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>

              <div>
                <label className="mb-2 block font-semibold text-gray-700">Help Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Need help with groceries"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold text-gray-700">Description *</label>
                <div className="relative">
                  <textarea
                    placeholder="Describe your need in detail..."
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    rows={4}
                    className="w-full rounded-xl border px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    className={`absolute bottom-3 right-3 rounded-full p-2 transition ${
                      isListening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                    title="Voice input"
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block font-semibold text-gray-700">Category</label>
                  <select
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                    className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>{formatTaskCategory(category.value)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block font-semibold text-gray-700">Priority Level</label>
                  {(() => {
                    const priorityUi = getTaskPriorityUi(formData.priority);
                    return (
                      <span className={`mb-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${priorityUi.badgeClass}`}>
                        {priorityUi.label}
                      </span>
                    );
                  })()}
                  <select
                    value={formData.priority}
                    onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                    className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {priorities.map((priority) => {
                      const priorityUi = getTaskPriorityUi(priority.value);
                      return (
                        <option key={priority.value} value={priority.value}>
                          {priorityUi.label} - {priority.detail}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block font-semibold text-gray-700">Schedule</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledTime}
                  onChange={(event) => setFormData({ ...formData, scheduledTime: event.target.value })}
                  className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block font-semibold text-gray-700">Pickup Location</label>
                    <div className="flex items-center gap-2">
                      {hasLocationValue(formData.pickupLocation) && (
                        <button
                          type="button"
                          onClick={() => clearLocationField('pickupLocation')}
                          className="text-sm font-semibold text-gray-500 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleLocationAction('pickupLocation')}
                        className="text-sm font-semibold text-brand-primary hover:underline"
                      >
                        {isMapModeButton('pickupLocation') ? 'Choose on Map' : 'Use Current Location'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Pickup address"
                    value={formData.pickupLocation.address}
                    onChange={(event) => setFormData({
                      ...formData,
                      pickupLocation: normalizeLocation({ ...formData.pickupLocation, address: event.target.value })
                    })}
                    className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      locationMode.pickupLocation ? 'border-green-300 bg-green-50/40' : ''
                    }`}
                  />
                  {formData.pickupLocation.googleMapsUrl && (
                    <a
                      href={formData.pickupLocation.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-semibold text-brand-primary hover:underline"
                    >
                      View pickup on Google Maps
                    </a>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block font-semibold text-gray-700">Drop Location</label>
                    <div className="flex items-center gap-2">
                      {hasLocationValue(formData.dropLocation) && (
                        <button
                          type="button"
                          onClick={() => clearLocationField('dropLocation')}
                          className="text-sm font-semibold text-gray-500 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleLocationAction('dropLocation')}
                        className="text-sm font-semibold text-brand-primary hover:underline"
                      >
                        {isMapModeButton('dropLocation') ? 'Choose on Map' : 'Use Current Location'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Drop address"
                    value={formData.dropLocation.address}
                    onChange={(event) => setFormData({
                      ...formData,
                      dropLocation: normalizeLocation({ ...formData.dropLocation, address: event.target.value })
                    })}
                    className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      locationMode.dropLocation ? 'border-green-300 bg-green-50/40' : ''
                    }`}
                  />
                  {formData.dropLocation.googleMapsUrl && (
                    <a
                      href={formData.dropLocation.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-semibold text-brand-primary hover:underline"
                    >
                      View drop on Google Maps
                    </a>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={submitting} size="lg" className="w-full">
                <Send size={20} />
                {submitting ? 'Saving...' : editingTask ? 'Update Task Request' : 'Create Task Request'}
              </Button>
            </form>
          </FeatureCard>
        )}

        {isCaregiver && (
          <StatusAlert variant="info">
            Caregiver view only. You can monitor your linked senior&apos;s task requests but cannot change them.
          </StatusAlert>
        )}

        {(isSenior || isCaregiver) && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-brand-primary">
              <Clipboard size={22} />
              Task Status
            </h2>
            {(isSenior ? seniorActiveTasks : tasks).length ? (isSenior ? seniorActiveTasks : tasks).map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                mode={isSenior ? 'senior' : 'caregiver'}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onVerify={handleVerify}
                actionLoading={actionLoading}
                verificationDraft={verificationDrafts[task._id]}
                onVerificationChange={handleVerificationChange}
              />
            )) : (
              <EmptyState title="No active task requests" description={isSenior ? 'Create a task request to get help.' : 'No senior task requests are available yet.'} />
            )}
          </section>
        )}

        {isSenior && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-brand-primary">
                <Clipboard size={22} />
                Task History
              </h2>
              {seniorHistoryTasks.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={actionLoading === 'clear-history'}
                  onClick={handleClearTaskHistory}
                >
                  Clear Task History
                </Button>
              )}
            </div>
            {seniorHistoryTasks.length ? seniorHistoryTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                mode="senior-history"
                onHideHistory={handleHideHistoryTask}
                actionLoading={actionLoading}
              />
            )) : (
              <EmptyState title="No task history" description="Completed and cancelled task requests will appear here." />
            )}
          </section>
        )}

        {isVolunteer && (
          <div className="space-y-8">
            {(initialView === 'all' || initialView === 'available') && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-brand-primary">Available Tasks</h2>
                {availableTasks.length ? availableTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    mode="available"
                    onAccept={handleAccept}
                    onIgnore={handleIgnore}
                    onMessageSenior={handleMessageSenior}
                    actionLoading={actionLoading}
                  />
                )) : (
                  <EmptyState title="No available tasks" description="Pending senior task requests will appear here." />
                )}
              </section>
            )}

            {(initialView === 'all' || initialView === 'my') && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-brand-primary">My Tasks</h2>
                {volunteerTasks.length ? volunteerTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    mode="volunteer"
                    onStart={handleStart}
                    onComplete={handleComplete}
                    onMessageSenior={handleMessageSenior}
                    actionLoading={actionLoading}
                  />
                )) : (
                  <EmptyState title="No assigned tasks" description="Accepted tasks move here for completion." />
                )}
              </section>
            )}

            {(initialView === 'all' || initialView === 'completed' || initialView === 'rewards') && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-brand-primary">
                  {initialView === 'rewards' ? 'My Rewards' : 'Completed Tasks'}
                </h2>
                {historyTasks.length ? historyTasks.map((task) => (
                  <TaskCard key={task._id} task={task} mode="history" actionLoading={actionLoading} />
                )) : (
                  <EmptyState
                    title={initialView === 'rewards' ? 'No rewards yet' : 'No completed tasks'}
                    description="Verified completed tasks and ratings will appear here."
                  />
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </FeaturePage>
  );
}
