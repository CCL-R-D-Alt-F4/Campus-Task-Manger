import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your existing config
const firebaseConfig = {
  apiKey: "AIzaSyAPQpbYShDWLFTfOHwBd2fJA-j0ZVYc4O4",
  authDomain: "alt-f4-1cbf2.firebaseapp.com",
  projectId: "alt-f4-1cbf2",
  storageBucket: "alt-f4-1cbf2.appspot.com",
  messagingSenderId: "342693126581",
  appId: "1:342693126581:web:a7835440ecb327de6df9fc",
  measurementId: "G-4YR2GD8Y89"
};

// Main app instance
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Secondary app for user creation
export const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export default app;
