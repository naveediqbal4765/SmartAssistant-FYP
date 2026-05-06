import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, Mic, MicOff, AlertCircle } from 'lucide-react';

export default function RequestHelp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    scheduledTime: '',
    address: ''
  });

  const categories = [
    { value: 'medical', label: '🏥 Medical', color: 'text-red-600', bg: 'bg-red-100' },
    { value: 'grocery', label: '🛒 Grocery Shopping', color: 'text-green-600', bg: 'bg-green-100' },
    { value: 'transport', label: '🚗 Transport', color: 'text-blue-600', bg: 'bg-blue-100' },
    { value: 'household', label: '🏠 Household', color: 'text-orange-600', bg: 'bg-orange-100' },
    { value: 'companionship', label: '💬 Companionship', color: 'text-purple-600', bg: 'bg-purple-100' },
    { value: 'emergency', label: '🚨 Emergency', color: 'text-red-700', bg: 'bg-red-200' },
    { value: 'other', label: '📝 Other', color: 'text-gray-600', bg: 'bg-gray-100' }
  ];

  const priorities = [
    { value: 'low', label: '🟢 Low - Can wait', color: 'text-green-600' },
    { value: 'medium', label: '🟡 Medium - Today', color: 'text-yellow-600' },
    { value: 'high', label: '🟠 High - Within hours', color: 'text-orange-600' },
    { value: 'emergency', label: '🔴 Emergency - Immediate', color: 'text-red-600' }
  ];

  // Voice recognition
  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setFormData({ ...formData, description: formData.description + ' ' + transcript });
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setError('Voice recognition failed. Please type your request.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      setError('Voice recognition is not supported in your browser');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.title || !formData.description) {
      setError('Please enter title and description');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/tasks/request', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSuccess('✅ Help request submitted! A volunteer will contact you soon.');
        setFormData({
          title: '',
          description: '',
          category: 'other',
          priority: 'medium',
          scheduledTime: '',
          address: ''
        });
        setTimeout(() => {
          navigate('/my-requests');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const p = priorities.find(p => p.value === priority);
    return p ? p.color : 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-600 mb-6 hover:underline"
        >
          <ArrowLeft size={24} /> Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send size={36} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Request Help</h1>
            <p className="text-gray-500 mt-1">Describe what you need assistance with</p>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-center">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Help Title *</label>
              <input
                type="text"
                placeholder="e.g., Need help with groceries"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            {/* Description with Voice Input */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Description *</label>
              <div className="relative">
                <textarea
                  placeholder="Describe your need in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={startVoiceInput}
                  className={`absolute right-3 bottom-3 p-2 rounded-full transition ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600'
                  }`}
                  title="Voice input"
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
              {isListening && (
                <p className="text-sm text-red-500 mt-1">🎤 Listening... Speak now</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({...formData, category: cat.value})}
                    className={`p-3 rounded-xl text-left transition ${
                      formData.category === cat.value 
                        ? `${cat.bg} border-2 border-green-500` 
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className={cat.color}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Priority Level</label>
              <div className="grid grid-cols-2 gap-2">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({...formData, priority: p.value})}
                    className={`p-3 rounded-xl text-left transition ${
                      formData.priority === p.value 
                        ? 'bg-yellow-50 border-2 border-yellow-500' 
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className={p.color}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Schedule (Optional)</label>
              <input
                type="datetime-local"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Your Location</label>
              <input
                type="text"
                placeholder="Your address or pickup location"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Emergency Note */}
            {formData.priority === 'emergency' && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700">Emergency Request</p>
                  <p className="text-sm text-red-600">
                    This will be marked as urgent. Volunteers will be notified immediately.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                'Submitting...'
              ) : (
                <>
                  <Send size={20} />
                  Submit Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help Info */}
        <div className="bg-blue-50 rounded-xl p-4 mt-6">
          <p className="text-sm text-blue-700 text-center">
            💡 Your request will be shared with verified volunteers in your area.
            You'll be notified when someone accepts your request.
          </p>
        </div>
      </div>
    </div>
  );
}