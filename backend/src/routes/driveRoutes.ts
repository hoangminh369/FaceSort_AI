import express from 'express';
import { 
  getDriveConfig, 
  updateDriveConfig, 
  scanDrive, 
  listFolders,
  listFiles, 
  getAuthUrl,
  handleOAuth2Callback,
  createFolder,
  copyFile,
  setPublicPermission,
  getAllImages
} from '../controllers/driveController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public route for OAuth callback
router.get('/oauth2callback', handleOAuth2Callback);

// Protected routes
router.use(authenticate);

router.get('/config', getDriveConfig);
router.put('/config', updateDriveConfig);
router.post('/scan', scanDrive);
router.get('/folders', listFolders);
router.get('/files', listFiles);
router.get('/auth-url', getAuthUrl);

// New routes for image evaluation and comparison
router.post('/folders', createFolder);
router.post('/files/copy', copyFile);
router.post('/permissions/public', setPublicPermission);
router.get('/images', getAllImages);

export default router; 