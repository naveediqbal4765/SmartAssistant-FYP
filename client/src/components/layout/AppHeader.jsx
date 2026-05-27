import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../../features/communication/notifications/NotificationBell';
import BrandMark from './BrandMark';

const roleLabels = {
  elder: 'Senior',
  senior: 'Senior',
  volunteer: 'Volunteer',
  caregiver: 'Caregiver'
};

export default function AppHeader({ role, onLogout }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const roleLabel = roleLabels[role] || 'User';
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (err) {
      return {};
    }
  }, []);

  useEffect(() => {
    if (!profileOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [profileOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-brand-primary shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 text-left"
        >
          <BrandMark subtitle="Care, health, and communication hub" />
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white sm:inline-flex">
            {roleLabel}
          </span>
          <NotificationBell className="relative right-auto top-auto z-auto" />
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="motion-interactive flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-900 shadow-sm hover:bg-gray-100"
              aria-label="Profile menu"
            >
              <User size={22} className="text-brand-primary" />
            </button>

            {profileOpen && (
              <div className="motion-dropdown-in absolute right-0 mt-3 w-64 rounded-2xl border border-gray-100 bg-white p-2 text-gray-900 shadow-xl">
                <div className="border-b border-gray-100 px-3 py-3">
                  <p className="font-semibold">{user.name || 'Profile'}</p>
                  <p className="text-sm text-gray-500">{user.email || roleLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="motion-interactive mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-gray-50"
                >
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="motion-interactive mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
