# Smart Photo Manager Backend

This is the backend API for the Smart Photo Manager application. It provides endpoints for user authentication, image management, Google Drive integration, and chatbot functionality.

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file in the backend directory with the following content:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smart-photo-management
JWT_SECRET=your_jwt_secret_here
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here

# Google Drive API credentials
GOOGLE_DRIVE_CLIENT_ID=your_google_client_id_here
GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret_here

# Upload directory
UPLOAD_DIR=uploads

# Gemini / Google AI
GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
# Optional: specify model (default gemini-1.5-pro)
GEMINI_MODEL_ID=gemini-1.5-pro
```

3. Set up Google Drive API:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable the Google Drive API
   - Create OAuth 2.0 credentials (Web application type)
   - Add http://localhost:5000/api/drive/oauth2callback to authorized redirect URIs
   - Copy the Client ID and Client Secret to your .env file

4. Start the development server:
```
npm run dev
```

## API Routes

- **Auth**: `/api/auth/*`
- **Images**: `/api/images/*`
- **Drive**: `/api/drive/*`
- **Chatbot**: `/api/chatbot/*`
- **Workflows**: `/api/workflows/*`
- **System**: `/api/system/*`

## Default Accounts

On first startup, the system creates the following default accounts:

- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123`

## Google Drive Integration

The application supports Google Drive integration to scan and process photos from Google Drive folders. To set this up:

1. Create Google Cloud Project and obtain OAuth 2.0 credentials as described above
2. Add the credentials to your .env file
3. In the application UI, go to System Configuration to enter your credentials
4. Click "Authorize Drive" to connect your Google Drive account
5. Use the Drive Explorer to browse and select folders for scanning 