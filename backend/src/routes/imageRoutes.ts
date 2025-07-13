import express from 'express';
import { 
  getImages, 
  uploadImages, 
  deleteImage, 
  processImages, 
  analyzeFace, 
  compareFaces, 
  findSimilarFaces, 
  upload 
} from '../controllers/imageController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes (for n8n workflows)
router.post('/analyze-face', analyzeFace);

// Protected routes
router.use(authenticate);

router.get('/', getImages);
router.post('/upload', upload.array('images', 10), uploadImages);
router.delete('/:id', deleteImage);
router.post('/process', processImages);
router.post('/compare-faces', compareFaces);
router.post('/find-similar', findSimilarFaces);

export default router; 