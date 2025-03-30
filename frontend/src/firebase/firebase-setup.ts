// Firebase configuration using environment variables
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
console.log("Initializing Firebase with config:", { 
  ...firebaseConfig, 
  apiKey: firebaseConfig.apiKey ? "HIDDEN" : "MISSING" 
});

const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Set persistence
try {
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("Firebase persistence set to local");
    })
    .catch((error) => {
      console.error("Error setting persistence:", error);
    });
} catch (error) {
  console.error("Failed to set persistence:", error);
}

export { auth, db };
export default app;
