import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CheckCircle, HeartHandshake, RadioTower, Route } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import FeaturePage from '../components/ui/FeaturePage';

const formatDate = (value) => {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
};

export default function VolunteerProfileView() {
  const navigate = useNavigate();
  const { volunteerId } = useParams();
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadVolunteer = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get(`http://localhost:5000/api/user/volunteers/${volunteerId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
        });
        if (!cancelled) setVolunteer(response.data.volunteer || null);
      } catch (err) {
        if (!cancelled) {
          setVolunteer(null);
          setError(err.response?.data?.msg || 'Profile not available');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadVolunteer();
    return () => {
      cancelled = true;
    };
  }, [volunteerId]);

  const stats = useMemo(() => ([
    {
      label: 'Distance',
      value: volunteer?.distance?.km !== undefined ? `${volunteer.distance.km} km` : 'Not available',
      icon: Route,
      tone: 'text-blue-700 bg-blue-50'
    },
    {
      label: 'Availability',
      value: volunteer?.availabilityStatus === 'active' ? 'Active' : 'Inactive',
      icon: RadioTower,
      tone: volunteer?.availabilityStatus === 'active' ? 'text-green-700 bg-green-50' : 'text-gray-700 bg-gray-50'
    },
    {
      label: 'Tasks Completed',
      value: volunteer?.tasksCompletedCount ?? 0,
      icon: CheckCircle,
      tone: 'text-emerald-700 bg-emerald-50'
    },
    {
      label: 'Seniors Helped',
      value: volunteer?.seniorsHelpedCount ?? 0,
      icon: HeartHandshake,
      tone: 'text-rose-700 bg-rose-50'
    },
    {
      label: 'Member Since',
      value: formatDate(volunteer?.joinedAt),
      icon: CalendarDays,
      tone: 'text-indigo-700 bg-indigo-50'
    }
  ]), [volunteer]);

  return (
    <FeaturePage
      title="Volunteer Profile"
      description="Public volunteer details available from the nearby volunteers map."
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <div className="motion-card rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">
          Loading volunteer profile...
        </div>
      ) : error || !volunteer ? (
        <div className="motion-card rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-800">
          Profile not available
        </div>
      ) : (
        <div className="motion-card rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {volunteer.avatar ? (
              <img
                src={volunteer.avatar}
                alt={`${volunteer.name} profile`}
                className="h-24 w-24 rounded-3xl object-cover ring-4 ring-blue-50"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-100 text-3xl font-bold text-blue-700">
                {getInitials(volunteer.name)}
              </div>
            )}

            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Nearby Volunteer</p>
              <h2 className="mt-1 text-3xl font-bold text-gray-900">{volunteer.name}</h2>
              <p className="mt-2 text-gray-700">
                Read-only public profile. Private contact and location details are hidden.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stats.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className={`rounded-2xl p-4 ${tone}`}>
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <p className="text-sm font-bold uppercase tracking-wide">{label}</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </FeaturePage>
  );
}
