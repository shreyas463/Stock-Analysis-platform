# Firebase Setup Instructions

This document provides step-by-step instructions for setting up a new Firebase project for the Stockerr application.

## 1. Create a New Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "Stockerr")
4. Choose whether to enable Google Analytics (recommended)
5. Accept the terms and click "Create project"
6. Wait for the project to be created, then click "Continue"

## 2. Set Up Firebase Authentication

1. In the Firebase Console, select your project
2. In the left sidebar, click "Authentication"
3. Click "Get started"
4. In the "Sign-in method" tab, enable "Email/Password"
5. Click "Save"

## 3. Set Up Firestore Database

1. In the left sidebar, click "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll update security rules later)
4. Select a location closest to your users
5. Click "Enable"

## 4. Add a Web App to Your Firebase Project

1. In the Firebase Console, click the gear icon next to "Project Overview" and select "Project settings"
2. Scroll down to "Your apps" and click the web icon (</>) 
3. Register your app with a nickname (e.g., "Stockerr Web")
4. (Optional) Check the box for Firebase Hosting if you plan to deploy the app
5. Click "Register app"
6. Copy the Firebase configuration object (you'll need this for the next step)

## 5. Update the Firebase Configuration in Your App

1. Open the file `src/firebase/config.ts`
2. Replace the placeholder code with the following, using your Firebase configuration:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
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
```

## 6. Update the AuthContext

1. Open the file `src/contexts/AuthContext.tsx`
2. Replace the placeholder code with the original implementation that uses Firebase

## 7. Set Up Firestore Security Rules

1. In the Firebase Console, go to "Firestore Database"
2. Click the "Rules" tab
3. Replace the default rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /portfolios/{portfolioId} {
      allow read, write: if request.auth != null && resource.data.user_id == request.auth.uid;
    }
    
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && resource.data.user_id == request.auth.uid;
    }
  }
}
```

4. Click "Publish"

## 8. Generate a Service Account Key for Backend

1. In the Firebase Console, click the gear icon and select "Project settings"
2. Go to the "Service accounts" tab
3. Click "Generate new private key"
4. Save the JSON file as `serviceAccountKey.json` in the `backend` directory

## 9. Update Environment Variables

1. Update your `.env.local` file in the frontend directory with your new Firebase configuration
2. Make sure your backend `.env` file has the correct path to the new service account key

## 10. Restart Your Application

1. Restart both the frontend and backend servers to apply the changes

## Troubleshooting

If you encounter any issues:

1. Check the browser console for error messages
2. Verify that your Firebase configuration is correct
3. Make sure the service account key is properly set up for the backend
4. Check that the Firebase Authentication and Firestore services are enabled
5. Verify that your security rules are properly configured 