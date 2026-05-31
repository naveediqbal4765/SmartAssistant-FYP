import { useState, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskRequests from './pages/TaskRequests';
import Profile from './pages/Profile';
import VolunteerProfileView from './pages/VolunteerProfileView';
import ForgotPassword from './pages/ForgotPassword';
import SocialLoginHandler from './pages/SocialLoginHandler';
import PrivacySettings from './pages/PrivacySettings';
import ActivityLogs from './pages/ActivityLogs';
import CallRemindersPage from './pages/CallRemindersPage';
import CommunicationHub from './features/communication/CommunicationHub';
import ChatPage from './features/communication/chat/pages/ChatPage';
import GroupPage from './features/communication/groups/GroupPage';
import GroupCallInviteHandler from './features/communication/groups/GroupCallInviteHandler';
import CallsPage from './features/communication/calls/CallsPage';
import MedicationPage from './features/health/medications/MedicationPage';
import HealthVaultPage from './features/health/vault/HealthVaultPage';
import AppointmentPage from './features/health/appointments/AppointmentPage';
import TelemetryDashboard from './features/health/telemetry/TelemetryDashboard';
import DrugInteractionPage from './features/health/interactions/DrugInteractionPage';
import WellnessDashboard from './features/wellness-rehab/pages/WellnessDashboard';
import ExerciseLibraryPage from './features/wellness-rehab/pages/ExerciseLibraryPage';
import ActiveSessionPage from './features/wellness-rehab/pages/ActiveSessionPage';
import { disconnectChatSocket, getChatSocket } from './features/communication/chat/services/socket';
import { CallStateProvider } from './features/communication/calls/CallStateContext';
import GlobalCallHandler from './features/communication/calls/GlobalCallHandler';
import { NotificationProvider, useNotificationState } from './features/communication/notifications/NotificationContext';
import AutoNotificationConsumer from './features/communication/notifications/AutoNotificationConsumer';
import GlobalSeniorReminderPopups from './features/health/reminders/GlobalSeniorReminderPopups';
import ActionableTaskNotifications from './features/tasks/ActionableTaskNotifications';
import AppShell from './components/layout/AppShell';
import { GlobalDialogProvider } from './components/ui/GlobalDialogProvider';

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

function AuthenticatedGlobalOverlays({ userRole }) {
  const notificationState = useNotificationState();
  const isSenior = userRole === 'elder' || userRole === 'senior';

  useEffect(() => {
    const socket = getChatSocket();
    const handleVisibilityChange = () => {
      socket.emit(
        document.visibilityState === 'hidden' ? 'user:presence:inactive' : 'user:presence:active'
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <>
      <GlobalSeniorReminderPopups
        enabled={isSenior}
        callReminderPopups={notificationState.reminderPopups}
        onDismissCallReminder={notificationState.markRead}
      />
      <ActionableTaskNotifications notificationState={notificationState} />
      <AutoNotificationConsumer notificationState={notificationState} />
      <CallStateProvider>
        <GlobalCallHandler />
      </CallStateProvider>
      <GroupCallInviteHandler />
    </>
  );
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

  const hasStoredSession = Boolean(localStorage.getItem('token') && localStorage.getItem('user'));
  const shouldUseAuthenticatedProviders = isAuthenticated || hasStoredSession;

  const appRoutes = (
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
            path="/profile/:profileUserId"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />

          <Route
            path="/volunteers/:volunteerId"
            element={
              <PrivateRoute>
                <VolunteerProfileView />
              </PrivateRoute>
            }
          />
          
          <Route 
            path="/task-request" 
            element={<Navigate to="/task-requests" />} 
          />
          
          <Route 
            path="/request-help" 
            element={<Navigate to="/task-requests" />} 
          />
          
          <Route 
            path="/my-requests" 
            element={<Navigate to="/task-requests" />} 
          />

          <Route 
            path="/task-requests" 
            element={
              <PrivateRoute>
                <TaskRequests />
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
            path="/reminders"
            element={
              <PrivateRoute>
                <CallRemindersPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/communication"
            element={
              <PrivateRoute>
                <CommunicationHub />
              </PrivateRoute>
            }
          />

          <Route
            path="/calls"
            element={
              <PrivateRoute>
                <CallsPage />
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
            path="/health/vault/:targetUserId"
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

          <Route
            path="/wellness"
            element={
              <PrivateRoute>
                <WellnessDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/wellness/library"
            element={
              <PrivateRoute>
                <ExerciseLibraryPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/wellness/session/active"
            element={
              <PrivateRoute>
                <ActiveSessionPage />
              </PrivateRoute>
            }
          />
          
          <Route path="/social-login" element={<SocialLoginHandler onLogin={handleLogin} />} />
          

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );

  return (
    <Router>
      <GlobalDialogProvider>
        <ScrollToTopOnRouteChange />
        <div className="min-h-screen bg-slate-50">
          {shouldUseAuthenticatedProviders ? (
            <NotificationProvider>
              {appRoutes}
              {isAuthenticated && <AuthenticatedGlobalOverlays userRole={userRole} />}
            </NotificationProvider>
          ) : (
            appRoutes
          )}
        </div>
      </GlobalDialogProvider>
    </Router>
  );
}

export default App;