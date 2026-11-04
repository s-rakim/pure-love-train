import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  initializeAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';

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

let auth: Auth | null = null;

/** The shortest password a new account may have. */
export const MIN_PASSWORD = 8;

// Nothing is kept signed in here: the app only needs Firebase to prove the email and
// password once, then your sync server keeps you signed in.
function firebaseAuth(): Auth {
  auth ??= initializeAuth(firebaseApp(), { persistence: inMemoryPersistence });
  return auth;
}

function friendly(err: unknown): Error {
  const code = (err as { code?: string } | null)?.code ?? '';
  const messages: Record<string, string> = {
    'auth/invalid-email': "That email address doesn't look right.",
    'auth/missing-password': 'Type your password.',
    'auth/weak-password': 'Use a longer password, of at least 8 characters.',
    'auth/password-does-not-meet-requirements': 'Use a longer password, of at least 8 characters.',
    'auth/email-already-in-use': 'That email already has an account. Check the password.',
    'auth/invalid-credential': "That email and password don't match.",
    'auth/wrong-password': "That email and password don't match.",
    'auth/user-not-found': "That email and password don't match.",
    'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
    'auth/network-request-failed': "Can't reach Firebase. Check your internet connection.",
    'auth/operation-not-allowed': "Email sign-in isn't switched on in Firebase yet (Authentication → Sign-in method).",
  };
  return new Error(messages[code] ?? (err instanceof Error ? err.message : String(err)));
}

/**
 * Proves an email and password with Firebase and returns an ID token for the sync server.
 * With `create`, makes the account first if there isn't one yet.
 */
export async function emailIdToken(email: string, password: string, create: boolean): Promise<string> {
  const a = firebaseAuth();
  try {
    let cred;
    if (create && password.length < MIN_PASSWORD) {
      // Too short for a new account, but an older account may still use it.
      try {
        cred = await signInWithEmailAndPassword(a, email.trim(), password);
      } catch {
        throw new Error(`Use a password of at least ${MIN_PASSWORD} characters.`);
      }
    } else if (create) {
      try {
        cred = await createUserWithEmailAndPassword(a, email.trim(), password);
      } catch (err) {
        if ((err as { code?: string }).code !== 'auth/email-already-in-use') throw err;
        cred = await signInWithEmailAndPassword(a, email.trim(), password);
      }
    } else {
      cred = await signInWithEmailAndPassword(a, email.trim(), password);
    }
    const token = await cred.user.getIdToken();
    await signOut(a);
    return token;
  } catch (err) {
    throw friendly(err);
  }
}

/** Emails a link to choose a new password. */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(firebaseAuth(), email.trim());
  } catch (err) {
    throw friendly(err);
  }
}
