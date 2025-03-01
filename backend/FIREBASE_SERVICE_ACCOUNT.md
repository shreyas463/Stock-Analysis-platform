# Firebase Service Account Setup

To connect your backend to your Firebase project, you need to generate a service account key. Follow these steps:

## Generate a Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `stocker-db315`
3. Click on the gear icon (⚙️) next to "Project Overview" to open Project settings
4. Go to the "Service accounts" tab
5. Click on "Generate new private key" button
6. Save the JSON file as `serviceAccountKey.json` in the `backend` directory, replacing the placeholder file

## Update Environment Variables

Make sure your backend `.env` file has the correct path to the service account key:

```
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
```

## Security Warning

The service account key grants administrative access to your Firebase project. Keep it secure and never commit it to public repositories.

## Firestore Collections Setup

After setting up the service account, you'll need to create the following collections in Firestore:

1. **users** - Stores user information
   - Fields: uid, username, email, created_at, balance

2. **portfolios** - Stores user stock holdings
   - Fields: user_id, symbol, shares, created_at, updated_at

3. **transactions** - Records buy/sell transactions
   - Fields: user_id, symbol, shares, price, type, created_at

These collections will be automatically created when users interact with your application, but you can also create them manually in the Firebase Console.