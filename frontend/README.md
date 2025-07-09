# Smart Photo Manager Frontend

This is the frontend application for the Smart Photo Manager system, built with Vue 3, Vite, and Element Plus.

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file in the frontend directory with:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

3. Start the development server:
```
npm run dev
```

## Google Drive Integration

To use the Google Drive integration:

1. First, set up the backend:
   - Create a `.env` file in the backend directory with:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/smart-photo-management
   JWT_SECRET=your_jwt_secret_here
   
   # Google Drive API credentials
   GOOGLE_DRIVE_CLIENT_ID=your_google_client_id_here
   GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret_here
   ```

2. Get Google Drive API credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable the Google Drive API
   - Create OAuth 2.0 credentials (Web application type)
   - Add `http://localhost:5000/api/drive/oauth2callback` to authorized redirect URIs
   - Copy the Client ID and Client Secret to your backend `.env` file

3. In the application:
   - Log in as admin
   - Go to System Configuration
   - Enter your Google Drive credentials
   - Click "Authorize Drive" to connect your account
   - Use the Drive Explorer to browse your files

## Default Accounts

- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123`

## Features

- User authentication and management
- Google Drive integration
- Image gallery and management
- Chatbot integration (Zalo and Facebook)
- AI-powered photo analysis
