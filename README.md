# Stock Analysis platform

A full-stack web application that replicates core features of Robinhood, built with Next.js and Flask.



## 🚀 Features

- **Real-time Stock Data**: Live stock prices and market data via Finnhub API
- **Interactive Charts**: Visualize stock performance with customizable time ranges
- **Smart Trading Insights**: Data-driven recommendations for stock trading
- **Portfolio Management**: Track your investments and performance
- **Trading Simulation**: Buy and sell stocks with virtual currency
- **User Authentication**: Secure login with Firebase
- **Responsive Design**: Optimized for desktop and mobile devices
- **News Integration**: Latest stock-related news
- **Discussion Forum**: Community discussions about stocks
- **Top Gainers**: Track the best-performing stocks

## 🛠️ Tech Stack

### Frontend
- **Next.js** - React framework
- **Material UI** - Component library
- **Chart.js** - Data visualization
- **Firebase Auth** - User authentication
- **TypeScript** - Type safety

### Backend
- **Flask** - Python web framework
- **Firebase Firestore** - NoSQL database
- **Finnhub API** - Stock market data
- **Statistical Analysis** - Time series forecasting
- **JWT** - Token-based authentication

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Firebase account
- Finnhub API key (free tier available)

## 🔧 Setup

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
   ```
   FLASK_APP=app.py
   FLASK_ENV=development
   GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
   SECRET_KEY=your-secret-key-here
   FINNHUB_API_KEY=your-finnhub-api-key
   ```

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
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5001
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

## 🚀 Running the Application

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

## 🔄 Recent Updates

### Stock Analysis Feature Fix
- **Backend-Frontend Integration**: Fixed mismatch between backend response structure and frontend interface for stock analysis
- **Data Mapping**: Implemented proper mapping of backend response data to match the frontend's expected interface
- **Error Handling**: Enhanced error handling for stock analysis with proper type checking
- **User Experience**: Improved reliability of the stock analysis feature for better trading decisions

### Performance & Reliability Improvements
- **Portfolio Calculations**: Enhanced accuracy of portfolio value calculations
- **Price Loading Optimization**: 
  - Removed unnecessary re-renders
  - Extended update intervals from 10s to 15s
  - Eliminated redundant console logs
  - Simplified portfolio value calculations

### ML Analysis Enhancements
- **Analysis Logic**: Separated ML analysis from buy logic for better maintainability
- **Error Handling**: Improved error handling for analysis responses
- **State Management**: Enhanced state clearing after successful purchases
- **Type Safety**: Added comprehensive type checking for portfolio calculations

### UI/UX Refinements
- **Market Overview**: Streamlined market data display with unified section
- **Portfolio Display**: Improved portfolio value accuracy and presentation
- **Trading Interface**: Enhanced buy/sell flow with clearer feedback
- **Layout Optimization**: Removed duplicate sections for cleaner interface

### Previous Updates
- **Interactive Login Character**: Added a cute animated character that watches users type their username/email and politely closes its eyes during password entry
- **Side-by-Side Layout**: Trading panel moved next to the chart for better usability
- **Enhanced Search**: Improved search dropdown with better positioning
- **Top Gainers Section**: Redesigned with fallback data to ensure content is always displayed
- **Real-time Price Display**: Added live stock price updates when selecting stocks

### Backend Enhancements
- **Quote Endpoint**: New API endpoint for fetching real-time stock prices
- **Intelligent Analysis**: Improved statistical analysis with fallback mechanisms for reliable predictions
- **Error Handling**: Better error handling throughout the application
- **API Integration**: Enhanced Finnhub API integration with graceful degradation

### Technical Improvements
- **Performance Optimization**: Reduced unnecessary API calls with debouncing
- **Responsive Design**: Improved mobile experience
- **Code Organization**: Better component structure and reusability
- **Type Safety**: Enhanced TypeScript typing throughout the frontend

## 🧠 Smart Trading Features

The application includes intelligent trading capabilities:

- **Price Forecasting**: Statistical analysis for stock price prediction
- **Buy/Sell Recommendations**: Data-driven suggestions based on price analysis
- **Trend Analysis**: Identification of potential market trends
- **Fallback Mechanisms**: Ensures predictions are available even when API data is limited

## 🎭 User Experience Enhancements

### Interactive Login Character
The login page features an engaging animated character that creates a more personalized experience:

- **Reactive Eye Movements**: The character's eyes follow along as users type in username and email fields
- **Privacy-Conscious Design**: Eyes automatically close when users type in the password field
- **Subtle Animations**: Natural-looking eye movements and facial expressions that respond to user input
- **Improved Engagement**: Creates a more memorable and enjoyable login experience

### Crypto Widget Integration
- Real-time cryptocurrency prices displayed alongside the login form
- Allows users to track market movements even before logging in
- Seamlessly integrated with the login flow

## 🤝 Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📜 License

This project is licensed under the MIT License
