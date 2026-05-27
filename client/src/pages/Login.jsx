import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import VerifyOtp from './VerifyOtp';
import BrandMark from '../components/layout/BrandMark';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [formMotionDirection, setFormMotionDirection] = useState('forward');
  const [formTransitionPhase, setFormTransitionPhase] = useState('entering');
  const [authTransitioning, setAuthTransitioning] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'elder',
    seniorLinkCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // OTP Verification States
  const [showVerification, setShowVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [verifying, setVerifying] = useState(false);

  const getFormMotionClass = () => {
    if (formTransitionPhase === 'exiting') {
      return formMotionDirection === 'forward'
        ? 'motion-auth-form-exit-forward'
        : 'motion-auth-form-exit-backward';
    }

    return formMotionDirection === 'forward'
      ? 'motion-auth-form-forward'
      : 'motion-auth-form-backward';
  };

  const switchAuthMode = (nextIsRegister) => {
    if (nextIsRegister === isRegister || formTransitionPhase === 'exiting') return;

    const direction = nextIsRegister ? 'forward' : 'backward';
    setFormMotionDirection(direction);
    setFormTransitionPhase('exiting');
    setError('');
    setSuccess('');

    setTimeout(() => {
      setIsRegister(nextIsRegister);
      setFormTransitionPhase('entering');

      if (!nextIsRegister) {
        setForm({
          name: '',
          email: '',
          password: '',
          role: 'elder',
          seniorLinkCode: ''
        });
      }

      setTimeout(() => setFormTransitionPhase('idle'), 260);
    }, 150);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const url = isRegister 
      ? 'http://localhost:5000/api/auth/register' 
      : 'http://localhost:5000/api/auth/login';

    if (isRegister && form.role === 'caregiver') {
      const code = form.seniorLinkCode.trim();
      if (!/^\d{6}$/.test(code)) {
        setError('Enter the 6-digit link code from your senior\'s welcome email.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = isRegister 
        ? { ...form, seniorLinkCode: form.seniorLinkCode.trim() }
        : { email: form.email, password: form.password };

      const res = await axios.post(url, payload);

      if (isRegister) {
        setSuccess(res.data.msg || "✅ Registration Successful! Please verify your email.");
        setUnverifiedEmail(form.email);
        setShowVerification(true);
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setSuccess(res.data.msg || "✅ Login Successful!");
        setAuthTransitioning(true);

        setTimeout(() => {
          onLogin(res.data.user);
          navigate('/dashboard');
        }, 260);
      }
    } catch (err) {
      console.error(err);
      
      if (err.response?.data?.requiresVerification) {
        setUnverifiedEmail(err.response.data.email);
        setShowVerification(true);
        setError('');
      } else {
        setError(err.response?.data?.msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = (user) => {
    console.log('Verification success, user:', user);
    setVerifying(true);
    
    setTimeout(() => {
      onLogin(user);
      navigate('/dashboard');
    }, 500);
  };

  if (showVerification) {
    return (
      <VerifyOtp 
        email={unverifiedEmail}
        onVerificationSuccess={handleVerificationSuccess}
        onBackToLogin={() => {
          setShowVerification(false);
          setError('');
          setSuccess('');
          setVerifying(false);
          setForm({
            name: '',
            email: '',
            password: '',
            role: 'elder',
            seniorLinkCode: ''
          });
        }}
      />
    );
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-surface p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Successful!</h2>
          <p className="text-gray-700">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ 
        backgroundImage: "url('/images/background.jpg')"
      }}
    >
      {/* Lighter overlay - Background image will show clearly */}
      <div className="min-h-screen bg-brand-surface/50 motion-auth-enter">
        
        <div className="w-full bg-brand-primary shadow-lg">
          <div className="px-4 py-4 sm:px-6 md:px-8 lg:px-12">
            <BrandMark compact subtitle="Care, health, and communication hub" />
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-10 md:py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-10 lg:gap-12">
            
{/* Left Side - Hero Section */}
<div className="flex-1 text-center">
  {/* Image at Top Center */}
  <div className="mb-6 sm:mb-8 flex justify-center">
    <img 
      src="/images/logo.png" 
      alt="Senior Care Illustration" 
      className="w-32 max-w-full h-auto"
    />
  </div>
  
  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg">
    Smart Assistant
  </h1>
  <p className="text-lg sm:text-xl text-white/90 max-w-md mx-auto">
    Smart Assistant is a gateway to independence,
    empowering seniors with secure health monitoring,
    instant connectivity, and dignified daily living.
  </p>
</div>

            {/* Right Side - Login/Register Form */}
            <div className="flex-1 max-w-md w-full">
              <div
                className={`rounded-2xl p-6 shadow-2xl sm:p-8 ${authTransitioning ? 'motion-auth-exit' : ''}`}
                style={{ backgroundColor: '#BAE4C7' }}
              >
                
                {/* Logo at Top of Form */}
                <div className="flex justify-center mb-6">
                  <img 
                    src="/images/logo.png" 
                    alt="Logo" 
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                  />
                </div>
                
                {error && (
                  <div className="bg-red-100 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-100 text-green-600 p-3 rounded-xl mb-4 text-sm text-center">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div key={isRegister ? 'register' : 'login'} className={getFormMotionClass()}>
                  {/* LOGIN MODE */}
                  {!isRegister ? (
                    <>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 text-sm font-semibold">Username / Email</label>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 text-sm font-semibold">Password</label>
                        <input
                          type="password"
                          placeholder="Enter your password"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          required
                        />
                      </div>

                      <div className="flex gap-3 mb-4">
                        <button
                          type="submit"
                          disabled={loading || authTransitioning}
                          className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-base transition disabled:opacity-50"
                        >
                          {loading ? '...' : 'Login'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            switchAuthMode(true);
                          }}
                          disabled={authTransitioning}
                          className="flex-1 bg-white hover:bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-base transition border border-gray-300"
                        >
                          Sign Up
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-green-600 rounded border-gray-300"
                          />
                          <span className="text-gray-700 text-sm">Remember me</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => navigate('/forgot-password')}
                          disabled={authTransitioning}
                          className="text-green-700 text-sm hover:underline"
                        >
                          Reset Password?
                        </button>
                      </div>
                    </>
                  ) : (
                    /* REGISTER MODE */
                    <>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 text-sm font-semibold">Full Name</label>
                        <input
                          type="text"
                          placeholder="Enter your full name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 text-sm font-semibold">Username / Email</label>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 text-sm font-semibold">Password</label>
                        <input
                          type="password"
                          placeholder="Enter your password"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 mb-2 text-sm font-semibold">Confirm Password</label>
                        <input
                          type="password"
                          placeholder="Confirm your password"
                          onChange={(e) => {
                            if (e.target.value !== form.password) {
                              setError("Passwords don't match");
                            } else {
                              setError('');
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          required
                        />
                      </div>

                      <div className="mb-6">
                        <label className="block text-gray-700 mb-2 text-sm font-semibold">I am a</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, role: 'volunteer', seniorLinkCode: '' })}
                            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                              form.role === 'volunteer' 
                                ? 'bg-green-700 text-white' 
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            🤝 Volunteer
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, role: 'elder', seniorLinkCode: '' })}
                            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                              form.role === 'elder' 
                                ? 'bg-green-700 text-white' 
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            👴 Senior
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, role: 'caregiver' })}
                            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                              form.role === 'caregiver' 
                                ? 'bg-green-700 text-white' 
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            🏥 Caregiver
                          </button>
                        </div>
                      </div>

                      {form.role === 'caregiver' && (
                        <div className="mb-6">
                          <label className="block text-gray-700 mb-2 text-sm font-semibold">
                            Senior link code
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            placeholder="6-digit code from senior's email"
                            value={form.seniorLinkCode}
                            onChange={(e) => setForm({
                              ...form,
                              seniorLinkCode: e.target.value.replace(/\D/g, '').slice(0, 6)
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white tracking-widest text-center text-lg font-semibold"
                            required
                          />
                          <p className="text-gray-700 text-xs mt-2">
                            Ask your senior to log in first. They will receive this code by email.
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={loading || authTransitioning}
                          className="flex-1 bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-base transition disabled:opacity-50"
                        >
                          {loading ? '...' : 'Register'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            switchAuthMode(false);
                          }}
                          disabled={authTransitioning}
                          className="flex-1 bg-white hover:bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-base transition border border-gray-300"
                        >
                          Back
                        </button>
                      </div>
                    </>
                  )}
                  </div>
                </form>

                {/* OR Divider and Social Icons */}
                {!isRegister && (
                  <>
                    <div className="flex items-center my-6">
                      <div className="flex-1 h-px bg-gray-400"></div>
                      <span className="px-4 text-gray-500 text-sm">OR</span>
                      <div className="flex-1 h-px bg-gray-400"></div>
                    </div>

                    <div className="flex flex-col gap-3">
                     {/* Google Login Link */}
<a 
  href="http://localhost:5000/api/auth/google"
  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-300 py-3 rounded-xl transition"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path className="fill-blue-500" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path className="fill-green-500" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path className="fill-yellow-500" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path className="fill-red-500" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
  <span className="font-semibold text-brand-primary">Sign in with Google</span>
</a>
                      {/* Facebook Login Link */}
<a 
  href="http://localhost:5000/api/auth/facebook"
  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-300 py-3 rounded-xl transition"
>
  <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
  </svg>
  <span className="font-semibold text-brand-primary">Sign in with Facebook</span>
</a>
                    </div>
                  </>
                )}
              </div>

              <p className="text-center text-gray-700 text-xs mt-6">
                © 2026 Smart Assistant. Care for Seniors, By Group 41.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}