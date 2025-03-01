// Example Firebase configuration file
// Copy this file to config.ts and replace with your actual Firebase config

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

// Initialize Firebase
console.log("Initializing Firebase with config:", { ...firebaseConfig, apiKey: "HIDDEN" });
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