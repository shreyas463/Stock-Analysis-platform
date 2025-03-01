# Stockerr

A full-stack web application that replicates core features of Robinhood, built with Next.js and Flask.

## Features

- User authentication with Firebase
- Stock data visualization (using mock data)
- Stock trading simulation
- Portfolio management
- Transaction history
- News feed for stocks
- Discussion forum for stocks

## Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Firebase account

## Setup

### Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and Firestore in your project
3. Generate a new web app in your Firebase project and copy the configuration
4. Generate a new service account key for the admin SDK:
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `serviceAccountKey.json` in the `backend` directory

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

5. Update the `.env` file with your API keys and Firebase configuration:
   - Add your Firebase service account key path
   - Set a secret key for JWT token generation

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

4. Update the `.env.local` file with your Firebase configuration:
   - Add your Firebase Web API key
   - Add your Firebase project configuration

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python app.py
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access the application at [http://localhost:3000](http://localhost:3000)

## Implementation Notes

### Mock Data

This application uses mock data for stock information, search, and news to avoid requiring paid API subscriptions. In a production environment, you would replace these with actual API calls to services like:

- [Finnhub](https://finnhub.io/) - For real-time stock data
- [Alpha Vantage](https://www.alphavantage.co/) - For historical stock data
- [News API](https://newsapi.org/) - For stock-related news

### Authentication

The application uses Firebase Authentication for user management. The backend verifies Firebase ID tokens for secure API access.

## Environment Variables

### Backend (.env)
```
FLASK_APP=app.py
FLASK_ENV=development
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
SECRET_KEY=your-secret-key-here
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
