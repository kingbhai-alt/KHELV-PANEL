import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { setMemoryAuthToken } from '../services/licenseService';

interface AuthContextValue {
  user: User | null;
  idToken: string | null;
  authLoading: boolean;
  authError: string;
  signInWithGoogle: () => Promise<string | null>;
  signOutGoogle: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  idToken: null,
  authLoading: true,
  authError: '',
  signInWithGoogle: async () => null,
  signOutGoogle: async () => {},
  refreshToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          setMemoryAuthToken(token);
        } catch {
          setIdToken(null);
          setMemoryAuthToken(null);
        }
      } else {
        setIdToken(null);
        setMemoryAuthToken(null);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    setAuthError('');
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setUser(cred.user);
      setIdToken(token);
      setMemoryAuthToken(token);
      return token;
    } catch (err: any) {
      const msg =
        err?.code === 'auth/popup-closed-by-user'
          ? 'Sign-in popup was closed before completing.'
          : err?.message || 'Google sign-in could not be completed.';
      setAuthError(msg);
      return null;
    }
  }, []);

  const signOutGoogle = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setIdToken(null);
      setMemoryAuthToken(null);
    } catch {
      // Ignore sign-out errors
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      const token = await auth.currentUser.getIdToken(true);
      setIdToken(token);
      setMemoryAuthToken(token);
      return token;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        authLoading,
        authError,
        signInWithGoogle,
        signOutGoogle,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
