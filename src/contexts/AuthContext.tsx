import React, { createContext, useContext, useEffect, useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';

import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserData {
  uid: string;
  name: string;
  email: string;
  position: string;
  role: 'admin' | 'staff' | 'student';
  createdAt: Date;
  lastActive?: Date;
  taskDeletePermission?: boolean;
  studentDetails?: {
    course?: string;
    year?: number;
    studentId?: string;
  };
  staffDetails?: {
    department?: string;
    designation?: string;
    accessLevel?: number;
  };
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'staff' | 'student',
    position: string,
    accessLevel?: number
  ) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const fetchIpAddress = async (): Promise<string> => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (e) {
    console.error('Failed to fetch IP address:', e);
    return '';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ LOGIN
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let userProfile: UserData;
      if (!userSnap.exists()) {
        userProfile = {
          uid: user.uid,
          email: user.email!,
          name: user.displayName || 'New User',
          role: 'student',
          position: 'Member',
          createdAt: new Date(),
          lastActive: new Date()
        };
        await setDoc(userRef, userProfile);
      } else {
        userProfile = {
        ...userSnap.data(),
        createdAt: userSnap.data().createdAt?.toDate?.() || new Date(),
        lastActive: new Date()
      } as UserData;
        await setDoc(userRef, userProfile, { merge: true });
      }

      setCurrentUser(user);
      setUserData(userProfile);

      const ip = await fetchIpAddress();
      await addDoc(collection(db, 'loginHistory'), {
        userId: user.uid,
        userName: userProfile.name,
        email: user.email,
        loginTime: new Date(),
        ipAddress: ip,
        deviceInfo: navigator.userAgent
      });

    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ SIGNUP
  const signup = async (
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'staff' | 'student',
  position: string,
  accessLevel?: number
) => {
  setLoading(true);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const isLevel2Staff = role === 'staff' && accessLevel === 2;

    const userDoc: UserData = {
  uid: user.uid,
  email: user.email!,
  role,
  name,
  position,
  createdAt: serverTimestamp() as any,
  lastActive: serverTimestamp() as any,
  ...(role === 'staff'
    ? {
        taskDeletePermission: isLevel2Staff,
        staffDetails: { accessLevel: accessLevel ?? 1 },
      }
    : {}),
  ...(role === 'student'
    ? {
        studentDetails: {
          course: 'Unknown',
          year: 1,
          studentId: `STU-${user.uid.slice(0, 6).toUpperCase()}`
        },
      }
    : {})
};


    await setDoc(doc(db, 'users', user.uid), userDoc);
    setUserData(userDoc);
    setCurrentUser(user);
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};

  // ✅ LOGOUT
  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ REFRESH SESSION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
  // fallback logic stays same
} else {
  const data = snap.data();
  const merged: UserData = {
    uid: user.uid,
    email: user.email!,
    name: data.name || 'New User',
    role: data.role || 'student',
    position: data.position || 'Member',
    createdAt: data.createdAt?.toDate?.() || new Date(),
    lastActive: new Date(),
    taskDeletePermission: data.taskDeletePermission || false,
    ...(data.studentDetails ? { studentDetails: data.studentDetails } : {}),
    ...(data.staffDetails ? { staffDetails: data.staffDetails } : {})
  };
  await setDoc(ref, merged, { merge: true });
  setUserData(merged);
}

        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
