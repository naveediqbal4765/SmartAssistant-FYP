import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, User, Phone, FileText, Trash2, LogOut, Shield, Activity, Users, Link2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import LocationStatusCard from '../features/location/LocationStatusCard';
import NearbyVolunteers from '../features/location/NearbyVolunteers';
import FeaturePage from '../components/ui/FeaturePage';
import FeatureCard from '../components/ui/FeatureCard';
import LoadingState from '../components/ui/LoadingState';
import StatusAlert from '../components/ui/StatusAlert';
import { useDialog } from '../components/ui/GlobalDialogProvider';

export default function Profile() {
  const navigate = useNavigate();
  const dialog = useDialog();
  const { profileUserId } = useParams();
  const isLinkedSeniorView = Boolean(profileUserId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    location: null
  });

  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });
  const [userRole, setUserRole] = useState('');
  const [linkedSenior, setLinkedSenior] = useState(null);
  const [linkedCaregivers, setLinkedCaregivers] = useState([]);
  const [caregiverInvitation, setCaregiverInvitation] = useState(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [removingCaregiverId, setRemovingCaregiverId] = useState(null);
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

      const profileUrl = profileUserId
        ? `http://localhost:5000/api/user/profile/${profileUserId}`
        : 'http://localhost:5000/api/user/profile';
      const response = await axios.get(profileUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        const userData = response.data.user;
        setProfile({
          id: userData.id || userData._id || '',
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
          location: userData.location || null
        });
        setUserRole(userData.role || '');
        setLinkedSenior(userData.linkedSenior || null);
        setLinkedCaregivers(userData.linkedCaregivers || []);
        setPrivacySummary(userData.privacySettings || null);

        if (userData.role === 'elder' && !isLinkedSeniorView) {
          try {
            const invitationResponse = await axios.get('http://localhost:5000/api/auth/senior/caregiver-link-code', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (invitationResponse.data.success) {
              setCaregiverInvitation(invitationResponse.data.caregiverLinkCode || null);
            }
          } catch (invitationErr) {
            console.error('Error fetching caregiver invitation code:', invitationErr);
            setCaregiverInvitation(null);
          }
        } else {
          setCaregiverInvitation(null);
        }
        
        if (!isLinkedSeniorView) {
          const updatedUser = {
            ...JSON.parse(localStorage.getItem('user') || '{}'),
            ...userData
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }

      if (!isLinkedSeniorView) {
        const contactsResponse = await axios.get('http://localhost:5000/api/user/contacts', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (contactsResponse.data.success) {
          setEmergencyContacts(contactsResponse.data.contacts || []);
        }
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
        if (!isLinkedSeniorView) {
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          if (userData.name) {
            setProfile({
              id: userData.id || userData._id || '',
              name: userData.name || '',
              email: userData.email || '',
              phone: userData.phone || '',
              address: userData.address || '',
              dateOfBirth: userData.dateOfBirth || '',
              location: userData.location || null
            });
          }
        }
        setError(isLinkedSeniorView ? 'Could not load linked senior profile.' : 'Could not load data from server. Using local data.');
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [isLinkedSeniorView, navigate, profileUserId]);

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
    const confirmed = await dialog.showConfirm({
      title: 'Remove emergency contact?',
      message: 'Are you sure you want to remove this contact?',
      confirmText: 'Remove',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

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

  const regenerateCaregiverCode = async () => {
    setRegeneratingCode(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await axios.post(
        'http://localhost:5000/api/auth/senior/caregiver-link-code/regenerate',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setCaregiverInvitation(response.data.caregiverLinkCode || null);
        setSuccess('Caregiver invitation code regenerated successfully.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Regenerate caregiver code error:', err);
      setError(err.response?.data?.msg || 'Failed to regenerate caregiver invitation code');
      setTimeout(() => setError(''), 3000);
    } finally {
      setRegeneratingCode(false);
    }
  };

  const removeCaregiver = async (caregiver) => {
    const caregiverId = caregiver._id || caregiver.id;
    if (!caregiverId) return;

    const confirmed = await dialog.showConfirm({
      title: 'Remove caregiver?',
      message: `Remove ${caregiver.name || 'this caregiver'} from your caregiver list?`,
      confirmText: 'Remove',
      cancelText: 'Cancel'
    });
    if (!confirmed) {
      return;
    }

    setRemovingCaregiverId(caregiverId);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await axios.delete(`http://localhost:5000/api/user/caregiver/${caregiverId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setLinkedCaregivers((current) =>
          current.filter((c) => (c._id || c.id) !== caregiverId)
        );
        setSuccess('Caregiver removed successfully.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Remove caregiver error:', err);
      setError(err.response?.data?.msg || 'Failed to remove caregiver');
      setTimeout(() => setError(''), 3000);
    } finally {
      setRemovingCaregiverId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete account permanently?',
      message:
        'WARNING: This action is PERMANENT!\n\n' +
        'All your data will be deleted:\n' +
        '- Profile information\n' +
        '- Emergency contacts\n' +
        '- Digital Health Vault files\n' +
        '- Request history\n' +
        '- Activity logs\n\n' +
        'Are you sure you want to delete your account?',
      confirmText: 'Continue',
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    let finalConfirm = '';
    try {
      finalConfirm = await dialog.showPrompt({
        title: 'Confirm account deletion',
        message: 'Type "DELETE" to permanently delete your account.\n\nThis action cannot be undone.',
        inputPlaceholder: 'DELETE',
        confirmText: 'Continue',
        cancelText: 'Cancel',
        multiline: false
      });
    } catch (e) {
      return;
    }
    
    if (!finalConfirm || finalConfirm.toUpperCase() !== 'DELETE') {
      await dialog.showAlert({
        title: 'Account deletion cancelled',
        message: 'You must type "DELETE" to confirm.'
      });
      return;
    }
    
    const reallySure = await dialog.showConfirm({
      title: 'Final warning',
      message: 'This will permanently erase ALL your data.',
      confirmText: 'Delete Account',
      cancelText: 'Cancel'
    });
    
    if (!reallySure) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete('http://localhost:5000/api/user/account', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        localStorage.clear();
        await dialog.showAlert({
          title: 'Account deleted',
          message: 'Your account has been permanently deleted.\n\nThank you for using Smart Assistant.\nWe are sad to see you go!'
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      } else {
        await dialog.showAlert({
          title: 'Failed to delete account',
          message: response.data.msg || 'Failed to delete account.'
        });
      }
    } catch (err) {
      console.error('Delete account error:', err);
      localStorage.clear();
      await dialog.showAlert({
        title: 'Logged out',
        message: 'Your account has been logged out.'
      });
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

  const formatInvitationExpiry = (expiresAt) => {
    if (!expiresAt) return 'No expiry available';
    return new Date(expiresAt).toLocaleString();
  };

  const openHealthVault = () => {
    const targetUserId = isLinkedSeniorView ? profileUserId : profile.id;
    navigate(targetUserId ? `/health/vault/${targetUserId}` : '/health/vault');
  };

  if (loading) {
    return <LoadingState label="Loading profile..." />;
  }

  return (
    <FeaturePage
      title={isLinkedSeniorView ? `${profile.name || 'Senior'}'s Profile` : 'My Profile'}
      description={isLinkedSeniorView ? 'View-only linked senior profile.' : `${getRoleTitle()} profile, contacts, privacy, and health vault settings.`}
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
      maxWidth="max-w-5xl"
    >
        <StatusAlert variant="error">{error}</StatusAlert>
        <StatusAlert variant="success">{success}</StatusAlert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <FeatureCard className="p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-8 flex items-center gap-3 text-brand-primary">
              <User size={32} className="text-brand-primary" /> Personal Information
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  disabled={isLinkedSeniorView}
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
                  disabled={isLinkedSeniorView}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Date of Birth</label>
                <input 
                  type="date" 
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})}
                  disabled={isLinkedSeniorView}
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
                  disabled={isLinkedSeniorView}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {!isLinkedSeniorView && (
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Save size={24} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            )}
          </FeatureCard>

          {/* Emergency Contacts */}
          {!isLinkedSeniorView && <FeatureCard className="p-6 sm:p-8">
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
                        <p className="text-gray-700">📞 {contact.phone}</p>
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
          </FeatureCard>}
        </div>

        {(userRole === 'elder' || userRole === 'volunteer') && (
          <FeatureCard className="mt-8 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Activity size={32} className="text-brand-primary" />
              <span className="text-brand-primary">Location Awareness</span>
            </h2>
            <div className="space-y-5">
              <LocationStatusCard
                title={isLinkedSeniorView ? 'Senior Live Location' : userRole === 'elder' ? 'Senior Location Status' : 'Volunteer Location Status'}
                description={
                  isLinkedSeniorView
                    ? "View-only access to the senior's latest saved location through Google Maps."
                    : userRole === 'elder'
                    ? 'Update your location so emergency alerts can reach nearby volunteers and your linked caregivers.'
                    : 'Update your location so nearby task and emergency routing can include you accurately.'
                }
                readOnly={isLinkedSeniorView}
                location={isLinkedSeniorView ? profile.location : null}
              />
              {userRole === 'volunteer' && !isLinkedSeniorView && <NearbyVolunteers />}
            </div>
          </FeatureCard>
        )}

        {!isLinkedSeniorView && (userRole === 'elder' || userRole === 'caregiver') && (
          <FeatureCard className="mt-8 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Users size={32} className="text-green-700" />
              {userRole === 'elder' ? 'Linked Caregivers' : 'Linked Senior'}
            </h2>

            {userRole === 'caregiver' && (
              linkedSenior ? (
                <div className="space-y-5">
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <p className="font-semibold text-lg">{linkedSenior.name}</p>
                    <p className="text-gray-700">{linkedSenior.email}</p>
                    {linkedSenior.phone && <p className="text-gray-700">📞 {linkedSenior.phone}</p>}
                  </div>
                  <LocationStatusCard
                    readOnly
                    title="Senior Live Location"
                    description="View-only access to the senior's latest saved location through Google Maps."
                    location={linkedSenior.location || null}
                  />
                </div>
              ) : (
                <p className="text-gray-700">No senior linked to this account.</p>
              )
            )}

            {userRole === 'elder' && (
              <>
                <div className="bg-white/90 rounded-xl p-5 mb-6 border border-green-300">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex gap-3">
                      <Link2 className="text-green-700 shrink-0 mt-1" size={24} />
                      <div>
                        <p className="font-semibold text-gray-900">Caregiver Invitation Section</p>
                        <p className="text-sm text-gray-700 mt-1">
                          Share this code with your caregiver to allow signup.
                        </p>
                      </div>
                    </div>

                    <span
                      className={`self-start px-3 py-1 rounded-full text-sm font-semibold ${
                        caregiverInvitation?.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {caregiverInvitation?.status === 'active' ? 'Active' : 'Expired'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Current Code</p>
                      <p className="mt-1 text-3xl font-bold tracking-widest text-gray-900">
                        {caregiverInvitation?.code || '------'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Expiry Date</p>
                      <p className="mt-2 text-gray-900">
                        {formatInvitationExpiry(caregiverInvitation?.expiresAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={regenerateCaregiverCode}
                    disabled={regeneratingCode}
                    className="mt-5 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold transition"
                  >
                    {regeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
                  </button>
                </div>

                {linkedCaregivers.length === 0 ? (
                  <p className="text-gray-700">No caregivers linked yet. Share your caregiver invitation code when they sign up.</p>
                ) : (
                  <div className="space-y-3">
                    {linkedCaregivers.map((c) => (
                      <div key={c._id || c.id} className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div>
                            <p className="font-semibold">{c.name}</p>
                            <p className="text-gray-700 text-sm">{c.email}</p>
                            {c.phone && <p className="text-gray-700 text-sm">📞 {c.phone}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCaregiver(c)}
                            disabled={removingCaregiverId === (c._id || c.id)}
                            className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition"
                          >
                            <Trash2 size={16} />
                            {removingCaregiverId === (c._id || c.id) ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </FeatureCard>
        )}

        {!isLinkedSeniorView && <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="motion-card rounded-2xl border border-gray-200 bg-white p-6 text-left hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield size={28} className="text-purple-600" />
              <h3 className="text-xl font-semibold">Privacy Settings</h3>
            </div>
            <p className="text-gray-700 text-sm">
              {privacySummary
                ? `Phone ${privacySummary.showPhone ? 'visible' : 'hidden'} · Email ${privacySummary.showEmail ? 'visible' : 'hidden'}`
                : 'Control who can see your profile details'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/activity-logs')}
            className="motion-card rounded-2xl border border-gray-200 bg-white p-6 text-left hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 mb-2">
              <Activity size={28} className="text-teal-600" />
              <h3 className="text-xl font-semibold">Activity History</h3>
            </div>
            <p className="text-gray-700 text-sm">View logins, profile updates, Digital Health Vault activity, and help requests</p>
          </button>
        </div>}

        {/* Digital Health Vault */}
        {userRole === 'elder' && !isLinkedSeniorView && <FeatureCard className="mt-8 p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 flex items-center gap-3">
            <FileText size={32} className="text-indigo-600" /> Digital Health Vault
          </h2>
          <p className="text-gray-700 mb-6 text-lg">
            📄 Store your medical reports, prescriptions, and ID cards securely.
          </p>
          <button 
            onClick={openHealthVault}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            📄 Go to Digital Health Vault
          </button>
        </FeatureCard>}

        {/* Account Deletion Section */}
        {!isLinkedSeniorView && <FeatureCard variant="danger" className="mt-8 p-6 sm:p-8">
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
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
            <li>Profile information (name, email, phone, address)</li>
            <li>Emergency contacts</li>
            <li>Digital Health Vault files</li>
            <li>Help request history</li>
            <li>Activity logs</li>
          </ul>
          <button
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition duration-200 flex items-center gap-2"
          >
            <span>🗑️</span> Delete My Account
          </button>
        </FeatureCard>}
    </FeaturePage>
  );
}