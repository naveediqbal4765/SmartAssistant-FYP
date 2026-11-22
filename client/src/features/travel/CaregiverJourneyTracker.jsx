import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Wifi,
  WifiOff,
  XCircle
} from 'lucide-react';
import FeaturePage from '../../components/ui/FeaturePage';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import { useDialog } from '../../components/ui/GlobalDialogProvider';
import {
  getCaregiverActiveJourney,
  getCaregiverJourneys,
  hideJourneyFromHistory,
  clearHistory
} from './services/travelApi';

const SWIPE_THRESHOLD_PX = 48;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

// ── Helpers ──────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 7000; // 7 seconds

const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 10) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ── Journey Map Component ────────────────────────────────────────────────────

function JourneyMap({ journey }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const currentLocationMarkerRef = useRef(null);

  // Extract coordinates from GeoJSON
  const pickupCoords = journey?.pickup?.coordinates?.coordinates; // [lng, lat]
  const destCoords = journey?.destination?.coordinates?.coordinates;
  const currentCoords = journey?.currentLocation?.coordinates;
  const routeCoords = journey?.route?.geometry?.coordinates;

  useEffect(() => {
    if (!mapContainerRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      center: [33.6844, 73.0479],
      zoom: 12,
      scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      layersRef.current.forEach((layer) => layer.remove());
      layersRef.current = [];
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
        currentLocationMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers and route when journey data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickupCoords || !destCoords) return;

    // Clear existing layers (except current location marker)
    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    const pickupLatLng = [pickupCoords[1], pickupCoords[0]];
    const destLatLng = [destCoords[1], destCoords[0]];

    // Pickup marker
    const pickupIcon = L.divIcon({
      className: 'pickup-marker',
      html: `<div style="
        width: 24px; height: 24px;
        background-color: #22c55e;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const pickupMarker = L.marker(pickupLatLng, { icon: pickupIcon })
      .addTo(map)
      .bindPopup(`<strong>Pickup</strong><br/>${journey.pickup?.address || ''}`);
    layersRef.current.push(pickupMarker);

    // Destination marker
    const destIcon = L.divIcon({
      className: 'dest-marker',
      html: `<div style="
        width: 24px; height: 24px;
        background-color: #ef4444;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const destMarker = L.marker(destLatLng, { icon: destIcon })
      .addTo(map)
      .bindPopup(`<strong>Destination</strong><br/>${journey.destination?.address || ''}`);
    layersRef.current.push(destMarker);

    // Route polyline
    if (routeCoords && routeCoords.length > 0) {
      const latlngs = routeCoords.map(([lng, lat]) => [lat, lng]);
      const polyline = L.polyline(latlngs, {
        color: '#1C382A',
        weight: 4,
        opacity: 0.7,
        dashArray: '8, 4'
      }).addTo(map);
      layersRef.current.push(polyline);
    }

    // Fit bounds
    const bounds = L.latLngBounds([pickupLatLng, destLatLng]);
    if (routeCoords && routeCoords.length > 0) {
      routeCoords.forEach(([lng, lat]) => bounds.extend([lat, lng]));
    }
    map.fitBounds(bounds.pad(0.2), { animate: true });
  }, [pickupCoords, destCoords, routeCoords, journey]);

  // Update current location marker (separate effect for polling updates)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!currentCoords) {
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
        currentLocationMarkerRef.current = null;
      }
      return;
    }

    const [lng, lat] = currentCoords;

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const currentLocationIcon = L.divIcon({
        className: 'current-location-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              position: absolute; inset: 0;
              background-color: rgba(59, 130, 246, 0.2);
              border-radius: 50%;
              animation: pulse 2s ease-in-out infinite;
            "></div>
            <div style="
              position: absolute; top: 4px; left: 4px;
              width: 16px; height: 16px;
              background-color: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.5); opacity: 0.5; }
            }
          </style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      currentLocationMarkerRef.current = L.marker([lat, lng], {
        icon: currentLocationIcon,
        zIndexOffset: 1000
      })
        .addTo(map)
        .bindPopup('<strong>Senior\'s Current Location</strong>');
    }
  }, [currentCoords]);

  return (
    <div
      ref={mapContainerRef}
      className="h-[350px] w-full overflow-hidden rounded-2xl border border-gray-200 sm:h-[420px]"
    />
  );
}

