import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Play,
  Route,
  Square,
  Wifi,
  WifiOff,
  XCircle
} from 'lucide-react';
import FeaturePage from '../../components/ui/FeaturePage';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import {
  createJourney,
  listJourneys,
  startJourney,
  completeJourney,
  cancelJourney,
  updateJourneyLocation,
  hideJourneyFromHistory,
  clearHistory
} from './services/travelApi';
import { useDialog } from '../../components/ui/GlobalDialogProvider';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  planned: { label: 'Planned', color: 'bg-amber-100 text-amber-700', icon: Calendar },
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: Play },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: XCircle }
};

const TRACKING_STATUS = {
  idle: { label: 'Idle', color: 'text-gray-500', icon: Square },
  tracking: { label: 'Tracking', color: 'text-green-600', icon: Wifi },
  paused: { label: 'Paused', color: 'text-amber-600', icon: WifiOff },
  error: { label: 'Error', color: 'text-red-600', icon: AlertTriangle }
};

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

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Nominatim geocoding
const geocodeAddress = async (query) => {
  if (!query || query.length < 3) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await response.json();
    return data.map((item) => ({
      label: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  } catch {
    return [];
  }
};

// Reverse geocoding via Nominatim (same pattern as TaskRequests)
const reverseGeocode = async ({ lat, lng }) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
    );
    if (!response.ok) return '';
    const data = await response.json();
    return data.display_name || '';
  } catch {
    return '';
  }
};

// Browser geolocation (same pattern as TaskRequests)
const getBrowserLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000
    });
  });

// OSRM routing
const fetchRoute = async (pickup, destination) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      geometry: route.geometry,
      distanceMeters: route.distance,
      estimatedDurationSeconds: route.duration
    };
  } catch {
    return null;
  }
};

// ── Address Input Component ──────────────────────────────────────────────────

function AddressInput({ label, value, onChange, placeholder, icon: Icon, action }) {
  const [query, setQuery] = useState(value?.label || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (value?.label && value.label !== query) {
      setQuery(value.label);
    }
  }, [value]);

  const handleSearch = useCallback((searchQuery) => {
    setQuery(searchQuery);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await geocodeAddress(searchQuery);
      setSuggestions(results);
      setShowSuggestions(true);
    }, 400);
  }, []);

  const handleSelect = (suggestion) => {
    onChange(suggestion);
    setQuery(suggestion.label);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {Icon && <Icon size={16} className="text-brand-primary" />}
          {label}
        </label>
        {action}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[1000] mt-1 max-h-48 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <span className="line-clamp-2">{suggestion.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Route Map Component ──────────────────────────────────────────────────────

function RouteMap({ pickup, destination, routeGeometry, currentLocation }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const currentLocationMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
      center: [33.6844, 73.0479], // Islamabad default
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

  // Update route markers when pickup/destination/route changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    if (!pickup || !destination) return;

    const pickupMarker = L.marker([pickup.lat, pickup.lng])
      .addTo(map)
      .bindPopup(`<strong>Pickup</strong><br/>${pickup.label}`);

    const destMarker = L.marker([destination.lat, destination.lng])
      .addTo(map)
      .bindPopup(`<strong>Destination</strong><br/>${destination.label}`);

    layersRef.current.push(pickupMarker, destMarker);

    const bounds = L.latLngBounds([
      [pickup.lat, pickup.lng],
      [destination.lat, destination.lng]
    ]);

    if (routeGeometry?.coordinates) {
      const latlngs = routeGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const polyline = L.polyline(latlngs, {
        color: '#1C382A',
        weight: 4,
        opacity: 0.8
      }).addTo(map);
      layersRef.current.push(polyline);
      bounds.extend(polyline.getBounds());
    }

    map.fitBounds(bounds.pad(0.2), { animate: true });
  }, [pickup, destination, routeGeometry]);

  // Update current location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!currentLocation) {
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
        currentLocationMarkerRef.current = null;
      }
      return;
    }

    const { lat, lng } = currentLocation;

    if (currentLocationMarkerRef.current) {
      // Update existing marker position
      currentLocationMarkerRef.current.setLatLng([lat, lng]);
    } else {
      // Create new marker with distinct styling
      const currentLocationIcon = L.divIcon({
        className: 'current-location-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background-color: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0,0,0,0.2);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      currentLocationMarkerRef.current = L.marker([lat, lng], {
        icon: currentLocationIcon,
        zIndexOffset: 1000
      })
        .addTo(map)
        .bindPopup('<strong>Your Location</strong>');
    }
  }, [currentLocation]);

  return (
    <div
      ref={mapContainerRef}
      className="h-[300px] w-full overflow-hidden rounded-2xl border border-gray-200 sm:h-[360px]"
    />
  );
}

