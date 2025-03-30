<div align="center">

# 📈 Stock Analysis Platform

### A modern, full-stack trading simulation platform with real-time market data

[![Next.js](https://img.shields.io/badge/frontend-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Flask](https://img.shields.io/badge/backend-Flask-black?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Firebase](https://img.shields.io/badge/database-Firebase-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Finnhub](https://img.shields.io/badge/API-Finnhub-blue?style=for-the-badge)](https://finnhub.io/)
[![License](https://img.shields.io/badge/license-Apache%202.0-green?style=for-the-badge)](https://www.apache.org/licenses/LICENSE-2.0)

</div>

## 🌟 Overview

The Stock Analysis Platform is a comprehensive web application that replicates the core features of popular trading platforms like Robinhood. It combines real-time market data with intelligent analysis tools to provide users with an immersive trading simulation experience.

### 🔍 [Live Demo](https://stock-analysis-platform-bay.vercel.app/)

### 🏗️ Deployment Architecture

- **Frontend**: Deployed on [Vercel](https://vercel.com) for seamless Next.js integration and global CDN distribution
- **Backend**: Hosted on [Render](https://render.com) with automatic scaling and continuous deployment
- **Database**: Firebase Firestore for real-time data synchronization across clients
- **Authentication**: Firebase Authentication for secure user management
- **Environment Variables**: Securely managed through Vercel and Render dashboards

## ✨ Key Features

- **📊 Real-time Market Data** - Live stock prices and market data via Finnhub API
- **📉 Interactive Charts** - Visualize stock performance with customizable time ranges
- **🧠 Smart Trading Insights** - Data-driven recommendations powered by statistical analysis
- **💼 Portfolio Management** - Track your investments and performance metrics
- **💰 Trading Simulation** - Buy and sell stocks with virtual currency
- **🔒 Secure Authentication** - User accounts powered by Firebase
- **📱 Responsive Design** - Optimized for both desktop and mobile devices
- **📰 News Integration** - Latest stock-related news for informed decisions
- **💬 Discussion Forum** - Community discussions about stocks and market trends
- **🚀 Top Gainers** - Track the best-performing stocks in real-time

## 🛠️ Technology Stack

<table>
  <tr>
    <td valign="top" width="50%">
      <h3>Frontend</h3>
      <ul>
        <li>⚛️ <strong>Next.js</strong> - React framework for production</li>
        <li>🎨 <strong>Material UI</strong> - Comprehensive component library</li>
        <li>📊 <strong>Chart.js</strong> - Interactive data visualization</li>
        <li>🔐 <strong>Firebase Auth</strong> - Secure user authentication</li>
        <li>📝 <strong>TypeScript</strong> - Static type checking</li>
        <li>🔄 <strong>SWR</strong> - Data fetching and caching</li>
      </ul>
    </td>
    <td valign="top" width="50%">
      <h3>Backend</h3>
      <ul>
        <li>🐍 <strong>Flask</strong> - Python web framework</li>
        <li>🔥 <strong>Firebase Firestore</strong> - NoSQL database</li>
        <li>📡 <strong>Finnhub API</strong> - Real-time stock market data</li>
        <li>📊 <strong>Statistical Analysis</strong> - Time series forecasting</li>
        <li>🔑 <strong>JWT</strong> - Token-based authentication</li>
        <li>☁️ <strong>Render</strong> - Cloud deployment platform</li>
      </ul>
    </td>
  </tr>
</table>

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **Python** (v3.8 or higher)
- **Firebase** account
- **Finnhub API** key (free tier available)
- **Git** for version control

## 🔧 Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/shreyas463/Stock-Analysis-platform.git
cd Stock-Analysis-platform
```

### 2️⃣ Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (with Email/Password) and **Firestore** in your project
3. Generate a new web app in your Firebase project and copy the configuration
4. Generate a new service account key for the admin SDK:
   - Go to **Project Settings** > **Service Accounts**
   - Click "**Generate New Private Key**"
   - Save the JSON file as `serviceAccountKey.json` in the `backend` directory

### 3️⃣ Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create and configure environment variables
cp .env.example .env
```

Update the `.env` file with your API keys and Firebase configuration:

```ini
FLASK_APP=app.py
FLASK_ENV=development
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
SECRET_KEY=your-secret-key-here
FINNHUB_API_KEY=your-finnhub-api-key
```

### 4️⃣ Frontend Setup

```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Create and configure environment variables
cp .env.example .env.local
```

Update the `.env.local` file with your Firebase configuration:

```ini
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 🚀 Running the Application

### Local Development

**1. Start the backend server:**

```bash
# From the project root
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```

The backend server will start on [http://localhost:5001](http://localhost:5001)

**2. Start the frontend development server:**

```bash
# From the project root (in a new terminal)
cd frontend
npm run dev
```

**3. Access the application:**

Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Deployment

This application is deployed using a modern cloud architecture:

- **Frontend**: Deployed on [Vercel](https://vercel.com)
  - Automatic deployments from the main branch
  - Environment variables configured in Vercel dashboard
  - Custom domain configuration with SSL

- **Backend**: Hosted on [Render](https://render.com)
  - Web service with automatic scaling
  - Environment variables securely stored
  - Continuous deployment from GitHub

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔄 Latest Updates

<details>
<summary><b>🔧 March 2025: Finnhub API Integration Fix</b></summary>

- **🐛 Bug Fix**: Resolved issues with Finnhub stock price display in production environment
- **🔒 Environment Variables**: Improved handling of API keys and environment configuration
- **🌐 CORS Configuration**: Enhanced cross-origin resource sharing for better API communication
- **📝 Logging**: Added comprehensive logging for better debugging and monitoring
- **⚠️ Error Handling**: Improved error messages and fallback mechanisms
</details>

<details>
<summary><b>📊 Stock Analysis Feature Improvements</b></summary>

- **🔄 Backend-Frontend Integration**: Fixed mismatch between backend response structure and frontend interface
- **🗺️ Data Mapping**: Implemented proper mapping of backend response data to match frontend expectations
- **⚠️ Error Handling**: Enhanced error handling with proper type checking
- **👤 User Experience**: Improved reliability for better trading decisions
</details>

<details>
<summary><b>⚡ Performance & Reliability Enhancements</b></summary>

- **💰 Portfolio Calculations**: Enhanced accuracy of value calculations
- **⏱️ Price Loading Optimization**: 
  - Removed unnecessary re-renders
  - Extended update intervals from 10s to 15s
  - Eliminated redundant console logs
  - Simplified portfolio value calculations
- **🧠 ML Analysis**: Separated analysis from buy logic for better maintainability
- **🔒 Type Safety**: Added comprehensive type checking throughout the application
</details>

<details>
<summary><b>🎨 UI/UX Refinements</b></summary>

- **📈 Market Overview**: Streamlined market data display with unified section
- **💼 Portfolio Display**: Improved value accuracy and presentation
- **💰 Trading Interface**: Enhanced buy/sell flow with clearer feedback
- **🔍 Layout Optimization**: Removed duplicate sections for cleaner interface
- **🔎 Enhanced Search**: Improved search dropdown with better positioning
- **🚀 Top Gainers Section**: Redesigned with fallback data for consistent display
</details>

<details>
<summary><b>🧩 Interactive Features</b></summary>

- **👁️ Interactive Login Character**: Animated character that watches users type and politely closes its eyes during password entry
- **📱 Responsive Layout**: Trading panel moved next to chart for better usability
- **⚡ Real-time Updates**: Live stock price updates when selecting stocks
- **💬 Discussion Forum**: Enhanced community interaction features
</details>

## 🧠 Smart Trading Features

<div align="center">
<img src="https://i.imgur.com/JIWRTbg.png" alt="Smart Trading Features" width="600"/>
</div>

The platform includes intelligent trading capabilities powered by statistical analysis:

| Feature | Description |
|---------|-------------|
| **📈 Price Forecasting** | Advanced statistical analysis for stock price prediction |
| **🔍 Buy/Sell Recommendations** | Data-driven suggestions based on historical performance |
| **📊 Trend Analysis** | Identification of potential market trends and patterns |
| **🔄 Fallback Mechanisms** | Ensures predictions are available even with limited API data |
| **⚖️ Risk Assessment** | Evaluation of potential investment risks |

## 💼 Portfolio Management

Comprehensive tools to track and manage your investments:

- **📊 Real-time Portfolio Valuation**: Up-to-date value of your holdings
- **💰 Transaction History**: Complete record of all your trades
- **📈 Performance Metrics**: Track your investment performance over time
- **🔄 Automatic Updates**: Portfolio values refresh automatically

## 🎭 User Experience Features

### 👁️ Interactive Login Character

The login page features an engaging animated character that creates a more personalized experience:

- **Reactive Eye Movements**: Eyes follow along as users type in username fields
- **Privacy-Conscious Design**: Eyes automatically close during password entry
- **Subtle Animations**: Natural-looking movements that respond to user input

### 💰 Crypto Widget Integration

- Real-time cryptocurrency prices displayed alongside the login form
- Track market movements even before logging in
- Seamlessly integrated with the authentication flow

## 🤝 Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📜 License

This project is licensed under the MIT License
