import express, { Request, Response } from 'express';
import config from './config/config';
import connectDB from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Initialize express app
const app = express();

// Connect to MongoDB

// Middleware
const allowedOrigins = [
  config.frontendBaseUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];


// Handle preflight requests quickly
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}



// Health check endpoints (public access)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});


// Handle 404 errors for routes that don't exist
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 