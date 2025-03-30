# Deployment Guide for Stock Analysis Platform

This guide provides instructions for deploying both the frontend and backend components of the Stock Analysis Platform.

## Frontend Deployment (Vercel)

Vercel is the recommended platform for deploying the Next.js frontend due to its seamless integration and optimized performance.

### Steps for Vercel Deployment:

1. **Create a Vercel Account**:
   - Sign up at [vercel.com](https://vercel.com) if you don't have an account.

2. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

3. **Configure Environment Variables**:
   - In the Vercel dashboard, add the following environment variable:
     - `NEXT_PUBLIC_API_URL`: URL of your deployed backend API (e.g., `https://your-backend-app.onrender.com`)

4. **Deploy via GitHub Integration**:
   - Connect your GitHub repository to Vercel
   - Select the repository and configure the following:
     - Framework Preset: Next.js
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `.next`

5. **Deploy via CLI** (alternative):
   ```bash
   cd frontend
   vercel
   ```

6. **Configure Custom Domain** (optional):
   - In the Vercel dashboard, go to your project settings
   - Navigate to "Domains" and add your custom domain

## Backend Deployment (Render)

Render is recommended for the Flask backend due to its simplicity and free tier offerings.

### Steps for Render Deployment:

1. **Create a Render Account**:
   - Sign up at [render.com](https://render.com) if you don't have an account.

2. **Create a New Web Service**:
   - Click "New" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure the Service**:
   - Name: `stock-analysis-backend` (or your preferred name)
   - Root Directory: `backend`
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`

4. **Add Environment Variables**:
   - `FINNHUB_API_KEY`: Your Finnhub API key
   - `NEWS_API_KEY`: Your News API key
   - `SECRET_KEY`: A secure random string for Flask
   - `FLASK_ENV`: `production`

5. **Enable CORS for Your Frontend Domain**:
   - Update the CORS configuration in `app.py` to include your Vercel domain:
   ```python
   CORS(app, resources={
       r"/*": {
           "origins": ["https://your-vercel-app.vercel.app", "http://localhost:3000"],
           "methods": ["GET", "POST", "OPTIONS"],
           "allow_headers": ["Content-Type", "Authorization"]
       }
   })
   ```

## Additional Requirements

### Backend Requirements File

Create a `requirements.txt` file in the backend directory if it doesn't exist:

```
flask==2.0.1
flask-cors==3.0.10
finnhub-python==2.4.13
firebase-admin==5.2.0
python-dotenv==0.19.1
gunicorn==20.1.0
```

### Vercel Configuration

Create a `vercel.json` file in the frontend directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "NEXT_PUBLIC_API_URL/api/:path*"
    }
  ]
}
```

## Testing Your Deployment

1. After deploying both frontend and backend, visit your Vercel URL
2. Verify that the application loads correctly
3. Check that real-time stock data is being fetched from your backend
4. Test user authentication and other features

## Troubleshooting

- **CORS Issues**: Ensure the backend CORS settings include your frontend domain
- **API Connection Errors**: Verify environment variables are set correctly
- **Missing Dependencies**: Check requirements.txt includes all necessary packages
- **Build Failures**: Review build logs in Vercel/Render dashboards
