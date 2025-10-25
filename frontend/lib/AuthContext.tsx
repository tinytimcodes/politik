import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      // Persist username/email into AsyncStorage when logged in
      try {
        if (user) {
          const email = user.email ?? '';
          const displayName = user.displayName ?? '';
          await AsyncStorage.setItem('@user_email', email);
          await AsyncStorage.setItem('@user_displayName', displayName);
          // mirror a single JSON key that other parts of the app expect
          const authUser = JSON.stringify({ email, displayName });
          await AsyncStorage.setItem('authUser', authUser);
        }
      } catch (err) {
        // Non-fatal: log to console. Components can still rely on firebase user.
        // eslint-disable-next-line no-console
        console.warn('AsyncStorage write failed for auth values:', err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
