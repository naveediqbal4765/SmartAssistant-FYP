import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskRequest from './pages/TaskRequest';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import DocumentVault from './pages/DocumentVault';
import RequestHelp from './pages/RequestHelp';
import MyRequests from './pages/MyRequests';
import SocialLoginHandler from './pages/SocialLoginHandler';
import PrivacySettings from './pages/PrivacySettings';
import ActivityLogs from './pages/ActivityLogs';
import ChatPage from './features/communication/chat/pages/ChatPage';
import GroupPage from './features/communication/groups/GroupPage';
import { disconnectChatSocket } from './features/communication/chat/services/socket';
import NotificationBell from './features/communication/notifications/NotificationBell';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

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
    setIsAuthenticated(true);
    setUserRole(user?.role);
  };

  const handleLogout = () => {
    console.log('🚪 User logged out');
    disconnectChatSocket();
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Protected Route wrapper component
  const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      console.log('🔒 Protected route - redirecting to login');
      return <Navigate to="/login" />;
    }
    return children;
  };

  return (
    <Router>
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
                <Dashboard role={userRole} onLogout={handleLogout} />
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
            element={
              <PrivateRoute>
                <DocumentVault />
              </PrivateRoute>
            } 
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
          
          <Route path="/social-login" element={<SocialLoginHandler onLogin={handleLogin} />} />
          

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>

        {isAuthenticated && <NotificationBell />}

      </div>
    </Router>
  );
}

export default App;