import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader, Eye } from 'lucide-react';

export default function MyRequests() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            <ArrowLeft size={24} /> Back
          </button>
          <button
            onClick={() => navigate('/request-help')}
            className="bg-green-600 text-white px-4 py-2 rounded-xl"
          >
            + New Request
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Help Requests</h1>

        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Clock size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No requests yet</p>
            <p className="text-gray-400">Click "New Request" to get help</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task._id} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-gray-800">{task.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{task.description}</p>
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
                  <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                    👤 Volunteer: {task.volunteerId.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}