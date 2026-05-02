import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          // New user
          const newProfile = {
            username: user.displayName || 'Anonymous',
            email: user.email,
            role: user.email === 'elleniconoclust@gmail.com' ? 'admin' : 'user',
            acceptedPolicies: true, // Defaulting for simple flow
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          
          // Increment user count in global stats
          try {
            await updateDoc(doc(db, 'stats', 'global'), {
              total_users: increment(1)
            });
          } catch (err) {
            console.error('Failed to update total_users in global stats:', err);
          }

          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }

      // Initialize global stats if they don't exist (Only for Admin)
      if (user?.email === 'elleniconoclust@gmail.com') {
        const statsRef = doc(db, 'stats', 'global');
        const statsDoc = await getDoc(statsRef);
        if (!statsDoc.exists()) {
          await setDoc(statsRef, {
            total_prompts: 0,
            total_users: 0,
            categories: 8,
            accepted_prompts: 0,
            pending_prompts: 0,
            trending_prompts: 0
          });
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    await signInWithGoogle();
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'elleniconoclust@gmail.com';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, login, logout }}>
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
