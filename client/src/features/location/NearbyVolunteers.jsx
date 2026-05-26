import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, Users } from 'lucide-react';

const VolunteerGroup = ({ title, badge, volunteers, emptyText }) => (
  <div className="rounded-xl border border-gray-200 bg-white/80 p-4">
    <div className="flex flex-wrap items-center gap-2">
      <p className="font-semibold text-gray-800">{title}</p>
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
        {badge}
      </span>
    </div>
    <div className="mt-3 space-y-3">
      {volunteers.length === 0 ? (
        <p className="text-sm text-gray-600">{emptyText}</p>
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

export default function NearbyVolunteers() {
  const [within5km, setWithin5km] = useState([]);
  const [within10km, setWithin10km] = useState([]);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setFallbackUsed(Boolean(response.data.fallbackUsed));
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load nearby volunteers.');
      setWithin5km([]);
      setWithin10km([]);
      setFallbackUsed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNearbyVolunteers();
  }, [loadNearbyVolunteers]);

  return (
    <div className="rounded-2xl border border-blue-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Nearby Volunteer Routing</h3>
            <p className="mt-1 text-sm text-gray-600">
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

      <p className="mt-4 text-sm text-gray-500">
        Caregivers are always included in emergency routing separately and are not distance-filtered.
      </p>
    </div>
  );
}
