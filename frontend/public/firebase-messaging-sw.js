/**
 * Firebase Cloud Messaging Service Worker
 *
 * IMPORTANT: This file is served as a static asset from /public and is loaded
 * directly by the browser — it cannot read Vite env vars (import.meta.env).
 * You must paste your actual Firebase project values below.
 *
 * Where to find them:
 *   Firebase Console → Project Settings → General → Your apps → SDK setup
 *
 * Replace every "PASTE_YOUR_..." placeholder with the real value.
 */

importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "PASTE_YOUR_API_KEY",
  authDomain:        "PASTE_YOUR_AUTH_DOMAIN",
  projectId:         "PASTE_YOUR_PROJECT_ID",
  storageBucket:     "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId:             "PASTE_YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Background message handler — shows notification when the tab is closed/hidden
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const link = payload.data?.url || '/';

  self.registration.showNotification(title || 'Meal Box', {
    body:  body  || '',
    icon:  '/favicon.svg',
    badge: '/favicon.svg',
    data:  { url: link },
  });
});

// Open / focus the correct URL when the user clicks the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
