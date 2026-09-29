/**
 * Push notification helpers
 * - enableNotifications()      → request permission, get FCM token, POST to backend
 * - setupForegroundHandler()   → show in-app toast when the tab is open
 */
import { getToken, onMessage } from 'firebase/messaging';
import toast from 'react-hot-toast';
import { messagingPromise } from '../firebase.js';
import api from './api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Ask for permission, obtain an FCM token, and register it with the backend.
 * Call this only in response to a user gesture (button click).
 * Returns true on success, false otherwise.
 */
export async function enableNotifications() {
  try {
    const messaging = await messagingPromise;
    if (!messaging) {
      toast.error('Push notifications are not supported in this browser.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notification permission denied.');
      return false;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    if (!token) {
      toast.error('Could not get notification token. Try again later.');
      return false;
    }

    await api.post('/push/register-token', { token, platform: 'web' });
    toast.success('🔔 Notifications enabled!');
    return true;
  } catch (err) {
    console.error('enableNotifications error:', err);
    toast.error('Failed to enable notifications.');
    return false;
  }
}

/**
 * Call once on app load (after the user is authenticated).
 * Shows an in-app toast when a push arrives while the tab is open/focused.
 * Returns an unsubscribe function, or undefined if FCM isn't available.
 */
export async function setupForegroundHandler() {
  const messaging = await messagingPromise;
  if (!messaging) return;

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'Meal Box';
    const body  = payload.notification?.body  || '';
    const url   = payload.data?.url;

    const message = body ? `${title}\n${body}` : title;

    toast(message, {
      duration: 6000,
      icon: '🔔',
      onClick: url ? () => window.open(url, '_blank', 'noopener') : undefined,
    });
  });
}
