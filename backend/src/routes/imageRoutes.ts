import express from 'express';
import { getImages, uploadImages, deleteImage, processImages, upload } from '../controllers/imageController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Protected routes
router.use(authenticate);

router.get('/', getImages);
router.post('/upload', upload.array('images', 10), uploadImages);
router.delete('/:id', deleteImage);
router.post('/process', processImages);

export default router; 