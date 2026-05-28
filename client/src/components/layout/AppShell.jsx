import AppHeader from './AppHeader';
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNotificationState } from '../../features/communication/notifications/NotificationContext';

const routeDepth = (pathname) => {
  if (pathname === '/dashboard') return 0;
  if (pathname.startsWith('/communication') || pathname.startsWith('/chat') || pathname.startsWith('/groups') || pathname.startsWith('/calls')) return 1;
  if (pathname.startsWith('/health')) return 2;
  return 1;
};

const getPageMotionClass = (pathname, navigationType) => {
  if (typeof window === 'undefined') return 'motion-page-forward';

  const previousPath = sessionStorage.getItem('navigation:lastPath') || '/dashboard';
  const previousDepth = routeDepth(previousPath);
  const nextDepth = routeDepth(pathname);

  if (navigationType === 'POP' || pathname === '/dashboard' || nextDepth < previousDepth) {
    return 'motion-page-backward';
  }

  return 'motion-page-forward';
};

export default function AppShell({ children, role, onLogout, exiting = false }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const notificationState = useNotificationState();
  const isAuthEntry = typeof window !== 'undefined'
    && sessionStorage.getItem('navigation:authEntry') === 'true';
  const pageMotionClass = useMemo(
    () => (isAuthEntry ? 'motion-page-forward' : getPageMotionClass(location.pathname, navigationType)),
    [isAuthEntry, location.pathname, navigationType]
  );

  useEffect(() => {
    sessionStorage.removeItem('navigation:authEntry');
    sessionStorage.setItem('navigation:lastPath', location.pathname);
  }, [location.pathname]);

  return (
    <div className={`min-h-screen bg-brand-surface ${exiting ? 'motion-auth-exit' : 'motion-auth-enter'}`}>
      <AppHeader role={role} onLogout={onLogout} notificationState={notificationState} />
      <main className={pageMotionClass}>{children}</main>
    </div>
  );
}
