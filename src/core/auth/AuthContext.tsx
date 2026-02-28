import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee } from '@/shared/types';
import { db, auth } from '@/core/firebase';
import { signOut, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from '@/shared/constants';

export type AppMode = 'selection' | 'app' | 'admin' | 'kiosk';

interface AuthContextType {
  user: Employee | null;
  appMode: AppMode;
  login: (userData: Employee) => void;
  logout: () => void;
  setAppMode: (mode: AppMode) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(() => {
    try {
      const saved = localStorage.getItem('army_user_v2026');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      localStorage.removeItem('army_user_v2026');
      return null;
    }
  });

  const [appMode, setAppModeState] = useState<AppMode>(() => {
    const savedMode = localStorage.getItem('army_app_mode');
    return (savedMode as AppMode) || 'selection';
  });

  const setAppMode = (mode: AppMode) => {
    setAppModeState(mode);
    localStorage.setItem('army_app_mode', mode);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!user) {
          try {
            const usersRef = collection(db, COLLECTIONS.EMPLOYEES);
            const q = query(usersRef, where("email", "==", firebaseUser.email));
            const snap = await getDocs(q);

            if (!snap.empty) {
              const userDoc = snap.docs[0];
              const userData = userDoc.data() as Employee;
              const fullUser = { ...userData, id: userDoc.id };
              login(fullUser);
            } else {
              console.error("No Employee document found for email:", firebaseUser.email);
              await signOut(auth);
            }
          } catch (error) {
            console.error("Error fetching user data in AuthContext:", error);
          }
        }
      } else {
        // If Firebase says we are logged out, but we have a local user, log them out
        if (user) {
          logout();
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'Admin') {
      const validAdminModes: AppMode[] = ['app', 'admin', 'kiosk', 'selection'];
      if (!validAdminModes.includes(appMode)) {
        setAppMode('selection');
      }
    } else if (user.role === 'Kiosk') {
      if (appMode !== 'kiosk') {
        setAppMode('kiosk');
      }
    } else { // Staff, Manager, HR
      if (appMode !== 'app') {
        setAppMode('app');
      }
    }
  }, [user, appMode]);

  const login = (userData: Employee) => {
    localStorage.setItem('army_user_v2026', JSON.stringify(userData));
    setUser(userData);

    if (userData.role === 'Admin') {
      setAppMode('selection');
    } else if (userData.role === 'Kiosk') {
      setAppMode('kiosk');
    } else {
      setAppMode('app');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase sign out error:', error);
    }
    localStorage.removeItem('army_user_v2026');
    localStorage.removeItem('army_app_mode');
    setUser(null);
    setAppMode('selection');
  };

  return (
    <AuthContext.Provider value={{ user, appMode, login, logout, setAppMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
