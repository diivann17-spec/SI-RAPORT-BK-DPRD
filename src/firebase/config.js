/**
 * Firebase Config - SI-RAPORT BK DPRD
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: "AIzaSyCxsifO-JQl7bVj1cBle-WEh789FmY6UHs",
  authDomain: "si-raport-bk-dprd.firebaseapp.com",
  projectId: "si-raport-bk-dprd",
  storageBucket: "si-raport-bk-dprd.firebasestorage.app",
  messagingSenderId: "91180757282",
  appId: "1:91180757282:web:b285a04922f0f92e2af57b",
  measurementId: "G-2D3PZNF4GE"
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
