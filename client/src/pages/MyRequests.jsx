import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, CheckCircle, XCircle, Loader, Eye } from 'lucide-react';
import { markNotificationAsConsumed } from '../features/communication/notifications/notificationConsumption';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FeatureCard from '../components/ui/FeatureCard';
import FeaturePage from '../components/ui/FeaturePage';
import LoadingState from '../components/ui/LoadingState';

export default function MyRequests() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isCaregiver = currentUser?.role === 'caregiver';

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/tasks/my-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTasks(response.data.tasks);
        response.data.tasks.forEach((task) => {
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
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={16} /> };
      case 'accepted': return { label: 'Accepted', color: 'bg-blue-100 text-blue-700', icon: <Eye size={16} /> };
      case 'in_progress': return { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: <Loader size={16} /> };
      case 'completed': return { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={16} /> };
      case 'cancelled': return { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle size={16} /> };
      default: return { label: status, color: 'bg-gray-100 text-gray-700', icon: null };
    }
  };

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'emergency': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <LoadingState label="Loading requests..." />;
  }

  return (
    <FeaturePage
      title="My Help Requests"
      description={isCaregiver ? 'View senior-related requests and support activity.' : 'Track the status of requests you have submitted.'}
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
      maxWidth="max-w-3xl"
      actions={isCaregiver ? null : <Button onClick={() => navigate('/request-help')}>New Request</Button>}
    >

        {tasks.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description={isCaregiver ? 'No senior requests are available yet.' : 'Create a new request to get help.'}
          />
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <FeatureCard key={task._id} className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-brand-primary">{task.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="text-gray-700 text-sm mb-3">{task.description}</p>
                <div className="flex justify-between items-center">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusBadge(task.status).color}`}>
                    {getStatusBadge(task.status).icon}
                    {getStatusBadge(task.status).label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {task.volunteerId && (
                  <div className="mt-3 pt-3 border-t text-sm text-gray-700">
                    👤 Volunteer: {task.volunteerId.name}
                  </div>
                )}
              </FeatureCard>
            ))}
          </div>
        )}
    </FeaturePage>
  );
}