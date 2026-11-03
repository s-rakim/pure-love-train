import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';

// The Firebase project "private-pure-love-train". These values identify the project to
// Firebase and are meant to ship in the app; access is controlled by Firebase security
// rules, not by keeping them secret.
export const firebaseConfig = {
  apiKey: 'AIzaSyDzILeWOU9qvUZrIYWDBQ-hbgFIC8wZRfI',
  authDomain: 'private-pure-love-train.firebaseapp.com',
  databaseURL: 'https://private-pure-love-train-default-rtdb.firebaseio.com',
  projectId: 'private-pure-love-train',
  storageBucket: 'private-pure-love-train.firebasestorage.app',
  messagingSenderId: '529095023717',
  appId: '1:529095023717:web:6b37d1ea9dee25fec5fa8c',
};

// Plain JavaScript SDK, so it ships over the air with no new APK. Initialised once, on first use.
export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}
