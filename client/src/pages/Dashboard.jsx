import { LogOut, User, Bell, Heart, Phone, Clipboard, Activity, Users, Award, Calendar, MessageCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SOSButton from '../components/SOSButton';
import CallReminderPanel from '../components/CallReminderPanel';

export default function Dashboard({ role, onLogout }) {
  const navigate = useNavigate();

  // Get dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get role display name
  const getRoleDisplay = () => {
    if (role === 'elder') return 'Dear Senior';
    if (role === 'volunteer') return 'Volunteer';
    return 'Caregiver';
  };

  // ========== ELDER DASHBOARD ==========
  if (role === 'elder') {
    const elderActions = [
      { title: "Request Help", icon: <Heart size={32} />, color: "bg-gradient-to-r from-green-500 to-green-700", action: () => navigate('/request-help') },
      { title: "My Profile", icon: <User size={32} />, color: "bg-gradient-to-r from-blue-500 to-blue-700", action: () => navigate('/profile') },
      { title: "My Requests", icon: <Clipboard size={32} />, color: "bg-gradient-to-r from-purple-500 to-purple-700", action: () => navigate('/my-requests') },
      { title: "Medications", icon: <Bell size={32} />, color: "bg-gradient-to-r from-orange-500 to-orange-700", action: () => navigate('/health/medications') },
      { title: "Emergency SOS", icon: <Phone size={32} />, color: "bg-gradient-to-r from-red-500 to-red-700", action: () => alert("Emergency SOS - Coming Soon") },
      { title: "Digital Health Vault", icon: <FileText size={32} />, color: "bg-gradient-to-r from-indigo-500 to-indigo-700", action: () => navigate('/health/vault') },
      { title: "Chat", icon: <MessageCircle size={32} />, color: "bg-gradient-to-r from-emerald-500 to-emerald-700", action: () => navigate('/chat') },
      { title: "Groups", icon: <Users size={32} />, color: "bg-gradient-to-r from-cyan-500 to-cyan-700", action: () => navigate('/groups') },
      { title: "Appointments", icon: <Calendar size={32} />, color: "bg-gradient-to-r from-teal-500 to-teal-700", action: () => navigate('/health/appointments') },
      { title: "Health Telemetry", icon: <Activity size={32} />, color: "bg-gradient-to-r from-lime-500 to-lime-700", action: () => navigate('/health/telemetry') },
      { title: "Drug Interaction Checker", icon: <Heart size={32} />, color: "bg-gradient-to-r from-rose-500 to-rose-700", action: () => navigate('/health/interactions') }
    ];

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#A9C6B2' }}>
        <SOSButton />
        <nav className="w-full shadow-md border-b sticky top-0 z-50" style={{ backgroundColor: '#1C382A' }}>
          <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Smart Assistant</h1>
              <p className="text-white/80 mt-1">Welcome back, {getRoleDisplay()}</p>
            </div>
            <button onClick={onLogout} className="flex items-center gap-3 px-6 py-3 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-2xl transition-all duration-200 font-medium">
              <LogOut size={22} /> Logout
            </button>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-2">{getGreeting()}! 👋</h2>
            <p className="text-xl text-gray-700">How can we help you today?</p>
          </div>

          <CallReminderPanel />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {elderActions.map((action, index) => (
              <button key={index} onClick={action.action} className={`${action.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center h-48 p-6`}>
                <div className="mb-5 text-white">{action.icon}</div>
                <span className="text-xl font-bold text-white text-center">{action.title}</span>
              </button>
            ))}
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🛡️</span>
              <h3 className="text-2xl font-bold text-gray-800">Your Personal Safety Assistant</h3>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">You can request help, set medication reminders, detect falls, and stay connected with your family and community volunteers.</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== VOLUNTEER DASHBOARD ==========
  if (role === 'volunteer') {
    const volunteerActions = [
      { title: "Available Tasks", icon: <Activity size={32} />, color: "bg-gradient-to-r from-green-500 to-green-700", action: () => alert("Available Tasks - Coming Soon") },
      { title: "My Tasks", icon: <Clipboard size={32} />, color: "bg-gradient-to-r from-blue-500 to-blue-700", action: () => alert("My Tasks - Coming Soon") },
      { title: "My Profile", icon: <User size={32} />, color: "bg-gradient-to-r from-purple-500 to-purple-700", action: () => navigate('/profile') },
      { title: "My Rewards", icon: <Award size={32} />, color: "bg-gradient-to-r from-yellow-500 to-yellow-700", action: () => alert("My Rewards - Coming Soon") },
      { title: "Help Seniors", icon: <Users size={32} />, color: "bg-gradient-to-r from-indigo-500 to-indigo-700", action: () => alert("Help Seniors - Coming Soon") },
      { title: "Impact Stats", icon: <Activity size={32} />, color: "bg-gradient-to-r from-teal-500 to-teal-700", action: () => alert("Impact Stats - Coming Soon") },
      { title: "Chat", icon: <MessageCircle size={32} />, color: "bg-gradient-to-r from-emerald-500 to-emerald-700", action: () => navigate('/chat') },
      { title: "Groups", icon: <Users size={32} />, color: "bg-gradient-to-r from-cyan-500 to-cyan-700", action: () => navigate('/groups') }
    ];

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#A9C6B2' }}>
        <nav className="w-full shadow-md border-b sticky top-0 z-50" style={{ backgroundColor: '#1C382A' }}>
          <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Smart Assistant - Volunteer Portal</h1>
              <p className="text-white/80 mt-1">Welcome back, {getRoleDisplay()}</p>
            </div>
            <button onClick={onLogout} className="flex items-center gap-3 px-6 py-3 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-2xl transition-all duration-200 font-medium">
              <LogOut size={22} /> Logout
            </button>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-2">{getGreeting()}! 👋</h2>
            <p className="text-xl text-gray-700">Ready to make a difference today?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {volunteerActions.map((action, index) => (
              <button key={index} onClick={action.action} className={`${action.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center h-48 p-6`}>
                <div className="mb-5 text-white">{action.icon}</div>
                <span className="text-xl font-bold text-white text-center">{action.title}</span>
              </button>
            ))}
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🤝</span>
              <h3 className="text-2xl font-bold text-gray-800">Thank you for being a Volunteer! ❤️</h3>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">You can view nearby help requests, earn rewards for helping seniors, and make a real difference in someone's life.</p>
          </div>
        </div>
      </div>
    );
  }

  // ========== CAREGIVER DASHBOARD ==========
  if (role === 'caregiver') {
    const caregiverActions = [
      { title: "My Seniors", icon: <Users size={32} />, color: "bg-gradient-to-r from-purple-500 to-purple-700", action: () => alert("My Seniors - Coming Soon") },
      { title: "Medications (View)", icon: <Bell size={32} />, color: "bg-gradient-to-r from-blue-500 to-blue-700", action: () => navigate('/health/medications') },
      { title: "Digital Health Vault (View)", icon: <FileText size={32} />, color: "bg-gradient-to-r from-teal-500 to-teal-700", action: () => navigate('/health/vault') },
      { title: "My Profile", icon: <User size={32} />, color: "bg-gradient-to-r from-indigo-500 to-indigo-700", action: () => navigate('/profile') },
      { title: "Emergency Alerts", icon: <Bell size={32} />, color: "bg-gradient-to-r from-red-500 to-red-700", action: () => alert("Emergency Alerts - Coming Soon") },
      { title: "Care Notes", icon: <FileText size={32} />, color: "bg-gradient-to-r from-orange-500 to-orange-700", action: () => alert("Care Notes - Coming Soon") },
      { title: "Chat", icon: <MessageCircle size={32} />, color: "bg-gradient-to-r from-emerald-500 to-emerald-700", action: () => navigate('/chat') },
      { title: "Groups", icon: <Users size={32} />, color: "bg-gradient-to-r from-cyan-500 to-cyan-700", action: () => navigate('/groups') },
      { title: "Appointments (View)", icon: <Calendar size={32} />, color: "bg-gradient-to-r from-purple-500 to-purple-700", action: () => navigate('/health/appointments') }
    ];

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#A9C6B2' }}>
        <nav className="w-full shadow-md border-b sticky top-0 z-50" style={{ backgroundColor: '#1C382A' }}>
          <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Smart Assistant - Caregiver Portal</h1>
              <p className="text-white/80 mt-1">Welcome back, {getRoleDisplay()}</p>
            </div>
            <button onClick={onLogout} className="flex items-center gap-3 px-6 py-3 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-2xl transition-all duration-200 font-medium">
              <LogOut size={22} /> Logout
            </button>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-2">{getGreeting()}! 👋</h2>
            <p className="text-xl text-gray-700">Monitor and care for your loved ones</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {caregiverActions.map((action, index) => (
              <button key={index} onClick={action.action} className={`${action.color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center h-48 p-6`}>
                <div className="mb-5 text-white">{action.icon}</div>
                <span className="text-xl font-bold text-white text-center">{action.title}</span>
              </button>
            ))}
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🏥</span>
              <h3 className="text-2xl font-bold text-gray-800">Caregiver Dashboard</h3>
            </div>
            <p className="text-gray-700 text-lg leading-relaxed">Monitor your loved one's health, location, and get instant alerts in case of emergency.</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (should not happen)
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#A9C6B2' }}>
      <div className="text-xl">Loading dashboard...</div>
    </div>
  );
}