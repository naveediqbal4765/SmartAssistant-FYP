import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, LogIn, UserPlus, Phone, FileText } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import FeatureCard from '../components/ui/FeatureCard';
import FeaturePage from '../components/ui/FeaturePage';
import LoadingState from '../components/ui/LoadingState';

export default function ActivityLogs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/user/activities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setActivities(response.data.activities);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action) => {
    switch(action) {
      case 'login': return <LogIn size={20} className="text-green-600" />;
      case 'profile_view': return <UserPlus size={20} className="text-blue-600" />;
      case 'profile_update': return <UserPlus size={20} className="text-blue-600" />;
      case 'contact_added': return <Phone size={20} className="text-purple-600" />;
      case 'contact_deleted': return <Phone size={20} className="text-red-600" />;
      case 'document_uploaded': return <FileText size={20} className="text-orange-600" />;
      case 'document_deleted': return <FileText size={20} className="text-red-600" />;
      default: return <Activity size={20} className="text-gray-700" />;
    }
  };

  const getActivityText = (activity) => {
    switch(activity.action) {
      case 'login': return 'You logged into your account';
      case 'logout': return 'You logged out';
      case 'profile_view': return 'You viewed your profile';
      case 'profile_update': return 'You updated your profile information';
      case 'contact_added': return `Added emergency contact: ${activity.details}`;
      case 'contact_deleted': return 'Removed an emergency contact';
      case 'document_uploaded': return `Digital Health Vault upload: ${activity.details}`;
      case 'document_deleted': return `Deleted a Digital Health Vault item`;
      case 'privacy_update': return 'Updated your privacy settings';
      default: return activity.details || activity.action;
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (hours < 48) return 'Yesterday';
    return d.toLocaleDateString();
  };

  if (loading) {
    return <LoadingState label="Loading activity logs..." />;
  }

  return (
    <FeaturePage
      title="Activity Logs"
      description="Your recent activities and actions."
      backLabel="Back to Profile"
      onBack={() => navigate('/profile')}
      maxWidth="max-w-3xl"
    >
        <FeatureCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <Activity size={28} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
              <p className="text-gray-500">Your recent activities and actions</p>
            </div>
          </div>

          {activities.length === 0 ? (
            <EmptyState
              title="No activities recorded yet"
              description="Your actions will appear here as you use the app."
            />
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{getActivityText(activity)}</p>
                    <p className="text-sm text-gray-400 mt-1">{formatDate(activity.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-400 text-center">
              Logs show your recent activity. Only you can see your activity history.
            </p>
          </div>
        </FeatureCard>
    </FeaturePage>
  );
}