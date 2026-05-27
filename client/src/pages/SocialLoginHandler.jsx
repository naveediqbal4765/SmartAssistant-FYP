import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SocialLoginHandler({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userParam = params.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user);
        navigate('/dashboard');
      } catch (err) {
        console.error('Error parsing user data:', err);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [location, navigate, onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-surface">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authenticating...</h2>
        <p className="text-gray-700">Please wait while we log you in with Google.</p>
      </div>
    </div>
  );
}