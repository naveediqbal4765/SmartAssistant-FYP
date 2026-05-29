import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MessageCircle, RefreshCw, UserRound, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveConversation } from '../communication/chat/services/chatApi';

const seniorIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:9999px;background:#047857;border:4px solid white;box-shadow:0 8px 20px rgba(4,120,87,.35);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const volunteerIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 8px 16px rgba(37,99,235,.3);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const hasCoordinates = (location) => (
  Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng))
);

const flattenVolunteers = (within5km, within10km) => [
  ...within5km.map((volunteer) => ({ ...volunteer, zone: 'priority' })),
  ...within10km.map((volunteer) => ({ ...volunteer, zone: 'fallback' }))
].filter((volunteer) => hasCoordinates(volunteer.location));

const VolunteerGroup = ({ title, badge, volunteers, emptyText }) => (
  <div className="rounded-xl border border-gray-200 bg-white/80 p-4">
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-semibold text-gray-900">{title}</p>
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
        {badge}
      </span>
    </div>
    <div className="mt-3 space-y-3">
      {volunteers.length === 0 ? (
        <p className="text-sm text-gray-700">{emptyText}</p>
      ) : (
        volunteers.map((volunteer) => (
          <div key={volunteer._id} className="rounded-lg bg-blue-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{volunteer.name}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">{volunteer.role}</p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                {volunteer.distance?.km ?? '--'} km
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

function NearbyVolunteersMap({ origin, volunteers, selectedVolunteer, onSelectVolunteer }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current || !hasCoordinates(origin)) return undefined;

    const map = L.map(mapContainerRef.current, {
      center: [origin.lat, origin.lng],
      zoom: 12,
      scrollWheelZoom: true,
      touchZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      layersRef.current.forEach((layer) => layer.remove());
      layersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [origin?.lat, origin?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoordinates(origin)) return;

    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    const outerRadius = L.circle([origin.lat, origin.lng], {
      radius: 10000,
      color: '#38bdf8',
      weight: 1,
      fillColor: '#bae6fd',
      fillOpacity: 0.18
    }).addTo(map);
    const innerRadius = L.circle([origin.lat, origin.lng], {
      radius: 5000,
      color: '#10b981',
      weight: 2,
      fillColor: '#bbf7d0',
      fillOpacity: 0.26
    }).addTo(map);
    const seniorMarker = L.marker([origin.lat, origin.lng], { icon: seniorIcon })
      .addTo(map)
      .bindPopup('<strong>Your location</strong><br/>Emergency routing center');

    layersRef.current.push(outerRadius, innerRadius, seniorMarker);

    volunteers.forEach((volunteer) => {
      const marker = L.marker([volunteer.location.lat, volunteer.location.lng], { icon: volunteerIcon })
        .addTo(map)
        .bindPopup(`<strong>${volunteer.name}</strong><br/>${volunteer.distance?.km ?? '--'} km away`);
      marker.on('click', () => onSelectVolunteer(volunteer));
      layersRef.current.push(marker);
    });

    const bounds = L.latLngBounds([[origin.lat, origin.lng]]);
    volunteers.forEach((volunteer) => {
      bounds.extend([volunteer.location.lat, volunteer.location.lng]);
    });

    map.fitBounds(bounds.pad(0.25), {
      maxZoom: volunteers.length ? 13 : 12,
      animate: true
    });
  }, [origin, onSelectVolunteer, volunteers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVolunteer?.location) return;

    map.panTo([selectedVolunteer.location.lat, selectedVolunteer.location.lng], { animate: true });
  }, [selectedVolunteer]);

  if (!hasCoordinates(origin)) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl bg-blue-50 text-center text-sm font-semibold text-blue-700">
        Update your location to view nearby volunteers on the map.
      </div>
    );
  }

  return <div ref={mapContainerRef} className="h-[280px] w-full overflow-hidden rounded-2xl border border-blue-100 sm:h-[320px]" />;
}

export default function NearbyVolunteers({ mapView = false }) {
  const navigate = useNavigate();
  const [within5km, setWithin5km] = useState([]);
  const [within10km, setWithin10km] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mappedVolunteers = useMemo(() => flattenVolunteers(within5km, within10km), [within5km, within10km]);

  const loadNearbyVolunteers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.get('http://localhost:5000/api/location/nearby-volunteers', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      setWithin5km(response.data.within5km || []);
      setWithin10km(response.data.within10km || []);
      setOrigin(response.data.origin || null);
      setSelectedVolunteer((current) => {
        const volunteers = flattenVolunteers(response.data.within5km || [], response.data.within10km || []);
        return volunteers.find((volunteer) => String(volunteer._id) === String(current?._id)) || volunteers[0] || null;
      });
      setFallbackUsed(Boolean(response.data.fallbackUsed));
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load nearby volunteers.');
      setWithin5km([]);
      setWithin10km([]);
      setOrigin(null);
      setSelectedVolunteer(null);
      setFallbackUsed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNearbyVolunteers();
  }, [loadNearbyVolunteers]);

  const openVolunteerProfile = () => {
    if (selectedVolunteer?._id) {
      navigate(`/volunteers/${selectedVolunteer._id}`);
    }
  };

  const messageVolunteer = async () => {
    if (!selectedVolunteer?._id) return;

    try {
      const conversation = await resolveConversation({ toUserId: selectedVolunteer._id });
      navigate(`/chat/${conversation._id || conversation.id}`);
    } catch (err) {
      setError(err.response?.data?.msg || 'Could not open chat with this volunteer.');
    }
  };

  return (
    <div className="motion-card rounded-2xl border border-blue-200 bg-white/90 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Nearby Volunteer Routing</h3>
            <p className="mt-1 text-sm text-gray-700">
              Volunteers are grouped by the same 0-5 km priority zone and 5-10 km fallback zone used by backend routing.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadNearbyVolunteers}
          disabled={loading}
          className="self-start flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-700">
          {error}
        </div>
      )}

      {!error && fallbackUsed && (
        <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
          No volunteers were found in the priority zone. Expanding search radius to the 5-10 km fallback zone.
        </div>
      )}

      {mapView ? (
        <div className="mt-5 space-y-4">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center rounded-2xl bg-white/70 text-sm font-semibold text-blue-700">
                Loading nearby map...
              </div>
            )}
            <NearbyVolunteersMap
              origin={origin}
              volunteers={mappedVolunteers}
              selectedVolunteer={selectedVolunteer}
              onSelectVolunteer={setSelectedVolunteer}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">0-5 km priority</span>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">5-10 km fallback</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{mappedVolunteers.length} nearby volunteers mapped</span>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              {selectedVolunteer ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Selected Volunteer</p>
                  <h4 className="mt-1 text-lg font-bold text-gray-900">{selectedVolunteer.name}</h4>
                  <p className="mt-1 text-sm text-gray-700">
                    {selectedVolunteer.distance?.km ?? '--'} km away in the {selectedVolunteer.zone === 'priority' ? 'priority' : 'fallback'} zone.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={messageVolunteer}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      <MessageCircle size={16} />
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={openVolunteerProfile}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
                    >
                      <UserRound size={16} />
                      Profile
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-blue-700">Select a volunteer marker to view quick actions.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <VolunteerGroup
            title="0-5 km"
            badge="Priority zone"
            volunteers={within5km}
            emptyText={loading ? 'Loading volunteers...' : 'No volunteers found within 5 km.'}
          />
          <VolunteerGroup
            title="5-10 km"
            badge="Fallback zone"
            volunteers={within10km}
            emptyText={loading ? 'Loading volunteers...' : 'No volunteers found between 5 and 10 km.'}
          />
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        Caregivers are always included in emergency routing separately and are not distance-filtered.
      </p>
    </div>
  );
}
