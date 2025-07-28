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
    workflowIds: {
      deepFaceProcessing: process.env.N8N_DEEPFACE_PROCESSING_ID || 'deepface-processing',
      googleDriveScanner: process.env.N8N_GOOGLE_DRIVE_SCANNER_ID || 'google-drive-scanner',
      imageSelection: process.env.N8N_IMAGE_SELECTION_ID || 'image-selection',
      chatbotResponse: process.env.N8N_CHATBOT_RESPONSE_ID || 'chatbot-response'
    }
  },
  // DeepFace local configuration
  deepface: {
    pythonPath: path.join(__dirname, '../../.venv/Scripts/python.exe'), // Use virtual environment Python
    model: process.env.DEEPFACE_MODEL || 'VGG-Face',
    detector: 'opencv', // Force use opencv detector
    metric: process.env.DEEPFACE_METRIC || 'cosine',
    enableGpu: process.env.DEEPFACE_ENABLE_GPU === 'true',
    qualityThreshold: parseInt(process.env.DEEPFACE_QUALITY_THRESHOLD || '80'),
    similarityThreshold: parseFloat(process.env.DEEPFACE_SIMILARITY_THRESHOLD || '0.6')
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