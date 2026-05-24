import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, LogIn, UserPlus, Phone, FileText, ArrowLeft, Loader } from 'lucide-react';

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
      default: return <Activity size={20} className="text-gray-600" />;
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
      case 'document_uploaded': return `Uploaded: ${activity.details}`;
      case 'document_deleted': return `Deleted a document`;
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-blue-600 mb-6 hover:underline"
        >
          <ArrowLeft size={24} /> Back to Profile
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <Activity size={28} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Activity Logs</h1>
              <p className="text-gray-500">Your recent activities and actions</p>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No activities recorded yet</p>
              <p className="text-sm text-gray-400">Your actions will appear here as you use the app</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800">{getActivityText(activity)}</p>
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
        </div>
      </div>
    </div>
  );
}