// ── Tracking Status Component ────────────────────────────────────────────────

function TrackingStatusIndicator({ status, error, lastUpdate }) {
  const config = TRACKING_STATUS[status] || TRACKING_STATUS.idle;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className={`flex items-center gap-2 ${config.color}`}>
        {status === 'tracking' && <Loader2 size={16} className="animate-spin" />}
        {status !== 'tracking' && <StatusIcon size={16} />}
        <span className="text-sm font-semibold">{config.label}</span>
      </div>
      {lastUpdate && status === 'tracking' && (
        <span className="text-xs text-gray-500">
          Updated {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}

// ── Swipe Threshold ──────────────────────────────────────────────────────────

const SWIPE_THRESHOLD_PX = 48;

// ── Journey Card Component ───────────────────────────────────────────────────

function JourneyCard({ journey, onStart, onComplete, onCancel, onDelete, loading, isTracking, isDeleting }) {
  const statusConfig = STATUS_CONFIG[journey.status] || STATUS_CONFIG.planned;
  const StatusIcon = statusConfig.icon;

  // Determine if this journey can be deleted (completed or cancelled only)
  const canDelete = journey.status === 'completed' || journey.status === 'cancelled';

  // Swipe state (matches CallHistoryItem pattern from CallsPage)
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
        className={`relative z-10 rounded-2xl border bg-white p-5 shadow-sm ${
          isTracking ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
        } ${canDelete ? 'touch-pan-y cursor-pointer transition duration-150 ease-in-out hover:bg-gray-50' : ''} ${
          canDelete && actionOpen ? '-translate-x-24' : 'translate-x-0'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.color}`}>
                <StatusIcon size={12} />
                {statusConfig.label}
              </span>
              {isTracking && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Wifi size={10} />
                  Tracking
                </span>
              )}
              <span className="text-xs text-gray-500">{formatDate(journey.createdAt)}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                <span className="text-gray-700 line-clamp-1">{journey.pickup?.address}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                <span className="text-gray-700 line-clamp-1">{journey.destination?.address}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              {journey.route?.distanceMeters > 0 && (
                <span className="flex items-center gap-1">
                  <Route size={12} />
                  {formatDistance(journey.route.distanceMeters)}
                </span>
              )}
              {journey.route?.estimatedDurationSeconds > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatDuration(journey.route.estimatedDurationSeconds)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {journey.status === 'planned' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onStart(journey._id)}
                disabled={loading}
              >
                <Play size={14} />
                Start
              </Button>
            )}
            {journey.status === 'active' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onComplete(journey._id)}
                  disabled={loading}
                >
                  <CheckCircle size={14} />
                  Complete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(journey._id)}
                  disabled={loading}
                >
                  <XCircle size={14} />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

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

// Helper for async delay (matches caregiver implementation)
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function TravelAssistance() {
  const navigate = useNavigate();
  const dialog = useDialog();

  // Route planning state
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [caregiverConsent, setCaregiverConsent] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  // Journey state
  const [journeys, setJourneys] = useState([]);
  const [journeysLoading, setJourneysLoading] = useState(true);
  const [journeyActionLoading, setJourneyActionLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('plan');

  // Pickup location (Use Current Location) state
  const [pickupLocationLoading, setPickupLocationLoading] = useState(false);
  const [pickupLocationError, setPickupLocationError] = useState('');

  // GPS tracking state
  const [activeJourneyId, setActiveJourneyId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState('idle');
  const [trackingError, setTrackingError] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const watcherIdRef = useRef(null);
  const isUpdatingRef = useRef(false);

  // Deletion state (matches caregiver implementation)
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [clearingHistory, setClearingHistory] = useState(false);

  // Load journeys on mount
  const loadJourneys = useCallback(async () => {
    try {
      setJourneysLoading(true);
      const data = await listJourneys({ limit: 10 });
      setJourneys(data.journeys || []);
    } catch {
      setJourneys([]);
    } finally {
      setJourneysLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJourneys();
  }, [loadJourneys]);

  // Detect active journey and manage GPS tracking
  useEffect(() => {
    const activeJourney = journeys.find((j) => j.status === 'active');

    if (!activeJourney) {
      // No active journey - stop tracking if running
      if (watcherIdRef.current !== null) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }
      setActiveJourneyId(null);
      setCurrentLocation(null);
      setTrackingStatus('idle');
      setTrackingError(null);
      return;
    }

    // Active journey exists - start tracking if not already tracking this journey
    if (activeJourney._id === activeJourneyId && watcherIdRef.current !== null) {
      // Already tracking this journey
      return;
    }

    // Clear any existing watcher
    if (watcherIdRef.current !== null) {
      navigator.geolocation.clearWatch(watcherIdRef.current);
      watcherIdRef.current = null;
    }

    setActiveJourneyId(activeJourney._id);
    setTrackingStatus('tracking');
    setTrackingError(null);

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setTrackingStatus('error');
      setTrackingError('Geolocation is not supported by your browser');
      return;
    }

    // Start watching position
    watcherIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLocation = { lat: latitude, lng: longitude, accuracy };
        setCurrentLocation(newLocation);
        setTrackingStatus('tracking');
        setTrackingError(null);

        // Send location update to backend (prevent overlapping requests)
        if (!isUpdatingRef.current) {
          isUpdatingRef.current = true;
          // Backend expects [longitude, latitude] (GeoJSON format)
          updateJourneyLocation(activeJourney._id, [longitude, latitude])
            .then(() => {
              setLastLocationUpdate(Date.now());
            })
            .catch((err) => {
              console.error('Location update failed:', err);
              // Don't change tracking status for transient API errors
              // The GPS is still working, just the API call failed
            })
            .finally(() => {
              isUpdatingRef.current = false;
            });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unknown location error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setTrackingStatus('error');
        setTrackingError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Accept cached positions up to 5 seconds old
        timeout: 15000 // Timeout after 15 seconds
      }
    );

    // Cleanup function
    return () => {
      if (watcherIdRef.current !== null) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
        watcherIdRef.current = null;
      }
    };
  }, [journeys, activeJourneyId]);

  // Fetch route when both pickup and destination are set
  useEffect(() => {
    if (!pickup || !destination) {
      setRouteData(null);
      return;
    }

    const loadRoute = async () => {
      setRouteLoading(true);
      setRouteError('');
      const route = await fetchRoute(pickup, destination);
      if (route) {
        setRouteData(route);
      } else {
        setRouteError('Could not calculate route. Please try different addresses.');
        setRouteData(null);
      }
      setRouteLoading(false);
    };

    loadRoute();
  }, [pickup, destination]);

  // Create journey handler
  const handleCreateJourney = async () => {
    if (!pickup || !destination || !routeData) return;

    try {
      setCreateLoading(true);
      await createJourney({
        pickup: {
          address: pickup.label,
          coordinates: [pickup.lng, pickup.lat]
        },
        destination: {
          address: destination.label,
          coordinates: [destination.lng, destination.lat]
        },
        route: {
          geometry: routeData.geometry,
          distanceMeters: routeData.distanceMeters,
          estimatedDurationSeconds: routeData.estimatedDurationSeconds
        },
        caregiverLocationConsent: caregiverConsent
      });

      // Reset form and reload journeys
      setPickup(null);
      setDestination(null);
      setRouteData(null);
      setCaregiverConsent(false);
      setActiveTab('history');
      loadJourneys();
    } catch (err) {
      setRouteError(err.response?.data?.msg || 'Failed to create journey');
    } finally {
      setCreateLoading(false);
    }
  };

  // Journey action handlers
  const handleStart = async (journeyId) => {
    try {
      setJourneyActionLoading(true);
      // Get initial location if available
      let initialLocation = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000
            });
          });
          initialLocation = [position.coords.longitude, position.coords.latitude];
        } catch {
          // Continue without initial location
        }
      }
      await startJourney(journeyId, initialLocation);
      await loadJourneys();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to start journey');
    } finally {
      setJourneyActionLoading(false);
    }
  };

  const handleComplete = async (journeyId) => {
    try {
      setJourneyActionLoading(true);
      await completeJourney(journeyId);
      await loadJourneys();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to complete journey');
    } finally {
      setJourneyActionLoading(false);
    }
  };

  const handleCancel = async (journeyId) => {
    if (!confirm('Are you sure you want to cancel this journey?')) return;
    try {
      setJourneyActionLoading(true);
      await cancelJourney(journeyId);
      await loadJourneys();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to cancel journey');
    } finally {
      setJourneyActionLoading(false);
    }
  };

  // Use Current Location for pickup field (same pattern as TaskRequests)
  const useCurrentPickupLocation = async () => {
    setPickupLocationLoading(true);
    setPickupLocationError('');

    try {
      const position = await getBrowserLocation();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const address = await reverseGeocode({ lat, lng });

      if (address) {
        setPickup({ label: address, lat, lng });
      } else {
        setPickupLocationError('Could not resolve current address. Please enter it manually.');
      }
    } catch (err) {
      if (err.code === 1) {
        setPickupLocationError('Location permission was denied. Please allow location access and try again.');
      } else {
        setPickupLocationError('Current location is not available. Please enter the address manually.');
      }
    } finally {
      setPickupLocationLoading(false);
    }
  };

  // Handle delete single journey (matches caregiver implementation)
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
        setJourneys((prev) => prev.filter((j) => j._id !== journeyId));
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

  // Handle clear all history (matches caregiver implementation)
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
      // Remove completed and cancelled journeys from local state
      setJourneys((prev) => prev.filter((j) => j.status !== 'completed' && j.status !== 'cancelled'));
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

  const canCreate = pickup && destination && routeData && !routeLoading && !createLoading;

  // Check if there are any deletable journeys (completed or cancelled)
  const hasDeletableJourneys = journeys.some((j) => j.status === 'completed' || j.status === 'cancelled');

  // Find active journey for map display
  const activeJourney = useMemo(
    () => journeys.find((j) => j.status === 'active'),
    [journeys]
  );

  // Determine map props based on active journey or planned route
  const mapPickup = activeJourney
    ? { lat: activeJourney.pickup?.coordinates?.coordinates?.[1], lng: activeJourney.pickup?.coordinates?.coordinates?.[0], label: activeJourney.pickup?.address }
    : pickup;
  const mapDestination = activeJourney
    ? { lat: activeJourney.destination?.coordinates?.coordinates?.[1], lng: activeJourney.destination?.coordinates?.coordinates?.[0], label: activeJourney.destination?.address }
    : destination;
  const mapRouteGeometry = activeJourney?.route?.geometry || routeData?.geometry;

  return (
    <FeaturePage
      title="Travel Assistance"
      description="Plan routes, get turn-by-turn guidance, and share your journey with caregivers."
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
    >
      {/* Active Journey Tracking Banner */}
      {activeJourney && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Navigation size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Journey in Progress</h3>
                <p className="text-sm text-green-700">
                  GPS tracking is {trackingStatus === 'tracking' ? 'active' : trackingStatus}
                </p>
              </div>
            </div>
            <TrackingStatusIndicator
              status={trackingStatus}
              error={trackingError}
              lastUpdate={lastLocationUpdate}
            />
          </div>
          {currentLocation && (
            <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
              <MapPin size={12} />
              <span>
                Current: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                {currentLocation.accuracy && ` (±${Math.round(currentLocation.accuracy)}m)`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'plan'
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Navigation size={16} className="mr-2 inline" />
          Plan Route
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar size={16} className="mr-2 inline" />
          Journey History
        </button>
      </div>

      {/* Plan Route Tab */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          {/* Route Guidance Section */}
          <section className="motion-card rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Route size={20} className="text-brand-primary" />
              Route Guidance
            </h2>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Address Inputs */}
              <div className="space-y-4">
                <div>
                  <AddressInput
                    label="Pickup Location"
                    value={pickup}
                    onChange={setPickup}
                    placeholder="Enter pickup address..."
                    icon={MapPin}
                    action={
                      <button
                        type="button"
                        onClick={useCurrentPickupLocation}
                        disabled={pickupLocationLoading}
                        className="text-sm font-semibold text-brand-primary hover:underline disabled:opacity-50"
                      >
                        {pickupLocationLoading ? 'Getting location...' : 'Use Current Location'}
                      </button>
                    }
                  />
                  {pickupLocationError && (
                    <p className="mt-1.5 text-sm text-red-600">{pickupLocationError}</p>
                  )}
                </div>
                <AddressInput
                  label="Destination"
                  value={destination}
                  onChange={setDestination}
                  placeholder="Enter destination address..."
                  icon={MapPin}
                />

                {/* Route Info */}
                {routeData && (
                  <div className="rounded-xl bg-brand-card/30 p-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Route size={16} className="text-brand-primary" />
                        <span className="font-semibold text-gray-900">
                          {formatDistance(routeData.distanceMeters)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-brand-primary" />
                        <span className="font-semibold text-gray-900">
                          {formatDuration(routeData.estimatedDurationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {routeLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                    Calculating route...
                  </div>
                )}

                {routeError && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    {routeError}
                  </div>
                )}

                {/* Caregiver Consent */}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
                  <input
                    type="checkbox"
                    checked={caregiverConsent}
                    onChange={(e) => setCaregiverConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Share live location with caregiver</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Your linked caregiver will be able to track your location during this journey.
                    </p>
                  </div>
                </label>

                {/* Create Button */}
                <Button
                  variant="primary"
                  onClick={handleCreateJourney}
                  disabled={!canCreate}
                  className="w-full"
                >
                  {createLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating Journey...
                    </>
                  ) : (
                    <>
                      <Navigation size={16} />
                      Create Journey
                    </>
                  )}
                </Button>
              </div>

              {/* Map */}
              <RouteMap
                pickup={mapPickup}
                destination={mapDestination}
                routeGeometry={mapRouteGeometry}
                currentLocation={activeJourney ? currentLocation : null}
              />
            </div>
          </section>
        </div>
      )}

      {/* Journey History Tab */}
      {activeTab === 'history' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Calendar size={20} className="text-brand-primary" />
              Your Journeys
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              disabled={clearingHistory || !hasDeletableJourneys}
              className="text-red-600 hover:bg-red-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {clearingHistory ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={14} />
              )}
              Clear All
            </Button>
          </div>

          {journeysLoading ? (
            <LoadingState message="Loading journeys..." />
          ) : journeys.length === 0 ? (
            <EmptyState
              title="No journeys yet"
              description="Plan your first route to get started."
            >
              <Button variant="primary" onClick={() => setActiveTab('plan')}>
                <Navigation size={16} />
                Plan a Route
              </Button>
            </EmptyState>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 sm:hidden">
                Tip: Swipe left on completed/cancelled journeys to remove them
              </p>
              {journeys.map((journey) => (
                <JourneyCard
                  key={journey._id}
                  journey={journey}
                  onStart={handleStart}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                  onDelete={handleDeleteJourney}
                  loading={journeyActionLoading}
                  isTracking={journey._id === activeJourneyId}
                  isDeleting={deletingIds.has(journey._id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </FeaturePage>
  );
}