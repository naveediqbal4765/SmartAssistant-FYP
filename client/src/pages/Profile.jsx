import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, User, Phone, FileText, Trash2, LogOut, Shield, Activity, Users, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Profile() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
  });

  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });
  const [userRole, setUserRole] = useState('');
  const [linkedSenior, setLinkedSenior] = useState(null);
  const [linkedCaregivers, setLinkedCaregivers] = useState([]);
  const [caregiverLinkHint, setCaregiverLinkHint] = useState(null);
  const [privacySummary, setPrivacySummary] = useState(null);

  // Get auth token helper
  const getAuthToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }
    return token;
  };

  // Get user role from localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserRole(userData.role);
      } catch (e) {
        console.error('Error parsing user data');
      }
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/user/profile', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        const userData = response.data.user;
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
        });
        setUserRole(userData.role || '');
        setLinkedSenior(userData.linkedSenior || null);
        setLinkedCaregivers(userData.linkedCaregivers || []);
        setCaregiverLinkHint(userData.caregiverLinkCode || null);
        setPrivacySummary(userData.privacySettings || null);
        
        const updatedUser = { 
          ...JSON.parse(localStorage.getItem('user') || '{}'), 
          ...userData 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      const contactsResponse = await axios.get('http://localhost:5000/api/user/contacts', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (contactsResponse.data.success) {
        setEmergencyContacts(contactsResponse.data.contacts || []);
      }
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }, 2000);
      } else {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.name) {
          setProfile({
            name: userData.name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            dateOfBirth: userData.dateOfBirth || '',
          });
        }
        setError('Could not load data from server. Using local data.');
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await axios.put(
        'http://localhost:5000/api/user/profile',
        {
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          dateOfBirth: profile.dateOfBirth
        },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { 
          ...userData, 
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          dateOfBirth: profile.dateOfBirth
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setSuccess('✅ Profile saved successfully!');
        
        setTimeout(() => {
          fetchUserData();
        }, 1000);
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Save error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }, 2000);
      } else {
        setError(err.response?.data?.msg || 'Failed to save profile');
      }
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) {
      setError('Please fill name and phone number');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await axios.post(
        'http://localhost:5000/api/user/contacts',
        newContact,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setEmergencyContacts([...emergencyContacts, response.data.contact]);
        setNewContact({ name: '', phone: '', relation: '' });
        setSuccess('✅ Emergency contact added!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Add contact error:', err);
      setError(err.response?.data?.msg || 'Failed to add contact');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deleteEmergencyContact = async (id) => {
    if (!window.confirm('Are you sure you want to remove this contact?')) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      await axios.delete(`http://localhost:5000/api/user/contacts/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setEmergencyContacts(emergencyContacts.filter(c => c._id !== id));
      setSuccess('✅ Contact removed!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete contact');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This action is PERMANENT!\n\n' +
      'All your data will be deleted:\n' +
      '• Profile information\n' +
      '• Emergency contacts\n' +
      '• Uploaded documents\n' +
      '• Request history\n' +
      '• Activity logs\n\n' +
      'Are you sure you want to delete your account?'
    );
    
    if (!confirmed) return;
    
    let finalConfirm = '';
    try {
      finalConfirm = window.prompt(
        'Type "DELETE" to permanently delete your account:\n\n' +
        '(This action cannot be undone)'
      );
    } catch (e) {
      return;
    }
    
    if (!finalConfirm || finalConfirm.toUpperCase() !== 'DELETE') {
      alert('❌ Account deletion cancelled. You must type "DELETE" to confirm.');
      return;
    }
    
    const reallySure = window.confirm(
      'FINAL WARNING: This will permanently erase ALL your data.\n\n' +
      'Click OK to permanently delete your account.'
    );
    
    if (!reallySure) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete('http://localhost:5000/api/user/account', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        localStorage.clear();
        alert('✅ Your account has been permanently deleted.\n\nThank you for using Smart Assistant.\nWe are sad to see you go!');
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      } else {
        alert('❌ Failed to delete account: ' + response.data.msg);
      }
    } catch (err) {
      console.error('Delete account error:', err);
      localStorage.clear();
      alert('Your account has been logged out.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
  };

  const getRoleTitle = () => {
    if (userRole === 'elder') return 'Senior Citizen';
    if (userRole === 'volunteer') return 'Volunteer';
    if (userRole === 'caregiver') return 'Caregiver';
    return 'User';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E2FFEB' }}>
        <div className="text-xl">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#E2FFEB' }}>
      {/* Navbar with color #1C382A - Logo left, Logout right */}
      <div className="w-full shadow-md sticky top-0 z-50" style={{ backgroundColor: '#1C382A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Left side - Logo and Title */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-white hover:text-gray-300 transition"
              >
                <ArrowLeft size={24} />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-white/30 mx-2"></div>
              <div>
                <h1 className="text-xl font-bold text-white">Smart Assistant</h1>
                <p className="text-white/70 text-sm hidden sm:block">{getRoleTitle()} Profile</p>
              </div>
            </div>
            
            {/* Right side - Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-10 text-gray-900">My Profile</h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information - Background color #BAE4C7 */}
          <div className="rounded-2xl shadow-xl p-6 sm:p-8" style={{ backgroundColor: '#BAE4C7' }}>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-8 flex items-center gap-3">
              <User size={32} className="text-blue-600" /> Personal Information
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Email</label>
                <input 
                  type="email" 
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-3 border rounded-xl bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  value={profile.phone}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  placeholder="+92 300 1234567"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Date of Birth</label>
                <input 
                  type="date" 
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Address</label>
                <textarea 
                  value={profile.address}
                  onChange={(e) => setProfile({...profile, address: e.target.value})}
                  placeholder="Enter your full address"
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <button 
              onClick={saveProfile}
              disabled={saving}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <Save size={24} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          {/* Emergency Contacts - Background color #BAE4C7 */}
          <div className="rounded-2xl shadow-xl p-6 sm:p-8" style={{ backgroundColor: '#BAE4C7' }}>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-6 flex items-center gap-3">
              <Phone size={32} className="text-red-600" /> Emergency Contacts
            </h2>

            <div className="space-y-4 mb-8 max-h-80 overflow-y-auto">
              {emergencyContacts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No emergency contacts added yet</p>
              ) : (
                emergencyContacts.map((contact) => (
                  <div key={contact._id} className="border border-gray-200 p-4 rounded-xl bg-white">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{contact.name}</p>
                        <p className="text-gray-600">📞 {contact.phone}</p>
                        <p className="text-sm text-gray-500">
                          {contact.relation} • Priority {contact.priority || 1}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteEmergencyContact(contact._id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
              ➕ Add New Emergency Contact
            </h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Contact Name"
                value={newContact.name}
                onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newContact.phone}
                onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                type="text"
                placeholder="Relation (Son, Daughter, Friend, etc.)"
                value={newContact.relation}
                onChange={(e) => setNewContact({...newContact, relation: e.target.value})}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />

              <button 
                onClick={addEmergencyContact}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-lg"
              >
                Add Contact
              </button>
            </div>
          </div>
        </div>

        {(userRole === 'elder' || userRole === 'caregiver') && (
          <div className="rounded-2xl shadow-xl p-6 sm:p-8 mt-8" style={{ backgroundColor: '#BAE4C7' }}>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Users size={32} className="text-green-700" />
              {userRole === 'elder' ? 'Linked Caregivers' : 'Linked Senior'}
            </h2>

            {userRole === 'caregiver' && (
              linkedSenior ? (
                <div className="bg-white rounded-xl p-4 border border-green-200">
                  <p className="font-semibold text-lg">{linkedSenior.name}</p>
                  <p className="text-gray-600">{linkedSenior.email}</p>
                  {linkedSenior.phone && <p className="text-gray-600">📞 {linkedSenior.phone}</p>}
                </div>
              ) : (
                <p className="text-gray-600">No senior linked to this account.</p>
              )
            )}

            {userRole === 'elder' && (
              <>
                {caregiverLinkHint && (
                  <div className="bg-white/80 rounded-xl p-4 mb-4 border border-green-300 flex gap-3">
                    <Link2 className="text-green-700 shrink-0" size={24} />
                    <div>
                      <p className="font-medium text-gray-800">Caregiver link code active</p>
                      <p className="text-sm text-gray-600">{caregiverLinkHint.hint}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(caregiverLinkHint.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {linkedCaregivers.length === 0 ? (
                  <p className="text-gray-600">No caregivers linked yet. Share your email link code when they sign up.</p>
                ) : (
                  <div className="space-y-3">
                    {linkedCaregivers.map((c) => (
                      <div key={c._id || c.id} className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-gray-600 text-sm">{c.email}</p>
                        {c.phone && <p className="text-gray-600 text-sm">📞 {c.phone}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="rounded-2xl shadow-xl p-6 text-left hover:shadow-2xl transition"
            style={{ backgroundColor: '#BAE4C7' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield size={28} className="text-purple-600" />
              <h3 className="text-xl font-semibold">Privacy Settings</h3>
            </div>
            <p className="text-gray-600 text-sm">
              {privacySummary
                ? `Phone ${privacySummary.showPhone ? 'visible' : 'hidden'} · Email ${privacySummary.showEmail ? 'visible' : 'hidden'}`
                : 'Control who can see your profile details'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/activity-logs')}
            className="rounded-2xl shadow-xl p-6 text-left hover:shadow-2xl transition"
            style={{ backgroundColor: '#BAE4C7' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Activity size={28} className="text-teal-600" />
              <h3 className="text-xl font-semibold">Activity History</h3>
            </div>
            <p className="text-gray-600 text-sm">View logins, profile updates, documents, and help requests</p>
          </button>
        </div>

        {/* Digital Document Vault - Background color #BAE4C7 */}
        <div className="rounded-2xl shadow-xl p-6 sm:p-8 mt-8" style={{ backgroundColor: '#BAE4C7' }}>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 flex items-center gap-3">
            <FileText size={32} className="text-indigo-600" /> Digital Document Vault
          </h2>
          <p className="text-gray-700 mb-6 text-lg">
            📄 Store your medical reports, prescriptions, and ID documents securely.
          </p>
          <button 
            onClick={() => navigate('/documents')} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            📄 Go to Document Vault
          </button>
        </div>

        {/* Account Deletion Section */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl shadow-xl p-6 sm:p-8 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-700">Danger Zone</h2>
              <p className="text-red-600 text-sm">Permanent account deletion</p>
            </div>
          </div>
          <p className="text-gray-700 mb-4">
            Once you delete your account, <span className="font-bold">all your data will be permanently removed</span> including:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
            <li>Profile information (name, email, phone, address)</li>
            <li>Emergency contacts</li>
            <li>Uploaded documents and files</li>
            <li>Help request history</li>
            <li>Activity logs</li>
          </ul>
          <button
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition duration-200 flex items-center gap-2"
          >
            <span>🗑️</span> Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}