// ── Journey Card Component ───────────────────────────────────────────────────

function JourneyCard({ journey, statusVariant, onDelete, isDeleting }) {
  const distance = journey?.route?.distanceMeters || 0;
  const duration = journey?.route?.estimatedDurationSeconds || 0;

  const statusConfig = {
    planned: {
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Planned'
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Completed'
    },
    cancelled: {
      icon: XCircle,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Cancelled'
    }
  };

  const config = statusConfig[statusVariant] || statusConfig.planned;
  const StatusIcon = config.icon;

  // Only completed/cancelled journeys can be deleted
  const canDelete = (statusVariant === 'completed' || statusVariant === 'cancelled') && !!onDelete;

  // Swipe state (matches CallHistoryItem / TravelAssistance pointer-based pattern)
  const [actionOpen, setActionOpen] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const swipedRef = useRef(false);

  const handlePointerDown = (event) => {
    if (!canDelete || isDeleting) return;
    setSwipeStartX(event.clientX);
    setActionOpen((current) => (current ? current : false));
  };

  const handlePointerUp = (event) => {
    if (!canDelete || isDeleting || swipeStartX === null) return;
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
    }
  };

  return (
    <div className={`motion-interactive group relative overflow-hidden rounded-2xl transition-all duration-200 ease-in-out ${
      isDeleting ? '-translate-x-8 opacity-0' : 'translate-x-0 opacity-100'
    }`}>
      {/* Delete button revealed behind card on swipe (matches CallHistoryItem) */}
      {canDelete && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(journey._id);
          }}
          className="absolute inset-y-1 right-0 flex w-24 items-center justify-center rounded-2xl bg-red-600 text-sm font-semibold text-white"
        >
          {isDeleting ? 'Removing...' : 'Remove'}
        </button>
      )}

      {/* Card content */}
      <div
        role={canDelete ? 'button' : undefined}
        tabIndex={canDelete ? 0 : undefined}
        onPointerDown={canDelete ? handlePointerDown : undefined}
        onPointerUp={canDelete ? handlePointerUp : undefined}
        onPointerCancel={canDelete ? () => setSwipeStartX(null) : undefined}
        onClick={canDelete ? handleSelect : undefined}
        className={`relative z-10 rounded-2xl border ${config.borderColor} ${config.bgColor} p-4 ${
          canDelete ? 'touch-pan-y cursor-pointer transition duration-150 ease-in-out hover:opacity-90' : ''
        } ${canDelete && actionOpen ? '-translate-x-24' : 'translate-x-0'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
              <StatusIcon size={20} className={config.color} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <p className="mt-1 break-words text-sm font-medium text-gray-900">
                {journey.pickup?.address}
              </p>
              <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                <Navigation size={12} className="mt-0.5 shrink-0" />
                <span className="break-words">{journey.destination?.address}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
          {distance > 0 && (
            <span className="flex items-center gap-1">
              <Route size={12} />
              {formatDistance(distance)}
            </span>
          )}
          {duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDuration(duration)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {formatDate(journey.createdAt)}
          </span>
        </div>

        {statusVariant === 'completed' && journey.completedAt && (
          <p className="mt-2 text-xs text-green-600">
            Completed: {formatDate(journey.completedAt)}
          </p>
        )}
        {statusVariant === 'cancelled' && journey.completedAt && (
          <p className="mt-2 text-xs text-gray-500">
            Cancelled: {formatDate(journey.completedAt)}
          </p>
        )}

        {/* Swipe hint for deletable journeys */}
        {canDelete && !isDeleting && (
          <p className="mt-2 text-[10px] text-gray-400 sm:hidden">
            ← Swipe left to remove
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CaregiverJourneyTracker() {
  const navigate = useNavigate();
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState('active');

  // Active journey state
  const [journey, setJourney] = useState(null);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeError, setActiveError] = useState(null);
  const [lastPoll, setLastPoll] = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  // Planned journeys state
  const [plannedJourneys, setPlannedJourneys] = useState([]);
  const [plannedLoading, setPlannedLoading] = useState(false);
  const [plannedError, setPlannedError] = useState(null);

  // History journeys state
  const [historyJourneys, setHistoryJourneys] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [clearingHistory, setClearingHistory] = useState(false);

  // Fetch active journey
  const fetchActiveJourney = useCallback(async (isPoll = false) => {
    try {
      if (isPoll) setPolling(true);
      else setActiveLoading(true);

      const data = await getCaregiverActiveJourney();
      setJourney(data.journey || null);
      setActiveError(null);
      setLastPoll(new Date());
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.msg || 'Failed to fetch journey data';

      if (status === 403) {
        setActiveError('You do not have permission to view this data. Ensure you are linked to a senior.');
      } else if (status === 400) {
        setActiveError(msg);
      } else {
        setActiveError(msg);
      }
    } finally {
      setActiveLoading(false);
      setPolling(false);
    }
  }, []);

  // Fetch planned journeys
  const fetchPlannedJourneys = useCallback(async () => {
    setPlannedLoading(true);
    setPlannedError(null);
    try {
      const data = await getCaregiverJourneys({ status: 'planned' });
      setPlannedJourneys(data.journeys || []);
    } catch (err) {
      setPlannedError(err.response?.data?.msg || 'Failed to fetch planned journeys');
    } finally {
      setPlannedLoading(false);
    }
  }, []);

  // Fetch history journeys (completed + cancelled)
  const fetchHistoryJourneys = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const [completedData, cancelledData] = await Promise.all([
        getCaregiverJourneys({ status: 'completed', limit: 50 }),
        getCaregiverJourneys({ status: 'cancelled', limit: 50 })
      ]);
      const combined = [
        ...(completedData.journeys || []),
        ...(cancelledData.journeys || [])
      ].sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
      setHistoryJourneys(combined);
    } catch (err) {
      setHistoryError(err.response?.data?.msg || 'Failed to fetch journey history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Initial fetch for active journey
  useEffect(() => {
    fetchActiveJourney();
  }, [fetchActiveJourney]);

  // Polling for active journey
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchActiveJourney(true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchActiveJourney]);

  // Fetch planned journeys when tab is selected
  useEffect(() => {
    if (activeTab === 'planned') {
      fetchPlannedJourneys();
    }
  }, [activeTab, fetchPlannedJourneys]);

  // Fetch history journeys when tab is selected
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryJourneys();
    }
  }, [activeTab, fetchHistoryJourneys]);

  // Handle delete single journey
  const handleDeleteJourney = useCallback(
    async (journeyId) => {
      const confirmed = await dialog.showConfirm({
        title: 'Remove from history?',
        message: 'This journey will be hidden from your history. This action cannot be undone.',
        confirmText: 'Remove',
        variant: 'danger'
      });
      if (!confirmed) return;

      setDeletingIds((prev) => new Set(prev).add(journeyId));
      try {
        await hideJourneyFromHistory(journeyId);
        await wait(280);
        setHistoryJourneys((prev) => prev.filter((j) => j._id !== journeyId));
        dialog.showAlert({
          title: 'Journey removed',
          message: 'The journey has been hidden from your history.',
          variant: 'success'
        });
      } catch (err) {
        dialog.showAlert({
          title: 'Could not remove journey',
          message: err?.response?.data?.msg || 'Please try again.',
          variant: 'danger'
        });
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(journeyId);
          return next;
        });
      }
    },
    [dialog]
  );

  // Handle clear all history
  const handleClearHistory = useCallback(async () => {
    const confirmed = await dialog.showConfirm({
      title: 'Clear all history?',
      message: 'All completed and cancelled journeys will be hidden from your history. This action cannot be undone.',
      confirmText: 'Clear All',
      variant: 'danger'
    });
    if (!confirmed) return;

    setClearingHistory(true);
    try {
      const result = await clearHistory();
      await wait(280);
      setHistoryJourneys([]);
      dialog.showAlert({
        title: 'History cleared',
        message: result.msg || 'All journeys have been hidden from your history.',
        variant: 'success'
      });
    } catch (err) {
      dialog.showAlert({
        title: 'Could not clear history',
        message: err?.response?.data?.msg || 'Please try again.',
        variant: 'danger'
      });
    } finally {
      setClearingHistory(false);
    }
  }, [dialog]);

  // Extract active journey info
  const distance = journey?.route?.distanceMeters || 0;
  const duration = journey?.route?.estimatedDurationSeconds || 0;
  const lastUpdate = journey?.lastLocationUpdateAt;
  const startedAt = journey?.startedAt;

  const tabs = [
    { id: 'active', label: 'Active' },
    { id: 'planned', label: 'Planned' },
    { id: 'history', label: 'History' }
  ];

  return (
    <FeaturePage
      title="Journey Tracker"
      description="Monitor your linked senior's journeys and live location."
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
    >
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Active Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'active' && (
        <>
          {/* Loading State */}
          {activeLoading && (
            <LoadingState message="Loading active journey..." />
          )}

          {/* Error State */}
          {!activeLoading && activeError && (
            <div className="motion-card rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">Unable to Load Journey</h3>
                  <p className="mt-1 text-sm text-amber-700">{activeError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => fetchActiveJourney()}
                  >
                    <RefreshCw size={14} />
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* No Active Journey */}
          {!activeLoading && !activeError && !journey && (
            <EmptyState
              title="No Active Journey"
              description="Your linked senior does not have an active journey with location sharing enabled. When they start a journey and enable caregiver location consent, you'll see it here."
            >
              <Button variant="primary" onClick={() => fetchActiveJourney()}>
                <RefreshCw size={16} />
                Refresh
              </Button>
            </EmptyState>
          )}

          {/* Active Journey Display */}
          {!activeLoading && !activeError && journey && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="motion-card rounded-2xl border border-green-200 bg-green-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Navigation size={20} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">Journey in Progress</h3>
                      <p className="text-sm text-green-700">
                        {journey.pickup?.address} → {journey.destination?.address}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5">
                    {polling ? (
                      <Loader2 size={14} className="animate-spin text-green-600" />
                    ) : (
                      <Wifi size={14} className="text-green-600" />
                    )}
                    <span className="text-xs font-medium text-green-700">
                      {polling ? 'Updating...' : 'Live'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Journey Info Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Distance */}
                <div className="motion-card rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Route size={16} className="text-brand-primary" />
                    Distance
                  </div>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {distance > 0 ? formatDistance(distance) : '—'}
                  </p>
                </div>

                {/* Duration */}
                <div className="motion-card rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={16} className="text-brand-primary" />
                    Est. Duration
                  </div>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {duration > 0 ? formatDuration(duration) : '—'}
                  </p>
                </div>

                {/* Started */}
                <div className="motion-card rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Navigation size={16} className="text-brand-primary" />
                    Started
                  </div>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {startedAt ? formatTimeAgo(startedAt) : '—'}
                  </p>
                </div>

                {/* Last Location Update */}
                <div className="motion-card rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin size={16} className="text-brand-primary" />
                    Last Update
                  </div>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {lastUpdate ? formatTimeAgo(lastUpdate) : '—'}
                  </p>
                </div>
              </div>

              {/* Current Location Info */}
              {journey.currentLocation?.coordinates && (
                <div className="motion-card rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Current GPS Location</span>
                  </div>
                  <p className="mt-1 font-mono text-sm text-blue-700">
                    {journey.currentLocation.coordinates[1].toFixed(6)},{' '}
                    {journey.currentLocation.coordinates[0].toFixed(6)}
                  </p>
                </div>
              )}

              {/* No Location Yet */}
              {!journey.currentLocation?.coordinates && (
                <div className="motion-card rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <WifiOff size={16} className="text-amber-600" />
                    <span className="text-sm font-semibold text-amber-900">No Location Data Yet</span>
                  </div>
                  <p className="mt-1 text-sm text-amber-700">
                    The senior's device has not reported a location yet. Location will appear once their device sends GPS data.
                  </p>
                </div>
              )}

              {/* Map */}
              <div className="motion-card rounded-2xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <Route size={18} className="text-brand-primary" />
                  Journey Map
                </h3>
                <JourneyMap journey={journey} />
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-green-500" />
                    Pickup
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    Destination
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />
                    Current Location
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 border-t-2 border-dashed border-gray-800" />
                    Route
                  </span>
                </div>
              </div>

              {/* Manual Refresh */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  onClick={() => fetchActiveJourney(true)}
                  disabled={polling}
                >
                  {polling ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Refresh Now
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Planned Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'planned' && (
        <>
          {plannedLoading && (
            <LoadingState message="Loading planned journeys..." />
          )}

          {plannedError && (
            <div className="motion-card rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">Unable to Load Planned Journeys</h3>
                  <p className="mt-1 text-sm text-amber-700">{plannedError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={fetchPlannedJourneys}
                  >
                    <RefreshCw size={14} />
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!plannedLoading && !plannedError && plannedJourneys.length === 0 && (
            <EmptyState
              title="No Planned Journeys"
              description="Your linked senior has no planned journeys at the moment."
            >
              <Button variant="primary" onClick={fetchPlannedJourneys}>
                <RefreshCw size={16} />
                Refresh
              </Button>
            </EmptyState>
          )}

          {!plannedLoading && !plannedError && plannedJourneys.length > 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <Calendar size={18} className="text-brand-primary" />
                Planned Journeys ({plannedJourneys.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {plannedJourneys.map((j) => (
                  <JourneyCard key={j._id} journey={j} statusVariant="planned" />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── History Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <>
          {historyLoading && (
            <LoadingState message="Loading journey history..." />
          )}

          {historyError && (
            <div className="motion-card rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">Unable to Load Journey History</h3>
                  <p className="mt-1 text-sm text-amber-700">{historyError}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={fetchHistoryJourneys}
                  >
                    <RefreshCw size={14} />
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!historyLoading && !historyError && historyJourneys.length === 0 && (
            <EmptyState
              title="No Journey History"
              description="Your linked senior has no completed or cancelled journeys yet."
            >
              <Button variant="primary" onClick={fetchHistoryJourneys}>
                <RefreshCw size={16} />
                Refresh
              </Button>
            </EmptyState>
          )}

          {!historyLoading && !historyError && historyJourneys.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                  <Clock size={18} className="text-brand-primary" />
                  Journey History ({historyJourneys.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  disabled={clearingHistory}
                  className="text-red-600 hover:bg-red-50"
                >
                  {clearingHistory ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Clear All
                </Button>
              </div>
              <p className="text-xs text-gray-500 sm:hidden">
                Tip: Swipe left on a journey to remove it from history
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {historyJourneys.map((j) => (
                  <JourneyCard
                    key={j._id}
                    journey={j}
                    statusVariant={j.status}
                    onDelete={handleDeleteJourney}
                    isDeleting={deletingIds.has(j._id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </FeaturePage>
  );
}