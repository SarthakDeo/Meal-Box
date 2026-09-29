/**
 * NotificationBanner
 * Shows once per session when the user has not yet granted notification permission.
 * Dismissed by clicking "Enable" (which calls enableNotifications) or "Not now".
 */
import { useState, useEffect } from 'react';
import { HiOutlineBell, HiX } from 'react-icons/hi';
import { enableNotifications } from '../../services/notifications';

export default function NotificationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only when Notifications API exists and permission hasn't been decided yet
    if (
      'Notification' in window &&
      Notification.permission === 'default' &&
      !sessionStorage.getItem('notif-banner-dismissed')
    ) {
      setVisible(true);
    }
  }, []);

  const handleEnable = async () => {
    setVisible(false);
    await enableNotifications();
  };

  const handleDismiss = () => {
    sessionStorage.setItem('notif-banner-dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'var(--primary-50, #fff7ed)',
      border: '1px solid var(--primary-200, #fed7aa)',
      borderRadius: 'var(--radius-md, 8px)',
      marginBottom: '16px',
      fontSize: 'var(--font-size-sm, 14px)',
    }}>
      <HiOutlineBell style={{ fontSize: '20px', color: 'var(--primary-600, #ea580c)', flexShrink: 0 }} />
      <span style={{ flex: 1, color: 'var(--text-primary)' }}>
        Enable push notifications to get order & kitchen updates.
      </span>
      <button
        onClick={handleEnable}
        style={{
          padding: '6px 14px',
          background: 'var(--primary-500, #f97316)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-sm, 6px)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        Enable
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
      >
        <HiX style={{ fontSize: '18px', color: 'var(--text-secondary)' }} />
      </button>
    </div>
  );
}
