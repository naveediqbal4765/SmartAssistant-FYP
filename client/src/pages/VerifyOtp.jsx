import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const VerifyOtp = ({ email, onVerificationSuccess, onBackToLogin }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 100);
  }, []);

  const handleOtpChange = (index, value) => {
    if (value && !/^[0-9]$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedNumbers = pastedData.replace(/\D/g, '').slice(0, 6);
    
    const newOtp = [...otp];
    for (let i = 0; i < pastedNumbers.length; i++) {
      newOtp[i] = pastedNumbers[i];
    }
    setOtp(newOtp);
    
    const nextIndex = Math.min(pastedNumbers.length, 5);
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/verify-otp', {
        email,
        otp: otpCode
      });

      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        const userData = {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: response.data.user.role,
          phone: response.data.user.phone || '',
          address: response.data.user.address || '',
          dateOfBirth: response.data.user.dateOfBirth || '',
          linkedSeniorId: response.data.user.linkedSeniorId || null
        };
        localStorage.setItem('user', JSON.stringify(userData));
        
        setRedirecting(true);
        
        setTimeout(() => {
          onVerificationSuccess(userData);
        }, 500);
      } else {
        setError(response.data.msg || 'Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError('');
    setResendMessage('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/resend-otp', { email });
      if (response.data.success) {
        setResendMessage('✅ New verification code sent!');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(response.data.msg || 'Failed to resend OTP');
      }
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="auth-focus-scope min-h-screen bg-brand-surface flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Successful!</h2>
          <p className="text-gray-700">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-focus-scope min-h-screen bg-brand-surface flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="text-gray-700 text-sm mt-2">
            Enter the 6-digit verification code sent to
          </p>
          <p className="font-semibold text-blue-600 text-md mt-1 break-all">{email}</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        {resendMessage && (
          <div className="bg-green-100 text-green-700 p-2 rounded-lg mb-4 text-sm text-center">
            {resendMessage}
          </div>
        )}

        {/* OTP Input Boxes - FIXED: Full numbers visible */}
        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="border-2 border-brand-primary bg-white text-center font-mono font-bold text-brand-primary transition duration-200 ease-in-out focus:-translate-y-0.5 focus:border-transparent focus:shadow-[0_0_0_3px_rgba(28,56,42,0.18),0_10px_24px_rgba(15,31,23,0.10)] focus:outline-none focus:ring-0"
              style={{
                width: '60px',
                height: '60px',
                textAlign: 'center',
                fontSize: '32px',
                fontWeight: 'bold',
                borderRadius: '12px',
                outline: 'none',
                fontFamily: 'monospace',
                padding: '0',
                margin: '0',
                lineHeight: '60px'
              }}
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-[#1c382a] hover:bg-[#142a20] active:bg-[#0f1f17] text-white py-3 rounded-xl font-medium disabled:opacity-70 transition-all text-lg"
        >
          {loading ? 'Verifying...' : 'Verify Account'}
        </button>

        <div className="flex justify-between items-center mt-4 text-sm">
          <button
            onClick={onBackToLogin}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ← Back to Login
          </button>
          <button
            onClick={handleResendOtp}
            disabled={resendLoading}
            className="text-[#1c382a] hover:text-[#0f1f17] disabled:opacity-50 transition"
          >
            {resendLoading ? 'Sending...' : "Didn't receive code? Resend"}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          💡 Tip: You can paste the entire 6-digit code
        </p>
      </div>
    </div>
  );
};

export default VerifyOtp;