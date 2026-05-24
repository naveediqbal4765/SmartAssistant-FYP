import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, ArrowLeft, Save, Lock } from 'lucide-react';

function PrivacyToggle({ label, description, field, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800">{label}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(field, !value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function PrivacySettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    showPhone: true,
    showAddress: false,
    showEmail: false,
    showDateOfBirth: false,
    showEmergencyContacts: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPrivacySettings();
  }, []);

  const fetchPrivacySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/user/privacy', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSettings(response.data.settings);
      }
    } catch (err) {
      setError('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:5000/api/user/privacy', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSuccess('✅ Privacy settings saved!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-blue-600 mb-6 hover:underline"
        >
          <ArrowLeft size={24} /> Back to Profile
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield size={28} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Privacy Controls</h1>
              <p className="text-gray-500">Control who can see your information</p>
            </div>
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

          <div className="space-y-2">
            <PrivacyToggle
              label="Phone Number"
              description="Allow volunteers and caregivers to see your phone number"
              field="showPhone"
              value={settings.showPhone}
              onChange={(field, next) => setSettings({ ...settings, [field]: next })}
            />
            
            <PrivacyToggle
              label="Email Address"
              description="Allow others to see your email address"
              field="showEmail"
              value={settings.showEmail}
              onChange={(field, next) => setSettings({ ...settings, [field]: next })}
            />
            
            <PrivacyToggle
              label="Home Address"
              description="Share your address with verified volunteers"
              field="showAddress"
              value={settings.showAddress}
              onChange={(field, next) => setSettings({ ...settings, [field]: next })}
            />
            
            <PrivacyToggle
              label="Date of Birth"
              description="Allow others to see your age and birth date"
              field="showDateOfBirth"
              value={settings.showDateOfBirth}
              onChange={(field, next) => setSettings({ ...settings, [field]: next })}
            />
            
            <PrivacyToggle
              label="Emergency Contacts"
              description="Share your emergency contacts with caregivers"
              field="showEmergencyContacts"
              value={settings.showEmergencyContacts}
              onChange={(field, next) => setSettings({ ...settings, [field]: next })}
            />
          </div>

          <div className="mt-8 pt-4 border-t">
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={18} className="text-blue-600" />
                <span className="font-semibold text-blue-800">Privacy Note</span>
              </div>
              <p className="text-sm text-blue-700">
                Your information is always secure. These settings only control who can see your data.
              </p>
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={20} /> {saving ? 'Saving...' : 'Save Privacy Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}