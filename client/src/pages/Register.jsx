import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  // ← Add this console.log for debugging
  console.log("Form Data being sent:", formData);
  console.log("Role value:", formData.role);

  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    console.log("Response from backend:", data);   // ← Add this too

    if (response.ok) {
      alert(data.msg || 'Registration successful!');
      navigate('/login');
    } else {
      setError(data.msg || 'Something went wrong');
    }
  } catch (err) {
    setError('Cannot connect to server');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-blue-600 mb-1">
          Smart Assistant
        </h2>
        <p className="text-center text-gray-700 mb-6">For Senior Citizens</p>

        <div className="flex justify-center mb-6">
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2 rounded-l-xl bg-gray-200 hover:bg-gray-300"
          >
            Login
          </button>
          <button className="px-6 py-2 rounded-r-xl bg-blue-600 text-white font-medium">
            Register
          </button>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 border rounded-xl" />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 border rounded-xl" />
          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 border rounded-xl" />

        <select
  name="role"
  value={formData.role}
  onChange={handleChange}
  required
  className="w-full px-4 py-3 border rounded-xl"
>
  <option value="">Select Role</option>
  <option value="Elder">I am a Senior Citizen</option>
  <option value="Volunteer">I am a Volunteer</option>
  <option value="Caregiver">I am a Caregiver</option>
</select>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-70"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;