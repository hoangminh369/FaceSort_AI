import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import config from './config/config';
import connectDB from './config/database';
import User from './models/User';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/authRoutes';
import imageRoutes from './routes/imageRoutes';
import driveRoutes from './routes/driveRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import workflowRoutes from './routes/workflowRoutes';
import systemRoutes from './routes/systemRoutes';

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB().then(() => {
  createDefaultAccounts().catch(err => console.error('Default account creation error:', err));
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/system', systemRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Handle 404 errors for routes that don't exist
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// After DB connection, create default accounts if not exist
async function createDefaultAccounts() {
  const admin = await User.findOne({ username: 'admin' })
  if (!admin) {
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    })
    console.log('Default admin account created: admin / admin123')
  }
  const user = await User.findOne({ username: 'user' })
  if (!user) {
    await User.create({
      username: 'user',
      email: 'user@example.com',
      password: 'user123',
      role: 'user'
    })
    console.log('Default user account created: user / user123')
  }
}

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 