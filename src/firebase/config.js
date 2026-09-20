/**
 * Firebase Config - SI-RAPORT BK DPRD
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCxsifO-JQl7bVj1cBle-WEh789FmY6UHs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "si-raport-bk-dprd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "si-raport-bk-dprd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "si-raport-bk-dprd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "91180757282",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:91180757282:web:b285a04922f0f92e2af57b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2D3PZNF4GE"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Analytics — browser only
let analytics = null;
if (typeof window !== 'undefined') {
  try { analytics = getAnalytics(app); } catch (e) { /* skip */ }
}
export { analytics };

// Offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
    console.warn('Firestore persistence error:', err.code);
  }
});

export default app;
