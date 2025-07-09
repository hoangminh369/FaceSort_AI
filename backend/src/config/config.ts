import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-photo-management',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_key',
  n8n: {
    baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
  },
  geminiModelId: process.env.GEMINI_MODEL_ID || 'gemini-1.5-pro',
  googleDrive: {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
  },
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
};

export default config; 