import { createContext, useContext } from 'react';
import useNotifications from './useNotifications';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const notificationState = useNotifications();

  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationState() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationState must be used within NotificationProvider');
  }
  return context;
}
