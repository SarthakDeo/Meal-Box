/**
 * Firebase initialization — messaging instance (lazy)
 *
 * getMessaging() throws if the browser doesn't support service workers,
 * or if config values are missing (e.g. no .env in local dev).
 * We initialise lazily so a missing/bad config never crashes the whole app.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Resolves to the messaging instance, or null if FCM isn't supported / config missing.
export const messagingPromise = isSupported()
  .then((supported) => (supported ? getMessaging(app) : null))
  .catch(() => null);
