import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DashboardHome from './dashboard/DashboardHome';
import { normalizeDashboardRole, roleConfig } from './dashboard/dashboardRoleConfig';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { getChatSocket } from '../features/communication/chat/services/socket';

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
  const linkedSeniorId = String(linkedSenior?._id || linkedSenior?.id || '');

  useEffect(() => {
    if (normalizedRole !== 'caregiver') return;
    console.debug('[Dashboard] caregiver module visibility', {
      role,
      normalizedRole,
      resolvedModules: config?.modules?.map((module) => module.title) || []
    });
  }, [config, normalizedRole, role]);

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

  useEffect(() => {
    if (normalizedRole !== 'caregiver' || !linkedSeniorId) return undefined;

    const socket = getChatSocket();
    const handleSeniorLocationUpdated = (payload) => {
      if (String(payload?.userId || '') !== linkedSeniorId) return;

      setLinkedSenior((current) => {
        if (!current) return current;

        const coordinates = [Number(payload.longitude), Number(payload.latitude)];
        const currentCoordinates = current.location?.coordinates || [];
        const currentUpdatedAt = current.location?.lastUpdated
          ? new Date(current.location.lastUpdated).getTime()
          : 0;
        const nextUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now();

        if (
          Number(currentCoordinates[0]) === coordinates[0] &&
          Number(currentCoordinates[1]) === coordinates[1] &&
          currentUpdatedAt === nextUpdatedAt
        ) {
          return current;
        }

        return {
          ...current,
          location: {
            type: 'Point',
            coordinates,
            lastUpdated: payload.updatedAt
          }
        };
      });
    };

    socket.on('SENIOR_LOCATION_UPDATED', handleSeniorLocationUpdated);

    return () => {
      socket.off('SENIOR_LOCATION_UPDATED', handleSeniorLocationUpdated);
    };
  }, [linkedSeniorId, normalizedRole]);

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
