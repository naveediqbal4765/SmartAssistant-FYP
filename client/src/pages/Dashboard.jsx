import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DashboardHome from './dashboard/DashboardHome';
import { normalizeDashboardRole, roleConfig } from './dashboard/dashboardRoleConfig';
import { DashboardSkeleton } from '../components/ui/Skeleton';

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function Dashboard({ role }) {
  const normalizedRole = normalizeDashboardRole(role);
  const config = roleConfig[normalizedRole];
  const [linkedSenior, setLinkedSenior] = useState(null);

  const loadDashboardContext = useCallback(async () => {
    if (normalizedRole !== 'caregiver') return;

    try {
      const response = await axios.get('http://localhost:5000/api/user/profile', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (response.data.success) {
        setLinkedSenior(response.data.user.linkedSenior || null);
      }
    } catch (err) {
      setLinkedSenior(null);
    }
  }, [normalizedRole]);

  useEffect(() => {
    loadDashboardContext();
  }, [loadDashboardContext]);

  const context = useMemo(() => ({
    linkedSenior
  }), [linkedSenior]);

  if (!config) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardHome
      config={config}
      context={context}
      greeting={`${getTimeGreeting()}, ${config.greetingName}`}
    />
  );
}
