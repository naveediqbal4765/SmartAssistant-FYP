import { useState, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskRequest from './pages/TaskRequest';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import RequestHelp from './pages/RequestHelp';
import MyRequests from './pages/MyRequests';
import SocialLoginHandler from './pages/SocialLoginHandler';
import PrivacySettings from './pages/PrivacySettings';
import ActivityLogs from './pages/ActivityLogs';
import ChatPage from './features/communication/chat/pages/ChatPage';
import GroupPage from './features/communication/groups/GroupPage';
import MedicationPage from './features/health/medications/MedicationPage';
import HealthVaultPage from './features/health/vault/HealthVaultPage';
import AppointmentPage from './features/health/appointments/AppointmentPage';
import TelemetryDashboard from './features/health/telemetry/TelemetryDashboard';
import DrugInteractionPage from './features/health/interactions/DrugInteractionPage';
import { disconnectChatSocket } from './features/communication/chat/services/socket';
import { CallStateProvider } from './features/communication/calls/CallStateContext';
import GlobalCallHandler from './features/communication/calls/GlobalCallHandler';
import AppShell from './components/layout/AppShell';

function ScrollToTopOnRouteChange() {
  const location = useLocation();

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [logoutTransitioning, setLogoutTransitioning] = useState(false);

  // Check authentication function
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔐 Auth Check - Token:', !!token, 'User:', !!user);
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setIsAuthenticated(true);
        setUserRole(userData.role);
        return true;
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
    
    setIsAuthenticated(false);
    setUserRole(null);
    return false;
  };

  useEffect(() => {
    checkAuth();
    
    // Listen for localStorage changes (for account deletion)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        console.log('🔄 Storage changed, rechecking auth...');
        checkAuth();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogin = (user) => {
    console.log('📝 User logged in:', user?.email);
    sessionStorage.setItem('navigation:authEntry', 'true');
    setLogoutTransitioning(false);
    setIsAuthenticated(true);
    setUserRole(user?.role);
  };

  const handleLogout = () => {
    if (logoutTransitioning) return;

    console.log('🚪 User logged out');
    setLogoutTransitioning(true);

    setTimeout(() => {
      disconnectChatSocket();
      setIsAuthenticated(false);
      setUserRole(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLogoutTransitioning(false);
    }, 240);
  };

  // Protected Route wrapper component
  const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      console.log('🔒 Protected route - redirecting to login');
      return <Navigate to="/login" />;
    }
    return (
      <AppShell role={userRole} onLogout={handleLogout} exiting={logoutTransitioning}>
        {children}
      </AppShell>
    );
  };

  return (
    <Router>
      <ScrollToTopOnRouteChange />
      <div className="min-h-screen bg-slate-50">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/forgot-password" 
            element={<ForgotPassword />} 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard role={userRole} />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/task-request" 
            element={
              <PrivateRoute>
                <TaskRequest />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/request-help" 
            element={
              <PrivateRoute>
                <RequestHelp />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/my-requests" 
            element={
              <PrivateRoute>
                <MyRequests />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/documents" 
            element={<Navigate to="/health/vault" />}
          />

          <Route
            path="/privacy"
            element={
              <PrivateRoute>
                <PrivacySettings />
              </PrivateRoute>
            }
          />

          <Route
            path="/activity-logs"
            element={
              <PrivateRoute>
                <ActivityLogs />
              </PrivateRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/chat/:conversationId"
            element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/groups"
            element={
              <PrivateRoute>
                <GroupPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/groups/:groupId"
            element={
              <PrivateRoute>
                <GroupPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/health/medications"
            element={
              <PrivateRoute>
                <MedicationPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/health/vault"
            element={
              <PrivateRoute>
                <HealthVaultPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/health/appointments"
            element={
              <PrivateRoute>
                <AppointmentPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/health/telemetry"
            element={
              <PrivateRoute>
                <TelemetryDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/health/interactions"
            element={
              <PrivateRoute>
                <DrugInteractionPage />
              </PrivateRoute>
            }
          />
          
          <Route path="/social-login" element={<SocialLoginHandler onLogin={handleLogin} />} />
          

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>

        {isAuthenticated && (
          <CallStateProvider>
            <GlobalCallHandler />
          </CallStateProvider>
        )}

      </div>
    </Router>
  );
}

export default App;